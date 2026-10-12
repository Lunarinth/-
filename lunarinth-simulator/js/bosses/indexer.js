// STAGE 4 — 인덱스: 도서관의 주인. 간결하고 빠르게 정리하는 INTP 너드형 사서.
// 패턴마다 "분류·검색·정렬"의 논리가 다르다: 정렬 순서대로 이동하는 틈, 얼었다가 격자로 정렬되는 탄, 카드 패,
// 책갈피 레이저, 질의 결과 반환, 상호 참조선, 전문 검색, 연체 도장, 책이 펼쳐지는 금서, 끊겨 버퍼링하는 데이터 스트림.
// 4스테이지의 필드는 5스테이지보다 어려운 편이다 (stages.js).
import { Boss, TAU, rnd, clamp, shuffle } from '../boss.js';

const PAL = { a: 0x7fe3b5, b: 0xffe39a, c: 0xffffff, glow: 0x3fd49a, key: 0xffd36b };
const SORTC = [0x7fe3b5, 0xffe39a, 0xffffff, 0x9bd0ff];

/** 보통 난이도에서 처치까지 걸리는 시간이 제한시간의 일정 비율이 되도록 hp 를 정한다 (실효 체력 = hp × hpMul × 2.2, 화력 85/s) */
const FR = { n: 0.40, s: 0.45, l: 0.50 };
const HPK = (kind, time, mul, adj = 1) => Math.round((FR[kind] * adj * time * 85) / (2.2 * mul));
const MUL = 1.0, MMUL = 0.62;

export const INDEX = {
  id: 'index', name: '인덱스', en: 'INDEX', epithet: '도서관의 주인',
  h: 5.5, hitR: 1.45, barkKey: 'index', pal: PAL, decoyColor: 0xa0f0c8, decoyBullet: 0x7fe3b5, hpMul: MUL,
  theme: 'library', music: 'index',
  forms: {
    catalog: { label: '목록 형태', sub: '색인 · 분류', tint: [1, 1, 1] },
    search: { label: '검색 형태', sub: '전문 검색', tint: [0.98, 1.04, 1.02] },
    stamp: { label: '연체 형태', sub: '대출 · 반납', tint: [1.04, 1.02, 0.96] },
    forbidden: { label: '금서 형태', sub: '열람 제한', tint: [0.96, 1.0, 1.1] },
    archive: { label: '전권 형태', sub: '디지털 아카이브', tint: [1.1, 1.08, 1.04] },
  },
  steps: [
    { kind: 'nonspell', name: '색인 정렬', form: 'catalog', hp: HPK('n', 38, MUL), time: 38, attacks: ['sortRows', 'bubbleSort', 'bookmarkLines', 'queryFan'], idle: 0.8, ultMode: 'normal' },
    { kind: 'spell', tag: '검색', name: '풀텍스트 검색', form: 'search', hp: HPK('s', 50, MUL), time: 50, attacks: ['spSearch'], idle: 0.6, ultMode: 'normal' },
    { kind: 'nonspell', name: '분류 체계', form: 'catalog', hp: HPK('n', 40, MUL), time: 40, attacks: ['shelfWalls', 'crossRef', 'indexCards', 'pageFlip'], idle: 0.7, ultMode: 'normal' },
    { kind: 'spell', tag: '연체', name: '대출 연체 통지', form: 'stamp', hp: HPK('s', 52, MUL), time: 52, attacks: ['spOverdue'], idle: 0.6, ultMode: 'normal' },
    { kind: 'spell', tag: '금서', name: '금서 열람', form: 'forbidden', hp: HPK('s', 56, MUL), time: 56, attacks: ['spForbidden'], idle: 0.6, ultMode: 'normal' },
    { kind: 'last', tag: '전권', name: '디지털 아카이브 전권', form: 'archive', hp: HPK('l', 80, MUL), time: 80, attacks: ['spArchive'], idle: 0.6, ultMode: 'resist', pre: null },
  ],
};

