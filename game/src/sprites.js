// 도트 그래픽 생성기: 코드로 그린 정밀 스프라이트(72x96).
// 설계 좌표는 48x64 기준이고 Pix 가 1.5배로 확대해 찍는다. 얼굴·레이스 같은 미세 디테일은 네이티브 도트로 직접 찍는다.
const Sprites = (() => {
  const OUT = '#1b1226', K = 1.5;
  const rgbaCache = {};
  const rgba = c => {
    if (rgbaCache[c]) return rgbaCache[c];
    let h = c.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return (rgbaCache[c] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]);
  };
  const hex = v => '#' + v.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return hex([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t)); };
  const lum = c => { const v = rgba(c); return (v[0] + v[1] + v[2]) / 3; };
  // 밝은 색(흰 옷)은 그림자를 연한 라벤더로 주어 회색 얼룩이 생기지 않게 한다
  const shade = (c, k = 0.4) => lum(c) > 200 ? mix(c, '#7a78b0', 0.26) : mix(mix(c, '#2a2050', k), '#000000', 0.1);
  const ramp = c => [mix(c, '#ffffff', 0.34), c, shade(c)];
  const ramp4 = c => [mix(c, '#ffffff', 0.55), mix(c, '#ffffff', 0.28), c, shade(c, 0.42)];

  class Pix {
    constructor(w, h, k = K) {
      this.w = w; this.h = h; this.k = k;
      this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
      this.x = this.c.getContext('2d'); this.img = this.x.createImageData(w, h); this.d = this.img.data;
    }
    dot(x, y, col) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h || !col) return;
      const v = rgba(col), i = (y * this.w + x) * 4;
      this.d[i] = v[0]; this.d[i + 1] = v[1]; this.d[i + 2] = v[2]; this.d[i + 3] = 255;
    }
    nrect(x, y, w, h, col) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, col); }
    px(x, y, col) { this.rect(x, y, 1, 1, col); }
    rect(x, y, w, h, col) {
      const k = this.k, x0 = Math.round(x * k), y0 = Math.round(y * k), x1 = Math.max(x0 + 1, Math.round((x + w) * k)), y1 = Math.max(y0 + 1, Math.round((y + h) * k));
      this.nrect(x0, y0, x1 - x0, y1 - y0, col);
    }
    ell(cx, cy, rx, ry, rp, flat) {
      const k = this.k; cx *= k; cy *= k; rx *= k; ry *= k;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
        if (u * u + v * v > 1) continue;
        if (flat) { this.dot(x, y, rp); continue; }
        const l = -0.5 * u - 0.7 * v + ((x + y) & 1 ? 0.025 : -0.025);
        this.dot(x, y, rp.length === 4 ? (l > 0.5 ? rp[0] : l > 0.12 ? rp[1] : l > -0.3 ? rp[2] : rp[3]) : (l > 0.38 ? rp[0] : l > -0.22 ? rp[1] : rp[2]));
      }
    }
    poly(pts, rp, flat) {
      const k = this.k; pts = pts.map(([x, y]) => [x * k, y * k]);
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
          if (flat) { this.dot(x, y, rp); continue; }
          const t = (y - y0) / Math.max(1, y1 - y0) * 0.6 + (x - x0) / Math.max(1, x1 - x0) * 0.4 + ((x + y) & 1 ? 0.02 : -0.02);
          this.dot(x, y, rp.length === 4 ? (t < 0.18 ? rp[0] : t < 0.42 ? rp[1] : t < 0.75 ? rp[2] : rp[3]) : (t < 0.25 ? rp[0] : t < 0.72 ? rp[1] : rp[2]));
        }
      }
    }
    line(x0, y0, x1, y1, col, th = 1) {
      const k = this.k; x0 *= k; y0 *= k; x1 *= k; y1 *= k; const t = Math.max(1, Math.round(th * k));
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) this.dot(x - (t - 1) / 2 + a, y - (t - 1) / 2 + b, col);
      }
    }
    nline(x0, y0, x1, y1, col) {
      const k = this.k; x0 *= k; y0 *= k; x1 *= k; y1 *= k;
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) this.dot(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col);
    }
    finish(outline = OUT) {
      const { w, h, d } = this, out = new Uint8ClampedArray(d), o = rgba(outline);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (d[i + 3]) continue;
        const nb = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4 + 3];
        if (nb(x - 1, y) || nb(x + 1, y) || nb(x, y - 1) || nb(x, y + 1)) { out[i] = o[0]; out[i + 1] = o[1]; out[i + 2] = o[2]; out[i + 3] = 255; }
      }
      this.img.data.set(out); this.x.putImageData(this.img, 0, 0);
      return this.c;
    }
  }

  const SKIN = ['#fff3ea', '#fde2d2', '#eebdad', '#d89a90'], SKIN_PALE = ['#fdf5f9', '#f6e9f0', '#e0c6d6', '#c8a4ba'];
  const hairRamp = c => ramp4(c);

  // ---------- 얼굴 (네이티브 도트) ----------
  function face(g, G, o) {
    const k = g.k, cx = G.cx * k, hy = G.hy * k, eye = o.eye || '#c33';
    const ey = Math.round(hy + 1.5 * k), skin = (o.skin || SKIN);
    if (G.pose.hurt) {
      for (const dx of [-7, 3]) for (let i = 0; i < 5; i++) { g.dot(cx + dx + i, ey + i - 1, OUT); g.dot(cx + dx + 4 - i, ey + i - 1, OUT); }
      g.nrect(Math.round(cx) - 2, ey + 8, 5, 3, '#7a2a3a'); g.nrect(Math.round(cx) - 1, ey + 9, 3, 1, '#d86a7a');
      return;
    }
    for (const side of [-1, 1]) {
      const ex = Math.round(cx + side * 6.5 - 3);
      g.nrect(ex, ey, 6, 7, '#ffffff');
      const ir = ramp4(eye);
      g.nrect(ex + 1, ey + 1, 4, 6, ir[2]); g.nrect(ex + 1, ey + 1, 4, 2, ir[3]); g.nrect(ex + 1, ey + 5, 4, 2, ir[1]);
      g.nrect(ex + 2, ey + 2, 2, 3, '#1a1220');
      g.nrect(ex + 1, ey + 1, 2, 2, '#ffffff'); g.dot(ex + 4, ey + 5, '#ffffff');
      g.nrect(ex - 1, ey - 1, 8, 2, OUT);
      g.dot(ex + (side < 0 ? -1 : 6), ey, OUT); g.dot(ex + (side < 0 ? -2 : 7), ey + 1, OUT);
      g.nrect(ex, ey - 3, 6, 1, mix(o.brow || '#6a4a3a', '#000000', 0.1));
      g.nrect(ex - 1, ey + 9, 3, 1, '#f4a8a8'); g.nrect(ex, ey + 10, 2, 1, '#f4a8a8');
    }
    g.dot(Math.round(cx), ey + 8, skin[3]);
    g.nrect(Math.round(cx) - 1, ey + 11, 3, 1, '#c85a6a'); g.dot(Math.round(cx), ey + 12, '#e88a96');
  }

  // ---------- 휴머노이드 리그 ----------
  function drawHuman(g, o, pose) {
    const cx = 24, run = pose.run, crouch = pose.crouch, ph = pose.ph || 0;
    const stepBounce = run ? -Math.abs(Math.sin(ph * Math.PI * 2)) * 1.7 : 0;
    const bob = (pose.bob || 0) * 0.8 + stepBounce;
    const hy = 19 + bob + (crouch ? 11 : 0) + (pose.hurt ? 1 : 0) - (pose.air < 0 ? 1 : 0);
    const lean = pose.hurt ? -2 : pose.dash ? 3 : run ? 1 : 0;
    const sway = pose.sway || 0;
    const ty = hy + 9, by = ty + 12;
    const G = { cx: cx + lean, hy, ty, by, sway, pose, bob, o, k: g.k };

    if (o.back) o.back(g, G);
    if (o.hairBack) o.hairBack(g, G);

    // 다리: 엉덩이 -> 무릎 -> 발 (2마디)
    const legTop = by + 2, lg = o.legs || SKIN, sh = o.shoes || ramp('#3b2a3a');
    const legs = [];
    for (const side of [-1, 1]) {
      let fx = G.cx + side * 3, fy = 62, kx = 0;
      if (pose.air) {
        if (pose.air < 0) { fy = 62 - (side > 0 ? 11 : 7); fx += side * 2 + (side > 0 ? 2 : -2); kx = side > 0 ? 3 : 1; }
        else { fy = 62 - (side > 0 ? 3 : 1); fx += side * 3; kx = 1; }
      } else if (run) {
        const a = ph + (side > 0 ? 0.5 : 0), s = Math.sin(a * Math.PI * 2), c = Math.cos(a * Math.PI * 2);
        fx += s * 7; fy = 62 - Math.max(0, -c) * 5; kx = Math.max(0, -c) * 3;
      } else if (crouch) { fx += side * 4; kx = 4; fy = 62; }
      const hipX = G.cx + side * 3;
      const midX = (hipX + fx) / 2 + kx, midY = (legTop + fy) / 2;
      legs.push({ side, hipX, fx, fy, midX, midY });
    }
    legs.sort((a, b) => a.fx - b.fx);
    for (const L of legs) {
      g.line(L.hipX, legTop, L.midX, L.midY, lg[1], 4); g.line(L.midX, L.midY, L.fx, L.fy - 3, lg[1], 4);
      g.line(L.hipX - 1, legTop, L.midX - 1, L.midY, lg[0], 1); g.line(L.midX + 1.5, L.midY, L.fx + 1.5, L.fy - 3, lg[2], 1);
      g.poly([[L.fx - 3.5, L.fy - 5], [L.fx + 3.5, L.fy - 5], [L.fx + 6, L.fy], [L.fx - 3, L.fy]], sh);
      g.rect(L.fx - 3.5, L.fy - 5, 7, 1, '#f4f0f6'); g.rect(L.fx - 3, L.fy - 6, 6, 1, mix(lg[0], '#ffffff', 0.4));
      g.nline(L.fx - 2, L.fy - 3, L.fx + 4, L.fy - 3, sh[0]);
    }
    if (o.dress) o.dress(g, G);
    drawArms(g, G, o, pose);
    g.rect(G.cx - 1.5, hy + 7, 3.5, 4, (o.skin || SKIN)[2]);
    g.ell(G.cx, hy, 10, 9, o.skin || SKIN);
    g.ell(G.cx, hy + 3.5, 8.3, 5.8, (o.skin || SKIN)[1], true);
    if (o.hairBack2) o.hairBack2(g, G);
    face(g, G, o);
    if (o.hairFront) o.hairFront(g, G);
    if (o.head) o.head(g, G);
    if (o.front) o.front(g, G);
  }

  function drawArms(g, G, o, pose) {
    const sl = o.sleeve || ramp('#ffffff'), sk = o.skin || SKIN, ph = pose.ph || 0, long = o.longSleeve;
    const sy = G.ty + 3;
    for (const side of [-1, 1]) {
      const sx = G.cx + side * 7.5;
      let ex, ey, hx, hy;
      if (side > 0 && pose.throw) { ex = sx + 7; ey = sy + 2; hx = sx + 14; hy = sy + 0.5 - pose.throw * 0.5; }
      else if (pose.hurt) { ex = sx + side * 6; ey = sy - 3; hx = sx + side * 11; hy = sy - 8; }
      else if (pose.dash) { ex = sx - 6; ey = sy + 3; hx = sx - 12; hy = sy + 5; }
      else if (pose.air) { const up = pose.air < 0; ex = sx + side * 6; ey = sy + (up ? -1 : 3); hx = sx + side * 11; hy = sy + (up ? -6 : 6); }
      else if (pose.run) {
        const s = Math.sin((ph + (side > 0 ? 0.5 : 0)) * Math.PI * 2) * 2;
        ex = sx + side * 1.5; ey = sy + 7; hx = G.cx + side * 4.5 + s * 0.4; hy = G.by - 3 + s * 0.6;
      }
      else if (pose.crouch) { ex = sx + side * 4; ey = sy + 6; hx = sx + side * 5; hy = G.by + 3; }
      else { ex = sx + side * 1.5; ey = sy + 7; hx = G.cx + side * 2.8; hy = G.by - 1.5; }
      if (!long) { g.line(sx, sy, ex, ey, sl[1], 4); g.line(ex, ey, hx, hy, sk[1], 3); g.line(sx - 1, sy, ex - 1, ey, sl[0], 1); }
      else { g.line(sx, sy, ex, ey, sl[1], 4.5); g.line(ex, ey, hx, hy, sl[1], 4.5); g.line(sx - 1, sy, ex - 1, ey, sl[0], 1); }
      g.rect(ex - 2, ey - 2, 4, 1, sl[0]);
      g.ell(hx, hy, 2, 2, sk[1], true); g.px(hx + 1, hy + 1, sk[2]);
      if (!long) g.rect(hx - 2.5, hy - 2.5, 5, 1.2, sl[0]);
      if (side > 0 && pose.throw && o.knife !== false) {
        g.line(hx + 1, hy, hx + 11, hy - 1.5, '#dfe6f4', 1.4); g.line(hx + 1, hy - 0.6, hx + 11, hy - 2, '#ffffff', 0.6); g.rect(hx - 1, hy - 1, 2, 2, '#6a4a2a');
      }
      if (o.handItem && !(side > 0 && pose.throw)) o.handItem(g, G, side, hx, hy);
    }
  }

  // ---------- 공통 디테일 ----------
  const strands = (g, G, x0, x1, y0, y1, n, col, bend = 0) => {
    for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n; g.nline(x, y0, x + bend + G.sway * 0.3, y1, col); }
  };
  const hairBackBlob = (g, G, col, w, bottomY, flare = 0) => {
    const { cx, hy, sway } = G, r = hairRamp(col);
    g.poly([[cx - w, hy - 3], [cx + w, hy - 3], [cx + w + flare + sway, bottomY], [cx + w * 0.5 + sway, bottomY + 2.5], [cx + sway * 0.8, bottomY + 1], [cx - w * 0.5 + sway, bottomY + 2.5], [cx - w - flare + sway, bottomY]], r);
    strands(g, G, cx - w + 1, cx + w - 1, hy + 1, bottomY, 6, r[3]); strands(g, G, cx - w + 2, cx + w - 2, hy + 2, bottomY - 1, 3, r[0], 0);
  };
  const bangs = (g, G, col, style = 0) => {
    const { cx, hy } = G, r = hairRamp(col);
    g.ell(cx, hy - 5, 10.8, 6, r);
    g.poly([[cx - 10.5, hy - 3], [cx - 8.5, hy + 1.5], [cx - 6.5, hy - 0.5], [cx - 4, hy + 1], [cx - 1.5, hy - 1], [cx + 0.5, hy + (style ? 1.2 : 0)], [cx + 3, hy - 0.5], [cx + 5.5, hy + 1.2], [cx + 8, hy - 0.5], [cx + 10.5, hy + 1.5], [cx + 10.5, hy - 3]], r);
    for (let i = 0; i < 6; i++) g.nline(cx - 8 + i * 3.2, hy - 10.5, cx - 6.5 + i * 3.2, hy - 1.5, r[3]);
    g.nline(cx - 8, hy - 8, cx + 6, hy - 9.5, r[0]); g.nline(cx - 7, hy - 7, cx + 4, hy - 8.3, r[0]);
    g.px(cx - 9, hy - 6, r[0]); g.px(cx + 9, hy - 6, r[3]);
  };
  const sidelocks = (g, G, col, len = 10) => {
    const { cx, hy } = G, r = hairRamp(col);
    for (const s of [-1, 1]) { g.rect(cx + s * 10 - 1.5, hy - 1, 3.5, len, r[2]); g.rect(cx + s * 10 - 1.5, hy - 1, 1, len, r[0]); g.rect(cx + s * 10 + 1, hy + 2, 1, len - 3, r[3]); }
  };
  const bow = (g, x, y, col) => { const r = ramp(col); g.poly([[x - 4, y - 2.5], [x, y], [x - 4, y + 2.5]], r); g.poly([[x + 4, y - 2.5], [x, y], [x + 4, y + 2.5]], r); g.ell(x, y, 1.2, 1.2, r[2], true); g.px(x - 3, y - 1, r[0]); };
  const skirtShape = (g, G, rp, topW, botW, hem, folds = 4) => {
    const { cx, by, sway } = G, h = G.pose.crouch ? 6 : 10, y1 = by + h;
    const sw = sway * 0.8 + (G.pose.run ? Math.sin((G.pose.ph || 0) * Math.PI * 2) * 1.5 : 0);
    g.poly([[cx - topW, by - 1], [cx + topW, by - 1], [cx + botW + sw, y1], [cx - botW + sw, y1]], rp);
    for (let i = 1; i < folds * 2; i++) { const t = i / (folds * 2), tx = cx - topW + 2 * topW * t, bx = cx - botW + 2 * botW * t + sw; g.nline(tx, by + 1, bx, y1 - 0.5, i % 2 ? rp[2] : rp[0]); }
    if (hem) {
      const k = g.k, ny = Math.round(y1 * k);
      for (let x = Math.round((cx - botW + sw) * k); x <= Math.round((cx + botW + sw) * k); x++) { g.dot(x, ny, hem); if (x % 4 < 2) g.dot(x, ny + 1, hem); if (x % 4 === 0) g.dot(x, ny - 1, mix(hem, '#8a8a9a', 0.35)); }
    }
  };
  const torsoShape = (g, G, rp, wTop = 7, wBot = 5) => {
    const { cx, ty, by } = G;
    g.poly([[cx - wTop, ty], [cx + wTop, ty], [cx + wBot, by], [cx - wBot, by]], rp);
    g.nline(cx - wTop + 1, ty + 1, cx - wBot + 1, by - 1, rp[0]); g.nline(cx + wTop - 1, ty + 1, cx + wBot - 1, by - 1, rp[2]);
  };
  const collar = (g, G, col) => { const { cx, ty } = G; g.poly([[cx - 4, ty - 0.5], [cx + 4, ty - 0.5], [cx + 2, ty + 3], [cx - 2, ty + 3]], col, true); g.nline(cx - 4, ty, cx - 1, ty + 3, '#d8d8e4'); g.nline(cx + 4, ty, cx + 1, ty + 3, '#d8d8e4'); };
  const buttons = (g, G, col, n = 3) => { for (let i = 0; i < n; i++) g.ell(G.cx, G.ty + 4 + i * 3, 0.9, 0.9, col, true); };

  // ---------- 캐릭터 정의 ----------
  const CHARS = {
    sakuya: {
      eye: '#d0364a', brow: '#9aa6c2', sleeve: ramp('#f6f6fc'), shoes: ramp('#2c2a46'), legs: ramp('#eef0fa'),
      hairBack: (g, G) => hairBackBlob(g, G, '#cdd6ec', 10.5, G.hy + 8),
      dress: (g, G) => {
        const blue = ramp('#3a5ca8'), white = ramp('#f8f8fe');
        skirtShape(g, G, blue, 6, 11, '#ffffff', 4); skirtShape(g, G, white, 2.6, 4.6, null, 2);
        torsoShape(g, G, blue); g.poly([[G.cx - 3.5, G.ty + 1], [G.cx + 3.5, G.ty + 1], [G.cx + 4.5, G.by + 5], [G.cx - 4.5, G.by + 5]], white);
        collar(g, G, '#ffffff'); g.poly([[G.cx - 2.5, G.ty + 1.5], [G.cx, G.ty + 4], [G.cx + 2.5, G.ty + 1.5], [G.cx + 1, G.ty + 5.5], [G.cx - 1, G.ty + 5.5]], '#2f9a5a', true);
        g.ell(G.cx, G.ty + 3, 1, 1, '#c8a24a', true);
        g.rect(G.cx - 7, G.by - 1, 14, 2, '#2a4a8e'); g.rect(G.cx - 2, G.by - 1, 4, 2, '#c8a24a');
        for (const s of [-1, 1]) g.nline(G.cx + s * 4.2, G.by, G.cx + s * 7, G.by + 8, '#ffffff');
      },
      hairFront: (g, G) => { bangs(g, G, '#d9e0f2', 1); sidelocks(g, G, '#cdd6ec', 6);
        for (const s of [-1, 1]) { const bx = G.cx + s * 10.5; for (let i = 0; i < 10; i++) { g.rect(bx - 1.5 + Math.sin(i * 0.9 + G.sway) * 0.8, G.hy + 3 + i, 3, 1.05, i % 2 ? '#aab6d4' : '#cdd6ec'); } bow(g, bx, G.hy + 4, '#2f9a5a'); } },
      head: (g, G) => {
        const w = ramp('#ffffff'); g.rect(G.cx - 8.5, G.hy - 9.5, 18, 3.4, w[1]);
        for (let i = -8; i <= 8; i += 1.4) { g.px(G.cx + i, G.hy - 10.5, w[0]); g.px(G.cx + i, G.hy - 6, w[2]); }
        g.rect(G.cx - 2, G.hy - 10.5, 4.5, 1.2, '#3a5ca8'); g.nline(G.cx - 8, G.hy - 8, G.cx + 8, G.hy - 8, w[2]);
      },
    },
    meiling: {
      eye: '#3a7fd0', brow: '#8a2a20', sleeve: ramp('#2f8f5a'), shoes: ramp('#3b2a2a'), legs: ramp('#f4f4fa'),
      hairBack: (g, G) => hairBackBlob(g, G, '#c23a2e', 10, G.hy + 15, 2),
      dress: (g, G) => {
        const gr = ramp('#2f8f5a'); skirtShape(g, G, gr, 6, 9, '#f4f4fa', 3); torsoShape(g, G, gr, 7, 6);
        g.line(G.cx - 5, G.ty + 3, G.cx + 5, G.by - 1, '#e8d36a', 1.2);
        for (let i = 0; i < 3; i++) g.ell(G.cx - 4 + i * 4.2, G.ty + 4 + i * 1.4, 0.9, 0.9, '#e8d36a', true);
        g.rect(G.cx - 7, G.by - 1, 14, 2, '#f4f4fa'); g.poly([[G.cx + 1, G.by + 1], [G.cx + 7, G.by + 11], [G.cx + 3, G.by + 11]], '#2a7a4a', true);
        collar(g, G, '#f4f4fa');
      },
      hairFront: (g, G) => { bangs(g, G, '#d4483a'); sidelocks(g, G, '#c23a2e', 13);
        for (const s of [-1, 1]) { g.rect(G.cx + s * 10.5 - 1.5, G.hy + 9, 3, 4, '#e8d36a'); g.rect(G.cx + s * 10.5 - 1.5, G.hy + 13, 3, 1, '#a88a3a'); } },
      head: (g, G) => { const gr = ramp('#2f8f5a'); g.poly([[G.cx - 9, G.hy - 4], [G.cx + 9, G.hy - 4], [G.cx + 7, G.hy - 11], [G.cx - 7, G.hy - 11]], gr);
        g.rect(G.cx - 9.5, G.hy - 5.5, 20, 2.2, '#e8d36a'); g.poly([[G.cx, G.hy - 10], [G.cx + 1.5, G.hy - 7.5], [G.cx + 3.5, G.hy - 7.5], [G.cx + 1.8, G.hy - 5.8], [G.cx + 2.5, G.hy - 3.8], [G.cx, G.hy - 5], [G.cx - 2.5, G.hy - 3.8], [G.cx - 1.8, G.hy - 5.8], [G.cx - 3.5, G.hy - 7.5], [G.cx - 1.5, G.hy - 7.5]], '#f6dc4a', true); },
    },
    patchouli: {
      eye: '#9a6ad0', brow: '#6a4aa8', skin: SKIN_PALE, sleeve: ramp('#b8a4e0'), longSleeve: true, shoes: ramp('#4a3a6a'), legs: ramp('#d8cce8'),
      hairBack: (g, G) => hairBackBlob(g, G, '#8a68c8', 10.5, G.hy + 21, 3),
      dress: (g, G) => {
        const pu = ramp('#a58ad8'); skirtShape(g, G, pu, 7, 12, '#e8e0f4', 5); torsoShape(g, G, pu, 8, 7);
        for (let x = -7; x <= 7; x += 2.4) g.nline(G.cx + x, G.ty, G.cx + x * 1.2 + G.sway * 0.4, G.by + 9, '#ece4f8');
        collar(g, G, '#f4eef8'); g.ell(G.cx, G.ty + 3, 1.2, 1.2, '#e8c84a', true); g.rect(G.cx - 8, G.by, 16, 1.4, '#6a4aa8');
        g.poly([[G.cx - 2, G.by + 1], [G.cx + 2, G.by + 1], [G.cx + 1.5, G.by + 6], [G.cx - 1.5, G.by + 6]], '#e86a9a', true);
      },
      hairFront: (g, G) => { bangs(g, G, '#9a78d8'); sidelocks(g, G, '#8a68c8', 16); bow(g, G.cx + 9, G.hy + 3, '#e86a9a'); bow(g, G.cx - 9, G.hy + 3, '#7ac8e8'); },
      head: (g, G) => { const w = ramp('#f4eef8'); g.poly([[G.cx - 10, G.hy - 3], [G.cx + 10, G.hy - 3], [G.cx + 8, G.hy - 11], [G.cx - 8, G.hy - 11]], w);
        g.rect(G.cx - 10.5, G.hy - 4.5, 22, 2.2, '#a58ad8'); g.ell(G.cx + 2, G.hy - 8, 3.2, 3.2, '#f0d060', true); g.ell(G.cx + 3.2, G.hy - 8, 2.5, 2.9, w[0], true);
        for (let i = -8; i <= 8; i += 3) g.nline(G.cx + i, G.hy - 10, G.cx + i * 1.1, G.hy - 5, w[2]); },
      handItem: (g, G, side, hx, hy) => { if (side > 0) { g.rect(hx - 2, hy - 5, 9, 11, '#7a2a4a'); g.rect(hx - 1, hy - 4, 7, 9, '#f0e4c8'); g.nline(hx + 3, hy - 4, hx + 3, hy + 5, '#c8b898'); g.rect(hx + 1, hy - 1, 3, 3, '#e8c84a'); } },
    },
    flandre: {
      eye: '#e0242c', brow: '#c8a030', sleeve: ramp('#f4f0f0'), shoes: ramp('#8a1a24'), legs: ramp('#f4f0f0'),
      back: (g, G) => {
        const f = Math.sin(G.pose.t * 6) * 1.5, cols = ['#e04a4a', '#f0a030', '#f0e050', '#50c870', '#40a0e8', '#a060e0', '#e060b0'];
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const x0 = G.cx + s * 8, y0 = G.ty + 2 + i * 0.3, x1 = G.cx + s * (17 + i * 2.2), y1 = G.ty - 5 + i * 4.5 + f * s;
          g.line(x0, y0, x1, y1, '#4a3a5a', 1.2); const c = cols[(i + (s > 0 ? 3 : 0)) % 7], r = ramp(c);
          g.poly([[x1, y1 - 2], [x1 + 2.5, y1 + 1], [x1, y1 + 5], [x1 - 2.5, y1 + 1]], r); g.px(x1 - 0.5, y1 - 0.5, '#ffffff'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#e8c44a', 9.5, G.hy + 7),
      dress: (g, G) => { const rd = ramp('#d8262e'); skirtShape(g, G, rd, 6, 10.5, '#ffffff', 4); torsoShape(g, G, rd); collar(g, G, '#ffffff'); g.poly([[G.cx - 3, G.ty + 1], [G.cx + 3, G.ty + 1], [G.cx, G.ty + 4]], '#ffffff', true); g.ell(G.cx, G.ty + 4, 1.3, 1.3, '#f0d84a', true); g.rect(G.cx - 7, G.by - 1, 14, 2, '#f4f0f0'); },
      hairFront: (g, G) => { bangs(g, G, '#f0d060', 1); sidelocks(g, G, '#e8c44a', 6);
        g.poly([[G.cx - 12, G.hy - 3], [G.cx - 8, G.hy - 3], [G.cx - 8, G.hy + 15 + G.sway], [G.cx - 13, G.hy + 15 + G.sway]], hairRamp('#e8c44a')); g.rect(G.cx - 14, G.hy - 3.5, 6, 3.2, '#d8262e'); g.rect(G.cx - 13, G.hy - 3, 4, 1, '#f08088'); },
      head: (g, G) => { const w = ramp('#fbf4f4'); g.poly([[G.cx - 9.5, G.hy - 4], [G.cx + 9.5, G.hy - 4], [G.cx + 7.5, G.hy - 10.5], [G.cx - 7.5, G.hy - 10.5]], w); g.rect(G.cx - 10, G.hy - 5.5, 20.5, 2.4, '#d8262e'); bow(g, G.cx + 4, G.hy - 9.5, '#d8262e'); for (let i = -7; i <= 7; i += 2.6) g.nline(G.cx + i, G.hy - 9.5, G.cx + i, G.hy - 5.5, w[2]); },
    },
    remilia: {
      eye: '#e03040', brow: '#6a7ac0', skin: SKIN_PALE, sleeve: ramp('#f2a8c0'), shoes: ramp('#6a2a4a'), legs: ramp('#f4eef2'),
      back: (g, G) => {
        const f = Math.sin(G.pose.t * 5) * 3;
        for (const s of [-1, 1]) { const tx = G.cx + s * (21 + Math.abs(f)), ty2 = G.ty - 10 + f * 0.6, rr = ramp('#7a1b3a');
          g.poly([[G.cx + s * 4, G.ty + 1], [tx, ty2], [G.cx + s * 23, G.ty + 3 + f * 0.4], [G.cx + s * 18, G.ty + 8], [G.cx + s * 15, G.ty + 13], [G.cx + s * 10, G.ty + 9], [G.cx + s * 7, G.ty + 13], [G.cx + s * 6, G.ty + 7]], rr);
          g.line(G.cx + s * 4, G.ty + 1, tx, ty2, '#3a0a1c', 1.2); g.line(G.cx + s * 5, G.ty + 3, G.cx + s * 23, G.ty + 3 + f * 0.4, '#3a0a1c', 1); g.line(G.cx + s * 5, G.ty + 4, G.cx + s * 15, G.ty + 13, '#3a0a1c', 1); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#8aa4e0', 9.5, G.hy + 9, 1),
      dress: (g, G) => { const pk = ramp('#f2a0bc'); skirtShape(g, G, pk, 6, 10.5, '#ffffff', 4); torsoShape(g, G, pk); collar(g, G, '#ffffff'); bow(g, G.cx, G.ty + 3, '#d82a4a'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#d82a4a'); for (let i = -5; i <= 5; i += 2.5) g.nline(G.cx + i, G.by + 2, G.cx + i * 1.4, G.by + 9, '#c8789a'); },
      hairFront: (g, G) => { bangs(g, G, '#98b0ec', 1); sidelocks(g, G, '#8aa4e0', 7); },
      head: (g, G) => { const pk = ramp('#f6b8cc'); g.poly([[G.cx - 10.5, G.hy - 3.5], [G.cx + 10.5, G.hy - 3.5], [G.cx + 8.5, G.hy - 11.5], [G.cx - 8.5, G.hy - 11.5]], pk); g.rect(G.cx - 11, G.hy - 5, 22, 2.4, '#d82a4a'); bow(g, G.cx, G.hy - 8.5, '#d82a4a'); for (let i = -9; i <= 9; i += 2) g.px(G.cx + i, G.hy - 3, '#ffe0ea'); },
    },
    youmu: {
      eye: '#3a9a6a', brow: '#a8b0b8', sleeve: ramp('#f4f4fa'), shoes: ramp('#2a3a30'), legs: ramp('#eef4ee'),
      back: (g, G) => {
        const t = G.pose.t; g.line(G.cx - 12, G.ty - 8, G.cx + 9, G.by + 9, '#2a2a3a', 2); g.line(G.cx - 12, G.ty - 8, G.cx + 9, G.by + 9, '#c8d0d8', 1); g.rect(G.cx + 8, G.by + 7, 3.5, 3.5, '#5a3a2a'); g.rect(G.cx + 7.5, G.by + 6, 4.5, 1.2, '#c8a24a');
        const gx = G.cx + 15, gy = G.hy + 2 + Math.sin(t * 3) * 2;
        g.ell(gx, gy, 5.5, 5.5, ramp('#e4f2f8')); g.poly([[gx - 3.5, gy + 3], [gx + 3.5, gy + 3], [gx + 1, gy + 12], [gx - 2.5, gy + 8]], ramp('#c8e4f0')); g.ell(gx - 2, gy - 1, 0.9, 1.2, '#4a8a9a', true); g.ell(gx + 1.5, gy - 1, 0.9, 1.2, '#4a8a9a', true);
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#dfe4ea', 9.5, G.hy + 6),
      dress: (g, G) => { const gr = ramp('#2e8a56'); skirtShape(g, G, gr, 6, 9.5, '#1f6a40', 4); torsoShape(g, G, ramp('#f4f4fa')); g.poly([[G.cx - 5, G.ty + 2], [G.cx + 5, G.ty + 2], [G.cx + 5.5, G.by], [G.cx - 5.5, G.by]], gr); collar(g, G, '#ffffff'); bow(g, G.cx, G.ty + 2.5, '#22222e'); g.rect(G.cx - 7, G.by - 1, 14, 2, '#2a2a3a'); buttons(g, G, '#c8a24a', 2); },
      hairFront: (g, G) => { bangs(g, G, '#e8ecf2', 1); sidelocks(g, G, '#dfe4ea', 5); },
      head: (g, G) => { g.rect(G.cx - 8.5, G.hy - 8.5, 18, 2.4, '#22222e'); bow(g, G.cx + 7.5, G.hy - 8.5, '#22222e'); },
    },
    yuyuko: {
      eye: '#b43a78', brow: '#d880a8', skin: SKIN_PALE, sleeve: ramp('#8ab8e4'), longSleeve: true, shoes: ramp('#4a5a8a'), legs: ramp('#f4f0f8'),
      back: (g, G) => {
        const t = G.pose.t;
        for (let i = 0; i < 3; i++) { const a = t * 1.6 + i * 2.1, gx = G.cx + Math.cos(a) * 18, gy = G.hy + 4 + Math.sin(a) * 8; g.ell(gx, gy, 3.5, 3.5, ramp('#cfe4ff')); g.poly([[gx - 2, gy + 2], [gx + 2, gy + 2], [gx, gy + 8]], ramp('#a8c8f0')); g.px(gx - 1, gy - 0.5, '#4a6a9a'); g.px(gx + 1, gy - 0.5, '#4a6a9a'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#f2a4c4', 10.5, G.hy + 9, 2),
      dress: (g, G) => { const bl = ramp('#7ab0e0'); skirtShape(g, G, bl, 7, 11.5, '#c8e0f8', 5); torsoShape(g, G, bl, 8, 7); g.poly([[G.cx - 3.5, G.ty - 0.5], [G.cx + 3.5, G.ty - 0.5], [G.cx + 1.2, G.ty + 9], [G.cx - 1.2, G.ty + 9]], '#f6f2fa', true); g.nline(G.cx - 3, G.ty, G.cx - 1, G.ty + 8, '#d8d4e4'); g.rect(G.cx - 7.5, G.by - 2.5, 15, 3.5, '#e87aa0'); bow(g, G.cx + 5, G.by, '#e87aa0'); for (let i = -8; i <= 8; i += 4) g.ell(G.cx + i, G.by + 5, 1, 1, '#f4a8c8', true); },
      hairFront: (g, G) => { bangs(g, G, '#f6b4d0'); sidelocks(g, G, '#f2a4c4', 6); },
      head: (g, G) => { const bl = ramp('#8ab8e4'); g.poly([[G.cx - 10.5, G.hy - 3.5], [G.cx + 10.5, G.hy - 3.5], [G.cx + 8.5, G.hy - 11.5], [G.cx - 8.5, G.hy - 11.5]], bl); g.poly([[G.cx - 3.5, G.hy - 3.5], [G.cx + 3.5, G.hy - 3.5], [G.cx, G.hy - 9]], '#f8f8ff', true); g.rect(G.cx - 11, G.hy - 5, 22, 2.2, '#e87aa0'); for (let i = -8; i <= 8; i += 2.4) g.px(G.cx + i, G.hy - 9, bl[0]); },
      handItem: (g, G, side, hx, hy) => { if (side > 0) { g.poly([[hx - 2, hy + 3], [hx + 6, hy - 8], [hx + 12, hy - 3], [hx + 4, hy + 6]], '#d89ac0', true); for (let i = 0; i < 4; i++) g.nline(hx + 1 + i * 2.5, hy + 4 - i * 1.5, hx + 6 + i * 1.8, hy - 7 + i * 1.5, '#fff0f8'); } },
    },
    reisen: {
      eye: '#ff2a3c', brow: '#7a5ab0', sleeve: ramp('#3c3454'), shoes: ramp('#2a2236'), legs: ramp('#2a2236'),
      back: (g, G) => {
        for (const s of [-1, 1]) { const bx = G.cx + s * 4.5, by0 = G.hy - 8, f = Math.sin(G.pose.t * 4 + s) * 1.3;
          g.poly([[bx - 2.5, by0], [bx + 2.5, by0], [bx + s * 6 + 2.5 + f, by0 - 14], [bx + s * 6 - 2.5 + f, by0 - 14]], ramp('#f4eef8'));
          g.poly([[bx + s * 6 - 2.5 + f, by0 - 14], [bx + s * 6 + 2.5 + f, by0 - 14], [bx + s * 12 + f, by0 - 9], [bx + s * 9.5 + f, by0 - 6]], ramp('#d8c8e0')); g.nline(bx + s * 1, by0 - 1, bx + s * 5 + f, by0 - 12, '#f0a0b8'); }
      },
      hairBack: (g, G) => hairBackBlob(g, G, '#9a7ad4', 10.5, G.hy + 23, 3),
      dress: (g, G) => { const bl = ramp('#3c3454'); skirtShape(g, G, ramp('#c86a90'), 6, 9.5, '#f4e0ea', 5); for (let i = -4; i <= 4; i += 2) g.nline(G.cx + i, G.by + 1, G.cx + i * 1.4, G.by + 9, '#e0a8c0'); torsoShape(g, G, bl); g.poly([[G.cx - 3, G.ty], [G.cx + 3, G.ty], [G.cx + 1.2, G.ty + 9], [G.cx - 1.2, G.ty + 9]], '#f4f4fa', true); g.poly([[G.cx - 1, G.ty + 1], [G.cx + 1.2, G.ty + 1], [G.cx + 2, G.ty + 9], [G.cx - 0.2, G.ty + 9]], '#d82a3a', true); buttons(g, G, '#c8a24a', 2); },
      hairFront: (g, G) => { bangs(g, G, '#a888e0', 1); sidelocks(g, G, '#9a7ad4', 15); },
      head: () => {},
    },
    kaguya: {
      eye: '#a82030', brow: '#4a3a6a', skin: SKIN_PALE, sleeve: ramp('#f4a8c4'), longSleeve: true, shoes: ramp('#5a2a4a'), legs: ramp('#f4eef2'),
      hairBack: (g, G) => hairBackBlob(g, G, '#261c3a', 11.5, G.hy + 28, 4),
      dress: (g, G) => { const rd = ramp('#8a1a48'); skirtShape(g, G, rd, 7, 12.5, '#f4a8c4', 5); torsoShape(g, G, ramp('#f4a8c4'), 8, 6); collar(g, G, '#fff0f6');
        for (let x = -10; x <= 10; x += 3.5) { g.ell(G.cx + x + G.sway, G.by + 5, 1.2, 1.2, '#f0d070', true); } for (let x = -8; x <= 8; x += 4) g.ell(G.cx + x * 0.8, G.ty + 5, 1, 1, '#f08ab0', true); g.rect(G.cx - 7.5, G.by - 1.5, 15, 2.6, '#f0d070'); bow(g, G.cx, G.by - 0.5, '#c8205a'); },
      hairFront: (g, G) => { const r = hairRamp('#2c2242'); g.ell(G.cx, G.hy - 5, 10.8, 6, r); g.rect(G.cx - 10.5, G.hy - 5, 21.5, 5.2, r[2]);
        for (let x = -10; x <= 10; x += 1.4) g.nline(G.cx + x, G.hy - 9, G.cx + x, G.hy - 0.6, x % 2 ? r[3] : r[1]); for (let x = -9; x <= 9; x += 3) g.px(G.cx + x, G.hy - 8.5, r[0]);
        sidelocks(g, G, '#261c3a', 19); g.rect(G.cx - 11.5, G.hy + 2, 1.2, 15, '#5a4a8a'); g.rect(G.cx + 11, G.hy + 2, 1.2, 15, '#5a4a8a'); g.rect(G.cx - 10.5, G.hy + 14, 3, 3, '#f0d070'); g.rect(G.cx + 8.5, G.hy + 14, 3, 3, '#f0d070'); },
      head: (g, G) => { g.poly([[G.cx - 1.5, G.hy - 11], [G.cx + 1.5, G.hy - 11], [G.cx + 2, G.hy - 8], [G.cx - 2, G.hy - 8]], '#f0d070', true); },
    },
  };

  // ---------- 프레임 캐시 ----------
  const W = 72, H = 96, FEET = 93, cache = {};
  function frame(id, pose) {
    const key = id + '|' + ['ph', 'bob', 'air', 'crouch', 'hurt', 'throw', 'dash', 'run', 'sway', 'tq', 'fly'].map(k => pose[k] ?? 0).join(',');
    if (cache[key]) return cache[key];
    const g = new Pix(W, H);
    pose.t = (pose.tq ?? 0) * 0.25;
    drawHuman(g, CHARS[id], pose);
    const c = g.finish(); const f = { c };
    const fl = document.createElement('canvas'); fl.width = W; fl.height = H; const x = fl.getContext('2d'); x.translate(W, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); f.flip = fl;
    return (cache[key] = f);
  }

  // 대화창용 상반신 초상화: 정수 배율로 크게 확대 (도트 유지)
  const portraits = {};
  function portrait(id) {
    if (portraits[id]) return portraits[id];
    const f = frame(id, { tq: 1, bob: 0 }).c, o = document.createElement('canvas'); o.width = 224; o.height = 224;
    const x = o.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(f, 6, 2, 60, 60, 0, 0, 224, 224);
    return (portraits[id] = o);
  }

  function poseFor(st, time) {
    const q = Math.floor(time * 4) % 4;
    const p = { tq: q, sway: Math.round(Math.sin(time * 2.4) * 1) };
    if (st.hurt) p.hurt = 1;
    if (st.crouch) { p.crouch = 1; p.bob = 0; }
    if (st.dash) p.dash = 1;
    if (st.throw) p.throw = st.throw > 0.5 ? 1 : 0.5;
    if (!st.onGround && !st.fly) p.air = st.vy < 0 ? -1 : 1;
    else if (Math.abs(st.vx) > 25 && !st.fly && !st.crouch) { p.run = 1; p.ph = (Math.floor(time * 11) % 6) / 6; p.sway = -Math.round(Math.sin(p.ph * Math.PI * 2) * 2); }
    else if (!st.crouch) p.bob = Math.floor(time * 1.6) % 2;
    if (st.fly) { p.bob = Math.round(Math.sin(time * 3) * 1.4); p.sway = Math.round(Math.sin(time * 2) * 2); if (st.cast) p.air = -1; p.fly = 1; }
    if (st.cast) p.throw = 1;
    return p;
  }

  // feetY: 발이 닿는 y 좌표
  function drawChar(ctx, id, st, x, feetY, face, time) {
    const p = poseFor(st, time), f = frame(id, p);
    ctx.drawImage(face < 0 ? f.flip : f.c, Math.round(x - W / 2), Math.round(feetY - FEET));
  }

  return { Pix, ramp, ramp4, mix, rgba, CHARS, frame, portrait, drawChar, W, H, FEET, OUT };
})();
