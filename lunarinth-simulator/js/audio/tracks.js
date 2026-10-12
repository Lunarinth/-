// BGM 전곡 정의 (compose.js 로 만든 씬). 곡 이름은 게임이 부르는 이름 그대로다.
//   menu · stage1~6 · stageEx · midboss · opsir · astra · tramont · index · bellis · arkesia · lumina · umbra · luna · ultimate · victory · defeat · ending
import { compose, chord as C } from './compose.js';

// 리듬 모티브 (2마디 = 32스텝, [시작, 길이])
const R_LONG = [[0, 6], [6, 2], [8, 4], [12, 4], [16, 6], [22, 2], [24, 4], [28, 4]];
const R_FLOW = [[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 4], [16, 3], [19, 1], [20, 4], [24, 4], [28, 2], [30, 2]];
const R_RUN = [[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 2], [14, 2], [16, 2], [18, 2], [20, 2], [22, 2], [24, 4], [28, 4]];
const R_SYNC = [[0, 3], [3, 3], [6, 2], [8, 4], [12, 4], [16, 3], [19, 3], [22, 2], [24, 4], [28, 4]];
const R_STAC = [[0, 1], [2, 1], [4, 1], [6, 2], [8, 1], [10, 1], [12, 2], [16, 1], [18, 1], [20, 1], [22, 2], [24, 2], [28, 2]];
const R_SLOW = [[0, 8], [8, 4], [12, 4], [16, 8], [24, 8]];
const R_WALTZ = [[0, 4], [4, 2], [6, 2], [8, 4], [12, 4], [16, 4], [20, 2], [22, 2], [24, 4], [28, 4]];

const ALL = 'iabcd';

// ═════════ 얼티메이트 스킬: 달빛처럼 우아하지만 빠르고, 전력을 다하는 곡 ═════════
// C# 하모닉 마이너 · 184BPM. intensity 0 하프 + 합창 → .25 드럼 → .5 현악 오스티나토 → .75 바이올린 선율 → 1 더블타임 + 옥타브 선율
const ULTIMATE = compose({
  bpm: 184, bpmEnrage: 6, seed: 41, form: 'iabcbcd', pump: 0.5, crash: 0.1,
  scale: { root: 1, mode: 'harmonic' }, range: [70, 94], rhythms: [R_LONG, R_FLOW, R_SYNC],
  prog: [C(37, 'min9'), C(33, 'maj7'), C(40, 'add9'), C(35, 'sus4'), C(37, 'min7'), C(30, 'min7'), C(38, 'maj'), C(32, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 1200, cutTo: 3400 },
    choir: { s: ALL, every: 2, vol: 0.05 },
    strings: { s: ALL, hi: true, vol: 0.04 },
    arp: { s: ALL, voice: 'harp', pat: [0, 2, 4, 6, 8, 9, 8, 6, 4, 2, 5, 7, 9, 7, 5, 3], oct: 12, vol: 0.04, dur: 1.2, dly: 0.36 },
    taiko: { s: ALL, steps: [0, 6, 10], vol: 0.9 },
    bass: { s: 'abcd', pat: 'root8', pat2: 'pulse16', I2: 0.9, vol: 0.27, cut: 700, grit: 0.55 },
    drums: { I: 0.25, s: 'abcd', pat: 'four', pat2: 'fast16', I2: 0.9, vol: 1 },
    tremolo: { I: 0.5, s: 'abcd', every16: true, vol: 0.036, oct: 12, cut: 3000 },
    lead: { I: 0.75, s: 'abcd', voice: 'violin', vol: 0.075, range: [70, 94], rhythms: [R_LONG, R_FLOW, R_SYNC] },
    lead2: { I: 1, s: 'bcd', voice: 'flute', oct: 12, vol: 0.04, range: [70, 90] },
    counter: { I: 1, s: 'cd', voice: 'violin', vol: 0.04, range: [60, 80], rhythms: [R_FLOW, R_LONG] },
    sparkle: { s: ALL, notes: [97, 100, 101, 104, 109], p: 0.5, vol: 0.04 },
  },
});

