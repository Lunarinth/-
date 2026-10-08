// WebAudio 합성 사운드: 효과음 + 절차 생성 BGM.
// 곡은 모두 이 게임용 오리지널이며, 시드와 코드 진행으로 멜로디를 생성합니다.
const Sound = (() => {
  let ac = null, master, bgmBus, sfxBus, noiseBuf, muted = false;
  let playing = null, timer = null, curName = '';

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10],
  };
  // bpm / root(MIDI) / scale / prog(8마디 코드 근음, 스케일 도수) / seed / lead 파형 / density / drums
  const TRACKS = {
    field1: { bpm: 96, root: 57, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 11, wave: 'triangle', density: 0.55, drums: 0 },
    field2: { bpm: 104, root: 55, scale: 'dorian', prog: [0, 3, 6, 4, 0, 3, 4, 0], seed: 23, wave: 'triangle', density: 0.6, drums: 1 },
    field3: { bpm: 88, root: 52, scale: 'phryg', prog: [0, 1, 0, 6, 0, 4, 1, 0], seed: 37, wave: 'sine', density: 0.5, drums: 0 },
    field4: { bpm: 112, root: 59, scale: 'harm', prog: [0, 5, 6, 4, 0, 3, 4, 0], seed: 41, wave: 'triangle', density: 0.6, drums: 1 },
    boss_meiling: { bpm: 150, root: 50, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 101, wave: 'square', density: 0.8, drums: 2 },
    boss_patchouli: { bpm: 132, root: 52, scale: 'phryg', prog: [0, 1, 4, 1, 0, 6, 4, 1], seed: 211, wave: 'sawtooth', density: 0.85, drums: 2 },
    boss_flandre: { bpm: 172, root: 54, scale: 'harm', prog: [0, 6, 5, 4, 0, 6, 4, 4], seed: 307, wave: 'square', density: 0.95, drums: 2 },
    boss_remilia: { bpm: 140, root: 49, scale: 'harm', prog: [0, 5, 3, 4, 0, 6, 4, 0], seed: 409, wave: 'sawtooth', density: 0.85, drums: 2 },
    boss_youmu: { bpm: 160, root: 55, scale: 'dorian', prog: [0, 3, 4, 6, 0, 3, 5, 4], seed: 503, wave: 'square', density: 0.9, drums: 2 },
    boss_yuyuko: { bpm: 118, root: 57, scale: 'dorian', prog: [0, 6, 3, 4, 0, 6, 5, 4], seed: 601, wave: 'triangle', density: 0.8, drums: 1 },
    boss_reisen: { bpm: 168, root: 54, scale: 'phryg', prog: [0, 1, 0, 6, 4, 1, 0, 6], seed: 701, wave: 'sawtooth', density: 0.95, drums: 2 },
    boss_kaguya: { bpm: 152, root: 47, scale: 'harm', prog: [0, 5, 6, 4, 3, 5, 6, 4], seed: 809, wave: 'sawtooth', density: 1, drums: 2 },
    ending: { bpm: 66, root: 50, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 3, 0], seed: 907, wave: 'sine', density: 0.4, drums: 0 },
  };

  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ac = null; return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ac.destination);
    bgmBus = ac.createGain(); bgmBus.gain.value = 0.32; bgmBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (curName) { const n = curName; curName = ''; bgm(n); }
  }

  function tone(freq, t, dur, type, vol, bus, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, bus, hp, lp) {
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || lp || 2000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }

  // ---------- 효과음 ----------
  const SFX = {
    knife: t => { tone(1200, t, 0.07, 'square', 0.12, sfxBus, 500); },
    lob: t => { tone(500, t, 0.1, 'square', 0.12, sfxBus, 900); },
    jump: t => { tone(260, t, 0.11, 'square', 0.14, sfxBus, 620); },
    jump2: t => { tone(420, t, 0.12, 'triangle', 0.18, sfxBus, 900); },
    dash: t => { noise(t, 0.16, 0.25, sfxBus, 1500); },
    hit: t => { noise(t, 0.05, 0.25, sfxBus, 2500); tone(220, t, 0.06, 'square', 0.12, sfxBus, 110); },
    bosshit: t => { noise(t, 0.05, 0.2, sfxBus, 1200); tone(150, t, 0.07, 'square', 0.14, sfxBus, 90); },
    kill: t => { [660, 520, 390, 260].forEach((f, i) => tone(f, t + i * 0.05, 0.08, 'square', 0.14, sfxBus)); },
    hurt: t => { tone(320, t, 0.28, 'sawtooth', 0.22, sfxBus, 70); noise(t, 0.12, 0.2, sfxBus, 0, 1200); },
    field: t => { tone(180, t, 0.5, 'sine', 0.25, sfxBus, 720); tone(720, t + 0.3, 0.45, 'sine', 0.18, sfxBus, 160); },
    save: t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'sine', 0.2, sfxBus)); },
    item: t => { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, t + i * 0.06, 0.18, 'triangle', 0.2, sfxBus)); },
    door: t => { tone(330, t, 0.1, 'triangle', 0.15, sfxBus); tone(494, t + 0.08, 0.14, 'triangle', 0.15, sfxBus); },
    tick: t => { tone(880, t, 0.03, 'square', 0.07, sfxBus); },
    spell: t => { tone(120, t, 0.7, 'sawtooth', 0.22, sfxBus, 900); noise(t, 0.6, 0.18, sfxBus, 800); tone(1200, t + 0.35, 0.4, 'sine', 0.15, sfxBus); },
    win: t => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.3, 'square', 0.15, sfxBus)); },
    bomb: t => { noise(t, 0.4, 0.3, sfxBus, 0, 600); },
  };
  function sfx(name) {
    if (!ac || muted || !SFX[name]) return;
    SFX[name](ac.currentTime + 0.001);
  }

  // ---------- BGM ----------
  function build(tr) {
    const R = rng(tr.seed), sc = SCALES[tr.scale];
    const deg = d => { const o = Math.floor(d / 7); return tr.root + sc[((d % 7) + 7) % 7] + 12 * o; };
    // 2마디(32스텝) 모티프: 도수 랜덤워크, 박 머리는 코드톤 쪽으로
    const motif = [];
    let d = 7;
    for (let s = 0; s < 32; s++) {
      const on = (s % 4 === 0) || R() < tr.density * (s % 2 ? 0.45 : 0.8);
      if (!on) { motif.push(null); continue; }
      d += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(R() * 8)];
      d = Math.max(4, Math.min(14, d));
      motif.push(d);
    }
    const ev = [];
    for (let s = 0; s < 128; s++) {
      const bar = Math.floor(s / 16), chord = tr.prog[bar % 8], st16 = s % 16;
      const m = motif[s % 32];
      const variant = (Math.floor(s / 32) % 2) && (s % 8 === 6);
      if (m !== null) {
        let dd = m + (variant ? 2 : 0);
        if (st16 % 4 === 0) dd = chord + 7 + [0, 2, 4][((dd % 3) + 3) % 3];   // 박 머리는 3화음 구성음
        ev.push({ s, midi: deg(dd), len: 2, wave: tr.wave, vol: 0.2 });
      }
      if (st16 % 2 === 0) ev.push({ s, midi: deg(chord) - 12, len: 1.6, wave: 'sawtooth', vol: 0.16 });   // 베이스 8분
      if (st16 === 0) for (const k of [0, 2, 4]) ev.push({ s, midi: deg(chord + k) , len: 14, wave: 'triangle', vol: 0.06 });   // 패드
      if (tr.drums) {
        if (st16 === 0 || st16 === 8) ev.push({ s, drum: 'kick' });
        if (st16 === 4 || st16 === 12) ev.push({ s, drum: 'snare' });
        if (tr.drums === 2 ? st16 % 2 === 0 : st16 % 4 === 2) ev.push({ s, drum: 'hat' });
      }
    }
    return ev;
  }

  function playEv(e, t, stepDur, bus) {
    if (e.drum === 'kick') tone(150, t, 0.12, 'sine', 0.5, bus, 45);
    else if (e.drum === 'snare') noise(t, 0.12, 0.28, bus, 1800);
    else if (e.drum === 'hat') noise(t, 0.04, 0.1, bus, 6000);
    else tone(mtof(e.midi), t, e.len * stepDur, e.wave, e.vol, bus);
  }

  function bgm(name) {
    if (name === curName) return;
    curName = name;
    if (!ac) return;
    if (playing) { const p = playing; p.g.gain.cancelScheduledValues(ac.currentTime); p.g.gain.setTargetAtTime(0, ac.currentTime, 0.12); clearInterval(timer); setTimeout(() => p.g.disconnect(), 600); playing = null; }
    const tr = TRACKS[name]; if (!tr) return;
    const g = ac.createGain(); g.gain.value = 1; g.connect(bgmBus);
    const stepDur = 60 / tr.bpm / 4, events = build(tr);
    const bySt = Array.from({ length: 128 }, () => []); events.forEach(e => bySt[e.s].push(e));
    const p = { g, step: 0, next: ac.currentTime + 0.1 }; playing = p;
    timer = setInterval(() => {
      if (playing !== p) return;
      while (p.next < ac.currentTime + 0.25) {
        for (const e of bySt[p.step % 128]) playEv(e, p.next, stepDur, g);
        p.next += stepDur; p.step++;
      }
    }, 40);
  }

  function toggle() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.7;
    return muted;
  }

  return { init, sfx, bgm, toggle, get muted() { return muted; }, tracks: TRACKS };
})();
