// WebAudio 합성 사운드: 효과음 + 다악기 편곡 BGM.
// 곡은 전부 이 게임용 오리지널입니다. 시드·코드 진행·악기 편성으로 32마디 곡을 생성합니다.
const Sound = (() => {
  let ac = null, master, comp, bgmBus, sfxBus, revIn, delIn, noiseBuf, distCurve, muted = false;
  let playing = null, timer = null, curName = '';

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10],
  };

  // 악기 명세: layers(파형 겹침) + ADSR + 로우패스 (+ 비브라토/디스토션/딜레이 전송)
  const SPEC = {
    piano: { L: [['triangle', 1, 0, 1], ['sine', 2, 0, 0.35], ['sine', 3, 0, 0.12]], a: 0.004, d: 0.9, s: 0, r: 0.25, lp: 3400 },
    harp: { L: [['triangle', 1, 0, 1], ['sine', 3, 0, 0.2]], a: 0.003, d: 0.6, s: 0, r: 0.2, lp: 4800 },
    pluck: { L: [['sawtooth', 1, 0, 1]], a: 0.002, d: 0.22, s: 0, r: 0.08, lp: 2600 },
    strings: { L: [['sawtooth', 1, -9, 0.5], ['sawtooth', 1, 9, 0.5], ['sawtooth', 2, 0, 0.12]], a: 0.2, d: 0.2, s: 0.8, r: 0.4, lp: 1800, vib: [4.5, 4, 0.4] },
    flute: { L: [['sine', 1, 0, 1], ['sine', 2, 0, 0.2], ['triangle', 3, 0, 0.05]], a: 0.06, d: 0.1, s: 0.85, r: 0.14, lp: 5200, vib: [5.2, 8, 0.18], send: 0.3 },
    bell: { L: [['sine', 1, 0, 1], ['sine', 2.76, 0, 0.4], ['sine', 5.4, 0, 0.15]], a: 0.002, d: 1.3, s: 0, r: 0.5, lp: 9000, send: 0.35 },
    organ: { L: [['sine', 1, 0, 1], ['sine', 2, 0, 0.6], ['sine', 3, 0, 0.35], ['sine', 4, 0, 0.15]], a: 0.02, d: 0.05, s: 0.9, r: 0.1, lp: 4200 },
    lead: { L: [['square', 1, -6, 0.5], ['square', 1, 6, 0.5]], a: 0.012, d: 0.1, s: 0.7, r: 0.1, lp: 3800, vib: [5.5, 5, 0.25], send: 0.3 },
    saw: { L: [['sawtooth', 1, -9, 0.5], ['sawtooth', 1, 9, 0.5]], a: 0.01, d: 0.15, s: 0.6, r: 0.1, lp: 3200, vib: [5.5, 6, 0.2], send: 0.25 },
    brass: { L: [['sawtooth', 1, -5, 0.5], ['sawtooth', 1, 5, 0.5], ['square', 0.5, 0, 0.2]], a: 0.04, d: 0.12, s: 0.75, r: 0.12, lp: 2600 },
    guitar: { L: [['sawtooth', 1, 0, 1], ['square', 1, 5, 0.4]], a: 0.003, d: 0.28, s: 0.35, r: 0.08, lp: 3400, dist: true },
    bass: { L: [['sawtooth', 1, 0, 0.7], ['sine', 0.5, 0, 0.9]], a: 0.005, d: 0.12, s: 0.5, r: 0.06, lp: 720 },
  };

  const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  // 곡 정의: form(구성) / progs(코드 진행, 도수 8마디) / inst(편성) / energy(구간별 타악 강도)
  // 코드 진행 모음 (스케일 도수, 0=으뜸화음)
  const P = {
    a: [0, 5, 3, 4, 0, 5, 6, 4], b: [0, 5, 6, 4, 0, 3, 4, 0], c: [0, 6, 5, 4, 0, 6, 4, 4],
    d: [0, 3, 6, 4, 0, 3, 4, 4], e: [0, 1, 0, 6, 0, 4, 1, 0], f: [5, 3, 0, 4, 5, 3, 4, 4],
  };
  const TRACKS = {
    field1: { bpm: 92, root: 57, scale: 'minor', seed: 11, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.a, B: P.b, C: P.f },
      inst: { lead: 'flute', lead2: 'strings', arp: 'piano', pad: 'strings', spark: 'bell' }, energy: { A: 0, B: 1, C: 0 } },
    field2: { bpm: 100, root: 50, scale: 'dorian', seed: 23, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.d, B: P.b, C: P.f },
      inst: { lead: 'flute', lead2: 'strings', arp: 'harp', pad: 'strings', spark: 'bell' }, energy: { A: 0, B: 1, C: 0 } },
    field3: { bpm: 84, root: 52, scale: 'phryg', seed: 37, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.e, B: P.e, C: P.f },
      inst: { lead: 'bell', lead2: 'organ', arp: 'pluck', pad: 'organ', spark: 'bell' }, energy: { A: 0, B: 1, C: 0 } },
    field4: { bpm: 108, root: 59, scale: 'harm', seed: 41, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.a, B: P.c, C: P.f },
      inst: { lead: 'piano', lead2: 'strings', arp: 'harp', pad: 'strings', spark: 'bell', hit: 'brass' }, energy: { A: 0, B: 2, C: 0 } },
    boss_meiling: { bpm: 150, root: 50, scale: 'minor', seed: 101, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.b, B: P.c, C: P.f },
      inst: { lead: 'lead', lead2: 'guitar', arp: 'piano', pad: 'strings', hit: 'brass', gtr: true }, energy: { A: 2, B: 3, C: 1 } },
    boss_patchouli: { bpm: 132, root: 52, scale: 'phryg', seed: 211, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.e, B: P.c, C: P.f },
      inst: { lead: 'saw', lead2: 'organ', arp: 'pluck', pad: 'organ', hit: 'brass', gtr: true }, energy: { A: 2, B: 3, C: 1 } },
    boss_flandre: { bpm: 172, root: 54, scale: 'harm', seed: 307, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.c, B: P.a, C: P.e },
      inst: { lead: 'lead', lead2: 'guitar', arp: 'pluck', pad: 'strings', hit: 'brass', gtr: true }, energy: { A: 3, B: 3, C: 2 } },
    boss_remilia: { bpm: 140, root: 49, scale: 'harm', seed: 409, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.a, B: P.c, C: P.f },
      inst: { lead: 'saw', lead2: 'strings', arp: 'piano', pad: 'strings', hit: 'brass', gtr: true }, energy: { A: 2, B: 3, C: 1 } },
    boss_youmu: { bpm: 160, root: 55, scale: 'dorian', seed: 503, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.d, B: P.b, C: P.e },
      inst: { lead: 'lead', lead2: 'guitar', arp: 'harp', pad: 'strings', hit: 'brass', gtr: true }, energy: { A: 3, B: 3, C: 2 } },
    boss_yuyuko: { bpm: 118, root: 57, scale: 'dorian', seed: 601, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.d, B: P.f, C: P.b },
      inst: { lead: 'flute', lead2: 'strings', arp: 'harp', pad: 'strings', spark: 'bell', hit: 'brass' }, energy: { A: 1, B: 2, C: 0 } },
    boss_reisen: { bpm: 168, root: 54, scale: 'phryg', seed: 701, mod: 2, form: ['I', 'A', 'A', 'B', 'C', 'A2'], progs: { A: P.e, B: P.c, C: P.e },
      inst: { lead: 'saw', lead2: 'guitar', arp: 'pluck', pad: 'strings', hit: 'brass', gtr: true }, energy: { A: 3, B: 3, C: 2 } },
    boss_kaguya: { bpm: 152, root: 47, scale: 'harm', seed: 809, mod: 2, form: ['I', 'A', 'B', 'A', 'C', 'B', 'A2'], progs: { A: P.c, B: P.a, C: P.f },
      inst: { lead: 'saw', lead2: 'guitar', arp: 'piano', pad: 'strings', spark: 'bell', hit: 'brass', gtr: true }, energy: { A: 3, B: 3, C: 1 } },
    ending: { bpm: 64, root: 50, scale: 'minor', seed: 907, form: ['I', 'A', 'C'], progs: { A: P.a, C: P.f },
      inst: { lead: 'piano', lead2: 'strings', arp: 'harp', pad: 'strings', spark: 'bell' }, energy: { A: 0, C: 0 } },
  };

  // ---------- 초기화 ----------
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return; }
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; comp.connect(master); master.connect(ac.destination);
    bgmBus = ac.createGain(); bgmBus.gain.value = 0.34; bgmBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 리버브 (생성한 임펄스 응답)
    const len = Math.floor(ac.sampleRate * 2.2), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const conv = ac.createConvolver(); conv.buffer = ir;
    revIn = ac.createGain(); revIn.gain.value = 0.3; revIn.connect(conv);
    const rw = ac.createGain(); rw.gain.value = 0.55; conv.connect(rw); rw.connect(comp);
    // 딜레이 (리드용)
    delIn = ac.createGain(); delIn.gain.value = 1;
    const dl = ac.createDelay(1); dl.delayTime.value = 0.3; const fb = ac.createGain(); fb.gain.value = 0.32;
    const df = ac.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 2400;
    delIn.connect(dl); dl.connect(df); df.connect(fb); fb.connect(dl); df.connect(comp); df.connect(revIn);
    distCurve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 5); }
    if (curName) { const n = curName; curName = ''; bgm(n); }
  }

  // ---------- 악기 ----------
  function note(inst, midi, t, dur, vol, bus) {
    const sp = SPEC[inst], f = mtof(midi);
    const env = ac.createGain();
    const end = t + dur;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(vol, t + sp.a);
    if (sp.s > 0) {
      env.gain.linearRampToValueAtTime(vol * sp.s, t + sp.a + sp.d);
      env.gain.setValueAtTime(vol * sp.s, Math.max(t + sp.a + sp.d, end));
      env.gain.linearRampToValueAtTime(0.0001, end + sp.r);
    } else {
      env.gain.exponentialRampToValueAtTime(0.0001, t + sp.a + Math.max(sp.d, 0.05) * (dur > 0.4 ? 1.4 : 1));
    }
    const stop = (sp.s > 0 ? end + sp.r : t + sp.a + sp.d * 1.5 + 0.2) + 0.05;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = sp.lp; lp.Q.value = 0.7;
    let chain = lp;
    if (sp.dist) { const ws = ac.createWaveShaper(); ws.curve = distCurve; lp.connect(ws); const lp2 = ac.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 3600; ws.connect(lp2); chain = lp2; }
    chain.connect(env); env.connect(bus);
    if (sp.send && delIn) { const sg = ac.createGain(); sg.gain.value = sp.send * 0.5; env.connect(sg); sg.connect(delIn); }
    if (revIn) { const rg = ac.createGain(); rg.gain.value = inst === 'strings' || inst === 'organ' ? 0.5 : 0.35; env.connect(rg); rg.connect(revIn); }
    let lfo = null, lfoGain = null;
    if (sp.vib) { lfo = ac.createOscillator(); lfoGain = ac.createGain(); lfo.frequency.value = sp.vib[0]; lfoGain.gain.setValueAtTime(0, t); lfoGain.gain.linearRampToValueAtTime(sp.vib[1], t + sp.vib[2] + 0.2); lfo.connect(lfoGain); lfo.start(t); lfo.stop(stop); }
    const gsum = sp.L.reduce((a, l) => a + l[3], 0);
    for (const [type, mult, det, g] of sp.L) {
      const o = ac.createOscillator(); o.type = type; o.frequency.value = f * mult; o.detune.value = det;
      if (lfoGain) lfoGain.connect(o.detune);
      const og = ac.createGain(); og.gain.value = g / gsum * 1.4;
      o.connect(og); og.connect(lp); o.start(t); o.stop(stop);
    }
  }
  function noiseHit(t, dur, vol, bus, type, freq, q) {
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  function tone(freq, t, dur, type, vol, bus, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(kind, t, bus) {
    if (kind === 'kick') { tone(160, t, 0.16, 'sine', 0.75, bus, 42); noiseHit(t, 0.02, 0.2, bus, 'highpass', 3000); }
    else if (kind === 'snare') { noiseHit(t, 0.16, 0.34, bus, 'bandpass', 2200, 0.8); tone(210, t, 0.08, 'triangle', 0.3, bus, 140); }
    else if (kind === 'hat') noiseHit(t, 0.035, 0.12, bus, 'highpass', 7500);
    else if (kind === 'ohat') noiseHit(t, 0.18, 0.12, bus, 'highpass', 6500);
    else if (kind === 'tom') tone(190, t, 0.2, 'sine', 0.5, bus, 90);
    else if (kind === 'crash') noiseHit(t, 1.1, 0.2, bus, 'highpass', 4500);
  }

  // ---------- 작곡 ----------
  // ZUN 곡의 문법을 따른 오리지널 작곡: 2마디 모티프의 시퀀스 전개, 박 머리의 코드톤, 장식음(앗치아카투라),
  // 마디 끝 16분음표 런, 옥타브로 튀는 8분 베이스, 4마디마다 드럼 필인, 마지막 바퀴 전조.
  function compose(tr) {
    const R = rng(tr.seed), sc = SCALES[tr.scale], I = tr.inst, ev = [];
    const deg = (d, sh = 0) => tr.root + sh + sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const nearest = (target, chord) => { let best = target, bd = 99; for (let k = -2; k <= 2; k++) for (const c of [0, 2, 4]) { const d = chord + c + 7 * k; if (Math.abs(d - target) < bd) { bd = Math.abs(d - target); best = d; } } return best; };
    const cells = [
      [0, 3, 6, 8, 10, 12, 14, 16, 19, 22, 24, 26, 28, 30], [0, 2, 4, 6, 8, 12, 14, 16, 18, 20, 22, 24, 28],
      [0, 4, 6, 8, 11, 14, 16, 20, 22, 24, 27, 30], [0, 3, 6, 10, 12, 14, 16, 19, 22, 26, 28, 30],
      [0, 2, 3, 6, 8, 10, 12, 14, 16, 18, 19, 22, 24, 26, 28, 30],
    ];
    const moves = [-3, -2, -1, -1, 0, 1, 1, 2, 3];
    const info = {};
    let step = 0; const mod = tr.mod ?? 0;
    for (const name of tr.form) {
      const letter = name[0], intro = name === 'I', bars = intro ? 2 : 8;
      const progKey = intro ? 'A' : letter, prog = tr.progs[progKey], e = tr.energy[progKey] ?? 0;
      const sh = name === 'A2' ? mod : 0;
      if (!info[letter]) info[letter] = { hi: letter === 'B' ? 5 : letter === 'C' ? 2 : 0, cell: cells[Math.floor(R() * cells.length)], mv: Array.from({ length: 16 }, () => moves[Math.floor(R() * moves.length)]) };
      const sec = info[letter], rep = tr.form.slice(0, tr.form.indexOf(name)).filter(n => n[0] === letter).length;
      let cur = 7 + sec.hi + 2;
      const E = intro ? 0 : (letter === 'C' ? Math.min(e, 1) : e);
      for (let bar = 0; bar < bars; bar++) {
        const base = step + bar * 16, ch = prog[bar % 8], nx = prog[(bar + 1) % 8], last = bar === bars - 1, phraseEnd = bar % 4 === 3;
        const root = deg(ch, sh), third = deg(ch + 2, sh), fifth = deg(ch + 4, sh), seventh = deg(ch + 6, sh);
        // 패드
        if (I.pad) for (const m of [root, third, fifth]) ev.push({ s: base, inst: I.pad, midi: m, len: 15, vol: E >= 2 ? 0.09 : 0.115 });
        // 베이스
        if (!intro) {
          if (E === 0) { ev.push({ s: base, inst: 'bass', midi: root - 12, len: 14, vol: 0.2 }); ev.push({ s: base + 8, inst: 'bass', midi: fifth - 12, len: 6, vol: 0.14 }); }
          else {
            const gallop = E >= 3, pat = gallop ? [0, 0, 12, 0, 7, 0, 12, 0] : [0, 12, 0, 7, 0, 12, 0, 5];
            for (let k = 0; k < 16; k += gallop ? 2 : 2) ev.push({ s: base + k, inst: 'bass', midi: root - 12 + pat[(k / 2) % 8], len: gallop ? 1.6 : 1.8, vol: 0.19 });
          }
        }
        // 아르페지오/피아노
        if (I.arp) {
          const tones = [root, third, fifth, seventh, root + 12, third + 12];
          const pat = intro || E === 0 ? [0, 1, 2, 4, 2, 1, 2, 1] : [0, 2, 1, 3, 2, 4, 3, 5];
          for (let k = 0; k < 16; k += 2) ev.push({ s: base + k, inst: I.arp, midi: tones[pat[(k / 2) % 8]] + 12, len: 2, vol: E >= 2 ? 0.1 : 0.13 });
        }
        if (intro) { if (last) for (let k = 0; k < 16; k += 2) ev.push({ s: base + k, drum: k < 8 ? 'snare' : 'snare' }); step; }
        // 리드: 모티프를 시퀀스로 전개 (마디마다 도수를 옮김)
        if (!intro) {
          const seq = [0, -1, 1, -2][bar % 4] + (rep > 0 && bar >= 4 ? 1 : 0);
          const onsets = sec.cell.filter(s => s >= (bar % 2) * 16 && s < (bar % 2) * 16 + 16).map(s => s - (bar % 2) * 16);
          const lead = letter === 'C' ? (I.spark ? I.lead : I.arp || I.lead) : I.lead;
          onsets.forEach((o, i) => {
            if (letter === 'C' && i % 2) return;
            cur += sec.mv[(i + bar * 3) % 16] + (i === 0 ? seq : 0);
            cur = Math.max(5 + sec.hi, Math.min(15 + sec.hi, cur));
            if (o % 8 === 0) cur = nearest(cur, ch);
            const nextS = i + 1 < onsets.length ? onsets[i + 1] : 16, len = Math.min(8, nextS - o);
            // 마디 끝: 다음 코드로 연결하는 16분 런
            if (phraseEnd && o >= 12 && !last) return;
            ev.push({ s: base + o, inst: lead, midi: deg(cur, sh), len: len * 0.95, vol: 0.2 });
            if (R() < 0.28 && o % 4 === 0) ev.push({ s: base + o - 1, inst: lead, midi: deg(cur + 1, sh), len: 1, vol: 0.09 });        // 장식음
            if (rep >= 1 && I.lead2 && letter !== 'C') ev.push({ s: base + o, inst: I.lead2, midi: deg(cur - 2, sh) - (I.lead2 === 'guitar' ? 12 : 0), len: len * 0.95, vol: I.lead2 === 'guitar' ? 0.11 : 0.1 });
            if (letter === 'B' && I.gtr) ev.push({ s: base + o, inst: 'guitar', midi: deg(cur, sh) - 12, len: len * 0.9, vol: 0.09 });
          });
          // 런: 마디 끝 3~4박을 16분음표로 하행/상행
          if (phraseEnd) {
            const up = last && R() < 0.5, from = cur + (up ? -3 : 4), n = last ? 8 : 4, start = last ? 8 : 12;
            for (let k = 0; k < n; k++) { const d = up ? from + k : from - k; ev.push({ s: base + start + k * (last ? 1 : 1), inst: lead, midi: deg(k === n - 1 ? nearest(d, nx) : d, sh), len: 1.1, vol: 0.17 }); }
            cur = nearest(cur, nx);
          }
        }
        // 벨 스파클
        if (I.spark && bar % 2 === 0) ev.push({ s: base, inst: I.spark, midi: deg(ch + 14 + 2, sh), len: 8, vol: 0.085 });
        // 기타 팜뮤트
        if (I.gtr && E >= 2 && !intro) for (let k = 0; k < 16; k += 2) { if (E === 2 && k % 4) continue; ev.push({ s: base + k, inst: 'guitar', midi: root - 12, len: 1.4, vol: 0.12 }); ev.push({ s: base + k, inst: 'guitar', midi: fifth - 12, len: 1.4, vol: 0.1 }); }
        // 브라스 히트
        if (I.hit && E >= 2 && !intro && (bar === 0 || bar === 4)) for (const m of [root, third, fifth]) ev.push({ s: base, inst: I.hit, midi: m, len: 3, vol: 0.1 });
        if (I.hit && E >= 3 && !intro && bar % 4 === 2) for (const m of [root, fifth]) ev.push({ s: base + 6, inst: I.hit, midi: m, len: 2, vol: 0.09 });
        // 드럼
        if (E >= 1) {
          for (let k = 0; k < 16; k++) {
            if (E === 1) { if (k === 0 || k === 10) ev.push({ s: base + k, drum: 'kick' }); if (k === 8) ev.push({ s: base + k, drum: 'snare' }); if (k % 4 === 2) ev.push({ s: base + k, drum: 'hat' }); }
            else {
              if (k === 0 || k === 8 || (E === 3 && (k === 6 || k === 14 || k === 3))) ev.push({ s: base + k, drum: 'kick' });
              if (k === 4 || k === 12) ev.push({ s: base + k, drum: 'snare' });
              if (k % 2 === 0) ev.push({ s: base + k, drum: k === 14 ? 'ohat' : 'hat' });
              if (E === 3 && k % 2 === 1 && k > 8) ev.push({ s: base + k, drum: 'hat' });
            }
          }
          if (phraseEnd) for (let k = 12; k < 16; k++) ev.push({ s: base + k, drum: k % 2 ? 'snare' : 'tom' });
          if (bar === 0 && E >= 2) ev.push({ s: base, drum: 'crash' });
        }
        if (letter === 'C' && last) for (let k = 0; k < 16; k += k < 8 ? 2 : 1) ev.push({ s: base + k, drum: 'snare' });   // 브리지 끝 스네어 롤
      }
      step += bars * 16;
    }
    return { ev, steps: step };
  }

  function playEv(e, t, stepDur, bus) {
    if (e.drum) { drum(e.drum, t, bus); return; }
    note(e.inst, e.midi, t, Math.max(0.06, e.len * stepDur), e.vol, bus);
  }

  // ---------- 효과음 ----------
  const SFX = {
    knife: t => { tone(1200, t, 0.07, 'square', 0.12, sfxBus, 500); },
    lob: t => { tone(500, t, 0.1, 'square', 0.12, sfxBus, 900); },
    jump: t => { tone(260, t, 0.11, 'square', 0.14, sfxBus, 620); },
    jump2: t => { tone(420, t, 0.12, 'triangle', 0.18, sfxBus, 900); },
    dash: t => { noiseHit(t, 0.16, 0.25, sfxBus, 'highpass', 1500); },
    hit: t => { noiseHit(t, 0.05, 0.25, sfxBus, 'highpass', 2500); tone(220, t, 0.06, 'square', 0.12, sfxBus, 110); },
    bosshit: t => { noiseHit(t, 0.05, 0.2, sfxBus, 'highpass', 1200); tone(150, t, 0.07, 'square', 0.14, sfxBus, 90); },
    kill: t => { [660, 520, 390, 260].forEach((f, i) => tone(f, t + i * 0.05, 0.08, 'square', 0.14, sfxBus)); },
    hurt: t => { tone(320, t, 0.28, 'sawtooth', 0.22, sfxBus, 70); noiseHit(t, 0.12, 0.2, sfxBus, 'lowpass', 1200); },
    field: t => { tone(180, t, 0.5, 'sine', 0.25, sfxBus, 720); tone(720, t + 0.3, 0.45, 'sine', 0.18, sfxBus, 160); },
    save: t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'sine', 0.2, sfxBus)); },
    item: t => { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, t + i * 0.06, 0.18, 'triangle', 0.2, sfxBus)); },
    door: t => { tone(330, t, 0.1, 'triangle', 0.15, sfxBus); tone(494, t + 0.08, 0.14, 'triangle', 0.15, sfxBus); },
    tick: t => { tone(880, t, 0.03, 'square', 0.07, sfxBus); },
    spell: t => { tone(120, t, 0.7, 'sawtooth', 0.22, sfxBus, 900); noiseHit(t, 0.6, 0.18, sfxBus, 'highpass', 800); tone(1200, t + 0.35, 0.4, 'sine', 0.15, sfxBus); },
    win: t => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.3, 'square', 0.15, sfxBus)); },
  };
  function sfx(name) {
    if (!ac || muted || !SFX[name]) return;
    SFX[name](ac.currentTime + 0.001);
  }

  // ---------- 재생 ----------
  function bgm(name) {
    if (name === curName) return;
    curName = name;
    if (!ac) return;
    if (playing) {
      const p = playing; p.g.gain.cancelScheduledValues(ac.currentTime); p.g.gain.setTargetAtTime(0, ac.currentTime, 0.15);
      clearInterval(timer); setTimeout(() => p.g.disconnect(), 800); playing = null;
    }
    const tr = TRACKS[name]; if (!tr) return;
    const g = ac.createGain(); g.gain.value = 1; g.connect(bgmBus);
    const stepDur = 60 / tr.bpm / 4, song = compose(tr);
    const bySt = Array.from({ length: song.steps }, () => []);
    for (const e of song.ev) { const s = Math.round(e.s); if (s < song.steps) bySt[s].push(e); }
    const p = { g, step: 0, next: ac.currentTime + 0.12 }; playing = p;
    timer = setInterval(() => {
      if (playing !== p) return;
      while (p.next < ac.currentTime + 0.3) {
        for (const e of bySt[p.step % song.steps]) playEv(e, p.next, stepDur, g);
        p.next += stepDur; p.step++;
      }
    }, 40);
  }

  function toggle() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.8;
    return muted;
  }

  return { init, sfx, bgm, toggle, get muted() { return muted; }, tracks: TRACKS, compose };
})();
