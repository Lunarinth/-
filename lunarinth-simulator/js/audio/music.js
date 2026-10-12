// 절차적 BGM 디렉터.
// - 룩어헤드 스케줄러(16분음표 그리드)로 샘플 정확도에 가깝게 노트를 예약한다.
// - 씬(menu / lumina / umbra / luna / victory / defeat)마다 박자·조성·악기가 다르며,
//   씬 전환은 다음 마디 경계(또는 즉시)에 크로스페이드로 이루어진다.
// - intensity(0~1)로 같은 씬 안에서 레이어/템포를 끌어올린다 (최종 페이즈 광란용).

import { mtof, mulberry32 } from './engine.js';

const LOOKAHEAD = 0.22;

// ───────── 씬 정의 ─────────

const D_LYDIAN_HI = [74, 76, 78, 80, 81, 83, 85, 86, 88];

const LUMINA_CHORDS = [
  { r: 38, n: [50, 57, 61, 64, 66] }, // Dmaj9
  { r: 35, n: [47, 54, 57, 62, 66] }, // Bm7
  { r: 31, n: [43, 50, 54, 59, 61] }, // Gmaj7#11
  { r: 33, n: [45, 52, 57, 61, 64] }, // A
  { r: 38, n: [50, 57, 61, 64, 66] },
  { r: 30, n: [42, 49, 54, 57, 61] }, // F#m7
  { r: 31, n: [43, 50, 54, 59, 61] },
  { r: 33, n: [45, 52, 57, 61, 64] },
];

const LUMINA_PHRASES = [
  [[0, 81, 6], [6, 78, 2], [8, 83, 4], [12, 81, 4]],
  [[0, 85, 4], [4, 83, 4], [8, 81, 6], [14, 78, 2]],
  [[0, 83, 3], [3, 85, 3], [6, 86, 2], [8, 85, 4], [12, 83, 4]],
  [[0, 85, 4], [4, 81, 4], [8, 88, 4], [12, 85, 4]],
  [[0, 86, 6], [6, 85, 2], [8, 83, 4], [12, 81, 4]],
  [[0, 85, 6], [6, 83, 2], [8, 81, 8]],
  [[0, 86, 4], [4, 85, 4], [8, 83, 4], [12, 80, 4]],
  [[0, 81, 8], [8, 85, 4], [12, 86, 4]],
];

const LUMINA = {
  bpm: 96,
  tick(m, sc, t, s, bar) {
    const E = m.E, b = sc.b, sd = 60 / this.bpm / 4, bi = bar % 8, ch = LUMINA_CHORDS[bi];
    const rnd = mulberry32(bar * 977 + s * 13 + 3);
    if (s === 0) {
      E.pad(b, t, ch.n, sd * 16.3, 0.045, { a: 1.4, r: 1.6, cut: 800, cutTo: 2100 });
      E.bass(b, t, ch.r, sd * 14, 0.22);
      if (bar % 4 === 0) E.choir(b, t, [ch.n[2] + 12, ch.n[4] + 12], sd * 32, 0.028);
    }
    if (s % 2 === 0) { // 오르골 아르페지오
      const idx = [1, 2, 3, 4, 3, 2, 3, 2][(s / 2) | 0];
      E.bell(b, t, ch.n[idx] + 12 + (idx === 4 ? 12 : 0), 0.06, 1.6, 0.55, 0.3);
    }
    if (s % 4 === 2 && rnd() < 0.4) E.bell(b, t, D_LYDIAN_HI[(rnd() * D_LYDIAN_HI.length) | 0] + 12, 0.035, 2.2, 0.8, 0.5);
    if (bar >= 2) {
      for (const [st, midi, d] of LUMINA_PHRASES[bi]) if (st === s) {
        E.lead(b, t, midi, sd * d * 0.95, 0.05, { type: 'triangle', cut: 3600, cutTo: 2400, vib: 12, a: 0.04, rev: 0.55, dly: 0.3 });
        if (st === 0) E.bell(b, t, midi + 12, 0.04, 2.4, 0.7, 0.4);
      }
    }
    if (bar >= 4) {
      if (s === 0 || s === 8) E.kick(b, t, 0.3, 0.9);
      if (s === 12) E.snare(b, t, 0.1, 0.4);
    }
    if (s % 4 === 2) E.hat(b, t, 0.05);
  },
};

