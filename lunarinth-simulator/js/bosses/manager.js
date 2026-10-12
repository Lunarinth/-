// APOTHEOSIS — 숨겨진 최종 무대.
//  · 중간 보스: 오류 아르케시아 (붉게 뒤틀린 시스템 — 패턴이 뒤집히고, 갑자기 분석률이 오른다)
//  · 보스: 무대 관리자 (직조기·실·바늘의 17단계) → 쓰러진 척 → 이름을 밝히고 99초 동안 모든 패턴을 0.1초마다 난사
// 플레이어는 체력이 무한이고(표시 없음), 세계는 흑백이며 적의 탄은 전부 흰색이다.
import { Boss, TAU, rnd, clamp, shuffle, HP_K } from '../boss.js';
import { Arkesia } from './arkesia.js';

// ═════════════════════════ 오류 아르케시아 (중간 보스) ═════════════════════════
const EPAL = { a: 0xff2b3d, b: 0xffffff, c: 0xffffff, glow: 0xff0033, gold: 0xff8a8a };
const EMUL = 1.0;
const ettk = (frac, time) => Math.round((frac * time * 85) / (EMUL * HP_K));
const ES = (kind, tag, name, time, attacks, frac) => ({ kind, tag, name, form: 'err', time, attacks, hp: ettk(frac, time), idle: 0.7, ultMode: 'normal' });

export const APO_MID = {
  id: 'arkesia', name: '▒ERR::ARKESIA', en: 'ERR::ARKESIA', epithet: '붉게 뒤틀린 인형술사', h: 5.6, hitR: 1.5, barkKey: 'arkesia', pal: EPAL, decoyColor: 0xff2b3d, decoyBullet: 0xff2b3d,
  hpMul: EMUL, theme: 'mono', music: 'midApo', hasAnalysis: true, analysisRate: 2.2,
  forms: { err: { label: '［오류］', sub: '뒤집힌 대본', tint: [1.5, 0.35, 0.4] } },
  steps: [
    ES('nonspell', null, '［오류］ 실 늘이기', 36, ['glitchFan', 'reverseMeteor'], 0.4),
    ES('spell', '역류', '［역류］ 거꾸로 내리는 비', 44, ['inverseRain'], 0.45),
    ES('spell', '분석', '［분석률 ???％］', 46, ['analysisSurge'], 0.45),
    ES('spell', '되감기', '［되감기］ 감기지 않는 실', 48, ['rewind'], 0.45),
    ES('spell', '오류', '［대본 오류］', 54, ['scriptError'], 0.5),
  ],
};

export class ErrorArkesia extends Arkesia {
  constructor(scene, T, tex, aspect, G, def = APO_MID) { super(scene, T, tex, aspect, G, def); }

  update(dt) {
    super.update(dt);
    // 분석률이 100%에 닿으면 사격이 막히고 0으로 되돌아간다 (벨리스의 분석도를 이상하게 빌려 쓴다)
    if (this.state === 'run' && this.analysis >= 99.5) {
      this.analysis = 0; const P = this.G.player; P.sealT = 3; this.G.ui.warn('［분석률 100％］ 사격 불가 — 3.0초', 1800); this.sfx('glitch', { vol: 0.8 }); this.G.ui.flash('#ff2b3d', 400, 0.4);
    }
  }
  renderExtra(dt, t) {
    // 글리치: 붉은 색조 + 좌표 떨림 + 깜빡임
    const j = Math.random() < 0.18 ? rnd(-0.5, 0.5) : 0;
    this.spr.position.x += j; this.mat.color.setRGB(1.5 + Math.random() * 0.4, 0.3, 0.35); if (Math.random() < 0.05) this.mat.opacity *= 0.3;
  }
  get ew() { return ['［ERR］', '▒▒', '［0x4F］', '［NULL］', '［404］'][(Math.random() * 5) | 0]; }

  /** 방향을 제멋대로 바꾸는 탄 */
  glitchBullet(x, z, a, sp, o = {}) {
    return this.G.bullets.spawn({ owner: 'boss', kind: o.kind || 'shard', x, z, a, speed: sp * this.spd, size: o.size ?? 1.1, color: 0xff2b3d, life: o.life ?? 6,
      fn: (b) => { b._gt = (b._gt ?? rnd(0.3, 0.9)) - 0.016; if (b._gt <= 0 && b.age < 2.4) { b._gt = rnd(0.35, 0.8); const s = Math.hypot(b.vx, b.vz), na = Math.atan2(b.vz, b.vx) + rnd(-1.4, 1.4); b.vx = Math.cos(na) * s; b.vz = Math.sin(na) * s; } } });
  }

