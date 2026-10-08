// 월식록 외전 — 1~2단계: 기반 엔진 + 전투 코어
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
    maxMana: 100, manaRegen: 14, fieldCost: 40, fieldR: 130, fieldLife: 4, slow: 0.25,
  };

  let map, grid, mapW, mapH, player, enemies, knives, particles, fields, bullets, camX, camY, time;

  function loadMap(id) {
    map = MAPS[id];
    grid = map.rows.map(r => r.split(''));
    mapH = grid.length; mapW = grid[0].length;
    enemies = []; knives = []; particles = []; fields = []; bullets = [];
    let start = { x: 2 * T, y: 2 * T };
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      const c = grid[y][x];
      if (c === 'P') { start = { x: x * T + (T - P.w) / 2, y: (y + 1) * T - P.h }; grid[y][x] = '.'; }
      else if (c === 'w') { enemies.push(makeEnemy('walker', x * T + 4, (y + 1) * T - 28)); grid[y][x] = '.'; }
      else if (c === 't') { enemies.push(makeEnemy('turret', x * T + 4, y * T + 4)); grid[y][x] = '.'; }
      else if (c === 'f') { enemies.push(makeEnemy('flyer', x * T, y * T)); grid[y][x] = '.'; }
    }
    player = {
      x: start.x, y: start.y, vx: 0, vy: 0, w: P.w, h: P.h,
      face: 1, onGround: false, coyote: 0, buffer: 0,
      dashT: 0, dashCd: 0, airDash: true,
      hp: P.maxHp, mana: P.maxMana, inv: 0, knifeCd: 0, dead: false, deadT: 0,
      start,
    };
    camX = 0; camY = 0; time = 0;
  }

  function makeEnemy(type, x, y) {
    if (type === 'walker') return { type, x, y, w: 24, h: 28, vx: -60, vy: 0, hp: 3, flash: 0, dir: -1 };
    if (type === 'turret') return { type, x, y, w: 24, h: 24, vx: 0, vy: 0, hp: 4, flash: 0, cd: 1.2 };
    return { type, x, y, baseY: y, w: 24, h: 20, vx: 0, vy: 0, hp: 2, flash: 0, t: Math.random() * 6 };
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
    const cx = player.x + player.w / 2 + dir * 12, cy = player.y + 16;
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
      if (p.deadT <= 0) loadMap('test');
      return;
    }
    const dirIn = (Input.held('right') ? 1 : 0) - (Input.held('left') ? 1 : 0);
    p.inv = Math.max(0, p.inv - dt);
    p.knifeCd = Math.max(0, p.knifeCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.coyote = p.onGround ? P.coyote : Math.max(0, p.coyote - dt);
    p.buffer = Input.pressed('jump') ? P.buffer : Math.max(0, p.buffer - dt);
    if (dirIn) p.face = dirIn;

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
      const target = dirIn * P.run;
      const a = dirIn === 0 ? P.friction : (p.onGround ? P.accel : P.airAccel);
      if (p.vx < target) p.vx = Math.min(target, p.vx + a * dt);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - a * dt);
      // 점프
      if (p.buffer > 0 && p.coyote > 0) { p.vy = -P.jump; p.buffer = 0; p.coyote = 0; p.onGround = false; }
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
    if (p.onGround) p.airDash = true;

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
      const full = dt; dt = full * slowAt(k.x, k.y);
      k.life -= dt; k.vy += k.g * dt; k.spin += dt * 20;
      k.x += k.vx * dt; k.y += k.vy * dt;
      dt = full;
      if (rectSolid(k.x, k.y, k.w, k.h)) { k.life = 0; burst(k.x, k.y, '#ccd', 3); continue; }
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
    time += dt;
    if (Input.pressed('restart')) loadMap('test');
    updatePlayer(dt);
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

    // HUD
    for (let i = 0; i < P.maxHp; i++) {
      ctx.fillStyle = i < p.hp ? '#e44' : '#422'; ctx.fillRect(16 + i * 26, 16, 20, 20);
    }
    ctx.fillStyle = '#123'; ctx.fillRect(16, 42, 130, 8);
    ctx.fillStyle = p.mana >= P.fieldCost ? '#6af' : '#358'; ctx.fillRect(16, 42, 130 * p.mana / P.maxMana, 8);
    ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
    ctx.fillText(map.name, 16, 70);
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

  loadMap('test');
  requestAnimationFrame(frame);
  // 테스트/디버그용 훅
  window.__game = { get player() { return player; }, get enemies() { return enemies; }, get knives() { return knives; }, step: n => { for (let i = 0; i < n; i++) { update(DT); Input.endFrame(); } }, Input };
})();