const UMBRA_CHORDS = [
  { r: 30, n: [42, 49, 54, 57, 61] }, // F#m
  { r: 31, n: [43, 50, 55, 59, 62] }, // G (♭II)
  { r: 30, n: [42, 49, 54, 57, 61] },
  { r: 28, n: [40, 47, 52, 56, 59] }, // E
  { r: 30, n: [42, 49, 54, 57, 61] },
  { r: 31, n: [43, 50, 55, 59, 62] },
  { r: 33, n: [45, 52, 57, 61, 64] }, // A
  { r: 28, n: [40, 47, 52, 56, 59] },
];
const UMBRA_SCALE = [78, 79, 81, 83, 85, 86, 88];
const UMBRA_CELLO = [54, 55, 57, 59, 61, 62, 64];

const UMBRA = {
  bpm: 68,
  tick(m, sc, t, s, bar) {
    const E = m.E, b = sc.b, sd = 60 / this.bpm / 4, ch = UMBRA_CHORDS[bar % 8];
    const rnd = mulberry32(bar * 1301 + s * 29 + 7);
    if (s === 0) {
      E.pad(b, t, ch.n, sd * 16.4, 0.05, { a: 2.0, r: 2.2, cut: 420, cutTo: 900, rev: 0.75 });
      E.tone(b, { type: 'sine', f: mtof(ch.r - 12 + 12), t, dur: sd * 16, vol: 0.2, a: 0.4, d: 1, s: 0.9, r: 1 }); // 서브 드론
      E.bass(b, t, ch.r, sd * 15, 0.2, { cut: 200 });
      if (bar % 2 === 0) E.choir(b, t, [ch.n[1] + 12, ch.n[3]], sd * 32, 0.032, { vowel: 'o', rev: 0.9 });
    }
    // 심장 박동
    if (s === 0) E.kick(b, t, 0.5, 0.75);
    if (s === 3) E.kick(b, t, 0.3, 0.7);
    if (s === 8 && bar % 2 === 1) E.taiko(b, t, 0.42, 0.6);
    // 속삭임 (기만)
    if (rnd() < 0.09) E.noise(b, { t, dur: 0.9, vol: 0.045, type: 'bandpass', f: 2400 + rnd() * 2400, f1: 1800, q: 8, a: 0.25, rev: 0.8 });
    // 멀리서 울리는 종
    if (s % 4 === 0 && rnd() < 0.5) E.bell(b, t, UMBRA_SCALE[(rnd() * UMBRA_SCALE.length) | 0], 0.06, 3, 0.85, 0.6);
    // 첼로풍 저음 선율
    if (bar % 2 === 0 && (s === 0 || s === 8)) {
      const note = UMBRA_CELLO[(rnd() * UMBRA_CELLO.length) | 0];
      E.lead(b, t, note, sd * 7.5, 0.06, { type: 'sawtooth', cut: 900, cutTo: 650, vib: 26, a: 0.25, r: 0.5, rev: 0.7, dly: 0.2 });
    }
    // 역재생 느낌의 스웰
    if (bar % 4 === 3 && s === 8) E.noise(b, { t, dur: sd * 8, vol: 0.09, type: 'bandpass', f: 400, f1: 4200, q: 2, swell: true, a: 0.02, rev: 0.6 });
  },
};

