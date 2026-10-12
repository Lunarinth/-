// BGM 전곡 정의 (compose.js 로 작곡한 씬). 곡 이름은 게임이 부르는 이름 그대로다.
// 각 곡은 박자(4/4 · 3/4 왈츠 · 2/4 행진), 악기, 리듬, 구조가 서로 다르게 설계되어 있다.
import { compose, chord as C } from './compose.js';

// 리듬 모티브 (2마디 분량, [시작 스텝, 길이]) — 4/4 (32스텝)
const R_LONG = [[0, 6], [6, 2], [8, 4], [12, 4], [16, 6], [22, 2], [24, 4], [28, 4]];
const R_FLOW = [[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 4], [16, 3], [19, 1], [20, 4], [24, 4], [28, 2], [30, 2]];
const R_RUN = [[0, 2], [2, 2], [4, 2], [6, 2], [8, 4], [12, 2], [14, 2], [16, 2], [18, 2], [20, 2], [22, 2], [24, 4], [28, 4]];
const R_SYNC = [[0, 3], [3, 3], [6, 2], [8, 4], [12, 4], [16, 3], [19, 3], [22, 2], [24, 4], [28, 4]];
const R_STAC = [[0, 1], [2, 1], [4, 1], [6, 2], [8, 1], [10, 1], [12, 2], [16, 1], [18, 1], [20, 1], [22, 2], [24, 2], [28, 2]];
const R_SLOW = [[0, 8], [8, 4], [12, 4], [16, 8], [24, 8]];
const R_SWING = [[0, 3], [3, 1], [4, 2], [6, 2], [8, 3], [11, 1], [12, 4], [16, 3], [19, 1], [20, 2], [22, 2], [24, 4], [28, 4]];
const R_ODD = [[0, 3], [3, 3], [6, 3], [9, 3], [12, 4], [16, 3], [19, 3], [22, 2], [24, 2], [26, 2], [28, 4]];
// 3/4 (24스텝)
const W_A = [[0, 4], [4, 4], [8, 4], [12, 6], [18, 2], [20, 4]];
const W_B = [[0, 2], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4], [16, 4], [20, 2], [22, 2]];
const W_C = [[0, 6], [6, 2], [8, 4], [12, 4], [16, 8]];
const W_D = [[0, 3], [3, 1], [4, 4], [8, 4], [12, 3], [15, 1], [16, 4], [20, 4]];
// 2/4 (16스텝)
const P_A = [[0, 2], [2, 1], [3, 1], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]];
const P_B = [[0, 1], [1, 1], [2, 2], [4, 1], [5, 1], [6, 2], [8, 4], [12, 2], [14, 2]];

const ALL = 'iabcd';

// ═════════ 얼티메이트 스킬: 달빛처럼 우아하지만 빠르고, 전력을 다하는 곡 ═════════
// C# 하모닉 마이너 · 184BPM. intensity 0 하프+합창 → .25 드럼 → .5 현악 오스티나토 → .75 바이올린+금관 → 1 더블타임+옥타브+팀파니 롤
const ULTIMATE = compose({
  bpm: 184, bpmEnrage: 6, seed: 41, form: 'iabcbcd', pump: 0.5, crash: 0.1,
  scale: { root: 1, mode: 'harmonic' }, range: [70, 94], rhythms: [R_LONG, R_FLOW, R_SYNC],
  prog: [C(37, 'min9'), C(33, 'maj7'), C(40, 'add9'), C(35, 'sus4'), C(37, 'min7'), C(30, 'min7'), C(38, 'maj'), C(32, 'dom7')],
  modul: { c: 2, d: -2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 1200, cutTo: 3400 },
    choir: { s: ALL, every: 2, vol: 0.05 },
    strings: { s: ALL, hi: true, vol: 0.04, style: { c: 'swell', def: 'long' } },
    arp: { s: ALL, voice: { b: 'celesta', def: 'harp' }, pat: { a: [0, 2, 4, 6, 8, 9, 8, 6, 4, 2, 5, 7, 9, 7, 5, 3], b: [0, 4, 2, 6, 4, 8, 6, 9, 7, 9, 6, 8, 5, 7, 4, 6], def: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3] }, oct: 12, vol: 0.04, dur: 1.2 },
    taiko: { s: ALL, steps: { c: [0, 4, 6, 10, 12, 14], def: [0, 6, 10] }, vol: 0.9 },
    timp: { s: 'bcd', I: 0.99 },
    bass: { s: 'abcd', pat: 'root8', pat2: 'pulse16', I2: 0.9, vol: 0.27, cut: 700, grit: 0.55 },
    drums: { I: 0.25, s: 'abc', pat: 'four', pat2: 'fast16', I2: 0.9, vol: 1 },
    tremolo: { I: 0.5, s: 'abc', every16: true, vol: 0.036, oct: 12, cut: 3000 },
    brassPad: { I: 0.75, s: 'bc', vol: 0.04 },
    lead: { I: 0.75, s: 'abcd', voice: 'violin', vol: 0.075, range: [70, 94], rhythms: [R_LONG, R_FLOW, R_SYNC] },
    lead2: { I: 1, s: 'bcd', voice: 'flute', oct: 12, vol: 0.04, range: [70, 90] },
    counter: { I: 1, s: 'cd', voice: 'violin', vol: 0.04, range: [60, 80], rhythms: [R_FLOW, R_LONG] },
    sparkle: { s: ALL, notes: [97, 100, 101, 104, 109], p: 0.5, vol: 0.04 },
  },
});

