// 절차적 BGM 디렉터.
// - 곡 데이터는 tracks.js(compose.js 로 작곡) 에 있고, 여기서는 룩어헤드 스케줄러(16분음표 그리드)로 노트를 예약한다.
// - 씬 전환은 다음 마디 경계(또는 즉시)에 크로스페이드로 이루어진다.
// - intensity(0~1)로 같은 곡 안에서 레이어/템포를 끌어올린다 (얼티메이트 스킬 · 루나 형태).
import { TRACKS } from './tracks.js';

const LOOKAHEAD = 0.22;
const SCENES = TRACKS;

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

/** 오프라인 렌더용: 곡 하나를 seconds초만큼 연주하는 노트를 전부 예약한다 (OfflineAudioContext 에서 사용). ramp 가 있으면 intensity 를 0→1 로 올린다. */
export function scheduleScene(engine, name, seconds, { intensity = 0, ramp = false } = {}) {
  const def = SCENES[name]; if (!def) throw new Error('no scene ' + name);
  const m = new MusicDirector(engine); m.intensity = intensity;
  const sc = m._makeScene(name, 0, 0.01);
  let t = 0.05, step = 0;
  while (t < seconds) {
    if (ramp) m.intensity = Math.min(1, Math.max(0, (t / seconds) * 1.25 - 0.1));
    const s = step % 16, bar = Math.floor(step / 16);
    def.tick(m, sc, t, s, bar);
    t += 60 / (def.bpm + (def.bpmEnrage || 0) * m.intensity) / 4; step++;
  }
  return sc;
}