const LUNA_CHORDS = [
  { r: 33, n: [45, 52, 57, 60, 64] }, // Am
  { r: 29, n: [41, 48, 53, 57, 60] }, // F
  { r: 26, n: [38, 45, 50, 53, 57] }, // Dm
  { r: 28, n: [40, 47, 52, 56, 59] }, // E
  { r: 33, n: [45, 52, 57, 60, 64] },
  { r: 29, n: [41, 48, 53, 57, 60] },
  { r: 28, n: [40, 47, 52, 56, 59] },
  { r: 28, n: [40, 47, 52, 56, 62] }, // E7
];
const LUNA_PHRASES = [
  [[0, 81, 3], [3, 84, 1], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 81, 4]],
  [[0, 84, 3], [3, 81, 1], [4, 89, 4], [8, 88, 2], [10, 84, 2], [12, 81, 4]],
  [[0, 86, 3], [3, 89, 1], [4, 86, 4], [8, 84, 4], [12, 81, 2], [14, 86, 2]],
  [[0, 88, 3], [3, 92, 1], [4, 88, 4], [8, 83, 4], [12, 80, 4]],
  [[0, 88, 2], [2, 89, 2], [4, 88, 2], [6, 84, 2], [8, 81, 4], [12, 84, 4]],
  [[0, 89, 2], [2, 88, 2], [4, 84, 2], [6, 81, 2], [8, 84, 4], [12, 89, 4]],
  [[0, 88, 4], [4, 86, 2], [6, 84, 2], [8, 83, 4], [12, 80, 2], [14, 83, 2]],
  [[0, 80, 2], [2, 83, 2], [4, 88, 4], [8, 92, 4], [12, 88, 4]],
];
const ARP_PAT = [0, 2, 4, 2, 1, 3, 4, 3];

const LUNA = {
  bpm: 148,
  bpmEnrage: 12,
  init(m, sc) {
    const c = m.E.ctx;
    sc.pump = c.createGain();
    sc.pump.connect(sc.bus);
    sc.bp = { dry: sc.pump, rev: sc.b.rev, dly: sc.b.dly };
  },
  tick(m, sc, t, s, bar) {
    const E = m.E, b = sc.b, sd = 60 / (this.bpm + this.bpmEnrage * m.intensity) / 4, bi = bar % 8, ch = LUNA_CHORDS[bi];
    const hi = m.intensity > 0.5;
    // 사이드체인풍 펌핑
    if (s % 4 === 0) {
      const g = sc.pump.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(0.28, t); g.linearRampToValueAtTime(1, t + sd * 3.4);
    }
    if (s === 0) {
      E.pad(sc.bp, t, ch.n, sd * 16.3, 0.04, { a: 0.3, r: 0.6, cut: 1500, cutTo: 3200, rev: 0.4 });
      if (bar % 2 === 0) E.choir(sc.bp, t, [ch.n[1] + 12, ch.n[3] + 12, ch.n[4] + 12], sd * 32, 0.05, { rev: 0.8 });
    }
    // 드럼
    if (s % 4 === 0) E.kick(b, t, 0.85, 1);
    if (hi && s === 14) E.kick(b, t, 0.6, 1.1);
    if (s === 4 || s === 12) E.snare(b, t, 0.5, 0.3);
    if (bar % 4 === 3 && s >= 12 && hi) E.snare(b, t, 0.2 + (s - 12) * 0.1, 0.2);
    if (s % 4 === 2) E.hat(b, t, 0.13, true);
    else if (s % 2 === 1 || hi) E.hat(b, t, 0.08);
    // 베이스
    if (s % 2 === 0) E.bass(b, t, ch.r + (s % 4 === 2 ? 12 : 0), sd * 1.7, 0.3, { cut: 700, grit: 0.55 });
    // 16분 톱니 아르페지오
    {
      const idx = ARP_PAT[s % 8];
      E.pluck(b, t, ch.n[idx % ch.n.length] + 12, hi ? 0.055 : 0.045, sd * 1.5, { type: 'sawtooth', cut: 1800 + (bar % 8) * 450, rev: 0.15, dly: 0.28 });
    }
    // 리드 훅
    if (bar >= 2) {
      for (const [st, midi, d] of LUNA_PHRASES[bi]) if (st === s) {
        E.lead(b, t, midi - 12, sd * d * 0.95, 0.08, { type: 'sawtooth', cut: 3800, cutTo: 2600, vib: 20, detune: 6, dly: 0.3, a: 0.012 });
        if (hi) E.lead(b, t, midi, sd * d * 0.9, 0.04, { type: 'square', cut: 4200, cutTo: 3000, vib: 16, dly: 0.2 });
        if (st === 0) E.bell(b, t, midi, 0.05, 1.8, 0.6, 0.5);
      }
    }
  },
};