// ═════════ 루나린스 3형태 ═════════
const LUMINA = compose({
  bpm: 98, seed: 3, form: 'iabacb', crash: 0.06, scale: { root: 2, mode: 'lydian' }, range: [69, 90], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'maj9'), C(35, 'min7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj9'), C(30, 'min7'), C(31, 'maj7'), C(33, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.04, a: 1.4, r: 1.6, cut: 800, cutTo: 2100 },
    strings: { s: 'bcd', vol: 0.035, hi: true, style: { b: 'long', c: 'swell', def: 'long' } },
    choir: { s: 'cd', every: 4, vol: 0.03 },
    arp: { s: ALL, voice: { i: 'celesta', a: 'harp', def: 'celesta' }, pat: [1, 2, 3, 4, 3, 2, 3, 2], every: 2, oct: 12, vol: 0.05, dur: 1.6 },
    bass: { s: 'abcd', pat: 'half', vol: 0.22 },
    lead: { s: 'abcd', voice: { a: 'flute', b: 'violin', c: 'violin', def: 'flute' }, vol: 0.06, bell: true },
    drums: { s: 'bc', pat: 'bossa', vol: 0.55, fill: false },
    sparkle: { s: ALL, notes: [88, 90, 93, 95, 98], p: 0.4 },
  },
});

const UMBRA = compose({
  bpm: 66, seed: 7, form: 'iabab', riser: false, scale: { root: 6, mode: 'phrygian' }, range: [54, 76], rhythms: [R_SLOW, R_LONG],
  prog: [C(30, 'min'), C(31, 'maj'), C(30, 'min'), C(28, 'maj'), C(30, 'min'), C(31, 'maj'), C(33, 'maj'), C(28, 'maj')],
  secVol: { i: 0.8, a: 0.95, b: 1.05, d: 0.85 },
  layers: {
    pad: { s: ALL, vol: 0.05, a: 2, r: 2.2, cut: 420, cutTo: 900, rev: 0.75 },
    drone: { s: ALL, vol: 0.2 },
    choir: { s: 'bd', every: 2, vol: 0.032, vowel: 'o' },
    strings: { s: 'abd', vol: 0.032, style: 'swell' },
    heart: { s: ALL },
    whisper: { s: ALL, p: 0.09 },
    lead: { s: 'abd', voice: 'violin', vol: 0.055, range: [54, 72], rhythms: [R_SLOW], legato: 0.98 },
    arp: { s: 'bd', voice: 'bell', pat: [null, null, 0, null, null, null, 2, null, null, null, 4, null, null, null, 3, null], oct: 0, vol: 0.05, dur: 3 },
    bass: { s: 'abd', pat: 'whole', vol: 0.2, cut: 200 },
  },
});

// 만월: 트랜스 — 슈퍼소 리드와 펌핑
const LUNA = compose({
  bpm: 152, bpmEnrage: 12, seed: 5, form: 'iabcbc', pump: 0.25, crash: 0.12, scale: { root: 9, mode: 'harmonic' }, range: [76, 96], rhythms: [R_SYNC, R_RUN, R_FLOW],
  prog: [C(33, 'min'), C(29, 'maj'), C(26, 'min'), C(28, 'maj'), C(33, 'min'), C(29, 'maj'), C(28, 'maj'), C(28, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.08, d: 0.75 },
  layers: {
    pad: { s: ALL, vol: 0.04, a: 0.3, r: 0.6, cut: 1500, cutTo: 3200 },
    choir: { s: 'bc', every: 2, vol: 0.05 },
    strings: { s: 'bc', vol: 0.04, style: 'half' },
    drums: { s: 'abc', pat: 'trance', pat2: 'fast16', I2: 0.5, vol: 1 },
    bass: { s: 'abc', pat: 'trance', vol: 0.3, cut: 700, grit: 0.55 },
    arp: { s: 'abc', voice: 'pluck', type: 'sawtooth', pat: [0, 2, 4, 2, 1, 3, 4, 3], oct: 12, vol: 0.05 },
    lead: { s: 'bc', voice: 'supersaw', vol: 0.08, bell: true },
    lead2: { I: 0.5, s: 'c', voice: 'pulse', oct: 12, vol: 0.05 },
    taiko: { s: 'c', steps: [0, 10], vol: 0.6 },
  },
});

// ═════════ 보스 곡 ═════════
// 옵서: 스윙 라운지 — 비브라폰(마림바) + 우드 베이스 + 브러시 보사
const OPSIR = compose({
  bpm: 104, seed: 11, form: 'iabacb', swing: 0.16, scale: { root: 4, mode: 'dorian' }, range: [64, 86], rhythms: [R_SWING, R_FLOW],
  prog: [C(40, 'min9'), C(36, 'maj7'), C(43, 'maj7'), C(38, 'six'), C(40, 'min7'), C(36, 'maj9'), C(45, 'min7'), C(38, 'sus4')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: 'iabcd', vol: 0.03, a: 0.7, r: 1.4 },
    strings: { s: 'cd', vol: 0.03, hi: true, style: 'swell' },
    arp: { s: 'abcd', voice: 'marimba', pat: [1, 3, 2, 4, 3, 4, 2, 3], every: 2, oct: 12, vol: 0.05 },
    bass: { s: 'abcd', pat: 'walkswing', voice: 'pizz', vol: 0.3 },
    drums: { s: 'bcd', pat: 'bossa', vol: 0.55, fill: false },
    lead: { s: 'abcd', voice: { a: 'marimba', b: 'flute', c: 'marimba', d: 'flute' }, vol: 0.06, range: [64, 84], rhythms: [R_SWING, R_FLOW] },
    counter: { s: 'c', voice: 'tri', vol: 0.035, range: [55, 72], rhythms: [R_SLOW] },
    sparkle: { s: ALL, notes: [88, 90, 93, 95], p: 0.5 },
  },
});

