// 효과음 시스템: 전부 Web Audio로 합성한다 (외부 음원 파일 없음).
// play(name, { pan, vol, pitch }) — pan은 화면 x 위치(-1..1)로 스테레오 정위.
// 이름별 쿨다운과 전체 동시 발음 수 제한으로 탄막이 많아도 소리가 뭉개지지 않게 한다.

const MAX_VOICES = 36;

export class Sfx {
  constructor(engine) {
    this.E = engine;
    this.last = new Map();
    this.active = 0;
    this.defs = this._defs();
  }

  play(name, o = {}) {
    const E = this.E;
    if (!E.ready || E.ctx.state !== 'running') return;
    const def = this.defs[name];
    if (!def) return;
    const now = performance.now();
    const lt = this.last.get(name) || 0;
    if (now - lt < (def.cd || 0)) return;
    if (this.active >= MAX_VOICES && !def.important) return;
    this.last.set(name, now);

    const c = E.ctx, t = c.currentTime + 0.005;
    const pan = c.createStereoPanner(); pan.pan.value = Math.max(-1, Math.min(1, o.pan || 0));
    const out = c.createGain(); out.gain.value = (o.vol ?? 1) * (def.vol ?? 1);
    out.connect(pan); pan.connect(E.sfxBus);
    const b = { dry: out, rev: E.sfxRev, dly: null };
    this.active++;
    setTimeout(() => { this.active = Math.max(0, this.active - 1); }, (def.len || 0.6) * 1000);
    try { def.fn(E, b, t, o.pitch || 1, o); } catch (err) { console.error('sfx', name, err); }
  }