// 잔잔한 루프용 씬 팩토리 (메뉴 / 승리 / 패배)
function calm({ bpm, chords, scale, bellVol = 0.06, choir = true, arp = true, vowel = 'a', padCut = 700, kick = false }) {
  return {
    bpm,
    tick(m, sc, t, s, bar) {
      const E = m.E, b = sc.b, sd = 60 / bpm / 4, ch = chords[bar % chords.length];
      const rnd = mulberry32(bar * 313 + s * 17 + 11);
      if (s === 0) {
        E.pad(b, t, ch.n, sd * 16.3, 0.05, { a: 1.8, r: 2, cut: padCut, cutTo: padCut * 2.4, rev: 0.7 });
        E.bass(b, t, ch.r, sd * 15, 0.16);
        if (choir && bar % 2 === 0) E.choir(b, t, [ch.n[2] + 12, ch.n[4] + 12], sd * 32, 0.03, { vowel });
        if (kick && bar % 2 === 0) E.taiko(b, t, 0.25, 0.7);
      }
      if (arp && s % 2 === 0) {
        const idx = [1, 3, 2, 4, 3, 2, 4, 3][(s / 2) | 0];
        E.bell(b, t, ch.n[idx % ch.n.length] + 12, bellVol, 2.2, 0.7, 0.45);
      }
      if (s % 4 === 0 && rnd() < 0.45) E.bell(b, t, scale[(rnd() * scale.length) | 0], bellVol * 0.7, 2.8, 0.85, 0.5);
    },
  };
}

const MENU = calm({ bpm: 64, chords: LUMINA_CHORDS, scale: D_LYDIAN_HI.map((x) => x + 12), vowel: 'o', padCut: 650 });

const VICTORY = calm({
  bpm: 84, bellVol: 0.07, padCut: 900, kick: true,
  chords: [
    { r: 38, n: [50, 57, 62, 66, 69] }, { r: 43, n: [43, 50, 55, 59, 62] },
    { r: 35, n: [47, 54, 59, 62, 66] }, { r: 45, n: [45, 52, 57, 61, 64] },
  ],
  scale: [81, 83, 85, 86, 88, 90, 93],
});

const DEFEAT = calm({
  bpm: 52, bellVol: 0.05, padCut: 500, choir: true, vowel: 'o',
  chords: [
    { r: 38, n: [38, 45, 50, 53, 57] }, { r: 34, n: [34, 41, 46, 50, 53] },
    { r: 31, n: [31, 38, 43, 46, 50] }, { r: 33, n: [33, 40, 45, 49, 52] },
  ],
  scale: [69, 72, 74, 77, 81],
});