// 아스트라: 겁먹은 듯 성긴 시작 → 글리치 드럼앤베이스. 첼레스타와 칩 펄스
const ASTRA = compose({
  bpm: 150, seed: 17, form: 'iabacbc', pump: 0.4, crash: 0.08, scale: { root: 6, mode: 'dorian' }, range: [73, 96], rhythms: [R_SYNC, R_STAC, R_ODD],
  prog: [C(30, 'min7'), C(35, 'min7'), C(28, 'maj7'), C(33, 'maj'), C(30, 'min7'), C(35, 'min7'), C(33, 'maj'), C(37, 'dom7')],
  modul: { c: 3 }, bpmSec: { d: 0.8 }, secVol: { i: 0.7, a: 0.85, b: 1, c: 1.05, d: 0.7 },
  layers: {
    pad: { s: 'ibcd', vol: 0.035, cut: 1100, cutTo: 3000 },
    arp: { s: 'iabcd', voice: { i: 'celesta', a: 'celesta', b: 'pulse', c: 'pulse', d: 'celesta' }, pat: { a: [0, null, 4, null, 2, null, 5, null, 3, null, 6, null, 4, null, 7, null], def: [0, 4, 2, 5, 3, 6, 4, 7, 5, 8, 6, 9, 7, 8, 6, 4] }, oct: 12, vol: 0.04 },
    drums: { s: 'bc', pat: 'dnb', vol: 0.95 },
    bass: { s: 'bcd', pat: 'dnb', voice: 'pulse', vol: 0.12 },
    strings: { s: 'bcd', vol: 0.034, hi: true },
    lead: { s: 'abcd', voice: { a: 'celesta', b: 'bell', c: 'pulse', d: 'celesta' }, vol: 0.06, range: [73, 96], rhythms: [R_SYNC, R_ODD] },
    lead2: { s: 'c', voice: 'square', oct: -12, vol: 0.045, range: [73, 94], rhythms: [R_SYNC] },
    tick: { s: 'abcd' },
    sparkle: { s: ALL, notes: [96, 98, 100, 103], p: 0.35 },
  },
});

// 트라몽: 영웅적 펜싱 — 금관 스탭, 바이올린 질주, 갤럽
const TRAMONT = compose({
  bpm: 176, seed: 23, form: 'iabacbc', crash: 0.12, scale: { root: 2, mode: 'major' }, range: [74, 98], rhythms: [R_RUN, R_SYNC, R_FLOW],
  prog: [C(38, 'maj'), C(43, 'maj'), C(45, 'dom7'), C(38, 'maj'), C(35, 'min7'), C(40, 'min7'), C(45, 'dom7'), C(38, 'maj')],
  modul: { c: 2, d: -3 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.08, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.03, cut: 1300, cutTo: 3000 },
    strings: { s: 'bcd', style: 'half', vol: 0.04 },
    stab: { s: 'abcd', voice: { a: 'harpsi', def: 'brass' }, steps: { a: [0, 6, 10], def: [0, 3, 6, 10, 12] }, vol: 0.04, oct: 12 },
    drums: { s: 'abcd', pat: 'gallop', pat2: 'fast16', I2: 0.95, vol: 0.85 },
    bass: { s: 'abcd', pat: { a: 'walk', def: 'gallop' }, vol: 0.24 },
    arp: { s: 'abc', voice: 'harpsi', pat: [0, 2, 4, 2, 1, 3, 4, 3], oct: 12, vol: 0.04 },
    brassPad: { s: 'c', vol: 0.035 },
    lead: { s: 'bcd', voice: { b: 'violin', c: 'brass', d: 'violin' }, vol: 0.075, rhythms: [R_RUN, R_SYNC], bell: true },
    counter: { s: 'cd', voice: 'reed', vol: 0.045, range: [62, 80], rhythms: [R_FLOW] },
    sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.3 },
  },
});

