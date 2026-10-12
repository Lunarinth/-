// EXTRA — 아르케시아: 실 끝에서 웃는 지배자, 은빛 왕관의 인형술사. 유일하게 달빛 탄막과 관련이 없다.
// 얼티메이트는 없고, 라스트 스킬이 2종류(플레이어 기체에 따라 변경)이며 총 10단계로 가장 강하다.
// 붉은 실(빔) · 꼭두각시(분신) · 가면 · 무대 장치가 핵심이다.
import { Boss, TAU, rnd, clamp, shuffle } from '../boss.js';

const PAL = { a: 0xff4f6e, b: 0xe8e8f6, c: 0xffffff, glow: 0xff3b6b, gold: 0xffc4d0 };

export const ARKESIA = {
  id: 'arkesia', name: '아르케시아', en: 'ARKESIA', epithet: '실 끝에서 웃는 지배자 — 은빛 왕관의 인형술사',
  h: 5.6, hitR: 1.5, barkKey: 'arkesia', pal: PAL, decoyColor: 0xffb0c0, decoyBullet: 0xff4f6e, hpMul: 1.15,
  theme: 'theater', music: 'arkesia',
  forms: {
    act1: { label: '제1막', sub: '실 늘이기', tint: [1, 1, 1] },
    act2: { label: '제2막', sub: '꼭두각시의 윤무', tint: [1.0, 0.98, 1.06] },
    act3: { label: '제3막', sub: '가면무도회', tint: [1.04, 1.0, 1.04] },
    act4: { label: '제4막', sub: '무대 장치', tint: [1.06, 1.02, 1.0] },
    finale: { label: '대단원', sub: '끝나지 않는 관극', tint: [1.1, 1.04, 1.08] },
  },
  allSteps: [
    { kind: 'nonspell', name: '실 늘이기', form: 'act1', hp: 700, time: 38, attacks: ['stringFan', 'puppetRing', 'threadSweep'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '윤무', name: '꼭두각시의 윤무', form: 'act2', hp: 900, time: 50, attacks: ['spPuppetDance'], idle: 0.7, ultMode: 'normal' },
    { kind: 'nonspell', name: '가면무도회', form: 'act3', hp: 820, time: 40, attacks: ['maskBloom', 'brokenPuppet', 'stringFan'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '그물', name: '붉은 실의 그물', form: 'act2', hp: 1000, time: 54, attacks: ['spStringNet'], idle: 0.7, ultMode: 'normal' },
    { kind: 'nonspell', name: '줄 끊어진 인형', form: 'act3', hp: 900, time: 40, attacks: ['brokenPuppet', 'threadSweep', 'maskBloom'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '왕관', name: '은빛 왕관', form: 'act4', hp: 1150, time: 56, attacks: ['spCrown'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '해체', name: '무대 장치 붕괴', form: 'act4', hp: 1200, time: 58, attacks: ['spCollapse'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '합창', name: '마리오네트 합창', form: 'act2', hp: 1250, time: 60, attacks: ['spChorus'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '이중', name: '이중 인형극', form: 'act3', hp: 1300, time: 62, attacks: ['spDouble'], idle: 0.7, ultMode: 'normal' },
    // 라스트 스킬: 플레이어 기체에 따라 2종류
    { kind: 'last', form: 'finale', hp: 3200, time: 90, attacks: ['spFinaleClaire'], idle: 0.7, ultMode: 'resist', tag: '대단원', name: '끝나지 않는 관극', pre: 'lastClaire',
      variant: {
        claire: { tag: '대단원', name: '끝나지 않는 관극', attacks: ['spFinaleClaire'], pre: 'lastClaire' },
        astra: { tag: '회로', name: '회로 위의 꼭두각시', attacks: ['spFinaleAstra'], pre: 'lastAstra' },
      } },
  ],
  steps: [],
};

export class Arkesia extends Boss {
  constructor(scene, T, tex, aspect, G, def = ARKESIA) { super(scene, T, tex, aspect, G, def); }

  /** 붉은 실 한 줄 (두 점 사이): 경고 후 실이 팽팽해지며 판정이 생긴다 */
  thread(x0, z0, x1, z1, warn = 0.9, dur = 0.25, w = 0.55) {
    const a = Math.atan2(z1 - z0, x1 - x0), len = Math.hypot(x1 - x0, z1 - z0);
    return this.G.beams.spawn({ x: x0, z: z0, a, w, len, warn, dur, color: this.pal.a });
  }

  // ═════════ 제1막: 실 늘이기 ═════════
  *atk_stringFan() {
    const pal = this.pal;
    this.cast('fan'); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.5;
    for (let v = 0; v < 6; v++) {
      const a = this.aim();
      this.fan(this.n(7, 4), 1.5, a, { kind: 'shard', speed: 5.8, size: 1.1, color: pal.a });
      this.fan(this.n(3, 2), 0.3, a, { kind: 'orb', speed: 8.2, size: 0.95, color: pal.b });
      this.sfx('fan'); if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.7); yield this.t(0.75);
    }
    yield 0.5;
  }
  *atk_puppetRing() {
    const pal = this.pal;
    this.cast('teleport'); this.glide(0, -6.5, 0.7); yield 0.5;
    for (let c = 0; c < 3; c++) {
      const xs = shuffle([-7, -3.5, 0, 3.5, 7]).slice(0, 3);
      xs.forEach((x, i) => this.spawnDecoy(x, rnd(-8, -4.5), 4.6, 0.7 + i * 0.25));
      for (let k = 0; k < 4; k++) { this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'orb', speed: 5.4, size: 1.0, color: pal.a }); this.sfx('orb'); yield this.t(1.0); }
      yield 1.4;
    }
  }
  /** 천장에서 내려온 실이 좌우로 쓸린다 */
  *atk_threadSweep() {
    const pal = this.pal, G = this.G;
    this.cast('beam_charge'); this.glide(0, -7, 0.7); yield 0.5;
    for (let pass = 0; pass < 3; pass++) {
      const dir = pass % 2 ? -1 : 1, cnt = 9;
      for (let k = 0; k < cnt; k++) { const x = dir * (-9 + k * 2.25); this.thread(x, -11, x + dir * 1.2, 11, 0.7, 0.18); this.shoot({ x, z: -11, a: Math.PI / 2, speed: 4.4, kind: 'orb', size: 0.9, color: pal.b }); this.sfx('twang', { pan: G.audio.pan(x), vol: 0.45 }); yield this.t(0.2); }
      yield 0.9;
    }
  }

  // ═════════ 제2막 스킬: 꼭두각시의 윤무 — 꼭두각시들이 돌며 탄을 쏜다 ═════════
  *atk_spPuppetDance() {
    const G = this.G, pal = this.pal;
    this.cast('teleport'); this.glide(0, -6.4, 0.8); G.ui.warn('꼭두각시의 윤무', 1400); yield 0.9;
    for (let c = 0; c < 4; c++) {
      const base = rnd(0, TAU), R = 5.2;
      for (let i = 0; i < 4; i++) { const a = base + (i * TAU) / 4; this.spawnDecoy(clamp(Math.cos(a) * R, -8, 8), clamp(-3 + Math.sin(a) * R * 0.6, -8, 3), 6.4, 0.5 + i * 0.2); }
      for (let k = 0; k < 6; k++) {
        this.ring(this.n(12, 7), { a0: k * 0.3, kind: 'orb', speed: 4.4, size: 1.0, color: k % 2 ? pal.a : pal.b });
        if (k % 2) this.fan(this.n(5, 3), 1.0, this.aim(), { kind: 'shard', speed: 6.6, size: 1.1, color: pal.c });
        this.sfx('orb'); yield this.t(0.85);
      }
      yield 0.8;
    }
  }

  // ═════════ 제3막: 가면무도회 ═════════
  /** 가면(큰 탄)이 느리게 날아가다 터져 부채꼴 탄을 낸다 */
  *atk_maskBloom() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.4, 0.7); yield 0.5;
    for (let c = 0; c < 5; c++) {
      const masks = [];
      const nm = 2 + (this.lv(2) ? 1 : 0);
      for (let i = 0; i < nm; i++) masks.push(this.shoot({ a: this.aim() + (i - (nm - 1) / 2) * 0.55, speed: 3.6, kind: 'orb', size: 2.0, hr: 0.55, color: pal.b, life: 2.0 }));
      this.sfx('orb'); yield 1.5;
      for (const m of masks) if (m && m.active) { const n = this.n(12, 7), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: m.x, z: m.z, a: a0 + (k * TAU) / n, speed: 4.6 * this.spd, size: 1.05, color: pal.a }); G.fx.ring(m.x, 0.9, m.z, pal.a, 4, 0.4); G.bullets.kill(m); }
      this.sfx('decoy_pop'); yield this.t(0.7);
    }
    yield 0.5;
  }
  /** 줄이 끊어진 인형: 제멋대로 휘는 탄 */
  *atk_brokenPuppet() {
    const pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.7); yield 0.5;
    for (let c = 0; c < 6; c++) {
      const n = this.n(10, 6);
      for (let i = 0; i < n; i++) this.shoot({ a: this.aim() + rnd(-0.9, 0.9), speed: rnd(4.4, 6.6), kind: 'shard', size: 1.05, color: i % 2 ? pal.a : pal.b, turn: rnd(-1.4, 1.4), life: 6 });
      this.sfx('fan'); yield this.t(0.85);
    }
    yield 0.6;
  }

  // ═════════ 스킬: 붉은 실의 그물 — 앵커를 잇는 실이 격자를 만든다 ═════════
  *atk_spStringNet() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -6.6, 0.8); G.ui.warn('붉은 실의 그물', 1400); yield 0.9;
    for (let c = 0; c < 4; c++) {
      // 가로·세로 실 격자 (플레이어 주변에 틈이 있다)
      const gx = clamp(P.x + rnd(-2, 2), -6, 6), gz = clamp(P.z + rnd(-2, 2), -4, 6);
      for (let x = -9; x <= 9; x += 3) if (Math.abs(x - gx) > 1.5) this.thread(x, -11, x + rnd(-1, 1), 11, 1.1, 0.25);
      for (let z = -8; z <= 9; z += 3.2) if (Math.abs(z - gz) > 1.5) this.thread(-12, z, 12, z + rnd(-1, 1), 1.3, 0.25);
      this.sfx('twang'); yield 1.4;
      this.fan(this.n(9, 5), 1.6, this.aim(), { kind: 'shard', speed: 6.2, size: 1.1, color: pal.a });
      this.ring(this.n(14, 8), { kind: 'orb', speed: 4.2, size: 1.0, color: pal.b });
      yield 1.2;
    }
  }

  // ═════════ 스킬: 은빛 왕관 — 보스 주위를 도는 탄의 왕관이 조여든다 ═════════
  *atk_spCrown() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -4.5, 0.8); G.ui.warn('은빛 왕관', 1400); yield 0.9;
    for (let c = 0; c < 3; c++) {
      const R0 = 7.2, n = this.n(22, 14), w = c % 2 ? -0.6 : 0.6, a0 = rnd(0, TAU), gap = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const ang = a0 + (i * TAU) / n, d = Math.abs((((ang - gap) % TAU) + TAU * 1.5) % TAU - Math.PI);
        if (d > Math.PI - 0.7) continue; // 한 곳은 비워 둔다
        G.bullets.spawn({ owner: 'boss', kind: i % 2 ? 'shard' : 'orb', size: 1.1, color: i % 2 ? pal.b : pal.a, life: 7, arm: 0.6, x: 0, z: 0, orbit: { cx: this.x, cz: this.z, r: R0, ang, w, dr: -0.55 } });
      }
      this.sfx('orb');
      for (let k = 0; k < 5; k++) { this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'shard', speed: 6.4, size: 1.1, color: pal.c }); yield this.t(1.0); }
      yield 1.2;
    }
  }

  // ═════════ 스킬: 무대 장치 붕괴 — 천장의 장치가 떨어진다 ═════════
  *atk_spCollapse() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.8, 0.8); G.ui.warn('무대 장치 붕괴', 1400); yield 0.9;
    for (let c = 0; c < 4; c++) {
      const n = 10 + (this.lv(2) ? 3 : 0), a0 = rnd(0, TAU);
      for (let i = 0; i < n; i++) {
        const ang = a0 + i * 2.4, r = 2 + (i % 5) * 1.8;
        this.zone(clamp(P.x * 0.4 + Math.cos(ang) * r * 1.4, -9, 9), clamp(P.z * 0.4 + Math.sin(ang) * r, -8, 9), 2.1, { warn: 1.15, dur: 0.3, color: pal.a, onBoom: (zz) => { const k = this.n(5, 3), b0 = rnd(0, TAU); for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: zz.x, z: zz.z, a: b0 + (j * TAU) / k, speed: 4.4 * this.spd, size: 1.0, color: pal.b }); } });
        this.sfx('telegraph'); yield this.t(0.24);
      }
      yield 1.8;
    }
  }

  // ═════════ 스킬: 마리오네트 합창 — 조작을 빼앗는 실 ═════════
  *atk_spChorus() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('madness'); this.glide(0, -6.6, 0.8); G.ui.warn('마리오네트 합창 — 실이 당신의 몸을 쥡니다', 1800); yield 1.0;
    for (let c = 0; c < 4; c++) {
      for (let i = 0; i < 2; i++) G.zones.spawn({ kind: c % 2 ? 'gravity' : 'invert', x: clamp(P.x + rnd(-4, 4), -8, 8), z: clamp(P.z + rnd(-3, 3), -6, 8), r: 3.1, warn: 0.6, dur: 6.0, color: c % 2 ? 0xffc4d0 : 0xff4f6e, pull: 4.2 });
      this.sfx('telegraph'); yield 0.8;
      for (let k = 0; k < 5; k++) { this.fan(this.n(5, 3), 1.3, this.aim(), { kind: 'shard', speed: 5.4, size: 1.05, color: pal.a }); if (k % 2) this.ring(this.n(10, 6), { kind: 'orb', speed: 3.8, size: 1.0, color: pal.b }); this.sfx('fan'); yield this.t(0.8); }
      yield 1.0;
    }
  }

  // ═════════ 스킬: 이중 인형극 — 가짜가 둘, 진짜를 찾아라 ═════════
  *atk_spDouble() {
    const G = this.G, pal = this.pal;
    for (let wave = 0; wave < 3; wave++) {
      this.cast('teleport'); this.alphaT = 0; yield 0.3;
      const slots = shuffle([-6.8, -3.4, 0, 3.4, 6.8]).slice(0, 3), zs = slots.map(() => rnd(-8, -4.5));
      this.x = this.tx = slots[0]; this.z = this.tz = zs[0]; this.alphaT = 1; this.sfx('teleport');
      for (let i = 1; i < slots.length; i++) this.spawnDecoy(slots[i], zs[i], 6.6, 0.6 + i * 0.3);
      G.ui.warn('진짜는 하나뿐 — 깜빡이는 쪽은 인형입니다', 1500); yield 1.0;
      for (let v = 0; v < 5; v++) { this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'shard', speed: 5.8, size: 1.1, color: pal.a }); if (v % 2) this.thread(this.x, this.z, G.player.x, G.player.z, 0.9, 0.2); this.sfx('twang'); yield this.t(1.1); }
      this.ring(this.n(20, 12), { kind: 'orb', speed: 4.2, size: 1.0, color: pal.b }); yield 1.0;
    }
  }

  // ═════════ 라스트 (클레르 기체): 끝나지 않는 관극 ═════════
  *atk_spFinaleClaire() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('대단원 — 끝나지 않는 관극', 1800); this.glide(0, -6.4, 1.0); yield 1.2;
    while (true) {
      for (const name of shuffle(['stringFan', 'spStringNet', 'maskBloom', 'spCrown', 'threadSweep', 'spCollapse', 'brokenPuppet'])) { yield* this['atk_' + name](); yield 0.3; }
    }
  }
  // ═════════ 라스트 (아스트라 기체): 회로 위의 꼭두각시 ═════════
  *atk_spFinaleAstra() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); G.ui.warn('회로 위의 꼭두각시', 1800); this.glide(0, -6.4, 1.0); yield 1.2;
    while (true) {
      for (const kind of shuffle(['lag', 'invert', 'gravity'])) {
        for (let i = 0; i < 2; i++) G.zones.spawn({ kind, x: clamp(P.x + rnd(-4, 4), -8, 8), z: clamp(P.z + rnd(-3, 3), -6, 8), r: 3.1, warn: 0.6, dur: 6.0, color: kind === 'lag' ? 0x5fb4ff : kind === 'invert' ? 0xff8ad0 : 0xffe36b, pull: 4.4 });
        this.sfx('telegraph'); yield 0.7;
        for (let k = 0; k < 4; k++) { this.fan(this.n(7, 4), 1.4, this.aim(), { kind: 'shard', speed: 5.8, size: 1.05, color: pal.a }); this.ring(this.n(10, 6), { kind: 'pixel', speed: 4, size: 1.0, color: pal.b }); this.sfx('fan'); yield this.t(0.85); }
        this.thread(this.x, this.z, P.x, P.z, 1.0, 0.25); this.thread(P.x - 6, -11, P.x + 6, 11, 1.1, 0.25); yield 1.4;
        yield* this.atk_stringFan();
      }
    }
  }
}
