// STAGE 2 — 아스트라: 무서워서 루나린스에게 붙은 기술실의 막내.
// 탄막 자체는 가볍지만 "기믹"이 어렵다: 입력 지연 구역 · 조작 반전 구역 · 중력 우물 · 홀로그램 패널(시야 차단).
// 말투는 겁먹은 존댓말. 최초 격파 이후 두 번째 기체로 사용할 수 있게 된다 (해금은 game.js).
import * as THREE from '../../vendor/three.module.min.js';
import { Boss, TAU, rnd, clamp, shuffle } from '../boss.js';

const PAL = { a: 0x9fd8ff, b: 0x5fb4ff, c: 0xffffff, glow: 0x4aa8ff, gold: 0xffe36b };

export const ASTRA = {
  id: 'astra', name: '아스트라', en: 'ASTRA', epithet: '떨며 기술실을 지키는 막내',
  h: 5.2, hitR: 1.5, barkKey: 'astra', pal: PAL, decoyColor: 0x9fd8ff, decoyBullet: 0x9fd8ff, hpMul: 0.7,
  theme: 'techlab', music: 'astra',
  forms: {
    boot: { label: '부팅 형태', sub: '기술실 가동', tint: [1, 1, 1] },
    debug: { label: '디버그 형태', sub: '입력 지연 · 조작 반전', tint: [0.96, 1, 1.08] },
    render: { label: '렌더 형태', sub: '홀로그램 패널', tint: [1.02, 1.04, 1.1] },
    panic: { label: '커널 패닉', sub: '모든 기믹 동시 가동', tint: [1.1, 1.0, 1.1] },
  },
  steps: [
    { kind: 'nonspell', name: '시스템 부팅', form: 'boot', hp: 520, time: 36, attacks: ['bootRings', 'packetFan', 'pingZones'], idle: 1.1, ultMode: 'normal' },
    { kind: 'spell', tag: '지연', name: '렉 스파이크', form: 'debug', hp: 760, time: 48, attacks: ['spLag'], idle: 0.8, ultMode: 'normal' },
    { kind: 'nonspell', name: '핫픽스 배포', form: 'render', hp: 640, time: 38, attacks: ['patchGrid', 'holoPanels'], idle: 1.0, ultMode: 'normal' },
    { kind: 'spell', tag: '반전', name: '리버스 프로토콜', form: 'debug', hp: 900, time: 54, attacks: ['spInvert'], idle: 0.8, ultMode: 'normal' },
    { kind: 'last', tag: '과부하', name: '커널 패닉', form: 'panic', hp: 1500, time: 72, attacks: ['spKernel'], idle: 0.8, ultMode: 'resist' },
  ],
};

