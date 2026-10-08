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
  let boss = null, lockedPortals = [], dlg = null, banner = { text: '', t: 0 };

  // 진행 상황 (저장됨)
  const SAVE_KEY = 'gesshokuroku_gaiden_save_v1';
  const world = { abil: { double: false }, got: {}, visited: { start: true }, save: null, bosses: {}, intro: false };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) Object.assign(world, JSON.parse(raw));
  } catch (e) { /* 저장소를 못 쓰는 환경이면 무시 */ }
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
      else if (c === 'B') { if (!world.bosses.meiling) boss = makeBoss(x * T + 3, (y + 1) * T - 46); }
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
      hp: prev ? prev.hp : P.maxHp, mana: prev ? prev.mana : P.maxMana, inv: prev ? prev.inv : 0,
      knifeCd: 0, dead: false, deadT: 0, start,
    };
    camX = Math.max(0, Math.min(mapW * T - W, player.x - W / 2));
    camY = Math.max(0, Math.min(mapH * T - H, player.y - H / 2));
    time = 0;
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
  const BOSS_PHASES = [
    { name: '정권 연무', at: 0.65, spell: false },
    { name: '기공 「채광 난무」', at: 0.30, spell: true },
    { name: '굉권 「홍염의 비」', at: 0, spell: true },
  ];
  function makeBoss(x, y) {
    return { name: '홍 메이링', x, y, w: 26, h: 46, vx: 0, vy: 0, hp: 70, maxHp: 70, phase: 0, t: 0,
      inv: 0, active: false, intro: false, dir: -1, cd: 1.2, dashCd: 3, dashT: 0, tele: 0, flash: 0,
      rain: 0, wave: 2, hop: 1, ang: 0, onGround: false };
  }
  const addBullet = (x, y, vx, vy) => bullets.push({ x, y, w: 8, h: 8, vx, vy, life: 7 });

  function startDlg(lines, done) { dlg = { lines, i: 0, done }; }
  function advanceDlg() {
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { const d = dlg.done; dlg = null; if (d) d(); }
  }

  function damageBoss() {
    const b = boss;
    if (!b || !b.active || b.inv > 0) return;
    b.hp--; b.flash = 0.1;
    const ph = BOSS_PHASES[b.phase];
    if (b.hp > b.maxHp * ph.at) return;
    if (b.phase >= BOSS_PHASES.length - 1) { defeatBoss(); return; }
    b.phase++; b.inv = 1.6; b.cd = 1.2; b.hop = 1; b.rain = 0.5; b.vx = 0; b.dashT = 0; b.tele = 0;
    for (const bl of bullets) burst(bl.x, bl.y, '#fc6', 2);
    bullets = [];
    banner = { text: BOSS_PHASES[b.phase].name, t: 2.4 };
    b.hp = Math.min(b.hp, Math.floor(b.maxHp * BOSS_PHASES[b.phase - 1].at));
  }

  function defeatBoss() {
    burst(boss.x + boss.w / 2, boss.y + boss.h / 2, '#fc6', 30);
    bullets = []; boss = null;
    world.bosses.meiling = true;
    portals = lockedPortals; lockedPortals = [];
    player.hp = P.maxHp; player.mana = P.maxMana; persist();
    startDlg([
      ['홍 메이링', '……참 많이 늘으셨네요. 오늘은 제가 졌습니다.'],
      ['사쿠야', '당신이 봐줬을 뿐이에요. 다음에는 정말로 상대해 드리죠.'],
      ['홍 메이링', '아가씨가 찾으세요. 도서관 쪽에서 이상한 소리가 났다고 하시더군요.'],
    ], () => say('연무장 승리! (이후 구역은 다음 단계에서 이어집니다)'));
  }

  function updateBoss(dt) {
    const b = boss;
    if (!b || !b.active) return;
    b.flash = Math.max(0, b.flash - dt);
    b.vy = Math.min(P.maxFall, b.vy + P.gravity * dt);
    if (b.inv > 0) { b.inv -= dt; b.vx = 0; const r = moveBody(b, dt); b.onGround = r.ground; return; }
    const s = dt * slowAt(b.x + b.w / 2, b.y + b.h / 2);
    b.t += s;
    const cx = b.x + b.w / 2, cy = b.y + 14;
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    b.dir = px < cx ? -1 : 1;
    if (b.phase === 0) {
      if (b.dashT > 0) { b.dashT -= s; b.vx = b.dir * 430; }
      else if (b.tele > 0) { b.tele -= s; b.vx = 0; if (b.tele <= 0) b.dashT = 0.5; }
      else {
        b.vx = b.dir * 75; b.cd -= s; b.dashCd -= s;
        if (b.cd <= 0) {
          b.cd = 1.5;
          const a0 = Math.atan2(py - cy, px - cx);
          for (const da of [-0.3, 0, 0.3]) addBullet(cx - 4, cy - 4, Math.cos(a0 + da) * 230, Math.sin(a0 + da) * 230);
        }
        if (b.dashCd <= 0) { b.dashCd = 4; b.tele = 0.55; }
      }
    } else if (b.phase === 1) {
      b.vx = 0; b.cd -= s;
      if (b.cd <= 0) {
        b.cd = 0.6; b.ang += 0.27;
        for (let i = 0; i < 12; i++) { const a = b.ang + i * Math.PI / 6; addBullet(cx - 4, cy - 4, Math.cos(a) * 150, Math.sin(a) * 150); }
      }
    } else {
      b.vx = 0; b.hop -= s; b.rain -= s; b.wave -= s;
      if (b.hop <= 0 && b.onGround) { b.vy = -760; b.hop = 2.6; }
      if (b.rain <= 0) { b.rain = 0.16; addBullet(2 * T + Math.random() * (mapW - 4) * T, T + 4, 0, 210); }
      if (b.wave <= 0) {
        b.wave = 2.8;
        const d = px < cx ? -1 : 1;
        bullets.push({ x: cx - 5, y: (mapH - 2) * T - 12, w: 12, h: 12, vx: d * 250, vy: 0, life: 6 });
      }
    }
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
    player.hp--; player.inv = P.iframes;
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
      const up = Input.held('up');
      knives.push({ x: cx, y: cy, w: 12, h: 4, vx: dir * (up ? 420 : 640), vy: up ? -420 : 0, g: 0, life: 0.9, spin: 0 });
    }
    player.knifeCd = lob ? P.lobCd : P.knifeCd;
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
      p.dashT = P.dashTime; p.dashCd = P.dashCooldown; p.vx = p.face * P.dashSpeed; p.vy = 0;
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
      if (p.buffer > 0 && p.coyote > 0) { p.vy = -P.jump; p.buffer = 0; p.coyote = 0; p.onGround = false; }
      else if (p.buffer > 0 && !p.onGround && world.abil.double && p.airJump) {
        p.vy = -P.jump * 0.92; p.buffer = 0; p.airJump = false;
        burst(p.x + p.w / 2, p.y + p.h, '#9cf', 8);
      }
      if (!Input.held('jump') && p.vy < -120) p.vy += (P.gravity * 2.2) * dt;   // 점프 컷
      p.vy = Math.min(P.maxFall, p.vy + P.gravity * dt);
    }

    // 시간 감속장
    p.mana = Math.min(P.maxMana, p.mana + P.manaRegen * dt);
    if (Input.pressed('time') && p.mana >= P.fieldCost) {
      p.mana -= P.fieldCost;
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
      if (link) { loadMap(link[0], { tile: link[1], keep: true }); persist(); return; }
    }
    if (Input.pressed('up')) {
      const sv = saves.find(q => Math.abs(cx - (q.x + 0.5) * T) < 28 && Math.abs(p.y + p.h - (q.y + 1) * T) < 8);
      if (sv) {
        world.save = { room: roomId, pos: { x: sv.x * T + (T - P.w) / 2, y: (sv.y + 1) * T - P.h } };
        p.hp = P.maxHp; p.mana = P.maxMana; persist(); say('저장했습니다');
        burst(cx, p.y, '#8fd', 10);
      }
    }
    for (const it of items) if (tileHit(it)) {
      if (it.kind === 'double') { world.abil.double = true; say('이단 점프 획득! 공중에서 점프를 한 번 더 누르세요'); }
      world.got[roomId + ':' + it.x + ',' + it.y] = true; it.taken = true; persist();
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
      if (boss && boss.active && overlap(k, boss)) { k.life = 0; burst(k.x, k.y, boss.inv > 0 ? '#ccd' : '#fc6', 4); damageBoss(); continue; }
      for (const e of enemies) {
        if (e.hp > 0 && overlap(k, e)) {
          e.hp--; e.flash = 0.12; k.life = 0;
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
    if (Input.pressed('restart')) respawn();
    updatePlayer(dt);
    if (boss && !boss.active && !boss.intro && player.onGround && player.x > 6 * T) {
      boss.intro = true;
      startDlg([
        ['홍 메이링', '사쿠야 씨, 오늘도 한 수 부탁드립니다.'],
        ['사쿠야', '순찰 중이에요. ……뭐, 잠깐이라면.'],
        ['홍 메이링', '봐주시면 안 됩니다! 저도 오늘은 진심이에요!'],
      ], () => { boss.active = true; lockedPortals = portals; portals = []; banner = { text: BOSS_PHASES[0].name, t: 2 }; });
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

  function draw() {
    ctx.fillStyle = '#12101c'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(-Math.round(camX), -Math.round(camY));
    // 배경 달
    ctx.fillStyle = '#2a2540'; ctx.beginPath(); ctx.arc(camX + 760, camY + 110, 60, 0, 7); ctx.fill();
    // 타일
    const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(mapW - 1, Math.floor((camX + W) / T));
    const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(mapH - 1, Math.floor((camY + H) / T));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y][x] === '#') {
      ctx.fillStyle = '#3a3358'; ctx.fillRect(x * T, y * T, T, T);
      ctx.fillStyle = '#4c446f'; ctx.fillRect(x * T, y * T, T, 3);
    }
    // 이동구·저장·아이템·표지
    for (const q of portals) { ctx.fillStyle = `rgba(140,170,255,${0.12 + 0.08 * Math.sin(time * 3)})`; ctx.fillRect(q.x * T, q.y * T, T, T); }
    for (const q of saves) {
      ctx.fillStyle = '#4fd'; ctx.beginPath(); ctx.moveTo((q.x + .5) * T, q.y * T + 6); ctx.lineTo((q.x + .85) * T, (q.y + .6) * T);
      ctx.lineTo((q.x + .5) * T, (q.y + 1) * T - 2); ctx.lineTo((q.x + .15) * T, (q.y + .6) * T); ctx.fill();
    }
    for (const q of items) { ctx.fillStyle = '#fd5'; const bob = Math.sin(time * 4) * 3; ctx.fillRect(q.x * T + 9, q.y * T + 9 + bob, 14, 14); }
    for (const q of signs) { ctx.fillStyle = '#c9a'; ctx.fillRect(q.x * T + 14, q.y * T - 8, 4, 40); ctx.font = '13px sans-serif'; ctx.fillText(q.text, q.x * T - 150, q.y * T - 14); }
    // 감속장
    for (const f of fields) {
      const a = Math.min(1, f.life) * 0.5;
      ctx.fillStyle = `rgba(110,150,255,${a * 0.35})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(190,215,255,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.55, time * 0.8, time * 0.8 + 4.2); ctx.stroke();
    }
    // 적
    for (const e of enemies) {
      ctx.fillStyle = e.flash > 0 ? '#fff' : (e.type === 'walker' ? '#b34' : e.type === 'turret' ? '#b82' : '#a5c');
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#000'; ctx.fillRect(e.x + (e.vx >= 0 ? e.w - 8 : 3), e.y + 5, 5, 5);
    }
    ctx.fillStyle = '#f84';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x + 4, b.y + 4, 5, 0, 7); ctx.fill(); }
    for (const e of enemies) if (e.hp < e.maxHp) {
      ctx.fillStyle = '#300'; ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = '#f55'; ctx.fillRect(e.x, e.y - 8, e.w * e.hp / e.maxHp, 4);
    }
    if (boss) {
      const cA = boss.inv > 0 && Math.floor(time * 16) % 2 === 0;
      ctx.fillStyle = boss.flash > 0 ? '#fff' : (boss.tele > 0 ? '#fd5' : '#c33'); if (!cA) ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
      ctx.fillStyle = '#2a7a4a'; if (!cA) ctx.fillRect(boss.x - 2, boss.y, boss.w + 4, 9);
      ctx.fillStyle = '#000'; ctx.fillRect(boss.x + (boss.dir > 0 ? 16 : 5), boss.y + 14, 4, 4);
    }
    // 나이프
    ctx.fillStyle = '#dfe6ff';
    for (const k of knives) ctx.fillRect(k.x, k.y, k.w, k.h);
    // 플레이어
    const p = player;
    if (!p.dead && !(p.inv > 0 && Math.floor(time * 20) % 2 === 0 && p.dashT <= 0)) {
      ctx.fillStyle = p.dashT > 0 ? '#9cf' : '#5b7fd0';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e8ecf8'; ctx.fillRect(p.x, p.y, p.w, 12);               // 머리(은발)
      ctx.fillStyle = '#000'; ctx.fillRect(p.x + (p.face > 0 ? 12 : 4), p.y + 5, 4, 4);
    }
    for (const q of particles) { ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, 3, 3); }
    ctx.restore();

    // 미니맵
    for (const id in world.visited) {
      const r = MAPS[id]; if (!r) continue;
      ctx.fillStyle = id === roomId ? '#8fb4ff' : '#4a4468';
      ctx.fillRect(W - 110 + r.gx * 30, 16 + r.gy * 18, 26, 14);
    }
    if (boss && boss.active) {
      const bw = 420, bx = (W - bw) / 2, by = H - 40;
      ctx.fillStyle = '#211'; ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = BOSS_PHASES[boss.phase].spell ? '#e8a' : '#e55'; ctx.fillRect(bx, by, bw * Math.max(0, boss.hp) / boss.maxHp, 10);
      ctx.fillStyle = '#fff'; for (const ph of BOSS_PHASES.slice(0, -1)) ctx.fillRect(bx + bw * ph.at - 1, by - 3, 2, 16);
      ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(boss.name, W / 2, by - 8); ctx.textAlign = 'left';
    }
    if (banner.t > 0) {
      ctx.globalAlpha = Math.min(1, banner.t); ctx.fillStyle = 'rgba(30,10,40,.65)'; ctx.fillRect(0, 118, W, 46);
      ctx.fillStyle = '#ffe6f2'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(banner.text, W / 2, 150); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
    if (dlg) {
      const l = dlg.lines[dlg.i];
      ctx.fillStyle = 'rgba(8,6,16,.88)'; ctx.fillRect(40, 70, W - 80, 120);
      ctx.strokeStyle = '#4c446f'; ctx.lineWidth = 2; ctx.strokeRect(40, 70, W - 80, 120);
      ctx.fillStyle = '#8fb4ff'; ctx.font = '16px sans-serif'; ctx.fillText(l[0], 64, 102);
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.fillText(l[1], 64, 142);
      ctx.fillStyle = '#9a93b8'; ctx.font = '12px sans-serif'; ctx.fillText('Z / Space 로 넘기기', W - 190, 172);
    }
    if (msgT > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, msgT)})`; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msgText, W / 2, 90); ctx.textAlign = 'left'; }
    // HUD
    for (let i = 0; i < P.maxHp; i++) {
      ctx.fillStyle = i < p.hp ? '#e44' : '#422'; ctx.fillRect(16 + i * 26, 16, 20, 20);
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
  window.__game = { loadMap, get boss() { return boss; }, get bullets() { return bullets; }, get dlg() { return dlg; }, get room() { return roomId; }, world, get player() { return player; }, get enemies() { return enemies; }, get knives() { return knives; }, step: n => { for (let i = 0; i < n; i++) { update(DT); Input.endFrame(); } }, Input };
})();
