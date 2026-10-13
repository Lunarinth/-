// STAGE 5 — 벨리스: 결함을 기록하는 냉철한 감사관 (마도서술사 · 비전 / 환영 / 봉인).
// 시그니처: ① 플레이어를 따라다니다 굳어서 터지는 "표식" 마법진 ② 줄 지어 흘러가는 글줄 탄 ③ 설치했다가 가동하는 마법진 ④ 반려 인장(방어막)과 먹물 봉인.
// 분석률은 시간·그레이즈·궁극기 사용으로 쌓이고, 라스트 「파이널 베리딕트」의 위력에 비례해 반영된다.
import * as THREE from '../../vendor/three.module.min.js';
import { Boss, TAU, rnd, clamp } from '../boss.js';

const PAL = { a: 0xc89bff, b: 0xa66bff, c: 0xffffff, glow: 0xb06bff, gold: 0xffd36b };

/** 보통 난이도에서 처치까지 걸리는 시간이 제한시간의 일정 비율이 되도록 hp 를 정한다 (실효 체력 = hp × hpMul × 2.2, 화력 85/s) */
const FR = { n: 0.41, s: 0.46, l: 0.51 };
const HPK = (kind, time, mul, adj = 1) => Math.round((FR[kind] * adj * time * 85) / (2.2 * mul));
const MUL = 1.0, MMUL = 0.55;