// 인덱스: 어긋난 악센트의 서가 — 마림바 · 피치카토 · 모방 대위법, 구간마다 템포가 바뀐다
const INDEX = compose({
  bpm: 164, seed: 29, form: 'iabcdacb', crash: 0.08, scale: { root: 9, mode: 'dorian' }, range: [69, 93], rhythms: [R_STAC, R_ODD, R_SYNC, R_RUN],
  prog: [C(33, 'min7'), C(38, 'maj7'), C(35, 'min7'), C(40, 'dom7'), C(33, 'min7'), C(31, 'maj7'), C(38, 'sus4'), C(40, 'dom7')],
  bpmSec: { d: 0.72, c: 1.06 }, modul: { c: 2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.05, d: 0.75 },
  layers: {
    pad: { s: 'abcd', vol: 0.028 },
    organ: { s: 'bc', vol: 0.03 },
    strings: { s: 'c', style: 'half', vol: 0.034 },
    arp: { s: 'iabcd', voice: { a: 'marimba', b: 'pizz', c: 'marimba', d: 'celesta', i: 'marimba' }, pat: [0, 2, 4, 2, 5, 3, 4, 2, 0, 3, 5, 3, 6, 4, 5, 3], oct: 12, vol: 0.04 },
    stab: { s: 'bc', voice: 'strings', steps: [0, 3, 6, 10, 13], vol: 0.03, oct: 12 },
    drums: { s: 'abc', pat: { a: 'drive', b: 'break', c: 'break' }, vol: 0.85 },
    bass: { s: 'abc', pat: 'synco', voice: 'pulse', vol: 0.11 },
    tick: { s: 'abcd' },
    lead: { s: 'abcd', voice: { a: 'pizz', b: 'marimba', c: 'harpsi', d: 'celesta' }, vol: 0.055, rhythms: [R_STAC, R_ODD] },
    imit: { s: 'bcd', voice: 'harpsi', delay: 6, vol: 0.04, rhythms: [R_STAC, R_ODD] },
    sparkle: { s: ALL, notes: [93, 95, 98], p: 0.3 },
  },
});

// 벨리스: 냉철한 감사 — 합창 + 오르간 + 금관 + 타이코, 행진
const BELLIS = compose({
  bpm: 142, seed: 31, form: 'iabacbc', crash: 0.1, scale: { root: 1, mode: 'harmonic' }, range: [68, 92], rhythms: [R_STAC, R_SYNC, R_FLOW],
  prog: [C(37, 'min'), C(33, 'maj'), C(40, 'maj'), C(35, 'maj'), C(37, 'min'), C(38, 'maj'), C(32, 'maj'), C(32, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.06, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.035, a: 0.5, r: 1.0 },
    organ: { s: 'abcd', vol: 0.03 },
    choir: { s: 'bcd', every: 2, vol: 0.04, vowel: 'o' },
    strings: { s: 'bcd', style: 'half', vol: 0.036 },
    stab: { s: 'bc', voice: 'brass', steps: [0, 6, 10], vol: 0.034, oct: 12 },
    taiko: { s: 'bcd', steps: [8], vol: 0.5 },
    drums: { s: 'abc', pat: { a: 'march', def: 'drive' }, vol: 0.9 },
    bass: { s: 'abc', pat: 'root8', vol: 0.24, cut: 600, grit: 0.4 },
    arp: { s: 'abcd', voice: 'harpsi', pat: [0, 2, 4, 3, 1, 3, 4, 2], oct: 12, vol: 0.04 },
    lead: { s: 'bcd', voice: { b: 'organ', c: 'brass', d: 'organ' }, vol: 0.06, rhythms: [R_STAC, R_SYNC] },
    sparkle: { s: ALL, notes: [96, 98, 100, 102], p: 0.35 },
  },
});

// 아르케시아: 마리오네트 × 오케스트라 — 3/4 왈츠. 오르골, 피치카토, 클라리넷풍 리드, 하프시코드, 오르간, 어긋나는 현
const ARKESIA = compose({
  bpm: 156, barSteps: 12, seed: 37, form: 'iabacbcd', crash: 0.12, scale: { root: 4, mode: 'phrygian' }, range: [64, 90], rhythms: [W_A, W_B, W_C, W_D],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'maj7'), C(41, 'maj'), C(35, 'dom7')],
  modul: { c: 2, d: -1 }, bpmSec: { c: 1.08, d: 0.88 }, secVol: { i: 0.75, a: 0.9, b: 1, c: 1.1, d: 0.7 },
  layers: {
    pad: { s: 'bcd', vol: 0.03, cut: 700, cutTo: 2200, rev: 0.7 },
    organ: { s: 'cd', vol: 0.03 },
    strings: { s: 'abcd', style: { a: 'half', c: 'swell', d: 'swell', def: 'half' }, vol: 0.034 },
    choir: { s: 'cd', every: 2, vol: 0.04, vowel: 'o' },
    arp: { s: 'iabcd', voice: { i: 'celesta', a: 'celesta', b: 'celesta', def: 'harpsi' }, pat: [0, 2, 4, 3, 5, 7, 4, 6, 8, 5, 7, 9], oct: 12, vol: 0.045, dur: 1.4 },
    bass: { s: 'abcd', pat: 'waltzW', voice: 'pizz', vol: 0.3 },
    drums: { s: 'bcd', pat: { b: 'waltz', c: 'waltz2', d: 'waltz' }, vol: 0.7, fill: false },
    taiko: { s: 'c', steps: [0, 6], vol: 0.6 },
    lead: { s: 'iabcd', voice: { i: 'celesta', a: 'reed', b: 'reed', c: 'violin', d: 'celesta' }, vol: 0.065, range: [64, 88], rhythms: [W_A, W_B, W_C], legato: 0.9 },
    imit: { s: 'bc', voice: 'harpsi', delay: 6, vol: 0.04, rhythms: [W_A, W_B] },
    counter: { s: 'c', voice: 'pizz', vol: 0.03, range: [55, 72], rhythms: [W_D] },
    whisper: { s: 'abcd', p: 0.06 },
    sparkle: { s: ALL, notes: [93, 96, 97, 100], p: 0.3 },
  },
});

