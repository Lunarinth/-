// 중간 보스(문양): 스테이지 병사 웨이브 중간에 길을 막는 거대한 문양. 캐릭터가 아니라서 말을 하지 않는다.
// 모든 난이도에서 통상 1개, 하드 이상에서는 스킬 1개가 추가된다 (minLv).
import { Boss, TAU, rnd, clamp } from '../boss.js';

const FLAVOR = {
  star: { name: '성좌의 파수병', tex: 'mob_star', pal: { a: 0xcfe0ff, b: 0x9cc3ff, c: 0xffffff, glow: 0x7fa8ff }, theme: 'astral', bullet: 'star', alt: 'orb', spell: { tag: '성좌', name: '북두칠성의 낙하' } },
  circuit: { name: '회로의 수호기', tex: 'mob_circuit', pal: { a: 0x9fd8ff, b: 0x5fb4ff, c: 0xffffff, glow: 0x4aa8ff }, theme: 'techlab', bullet: 'pixel', alt: 'orb', spell: { tag: '과열', name: '서킷 오버히트' } },
  rose: { name: '장미창의 파수병', tex: 'mob_rose', pal: { a: 0xff9fb8, b: 0xffd36b, c: 0xffffff, glow: 0xff8aa8 }, theme: 'terrace', bullet: 'petal', alt: 'orb', spell: { tag: '장미', name: '로즈 윈도우 블룸' } },
  tome: { name: '서가의 파수병', tex: 'mob_tome', pal: { a: 0x7fe3b5, b: 0xffe39a, c: 0xffffff, glow: 0x3fd49a }, theme: 'library', bullet: 'page', alt: 'orb', spell: { tag: '서가', name: '무너지는 서가' } },
  ledger: { name: '장부의 파수병', tex: 'mob_ledger', pal: { a: 0xc89bff, b: 0xa66bff, c: 0xffffff, glow: 0xb06bff }, theme: 'arcane', bullet: 'glyph', alt: 'orb', spell: { tag: '결산', name: '장부 대조' } },
};

export function makeSigilDef(key) {
  const F = FLAVOR[key];
  return {
    id: 'mid_' + key, name: F.name, en: 'GUARDIAN SIGIL', epithet: '문양이 빚은 중간 보스', h: 4.4, hitR: 1.5, barkKey: null, pal: F.pal, decoyColor: F.pal.a,
    theme: F.theme, music: 'midboss', hpMul: 0.6, flavor: key, sprite: F.tex,
    forms: { main: { label: '수호 형태', sub: F.name, tint: [1, 1, 1] } },
    allSteps: [
      { kind: 'nonspell', name: F.name, form: 'main', hp: 700, time: 32, attacks: ['ringBurst', 'aimFan', 'weave'], idle: 0.9, ultMode: 'normal' },
      { kind: 'spell', tag: F.spell.tag, name: F.spell.name, form: 'main', hp: 900, time: 42, attacks: ['spGuard'], idle: 0.7, ultMode: 'normal', minLv: 2 },
    ],
    steps: [],
  };
}
export const SIGIL_KEYS = Object.keys(FLAVOR);

export class SigilMid extends Boss {
  constructor(scene, T, tex, aspect, G, def) { super(scene, T, tex, aspect, G, def); this.F = FLAVOR[def.flavor]; }

  renderExtra(dt, t) { this.mat.rotation = t * 0.45; this.mat.blending = 2; /* AdditiveBlending */ }

  b(kind) { return kind === 'main' ? this.F.bullet : this.F.alt; }