// ═════════ 루나린스 3형태 ═════════
const LUMINA = compose({
  bpm: 100, seed: 3, form: 'iabacb', crash: 0.06, scale: { root: 2, mode: 'lydian' }, range: [69, 90], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'maj9'), C(35, 'min7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj9'), C(30, 'min7'), C(31, 'maj7'), C(33, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.045, a: 1.4, r: 1.6, cut: 800, cutTo: 2100 },
    strings: { s: 'abcd', vol: 0.035, hi: true },
    choir: { s: 'bcd', every: 4, vol: 0.03 },
    arp: { s: ALL, voice: 'bell', pat: [1, 2, 3, 4, 3, 2, 3, 2], every: 2, oct: 12, vol: 0.055, dur: 1.6 },
    bass: { s: 'abcd', pat: 'half', vol: 0.22 },
    lead: { s: 'abcd', voice: 'flute', vol: 0.06, bell: true },
    drums: { s: 'bcd', pat: 'half', vol: 0.7, fill: false },
    sparkle: { s: ALL, notes: [88, 90, 93, 95, 98], p: 0.4 },
  },
});

const UMBRA = compose({
  bpm: 70, seed: 7, form: 'iabab', riser: false, scale: { root: 6, mode: 'phrygian' }, range: [54, 76], rhythms: [R_SLOW, R_LONG],
  prog: [C(30, 'min'), C(31, 'maj'), C(30, 'min'), C(28, 'maj'), C(30, 'min'), C(31, 'maj'), C(33, 'maj'), C(28, 'maj')],
  layers: {
    pad: { s: ALL, vol: 0.05, a: 2, r: 2.2, cut: 420, cutTo: 900, rev: 0.75 },
    drone: { s: ALL, vol: 0.2 },
    choir: { s: 'bcd', every: 2, vol: 0.032, vowel: 'o' },
    strings: { s: 'abcd', vol: 0.032 },
    heart: { s: ALL },
    whisper: { s: ALL, p: 0.09 },
    lead: { s: 'abcd', voice: 'violin', vol: 0.055, range: [54, 72], rhythms: [R_SLOW], legato: 0.98 },
    arp: { s: 'bcd', voice: 'bell', pat: [null, null, 0, null, null, null, 2, null, null, null, 4, null, null, null, 3, null], oct: 0, vol: 0.05, dur: 3 },
    bass: { s: 'abcd', pat: 'whole', vol: 0.2, cut: 200 },
  },
});

const LUNA = compose({
  bpm: 148, bpmEnrage: 12, seed: 5, form: 'iabcbc', pump: 0.28, crash: 0.12, scale: { root: 9, mode: 'harmonic' }, range: [76, 96], rhythms: [R_SYNC, R_RUN, R_FLOW],
  prog: [C(33, 'min'), C(29, 'maj'), C(26, 'min'), C(28, 'maj'), C(33, 'min'), C(29, 'maj'), C(28, 'maj'), C(28, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.04, a: 0.3, r: 0.6, cut: 1500, cutTo: 3200 },
    choir: { s: 'bcd', every: 2, vol: 0.05 },
    strings: { s: 'bcd', vol: 0.04, style: 'half' },
    drums: { s: 'abcd', pat: 'four', pat2: 'fast16', I2: 0.5, vol: 1 },
    bass: { s: 'abcd', pat: 'root8', vol: 0.3, cut: 700, grit: 0.55 },
    arp: { s: 'abcd', voice: 'pluck', type: 'sawtooth', pat: [0, 2, 4, 2, 1, 3, 4, 3], oct: 12, vol: 0.05 },
    lead: { s: 'bcd', voice: 'saw', vol: 0.08, bell: true },
    lead2: { I: 0.5, s: 'cd', voice: 'square', oct: 12, vol: 0.05 },
    taiko: { s: 'cd', steps: [0, 10], vol: 0.6 },
  },
});

// ═════════ 보스 곡 ═════════
const OPSIR = compose({
  bpm: 112, seed: 11, form: 'iabacb', crash: 0.06, scale: { root: 4, mode: 'minor' }, range: [64, 86], rhythms: [R_LONG, R_FLOW],
  prog: [C(40, 'min9'), C(36, 'maj7'), C(43, 'maj7'), C(38, 'six'), C(40, 'min7'), C(36, 'maj9'), C(45, 'min7'), C(38, 'sus4')],
  layers: {
    pad: { s: ALL, vol: 0.04, a: 0.7, r: 1.4 },
    strings: { s: 'bcd', vol: 0.032, hi: true },
    arp: { s: 'abcd', voice: 'bell', pat: [1, 3, 2, 4, 3, 4, 2, 3], every: 2, oct: 24, vol: 0.045 },
    bass: { s: 'abcd', pat: 'half', vol: 0.2, cut: 520 },
    drums: { s: 'abcd', pat: 'half', pat2: 'four', I2: 0.9, vol: 0.9 },
    lead: { s: 'abcd', voice: 'flute', vol: 0.06, range: [64, 84], rhythms: [R_LONG, R_FLOW] },
    counter: { s: 'cd', voice: 'tri', vol: 0.035, range: [55, 72], rhythms: [R_SLOW] },
    sparkle: { s: ALL, notes: [88, 90, 93, 95], p: 0.5 },
  },
});