// ───────── 옵서 (STAGE 1): 별빛 아르페지오와 나른한 정찰 비트 ─────────
const OPSIR_CHORDS = [
  { r: 40, n: [52, 59, 64, 67, 71] }, // Em9
  { r: 36, n: [48, 55, 60, 64, 67] }, // Cmaj7
  { r: 43, n: [55, 62, 67, 71, 74] }, // Gmaj7
  { r: 38, n: [50, 57, 62, 66, 69] }, // D6
];
const OPSIR_PHRASES = [
  [[0, 83, 3], [4, 86, 2], [6, 83, 2], [8, 79, 4], [12, 83, 4]],
  [[0, 84, 3], [4, 88, 2], [6, 84, 2], [8, 79, 4], [12, 76, 4]],
  [[0, 86, 3], [4, 83, 2], [6, 79, 2], [8, 86, 4], [12, 90, 4]],
  [[0, 90, 2], [2, 86, 2], [4, 85, 4], [8, 81, 4], [12, 85, 4]],
];
const OPSIR = {
  bpm: 112,
  tick(m, sc, t, s, bar) {
    const E = m.E, b = sc.b, sd = 60 / this.bpm / 4, bi = bar % 4, ch = OPSIR_CHORDS[bi];
    const rnd = mulberry32(bar * 421 + s * 19 + 5);
    if (s === 0) E.pad(b, t, ch.n, sd * 16.3, 0.04, { a: 0.7, r: 1.4, cut: 900, cutTo: 2600, rev: 0.6 });
    if (s % 4 === 0) E.bass(b, t, ch.r + (s === 8 ? 7 : 0), sd * 3.4, 0.2, { cut: 520 });
    if (s % 4 === 0) E.kick(b, t, 0.5, 0.95);
    if (s === 4 || s === 12) E.snare(b, t, 0.26, 0.35);
    if (s % 2 === 0) E.hat(b, t, 0.05);
    // 별빛 아르페지오 (높은 음역의 오르골)
    const idx = [1, 3, 2, 4, 3, 4, 2, 3][(s / 2) | 0];
    if (s % 2 === 0) E.bell(b, t, ch.n[idx % ch.n.length] + 24, 0.045, 1.5, 0.6, 0.4);
    if (s % 4 === 2 && rnd() < 0.5) E.bell(b, t, 88 + ((rnd() * 5) | 0) * 2, 0.03, 2.0, 0.8, 0.5);
    if (bar >= 2) for (const [st, midi, d] of OPSIR_PHRASES[bi]) if (st === s) E.lead(b, t, midi - 12, sd * d * 0.9, 0.055, { type: 'triangle', cut: 3200, cutTo: 2200, vib: 10, a: 0.03, rev: 0.5, dly: 0.35 });
  },
};

// ───────── 벨리스 (STAGE 5): 건조한 하프시코드풍 아르페지오와 합창, 감사의 행진 ─────────
const BELLIS_CHORDS = [
  { r: 37, n: [49, 56, 61, 64, 68] }, // C#m
  { r: 33, n: [45, 52, 57, 61, 64] }, // A
  { r: 40, n: [52, 56, 59, 64, 68] }, // E
  { r: 35, n: [47, 54, 59, 63, 66] }, // B
  { r: 37, n: [49, 56, 61, 64, 68] },
  { r: 38, n: [50, 57, 62, 66, 69] }, // D (♭II 느낌)
  { r: 32, n: [44, 51, 56, 60, 63] }, // G#
  { r: 32, n: [44, 51, 56, 59, 63] },
];
const BELLIS = {
  bpm: 134,
  tick(m, sc, t, s, bar) {
    const E = m.E, b = sc.b, sd = 60 / this.bpm / 4, bi = bar % 8, ch = BELLIS_CHORDS[bi];
    const rnd = mulberry32(bar * 733 + s * 11 + 9);
    if (s === 0) {
      E.pad(b, t, ch.n, sd * 16.3, 0.04, { a: 0.5, r: 1.0, cut: 1000, cutTo: 2800, rev: 0.55 });
      if (bar % 2 === 0) E.choir(b, t, [ch.n[2] + 12, ch.n[4] + 12], sd * 32, 0.04, { vowel: 'o', rev: 0.85 });
    }
    if (s % 4 === 0) E.kick(b, t, 0.7, 0.9);
    if (s === 8) E.taiko(b, t, 0.3, 0.6);
    if (s === 4 || s === 12) E.snare(b, t, 0.3, 0.3);
    if (s % 2 === 1) E.hat(b, t, 0.06);
    if (s % 2 === 0) E.bass(b, t, ch.r + (s % 8 === 4 ? 12 : 0), sd * 1.8, 0.24, { cut: 600, grit: 0.4 });
    // 하프시코드풍 아르페지오
    E.pluck(b, t, ch.n[[0, 2, 4, 3, 1, 3, 4, 2][s % 8] % ch.n.length] + 12, 0.045, sd * 1.4, { type: 'square', cut: 2600 + (bar % 8) * 200, rev: 0.2, dly: 0.2 });
    // 서술하는 듯한 스타카토 리드
    if (bar >= 2 && (s === 0 || s === 3 || s === 6 || s === 10 || s === 12)) E.lead(b, t, ch.n[(s + bar) % 5] + 24, sd * 1.6, 0.05, { type: 'sawtooth', cut: 3200, cutTo: 2000, a: 0.005, rev: 0.4, dly: 0.25 });
    if (s % 4 === 2 && rnd() < 0.35) E.bell(b, t, 96 + ((rnd() * 4) | 0) * 2, 0.04, 1.6, 0.7, 0.4);
  },
};

