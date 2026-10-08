// 월식록 외전 — 엔진, 전투, 시간 감속장, 방 이동·저장
(() => {
  const T = 32;                 // 타일 크기
  const W = 960, H = 540;       // 화면 크기
  const DT = 1 / 60;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const P = {                   // 플레이어 수치
    w: 20, h: 44,
    run: 230, accel: 2200, friction: 2600, airAccel: 1500,
    gravity: 1900, maxFall: 760,
    jump: 640, cutJump: 0.45,
    coyote: 0.10, buffer: 0.12,
    dashSpeed: 560, dashTime: 0.17, dashCooldown: 0.45,
    maxHp: 5, iframes: 1.2,
    knifeCd: 0.22, lobCd: 0.5,
    maxMana: 100, manaRegen: 14, crouchH: 28, crouchRun: 90, fieldCost: 40, fieldR: 130, fieldLife: 4, slow: 0.25,
  };

  let map, roomId, grid, mapW, mapH, player, enemies, knives, particles, fields, bullets, camX, camY, time;
  let portals, saves, items, signs, msgText = '', msgT = 0;
  let theme = 'mansion', ending = null, boss = null, lockedPortals = [], dlg = null, banner = { text: '', t: 0 };

  // 진행 상황 (저장됨)
  const SAVE_KEY = 'gesshokuroku_gaiden_save_v1';
  const world = { abil: { double: false }, got: {}, visited: { start: true }, save: null, bosses: {}, intro: false, hpBonus: 0 };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) Object.assign(world, JSON.parse(raw));
  } catch (e) { /* 저장소를 못 쓰는 환경이면 무시 */ }
  const maxHp = () => 5 + (world.hpBonus || 0);
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(world)); } catch (e) { /* 무시 */ } };
  const say = t => { msgText = t; msgT = 3; };

  // spawn: undefined = 방의 P / {tile:'b'} = 이동구 옆 / {pos:{x,y}} = 좌표
  function loadMap(id, spawn) {
    const prev = spawn && spawn.keep ? player : null;
    roomId = id; map = MAPS[id]; world.visited[id] = true;
    grid = map.rows.map(r => r.split(''));
    mapH = grid.length; mapW = grid[0].length;
    enemies = []; knives = []; particles = []; fields = []; bullets = [];
    portals = []; saves = []; items = []; signs = []; boss = null; lockedPortals = [];
    let start = { x: 2 * T, y: 2 * T };
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      const c = grid[y][x];
      if (c === '#' || c === '.') continue;
      grid[y][x] = '.';
      if (c === 'P') start = { x: x * T + (T - P.w) / 2, y: (y + 1) * T - P.h };
      else if (c === 'w') enemies.push(makeEnemy('walker', x * T + 4, (y + 1) * T - 28));
      else if (c === 't') enemies.push(makeEnemy('turret', x * T + 4, (y + 1) * T - 28));
      else if (c === 'f') enemies.push(makeEnemy('flyer', x * T, y * T));
      else if (c === 'S') saves.push({ x, y });
      else if (c === 'B') { if (map.boss && !world.bosses[map.boss]) boss = makeBoss(map.boss, x * T + 3, (y + 1) * T - 46); }
      else if (c === 'j') { if (!world.got[id + ':' + x + ',' + y]) items.push({ x, y, kind: 'double' }); }
      else if ('abcde'.includes(c)) portals.push({ x, y, ch: c });
    }
    if (spawn && spawn.tile) {
      const ps = portals.filter(q => q.ch === spawn.tile);
      const q = ps[0], low = Math.max(...ps.map(p => p.y));
      const dx = q.x === 0 ? 1 : (q.x === mapW - 1 ? -1 : 0);
      start = { x: (q.x + dx) * T + (T - P.w) / 2, y: (low + 1) * T - P.h };
    } else if (spawn && spawn.pos) start = { x: spawn.pos.x, y: spawn.pos.y };
    player = {
      x: start.x, y: start.y, vx: 0, vy: 0, w: P.w, h: P.h,
      face: 1, crouch: false, onGround: false, coyote: 0, buffer: 0, airJump: true, portalLock: true,
      dashT: 0, dashCd: 0, airDash: true,
      hp: prev ? prev.hp : maxHp(), mana: prev ? prev.mana : P.maxMana, inv: prev ? prev.inv : 0,
      knifeCd: 0, dead: false, deadT: 0, start,
    };
    camX = Math.max(0, Math.min(mapW * T - W, player.x - W / 2));
    camY = Math.max(0, Math.min(mapH * T - H, player.y - H / 2));
    time = 0;
    theme = map.theme || 'mansion';
    Sound.bgm(map.bgm || 'field1');
  }

  // 사망·재시작: 마지막 저장 지점에서 부활
  function respawn() {
    if (world.save) loadMap(world.save.room, { pos: world.save.pos });
    else loadMap('start');
  }

  function makeEnemy(type, x, y) {
    const e = makeEnemyBase(type, x, y); e.maxHp = e.hp; return e;
  }
  function makeEnemyBase(type, x, y) {
    if (type === 'walker') return { type, x, y, w: 24, h: 28, vx: -60, vy: 0, hp: 3, flash: 0, dir: -1 };
    if (type === 'turret') return { type, x, y, w: 24, h: 28, vx: 0, vy: 0, hp: 4, flash: 0, cd: 1.2 };
    return { type, x, y, baseY: y, w: 24, h: 20, vx: 0, vy: 0, hp: 2, flash: 0, t: Math.random() * 6 };
  }

  // ---------- 보스 ----------
  const bossDef = b => BOSSES[b.id];
  function makeBoss(id, x, y) {
    const d = BOSSES[id];
    return { id, name: d.name, x, y: y + 46 - d.h, w: d.w, h: d.h, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, phase: 0, pt: 0,
      st: {}, inv: 0, active: false, intro: false, dir: -1, flash: 0, warn: false, onGround: false };
  }
  function addBullet(x, y, vx, vy, o) {
    o = o || {};
    bullets.push({ x, y, w: o.w || 8, h: o.h || 8, vx, vy, life: o.life || 7, c: o.c });
  }

  function startDlg(lines, done) { dlg = { lines, i: 0, done }; }
  function advanceDlg() {
    Sound.sfx('tick');
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const d = dlg.done; dlg = null; if (d) d(); }
  }

  function enterPhase(b, i) {
    const def = bossDef(b), ph = def.phases[i];
    b.phase = i; b.st = {}; b.pt = 0; b.warn = false; b.vx = b.vy = 0;
    if (ph.who) b.name = ph.who;
    if (i > 0) { b.inv = 1.6; bullets = []; banner = { text: ph.name, t: 2.4 }; Sound.sfx('spell'); }
    else banner = { text: ph.name, t: 2 };
  }

  function damageBoss() {
    const b = boss;
    if (!b || !b.active || b.inv > 0) return;
    b.hp--; b.flash = 0.1; Sound.sfx('bosshit');
    const def = bossDef(b), ph = def.phases[b.phase];
    if (b.hp > b.maxHp * ph.at) return;
    if (b.phase >= def.phases.length - 1) { defeatBoss(); return; }
    b.hp = Math.min(b.hp, Math.floor(b.maxHp * ph.at));
    for (const bl of bullets) burst(bl.x, bl.y, '#fc6', 2);
    enterPhase(b, b.phase + 1);
  }

  function defeatBoss() {
    const b = boss, id = b.id, def = bossDef(b);
    burst(b.x + b.w / 2, b.y + b.h / 2, '#fc6', 30);
    bullets = []; boss = null; Sound.sfx('win');
    world.bosses[id] = true;
    portals = lockedPortals; lockedPortals = [];
    player.hp = maxHp(); player.mana = P.maxMana;
    world.hpBonus = (world.hpBonus || 0) + 1; player.hp = maxHp();
    persist(); Sound.bgm(map.bgm || 'field1');
    if (id === 'kaguya') { startKaguyaEnding(); return; }
    startDlg(def.outro, () => say('체력 최대치 +1'));
  }

  function startKaguyaEnding() {
    startDlg([
      ['사쿠야', '……이걸로 끝이에요. 이제 이 밤을 돌려주세요.'],
      ['카구야', '재미있었어. 정말로. 시간을 멈추는 인간이 이렇게나 오래 버틸 줄은 몰랐어.'],
      ['카구야', '그래서 알고 싶어졌어. 영원을 만난 인간은, 시간이 멈춘 다음에 어떻게 되는지.'],
      ['사쿠야', '……아가씨. 죄송합니다. 약속을 지키지 못할 것 같아요.'],
      ['', '달빛이 한순간 모든 것을 비췄다. 멈춘 시간 속에서, 은빛 시계의 초침만이 흔들렸다.'],
    ], () => { ending = { t: 0 }; Sound.bgm('ending'); });
  }

  function updateBoss(dt) {
    const b = boss;
    if (!b || !b.active) return;
    const def = bossDef(b);
    b.flash = Math.max(0, b.flash - dt);
    if (b.inv > 0) {
      b.inv -= dt; b.vx = 0; if (!def.fly) b.vy = Math.min(P.maxFall, b.vy + P.gravity * dt); else b.vy = 0;
      const r = moveBody(b, dt); b.onGround = r.ground; return;
    }
    const s = dt * slowAt(b.x + b.w / 2, b.y + b.h / 2);
    b.pt += s;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    b.dir = px < cx ? -1 : 1;
    const ph = def.phases[b.phase];
    const flying = ph.fly !== undefined ? ph.fly : def.fly;
    if (!flying) b.vy = Math.min(P.maxFall, b.vy + P.gravity * s);
    const A = {
      b, s, cx, cy, px, py, g: b.onGround, L: T + 10, R: (mapW - 1) * T - 10, ceil: T, floor: (mapH - 2) * T,
      rnd: Math.random,
      shot: (x, y, vx, vy, o) => addBullet(x, y, vx, vy, o),
      aim: (sp, spreads, o) => { const a0 = Math.atan2(py - cy, px - cx); for (const da of spreads) addBullet(cx - 4, cy - 4, Math.cos(a0 + da) * sp, Math.sin(a0 + da) * sp, o); },
      ring: (n, sp, off, o) => { for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; addBullet(cx - 4, cy - 4, Math.cos(a) * sp, Math.sin(a) * sp, o); } },
      moveTo: (tx, ty, sp) => { const dx = tx - cx, dy = ty - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 40); b.vx = dx / d * sp * k; b.vy = dy / d * sp * k; },
    };
    ph.run(A);
    const r = moveBody(b, s); b.onGround = r.ground;
    if (!player.dead && overlap(player, b)) hurtPlayer(cx);
  }

  const solidAt = (tx, ty) => {
    if (tx < 0 || tx >= mapW) return true;      // 좌우 끝은 벽
    if (ty < 0) return true;                    // 천장
    if (ty >= mapH) return false;               // 바닥 아래는 낙사
    return grid[ty][tx] === '#';
  };
  const rectSolid = (x, y, w, h) => {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 1e-6) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + h - 1e-6) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) return true;
    return false;
  };
  const slowAt = (x, y) => fields.some(f => Math.hypot(x - f.x, y - f.y) < f.r) ? P.slow : 1;
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // 축별 이동 + 충돌 해결. 부딪히면 해당 축 속도를 0으로.
  function moveBody(b, dt) {
    let hitX = false, hitY = false;
    b.x += b.vx * dt;
    if (rectSolid(b.x, b.y, b.w, b.h)) {
      const dir = Math.sign(b.vx) || 1;
      b.x = dir > 0 ? Math.floor((b.x + b.w) / T) * T - b.w : (Math.floor(b.x / T) + 1) * T;
      b.vx = 0; hitX = true;
    }
    b.y += b.vy * dt;
    let ground = false;
    if (rectSolid(b.x, b.y, b.w, b.h)) {
      if (b.vy > 0) { b.y = Math.floor((b.y + b.h) / T) * T - b.h; ground = true; }
      else b.y = (Math.floor(b.y / T) + 1) * T;
      b.vy = 0; hitY = true;
    }
    return { hitX, hitY, ground };
  }

  function burst(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) particles.push({
      x, y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.7) * 240, life: 0.4 + Math.random() * 0.2, color,
    });
  }

  function hurtPlayer(fromX) {
    if (player.inv > 0 || player.dead) return;
    player.hp--; player.inv = P.iframes; Sound.sfx('hurt');
    player.vx = (player.x + player.w / 2 < fromX ? -1 : 1) * 260; player.vy = -300;
    player.dashT = 0;
    burst(player.x + player.w / 2, player.y + player.h / 2, '#f66');
    if (player.hp <= 0) { player.dead = true; player.deadT = 1.2; }
  }

  function throwKnife(lob) {
    const dir = player.face;
    const cx = player.x + player.w / 2 + dir * 12, cy = player.y + (player.crouch ? 8 : 24);
    if (lob) knives.push({ x: cx, y: cy, w: 10, h: 6, vx: dir * 360, vy: -440, g: 1300, life: 1.6, spin: 0 });
    else {
      const up = Input.held('up'), straightUp = up && !Input.held('left') && !Input.held('right');
      if (straightUp) knives.push({ x: player.x + player.w / 2 - 4, y: player.y - 8, w: 8, h: 16, vx: 0, vy: -820, g: 0, life: 0.7, spin: 0 });
      else knives.push({ x: cx, y: cy, w: 12, h: 4, vx: dir * (up ? 420 : 640), vy: up ? -420 : 0, g: 0, life: 0.9, spin: 0 });
    }
    player.knifeCd = lob ? P.lobCd : P.knifeCd;
    Sound.sfx(lob ? 'lob' : 'knife');
  }

  function updatePlayer(dt) {
    const p = player;
    if (p.dead) {
      p.deadT -= dt;
      if (p.deadT <= 0) respawn();
      return;
    }
    const dirIn = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    p.inv = Math.max(0, p.inv - dt);
    p.knifeCd = Math.max(0, p.knifeCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.coyote = p.onGround ? P.coyote : Math.max(0, p.coyote - dt);
    p.buffer = Input.pressed('jump') ? P.buffer : Math.max(0, p.buffer - dt);
    if (dirIn) p.face = dirIn;

    // 앉기: 키 높이 44 -> 28, 발 위치 유지. 천장이 막혀 있으면 일어서지 못함
    const wantCrouch = Input.held('down') && p.onGround && p.dashT <= 0;
    if (wantCrouch && !p.crouch) { p.crouch = true; p.y += P.h - P.crouchH; p.h = P.crouchH; }
    else if (!wantCrouch && p.crouch && !rectSolid(p.x, p.y - (P.h - P.crouchH), p.w, P.h)) {
      p.crouch = false; p.y -= P.h - P.crouchH; p.h = P.h;
    }

    // 대시
    if (Input.pressed('dash') && p.dashCd <= 0 && p.dashT <= 0 && (p.onGround || p.airDash)) {
      Sound.sfx('dash'); p.dashT = P.dashTime; p.dashCd = P.dashCooldown; p.vx = p.face * P.dashSpeed; p.vy = 0;
      if (!p.onGround) p.airDash = false;
      p.inv = Math.max(p.inv, P.dashTime);   // 대시 중 짧은 무적
    }

    if (p.dashT > 0) {
      p.dashT -= dt; p.vy = 0;
    } else {
      // 수평 이동
      const target = dirIn * (p.crouch ? P.crouchRun : P.run);
      const a = dirIn === 0 ? P.friction : (p.onGround ? P.accel : P.airAccel);
      if (p.vx < target) p.vx = Math.min(target, p.vx + a * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - a * dt);
      // 점프
      if (p.buffer > 0 && p.coyote > 0) { Sound.sfx('jump'); p.vy = -P.jump; p.buffer = 0; p.coyote = 0; p.onGround = false; }
      else if (p.buffer > 0 && !p.onGround && world.abil.double && p.airJump) {
        p.vy = -P.jump * 0.92; p.buffer = 0; p.airJump = false;
        burst(p.x + p.w / 2, p.y + p.h, '#9cf', 8); Sound.sfx('jump2');
      }
      if (!Input.held('jump') && p.vy < -120) p.vy += (P.gravity * 2.2) * dt;   // 점프 컷
      p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt);
    }

    // 시간 감속장
    p.mana = Math.min(P.maxMana, p.mana + P.manaRegen * dt);
    if (Input.pressed('time') && p.mana >= P.fieldCost) {
      Sound.sfx('field'); p.mana -= P.fieldCost;
      fields.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, r: P.fieldR, life: P.fieldLife });
    }

    // 투척
    if (p.knifeCd <= 0) {
      if (Input.pressed('throw') || (Input.held('throw') && p.knifeCd <= 0)) throwKnife(false);
      else if (Input.pressed('lob')) throwKnife(true);
    }

    const r = moveBody(p, dt);
    p.onGround = r.ground || (p.vy === 0 && rectSolid(p.x, p.y + 1, p.w, p.h));
    if (p.onGround) { p.airDash = true; p.airJump = true; }

    // 이동구·저장·아이템
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const tileHit = q => cx > q.x * T && cx < (q.x + 1) * T && cy > q.y * T && cy < (q.y + 1) * T;
    const door = portals.find(tileHit);
    if (!door) p.portalLock = false;
    else if (!p.portalLock) {
      const link = map.links[door.ch];
      if (link) { Sound.sfx('door'); loadMap(link[0], { tile: link[1], keep: true }); persist(); return; }
    }
    if (Input.pressed('up')) {
      const sv = saves.find(q => Math.abs(cx - (q.x + 0.5) * T) < 28 && Math.abs(p.y + p.h - (q.y + 1) * T) < 8);
      if (sv) {
        world.save = { room: roomId, pos: { x: sv.x * T + (T - P.w) / 2, y: (sv.y + 1) * T - P.h } };
        p.hp = maxHp(); p.mana = P.maxMana; persist(); say('저장했습니다');
        burst(cx, p.y, '#8fd', 10); Sound.sfx('save');
      }
    }
    for (const it of items) if (tileHit(it)) {
      if (it.kind === 'double') { world.abil.double = true; say('이단 점프 획득! 공중에서 점프를 한 번 더 누르세요'); }
      Sound.sfx('item'); world.got[roomId + ':' + it.x + ',' + it.y] = true; it.taken = true; persist();
    }
    items = items.filter(it => !it.taken);

    // 낙사
    if (p.y > mapH * T + 80) {
      p.hp--;
      if (p.hp <= 0) { p.dead = true; p.deadT = 1.0; }
      else { p.x = p.start.x; p.y = p.start.y; p.vx = p.vy = 0; p.inv = P.iframes; }
    }
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      const full = dt;
      dt = full * slowAt(e.x + e.w / 2, e.y + e.h / 2);
      e.flash = Math.max(0, e.flash - dt);
      if (e.type === 'turret') {
        e.cd -= dt;
        if (e.cd <= 0 && Math.abs(player.x - e.x) < 520) {
          e.cd = 2;
          const ang = Math.atan2(player.y + 20 - e.y, player.x - e.x);
          bullets.push({ x: e.x + 8, y: e.y + 8, w: 8, h: 8, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 4 });
        }
      } else if (e.type === 'walker') {
        e.vy = Math.min(P.maxFall, e.vy + P.gravity * dt);
        e.vx = e.dir * 60;
        const r = moveBody(e, dt);
        const aheadX = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
        const noFloor = !solidAt(Math.floor(aheadX / T), Math.floor((e.y + e.h + 2) / T));
        if (r.hitX || (r.ground || e.vy === 0) && noFloor) e.dir *= -1;
      } else {
        e.t += dt;
        const dx = player.x - e.x, dy = player.y - e.y;
        const near = Math.hypot(dx, dy) < 320;
        e.vx = near ? Math.sign(dx) * 70 : 0;
        e.vy = Math.sin(e.t * 3) * 40 + (near ? Math.sign(dy) * 25 : 0);
        moveBody(e, dt);
      }
      dt = full;
      if (!player.dead && overlap(player, e)) hurtPlayer(e.x + e.w / 2);
    }
  }

  function updateKnives(dt) {
    for (const k of knives) {
      k.life -= dt; k.vy += k.g * dt; k.spin += dt * 20;
      k.x += k.vx * dt; k.y += k.vy * dt;
      if (rectSolid(k.x, k.y, k.w, k.h)) { k.life = 0; burst(k.x, k.y, '#ccd', 3); continue; }
      if (boss && boss.active && overlap(k, { x: boss.x - 10, y: boss.y - 10, w: boss.w + 20, h: boss.h + 20 })) { k.life = 0; burst(k.x, k.y, boss.inv > 0 ? '#ccd' : '#fc6', 4); damageBoss(); continue; }
      for (const e of enemies) {
        if (e.hp > 0 && overlap(k, e)) {
          e.hp--; e.flash = 0.12; k.life = 0; Sound.sfx(e.hp <= 0 ? 'kill' : 'hit');
          burst(k.x, k.y, '#fc6', 4);
          if (e.hp <= 0) burst(e.x + e.w / 2, e.y + e.h / 2, '#c6f', 12);
          break;
        }
      }
    }
    for (const b of bullets) {
      const sdt = dt * slowAt(b.x, b.y);
      b.life -= sdt; b.x += b.vx * sdt; b.y += b.vy * sdt;
      if (rectSolid(b.x, b.y, b.w, b.h)) b.life = 0;
      else if (!player.dead && overlap(player, b)) { hurtPlayer(b.x); b.life = 0; }
    }
    for (const f of fields) f.life -= dt;
    bullets = bullets.filter(b => b.life > 0);
    fields = fields.filter(f => f.life > 0);
    knives = knives.filter(k => k.life > 0);
    enemies = enemies.filter(e => e.hp > 0);
    for (const p of particles) { p.life -= dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    particles = particles.filter(p => p.life > 0);
  }

  function update(dt) {
    time += dt; msgT = Math.max(0, msgT - dt); banner.t = Math.max(0, banner.t - dt);
    if (dlg) { if (Input.pressed('throw') || Input.pressed('jump') || Input.pressed('up')) advanceDlg(); return; }
    if (Input.pressed('mute')) say(Sound.toggle() ? '소리 끔' : '소리 켬');
    if (Input.pressed('restart')) { ending = null; respawn(); }
    updatePlayer(dt);
    if (boss && !boss.active && !boss.intro && player.onGround && player.x > 6 * T) {
      boss.intro = true;
      startDlg(bossDef(boss).intro, () => {
        boss.active = true; lockedPortals = portals; portals = [];
        enterPhase(boss, 0); Sound.bgm('boss_' + boss.id);
      });
    }
    updateBoss(dt);
    updateEnemies(dt);
    updateKnives(dt);
    const tx = player.x + player.w / 2 - W / 2, ty = player.y + player.h / 2 - H / 2;
    camX += (tx - camX) * Math.min(1, dt * 8);
    camY += (ty - camY) * Math.min(1, dt * 8);
    camX = Math.max(0, Math.min(mapW * T - W, camX));
    camY = Math.max(0, Math.min(mapH * T - H, camY));
  }

  const PORTRAITS = { '사쿠야': 'sakuya', '메이링': 'meiling', '파츄리': 'patchouli', '플랑드르': 'flandre', '레밀리아': 'remilia', '요우무': 'youmu', '유유코': 'yuyuko', '레이센': 'reisen', '카구야': 'kaguya' };
  const portraitId = name => { for (const k in PORTRAITS) if (name.includes(k)) return PORTRAITS[k]; return null; };
  function wrapText(text, x, y, maxW, lh) {
    let line = '', yy = y;
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, yy); line = ch; yy += lh; } else line += ch;
    }
    ctx.fillText(line, x, yy);
  }
  function heart(x, y, full) {
    ctx.fillStyle = full ? '#f0485a' : '#3a2230';
    ctx.beginPath(); ctx.moveTo(x + 10, y + 18); ctx.bezierCurveTo(x - 4, y + 8, x + 2, y - 3, x + 10, y + 5); ctx.bezierCurveTo(x + 18, y - 3, x + 24, y + 8, x + 10, y + 18); ctx.fill();
    if (full) { ctx.fillStyle = '#ffb0b8'; ctx.fillRect(x + 4, y + 3, 3, 3); }
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#12101c'; ctx.fillRect(0, 0, W, H);
    Art.drawBackground(ctx, theme, camX, camY, W, H);
    ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));
    Art.drawTiles(ctx, grid, mapW, mapH, camX, camY, W, H, theme);
    for (const q of portals) Art.drawPortal(ctx, q, time);
    for (const q of saves) Art.drawSave(ctx, q, time);
    for (const q of items) Art.drawItem(ctx, q, time);
    // 감속장
    for (const f of fields) {
      const a = Math.min(1, f.life) * 0.5;
      const gr = ctx.createRadialGradient(f.x, f.y, f.r * 0.2, f.x, f.y, f.r);
      gr.addColorStop(0, 'rgba(110,150,255,0)'); gr.addColorStop(1, `rgba(110,150,255,${a * 0.5})`);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(190,215,255,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.55, time * 0.8, time * 0.8 + 4.2); ctx.stroke();
      for (let i = 0; i < 12; i++) {            // 시계 눈금
        const ang = i / 12 * Math.PI * 2; ctx.beginPath();
        ctx.moveTo(f.x + Math.cos(ang) * (f.r - 8), f.y + Math.sin(ang) * (f.r - 8)); ctx.lineTo(f.x + Math.cos(ang) * (f.r - 2), f.y + Math.sin(ang) * (f.r - 2)); ctx.stroke();
      }
    }
    // 적
    for (const e of enemies) {
      if (e.flash > 0) ctx.filter = 'brightness(2.4)';
      Art.drawEnemy(ctx, e, time);
      ctx.filter = 'none';
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#300'; ctx.fillRect(e.x, e.y - 10, e.w, 4);
        ctx.fillStyle = '#f55'; ctx.fillRect(e.x, e.y - 10, e.w * e.hp / e.maxHp, 4);
      }
    }
    // 보스
    if (boss) {
      const d = bossDef(boss), cA = boss.inv > 0 && Math.floor(time * 16) % 2 === 0;
      if (!cA) {
        const ph = d.phases[boss.phase], fl = ph.fly !== undefined ? ph.fly : d.fly;
        if (boss.flash > 0) ctx.filter = 'brightness(2.2)'; else if (boss.warn) ctx.filter = 'brightness(1.7) saturate(1.6)';
        Sprites.drawChar(ctx, boss.id, { onGround: boss.onGround, vx: boss.vx, vy: boss.vy, fly: fl, cast: boss.active && ph.spell && boss.inv <= 0 && Math.floor(time * 2) % 2 === 0 }, boss.x + boss.w / 2, fl ? boss.y + boss.h / 2 + 39 : boss.y + boss.h, boss.dir, time);
        ctx.filter = 'none';
      }
    }
    // 나이프
    for (const k of knives) Art.drawKnife(ctx, k);
    // 플레이어
    const p = player;
    if (!p.dead && !(p.inv > 0 && p.inv < P.iframes - 0.4 && Math.floor(time * 20) % 2 === 0 && p.dashT <= 0)) {
      Sprites.drawChar(ctx, 'sakuya', {
        onGround: p.onGround, vx: p.vx, vy: p.vy, crouch: p.crouch, dash: p.dashT > 0,
        hurt: p.inv > P.iframes - 0.3 && p.dashT <= 0 && p.hp < maxHp(), throw: p.knifeCd > 0.1 ? p.knifeCd / P.knifeCd : 0,
      }, p.x + p.w / 2, p.y + p.h, p.face, time);
    }
    // 탄막 (가산 합성으로 빛나게)
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bullets) Art.drawBullet(ctx, b);
    ctx.globalCompositeOperation = 'source-over';
    for (const q of particles) { ctx.globalAlpha = Math.min(1, q.life * 3); ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, 3, 3); }
    ctx.globalAlpha = 1;
    ctx.restore();
    Art.drawAmbient(ctx, theme, camX, camY, W, H, time);

    // 미니맵 (전체 폭 150px에 맞춰 축소)
    { const cell = Math.min(30, 150 / (MAP_COLS + 0.2)), x0 = W - 16 - cell * MAP_COLS;
      for (const id in world.visited) {
        const r = MAPS[id]; if (!r) continue;
        ctx.fillStyle = id === roomId ? '#8fb4ff' : '#4a4468';
        ctx.fillRect(x0 + r.gx * cell, 16 + r.gy * 12, cell - 3, 8);
      } }
    if (boss && boss.active) {
      const def = bossDef(boss), bw = 420, bx = (W - bw) / 2, by = H - 40;
      ctx.fillStyle = '#211'; ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = def.phases[boss.phase].spell ? '#e8a' : '#e55'; ctx.fillRect(bx, by, bw * Math.max(0, boss.hp) / boss.maxHp, 10);
      ctx.fillStyle = '#fff'; for (const ph of def.phases.slice(0, -1)) ctx.fillRect(bx + bw * ph.at - 1, by - 3, 2, 16);
      ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(boss.name, W / 2, by - 8); ctx.textAlign = 'left';
    }
    if (banner.t > 0) {
      ctx.globalAlpha = Math.min(1, banner.t); ctx.fillStyle = 'rgba(30,10,40,.65)'; ctx.fillRect(0, 118, W, 46);
      ctx.fillStyle = '#ffe6f2'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(banner.text, W / 2, 150); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (dlg) {
      const l = dlg.lines[dlg.i], pid = portraitId(l[0]);
      ctx.fillStyle = 'rgba(8,6,16,.9)'; ctx.fillRect(40, 70, W - 80, 128);
      ctx.strokeStyle = '#6a5a9a'; ctx.lineWidth = 2; ctx.strokeRect(40, 70, W - 80, 128);
      let tx = 64;
      if (pid) {
        ctx.fillStyle = '#241c3a'; ctx.fillRect(52, 78, 112, 112); ctx.strokeStyle = '#4c446f'; ctx.strokeRect(52, 78, 112, 112);
        ctx.drawImage(Sprites.portrait(pid), 52, 78, 112, 112); tx = 184;
      }
      ctx.fillStyle = '#8fb4ff'; ctx.font = '16px sans-serif'; ctx.fillText(l[0], tx, 102);
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; wrapText(l[1], tx, 138, W - 80 - (tx - 40) - 24, 28);
      ctx.fillStyle = '#9a93b8'; ctx.font = '12px sans-serif'; ctx.fillText('Z / Space 로 넘기기', W - 190, 188);
    }
    if (ending) {
      ending.t += 1 / 60;
      const a = Math.min(1, ending.t / 3);
      ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H);
      if (ending.t > 3) {
        ctx.globalAlpha = Math.min(1, (ending.t - 3) / 2); ctx.fillStyle = '#e6e2f5'; ctx.textAlign = 'center';
        ctx.font = '34px sans-serif'; ctx.fillText('月蝕録 外傳 — 終', W / 2, H / 2 - 20);
        ctx.font = '18px sans-serif'; ctx.fillStyle = '#9a93b8';
        ctx.fillText('이 이야기는 『동방월식록』으로 이어집니다.', W / 2, H / 2 + 24);
        ctx.fillText('R 키: 처음 저장 지점에서 다시 시작', W / 2, H / 2 + 60);
        ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
    }
    if (msgT > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, msgT)})`; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msgText, W / 2, 90); ctx.textAlign = 'left'; }
    // HUD
    for (let i = 0; i < maxHp(); i++) {
      heart(16 + i * 26, 14, i < p.hp);
    }
    ctx.fillStyle = '#123'; ctx.fillRect(16, 42, 130, 8);
    ctx.fillStyle = p.mana >= P.fieldCost ? '#6af' : '#358'; ctx.fillRect(16, 42, 130 * p.mana / P.maxMana, 8);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
    ctx.fillText(map.name + (world.abil.double ? ' · 이단 점프' : ''), 16, 70);
    if (p.dead) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = '32px sans-serif'; ctx.fillText('— 시간이 멈췄다 —', W / 2 - 150, H / 2);
    }
  }

  let acc = 0, last = performance.now();
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    while (acc >= DT) { update(DT); Input.endFrame(); acc -= DT; }
    draw();
    requestAnimationFrame(frame);
  }

  if (world.save) loadMap(world.save.room, { pos: world.save.pos }); else loadMap('start');
  if (!world.intro) {
    world.intro = true;
    startDlg([
      ['', '홍마관의 평온한 밤. 사쿠야는 평소처럼 순찰을 돌고 있다.'],
      ['', '달은 맑고, 아가씨의 홍차는 아직 식지 않았다.'],
      ['', '(←→ 이동 · Space 점프 · Z 나이프 · Q 시간 감속장 · ↑ 저장)'],
    ]);
  }
  requestAnimationFrame(frame);
  // 테스트/디버그용 훅
  window.__game = { loadMap, get ending() { return ending; }, get boss() { return boss; }, get bullets() { return bullets; }, get dlg() { return dlg; }, get room() { return roomId; }, world, get player() { return player; }, get enemies() { return enemies; }, get knives() { return knives; }, step: n => { for (let i = 0; i < n; i++) { update(DT); Input.endFrame(); } }, Input };
})();