  _defs() {
    const R = (a, b) => a + Math.random() * (b - a);
    const D = {};

    // ───── UI ─────
    D.ui_hover = { cd: 40, len: 0.2, vol: 0.5, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: 1320 * p, f1: 1760 * p, glide: 0.06, t, dur: 0.12, vol: 0.12, a: 0.002, d: 0.1, s: 0.01, r: 0.05, rev: 0.3 });
    } };
    D.ui_click = { len: 0.5, fn: (E, b, t, p) => {
      E.bell(b, t, 88, 0.14, 0.9, 0.5, 0);
      E.bell(b, t + 0.05, 93, 0.1, 1.1, 0.5, 0);
      E.noise(b, { t, dur: 0.05, vol: 0.06, type: 'highpass', f: 5000 });
    } };
    D.ui_start = { len: 3, important: true, fn: (E, b, t) => {
      [74, 78, 81, 85, 90].forEach((m, i) => E.bell(b, t + i * 0.12, m, 0.14, 2.6, 0.9, 0));
      E.noise(b, { t, dur: 1.4, vol: 0.12, type: 'bandpass', f: 500, f1: 6000, q: 1.5, swell: true, a: 0.05, rev: 0.6 });
    } };
    D.pause = { len: 0.5, fn: (E, b, t) => { E.tone(b, { type: 'sine', f: 660, f1: 330, glide: 0.2, t, dur: 0.3, vol: 0.14, a: 0.003, d: 0.25, s: 0.01, r: 0.1, rev: 0.4 }); } };
    D.unpause = { len: 0.5, fn: (E, b, t) => { E.tone(b, { type: 'sine', f: 330, f1: 660, glide: 0.2, t, dur: 0.3, vol: 0.14, a: 0.003, d: 0.25, s: 0.01, r: 0.1, rev: 0.4 }); } };

    // ───── 대사 타자음 ─────
    D.blip_luna = { cd: 38, len: 0.15, vol: 0.55, fn: (E, b, t, p) => {
      E.tone(b, { type: 'triangle', f: R(1000, 1500) * p, t, dur: 0.06, vol: 0.12, a: 0.002, d: 0.05, s: 0.01, r: 0.03, rev: 0.4 });
      E.tone(b, { type: 'sine', f: R(2000, 3000) * p, t, dur: 0.04, vol: 0.04, a: 0.001, d: 0.04, s: 0.01, r: 0.02 });
    } };
    D.blip_claire = { cd: 38, len: 0.15, vol: 0.55, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: R(520, 700) * p, t, dur: 0.07, vol: 0.14, a: 0.003, d: 0.06, s: 0.01, r: 0.03, rev: 0.25 });
    } };
    D.blip_narr = { cd: 45, len: 0.15, vol: 0.4, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: R(300, 380) * p, t, dur: 0.06, vol: 0.1, a: 0.004, d: 0.05, s: 0.01, r: 0.03, rev: 0.5 });
    } };

    // ───── 플레이어 ─────
    D.shoot = { cd: 45, len: 0.25, vol: 0.55, fn: (E, b, t, p) => {
      E.noise(b, { t, dur: 0.14, vol: 0.14, type: 'bandpass', f: 2600 * p, f1: 900 * p, q: 2.2, a: 0.004, rev: 0.25 });
      E.tone(b, { type: 'sine', f: 980 * p, f1: 1700 * p, glide: 0.09, t, dur: 0.1, vol: 0.07, a: 0.003, d: 0.08, s: 0.01, r: 0.03 });
    } };
    D.dash = { len: 0.4, fn: (E, b, t) => {
      E.noise(b, { t, dur: 0.28, vol: 0.28, type: 'bandpass', f: 600, f1: 5200, q: 1.2, a: 0.01, rev: 0.3 });
      E.tone(b, { type: 'sine', f: 320, f1: 900, glide: 0.2, t, dur: 0.22, vol: 0.08, a: 0.005, d: 0.2, s: 0.01, r: 0.05 });
    } };
    D.parry = { len: 0.35, fn: (E, b, t) => {
      E.noise(b, { t, dur: 0.12, vol: 0.12, type: 'highpass', f: 4000 });
      E.tone(b, { type: 'sine', f: 520, f1: 780, glide: 0.1, t, dur: 0.14, vol: 0.1, a: 0.004, d: 0.12, s: 0.01, r: 0.05 });
    } };
    D.parry_ok = { len: 1.6, important: true, fn: (E, b, t) => {
      // 은쟁반이 탄을 쳐내는 금속성 링
      for (const [m, v] of [[96, 0.16], [103, 0.1], [108, 0.07]]) E.bell(b, t, m, v, 1.3, 0.6, 0);
      E.noise(b, { t, dur: 0.2, vol: 0.28, type: 'highpass', f: 3500, rev: 0.4 });
      E.tone(b, { type: 'sine', f: 180, f1: 60, glide: 0.12, t, dur: 0.2, vol: 0.5, a: 0.001, d: 0.18, s: 0.01, r: 0.05 });
    } };
    D.graze = { cd: 70, len: 0.15, vol: 0.5, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: R(2400, 3200) * p, t, dur: 0.05, vol: 0.06, a: 0.001, d: 0.045, s: 0.01, r: 0.02 });
    } };
    D.hurt = { len: 1.2, important: true, vol: 1.1, fn: (E, b, t) => {
      E.tone(b, { type: 'sawtooth', f: 260, f1: 70, glide: 0.35, t, dur: 0.4, vol: 0.28, a: 0.002, d: 0.38, s: 0.01, r: 0.1, cut: 1800, cutTo: 200 });
      E.noise(b, { t, dur: 0.35, vol: 0.35, type: 'lowpass', f: 2500, f1: 200, q: 0.8, rev: 0.4 });
      E.bell(b, t + 0.02, 55, 0.12, 1.0, 0.5, 0); // 깨지는 유리 같은 잔향
    } };
    D.heal = { len: 1.5, fn: (E, b, t) => {
      [81, 85, 88, 93].forEach((m, i) => E.bell(b, t + i * 0.07, m, 0.1, 1.4, 0.8, 0));
    } };

    // ───── 보스 피격 / 사망 ─────
    D.hit_boss = { cd: 55, len: 0.2, vol: 0.5, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: 240 * p, f1: 110 * p, glide: 0.07, t, dur: 0.1, vol: 0.18, a: 0.001, d: 0.09, s: 0.01, r: 0.03 });
      E.noise(b, { t, dur: 0.07, vol: 0.12, type: 'highpass', f: 4000 });
    } };
    D.hit_boss_heavy = { cd: 80, len: 0.5, vol: 0.9, fn: (E, b, t) => {
      E.tone(b, { type: 'sine', f: 300, f1: 70, glide: 0.18, t, dur: 0.3, vol: 0.4, a: 0.001, d: 0.28, s: 0.01, r: 0.06 });
      E.noise(b, { t, dur: 0.25, vol: 0.3, type: 'bandpass', f: 3000, f1: 800, q: 1.2, rev: 0.4 });
      E.bell(b, t, 100, 0.1, 0.7, 0.4, 0);
    } };
    D.boss_down = { len: 5, important: true, fn: (E, b, t) => {
      E.taiko(b, t, 1.2, 0.9);
      E.noise(b, { t, dur: 3.5, vol: 0.3, type: 'bandpass', f: 4000, f1: 200, q: 1.2, a: 0.02, rev: 0.7 });
      [93, 90, 86, 81, 78, 74].forEach((m, i) => E.bell(b, t + 0.2 + i * 0.22, m, 0.12, 3, 0.9, 0));
    } };

    // ───── 보스 공격 ─────
    D.cast = { len: 0.8, fn: (E, b, t) => {
      E.tone(b, { type: 'sine', f: 440, f1: 1320, glide: 0.4, t, dur: 0.5, vol: 0.1, a: 0.1, d: 0.3, s: 0.2, r: 0.1, rev: 0.6 });
      E.bell(b, t + 0.3, 91, 0.1, 1.2, 0.8, 0);
    } };
    D.fan = { cd: 60, len: 0.5, vol: 0.7, fn: (E, b, t, p) => {
      E.noise(b, { t, dur: 0.22, vol: 0.12, type: 'bandpass', f: 3200 * p, f1: 1200 * p, q: 2.5, a: 0.005, rev: 0.4 });
      E.bell(b, t, 88 + (p > 1 ? 3 : 0), 0.07, 0.8, 0.6, 0);
    } };
    D.orb = { cd: 50, len: 0.4, vol: 0.55, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: 700 * p, f1: 420 * p, glide: 0.12, t, dur: 0.16, vol: 0.1, a: 0.003, d: 0.14, s: 0.01, r: 0.05, rev: 0.4 });
    } };
    D.dark = { cd: 70, len: 0.8, vol: 0.7, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sawtooth', f: 160 * p, f1: 70 * p, glide: 0.3, t, dur: 0.4, vol: 0.14, a: 0.01, d: 0.35, s: 0.05, r: 0.1, cut: 700, cutTo: 120, rev: 0.7 });
      E.noise(b, { t, dur: 0.4, vol: 0.1, type: 'lowpass', f: 900, f1: 150, q: 1, rev: 0.6 });
    } };
    D.telegraph = { cd: 50, len: 0.6, vol: 0.5, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: 600 * p, f1: 1000 * p, glide: 0.25, t, dur: 0.3, vol: 0.08, a: 0.02, d: 0.25, s: 0.1, r: 0.08, rev: 0.4 });
    } };
    D.zone_hit = { cd: 45, len: 1.2, vol: 0.7, fn: (E, b, t, p) => {
      E.bell(b, t, 84 * 1, 0.1, 1.0, 0.7, 0);
      E.tone(b, { type: 'sine', f: 200 * p, f1: 60, glide: 0.15, t, dur: 0.25, vol: 0.25, a: 0.002, d: 0.22, s: 0.01, r: 0.05 });
      E.noise(b, { t, dur: 0.2, vol: 0.12, type: 'bandpass', f: 2200, f1: 600, q: 1.4, rev: 0.5 });
    } };
    D.beam_charge = { len: 1.4, vol: 0.8, fn: (E, b, t) => {
      E.tone(b, { type: 'sawtooth', f: 200, f1: 1600, glide: 0.9, t, dur: 0.95, vol: 0.07, a: 0.8, d: 0.05, s: 1, r: 0.05, cut: 800, cutTo: 5000, cutT: 0.9, rev: 0.4 });
    } };
    D.beam_fire = { len: 1, important: true, fn: (E, b, t) => {
      E.noise(b, { t, dur: 0.4, vol: 0.35, type: 'bandpass', f: 4500, f1: 700, q: 1, a: 0.002, rev: 0.4 });
      E.tone(b, { type: 'sawtooth', f: 1400, f1: 200, glide: 0.35, t, dur: 0.4, vol: 0.16, a: 0.002, d: 0.38, s: 0.01, r: 0.06, cut: 4000, cutTo: 400 });
      E.bell(b, t, 100, 0.1, 0.8, 0.6, 0);
    } };
    D.decoy_pop = { cd: 40, len: 0.6, vol: 0.8, fn: (E, b, t) => {
      E.noise(b, { t, dur: 0.18, vol: 0.2, type: 'highpass', f: 3500, rev: 0.5 });
      E.tone(b, { type: 'triangle', f: 900, f1: 220, glide: 0.2, t, dur: 0.25, vol: 0.14, a: 0.002, d: 0.22, s: 0.01, r: 0.05, rev: 0.4 });
    } };
    D.teleport = { cd: 100, len: 0.7, fn: (E, b, t) => {
      E.tone(b, { type: 'sine', f: 1800, f1: 300, glide: 0.25, t, dur: 0.3, vol: 0.1, a: 0.002, d: 0.28, s: 0.01, r: 0.05, rev: 0.6 });
      E.noise(b, { t, dur: 0.3, vol: 0.12, type: 'bandpass', f: 5000, f1: 800, q: 2, rev: 0.6 });
    } };
    D.veil = { len: 3, important: true, fn: (E, b, t) => {
      E.tone(b, { type: 'sawtooth', f: 55, f1: 40, glide: 2, t, dur: 2.4, vol: 0.2, a: 0.8, d: 1, s: 0.5, r: 1, cut: 300, cutTo: 120, rev: 0.8 });
      E.noise(b, { t, dur: 2, vol: 0.1, type: 'lowpass', f: 800, f1: 200, q: 1, a: 0.4, rev: 0.8 });
    } };
    D.moon_throw = { len: 1.5, important: true, fn: (E, b, t) => {
      E.tone(b, { type: 'sine', f: 90, f1: 400, glide: 0.8, t, dur: 1, vol: 0.3, a: 0.5, d: 0.4, s: 0.4, r: 0.2, rev: 0.6 });
      E.noise(b, { t, dur: 0.9, vol: 0.2, type: 'bandpass', f: 400, f1: 3500, q: 1.4, swell: true, a: 0.1, rev: 0.5 });
    } };
    D.moon_impact = { len: 3, important: true, fn: (E, b, t) => {
      E.taiko(b, t, 1.1, 0.9);
      E.tone(b, { type: 'sine', f: 80, f1: 30, glide: 1, t, dur: 1.5, vol: 0.5, a: 0.002, d: 1.3, s: 0.01, r: 0.2 });
      E.noise(b, { t, dur: 1.5, vol: 0.25, type: 'bandpass', f: 3000, f1: 300, q: 0.9, rev: 0.8 });
      [76, 83, 88].forEach((m, i) => E.bell(b, t + 0.05 * i, m, 0.12, 2.5, 0.9, 0));
    } };
    D.madness = { len: 3, important: true, fn: (E, b, t) => {
      // 정신 교란: 어긋난 클러스터 + 느린 트레몰로
      for (const f of [220, 233, 311, 330, 466]) {
        E.tone(b, { type: 'sawtooth', f, detune: R(-30, 30), t, dur: 2.2, vol: 0.05, a: 0.5, d: 0.5, s: 0.7, r: 0.8, cut: 1800, cutTo: 500, vib: 60, vibRate: 7, rev: 0.7 });
      }
      E.noise(b, { t, dur: 2.2, vol: 0.12, type: 'bandpass', f: 1500, f1: 3500, q: 5, a: 0.3, rev: 0.7 });
    } };
    D.phase_flash = { len: 2, important: true, fn: (E, b, t) => {
      E.noise(b, { t, dur: 0.6, vol: 0.4, type: 'highpass', f: 2500, a: 0.001, rev: 0.7 });
      [81, 88, 93, 100].forEach((m, i) => E.bell(b, t + i * 0.03, m, 0.14, 2.2, 0.9, 0));
    } };

    // ───── 웃음소리 (키키킥) ─────
    const kiki = (E, b, t, o) => {
      // 'ㅣ' 모음: F1≈300, F2≈2500. 톱니파를 두 개의 밴드패스로 통과시켜 가볍게 깩깩대는 음색.
      const c = E.ctx;
      const osc = c.createOscillator(); osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(o.f, t);
      osc.frequency.linearRampToValueAtTime(o.f * (o.glide ?? 1.12), t + o.dur * 0.6);
      osc.frequency.linearRampToValueAtTime(o.f * (o.end ?? 0.95), t + o.dur);
      const bp1 = c.createBiquadFilter(); bp1.type = 'bandpass'; bp1.frequency.value = 320; bp1.Q.value = 6;
      const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 2600; bp2.Q.value = 8;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol, t + 0.008);
      g.gain.setValueAtTime(o.vol, t + o.dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(bp1); osc.connect(bp2); bp1.connect(g); bp2.connect(g);
      if (o.vib) {
        const l = c.createOscillator(); l.frequency.value = 38; const lg = c.createGain(); lg.gain.value = o.vib;
        l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + o.dur + 0.05);
      }
      E.send(g, b, 0.45, 0);
      osc.start(t); osc.stop(t + o.dur + 0.05);
      // 'ㅋ' 자음 클릭
      E.noise(b, { t, dur: 0.025, vol: o.vol * 0.9, type: 'highpass', f: 3500, a: 0.001 });
    };
    D.laugh = { len: 0.9, important: true, vol: 0.9, fn: (E, b, t, p) => {
      // 키·키·킥
      kiki(E, b, t, { f: 760 * p, dur: 0.075, vol: 0.5 });
      kiki(E, b, t + 0.11, { f: 820 * p, dur: 0.075, vol: 0.5 });
      kiki(E, b, t + 0.23, { f: 880 * p, dur: 0.13, vol: 0.55, end: 0.8 });
      E.noise(b, { t: t + 0.34, dur: 0.05, vol: 0.2, type: 'highpass', f: 4000 }); // 마지막 'ㄱ' 숨
    } };
    D.laugh_big = { len: 3.2, important: true, vol: 1, fn: (E, b, t, p) => {
      // 키키키키키키키킼! — 점점 빨라지며 음이 올라가고 마지막에 길게 찢어지는 소리
      let tt = t, gap = 0.12;
      for (let i = 0; i < 12; i++) {
        kiki(E, b, tt, { f: (700 + i * 38) * p, dur: 0.07, vol: 0.5 + i * 0.015, glide: 1.15 });
        tt += gap; gap = Math.max(0.066, gap * 0.93);
      }
      kiki(E, b, tt + 0.02, { f: 1250 * p, dur: 0.75, vol: 0.62, glide: 1.06, end: 0.78, vib: 70 });
      E.tone(b, { type: 'sawtooth', f: 330, f1: 360, t: tt, dur: 0.9, vol: 0.05, a: 0.05, d: 0.5, s: 0.4, r: 0.5, detune: 24, vib: 80, vibRate: 6, cut: 1500, rev: 0.8 });
    } };

    // ───── 결과 ─────
    D.victory = { len: 5, important: true, fn: (E, b, t) => {
      [[74, 0], [78, 0.15], [81, 0.3], [85, 0.45], [90, 0.6], [93, 0.8]].forEach(([m, d]) => E.bell(b, t + d, m, 0.14, 3, 0.9, 0));
      E.choir(b, t, [62, 66, 69, 74], 3.5, 0.06, { a: 0.4, r: 2 });
    } };
    D.defeat = { len: 4, important: true, fn: (E, b, t) => {
      [81, 77, 74, 69].forEach((m, i) => E.bell(b, t + i * 0.45, m - 12, 0.12, 3, 0.9, 0));
      E.tone(b, { type: 'sine', f: 110, f1: 40, glide: 2.5, t, dur: 2.8, vol: 0.3, a: 0.01, d: 2.5, s: 0.01, r: 0.3 });
    } };
    D.gauge = { cd: 80, len: 0.3, vol: 0.5, fn: (E, b, t, p) => {
      E.tone(b, { type: 'sine', f: 1000 * p, f1: 2000 * p, glide: 0.08, t, dur: 0.1, vol: 0.08, a: 0.002, d: 0.08, s: 0.01, r: 0.03 });
    } };

    return D;
  }
}