const ENDING = calm({
  bpm: 70, bellVol: 0.07, padCut: 800, vowel: 'a',
  chords: [
    { r: 38, n: [50, 57, 62, 66, 69] }, { r: 35, n: [47, 54, 59, 62, 66] },
    { r: 31, n: [43, 50, 55, 59, 62] }, { r: 38, n: [50, 57, 62, 66, 69] },
    { r: 36, n: [48, 55, 60, 64, 67] }, { r: 31, n: [43, 50, 55, 59, 64] },
    { r: 33, n: [45, 52, 57, 61, 64] }, { r: 38, n: [50, 57, 62, 66, 69] },
  ],
  scale: [81, 83, 85, 86, 88, 90, 93, 95],
});

const SCENES = { menu: MENU, lumina: LUMINA, umbra: UMBRA, luna: LUNA, victory: VICTORY, defeat: DEFEAT, opsir: OPSIR, bellis: BELLIS, ending: ENDING };

// ───────── 디렉터 ─────────

export class MusicDirector {
  constructor(engine) {
    this.E = engine;
    this.cur = null;
    this.pending = null;
    this.timer = null;
    this.nextT = 0;
    this.step = 0;
    this.intensity = 0;
    this.name = null;
  }

  _makeScene(name, t, fade) {
    const E = this.E, c = E.ctx, def = SCENES[name];
    const bus = c.createGain(), rev = c.createGain(), dly = c.createGain();
    for (const g of [bus, rev, dly]) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + fade); }
    bus.connect(E.musicBus); rev.connect(E.musicRev); dly.connect(E.dlyIn);
    const sc = { name, def, bus, revG: rev, dlyG: dly, b: { dry: bus, rev, dly } };
    if (def.init) def.init(this, sc);
    return sc;
  }

  _retire(sc, t, fade) {
    if (!sc) return;
    for (const g of [sc.bus, sc.revG, sc.dlyG]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0.0001, t, Math.max(0.05, fade / 4));
    }
    setTimeout(() => { try { sc.bus.disconnect(); sc.revG.disconnect(); sc.dlyG.disconnect(); if (sc.pump) sc.pump.disconnect(); } catch (e) { /* noop */ } }, (fade + 5) * 1000);
  }

  /** 씬 재생. immediate=false면 현재 마디가 끝나는 지점에서 크로스페이드한다. */
  play(name, { fade = 2.4, immediate = false } = {}) {
    const E = this.E;
    if (!E.ready || !SCENES[name]) return;
    if (this.name === name && !this.pending) return;
    if (!this.cur) {
      this.cur = this._makeScene(name, E.ctx.currentTime + 0.06, fade);
      this.name = name;
      this.step = 0;
      this.nextT = E.ctx.currentTime + 0.08;
      this._applyTempo();
    } else {
      this.pending = { name, fade, immediate };
    }
    if (!this.timer) this.timer = setInterval(() => this._pump(), 30);
  }

  stop(fade = 1.5) {
    const E = this.E;
    this.pending = null;
    if (this.cur && E.ready) this._retire(this.cur, E.ctx.currentTime, fade);
    this.cur = null; this.name = null;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

  _applyTempo() {
    const def = this.cur && this.cur.def;
    if (def && this.E.ready) this.E.dly.delayTime.setTargetAtTime(60 / def.bpm * 0.75, this.E.ctx.currentTime, 0.1);
  }

  _pump() {
    const c = this.E.ctx;
    if (!c || c.state !== 'running') { if (c) this.nextT = Math.max(this.nextT, c.currentTime + 0.05); return; }
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05; // 오래 멈췄다 복귀한 경우 재동기화
    let guard = 0;
    while (this.nextT < c.currentTime + LOOKAHEAD && guard++ < 32) this._tick(this.nextT);
  }

  _tick(t) {
    if (this.pending && (this.pending.immediate || this.step % 16 === 0)) {
      const p = this.pending; this.pending = null;
      this._retire(this.cur, t, p.fade);
      this.cur = this._makeScene(p.name, t, p.fade);
      this.name = p.name;
      this.step = 0;
      this._applyTempo();
    }
    const sc = this.cur;
    if (!sc) { this.nextT = t + 0.1; return; }
    const s = this.step % 16, bar = Math.floor(this.step / 16);
    try { sc.def.tick(this, sc, t, s, bar); } catch (e) { console.error('music tick', e); }
    const bpm = sc.def.bpm + (sc.def.bpmEnrage || 0) * this.intensity;
    this.nextT = t + 60 / bpm / 4;
    this.step++;
  }

  // ───── 전환 연출 ─────
  /** dur초 동안 차오르는 라이저. 끝나는 시각(보스 임팩트 타이밍)을 반환. */
  riser(dur = 2.8) {
    const E = this.E; if (!E.ready) return 0;
    const t = E.ctx.currentTime + 0.03;
    const b = { dry: E.sfxBus, rev: E.sfxRev, dly: null };
    E.noise(b, { t, dur, vol: 0.28, type: 'bandpass', f: 300, f1: 7500, q: 1.6, swell: true, a: 0.1, rev: 0.4 });
    E.tone(b, { type: 'sawtooth', f: 110, f1: 880, glide: dur, t, dur, vol: 0.07, a: dur * 0.9, d: 0.01, s: 1, r: 0.05, cut: 1200, cutTo: 5000, cutT: dur, rev: 0.4 });
    E.tone(b, { type: 'sine', f: 55, f1: 220, glide: dur, t, dur, vol: 0.2, a: dur * 0.8, d: 0.01, s: 1, r: 0.05 });
    return t + dur;
  }
  /** 거대한 임팩트 (타이코 + 서브 드롭 + 심벌). */
  boom(at = 0) {
    const E = this.E; if (!E.ready) return;
    const t = at || E.ctx.currentTime + 0.02;
    const b = { dry: E.sfxBus, rev: E.sfxRev, dly: null };
    E.taiko(b, t, 1.1, 0.8);
    E.tone(b, { type: 'sine', f: 70, f1: 28, glide: 1.4, t, dur: 1.8, vol: 0.5, a: 0.002, d: 1.6, s: 0.01, r: 0.3 });
    E.noise(b, { t, dur: 1.8, vol: 0.22, type: 'highpass', f: 5200, q: 0.7, rev: 0.6 });
    E.duck(0.25, 0.5, 1.4);
  }
}
