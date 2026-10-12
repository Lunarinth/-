// STAGE 4 — 인덱스: 도서관의 주인. 간결하고 빠르게 정리하는 INTP 너드형 사서.
// "패턴을 아주 많이 쓴다": 정렬 · 페이지 넘김 · 책갈피 · 검색 · 서가 · 상호참조 · 연체 · 금서 · 전권 아카이브.
// 4스테이지의 필드는 5스테이지보다 어려운 편이다 (stages.js).
import { Boss, TAU, rnd, clamp, shuffle } from '../boss.js';

const PAL = { a: 0x7fe3b5, b: 0xffe39a, c: 0xffffff, glow: 0x3fd49a, key: 0xffd36b };

export const INDEX = {
  id: 'index', name: '인덱스', en: 'INDEX', epithet: '도서관의 주인',
  h: 5.5, hitR: 1.45, barkKey: 'index', pal: PAL, decoyColor: 0xa0f0c8, decoyBullet: 0x7fe3b5, hpMul: 0.95,
  theme: 'library', music: 'index',
  forms: {
    catalog: { label: '목록 형태', sub: '색인 · 분류', tint: [1, 1, 1] },
    search: { label: '검색 형태', sub: '전문 검색', tint: [0.98, 1.04, 1.02] },
    stamp: { label: '연체 형태', sub: '대출 · 반납', tint: [1.04, 1.02, 0.96] },
    forbidden: { label: '금서 형태', sub: '열람 제한', tint: [0.96, 1.0, 1.1] },
    archive: { label: '전권 형태', sub: '디지털 아카이브', tint: [1.1, 1.08, 1.04] },
  },
  steps: [
    { kind: 'nonspell', name: '색인 정렬', form: 'catalog', hp: 600, time: 38, attacks: ['sortRows', 'pageFlip', 'bookmarkLines', 'queryFan'], idle: 0.9, ultMode: 'normal' },
    { kind: 'spell', tag: '검색', name: '풀텍스트 검색', form: 'search', hp: 820, time: 50, attacks: ['spSearch'], idle: 0.7, ultMode: 'normal' },
    { kind: 'nonspell', name: '분류 체계', form: 'catalog', hp: 700, time: 40, attacks: ['shelfWalls', 'crossRef', 'queryFan'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '연체', name: '대출 연체 통지', form: 'stamp', hp: 900, time: 52, attacks: ['spOverdue'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '금서', name: '금서 열람', form: 'forbidden', hp: 1050, time: 56, attacks: ['spForbidden'], idle: 0.7, ultMode: 'normal' },
    { kind: 'last', tag: '전권', name: '디지털 아카이브 전권', form: 'archive', hp: 2000, time: 80, attacks: ['spArchive'], idle: 0.7, ultMode: 'resist', pre: null },
  ],
};

// EXTRA 중간 보스: 실에 묶인 인덱스. 기존 패턴 3개를 강화한 판.
export const INDEX_MID = {
  ...INDEX, hpMul: 0.62, music: 'midboss',
  allSteps: [
    { kind: 'nonspell', name: '색인 정렬 · 강제 정리', form: 'catalog', hp: 560, time: 36, attacks: ['sortRows', 'pageFlip', 'bookmarkLines', 'queryFan'], idle: 0.8, ultMode: 'normal', spd: 1.06 },
    { kind: 'spell', tag: '검색', name: '풀텍스트 검색 · 실 연결', form: 'search', hp: 760, time: 46, attacks: ['spSearch'], idle: 0.7, ultMode: 'normal', spd: 1.04 },
    { kind: 'spell', tag: '금서', name: '금서 열람 · 봉인 해제', form: 'forbidden', hp: 900, time: 52, attacks: ['spForbidden'], idle: 0.7, ultMode: 'normal', spd: 1.04 },
  ],
  steps: [],
};

export class Indexer extends Boss {
  constructor(scene, T, tex, aspect, G, def = INDEX) { super(scene, T, tex, aspect, G, def); }

  // ═════════ 통상: 색인 정렬 ═════════
  /** 줄마다 틈이 한 칸씩 이동한다 (정렬되는 순서). */
  *atk_sortRows() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.6;
    const rows = 9, step = 1.7;
    let gap = -7 + rnd(0, 2);
    for (let r = 0; r < rows; r++) {
      gap += (r % 2 ? -1 : 1) * 1.8 + rnd(-0.4, 0.4); gap = clamp(gap, -7.5, 7.5);
      for (let x = -10; x <= 10; x += step) if (Math.abs(x - gap) > 1.6) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 4.6, kind: 'page', size: 1.15, color: r % 2 ? pal.a : pal.b });
      this.sfx('page'); yield this.t(0.78);
    }
    yield 0.8;
  }
  *atk_pageFlip() {
    const pal = this.pal;
    this.cast('cast'); this.glide(rnd(-5, 5), -6.4, 0.7); yield 0.5;
    for (let v = 0; v < 6; v++) {
      const a = this.aim(), s = v % 2 ? 1 : -1, n = this.n(7, 4);
      for (let i = 0; i < n; i++) this.shoot({ a: a + (i - (n - 1) / 2) * 0.2, speed: 5.4, kind: 'page', size: 1.15, color: pal.c, turn: s * 0.9, life: 5 });
      this.sfx('page'); yield this.t(0.8);
    }
    yield 0.6;
  }
  /** 책갈피 빔: 세로선이 왼쪽에서 오른쪽으로 순서대로 꽂힌다. */
  *atk_bookmarkLines() {
    const pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.7); yield 0.5;
    for (let pass = 0; pass < 2; pass++) {
      const dir = pass % 2 ? -1 : 1, cnt = 11;
      for (let k = 0; k < cnt; k++) { this.beam(dir * (-9.5 + k * 1.9), -11, Math.PI / 2, { w: 1.0, len: 26, warn: 0.7, dur: 0.15, color: pal.key }); if (k % 3 === 2) this.sfx('beam_charge', { vol: 0.5 }); yield this.t(0.22); }
      yield 0.9;
    }
  }
  *atk_queryFan() {
    const pal = this.pal;
    this.cast('fan'); yield 0.4;
    for (let v = 0; v < 6; v++) {
      this.fan(this.n(3, 2), 0.3, this.lead(0.6), { kind: 'star', speed: 9.4, size: 1.1, color: pal.b });
      this.ring(this.n(10, 6), { kind: 'glyph', speed: 3.8, size: 1.0, color: pal.a });
      this.sfx('fan'); if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.6); yield this.t(0.72);
    }
    yield 0.4;
  }

  // ═════════ 통상: 분류 체계 ═════════
  *atk_shelfWalls() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.6;
    for (let w = 0; w < 8; w++) {
      const side = w % 2 ? -1 : 1, gz = clamp(P.z + rnd(-3, 3), -6, 8);
      for (let z = -9; z <= 10; z += 1.5) if (Math.abs(z - gz) > 1.9) this.shoot({ x: side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 5.6, kind: 'page', size: 1.15, color: pal.a });
      if (w % 2) { const gx = clamp(P.x + rnd(-3, 3), -7, 7); for (let x = -10; x <= 10; x += 1.6) if (Math.abs(x - gx) > 1.8) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 5, kind: 'page', size: 1.15, color: pal.b }); }
      this.sfx('page'); yield this.t(1.0);
    }
    yield 0.8;
  }
  /** 상호 참조: 점들을 선으로 잇고, 선 위의 탄이 잠시 정지했다가 흘러간다. */
  *atk_crossRef() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.5;
    for (let cyc = 0; cyc < 3; cyc++) {
      const pts = Array.from({ length: 5 }, () => [rnd(-8, 8), rnd(-6, 7)]);
      for (let i = 0; i < pts.length; i++) {
        this.G.zones.spawn({ x: pts[i][0], z: pts[i][1], r: 1.2, warn: 0.9, dur: 0.2, dmg: 0, color: pal.key });
        if (i < pts.length - 1) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], this.n(9, 5), { kind: 'glyph', size: 0.95, color: pal.a, speed: 3.4, a: Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) + (i % 2 ? Math.PI / 2 : -Math.PI / 2), hold: 1.4, delay: i * 0.18, life: 9 });
        this.sfx('telegraph', { pan: G.audio.pan(pts[i][0]) }); yield 0.2;
      }
      yield 2.2;
    }
  }

  // ═════════ 스킬 1: 풀텍스트 검색 — 회전하는 탐색광과 일치 항목 ═════════
  *atk_spSearch() {
    const G = this.G, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -6.4, 0.8); G.ui.warn('검색 개시 — 일치 항목을 하이라이트합니다', 1600); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      // A) 회전 탐색광 (반대쪽 두 줄)
      let a = rnd(0, TAU); const dir = cyc % 2 ? -1 : 1, spin = 0.62 + this.D.lv * 0.05;
      const beams = [];
      for (let k = 0; k < 2; k++) beams.push(this.beam(this.x, this.z, a + k * Math.PI, { w: 0.9, len: 30, warn: 1.0, dur: 3.6, color: pal.key }));
      this.sfx('beam_charge'); yield 1.0;
      let t = 0;
      while (t < 3.4) {
        const dt = yield 0; t += dt; a += dir * spin * dt;
        for (let k = 0; k < 2; k++) if (beams[k] && beams[k].active) beams[k].a = a + k * Math.PI;
        if (Math.random() < dt * 5) this.shoot({ a: a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), speed: 4.6, kind: 'glyph', size: 1.0, color: pal.a });
      }
      // B) 일치 항목: 플레이어 주변 구역에서 탄이 터진다
      for (let i = 0; i < 4; i++) { this.zone(G.player.x + rnd(-2, 2), G.player.z + rnd(-2, 2), 1.8, { warn: 0.9, dur: 0.25, color: pal.b, onBoom: (zz) => { const n = this.n(8, 5), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 4.2 * this.spd, size: 1.0, color: pal.c }); } }); yield this.t(0.35); }
      yield 1.2;
    }
  }

  // ═════════ 스킬 2: 대출 연체 통지 — 연체 도장과 쪽지 비 ═════════
  *atk_spOverdue() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.8, 0.8); G.ui.warn('연체 도서 발견 — 즉시 반납하십시오', 1600); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      // 도장 구역 줄지어 찍기
      const n = 8 + (this.lv(2) ? 2 : 0), sx = rnd(-8, -4);
      for (let i = 0; i < n; i++) { this.zone(clamp(sx + i * 2.1 + rnd(-0.4, 0.4), -9, 9), clamp(P.z + rnd(-3, 3), -7, 8), 2.0, { warn: 1.0, dur: 0.28, color: pal.b }); this.sfx('telegraph'); yield this.t(0.3); }
      yield 0.6;
      // 쪽지 비
      const rain = this.n(24, 12);
      for (let i = 0; i < rain; i++) { this.shoot({ x: rnd(-9.5, 9.5), z: -11, a: Math.PI / 2 + rnd(-0.1, 0.1), speed: rnd(4.2, 6.4), kind: 'page', size: 1.1, color: i % 3 ? pal.c : pal.a }); if (i % 6 === 0) this.shoot({ a: this.aim(), speed: 6.4, kind: 'star', size: 1.1, color: pal.b }); yield this.t(0.11); }
      yield 1.0;
    }
  }

  // ═════════ 스킬 3: 금서 열람 — 거대한 책이 느리게 날아오며 룬을 흩뿌린다 ═════════
  *atk_spForbidden() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.6, 0.8); G.ui.warn('금서 열람 — 열람 제한을 해제합니다', 1600); yield 1.0;
    for (let cyc = 0; cyc < 3; cyc++) {
      const books = [];
      const nb = 1 + (this.lv(2) ? 1 : 0);
      for (let i = 0; i < nb; i++) books.push(this.shoot({ a: this.aim() + (nb > 1 ? (i - 0.5) * 0.6 : 0), speed: 2.5, kind: 'page', size: 3.8, hr: 1.0, color: pal.b, spin: 0, life: 12 }));
      this.sfx('moon_throw');
      let t = 0, acc = 0;
      while (t < 6 && books.some((b) => b && b.active)) {
        const dt = yield 0; t += dt; acc += dt;
        if (acc >= this.t(0.65)) { acc = 0; for (const b of books) if (b && b.active) { const n = this.n(10, 6), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: b.x, z: b.z, a: a0 + (k * TAU) / n, speed: 3.8 * this.spd, size: 1.0, color: pal.a }); } this.sfx('orb', { vol: 0.5 }); }
      }
      this.fan(this.n(9, 5), 1.6, this.aim(), { kind: 'star', speed: 6.8, size: 1.1, color: pal.c });
      yield 1.0;
    }
  }

  // ═════════ 라스트: 디지털 아카이브 전권 — 모든 패턴을 섞어 쓴다 ═════════
  *atk_spArchive() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('아카이브 전권 — 전 항목 호출', 1800); this.glide(0, -6.6, 1.0); yield 1.2;
    const pool = ['sortRows', 'pageFlip', 'bookmarkLines', 'queryFan', 'shelfWalls', 'crossRef', 'spSearch', 'spOverdue', 'spForbidden'];
    let last = null;
    while (true) {
      const seq = shuffle([...pool]);
      for (const name of seq) {
        if (name === last) continue; last = name;
        yield* this['atk_' + name]();
        yield 0.3;
      }
    }
  }
}