// HELL 아르케시아: 같은 주제를 4/4 광란으로 — 금관 · 오르간 · 합창이 몰아치고 조와 템포가 계속 바뀐다
const ARKESIA_HELL = compose({
  bpm: 196, seed: 99, form: 'iabcdcbd', crash: 0.16, pump: 0.35, scale: { root: 4, mode: 'phrygian' }, range: [66, 96], rhythms: [R_RUN, R_SYNC, R_ODD, R_FLOW],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'dim'), C(41, 'maj'), C(35, 'dom7')],
  modul: { b: 1, c: 3, d: -2 }, bpmSec: { b: 1.05, c: 1.12, d: 0.82 }, secVol: { i: 0.85, a: 1, b: 1.05, c: 1.15, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 900, cutTo: 3200 },
    organ: { s: 'abcd', vol: 0.035 },
    brassPad: { s: 'bc', vol: 0.045 },
    choir: { s: 'bcd', every: 1, vol: 0.05, vowel: 'o' },
    strings: { s: 'abcd', style: 'half', vol: 0.04 },
    tremolo: { s: 'bc', every16: true, vol: 0.034, oct: 12, cut: 3200 },
    stab: { s: 'abcd', voice: 'brass', steps: { a: [0, 6, 10], c: [0, 2, 4, 6, 8, 10, 12, 14], def: [0, 3, 6, 10, 12] }, vol: 0.04, oct: 12 },
    drums: { s: 'abc', pat: { a: 'gallop', b: 'fast16', c: 'fast16' }, vol: 1 },
    bass: { s: 'abc', pat: 'gallop', vol: 0.3, cut: 700, grit: 0.7 },
    taiko: { s: 'abcd', steps: [0, 4, 8, 12], vol: 0.7 },
    timp: { s: 'bcd', I: 0.99 },
    lead: { s: 'abcd', voice: { a: 'brass', b: 'violin', c: 'brass', d: 'organ' }, vol: 0.08, rhythms: [R_RUN, R_SYNC, R_ODD], bell: true },
    lead2: { s: 'bc', voice: 'organ', oct: 12, vol: 0.05 },
    counter: { s: 'cd', voice: 'violin', vol: 0.045, range: [58, 80], rhythms: [R_RUN] },
    imit: { s: 'cd', voice: 'harpsi', delay: 3, vol: 0.045, rhythms: [R_STAC] },
    whisper: { s: 'abcd', p: 0.1 },
    sparkle: { s: ALL, notes: [93, 96, 97, 100], p: 0.4 },
  },
});

const MIDBOSS = compose({
  bpm: 160, seed: 43, form: 'iabab', crash: 0.1, scale: { root: 7, mode: 'harmonic' }, range: [67, 90], rhythms: [R_SYNC, R_RUN],
  prog: [C(31, 'min'), C(27, 'maj'), C(34, 'maj'), C(29, 'dom7'), C(31, 'min'), C(27, 'maj'), C(26, 'maj'), C(36, 'dom7')],
  secVol: { i: 0.85, a: 0.95, b: 1.05 },
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 1100, cutTo: 2600 },
    drums: { s: 'abcd', pat: { a: 'drive', b: 'dnb' }, vol: 0.95 },
    bass: { s: 'abcd', pat: { a: 'gallop', b: 'dnb' }, vol: 0.26, cut: 640, grit: 0.55 },
    tremolo: { s: 'abcd', every16: true, vol: 0.03, oct: 0 },
    strings: { s: 'abcd', style: 'half', vol: 0.036 },
    stab: { s: 'b', voice: 'brass', steps: [0, 6, 10], vol: 0.04, oct: 12 },
    lead: { s: 'bcd', voice: 'supersaw', vol: 0.07, rhythms: [R_SYNC, R_RUN] },
    taiko: { s: 'bd', steps: [0, 10], vol: 0.6 },
  },
});

// ═════════ 스테이지(병사) 곡 ═════════
// 1: 관측대 — 맑은 글로켄슈필, 행진
const STAGE1 = compose({
  bpm: 126, seed: 53, form: 'iabacb', crash: 0.06, scale: { root: 2, mode: 'major' }, range: [74, 96], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'maj'), C(43, 'maj'), C(40, 'dom7'), C(45, 'maj'), C(38, 'maj'), C(43, 'maj'), C(45, 'dom7'), C(38, 'maj')],
  modul: { c: 2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.04, cut: 1100, cutTo: 2600 },
    arp: { s: 'iabcd', voice: 'celesta', pat: [0, 2, 4, 2, 1, 3, 4, 3], every: 2, oct: 12, vol: 0.05 },
    march: { s: 'ab' }, drums: { s: 'bc', pat: 'four', vol: 0.8 }, bass: { s: 'abcd', pat: 'root8', vol: 0.22, cut: 480 },
    strings: { s: 'bcd', vol: 0.034 }, brassPad: { s: 'c', vol: 0.03 },
    lead: { s: 'abcd', voice: { a: 'flute', b: 'tri', c: 'brass', d: 'flute' }, vol: 0.06, bell: true },
    sparkle: { s: ALL, notes: [88, 90, 93, 95], p: 0.4 },
  },
});