const ASTRA = compose({
  bpm: 146, seed: 17, form: 'iabacbc', pump: 0.4, crash: 0.08, scale: { root: 6, mode: 'dorian' }, range: [73, 96], rhythms: [R_SYNC, R_STAC],
  prog: [C(30, 'min7'), C(35, 'min7'), C(28, 'maj7'), C(33, 'maj'), C(30, 'min7'), C(35, 'min7'), C(33, 'maj'), C(37, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 1100, cutTo: 3000 },
    arp: { s: ALL, voice: 'harp', pat: [0, 4, 2, 5, 3, 6, 4, 7, 5, 8, 6, 9, 7, 8, 6, 4], oct: 12, vol: 0.035 },
    drums: { s: 'bcd', pat: 'edm', pat2: 'fast16', I2: 0.95, vol: 0.95 },
    bass: { s: 'abcd', pat: 'pulse16', vol: 0.22, cut: 560 },
    strings: { s: 'bcd', vol: 0.034, hi: true },
    lead: { s: 'bcd', voice: 'bell', vol: 0.06, range: [73, 96], rhythms: [R_SYNC] },
    lead2: { s: 'cd', voice: 'square', oct: -12, vol: 0.045, range: [73, 94], rhythms: [R_SYNC] },
    tick: { s: 'abcd' },
    sparkle: { s: ALL, notes: [96, 98, 100, 103], p: 0.35 },
  },
});

const TRAMONT = compose({
  bpm: 176, seed: 23, form: 'iabacbc', crash: 0.12, scale: { root: 2, mode: 'major' }, range: [74, 98], rhythms: [R_RUN, R_SYNC, R_FLOW],
  prog: [C(38, 'maj'), C(43, 'maj'), C(45, 'dom7'), C(38, 'maj'), C(35, 'min7'), C(40, 'min7'), C(45, 'dom7'), C(38, 'maj')],
  layers: {
    pad: { s: ALL, vol: 0.03, cut: 1300, cutTo: 3000 },
    strings: { s: 'bcd', style: 'half', vol: 0.04 },
    stab: { s: 'abcd', steps: [0, 3, 6, 10, 12], type: 'square', vol: 0.032, oct: 12 },
    drums: { s: 'abcd', pat: 'gallop', pat2: 'fast16', I2: 0.95, vol: 0.85 },
    bass: { s: 'abcd', pat: 'walk', pat2: 'gallop', I2: 0.9, vol: 0.24 },
    arp: { s: 'abcd', voice: 'pluck', type: 'square', pat: [0, 2, 4, 2, 1, 3, 4, 3], oct: 12, vol: 0.04 },
    lead: { s: 'bcd', voice: 'violin', vol: 0.075, rhythms: [R_RUN, R_SYNC], bell: true },
    counter: { s: 'cd', voice: 'reed', vol: 0.045, range: [62, 80], rhythms: [R_FLOW] },
    sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.3 },
  },
});

const INDEX = compose({
  bpm: 158, seed: 29, form: 'iabcdacb', crash: 0.08, scale: { root: 9, mode: 'dorian' }, range: [69, 93], rhythms: [R_STAC, R_SYNC, R_RUN, R_FLOW],
  prog: [C(33, 'min7'), C(38, 'maj7'), C(35, 'min7'), C(40, 'dom7'), C(33, 'min7'), C(31, 'maj7'), C(38, 'sus4'), C(40, 'dom7')],
  layers: {
    pad: { s: 'abcd', vol: 0.032 },
    organ: { s: 'bcd', vol: 0.03 },
    strings: { s: 'cd', style: 'half', vol: 0.034 },
    arp: { s: 'abcd', voice: 'pizz', pat: [0, 2, 4, 2, 5, 3, 4, 2, 0, 3, 5, 3, 6, 4, 5, 3], oct: 12, vol: 0.035 },
    stab: { s: 'bcd', steps: [0, 6, 10, 14], type: 'square', vol: 0.028, oct: 12 },
    drums: { s: 'abcd', pat: 'drive', pat2: 'break', I2: 2, vol: 0.85 },
    bass: { s: 'abcd', pat: 'synco', vol: 0.24 },
    tick: { s: 'abcd' },
    lead: { s: 'abcd', voice: 'pizz', vol: 0.05, rhythms: [R_STAC, R_SYNC] },
    lead2: { s: 'cd', voice: 'organ', vol: 0.05, rhythms: [R_STAC, R_SYNC] },
    sparkle: { s: ALL, notes: [93, 95, 98], p: 0.3 },
  },
});

