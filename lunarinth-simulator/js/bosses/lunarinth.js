// STAGE 6 (FINAL) — 루나린스: 삼위(三位)의 달을 다스리는 저택의 주인. 6면 보스급.
// 12단계: 통상 · 스킬 · 통상 · 스킬 · 스킬 · 스킬 · 라스트, 그리고 격파된 척한 뒤의 진짜 발악 「얼티메이트 스킬」 5식.
// 얼티메이트 스킬: 잔기/컨티뉴/궁극기가 전부 봉인되고, 한 번이라도 맞으면 즉사한다. 버티거나 죽으면 다음 식으로 넘어간다 (15 · 20 · 25 · 35 · 40초).
// 삼위일체 형태 순서(LUMINA → UMBRA → LUNA)와 모든 기술명·패턴은 이 게임의 창작 제안이다 (공식 설정이 아님).
// 기본적으로 궁극기에 저항(피해 33%)하며, 라스트 스킬은 궁극기에 완전 면역이다.
import * as THREE from '../../vendor/three.module.min.js';
import { Boss, TAU, rnd, clamp, shuffle } from '../boss.js';

export const PAL = {
  lumina: { a: 0xe3d6ff, b: 0xfff1c9, c: 0xffffff, glow: 0xd9c8ff },
  umbra: { a: 0xa07bff, b: 0x6a3fd8, c: 0xe4d6ff, glow: 0x7a4bd8 },
  luna: { a: 0xff7ac8, b: 0xffe9a6, c: 0xffffff, glow: 0xff7ac8 },
};
const FORM_IDX = { lumina: 0, umbra: 1, luna: 2 };

export const LUNARINTH = {
  id: 'lunarinth', name: '루나린스', en: 'LUNARINTH', epithet: '삼위의 달을 다스리는 저택의 주인',
  h: 6.6, hitR: 1.9, barkKey: null, pal: PAL.lumina, hpMul: 1,
  theme: 'lumina', music: 'lumina', orbit: true,
  forms: {
    lumina: { label: 'LUMINA', sub: '초승달 · 빛 · 우아함', tint: [1, 1, 1], pal: PAL.lumina, theme: 'lumina', music: 'lumina' },
    umbra: { label: 'UMBRA', sub: '그믐달 · 어둠 · 음침함', tint: [0.78, 0.72, 1.0], pal: PAL.umbra, theme: 'umbra', music: 'umbra' },
    luna: { label: 'LUNA', sub: '보름달 · 광기 · 달 그 자체', tint: [1.08, 0.95, 1.1], pal: PAL.luna, theme: 'luna', music: 'luna' },
    ult: { label: 'ULTIMATE', sub: '진짜 발악 — 한 번이라도 맞으면 끝', tint: [1.1, 1.0, 1.15], pal: PAL.luna, theme: 'void', music: 'ultimate' },
  },
  steps: [
    { kind: 'nonspell', name: '초승달 부채', form: 'lumina', hp: 1100, time: 42, attacks: ['crescentFan', 'rapierThrust', 'moonwheel'], idle: 1.2, ultMode: 'resist' },
    { kind: 'spell', tag: '월광', name: '월광우', form: 'lumina', hp: 1400, time: 55, attacks: ['spMoonlight'], idle: 0.8, ultMode: 'resist' },
    { kind: 'nonspell', name: '그림자 구슬', form: 'umbra', hp: 1200, time: 44, attacks: ['shadowOrbs', 'backOfMoon'], idle: 1.1, ultMode: 'resist', pre: 'p1to2', transform: true },
    { kind: 'spell', tag: '환영', name: '거짓된 달', form: 'umbra', hp: 1250, time: 62, attacks: ['spFalseMoon'], idle: 0.8, ultMode: 'resist' },
    { kind: 'spell', tag: '월식', name: '월식의 장막', form: 'umbra', hp: 1600, time: 60, attacks: ['spEclipse'], idle: 0.8, ultMode: 'resist' },
    { kind: 'spell', tag: '낙월', name: '달 투척', form: 'luna', hp: 1700, time: 62, attacks: ['spFall'], idle: 0.7, ultMode: 'resist', pre: 'p2to3', transform: true },
    { kind: 'last', tag: '삼위일체', name: '트리니티 이클립스', form: 'luna', hp: 3000, time: 85, attacks: ['spTrinity'], idle: 0.7, ultMode: 'immune', pre: 'lastCard', spd: 1.04 },
    // ── 얼티메이트 스킬 (진짜 발악) ──
    { kind: 'ultimate', tag: '제1식 신월', name: '무광의 천구', form: 'ult', hp: 1, time: 15, attacks: ['ult1'], ultMode: 'immune', theme: 'void', pal: PAL.umbra, tint: [0.8, 0.74, 1.0], intensity: 0 },
    { kind: 'ultimate', tag: '제2식 초승', name: '은월의 검무', form: 'ult', hp: 1, time: 20, attacks: ['ult2'], ultMode: 'immune', theme: 'lumina', pal: PAL.lumina, tint: [1, 1, 1], intensity: 0.25 },
    { kind: 'ultimate', tag: '제3식 상현', name: '월광의 왕관', form: 'ult', hp: 1, time: 25, attacks: ['ult3'], ultMode: 'immune', theme: 'lumina', pal: PAL.lumina, tint: [1.05, 1.02, 1.0], intensity: 0.5 },
    { kind: 'ultimate', tag: '제4식 만월', name: '광기의 세계', form: 'ult', hp: 1, time: 35, attacks: ['ult4'], ultMode: 'immune', theme: 'luna', pal: PAL.luna, tint: [1.08, 0.95, 1.1], intensity: 0.75 },
    { kind: 'ultimate', tag: '제5식 종월', name: '삼위일체·월천붕괴', form: 'ult', hp: 1, time: 40, attacks: ['ult5'], ultMode: 'immune', theme: 'void', pal: PAL.luna, tint: [1.1, 1.0, 1.15], intensity: 1 },
  ],
};