// 2: 기술실 — 칩튠 테크노
const STAGE2 = compose({
  bpm: 140, seed: 59, form: 'iabacb', pump: 0.45, crash: 0.07, scale: { root: 6, mode: 'minpent' }, range: [73, 97], rhythms: [R_SYNC, R_STAC],
  prog: [C(30, 'min7'), C(26, 'maj7'), C(33, 'maj'), C(28, 'dom7'), C(30, 'min7'), C(26, 'maj7'), C(33, 'maj'), C(35, 'dom7')],
  modul: { c: 3 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.08, d: 0.7 },
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 1000, cutTo: 3000 },
    arp: { s: 'abcd', voice: 'pulse', pat: [0, 4, 2, 5, 3, 6, 4, 7], oct: 12, vol: 0.04 },
    drums: { s: 'bc', pat: 'trance', vol: 0.9 }, bass: { s: 'abc', pat: 'pulse16', voice: 'pulse', vol: 0.12 },
    lead: { s: 'bc', voice: 'pulse', vol: 0.06 }, tick: { s: 'abcd' },
    sparkle: { s: ALL, notes: [96, 98, 101], p: 0.3 },
  },
});

// 3: 테라스 — 3/4 뮤제트 왈츠 (아코디언)
const STAGE3 = compose({
  bpm: 172, barSteps: 12, seed: 61, form: 'iabacb', crash: 0.05, scale: { root: 7, mode: 'major' }, range: [67, 91], rhythms: [W_A, W_B, W_D],
  prog: [C(31, 'maj'), C(36, 'maj'), C(38, 'dom7'), C(31, 'maj'), C(28, 'min7'), C(33, 'min7'), C(38, 'dom7'), C(31, 'maj')],
  modul: { c: 2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.028 },
    strings: { s: 'bcd', style: 'half', vol: 0.032 },
    arp: { s: 'abcd', voice: 'pizz', pat: [0, null, null, 2, null, null, 4, null, null, 2, null, null], oct: 12, vol: 0.04 },
    drums: { s: 'bc', pat: 'waltz2', vol: 0.7, fill: false }, bass: { s: 'abcd', pat: 'waltz', voice: 'pizz', vol: 0.3 },
    lead: { s: 'abcd', voice: 'reed', vol: 0.055 },
    counter: { s: 'cd', voice: 'flute', vol: 0.035, range: [62, 80] },
  },
});

// 4: 도서관 — 오르간 · 하프시코드 모방 대위법, 드럼 없음
const STAGE4 = compose({
  bpm: 120, seed: 67, form: 'iabcbac', crash: 0.07, scale: { root: 2, mode: 'dorian' }, range: [62, 88], rhythms: [R_STAC, R_SYNC, R_FLOW],
  prog: [C(38, 'min7'), C(31, 'maj7'), C(36, 'maj'), C(33, 'dom7'), C(38, 'min7'), C(34, 'maj7'), C(31, 'maj7'), C(33, 'sus4')],
  secVol: { i: 0.8, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.03 }, organ: { s: 'abcd', vol: 0.03 },
    arp: { s: 'abcd', voice: 'harpsi', pat: [0, 2, 4, 2, 5, 3, 4, 2, 0, 3, 5, 3, 6, 4, 5, 3], oct: 12, vol: 0.035 },
    bass: { s: 'abcd', pat: 'walk', voice: 'pizz', vol: 0.3 }, heart: { s: 'c' },
    strings: { s: 'cd', style: 'half', vol: 0.032 }, tick: { s: 'bcd' },
    lead: { s: 'abcd', voice: { a: 'organ', b: 'harpsi', c: 'organ' }, vol: 0.05 },
    imit: { s: 'bcd', voice: 'harpsi', delay: 8, vol: 0.04 },
  },
});

// 5: 기록실 — 차가운 하프시코드와 합창, 행진
const STAGE5 = compose({
  bpm: 138, seed: 71, form: 'iabacbc', crash: 0.07, scale: { root: 9, mode: 'minor' }, range: [69, 93], rhythms: [R_STAC, R_SYNC],
  prog: [C(33, 'min'), C(29, 'maj'), C(36, 'maj'), C(31, 'maj'), C(33, 'min'), C(29, 'maj'), C(28, 'maj'), C(28, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.85, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.035 }, choir: { s: 'bcd', every: 4, vol: 0.03, vowel: 'o' },
    arp: { s: 'abcd', voice: 'harpsi', pat: [0, 3, 2, 4, 1, 3, 2, 4], oct: 12, vol: 0.04 },
    drums: { s: 'bc', pat: 'march', vol: 0.9 }, bass: { s: 'abcd', pat: 'octave', vol: 0.24, cut: 600 },
    taiko: { s: 'c', steps: [0, 8], vol: 0.6 }, strings: { s: 'cd', style: 'half', vol: 0.034 },
    lead: { s: 'bcd', voice: { b: 'harpsi', c: 'bell', d: 'harpsi' }, vol: 0.055 },
  },
});

