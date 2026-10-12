// 루나린스(보스): 렌더링, 체력/페이즈, 공격 코루틴.
// 공격은 제너레이터로 작성한다: `yield 초` = 그 시간만큼 대기, `yield 0` = 다음 프레임에 경과 dt를 받고 재개.
// 기술 이름·패턴은 이 게임의 창작 제안이다 (lore.js 의 PROPOSAL 참조).
import * as THREE from '../vendor/three.module.min.js';
import { PHASES, BARKS } from './lore.js';
import { ARENA_R } from './scene.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const PAL = {
  lumina: { a: 0xe3d6ff, b: 0xfff1c9, c: 0xffffff, glow: 0xd9c8ff },
  umbra: { a: 0xa07bff, b: 0x6a3fd8, c: 0xe4d6ff, glow: 0x7a4bd8 },
  luna: { a: 0xff7ac8, b: 0xffe9a6, c: 0xffffff, glow: 0xff7ac8 },
};
const FORM_IDX = { lumina: 0, umbra: 1, luna: 2 };

export const BOSS_MAX_HP = 3000;
const MOVES = {
  lumina: ['crescentFan', 'lightRain', 'rapierThrust', 'moonwheel'],
  umbra: ['shadowOrbs', 'trickDecoys', 'eclipseVeil', 'backOfMoon'],
  luna: ['lunaticSpiral', 'moonThrow', 'madnessWave', 'trinityBarrage'],
};