  *atk_glitchFan() {
    this.cast('glitch'); this.glide(rnd(-5, 5), -6.5, 0.6); this.G.ui.warn(`${this.ew} 실이 엉킨다`, 1200); yield 0.5;
    for (let v = 0; v < 6; v++) {
      const n = this.n(8, 5), a = this.aim();
      for (let i = 0; i < n; i++) this.glitchBullet(this.x, this.z, a + (i / (n - 1) - 0.5) * 1.8, 5.4);
      this.sfx('glitch', { vol: 0.5 }); if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.6); yield this.t(0.85);
    }
    yield 0.5;
  }
  /** 거꾸로 떨어지는 메테오: 먼저 폭발이 일어나고, 그 뒤에 덩어리가 하늘로 올라간다 */
  *atk_reverseMeteor() {
    const G = this.G, P = G.player;
    this.cast('moon_throw'); this.glide(0, -7, 0.7); G.ui.warn(`${this.ew} 낙하 방향: 반전`, 1300); yield 0.7;
    for (let i = 0; i < 6; i++) {
      const tx = clamp(P.x + P.vx * 0.4 + rnd(-2, 2), -8, 8), tz = clamp(P.z + P.vz * 0.4 + rnd(-2, 2), -7, 8.5);
      this.zone(tx, tz, 2.6, { warn: 0.95, dur: 0.35, color: 0xff2b3d, onBoom: (zz) => {
        G.world.shake(0.5, 0.3); G.audio.sfx.play('moon_impact', { vol: 0.5 });
        G.flyers.launch({ x0: zz.x, z0: zz.z, y0: 0.2, x1: zz.x * 0.3, z1: zz.z - 8, dur: 1.0, size: 3.2, color: 0xff2b3d, arc: 14 });
        for (let k = 0; k < this.n(8, 5); k++) this.G.bullets.spawn({ owner: 'boss', kind: 'shard', x: zz.x, z: zz.z, a: (k * TAU) / this.n(8, 5), speed: 5 * this.spd, size: 1.05, color: 0xff2b3d, speeds: [[0, 1.6], [0.5, 0.25], [1.0, 1.7]] });
      } });
      this.sfx('telegraph'); yield this.t(0.7);
    }
    yield 1.0;
  }
  /** 아래에서 위로 올라가는 비: 틈이 있는 줄이 화면 아래에서 솟아오른다 */
  *atk_inverseRain() {
    const G = this.G;
    this.cast('madness'); this.glide(0, -7, 0.7); G.ui.warn(`${this.ew} 위와 아래가 뒤집힌다`, 1400); yield 0.8;
    G.zones.spawn({ kind: 'invert', x: G.player.x, z: G.player.z, r: 3.2, warn: 0.6, dur: 7, color: 0xff2b3d });
    for (let w = 0; w < 9; w++) {
      const gap = rnd(-7, 7);
      for (let x = -10; x <= 10; x += 1.7) if (Math.abs(x - gap) > 1.9) G.bullets.spawn({ owner: 'boss', kind: 'shard', x, z: 11.5, a: -Math.PI / 2, speed: 4.4 * this.spd, size: 1.1, color: 0xff2b3d, life: 9, speeds: [[0, 1], [1.2, 0.5], [1.8, 1.6]] });
      this.fan(this.n(3, 2), 0.5, this.aim(), { kind: 'glyph', speed: 6, size: 1.0, color: 0xffffff });
      this.sfx('glitch', { vol: 0.4 }); yield this.t(0.95);
    }
    yield 0.6;
  }
  *atk_analysisSurge() {
    const G = this.G, P = G.player;
    this.cast('veil'); this.glide(0, -6.6, 0.7); G.ui.warn(`${this.ew} 분석률 급상승`, 1400); yield 0.8;
    for (let c = 0; c < 5; c++) {
      this.analysis = Math.min(99, this.analysis + 24);
      this.mark2(P.x, P.z);
      for (let k = 0; k < 3; k++) { this.flare(this.x, this.z, this.n(14, 8), 4.2, { kind: 'glyph', color: 0xff2b3d, speeds: [[0, 1.2], [0.7, 0.3], [1.2, 1.7]], a0: k * 0.2 }); this.sfx('glitch', { vol: 0.4 }); yield this.t(0.42); }
      yield 1.2;
    }
  }
  mark2(x, z) { this.zone(x, z, 2.4, { warn: 1.3, dur: 0.3, color: 0xff2b3d, onBoom: (zz) => this.flare(zz.x, zz.z, this.n(14, 8), 5, { kind: 'shard', color: 0xffffff, speeds: [[0, 0.3], [0.5, 0.3], [0.9, 2.0]] }) }); }
  /** 되감기: 같은 탄이 세 번 방향을 뒤집는다 */
  *atk_rewind() {
    this.cast('moon_throw'); this.glide(0, -5.8, 0.8); this.G.ui.warn(`${this.ew} 되감는 중`, 1300); yield 0.8;
    for (let c = 0; c < 5; c++) {
      const n = this.n(16, 9), a0 = rnd(0, TAU), x = this.x, z = this.z;
      for (let k = 0; k < n; k++) this.G.bullets.spawn({ owner: 'boss', kind: k % 2 ? 'shard' : 'orb', x, z, a: a0 + (k * TAU) / n, speed: 5.6 * this.spd, size: 1.05, color: 0xff2b3d, life: 7,
        fn: (b) => { for (const T of [0.7, 1.4, 2.1]) if (!b['_r' + T] && b.age >= T) { b['_r' + T] = 1; b.vx = -b.vx; b.vz = -b.vz; } } });
      this.sfx('glitch', { vol: 0.5 }); yield this.t(1.25);
    }
    yield 0.6;
  }
  *atk_scriptError() {
    this.cast('madness'); this.glide(0, -6.4, 0.8); this.G.ui.warn(`${this.ew} 대본이 읽히지 않는다`, 1500); yield 0.8;
    while (true) for (const n of shuffle(['glitchFan', 'reverseMeteor', 'inverseRain', 'rewind', 'analysisSurge'])) { yield* this['atk_' + n](); yield 0.3; }
  }
}

