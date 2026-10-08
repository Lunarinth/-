// 도트 캐릭터: 얼굴·머리는 손으로 찍은 격자(RL 표기), 몸은 5단 음영 + 디더링으로 칠한 도형.
// 캔버스 44x64, 발 바닥은 y=62. 모든 프레임은 캐시되고 좌우 반전본을 함께 만든다.
const Sprites = (() => {
  const W = 44, H = 64, FEET = 62, CXP = 22, OUT = '#1c1228';
  const rgbaCache = {};
  const rgba = c => {
    if (rgbaCache[c]) return rgbaCache[c];
    let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return (rgbaCache[c] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]);
  };
  const hex = v => '#' + v.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t)); };
  const lum = c => { const v = rgba(c); return (v[0] + v[1] + v[2]) / 3; };
  // 5단 램프: [하이라이트, 밝음, 기본, 그림자, 깊은 그림자]. 그림자는 보라 쪽으로 색상 이동
  const ramp5 = c => {
    const bright = lum(c) > 228;
    return [mix(c, '#ffffff', 0.62), mix(c, '#ffffff', 0.3), c,
      bright ? mix(c, '#7a74c0', 0.42) : mix(mix(c, '#3a2a70', 0.4), '#000000', 0.04),
      bright ? mix(c, '#4a4496', 0.62) : mix(mix(c, '#2a1860', 0.62), '#000000', 0.2)];
  };

  const skinRamp = c => [mix(c, '#ffffff', 0.5), mix(c, '#ffffff', 0.2), c, mix(c, '#d86a80', 0.34), mix(c, '#a04a72', 0.5)];

  class Pix {
    constructor(w = W, h = H) { this.w = w; this.h = h; this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.x = this.c.getContext('2d'); this.img = this.x.createImageData(w, h); this.d = this.img.data; }
    px(x, y, col) { this.dot(x, y, col); }
    dot(x, y, col) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
      const v = rgba(col), i = (y * this.w + x) * 4; this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; this.d[i + 3] = 255;
    }
    rect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, col); }
    // 5단 음영 + 경계 디더링. light: 빛 방향(좌상단)
    pick(rp, t, x, y) {
      const th = [0.16, 0.38, 0.66, 0.86];
      let k = 0; while (k < 4 && t > th[k]) k++;
      if (k < 4 && Math.abs(t - th[k]) < 0.035 && ((x + y) & 1)) k++;
      return rp[k];
    }
    ell(cx, cy, rx, ry, rp, flat) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v > 1) continue;
        this.dot(x, y, typeof rp === 'string' ? rp : flat ? rp : this.pick(rp, 0.5 + 0.34 * u + 0.45 * v - 0.2, x, y));
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
        for (let n = 0; n + 1 < xs.length; n += 2) for (let x = Math.floor(xs[n] + 0.5); x < Math.floor(xs[n + 1] + 0.5); x++) {
          const t = (x1 > x0 ? (x - x0) / (x1 - x0) : 0) * 0.45 + (y1 > y0 ? (y - y0) / (y1 - y0) : 0) * 0.55;
          this.dot(x, y, typeof rp === 'string' ? rp : flat ? rp : this.pick(rp, t, x, y));
        }
      }
    }
    line(x0, y0, x1, y1, col, th = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.dot(x + a, y + b, col); }
    }
    // 두께 w의 팔다리: 진행 방향에 직각으로 5단 음영을 입힌다
    limb(x0, y0, x1, y1, w, rp) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), vert = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n, ww = w + (i / n < 0 ? 0 : 0);
        for (let k = 0; k < w; k++) {
          const t = w === 1 ? 0.4 : k / (w - 1);
          const col = this.pick(rp, 0.18 + t * 0.7, k, i);
          if (vert) this.dot(Math.round(x - (w - 1) / 2 + k), Math.round(y), col); else this.dot(Math.round(x), Math.round(y - (w - 1) / 2 + k), col);
        }
      }
    }
    blit(rows, ox, oy, map) {
      rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.' || ch === ' ') continue; const col = map[ch]; if (col) this.dot(ox + i, oy + j, col); } });
    }
    finish(outline = OUT) {
      const w = this.w, h = this.h, d = this.d, out = new Uint8ClampedArray(d), o = rgba(outline);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (d[i + 3]) continue;
        const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3];
        if (nb(x - 1, y) || nb(x + 1, y) || nb(x, y - 1) || nb(x, y + 1)) { out[i] = o[0]; out[i + 1] = o[1]; out[i + 2] = o[2]; out[i + 3] = 255; }
      }
      this.img.data.set(out); this.x.putImageData(this.img, 0, 0); return this.c;
    }
  }

  // ---------- RL 표기: "c*n" 토큰으로 격자 한 줄을 만든다. 폭이 안 맞으면 콘솔에 경고 ----------
  const ROWERR = [];
  function R(width, name, ...rows) {
    return rows.map((spec, idx) => {
      let s = '';
      for (const tok of spec.trim().split(/\s+/)) { const m = tok.match(/^(.)(?:\*(\d+))?$/); if (!m) throw new Error('bad token ' + tok); s += m[1].repeat(m[2] ? +m[2] : 1); }
      if (s.length !== width) ROWERR.push(`${name} r${idx}: ${s.length}/${width}`);
      return s;
    });
  }

  // ---------- 얼굴 ----------
  const FACE_W = [8, 10, 12, 12, 12, 12, 12, 12, 12, 10, 8, 6];
  const EYE_L = ['.lll', 'lhEE', 'wppe', 'wiee', '.ii.'], EYE_R = ['lll.', 'hEEl', 'eppw', 'eeiw', '.ii.'];
  function drawFace(g, fx, fy, skin, eye, o = {}) {
    const sk = skinRamp(skin);
    for (let r = 0; r < 12; r++) {
      const w = FACE_W[r], x0 = fx + (12 - w) / 2;
      for (let i = 0; i < w; i++) {
        let c = sk[2];
        if (r <= 1) c = sk[3];                                  // 앞머리 그림자
        else if (i === 0) c = sk[1];
        else if (i === w - 1) c = sk[3];
        else if (r >= 9 && i > w / 2) c = sk[3];
        if (r === 2 && i > 0 && i < w - 1) c = sk[3];
        g.dot(x0 + i, fy + r, c);
      }
    }
    const er = ramp5(eye);
    const emap = { l: '#2a1422', h: '#ffffff', E: er[4], e: er[2], i: er[1], p: '#120a14', w: '#fff6f6' };
    g.blit(EYE_L, fx + 1, fy + 4, emap); g.blit(EYE_R, fx + 7, fy + 4, emap);
    g.dot(fx + 5, fy + 10, '#b84a5a'); g.dot(fx + 6, fy + 10, '#b84a5a'); g.dot(fx + 5, fy + 9, sk[3]);
    for (const bx of [fx + 2, fx + 8]) { g.dot(bx, fy + 9, '#f6b4ae'); g.dot(bx + 1, fy + 9, '#fac8c0'); }
    if (o.brow) for (const bx of [fx + 1, fx + 8]) { g.dot(bx, fy + 3, o.brow); g.dot(bx + 1, fy + 3, o.brow); g.dot(bx + 2, fy + 3, o.brow); }
  }
  function drawFaceHurt(g, fx, fy, skin) {
    const sk = skinRamp(skin);
    for (let r = 0; r < 12; r++) { const w = FACE_W[r], x0 = fx + (12 - w) / 2; for (let i = 0; i < w; i++) g.dot(x0 + i, fy + r, r <= 2 ? sk[3] : i === 0 ? sk[1] : i === w - 1 ? sk[3] : sk[2]); }
    for (const ex of [fx + 1, fx + 8]) { g.line(ex, fy + 4, ex + 3, fy + 7, '#2a1422'); g.line(ex + 3, fy + 4, ex, fy + 7, '#2a1422'); }
    g.rect(fx + 5, fy + 9, 2, 2, '#8a2a3a'); g.dot(fx + 5, fy + 9, '#e88a96');
  }

  // ---------- 머리카락 ----------
  // 헤드 박스 20x18 기준 (hx0, hy0). 숫자 1~5가 램프 단계
  const FRONT = {
    bob: R(20, 'bob',
      '.*6 1 2*6 3 .*6', '.*3 1*2 2*4 3*5 4*2 5 .*3', '.*2 1 2*3 3*8 4*3 5 .*2', '. 2*2 3*12 4*3 5 .', '2 3*17 4*2',
      '3*3 4 3*3 4 3*3 4 3*3 4 3*3 4', '3*4 4 3*4 4 3*4 4 3*4 4', '3*3 4 . 3*2 4 . 3*3 4 . 3*2 4 . 3 4', '3*2 4 .*2 4 .*3 4 .*2 4 .*4 3*2 4',
      '. 2 3 4 .*12 3 4 5 .', '. 2 3 4 .*12 3 4 5 .', '. 2 3 4 .*12 3 4 5 .', '. 3 4 .*14 3 4 .', '.*2 4 .*15 5 .'),
    long: R(20, 'long',
      '.*6 1 2*6 3 .*6', '.*3 1*2 2*4 3*5 4*2 5 .*3', '.*2 1 2*3 3*8 4*3 5 .*2', '. 2*2 3*12 4*3 5 .', '2 3*17 4*2',
      '3*3 4 3*3 4 3*3 4 3*3 4 3*3 4', '3*4 4 3*4 4 3*4 4 3*4 4', '3*3 4 . 3*2 4 . 3*3 4 . 3*2 4 . 3 4', '3*2 4 .*2 4 .*3 4 .*2 4 .*4 3*2 4',
      '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '. 3 4 .*14 3 4 .'),
    hime: R(20, 'hime',
      '.*6 1 2*6 3 .*6', '.*3 1*2 2*4 3*5 4*2 5 .*3', '.*2 1 2*3 3*8 4*3 5 .*2', '. 2*2 3*12 4*3 5 .', '2 3*17 4*2',
      '3*3 4 3*3 4 3*3 4 3*3 4 3*3 4', '3*20', '3*2 4 3*2 4 3*2 4 3*2 4 3*2 4 3*2 4 3*2', '3 4 3 4 3 4 3 4 3 4 3 4 3 4 3 4 3 4 3 4',
      '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '2 3 4 .*14 3 4 5', '. 3 4 .*14 3 4 .'),
  };

  function hairBack(g, hx0, hy0, rp, len, w = 21, flare = 0, sway = 0) {
    const L = w / 2, cx = hx0 + 10;
    g.poly([[cx - L, hy0 + 6], [cx - L + 2, hy0], [cx - 5, hy0 - 2], [cx + 5, hy0 - 2], [cx + L - 2, hy0], [cx + L, hy0 + 6],
      [cx + L + flare, hy0 + 10 + len * 0.4], [cx + L + flare + sway, hy0 + 17 + len], [cx + L - 3 + sway, hy0 + 19 + len], [cx + sway, hy0 + 17 + len], [cx - L + 3 + sway, hy0 + 19 + len], [cx - L - flare + sway, hy0 + 17 + len], [cx - L - flare, hy0 + 10 + len * 0.4]], rp);
    for (let k = -3; k <= 3; k++) g.line(cx + k * 3, hy0 + 10, cx + k * 3.3 + sway * 0.6, hy0 + 14 + len, rp[4]);
  }

  // ---------- 몸 ----------
  function skirtShape(g, wx, wy, rp, o) {
    const len = o.crouch ? 7 : o.len, hw = o.hw, sw = o.sw || 0, y1 = wy + len;
    g.poly([[wx - 5, wy - 1], [wx + 5, wy - 1], [wx + hw * 0.6 + sw * 0.3, wy + len * 0.55], [wx + hw + sw, y1], [wx - hw + sw, y1], [wx - hw * 0.6 + sw * 0.3, wy + len * 0.55]], rp);
    for (let i = -3; i <= 3; i++) g.line(wx + i * 1.6, wy + 1, wx + i * 3.0 + sw * 0.8, y1 - 1, rp[i % 2 ? 3 : 1]);
    if (o.hem) { for (let x = Math.round(wx - hw + sw); x <= Math.round(wx + hw + sw); x++) { g.dot(x, y1, o.hem); if (x % 3 !== 0) g.dot(x, y1 - 1, o.hem); if (x % 3 === 1) g.dot(x, y1 + 1, o.hemLo || o.hem); } }
    return { y1, sw };
  }
  function torsoShape(g, sx, sy, wx, wy, rp, sw = 6, ww = 4.5) {
    g.poly([[sx - sw, sy], [sx + sw, sy], [wx + ww, wy], [wx - ww, wy]], rp);
    g.line(sx - sw + 1, sy + 1, wx - ww + 1, wy - 1, rp[1]); g.line(sx + sw - 1, sy + 1, wx + ww - 1, wy - 1, rp[3]);
  }
  const bow = (g, x, y, col) => { const r = ramp5(col); g.poly([[x - 4, y - 2], [x, y], [x - 4, y + 2]], r); g.poly([[x + 4, y - 2], [x, y], [x + 4, y + 2]], r); g.rect(x - 1, y - 1, 2, 2, r[3]); g.dot(x - 3, y - 1, r[0]); };
  const collarV = (g, sx, sy, col, d = 4) => { g.poly([[sx - 4, sy - 1], [sx, sy + d], [sx + 4, sy - 1], [sx + 2, sy - 1.5], [sx, sy + 1], [sx - 2, sy - 1.5]], ramp5(col)); };
  const belt = (g, wx, wy, col, buckle) => { g.rect(wx - 5, wy - 1, 10, 2, ramp5(col)[2]); g.rect(wx - 5, wy - 1, 10, 1, ramp5(col)[1]); if (buckle) { g.rect(wx - 1, wy - 1, 3, 2, ramp5(buckle)[1]); g.dot(wx, wy - 1, '#ffffff'); } };

  // ---------- 캐릭터 ----------
  const SK = '#fde4d6', SKP = '#f6e9f0';
  const CHARS = {
    sakuya: {
      skin: SK, eye: '#d8384c', shoes: '#2a2848', legs: '#e8eaf6', sleeve: '#f6f6fe', hairCol: '#b9c6e8', hairStyle: 'bob', hairLen: 1, hairW: 19, side: 0,
      dress(g, G) {
        const blue = ramp5('#2f4fa0'), white = ramp5('#f6f6fe');
        const s = skirtShape(g, G.wx, G.wy, blue, { len: 12, hw: 10, sw: G.sw, hem: '#ffffff', hemLo: '#c8d0ea' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, blue, 6, 4.5);
        g.poly([[G.wx - 3, G.sy + 2], [G.wx + 3, G.sy + 2], [G.wx + 4, G.wy + 1], [G.wx + 5.5 + s.sw * 0.4, s.y1 - 2], [G.wx - 5.5 + s.sw * 0.4, s.y1 - 2], [G.wx - 4, G.wy + 1]], white);
        collarV(g, G.sx, G.sy, '#ffffff', 4); bow(g, G.sx, G.sy + 2, '#34a060'); belt(g, G.wx, G.wy, '#2a4a90', '#d4b04a');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0;
        for (const sd of [-1, 1]) {                                   // 땋은 머리(가늘게) + 녹색 리본
          const bx = sd < 0 ? hx + 1 : hx + 17;
          for (let i = 0; i < 9; i++) {
            const yy = hy + 11 + (i * 1.5 | 0), off = Math.round(Math.sin(i * 0.9 + G.sway * 0.4) * 0.7), cc = i % 2 ? ['#aab6d6', '#c0cbe6', '#d6def0'] : ['#c0cbe6', '#d6def0', '#eef2fa'];
            g.rect(bx + off, yy, 3, 2, cc[1]); g.dot(bx + off, yy, cc[2]); g.dot(bx + off + 2, yy + 1, cc[0]);
          }
          bow(g, bx + 1, hy + 10, '#34a060');
        }
        const wm = { w: '#ffffff', W: '#f0f2fb', v: '#bcc3e2', B: '#3e62b0' };         // 메이드 카튜사 (얇은 프릴 띠)
        g.blit(R(20, 'sk-band', '.*4 w*12 .*4', '.*3 w W*5 B*2 W*5 w .*3', '.*3 v W*12 v .*3'), hx, hy + 2, wm);
        for (let x = 5; x < 15; x += 2) g.dot(hx + x, hy + 1, '#ffffff');
      },
    },
    meiling: {
      skin: SK, eye: '#3a84d8', shoes: '#4a2c2c', legs: '#eeeef8', sleeve: '#2f9560', hairCol: '#c43a2c', hairStyle: 'long', hairLen: 10, hairW: 20, hairFlare: 1,
      dress(g, G) {
        const gr = ramp5('#2c9460');
        skirtShape(g, G.wx, G.wy, gr, { len: 11, hw: 8, sw: G.sw, hem: '#f6f6fc', hemLo: '#b8c0d8' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, gr, 6, 4.5);
        g.line(G.sx - 4, G.sy + 2, G.wx + 4, G.wy - 1, '#e8d36a'); for (let i = 0; i < 3; i++) g.rect(G.sx - 3 + i * 3, G.sy + 3 + i * 2, 1, 1, '#f6e48a');
        collarV(g, G.sx, G.sy, '#f6f6fc', 3); belt(g, G.wx, G.wy, '#f6f6fc');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0;
        for (const sd of [-1, 1]) { const bx = sd < 0 ? hx + 1 : hx + 17; for (let i = 0; i < 8; i++) g.rect(bx + Math.round(Math.sin(i * 0.8 + G.sway * 0.4) * 0.6), hy + 11 + i * 1.5 | 0, 3, 2, i % 2 ? '#a82a22' : '#c43a2c'); g.rect(bx, hy + 11, 3, 2, '#e8d36a'); }
        const gr = ramp5('#2c9460');
        g.poly([[hx + 1, hy + 5], [hx + 19, hy + 5], [hx + 17, hy - 1], [hx + 3, hy - 1]], gr); g.rect(hx + 1, hy + 4, 18, 2, '#e8d36a'); g.rect(hx + 1, hy + 4, 18, 1, '#f6e48a');
        const st = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.1 : 2.7, a = -Math.PI / 2 + i * Math.PI / 5; st.push([hx + 10 + Math.cos(a) * r, hy + 1.5 + Math.sin(a) * r]); }
        g.poly(st, '#f8e050');
      },
    },
    patchouli: {
      skin: SKP, eye: '#a070d8', shoes: '#4a3a6a', legs: '#dcd0ec', sleeve: '#a890dc', longSleeve: true, hairCol: '#8a68cc', hairStyle: 'long', hairLen: 16, hairW: 21, hairFlare: 2,
      dress(g, G) {
        const pu = ramp5('#a68cdc');
        const s = skirtShape(g, G.wx, G.wy, pu, { len: 14, hw: 9.5, sw: G.sw, hem: '#ece4f8', hemLo: '#a89ad0' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, pu, 6.5, 5);
        for (let x = -8; x <= 8; x += 3) g.line(G.wx + x * 0.4, G.sy + 1, G.wx + x * 1.1 + s.sw * 0.6, s.y1 - 1, '#ece4f8');
        collarV(g, G.sx, G.sy, '#f4eef8', 4); g.rect(G.sx, G.sy + 3, 2, 2, '#e8c84a'); belt(g, G.wx, G.wy, '#5a3a98');
        g.rect(G.wx - 1, G.wy + 1, 3, 6, '#e86a9a');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0;
        bow(g, hx + 1, hy + 9, '#e86a9a'); bow(g, hx + 18, hy + 9, '#7ac8e8');
        const w = ramp5('#f6f0fa');
        g.poly([[hx, hy + 5], [hx + 20, hy + 5], [hx + 18, hy - 3], [hx + 2, hy - 3]], w); g.rect(hx, hy + 4, 20, 2, '#a68cdc'); g.rect(hx, hy + 4, 20, 1, '#cbb8f0');
        g.poly([[hx + 11, hy - 1], [hx + 14, hy - 1], [hx + 13, hy + 2], [hx + 15, hy + 3], [hx + 11, hy + 3]], '#f4d060'); g.dot(hx + 12, hy, '#ffffff');
      },
      handItem(g, G, side, hx, hy) { if (side > 0) { g.rect(hx - 1, hy - 4, 7, 9, '#7a2a4a'); g.rect(hx, hy - 3, 5, 7, '#f2e6cc'); g.rect(hx + 2, hy - 3, 1, 7, '#c8b898'); g.rect(hx + 1, hy - 1, 3, 2, '#e8c84a'); } },
    },
    flandre: {
      skin: SK, eye: '#e8242e', shoes: '#8a1a24', legs: '#f2eeee', sleeve: '#f6f0f0', hairCol: '#e8c64e', hairStyle: 'bob', hairLen: 0, hairW: 19,
      back(g, G) {
        const f = Math.round(Math.sin(G.pose.t * 6) * 1.5), cols = ['#e04a4a', '#f0a030', '#f0e050', '#50c870', '#40a0e8', '#a060e0', '#e060b0'];
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
          const x0 = G.sx + sd * 5, y0 = G.sy + 2 + i * 0.4, x1 = G.sx + sd * (11 + i * 2.2), y1 = G.sy - 6 + i * 4.2 + f * sd;
          g.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#4a3a5a');
          const c = ramp5(cols[(i + (sd > 0 ? 3 : 0)) % 7]);
          g.poly([[x1, y1 - 2.5], [x1 + 2, y1 + 0.5], [x1, y1 + 4.5], [x1 - 2, y1 + 0.5]], c); g.dot(Math.round(x1) - 1, Math.round(y1) - 1, '#ffffff');
        }
      },
      dress(g, G) {
        const rd = ramp5('#d8262e');
        skirtShape(g, G.wx, G.wy, rd, { len: 10, hw: 8, sw: G.sw, hem: '#ffffff', hemLo: '#c8a0a8' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, rd, 6, 4.5); collarV(g, G.sx, G.sy, '#ffffff', 3); g.rect(G.sx, G.sy + 3, 2, 2, '#f0d84a'); belt(g, G.wx, G.wy, '#f6f0f0');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0, hr = ramp5('#e8c64e');
        g.poly([[hx - 2, hy + 4], [hx + 2, hy + 3], [hx + 3, hy + 10 + G.sway], [hx - 1, hy + 14 + G.sway], [hx - 4, hy + 11 + G.sway]], hr); bow(g, hx + 1, hy + 3, '#d8262e');
        const w = ramp5('#fcf6f6');
        g.poly([[hx + 1, hy + 5], [hx + 19, hy + 5], [hx + 17, hy - 2], [hx + 3, hy - 2]], w); g.rect(hx + 1, hy + 4, 18, 2, '#d8262e'); g.rect(hx + 1, hy + 4, 18, 1, '#f26a72'); bow(g, hx + 14, hy + 1, '#d8262e');
      },
    },
    remilia: {
      skin: SKP, eye: '#e43044', shoes: '#6a2a4a', legs: '#f4eef2', sleeve: '#f4a8c2', hairCol: '#90a6e6', hairStyle: 'bob', hairLen: 2, hairW: 19,
      back(g, G) {
        const f = Math.round(Math.sin(G.pose.t * 5) * 2);
        for (const sd of [-1, 1]) {
          const x = G.sx, y = G.sy, tx = x + sd * (17 + Math.abs(f)), ty = y - 11 + f;
          g.poly([[x + sd * 4, y + 1], [tx, ty], [x + sd * 20, y + 3], [x + sd * 16, y + 8], [x + sd * 14, y + 12], [x + sd * 10, y + 9], [x + sd * 8, y + 12], [x + sd * 6, y + 6]], ramp5('#8a1e40'));
          g.line(x + sd * 4, y + 1, tx, ty, '#3a0a1c'); g.line(x + sd * 5, y + 3, x + sd * 20, y + 3, '#3a0a1c'); g.line(x + sd * 5, y + 4, x + sd * 14, y + 12, '#3a0a1c');
        }
      },
      dress(g, G) {
        const pk = ramp5('#f2a2c0');
        skirtShape(g, G.wx, G.wy, pk, { len: 11, hw: 9, sw: G.sw, hem: '#ffffff', hemLo: '#d8a0b8' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, pk, 6, 4.5); collarV(g, G.sx, G.sy, '#ffffff', 3); bow(g, G.sx, G.sy + 2, '#d82a4a'); belt(g, G.wx, G.wy, '#d82a4a');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0, pk = ramp5('#f8bcd0');
        g.poly([[hx, hy + 5], [hx + 20, hy + 5], [hx + 18, hy - 2], [hx + 2, hy - 2]], pk); g.rect(hx, hy + 4, 20, 2, '#d82a4a'); g.rect(hx, hy + 4, 20, 1, '#f06080'); bow(g, hx + 10, hy + 1, '#d82a4a');
        for (let i = 1; i < 19; i += 2) g.dot(hx + i, hy + 6, '#ffe6ee');
      },
    },
    youmu: {
      skin: SK, eye: '#40a070', shoes: '#2a3a30', legs: '#eef4ee', sleeve: '#f6f6fc', hairCol: '#dfe4ee', hairStyle: 'bob', hairLen: 0, hairW: 19,
      back(g, G) {
        const t = G.pose.t; g.line(G.sx - 8, G.sy - 8, G.sx + 7, G.wy + 10, '#2a2a3a', 2); g.line(G.sx - 8, G.sy - 8, G.sx + 7, G.wy + 10, '#cad2dc');
        const gx = G.sx + 13, gy = G.hy0 + 6 + Math.round(Math.sin(t * 3) * 2);
        g.ell(gx, gy, 4, 4, ramp5('#e8f4fa')); g.poly([[gx - 3, gy + 2], [gx + 3, gy + 2], [gx + 1, gy + 10], [gx - 2, gy + 6]], ramp5('#c8e4f0')); g.dot(gx - 2, gy - 1, '#3a6a7a'); g.dot(gx + 1, gy - 1, '#3a6a7a');
      },
      dress(g, G) {
        const gr = ramp5('#2c9a60');
        skirtShape(g, G.wx, G.wy, gr, { len: 10, hw: 8, sw: G.sw, hem: '#1f6a40', hemLo: '#1f6a40' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, ramp5('#f6f6fc'), 6, 4.5);
        g.poly([[G.sx - 4, G.sy + 2], [G.sx + 4, G.sy + 2], [G.wx + 4.5, G.wy], [G.wx - 4.5, G.wy]], gr); collarV(g, G.sx, G.sy, '#ffffff', 3); bow(g, G.sx, G.sy + 2, '#22222e'); belt(g, G.wx, G.wy, '#2a2a3a', '#c8a24a');
      },
      front(g, G) { const hx = G.hx0, hy = G.hy0; g.rect(hx + 1, hy + 3, 18, 2, '#22222e'); g.rect(hx + 1, hy + 3, 18, 1, '#4a4a66'); bow(g, hx + 17, hy + 4, '#22222e'); },
    },
    yuyuko: {
      skin: SKP, eye: '#b83c80', shoes: '#4a5a8a', legs: '#f4f0f8', sleeve: '#86b6e6', longSleeve: true, hairCol: '#f2a6c6', hairStyle: 'long', hairLen: 5, hairW: 21, hairFlare: 2,
      back(g, G) { const t = G.pose.t; for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * 2.1, gx = G.hx0 + 10 + Math.cos(a) * 14, gy = G.hy0 + 7 + Math.sin(a) * 6; g.ell(gx, gy, 2.6, 2.6, ramp5('#d4e6ff')); g.poly([[gx - 1.5, gy + 1.5], [gx + 1.5, gy + 1.5], [gx, gy + 6]], ramp5('#a8c4ee')); } },
      dress(g, G) {
        const bl = ramp5('#7ab0e4');
        const s = skirtShape(g, G.wx, G.wy, bl, { len: 14, hw: 10, sw: G.sw, hem: '#cce2fa', hemLo: '#98b8e0' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, bl, 6.5, 5); g.poly([[G.sx - 3, G.sy], [G.sx + 3, G.sy], [G.sx + 1, G.sy + 9], [G.sx - 1, G.sy + 9]], '#f8f4fc');
        g.rect(G.wx - 6, G.wy - 2, 12, 3, '#ea80a6'); g.rect(G.wx - 6, G.wy - 2, 12, 1, '#f6a8c4'); bow(g, G.wx + 4, G.wy, '#ea80a6');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0, bl = ramp5('#8cbae6');
        g.poly([[hx, hy + 5], [hx + 20, hy + 5], [hx + 18, hy - 3], [hx + 2, hy - 3]], bl); g.rect(hx, hy + 4, 20, 2, '#ea80a6'); g.rect(hx, hy + 4, 20, 1, '#f6a8c4');
        g.poly([[hx + 7, hy + 4], [hx + 13, hy + 4], [hx + 10, hy - 2]], '#fafaff');
      },
      handItem(g, G, side, hx, hy) { if (side > 0) { g.poly([[hx - 1, hy + 2], [hx + 3, hy - 6], [hx + 8, hy - 6], [hx + 10, hy], [hx + 4, hy + 4]], '#d89cc4'); g.line(hx + 2, hy + 1, hx + 5, hy - 5, '#fff0f8'); g.line(hx + 5, hy + 2, hx + 8, hy - 4, '#fff0f8'); } },
    },
    reisen: {
      skin: SK, eye: '#ff2a3c', shoes: '#2a2236', legs: '#2e2640', sleeve: '#3c3458', hairCol: '#a28ae2', hairStyle: 'long', hairLen: 18, hairW: 21, hairFlare: 2,
      back(g, G) {
        for (const sd of [-1, 1]) { const bx = G.hx0 + 10 + sd * 5, by = G.hy0 + 1, f = Math.round(Math.sin(G.pose.t * 4 + sd) * 1);
          g.poly([[bx - 2, by + 1], [bx + 2, by + 1], [bx + sd * 2 + 2 + f, by - 5], [bx + sd * 2 - 2 + f, by - 5]], ramp5('#f4eef8'));
          g.poly([[bx + sd * 2 - 2 + f, by - 5], [bx + sd * 2 + 2 + f, by - 5], [bx + sd * 8 + f, by - 4], [bx + sd * 9 + f, by]], ramp5('#d8c8e0')); g.line(bx + sd, by, bx + sd * 2 + f, by - 4, '#f4a8c0'); }
      },
      dress(g, G) {
        skirtShape(g, G.wx, G.wy, ramp5('#c86a92'), { len: 9, hw: 7.5, sw: G.sw, hem: '#f6e4ee', hemLo: '#c88aa8' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, ramp5('#3c3458'), 6, 4.5); g.poly([[G.sx - 3, G.sy], [G.sx + 3, G.sy], [G.sx + 1, G.sy + 9], [G.sx - 1, G.sy + 9]], '#f8f8fc'); g.rect(G.sx, G.sy + 1, 2, 8, '#dc2c40'); belt(g, G.wx, G.wy, '#2a2236');
      },
      front(g, G) {},
    },
    kaguya: {
      skin: SKP, eye: '#b02438', shoes: '#5a2a4a', legs: '#f4eef2', sleeve: '#f4a8c4', longSleeve: true, hairCol: '#2c2244', hairStyle: 'hime', hairLen: 22, hairW: 21, hairFlare: 3,
      dress(g, G) {
        const rd = ramp5('#8a1c4c');
        const s = skirtShape(g, G.wx, G.wy, rd, { len: 16, hw: 10.5, sw: G.sw, hem: '#f6aac8', hemLo: '#c87898' });
        torsoShape(g, G.sx, G.sy, G.wx, G.wy, ramp5('#f4a8c4'), 6.5, 5); collarV(g, G.sx, G.sy, '#fff2f8', 3);
        for (let x = -2; x <= 2; x++) g.rect(G.wx + x * 4 + Math.round(s.sw * 0.4), s.y1 - 6 + Math.abs(x), 2, 2, '#f2d474');
        belt(g, G.wx, G.wy, '#f2d474'); bow(g, G.wx, G.wy, '#c8205a');
      },
      front(g, G) {
        const hx = G.hx0, hy = G.hy0;
        for (const sd of [-1, 1]) { const bx = sd < 0 ? hx + 1 : hx + 18; g.rect(bx, hy + 9, 1, 14, '#6a56a0'); g.rect(bx - 1, hy + 23, 3, 3, '#f2d474'); }
        g.rect(hx + 9, hy - 1, 2, 3, '#f2d474');
      },
    },
  };

  // ---------- 조립 ----------
  function drawHuman(g, id, pose) {
    const L = CHARS[id], run = pose.run, ph = pose.ph || 0, crouch = pose.crouch;
    const a = ph * Math.PI * 2;
    const bounce = run ? -Math.round(Math.pow(Math.cos(a), 2) * 1.6) : 0;
    const dy = bounce + (pose.bob ? 1 : 0) + (crouch ? 9 : 0) + (pose.hurt ? 1 : 0) - (pose.air < 0 ? 1 : 0);
    const lean = (pose.hurt ? -2 : pose.dash ? 2 : run ? 1 : 0) + (crouch ? 1 : 0);
    const sway = pose.sway || 0;
    const hx0 = 12 + lean, hy0 = 2 + dy;
    const G = { hx0, hy0, sx: hx0 + 10, sy: hy0 + 19, wx: 22 + Math.round(lean * 0.5), wy: hy0 + 28, sway, sw: sway, pose };
    G.py = G.wy + 7;
    if (L.back) L.back(g, G);
    const hr = ramp5(L.hairCol);
    hairBack(g, hx0, hy0, hr, L.hairLen, L.hairW || 21, L.hairFlare || 0, sway);
    // 다리
    const lr = ramp5(L.legs), sr = ramp5(L.shoes), legs = [];
    for (const side of [-1, 1]) {
      let fx = 22 + side * 3, fy = 61, kx = 0;
      if (pose.air) { if (pose.air < 0) { fx += side * 2 + (side > 0 ? 3 : -1); fy = side > 0 ? 50 : 53; } else { fx += side * 2; fy = side > 0 ? 58 : 60; } }
      else if (run) { const aa = a + (side > 0 ? Math.PI : 0); fx = 22 + side * 1 + Math.round(Math.sin(aa) * 8); fy = 61 - Math.round(Math.max(0, Math.cos(aa)) * 5); kx = Math.max(0, Math.cos(aa)) * 3; }
      else if (crouch) { fx = 22 + side * 5; kx = 2; }
      const hxp = 22 + side * 3, hyp = G.py;
      // 2마디 IK
      const l1 = 11.6, l2 = 12; let dx = fx - hxp, dyy = fy - 3 - hyp, d = Math.hypot(dx, dyy);
      const maxd = l1 + l2 - 0.3; if (d > maxd) { dx *= maxd / d; dyy *= maxd / d; d = maxd; }
      const aa2 = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - aa2 * aa2));
      const kxp = hxp + dx * aa2 / d + (-dyy / d) * hh * -1, kyp = hyp + dyy * aa2 / d + (dx / d) * hh * -1;
      legs.push({ side, hxp, hyp, kx: Math.round(kxp), ky: Math.round(kyp), fx: Math.round(hxp + dx), fy: Math.round(hyp + dyy) + 3 });
    }
    legs.sort((p, q) => p.fx - q.fx);
    for (const lg of legs) {
      g.limb(lg.hxp, lg.hyp, lg.kx, lg.ky, 4, lr); g.limb(lg.kx, lg.ky, lg.fx, lg.fy - 4, 3, lr);
      // 신발
      g.poly([[lg.fx - 3, lg.fy - 4], [lg.fx + 2, lg.fy - 4], [lg.fx + 3, lg.fy - 1], [lg.fx + 6, lg.fy], [lg.fx + 6, lg.fy + 1], [lg.fx - 3, lg.fy + 1]], sr);
      g.rect(lg.fx - 3, lg.fy - 5, 6, 1, '#ffffff'); g.dot(lg.fx - 3, lg.fy - 5, '#c2c8e4');
    }
    if (L.dress) L.dress(g, G);
    // 목
    g.rect(G.sx - 1, hy0 + 16, 3, 4, skinRamp(L.skin)[3]); g.dot(G.sx, hy0 + 16, skinRamp(L.skin)[4]);
    drawArms(g, G, L, pose);
    // 얼굴 + 앞머리
    if (pose.hurt) drawFaceHurt(g, hx0 + 4, hy0 + 4, L.skin); else drawFace(g, hx0 + 4, hy0 + 4, L.skin, L.eye, L);
    const hmap = { '1': hr[0], '2': hr[1], '3': hr[2], '4': hr[3], '5': hr[4] };
    g.blit(FRONT[L.hairStyle], hx0, hy0, hmap);
    if (L.front) L.front(g, G);
  }

  function drawArms(g, G, L, pose) {
    const sl = ramp5(L.sleeve), sk = skinRamp(L.skin), ph = pose.ph || 0, arms = [];
    for (const side of [-1, 1]) {
      const sx = G.sx + side * 6, sy = G.sy + 2;
      let ex, ey, hx, hy;
      if (side > 0 && pose.throw) { ex = sx + 5; ey = sy + 2; hx = sx + 11; hy = sy + 1; }
      else if (pose.hurt) { ex = sx + side * 4; ey = sy - 2; hx = sx + side * 8; hy = sy - 6; }
      else if (pose.dash) { ex = sx - 5; ey = sy + 2; hx = sx - 10; hy = sy + 4; }
      else if (pose.air) { const up = pose.air < 0; ex = sx + side * 5; ey = sy + (up ? -1 : 3); hx = sx + side * 9; hy = sy + (up ? -5 : 7); }
      else if (pose.run) { const s = Math.round(Math.sin((ph + (side > 0 ? 0.5 : 0)) * Math.PI * 2) * 1.2); ex = sx + side; ey = sy + 5; hx = G.wx + side * 4 + s; hy = G.wy + 1; }
      else if (pose.crouch) { ex = sx + side * 3; ey = sy + 4; hx = sx + side * 4; hy = G.wy + 4; }
      else { ex = sx + side; ey = sy + 5; hx = G.wx + side * 2; hy = G.wy; }
      arms.push({ side, sx, sy, ex, ey, hx, hy });
    }
    for (const A of arms) {
      g.limb(A.sx, A.sy, A.ex, A.ey, 4, sl); g.limb(A.ex, A.ey, A.hx, A.hy, 3, L.longSleeve ? sl : sk);
      g.rect(A.hx - 1, A.hy - 1, 3, 3, sk[1]); g.dot(A.hx + 1, A.hy + 1, sk[3]);
      if (L.handItem && !(A.side > 0 && pose.throw)) L.handItem(g, G, A.side, A.hx, A.hy);
      if (A.side > 0 && pose.throw) { g.line(A.hx + 2, A.hy, A.hx + 9, A.hy - 1, '#e8eefc'); g.line(A.hx + 2, A.hy + 1, A.hx + 9, A.hy, '#8a92b0'); g.dot(A.hx + 10, A.hy - 1, '#ffffff'); g.rect(A.hx - 1, A.hy, 2, 2, '#6a4a2a'); }
    }
  }

  // ---------- 캐시 ----------
  const cache = {};
  function frame(id, pose) {
    const key = id + '|' + ['ph', 'bob', 'air', 'crouch', 'hurt', 'throw', 'dash', 'run', 'sway', 'tq', 'fly'].map(k => pose[k] ?? 0).join(',');
    if (cache[key]) return cache[key];
    const g = new Pix(); pose.t = (pose.tq ?? 0) * 0.25;
    drawHuman(g, id, pose);
    const c = g.finish();
    const fl = document.createElement('canvas'); fl.width = W; fl.height = H; const x = fl.getContext('2d'); x.translate(W, 0); x.scale(-1, 1); x.drawImage(c, 0, 0);
    return (cache[key] = { c, flip: fl });
  }
  const portraits = {};
  function portrait(id) {
    if (portraits[id]) return portraits[id];
    const f = frame(id, { tq: 1, bob: 0 }).c, o = document.createElement('canvas'); o.width = 110; o.height = 110; const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(f, 8, 0, 28, 28, 0, 0, 110, 110);          // 머리~어깨 부분을 정수배에 가깝게 확대
    return (portraits[id] = o);
  }
  function poseFor(st, time) {
    const q = Math.floor(time * 4) % 4, p = { tq: q, sway: Math.round(Math.sin(time * 2.4) * 1) };
    if (st.hurt) p.hurt = 1;
    if (st.crouch) { p.crouch = 1; p.bob = 0; }
    if (st.dash) p.dash = 1;
    if (st.throw) p.throw = 1;
    if (!st.onGround && !st.fly) p.air = st.vy < 0 ? -1 : 1;
    else if (Math.abs(st.vx) > 25 && !st.fly && !st.crouch) { p.run = 1; p.ph = (Math.floor(time * 10) % 8) / 8; p.sway = -Math.round(Math.sin(p.ph * Math.PI * 2)); }
    else if (!st.crouch) p.bob = Math.floor(time * 1.6) % 2;
    if (st.fly) { p.bob = Math.round(Math.sin(time * 3)); p.sway = Math.round(Math.sin(time * 2) * 2); if (st.cast) p.air = -1; p.fly = 1; }
    if (st.cast) p.throw = 1;
    return p;
  }
  function drawChar(ctx, id, st, x, feetY, face, time) {
    const p = poseFor(st, time), f = frame(id, p);
    ctx.drawImage(face < 0 ? f.flip : f.c, Math.round(x - W / 2), Math.round(feetY - FEET));
  }
  if (ROWERR.length) console.error('격자 폭 오류:\n' + ROWERR.join('\n'));
  const ramp = c => { const r = ramp5(c); return [r[1], r[2], r[3]]; };
  return { CHARS, frame, portrait, drawChar, Pix, ramp, ramp5, mix, W, H, FEET, ROWERR };
})();
