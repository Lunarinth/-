// 데이터 기반 작곡기: 코드 진행 · 음계 · 리듬 모티브 · 레이어 구성을 적으면 곡이 된다.
// - 한 마디는 barSteps(기본 16 = 4/4, 12 = 3/4 왈츠, 8 = 2/4 폴카) 스텝이고, 스텝은 16분음표다.
// - mulberry32 시드로 선율을 결정적으로 만든다 (같은 구간은 같은 선율이 반복된다).
// - 8마디가 한 사이클이고, form 문자열(i 인트로 · a/b/c/d 구간)이 사이클마다 어떤 레이어가 켜질지 정한다.
// - layers 의 각 항목은 { s: '구간문자들', I: 최소 intensity, ...악기 파라미터 }. 값에 {a:..,b:..} 구간 맵을 줄 수 있는 키:
//   pat, voice, vol, oct. 구간별 조옮김(modul), 템포(bpmSec), 음량(secVol), 스윙(swing)으로 구간 성격을 바꾼다.
import { mtof, mulberry32 } from './engine.js';

const TYPES = {
  maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], dom7: [0, 4, 7, 10], sus2: [0, 2, 7], sus4: [0, 5, 7],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], min9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], m6: [0, 3, 7, 9], aug: [0, 4, 8],
  six: [0, 4, 7, 9], hdim: [0, 3, 6, 10], mmaj7: [0, 3, 7, 11], pow: [0, 7, 12],
};
/** r: 베이스 MIDI(26~45). 반환: { r, n: 5성 화음(패드 음역), pcs: 구성음 pitch class } */
export function chord(r, type = 'min') {
  const iv = TYPES[type] || TYPES.min, base = r + 12;
  const n = [base, base + iv[2], base + 12 + iv[1], base + 12 + (iv[3] ?? 12), base + 12 + iv[2]];
  return { r, n, pcs: iv.map((x) => (r + x) % 12), type };
}
const shiftChord = (c, k) => (k ? { r: c.r + k, n: c.n.map((x) => x + k), pcs: c.pcs.map((x) => (x + k + 12) % 12), type: c.type } : c);
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], pent: [0, 2, 4, 7, 9], minpent: [0, 3, 5, 7, 10],
};
function scaleNotes(root, mode, lo, hi) {
  const iv = SCALES[mode] || SCALES.minor, out = [];
  for (let m = lo; m <= hi; m++) if (iv.includes(((m - root) % 12 + 12) % 12)) out.push(m);
  return out;
}

