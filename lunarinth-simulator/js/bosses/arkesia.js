// EXTRA — 아르케시아: 실 끝에서 웃는 지배자, 은빛 왕관의 인형술사. 유일하게 달빛 탄막과 관련이 없다.
// 마리오네트가 주제다: 탄은 줄에 매달린 것처럼 멈췄다 튀어나가고(변속), 흔들리고 휘며(왜곡), 되돌아온다.
// EXTRA(10단계): 라스트 스킬이 기체에 따라 2종류, 얼티메이트 없음. HELL(15단계): 같은 극장의 광란판.
import { Boss, TAU, rnd, clamp, shuffle, HP_K } from '../boss.js';

const PAL = { a: 0xff4f6e, b: 0xe8e8f6, c: 0xffffff, glow: 0xff3b6b, gold: 0xffc4d0 };
const MUL = 1.15;
const ttk = (frac, time) => Math.round((frac * time * 85) / (MUL * HP_K));
const S = (kind, tag, name, form, time, attacks, frac, extra = {}) => ({ kind, tag, name, form, time, attacks, hp: ttk(frac, time), idle: kind === 'nonspell' ? 0.8 : 0.7, ultMode: kind === 'last' ? 'resist' : 'normal', ...extra });

const FORMS = {
  act1: { label: '제1막', sub: '실 늘이기', tint: [1, 1, 1] },
  act2: { label: '제2막', sub: '꼭두각시의 윤무', tint: [1.0, 0.98, 1.06] },
  act3: { label: '제3막', sub: '가면무도회', tint: [1.04, 1.0, 1.04] },
  act4: { label: '제4막', sub: '무대 장치', tint: [1.06, 1.02, 1.0] },
  finale: { label: '대단원', sub: '끝나지 않는 관극', tint: [1.1, 1.04, 1.08] },
};

export const ARKESIA = {
  id: 'arkesia', name: '아르케시아', en: 'ARKESIA', epithet: '실 끝에서 웃는 지배자 — 은빛 왕관의 인형술사',
  h: 5.6, hitR: 1.5, barkKey: 'arkesia', pal: PAL, decoyColor: 0xffb0c0, decoyBullet: 0xff4f6e, hpMul: MUL,
  theme: 'theater', music: 'arkesia', forms: FORMS,
  allSteps: [
    S('nonspell', null, '실 늘이기', 'act1', 38, ['puppetStrings', 'wobbleStream', 'threadSweep'], 0.4),
    S('spell', '윤무', '꼭두각시의 윤무', 'act2', 50, ['spPuppetDance'], 0.45),
    S('nonspell', null, '가면무도회', 'act3', 40, ['maskBloom', 'waltz3', 'rubberBand'], 0.4),
    S('spell', '그물', '붉은 실의 그물', 'act2', 54, ['spStringNet'], 0.45),
    S('nonspell', null, '줄 끊어진 인형', 'act3', 40, ['tangle', 'shatter', 'spotlight'], 0.4),
    S('spell', '왕관', '은빛 왕관', 'act4', 56, ['spCrown'], 0.45),
    S('spell', '해체', '무대 장치 붕괴', 'act4', 58, ['spCollapse'], 0.45),
    S('spell', '합창', '마리오네트 합창', 'act2', 60, ['spChorus'], 0.45),
    S('spell', '이중', '이중 인형극', 'act3', 62, ['spDouble'], 0.45),
    // 라스트 스킬: 플레이어 기체에 따라 2종류
    S('last', '대단원', '끝나지 않는 관극', 'finale', 90, ['spFinaleClaire'], 0.5, {
      pre: 'lastClaire',
      variant: {
        claire: { tag: '대단원', name: '끝나지 않는 관극', attacks: ['spFinaleClaire'], pre: 'lastClaire' },
        astra: { tag: '회로', name: '회로 위의 꼭두각시', attacks: ['spFinaleAstra'], pre: 'lastAstra' },
      },
    }),
  ],
  steps: [],
};

