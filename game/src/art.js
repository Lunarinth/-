// 비인간 그래픽: 적, 탄막, 아이템, 타일, 배경. 모두 코드로 생성해 캐시한다.
const Art = (() => {
  const { Pix, ramp, mix } = Sprites;
  const cache = {};
  const memo = (k, fn) => cache[k] || (cache[k] = fn());
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const flipOf = c => { const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const x = f.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; };

  // ---------- 적 ----------
  function fairy(fr, v) {
    return memo(`fairy${fr}${v}`, () => {
      const g = new Pix(32, 32), hairs = ['#e8c44a', '#6ac8e8', '#7ad87a'], dress = ['#4a78d8', '#d85a8a', '#8a5ad8'];
      const hc = hairs[v % 3], dr = ramp(dress[v % 3]), fl = fr ? 3 : -1;
      for (const s of [-1, 1]) {                        // 날개 (반투명 느낌의 옅은 색)
        g.poly([[16 + s * 3, 12], [16 + s * 13, 6 + fl], [16 + s * 12, 15 + fl], [16 + s * 3, 17]], ramp('#cfeaff'));
        g.px(16 + s * 9, 9 + fl, '#ffffff');
      }
      g.rect(12, 24 + (fr ? 1 : 0), 3, 5, '#fde0cf'); g.rect(17, 24 + (fr ? 0 : 1), 3, 5, '#fde0cf');
      g.rect(11, 28, 5, 2, '#5a3a4a'); g.rect(16, 28, 5, 2, '#5a3a4a');
      g.poly([[11, 17], [21, 17], [24, 26], [8, 26]], dr);
      g.rect(9, 17, 3, 5, '#fde0cf'); g.rect(20, 17, 3, 5, '#fde0cf');
      g.ell(16, 11, 8, 7.5, ['#fff1e6', '#fde0cf', '#e9b8a8']);
      g.ell(16, 7, 8.5, 5, ramp(hc)); g.rect(8, 7, 3, 7, hc); g.rect(21, 7, 3, 7, hc);
      for (const x of [12, 18]) { g.rect(x, 11, 2, 3, '#2a2a5a'); g.px(x, 11, '#ffffff'); }
      g.rect(14, 15, 3, 1, '#d98a8a');
      return g.finish();
    });
  }
  function wisp(fr, v) {
    return memo(`wisp${fr}${v}`, () => {
      const g = new Pix(32, 32), cols = ['#cfe6ff', '#ffd6e8', '#d6ffd8'], rp = ramp(cols[v % 3]);
      const w = fr ? 2 : -2;
      g.poly([[8, 14], [24, 14], [26 + w, 22], [22, 27 + w], [18, 23], [14, 29 - w], [10, 23], [5 + w, 24]], rp);
      g.ell(16, 12, 9, 9, rp);
      g.rect(11, 11, 3, 4, '#2a2a5a'); g.rect(18, 11, 3, 4, '#2a2a5a'); g.px(11, 11, '#ffffff'); g.px(18, 11, '#ffffff'); g.rect(14, 17, 4, 1, '#6a6a9a');
      return g.finish();
    });
  }
  function turret(fr) {
    return memo(`turret${fr}`, () => {
      const g = new Pix(32, 32), st = ramp('#6a6480'), gl = fr ? '#ff6a4a' : '#ffb24a';
      g.rect(8, 22, 16, 8, st[1]); g.rect(8, 22, 16, 2, st[0]); g.rect(6, 28, 20, 3, st[2]);
      g.rect(10, 24, 12, 1, st[2]);
      g.ell(16, 14, 8, 9, ramp('#e8dcec'));                                   // 인형 머리
      g.ell(16, 7, 9, 5, ramp('#3a2a4a'));
      g.rect(10, 12, 4, 4, gl); g.rect(18, 12, 4, 4, gl); g.px(10, 12, '#ffffff'); g.px(18, 12, '#ffffff');
      g.rect(14, 18, 4, 1, '#8a3a4a');
      for (let x = 8; x <= 24; x += 3) g.px(x, 21, '#c84a6a');                // 프릴
      return g.finish();
    });
  }
  function drawEnemy(ctx, e, time) {
    const fr = Math.floor(time * 6) % 2, v = Math.floor(e.x / 97) % 3 + 3;
    let c;
    if (e.type === 'walker') { c = fairy(fr, v); if (e.dir > 0) c = memo('ff' + fr + v, () => flipOf(fairy(fr, v))); ctx.drawImage(c, Math.round(e.x + e.w / 2 - 16), Math.round(e.y + e.h - 31)); }
    else if (e.type === 'flyer') { c = wisp(fr, v); if (e.vx < 0) c = memo('wf' + fr + v, () => flipOf(wisp(fr, v))); ctx.drawImage(c, Math.round(e.x + e.w / 2 - 16), Math.round(e.y + e.h / 2 - 14)); }
    else { c = turret(Math.floor(time * 3 + e.x) % 2); ctx.drawImage(c, Math.round(e.x + e.w / 2 - 16), Math.round(e.y + e.h - 30)); }
  }

  // ---------- 탄막 / 소품 ----------
  function orb(color, r) {
    return memo(`orb${color}${r}`, () => {
      const s = r * 2 + 8, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d');
      const gr = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(Math.min(0.9, r / (r + 4) * 0.8), color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr; x.fillRect(0, 0, s, s);
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(s / 2, s / 2, Math.max(1.5, r * 0.45), 0, 7); x.fill();
      return c;
    });
  }
  function drawBullet(ctx, b) {
    const col = b.c || '#ff8844';
    if (b.w > b.h + 4) {                                       // 창/레이저 형태
      const len = b.w, h = Math.max(6, b.h);
      ctx.fillStyle = col; ctx.fillRect(b.x, b.y + h * 0.25, len, h * 0.5);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(b.x + len * 0.2, b.y + h * 0.4, len * 0.7, Math.max(1, h * 0.2));
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(b.vx < 0 ? b.x : b.x + len, b.y + h / 2); ctx.lineTo(b.vx < 0 ? b.x + 6 : b.x + len - 6, b.y); ctx.lineTo(b.vx < 0 ? b.x + 6 : b.x + len - 6, b.y + h); ctx.fill();
      return;
    }
    const r = Math.max(4, Math.round(b.w / 2 + 1)), o = orb(col, r), s = o.width;
    ctx.drawImage(o, Math.round(b.x + b.w / 2 - s / 2), Math.round(b.y + b.h / 2 - s / 2));
  }
  function knife(ang) {
    return memo('knife' + ang, () => {
      const c = document.createElement('canvas'); c.width = 20; c.height = 8; const x = c.getContext('2d');
      x.fillStyle = '#7a4a2a'; x.fillRect(0, 3, 5, 2);
      x.fillStyle = '#c8d0e0'; x.beginPath(); x.moveTo(5, 1); x.lineTo(18, 4); x.lineTo(5, 7); x.fill();
      x.fillStyle = '#ffffff'; x.fillRect(6, 3, 9, 1);
      return c;
    });
  }
  function drawKnife(ctx, k) {
    const a = Math.atan2(k.vy, k.vx), cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.drawImage(knife(0), -10, -4); ctx.restore();
  }
  function crystal(time) {
    const g = new Pix(24, 32), cy = ramp('#38e8d0');
    g.poly([[12, 1], [20, 11], [12, 29], [4, 11]], cy); g.poly([[12, 1], [12, 29], [4, 11]], ramp('#8af4e4'));
    g.line(4, 11, 20, 11, '#ffffff', 1); g.px(9, 7, '#ffffff'); g.px(9, 8, '#ffffff');
    return g.finish();
  }
  function item() {
    return memo('item', () => {
      const g = new Pix(24, 24);                                 // 날개 깃털 (이단 점프)
      g.poly([[12, 2], [20, 9], [17, 20], [12, 22], [7, 20], [4, 9]], ramp('#f6e27a'));
      g.line(12, 4, 12, 21, '#fff8d0', 1);
      for (let i = 0; i < 4; i++) { g.line(12, 8 + i * 3, 18 - i, 6 + i * 3, '#e8c04a', 1); g.line(12, 8 + i * 3, 6 + i, 6 + i * 3, '#e8c04a', 1); }
      return g.finish();
    });
  }
  function drawItem(ctx, q, time) { const bob = Math.sin(time * 4) * 3; const gl = orb('#f6e27a', 12); ctx.drawImage(gl, q.x * 32 + 16 - gl.width / 2, q.y * 32 + 16 - gl.height / 2 + bob); ctx.drawImage(item(), q.x * 32 + 4, q.y * 32 + 4 + bob); }
  function drawSave(ctx, q, time) { const gl = orb('#38e8d0', 14); ctx.globalAlpha = 0.6 + Math.sin(time * 3) * 0.2; ctx.drawImage(gl, q.x * 32 + 16 - gl.width / 2, q.y * 32 + 16 - gl.height / 2); ctx.globalAlpha = 1; ctx.drawImage(memo('crystal', crystal), q.x * 32 + 4, q.y * 32 + 2 + Math.sin(time * 2) * 2); }
  function drawPortal(ctx, q, time) {
    const x = q.x * 32, y = q.y * 32, a = 0.18 + 0.1 * Math.sin(time * 3);
    const gr = ctx.createLinearGradient(x, y, x + (q.x === 0 ? 32 : -0), y); ctx.fillStyle = `rgba(150,180,255,${a})`; ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = `rgba(220,235,255,${a + 0.1})`; for (let i = 0; i < 4; i++) { const yy = y + ((time * 20 + i * 8) % 32); ctx.fillRect(x + 4 + i * 6, yy, 2, 4); }
  }

  // ---------- 타일 ----------
  const THEMES = {
    garden: { kind: 'earth', base: '#5a4636', hi: '#7a6046', lo: '#3a2c24', cap: '#3c8a4a', cap2: '#58b060', sky: ['#0a0c1c', '#1a2a3a'], moon: '#f0f0d8' },
    mansion: { kind: 'brick', base: '#7a2a34', hi: '#9a3c46', lo: '#4a1a22', cap: '#c8a24a', sky: ['#14080e', '#2e1018'], moon: '#d84a5a' },
    library: { kind: 'shelf', base: '#4a3a5a', hi: '#6a5a82', lo: '#2a2036', cap: '#b898e0', sky: ['#0c0818', '#1c1430'], moon: '#a888e0' },
    dungeon: { kind: 'stone', base: '#4a4658', hi: '#68647a', lo: '#2a2632', cap: '#a8a0b8', sky: ['#0a0810', '#241018'], moon: '#c83a4a' },
    nether: { kind: 'blossom', base: '#4a4a6e', hi: '#6a6a92', lo: '#2c2c48', cap: '#f4a8c4', sky: ['#080a1c', '#18204a'], moon: '#e8f0ff' },
    bamboo: { kind: 'moss', base: '#3a4a3a', hi: '#547054', lo: '#222e24', cap: '#6ac86a', sky: ['#06100e', '#123028'], moon: '#f8f4c8' },
    eientei: { kind: 'wood', base: '#6a4a38', hi: '#8a6648', lo: '#3e2a20', cap: '#e8c850', sky: ['#0a0a18', '#2a1a30'], moon: '#fff4c8' },
  };
  function tile(theme, variant, top) {
    return memo(`tile${theme}${variant}${top}`, () => {
      const T = THEMES[theme], g = new Pix(32, 32), R = (x, y) => hash(x + variant * 31, y + 7);
      const base = ramp(T.base);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) g.px(x, y, T.base);
      if (T.kind === 'brick') {
        for (let row = 0; row < 4; row++) {
          const off = row % 2 ? 8 : 0;
          for (let bx = -1; bx < 3; bx++) {
            const x0 = bx * 16 + off, y0 = row * 8, sh = R(bx + 5, row);
            g.rect(x0, y0, 15, 7, sh > 0.66 ? T.hi : sh > 0.33 ? T.base : mix(T.base, T.lo, 0.3));
            g.rect(x0, y0, 15, 1, T.hi); g.rect(x0, y0 + 6, 15, 1, T.lo);
          }
        }
      } else if (T.kind === 'shelf') {
        g.rect(0, 0, 32, 32, T.lo); g.rect(0, 0, 32, 2, T.hi);
        const cols = ['#8a2a3a', '#2a5a8a', '#3a7a4a', '#c8a24a', '#7a4a8a', '#a85a2a', '#4a8a8a'];
        for (let row = 0; row < 2; row++) { let x = 1; while (x < 30) { const w = 2 + Math.floor(R(x, row) * 3), h = 10 + Math.floor(R(row, x) * 4); const c = cols[Math.floor(R(x * 3, row * 5) * 7)]; g.rect(x, row * 15 + 15 - h + 1, w, h, c); g.rect(x, row * 15 + 15 - h + 1, 1, h, mix(c, '#ffffff', 0.25)); x += w + 1; } g.rect(0, row * 15 + 15, 32, 2, T.hi); }
      } else if (T.kind === 'stone') {
        for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) { const sh = R(bx, by); g.rect(bx * 16 + 1, by * 16 + 1, 14, 14, sh > 0.5 ? T.hi : T.base); g.rect(bx * 16 + 1, by * 16 + 1, 14, 1, mix(T.hi, '#ffffff', 0.2)); g.rect(bx * 16, by * 16, 16, 1, T.lo); g.rect(bx * 16, by * 16, 1, 16, T.lo); }
        if (R(3, 3) > 0.6) g.line(6, 4, 12, 14, T.lo, 1);
      } else if (T.kind === 'blossom') {
        for (let y = 0; y < 32; y += 8) for (let x = 0; x < 32; x++) g.px(x, y + (x % 7 === 0 ? 1 : 0), T.lo);
        for (let i = 0; i < 40; i++) { g.px(Math.floor(R(i, 1) * 32), Math.floor(R(1, i) * 32), R(i, i) > 0.5 ? T.hi : T.lo); }
        g.px(Math.floor(R(9, 9) * 28) + 2, Math.floor(R(8, 8) * 28) + 2, '#f4a8c4');
      } else if (T.kind === 'moss') {
        for (let i = 0; i < 70; i++) g.px(Math.floor(R(i, 2) * 32), Math.floor(R(2, i) * 32), R(i, 3) > 0.55 ? T.hi : T.lo);
        for (let x = 0; x < 32; x += 3) g.px(x, 8 + Math.floor(R(x, 1) * 4), '#6ac86a');
      } else if (T.kind === 'wood') {
        for (let row = 0; row < 4; row++) { g.rect(0, row * 8, 32, 1, T.lo); for (let x = 0; x < 32; x += 2) if (R(x, row) > 0.7) g.px(x, row * 8 + 3 + Math.floor(R(row, x) * 3), T.lo); g.rect(0, row * 8 + 1, 32, 1, T.hi); }
        g.rect((variant * 11) % 24 + 2, 4, 1, 24, T.lo);
      } else {                                                   // earth
        for (let i = 0; i < 80; i++) g.px(Math.floor(R(i, 4) * 32), Math.floor(R(4, i) * 32), R(i, 5) > 0.5 ? T.hi : T.lo);
        for (let i = 0; i < 5; i++) g.rect(Math.floor(R(i, 6) * 26), Math.floor(R(6, i) * 26) + 4, 4, 3, '#8a8a8a');
      }
      if (top) {                                                 // 윗면 마감
        if (T.kind === 'earth' || T.kind === 'moss' || T.kind === 'blossom') {
          g.rect(0, 0, 32, 5, T.cap); g.rect(0, 0, 32, 2, T.cap2 || mix(T.cap, '#ffffff', 0.3));
          for (let x = 0; x < 32; x += 2) { const h = 5 + Math.floor(R(x, 9) * 4); g.rect(x, 4, 2, h - 4, T.cap); }
        } else { g.rect(0, 0, 32, 3, T.cap); g.rect(0, 0, 32, 1, mix(T.cap, '#ffffff', 0.4)); g.rect(0, 3, 32, 1, T.lo); }
      }
      g.rect(0, 31, 32, 1, T.lo);
      // 타일 자체엔 외곽선을 두지 않고(이음새 유지) 가장자리만 어둡게
      g.x.putImageData(g.img, 0, 0);
      return g.c;
    });
  }
  function drawTiles(ctx, grid, mapW, mapH, camX, camY, W, H, theme) {
    const x0 = Math.max(0, Math.floor(camX / 32)), x1 = Math.min(mapW - 1, Math.floor((camX + W) / 32));
    const y0 = Math.max(0, Math.floor(camY / 32)), y1 = Math.min(mapH - 1, Math.floor((camY + H) / 32));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y][x] === '#') {
      const topOpen = y > 0 && grid[y - 1][x] !== '#';
      ctx.drawImage(tile(theme, Math.floor(hash(x, y) * 3), topOpen), x * 32, y * 32);
    }
  }

  // ---------- 배경 (반해상도로 그려 2배 확대: 도트 느낌) ----------
  function background(theme) {
    return memo('bg' + theme, () => {
      const T = THEMES[theme], c = document.createElement('canvas'); c.width = 840; c.height = 300; const x = c.getContext('2d');
      const R = (a, b) => hash(a * 3 + 1, b * 7 + 2);
      const gr = x.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, T.sky[0]); gr.addColorStop(1, T.sky[1]); x.fillStyle = gr; x.fillRect(0, 0, 840, 300);
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.25 + R(i, 1) * 0.6})`; x.fillRect(Math.floor(R(i, 2) * 840), Math.floor(R(i, 3) * 190), 1, 1); }
      // 달
      const mx = 560, my = 70; const mg = x.createRadialGradient(mx, my, 10, mx, my, 70); mg.addColorStop(0, T.moon + 'aa'); mg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = mg; x.fillRect(mx - 80, my - 80, 160, 160);
      x.fillStyle = T.moon; x.beginPath(); x.arc(mx, my, 26, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.arc(mx - 8, my - 6, 6, 0, 7); x.arc(mx + 8, my + 8, 4, 0, 7); x.fill();
      const dark = (a) => `rgba(${theme === 'mansion' ? '30,8,14' : theme === 'nether' ? '14,16,40' : theme === 'bamboo' ? '6,20,16' : '10,8,22'},${a})`;
      if (theme === 'garden') {
        x.fillStyle = dark(0.9); x.fillRect(120, 150, 260, 150); x.fillRect(150, 110, 40, 60); x.fillRect(330, 100, 30, 80); x.beginPath(); x.moveTo(150, 110); x.lineTo(170, 80); x.lineTo(190, 110); x.fill(); x.beginPath(); x.moveTo(330, 100); x.lineTo(345, 70); x.lineTo(360, 100); x.fill();
        x.fillStyle = '#f0c850'; for (let i = 0; i < 14; i++) x.fillRect(135 + (i % 7) * 34, 165 + Math.floor(i / 7) * 40, 8, 12);
        x.fillStyle = dark(0.95); for (let i = 0; i < 20; i++) { x.beginPath(); x.arc(i * 44 + 20, 270, 26, Math.PI, 0); x.fill(); }
      } else if (theme === 'mansion') {
        x.fillStyle = dark(0.7); for (let i = 0; i < 9; i++) x.fillRect(i * 100 + 20, 0, 22, 300);
        for (let i = 0; i < 6; i++) { const wx = 70 + i * 150; x.fillStyle = '#0a0408'; x.fillRect(wx, 50, 46, 150); x.beginPath(); x.arc(wx + 23, 50, 23, Math.PI, 0); x.fill(); x.fillStyle = 'rgba(216,74,90,.18)'; x.fillRect(wx + 4, 54, 38, 142); x.fillStyle = '#c8a24a'; x.fillRect(wx + 22, 40, 2, 160); x.fillRect(wx, 120, 46, 2); }
        x.fillStyle = '#c8a24a'; for (let i = 0; i < 9; i++) { x.fillRect(i * 100 + 18, 0, 26, 4); x.fillRect(i * 100 + 18, 280, 26, 4); }
      } else if (theme === 'library') {
        const cols = ['#4a2a4a', '#2a3a5a', '#3a4a2a', '#5a3a2a', '#3a2a5a'];
        for (let row = 0; row < 6; row++) { let xx = 0; while (xx < 840) { const w = 3 + Math.floor(R(xx, row) * 4); x.fillStyle = cols[Math.floor(R(row, xx) * 5)]; x.fillRect(xx, row * 50 + 8, w, 36); xx += w + (R(xx, 9) > 0.9 ? 6 : 0); } x.fillStyle = '#1a1226'; x.fillRect(0, row * 50 + 44, 840, 6); }
        x.fillStyle = 'rgba(184,152,224,.16)'; x.fillRect(0, 0, 840, 300);
      } else if (theme === 'dungeon') {
        for (let i = 0; i < 6; i++) { x.fillStyle = dark(0.8); x.beginPath(); x.moveTo(i * 150 + 10, 300); x.lineTo(i * 150 + 10, 120); x.arc(i * 150 + 80, 120, 70, Math.PI, 0); x.lineTo(i * 150 + 150, 300); x.lineTo(i * 150 + 130, 300); x.lineTo(i * 150 + 130, 120); x.arc(i * 150 + 80, 120, 50, 0, Math.PI, true); x.lineTo(i * 150 + 30, 300); x.fill(); }
        x.strokeStyle = '#3a3448'; x.lineWidth = 2; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(i * 90 + 30, 0); x.lineTo(i * 90 + 30, 40 + R(i, 1) * 80); x.stroke(); }
        const eg = x.createLinearGradient(0, 300, 0, 160); eg.addColorStop(0, 'rgba(200,40,60,.35)'); eg.addColorStop(1, 'rgba(200,40,60,0)'); x.fillStyle = eg; x.fillRect(0, 160, 840, 140);
      } else if (theme === 'nether') {
        for (let i = 0; i < 8; i++) { const tx = i * 120 + 30; x.fillStyle = dark(0.9); x.fillRect(tx + 18, 150, 8, 150); x.fillStyle = 'rgba(244,168,196,.5)'; for (let k = 0; k < 28; k++) x.fillRect(tx + 10 + (R(i * 9 + k, 1) - 0.5) * 90, 90 + R(k, i) * 90, 4, 3); }
        x.fillStyle = 'rgba(120,150,255,.5)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(40 + i * 70, 180 + R(i, 4) * 60, 3, 0, 7); x.fill(); }
      } else if (theme === 'bamboo') {
        for (let layer = 0; layer < 3; layer++) { x.fillStyle = `rgba(6,${28 + layer * 12},${22 + layer * 10},${0.55 + layer * 0.15})`; for (let i = 0; i < 24; i++) { const bx = i * 36 + (layer * 13) % 30 + R(i, layer) * 10, w = 6 + layer * 3; x.fillRect(bx, 0, w, 300); x.fillStyle = `rgba(80,140,90,${0.15})`; for (let k = 0; k < 6; k++) x.fillRect(bx - 1, 40 + k * 46, w + 2, 2); x.fillStyle = `rgba(6,${28 + layer * 12},${22 + layer * 10},${0.55 + layer * 0.15})`; } }
        const fg = x.createLinearGradient(0, 300, 0, 180); fg.addColorStop(0, 'rgba(200,240,220,.25)'); fg.addColorStop(1, 'rgba(200,240,220,0)'); x.fillStyle = fg; x.fillRect(0, 180, 840, 120);
      } else {
        x.fillStyle = dark(0.8); x.fillRect(0, 230, 840, 70);
        for (let i = 0; i < 7; i++) { const sx = i * 130 + 10; x.fillStyle = 'rgba(40,24,50,.9)'; x.fillRect(sx, 40, 110, 200); x.strokeStyle = '#c8a24a'; x.lineWidth = 2; x.strokeRect(sx, 40, 110, 200); x.strokeStyle = 'rgba(200,162,74,.6)'; x.lineWidth = 1; for (let k = 1; k < 4; k++) { x.beginPath(); x.moveTo(sx + k * 27.5, 40); x.lineTo(sx + k * 27.5, 240); x.stroke(); } for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(sx, 40 + k * 33); x.lineTo(sx + 110, 40 + k * 33); x.stroke(); } x.fillStyle = 'rgba(255,240,200,.13)'; x.fillRect(sx + 2, 42, 106, 196); }
        for (let i = 0; i < 6; i++) { x.fillStyle = '#e04a4a'; x.beginPath(); x.ellipse(70 + i * 140, 24, 9, 12, 0, 0, 7); x.fill(); x.fillStyle = '#ffe8a0'; x.fillRect(66 + i * 140, 20, 8, 8); }
      }
      return c;
    });
  }
  function drawBackground(ctx, theme, camX, camY, W, H) {
    const bg = background(theme), ox = -((camX * 0.25) % 40), oy = -camY * 0.08;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0, 840, 300, ox - 0, oy, 1680, 600);
  }
  function drawAmbient(ctx, theme, camX, camY, W, H, time) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const seed = hash(i, 11), seed2 = hash(i, 23);
      let x, y, col, s = 2;
      if (theme === 'nether') { x = ((seed * W + time * 22 + i * 40) % W); y = ((seed2 * H + time * 30) % H); col = 'rgba(250,180,205,.8)'; s = 3; }
      else if (theme === 'bamboo' || theme === 'garden') { x = (seed * W + Math.sin(time * 0.6 + i) * 24 + W) % W; y = (seed2 * H + Math.cos(time * 0.5 + i) * 18 + H) % H; col = `rgba(220,255,160,${0.4 + 0.4 * Math.sin(time * 2 + i)})`; }
      else if (theme === 'library') { x = (seed * W + Math.sin(time * 0.3 + i) * 12 + W) % W; y = (seed2 * H - time * 8 + H * 4) % H; col = 'rgba(200,170,255,.55)'; }
      else if (theme === 'dungeon') { x = (seed * W + Math.sin(time + i) * 8 + W) % W; y = (H - ((seed2 * H + time * 26) % H)); col = 'rgba(255,120,80,.7)'; }
      else if (theme === 'eientei') { x = (seed * W + Math.sin(time * 0.5 + i) * 18 + W) % W; y = (seed2 * H - time * 10 + H * 4) % H; col = 'rgba(255,230,160,.5)'; }
      else { x = (seed * W + time * 6) % W; y = (seed2 * H + Math.sin(time * 0.4 + i) * 10 + H) % H; col = 'rgba(255,200,210,.4)'; }
      ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), s, s);
    }
  }

  return { drawEnemy, drawBullet, drawKnife, drawItem, drawSave, drawPortal, drawTiles, drawBackground, drawAmbient, THEMES };
})();