// HELL 의 중간 보스로 나서는 루나린스: 세 형태에서 한 가지씩만 보여 준다
const S0 = LUNARINTH.steps;
export const LUNARINTH_MID = {
  ...LUNARINTH, hpMul: 0.5, music: 'luna', steps: [
    { ...S0[0], hp: 900, time: 36 },
    { ...S0[4], hp: 1300, time: 50 },
    { ...S0[5], hp: 1500, time: 56, pre: null, transform: false },
  ],
};

export class Lunarinth extends Boss {
  constructor(scene, T, tex, aspect, G, def = LUNARINTH) {
    super(scene, T, tex, aspect, G, def);
    this.orbit = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.crescent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 7; s.visible = false; scene.add(s); return s;
    });
    this.formShow = -1;
  }

  onStepBegin(st) {
    this.scaleT = (st.form === 'luna' || (st.kind === 'ultimate' && st.intensity >= 0.75)) ? 1.32 : 1;
    this.P = {}; this.G.world.setFall(null);
    if (st.kind !== 'ultimate') this.G.setVeil(false);
  }
  onCancel() { this.G.ui.madness(false); }

  formFlashI(i) {
    this.formPulse = 1; this.formShow = i; this.G.world.beat(0.8); this.sfx('cast');
    this.G.fx.ring(this.x, this.bobY, this.z, [PAL.lumina.glow, PAL.umbra.glow, PAL.luna.glow][i], 8, 0.5);
  }

  cast(sfxName = 'cast', barkP = 0.55) {
    this.sfx(sfxName);
    this.G.fx.ring(this.x, this.bobY, this.z, this.pal.glow, 6, 0.55);
    if (Math.random() < barkP) this.bark();
    const lp = this.formId === 'luna' ? 0.45 : 0.28;
    if (Math.random() < lp) this.sfx(this.formId === 'luna' && Math.random() < 0.15 ? 'laugh_big' : 'laugh', { pitch: rnd(0.95, 1.1) });
  }

  // 삼위일체: 세 개의 달이 보스 주위를 돈다
  renderExtra(dt, t, px, pz, visible) {
    const sc = this.scaleK, ph = this.formId, lit = FORM_IDX[ph];
    this.orbit.forEach((s, i) => {
      const a = t * (ph === 'luna' ? 1.7 : 0.8) + (i * TAU) / 3, r = 4.1 * sc;
      s.visible = visible;
      s.position.set(px + Math.cos(a) * r, this.bobY + Math.sin(a) * 0.6 * sc + 0.3, pz + Math.sin(a) * r * 0.7);
      const on = ph === 'luna' || i === lit;
      const pulse = this.formShow === i ? this.formPulse : 0;
      const size = (on ? 1.5 : 1.0) * sc + pulse * 1.2;
      s.scale.set(size, size, 1); s.material.rotation = a * 0.5;
      s.material.color.setHex([PAL.lumina.b, PAL.umbra.a, PAL.luna.a][i]);
      s.material.opacity = (on ? 0.95 : 0.3) * this.alpha;
    });
  }

  // ═════════════ LUMINA — 초승달 · 빛 · 우아함 ═════════════
  *atk_crescentFan() {
    const G = this.G, pal = this.pal;
    this.cast(); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.6;
    const volleys = 5 + (this.lv(2) ? 1 : 0) + (this.enrage ? 1 : 0);
    for (let v = 0; v < volleys; v++) {
      const a = this.aim(), n = this.n(5 + (v % 2) * 2, 3);
      this.fan(n, 1.25, a, { kind: 'crescent', speed: 7.6, size: 1.3, color: v % 2 ? pal.a : pal.b, spin: 7 });
      this.fan(Math.max(2, n - 1), 1.25, a, { kind: 'orb', speed: 5.0, size: 0.95, color: pal.c });
      if (this.lv(3)) this.fan(3, 0.4, a, { kind: 'orb', speed: 9, size: 0.9, color: pal.b });
      this.sfx('fan'); G.fx.ring(this.x, this.bobY, this.z, pal.b, 4, 0.35);
      if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -4.5), 0.7);
      yield this.t(0.8);
    }
    yield 0.5;
  }

  *atk_lightRain() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast(); this.glide(0, -7, 0.8); yield 0.6;
    const n = this.n(16, 9) + (this.enrage ? 4 : 0);
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i % 3 === 0) { x = P.x + rnd(-0.5, 0.5); z = P.z + rnd(-0.5, 0.5); }
      else { const a = rnd(0, TAU), r = rnd(1.6, 5.5); x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r; }
      this.zone(x, z, 1.75, { warn: 1.0, dur: 0.3, color: pal.b });
      this.sfx('telegraph', { pan: G.audio.pan(x) });
      yield this.t(0.23);
    }
    yield 1.5;
  }

  *atk_rapierThrust() {
    const pal = this.pal;
    this.cast(); const passes = 3 + (this.lv(2) ? 1 : 0) + (this.enrage ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      this.glide(rnd(-6.5, 6.5), rnd(-7.5, -3.5), 0.5); yield 0.55;
      const a = this.aim(), warn = 0.85;
      this.beam(this.x, this.z, a, { w: 1.5, len: 30, warn, dur: 0.22, color: pal.b });
      if (p >= 1) { this.beam(this.x, this.z, a - 0.4, { w: 1.2, len: 30, warn, dur: 0.22, color: pal.a }); this.beam(this.x, this.z, a + 0.4, { w: 1.2, len: 30, warn, dur: 0.22, color: pal.a }); }
      this.sfx('beam_charge');
      yield warn;
      this.kick(Math.cos(a) * 1.8, Math.sin(a) * 1.8);
      this.ring(this.n(12, 8), { a0: a, kind: 'orb', speed: 4.6, size: 0.9, color: pal.a });
      yield this.t(0.6);
    }
    yield 0.5;
  }

  *atk_moonwheel() {
    const G = this.G, pal = this.pal;
    this.cast(); this.glide(0, -6, 0.8); yield 0.7;
    for (let r = 0; r < 8; r++) {
      const cres = r % 2 === 1;
      this.ring(this.n(20, 12), { a0: r * 0.21 + (cres ? 0 : 0.08), kind: cres ? 'crescent' : 'orb', speed: 5.0, size: cres ? 1.15 : 0.95, color: cres ? pal.a : pal.b, accel: 0.5, maxS: 8, spin: cres ? 5 : 0 });
      this.sfx('orb'); G.fx.ring(this.x, this.bobY, this.z, pal.b, 5, 0.4);
      yield this.t(0.56);
    }
    yield 1.2;
  }

  // ═════ 스킬 「월광우」: 달빛의 소나기 + 초승달 부채 + 달무리 + 자검 ═════
  *atk_spMoonlight() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast(); this.glide(0, -6.8, 0.8); yield 0.9;
    for (let cyc = 0; cyc < 3; cyc++) {
      const n = this.n(18, 10);
      for (let i = 0; i < n; i++) {
        let x, z;
        if (i % 3 === 0) { x = P.x + rnd(-0.4, 0.4); z = P.z + rnd(-0.4, 0.4); }
        else { const a = rnd(0, TAU), r = rnd(1.8, 6); x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r; }
        this.zone(x, z, 1.8, { warn: 1.0, dur: 0.3, color: pal.b });
        this.sfx('telegraph', { pan: G.audio.pan(x) });
        if (i % 4 === 3) this.fan(this.n(5, 3), 1.1, this.aim(), { kind: 'crescent', speed: 7, size: 1.3, color: pal.a, spin: 7 });
        yield this.t(0.24);
      }
      yield 0.7;
      for (let r = 0; r < 4; r++) {
        const cres = r % 2 === 1;
        this.ring(this.n(20, 12), { a0: r * 0.25, kind: cres ? 'crescent' : 'orb', speed: 5.0, size: cres ? 1.15 : 0.95, color: cres ? pal.a : pal.b, accel: 0.5, maxS: 8, spin: cres ? 5 : 0 });
        this.sfx('orb'); yield this.t(0.5);
      }
      this.glide(rnd(-6, 6), rnd(-7.5, -4), 0.5); yield 0.55;
      const a = this.aim();
      this.beam(this.x, this.z, a, { w: 1.5, len: 30, warn: 0.9, dur: 0.22, color: pal.b });
      this.beam(this.x, this.z, a - 0.45, { w: 1.2, len: 30, warn: 0.9, dur: 0.22, color: pal.a });
      this.beam(this.x, this.z, a + 0.45, { w: 1.2, len: 30, warn: 0.9, dur: 0.22, color: pal.a });
      this.sfx('beam_charge'); yield 0.9;
      this.kick(Math.cos(a) * 1.8, Math.sin(a) * 1.8);
      this.ring(this.n(14, 8), { a0: a, kind: 'orb', speed: 4.8, size: 0.95, color: pal.a });
      yield this.t(0.8);
    }
    yield 0.6;
  }

  // ═════════════ UMBRA — 그믐달 · 어둠 · 음침함 ═════════════
  *atk_shadowOrbs() {
    const pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.8); yield 0.6;
    const n = this.n(6, 4) + (this.enrage ? 1 : 0);
    for (let i = 0; i < n; i++) {
      this.shoot({ kind: 'orb', a: (i * TAU) / n + rnd(-0.2, 0.2), speed: 4.3, size: 1.55, hr: 0.44, color: pal.a, homing: 1.25, homeT: 3.4, trail: true, life: 7.5 });
      this.sfx('dark'); yield this.t(0.45);
    }
    for (let k = 0; k < 5 + (this.lv(2) ? 1 : 0); k++) {
      this.fan(this.n(3, 2), 0.55, this.aim(), { kind: 'shard', speed: 7.2, size: 1.15, color: pal.c });
      this.sfx('orb'); yield this.t(0.6);
    }
    yield 1.4;
  }

  *atk_trickDecoys() {
    const G = this.G;
    this.cast('teleport'); this.alphaT = 0; yield 0.3;
    const slots = shuffle([-6.8, -3.4, 0, 3.4, 6.8]).slice(0, 4);
    const zs = slots.map(() => rnd(-8, -4.5));
    this.x = this.tx = slots[0]; this.z = this.tz = zs[0]; this.alphaT = 1; this.sfx('teleport');
    G.fx.ring(this.x, 3.5, this.z, 0xffffff, 6, 0.5);
    for (let i = 1; i < slots.length; i++) this.spawnDecoy(slots[i], zs[i], 5.4, 0.7 + i * 0.28);
    this.bark('umbra'); yield 1.1;
    for (let v = 0; v < 4; v++) {
      this.fan(this.n(5, 3), 1.1, this.aim(), { kind: 'orb', speed: 5.8, size: 1.1, color: this.pal.a });
      this.sfx('dark'); yield this.t(1.15);
    }
    yield 0.6;
  }

  *atk_eclipseVeil() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('veil'); G.setVeil(true); G.ui.warn('월식의 장막 — 시야가 가려집니다', 1700); yield 1.1;
    const waves = this.enrage ? 8 : 7, sx = [1.95, 1.7, 1.55, 1.4][this.D.lv];
    for (let w = 0; w < waves; w++) {
      const gc = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let x = -10; x <= 10; x += sx) if (Math.abs(x - gc) > 1.9) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 6.2, kind: 'orb', size: 1.2, color: pal.a });
      if (w % 2 === 1) {
        const side = w % 4 === 1 ? -1 : 1, gz = clamp(P.z + rnd(-2.5, 2.5), -6, 8);
        for (let z = -9; z <= 10; z += sx) if (Math.abs(z - gz) > 1.9) this.shoot({ x: side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 5.6, kind: 'orb', size: 1.2, color: pal.b });
      }
      this.sfx('dark'); yield this.t(1.3);
    }
    yield 1.6; G.setVeil(false); yield 0.6;
  }

  *atk_backOfMoon() {
    const pal = this.pal;
    this.cast(); this.glide(0, -6, 0.7); yield 0.7;
    const dur = 5.6;
    let t = 0, a = rnd(0, TAU), dir = 1, acc = 0, flipped = false;
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt; a += dir * dt * 1.9;
      if (t > dur / 2 && !flipped) { flipped = true; dir = -1; this.sfx('teleport'); this.bark('umbra'); }
      const step = 0.075 / this.rate;
      while (acc >= step) {
        acc -= step;
        for (let k = 0; k < 2; k++) this.shoot({ a: a + k * Math.PI, speed: 5.4, kind: k ? 'shard' : 'orb', size: 1.05, color: k ? pal.c : pal.a });
        if (this.lv(3)) this.shoot({ a: a + Math.PI / 2, speed: 4.6, kind: 'orb', size: 1.0, color: pal.b });
      }
    }
    yield 1.2;
  }

  // ═════ 스킬 「거짓된 달」: 가짜 루나린스 + 추적 구슬 + 달무리 ═════
  *atk_spFalseMoon() {
    const G = this.G, pal = this.pal;
    for (let wave = 0; wave < 3; wave++) {
      this.cast('teleport'); this.alphaT = 0; yield 0.3;
      const slots = shuffle([-6.8, -3.4, 0, 3.4, 6.8]).slice(0, 4), zs = slots.map(() => rnd(-8, -4.5));
      this.x = this.tx = slots[0]; this.z = this.tz = zs[0]; this.alphaT = 1; this.sfx('teleport');
      G.fx.ring(this.x, 3.5, this.z, 0xffffff, 6, 0.5);
      for (let i = 1; i < slots.length; i++) this.spawnDecoy(slots[i], zs[i], 6.4, 0.7 + i * 0.3);
      G.ui.warn('진짜는 하나뿐 — 깜빡이는 쪽은 거짓입니다', 1500);
      this.bark('umbra'); yield 1.1;
      for (let v = 0; v < 5; v++) {
        this.fan(this.n(5, 3), 1.1, this.aim(), { kind: 'orb', speed: 5.8, size: 1.1, color: pal.a });
        if (v % 2 === 1) this.shoot({ kind: 'orb', a: this.aim() + rnd(-0.6, 0.6), speed: 4.2, size: 1.5, hr: 0.42, color: pal.a, homing: 1.3, homeT: 3, trail: true, life: 6 });
        this.sfx('dark'); yield this.t(1.1);
      }
      this.ring(this.n(22, 12), { kind: 'crescent', speed: 4.4, size: 1.1, color: pal.c, spin: 6 }); this.sfx('orb');
      yield 1.0;
    }
    yield 0.4;
  }

  // ═════ 스킬 「월식의 장막」: 시야 차단 + 탄벽 + 달의 뒷면 ═════
  *atk_spEclipse() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('veil'); G.setVeil(true); G.ui.warn('월식의 장막 — 시야가 가려집니다', 1700); yield 1.1;
    const sx = [1.95, 1.7, 1.55, 1.4][this.D.lv];
    for (let w = 0; w < 10; w++) {
      const gc = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let x = -10; x <= 10; x += sx) if (Math.abs(x - gc) > 1.9) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 6.2, kind: 'orb', size: 1.2, color: pal.a });
      if (w % 2 === 1) {
        const side = w % 4 === 1 ? -1 : 1, gz = clamp(P.z + rnd(-2.5, 2.5), -6, 8);
        for (let z = -9; z <= 10; z += sx) if (Math.abs(z - gz) > 1.9) this.shoot({ x: side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 5.6, kind: 'orb', size: 1.2, color: pal.b });
      }
      if (w % 3 === 2) this.fan(this.n(7, 3), 1.5, this.aim(), { kind: 'crescent', speed: 6.4, size: 1.2, color: pal.c, spin: 6 });
      this.sfx('dark'); yield this.t(1.2);
    }
    G.setVeil(false); yield 0.8;
    yield* this.atk_backOfMoon();
  }

  // ═════════════ LUNA — 보름달 · 광기 · 달 그 자체 ═════════════
  *atk_lunaticSpiral() {
    const pal = this.pal;
    this.cast(); this.glide(0, -5.5, 0.6); yield 0.7;
    const arms = this.n(5, 3), dur = 7.4;
    let t = 0, a = rnd(0, TAU), dir = 1, acc = 0, flipped = false;
    const cols = [pal.a, pal.b, pal.c];
    while (t < dur) {
      const dt = yield 0; t += dt; acc += dt;
      a += dir * dt * (1.1 + 0.45 * Math.sin(t * 0.9));
      if (t > dur / 2 && !flipped) { flipped = true; dir = -1; this.sfx('laugh'); this.G.world.beat(1); }
      const step = 0.095 / this.rate;
      while (acc >= step) {
        acc -= step;
        for (let k = 0; k < arms; k++) {
          const cres = k % 2 === 1;
          this.shoot({ a: a + (k * TAU) / arms, speed: 5.9, kind: cres ? 'crescent' : 'orb', size: cres ? 1.15 : 1.0, color: cols[k % 3], spin: cres ? 6 : 0 });
        }
      }
    }
    yield 1.3;
  }

  *atk_moonThrow() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('moon_throw'); this.glide(0, -6.2, 0.6); yield 0.8;
    const throws = 2 + (this.lv(2) ? 1 : 0) + (this.enrage ? 1 : 0);
    for (let i = 0; i < throws; i++) {
      const tx = clamp(P.x, -8, 8), tz = clamp(P.z, -7, 8.5), dur = 1.4;
      this.zone(tx, tz, 3.5, {
        warn: dur, dur: 0.4, color: pal.a,
        onBoom: (zz) => {
          const n = this.n(24, 14), a0 = rnd(0, TAU);
          for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', x: zz.x, z: zz.z, a: a0 + (k * TAU) / n, speed: 6.2 * this.spd, kind: k % 2 ? 'crescent' : 'orb', size: 1.1, color: k % 2 ? pal.c : pal.b, spin: k % 2 ? 6 : 0 });
          G.world.shake(0.8, 0.5); G.audio.sfx.play('moon_impact', { pan: G.audio.pan(zz.x) }); G.ui.flash('#ffe9a6', 300, 0.3);
          G.fx.burst(zz.x, 0.5, zz.z, 30, { color: [0xffe9a6, 0xff7ac8, 0xffffff], speed: 8, size: 0.9, life: 0.9, up: 1.6 });
        },
      });
      G.flyers.launch({ x0: this.x, z0: this.z, y0: this.bobY + 1, x1: tx, z1: tz, dur, size: 5.4, color: pal.b, arc: 6 });
      this.sfx('moon_throw'); this.kick(0, 1.2);
      yield 1.25;
    }
    yield 1.4;
  }

  *atk_madnessWave() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('madness'); G.ui.warn('광기가 밀려옵니다…', 1400); yield 1.1;
    const inv = this.enrage ? 2.6 : 2.2;
    P.invertT = inv; G.setMadness(inv + 0.5); G.ui.warn('조작 반전!', 1700);
    for (let w = 0; w < 5; w++) {
      this.fan(this.n(7, 4), 1.6, this.aim() + rnd(-0.2, 0.2), { kind: 'orb', speed: 5.6, size: 1.1, color: w % 2 ? pal.a : pal.b });
      this.ring(this.n(10, 6), { kind: 'crescent', speed: 3.8, size: 1.05, color: pal.c, spin: 6 });
      this.sfx('fan', { pitch: 1.2 }); yield this.t(0.72);
    }
    yield 1.5;
  }

  *atk_trinityBarrage() {
    this.cast(); this.glide(0, -6, 0.7); yield 0.7;
    const rounds = 2 + (this.enrage ? 1 : 0);
    for (let r = 0; r < rounds; r++) {
      this.formFlashI(0);
      for (let k = 0; k < 3; k++) { this.fan(this.n(9, 5), 1.55, this.aim(), { kind: 'crescent', speed: 8.2, size: 1.25, color: PAL.lumina.b, spin: 8 }); this.sfx('fan'); yield 0.38; }
      this.formFlashI(1);
      for (let k = 0; k < this.n(4, 3); k++) { this.shoot({ kind: 'orb', a: this.aim() + rnd(-0.8, 0.8), speed: 4.2, size: 1.5, hr: 0.42, color: PAL.umbra.a, homing: 1.35, homeT: 3, trail: true, life: 6.5 }); this.sfx('dark'); yield 0.26; }
      this.formFlashI(2);
      this.ring(this.n(26, 14), { kind: 'orb', speed: 6.0, size: 1.0, color: PAL.luna.a }); this.sfx('orb'); yield 0.32;
      this.ring(this.n(26, 14), { a0: 0.12, kind: 'orb', speed: 5.4, size: 1.0, color: PAL.luna.b }); this.sfx('orb');
      yield this.t(1.0);
    }
    yield 1.0;
  }

  *atk_moonfall() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); G.ui.warn('만월 낙하', 1300); this.sfx('laugh_big'); yield 0.9;
    const n = this.n(22, 12);
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 9.2;
      this.zone(Math.cos(a) * r, Math.sin(a) * r, 1.95, {
        warn: 1.2, dur: 0.3, color: i % 2 ? pal.a : pal.b,
        onBoom: (zz) => { for (let k = 0; k < this.n(6, 3); k++) G.bullets.spawn({ owner: 'boss', x: zz.x, z: zz.z, a: rnd(0, TAU), speed: 4.6 * this.spd, kind: 'shard', size: 1.0, color: pal.c }); },
      });
      this.sfx('telegraph'); yield this.t(0.17);
    }
    yield 2.2;
  }

  // ═════ 스킬 「달 투척」: 거대한 달 · 광기의 파동 · 루나틱 나선 ═════
  *atk_spFall() {
    yield* this.atk_moonThrow();
    yield* this.atk_madnessWave();
    yield* this.atk_lunaticSpiral();
    if (this.lv(2) || this.enrage) yield* this.atk_moonfall();
  }

  // ═════ 라스트 스킬 「트리니티 이클립스」: 세 개의 달이 겹치는 밤 (궁극기 면역) ═════
  *atk_spTrinity() {
    const G = this.G;
    this.cast('moon_throw'); this.sfx('laugh_big'); G.ui.warn('삼위일체 — 성광은 닿지 않습니다', 1800); yield 1.0;
    while (true) {
      const seq = shuffle(['trinityBarrage', 'lunaticSpiral', 'moonfall', 'madnessWave', 'moonThrow']);
      for (const name of seq) yield* this['atk_' + name]();
      // 삼위의 달이 겹치는 일제 사격
      this.formFlashI(0); this.formFlashI(1); this.formFlashI(2);
      for (let k = 0; k < 4; k++) {
        this.ring(this.n(24, 14), { a0: k * 0.13, kind: k % 2 ? 'crescent' : 'orb', speed: 5.2 + k * 0.3, size: 1.1, color: [PAL.lumina.b, PAL.umbra.a, PAL.luna.a][k % 3], spin: k % 2 ? 6 : 0 });
        this.sfx('orb'); yield this.t(0.4);
      }
      yield 0.6;
    }
  }

  // ═══════════════════════════ 얼티메이트 스킬 ═══════════════════════════
  // 공통: 시간 구동. 각 패턴은 (dt, k) 로 호출되는 틱 함수이며 k 는 밀도/속도 배율이다.
  // 어려울수록 탄이 많고 빨라지지만 틀(시간표)은 같다.
  get ulCol() { return [this.pal.a, this.pal.b, this.pal.c]; }

  /** 제1식: 8방향 느린 탄막 */
  _p8(dt, k, o = {}) {
    const P = (this.P.p8 ??= { acc: 0, ang: rnd(0, TAU), dir: 1, flip: 0 }), cols = this.ulCol;
    P.ang += dt * (o.spin ?? 0.35) * P.dir; P.flip += dt; if (P.flip > 6.5) { P.flip = 0; P.dir *= -1; }
    P.acc += dt; const step = (o.step ?? 0.11) * 1.32 / (this.rate * k), arms = o.arms ?? this.n(7, 4);
    while (P.acc >= step) {
      P.acc -= step;
      for (let a = 0; a < arms; a++) this.shoot({ a: P.ang + (a * TAU) / arms, speed: (o.speed ?? 3.3) * k ** 0.4, kind: o.kind ?? 'orb', size: o.size ?? 1.15, color: o.col ?? cols[a % 3], spin: o.spinB ?? 0 });
    }
  }
  /** 큰 반달 탄 — 발사 직후에만 플레이어를 향하고 이후는 직진 */
  _pHalf(dt, k) {
    const P = (this.P.half ??= { acc: 0 }); P.acc += dt;
    if (P.acc >= 1.3 / (this.rate * k)) {
      P.acc = 0; const n = this.lv(2) ? 2 : 1;
      for (let i = 0; i < n; i++) this.shoot({ a: this.aim() + (n > 1 ? (i - 0.5) * 0.5 : 0), speed: 3.0 * k ** 0.3, kind: 'crescent', size: 4.2, hr: 1.1, color: this.pal.b, spin: 2.2, life: 14 });
      this.sfx('dark');
    }
  }
  /** 제2식: 교차하는 검격(범) + 초승달 */
  _pSlash(dt, k, o = {}) {
    const G = this.G, P = (this.P.slash ??= { t: 1.0, n: 0 });
    P.t -= dt; if (P.t > 0) return;
    P.t = (o.interval ?? 2.7) / (this.rate * k); P.n++;
    const L = this.lead(0.85), tx = clamp(this.G.player.x + Math.cos(L) * 0, -8, 8);
    const px = clamp(G.player.x + (G.player.vx || 0) * 0.8, -9, 9), pz = clamp(G.player.z + (G.player.vz || 0) * 0.8, -8, 8.5);
    void tx;
    const warn = Math.max(0.55, 0.95 - (o.prog ?? 0) * 0.35), base = rnd(0, TAU), cnt = k >= 1.15 ? 3 : 2;
    this.sfx('beam_charge');
    for (let i = 0; i < cnt; i++) {
      const a = base + (i * Math.PI) / cnt; // 한 점에서 교차하는 직선 2~3개
      this.beam(px - Math.cos(a) * 15, pz - Math.sin(a) * 15, a, { w: 1.15, len: 30, warn, dur: 0.2, color: i ? this.pal.a : this.pal.b });
    }
    const cc = this.n(8, 5);
    G.zones.spawn({ x: px, z: pz, r: 0.01, warn: warn + 0.0, dur: 0.05, dmg: 0, color: this.pal.b, onBoom: (zz) => {
      this.ring(cc, { x: zz.x, z: zz.z, kind: 'crescent', speed: 4.4, size: 1.2, color: this.pal.c, spin: 6 });
      this.sfx('fan');
    } });
    this.kick(Math.cos(this.aim()) * 1.2, Math.sin(this.aim()) * 1.2);
  }
  /** 제4식 ①: 24방향 고리. 홀수 번째만 1.5초 뒤 가속 */
  _pRing24(dt, k) {
    const P = (this.P.r24 ??= { acc: 0, i: 0 }); P.acc += dt;
    if (P.acc >= 1.0 / (this.rate * k)) {
      P.acc = 0; P.i++;
      const odd = P.i % 2 === 1;
      this.ring(this.n(18, 10), { a0: P.i * 0.11, kind: odd ? 'crescent' : 'orb', speed: 3.7, size: odd ? 1.2 : 1.0, color: odd ? this.pal.c : this.pal.a, accel: odd ? 5.5 : 0, accelAt: 1.5, maxS: 9.5, spin: odd ? 5 : 0 });
      this.sfx('orb', { pitch: odd ? 1.2 : 1 });
    }
  }
  /** 제4식 ②: 시계/반시계 나선 두 줄기, 3초마다 반전(0.6초 전 은백색 점멸) */
  _pSpiral(dt, k) {
    const G = this.G, P = (this.P.sp ??= { acc: 0, a1: rnd(0, TAU), a2: rnd(0, TAU), dir: 1, t: 0 });
    P.t += dt; P.a1 += dt * 1.55 * P.dir; P.a2 -= dt * 1.55 * P.dir;
    const into = P.t % 3, flicker = into > 2.4;
    if (P.t >= 3 && !P.flipped) { /* noop */ }
    if (Math.floor(P.t / 3) !== Math.floor((P.t - dt) / 3)) { P.dir *= -1; this.sfx('teleport'); G.world.beat(0.8); }
    P.acc += dt; const step = 0.075 / (this.rate * k), arms = this.n(2, 1), white = flicker && Math.floor(P.t * 10) % 2 === 0;
    while (P.acc >= step) {
      P.acc -= step;
      for (let a = 0; a < arms; a++) {
        const o = (a * TAU) / arms;
        this.shoot({ a: P.a1 + o, speed: 4.4, kind: 'orb', size: 1.0, color: white ? 0xeef4ff : this.pal.a, tag: 'spiral' });
        this.shoot({ a: P.a2 + o, speed: 4.4, kind: 'orb', size: 1.0, color: white ? 0xeef4ff : this.pal.b, tag: 'spiral' });
      }
    }
    // 점멸 예고: 이미 나간 나선탄도 은백색으로 깜빡인다
    if (flicker) for (const b of G.bullets.list) if (b.active && b.tag === 'spiral') b.mat.color.setHex(white ? 0xeef4ff : b.color);
  }
  /** 제4식 ③: 화면 가장자리에서 수렴하는 초승달 + 5발 연속 조준탄 */
  _pConverge(dt, k, o = {}) {
    const P = (this.P.cv ??= { acc: 0, aimT: 0.6, burst: 0 });
    P.acc += dt; const step = (o.step ?? 0.3) * 1.35 / (this.rate * k), cx = 0, cz = -1;
    while (P.acc >= step) {
      P.acc -= step;
      const a = rnd(0, TAU), R = 12.5, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R * 0.85;
      const tx = cx + rnd(-3.5, 3.5), tz = cz + rnd(-3.5, 3.5), aim = Math.atan2(tz - z, tx - x);
      this.shoot({ x, z, a: aim, speed: 4.6, kind: 'crescent', size: 1.4, color: this.pal.c, spin: 5, life: 8 });
    }
    P.aimT -= dt;
    if (P.aimT <= 0 && P.burst === 0) { P.aimT = (o.aimEvery ?? 1.5) / (this.rate * k); P.burst = 5; P.bt = 0; }
    if (P.burst > 0) { P.bt -= dt; if (P.bt <= 0) { P.bt = 0.09; P.burst--; this.shoot({ a: this.lead(0.45), speed: 7.2, kind: 'orb', size: 1.0, color: 0xffffff }); this.sfx('orb', { pitch: 1.4, vol: 0.4 }); } }
  }
  /** 메테오: 5초마다 경고 후 낙하. 탄은 나오지 않는 대신 범위가 넓다 */
  _pMeteor(dt, k, o = {}) {
    const G = this.G, P = (this.P.met ??= { t: o.first ?? 5 });
    P.t -= dt; if (P.t > 0) return;
    P.t = o.every ?? 5;
    const n = this.lv(2) ? 2 : 1, dur = 1.6;
    for (let i = 0; i < n; i++) {
      const tx = clamp(G.player.x + (G.player.vx || 0) * 0.5 + (i ? rnd(-4, 4) : 0), -8, 8), tz = clamp(G.player.z + (G.player.vz || 0) * 0.5 + (i ? rnd(-3, 3) : 0), -7.5, 8.5);
      G.zones.spawn({ x: tx, z: tz, r: 3.9, warn: dur, dur: 0.45, color: this.pal.b, onBoom: (zz) => {
        G.world.shake(0.9, 0.5); G.audio.sfx.play('moon_impact', { pan: G.audio.pan(zz.x) }); G.ui.flash('#fff1c9', 260, 0.3);
        G.fx.burst(zz.x, 0.5, zz.z, 34, { color: [0xfff1c9, 0xffffff, this.pal.a], speed: 9, size: 1.0, life: 1.0, up: 1.6 });
      } });
      G.flyers.launch({ x0: tx * 0.4, z0: tz - 6, y0: 17, x1: tx, z1: tz, dur, size: 3.6, color: 0xfff1c9, arc: 0 });
      this.sfx('moon_throw', { vol: 0.8 });
    }
  }
  /** 제3식: 회전하는 빛의 고리 (공전탄). 안전지대(틈)가 주기적으로 바뀐다 */
  _ringsInit() {
    const P = (this.P.rings ??= { list: [], t: 0 }), cz = -1.5;
    const defs = [{ r: 3.4, w: 0.55 }, { r: 5.6, w: -0.42 }, { r: 7.8, w: 0.33 }];
    for (const d of defs) { const n = Math.round((TAU * d.r) / 1.5); P.list.push({ ...d, n, ang: rnd(0, TAU), gap: rnd(0, TAU), gw: 1.05, items: Array.from({ length: n }, (_, i) => ({ phi: (i / n) * TAU, b: null })), cz }); }
    this._ringsGaps(true);
  }
  _ringsGaps(first = false) {
    const P = this.P.rings, G = this.G, pal = this.pal;
    for (const R of P.list) {
      R.gap = rnd(0, TAU); R.gw = (this.D.lv >= 2 ? 0.95 : 1.15) + (this.D.lv === 0 ? 0.25 : 0);
      for (const it of R.items) {
        const d = Math.abs((((it.phi - R.gap) % TAU) + TAU * 1.5) % TAU - Math.PI);
        const inGap = Math.abs(((it.phi - R.gap + Math.PI) % TAU + TAU) % TAU - Math.PI) < R.gw;
        void d;
        const alive = it.b && it.b.active && it.b.orbit === it.orb;
        if (inGap) { if (alive) { G.fx.puff(it.b.x, 0.9, it.b.z, it.b.color, 1); G.bullets.kill(it.b); } it.b = null; }
        else if (!alive) {
          const mid = Math.abs(R.r - 5.6) < 0.1;
          const b = G.bullets.spawn({ owner: 'boss', x: 0, z: 0, kind: mid ? 'crescent' : 'orb', size: mid ? 1.15 : 1.0, color: mid ? pal.c : (R.r < 5 ? pal.b : pal.a), spin: mid ? 4 : 0, life: 90, arm: first ? 0.3 : 0.9,
            orbit: { cx: 0, cz: R.cz, r: R.r, ang: R.ang + it.phi, w: R.w } });
          if (b) { b.orbit.ang = R.ang + it.phi; it.orb = b.orbit; it.b = b; }
        }
      }
    }
  }
  _pRings(dt) {
    const P = this.P.rings; if (!P) return;
    P.t += dt; for (const R of P.list) { R.ang += R.w * dt; }
    // 살아있는 공전탄이 R.ang 을 따라가도록 각도는 각 탄이 스스로 증가시킨다 (R.ang 는 틈 계산용으로만 쓰인다)
    if (P.t >= 5) { P.t = 0; this.G.sfx && 0; this.sfx('teleport'); this.G.world.beat(0.9); this._ringsGaps(false); }
  }

  // ───── 제1식 신월 「무광의 천구」 — UMBRA, 15초 ─────
  *atk_ult1() {
    const G = this.G; this.cast('veil', 0); this.glide(0, -5, 0.8); G.setVeil(true, 0.55); this.sfx('laugh_big', { vol: 0.8 }); yield 0.6;
    let t = 0;
    while (true) {
      const dt = yield 0; t += dt;
      this._p8(dt, 1.0, { spin: 0.38 });
      if (t > 10) this._pHalf(dt, 1.0);
    }
  }

  // ───── 제2식 초승 「은월의 검무」 — LUMINA, 20초. 시간이 지날수록 강해진다 ─────
  *atk_ult2() {
    this.cast('cast', 0); this.glide(0, -5.5, 0.8); yield 0.5;
    let t = 0;
    while (true) {
      const dt = yield 0; t += dt;
      const prog = Math.min(1, t / 20), k = 0.7 + 0.7 * prog;
      this._p8(dt, k, { spin: -0.45, step: 0.14, speed: 3.6, kind: 'crescent', size: 1.3, spinB: 5, arms: this.n(6, 4) });
      this._pSlash(dt, k, { interval: 2.8, prog });
    }
  }

  // ───── 제3식 상현 「월광의 왕관」 — LUMINA 의 우아함, 25초 ─────
  *atk_ult3() {
    this.cast('cast', 0); this.glide(0, -1.6, 1.0); yield 1.0;
    this._ringsInit();
    let t = 0;
    while (true) {
      const dt = yield 0; t += dt;
      this._pRings(dt);
      this._pMeteor(dt, 1, { first: 5, every: 5 });
      if (t % 1.2 < dt) this.G.fx.ring(this.x, this.bobY, this.z, this.pal.glow, 10, 1.0);
    }
  }

  // ───── 제4식 만월 「광기의 세계」 — LUNA, 35초 (①월광 침식 ②광기의 공명 ③루나틱) ─────
  *atk_ult4() {
    const G = this.G; this.cast('moon_throw', 0); this.glide(0, -5.5, 0.8); G.ui.flash('#fff1c9', 900, 0.6); G.world.beat(1.5); yield 0.7;
    let t = 0, seg = 0;
    while (true) {
      const dt = yield 0; t += dt;
      if (t < 8) this._pRing24(dt, 1);
      else if (t < 17) { if (seg < 1) { seg = 1; G.ui.announce('② 광기의 공명', 1800); this.sfx('laugh'); this.P.sp = null; } this._pSpiral(dt, 1); }
      else { if (seg < 2) { seg = 2; G.ui.announce('③ 루나틱 — 광기의 세계', 2000); this.sfx('laugh_big', { vol: 0.8 }); G.ui.flash('#ff7ac8', 500, 0.4); } const q = t > 27 ? 1.35 : 1; this._pConverge(dt, q); }
      if (seg === 0 && t > 0.1) { seg = 0; }
    }
  }

  // ───── 제5식 종월 「삼위일체·월천붕괴」 — 세 형태의 동시 발현, 40초 ─────
  *atk_ult5() {
    const G = this.G; this.cast('moon_throw', 0); this.glide(0, -4.8, 0.8); G.setVeil(true, 0.5); G.ui.flash('#000000', 700, 0.7);
    for (const i of [0, 1, 2]) { this.formFlashI(i); }
    this.sfx('laugh_big'); yield 0.8;
    let t = 0, fallOn = false, calmed = false, rumbleT = 0;
    while (true) {
      const dt = yield 0; t += dt;
      if (t < 14) { // 모든 식의 탄막이 겹친다
        const k = 0.6 + 0.4 * (t / 14);
        this._p8(dt, k * 0.85, { spin: 0.3 }); this._pSlash(dt, k * 0.75, { interval: 3.2, prog: t / 40 }); this._pRing24(dt, k * 0.7);
        if (t > 8) this._pHalf(dt, 0.8);
      } else if (t < 22) { // 잠잠해진다 — 어둠이 깊어진다
        if (!calmed) { calmed = true; G.setVeil(true, 0.85); G.ui.warn('……', 1600); G.world.beat(0.4); }
        this.P.cal = (this.P.cal ?? 0) + dt;
        if (this.P.cal > 1.3) { this.P.cal = 0; this.shoot({ a: this.aim(), speed: 3.0, kind: 'orb', size: 1.2, color: this.pal.a }); }
      } else { // 거대한 달이 내려오고, 모든 패턴이 점점 빨라진다
        const q = Math.min(1, (t - 22) / 18);
        if (!fallOn) { fallOn = true; G.setVeil(true, 0.6); this.sfx('laugh_big'); this.sfx('rumble'); G.ui.warn('달이 떨어집니다', 1800); this.P.sp = null; this.P.slash = null; }
        G.world.setFall(q); G.world.shake(0.12 + q * 0.5, 0.2);
        rumbleT -= dt; if (rumbleT <= 0) { rumbleT = 5.5; this.sfx('rumble', { vol: 0.6 }); }
        this.grow = q * 0.9; this.applyStats();
        const k = 0.7 + 0.55 * q;
        this._p8(dt, k * 0.5, { spin: 0.4, step: 0.15 }); this._pRing24(dt, k * 0.65); this._pSpiral(dt, k * 0.55); this._pConverge(dt, k * 0.6, { step: 0.42, aimEvery: 1.7 });
        this._pSlash(dt, k * 0.9, { interval: 3.2, prog: 0.5 + q * 0.5 }); this._pMeteor(dt, 1, { first: 1.5, every: 5 });
        if (q > 0.5) this._pHalf(dt, k * 0.7);
      }
    }
  }
}
