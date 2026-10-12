// STAGE 2 — 아스트라: 무서워서 루나린스에게 붙은 기술실의 막내.
// 탄막 자체는 가볍고 느리다. 어려운 것은 "기믹"이고, 패턴마다 기믹을 다르게 쓴다:
//   훑는 구역(스캔) · 지연 핑 · 멈췄다 달리는 탄(버퍼링) · 틈이 있는 패치 벽 · 패널 뒤에 숨는 틈 · 닫히며 터지는 팝업 ·
//   입력 지연 구역 + 프레임이 끊기는 탄 · 조작 반전 구역 + 꼬이는 탄 · 중력 우물 + 궤도탄.
// 말투는 겁먹은 존댓말. 최초 격파 이후 두 번째 기체로 사용할 수 있게 된다 (해금은 game.js).
import * as THREE from '../../vendor/three.module.min.js';
import { Boss, TAU, rnd, clamp, shuffle, HP_K } from '../boss.js';

const PAL = { a: 0x9fd8ff, b: 0x5fb4ff, c: 0xffffff, glow: 0x4aa8ff, gold: 0xffe36b };
const MUL = 0.7;
const ttk = (frac, time) => Math.round((frac * time * 85) / (MUL * HP_K));

// 변속 키프레임: 멈칫멈칫 끊기며 움직이는 탄 (프레임 드랍)
const stepper = (period = 0.5, n = 10) => {
  const K = [];
  for (let i = 0; i < n; i++) { const t0 = i * period; K.push([t0, 1.7], [t0 + period * 0.42, 1.7], [t0 + period * 0.47, 0], [t0 + period * 0.95, 0]); }
  K.push([n * period, 1]); return K;
};
const FREEZE = [[0, 1], [0.3, 0.1], [1.0, 0.1], [1.25, 1.6]]; // 얼었다가 한 번에 달려 나가는 탄