// 드럼 패턴 (barSteps 에 맞춰 길이가 다르다)
const DRUMS = {
  four: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], o: [2, 10] },
  half: { k: [0, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [] },
  drive: { k: [0, 3, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [6, 14] },
  gallop: { k: [0, 2, 4, 6, 8, 10, 12, 14], s: [4, 12], h: [1, 3, 5, 7, 9, 11, 13, 15], o: [] },
  break: { k: [0, 6, 10], s: [4, 12, 15], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [14] },
  edm: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], o: [2, 6, 10, 14] },
  dnb: { k: [0, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [7, 15] },
  bossa: { k: [0, 6, 8, 14], s: [3, 9, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [] },
  polka: { k: [0, 8], s: [4, 12], h: [2, 6, 10, 14], o: [] },
  jig: { k: [0, 6, 8], s: [4, 12], h: [0, 3, 6, 9, 12, 15], o: [] },
  trance: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], o: [2, 6, 10, 14] },
  heart: { k: [0, 3], s: [], h: [], o: [] },
  march: { k: [0, 8], s: [0, 4, 8, 12], h: [], o: [] },
  fast16: { k: [0, 4, 8, 12], s: [4, 12], h: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], o: [] },
  none: { k: [], s: [], h: [], o: [] },
  // 3/4 (12스텝)
  waltz: { k: [0], s: [], h: [4, 8], o: [], bs: 12 },
  waltz2: { k: [0, 6], s: [4, 8], h: [0, 2, 4, 6, 8, 10], o: [], bs: 12 },
  waltz3: { k: [0, 4, 8], s: [4, 8], h: [0, 2, 4, 6, 8, 10], o: [], bs: 12 },
  // 2/4 (8스텝)
  circus: { k: [0, 4], s: [2, 6], h: [1, 3, 5, 7], o: [], bs: 8 },
};
// 베이스 패턴: [step, 음정 오프셋(12=옥타브), 길이(스텝)]
const BASS = {
  root8: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 12, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 12, 2]],
  pulse16: Array.from({ length: 16 }, (_, i) => [i, i % 4 === 2 ? 12 : 0, 1]),
  whole: [[0, 0, 15]],
  half: [[0, 0, 7], [8, 7, 7]],
  octave: [[0, 0, 3], [4, 12, 3], [8, 0, 3], [12, 12, 3]],
  gallop: [[0, 0, 2], [2, 0, 1], [3, 0, 1], [4, 0, 2], [6, 0, 1], [7, 0, 1], [8, 0, 2], [10, 0, 1], [11, 0, 1], [12, 7, 2], [14, 0, 1], [15, 0, 1]],
  walk: [[0, 0, 3], [4, 7, 3], [8, 12, 3], [12, 7, 3]],
  walkswing: [[0, 0, 3], [4, 4, 3], [8, 7, 3], [12, 9, 3]],
  synco: [[0, 0, 3], [3, 0, 2], [6, 12, 2], [8, 0, 3], [11, 0, 2], [14, 7, 2]],
  dnb: [[0, 0, 5], [6, 0, 2], [10, 0, 3], [13, 7, 2]],
  polka: [[0, 0, 3], [4, 7, 3], [8, 0, 3], [12, 7, 3]],
  bossa: [[0, 0, 5], [6, 7, 2], [8, 0, 5], [14, 7, 2]],
  trance: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? null : [i, 0, 1])).filter(Boolean),
  waltz: [[0, 0, 3], [6, 7, 2]],
  waltzW: [[0, 0, 3], [4, 7, 3], [8, 7, 3]],
  circus: [[0, 0, 2], [4, 7, 2]],
  circus16: [[0, 0, 1], [2, 7, 1], [4, 0, 1], [6, 7, 1]],
};