// ═════════════════════════ 무대 관리자 ═════════════════════════
const MPAL = { a: 0xffffff, b: 0xdddddd, c: 0xffffff, glow: 0xffffff, gold: 0xffffff };
const MMUL = 1.4;
const mttk = (frac, time) => Math.round((frac * time * 85) / (MMUL * HP_K));
const MS = (kind, tag, name, form, time, attacks, frac, extra = {}) => ({ kind, tag, name, form, time, attacks, hp: mttk(frac, time), idle: kind === 'nonspell' ? 0.7 : 0.6, ultMode: kind === 'last' ? 'resist' : 'normal', ...extra });

export const MANAGER = {
  id: 'manager', name: '무대 관리자', en: 'STAGE MANAGER', epithet: '막이 오르고 내리는 것을 지켜보는 자', h: 5.4, hitR: 1.5, barkKey: 'manager', pal: MPAL, decoyColor: 0xffffff, decoyBullet: 0xffffff,
  hpMul: MMUL, theme: 'mono', music: 'manager',
  forms: {
    warp: { label: '날실', sub: '세워지는 줄', tint: [1, 1, 1] },
    weft: { label: '씨실', sub: '오가는 북', tint: [1, 1, 1] },
    knot: { label: '매듭', sub: '조여드는 올', tint: [1, 1, 1] },
    cut: { label: '가위', sub: '끊어지는 실', tint: [1, 1, 1] },
    fate: { label: '운명', sub: '짜이는 천', tint: [1, 1, 1] },
    chaos: { label: '풀린 올', sub: '모든 대본이 한꺼번에', tint: [1.1, 1.1, 1.1] },
  },
  steps: [
    MS('nonspell', null, '날실 세우기', 'warp', 34, ['warpThreads'], 0.38),
    MS('spell', '북', '씨실의 질주', 'weft', 42, ['weftShuttle'], 0.42),
    MS('spell', '바늘', '꿰뚫는 바늘', 'weft', 44, ['needlePierce'], 0.42),
    MS('nonspell', null, '매듭짓기', 'knot', 36, ['knotTie'], 0.4),
    MS('spell', '방추', '도는 방추', 'warp', 46, ['spindleSpin'], 0.43),
    MS('spell', '가위', '실 끊기', 'cut', 46, ['scissors'], 0.43),
    MS('spell', '자수', '펼쳐지는 자수', 'fate', 48, ['tapestry'], 0.43),
    MS('nonspell', null, '북 비우기', 'weft', 36, ['heddleSweep'], 0.4),
    MS('spell', '거미줄', '방사형 거미줄', 'warp', 50, ['spiderWeb'], 0.44),
    MS('spell', '엉킴', '풀리지 않는 엉킴', 'knot', 50, ['tangleStorm'], 0.44),
    MS('spell', '바느질', '달리는 바느질', 'cut', 50, ['stitchRun'], 0.44),
    MS('nonspell', null, '풀어내기', 'knot', 38, ['unravel'], 0.4),
    MS('spell', '북 난사', '북 탄막', 'weft', 52, ['shuttleBarrage'], 0.45),
    MS('spell', '바늘비', '쏟아지는 바늘', 'cut', 54, ['needleRain'], 0.45),
    MS('spell', '직물', '일렁이는 천', 'fate', 56, ['clothWaves'], 0.46),
    MS('spell', '고치', '고치 속의 별', 'knot', 56, ['cocoon'], 0.46),
    MS('last', '운명', '운명의 한 올', 'fate', 90, ['fateLine'], 0.5, { pre: null }),
    // 쓰러진 척하다 이름을 밝히고, 99초 동안 모든 패턴을 0.1초마다 난사한다 (무적, 버티기)
    { kind: 'last', tag: '풀린 올', name: '모든 대본의 난사', form: 'chaos', time: 99, attacks: ['chaos'], hp: 1, idle: 0, ultMode: 'immune', endure: true, fake: 'manager' },
  ],
};