// 6: 달의 정원 — 장엄한 관현악
const STAGE6 = compose({
  bpm: 130, seed: 73, form: 'iabacbcd', pump: 0.5, crash: 0.1, scale: { root: 2, mode: 'minor' }, range: [74, 98], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'min'), C(34, 'maj'), C(41, 'maj'), C(36, 'maj'), C(38, 'min'), C(34, 'maj'), C(33, 'maj'), C(33, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.1, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.045, cut: 1300, cutTo: 3000 }, choir: { s: 'abcd', every: 2, vol: 0.045 },
    strings: { s: 'bcd', vol: 0.04, hi: true, style: { b: 'long', c: 'swell', d: 'swell' } },
    brassPad: { s: 'bc', vol: 0.035 },
    arp: { s: 'abcd', voice: 'harp', pat: [0, 2, 4, 6, 4, 2, 5, 3], every: 2, oct: 12, vol: 0.04 },
    taiko: { s: 'abcd', steps: [0, 6, 10], vol: 0.7 },
    drums: { s: 'bc', pat: 'four', vol: 0.9 }, bass: { s: 'abcd', pat: 'root8', vol: 0.25, cut: 600 },
    lead: { s: 'bcd', voice: { b: 'violin', c: 'brass', d: 'violin' }, vol: 0.07, bell: true },
    sparkle: { s: ALL, notes: [93, 96, 98, 100], p: 0.35 },
  },
});

// EXTRA: 인형극장 서커스 행진 (2/4) — 아코디언 · 오르골 · 피치카토
const STAGE_EX = compose({
  bpm: 150, barSteps: 8, seed: 79, form: 'iabacb', crash: 0.08, scale: { root: 4, mode: 'phrygian' }, range: [64, 90], rhythms: [P_A, P_B],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'maj'), C(41, 'maj'), C(35, 'dom7')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: 'bcd', vol: 0.03, cut: 800, cutTo: 2000 }, organ: { s: 'bc', vol: 0.028 },
    drums: { s: 'abc', pat: 'circus', vol: 0.9 }, bass: { s: 'abcd', pat: 'circus', voice: 'pizz', vol: 0.3 },
    arp: { s: 'iabcd', voice: { i: 'celesta', def: 'pizz' }, pat: [0, 2, 4, 2, 1, 3, 4, 3], oct: 12, vol: 0.045 },
    lead: { s: 'abcd', voice: { a: 'reed', b: 'celesta', c: 'reed', d: 'flute' }, vol: 0.055 }, whisper: { s: ALL, p: 0.06 },
  },
});

// HELL 스테이지: 3/4 광란의 왈츠
const STAGE_HELL = compose({
  bpm: 192, barSteps: 12, seed: 83, form: 'iabcbc', crash: 0.12, scale: { root: 4, mode: 'phrygian' }, range: [64, 92], rhythms: [W_B, W_D, W_A],
  prog: [C(40, 'min'), C(41, 'maj'), C(40, 'min'), C(35, 'dom7'), C(40, 'min'), C(36, 'dim'), C(41, 'maj'), C(35, 'dom7')],
  modul: { b: 1, c: 3 }, secVol: { i: 0.85, a: 1, b: 1.05, c: 1.12, d: 0.85 },
  layers: {
    pad: { s: ALL, vol: 0.035, cut: 900, cutTo: 2800 }, organ: { s: 'bc', vol: 0.035 }, brassPad: { s: 'c', vol: 0.04 },
    drums: { s: 'abc', pat: { a: 'waltz2', def: 'waltz3' }, vol: 1 }, bass: { s: 'abcd', pat: 'waltzW', vol: 0.3, grit: 0.7 },
    strings: { s: 'abc', style: 'half', vol: 0.04 }, taiko: { s: 'bc', steps: [0, 4, 8], vol: 0.6 },
    arp: { s: 'abcd', voice: 'pizz', pat: [0, 2, 4, 3, 5, 7, 4, 6, 8, 5, 7, 9], oct: 12, vol: 0.05 },
    lead: { s: 'abcd', voice: { a: 'reed', b: 'brass', c: 'violin', d: 'reed' }, vol: 0.07 }, whisper: { s: ALL, p: 0.08 },
  },
});