export const BELLIS = {
  id: 'bellis', name: '벨리스', en: 'BELLIS', epithet: '결함을 기록하는 냉철한 감사관',
  h: 4.9, hitR: 1.4, barkKey: 'bellis', pal: PAL, decoyColor: 0xd8b8ff, decoyBullet: 0xc89bff,
  hpMul: MUL, theme: 'arcane', music: 'bellis', hasAnalysis: true, analysisRate: 0.9,
  forms: {
    audit: { label: '감사 형태', sub: '분석 · 검수', tint: [1, 1, 1] },
    script: { label: '서술 형태', sub: '마법 필기구로 쓰는 술식', tint: [1.02, 0.98, 1.08] },
    seal: { label: '봉인 형태', sub: '구속 · 반려', tint: [0.95, 0.92, 1.1] },
    verdict: { label: '판결 형태', sub: '최종 판결 — 기록된 결함에 비례', tint: [1.1, 1.02, 1.15] },
  },
  steps: [
    { kind: 'nonspell', name: '검수 개시', form: 'audit', hp: HPK('n', 40, MUL), time: 40, attacks: ['stampLines', 'ruleCircle', 'redPen'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '분석', name: '아카식 오디트', form: 'audit', hp: HPK('s', 52, MUL), time: 52, attacks: ['spAudit'], idle: 0.7, ultMode: 'normal' },
    { kind: 'nonspell', name: '즉석 술식', form: 'script', hp: HPK('n', 42, MUL), time: 42, attacks: ['polyBloom', 'penStroke', 'glyphRain'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '필사', name: '아케인 스크립트', form: 'script', hp: HPK('s', 54, MUL), time: 54, attacks: ['spScript'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '봉인', name: '리젝트', form: 'seal', hp: HPK('s', 58, MUL), time: 58, attacks: ['spReject'], idle: 0.7, ultMode: 'reject' },
    { kind: 'last', tag: '최종 판결', name: '파이널 베리딕트', form: 'verdict', hp: HPK('l', 80, MUL), time: 80, attacks: ['spVerdict'], idle: 0.7, ultMode: 'reject', pre: 'verdictCard' },
  ],
};

// 쓰러진 벨리스 뒤로 루나린스의 잔상이 나타나 힘을 건넨다: 20초 동안 계속 바뀌는 패턴을 버티는 시련 (무적, 체력 5 고정). 쓰러져도 시련은 끝나고 다음으로 넘어간다
BELLIS.steps.push({ kind: 'last', tag: '신탁', name: '빌려온 달', form: 'verdict', time: 20, attacks: ['spProxy'], hp: 5, fixedHp: 5, idle: 0, ultMode: 'immune', endure: true, fake: 'bellis' });

// 6스테이지 중간 보스로 다시 나타난 벨리스: 통상 1개 + (하드 이상) 스킬 1개
export const BELLIS_MID = {
  ...BELLIS, music: 'midboss', hpMul: MMUL, epithet: '문 앞의 감사관',
  allSteps: [
    { kind: 'nonspell', name: '검수 개시', form: 'audit', hp: HPK('n', 36, MMUL, 0.85), time: 36, attacks: ['stampLines', 'ruleCircle', 'redPen'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '필사', name: '아케인 스크립트', form: 'script', hp: HPK('s', 46, MMUL, 0.85), time: 46, attacks: ['spScript'], idle: 0.7, ultMode: 'normal', minLv: 2 },
  ],
  steps: [],
};

const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return Math.abs(d); };

export class Bellis extends Boss {
  constructor(scene, T, tex, aspect, G, def = BELLIS) { super(scene, T, tex, aspect, G, def); this.marks = []; }

  /** 루나린스의 잔상: 벨리스 뒤에 겹쳐 보인다 */
  renderExtra(dt, t, px, pz, visible) {
    const on = this.step && this.step.fake === 'bellis' && this.state !== 'idle';
    if (!this.ghost) {
      const src = this.G.bosses.lunarinth; if (!src) return;
      this.ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: src.mat.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: 0xcfc0ff }));
      this.ghost.renderOrder = 4; this.scene.add(this.ghost); this.ghostAspect = src.aspect;
    }
    this._gv = (this._gv || 0) + (((on || this.ghostForce) && visible ? 1 : 0) - (this._gv || 0)) * Math.min(1, dt * 3);
    this.ghost.visible = this._gv > 0.02;
    if (this.ghost.visible) {
      const h = this.h * 1.45, w = h * this.ghostAspect;
      this.ghost.position.set(px + Math.sin(t * 0.8) * 0.5, this.bobY + 0.5, pz - 0.6); this.ghost.scale.set(w, h, 1); this.ghost.material.opacity = this._gv * (0.4 + Math.sin(t * 2) * 0.08);
    }
  }
  addAnalysis(v) { this.analysis = Math.min(100, this.analysis + v); }
  /** 분석률에 비례한 증폭 (라스트에서 사용). 1.0 ~ 1.35 */
  get amp() { return 1 + (this.analysis / 100) * 0.35; }
  onGraze() { this.addAnalysis(0.25); }
  onCancel() { this.marks = []; }

  /** 표식: 플레이어를 따라다니던 마법진이 굳어서(lock) 잠시 뒤 터진다. */
  mark(x, z, { r = 2.0, track = 1.0, warn = 1.6, onBoom } = {}) {
    const zz = this.zone(x, z, r, { warn, dur: 0.3, color: this.pal.gold, onBoom });
    if (zz) this.marks.push({ z: zz, track, locked: false });
    return zz;
  }
  update(dt) {
    super.update(dt);
    const P = this.G.player;
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i], z = m.z;
      if (!z.active || z.state !== 0) { this.marks.splice(i, 1); continue; }
      if (z.t < m.track) {
        const dx = P.x - z.x, dz = P.z - z.z, d = Math.hypot(dx, dz) || 1, st = Math.min(d, 5.4 * dt);
        z.x += (dx / d) * st; z.z += (dz / d) * st; z.disc.position.x = z.conv.position.x = z.x; z.disc.position.z = z.conv.position.z = z.z;
      } else if (!m.locked) { m.locked = true; this.G.fx.ring(z.x, 0.3, z.z, this.pal.gold, z.r * 2.2, 0.35); this.sfx('telegraph'); }
    }
  }

  /** 글줄 탄: 단어 사이가 비어 있는 한 줄이 가로로 흘러간다. 줄마다 방향·높이가 다르다. */
  *textLines(lines, gapT, speed = 4.6) {
    const pal = this.pal; let last = 99;
    for (let l = 0; l < lines; l++) {
      let z = rnd(-5.5, 7.5); if (Math.abs(z - last) < 2.2) z = clamp(z + (z > last ? 2.4 : -2.4), -6, 8); last = z;
      const dir = l % 2 ? -1 : 1, x0 = dir > 0 ? -11.5 : 11.5, gaps = [3 + ((Math.random() * 3) | 0), 8 + ((Math.random() * 3) | 0)], len = 15;
      for (let c = 0; c < len; c++) {
        if (gaps.some((g) => c >= g && c < g + 2)) continue;
        this.shoot({ x: x0 - dir * c * 0.9, z, a: dir > 0 ? 0 : Math.PI, speed, kind: 'glyph', size: 0.95, color: c % 5 === 0 ? pal.c : l % 2 ? pal.a : pal.b, life: 8 });
      }
      this.sfx('page', { vol: 0.4 }); yield this.t(gapT);
    }
  }

  // ═════════ 통상 1: 검수 개시 ═════════
  /** 교정 줄: 글줄이 번갈아 흘러간다. 단어 사이의 틈으로 빠져나간다. */
  *atk_stampLines() {
    this.cast('cast'); this.glide(0, -6, 0.7); yield 0.6;
    yield* this.textLines(6 + (this.lv(2) ? 2 : 0), 0.85);
    yield 1.4;
  }

  /** 표식: 발밑에 마법진이 달라붙어 따라오다 굳어서 터진다. */
  *atk_ruleCircle() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.7); yield 0.7;
    const n = 5 + (this.lv(2) ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), cross = i % 2;
      this.mark(P.x + Math.cos(a) * 4, P.z + Math.sin(a) * 4, {
        onBoom: (zz) => {
          const k = this.n(10, 6), a0 = cross ? Math.PI / 4 : 0;
          for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: a0 + (j * TAU) / k, speed: 5.4 * this.spd, size: 1.0, color: pal.c, speeds: [[0, 1], [0.3, 0.12], [0.75, 0.12], [1.0, 1.0]], life: 5 });
          if (cross) for (let q = 0; q < 4; q++) G.bullets.spawn({ owner: 'boss', kind: 'orb', x: zz.x, z: zz.z, a: (q * TAU) / 4, speed: 8 * this.spd, size: 1.0, color: pal.b, life: 4 });
        },
      });
      this.sfx('telegraph', { pan: G.audio.pan(P.x) });
      yield this.t(0.8);
    }
    yield 1.6;
  }

  /** 붉은 펜 교정: 좌우에서 휘어진 두 줄기가 가운데서 X 자로 교차한다. */
  *atk_redPen() {
    const pal = this.pal;
    this.cast('fan'); this.glide(0, -6.4, 0.7); yield 0.6;
    const vols = 6 + (this.lv(2) ? 2 : 0);
    for (let v = 0; v < vols; v++) {
      const a = this.aim(), n = this.n(5, 3), off = v % 2 ? 0.6 : 0.45;
      this.fan(n, 0.9, a + off, { kind: 'glyph', speed: 6.6, size: 1.0, color: pal.b, turn: -0.8, life: 6 });
      this.fan(n, 0.9, a - off, { kind: 'glyph', speed: 6.6, size: 1.0, color: pal.a, turn: 0.8, life: 6 });
      this.sfx('fan');
      yield this.t(0.66);
    }
    yield 0.6;
  }

  // ═════════ 스킬 1: 분석「아카식 오디트」 ═════════
  // 조여드는 스캔 링(틈 하나), 좌→우 스캔 빔, 표식 검증.
  *atk_spAudit() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.8, 0.8); G.ui.warn('분석 개시 — 결함을 기록합니다', 1400); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      // A) 조여드는 스캔 링: 플레이어가 있던 곳을 중심으로 링이 좁혀든다. 한 곳이 열려 있다.
      for (let r = 0; r < 2; r++) {
        const cx = clamp(P.x, -6, 6), cz = clamp(P.z, -5, 6), n = this.n(34, 20), gap = rnd(0, TAU), R = 6.4 - r * 0.6;
        for (let i = 0; i < n; i++) {
          const ang = (i * TAU) / n; if (angDiff(ang, gap) < 0.42) continue;
          G.bullets.spawn({ owner: 'boss', kind: 'glyph', size: 1.0, color: r % 2 ? pal.a : pal.b, life: 6, arm: 0.5, x: 0, z: 0, orbit: { cx, cz, r: R, ang, w: r % 2 ? 0.25 : -0.25, dr: -1.55 } });
        }
        G.fx.ring(cx, 0.3, cz, pal.b, R * 2, 0.6);
        this.addAnalysis(1.5); this.sfx('orb');
        yield this.t(r ? 2.2 : 1.3);
      }
      // B) 스캔 빔: 한쪽에서 반대쪽으로 순서대로
      const dir = cyc % 2 ? -1 : 1, cnt = 9;
      for (let k = 0; k < cnt; k++) {
        this.beam(dir * (-9 + k * 2.25), -11, Math.PI / 2, { w: 1.2, len: 26, warn: 0.6, dur: 0.18, color: pal.c });
        this.addAnalysis(0.6);
        yield this.t(0.3);
      }
      yield 0.6;
      // C) 검증 표식
      for (let i = 0; i < 3 + (this.lv(2) ? 1 : 0); i++) {
        this.mark(P.x + rnd(-3, 3), P.z + rnd(-3, 3), {
          r: 1.9, onBoom: (zz) => { const k = this.n(10, 6); this.G.fx.ring(zz.x, 0.3, zz.z, pal.gold, 7, 0.5); for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: (j * TAU) / k + zz.x, speed: 4.6 * this.spd, size: 1.0, color: pal.c, speeds: [[0, 1], [0.3, 0.2], [0.7, 1.2]] }); },
        });
        this.sfx('telegraph');
        yield this.t(0.75);
      }
      yield 1.0;
    }
    yield 0.4;
  }

  // ═════════ 통상 2: 즉석 술식 ═════════
  /** 다각형이 회전하며 풀려난다: 변이 서로 반대로 휘어 소용돌이가 된다. */
  *atk_polyBloom() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -6.2, 0.7); yield 0.7;
    for (let r = 0; r < 6; r++) {
      const sides = r % 2 ? 5 : 6, tw = r % 2 ? 0.55 : -0.55;
      this.poly(this.x, this.z, sides, 1.4, r * 0.31, this.n(4, 2), { kind: 'glyph', speed: 3.6, size: 1.0, color: r % 2 ? pal.a : pal.b, accel: 0.5, maxS: 6, turn: tw, life: 7 });
      this.fan(this.n(3, 1), 0.6, this.aim(), { kind: 'orb', speed: 6.4, size: 1.0, color: pal.c });
      this.sfx('orb'); this.G.fx.ring(this.x, this.bobY, this.z, pal.b, 5, 0.4);
      yield this.t(0.85);
    }
    yield 1.0;
  }

  /** 마법 펜이 허공에 글줄을 쓴다: 한 글자씩 나타나 다 쓰이면 한꺼번에 플레이어에게 쏟아진다. */
  *atk_penStroke() {
    const pal = this.pal;
    this.cast('cast'); this.glide(rnd(-3, 3), -6.4, 0.7); yield 0.7;
    const strokes = 3 + (this.lv(2) ? 1 : 0);
    for (let s = 0; s < strokes; s++) {
      const y = rnd(-8, 0), flip = s % 2, cnt = this.n(14, 8), x0 = flip ? 9 : -9, x1 = flip ? -9 : 9, y1 = y + rnd(-3, 3);
      for (let i = 0; i < cnt; i++) {
        const u = cnt === 1 ? 0.5 : i / (cnt - 1);
        this.shoot({ x: x0 + (x1 - x0) * u, z: y + (y1 - y) * u, a: 0, kind: 'glyph', size: 0.95, color: s % 2 ? pal.a : pal.b, speed: 6.4, reaim: true, delay: i * 0.07, hold: 1.7 - i * 0.07, life: 12, arm: 0 });
      }
      this.sfx('telegraph');
      yield this.t(1.1);
    }
    yield 1.6;
  }

  /** 먹물 방울: 커다란 방울이 떨어지다 정해진 높이에서 튀어 흩어진다. */
  *atk_glyphRain() {
    const G = this.G, pal = this.pal;
    this.cast('dark'); this.glide(0, -6.5, 0.7); yield 0.6;
    const n = this.n(16, 10);
    for (let i = 0; i < n; i++) {
      const tz = rnd(-4, 7);
      this.shoot({
        x: rnd(-9, 9), z: -11, a: Math.PI / 2, speed: rnd(4.2, 6.0), kind: 'orb', size: 1.7, hr: 0.45, color: pal.b, life: 7,
        fn: (b) => {
          if (b.z < tz) return;
          const k = 7, a0 = rnd(0, TAU);
          for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: b.x, z: b.z, a: a0 + (j * TAU) / k, speed: 4.8 * this.spd, size: 0.95, color: pal.c, speeds: [[0, 1.5], [0.5, 0.35], [1.0, 0.9]], life: 4 });
          G.fx.ring(b.x, 0.4, b.z, pal.b, 2.6, 0.3); G.bullets.kill(b);
        },
      });
      if (i % 5 === 0) this.shoot({ a: this.aim(), speed: 7, kind: 'orb', size: 1.0, color: pal.c });
      yield this.t(0.34);
    }
    yield 1.4;
  }

  // ═════════ 스킬 2: 필사「아케인 스크립트」 ═════════
  // 마법진을 먼저 그려 두고(구속진 / 가동진), 그것이 움직이기 시작하면 표식이 따라붙는다.
  *atk_spScript() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); G.ui.warn('필사 — 마법진을 그려 넣습니다', 1400); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      // A) 구속진 + 가동진 설치
      const binds = 2 + (this.lv(2) ? 1 : 0);
      for (let i = 0; i < binds; i++) this.zone(clamp(P.x + rnd(-4, 4), -8, 8), clamp(P.z + rnd(-3, 3), -6, 8.5), 3.2, { kind: 'bind', warn: 0.6, dur: 5.4, color: pal.a });
      G.ui.warn('구속진 — 발목에 술식이 감깁니다', 1500); this.sfx('veil');
      const tur = [];
      for (let i = 0; i < 3; i++) { const tx = -6 + i * 6 + rnd(-1, 1), tz = rnd(-5, 2); tur.push([tx, tz]); G.zones.spawn({ x: tx, z: tz, r: 1.4, warn: 4.0, dur: 0.2, dmg: 0, color: pal.c }); }
      yield 1.0;
      // B) 가동진: 설치된 진이 회전하며 룬을 뿜는다 (+ 보스의 조준 탄)
      { let t = 0, acc = 0, ang = rnd(0, TAU), v = 0;
        this.sfx('cast');
        while (t < 3.0) {
          const dt = yield 0; t += dt; acc += dt; ang += dt * 1.9; v += dt;
          while (acc >= this.t(0.15)) { acc -= this.t(0.15); tur.forEach(([tx, tz], i) => { for (let k = 0; k < 2; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: tx, z: tz, a: ang * (i % 2 ? -1 : 1) + k * Math.PI, speed: 3.8 * this.spd, size: 1.0, color: i % 2 ? pal.a : pal.c, accel: 0.6, maxS: 5.4, life: 6 }); }); }
          if (v >= this.t(1.0)) { v = 0; this.fan(this.n(5, 3), 1.1, this.aim(), { kind: 'orb', speed: 5.8, size: 1.0, color: pal.b }); this.sfx('orb'); }
        } }
      // C) 표식
      for (let k = 0; k < 3 + (this.lv(2) ? 1 : 0); k++) {
        this.mark(P.x + rnd(-3, 3), P.z + rnd(-3, 3), { r: 2.0, onBoom: (zz) => { const n = this.n(10, 6); for (let j = 0; j < n; j++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: (j * TAU) / n, speed: 4.8 * this.spd, size: 1.0, color: pal.c, speeds: [[0, 1], [0.3, 0.15], [0.7, 1.2]] }); } });
        this.sfx('telegraph'); yield this.t(0.7);
      }
      yield 1.2;
    }
    yield 0.4;
  }

  // ═════════ 스킬 3: 봉인「리젝트」 ═════════
  // 반려 인장(방어막: 어떤 빛도 닿지 않는다) → 인장이 갈라지는 틈 → 먹물 봉인(손이 묶인다)의 순환.
  *atk_spReject() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.5, 0.8); yield 1.0;
    for (let cyc = 0; cyc < 4; cyc++) {
      // A) 반려 인장
      this.shield = true; G.ui.warn('반려 — 인장이 모든 것을 튕겨냅니다', 1500); this.sfx('veil');
      const dur = 3.0; let t = 0, a = rnd(0, TAU), acc = 0, dir = 1;
      while (t < dur) {
        const dt = yield 0; t += dt; acc += dt; a += dir * dt * 1.4;
        if (t > dur / 2 && dir === 1) dir = -1;
        const step = this.t(0.11);
        while (acc >= step) { acc -= step; for (let k = 0; k < 3; k++) this.shoot({ a: a + (k * TAU) / 3, speed: 5.0, kind: 'glyph', size: 1.0, color: k % 2 ? pal.a : pal.c, speeds: [[0, 1.25], [0.6, 0.6], [1.2, 1.25]], life: 7 }); }
      }
      this.shield = false; G.ui.warn('인장에 금이 갔습니다 — 틈이 보입니다', 1000); this.sfx('cast');
      // B) 틈: 가벼운 패턴
      for (let k = 0; k < 4; k++) { this.fan(this.n(7, 3), 1.4, this.aim(), { kind: 'orb', speed: 5.4, size: 1.0, color: pal.b }); this.sfx('fan'); yield this.t(0.78); }
      // C) 먹물 봉인: 표식이 굳으면 손이 묶인다
      G.ui.warn('봉인 — 먹물이 손을 묶습니다', 1300); this.sfx('beam_charge');
      this.zone(P.x, P.z, 1.2, { kind: 'bind', warn: 0.2, dur: 1.6, color: pal.gold });
      yield 1.3;
      P.sealT = 1.7; G.ui.flash('#c89bff', 400, 0.4);
      for (let k = 0; k < 4; k++) {
        this.ring(this.n(18, 10), { a0: k * 0.2, kind: 'glyph', speed: 4.2, size: 1.0, color: k % 2 ? pal.a : pal.c, speeds: [[0, 1.2], [0.4, 0.5], [0.9, 1.2]] });
        this.fan(this.n(3, 2), 0.4, this.aim(), { kind: 'orb', speed: 7, size: 1.0, color: pal.b });
        this.sfx('orb'); yield this.t(0.42);
      }
      yield 0.6;
    }
  }

  // ═════════ 라스트: 최종 판결「파이널 베리딕트」 ═════════
  // 거대한 표식 + 판결문 낭독(글줄) + 일곱 봉인 + 판결의 선 + 링 폭풍. 분석률(this.amp)에 비례해 탄 수·탄속이 증가한다.
  /** 신탁 「빌려온 달」: 벨리스의 술식과 달빛 탄이 번갈아 바뀐다 (버티기) */
  *atk_spProxy() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.4, 1.0); G.ui.warn('달의 잔상이 벨리스에게 힘을 건넨다 — 20초를 버텨라', 2200); yield 1.2;
    const moon = [
      function* (s) { for (let k = 0; k < 5; k++) { s.fan(s.n(7, 4), 1.4, s.aim(), { kind: 'crescent', speed: 5.6, size: 1.3, color: 0xe3d6ff, spin: 5 }); s.sfx('fan'); yield s.t(0.6); } },
      function* (s) { for (let k = 0; k < 4; k++) { s.ring(s.n(18, 10), { kind: 'crescent', speed: 4.4, size: 1.2, color: 0xfff1c9, spin: 5, accel: 1.2, accelAt: 0.8, maxS: 8 }); s.sfx('orb'); yield s.t(0.7); } },
      function* (s) { for (let k = 0; k < 6; k++) { s.shoot({ a: s.aim() + rnd(-0.7, 0.7), speed: 3.8, kind: 'orb', size: 1.5, hr: 0.4, homing: 1.1, homeT: 2.4, color: 0xa07bff, trail: true, life: 6 }); yield s.t(0.45); } yield 0.5; },
    ];
    const bel = ['stampLines', 'ruleCircle', 'redPen', 'polyBloom', 'penStroke', 'glyphRain'];
    let flip = 0;
    while (true) {
      flip++;
      if (flip % 2) yield* moon[(Math.random() * moon.length) | 0](this); else yield* this['atk_' + bel[(Math.random() * bel.length) | 0]]();
      yield 0.3;
    }
  }
  *atk_spVerdict() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.6, 1.0); G.ui.warn(`판결 개시 — 결함 기록 ${Math.round(this.analysis)}% 완료`, 1800); yield 1.4;
    for (let cyc = 0; cyc < 6; cyc++) {
      const amp = this.amp;
      // A) 심판의 표식: 발밑에 거대한 진이 따라붙는다 + 회전 룬
      this.mark(P.x, P.z, {
        r: 4.8, track: 1.5, warn: 2.4,
        onBoom: (zz) => {
          const n = Math.round(this.n(26, 14) * amp);
          for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: k % 2 ? 'glyph' : 'orb', x: zz.x, z: zz.z, a: (k * TAU) / n, speed: 5.4 * this.spd * (0.9 + amp * 0.1), size: 1.05, color: k % 2 ? pal.c : pal.a, speeds: [[0, 1], [0.35, 0.2], [0.8, 1.15]] });
          G.world.shake(0.8, 0.5); G.audio.sfx.play('moon_impact', { vol: 0.8 }); G.ui.flash('#c89bff', 350, 0.4);
        },
      });
      this.sfx('veil');
      { const dur = 2.4; let t = 0, a = rnd(0, TAU), acc = 0;
        while (t < dur) {
          const dt = yield 0; t += dt; acc += dt; a += dt * 1.6;
          const step = this.t(0.15) / amp;
          while (acc >= step) { acc -= step; for (let k = 0; k < 3; k++) this.shoot({ a: a + (k * TAU) / 3, speed: 4.6, kind: 'glyph', size: 1.0, color: pal.b }); }
        } }
      yield 0.5;
      // B) 판결문 낭독 (글줄)
      yield* this.textLines(4, 0.8, 4.8 * (0.95 + amp * 0.05));
      yield 0.5;
      // C) 일곱 개의 봉인: 칠각 외곽선
      for (let r = 0; r < 4; r++) {
        this.poly(this.x, this.z, 7, 1.6, r * 0.22, Math.round(this.n(3, 2) * amp), { kind: 'glyph', speed: 3.4, size: 1.0, color: r % 2 ? pal.a : pal.c, accel: 0.7, maxS: 6.5, turn: r % 2 ? 0.4 : -0.4, life: 7 });
        this.fan(this.n(4, 2), 0.5, this.aim(), { kind: 'orb', speed: 7, size: 1.0, color: pal.b });
        this.sfx('orb'); yield this.t(0.75);
      }
      // D) 판결의 선: 세로 빔 → 가로 빔 (틈이 있다)
      const gx = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let k = -4; k <= 4; k++) { const x = gx + k * 2.4; if (Math.abs(x - gx) < 1.5 || Math.abs(x) > 10) continue; this.beam(x, -11, Math.PI / 2, { w: 1.3, len: 26, warn: 1.3, dur: 0.3, color: pal.c }); }
      this.sfx('beam_charge'); yield 1.5;
      const gz = clamp(P.z + rnd(-2, 2), -4, 8);
      for (let k = -4; k <= 4; k++) { const z = gz + k * 2.4; if (Math.abs(z - gz) < 1.5 || z < -9 || z > 10) continue; this.beam(-11, z, 0, { w: 1.3, len: 26, warn: 1.2, dur: 0.3, color: pal.c }); }
      yield 1.4;
      // E) 링 폭풍: 숨 쉬듯 느려졌다 빨라지는 링
      for (let r = 0; r < 5; r++) {
        const n = Math.round(this.n(30, 16) * amp), gap = this.aim();
        for (let i = 0; i < n; i++) { const ang = (i * TAU) / n; if (angDiff(ang, gap) < 0.26 + 0.06 * (1 - r / 5)) continue; this.shoot({ a: ang, speed: 4.4 + r * 0.25, kind: r % 2 ? 'glyph' : 'orb', size: 1.0, color: r % 2 ? pal.c : pal.a, speeds: [[0, 1.15], [0.5, 0.65], [1.1, 1.15]] }); }
        this.sfx('orb'); yield this.t(0.5);
      }
      yield 0.8;
    }
  }
}