export const ASTRA = {
  id: 'astra', name: '아스트라', en: 'ASTRA', epithet: '떨며 기술실을 지키는 막내',
  h: 5.2, hitR: 1.5, barkKey: 'astra', pal: PAL, decoyColor: 0x9fd8ff, decoyBullet: 0x9fd8ff, hpMul: MUL,
  theme: 'techlab', music: 'astra',
  forms: {
    boot: { label: '부팅 형태', sub: '기술실 가동', tint: [1, 1, 1] },
    debug: { label: '디버그 형태', sub: '입력 지연 · 조작 반전', tint: [0.96, 1, 1.08] },
    render: { label: '렌더 형태', sub: '홀로그램 패널', tint: [1.02, 1.04, 1.1] },
    panic: { label: '커널 패닉', sub: '모든 기믹 동시 가동', tint: [1.1, 1.0, 1.1] },
  },
  steps: [
    { kind: 'nonspell', name: '시스템 부팅', form: 'boot', hp: ttk(0.4, 34), time: 34, attacks: ['scanline', 'ping', 'buffering'], idle: 1.1, ultMode: 'normal' },
    { kind: 'spell', tag: '지연', name: '렉 스파이크', form: 'debug', hp: ttk(0.45, 46), time: 46, attacks: ['spLag'], idle: 0.8, ultMode: 'normal' },
    { kind: 'nonspell', name: '핫픽스 배포', form: 'render', hp: ttk(0.4, 38), time: 38, attacks: ['patchWall', 'hiddenGap', 'popups'], idle: 1.0, ultMode: 'normal' },
    { kind: 'spell', tag: '반전', name: '리버스 프로토콜', form: 'debug', hp: ttk(0.45, 52), time: 52, attacks: ['spInvert'], idle: 0.8, ultMode: 'normal' },
    { kind: 'last', tag: '과부하', name: '커널 패닉', form: 'panic', hp: ttk(0.5, 70), time: 70, attacks: ['spKernel'], idle: 0.8, ultMode: 'resist' },
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

  // ───── 기믹 보조 ─────
  /** 기믹 구역을 플레이어 근처에 깐다. 만든 구역의 위치를 돌려준다 */
  field(kind, n = 2, r = 3.1, dur = 6.5) {
    const G = this.G, P = G.player, out = [];
    for (let i = 0; i < n; i++) {
      const x = clamp(P.x + rnd(-4.5, 4.5), -8, 8), z = clamp(P.z + rnd(-3.5, 3.5), -6, 8);
      G.zones.spawn({ kind, x, z, r, warn: 0.6, dur, color: kind === 'lag' ? 0x5fb4ff : kind === 'invert' ? 0xff8ad0 : 0xffe36b, pull: 4.4 });
      out.push([x, z]);
    }
    this.sfx('telegraph');
    return out;
  }
  /** 벽: 위에서 내려오는 한 줄(틈 하나). 구멍의 x 를 돌려준다 */
  wallDown(gap, o = {}) {
    for (let x = -10; x <= 10; x += 1.8) if (Math.abs(x - gap) > 1.7) this.shoot({ x, z: -11, a: Math.PI / 2, speed: o.speed ?? 3.9, kind: 'pixel', size: 1.05, color: o.color ?? this.pal.a, ...(o.extra || {}) });
  }

  // ═════════ 통상 1: 시스템 부팅 ═════════
  // 스캔: 가로 띠가 한쪽 끝에서 다른 쪽 끝으로 칸칸이 켜진다. 띠 밖으로 빠지면 된다.
  *atk_scanline() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    const passes = 3 + (this.lv(2) ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      const dir = p % 2 ? -1 : 1, rowZ = clamp(P.z + rnd(-1.2, 1.2), -4, 6.5);
      for (let k = 0; k < 11; k++) {
        const x = (-9.5 + k * 1.9) * dir;
        this.zone(x, rowZ, 1.55, { warn: 0.85, dur: 0.24, color: pal.a, onBoom: (zz) => { for (const s of [-1, 1]) this.shoot({ x: zz.x, z: zz.z, a: (s * Math.PI) / 2, speed: 3.4, kind: 'pixel', size: 1.0, color: pal.c, arm: 0.25 }); } });
        if (k % 3 === 0) this.sfx('telegraph', { pan: G.audio.pan(x), vol: 0.5 });
        yield 0.16;
      }
      yield this.t(1.6);
    }
    yield 0.4;
  }

  // 핑: 플레이어 근처에 지연 폭발. 터진 자리에서 작은 고리가 한 박자 쉬었다가 퍼져 나간다.
  *atk_ping() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    for (let i = 0; i < 9; i++) {
      this.zone(P.x + rnd(-1.6, 1.6), P.z + rnd(-1.6, 1.6), 1.7, { warn: 1.0, dur: 0.26, color: pal.a, onBoom: (zz) => { const n = this.n(6, 4), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) this.shoot({ x: zz.x, z: zz.z, kind: 'pixel', a: a0 + (k * TAU) / n, speed: 3.6, size: 1.0, color: pal.c, speeds: [[0, 0.25], [0.5, 0.25], [0.8, 1.3]], arm: 0.3 }); } });
      this.sfx('telegraph', { pan: G.audio.pan(P.x), vol: 0.6 }); yield this.t(0.42);
    }
    yield 1.4;
  }

  // 버퍼링: 한 줄로 내려오던 탄이 중간에서 멈췄다가(…로딩) 한꺼번에 달려 나온다. 틈은 계속 바뀐다.
  *atk_buffering() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('glitch'); this.glide(0, -7, 0.8); yield 0.6;
    const waves = 5 + (this.lv(2) ? 1 : 0);
    for (let w = 0; w < waves; w++) {
      const gc = clamp(P.x + rnd(-3.5, 3.5), -7.5, 7.5);
      this.wallDown(gc, { speed: 4.4, color: w % 2 ? pal.a : pal.c, extra: { speeds: [[0, 1], [0.8, 0], [1.9, 0], [2.2, 1.35]], life: 9 } });
      this.sfx('orb'); yield this.t(1.35);
    }
    yield 1.4;
  }

  // ═════════ 스펠 1: 렉 스파이크 — 입력 지연 구역 ═════════
  *atk_spLag() {
    const G = this.G, pal = this.pal;
    this.cast('veil'); this.glide(0, -6.8, 0.8); G.ui.warn('푸른 구역 안에서는 몸이 늦게 반응한다', 2200); yield 1.0;
    for (let cyc = 0; ; cyc++) {
      this.field('lag', 2 + (this.lv(2) ? 1 : 0), 3.1, 6.5); yield 0.8;
      // 프레임이 얼어붙었다가 한꺼번에 풀리는 고리
      for (let k = 0; k < 3; k++) {
        this.ring(this.n(12, 8), { kind: 'pixel', speed: 4.0, size: 1.0, color: k % 2 ? pal.a : pal.c, speeds: FREEZE });
        this.sfx('glitch', { vol: 0.5 }); yield this.t(1.15);
      }
      // 끊겨 보이는 조준탄 (프레임 건너뛰기)
      for (let k = 0; k < 3; k++) {
        this.fan(this.n(3, 2), 0.7, this.aim(), { kind: 'pixel', speed: 3.4, size: 1.0, color: pal.b, speeds: stepper(0.5, 12), life: 7 });
        this.sfx('fan'); yield this.t(0.9);
      }
      this.beam(this.x, this.z, this.aim(), { w: 1.2, len: 30, warn: 1.1, dur: 0.2, color: pal.gold }); this.sfx('beam_charge');
      yield 1.8;
    }
  }

  // ═════════ 통상 2: 핫픽스 배포 ═════════
  // 패치 벽: 위에서, 옆에서 번갈아 오는 틈 있는 벽. 격자처럼 맞물린다.
  *atk_patchWall() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.8); yield 0.6;
    const waves = 6 + (this.lv(2) ? 1 : 0);
    for (let w = 0; w < waves; w++) {
      if (w % 2 === 0) this.wallDown(clamp(P.x + rnd(-3, 3), -7, 7), { speed: 3.9, color: pal.a });
      else {
        const gz = clamp(P.z + rnd(-2.5, 2.5), -5, 7), side = Math.random() < 0.5 ? -1 : 1;
        for (let z = -9.5; z <= 9.5; z += 1.8) if (Math.abs(z - gz) > 1.7) this.shoot({ x: side * 11.5, z, a: side < 0 ? 0 : Math.PI, speed: 3.9, kind: 'pixel', size: 1.05, color: pal.c });
      }
      this.sfx('orb'); yield this.t(1.3);
    }
    yield 1.0;
  }

  // 틈 숨기기: 벽의 틈을 보여 준 뒤, 홀로그램 패널이 벽이 지나갈 자리를 가린다. 틈의 위치를 기억해야 한다.
  *atk_hiddenGap() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.6, 0.8); yield 0.6;
    for (let r = 0; r < 4; r++) {
      const gc = clamp(P.x + rnd(-3, 3), -7, 7);
      this.wallDown(gc, { speed: 3.3, color: pal.c });
      this.sfx('orb'); yield 1.1;
      this.panel(gc, 1.2, 8.6, 4.6, 3.2);
      yield 1.5;
      this.wallDown(clamp(gc + rnd(-3, 3), -7, 7), { speed: 3.3, color: pal.a });
      yield this.t(2.4);
    }
    yield 0.5;
  }

  // 팝업: 패널이 떠 있다가 닫히는 순간 그 자리에서 고리가 터진다. 패널 근처를 피하면 된다.
  *atk_popups() {
    const pal = this.pal;
    this.cast('glitch'); this.glide(0, -6.6, 0.8); yield 0.6;
    for (let r = 0; r < 4; r++) {
      const spots = [0, 1, 2].map(() => [rnd(-6.5, 6.5), rnd(-2, 5)]), lifes = [2.2, 2.9, 3.6];
      spots.forEach(([x, z], i) => this.panel(x, z, rnd(3.6, 4.6), rnd(2.4, 3.0), lifes[i]));
      let t = 0;
      for (let i = 0; i < 3; i++) {
        yield lifes[i] - t; t = lifes[i];
        const [x, z] = spots[i], n = this.n(10, 6), a0 = rnd(0, TAU);
        for (let k = 0; k < n; k++) this.shoot({ x, z, a: a0 + (k * TAU) / n, speed: 3.6, kind: 'pixel', size: 1.0, color: i % 2 ? pal.a : pal.c, arm: 0.3 });
        this.sfx('decoy_pop', { vol: 0.5 });
      }
      yield this.t(1.2);
    }
    yield 0.4;
  }

  // ═════════ 스펠 2: 리버스 프로토콜 — 조작 반전 구역 + 중력 우물 ═════════
  /** 꼬이는 탄: 위상이 반대인 두 줄이 한 줄기에서 갈라져 서로 엮이며 내려온다 */
  *braids(cols, count) {
    const pal = this.pal, xs = [];
    for (let i = 0; i < cols; i++) xs.push(clamp(-8 + (16 / Math.max(1, cols - 1)) * i + rnd(-1, 1), -9, 9));
    for (let j = 0; j < count; j++) {
      for (const x of xs) for (const ph of [0, Math.PI]) this.shoot({ x, z: -10.5, a: Math.PI / 2, speed: 3.8, kind: 'pixel', size: 1.0, color: ph ? pal.a : pal.c, wob: [1.7, 2.6], wobPh: ph, life: 9 });
      this.sfx('orb'); yield this.t(0.55);
    }
  }
  *gInvert() {
    this.G.ui.warn('분홍 구역 안에서는 몸이 거꾸로 움직인다', 2000);
    this.field('invert', 2 + (this.lv(2) ? 1 : 0), 3.0, 6.5); yield 0.9;
    yield* this.braids(this.n(4, 3), 7);
    yield 1.4;
  }
  *gGravity() {
    this.G.ui.warn('금빛 구역은 몸을 안쪽으로 끌어당긴다', 2000);
    const wells = this.field('gravity', 2, 3.3, 6.0); yield 0.8;
    for (const [i, [x, z]] of wells.entries()) {
      const n = this.n(5, 4), dir = i % 2 ? -1 : 1;
      for (let k = 0; k < n; k++) this.shoot({ x, z, a: 0, speed: 0, kind: 'pixel', size: 1.05, color: this.pal.gold, life: 6.2, orbit: { cx: x, cz: z, ang: (k * TAU) / n, w: 1.15 * dir, r: 3.9 }, arm: 0.2 });
    }
    this.sfx('orb');
    yield 1.2;
    this.fan(this.n(3, 2), 0.9, this.aim(), { kind: 'pixel', speed: 3.4, size: 1.0, color: this.pal.a, life: 8 }); this.sfx('fan');
    yield this.t(2.6);
    this.fan(this.n(3, 2), 0.9, this.aim(), { kind: 'pixel', speed: 3.4, size: 1.0, color: this.pal.a, life: 8 }); this.sfx('fan');
    yield 1.6;
  }
  *atk_spInvert() {
    const G = this.G;
    this.cast('madness'); this.glide(0, -6.8, 0.8); G.ui.warn('분홍 구역에서는 몸이 거꾸로, 금빛 구역에서는 안쪽으로 끌려간다', 2400); yield 1.0;
    for (let cyc = 0; ; cyc++) {
      if (cyc % 2 === 0) yield* this.gInvert(); else yield* this.gGravity();
      yield 0.6;
    }
  }

  // ═════════ 라스트: 커널 패닉 — 모든 기믹을 번갈아, 회차가 지나면 겹친다 ═════════
  *gLag() {
    this.G.ui.warn('푸른 구역 안에서는 몸이 늦게 반응한다', 1800);
    this.field('lag', 2, 3.0, 6.0); yield 0.7;
    for (let k = 0; k < 3; k++) { this.ring(this.n(12, 8), { kind: 'pixel', speed: 4.0, size: 1.0, color: k % 2 ? this.pal.a : this.pal.c, speeds: FREEZE }); this.sfx('glitch', { vol: 0.5 }); yield this.t(1.1); }
    this.fan(this.n(3, 2), 0.7, this.aim(), { kind: 'pixel', speed: 3.4, size: 1.0, color: this.pal.b, speeds: stepper(0.5, 12), life: 7 }); yield 1.0;
  }
  *gPanel() {
    this.G.ui.warn('투명한 패널 뒤의 탄은 보이지 않는다', 1800);
    const P = this.G.player, gc = clamp(P.x + rnd(-3, 3), -7, 7);
    this.wallDown(gc, { speed: 3.3, color: this.pal.c }); this.sfx('orb'); yield 1.1;
    this.panel(gc, 1.2, 8.6, 4.6, 3.2); yield 1.5;
    this.wallDown(clamp(gc + rnd(-3, 3), -7, 7), { speed: 3.3, color: this.pal.a }); yield this.t(2.2);
  }
  *atk_spKernel() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('커널 패닉 — 기술실의 모든 장치가 번갈아 폭주한다', 2400); this.glide(0, -6.6, 1.0); yield 1.2;
    for (let round = 0; ; round++) {
      for (const g of shuffle(['lag', 'invert', 'gravity', 'panel'])) {
        // 두 번째 회차부터는 다른 구역이 하나 더 겹쳐 깔린다 (탄은 그대로)
        if (round >= 1 && this.lv(1) && g !== 'invert' && g !== 'gravity') this.field(Math.random() < 0.5 ? 'invert' : 'lag', 1, 2.8, 5.5);
        if (g === 'lag') yield* this.gLag();
        else if (g === 'invert') yield* this.gInvert();
        else if (g === 'gravity') yield* this.gGravity();
        else yield* this.gPanel();
        this.beam(this.x, this.z, this.aim(), { w: 1.1, len: 30, warn: 1.0, dur: 0.2, color: this.pal.gold }); this.sfx('beam_charge');
        yield 1.4;
      }
    }
  }
}