// EXTRA 중간 보스: 실에 묶인 인덱스. 자기 의지와 상관없이 팔다리가 끌려다닌다 — 책이 실에 당겨 되돌아오고, 몸 위로 붉은 실이 오른다.
export const INDEX_MID = {
  ...INDEX, hpMul: MMUL, music: 'midboss', threads: true, epithet: '실에 묶인 사서',
  allSteps: [
    { kind: 'nonspell', name: '색인 정렬 · 강제 정리', form: 'catalog', hp: HPK('n', 36, MMUL, 0.85), time: 36, attacks: ['sortRows', 'bookmarkLines', 'tugged', 'queryFan'], idle: 0.7, ultMode: 'normal', spd: 1.04 },
    { kind: 'spell', tag: '검색', name: '풀텍스트 검색 · 실 연결', form: 'search', hp: HPK('s', 46, MMUL, 0.85), time: 46, attacks: ['spSearch'], idle: 0.6, ultMode: 'normal', spd: 1.03 },
    { kind: 'spell', tag: '금서', name: '금서 열람 · 봉인 해제', form: 'forbidden', hp: HPK('s', 52, MMUL, 0.85), time: 52, attacks: ['spForbidden'], idle: 0.6, ultMode: 'normal', spd: 1.03 },
  ],
  steps: [],
};

export class Indexer extends Boss {
  constructor(scene, T, tex, aspect, G, def = INDEX) { super(scene, T, tex, aspect, G, def); }

  /** 중간 보스 전용: 몸에서 붉은 실이 올라간다 */
  renderExtra(dt, t, px, pz, visible) {
    if (!this.def.threads || !visible || !this.G.fx) return;
    this._thr = (this._thr || 0) - dt;
    if (this._thr > 0) return;
    this._thr = 0.05;
    this.G.fx.emit({ x: px + rnd(-1.6, 1.6), y: this.bobY + rnd(-1.5, 1.5), z: pz + 0.1, vy: 5, life: 0.9, s0: 0.2, s1: 0.04, color: 0xff4f6e, tex: 'spark', op: 0.8 });
  }

  // ═════════ 통상: 색인 정렬 ═════════
  /** 정렬된 순서대로 한 칸씩 움직이는 틈 (가끔 인접한 둘이 뒤바뀐다 — 버블 정렬의 한 패스). */
  *atk_sortRows() {
    const pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.6;
    const N = 11, W = 1.8, X0 = -9, rows = 10;
    const asc = Math.random() < 0.5, seq = [];
    for (let i = 0; i < rows; i++) seq.push(asc ? i : N - 1 - i);
    for (let i = 1; i < rows - 2; i++) if (Math.random() < 0.35) { [seq[i], seq[i + 1]] = [seq[i + 1], seq[i]]; i++; }
    for (let r = 0; r < rows; r++) {
      const g = seq[r], swapped = r > 0 && Math.abs(seq[r] - seq[r - 1]) !== 1;
      for (let s = 0; s < N; s++) {
        if (s === g) continue;
        const near = Math.abs(s - g) === 1;
        this.shoot({ x: X0 + s * W, z: -11, a: Math.PI / 2, speed: 4.6, kind: 'page', size: 1.15, color: near ? pal.key : SORTC[s % 4] });
      }
      if (swapped) this.G.fx.ring(X0 + g * W, 0.3, -9, pal.key, 2.4, 0.4);
      this.sfx('page', { vol: 0.5 }); yield this.t(0.78);
    }
    yield 0.8;
  }

