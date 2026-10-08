// 도트 그래픽 생성기: 코드로 그린 정밀 스프라이트(48x64).
// 구조: Pix(픽셀 페인터, 3단 음영 + 자동 외곽선) -> 휴머노이드 리그 -> 캐릭터별 의상/머리/소품.
const Sprites = (() => {
  const OUT = '#1b1226';
  const rgbaCache = {};
  const rgba = c => {
    if (rgbaCache[c]) return rgbaCache[c];
    let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
    return (rgbaCache[c] = v);
  };
  const hex = v => '#' + v.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t)); };
  // 색 하나에서 [밝음, 기본, 어두움] 램프 생성 (그림자는 푸른 쪽으로 이동)
  const ramp = c => [mix(c, '#ffffff', 0.32), c, mix(mix(c, '#2a2050', 0.38), '#000000', 0.08)];

  class Pix {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
      this.x = this.c.getContext('2d'); this.img = this.x.createImageData(w, h); this.d = this.img.data;
    }
    px(x, y, col) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
      const v = rgba(col), i = (y * this.w + x) * 4;
      this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; this.d[i + 3] = 255;
    }
    rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col); }
    ell(cx, cy, rx, ry, rp, flat) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        if (flat) { this.px(x, y, rp); continue; }
        const l = -0.5 * u - 0.7 * v;
        this.px(x, y, l > 0.38 ? rp[0] : l > -0.22 ? rp[1] : rp[2]);
      }
    }
    poly(pts, rp, flat) {
      let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
      for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const xs = [], yy = y + 0.5;
        for (let i = 0; i < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
          if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay) / (by - ay) * (bx - ax));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.floor(xs[k] + 0.5); x < Math.floor(xs[k + 1] + 0.5); x++) {
          if (flat) { this.px(x, y, rp); continue; }
          const t = (y - y0) / Math.max(1, y1 - y0) * 0.65 + (x - x0) / Math.max(1, x1 - x0) * 0.35;
          this.px(x, y, t < 0.25 ? rp[0] : t < 0.72 ? rp[1] : rp[2]);
        }
      }
    }
    line(x0, y0, x1, y1, col, th = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.px(x - (th - 1) / 2 + a, y - (th - 1) / 2 + b, col);
      }
    }
    // 외곽선 + 캔버스 반영
    finish(outline = OUT) {
      const { w, h, d } = this, out = new Uint8ClampedArray(d);
      const o = rgba(outline);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3]) continue;
        const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3];
        if (nb(x - 1, y) || nb(x + 1, y) || nb(x, y - 1) || nb(x, y + 1)) { out[i] = o[0]; out[i + 1] = o[1]; out[i + 2] = o[2]; out[i + 3] = 255; }
      }
      this.img.data.set(out); this.x.putImageData(this.img, 0, 0);
      return this.c;
    }
  }

  const SKIN = ['#fff1e6', '#fde0cf', '#e9b8a8'], SKIN_PALE = ['#fcf3f7', '#f4e6ee', '#dcc2d2'];
  const WHITE = ramp('#f4f4fa');

  // ---------- 얼굴 ----------
  function face(g, G, o) {
    const { cx, hy } = G, eye = o.eye || '#c33', y = hy + 1;
    if (G.pose.hurt) {
      for (const dx of [-4, 3]) { g.px(cx + dx, y, OUT); g.px(cx + dx + 2, y, OUT); g.px(cx + dx + 1, y + 1, OUT); g.px(cx + dx, y + 2, OUT); g.px(cx + dx + 2, y + 2, OUT); }
      g.px(cx - 1, y + 5, OUT); g.px(cx, y + 5, OUT); g.px(cx + 1, y + 5, OUT); return;
    }
    for (const dx of [-5, 3]) {              // 큰 눈: 속눈썹, 홍채, 하이라이트
      g.rect(cx + dx, y - 1, 3, 1, OUT);
      g.rect(cx + dx, y, 3, 3, eye); g.px(cx + dx + 1, y + 1, mix(eye, '#000000', 0.55)); g.px(cx + dx, y, '#ffffff');
      g.px(cx + dx + 2, y + 3, mix(eye, '#ffffff', 0.45));
    }
    g.px(cx - 1, y + 4, '#d98a8a'); g.px(cx, y + 4, '#d98a8a');          // 입
    g.px(cx - 6, y + 3, '#f6b2b0'); g.px(cx + 6, y + 3, '#f6b2b0');      // 볼
  }

  // ---------- 휴머노이드 리그 ----------
  function drawHuman(g, o, pose) {
    const cx = 24, bob = pose.bob || 0, crouch = pose.crouch;
    const hy = 19 + bob + (crouch ? 11 : 0) + (pose.hurt ? 1 : 0) - (pose.air < 0 ? 1 : 0);
    const lean = pose.hurt ? -2 : pose.dash ? 3 : 0;
    const sway = pose.sway || 0;
    const ty = hy + 9, by = ty + 12;
    const G = { cx: cx + lean, hy, ty, by, sway, pose, bob, o };

    if (o.back) o.back(g, G);
    if (o.hairBack) o.hairBack(g, G);

    // 다리
    const ph = pose.ph || 0, run = pose.run;
    const legTop = by + 3;
    for (const side of [-1, 1]) {
      let sx = side * 3.5, len = 62 - legTop, lift = 0;
      if (pose.air) { sx += side * 1.5; lift = pose.air < 0 ? (side < 0 ? 5 : 2) : (side < 0 ? 1 : 4); if (side > 0) sx += 2; }
      else if (run) { const a = Math.sin((ph + (side > 0 ? 0.5 : 0)) * Math.PI * 2); sx += a * 4.5; lift = Math.max(0, -Math.cos((ph + (side > 0 ? 0.5 : 0)) * Math.PI * 2)) * 3; }
      else if (crouch) { sx += side * 3; }
      const lx = Math.round(G.cx + sx - 2), top = legTop, bot = 62 - lift;
      const lg = o.legs || SKIN, sh = o.shoes || ramp('#3b2a3a');
      g.rect(lx, top, 4, Math.max(2, bot - top - 3), lg[1]); g.rect(lx, top, 1, Math.max(2, bot - top - 3), lg[0]); g.rect(lx + 3, top, 1, Math.max(2, bot - top - 3), lg[2]);
      g.rect(lx - 1, bot - 4, 6, 4, sh[1]); g.rect(lx - 1, bot - 4, 6, 1, sh[0]); g.rect(lx - 1, bot - 1, 6, 1, sh[2]);
      if (o.legBand) g.rect(lx, top + 3, 4, 1, o.legBand);
    }
    if (o.dress) o.dress(g, G);
    drawArms(g, G, o, pose);

    // 머리
    g.ell(G.cx, hy, 10, 9, o.skin || SKIN);
    if (o.hairBack2) o.hairBack2(g, G);
    face(g, G, o);
    if (o.hairFront) o.hairFront(g, G);
    if (o.head) o.head(g, G);
    if (o.front) o.front(g, G);
  }

  function drawArms(g, G, o, pose) {
    const sl = o.sleeve || ramp('#ffffff'), sk = o.skin || SKIN;
    const sy = G.ty + 3;
    for (const side of [-1, 1]) {
      const sx = G.cx + side * 8;
      let ang;                                                  // 0=오른쪽, +는 아래쪽 회전
      if (side > 0 && pose.throw) ang = -0.15 - pose.throw * 0.35;
      else if (pose.air) ang = side * (pose.air < 0 ? -2.3 : 0.35) + (pose.air < 0 ? Math.PI : 0) * 0 + (pose.air < 0 ? 0 : 0);
      else if (pose.run) ang = Math.PI / 2 + Math.sin(((pose.ph || 0) + (side > 0 ? 0 : 0.5)) * Math.PI * 2) * 0.9 * side * -1;
      else if (pose.crouch) ang = Math.PI / 2 + side * -0.5;
      else ang = Math.PI / 2 + side * -0.22 + (pose.bob ? side * 0.05 : 0);
      if (pose.air < 0 && !(side > 0 && pose.throw)) ang = side > 0 ? -1.0 : Math.PI + 1.0;
      const len = side > 0 && pose.throw ? 13 : 10;
      const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
      g.line(sx, sy, ex, ey, sl[1], 3);
      g.line(sx, sy, (sx + ex) / 2, (sy + ey) / 2, sl[0], 1);
      g.px(ex, ey, sk[1]); g.px(ex + 1, ey, sk[1]); g.px(ex, ey + 1, sk[2]);
      if (side > 0 && pose.throw && o.knife !== false) {            // 나이프
        g.line(ex + 1, ey, ex + 7, ey - 1, '#e8eefc', 1); g.px(ex + 8, ey - 1, '#ffffff'); g.px(ex, ey, '#5a3a2a');
      }
      if (o.handItem && !(side > 0 && pose.throw)) o.handItem(g, G, side, ex, ey);
    }
  }

  // ---------- 캐릭터별 정의 ----------
  const hairBackBlob = (g, G, col, w, bottomY, flare = 0) => {
    const { cx, hy, sway } = G, r = ramp(col);
    g.poly([[cx - w, hy - 2], [cx + w, hy - 2], [cx + w + flare + sway, bottomY], [cx + w * 0.4 + sway, bottomY + 2], [cx - w * 0.4 + sway, bottomY + 2], [cx - w - flare + sway, bottomY]], r);
  };
  const bangs = (g, G, col, style = 0) => {
    const { cx, hy } = G, r = ramp(col);
    g.ell(cx, hy - 5, 10.5, 5.6, r);                          // 윗머리 (눈 위까지만)
    // 앞머리 가닥: 눈 위에서 끊김
    g.poly([[cx - 10, hy - 3], [cx - 8, hy + 1], [cx - 5, hy - 1], [cx - 2, hy - 0.5 + (style ? 1 : 0)], [cx + 1, hy - 1], [cx + 4, hy], [cx + 7, hy - 1], [cx + 10, hy + 1], [cx + 10, hy - 3]], r);
    for (let i = 0; i < 6; i++) g.px(cx - 7 + i * 2.6, hy - 8, r[0]);       // 윤기
    g.px(cx - 9, hy - 6, r[0]); g.px(cx + 9, hy - 6, r[2]);
  };
  const sidelocks = (g, G, col, len = 10) => {
    const { cx, hy, sway } = G, r = ramp(col);
    g.rect(cx - 11, hy - 1, 3, len, r[1]); g.rect(cx + 9, hy - 1, 3, len, r[1]);
    g.rect(cx - 11, hy - 1, 1, len, r[0]); g.rect(cx + 11, hy + 2, 1, Math.max(1, len - 3), r[2]);
  };
  const bow = (g, x, y, col) => { const r = ramp(col); g.rect(x - 3, y - 1, 3, 3, r[1]); g.rect(x + 1, y - 1, 3, 3, r[1]); g.rect(x - 1, y - 1, 3, 3, r[2]); g.px(x - 3, y - 1, r[0]); g.px(x + 1, y - 1, r[0]); };
  const skirtShape = (g, G, rp, topW, botW, hem) => {
    const { cx, by, sway } = G, h = G.pose.crouch ? 5 : 9;
    g.poly([[cx - topW, by - 1], [cx + topW, by - 1], [cx + botW + sway, by + h], [cx - botW + sway, by + h]], rp);
    if (hem) { for (let x = -botW; x <= botW; x += 2) { g.px(cx + x + sway, by + h, hem); } }
  };
  const torsoShape = (g, G, rp, wTop = 7, wBot = 5) => {
    const { cx, ty, by } = G; g.poly([[cx - wTop, ty], [cx + wTop, ty], [cx + wBot, by], [cx - wBot, by]], rp);
  };

  const CHARS = {
    sakuya: {
      eye: '#d0364a', sleeve: ramp('#f4f4fa'), shoes: ramp('#2c2a46'), legs: ramp('#eef0fa'),
      hairBack: (g, G) => hairBackBlob(g, G, '#cdd6ec', 10, G.hy + 8),
      dress: (g, G) => {
        const blue = ramp('#3a5ca8'), white = ramp('#f6f6fc');
        skirtShape(g, G, blue, 6, 11, '#ffffff'); skirtShape(g, G, white, 3, 6, null);
        torsoShape(g, G, blue); g.poly([[G.cx - 3, G.ty + 1], [G.cx + 3, G.ty + 1], [G.cx + 4, G.by + 5], [G.cx - 4, G.by + 5]], white);
        g.rect(G.cx - 1, G.ty, 3, 2, '#2f9a5a'); g.px(G.cx, G.ty + 2, '#1f6e3e');           // 녹색 리본
        g.rect(G.cx - 7, G.by - 1, 14, 2, ramp('#2a4a8e')[1]);
      },
      hairFront: (g, G) => { bangs(g, G, '#d9e0f2', 1); sidelocks(g, G, '#cdd6ec', 6);
        // 땋은 머리(양옆) + 녹색 리본
        for (const s of [-1, 1]) { const bx = G.cx + s * 9; for (let i = 0; i < 9; i++) { g.rect(bx - 1 + Math.round(Math.sin(i * 0.9 + G.sway) * 0.8), G.hy + 4 + i, 3, 1, i % 2 ? '#aab6d4' : '#cdd6ec'); } bow(g, bx, G.hy + 5, '#2f9a5a'); } },
      head: (g, G) => {                           // 메이드 카튜사
        const w = ramp('#ffffff'); g.rect(G.cx - 8, G.hy - 9, 17, 3, w[1]);
        for (let i = -8; i <= 8; i += 2) { g.px(G.cx + i, G.hy - 10, w[0]); g.px(G.cx + i, G.hy - 6, w[2]); }
        g.rect(G.cx - 2, G.hy - 10, 5, 1, '#3a5ca8');
      },
    },
    meiling: {
      eye: '#3a7fd0', sleeve: ramp('#2f8f5a'), shoes: ramp('#3b2a2a'), legs: ramp('#f4f4fa'),
      hairBack: (g, G) => hairBackBlob(g, G, '#c23a2e', 9, G.hy + 14, 2),
      dress: (g, G) => {
        const gr = ramp('#2f8f5a'); skirtShape(g, G, gr, 6, 9, '#f4f4fa'); torsoShape(g, G, gr, 7, 6);
        g.line(G.cx - 5, G.ty + 3, G.cx + 5, G.by - 1, '#e8d36a', 1); g.rect(G.cx - 7, G.by - 1, 14, 2, '#f4f4fa');
        for (let i = 0; i < 3; i++) g.px(G.cx - 5 + i * 5, G.ty + 4, '#e8d36a');
      },
      hairFront: (g, G) => { bangs(g, G, '#d4483a'); sidelocks(g, G, '#c23a2e', 12);
        for (const s of [-1, 1]) { g.rect(G.cx + s * 9, G.hy + 10, 2, 3, '#e8d36a'); } },
      head: (g, G) => { const gr = ramp('#2f8f5a'); g.poly([[G.cx - 9, G.hy - 4], [G.cx + 9, G.hy - 4], [G.cx + 7, G.hy - 11], [G.cx - 7, G.hy - 11]], gr);
        g.rect(G.cx - 9, G.hy - 5, 19, 2, '#e8d36a'); g.rect(G.cx - 1, G.hy - 9, 3, 3, '#f4d84a'); g.px(G.cx, G.hy - 10, '#ffffff'); },
    },
    patchouli: {
      eye: '#9a6ad0', skin: SKIN_PALE, sleeve: ramp('#b8a4e0'), shoes: ramp('#4a3a6a'), legs: ramp('#d8cce8'),
      hairBack: (g, G) => hairBackBlob(g, G, '#8a68c8', 10, G.hy + 20, 3),
      dress: (g, G) => {
        const pu = ramp('#a58ad8'); skirtShape(g, G, pu, 7, 11, '#e8e0f4'); torsoShape(g, G, pu, 8, 7);
        for (let x = -7; x <= 7; x += 3) g.line(G.cx + x, G.ty, G.cx + x * 0.9, G.by + 6, '#e8e0f4', 1);
        g.px(G.cx, G.ty + 1, '#e8c84a'); g.rect(G.cx - 8, G.by, 16, 1, '#6a4aa8');
      },
      hairFront: (g, G) => { bangs(g, G, '#9a78d8'); sidelocks(g, G, '#8a68c8', 16); bow(g, G.cx + 8, G.hy + 3, '#e86a9a'); bow(g, G.cx - 8, G.hy + 3, '#7ac8e8'); },
      head: (g, G) => { const w = ramp('#f4eef8'); g.poly([[G.cx - 10, G.hy - 3], [G.cx + 10, G.hy - 3], [G.cx + 8, G.hy - 11], [G.cx - 8, G.hy - 11]], w);
        g.rect(G.cx - 10, G.hy - 4, 21, 2, '#a58ad8'); g.ell(G.cx + 2, G.hy - 8, 3, 3, '#f0d060', true); g.ell(G.cx + 3, G.hy - 8, 2.4, 2.8, w[0], true); },
      handItem: (g, G, side, ex, ey) => { if (side > 0) { g.rect(ex - 2, ey - 4, 8, 10, '#7a2a4a'); g.rect(ex - 1, ey - 3, 6, 8, '#f0e4c8'); g.px(ex + 2, ey, '#7a2a4a'); } },
    },
    flandre: {
      eye: '#e0242c', sleeve: ramp('#f4f0f0'), shoes: ramp('#8a1a24'), legs: ramp('#f4f0f0'),
      back: (g, G) => {                           // 보석 날개
        const f = Math.sin(G.pose.t * 6) * 1.5, cols = ['#e04a4a', '#f0a030', '#f0e050', '#50c870', '#40a0e8', '#a060e0', '#e060b0'];
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x0 = G.cx + s * 8, y0 = G.ty + 2 + i * 0.2, x1 = G.cx + s * (17 + i * 2), y1 = G.ty - 4 + i * 4 + f * s;
          g.line(x0, y0, x1, y1, '#4a3a5a', 1); g.rect(x1 - 1, y1 - 1, 3, 4, cols[(i + (s > 0 ? 3 : 0)) % 7]); g.px(x1, y1 - 1, '#ffffff'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#e8c44a', 9, G.hy + 7),
      dress: (g, G) => { const rd = ramp('#d8262e'); skirtShape(g, G, rd, 6, 10, '#ffffff'); torsoShape(g, G, rd); g.rect(G.cx - 3, G.ty, 7, 2, '#ffffff'); g.px(G.cx, G.ty + 2, '#f0d84a'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#f4f0f0'); },
      hairFront: (g, G) => { bangs(g, G, '#f0d060', 1); sidelocks(g, G, '#e8c44a', 6);
        g.rect(G.cx - 13, G.hy - 2, 4, 14, '#e8c44a'); g.rect(G.cx - 14, G.hy - 3, 5, 3, '#d8262e'); },
      head: (g, G) => { const w = ramp('#fbf4f4'); g.poly([[G.cx - 9, G.hy - 4], [G.cx + 9, G.hy - 4], [G.cx + 7, G.hy - 10], [G.cx - 7, G.hy - 10]], w); g.rect(G.cx - 9, G.hy - 5, 19, 2, '#d8262e'); g.rect(G.cx + 1, G.hy - 10, 3, 3, '#d8262e'); },
    },
    remilia: {
      eye: '#e03040', skin: SKIN_PALE, sleeve: ramp('#f0a8c0'), shoes: ramp('#6a2a4a'), legs: ramp('#f4eef2'),
      back: (g, G) => {                           // 박쥐 날개
        const f = Math.sin(G.pose.t * 5) * 3;
        for (const s of [-1, 1]) { const tx = G.cx + s * (20 + Math.abs(f)), ty2 = G.ty - 8 + f * 0.6;
          g.poly([[G.cx + s * 4, G.ty + 1], [tx, ty2], [G.cx + s * 21, G.ty + 4 + f * 0.4], [G.cx + s * 15, G.ty + 8], [G.cx + s * 12, G.ty + 14], [G.cx + s * 7, G.ty + 9]], ramp('#7a1b3a'));
          g.line(G.cx + s * 4, G.ty + 1, tx, ty2, '#3a0a1c', 1); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#8aa4e0', 9, G.hy + 9, 1),
      dress: (g, G) => { const pk = ramp('#f2a0bc'); skirtShape(g, G, pk, 6, 10, '#ffffff'); torsoShape(g, G, pk); g.px(G.cx, G.ty + 2, '#d82a4a'); g.px(G.cx, G.ty + 3, '#d82a4a'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#d82a4a'); },
      hairFront: (g, G) => { bangs(g, G, '#98b0ec', 1); sidelocks(g, G, '#8aa4e0', 7); },
      head: (g, G) => { const pk = ramp('#f6b8cc'); g.poly([[G.cx - 10, G.hy - 3], [G.cx + 10, G.hy - 3], [G.cx + 8, G.hy - 11], [G.cx - 8, G.hy - 11]], pk); g.rect(G.cx - 10, G.hy - 4, 21, 2, '#d82a4a'); g.rect(G.cx - 2, G.hy - 8, 5, 3, '#d82a4a'); g.px(G.cx, G.hy - 7, '#ffd0dc'); },
    },
    youmu: {
      eye: '#3a9a6a', sleeve: ramp('#f4f4fa'), shoes: ramp('#2a3a30'), legs: ramp('#eef4ee'),
      back: (g, G) => {                           // 반령 + 장검
        const t = G.pose.t; g.line(G.cx - 10, G.ty - 6, G.cx + 9, G.by + 8, '#c8d0d8', 1); g.rect(G.cx + 8, G.by + 6, 3, 3, '#5a3a2a');
        const gx = G.cx + 14, gy = G.hy + 2 + Math.sin(t * 3) * 2;
        g.ell(gx, gy, 5, 5, ramp('#e4f2f8')); g.poly([[gx - 3, gy + 3], [gx + 3, gy + 3], [gx + 1, gy + 11], [gx - 2, gy + 8]], ramp('#c8e4f0')); g.px(gx - 2, gy - 1, '#4a8a9a'); g.px(gx + 1, gy - 1, '#4a8a9a');
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#dfe4ea', 9, G.hy + 6),
      dress: (g, G) => { const gr = ramp('#2e8a56'); skirtShape(g, G, gr, 6, 9, '#1f6a40'); torsoShape(g, G, ramp('#f4f4fa')); g.poly([[G.cx - 5, G.ty + 2], [G.cx + 5, G.ty + 2], [G.cx + 5, G.by], [G.cx - 5, G.by]], gr); g.px(G.cx, G.ty + 1, '#2a2a3a'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#2a2a3a'); },
      hairFront: (g, G) => { bangs(g, G, '#e8ecf2', 1); sidelocks(g, G, '#dfe4ea', 5); },
      head: (g, G) => { g.rect(G.cx - 8, G.hy - 8, 17, 2, '#22222e'); bow(g, G.cx + 7, G.hy - 8, '#22222e'); },
    },
    yuyuko: {
      eye: '#b43a78', skin: SKIN_PALE, sleeve: ramp('#8ab8e4'), shoes: ramp('#4a5a8a'), legs: ramp('#f4f0f8'),
      back: (g, G) => {                           // 주위를 도는 영혼
        const t = G.pose.t;
        for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * 2.1, gx = G.cx + Math.cos(a) * 17, gy = G.hy + 4 + Math.sin(a) * 7; g.ell(gx, gy, 3, 3, ramp('#cfe4ff')); g.px(gx, gy + 4, '#a8c8f0'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#f2a4c4', 10, G.hy + 8, 2),
      dress: (g, G) => { const bl = ramp('#7ab0e0'); skirtShape(g, G, bl, 7, 11, '#c8e0f8'); torsoShape(g, G, bl, 8, 7); g.poly([[G.cx - 3, G.ty], [G.cx + 3, G.ty], [G.cx + 1, G.ty + 8], [G.cx - 1, G.ty + 8]], '#f4f0f8', true); g.rect(G.cx - 7, G.by - 2, 14, 3, '#e87aa0'); g.px(G.cx, G.by, '#ffd0e0'); },
      hairFront: (g, G) => { bangs(g, G, '#f6b4d0'); sidelocks(g, G, '#f2a4c4', 6); },
      head: (g, G) => { const bl = ramp('#8ab8e4'); g.poly([[G.cx - 10, G.hy - 3], [G.cx + 10, G.hy - 3], [G.cx + 8, G.hy - 11], [G.cx - 8, G.hy - 11]], bl); g.poly([[G.cx - 3, G.hy - 3], [G.cx + 3, G.hy - 3], [G.cx, G.hy - 8]], '#f8f8ff', true); g.rect(G.cx - 10, G.hy - 4, 21, 2, '#e87aa0'); },
      handItem: (g, G, side, ex, ey) => { if (side > 0) g.poly([[ex - 1, ey + 2], [ex + 5, ey - 6], [ex + 9, ey - 2], [ex + 3, ey + 5]], '#d8a0c0', true); },
    },
    reisen: {
      eye: '#ff2a3a', sleeve: ramp('#3c3454'), shoes: ramp('#2a2236'), legs: ramp('#2a2236'),
      back: (g, G) => {                           // 토끼 귀 (꺾임)
        for (const s of [-1, 1]) { const bx = G.cx + s * 4, by0 = G.hy - 8, f = Math.sin(G.pose.t * 4 + s) * 1.2;
          g.poly([[bx - 2, by0], [bx + 2, by0], [bx + s * 6 + 2 + f, by0 - 12], [bx + s * 6 - 2 + f, by0 - 12]], ramp('#f4eef8'));
          g.poly([[bx + s * 6 - 2 + f, by0 - 12], [bx + s * 6 + 2 + f, by0 - 12], [bx + s * 10 + f, by0 - 8], [bx + s * 8 + f, by0 - 6]], ramp('#d8c8e0')); g.px(bx + s * 3, by0 - 5, '#f0a0b8'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#9a7ad4', 10, G.hy + 22, 3),
      dress: (g, G) => { const bl = ramp('#3c3454'); skirtShape(g, G, ramp('#c86a90'), 6, 9, '#f4e0ea'); torsoShape(g, G, bl); g.poly([[G.cx - 2, G.ty], [G.cx + 2, G.ty], [G.cx + 1, G.ty + 8], [G.cx - 1, G.ty + 8]], '#f4f4fa', true); g.rect(G.cx, G.ty + 1, 2, 7, '#d82a3a'); },
      hairFront: (g, G) => { bangs(g, G, '#a888e0', 1); sidelocks(g, G, '#9a7ad4', 14); },
      head: () => {},
    },
    kaguya: {
      eye: '#a82030', skin: SKIN_PALE, sleeve: ramp('#f4a8c4'), shoes: ramp('#5a2a4a'), legs: ramp('#f4eef2'),
      hairBack: (g, G) => hairBackBlob(g, G, '#261c3a', 11, G.hy + 26, 4),
      dress: (g, G) => { const rd = ramp('#8a1a48'); skirtShape(g, G, rd, 7, 12, '#f4a8c4'); torsoShape(g, G, ramp('#f4a8c4'), 8, 6);
        for (let x = -9; x <= 9; x += 4) g.px(G.cx + x + G.sway, G.by + 4, '#f0d070'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#f0d070'); },
      hairFront: (g, G) => { const r = ramp('#2c2242'); g.ell(G.cx, G.hy - 5, 10.5, 5.6, r); g.rect(G.cx - 10, G.hy - 5, 21, 5, r[1]);       // 히메컷 앞머리
        for (let x = -10; x <= 10; x += 2) g.px(G.cx + x, G.hy, r[2]); for (let x = -9; x <= 9; x += 3) g.px(G.cx + x, G.hy - 8, r[0]); sidelocks(g, G, '#261c3a', 18); g.rect(G.cx - 10, G.hy + 2, 1, 14, '#5a4a8a'); g.rect(G.cx + 10, G.hy + 2, 1, 14, '#5a4a8a');
        g.rect(G.cx - 9, G.hy + 13, 3, 3, '#f0d070'); g.rect(G.cx + 7, G.hy + 13, 3, 3, '#f0d070'); },
      head: (g, G) => { g.rect(G.cx - 1, G.hy - 10, 3, 3, '#f0d070'); },
    },
  };

  // ---------- 프레임 캐시 ----------
  const W = 48, H = 64, cache = {};
  function frame(id, pose) {
    const key = id + '|' + ['ph', 'bob', 'air', 'crouch', 'hurt', 'throw', 'dash', 'run', 'sway', 'tq'].map(k => pose[k] ?? 0).join(',');
    if (cache[key]) return cache[key];
    const g = new Pix(W, H);
    pose.t = (pose.tq ?? 0) * 0.25;
    drawHuman(g, CHARS[id], pose);
    const c = g.finish(); const f = { flip: null, c };
    const fl = document.createElement('canvas'); fl.width = W; fl.height = H; const x = fl.getContext('2d'); x.translate(W, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); f.flip = fl;
    return (cache[key] = f);
  }

  // 게임 상태 -> 포즈 (시간은 초 단위)
  function poseFor(st, time) {
    const q = Math.floor(time * 4) % 4;
    const p = { tq: q, sway: Math.round(Math.sin(time * 3) * 1) };
    if (st.hurt) p.hurt = 1;
    if (st.crouch) { p.crouch = 1; p.bob = 0; }
    if (st.dash) p.dash = 1;
    if (st.throw) p.throw = st.throw > 0.5 ? 1 : 0.5;
    if (!st.onGround && !st.fly) { p.air = st.vy < 0 ? -1 : 1; }
    else if (Math.abs(st.vx) > 25 && !st.fly) { p.run = 1; p.ph = (Math.floor(time * 10) % 6) / 6; p.sway = Math.round(Math.sin(time * 12)); }
    else p.bob = Math.floor(time * 2) % 2;
    if (st.fly) { p.bob = Math.round(Math.sin(time * 3) * 1.2); p.sway = Math.round(Math.sin(time * 2) * 2); if (st.cast) p.air = -1; p.fly = 1; }
    if (st.cast) p.throw = 1;
    return p;
  }

  function drawChar(ctx, id, st, x, y, face, time) {
    const p = poseFor(st, time), f = frame(id, p);
    ctx.drawImage(face < 0 ? f.flip : f.c, Math.round(x - W / 2), Math.round(y - H));
  }

  return { Pix, ramp, mix, rgba, CHARS, frame, drawChar, W, H, OUT };
})();
