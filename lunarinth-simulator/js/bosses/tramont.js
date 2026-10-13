// STAGE 3 — 트라몽: 크루아상에 매수되어 루나린스 편에 선 프랑스 검사.
// 탄 밀도는 낮지만 탄속이 매우 빠르다. 3번째 패턴은 10초간 버텨야 하는 특수기: 보스가 필드에서 사라지고
// 점점 빨라지는 검섬이 휩쓸며, 벤 자리에 탄이 남는다 (이지 1개, 노말 이상은 점점 많이).
import { Boss, TAU, rnd, clamp } from '../boss.js';

const PAL = { a: 0x9bc8ff, b: 0xffffff, c: 0xff6b7a, glow: 0x6fa8ff, gold: 0xffd36b };

export const TRAMONT = {
  id: 'tramont', name: '트라몽', en: 'TRAMONT', epithet: '크루아상에 매수된 프랑스 검사',
  h: 5.4, hitR: 1.5, barkKey: 'tramont', pal: PAL, decoyColor: 0xbfd6ff, hpMul: 0.8,
  theme: 'terrace', music: 'tramont',
  forms: {
    garde: { label: '앙가르드', sub: '정통 검술', tint: [1, 1, 1] },
    flurry: { label: '플뢰레', sub: '난무', tint: [1.02, 1.0, 1.06] },
    eclair: { label: '에클레르', sub: '번개 같은 검섬', tint: [1.1, 1.1, 1.14] },
    vive: { label: '비브 라 프랑스', sub: '삼색의 검', tint: [1.1, 1.0, 1.06] },
  },
  steps: [
    { kind: 'nonspell', name: '프티 데쥬네', form: 'garde', hp: 560, time: 36, attacks: ['fastFan', 'stab', 'croissantArc'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '난무', name: '플뢰레 스톰', form: 'flurry', hp: 820, time: 48, attacks: ['spFlurry'], idle: 0.7, ultMode: 'normal' },
    // 3번째 패턴: 10초 버티기 (보스 무적, 필드에서 사라진다)
    { kind: 'spell', tag: '검섬', name: '에클레르 · 연속 검섬', form: 'eclair', hp: 1, time: 10, attacks: ['spSlashStorm'], idle: 0, ultMode: 'immune', endure: true },
    { kind: 'nonspell', name: '바게트 돌격', form: 'garde', hp: 680, time: 38, attacks: ['baguetteRush', 'fastFan'], idle: 0.8, ultMode: 'normal' },
    { kind: 'last', tag: '삼색', name: '비브 라 레볼뤼시옹', form: 'vive', hp: 1700, time: 74, attacks: ['spRevolution'], idle: 0.7, ultMode: 'resist' },
  ],
};

export class Tramont extends Boss {
  constructor(scene, T, tex, aspect, G, def = TRAMONT) { super(scene, T, tex, aspect, G, def); }

  onStepBegin() { this.alphaT = 1; }
  onCancel() { this.alphaT = 1; }

  // ═════════ 통상 1: 프티 데쥬네 ═════════
  *atk_fastFan() {
    const pal = this.pal;
    this.cast('fan'); this.glide(rnd(-5, 5), -6.4, 0.5); yield 0.5;
    const vols = 5 + (this.lv(2) ? 1 : 0);
    for (let v = 0; v < vols; v++) {
      this.fan(this.n(3, 2), 0.25, this.lead(0.5), { kind: 'blade', speed: 10, size: 1.35, color: pal.b });
      this.fan(this.n(5, 3), 1.1, this.aim(), { kind: 'orb', speed: 6.6, size: 0.9, color: pal.a });
      this.sfx('fan', { pitch: 1.3 }); this.glide(rnd(-6.5, 6.5), rnd(-8, -4.5), 0.35);
      yield this.t(0.62);
    }
    yield 0.4;
  }
  *atk_stab() {
    const pal = this.pal;
    this.cast('beam_charge');
    const passes = 4 + (this.lv(2) ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      this.glide(rnd(-6.5, 6.5), rnd(-7.5, -4), 0.35); yield 0.4;
      const a = this.aim();
      this.beam(this.x, this.z, a, { w: 1.0, len: 30, warn: 0.5, dur: 0.12, color: pal.b });
      this.sfx('beam_charge', { pitch: 1.4 }); yield 0.5;
      this.kick(Math.cos(a) * 2.2, Math.sin(a) * 2.2);
      this.fan(3, 0.14, a, { kind: 'blade', speed: 13, size: 1.4, color: pal.c });
      yield this.t(0.5);
    }
    yield 0.4;
  }
  *atk_croissantArc() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.2, 0.5); yield 0.5;
    for (let k = 0; k < 6; k++) {
      const a = this.aim(), s = k % 2 ? 1 : -1, n = this.n(6, 3);
      for (let i = 0; i < n; i++) this.shoot({ a: a + (i - (n - 1) / 2) * 0.16, speed: 8.6, kind: 'crescent', size: 1.25, color: pal.gold, turn: s * 1.5, life: 3.2, spin: 4 });
      this.sfx('orb'); yield this.t(0.7);
    }
    yield 0.6;
  }

  // ═════════ 스킬 1: 플뢰레 스톰 — 가이드선이 보인 뒤 검날이 가로지른다 ═════════
  *atk_spFlurry() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('fan'); this.glide(0, -6.6, 0.6); yield 0.7;
    for (let cyc = 0; cyc < 5; cyc++) {
      // A) 좌우에서 가로지르는 검날 줄 (틈이 있다)
      const side = cyc % 2 ? -1 : 1, gz = clamp(P.z + rnd(-2, 2), -6, 8);
      for (let z = -9; z <= 10; z += 1.9) {
        if (Math.abs(z - gz) < 1.8) continue;
        G.beams.spawn({ x: -side * 12, z, a: side < 0 ? 0 : Math.PI, w: 0.3, len: 26, warn: 0.7, dur: 0.1, dmg: 0, color: pal.a });
      }
      this.sfx('telegraph'); yield 0.7;
      for (let z = -9; z <= 10; z += 1.9) { if (Math.abs(z - gz) < 1.8) continue; this.shoot({ x: -side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 14, kind: 'blade', size: 1.35, color: pal.b }); }
      this.sfx('fan', { pitch: 1.4 });
      // B) 조준 연사
      for (let k = 0; k < 3; k++) { this.fan(this.n(3, 2), 0.3, this.lead(0.45), { kind: 'blade', speed: 12, size: 1.3, color: pal.c }); this.glide(rnd(-6, 6), rnd(-8, -5), 0.35); yield this.t(0.55); }
      yield 0.5;
    }
  }

  // ═════════ 3번째 패턴: 에클레르 — 10초간 버텨야 하는 연속 검섬 ═════════
  *atk_spSlashStorm() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('teleport', 0); this.alphaT = 0; G.ui.warn('에클레르 — 10초간 버텨내세요!', 1700); this.sfx('laugh', { pitch: 1.3, vol: 0.5 });
    yield 0.7;
    let t = 0, acc = 0;
    const per = [1, 3, 4, 5][this.D.lv] ?? 3; // 이지는 한 자리에 탄 1개, 이후 점점 많이
    while (true) {
      const dt = yield 0; t += dt; acc += dt;
      const prog = clamp(t / 9.3, 0, 1), interval = (0.95 - 0.7 * prog) / Math.sqrt(this.rate), warn = 0.62 - 0.4 * prog;
      while (acc >= interval) {
        acc -= interval;
        const px = clamp(P.x + (P.vx || 0) * 0.45, -9, 9), pz = clamp(P.z + (P.vz || 0) * 0.45, -8, 8.5), a = rnd(0, Math.PI);
        const x0 = px - Math.cos(a) * 15, z0 = pz - Math.sin(a) * 15, nb = Math.max(1, Math.round(per * (this.D.lv === 0 ? 1 : 0.7 + prog * 1.6)));
        this.beam(x0, z0, a, { w: 1.05, len: 30, warn, dur: 0.1, color: pal.b, onFire: () => {
          for (let i = 0; i < nb; i++) {
            const d = 3 + (nb === 1 ? 12 : (i + 0.5) * (24 / nb)) + rnd(-1, 1);
            this.G.bullets.spawn({ owner: 'boss', kind: 'blade', x: x0 + Math.cos(a) * d, z: z0 + Math.sin(a) * d, a: a + (i % 2 ? 1 : -1) * Math.PI / 2, speed: 2.4 * this.spd, size: 1.3, color: pal.c, life: 4, arm: 0.35 });
          }
        } });
        this.sfx('beam_charge', { pitch: 1.6 + prog * 0.5, vol: 0.5 });
      }
    }
  }

  // ═════════ 통상 2: 바게트 돌격 ═════════
  *atk_baguetteRush() {
    const pal = this.pal;
    this.cast('fan');
    for (let r = 0; r < 4; r++) {
      const side = r % 2 ? -1 : 1;
      this.glide(-side * 7.5, rnd(-7.5, -4.5), 0.45); yield 0.55;
      this.glide(side * 7.5, rnd(-7.5, -4.5), 1.0);
      for (let k = 0; k < 9; k++) { this.shoot({ a: this.aim() + rnd(-0.1, 0.1), speed: 11.5, kind: 'blade', size: 1.35, color: pal.gold }); this.sfx('fan', { pitch: 1.4, vol: 0.5 }); yield 0.1; }
      yield this.t(0.7);
    }
    yield 0.4;
  }

  // ═════════ 라스트: 비브 라 레볼뤼시옹 — 삼색(청·백·적)의 검 ═════════
  *atk_spRevolution() {
    const G = this.G, pal = this.pal, TRI = [0x4f86ff, 0xffffff, 0xff4f5f];
    this.cast('moon_throw'); G.ui.warn('VIVA LA FRANCE!', 1500); this.glide(0, -6.6, 0.7); yield 1.0;
    while (true) {
      // 삼색 고리
      for (let r = 0; r < 3; r++) { this.ring(this.n(18, 10), { a0: r * 0.17, kind: 'orb', speed: 8.4, size: 1.0, color: TRI[r] }); this.sfx('orb', { pitch: 1.2 }); yield this.t(0.32); }
      yield 0.6;
      // 삼색 검 부채
      for (let k = 0; k < 4; k++) { for (let c = 0; c < 3; c++) this.fan(this.n(3, 2), 0.22, this.lead(0.5) + (c - 1) * 0.25, { kind: 'blade', speed: 12 + c * 0.6, size: 1.35, color: TRI[c] }); this.sfx('fan', { pitch: 1.3 }); this.glide(rnd(-6.5, 6.5), rnd(-8, -4.5), 0.35); yield this.t(0.6); }
      // 돌진
      for (let p = 0; p < 3; p++) {
        this.glide(rnd(-6.5, 6.5), rnd(-7.5, -4), 0.35); yield 0.4;
        const a = this.aim(); this.beam(this.x, this.z, a, { w: 1.1, len: 30, warn: 0.45, dur: 0.12, color: pal.c }); this.sfx('beam_charge', { pitch: 1.4 }); yield 0.45;
        this.kick(Math.cos(a) * 2.2, Math.sin(a) * 2.2); this.fan(5, 0.5, a, { kind: 'blade', speed: 13, size: 1.4, color: pal.b }); yield this.t(0.45);
      }
      yield 0.4;
    }
  }
}