function genPhrase(O, sec, blk, secIdx, bs) {
  const rnd = mulberry32((O.seed || 1) * 7919 + sec.charCodeAt(0) * 101 + blk * 13);
  const R = O.rhythms, rhy = R[(secIdx + (blk === 2 ? 1 : 0)) % R.length];
  const [lo, hi] = O.range || [66, 90];
  const scaleN = scaleNotes(O.scale.root, O.scale.mode, lo, hi);
  const chA = O.prog[(blk * 2) % O.prog.length], chB = O.prog[(blk * 2 + 1) % O.prog.length];
  const nearestCT = (idx, ch) => {
    let best = idx, bd = 99;
    for (let i = 0; i < scaleN.length; i++) if (ch.pcs.includes(scaleN[i] % 12)) { const d = Math.abs(i - idx); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  let idx = Math.round(scaleN.length * (0.35 + 0.1 * (blk % 2)) + rnd() * 2);
  const out = [], dir0 = blk % 2 === 0 ? 1 : -1;
  rhy.forEach(([st, len], i) => {
    const ch = st < bs ? chA : chB, half = st < bs ? 0 : 1;
    const dir = (half === 0 ? dir0 : -dir0) * (rnd() < 0.68 ? 1 : -1);
    const mv = [1, 1, 2, 1, 3][(rnd() * 5) | 0] * dir;
    idx = Math.max(0, Math.min(scaleN.length - 1, idx + mv));
    if (st % (bs >> 1) === 0 || i === 0) idx = nearestCT(idx, ch);
    if (i === rhy.length - 1 && blk === 3) idx = nearestCT(Math.max(0, idx - 2), chB);
    out.push([st, scaleN[idx], len]);
  });
  return out;
}

/** 곡 정의 → 뮤직 디렉터 씬 */
export function compose(O) {
  const prog = O.prog.length === 4 ? [...O.prog, ...O.prog] : O.prog;
  const BS = O.barSteps || 16;
  O = { ...O, prog };
  const form = O.form || 'iabac';
  const secOf = (bar) => { const cyc = Math.floor(bar / 8); return cyc === 0 ? form[0] : form[1 + ((cyc - 1) % (form.length - 1))]; };
  const pick = (v, sec) => (v && typeof v === 'object' && !Array.isArray(v) ? (v[sec] ?? v.def ?? Object.values(v)[0]) : v);
  return {
    bpm: O.bpm, bpmEnrage: O.bpmEnrage || 0, barSteps: BS,
    bpmAt(bar, I = 0) { const sec = secOf(bar); return (O.bpm + (O.bpmEnrage || 0) * I) * (O.bpmSec ? (O.bpmSec[sec] ?? 1) : 1); },
    init(m, sc) {
      sc.memo = {};
      if (O.pump) { const c = m.E.ctx; sc.pump = c.createGain(); sc.pump.connect(sc.bus); sc.bp = { dry: sc.pump, rev: sc.b.rev, dly: sc.b.dly }; }
    },
    tick(m, sc, t, s, bar) {
      const E = m.E, I = m.intensity, b = sc.b, bp = sc.bp || b;
      const bpm = this.bpmAt(bar, I), sd = 60 / bpm / 4;
      const bi = bar % 8, sec = secOf(bar), cyc = Math.floor(bar / 8);
      const secIdx = 'iabcd'.indexOf(sec), k = (O.modul && O.modul[sec]) || 0, ch = shiftChord(prog[bi], k);
      if (O.swing && s % 2 === 1) t += sd * O.swing;
      const lay = (n) => { const L = O.layers[n]; if (!L) return null; if (L.s && !L.s.includes(sec)) return null; if (L.I != null && I < L.I) return null; return L; };
      const rnd = mulberry32(bar * 977 + s * 13 + (O.seed || 1));
      const last8 = bi === 7, half = BS >> 1;

      // 구간 음량(다이내믹)
      if (s === 0 && O.secVol && sc.bus) { sc.bus.gain.setTargetAtTime(O.secVol[sec] ?? 1, t, 0.35); }
      if (O.pump && s % (BS === 16 ? 4 : BS === 12 ? 4 : 2) === 0) { const g = sc.pump.gain; g.cancelScheduledValues(t); g.setValueAtTime(O.pump, t); g.linearRampToValueAtTime(1, t + sd * 3.4); }

      // ───── 마디 단위 지속음 ─────
      if (s === 0) {
        let L;
        if ((L = lay('pad'))) E.pad(bp, t, ch.n, sd * (BS + 0.3), L.vol ?? 0.045, { a: L.a ?? 0.6, r: L.r ?? 1.2, cut: L.cut ?? 1000, cutTo: L.cutTo ?? 2600, rev: L.rev ?? 0.55, type: L.type });
        if ((L = lay('strings'))) {
          const notes = L.hi ? [ch.n[2], ch.n[3], ch.n[4]] : [ch.n[1], ch.n[2], ch.n[3]], st = pick(L.style, sec) || 'long';
          if (st === 'long') E.strings(bp, t, notes, sd * (BS + 0.2), L.vol ?? 0.04, { a: L.a ?? 0.5, cut: L.cut, cutTo: L.cutTo, rev: L.rev });
          else if (st === 'half') { E.strings(bp, t, notes, sd * half, L.vol ?? 0.04, { a: 0.2, rev: L.rev }); E.strings(bp, t + sd * half, notes.map((x) => x + (bi % 2 ? 2 : 0)), sd * half, L.vol ?? 0.04, { a: 0.2, rev: L.rev }); }
          else if (st === 'swell') E.strings(bp, t, notes, sd * (BS + 0.2), L.vol ?? 0.04, { a: sd * BS * 0.7, cut: 1400, cutTo: 4200, rev: L.rev });
        }
        if ((L = lay('choir')) && (L.every ? bar % L.every === 0 : true)) E.choir(bp, t, [ch.n[1] + 12, ch.n[3] + 12, ch.n[4] + 12], sd * (L.len ?? BS * 2), L.vol ?? 0.04, { vowel: L.vowel, rev: L.rev ?? 0.85 });
        if ((L = lay('organ'))) E.organ(bp, t, [ch.n[0], ch.n[2], ch.n[3]], sd * BS, L.vol ?? 0.035, { rev: L.rev });
        if ((L = lay('drone'))) E.tone(b, { type: 'sine', f: mtof(ch.r), t, dur: sd * BS, vol: L.vol ?? 0.2, a: 0.4, d: 1, s: 0.9, r: 1 });
        if ((L = lay('brassPad'))) E.brass(bp, t, [ch.n[0] + 12, ch.n[1] + 12, ch.n[2]], sd * (BS - 1), L.vol ?? 0.04, { a: 0.18, cut: 600, cutTo: 2600 });
        if (O.crash && lay('drums') && bi === 0 && sec !== 'i') E.crash(b, t, O.crash, 1.8);
        if (I >= 0.99 && lay('timp') && bi % 2 === 0) E.timpRoll(b, t + sd * (BS - 8), sd * 8, 0.35);
      }

      // ───── 16분 반복 레이어 ─────
      {
        let L = lay('tremolo');
        if (L && (L.every16 || s % 2 === 0)) for (const n of [ch.n[2], ch.n[3], ch.n[4]].slice(0, 2)) E.pluck(bp, t, n + (L.oct ?? 0), L.vol ?? 0.04, sd * 1.5, { type: 'sawtooth', cut: L.cut ?? 2600, rev: 0.25, dly: 0.1 });
        L = lay('stab');
        if (L) {
          const steps = pick(L.steps, sec) || [0, 6, 10], v = pick(L.voice, sec) || 'pluck';
          if (steps.includes(s)) {
            const ns = [ch.n[1], ch.n[2], ch.n[3]].map((x) => x + (L.oct ?? 12));
            if (v === 'brass') E.brass(bp, t, ns, sd * (L.len ?? 1.5), L.vol ?? 0.04, { a: 0.03, r: 0.1 });
            else if (v === 'harpsi') for (const n of ns) E.harpsi(bp, t, n, L.vol ?? 0.045, sd * 1.5);
            else if (v === 'strings') E.strings(bp, t, ns, sd * (L.len ?? 1.5), L.vol ?? 0.04, { a: 0.02, r: 0.1 });
            else for (const n of ns) E.pluck(bp, t, n, L.vol ?? 0.04, sd * (L.len ?? 1.3), { type: L.type || 'square', cut: L.cut ?? 2800, rev: 0.2, dly: 0.15 });
          }
        }
        // 드럼
        L = lay('drums');
        if (L) {
          const P = DRUMS[pick(L.pat2 && I >= (L.I2 ?? 0.75) ? L.pat2 : L.pat, sec) || 'four'], v = L.vol ?? 1;
          if (P.k.includes(s)) E.kick(b, t, 0.8 * v, 1);
          if (P.s.includes(s)) E.snare(b, t, 0.42 * v, 0.3);
          if (P.h.includes(s)) E.hat(b, t, 0.07 * v);
          if (P.o.includes(s)) E.hat(b, t, 0.1 * v, true);
          if (L.fill !== false && bi % 4 === 3 && s >= BS - 4) E.snare(b, t, 0.18 + (s - (BS - 4)) * 0.08, 0.2);
        }
        L = lay('taiko');
        if (L && (pick(L.steps, sec) || [0, 6, 10]).includes(s)) E.taiko(b, t, (s === 0 ? 0.7 : 0.42) * (L.vol ?? 1), 0.6);
        if (lay('heart')) { if (s === 0) E.kick(b, t, 0.5, 0.75); if (s === 3) E.kick(b, t, 0.3, 0.7); if (s === half && bar % 2 === 1) E.taiko(b, t, 0.4, 0.6); }
        if (lay('hat16')) E.hat(b, t, s % 4 === 2 ? 0.1 : 0.05, s % 4 === 2);
        if (lay('march')) { if (s % 4 === 0) E.snare(b, t, 0.2 + (s === 0 ? 0.1 : 0), 0.2); if (s === 0 || s === half) E.kick(b, t, 0.6, 1); }
      }

      // 베이스
      {
        const L = lay('bass');
        if (L) {
          const pat = BASS[pick(L.pat2 && I >= (L.I2 ?? 0.75) ? L.pat2 : L.pat, sec) || 'root8'], v = L.voice || 'sine';
          for (const [st, off, len] of pat) if (st === s) {
            if (v === 'pizz') E.pizz(b, t, ch.r + 12 + off, (L.vol ?? 0.26) * 0.6, sd * len * 0.9);
            else if (v === 'pulse') E.pulse(b, t, ch.r + 12 + off, sd * len * 0.9, L.vol ?? 0.1);
            else if (v === 'brass') E.brass(b, t, [ch.r + 12 + off], sd * len * 0.9, (L.vol ?? 0.26) * 0.3, { a: 0.03, cut: 500, cutTo: 1800 });
            else E.bass(b, t, ch.r + off, sd * len * 0.92, L.vol ?? 0.26, { cut: L.cut ?? 650, grit: L.grit ?? 0.45 });
          }
        }
      }

      // 아르페지오 / 보조 질감
      {
        const L = lay('arp');
        if (L) {
          const every = pick(L.every, sec) || 1;
          if (s % every === 0) {
            const pat = pick(L.pat, sec) || [0, 2, 4, 2, 1, 3, 4, 3], ext = [...ch.n, ...ch.n.map((x) => x + 12)];
            const idx = pat[(s / every) % pat.length];
            if (idx != null) {
              let note = ext[idx % ext.length] + (pick(L.oct, sec) ?? 0); while (note > 90) note -= 12; const acc = s % 4 === 0 ? 1.25 : 1, vol = (pick(L.vol, sec) ?? 0.045) * acc, v = pick(L.voice, sec) || 'harp';
              if (v === 'bell') E.bell(b, t, note + 12, vol, L.dur ?? 1.5, 0.55, 0.35);
              else if (v === 'celesta') E.celesta(bp, t, note, vol, L.dur ?? 1.6);
              else if (v === 'marimba') E.marimba(bp, t, note, vol * 1.5, L.dur ?? 0.5);
              else if (v === 'harpsi') E.harpsi(bp, t, note, vol, L.dur ?? 0.4);
              else if (v === 'pulse') E.pulse(bp, t, note, sd * 1.6, vol);
              else if (v === 'pizz') E.pizz(b, t, note, vol * 1.5);
              else if (v === 'pluck') E.pluck(bp, t, note, vol, sd * 1.5, { type: L.type || 'triangle', cut: (L.cut ?? 2200) + (bar % 8) * 250, rev: 0.2, dly: 0.28 });
              else E.harp(bp, t, note, vol * 1.3, L.dur ?? 1.4, { rev: L.rev, dly: L.dly });
            }
          }
        }
        const Sp = lay('sparkle');
        if (Sp && s % 4 === 2 && rnd() < (Sp.p ?? 0.4)) E.bell(b, t, Sp.notes[(rnd() * Sp.notes.length) | 0], Sp.vol ?? 0.035, 2.0, 0.8, 0.5);
        const Wh = lay('whisper');
        if (Wh && rnd() < (Wh.p ?? 0.1)) E.noise(b, { t, dur: 0.9, vol: 0.045, type: 'bandpass', f: 2400 + rnd() * 2400, f1: 1800, q: 8, a: 0.25, rev: 0.8 });
        if (lay('tick') && s % 2 === 1) E.noise(b, { t, dur: 0.02, vol: 0.05, type: 'bandpass', f: 4200, q: 6 });
      }

      // ───── 선율 / 대선율 ─────
      for (const name of ['lead', 'counter', 'lead2', 'imit']) {
        const L = lay(name); if (!L) continue;
        const blk = bi >> 1, key = `${name}${sec}${blk}`;
        const ph = (sc.memo[key] ??= genPhrase({ ...O, prog: prog.map((c) => shiftChord(c, k)), range: (L.range || O.range).map((x) => x), rhythms: L.rhythms || O.rhythms, seed: (O.seed || 1) + (name === 'counter' ? 5 : name === 'imit' ? 9 : 0) }, sec, blk, secIdx, BS));
        const delay = name === 'imit' ? (L.delay ?? 4) : 0, local = (bi % 2) * BS + s - delay;
        for (const [st, midi, d] of ph) if (st === local) {
          const dur = sd * d * (L.legato ?? 0.92); let note = midi + (pick(L.oct, sec) ?? 0) + k; while (note > 96) note -= 12;
          const v = pick(L.voice, sec) || 'saw', vol = pick(L.vol, sec) ?? 0.07;
          if (v === 'violin') E.lead(bp, t, note, dur, vol, { type: 'sawtooth', a: 0.07, r: 0.25, cut: 4400, cutTo: 3000, vib: 26, rev: L.rev ?? 0.5, dly: L.dly ?? 0.25, detune: 4 });
          else if (v === 'flute') E.tone(bp, { type: 'sine', f: mtof(note), t, dur, vol: vol * 1.2, a: 0.05, d: 0.1, s: 0.85, r: 0.18, vib: 14, vibRate: 5.2, rev: L.rev ?? 0.55, dly: L.dly ?? 0.3 });
          else if (v === 'bell') E.bell(bp, t, note, vol * 0.8, 2.2, 0.7, 0.4);
          else if (v === 'celesta') E.celesta(bp, t, note - 12, vol, 2.0);
          else if (v === 'reed') E.reed(bp, t, note, dur, vol, { rev: L.rev });
          else if (v === 'organ') E.organ(bp, t, [note], dur, vol * 0.8, { rev: L.rev });
          else if (v === 'harp') E.harp(bp, t, note, vol * 1.3, 1.6, { rev: L.rev, dly: L.dly });
          else if (v === 'harpsi') E.harpsi(bp, t, note, vol * 1.2, Math.max(0.3, dur));
          else if (v === 'marimba') E.marimba(bp, t, note, vol * 1.5, Math.max(0.3, dur));
          else if (v === 'brass') E.brass(bp, t, [note], dur, vol * 0.9, { rev: L.rev });
          else if (v === 'supersaw') E.supersaw(bp, t, note, dur, vol, { rev: L.rev, dly: L.dly });
          else if (v === 'pulse') E.pulse(bp, t, note, dur, vol, {});
          else if (v === 'pizz') E.pizz(bp, t, note, vol * 1.6);
          else if (v === 'square') E.lead(bp, t, note, dur, vol * 0.7, { type: 'square', a: 0.012, cut: 4200, cutTo: 3000, vib: 14, rev: L.rev ?? 0.3, dly: L.dly ?? 0.25 });
          else if (v === 'tri') E.lead(bp, t, note, dur, vol, { type: 'triangle', a: 0.03, cut: 3600, cutTo: 2400, vib: 12, rev: L.rev ?? 0.5, dly: L.dly ?? 0.3 });
          else E.lead(bp, t, note, dur, vol, { type: 'sawtooth', a: 0.012, cut: 3800, cutTo: 2600, vib: 20, detune: 6, rev: L.rev ?? 0.35, dly: L.dly ?? 0.3 });
          if (st === 0 && L.bell) E.bell(b, t, note + 12, 0.04, 2.4, 0.7, 0.4);
        }
      }

      // 연출: 마지막 마디의 라이저 / 구간 전환 크래시
      if (O.riser !== false && last8 && s >= half && s % 2 === 0 && (lay('drums') || lay('arp'))) E.noise(b, { t, dur: sd * 2, vol: 0.02 + (s - half) * 0.006, type: 'bandpass', f: 800 + (s - half) * 700, q: 1.4, a: 0.01, rev: 0.4 });
      if (s === 0 && bi === 0 && cyc > 0 && O.crash) E.crash(b, t, O.crash, 2.2);
      if (O.extra) O.extra(m, sc, t, s, bar, { E, b, bp, sd, ch, sec, I, rnd, lay, BS });
    },
  };
}

export { chord as ch };
