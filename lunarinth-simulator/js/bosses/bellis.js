// STAGE 5 — 벨리스: 결함을 기록하는 냉철한 감사관 (마도서술사 · 비전 / 환영 / 봉인).
// 룬 문자 탄(glyph), 마법진, 구속(이동 둔화), 방어막(리젝트), 그리고 "분석률"이 핵심이다.
// 분석률은 시간·그레이즈·궁극기 사용으로 쌓이고, 라스트 스킬 「파이널 베리딕트」의 위력에 비례해 반영된다.
import { Boss, TAU, rnd, clamp } from '../boss.js';

const PAL = { a: 0xc89bff, b: 0xa66bff, c: 0xffffff, glow: 0xb06bff, gold: 0xffd36b };

export const BELLIS = {
  id: 'bellis', name: '벨리스', en: 'BELLIS', epithet: '결함을 기록하는 냉철한 감사관',
  h: 4.9, hitR: 1.4, barkKey: 'bellis', pal: PAL, decoyColor: 0xd8b8ff, decoyBullet: 0xc89bff,
  hpMul: 0.8, theme: 'arcane', music: 'bellis', hasAnalysis: true, analysisRate: 0.9,
  forms: {
    audit: { label: '감사 형태', sub: '분석 · 검수', tint: [1, 1, 1] },
    script: { label: '서술 형태', sub: '마법 필기구로 쓰는 술식', tint: [1.02, 0.98, 1.08] },
    seal: { label: '봉인 형태', sub: '구속 · 무효화', tint: [0.95, 0.92, 1.1] },
    verdict: { label: '판결 형태', sub: '최종 판결 — 축적된 분석에 비례', tint: [1.1, 1.02, 1.15] },
  },
  steps: [
    { kind: 'nonspell', name: '검수 개시', form: 'audit', hp: 900, time: 40, attacks: ['stampLines', 'ruleCircle', 'redPen'], idle: 1.0, ultMode: 'normal' },
    { kind: 'spell', tag: '분석', name: '아카식 오디트', form: 'audit', hp: 1150, time: 52, attacks: ['spAudit'], idle: 0.8, ultMode: 'normal' },
    { kind: 'nonspell', name: '즉석 술식', form: 'script', hp: 950, time: 42, attacks: ['polyBloom', 'penStroke', 'glyphRain'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '필사', name: '아케인 스크립트', form: 'script', hp: 1200, time: 54, attacks: ['spScript'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '봉인', name: '리젝트', form: 'seal', hp: 1250, time: 58, attacks: ['spReject'], idle: 0.8, ultMode: 'reject' },
    { kind: 'last', tag: '최종 판결', name: '파이널 베리딕트', form: 'verdict', hp: 2300, time: 80, attacks: ['spVerdict'], idle: 0.8, ultMode: 'reject', pre: 'verdictCard' },
  ],
};

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

export class Bellis extends Boss {
  constructor(scene, T, tex, aspect, G) { super(scene, T, tex, aspect, G, BELLIS); }

  addAnalysis(v) { this.analysis = Math.min(100, this.analysis + v); }
  /** 분석률에 비례한 증폭 (라스트 스킬에서 사용). 1.0 ~ 1.35 */
  get amp() { return 1 + (this.analysis / 100) * 0.35; }
  onGraze() { this.addAnalysis(0.25); }

  // ═════════ 통상 1: 검수 개시 ═════════
  *atk_stampLines() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6, 0.7); yield 0.6;
    const dur = 5.2, arms = this.n(4, 2), dir = Math.random() < 0.5 ? -1 : 1;
    let t = 0, a = rnd(0, TAU), acc = 0;
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt; a += dir * dt * 1.15;
      const step = this.t(0.12);
      while (acc >= step) {
        acc -= step;
        for (let k = 0; k < arms; k++) this.shoot({ a: a + (k * TAU) / arms, speed: 5, kind: 'glyph', size: 1.0, color: k % 2 ? pal.a : pal.b });
      }
    }
    yield 0.8;
  }

  *atk_ruleCircle() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.7); yield 0.7;
    const n = 9 + (this.lv(2) ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), r = i % 3 === 0 ? 0.3 : rnd(1.5, 5);
      this.zone(P.x + Math.cos(a) * r, P.z + Math.sin(a) * r, 2.0, {
        warn: 1.0, dur: 0.28, color: pal.a,
        onBoom: (zz) => { const k = this.n(8, 5), a0 = rnd(0, TAU); for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: a0 + (j * TAU) / k, speed: 4.2 * this.spd, size: 1.0, color: pal.c }); },
      });
      this.sfx('telegraph', { pan: G.audio.pan(P.x) });
      yield this.t(0.34);
    }
    yield 1.4;
  }

  *atk_redPen() {
    const pal = this.pal;
    this.cast('fan'); this.glide(0, -6.4, 0.7); yield 0.6;
    const vols = 6 + (this.lv(2) ? 2 : 0);
    for (let v = 0; v < vols; v++) {
      const a = this.aim(), off = v % 2 ? 0.55 : -0.55;
      this.fan(this.n(5, 3), 1.0, a + off, { kind: 'glyph', speed: 6.6, size: 1.0, color: pal.b });
      this.fan(this.n(5, 3), 1.0, a - off, { kind: 'glyph', speed: 6.6, size: 1.0, color: pal.a });
      this.sfx('fan');
      yield this.t(0.62);
    }
    yield 0.6;
  }

  // ═════════ 스킬 1: 분석「아카식 오디트」 ═════════
  // 확산하는 스캔 링, 좌→우로 지나가는 스캔 빔, 플레이어 위치를 검증하는 구역.
  *atk_spAudit() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.8, 0.8); G.ui.warn('분석 개시 — 분석률 상승', 1400); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      // A) 스캔 링 (틈이 있다)
      for (let r = 0; r < 3; r++) {
        const n = this.n(32, 18), gap = this.aim() + rnd(-0.8, 0.8);
        for (let i = 0; i < n; i++) {
          const ang = (i * TAU) / n;
          if (angDiff(ang, gap) < 0.3) continue;
          this.shoot({ a: ang, speed: 4.4, kind: 'glyph', size: 1.0, color: r % 2 ? pal.a : pal.b });
        }
        this.addAnalysis(1.5); this.sfx('orb');
        yield this.t(0.65);
      }
      // B) 스캔 빔: 한쪽에서 반대쪽으로 순서대로
      const dir = cyc % 2 ? -1 : 1, cnt = 9;
      for (let k = 0; k < cnt; k++) {
        const x = dir * (-9 + k * 2.25);
        this.beam(x, -11, Math.PI / 2, { w: 1.2, len: 26, warn: 0.6, dur: 0.18, color: pal.c });
        this.addAnalysis(0.6);
        yield this.t(0.3);
      }
      yield 0.6;
      // C) 검증 구역: 플레이어 위치를 연달아 확인
      for (let i = 0; i < 3 + (this.lv(2) ? 1 : 0); i++) {
        this.zone(P.x, P.z, 1.9, {
          warn: 0.95, dur: 0.28, color: pal.gold,
          onBoom: (zz) => { const k = this.n(10, 6); this.G.fx.ring(zz.x, 0.3, zz.z, pal.gold, 7, 0.5); for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: (j * TAU) / k + zz.x, speed: 4.4 * this.spd, size: 1.0, color: pal.c }); },
        });
        this.sfx('telegraph');
        yield this.t(0.7);
      }
      yield 0.7;
    }
    yield 0.4;
  }

  // ═════════ 통상 2: 즉석 술식 ═════════
  *atk_polyBloom() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.2, 0.7); yield 0.7;
    const rounds = 6;
    for (let r = 0; r < rounds; r++) {
      const sides = r % 2 ? 5 : 6;
      this.poly(this.x, this.z, sides, 1.4, r * 0.31, this.n(4, 2), { kind: 'glyph', speed: 3.6, size: 1.0, color: r % 2 ? pal.a : pal.b, accel: 0.5, maxS: 6 });
      this.fan(this.n(3, 1), 0.6, this.aim(), { kind: 'orb', speed: 6.4, size: 1.0, color: pal.c });
      this.sfx('orb'); this.G.fx.ring(this.x, this.bobY, this.z, pal.b, 5, 0.4);
      yield this.t(0.78);
    }
    yield 1.0;
  }

  /** 마법 펜이 허공에 선을 긋는다: 선이 완성되면 플레이어를 향해 쏟아진다 */
  *atk_penStroke() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(rnd(-3, 3), -6.4, 0.7); yield 0.7;
    const strokes = 3 + (this.lv(2) ? 1 : 0);
    for (let s = 0; s < strokes; s++) {
      const y = rnd(-8, 0), x0 = -9, x1 = 9, flip = s % 2;
      this.line(flip ? x1 : x0, y, flip ? x0 : x1, y + rnd(-3, 3), this.n(14, 8), { kind: 'glyph', size: 0.95, color: s % 2 ? pal.a : pal.b, speed: 6.0, reaim: true, hold: 1.5, delay: 0.1, life: 12 });
      this.sfx('telegraph');
      yield this.t(0.9);
    }
    yield 1.6; void G;
  }

  *atk_glyphRain() {
    const pal = this.pal;
    this.cast('dark'); this.glide(0, -6.5, 0.7); yield 0.6;
    const n = this.n(40, 22);
    for (let i = 0; i < n; i++) {
      this.shoot({ x: rnd(-9.5, 9.5), z: -11, a: Math.PI / 2 + rnd(-0.12, 0.12), speed: rnd(4.2, 7.0), kind: 'glyph', size: 1.0, color: i % 3 ? pal.a : pal.c });
      if (i % 8 === 0) this.shoot({ a: this.aim(), speed: 7, kind: 'orb', size: 1.1, color: pal.b });
      yield this.t(0.13);
    }
    yield 1.0;
  }

  // ═════════ 스킬 2: 필사「아케인 스크립트」 ═════════
  // 즉석에서 쓰는 세 종류의 마법진: 구속(이동 둔화), 탄막, 폭발.
  *atk_spScript() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      const binds = 2 + (this.lv(2) ? 1 : 0);
      for (let i = 0; i < binds; i++) this.zone(clamp(P.x + rnd(-4, 4), -8, 8), clamp(P.z + rnd(-3, 3), -6, 8.5), 3.2, { kind: 'bind', warn: 0.6, dur: 4.8, color: pal.a });
      G.ui.warn('구속진 전개 — 안에서는 이동이 둔해집니다', 1500); this.sfx('veil');
      yield 0.9;
      for (let k = 0; k < 6; k++) {
        this.ring(this.n(14, 8), { a0: k * 0.32, kind: 'glyph', speed: 3.6, size: 1.05, color: k % 2 ? pal.c : pal.a });
        this.fan(this.n(5, 3), 1.2, this.aim(), { kind: 'orb', speed: 5.6, size: 1.0, color: pal.b });
        this.sfx('orb'); yield this.t(0.55);
      }
      for (let k = 0; k < 3 + (this.lv(2) ? 1 : 0); k++) {
        this.zone(P.x, P.z, 2.0, { warn: 0.9, dur: 0.3, color: pal.gold, onBoom: (zz) => { const n = this.n(10, 6); for (let j = 0; j < n; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: (j * TAU) / n, speed: 4.6 * this.spd, size: 1.0, color: pal.c }); } });
        this.sfx('telegraph'); yield this.t(0.55);
      }
      yield 1.0;
    }
    yield 0.4;
  }

  // ═════════ 스킬 3: 봉인「리젝트」 ═════════
  // 방어막(공격 무효) → 해제(약점 노출) → 샷 봉인의 순환. 궁극기는 무효화된다.
  *atk_spReject() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 1.0;
    for (let cyc = 0; cyc < 4; cyc++) {
      // A) 방어막: 보스는 무적, 대신 중탄막
      this.shield = true; G.ui.warn('리젝트 — 방어막 전개 (공격 무효)', 1500); this.sfx('veil');
      const dur = 3.0; let t = 0, a = rnd(0, TAU), acc = 0, dir = 1;
      while (t < dur) {
        const dt = yield 0; t += dt; acc += dt; a += dir * dt * 1.4;
        if (t > dur / 2 && dir === 1) dir = -1;
        const step = this.t(0.11);
        while (acc >= step) { acc -= step; for (let k = 0; k < 3; k++) this.shoot({ a: a + (k * TAU) / 3, speed: 5.0, kind: 'glyph', size: 1.0, color: k % 2 ? pal.a : pal.c }); }
      }
      this.shield = false; G.ui.warn('방어막 해제 — 지금입니다!', 1000); this.sfx('cast');
      // B) 약점 노출: 가벼운 패턴 (피해를 줄 기회)
      for (let k = 0; k < 4; k++) { this.fan(this.n(7, 3), 1.4, this.aim(), { kind: 'orb', speed: 5.4, size: 1.0, color: pal.b }); this.sfx('fan'); yield this.t(0.78); }
      // C) 샷 봉인: 예고 후 일정 시간 샷을 쏠 수 없다
      G.ui.warn('리젝트 — 샷 봉인!', 1300); this.sfx('beam_charge');
      const seal = this.zone(P.x, P.z, 1.2, { kind: 'bind', warn: 0.2, dur: 1.6, color: pal.gold }); void seal;
      yield 1.3;
      P.sealT = 1.7; G.ui.flash('#c89bff', 400, 0.4);
      for (let k = 0; k < 4; k++) {
        this.ring(this.n(18, 10), { a0: k * 0.2, kind: 'glyph', speed: 4.2, size: 1.0, color: k % 2 ? pal.a : pal.c });
        this.fan(this.n(3, 2), 0.4, this.aim(), { kind: 'orb', speed: 7, size: 1.0, color: pal.b });
        this.sfx('orb'); yield this.t(0.42);
      }
      yield 0.6;
    }
  }

  // ═════════ 라스트 스킬: 최종 판결「파이널 베리딕트」 ═════════
  // 거대한 보랏빛 마법진. 분석률(this.amp)에 비례해 탄 수·탄속이 증가한다.
  *atk_spVerdict() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.6, 1.0); G.ui.warn(`판결 개시 — 분석률 ${Math.round(this.analysis)}%`, 1800); yield 1.4;
    for (let cyc = 0; cyc < 6; cyc++) {
      const amp = this.amp;
      // A) 심판의 마법진: 플레이어 발밑에 거대한 진 + 회전 룬
      this.zone(P.x, P.z, 4.8, {
        warn: 2.2, dur: 0.45, color: pal.a,
        onBoom: (zz) => {
          const n = Math.round(this.n(26, 14) * amp);
          for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: k % 2 ? 'glyph' : 'orb', x: zz.x, z: zz.z, a: (k * TAU) / n, speed: 5.4 * this.spd * (0.9 + amp * 0.1), size: 1.05, color: k % 2 ? pal.c : pal.a });
          G.world.shake(0.8, 0.5); G.audio.sfx.play('moon_impact', { vol: 0.8 }); G.ui.flash('#c89bff', 350, 0.4);
        },
      });
      this.sfx('veil');
      { const dur = 2.2; let t = 0, a = rnd(0, TAU), acc = 0;
        while (t < dur) {
          const dt = yield 0; t += dt; acc += dt; a += dt * 1.6;
          const step = this.t(0.14) / amp;
          while (acc >= step) { acc -= step; for (let k = 0; k < 3; k++) this.shoot({ a: a + (k * TAU) / 3, speed: 4.6, kind: 'glyph', size: 1.0, color: pal.b }); }
        } }
      yield 0.5;
      // B) 일곱 개의 봉인: 칠각 외곽선이 회전하며 퍼진다
      for (let r = 0; r < 4; r++) {
        this.poly(this.x, this.z, 7, 1.6, r * 0.22, Math.round(this.n(3, 2) * amp), { kind: 'glyph', speed: 3.4, size: 1.0, color: r % 2 ? pal.a : pal.c, accel: 0.7, maxS: 6.5 });
        this.fan(this.n(4, 2), 0.5, this.aim(), { kind: 'orb', speed: 7, size: 1.0, color: pal.b });
        this.sfx('orb'); yield this.t(0.72);
      }
      // C) 판결의 선: 세로 빔 → 가로 빔 (틈이 있다)
      const gx = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let k = -4; k <= 4; k++) { const x = gx + k * 2.4; if (Math.abs(x - gx) < 1.5 || Math.abs(x) > 10) continue; this.beam(x, -11, Math.PI / 2, { w: 1.3, len: 26, warn: 1.3, dur: 0.3, color: pal.c }); }
      this.sfx('beam_charge'); yield 1.5;
      const gz = clamp(P.z + rnd(-2, 2), -4, 8);
      for (let k = -4; k <= 4; k++) { const z = gz + k * 2.4; if (Math.abs(z - gz) < 1.5 || z < -9 || z > 10) continue; this.beam(-11, z, 0, { w: 1.3, len: 26, warn: 1.2, dur: 0.3, color: pal.c }); }
      yield 1.4;
      // D) 링 폭풍
      for (let r = 0; r < 5; r++) {
        const n = Math.round(this.n(30, 16) * amp), gap = this.aim();
        for (let i = 0; i < n; i++) { const ang = (i * TAU) / n; if (angDiff(ang, gap) < 0.26 + 0.06 * (1 - r / 5)) continue; this.shoot({ a: ang, speed: 4.4 + r * 0.25, kind: r % 2 ? 'glyph' : 'orb', size: 1.0, color: r % 2 ? pal.c : pal.a }); }
        this.sfx('orb'); yield this.t(0.5);
      }
      yield 0.8;
    }
  }
}