export class Boss {
  constructor(scene, T, bossTex, aspect, G) {
    this.G = G; this.T = T;
    this.aspect = aspect;
    this.h = 6.6;
    this.mat = new THREE.SpriteMaterial({ map: bossTex, transparent: true, depthWrite: false });
    this.spr = new THREE.Sprite(this.mat); this.spr.renderOrder = 5; scene.add(this.spr);
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
    this.aura.renderOrder = 4; scene.add(this.aura);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.7 }));
    this.shadow.position.y = 0.04; scene.add(this.shadow);
    this.orbit = [0, 1, 2].map(() => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.crescent, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.renderOrder = 7; scene.add(s); return s;
    });
    this.decoys = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.SpriteMaterial({ map: bossTex, transparent: true, depthWrite: false, color: 0xb8c8ff });
      const s = new THREE.Sprite(m); s.renderOrder = 5; s.visible = false; scene.add(s);
      this.decoys.push({ active: false, spr: s, mat: m });
    }
    this.reset();
  }

  get pal() { return PAL[PHASES[this.phase].id]; }
  get formId() { return PHASES[this.phase].id; }

  reset(phase = 0) {
    this.hp = BOSS_MAX_HP * (1 - phase / 3);
    this.phase = phase; this.alive = true; this.vulnerable = false; this.visible = true;
    this.bobY = 4; this.x = 0; this.z = -6.5; this.tx = 0; this.tz = -6.5; this.tk = 4;
    this.hitR = 1.9; this.scaleK = 1; this.scaleT = phase === 2 ? 1.32 : 1;
    this.flash = 0; this.alpha = 1; this.alphaT = 1; this.kickX = 0; this.kickZ = 0;
    this.routine = null; this.wait = 0; this.accDt = 0; this.idleT = 1.2; this.bag = []; this.last = null;
    this.enrage = false; this.spd = 1; this.rate = 1; this.formPulse = 0; this.cur = null;
    for (const d of this.decoys) { d.active = false; d.spr.visible = false; }
    this.applyPhaseStats();
  }

  applyPhaseStats() {
    const p = this.phase;
    this.spd = [1, 1, 1.07][p] * (this.enrage ? 1.12 : 1);
    this.rate = [1, 1, 1.15][p] * (this.enrage ? 1.25 : 1);
    this.idleBase = [1.35, 1.25, 0.95][p] * (this.enrage ? 0.75 : 1);
    this.scaleT = p === 2 ? 1.32 : 1;
  }

  setPhase(i) {
    this.phase = i; this.bag = []; this.last = null; this.routine = null; this.enrage = false;
    this.cancelAttack();
    this.applyPhaseStats(); this.idleT = 1.0;
  }

  cancelAttack() {
    this.routine = null;
    for (const d of this.decoys) { if (d.active) this.killDecoy(d, false); }
    this.G.setVeil(false);
  }

  // ───── 공격 보조 ─────
  aim(fx = this.x, fz = this.z) { return Math.atan2(this.G.player.z - fz, this.G.player.x - fx); }
  shoot(o) {
    return this.G.bullets.spawn({ owner: 'boss', x: this.x, z: this.z, ...o, speed: (o.speed ?? 6) * this.spd });
  }
  ring(n, o = {}) { const a0 = o.a0 ?? rnd(0, TAU); for (let i = 0; i < n; i++) this.shoot({ ...o, a: a0 + (i * TAU) / n }); }
  fan(n, spread, a, o = {}) { for (let i = 0; i < n; i++) this.shoot({ ...o, a: a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) }); }
  zone(x, z, r, o = {}) {
    const l = Math.hypot(x, z), lim = ARENA_R - 0.4; if (l > lim) { x *= lim / l; z *= lim / l; }
    return this.G.zones.spawn({ x, z, r, color: this.pal.b, ...o });
  }
  beam(x, z, a, o = {}) { return this.G.beams.spawn({ x, z, a, color: this.pal.b, ...o }); }
  glide(x, z, dur = 0.8) { this.tx = clamp(x, -8, 8); this.tz = clamp(z, -8.5, -1.5); const l = Math.hypot(this.tx, this.tz), lim = ARENA_R - 1.2; if (l > lim) { this.tx *= lim / l; this.tz *= lim / l; } this.tk = 3.6 / Math.max(0.15, dur); }
  *go(x, z, dur) { this.glide(x, z, dur); yield dur; }
  kick(dx, dz) { this.kickX = dx; this.kickZ = dz; }
  pan() { return this.G.audio.pan(this.x); }
  sfx(n, o = {}) { this.G.audio.sfx.play(n, { pan: this.pan(), ...o }); }

  bark(kind) {
    const list = BARKS[kind || this.formId]; if (!list) return;
    const [sx, sy] = this.G.world.project(this.x, this.bobY + 4.4 * this.scaleK, this.z);
    this.G.ui.bark(list[(Math.random() * list.length) | 0], sx, sy);
  }
  cast(sfxName = 'cast') {
    this.sfx(sfxName);
    this.G.fx.ring(this.x, this.bobY, this.z, this.pal.glow, 6, 0.55);
    if (Math.random() < 0.6) this.bark();
    const lp = this.phase === 2 ? 0.45 : 0.28;
    if (Math.random() < lp) this.sfx(this.phase === 2 && Math.random() < 0.15 ? 'laugh_big' : 'laugh', { pitch: rnd(0.95, 1.1) });
  }
  formFlash(i) {
    this.formPulse = 1; this.formShow = i; this.G.world.beat(0.8); this.sfx('cast');
    const c = [PAL.lumina.glow, PAL.umbra.glow, PAL.luna.glow][i];
    this.G.fx.ring(this.x, this.bobY, this.z, c, 8, 0.5);
  }

  // ───── 코루틴 실행기 ─────
  pickAttack() {
    if (!this.bag.length) {
      this.bag = shuffle([...MOVES[this.formId]]);
      if (this.phase === 2 && this.enrage) this.bag.push('moonfall');
      if (this.bag[this.bag.length - 1] === this.last && this.bag.length > 1) this.bag.unshift(this.bag.pop());
    }
    const name = this.bag.pop(); this.last = name; this.cur = name;
    this.routine = this['atk_' + name]();
    this.wait = 0; this.accDt = 0;
    this.G.stats.attacks++;
  }

  update(dt) {
    if (!this.alive) return;
    // 이동 (임계 감쇠)
    const k = 1 - Math.exp(-dt * this.tk);
    this.x += (this.tx - this.x) * k; this.z += (this.tz - this.z) * k;
    this.kickX *= Math.exp(-dt * 7); this.kickZ *= Math.exp(-dt * 7);
    this.flash = Math.max(0, this.flash - dt);
    this.formPulse = Math.max(0, this.formPulse - dt * 2);
    this.alpha += (this.alphaT - this.alpha) * (1 - Math.exp(-dt * 12));

    if (this.routine) {
      this.wait -= dt; this.accDt += dt;
      let guard = 0;
      while (this.wait <= 0 && this.routine && guard++ < 24) {
        const r = this.routine.next(this.accDt); this.accDt = 0;
        if (r.done) { this.routine = null; this.idleT = this.idleBase; break; }
        const v = r.value || 0;
        if (v === 0) { this.wait = 0; break; }
        this.wait += v;
      }
    } else if (this.G.state === 'fight') {
      this.idleT -= dt;
      if (this.idleT > 0.5 && Math.random() < dt * 0.6) this.glide(rnd(-6.5, 6.5), rnd(-8, -4), rnd(0.9, 1.5));
      if (this.idleT <= 0) this.pickAttack();
    }
    this.updateDecoys(dt);
  }

  // ───── 피격 ─────
  damage(amount, G, x, z) {
    if (!this.alive) return;
    if (!this.vulnerable) { G.fx.burst(x, 1.6, z, 3, { color: 0xffffff, speed: 2, size: 0.3, life: 0.3 }); return; }
    this.hp -= amount; this.flash = 0.07;
    G.stats.damage += amount;
    G.audio.sfx.play(amount > 15 ? 'hit_boss_heavy' : 'hit_boss', { pan: G.audio.pan(this.x), pitch: rnd(0.9, 1.2) });
    G.fx.burst(x, 1.6, z, amount > 15 ? 12 : 3, { color: [0xffffff, this.pal.b], speed: amount > 15 ? 6 : 3, size: 0.5, life: 0.45 });
    // 페이즈 경계
    const thresh = this.phase < 2 ? BOSS_MAX_HP * (1 - (this.phase + 1) / 3) : 0;
    if (this.hp <= thresh) {
      this.hp = thresh; G.ui.setBoss(this.hp / BOSS_MAX_HP);
      this.vulnerable = false;
      if (this.phase < 2) G.beginPhaseChange(this.phase + 1); else G.beginVictory();
      return;
    }
    if (this.phase === 2 && !this.enrage && this.hp < BOSS_MAX_HP * 0.15) {
      this.enrage = true; this.applyPhaseStats(); G.onEnrage();
    }
    G.ui.setBoss(this.hp / BOSS_MAX_HP);
  }

  // ───── 가짜 루나린스 (거짓된 달) ─────
  spawnDecoy(x, z, life, fireOffset) {
    const d = this.decoys.find((q) => !q.active); if (!d) return null;
    Object.assign(d, { active: true, x, z, hp: 64, life, t: 0, fire: fireOffset, alpha: 0 });
    d.spr.visible = true; this.G.audio.sfx.play('teleport', { pan: this.G.audio.pan(x), vol: 0.7 });
    this.G.fx.ring(x, 3.5, z, 0x9bb8ff, 6, 0.5);
    return d;
  }
  killDecoy(d, pop = true) {
    d.active = false; d.spr.visible = false;
    if (pop) {
      this.G.audio.sfx.play('decoy_pop', { pan: this.G.audio.pan(d.x) });
      this.G.fx.burst(d.x, 3.5, d.z, 26, { color: [0x9bb8ff, 0xffffff, this.pal.a], speed: 6, size: 0.9, life: 0.9 });
      this.G.fx.ring(d.x, 3.5, d.z, 0xbfd0ff, 7, 0.5);
    }
  }
  updateDecoys(dt) {
    for (const d of this.decoys) {
      if (!d.active) continue;
      d.t += dt; d.life -= dt;
      d.alpha = Math.min(1, d.t * 3) * (d.life < 0.4 ? d.life / 0.4 : 1);
      if (d.life <= 0) { this.killDecoy(d, true); continue; }
      d.fire -= dt;
      if (d.fire <= 0 && d.t > 0.7) {
        d.fire = 1.15 / this.rate;
        const a = Math.atan2(this.G.player.z - d.z, this.G.player.x - d.x);
        for (let i = 0; i < 7; i++) this.G.bullets.spawn({ owner: 'boss', x: d.x, z: d.z, a: a + (i / 6 - 0.5) * 1.3, speed: 5.6 * this.spd, kind: 'orb', size: 1.0, color: 0x8fb0ff });
        this.G.audio.sfx.play('orb', { pan: this.G.audio.pan(d.x) });
      }
    }
  }

  // ───── 렌더 ─────
  render(dt, t) {
    const G = this.G;
    this.scaleK += (this.scaleT - this.scaleK) * (1 - Math.exp(-dt * 2.2));
    const sc = this.scaleK, h = this.h * sc, w = h * this.aspect;
    this.bobY = 3.95 * sc + Math.sin(t * 1.6) * 0.26;
    const px = this.x + this.kickX, pz = this.z + this.kickZ;
    const visible = this.visible;
    this.spr.visible = visible;
    this.spr.position.set(px, this.bobY, pz);
    this.spr.scale.set(w, h, 1);
    const ph = this.formId;
    const tint = ph === 'umbra' ? [0.78, 0.72, 1.0] : ph === 'luna' ? [1.08, 0.95, 1.1] : [1, 1, 1];
    const f = this.flash > 0 ? 1.9 : 1;
    this.mat.color.setRGB(tint[0] * f, tint[1] * f, tint[2] * f);
    this.mat.opacity = this.alpha;
    // 오라
    const as = (13 + Math.sin(t * 2) * 0.8) * sc;
    this.aura.visible = visible; this.aura.position.set(px, this.bobY, pz - 0.2); this.aura.scale.set(as, as, 1);
    this.aura.material.color.setHex(this.pal.glow); this.aura.material.opacity = (0.28 + 0.12 * Math.sin(t * 3) + this.formPulse * 0.3) * this.alpha;
    // 그림자
    this.shadow.visible = visible; this.shadow.position.x = px; this.shadow.position.z = pz;
    const ss = 4.2 * sc * (1 - (this.bobY - 3.5 * sc) * 0.04); this.shadow.scale.set(ss, 1, ss * 0.8);
    // 삼위일체: 세 개의 달이 보스 주위를 돈다
    const lit = FORM_IDX[ph];
    this.orbit.forEach((s, i) => {
      const a = t * (ph === 'luna' ? 1.7 : 0.8) + (i * TAU) / 3, r = 4.1 * sc;
      s.visible = visible;
      s.position.set(px + Math.cos(a) * r, this.bobY + Math.sin(a * 1.0) * 0.6 * sc + 0.3, pz + Math.sin(a) * r * 0.7);
      const on = ph === 'luna' || i === lit;
      const pulse = this.formShow === i ? this.formPulse : 0;
      const size = (on ? 1.5 : 1.0) * sc + pulse * 1.2;
      s.scale.set(size, size, 1); s.material.rotation = a * 0.5;
      s.material.color.setHex([PAL.lumina.b, PAL.umbra.a, PAL.luna.a][i]);
      s.material.opacity = (on ? 0.95 : 0.3) * this.alpha;
    });
    // 가짜
    for (const d of this.decoys) {
      if (!d.active) continue;
      d.spr.position.set(d.x, 3.95 * sc + Math.sin(t * 1.6 + d.x) * 0.26, d.z);
      d.spr.scale.set(w, h, 1);
      d.mat.opacity = d.alpha * (0.55 + 0.3 * Math.sin(t * 17 + d.x * 3));
    }
    void G;
  }

  // ═════════════════════ LUMINA — 초승달 · 빛 · 우아함 ═════════════════════
  *atk_crescentFan() {
    const G = this.G, pal = this.pal;
    this.cast(); this.glide(rnd(-5, 5), -6.5, 0.7); yield 0.6;
    const volleys = 4 + (this.enrage ? 1 : 0);
    for (let v = 0; v < volleys; v++) {
      const a = this.aim(), n = 5 + (v % 2) * 2;
      this.fan(n, 1.2, a, { kind: 'crescent', speed: 7.6, size: 1.3, color: v % 2 ? pal.a : pal.b, spin: 7 });
      this.fan(n - 1, 1.2, a, { kind: 'orb', speed: 5.0, size: 0.95, color: pal.c });
      this.sfx('fan'); G.fx.ring(this.x, this.bobY, this.z, pal.b, 4, 0.35);
      if (v % 2) this.glide(rnd(-6, 6), rnd(-8, -4.5), 0.7);
      yield 0.8 / this.rate;
    }
    yield 0.5;
  }

  *atk_lightRain() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast(); this.glide(0, -7, 0.8); yield 0.6;
    const n = 15 + (this.enrage ? 4 : 0);
    for (let i = 0; i < n; i++) {
      let x, z;
      if (i % 3 === 0) { x = P.x + rnd(-0.5, 0.5); z = P.z + rnd(-0.5, 0.5); }
      else { const a = rnd(0, TAU), r = rnd(1.6, 5.5); x = P.x + Math.cos(a) * r; z = P.z + Math.sin(a) * r; }
      this.zone(x, z, 1.75, { warn: 1.0, dur: 0.3, color: pal.b });
      this.sfx('telegraph', { pan: G.audio.pan(x) });
      yield 0.23 / this.rate;
    }
    yield 1.5;
  }

  *atk_rapierThrust() {
    const G = this.G, pal = this.pal;
    this.cast(); const passes = 3 + (this.enrage ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      this.glide(rnd(-6.5, 6.5), rnd(-7.5, -3.5), 0.5); yield 0.55;
      const a = this.aim(), warn = 0.85;
      this.beam(this.x, this.z, a, { w: 1.5, len: 30, warn, dur: 0.22, color: pal.b });
      if (p >= 1) { this.beam(this.x, this.z, a - 0.4, { w: 1.2, len: 30, warn, dur: 0.22, color: pal.a }); this.beam(this.x, this.z, a + 0.4, { w: 1.2, len: 30, warn, dur: 0.22, color: pal.a }); }
      this.sfx('beam_charge');
      yield warn;
      this.kick(Math.cos(a) * 1.8, Math.sin(a) * 1.8);
      this.ring(12, { a0: a, kind: 'orb', speed: 4.6, size: 0.9, color: pal.a });
      yield 0.6;
    }
    yield 0.5; void G;
  }

  *atk_moonwheel() {
    const G = this.G, pal = this.pal;
    this.cast(); this.glide(0, -6, 0.8); yield 0.7;
    for (let r = 0; r < 7; r++) {
      const cres = r % 2 === 1;
      this.ring(20, { a0: r * 0.21 + (cres ? 0 : 0.08), kind: cres ? 'crescent' : 'orb', speed: 5.0, size: cres ? 1.15 : 0.95, color: cres ? pal.a : pal.b, accel: 0.5, maxS: 8, spin: cres ? 5 : 0 });
      this.sfx('orb'); G.fx.ring(this.x, this.bobY, this.z, pal.b, 5, 0.4);
      yield 0.58 / this.rate;
    }
    yield 1.2;
  }

  // ═════════════════════ UMBRA — 그믐달 · 어둠 · 음침함 ═════════════════════
  *atk_shadowOrbs() {
    const G = this.G, pal = this.pal;
    this.cast('cast'); this.glide(rnd(-4, 4), -6.5, 0.8); yield 0.6;
    const n = this.enrage ? 7 : 6;
    for (let i = 0; i < n; i++) {
      this.shoot({ kind: 'orb', a: (i * TAU) / n + rnd(-0.2, 0.2), speed: 4.3, size: 1.55, hr: 0.44, color: pal.a, homing: 1.25, homeT: 3.4, trail: true, life: 7.5 });
      this.sfx('dark'); yield 0.45;
    }
    for (let k = 0; k < 5; k++) {
      this.fan(3, 0.55, this.aim(), { kind: 'shard', speed: 7.2, size: 1.15, color: pal.c });
      this.sfx('orb'); yield 0.6;
    }
    yield 1.4; void G;
  }

  *atk_trickDecoys() {
    const G = this.G, P = G.player;
    this.cast('teleport'); this.alphaT = 0; yield 0.3;
    const slots = shuffle([-6.8, -3.4, 0, 3.4, 6.8]).slice(0, 4);
    const zs = slots.map(() => rnd(-8, -4.5));
    this.x = this.tx = slots[0]; this.z = this.tz = zs[0]; this.alphaT = 1; this.sfx('teleport');
    G.fx.ring(this.x, 3.5, this.z, 0xffffff, 6, 0.5);
    for (let i = 1; i < slots.length; i++) this.spawnDecoy(slots[i], zs[i], 5.2, 0.7 + i * 0.28);
    this.bark('umbra'); yield 1.1;
    for (let v = 0; v < 4; v++) {
      this.fan(5, 1.1, this.aim(), { kind: 'orb', speed: 5.8, size: 1.1, color: this.pal.a });
      this.sfx('dark'); yield 1.15 / this.rate;
    }
    yield 0.6; void P;
  }

  *atk_eclipseVeil() {
    const G = this.G, P = G.player, pal = this.pal;
    this.cast('veil'); G.setVeil(true); G.ui.warn('월식의 장막 — 시야가 가려집니다', 1700); yield 1.1;
    const waves = this.enrage ? 8 : 7;
    for (let w = 0; w < waves; w++) {
      const gc = clamp(P.x + rnd(-3, 3), -7, 7);
      for (let x = -10; x <= 10; x += 1.55) if (Math.abs(x - gc) > 1.9) this.shoot({ x, z: -11, a: Math.PI / 2, speed: 6.2, kind: 'orb', size: 1.2, color: pal.a });
      if (w % 2 === 1) {
        const side = w % 4 === 1 ? -1 : 1, gz = clamp(P.z + rnd(-2.5, 2.5), -6, 8);
        for (let z = -9; z <= 10; z += 1.55) if (Math.abs(z - gz) > 1.9) this.shoot({ x: side * 12, z, a: side < 0 ? 0 : Math.PI, speed: 5.6, kind: 'orb', size: 1.2, color: pal.b });
      }
      this.sfx('dark'); yield 1.3 / this.rate;
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
      }
    }
    yield 1.2;
  }

  // ═════════════════════ LUNA — 보름달 · 광기 · 달 그 자체 ═════════════════════
  *atk_lunaticSpiral() {
    const pal = this.pal;
    this.cast(); this.glide(0, -5.5, 0.6); yield 0.7;
    const arms = 5, dur = 7.4;
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
    const throws = this.enrage ? 3 : 2;
    for (let i = 0; i < throws; i++) {
      const tx = clamp(P.x, -8, 8), tz = clamp(P.z, -7, 8.5), dur = 1.4;
      this.zone(tx, tz, 3.5, {
        warn: dur, dur: 0.4, color: pal.a,
        onBoom: (zz) => {
          const n = 22, a0 = rnd(0, TAU);
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
      this.fan(7, 1.6, this.aim() + rnd(-0.2, 0.2), { kind: 'orb', speed: 5.6, size: 1.1, color: w % 2 ? pal.a : pal.b });
      this.ring(10, { kind: 'crescent', speed: 3.8, size: 1.05, color: pal.c, spin: 6 });
      this.sfx('fan', { pitch: 1.2 }); yield 0.72 / this.rate;
    }
    yield 1.5;
  }

  *atk_trinityBarrage() {
    const G = this.G;
    this.cast(); this.glide(0, -6, 0.7); yield 0.7;
    const rounds = this.enrage ? 3 : 2;
    for (let r = 0; r < rounds; r++) {
      this.formFlash(0);
      for (let k = 0; k < 3; k++) { this.fan(9, 1.55, this.aim(), { kind: 'crescent', speed: 8.2, size: 1.25, color: PAL.lumina.b, spin: 8 }); this.sfx('fan'); yield 0.38; }
      this.formFlash(1);
      for (let k = 0; k < 4; k++) { this.shoot({ kind: 'orb', a: this.aim() + rnd(-0.8, 0.8), speed: 4.2, size: 1.5, hr: 0.42, color: PAL.umbra.a, homing: 1.35, homeT: 3, trail: true, life: 6.5 }); this.sfx('dark'); yield 0.26; }
      this.formFlash(2);
      this.ring(26, { kind: 'orb', speed: 6.0, size: 1.0, color: PAL.luna.a }); this.sfx('orb'); yield 0.32;
      this.ring(26, { a0: 0.12, kind: 'orb', speed: 5.4, size: 1.0, color: PAL.luna.b }); this.sfx('orb');
      yield 1.0 / this.rate;
    }
    yield 1.0; void G;
  }

  *atk_moonfall() {
    const G = this.G, pal = this.pal;
    this.cast('moon_throw'); G.ui.warn('만월 낙하', 1300); this.sfx('laugh_big'); yield 0.9;
    for (let i = 0; i < 22; i++) {
      const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 9.2;
      this.zone(Math.cos(a) * r, Math.sin(a) * r, 1.95, {
        warn: 1.2, dur: 0.3, color: i % 2 ? pal.a : pal.b,
        onBoom: (zz) => { for (let k = 0; k < 6; k++) G.bullets.spawn({ owner: 'boss', x: zz.x, z: zz.z, a: rnd(0, TAU), speed: 4.6 * this.spd, kind: 'shard', size: 1.0, color: pal.c }); },
      });
      this.sfx('telegraph'); yield 0.17;
    }
    yield 2.2;
  }
}