// HELL: 15단계. 같은 극장이지만 패턴이 전부 광란판이다 (hell 플래그로 속도/밀도/변속 폭이 커진다).
const HFORMS = {
  ...FORMS,
  h1: { label: '광란 제1막', sub: '끊어지지 않는 줄', tint: [1.08, 0.96, 1.02], theme: 'hell' },
  h2: { label: '광란 제2막', sub: '미쳐 도는 윤무', tint: [1.1, 0.94, 1.04], theme: 'hell' },
  h3: { label: '광란 제3막', sub: '찢어진 가면', tint: [1.12, 0.94, 1.0], theme: 'hell' },
  h4: { label: '광란 제4막', sub: '무너지는 객석', tint: [1.14, 0.92, 1.0], theme: 'hell' },
  hfin: { label: '광란의 대단원', sub: '막이 내리지 않는다', tint: [1.18, 0.9, 1.02], theme: 'hell' },
};
export const ARKESIA_HELL = {
  ...ARKESIA, music: 'arkesiaHell', theme: 'hell', hpMul: MUL, forms: HFORMS,
  allSteps: [
    S('nonspell', null, '끊어지지 않는 줄', 'h1', 36, ['puppetStrings', 'wobbleStream', 'threadSweep', 'rubberBand'], 0.38),
    S('spell', '윤무', '미쳐 도는 윤무', 'h2', 48, ['spPuppetDance'], 0.42),
    S('spell', '가면', '찢어진 가면무도회', 'h3', 50, ['maskBloom', 'waltz3', 'shatter'], 0.42),
    S('spell', '그물', '피로 물든 실의 그물', 'h1', 52, ['spStringNet'], 0.42, { pre: 'hellAct2' }),
    S('spell', '엉킴', '엉킨 인형', 'h3', 50, ['tangle', 'wobbleStream', 'spotlight'], 0.42),
    S('spell', '조명', '살인 스포트라이트', 'h4', 52, ['spotlight', 'curtainCall'], 0.42),
    S('spell', '왕관', '조여드는 은빛 왕관', 'h4', 54, ['spCrown'], 0.43),
    S('spell', '해체', '무대 장치 대붕괴', 'h4', 56, ['spCollapse'], 0.43, { pre: 'hellAct3' }),
    S('spell', '합창', '실에 쥐인 합창', 'h2', 58, ['spChorus'], 0.43),
    S('spell', '절단', '실 끊기', 'h3', 54, ['cutStrings', 'rubberBand'], 0.43),
    S('spell', '파편', '산산이 부서진 인형', 'h3', 56, ['shatter', 'tangle', 'waltz3'], 0.44),
    S('spell', '이중', '셋이 되는 인형극', 'h2', 60, ['spDouble'], 0.44, { pre: 'hellAct4' }),
    S('spell', '막', '내려오는 커튼콜', 'h4', 60, ['curtainCall', 'waltz3', 'spotlight'], 0.45),
    S('spell', '붕괴', '객석의 비명', 'h4', 62, ['spCollapse', 'spChorus'], 0.46),
    S('last', '대단원', '끝나지 않는 관극 · 광란', 'hfin', 100, ['spFinaleClaire'], 0.5, {
      pre: 'hellLastClaire',
      variant: {
        claire: { tag: '대단원', name: '끝나지 않는 관극 · 광란', attacks: ['spFinaleClaire'], pre: 'hellLastClaire' },
        astra: { tag: '회로', name: '회로 위의 꼭두각시 · 광란', attacks: ['spFinaleAstra'], pre: 'hellLastAstra' },
      },
    }),
  ],
  steps: [],
};

export class Arkesia extends Boss {
  constructor(scene, T, tex, aspect, G, def = ARKESIA) { super(scene, T, tex, aspect, G, def); }

  get H() { return this.D.lv >= 4; }
  /** 일반/HELL 수치 선택 */
  m(a, b) { return this.H ? b : a; }