  /** 흩어진 탄이 얼어붙었다가 값 순서대로 격자에 정렬되고, 왼쪽부터 차례로 풀려난다 (줄마다 낙하 / 조준). */
  *atk_bubbleSort() {
    const G = this.G, pal = this.pal;
    this.cast('glitch'); this.glide(0, -7.4, 0.7); yield 0.5;
    for (let round = 0; round < 2; round++) {
      const cols = this.n(9, 6), rows = 3 + (this.lv(2) ? 1 : 0), W = 17 / (cols - 1);
      const vals = shuffle(Array.from({ length: cols * rows }, (_, i) => i));
      let k = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const tx = -8.5 + c * W, tz = -10 + r * 1.15, rel = 2.4 + c * 0.2 + r * 0.05, aimed = r % 2 === 1;
        const v = vals[k++] % 4;
        const sx = rnd(-9, 9), sz = rnd(-10, -1), ph = rnd(0, TAU);
        this.shoot({
          x: sx, z: sz, a: 0, speed: 0.001, kind: aimed ? 'glyph' : 'page', size: 1.05, color: aimed ? pal.b : SORTC[v], arm: 99, life: 12,
          fn: (b) => {
            if (b.age < 0.6) { b.vx = Math.cos(ph + b.age * 5) * 1.2; b.vz = Math.sin(ph + b.age * 5) * 1.2; return; }   // 흩어진 상태: 떨림
            if (b.age < rel) {
              b.vx = (tx - b.x) * 6; b.vz = (tz - b.z) * 6; // 정렬 이동
              if (b.age > rel - 0.35) b.size = 1.05 * (1 + 0.18 * Math.sin(b.age * 40));
              return;
            }
            if (!b._rel) {
              b._rel = 1; b.armAt = 0; b.size = 1.05;
              if (aimed) { const a = Math.atan2(G.player.z - b.z, G.player.x - b.x); b._dx = Math.cos(a); b._dz = Math.sin(a); } else { b._dx = 0; b._dz = 1; }
            }
            const s = Math.min(aimed ? 6.4 : 7.4, 0.6 + (b.age - rel) * 8);
            b.vx = b._dx * s; b.vz = b._dz * s;
          },
        });
      }
      this.sfx('glitch', { vol: 0.5 });
      yield this.t(4.6 + cols * 0.2);
    }
    yield 0.6;
  }

  /** 책장이 넘어가듯 휘어지는 페이지: 가운데서 속도가 줄어 바람을 받고 다시 휙 날아간다. */
  *atk_pageFlip() {
    const pal = this.pal;
    this.cast('cast'); this.glide(rnd(-5, 5), -6.4, 0.7); yield 0.5;
    for (let v = 0; v < 6; v++) {
      const a = this.aim(), s = v % 2 ? 1 : -1, n = this.n(7, 4);
      for (let i = 0; i < n; i++) this.shoot({ a: a + (i - (n - 1) / 2) * 0.2, speed: 6.2, kind: 'page', size: 1.15, color: i % 2 ? pal.c : pal.a, turn: s * (0.45 + (i / (n - 1)) * 1.0), speeds: [[0, 1], [0.5, 0.28], [1.0, 0.28], [1.4, 1.35]], life: 6 });
      this.sfx('page'); yield this.t(0.8);
    }
    yield 0.6;
  }

  /** 책갈피 레이저: 세로 → 가로 → (하드 이상) 사선. 4줄마다 한 줄씩 비워 둔다. */
  *atk_bookmarkLines() {
    const pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -7, 0.7); yield 0.5;
    const off = (Math.random() * 4) | 0, dir = Math.random() < 0.5 ? -1 : 1;
    for (let k = 0; k < 11; k++) { if ((k + off) % 4 === 0) continue; this.beam(dir * (-9.5 + k * 1.9), -11, Math.PI / 2, { w: 1.0, len: 26, warn: 0.7, dur: 0.15, color: pal.key }); if (k % 3 === 2) this.sfx('beam_charge', { vol: 0.5 }); yield this.t(0.2); }
    yield 1.0;
    for (let k = 0; k < 9; k++) { if ((k + off) % 4 === 0) continue; this.beam(-11, -8.5 + k * 2.2, 0, { w: 1.0, len: 26, warn: 0.7, dur: 0.15, color: pal.key }); if (k % 3 === 2) this.sfx('beam_charge', { vol: 0.5 }); yield this.t(0.22); }
    yield 1.0;
    if (this.lv(2)) {
      for (let k = 0; k < 6; k++) { const x = -9 + k * 3.6; this.beam(x, -11, Math.PI / 2 + (k % 2 ? 0.45 : -0.45), { w: 1.0, len: 30, warn: 0.75, dur: 0.15, color: pal.key }); yield this.t(0.25); }
      yield 1.0;
    }
  }

  /** 질의 → 대기 → 결과 반환: 부채꼴로 퍼진 탄이 멈췄다가 한꺼번에 플레이어 쪽으로 쏟아진다. */
  *atk_queryFan() {
    const G = this.G, pal = this.pal;
    this.cast('fan'); yield 0.4;
    for (let v = 0; v < 5; v++) {
      const a = this.lead(0.5), n = this.n(5, 3);
      for (let i = 0; i < n; i++) this.shoot({
        a: a + (i - (n - 1) / 2) * 0.5, speed: 9, kind: 'star', size: 1.1, color: pal.b, life: 6,
        speeds: [[0, 1], [0.45, 0.04], [1.05, 0.04], [1.3, 0.8]],
        fn: (b) => { if (!b._r && b.age > 1.05) { b._r = 1; const ang = Math.atan2(G.player.z - b.z, G.player.x - b.x) + rnd(-0.06, 0.06), sp = Math.hypot(b.vx, b.vz) || 1; b.vx = Math.cos(ang) * sp; b.vz = Math.sin(ang) * sp; } },
      });
      if (v % 2) this.ring(this.n(10, 6), { kind: 'glyph', speed: 3.8, size: 1.0, color: pal.a });
      this.sfx('fan'); if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -5), 0.6); yield this.t(0.85);
    }
    yield 0.4;
  }

  /** 중간 보스 전용: 책이 실에 끌려 되돌아온다. */
  *atk_tugged() {
    const pal = this.pal;
    this.cast('twang'); this.glide(0, -6.4, 0.7); yield 0.5;
    for (let c = 0; c < 4; c++) {
      const n = this.n(14, 9), a0 = rnd(0, TAU), bx = this.x, bz = this.z;
      for (let i = 0; i < n; i++) this.shoot({
        a: a0 + (i * TAU) / n, speed: 5.6, kind: 'page', size: 1.15, color: i % 2 ? 0xff9fb0 : pal.c, life: 6, speeds: [[0, 1], [0.8, 0.05], [1.15, 0.05]],
        fn: (b) => { if (!b._y && b.age > 1.15) { b._y = 1; b.vx *= -1; b.vz *= -1; b.baseS *= 1.5; } },
      });
      this.sfx('twang'); this.G.fx.ring(bx, 0.8, bz, 0xff4f6e, 7, 0.5);
      yield this.t(1.0); this.fan(this.n(5, 3), 0.8, this.aim(), { kind: 'star', speed: 6.6, size: 1.1, color: pal.b });
      yield this.t(1.0);
    }
    yield 0.6;
  }

  // ═════════ 통상: 분류 체계 ═════════
  /** 양쪽에서 서가가 밀려온다: 느리게 출발해 쾅 하고 가속. 틈은 플레이어 근처에 하나. */
  *atk_shelfWalls() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.6;
    for (let w = 0; w < 8; w++) {
      const side = w % 2 ? -1 : 1, gz = clamp(P.z + rnd(-3, 3), -6, 8);
      for (let z = -9; z <= 10; z += 1.5) if (Math.abs(z - gz) > 1.9) this.shoot({ x: side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 5.8, kind: 'page', size: 1.15, color: pal.a, speeds: [[0, 0.55], [0.9, 0.55], [1.5, 1.25]] });
      if (w % 2) { const gx = clamp(P.x + rnd(-3, 3), -7, 7); for (let x = -10; x <= 10; x += 1.6) if (Math.abs(x - gx) > 1.8) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 5, kind: 'page', size: 1.15, color: pal.b }); }
      this.sfx('page'); yield this.t(1.05);
    }
    yield 0.8;
  }

  /** 상호 참조: 점들을 선으로 잇고, 선 위의 탄이 멈춰 있다가 수직으로 흘러간다. */
  *atk_crossRef() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(0, -7, 0.7); yield 0.5;
    for (let cyc = 0; cyc < 3; cyc++) {
      const pts = Array.from({ length: 5 }, () => [rnd(-8, 8), rnd(-6, 7)]);
      for (let i = 0; i < pts.length; i++) {
        G.zones.spawn({ x: pts[i][0], z: pts[i][1], r: 1.2, warn: 0.9, dur: 0.2, dmg: 0, color: pal.key });
        if (i < pts.length - 1) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], this.n(9, 5), { kind: 'glyph', size: 0.95, color: pal.a, speed: 3.4, a: Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]) + (i % 2 ? Math.PI / 2 : -Math.PI / 2), hold: 1.4, delay: i * 0.18, life: 9 });
        this.sfx('telegraph', { pan: G.audio.pan(pts[i][0]) }); yield 0.2;
      }
      yield 2.2;
    }
  }

  /** 색인 카드: 카드가 부채처럼 날아와 플레이어 주변에 내려앉고, 잠시 뒤 뒤집히며 십자로 터진다. */
  *atk_indexCards() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('page'); this.glide(0, -6.6, 0.7); yield 0.5;
    for (let deal = 0; deal < 4; deal++) {
      const n = this.n(6, 4), base = rnd(0, TAU), diag = deal % 2;
      for (let i = 0; i < n; i++) {
        const ang = base + (i * TAU) / n, r = rnd(2.6, 4.8);
        const tx = clamp(P.x + Math.cos(ang) * r, -9, 9), tz = clamp(P.z + Math.sin(ang) * r, -9, 9);
        const sx = this.x, sz = this.z, fl = 1.5 + i * 0.07;
        this.shoot({
          x: sx, z: sz, a: 0, speed: 0.001, kind: 'page', size: 1.5, hr: 0.4, color: pal.c, arm: 99, life: 8,
          fn: (b) => {
            if (b.age < 0.5) { const u = 1 - Math.pow(1 - b.age / 0.5, 3); b.x = sx + (tx - sx) * u; b.z = sz + (tz - sz) * u; b.mat.rotation = u * 6; return; }
            b.vx = b.vz = 0;
            if (b.age > fl - 0.4) b.size = 1.5 * (1 + 0.12 * Math.sin(b.age * 45));
            if (b.age >= fl && !b._f) {
              b._f = 1; const m = G.bullets;
              for (let k = 0; k < 4; k++) { const a = (k * TAU) / 4 + (diag ? Math.PI / 4 : 0); m.spawn({ owner: 'boss', kind: 'star', x: b.x, z: b.z, a, speed: 4.2 * this.spd, size: 1.05, color: pal.b, speeds: [[0, 0.3], [0.35, 1.7]], life: 4 }); }
              G.fx.ring(b.x, 0.5, b.z, pal.c, 3, 0.35); m.kill(b);
            }
          },
        });
        this.sfx('page', { vol: 0.4 }); yield this.t(0.11);
      }
      yield this.t(1.7);
    }
    yield 0.5;
  }

  // ═════════ 스킬 1: 풀텍스트 검색 — 탐색광 · 일치 항목 · 와일드카드 ═════════
  *atk_spSearch(cycles = 3) {
    const G = this.G, pal = this.pal;
    this.cast('beam_charge'); this.glide(0, -6.4, 0.8); G.ui.warn('검색 개시 — 일치 항목을 하이라이트합니다', 1600); yield 1.0;
    for (let cyc = 0; cyc < cycles; cyc++) {
      // A) 회전 탐색광 (반대쪽 두 줄)
      let a = rnd(0, TAU); const dir = cyc % 2 ? -1 : 1, spin = 0.62 + this.D.lv * 0.05;
      const beams = [];
      for (let k = 0; k < 2; k++) beams.push(this.beam(this.x, this.z, a + k * Math.PI, { w: 0.9, len: 30, warn: 1.0, dur: 3.2, color: pal.key }));
      this.sfx('beam_charge'); yield 1.0;
      let t = 0;
      while (t < 3.0) {
        const dt = yield 0; t += dt; a += dir * spin * dt;
        for (let k = 0; k < 2; k++) if (beams[k] && beams[k].active) beams[k].a = a + k * Math.PI;
        if (Math.random() < dt * 5) this.shoot({ a: a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), speed: 4.6, kind: 'glyph', size: 1.0, color: pal.a });
      }
      // B) 일치 항목: 플레이어 주변이 하이라이트되고, 터지면서 탄이 멈췄다가 퍼진다
      for (let i = 0; i < 4; i++) { this.zone(G.player.x + rnd(-2, 2), G.player.z + rnd(-2, 2), 1.8, { warn: 0.9, dur: 0.25, color: pal.b, onBoom: (zz) => { const n = this.n(8, 5), a0 = rnd(0, TAU); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 5.2 * this.spd, size: 1.0, color: pal.c, speeds: [[0, 1], [0.35, 0.1], [0.8, 0.1], [1.0, 0.9]] }); } }); yield this.t(0.35); }
      yield 1.2;
      // C) 와일드카드(*): 물결치는 세 줄기
      { let t2 = 0, acc = 0; const base = this.aim(); this.sfx('fan');
        while (t2 < 2.4) {
          const dt = yield 0; t2 += dt; acc += dt;
          while (acc >= this.t(0.1)) { acc -= this.t(0.1); for (let k = -1; k <= 1; k++) this.shoot({ a: base + k * 0.5, speed: 5.0, kind: 'glyph', size: 0.95, color: k ? pal.a : pal.b, wob: [2.4, 2.8], wobPh: k * 1.0 }); }
        } }
      yield 0.8;
    }
  }

  // ═════════ 스킬 2: 대출 연체 통지 — 연체 도장과 나풀거리는 쪽지 ═════════
  *atk_spOverdue(cycles = 3) {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('cast'); this.glide(0, -6.8, 0.8); G.ui.warn('연체 도서 발견 — 즉시 반납하십시오', 1600); yield 1.0;
    for (let cyc = 0; cyc < cycles; cyc++) {
      // 도장 구역 줄지어 찍기: 도장이 찍히면 쪽지가 사방으로 튀었다 멈춘다
      const n = 8 + (this.lv(2) ? 2 : 0), sx = rnd(-8, -4), dirX = cyc % 2 ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const zx = clamp((dirX > 0 ? sx : -sx) + dirX * i * 2.1 + rnd(-0.4, 0.4), -9, 9);
        this.zone(zx, clamp(P.z + rnd(-3, 3), -7, 8), 2.0, { warn: 1.0, dur: 0.28, color: pal.b, onBoom: (zz) => { const k = this.n(5, 3), a0 = rnd(0, TAU); for (let j = 0; j < k; j++) G.bullets.spawn({ owner: 'boss', kind: 'page', x: zz.x, z: zz.z, a: a0 + (j * TAU) / k, speed: 5.5 * this.spd, size: 1.05, color: pal.c, speeds: [[0, 1.1], [0.45, 0.12], [1.0, 0.12], [1.25, 0.9]], life: 5 }); } });
        this.sfx('telegraph'); yield this.t(0.3);
      }
      yield 0.6;
      if (cyc === 1) { G.ui.warn('연체료가 가산됩니다', 1200); }
      // 나풀거리는 쪽지 비
      const rain = this.n(26, 14);
      for (let i = 0; i < rain; i++) {
        this.shoot({ x: rnd(-9.5, 9.5), z: -11, a: Math.PI / 2 + rnd(-0.1, 0.1), speed: rnd(4.0, 5.8), kind: 'page', size: 1.1, color: i % 3 ? pal.c : pal.a, wob: [1.7, 3.0], wobPh: rnd(0, TAU), life: 8 });
        if (i % 6 === 0) this.shoot({ a: this.aim(), speed: 6.4, kind: 'star', size: 1.1, color: pal.b });
        yield this.t(0.11);
      }
      yield 1.0;
    }
  }

  // ═════════ 스킬 3: 금서 열람 — 책이 날아와 멈추고, 펼쳐져 룬을 뿜고, 쾅 덮인다 ═════════
  *atk_spForbidden(cycles = 3) {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.6, 0.8); G.ui.warn('금서 열람 — 열람 제한을 해제합니다', 1600); yield 1.0;
    for (let cyc = 0; cyc < cycles; cyc++) {
      const nb = 1 + (this.lv(2) ? 1 : 0), books = [];
      for (let i = 0; i < nb; i++) books.push(this.shoot({ a: this.aim() + (nb > 1 ? (i - 0.5) * 0.7 : 0), speed: 5.2, kind: 'page', size: 3.8, hr: 1.0, color: pal.b, spin: 0, life: 12, speeds: [[0, 1], [1.3, 0.0]] }));
      this.sfx('moon_throw'); yield 1.4;
      // 펼쳐짐: 세 갈래 나선 룬
      this.sfx('veil'); let t = 0, acc = 0, ang = rnd(0, TAU);
      const dur = 2.6, dir = cyc % 2 ? -1 : 1;
      while (t < dur) {
        const dt = yield 0; t += dt; acc += dt; ang += dir * dt * 1.7;
        while (acc >= this.t(0.1)) { acc -= this.t(0.1); for (const b of books) if (b && b.active) for (let k = 0; k < 3; k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: b.x, z: b.z, a: ang + (k * TAU) / 3, speed: 3.6 * this.spd, size: 1.0, color: k ? pal.a : pal.c, accel: 0.8, maxS: 5.4 }); }
      }
      // 쾅: 덮이며 전방위 링 + 조준 부채
      for (const b of books) if (b && b.active) {
        const n = this.n(20, 12), a0 = rnd(0, TAU);
        for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'page', x: b.x, z: b.z, a: a0 + (k * TAU) / n, speed: 6.0 * this.spd, size: 1.1, color: pal.c, speeds: [[0, 1.6], [0.4, 0.5]] });
        G.fx.ring(b.x, 0.9, b.z, pal.b, 6, 0.5); G.bullets.kill(b);
      }
      G.world.shake(0.5, 0.3); this.sfx('zone_hit');
      yield 0.5; this.fan(this.n(9, 5), 1.6, this.aim(), { kind: 'star', speed: 6.8, size: 1.1, color: pal.c });
      yield 1.0;
    }
  }

  /** 아카이브 전용: 끊기며 버퍼링되는 데이터 스트림. 탄 기둥이 멈췄다 건너뛰며 내려온다. */
  *atk_dataStream() {
    const pal = this.pal, G = this.G;
    this.cast('glitch'); yield 0.3;
    const cols = 9, W = 20 / cols;
    let gap = (Math.random() * cols) | 0;
    for (let r = 0; r < 7; r++) {
      gap = clamp(gap + (Math.random() < 0.5 ? -1 : 1) * (1 + ((Math.random() * 2) | 0)), 0, cols - 1);
      const st = rnd(0, 0.25);
      for (let c = 0; c < cols; c++) {
        if (Math.abs(c - gap) < 1) continue;
        for (let q = 0; q < 2; q++) this.shoot({ x: -9.5 + c * W + W / 2, z: -11 - q * 0.9, a: Math.PI / 2, speed: 6.4, kind: 'pixel', size: 1.0, color: (c + r) % 2 ? pal.a : pal.c, speeds: [[0, 1], [0.35 + st, 1], [0.4 + st, 0.02], [0.8 + st, 0.02], [0.85 + st, 1.1], [1.4 + st, 1.1], [1.45 + st, 0.02], [1.8 + st, 0.02], [1.85 + st, 1.1]] });
      }
      G.fx.ring(-9.5 + gap * W + W / 2, 0.3, -8, pal.key, 2.5, 0.4);
      this.sfx('glitch', { vol: 0.4 }); yield this.t(0.95);
    }
    yield 0.8;
  }

  // ═════════ 라스트: 디지털 아카이브 전권 — 전 항목을 호출한다 ═════════
  *atk_spArchive() {
    const G = this.G;
    this.cast('moon_throw'); G.ui.warn('아카이브 전권 — 전 항목 호출', 1800); this.glide(0, -6.6, 1.0); yield 1.2;
    const pool = ['sortRows', 'bubbleSort', 'bookmarkLines', 'queryFan', 'shelfWalls', 'crossRef', 'indexCards', 'pageFlip', 'dataStream', 'spSearch', 'spOverdue', 'spForbidden'];
    const lite = new Set(['spSearch', 'spOverdue', 'spForbidden']);
    let last = null;
    while (true) {
      for (const name of shuffle([...pool])) {
        if (name === last) continue; last = name;
        yield* (lite.has(name) ? this['atk_' + name](1) : this['atk_' + name]());
        yield 0.3;
      }
    }
  }
}