const BELLIS = compose({
  bpm: 138, seed: 31, form: 'iabacbc', crash: 0.1, scale: { root: 1, mode: 'harmonic' }, range: [68, 92], rhythms: [R_STAC, R_SYNC, R_FLOW],
  prog: [C(37, 'min'), C(33, 'maj'), C(40, 'maj'), C(35, 'maj'), C(37, 'min'), C(38, 'maj'), C(32, 'maj'), C(32, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.04, a: 0.5, r: 1.0 },
    choir: { s: 'bcd', every: 2, vol: 0.04, vowel: 'o' },
    strings: { s: 'bcd', style: 'half', vol: 0.036 },
    taiko: { s: 'bcd', steps: [8], vol: 0.5 },
    drums: { s: 'abcd', pat: 'four', pat2: 'drive', I2: 2, vol: 0.9 },
    bass: { s: 'abcd', pat: 'root8', vol: 0.24, cut: 600, grit: 0.4 },
    arp: { s: 'abcd', voice: 'pluck', type: 'square', pat: [0, 2, 4, 3, 1, 3, 4, 2], oct: 12, vol: 0.04 },
    lead: { s: 'bcd', voice: 'saw', vol: 0.055, rhythms: [R_STAC, R_SYNC] },
    sparkle: { s: ALL, notes: [96, 98, 100, 102], p: 0.35 },
  },
});

const ARKESIA = compose({
  bpm: 152, seed: 37, form: 'iabacbcd', crash: 0.12, scale: { root: 4, mode: 'phrygian' }, range: [64, 92], rhythms: [R_SYNC, R_FLOW, R_RUN],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'maj7'), C(41, 'maj'), C(35, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 700, cutTo: 2200, rev: 0.7 },
    organ: { s: 'bcd', vol: 0.03 },
    strings: { s: 'abcd', style: 'half', vol: 0.036 },
    choir: { s: 'cd', every: 2, vol: 0.04, vowel: 'o' },
    arp: { s: 'abcd', voice: 'bell', pat: [0, 3, 5, 3, 1, 4, 6, 4], every: 2, oct: 12, vol: 0.05, dur: 1.4 },
    drums: { s: 'bcd', pat: 'break', pat2: 'gallop', I2: 2, vol: 0.9 },
    taiko: { s: 'cd', steps: [0, 6, 10, 14], vol: 0.6 },
    bass: { s: 'abcd', pat: 'synco', vol: 0.25, cut: 600, grit: 0.6 },
    lead: { s: 'abcd', voice: 'bell', vol: 0.075, range: [72, 96], rhythms: [R_SYNC, R_FLOW] },
    counter: { s: 'cd', voice: 'violin', vol: 0.04, range: [60, 80], rhythms: [R_RUN] },
    whisper: { s: 'abcd', p: 0.08 },
    sparkle: { s: ALL, notes: [93, 96, 97, 100], p: 0.3 },
  },
});

const MIDBOSS = compose({
  bpm: 156, seed: 43, form: 'iabab', crash: 0.1, scale: { root: 7, mode: 'harmonic' }, range: [67, 90], rhythms: [R_SYNC, R_RUN],
  prog: [C(31, 'min'), C(27, 'maj'), C(34, 'maj'), C(29, 'dom7'), C(31, 'min'), C(27, 'maj'), C(26, 'maj'), C(36, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 1100, cutTo: 2600 },
    drums: { s: 'abcd', pat: 'drive', vol: 0.95 },
    bass: { s: 'abcd', pat: 'gallop', vol: 0.26, cut: 640, grit: 0.55 },
    tremolo: { s: 'abcd', every16: true, vol: 0.03, oct: 0 },
    strings: { s: 'abcd', style: 'half', vol: 0.036 },
    lead: { s: 'bcd', voice: 'saw', vol: 0.07, rhythms: [R_SYNC, R_RUN] },
    taiko: { s: 'bd', steps: [0, 10], vol: 0.6 },
  },
});