export class Astra extends Boss {
  constructor(scene, T, tex, aspect, G, def = ASTRA) {
    super(scene, T, tex, aspect, G, def);
    // 시야를 가리는 홀로그램 패널 풀 (탄보다 위에 그려진다)
    this.panels = Array.from({ length: 4 }, () => {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.holo, transparent: true, depthWrite: false, opacity: 0 }));
      spr.renderOrder = 25; spr.visible = false; scene.add(spr);
      return { spr, active: false, x: 0, z: 0, w: 5, h: 3, t: 0, life: 4 };
    });
  }

  panel(x, z, w, h, life = 4.2) {
    const p = this.panels.find((q) => !q.active); if (!p) return;
    Object.assign(p, { active: true, x, z, w, h, t: 0, life }); p.spr.visible = true;
    this.G.audio.sfx.play('glitch', { pan: this.G.audio.pan(x), vol: 0.6 });
  }
  onCancel() { if (!this.panels) return; for (const p of this.panels) { p.active = false; p.spr.visible = false; } }
  update(dt) {
    super.update(dt);
    if (!this.panels) return;
    for (const p of this.panels) {
      if (!p.active) continue;
      p.t += dt;
      if (p.t >= p.life) { p.active = false; p.spr.visible = false; continue; }
      const fade = Math.min(1, p.t / 0.3) * Math.min(1, (p.life - p.t) / 0.4);
      p.spr.position.set(p.x, 1.7 + Math.sin(p.t * 2) * 0.1, p.z); p.spr.scale.set(p.w, p.h, 1); p.spr.material.opacity = 0.86 * fade;
    }
  }

  // ───── 기믹 / 가벼운 탄막 보조 ─────
  field(kind, n = 2, r = 3.1, dur = 6.5) {
    const G = this.G, P = G.player;
    for (let i = 0; i < n; i++) G.zones.spawn({ kind, x: clamp(P.x + rnd(-4.5, 4.5), -8, 8), z: clamp(P.z + rnd(-3.5, 3.5), -6, 8), r, warn: 0.6, dur, color: kind === 'lag' ? 0x5fb4ff : kind === 'invert' ? 0xff8ad0 : 0xffe36b, pull: 4.4 });
    this.sfx('telegraph');
  }
  *light(count, gap = 0.75) {
    const pal = this.pal;
    for (let k = 0; k < count; k++) {
      this.fan(this.n(5, 3), 1.4, this.aim(), { kind: 'pixel', speed: 5, size: 1.0, color: pal.a });
      if (k % 2) this.ring(this.n(10, 6), { kind: 'pixel', speed: 3.8, size: 1.0, color: pal.c });
      this.sfx('fan'); yield this.t(gap);
    }
  }

  // ═════════ 통상 1: 시스템 부팅 ═════════
  *atk_bootRings() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 0.6;
    for (let r = 0; r < 7; r++) {
      this.ring(this.n(14, 8), { a0: r * 0.27, kind: 'pixel', speed: 4.2, size: 1.0, color: r % 2 ? pal.a : pal.c, accel: 0.4, maxS: 6.5 });
      this.sfx('orb'); yield this.t(0.62);
    }
    yield 1.0;
  }
  *atk_packetFan() {
    const pal = this.pal;
    this.cast('fan'); yield 0.4;
    const v = 5 + (this.lv(2) ? 1 : 0);
    for (let i = 0; i < v; i++) {
      const a = this.aim();
      this.fan(this.n(5, 3), 1.3, a, { kind: 'pixel', speed: 5.4, size: 1.0, color: pal.b });
      this.fan(2, 0.3, a, { kind: 'star', speed: 7.5, size: 1.1, color: pal.c });
      this.sfx('fan'); if (i % 2) this.glide(rnd(-5, 5), rnd(-7.5, -5.5), 0.7);
      yield this.t(0.75);
    }
    yield 0.5;
  }
  *atk_pingZones() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    for (let i = 0; i < 10; i++) {
      this.zone(P.x + rnd(-1.5, 1.5), P.z + rnd(-1.5, 1.5), 1.7, { warn: 1.0, dur: 0.28, color: pal.a, onBoom: (zz) => { const n = this.n(8, 5), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'pixel', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 4.2 * this.spd, size: 1.0, color: pal.c }); } });
      this.sfx('telegraph', { pan: G.audio.pan(P.x) }); yield this.t(0.38);
    }
    yield 1.2;
  }

  // ═════════ 스킬 1: 렉 스파이크 — 입력 지연 구역 ═════════
  *atk_spLag() {
    const G = this.G, pal = this.pal;
    this.cast('veil'); this.glide(0, -6.8, 0.8); G.ui.warn('렉 스파이크 — 푸른 구역 안에서는 입력이 늦게 반영됩니다', 2000); yield 1.0;
    for (let cyc = 0; cyc < 4; cyc++) {
      this.field('lag', 2 + (this.lv(2) ? 1 : 0), 3.1, 6.5); yield 0.8;
      yield* this.light(5, 0.75);
      this.beam(this.x, this.z, this.aim(), { w: 1.2, len: 30, warn: 1.0, dur: 0.2, color: pal.gold }); this.sfx('beam_charge'); yield 1.2;
      this.ring(this.n(12, 8), { kind: 'pixel', speed: 4.4, size: 1.0, color: pal.a }); yield 0.8;
    }
    yield 0.4;
  }

  // ═════════ 통상 2: 핫픽스 배포 ═════════
  *atk_patchGrid() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    for (let w = 0; w < 7; w++) {
      const gc = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let x = -10; x <= 10; x += 1.8) if (Math.abs(x - gc) > 1.7) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 3.9, kind: 'pixel', size: 1.05, color: w % 2 ? pal.a : pal.c });
      if (w % 3 === 2) this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'star', speed: 6.2, size: 1.1, color: pal.gold });
      this.sfx('orb'); yield this.t(1.15);
    }
    yield 1.0; void G;
  }
  *atk_holoPanels() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 0.6;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 3; i++) this.panel(rnd(-6.5, 6.5), rnd(-3, 5), rnd(5, 7), rnd(3.4, 4.4), 4.6);
      for (let k = 0; k < 5; k++) {
        this.fan(this.n(5, 3), 1.3, this.aim(), { kind: 'pixel', speed: 5.0, size: 1.0, color: pal.a });
        if (k % 2) this.ring(this.n(8, 5), { kind: 'pixel', speed: 3.8, size: 1.0, color: pal.c });
        this.sfx('fan'); yield this.t(0.8);
      }
      yield 0.6;
    }
  }

  // ═════════ 스킬 2: 리버스 프로토콜 — 조작 반전 구역 + 중력 우물 ═════════
  *atk_spInvert() {
    const G = this.G;
    this.cast('madness'); this.glide(0, -6.8, 0.8); G.ui.warn('리버스 프로토콜 — 분홍 구역 안에서는 조작이 반대로 됩니다', 2000); yield 1.0;
    for (let cyc = 0; cyc < 4; cyc++) {
      if (cyc % 2 === 0) this.field('invert', 2 + (this.lv(2) ? 1 : 0), 3.0, 6.5);
      else this.field('gravity', 2, 3.4, 6.0);
      yield 0.8;
      yield* this.light(5, 0.8);
      yield 1.0;
    }
    yield 0.4;
  }

  // ═════════ 라스트: 커널 패닉 — 모든 기믹을 번갈아 ═════════
  *atk_spKernel() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('커널 패닉 — 모든 기믹이 번갈아 가동됩니다', 2000); this.glide(0, -6.6, 1.0); yield 1.2;
    while (true) {
      for (const g of shuffle(['lag', 'invert', 'gravity', 'panel'])) {
        if (g === 'panel') for (let i = 0; i < 3; i++) this.panel(rnd(-6.5, 6.5), rnd(-3, 5), rnd(5, 7), rnd(3.4, 4.4), 4.6);
        else this.field(g, g === 'gravity' ? 2 : 3, g === 'gravity' ? 3.4 : 3.0, 6.0);
        yield 0.6;
        yield* this.light(5, 0.8);
        this.beam(this.x, this.z, this.aim(), { w: 1.1, len: 30, warn: 0.9, dur: 0.2, color: this.pal.gold });
        yield 1.0;
      }
    }
  }
}