export class Manager extends Boss {
  constructor(scene, T, tex, aspect, G, def = MANAGER) { super(scene, T, tex, aspect, G, def); }
  get Hh() { return Math.max(0, this.D.lv - 3); }

  // ───── 도구 ─────
  line(x0, z0, x1, z1, warn = 0.9, dur = 0.22, w = 0.5) { const a = Math.atan2(z1 - z0, x1 - x0); return this.G.beams.spawn({ x: x0, z: z0, a, w, len: Math.hypot(x1 - x0, z1 - z0), warn, dur, color: 0xffffff }); }
  b(x, z, a, sp, o = {}) { return this.G.bullets.spawn({ owner: 'boss', kind: o.kind || 'shard', x, z, a, speed: sp * this.spd, size: o.size ?? 1.05, color: 0xffffff, life: o.life ?? 7, speeds: o.speeds, wob: o.wob, wobPh: o.ph ?? 0, hold: o.hold, reaim: o.reaim, delay: o.delay, fn: o.fn, accel: o.accel, maxS: o.maxS, turn: o.turn, orbit: o.orbit, arm: o.arm, hr: o.hr }); }
  ring(n, o = {}) { const a0 = o.a0 ?? rnd(0, TAU); for (let i = 0; i < n; i++) this.b(o.x ?? this.x, o.z ?? this.z, a0 + (i * TAU) / n, o.speed ?? 5, o); }