// ═════════ 스테이지(병사) 곡 ═════════
const STAGE1 = compose({
  bpm: 128, seed: 53, form: 'iabacb', crash: 0.06, scale: { root: 2, mode: 'major' }, range: [74, 96], rhythms: [R_WALTZ, R_FLOW],
  prog: [C(38, 'maj'), C(43, 'maj'), C(40, 'dom7'), C(45, 'maj'), C(38, 'maj'), C(43, 'maj'), C(45, 'dom7'), C(38, 'maj')],
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 1100, cutTo: 2600 },
    arp: { s: 'abcd', voice: 'bell', pat: [0, 2, 4, 2, 1, 3, 4, 3], every: 2, oct: 12, vol: 0.05 },
    drums: { s: 'abcd', pat: 'four', vol: 0.8 }, bass: { s: 'abcd', pat: 'root8', vol: 0.22, cut: 480 },
    strings: { s: 'bcd', vol: 0.034 },
    lead: { s: 'bcd', voice: 'tri', vol: 0.06, bell: true },
    sparkle: { s: ALL, notes: [88, 90, 93, 95], p: 0.4 },
  },
});

const STAGE2 = compose({
  bpm: 138, seed: 59, form: 'iabacb', pump: 0.45, crash: 0.07, scale: { root: 6, mode: 'minpent' }, range: [73, 97], rhythms: [R_SYNC, R_STAC],
  prog: [C(30, 'min7'), C(26, 'maj7'), C(33, 'maj'), C(28, 'dom7'), C(30, 'min7'), C(26, 'maj7'), C(33, 'maj'), C(35, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 1000, cutTo: 3000 },
    arp: { s: 'abcd', voice: 'pluck', type: 'square', pat: [0, 4, 2, 5, 3, 6, 4, 7], oct: 12, vol: 0.04 },
    drums: { s: 'abcd', pat: 'edm', vol: 0.9 }, bass: { s: 'abcd', pat: 'pulse16', vol: 0.22, cut: 520 },
    lead: { s: 'bcd', voice: 'square', vol: 0.06 }, tick: { s: 'abcd' },
    sparkle: { s: ALL, notes: [96, 98, 101], p: 0.3 },
  },
});

const STAGE3 = compose({
  bpm: 150, seed: 61, form: 'iabacb', crash: 0.05, scale: { root: 7, mode: 'major' }, range: [67, 91], rhythms: [R_WALTZ, R_SYNC],
  prog: [C(31, 'maj'), C(36, 'maj'), C(38, 'dom7'), C(31, 'maj'), C(28, 'min7'), C(33, 'min7'), C(38, 'dom7'), C(31, 'maj')],
  layers: {
    pad: { s: ALL, vol: 0.028 },
    strings: { s: 'bcd', style: 'half', vol: 0.032 },
    arp: { s: 'abcd', voice: 'pizz', pat: [0, null, 2, null, 4, null, 2, null, 1, null, 3, null, 4, null, 3, null], oct: 12, vol: 0.04 },
    drums: { s: 'abcd', pat: 'waltzy', vol: 0.75 }, bass: { s: 'abcd', pat: 'walk', vol: 0.22, cut: 560 },
    lead: { s: 'abcd', voice: 'reed', vol: 0.055 },
    counter: { s: 'cd', voice: 'flute', vol: 0.035, range: [62, 80] },
  },
});

const STAGE4 = compose({
  bpm: 132, seed: 67, form: 'iabcbac', crash: 0.07, scale: { root: 2, mode: 'dorian' }, range: [62, 88], rhythms: [R_STAC, R_SYNC],
  prog: [C(38, 'min7'), C(31, 'maj7'), C(36, 'maj'), C(33, 'dom7'), C(38, 'min7'), C(34, 'maj7'), C(31, 'maj7'), C(33, 'sus4')],
  layers: {
    pad: { s: ALL, vol: 0.03 }, organ: { s: 'abcd', vol: 0.03 },
    arp: { s: 'abcd', voice: 'pizz', pat: [0, 2, 4, 2, 5, 3, 4, 2, 0, 3, 5, 3, 6, 4, 5, 3], oct: 12, vol: 0.04 },
    drums: { s: 'bcd', pat: 'drive', vol: 0.8 }, bass: { s: 'abcd', pat: 'synco', vol: 0.23 },
    strings: { s: 'cd', style: 'half', vol: 0.032 }, tick: { s: 'bcd' },
    lead: { s: 'bcd', voice: 'organ', vol: 0.05 },
  },
});

