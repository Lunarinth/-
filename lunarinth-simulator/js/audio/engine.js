// Web Audio 엔진 코어: 버스, 리버브, 딜레이, 컴프레서/리미터, 공용 보이스 빌더.
// 음악(music.js)과 효과음(sfx.js)이 이 위에서 동작한다.

const KEY = 'lunarinth.audio.v1';

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const n = i / len;
      // 초반 확산 + 지수 감쇠. 약간의 고역 감쇠로 어두운 잔향.
      const env = Math.pow(1 - n, decay);
      d[i] = (Math.random() * 2 - 1) * env * (0.55 + 0.45 * (1 - n));
    }
    // 간단한 1-pole 로우패스
    let prev = 0;
    for (let i = 0; i < len; i++) { prev = prev + (d[i] - prev) * 0.55; d[i] = prev; }
  }
  return buf;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.vol = { master: 0.85, music: 0.7, sfx: 0.9 };
    this.muted = false;
    this._load();
  }

  _load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s) { Object.assign(this.vol, s.vol || {}); this.muted = !!s.muted; }
    } catch (e) { /* 저장소를 못 쓰는 환경이어도 동작해야 한다 */ }
  }
  _save() {
    try { localStorage.setItem(KEY, JSON.stringify({ vol: this.vol, muted: this.muted })); } catch (e) { /* noop */ }
  }

  init(external = null) {
    if (this.ctx) { this.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC && !external) return false;
    const c = (this.ctx = external || new AC({ latencyHint: 'interactive' }));

    this.master = c.createGain();
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.knee.value = 14; this.comp.ratio.value = 5;
    this.comp.attack.value = 0.005; this.comp.release.value = 0.22;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -3; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001; this.limiter.release.value = 0.08;
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 1024;
    this.master.connect(this.comp); this.comp.connect(this.limiter);
    this.limiter.connect(this.analyser); this.limiter.connect(c.destination);

    this.musicBus = c.createGain();
    this.musicDuck = c.createGain();
    this.sfxBus = c.createGain();
    this.musicBus.connect(this.musicDuck); this.musicDuck.connect(this.master);
    this.sfxBus.connect(this.master);

    const impulse = makeImpulse(c, 3.2, 2.4);
    const mkRev = (dest, level) => {
      const input = c.createGain(); const conv = c.createConvolver(); conv.buffer = impulse;
      const out = c.createGain(); out.gain.value = level;
      input.connect(conv); conv.connect(out); out.connect(dest);
      return input;
    };
    this.musicRev = mkRev(this.musicBus, 0.55);
    this.sfxRev = mkRev(this.sfxBus, 0.5);

    // 음악용 딜레이 (템포 동기)
    this.dlyIn = c.createGain();
    this.dly = c.createDelay(2); this.dly.delayTime.value = 0.375;
    const fb = c.createGain(); fb.gain.value = 0.36;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const dout = c.createGain(); dout.gain.value = 0.4;
    this.dlyIn.connect(this.dly); this.dly.connect(lp); lp.connect(fb); fb.connect(this.dly);
    lp.connect(dout); dout.connect(this.musicBus);
    lp.connect(this.musicRev);

    // 화이트 노이즈 버퍼
    const nl = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, nl, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;

    this.ready = true;
    this.applyVolumes();
    this.resume();
    return true;
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }

  applyVolumes() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.03);
  }
  setVolume(kind, v) { this.vol[kind] = Math.max(0, Math.min(1, v)); this.applyVolumes(); this._save(); }
  setMuted(m) { this.muted = !!m; this.applyVolumes(); this._save(); }

  /** 큰 연출 순간에 음악을 잠깐 눌러 준다. */
  duck(amount = 0.35, hold = 0.4, release = 0.9) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, g = this.musicDuck.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(amount, t, 0.02);
    g.setTargetAtTime(1, t + hold, release / 3);
  }

  // ---------- 보이스 빌더 ----------
  /** 출력 번들: { dry, rev, dly } — 보이스를 번들에 연결한다. */
  send(v, b, rev = 0, dly = 0) {
    const c = this.ctx;
    v.connect(b.dry);
    if (rev > 0 && b.rev) { const g = c.createGain(); g.gain.value = rev; v.connect(g); g.connect(b.rev); }
    if (dly > 0 && b.dly) { const g = c.createGain(); g.gain.value = dly; v.connect(g); g.connect(b.dly); }
  }

  tone(b, o) {
    const c = this.ctx;
    const t = o.t;
    const dur = Math.max(0.02, o.dur);
    const a = o.a ?? 0.005, r = o.r ?? 0.1, s = o.s ?? 0.6;
    const d = Math.min(o.d ?? 0.1, Math.max(0.001, dur - a));
    const vol = o.vol ?? 0.2;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.f1), t + (o.glide ?? dur));
    if (o.detune) osc.detune.value = o.detune;
    let node = osc;
    if (o.vib) {
      const l = c.createOscillator(); l.frequency.value = o.vibRate || 5.5;
      const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib, t + Math.min(dur, 0.35));
      l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + r * 2);
    }
    if (o.cut) {
      const f = c.createBiquadFilter(); f.type = o.ftype || 'lowpass'; f.Q.value = o.q ?? 0.7;
      f.frequency.setValueAtTime(o.cut, t);
      if (o.cutTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.cutTo), t + (o.cutT ?? dur * 0.7));
      node.connect(f); node = f;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * s), t + a + d);
    g.gain.setTargetAtTime(0.0001, t + dur, r / 3);
    node.connect(g);
    this.send(g, b, o.rev || 0, o.dly || 0);
    osc.start(t); osc.stop(t + dur + r * 1.6 + 0.05);
    return osc;
  }

  noise(b, o) {
    const c = this.ctx;
    const t = o.t, dur = Math.max(0.02, o.dur), vol = o.vol ?? 0.2;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f ?? 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + dur);
    const g = c.createGain();
    const a = o.a ?? 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.swell) { // 서서히 커졌다 끊김 (라이저)
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.92);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    src.connect(f); f.connect(g);
    this.send(g, b, o.rev || 0, o.dly || 0);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  // ---------- 타악기 ----------
  kick(b, t, vol = 0.9, pitch = 1) {
    this.tone(b, { type: 'sine', f: 150 * pitch, f1: 44 * pitch, glide: 0.11, t, dur: 0.32, vol, a: 0.001, d: 0.3, s: 0.01, r: 0.08 });
    this.noise(b, { t, dur: 0.03, vol: vol * 0.35, type: 'highpass', f: 2200, q: 0.7 });
  }
  snare(b, t, vol = 0.5, rev = 0.25) {
    this.tone(b, { type: 'triangle', f: 210, f1: 130, glide: 0.1, t, dur: 0.16, vol: vol * 0.7, a: 0.001, d: 0.14, s: 0.01, r: 0.05 });
    this.noise(b, { t, dur: 0.2, vol, type: 'bandpass', f: 2200, q: 0.6, rev });
  }
  hat(b, t, vol = 0.18, open = false) {
    this.noise(b, { t, dur: open ? 0.22 : 0.05, vol, type: 'highpass', f: 7600, q: 0.8 });
  }
  taiko(b, t, vol = 1, rev = 0.5) {
    this.tone(b, { type: 'sine', f: 110, f1: 46, glide: 0.25, t, dur: 0.9, vol, a: 0.002, d: 0.8, s: 0.02, r: 0.2, rev });
    this.tone(b, { type: 'triangle', f: 220, f1: 90, glide: 0.1, t, dur: 0.3, vol: vol * 0.4, a: 0.001, d: 0.25, s: 0.01, r: 0.1 });
    this.noise(b, { t, dur: 0.12, vol: vol * 0.5, type: 'lowpass', f: 900, q: 0.8 });
  }

  // ---------- 선율/화음 ----------
  bell(b, t, midi, vol = 0.12, dur = 1.8, rev = 0.5, dly = 0.35) {
    const c = this.ctx, f = mtof(midi);
    const car = c.createOscillator(); car.type = 'sine'; car.frequency.value = f;
    const mod = c.createOscillator(); mod.type = 'sine'; mod.frequency.value = f * 3.51;
    const mg = c.createGain(); mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g);
    this.send(g, b, rev, dly);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  pluck(b, t, midi, vol = 0.12, dur = 0.5, o = {}) {
    this.tone(b, { type: o.type || 'triangle', f: mtof(midi), t, dur, vol, a: 0.002, d: dur * 0.9, s: 0.02, r: 0.08, cut: o.cut || 3200, cutTo: 500, q: 1.2, rev: o.rev ?? 0.3, dly: o.dly ?? 0.3 });
  }
  pad(b, t, midis, dur, vol = 0.05, o = {}) {
    const a = Math.min(o.a ?? 1.0, dur * 0.5), r = o.r ?? 1.2;
    for (const m of midis) {
      for (const det of [-8, 8]) {
        this.tone(b, { type: o.type || 'sawtooth', f: mtof(m), detune: det, t, dur, vol, a, d: dur * 0.4, s: 0.85, r, cut: o.cut || 900, cutTo: o.cutTo || 1700, cutT: dur * 0.8, q: 0.5, rev: o.rev ?? 0.5 });
      }
    }
  }
  bass(b, t, midi, dur, vol = 0.3, o = {}) {
    this.tone(b, { type: 'sine', f: mtof(midi), t, dur, vol, a: 0.008, d: dur * 0.5, s: 0.7, r: 0.08 });
    this.tone(b, { type: 'sawtooth', f: mtof(midi), t, dur, vol: vol * (o.grit ?? 0.35), a: 0.006, d: dur * 0.4, s: 0.5, r: 0.06, cut: o.cut || 420, cutTo: 160, q: 1.4 });
  }
  lead(b, t, midi, dur, vol = 0.1, o = {}) {
    this.tone(b, { type: o.type || 'sawtooth', f: mtof(midi), t, dur, vol, a: o.a ?? 0.03, d: 0.15, s: 0.75, r: o.r ?? 0.18, cut: o.cut || 2600, cutTo: o.cutTo || 1400, q: 1.1, vib: o.vib ?? 18, vibRate: 5.4, detune: o.detune || 0, rev: o.rev ?? 0.4, dly: o.dly ?? 0.25 });
  }
  /** 모음 'ㅏ' 포먼트 합창 */
  choir(b, t, midis, dur, vol = 0.04, o = {}) {
    const c = this.ctx, a = Math.min(o.a ?? 1.2, dur * 0.5), r = o.r ?? 1.4;
    const formants = o.vowel === 'o' ? [[500, 6], [900, 5], [2400, 4]] : [[800, 6], [1150, 5], [2900, 4]];
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(vol, t + a);
    out.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.05)); out.gain.setTargetAtTime(0.0001, t + dur, r / 3);
    const oscs = [];
    for (const m of midis) {
      for (const det of [-11, 0, 11]) {
        const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = mtof(m); osc.detune.value = det;
        const lfo = c.createOscillator(); lfo.frequency.value = 4.6 + Math.random();
        const lg = c.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(osc.detune);
        const mix = c.createGain(); mix.gain.value = 1 / (midis.length * 3);
        osc.connect(mix);
        for (const [fq, q] of formants) {
          const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
          mix.connect(bp); bp.connect(out);
        }
        osc.start(t); lfo.start(t); oscs.push(osc, lfo);
      }
    }
    const stopT = t + dur + r * 1.6 + 0.05;
    for (const x of oscs) x.stop(stopT);
    this.send(out, b, o.rev ?? 0.7, 0);
  }

  // ---------- 추가 악기 (v4) ----------
  /** 현악 앙상블: 느린 어택 + 비브라토 */
  strings(b, t, midis, dur, vol = 0.04, o = {}) {
    const a = Math.min(o.a ?? 0.35, dur * 0.5), r = o.r ?? 0.6;
    for (const m of midis) for (const det of [-8, 8]) {
      this.tone(b, { type: 'sawtooth', f: mtof(m), detune: det, t, dur, vol: vol * 0.7, a, d: dur * 0.3, s: 0.9, r, cut: o.cut || 2200, cutTo: o.cutTo || 3200, cutT: dur * 0.6, q: 0.4, vib: o.vib ?? 12, vibRate: 5.1, rev: o.rev ?? 0.55, dly: o.dly ?? 0 });
    }
  }
  /** 하프: 맑고 긴 여운 */
  harp(b, t, midi, vol = 0.07, dur = 1.6, o = {}) {
    this.tone(b, { type: 'triangle', f: mtof(midi), t, dur, vol, a: 0.002, d: dur * 0.9, s: 0.02, r: 0.12, cut: o.cut || 4600, cutTo: 900, q: 0.8, rev: o.rev ?? 0.5, dly: o.dly ?? 0.3 });
    this.tone(b, { type: 'sine', f: mtof(midi + 12), t, dur: dur * 0.6, vol: vol * 0.35, a: 0.002, d: dur * 0.5, s: 0.01, r: 0.08, rev: o.rev ?? 0.5 });
  }
  /** 파이프 오르간: 정수배음 가산 */
  organ(b, t, midis, dur, vol = 0.04, o = {}) {
    const a = Math.min(o.a ?? 0.04, dur * 0.4);
    for (const m of midis) for (const [k, g] of [[1, 1], [2, 0.55], [3, 0.35], [4, 0.2]]) {
      this.tone(b, { type: 'sine', f: mtof(m) * k, t, dur, vol: vol * g * 0.6, a, d: 0.1, s: 0.9, r: o.r ?? 0.12, vib: 5, vibRate: 5, rev: o.rev ?? 0.6 });
    }
  }
  /** 아코디언풍 리드(리드 악기) */
  reed(b, t, midi, dur, vol = 0.06, o = {}) {
    for (const [ty, det] of [['sawtooth', -7], ['square', 7]]) this.tone(b, { type: ty, f: mtof(midi), detune: det, t, dur, vol: vol * 0.6, a: 0.02, d: 0.1, s: 0.8, r: 0.1, cut: 2400, cutTo: 1600, q: 0.9, vib: o.vib ?? 16, vibRate: 5.8, rev: o.rev ?? 0.35, dly: o.dly ?? 0.15 });
  }
  /** 피치카토 */
  pizz(b, t, midi, vol = 0.08, dur = 0.22, o = {}) {
    this.tone(b, { type: 'triangle', f: mtof(midi), t, dur, vol, a: 0.002, d: dur * 0.9, s: 0.02, r: 0.05, cut: 2600, cutTo: 600, q: 1.1, rev: o.rev ?? 0.3, dly: o.dly ?? 0.1 });
  }
  /** 심벌/크래시 */
  crash(b, t, vol = 0.12, dur = 1.6) {
    this.noise(b, { t, dur, vol, type: 'highpass', f: 5200, q: 0.6, a: 0.002, rev: 0.4 });
    this.noise(b, { t, dur: dur * 0.5, vol: vol * 0.6, type: 'bandpass', f: 9000, q: 0.5, a: 0.002 });
  }
}