  // ───── 도구 ─────
  thread(x0, z0, x1, z1, warn = 0.9, dur = 0.25, w = 0.55) {
    const a = Math.atan2(z1 - z0, x1 - x0), len = Math.hypot(x1 - x0, z1 - z0);
    return this.G.beams.spawn({ x: x0, z: z0, a, w, len, warn, dur, color: this.pal.a });
  }
  /** 줄에 매달린 탄: 달려나가다 멈추고, 매달려 있다가, 한 번에 튀어나간다. aim=true 면 튀어나갈 때 플레이어를 겨냥한다. */
  puppet(x, z, a, sp, o = {}) {
    const G = this.G, pause = o.pause ?? 1.05, dash = o.dash ?? 2.1;
    return G.bullets.spawn({
      owner: 'boss', x, z, a, speed: sp * this.spd, kind: o.kind || 'shard', size: o.size ?? 1.1, color: o.color ?? this.pal.a, life: o.life ?? 7,
      speeds: [[0, 1], [0.4, 0.05], [pause, 0.05], [pause + 0.2, dash], [pause + 1.6, dash * 0.6]],
      fn: o.aim ? (b) => { if (!b._r && b.age >= pause) { b._r = 1; const s = Math.hypot(b.vx, b.vz), ar = Math.atan2(G.player.z - b.z, G.player.x - b.x); b.vx = Math.cos(ar) * s; b.vz = Math.sin(ar) * s; } } : null,
    });
  }
  /** 되돌아오는 탄: flip 초에 방향이 뒤집힌다 */
  band(x, z, a, sp, flip, o = {}) {
    return this.G.bullets.spawn({ owner: 'boss', x, z, a, speed: sp * this.spd, kind: o.kind || 'orb', size: o.size ?? 1.0, color: o.color ?? this.pal.b, life: o.life ?? 7,
      fn: (b) => { if (!b._f && b.age >= flip) { b._f = 1; b.vx = -b.vx * (o.back ?? 1); b.vz = -b.vz * (o.back ?? 1); } } });
  }
  flare(x, z, n, sp, o = {}) { const a0 = o.a0 ?? rnd(0, TAU); for (let k = 0; k < n; k++) this.G.bullets.spawn({ owner: 'boss', kind: o.kind || 'shard', x, z, a: a0 + (k * TAU) / n, speed: sp * this.spd, size: o.size ?? 1.05, color: o.color ?? this.pal.b, speeds: o.speeds, wob: o.wob, wobPh: o.ph ?? 0, life: o.life ?? 7 }); }

