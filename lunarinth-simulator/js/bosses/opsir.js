// STAGE 1 — 옵서: 별을 겨누는 무심한 관측관.
// 언어: "시선". 가는 조준선이 먼저 그어지고, 그 선 위로 별이 줄지어 날아온다. 별자리는 점과 선으로 그려진 뒤 대형을 유지한 채 떨어진다.
// 통상은 조준선 · 삼각 측량 · 훑기 / 예측 · 사각 · 십자선, 스펠은 별자리 낙하 / 별 도형 포격으로 서로 다른 문법을 쓴다.
// 기술명(아스트랄 옵저베이션 / 스타라이트 캐논)은 제공된 설정, 패턴은 이 게임의 창작이다.
import { Boss, TAU, rnd, clamp, HP_K } from '../boss.js';

const PAL = { a: 0xcfe0ff, b: 0x9cc3ff, c: 0xffffff, glow: 0x7fa8ff };
const MUL = 0.55;
// 보통 난이도에서 단계를 깨는 데 걸리는 시간(초 × 실효 화력 85) 기준으로 체력을 정한다
const ttk = (frac, time) => Math.round((frac * time * 85) / (MUL * HP_K));

// 별자리: [x(-1..1), z(0..1)] 점과 선(점 번호 쌍)
const SHAPES = {
  dipper: { pts: [[-0.9, 0.12], [-0.45, 0.18], [-0.35, 0.62], [-0.85, 0.56], [0.0, 0.72], [0.45, 0.88], [0.9, 0.68]], edges: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6]] },
  cassio: { pts: [[-0.9, 0.7], [-0.45, 0.1], [0.0, 0.6], [0.45, 0.1], [0.9, 0.7]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  triangle: { pts: [[-0.8, 0.08], [0.8, 0.08], [0.0, 0.92], [0.0, 0.36]], edges: [[0, 1], [1, 2], [2, 0], [3, 2]] },
};

export const OPSIR = {
  id: 'opsir', name: '옵서', en: 'OPSIR', epithet: '별을 겨누는 무심한 관측관',
  h: 5.0, hitR: 1.45, barkKey: 'opsir', pal: PAL, decoyColor: 0xcfe0ff,
  hpMul: MUL, theme: 'astral', music: 'opsir',
  forms: {
    scout: { label: '정찰 형태', sub: '관측대 위의 사수', tint: [1, 1, 1] },
    observe: { label: '관측 형태', sub: '별자리를 읽는 눈', tint: [0.96, 1, 1.08] },
    aim: { label: '조준 형태', sub: '사각을 찾는 눈', tint: [1.05, 0.98, 1] },
    cannon: { label: '포격 형태', sub: '별빛을 응축한 렌즈', tint: [1.1, 1.08, 1.12] },
  },
  steps: [
    { kind: 'nonspell', name: '정찰 사격', form: 'scout', hp: ttk(0.36, 34), time: 34, attacks: ['sightings', 'triangulate', 'sweepScan'], idle: 1.1, ultMode: 'normal' },
    { kind: 'spell', tag: '천체 관측', name: '아스트랄 옵저베이션', form: 'observe', hp: ttk(0.4, 44), time: 44, attacks: ['spObserve'], idle: 0.8, ultMode: 'normal' },
    { kind: 'nonspell', name: '사각 포착', form: 'aim', hp: ttk(0.36, 36), time: 36, attacks: ['blindSide', 'leadVolley', 'crossSight'], idle: 1.0, ultMode: 'normal' },
    { kind: 'spell', tag: '성광 포격', name: '스타라이트 캐논', form: 'cannon', hp: ttk(0.45, 56), time: 56, attacks: ['spCannon'], idle: 0.8, ultMode: 'normal' },
  ],
};

export class Opsir extends Boss {
  constructor(scene, T, tex, aspect, G) { super(scene, T, tex, aspect, G, OPSIR); }

  /** 가는 조준선(무해)을 먼저 보여 준다 */
  guide(x, z, a, warn, len = 30, w = 0.32) { return this.beam(x, z, a, { w, len, warn, dur: 0.08, dmg: 0, quiet: true, color: this.pal.a }); }

  // ═════════ 통상 1: 정찰 사격 ═════════
  // 조준선 → 그 선을 따라 별이 한 줄로 쏟아진다.
  *atk_sightings() {
    const pal = this.pal;
    this.cast('beam_charge'); this.glide(rnd(-5, 5), -6.4, 0.7); yield 0.6;
    const rounds = 4 + (this.lv(2) ? 1 : 0);
    for (let r = 0; r < rounds; r++) {
      const a0 = this.aim(), n = this.n(3, 2) + (this.lv(2) ? 1 : 0), sp = 0.52, angs = [];
      for (let k = 0; k < n; k++) angs.push(a0 + (k - (n - 1) / 2) * sp + (r % 2 ? sp / 2 : 0));
      for (const ang of angs) this.guide(this.x, this.z, ang, 0.85);
      this.sfx('telegraph'); yield 0.85;
      for (const ang of angs) for (let j = 0; j < 6; j++) this.shoot({ a: ang, speed: 10, kind: 'star', size: 1.05, color: pal.c, delay: j * 0.1 });
      this.sfx('fan'); this.kick(-Math.cos(a0) * 1.2, -Math.sin(a0) * 1.2);
      this.glide(rnd(-6, 6), rnd(-7.5, -5.5), 0.8);
      yield this.t(1.1);
    }
    yield 0.4;
  }

  // 플레이어를 둘러싼 삼각형: 세 꼭짓점의 별이 정지, 변을 따라 점이 늘어서 있다가 안쪽으로 좁혀 들어온다.
  *atk_triangulate() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.7); yield 0.5;
    const rounds = 3 + (this.lv(2) ? 1 : 0);
    for (let r = 0; r < rounds; r++) {
      const cx = clamp(P.x, -4, 4), cz = clamp(P.z, -1, 5), R = rnd(5.6, 6.4), base = rnd(0, TAU);
      const V = [0, 1, 2].map((i) => [clamp(cx + Math.cos(base + (i * TAU) / 3) * R, -9.5, 9.5), clamp(cz + Math.sin(base + (i * TAU) / 3) * R * 0.85, -8, 9)]);
      const H = 1.7;
      for (let i = 0; i < 3; i++) {
        const [x0, z0] = V[i], [x1, z1] = V[(i + 1) % 3];
        this.shoot({ kind: 'star', x: x0, z: z0, a: 0, speed: 6.6, size: 1.6, color: pal.c, hold: H, reaim: true, life: 10 });
        this.line(x0, z0, x1, z1, this.n(5, 3) + 2, { kind: 'orb', size: 0.8, color: pal.a, speed: 2.4, a: Math.atan2(cz - (z0 + z1) / 2, cx - (x0 + x1) / 2), hold: H, life: 10 });
        this.sfx('telegraph', { pan: G.audio.pan(x0), vol: 0.6 });
        yield 0.2;
      }
      yield this.t(H + 1.6);
    }
    yield 0.4;
  }

  // 훑기: 같은 점에서 시작한 조준선이 부채꼴로 순서대로 켜지며 한쪽에서 다른 쪽으로 쓸고 지나간다.
  *atk_sweepScan() {
    const pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.7); yield 0.7;
    const passes = 2 + (this.lv(2) ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      const dir = p % 2 ? -1 : 1, a0 = this.aim() - dir * 0.9, N = 8, stepA = 0.23;
      for (let k = 0; k < N; k++) {
        const ang = a0 + dir * k * stepA;
        this.beam(this.x, this.z, ang, { w: 0.85, len: 30, warn: 0.9, dur: 0.14, color: pal.b, quiet: k % 2 === 1,
          onFire: () => { if (k % 3 === 0) for (let j = 0; j < 3; j++) this.shoot({ a: ang, speed: 6.5, kind: 'star', size: 1.0, color: pal.c, delay: j * 0.18 }); } });
        if (k % 2 === 0) this.sfx('beam_charge', { vol: 0.45, pitch: 1 + k * 0.04 });
        yield 0.13;
      }
      yield this.t(1.9);
    }
    yield 0.3;
  }

  // ═════════ 스펠 1: 천체 관측「아스트랄 옵저베이션」 ═════════
  // 별자리가 별과 선으로 한 점씩 그려진 뒤, 같은 순간에 풀려난다. 낙하 / 수렴 / 분열을 번갈아.
  *atk_spObserve() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7.2, 0.8); yield 0.9;
    const order = ['dipper', 'cassio', 'triangle'], modes = ['fall', 'converge', 'shatter'];
    for (let cyc = 0; ; cyc++) {
      const shape = SHAPES[order[cyc % 3]], mode = modes[cyc % 3];
      const cx = clamp(rnd(-3.5, 3.5) + (P.x > 0 ? -1 : 1), -4, 4), W = rnd(5.4, 6.2), zb = -9.4, D = 5.4;
      const mir = Math.random() < 0.5 ? -1 : 1;
      const pts = shape.pts.map(([u, v]) => [cx + u * mir * W, zb + v * D]);
      const stag = 0.28, H = pts.length * stag + 0.9;
      const dirOf = (x, z) => (mode === 'fall' ? Math.PI / 2 : mode === 'shatter' ? Math.PI / 2 : Math.atan2(P.z - z, P.x - x));
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        const b = this.shoot({ kind: 'star', x, z, a: dirOf(x, z), speed: mode === 'fall' ? 3.9 : mode === 'shatter' ? 1.4 : 6.4, size: 1.65, color: pal.c, hold: H - i * stag, delay: i * stag, reaim: mode === 'converge', life: 12, accel: mode === 'fall' ? 0.5 : 0, maxS: 5.2 });
        if (b && mode === 'shatter') {
          const Hh = H, nn = this.n(6, 4), spd = this.spd;
          b.fn = (bb) => { if (!bb.did && bb.age > Hh + 0.9) { bb.did = true; const a0 = rnd(0, TAU); for (let k = 0; k < nn; k++) G.bullets.spawn({ owner: 'boss', kind: 'orb', x: bb.x, z: bb.z, a: a0 + (k * TAU) / nn, speed: 3.2 * spd, size: 0.85, color: pal.b }); bb.life = 0; } };
        }
        this.sfx('telegraph', { pan: G.audio.pan(x), vol: 0.5, pitch: 1 + i * 0.07 });
        yield stag;
      }
      for (const [i, j] of shape.edges) {
        const [x0, z0] = pts[i], [x1, z1] = pts[j], dl = Math.max(i, j) * stag;
        this.line(x0, z0, x1, z1, this.n(5, 3), { kind: 'orb', size: 0.78, color: pal.a, a: mode === 'converge' ? 0 : Math.PI / 2, speed: mode === 'fall' ? 3.9 : mode === 'shatter' ? 2.6 : 3.6, hold: Math.max(0.6, H - dl), delay: dl, reaim: mode === 'converge', life: 12, accel: mode === 'fall' ? 0.5 : 0, maxS: 5.2 });
      }
      // 관측선: 별이 풀려나기 직전에 플레이어를 훑는 가는 빔
      if (this.lv(1)) this.beam(this.x, this.z, this.aim(), { w: 0.9, len: 30, warn: 1.1, dur: 0.18, color: pal.c });
      this.sfx('beam_charge');
      yield Math.max(0.5, H - pts.length * stag) + 0.1;
      this.sfx('fan'); G.world.beat(0.5);
      yield this.t(mode === 'shatter' ? 4.6 : 3.8);
    }
  }

  // ═════════ 통상 2: 사각 포착 ═════════
  /** 플레이어의 등 뒤(남쪽)에서 올라오는 별줄기. 곧은 가이드선이 먼저 보인다. */
  *blindLines(count, warn, perLine) {
    const P = this.G.player, pal = this.pal, xs = [];
    for (let k = 0; k < count; k++) xs.push(clamp(P.x + (k - (count - 1) / 2) * 2.3 + rnd(-0.3, 0.3), -9, 9));
    for (const x of xs) this.beam(x, 11.5, -Math.PI / 2, { w: 0.5, len: 26, warn, dur: 0.1, dmg: 0, quiet: true, color: pal.a });
    this.sfx('beam_charge', { vol: 0.6 });
    yield warn;
    for (const x of xs) for (let j = 0; j < perLine; j++) this.shoot({ x, z: 11.5, a: -Math.PI / 2, speed: 7.8, kind: 'star', size: 1.05, color: pal.c, delay: j * 0.14 });
    this.sfx('fan');
  }

  *atk_blindSide() {
    const P = this.G.player, pal = this.pal;
    this.cast('beam_charge'); yield 0.5;
    const waves = 4 + (this.lv(2) ? 1 : 0);
    for (let w = 0; w < waves; w++) {
      // 앞에서는 한 줄의 굵은 빔이 플레이어를 겨누고, 동시에 등 뒤에서 별줄기가 올라온다
      this.beam(this.x, this.z, this.aim(), { w: 1.1, len: 30, warn: 1.35, dur: 0.16, color: pal.b });
      yield* this.blindLines(this.n(4, 3), 0.9, 4);
      yield this.t(1.3);
    }
    void P; yield 0.4;
  }

  // 현재 위치를 겨눈 느린 별(미끼) 뒤에, 예측 위치로 향하는 조준선과 빠른 별줄기.
  *atk_leadVolley() {
    const pal = this.pal;
    this.cast('fan'); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.6;
    const rounds = 5 + (this.lv(2) ? 1 : 0);
    for (let r = 0; r < rounds; r++) {
      this.fan(3, 0.2, this.aim(), { kind: 'star', speed: 5.2, size: 1.1, color: pal.b });
      this.sfx('fan'); yield this.t(0.5);
      const al = this.lead(0.85), sx = this.x, sz = this.z;
      this.guide(sx, sz, al, 0.5, 30, 0.28); this.sfx('telegraph', { vol: 0.5 }); yield 0.5;
      for (let j = 0; j < 5; j++) this.shoot({ x: sx, z: sz, a: al, speed: 12, kind: 'star', size: 1.05, color: pal.c, delay: j * 0.07 });
      for (const o of [-0.3, 0.3]) if (this.lv(1)) this.shoot({ x: sx, z: sz, a: al + o, speed: 9, kind: 'star', size: 1.0, color: pal.a });
      this.sfx('fan', { pitch: 1.3 });
      if (r % 2) this.glide(rnd(-6.5, 6.5), rnd(-7.5, -5), 0.6);
      yield this.t(0.85);
    }
    yield 0.4;
  }

  // 십자선: 예측 지점에 원(구역)과 가로 · 세로 조준선이 겹쳐 그어지고, 교점에서 별이 사선으로 튄다.
  *atk_crossSight() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.6, 0.7); yield 0.6;
    const rounds = 3 + (this.lv(2) ? 1 : 0);
    for (let r = 0; r < rounds; r++) {
      const cx = clamp(P.x + (P.vx || 0) * 0.9, -8, 8), cz = clamp(P.z + (P.vz || 0) * 0.9, -6, 8), rot = r % 2 ? Math.PI / 4 : 0;
      for (let k = 0; k < 2; k++) this.beam(cx - Math.cos(rot + (k * Math.PI) / 2) * 15, cz - Math.sin(rot + (k * Math.PI) / 2) * 15, rot + (k * Math.PI) / 2, { w: 0.95, len: 30, warn: 1.15, dur: 0.14, color: pal.b });
      this.zone(cx, cz, 2.1, { warn: 1.15, dur: 0.25, color: pal.c, onBoom: (zz) => { for (let k = 0; k < 4; k++) this.shoot({ x: zz.x, z: zz.z, a: rot + Math.PI / 4 + (k * Math.PI) / 2, speed: 6.4, kind: 'star', size: 1.05, color: pal.c, arm: 0.25 }); } });
      this.sfx('telegraph'); this.sfx('beam_charge', { vol: 0.5 });
      yield this.t(1.9);
    }
    yield 0.5;
  }

  // ═════════ 스펠 2: 성광 포격「스타라이트 캐논」 ═════════
  // 별 도형(오각성 · 육각성)이 빔으로 그어지고, 정조준 이중 사격, 그리고 대형을 갖춘 별 커튼이 쏟아진다.
  *atk_spCannon() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.8); yield 1.0;
    for (let cyc = 0; ; cyc++) {
      // A) 별 도형: 중심을 플레이어 근처에 두고 현을 하나씩 긋는다. 안쪽 오각형과 꼭짓점 바깥이 안전하다.
      const cx = clamp(P.x + rnd(-3, 3), -4, 4), cz = clamp(P.z + rnd(-2, 2), -2, 4), R = 8, rot = rnd(0, TAU);
      const hexa = cyc % 2 === 1 && this.lv(1), sides = hexa ? 6 : 5, V = [];
      for (let i = 0; i < sides; i++) V.push([cx + Math.cos(rot + (i * TAU) / sides) * R, cz + Math.sin(rot + (i * TAU) / sides) * R]);
      const chords = [];
      if (hexa) { for (let i = 0; i < 6; i++) chords.push([V[i], V[(i + 2) % 6]]); } else for (let i = 0; i < 5; i++) chords.push([V[i], V[(i + 2) % 5]]);
      for (const [p0, p1] of chords) {
        const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        this.beam(p0[0], p0[1], ang, { w: 1.2, len, warn: 1.4, dur: 0.3, color: pal.b, onFire: () => {
          const m = this.n(4, 2);
          for (let k = 0; k < m; k++) { const f = (k + 0.5) / m; this.shoot({ x: p0[0] + (p1[0] - p0[0]) * f, z: p0[1] + (p1[1] - p0[1]) * f, a: ang + (k % 2 ? 1 : -1) * Math.PI / 2, speed: 2.2, kind: 'star', size: 1.0, color: pal.c, arm: 0.3, life: 5 }); }
        } });
        this.sfx('beam_charge', { vol: 0.5, pitch: 0.9 + (cyc % 3) * 0.05 });
        yield 0.22;
      }
      yield 1.5 + 0.4;
      G.world.beat(0.8);
      yield this.t(0.8);
      // B) 정조준 이중 사격: 첫 빔을 피해 움직인 곳을 두 번째 빔이 다시 겨눈다
      this.glide(rnd(-6, 6), rnd(-7.5, -5.5), 0.6); yield 0.6;
      const a = this.aim();
      this.beam(this.x, this.z, a, { w: 2.6, len: 32, warn: 1.1, dur: 0.35, color: pal.c });
      this.sfx('beam_charge'); yield 1.1;
      this.kick(-Math.cos(a) * 1.4, -Math.sin(a) * 1.4);
      for (let j = 0; j < 4; j++) this.shoot({ a, speed: 9, kind: 'star', size: 1.1, color: pal.c, delay: j * 0.1 });
      yield 0.25;
      const a2 = this.lead(0.7);
      this.beam(this.x, this.z, a2, { w: 1.6, len: 32, warn: 0.75, dur: 0.3, color: pal.b });
      if (this.lv(2)) this.beam(this.x, this.z, a2 + 0.6, { w: 1.1, len: 32, warn: 0.75, dur: 0.3, color: pal.b });
      this.sfx('beam_charge', { pitch: 1.2 }); yield 0.75;
      for (let j = 0; j < 4; j++) this.shoot({ a: a2, speed: 9.5, kind: 'star', size: 1.1, color: pal.c, delay: j * 0.1 });
      yield this.t(0.9);
      // C) 별 커튼: 위에서 줄지어 나타나 대형 그대로 떨어진다 (한 곳만 비어 있다)
      const gap = clamp(P.x + rnd(-3, 3), -8, 8), cols = [];
      for (let x = -9.6; x <= 9.6; x += 2.4) if (Math.abs(x - gap) > 1.7) cols.push(x);
      cols.forEach((x, i) => {
        for (let k = 0; k < 2; k++) this.shoot({ kind: 'star', x, z: -9.8 + k * 1.5, a: Math.PI / 2, speed: 5, size: 1.2, color: pal.c, hold: 1.5 - i * 0.07, delay: i * 0.07, life: 8 });
      });
      this.sfx('telegraph');
      yield 1.8 + this.t(1.6);
    }
  }
}
