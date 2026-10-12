// STAGE 1 — 옵서: 별을 겨누는 무심한 관측관.
// 별 모양 탄과 조준선(빔)이 중심. 예측 사격과 "사각"(플레이어의 뒤쪽)에서 오는 공격이 특징이다.
// 기술명(아스트랄 옵저베이션 / 스타라이트 캐논 / 데드 앵글)은 제공된 설정, 패턴은 이 게임의 창작이다.
import { Boss, TAU, rnd, clamp } from '../boss.js';

const PAL = { a: 0xcfe0ff, b: 0x9cc3ff, c: 0xffffff, glow: 0x7fa8ff };

export const OPSIR = {
  id: 'opsir', name: '옵서', en: 'OPSIR', epithet: '별을 겨누는 무심한 관측관',
  h: 5.0, hitR: 1.45, barkKey: 'opsir', pal: PAL, decoyColor: 0xcfe0ff,
  hpMul: 0.55, theme: 'astral', music: 'opsir',
  forms: {
    scout: { label: '정찰 형태', sub: '관측대 위의 사수', tint: [1, 1, 1] },
    observe: { label: '관측 형태', sub: '별자리를 읽는 눈', tint: [0.96, 1, 1.08] },
    aim: { label: '조준 형태', sub: '사각을 찾는 눈', tint: [1.05, 0.98, 1] },
    cannon: { label: '포격 형태', sub: '별빛을 응축한 렌즈', tint: [1.1, 1.08, 1.12] },
  },
  steps: [
    { kind: 'nonspell', name: '정찰 사격', form: 'scout', hp: 600, time: 38, attacks: ['scoutFire', 'starRing', 'strafe'], idle: 1.1, ultMode: 'normal' },
    { kind: 'spell', tag: '천체 관측', name: '아스트랄 옵저베이션', form: 'observe', hp: 800, time: 48, attacks: ['spObserve'], idle: 0.8, ultMode: 'normal' },
    { kind: 'nonspell', name: '사각 포착', form: 'aim', hp: 650, time: 40, attacks: ['leadShots', 'blindSide', 'strafe'], idle: 1.0, ultMode: 'normal' },
    { kind: 'spell', tag: '사각 관측', name: '데드 앵글', form: 'aim', hp: 850, time: 50, attacks: ['spDeadAngle'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '성광 포격', name: '스타라이트 캐논', form: 'cannon', hp: 1000, time: 56, attacks: ['spCannon'], idle: 0.8, ultMode: 'normal' },
  ],
};

export class Opsir extends Boss {
  constructor(scene, T, tex, aspect, G) { super(scene, T, tex, aspect, G, OPSIR); }

  // ═════════ 통상 1: 정찰 사격 ═════════
  *atk_scoutFire() {
    const G = this.G, pal = this.pal;
    this.cast('fan'); this.glide(rnd(-5, 5), -6.3, 0.7); yield 0.6;
    const vols = 5 + (this.lv(2) ? 2 : 0);
    for (let v = 0; v < vols; v++) {
      const a = this.aim();
      this.fan(this.n(3, 2), 0.34, a, { kind: 'star', speed: 9.5, size: 1.15, color: pal.c });
      this.fan(this.n(5, 3), 1.5, a, { kind: 'orb', speed: 4.6, size: 0.9, color: pal.b });
      this.sfx('fan'); G.fx.ring(this.x, this.bobY, this.z, pal.b, 4, 0.35);
      if (v % 2) this.glide(rnd(-6, 6), rnd(-7.5, -5), 0.7);
      yield this.t(0.75);
    }
    yield 0.5;
  }

  *atk_starRing() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6, 0.7); yield 0.6;
    const rings = 5 + (this.lv(2) ? 1 : 0);
    for (let r = 0; r < rings; r++) {
      this.ring(this.n(16, 8), { a0: r * 0.2, kind: 'star', speed: 4.2, size: 1.0, color: r % 2 ? pal.a : pal.c, accel: 0.6, maxS: 7 });
      this.fan(2, 0.25, this.aim(), { kind: 'orb', speed: 6.2, size: 1.0, color: pal.b });
      this.sfx('orb'); yield this.t(0.6);
    }
    yield 1.0;
  }

  *atk_strafe() {
    const pal = this.pal, dir = Math.random() < 0.5 ? -1 : 1;
    this.cast('cast'); this.glide(-dir * 7, -6.5, 0.6); yield 0.8;
    const dur = 3.4; let t = 0, acc = 0;
    this.glide(dir * 7, -5.8, dur);
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt;
      const step = this.t(0.13);
      while (acc >= step) {
        acc -= step;
        this.shoot({ a: this.aim() + rnd(-0.12, 0.12), speed: 7.4, kind: 'star', size: 1.0, color: pal.c });
        if (this.lv(2) && Math.random() < 0.4) this.shoot({ a: this.aim() + rnd(-0.9, 0.9), speed: 5.2, kind: 'orb', size: 0.9, color: pal.a });
      }
    }
    this.sfx('fan');
    yield 0.6;
  }

  // ═════════ 스킬 1: 천체 관측「아스트랄 옵저베이션」 ═════════
  // 별자리(정지한 별과 선)가 하나씩 그려지고, 잠시 뒤 별은 플레이어를 향해 날아오고 선은 옆으로 흘러간다.
  *atk_spObserve() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.8, 0.8); yield 0.9;
    for (let cyc = 0; cyc < 3; cyc++) {
      const pn = 5 + (this.lv(2) ? 1 : 0) + (cyc === 2 ? 1 : 0), cx = clamp(P.x * 0.5, -3, 3), cz = rnd(0, 3);
      const base = rnd(0, TAU), pts = [];
      for (let i = 0; i < pn; i++) {
        const a = base + (i * TAU) / pn + rnd(-0.25, 0.25), r = rnd(4.2, 7.4);
        pts.push([clamp(cx + Math.cos(a) * r, -9, 9), clamp(cz + Math.sin(a) * r * 0.9, -7.5, 9)]);
      }
      const H = 3.0, stag = 0.2;
      for (let i = 0; i < pn; i++) {
        G.bullets.spawn({ owner: 'boss', kind: 'star', x: pts[i][0], z: pts[i][1], a: 0, speed: 6.4 * this.spd, size: 1.7, color: pal.c, hold: H - i * stag, delay: i * stag, reaim: true, life: 12 });
        if (i < pn - 1) {
          const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], ang = Math.atan2(z1 - z0, x1 - x0) + (i % 2 ? Math.PI / 2 : -Math.PI / 2);
          this.line(x0, z0, x1, z1, this.n(7, 4), { kind: 'orb', size: 0.8, color: pal.a, speed: 2.8, a: ang, hold: H - i * stag, delay: i * stag + 0.1, life: 12 });
        }
        this.sfx('telegraph', { pan: G.audio.pan(pts[i][0]) });
        yield stag;
      }
      // 관측선: 플레이어를 가리키는 가는 빔
      this.beam(this.x, this.z, this.aim(), { w: 1.1, len: 30, warn: 1.0, dur: 0.2, color: pal.c });
      this.sfx('beam_charge');
      yield H - pn * stag + 0.4;
      this.sfx('fan'); G.world.beat(0.5);
      yield this.t(2.0);
    }
    yield 0.8;
  }

  // ═════════ 통상 2: 사각 포착 ═════════
  *atk_leadShots() {
    const pal = this.pal;
    this.cast('fan'); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.6;
    const vols = 6 + (this.lv(2) ? 2 : 0);
    for (let v = 0; v < vols; v++) {
      this.fan(3, 0.22, this.lead(0.75), { kind: 'star', speed: 10.5, size: 1.1, color: pal.c });
      this.fan(this.n(7, 3), 2.0, this.aim(), { kind: 'orb', speed: 4.4, size: 0.9, color: pal.b });
      this.sfx('fan');
      if (v % 3 === 2) this.glide(rnd(-6.5, 6.5), rnd(-7.5, -5), 0.6);
      yield this.t(0.7);
    }
    yield 0.6;
  }

  /** 플레이어의 등 뒤(남쪽)에서 올라오는 별줄기. 곧은 가이드선(무해)이 먼저 보인다. */
  *blindLines(count, warn, perLine) {
    const P = this.G.player, pal = this.pal;
    const xs = [];
    for (let k = 0; k < count; k++) xs.push(clamp(P.x + (k - (count - 1) / 2) * 2.1 + rnd(-0.3, 0.3), -9, 9));
    for (const x of xs) this.beam(x, 11.5, -Math.PI / 2, { w: 0.5, len: 26, warn, dur: 0.12, dmg: 0, quiet: true, color: pal.a });
    this.sfx('beam_charge', { vol: 0.6 });
    yield warn;
    for (const x of xs) for (let j = 0; j < perLine; j++) this.G.bullets.spawn({ owner: 'boss', kind: 'star', x, z: 11.5, a: -Math.PI / 2, speed: 7.8 * this.spd, size: 1.05, color: pal.c, delay: j * 0.13 });
    this.sfx('fan');
  }

  *atk_blindSide() {
    this.cast('beam_charge'); yield 0.5;
    const waves = 4 + (this.lv(2) ? 1 : 0);
    for (let w = 0; w < waves; w++) {
      yield* this.blindLines(this.n(5, 3), 0.9, 4);
      this.fan(this.n(5, 3), 1.3, this.aim(), { kind: 'orb', speed: 4.8, size: 0.95, color: this.pal.b });
      yield this.t(1.1);
    }
    yield 0.5;
  }

  // ═════════ 스킬 2: 사각 관측「데드 앵글」 ═════════
  // 예측 지점에 조준 마크(지뢰)가 깔리고, 등 뒤에서 별줄기가, 좌우에서 탄벽이 조여온다.
  *atk_spDeadAngle() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 0.9;
    for (let cyc = 0; cyc < 3; cyc++) {
      // A) 예측 조준 마크
      const mines = 4 + (this.lv(2) ? 2 : 0);
      for (let i = 0; i < mines; i++) {
        const lt = 0.9, tx = clamp(P.x + (P.vx || 0) * lt, -9, 9), tz = clamp(P.z + (P.vz || 0) * lt, -8, 9);
        this.zone(tx, tz, 1.55, {
          warn: 1.0, dur: 0.25, color: pal.c,
          onBoom: (zz) => { const n = this.n(8, 5), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'star', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 4.6 * this.spd, size: 1.0, color: pal.b }); },
        });
        this.sfx('telegraph', { pan: G.audio.pan(tx) });
        yield this.t(0.4);
      }
      yield 0.5;
      // B) 사각(등 뒤)에서의 별줄기
      yield* this.blindLines(this.n(4, 3), 0.85, 4);
      yield this.t(0.6);
      // C) 좌우 탄벽: 플레이어 높이에 틈을 남긴다
      const gz = clamp(P.z + rnd(-2, 2), -6, 8);
      for (const side of [-1, 1]) {
        for (let z = -9; z <= 10; z += 1.6) {
          if (Math.abs(z - gz) < 1.9) continue;
          G.bullets.spawn({ owner: 'boss', kind: 'orb', x: side * 11.5, z, a: side < 0 ? 0 : Math.PI, speed: 5.4 * this.spd, size: 1.1, color: pal.a });
        }
      }
      this.sfx('orb');
      this.fan(this.n(5, 3), 0.9, this.lead(0.8), { kind: 'star', speed: 9, size: 1.1, color: pal.c });
      yield this.t(1.6);
    }
    yield 0.6;
  }

  // ═════════ 스킬 3: 성광 포격「스타라이트 캐논」 ═════════
  *atk_spCannon() {
    const G = this.G, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.8); yield 1.0;
    let cyc = 0;
    for (; cyc < 4; cyc++) {
      // A) 차선 빔: 틈이 있는 부채꼴
      const n = this.n(5, 3), a0 = this.aim(), sp = 0.55;
      for (let k = 0; k < n; k++) {
        const ang = a0 + (k - (n - 1) / 2) * sp + (cyc % 2 ? sp / 2 : 0);
        this.beam(this.x, this.z, ang, { w: 1.5, len: 32, warn: 1.3, dur: 0.35, color: pal.b });
      }
      this.sfx('beam_charge');
      yield 1.3;
      this.kick(Math.cos(a0) * 1.6, Math.sin(a0) * 1.6);
      this.ring(this.n(18, 10), { kind: 'star', speed: 5, size: 1.0, color: pal.c });
      G.world.beat(0.8);
      yield this.t(0.6);
      // B) 정밀 포격: 위치를 바꾸고 플레이어를 직접 겨눈다
      this.glide(rnd(-6, 6), rnd(-7.5, -5.5), 0.6); yield 0.6;
      const a = this.aim();
      this.beam(this.x, this.z, a, { w: 2.8, len: 32, warn: 1.0, dur: 0.4, color: pal.c });
      if (this.lv(2)) { this.beam(this.x, this.z, a + 0.7, { w: 1.6, len: 32, warn: 1.0, dur: 0.4, color: pal.b }); this.beam(this.x, this.z, a - 0.7, { w: 1.6, len: 32, warn: 1.0, dur: 0.4, color: pal.b }); }
      this.sfx('beam_charge');
      yield 1.0;
      this.fan(this.n(9, 5), 1.6, a, { kind: 'star', speed: 6.5, size: 1.1, color: pal.c });
      this.fan(this.n(5, 3), 0.8, a, { kind: 'orb', speed: 8.5, size: 1.0, color: pal.a });
      yield this.t(0.9);
      // C) 별 비
      const rain = this.n(10, 5);
      for (let i = 0; i < rain; i++) { this.shoot({ x: rnd(-9, 9), z: -10.5, a: Math.PI / 2 + rnd(-0.15, 0.15), speed: rnd(4.5, 6.5), kind: 'star', size: 1.0, color: pal.c }); yield this.t(0.1); }
      yield 0.5;
    }
  }
}