const STAGE5 = compose({
  bpm: 140, seed: 71, form: 'iabacbc', crash: 0.07, scale: { root: 9, mode: 'minor' }, range: [69, 93], rhythms: [R_STAC, R_SYNC],
  prog: [C(33, 'min'), C(29, 'maj'), C(36, 'maj'), C(31, 'maj'), C(33, 'min'), C(29, 'maj'), C(28, 'maj'), C(28, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.035 }, choir: { s: 'bcd', every: 4, vol: 0.03, vowel: 'o' },
    arp: { s: 'abcd', voice: 'pluck', type: 'square', pat: [0, 3, 2, 4, 1, 3, 2, 4], oct: 12, vol: 0.04 },
    drums: { s: 'abcd', pat: 'four', vol: 0.85 }, bass: { s: 'abcd', pat: 'root8', vol: 0.24, cut: 600 },
    strings: { s: 'cd', style: 'half', vol: 0.034 },
    lead: { s: 'bcd', voice: 'square', vol: 0.055 },
  },
});

const STAGE6 = compose({
  bpm: 132, seed: 73, form: 'iabacbcd', pump: 0.5, crash: 0.1, scale: { root: 2, mode: 'minor' }, range: [74, 98], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'min'), C(34, 'maj'), C(41, 'maj'), C(36, 'maj'), C(38, 'min'), C(34, 'maj'), C(33, 'maj'), C(33, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.045, cut: 1300, cutTo: 3000 }, choir: { s: 'abcd', every: 2, vol: 0.045 },
    strings: { s: 'bcd', vol: 0.04, hi: true },
    arp: { s: 'abcd', voice: 'harp', pat: [0, 2, 4, 6, 4, 2, 5, 3], every: 2, oct: 12, vol: 0.04 },
    taiko: { s: 'abcd', steps: [0, 6, 10], vol: 0.7 },
    drums: { s: 'abcd', pat: 'four', vol: 0.9 }, bass: { s: 'abcd', pat: 'root8', vol: 0.25, cut: 600 },
    lead: { s: 'bcd', voice: 'violin', vol: 0.07, bell: true },
    sparkle: { s: ALL, notes: [93, 96, 98, 100], p: 0.35 },
  },
});

const STAGE_EX = compose({
  bpm: 140, seed: 79, form: 'iabacb', crash: 0.08, scale: { root: 4, mode: 'phrygian' }, range: [64, 90], rhythms: [R_STAC, R_SYNC],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'maj'), C(41, 'maj'), C(35, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 800, cutTo: 2000 }, organ: { s: 'bcd', vol: 0.028 },
    march: { s: 'abcd' }, arp: { s: 'abcd', voice: 'bell', pat: [0, 2, 4, 2, 1, 3, 4, 3], every: 2, oct: 12, vol: 0.05 },
    bass: { s: 'abcd', pat: 'octave', vol: 0.24 },
    lead: { s: 'bcd', voice: 'pizz', vol: 0.05 }, whisper: { s: ALL, p: 0.06 },
  },
});