  *atk_ringBurst() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.4, 0.7); yield 0.5;
    for (let r = 0; r < 7; r++) {
      this.ring(this.n(14, 8), { a0: r * 0.24, kind: this.b('main'), speed: 4.4, size: 1.1, color: r % 2 ? pal.a : pal.c, accel: 0.4, maxS: 7 });
      this.sfx('orb'); yield this.t(0.62);
    }
    yield 0.8;
  }
  *atk_aimFan() {
    const pal = this.pal;
    this.cast('fan'); yield 0.3;
    for (let v = 0; v < 6; v++) {
      this.fan(this.n(5, 3), 1.2, this.aim(), { kind: this.b('main'), speed: 5.6, size: 1.1, color: pal.b });
      this.fan(2, 0.3, this.lead(0.55), { kind: this.b('alt'), speed: 8.4, size: 1.0, color: pal.c });
      this.sfx('fan'); if (v % 2) this.glide(rnd(-6, 6), rnd(-7.5, -5), 0.7); yield this.t(0.75);
    }
    yield 0.5;
  }
  *atk_weave() {
    const pal = this.pal, dir = Math.random() < 0.5 ? -1 : 1;
    this.cast('cast'); this.glide(-dir * 6, -6.5, 0.6); yield 0.7;
    const dur = 4.2; let t = 0, acc = 0;
    this.glide(dir * 6, -6, dur);
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt;
      while (acc >= this.t(0.14)) { acc -= this.t(0.14); this.shoot({ a: Math.PI / 2 + Math.sin(t * 3) * 0.7, speed: 5.4, kind: this.b('main'), size: 1.05, color: pal.a }); }
    }
    yield 0.6;
  }
  // 하드 이상: 문양별 스킬
  *atk_spGuard() {
    const G = this.G, P = G.player, pal = this.pal, fl = this.def.flavor;
    this.cast('moon_throw'); this.glide(0, -6.6, 0.8); G.ui.warn(`${this.step.name}`, 1400); yield 0.9;
    for (let c = 0; c < 4; c++) {
      if (fl === 'star') { const pts = Array.from({ length: 6 }, () => [rnd(-8, 8), rnd(-6, 6)]); pts.forEach((p, i) => { G.bullets.spawn({ owner: 'boss', kind: 'star', x: p[0], z: p[1], a: 0, speed: 6 * this.spd, size: 1.5, color: pal.c, hold: 1.6 - i * 0.18, delay: i * 0.18, reaim: true, life: 10 }); }); yield 2.2; }
      else if (fl === 'circuit') { for (let x = -9; x <= 9; x += 3) this.thread && 0; this.ring(this.n(16, 9), { kind: 'pixel', speed: 4.6, size: 1.05, color: pal.a }); G.zones.spawn({ kind: 'lag', x: clamp(P.x, -8, 8), z: clamp(P.z, -6, 8), r: 3, warn: 0.6, dur: 5, color: 0x5fb4ff }); yield 1.0; }
      else if (fl === 'rose') { for (let k = 0; k < 6; k++) { const n = this.n(10, 6); for (let i = 0; i < n; i++) this.shoot({ a: (i * TAU) / n + k * 0.4, speed: 4.6, kind: 'petal', size: 1.1, color: i % 2 ? pal.a : pal.b, turn: 0.9 * (k % 2 ? -1 : 1), life: 6 }); this.sfx('orb'); yield this.t(0.55); } yield 0.6; }
      else if (fl === 'tome') { for (let i = 0; i < this.n(22, 12); i++) { this.shoot({ x: rnd(-9.5, 9.5), z: -11, a: Math.PI / 2 + rnd(-0.1, 0.1), speed: rnd(4, 6.2), kind: 'page', size: 1.1, color: pal.a }); yield this.t(0.12); } yield 0.8; }
      else { for (let i = 0; i < 4; i++) { G.zones.spawn({ x: P.x + rnd(-2.5, 2.5), z: P.z + rnd(-2.5, 2.5), r: 1.9, warn: 0.95, dur: 0.28, color: pal.a, onBoom: (zz) => { const n = this.n(8, 5), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 4.2 * this.spd, size: 1.0, color: pal.c }); } }); yield this.t(0.4); } yield 0.9; }
    }
  }
}