// ═════════ 잔잔한 곡 ═════════
const MENU = compose({
  bpm: 66, seed: 83, form: 'iabab', riser: false, scale: { root: 2, mode: 'lydian' }, range: [69, 90], rhythms: [R_SLOW, R_LONG],
  prog: [C(38, 'maj9'), C(35, 'min7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj9'), C(30, 'min7'), C(31, 'maj7'), C(33, 'dom7')],
  modul: { b: 2 }, bpmSec: { d: 0.9 }, secVol: { i: 0.75, a: 0.9, b: 1, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.045, a: 1.6, r: 2, cut: 650, cutTo: 1500 }, strings: { s: 'abd', vol: 0.03, style: 'swell' },
    choir: { s: 'bd', every: 2, vol: 0.03, vowel: 'o' },
    arp: { s: ALL, voice: { i: 'celesta', a: 'harp', b: 'celesta', d: 'harp' }, pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.05, dur: 2.2 },
    lead: { s: 'abd', voice: 'flute', vol: 0.05, legato: 0.98 },
    sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.4 },
  },
});
const VICTORY = compose({
  bpm: 96, seed: 89, form: 'iabab', riser: false, crash: 0.08, scale: { root: 2, mode: 'major' }, range: [74, 96], rhythms: [R_LONG, R_FLOW],
  prog: [C(38, 'maj'), C(43, 'maj'), C(35, 'min7'), C(45, 'maj'), C(38, 'maj'), C(43, 'maj'), C(35, 'min7'), C(45, 'dom7')],
  secVol: { i: 0.9, a: 1, b: 1.05 },
  layers: {
    pad: { s: ALL, vol: 0.045, cut: 900, cutTo: 2400 }, strings: { s: 'abcd', vol: 0.036 }, taiko: { s: 'abcd', steps: [0], vol: 0.5 },
    brassPad: { s: 'ab', vol: 0.04 }, arp: { s: ALL, voice: 'celesta', pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.06 },
    lead: { s: 'abcd', voice: { a: 'brass', b: 'violin' }, vol: 0.06 }, sparkle: { s: ALL, notes: [93, 95, 98], p: 0.4 },
  },
});
const DEFEAT = compose({
  bpm: 54, seed: 97, form: 'iab', riser: false, scale: { root: 2, mode: 'minor' }, range: [62, 84], rhythms: [R_SLOW],
  prog: [C(38, 'min'), C(34, 'maj'), C(31, 'min'), C(33, 'maj'), C(38, 'min'), C(34, 'maj'), C(31, 'min'), C(33, 'dom7')],
  layers: {
    pad: { s: ALL, vol: 0.05, cut: 500, cutTo: 1100, a: 1.8 }, choir: { s: ALL, every: 2, vol: 0.03, vowel: 'o' },
    arp: { s: ALL, voice: 'bell', pat: [1, 3, 2, 4], every: 4, oct: 12, vol: 0.05, dur: 3 }, lead: { s: 'ab', voice: 'flute', vol: 0.04, legato: 0.98 },
  },
});
const ENDING = compose({
  bpm: 76, seed: 101, form: 'iabacb', riser: false, crash: 0.06, scale: { root: 2, mode: 'major' }, range: [69, 93], rhythms: [R_LONG, R_SLOW],
  prog: [C(38, 'maj'), C(35, 'min7'), C(31, 'maj7'), C(38, 'maj'), C(36, 'maj7'), C(31, 'maj7'), C(33, 'maj'), C(38, 'maj')],
  modul: { c: 2 }, secVol: { i: 0.8, a: 0.95, b: 1, c: 1.05, d: 0.8 },
  layers: {
    pad: { s: ALL, vol: 0.045, a: 1.4, r: 2 }, strings: { s: 'abcd', vol: 0.034, style: 'swell' }, choir: { s: 'bcd', every: 2, vol: 0.035 },
    arp: { s: ALL, voice: 'harp', pat: [1, 3, 2, 4, 3, 2, 4, 3], every: 2, oct: 12, vol: 0.05 },
    lead: { s: 'abcd', voice: { a: 'flute', b: 'violin', c: 'violin', d: 'flute' }, vol: 0.055 }, sparkle: { s: ALL, notes: [93, 95, 98, 100], p: 0.4 },
  },
});

export const TRACKS = {
  menu: MENU, stage1: STAGE1, stage2: STAGE2, stage3: STAGE3, stage4: STAGE4, stage5: STAGE5, stage6: STAGE6, stageEx: STAGE_EX, stageHell: STAGE_HELL,
  midboss: MIDBOSS, opsir: OPSIR, astra: ASTRA, tramont: TRAMONT, index: INDEX, bellis: BELLIS, arkesia: ARKESIA, arkesiaHell: ARKESIA_HELL,
  lumina: LUMINA, umbra: UMBRA, luna: LUNA, ultimate: ULTIMATE, victory: VICTORY, defeat: DEFEAT, ending: ENDING,
};
export const TRACK_INFO = {
  menu: ['00', '타이틀 — 달의 정원으로', 66], stage1: ['01', 'STAGE 1 — 관측대의 별 병사', 126], opsir: ['02', '옵서 — 무심한 관측', 104],
  stage2: ['03', 'STAGE 2 — 기술실의 회로', 140], astra: ['04', '아스트라 — 떨리는 시스템', 150],
  stage3: ['05', 'STAGE 3 — 테라스의 왈츠', 172], tramont: ['06', '트라몽 — VIVA LA FRANCE', 176],
  stage4: ['07', 'STAGE 4 — 도서관의 밤', 120], index: ['08', '인덱스 — 색인 정렬', 164],
  stage5: ['09', 'STAGE 5 — 기록실의 행진', 138], bellis: ['10', '벨리스 — 감사 개시', 142],
  stage6: ['11', 'FINAL STAGE — 달의 정원', 130], midboss: ['12', '중간 보스 — 파수병', 160],
  lumina: ['13', '루나린스 I · LUMINA', 98], umbra: ['14', '루나린스 II · UMBRA', 66], luna: ['15', '루나린스 III · LUNA', 152],
  ultimate: ['16', '얼티메이트 스킬 — 월천', 184], victory: ['17', '승리', 96], defeat: ['18', '패배', 54], ending: ['19', '엔딩 — 달이 저물고', 76],
  stageEx: ['20', 'EXTRA STAGE — 인형극장 행진', 150], arkesia: ['21', '아르케시아 — 끝나지 않는 관극', 156],
  stageHell: ['22', 'HELL STAGE — 광란의 왈츠', 192], arkesiaHell: ['23', 'HELL 아르케시아 — 막이 내리지 않는다', 196],
};