  // ═════════ 제1막 ═════════
  /** 매달린 탄: 부채꼴로 흩어져 멈췄다가 홀수 번째만 플레이어를 향해 튀어나간다 */
  *atk_puppetStrings() {
    this.cast('fan'); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.5;
    const vols = this.m(5, 7);
    for (let v = 0; v < vols; v++) {
      const n = this.n(7, 4), a = this.aim();
      for (let i = 0; i < n; i++) this.puppet(this.x, this.z, a + (i / (n - 1) - 0.5) * 1.8, 7, { aim: i % 2 === 1, pause: 1.0 + (i % 3) * 0.12 });
      this.sfx('twang'); if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.7);
      yield this.t(0.95);
    }
    yield 0.8;
  }
  /** 뱀처럼 굽이치는 탄줄 두 가닥 (위상이 반대) */
  *atk_wobbleStream() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.6, 0.7); yield 0.5;
    const dur = this.m(4.4, 5.4); let t = 0, acc = 0, k = 0;
    const a0 = this.aim();
    this.glide(rnd(-5, 5), -6, dur);
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt;
      while (acc >= this.t(this.m(0.09, 0.07))) {
        acc -= this.t(this.m(0.09, 0.07)); k++;
        const base = a0 + Math.sin(t * 0.9) * 0.5;
        for (const s of [1, -1]) this.G.bullets.spawn({ owner: 'boss', kind: 'orb', x: this.x, z: this.z, a: base, speed: 5.4 * this.spd, size: 0.95, color: s > 0 ? pal.a : pal.b, wob: [2.6 * s, 3.1], wobPh: k * 0.28, life: 6 });
      }
    }
    this.sfx('twang'); yield 0.6;
  }
  /** 천장에서 내려온 실이 쓸고 가며, 쓸린 자리에서 탄이 뒤늦게 튀어나간다 */
  *atk_threadSweep() {
    const G = this.G, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.7); yield 0.5;
    const passes = this.m(3, 4);
    for (let pass = 0; pass < passes; pass++) {
      const dir = pass % 2 ? -1 : 1, cnt = 9;
      for (let k = 0; k < cnt; k++) {
        const x = dir * (-9 + k * 2.25); this.thread(x, -11, x + dir * 1.2, 11, 0.7, 0.18);
        G.bullets.spawn({ owner: 'boss', kind: 'orb', x, z: -11, a: Math.PI / 2, speed: 4.4 * this.spd, size: 0.95, color: pal.b, speeds: [[0, 1], [0.7, 0.12], [1.2, 0.12], [1.4, 2.0]], life: 8 });
        this.sfx('twang', { pan: G.audio.pan(x), vol: 0.45 }); yield this.t(0.2);
      }
      yield 0.9;
    }
  }

  // ═════════ 제2막: 윤무 ═════════
  *atk_spPuppetDance() {
    const G = this.G;
    this.cast('teleport'); this.glide(0, -6.4, 0.8); G.ui.warn('꼭두각시들이 춤추기 시작한다', 1400); yield 0.9;
    for (let c = 0; c < this.m(4, 5); c++) {
      const base = rnd(0, TAU), R = 5.2, np = this.m(4, 5);
      for (let i = 0; i < np; i++) { const a = base + (i * TAU) / np; this.spawnDecoy(clamp(Math.cos(a) * R, -8, 8), clamp(-3 + Math.sin(a) * R * 0.6, -8, 3), 6.4, 0.5 + i * 0.2); }
      for (let k = 0; k < 6; k++) {
        // 3박자로 숨 쉬는 고리: 빠르게 번졌다 느려지고 다시 달려 나간다
        this.flare(this.x, this.z, this.n(12, 7), 4.6, { a0: k * 0.3, kind: 'orb', color: k % 2 ? this.pal.a : this.pal.b, size: 1.0, speeds: [[0, 1.3], [0.6, 0.35], [1.2, 1.5], [1.8, 0.5], [2.6, 1.3]] });
        if (k % 2) this.fan(this.n(5, 3), 1.0, this.aim(), { kind: 'shard', speed: 6.6, size: 1.1, color: this.pal.c, speeds: [[0, 1], [0.5, 0.2], [0.8, 2.0]] });
        this.sfx('orb'); yield this.t(0.85);
      }
      yield 0.8;
    }
  }

  // ═════════ 제3막: 가면무도회 ═════════
  /** 가면(큰 탄)이 느려지다가 멈춰서 열리고, 소용돌이 치며 퍼진다 */
  *atk_maskBloom() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.4, 0.7); yield 0.5;
    for (let c = 0; c < this.m(5, 6); c++) {
      const masks = [], nm = 2 + (this.lv(2) ? 1 : 0) + (this.H ? 1 : 0);
      for (let i = 0; i < nm; i++) masks.push(this.shoot({ a: this.aim() + (i - (nm - 1) / 2) * 0.6, speed: 4.2, kind: 'orb', size: 2.0, hr: 0.55, color: pal.b, life: 2.2, speeds: [[0, 1], [1.2, 0.05]] }));
      this.sfx('orb'); yield 1.45;
      for (const m of masks) if (m && m.active) {
        const n = this.n(12, 7), a0 = rnd(0, TAU), dir = Math.random() < 0.5 ? 1 : -1;
        for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: m.x, z: m.z, a: a0 + (k * TAU) / n, speed: 4.6 * this.spd, size: 1.05, color: k % 2 ? pal.a : pal.gold, wob: [1.8 * dir, 2.4], wobPh: (k % 2) * Math.PI, speeds: [[0, 0.3], [0.5, 0.3], [0.9, 1.7]], life: 7 });
        G.fx.ring(m.x, 0.9, m.z, pal.a, 4, 0.4); G.bullets.kill(m);
      }
      this.sfx('decoy_pop'); yield this.t(0.8);
    }
    yield 0.5;
  }
  /** 3박자: 느린 고리 → 중간 속도 부채 → 빠른 고리. 박자마다 속도가 다르다 */
  *atk_waltz3() {
    this.cast('cast'); this.glide(0, -6.5, 0.7); yield 0.6;
    const bars = this.m(6, 8);
    for (let b = 0; b < bars; b++) {
      const a0 = rnd(0, TAU);
      this.flare(this.x, this.z, this.n(10, 6), 3.3, { a0, kind: 'orb', size: 1.15, color: this.pal.a }); this.sfx('orb', { pitch: 0.8 }); yield this.t(0.46);
      const a = this.aim(); this.fan(this.n(5, 3), 1.2, a, { kind: 'shard', speed: 5.8, size: 1.05, color: this.pal.b }); this.sfx('fan'); yield this.t(0.46);
      this.flare(this.x, this.z, this.n(8, 5), 8.4, { a0: a0 + 0.3, kind: 'shard', size: 1.0, color: this.pal.c }); this.sfx('orb', { pitch: 1.4 });
      if (b % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.6);
      yield this.t(0.7);
    }
    yield 0.4;
  }
  /** 고무줄: 퍼져 나가던 고리가 되돌아와 보스를 지나 반대편으로 */
  *atk_rubberBand() {
    this.cast('moon_throw'); this.glide(0, -5.5, 0.8); yield 0.7;
    for (let c = 0; c < this.m(4, 5); c++) {
      const n = this.n(14, 8), a0 = rnd(0, TAU), x = this.x, z = this.z;
      for (let k = 0; k < n; k++) this.band(x, z, a0 + (k * TAU) / n, 6.2, 0.95, { kind: k % 2 ? 'orb' : 'shard', color: k % 2 ? this.pal.b : this.pal.a, back: 0.85 });
      this.sfx('twang'); yield 0.55;
      const n2 = this.n(10, 6);
      for (let k = 0; k < n2; k++) this.band(x, z, a0 + 0.2 + (k * TAU) / n2, 4.4, 1.5, { kind: 'orb', color: this.pal.c, back: 1.4 });
      yield this.t(1.7);
      if (c % 2) this.glide(rnd(-5, 5), rnd(-7, -4.5), 0.7);
    }
    yield 0.6;
  }
  /** 서로 반대로 도는 두 팔: 줄이 엉키듯 굽는다 */
  *atk_tangle() {
    const pal = this.pal;
    this.cast('madness'); this.glide(0, -5.5, 0.8); yield 0.6;
    const dur = this.m(5, 6.5); let t = 0, acc = 0, k = 0, ang = rnd(0, TAU);
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt; ang += dt * 1.3;
      while (acc >= this.t(0.075)) {
        acc -= this.t(0.075); k++;
        for (let arm = 0; arm < 3; arm++) { const s = arm % 2 ? 1 : -1; this.G.bullets.spawn({ owner: 'boss', kind: 'shard', x: this.x, z: this.z, a: ang + (arm * TAU) / 3, speed: 4.6 * this.spd, size: 1.0, color: s > 0 ? pal.a : pal.gold, wob: [1.7 * s, 2.2], speeds: [[0, 1.3], [1.2, 0.55], [2.4, 1.5]], life: 7 }); }
      }
    }
    this.sfx('twang'); yield 0.7;
  }
  /** 큰 탄이 날아가다 공중에서 산산이 부서진다 */
  *atk_shatter() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.7); yield 0.5;
    for (let c = 0; c < this.m(6, 8); c++) {
      const a = this.aim() + rnd(-0.5, 0.5), kids = this.n(8, 5);
      G.bullets.spawn({ owner: 'boss', kind: 'orb', x: this.x, z: this.z, a, speed: 6.4 * this.spd, size: 2.2, hr: 0.5, color: pal.b, life: 3,
        fn: (b) => { if (!b._s && b.age >= 1.0) { b._s = 1; for (let k = 0; k < kids; k++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: b.x, z: b.z, a: (k * TAU) / kids + b.age, speed: 3.2 * this.spd, size: 1.0, color: pal.a, wob: [1.5 * (k % 2 ? 1 : -1), 2.8], speeds: [[0, 1], [0.6, 0.4], [1.0, 1.9]], life: 6 }); G.fx.ring(b.x, 0.9, b.z, pal.a, 3.5, 0.35); G.bullets.kill(b); } } });
      this.sfx('fan'); yield this.t(0.8);
    }
    yield 0.6;
  }
  /** 스포트라이트: 플레이어를 쫓는 빛의 원이 터지며 멈칫하던 탄이 퍼진다 */
  *atk_spotlight() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    for (let i = 0; i < this.m(8, 12); i++) {
      this.zone(P.x + P.vx * 0.35, P.z + P.vz * 0.35, 1.8, { warn: 0.95, dur: 0.28, color: pal.a, onBoom: (zz) => { this.flare(zz.x, zz.z, this.n(8, 5), 4.4, { kind: 'shard', color: pal.b, speeds: [[0, 0.25], [0.7, 0.25], [1.0, 2.0]] }); } });
      this.sfx('telegraph', { pan: G.audio.pan(P.x) }); yield this.t(this.m(0.5, 0.38));
    }
    yield 1.2;
  }
  /** 막이 좌우에서 닫힌다: 틈이 위아래로 움직이는 탄의 벽 */
  *atk_curtainCall() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -7, 0.8); G.ui.warn('막이 닫힌다', 1300); yield 0.8;
    for (let w = 0; w < this.m(5, 7); w++) {
      const side = w % 2 ? -1 : 1, gz = rnd(-4, 6), gap = this.m(2.5, 2.2);
      for (let z = -10; z <= 11; z += 1.45) {
        if (Math.abs(z - gz) < gap) continue;
        G.bullets.spawn({ owner: 'boss', kind: 'orb', x: -side * 12.5, z, a: side < 0 ? 0 : Math.PI, speed: 3.6 * this.spd, size: 1.1, color: pal.a, speeds: [[0, 1], [1.5, 0.6], [2.2, 1.9]], life: 9 });
      }
      this.sfx('twang'); yield this.t(1.5);
    }
    yield 0.8;
  }

  // ═════════ 그물 · 왕관 · 붕괴 · 합창 · 이중 ═════════
  *atk_spStringNet() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -6.6, 0.8); G.ui.warn('붉은 실이 객석을 가른다', 1400); yield 0.9;
    for (let c = 0; c < this.m(4, 5); c++) {
      const gx = clamp(P.x + rnd(-2, 2), -6, 6), gz = clamp(P.z + rnd(-2, 2), -4, 6);
      for (let x = -9; x <= 9; x += 3) if (Math.abs(x - gx) > 1.5) this.thread(x, -11, x + rnd(-1, 1), 11, 1.1, 0.25);
      for (let z = -8; z <= 9; z += 3.2) if (Math.abs(z - gz) > 1.5) this.thread(-12, z, 12, z + rnd(-1, 1), 1.3, 0.25);
      this.sfx('twang'); yield 1.4;
      this.fan(this.n(9, 5), 1.6, this.aim(), { kind: 'shard', speed: 6.2, size: 1.1, color: pal.a, speeds: [[0, 1], [0.6, 0.2], [0.9, 1.8]] });
      this.flare(this.x, this.z, this.n(14, 8), 4.2, { kind: 'orb', color: pal.b, wob: [1.4, 2.6] });
      yield 1.2;
    }
  }
  *atk_spCrown() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -4.5, 0.8); G.ui.warn('은빛 왕관이 머리 위로 내려온다', 1400); yield 0.9;
    for (let c = 0; c < this.m(3, 4); c++) {
      const R0 = 7.2, n = this.n(22, 14), w = c % 2 ? -0.6 : 0.6, a0 = rnd(0, TAU), gap = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const ang = a0 + (i * TAU) / n, d = Math.abs((((ang - gap) % TAU) + TAU * 1.5) % TAU - Math.PI);
        if (d > Math.PI - 0.7) continue;
        G.bullets.spawn({ owner: 'boss', kind: i % 2 ? 'shard' : 'orb', size: 1.1, color: i % 2 ? pal.b : pal.a, life: 7, arm: 0.6, x: 0, z: 0, orbit: { cx: this.x, cz: this.z, r: R0, ang, w, dr: -0.55 } });
      }
      this.sfx('orb');
      for (let k = 0; k < 5; k++) { this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'shard', speed: 6.4, size: 1.1, color: pal.c, speeds: [[0, 1], [0.5, 0.3], [0.8, 1.8]] }); yield this.t(1.0); }
      yield 1.2;
    }
  }
  *atk_spCollapse() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.8, 0.8); G.ui.warn('천장의 장치가 떨어진다', 1400); yield 0.9;
    for (let c = 0; c < this.m(4, 5); c++) {
      const n = 10 + (this.lv(2) ? 3 : 0) + (this.H ? 4 : 0), a0 = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const ang = a0 + i * 2.4, r = 2 + (i % 5) * 1.8;
        this.zone(clamp(P.x * 0.4 + Math.cos(ang) * r * 1.4, -9, 9), clamp(P.z * 0.4 + Math.sin(ang) * r, -8, 9), 2.1, { warn: 1.15, dur: 0.3, color: pal.a, onBoom: (zz) => { this.flare(zz.x, zz.z, this.n(5, 3), 4.4, { kind: 'shard', color: pal.b, speeds: [[0, 0.4], [0.5, 0.4], [0.9, 1.9]] }); } });
        this.sfx('telegraph'); yield this.t(0.24);
      }
      yield 1.8;
    }
    if (this.H) yield* this.atk_curtainCall();
  }
  *atk_spChorus() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('madness'); this.glide(0, -6.6, 0.8); G.ui.warn('실이 몸을 쥔다', 1800); yield 1.0;
    for (let c = 0; c < this.m(4, 5); c++) {
      for (let i = 0; i < 2; i++) G.zones.spawn({ kind: c % 2 ? 'gravity' : 'invert', x: clamp(P.x + rnd(-4, 4), -8, 8), z: clamp(P.z + rnd(-3, 3), -6, 8), r: 3.1, warn: 0.6, dur: 6.0, color: c % 2 ? 0xffc4d0 : 0xff4f6e, pull: 4.2 });
      this.sfx('telegraph'); yield 0.8;
      for (let k = 0; k < 5; k++) {
        this.fan(this.n(5, 3), 1.3, this.aim(), { kind: 'shard', speed: 5.4, size: 1.05, color: pal.a, wob: [1.2, 2.2] });
        if (k % 2) this.flare(this.x, this.z, this.n(10, 6), 3.8, { kind: 'orb', color: pal.b, speeds: [[0, 1], [0.8, 0.3], [1.3, 1.6]] });
        this.sfx('fan'); yield this.t(0.8);
      }
      yield 1.0;
    }
  }
  *atk_spDouble() {
    const G = this.G, pal = this.pal;
    for (let wave = 0; wave < this.m(3, 4); wave++) {
      this.cast('teleport'); this.alphaT = 0; yield 0.3;
      const slots = shuffle([-6.8, -3.4, 0, 3.4, 6.8]).slice(0, this.m(3, 4)), zs = slots.map(() => rnd(-8, -4.5));
      this.x = this.tx = slots[0]; this.z = this.tz = zs[0]; this.alphaT = 1; this.sfx('teleport');
      for (let i = 1; i < slots.length; i++) this.spawnDecoy(slots[i], zs[i], 6.6, 0.6 + i * 0.3);
      G.ui.warn('본체는 하나뿐 — 깜빡이는 쪽은 인형이다', 1500); yield 1.0;
      for (let v = 0; v < 5; v++) { this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'shard', speed: 5.8, size: 1.1, color: pal.a, speeds: [[0, 1], [0.5, 0.3], [0.8, 1.7]] }); if (v % 2) this.thread(this.x, this.z, G.player.x, G.player.z, 0.9, 0.2); this.sfx('twang'); yield this.t(1.1); }
      this.flare(this.x, this.z, this.n(20, 12), 4.2, { kind: 'orb', color: pal.b, wob: [1.3, 2.4] }); yield 1.0;
    }
  }
  /** 실 끊기: 본체와 인형들을 잇는 줄이 팽팽해졌다 끊어지며 줄을 따라 탄이 튄다 */
  *atk_cutStrings() {
    const G = this.G, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -6.6, 0.8); yield 0.8;
    for (let c = 0; c < this.m(4, 5); c++) {
      const pts = shuffle([-7.5, -4, 0, 4, 7.5]).slice(0, 4).map((x) => [x, rnd(-3, 5)]);
      for (const [x, z] of pts) { this.thread(this.x, this.z, x, z, 1.1, 0.25); this.G.fx.ring(x, 0.5, z, pal.a, 3, 0.8); }
      this.sfx('twang'); yield 1.2;
      for (const [x, z] of pts) {
        const a = Math.atan2(z - this.z, x - this.x), len = Math.hypot(x - this.x, z - this.z), n = this.n(7, 4);
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; G.bullets.spawn({ owner: 'boss', kind: 'orb', x: this.x + (x - this.x) * f, z: this.z + (z - this.z) * f, a: a + (k % 2 ? 1.5708 : -1.5708), speed: 3.4 * this.spd, size: 1.0, color: pal.b, speeds: [[0, 0.3], [0.6, 0.3], [0.9, 1.9]], life: 7 }); }
        void len;
      }
      this.sfx('decoy_pop'); yield 1.2;
    }
  }

  // ═════════ 라스트 ═════════
  *atk_spFinaleClaire() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('막은 내리지 않는다', 1800); this.glide(0, -6.4, 1.0); yield 1.2;
    const pool = this.H ? ['puppetStrings', 'spStringNet', 'maskBloom', 'spCrown', 'wobbleStream', 'spCollapse', 'tangle', 'rubberBand', 'curtainCall', 'shatter', 'waltz3', 'cutStrings'] : ['puppetStrings', 'spStringNet', 'maskBloom', 'spCrown', 'threadSweep', 'spCollapse', 'tangle', 'rubberBand', 'waltz3'];
    while (true) for (const name of shuffle([...pool])) { yield* this['atk_' + name](); yield 0.3; }
  }
  *atk_spFinaleAstra() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); G.ui.warn('회로 위에서 인형이 춤춘다', 1800); this.glide(0, -6.4, 1.0); yield 1.2;
    while (true) {
      for (const kind of shuffle(['lag', 'invert', 'gravity'])) {
        for (let i = 0; i < 2; i++) G.zones.spawn({ kind, x: clamp(P.x + rnd(-4, 4), -8, 8), z: clamp(P.z + rnd(-3, 3), -6, 8), r: 3.1, warn: 0.6, dur: 6.0, color: kind === 'lag' ? 0x5fb4ff : kind === 'invert' ? 0xff8ad0 : 0xffe36b, pull: 4.4 });
        this.sfx('telegraph'); yield 0.7;
        for (let k = 0; k < 4; k++) { this.fan(this.n(7, 4), 1.4, this.aim(), { kind: 'shard', speed: 5.8, size: 1.05, color: pal.a, wob: [1.2, 2.4] }); this.flare(this.x, this.z, this.n(10, 6), 4, { kind: 'pixel', color: pal.b, speeds: [[0, 1], [0.7, 0.25], [1.1, 1.7]] }); this.sfx('fan'); yield this.t(0.85); }
        this.thread(this.x, this.z, P.x, P.z, 1.0, 0.25); this.thread(P.x - 6, -11, P.x + 6, 11, 1.1, 0.25); yield 1.4;
        yield* this.atk_puppetStrings();
      }
    }
  }
}