  // ═════════ 1. 날실 세우기: 위에서 내려오는 줄들이 좌우로 옮겨 서며 탄을 흘린다 ═════════
  *atk_warpThreads() {
    this.cast('beam_charge'); this.glide(0, -7, 0.6); yield 0.5;
    for (let pass = 0; pass < 4; pass++) {
      const dir = pass % 2 ? -1 : 1, xs = Array.from({ length: 9 }, (_, i) => dir * (-9 + i * 2.25));
      xs.forEach((x, i) => { this.line(x, -11, x + dir * 1.5, 11, 0.8, 0.2, 0.55); this.b(x, -11, Math.PI / 2, 4.6, { kind: 'orb', speeds: [[0, 1], [0.8, 0.15], [1.4, 0.15], [1.6, 2.2]], delay: i * 0.05 }); });
      this.sfx('twang'); yield 1.5;
    }
  }
  // ═════════ 2. 씨실의 질주: 북(큰 탄)이 좌우를 가로지르며 뒤에 탄이 매달린다 ═════════
  *atk_weftShuttle() {
    this.cast('fan'); this.glide(0, -7.5, 0.6); yield 0.5;
    for (let r = 0; r < 8; r++) {
      const z = rnd(-6, 7), side = r % 2 ? -1 : 1;
      this.line(-side * 13, z, side * 13, z, 0.7, 0.12, 0.5);
      this.sfx('telegraph'); yield 0.7;
      this.b(-side * 13, z, side < 0 ? Math.PI : 0, 18, { kind: 'orb', size: 2.0, hr: 0.5, life: 3, fn: (b) => { b._t = (b._t || 0) - 0.016; if (b._t <= 0) { b._t = 0.06; this.b(b.x, b.z, Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), 0.5, { kind: 'shard', speeds: [[0, 0.1], [0.8, 0.1], [1.0, 3.2]], life: 4 }); } } });
      this.sfx('fan', { pitch: 1.5 }); yield this.t(0.9);
    }
  }
  // ═════════ 3. 꿰뚫는 바늘: 보스에서 시작하는 바늘줄이 순서대로 플레이어를 겨냥 ═════════
  *atk_needlePierce() {
    const G = this.G, P = G.player;
    this.cast('beam_charge'); this.glide(0, -7, 0.6); yield 0.5;
    for (let c = 0; c < 7; c++) {
      this.glide(rnd(-6, 6), rnd(-8, -5), 0.4); yield 0.4;
      const base = this.aim() + rnd(-0.3, 0.3);
      for (let k = -2; k <= 2; k++) { const a = base + k * 0.22; this.G.beams.spawn({ x: this.x, z: this.z, a, w: 0.5, len: 28, warn: 0.7 + Math.abs(k) * 0.08, dur: 0.15, color: 0xffffff }); }
      this.sfx('beam_charge', { pitch: 1.4 }); yield 0.85;
      for (let k = -2; k <= 2; k++) this.fan(this.n(2, 1), 0.1, base + k * 0.22, { kind: 'blade', speed: 16, size: 1.4, color: 0xffffff });
      this.sfx('fan', { pitch: 1.6 }); yield this.t(0.5);
    }
    void P;
  }
  // ═════════ 4. 매듭짓기: 고리가 중심으로 조여들다 매듭에서 터진다 ═════════
  *atk_knotTie() {
    const G = this.G;
    this.cast('cast'); this.glide(0, -4.5, 0.8); yield 0.6;
    for (let c = 0; c < 5; c++) {
      const cx = clamp(G.player.x + rnd(-3, 3), -7, 7), cz = clamp(G.player.z + rnd(-3, 2), -5, 7), n = this.n(20, 12), a0 = rnd(0, TAU);
      for (let k = 0; k < n; k++) this.b(0, 0, 0, 0, { kind: 'orb', size: 1.0, life: 3.4, arm: 0.8, orbit: { cx, cz, r: 6.5, ang: a0 + (k * TAU) / n, w: 1.1 * (k % 2 ? 1 : -1), dr: -3.2 } });
      this.sfx('veil'); yield 2.1;
      this.zone(cx, cz, 1.6, { warn: 0.1, dur: 0.2, color: 0xffffff, onBoom: (zz) => this.ring(this.n(16, 10), { x: zz.x, z: zz.z, speed: 6, kind: 'shard', speeds: [[0, 1.5], [0.5, 0.3], [0.9, 1.8]] }) });
      yield 1.5;
    }
  }
  // ═════════ 5. 도는 방추: 세 개의 팔이 번갈아 방향을 바꾸며 도는 나선 ═════════
  *atk_spindleSpin() {
    this.cast('madness'); this.glide(0, -5.5, 0.8); yield 0.6;
    const dur = 12; let t = 0, acc = 0, ang = 0, dir = 1;
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt; ang += dt * 1.8 * dir; if (Math.floor(t / 3) !== Math.floor((t - dt) / 3)) { dir *= -1; this.sfx('teleport'); }
      while (acc >= this.t(0.06)) { acc -= this.t(0.06); for (let k = 0; k < 4; k++) this.b(this.x, this.z, ang + (k * TAU) / 4, 5.2, { kind: 'shard', wob: [1.2 * dir, 2] }); }
    }
    yield 0.6;
  }
  // ═════════ 6. 실 끊기(가위): X자 가위날이 플레이어를 끼고 닫힌다 ═════════
  *atk_scissors() {
    const G = this.G, P = G.player;
    this.cast('beam_charge'); this.glide(0, -7, 0.6); yield 0.5;
    for (let c = 0; c < 6; c++) {
      const cx = P.x, cz = P.z, a = rnd(0, Math.PI);
      for (const s of [-1, 1]) this.line(cx - Math.cos(a + s * 0.5) * 14, cz - Math.sin(a + s * 0.5) * 14, cx + Math.cos(a + s * 0.5) * 14, cz + Math.sin(a + s * 0.5) * 14, 1.1, 0.2, 0.9);
      this.sfx('beam_charge'); yield 1.2;
      this.zone(cx, cz, 1.4, { warn: 0.1, dur: 0.2, color: 0xffffff, onBoom: (zz) => this.ring(this.n(12, 8), { x: zz.x, z: zz.z, speed: 7, kind: 'blade', size: 1.3 }) });
      yield this.t(1.2);
    }
  }
  // ═════════ 7. 자수: 정지한 탄으로 무늬를 수놓고, 왼쪽부터 차례로 풀려난다 ═════════
  *atk_tapestry() {
    this.cast('cast'); this.glide(0, -8, 0.6); yield 0.5;
    for (let c = 0; c < 4; c++) {
      const rows = 5, cols = 14, gz = rnd(-5, 2);
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { if ((r + k + c) % 3 === 0) continue; const x = -10 + k * (20 / (cols - 1)), z = gz + r * 2.0; this.b(x, z, Math.PI / 2, 4.6, { kind: 'pixel', hold: 0.8 + k * 0.1, size: 1.0, life: 9, arm: 0.9 }); }
      this.sfx('veil'); yield 3.2;
    }
  }
  // ═════════ 8. 북 비우기: 비스듬한 바퀴살 틈이 쓸고 지나가는 줄 ═════════
  *atk_heddleSweep() {
    this.cast('fan'); this.glide(0, -7.5, 0.6); yield 0.5;
    for (let w = 0; w < 10; w++) {
      const g0 = (w % 2 ? 1 : -1) * (3 + (w % 5)), tilt = (w % 2 ? -1 : 1) * 0.5;
      for (let x = -10; x <= 10; x += 1.5) { if (Math.abs(x - (g0 + (x * tilt) * 0)) < 1.9) continue; this.b(x, -11, Math.PI / 2 + tilt * 0.35, 5, { kind: 'pixel' }); }
      this.sfx('orb'); yield this.t(0.8);
    }
  }
  // ═════════ 9. 방사형 거미줄: 12갈래 빔이 돌고, 사이를 고리가 지난다 ═════════
  *atk_spiderWeb() {
    this.cast('moon_throw'); this.glide(0, -4.5, 0.8); yield 0.6;
    for (let c = 0; c < 4; c++) {
      const a0 = rnd(0, TAU), n = 12;
      for (let k = 0; k < n; k++) this.line(this.x, this.z, this.x + Math.cos(a0 + (k * TAU) / n) * 18, this.z + Math.sin(a0 + (k * TAU) / n) * 18, 1.0, 0.22, 0.5);
      this.sfx('beam_charge'); yield 1.1;
      for (let r = 0; r < 5; r++) { this.ring(this.n(24, 14), { a0: a0 + TAU / 24, speed: 3.6 + r * 0.5, kind: 'orb', size: 0.95 }); this.sfx('orb'); yield 0.3; }
      yield 1.3;
    }
  }
  // ═════════ 10. 풀리지 않는 엉킴 ═════════
  *atk_tangleStorm() {
    this.cast('madness'); this.glide(0, -5.5, 0.8); yield 0.6;
    const dur = 12; let t = 0, acc = 0, ang = rnd(0, TAU);
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt; ang += dt * 1.5;
      while (acc >= this.t(0.07)) { acc -= this.t(0.07); for (let arm = 0; arm < 4; arm++) { const s = arm % 2 ? 1 : -1; this.b(this.x, this.z, ang + (arm * TAU) / 4, 4.8, { kind: 'shard', wob: [2.0 * s, 2.4], speeds: [[0, 1.3], [1.2, 0.5], [2.4, 1.6]] }); } }
    }
    yield 0.6;
  }
  // ═════════ 11. 달리는 바느질: 박음질 선이 화면을 가로지르며 점선 구역이 박힌다 ═════════
  *atk_stitchRun() {
    const G = this.G;
    this.cast('cast'); this.glide(0, -7, 0.6); yield 0.5;
    for (let r = 0; r < 5; r++) {
      const z0 = rnd(-7, 6), dir = r % 2 ? -1 : 1, sl = rnd(-0.25, 0.25);
      for (let k = 0; k < 14; k++) { const x = dir * (-10 + k * 1.5), z = z0 + x * sl; G.zones.spawn({ x, z, r: 1.5, warn: 0.7 + k * 0.06, dur: 0.2, color: 0xffffff, onBoom: (zz) => this.ring(3, { x: zz.x, z: zz.z, speed: 4, kind: 'shard' }) }); }
      this.sfx('telegraph'); yield 2.2;
    }
  }
  // ═════════ 12. 풀어내기: 소용돌이로 퍼진 탄이 되감겨 돌아온다 ═════════
  *atk_unravel() {
    this.cast('moon_throw'); this.glide(0, -5.5, 0.8); yield 0.6;
    for (let c = 0; c < 6; c++) {
      const n = this.n(18, 10), a0 = rnd(0, TAU), x = this.x, z = this.z, dir = c % 2 ? 1 : -1;
      for (let k = 0; k < n; k++) this.b(x, z, a0 + (k * TAU) / n, 6, { kind: k % 2 ? 'shard' : 'orb', wob: [1.4 * dir, 2], fn: (b) => { if (!b._f && b.age >= 1.3) { b._f = 1; b.vx = -b.vx; b.vz = -b.vz; } } });
      this.sfx('twang'); yield this.t(1.1);
    }
  }
  // ═════════ 13. 북 탄막: 양쪽 가장자리에서 예측 사격으로 빠른 큰 탄 ═════════
  *atk_shuttleBarrage() {
    this.cast('fan'); this.glide(0, -7, 0.6); yield 0.5;
    for (let c = 0; c < 22; c++) {
      const side = c % 2 ? -1 : 1, z = rnd(-8, 8); const a = Math.atan2(this.G.player.z + this.G.player.vz * 0.5 - z, this.G.player.x + this.G.player.vx * 0.5 - side * 12.5);
      this.b(side * 12.5, z, a, 13, { kind: 'orb', size: 1.6, hr: 0.4, life: 3 }); this.b(side * 12.5, z, a + 0.18, 13, { kind: 'shard' }); this.b(side * 12.5, z, a - 0.18, 13, { kind: 'shard' });
      this.sfx('fan', { pitch: 1.5, vol: 0.5 }); yield this.t(0.32);
    }
    yield 0.8;
  }
  // ═════════ 14. 쏟아지는 바늘: 위에서 바늘이 내리꽂힌다 (가는 예고선) ═════════
  *atk_needleRain() {
    this.cast('beam_charge'); this.glide(0, -8, 0.6); yield 0.5;
    for (let w = 0; w < 12; w++) {
      const xs = Array.from({ length: 5 }, () => rnd(-9, 9));
      for (const x of xs) { this.line(x, -11, x, 11, 0.7, 0.1, 0.25); this.b(x, -12, Math.PI / 2, 15, { kind: 'blade', size: 1.5, delay: 0.7, life: 3 }); }
      this.sfx('telegraph'); yield this.t(0.75);
    }
    yield 0.5;
  }
  // ═════════ 15. 일렁이는 천: 같은 파형으로 출렁이는 탄의 장막 ═════════
  *atk_clothWaves() {
    this.cast('veil'); this.glide(0, -8, 0.6); yield 0.5;
    for (let w = 0; w < 7; w++) {
      const gap = rnd(-6, 6);
      for (let x = -10; x <= 10; x += 1.2) if (Math.abs(x - gap) > 1.9) this.b(x, -11, Math.PI / 2, 4.2, { kind: 'pixel', wob: [1.6, 2.2], ph: x * 0.35, life: 9 });
      this.sfx('orb'); yield this.t(1.2);
    }
    yield 1;
  }
  // ═════════ 16. 고치: 보스를 감싼 껍질이 터져 퍼진다 ═════════
  *atk_cocoon() {
    const G = this.G;
    this.cast('cast'); this.glide(0, -4.5, 0.8); yield 0.5;
    for (let c = 0; c < 4; c++) {
      const n = this.n(28, 16), x = this.x, z = this.z;
      for (let k = 0; k < n; k++) this.b(0, 0, 0, 0, { kind: 'orb', life: 3.2, arm: 0.5, orbit: { cx: x, cz: z, r: 1.8 + (k % 3) * 0.5, ang: (k * TAU) / n, w: 2.0 * (k % 2 ? 1 : -1), dr: 0 }, fn: (b) => { if (b.age > 2.0 && b.orbit) { const a = b.orbit.ang; const rr = b.orbit.r; b.orbit = null; b.vx = Math.cos(a) * 6; b.vz = Math.sin(a) * 6; b.x = x + Math.cos(a) * rr; b.z = z + Math.sin(a) * rr; } } });
      this.sfx('veil'); yield 2.4;
      for (let k = 0; k < 6; k++) this.line(this.x, this.z, G.player.x + rnd(-4, 4), G.player.z + rnd(-4, 4), 0.8, 0.2, 0.5);
      yield 1.6;
    }
  }
  // ═════════ 17. 운명의 한 올: 보스와 플레이어를 잇는 줄이 돌며 모든 것이 겹친다 ═════════
  *atk_fateLine() {
    const G = this.G, P = G.player;
    this.cast('moon_throw'); this.glide(0, -6.5, 1.0); yield 1.0;
    let t = 0, acc = 0, ang = 0;
    const pool = ['warpThreads', 'needlePierce', 'spiderWeb', 'shuttleBarrage', 'needleRain'];
    while (true) {
      const dur = 4; let tt = 0;
      this.line(this.x, this.z, P.x, P.z, 0.9, 0.3, 0.7); this.sfx('beam_charge'); yield 1.0;
      while (tt < dur) { const dt = yield 0; tt += dt; t += dt; acc += dt; ang += dt * 2.2; while (acc >= this.t(0.1)) { acc -= this.t(0.1); this.b(this.x, this.z, ang, 5.4, { kind: 'shard', wob: [1.4, 2.2] }); this.b(this.x, this.z, ang + Math.PI, 5.4, { kind: 'shard', wob: [-1.4, 2.2] }); } }
      yield* this['atk_' + pool[(Math.random() * pool.length) | 0]](); yield 0.3;
    }
  }

  // ═════════ 99초: 모든 대본의 난사 (0.1초마다 다른 패턴 조각) ═════════
  *atk_chaos() {
    const G = this.G, P = G.player;
    this.cast('moon_throw'); this.glide(0, -9, 1.2); this.scaleT = 0.8; G.ui.warn('무대 관리자는 뒤로 물러섰다 — 모든 대본이 한꺼번에 펼쳐진다', 2200); yield 1.2;
    const minis = [
      () => this.fan(this.n(5, 3), 1.4, this.aim(), { kind: 'star', speed: 7, size: 1.1, color: 0xffffff }), // 옵서의 별
      () => this.b(this.x, this.z, this.aim(), 12, { kind: 'orb', size: 1.2, speeds: [[0, 1], [0.4, 0.05], [0.9, 0.05], [1.1, 2.0]] }), // 아스트라의 버퍼링
      () => this.fan(3, 0.2, this.lead(0.5), { kind: 'blade', speed: 15, size: 1.4, color: 0xffffff }), // 트라몽의 검섬
      () => { const x = rnd(-10, 10); this.b(x, -11, Math.PI / 2, 5, { kind: 'page', size: 1.15 }); this.b(x + 1.2, -11, Math.PI / 2, 5, { kind: 'page', size: 1.15 }); }, // 인덱스의 낱장
      () => this.zone(P.x + rnd(-2, 2), P.z + rnd(-2, 2), 1.7, { warn: 0.8, dur: 0.2, color: 0xffffff, onBoom: (zz) => this.ring(6, { x: zz.x, z: zz.z, speed: 4.6, kind: 'glyph' }) }), // 벨리스의 표식
      () => this.ring(this.n(10, 6), { speed: 5, kind: 'crescent', size: 1.3, speeds: [[0, 1.4], [0.6, 0.3], [1.1, 1.6]] }), // 루나린스 프로토타입 I: 초승달
      () => this.b(this.x, this.z, this.aim() + rnd(-0.8, 0.8), 3.8, { kind: 'orb', size: 1.5, hr: 0.4, accel: 0, life: 6, fn: (b) => { if (b.age < 2.4) { const sp = Math.hypot(b.vx, b.vz), want = Math.atan2(P.z - b.z, P.x - b.x), cur = Math.atan2(b.vz, b.vx); let d = want - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; const na = cur + Math.max(-1.1 * 0.016, Math.min(1.1 * 0.016, d)); b.vx = Math.cos(na) * sp; b.vz = Math.sin(na) * sp; } } }), // 프로토타입 II: 그림자 구슬(유도)
      () => { const a = rnd(0, TAU), R = 12.5, x = Math.cos(a) * R, z = Math.sin(a) * R * 0.85 - 1; this.b(x, z, Math.atan2(-1 - z, -x) + rnd(-0.2, 0.2), 6.4, { kind: 'crescent', size: 1.4 }); }, // 프로토타입 III: 수렴하는 초승달
      () => this.line(rnd(-10, 10), -11, rnd(-10, 10), 11, 0.7, 0.14, 0.4), // 날실
      () => this.b(this.x, this.z, rnd(0, TAU), 6, { kind: 'shard', wob: [rnd(-2.4, 2.4), 3] }), // 굽이치는 줄
      () => this.b(rnd(-10, 10), 11.5, -Math.PI / 2, 6, { kind: 'shard', speeds: [[0, 1], [1, 0.3], [1.6, 2]] }), // 뒤집힌 비
      () => { const side = Math.random() < 0.5 ? -1 : 1; this.b(side * 12.5, rnd(-8, 8), side < 0 ? 0 : Math.PI, 11, { kind: 'orb', size: 1.8, hr: 0.45, life: 3 }); }, // 북
      () => this.fan(2, 0.3, this.aim(), { kind: 'petal', speed: 9, size: 1.1, color: 0xffffff, turn: rnd(-1.6, 1.6) }), // 꽃잎 채찍
      () => { const x = rnd(-9, 9), z = rnd(-7, 8); this.zone(x, z, 2.2, { warn: 1.0, dur: 0.3, color: 0xffffff, onBoom: (zz) => { G.flyers.launch({ x0: zz.x, z0: zz.z, y0: 0.2, x1: zz.x * 0.3, z1: zz.z - 8, dur: 0.9, size: 2.6, color: 0xffffff, arc: 12 }); } }); }, // 거꾸로 떨어지는 메테오
    ];
    let acc = 0, n = 0;
    while (true) {
      const dt = yield 0; acc += dt;
      while (acc >= 0.1) { acc -= 0.1; n++; minis[(Math.random() * minis.length) | 0](); if (n % 6 === 0) minis[(Math.random() * minis.length) | 0](); }
    }
  }
}