// ═════════ 잔잔한 곡 ═════════
const MENU = compose({
  bpm: 72, seed: 83, form: 'iabab', riser: false, scale: { root: 2, mode: 'lydian' }, range: [69, 90], rhythms: [R_SLOW, R_LONG],
  prog: [C(38, 'maj9'), C(35, 'min7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj9'), C(30, 'min7'), C(31, 'maj7'), C(33, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.045, a: 1.6, r: 2, cut: 650, cutTo: 1500 }, strings: { s: 'abcd', vol: 0.03 },
    choir: { s: 'abcd', every: 2, vol: 0.03, vowel: 'o' },
    arp: { s: ALL, voice: 'harp', pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.05, dur: 2.2 },
    lead: { s: 'bcd', voice: 'flute', vol: 0.05, legato: 0.98 },
    sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.4 },
  },
});
const VICTORY = compose({
  bpm: 92, seed: 89, form: 'iabab', riser: false, crash: 0.08, scale: { root: 2, mode: 'major' }, range: [74, 96], rhythms: [R_LONG, R_WALTZ],
  prog: [C(38, 'maj'), C(43, 'maj'), C(35, 'min7'), C(45, 'maj'), C(38, 'maj'), C(43, 'maj'), C(35, 'min7'), C(45, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.045, cut: 900, cutTo: 2400 }, strings: { s: 'abcd', vol: 0.036 }, taiko: { s: 'abcd', steps: [0], vol: 0.5 },
    arp: { s: ALL, voice: 'bell', pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.06 },
    lead: { s: 'abcd', voice: 'violin', vol: 0.06 }, sparkle: { s: ALL, notes: [93, 95, 98], p: 0.4 },
  },
});
const DEFEAT = compose({
  bpm: 56, seed: 97, form: 'iab', riser: false, scale: { root: 2, mode: 'minor' }, range: [62, 84], rhythms: [R_SLOW],
  prog: [C(38, 'min'), C(34, 'maj'), C(31, 'min'), C(33, 'maj'), C(38, 'min'), C(34, 'maj'), C(31, 'min'), C(33, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.05, cut: 500, cutTo: 1100, a: 1.8 }, choir: { s: ALL, every: 2, vol: 0.03, vowel: 'o' },
    arp: { s: ALL, voice: 'bell', pat: [1, 3, 2, 4], every: 4, oct: 12, vol: 0.05, dur: 3 }, lead: { s: 'ab', voice: 'flute', vol: 0.04, legato: 0.98 },
  },
});
const ENDING = compose({
  bpm: 76, seed: 101, form: 'iabacb', riser: false, crash: 0.06, scale: { root: 2, mode: 'major' }, range: [69, 93], rhythms: [R_LONG, R_SLOW],
  prog: [C(38, 'maj'), C(35, 'min7'), C(31, 'maj7'), C(38, 'maj'), C(36, 'maj7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj')],
  layers: {
    pad: { s: ALL, vol: 0.045, a: 1.4, r: 2 }, strings: { s: 'abcd', vol: 0.034 }, choir: { s: 'bcd', every: 2, vol: 0.035 },
    arp: { s: ALL, voice: 'harp', pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.05 },
    lead: { s: 'abcd', voice: 'violin', vol: 0.055 }, sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.4 },
  },
});

export const TRACKS = {
  menu: MENU, stage1: STAGE1, stage2: STAGE2, stage3: STAGE3, stage4: STAGE4, stage5: STAGE5, stage6: STAGE6, stageEx: STAGE_EX,
  midboss: MIDBOSS, opsir: OPSIR, astra: ASTRA, tramont: TRAMONT, index: INDEX, bellis: BELLIS, arkesia: ARKESIA,
  lumina: LUMINA, umbra: UMBRA, luna: LUNA, ultimate: ULTIMATE, victory: VICTORY, defeat: DEFEAT, ending: ENDING,
};
// 설정집/내보내기용 곡 정보
export const TRACK_INFO = {
  menu: ['00', '타이틀 — 달의 정원으로', 72], stage1: ['01', 'STAGE 1 — 관측대의 별 병사', 128], opsir: ['02', '옵서 — 무심한 관측', 112],
  stage2: ['03', 'STAGE 2 — 기술실의 회로', 138], astra: ['04', '아스트라 — 떨리는 시스템', 146],
  stage3: ['05', 'STAGE 3 — 테라스의 아침', 150], tramont: ['06', '트라몽 — VIVA LA FRANCE', 176],
  stage4: ['07', 'STAGE 4 — 도서관의 밤', 132], index: ['08', '인덱스 — 색인 정렬', 158],
  stage5: ['09', 'STAGE 5 — 기록실의 행진', 140], bellis: ['10', '벨리스 — 감사 개시', 138],
  stage6: ['11', 'FINAL STAGE — 달의 정원', 132], midboss: ['12', '중간 보스 — 파수병', 156],
  lumina: ['13', '루나린스 I · LUMINA', 100], umbra: ['14', '루나린스 II · UMBRA', 70], luna: ['15', '루나린스 III · LUNA', 148],
  ultimate: ['16', '얼티메이트 스킬 — 월천', 184], victory: ['17', '승리', 92], defeat: ['18', '패배', 56], ending: ['19', '엔딩 — 달이 저물고', 76],
  stageEx: ['20', 'EXTRA STAGE — 인형극장', 140], arkesia: ['21', '아르케시아 — 끝나지 않는 관극', 152],
};
