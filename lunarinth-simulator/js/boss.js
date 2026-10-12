// 보스 공용 기반 클래스. 동방식 "단계(step)" 구조:
//   통상(nonspell) / 스킬(spell) / 라스트(last) 가 번갈아 이어지고, 단계마다 체력바와 제한시간이 따로 있다.
//   스킬 단계는 시작 전에 이름이 선언(declare)되고, 그동안 보스는 무적이며 탄이 지워진다.
//
// 공격은 제너레이터로 작성한다: `yield 초` = 그 시간만큼 대기, `yield 0` = 다음 프레임에 경과 dt를 받고 재개.
// 서브클래스(js/bosses/*.js)는 `atk_<이름>` 제너레이터와 `static DEF` 를 정의한다.
import * as THREE from '../vendor/three.module.min.js';
import { BARKS } from './lore.js';
import { ARENA_R } from './scene.js';

export const TAU = Math.PI * 2;
export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 플레이어의 실효 화력은 대략 초당 85. 루나린스 외 보스의 hp 는 이 계수로 한 번 더 곱해진다 (실효 체력 = hp × hpMul × HP_K × 난이도 hp).
export const HP_K = 2.2;

export class Boss {
  /**
   * def: { id, name, epithet, h, hitR, pal:{a,b,c,glow}, forms:{id:{label,sub,tint,theme,music,pal}}, steps:[...], barkKey }
   * step: { kind:'nonspell'|'spell'|'last', tag, name, form, hp, time, attacks:[...], idle, ultMode, pre?, transform? }
   */
  constructor(scene, T, bossTex, aspect, G, def) {
    this.G = G; this.T = T; this.def = def;
    this.aspect = aspect;
    this.h = def.h;
    this.mat = new THREE.SpriteMaterial({ map: bossTex, transparent: true, depthWrite: false });
    this.spr = new THREE.Sprite(this.mat); this.spr.renderOrder = 5; scene.add(this.spr);
    this.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
    this.aura.renderOrder = 4; scene.add(this.aura);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.7 }));
    this.shadow.position.y = 0.04; scene.add(this.shadow);
    // 방어막 (리젝트 등)
    this.shieldSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, color: 0xc89bff }));
    this.shieldSpr.renderOrder = 8; scene.add(this.shieldSpr);
    this.decoys = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.SpriteMaterial({ map: bossTex, transparent: true, depthWrite: false, color: def.decoyColor ?? 0xb8c8ff });
      const s = new THREE.Sprite(m); s.renderOrder = 5; s.visible = false; scene.add(s);
      this.decoys.push({ active: false, spr: s, mat: m });
    }
    this.scene = scene;
    this.reset();
  }

  get D() { return this.G.run.diff; }
  get step() { return this.def.steps[this.stepIdx]; }
  get formId() { return this.step ? this.step.form : this.def.steps[0].form; }
  get form() { return this.def.forms[this.formId]; }
  get pal() { return (this.step && this.step.pal) || this.form.pal || this.def.pal; }
  get stepCount() { return this.def.steps.length; }
  /** 현재 체력 비율 (현재 단계 기준) */
  get ratio() { return this.hpMax > 0 ? Math.max(0, this.hp / this.hpMax) : 0; }

  /** def.allSteps 가 있으면 난이도(minLv)와 기체(variant)에 맞춰 이번 판의 단계 목록을 만든다 */
  buildSteps() {
    const def = this.def; if (!def.allSteps) return;
    const lv = this.G.run && this.G.run.diff ? this.G.run.diff.lv : 1, cid = this.G.run && this.G.run.char ? this.G.run.char.id : 'claire';
    def.steps = def.allSteps.filter((s) => (s.minLv ?? 0) <= lv).map((s) => (s.variant ? { ...s, ...(s.variant[cid] || s.variant.claire) } : s));
  }

  reset() {
    this.buildSteps();
    this.stepIdx = 0; this.hp = 1; this.hpMax = 1; this.timeLeft = 0; this.state = 'idle'; // idle|declare|run|between|dead
    this.alive = true; this.vulnerable = false; this.visible = false; this.shield = false; this.shieldV = 0;
    this.bobY = 4; this.x = 0; this.z = -6.5; this.tx = 0; this.tz = -6.5; this.tk = 4;
    this.hitR = this.def.hitR; this.scaleK = 1; this.scaleT = 1;
    this.flash = 0; this.alpha = 0; this.alphaT = 1; this.kickX = 0; this.kickZ = 0;
    this.routine = null; this.wait = 0; this.accDt = 0; this.idleT = 1.2; this.bag = []; this.last = null;
    this.enrage = false; this.spd = 1; this.rate = 1; this.formPulse = 0; this.cur = null; this.declT = 0; this.stepT = 0;
    this.analysis = 0;
    for (const d of this.decoys) { d.active = false; d.spr.visible = false; }
    this.cancelAttack();
  }

  /** 스테이지 시작: 보스를 화면에 등장시킨다 (전투는 startStep 으로 시작) */
  appear() { this.reset(); this.visible = true; this.alpha = 0; this.alphaT = 1; this.x = this.tx = 0; this.z = this.tz = -6.5; }

  /** 체력이 줄수록 강해지는 보스는 루나린스의 라스트 스킬뿐이다 (그 외에는 발악기 없음). grow: 0~1 */
  applyStats() {
    const D = this.D, g = this.grow || 0;
    this.spd = D.spd * (1 + g * 0.2) * (this.step.spd ?? 1);
    this.rate = D.rate * (1 + g * 0.45) * (this.step.rate ?? 1);
    this.idleBase = (this.step.idle ?? 1.2) * (1 - g * 0.3);
  }

  /** 난이도 반영 개수 */
  n(k, min = 1) { return Math.max(min, Math.round(k * this.D.cnt)); }
  /** 난이도 단계(0~3)가 lv 이상인지 — 하드/매드니스에서만 추가되는 패턴용 */
  lv(l) { return this.D.lv >= l; }

  // ───── 단계 진행 ─────
  startStep(i, { quick = false } = {}) {
    const G = this.G;
    this.stepIdx = i; const st = this.step;
    this.enrage = false; this.grow = 0; this.bag = []; this.last = null; this.routine = null; this.cur = null; this.shield = false;
    this.cancelAttack();
    this.hpMax = st.hp * this.D.hp * (this.def.hpMul ?? 1) * (this.def.id === 'lunarinth' ? 1 : HP_K); this.hp = this.hpMax; this.timeLeft = st.time; this.stepT = 0;
    this.grow = 0; this._growT = 0;
    this.applyStats();
    this.vulnerable = false; this.state = 'declare';
    G.bullets.clearBoss(G.fx); G.zones.clear(); G.beams.clear(); G.flyers.clear();
    this.glide(0, -6.5, 0.8);
    this.declT = quick ? 0.5 : st.kind === 'nonspell' ? 1.0 : st.kind === 'ultimate' ? 2.4 : 1.7;
    if (this.onStepBegin) this.onStepBegin(st, i);
    G.onStepStart(this, st, i, quick);
  }

  beginRun() {
    // 얼티메이트 · 버티기(endure) 단계의 보스는 무적이다
    const inv = this.step.kind === 'ultimate' || !!this.step.endure;
    this.state = 'run'; this.vulnerable = !inv; this.shield = inv && !this.step.endure;
    this.idleT = inv ? 0 : 0.6; this.stepT = 0;
    this.G.ui.setBossTimer(this.timeLeft);
  }

  endStep(reason) {
    if (this.state === 'between' || this.state === 'dead') return;
    this.state = 'between'; this.vulnerable = false; this.cancelAttack(); this.shield = false;
    this.G.onStepEnd(this, reason, this.stepIdx);
  }

  cancelAttack() {
    this.routine = null;
    for (const d of this.decoys) { if (d.active) this.killDecoy(d, false); }
    this.G.setVeil(false);
    if (this.onCancel) this.onCancel();
  }

  // ───── 공격 보조 ─────
  aim(fx = this.x, fz = this.z) { return Math.atan2(this.G.player.z - fz, this.G.player.x - fx); }
  /** 플레이어의 이동 방향을 예측해 겨냥한다 (leadT: 도달 예상 시간) */
  lead(leadT = 0.6, fx = this.x, fz = this.z) {
    const P = this.G.player;
    const tx = clamp(P.x + (P.vx || 0) * leadT, -ARENA_R, ARENA_R), tz = clamp(P.z + (P.vz || 0) * leadT, -ARENA_R, ARENA_R);
    return Math.atan2(tz - fz, tx - fx);
  }
  shoot(o) {
    return this.G.bullets.spawn({ owner: 'boss', x: this.x, z: this.z, ...o, speed: (o.speed ?? 6) * this.spd });
  }
  ring(n, o = {}) { const a0 = o.a0 ?? rnd(0, TAU); for (let i = 0; i < n; i++) this.shoot({ ...o, a: a0 + (i * TAU) / n }); }
  fan(n, spread, a, o = {}) { for (let i = 0; i < n; i++) this.shoot({ ...o, a: a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) }); }
  /** 한 점에서 반지름 r 인 정다각형(별) 외곽선을 따라 탄을 배치한다. 중심 기준 바깥으로 퍼진다. */
  poly(cx, cz, sides, r, rot, perEdge, o = {}) {
    const pts = []; for (let i = 0; i < sides; i++) pts.push([cx + Math.cos(rot + (i * TAU) / sides) * r, cz + Math.sin(rot + (i * TAU) / sides) * r]);
    for (let i = 0; i < sides; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % sides];
      for (let k = 0; k < perEdge; k++) {
        const t = k / perEdge, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        this.G.bullets.spawn({ owner: 'boss', ...o, x, z, a: o.a ?? Math.atan2(z - cz, x - cx), speed: (o.speed ?? 4) * this.spd });
      }
    }
  }
  /** 점 (x0,z0)에서 (x1,z1)까지 count개의 탄을 직선으로 배치 (hold 후 방출 가능) */
  line(x0, z0, x1, z1, count, o = {}) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const b = this.G.bullets.spawn({ owner: 'boss', ...o, x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, a: o.a ?? 0, speed: (o.speed ?? 4) * this.spd });
      if (b) out.push(b);
    }
    return out;
  }
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
  /** 대기 시간 보정: 어려울수록 짧게 */
  t(sec) { return sec / this.rate; }

  bark(kind) { this.barkFor(kind || this.def.barkKey || this.formId); }
  barkFor(kind) {
    const list = BARKS[kind]; if (!list) return;
    const [sx, sy] = this.G.world.project(this.x, this.bobY + this.h * 0.67 * this.scaleK, this.z);
    this.G.ui.bark(list[(Math.random() * list.length) | 0], sx, sy);
  }
  cast(sfxName = 'cast', barkP = 0.55) {
    this.sfx(sfxName);
    this.G.fx.ring(this.x, this.bobY, this.z, this.pal.glow, 6, 0.55);
    if (Math.random() < barkP) this.bark();
  }
  formFlash() { this.formPulse = 1; this.G.world.beat(0.8); this.sfx('cast'); this.G.fx.ring(this.x, this.bobY, this.z, this.pal.glow, 8, 0.5); }

  // ───── 코루틴 실행기 ─────
  pickAttack() {
    const st = this.step;
    if (!this.bag.length) {
      this.bag = shuffle([...st.attacks]);
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.last) this.bag.unshift(this.bag.pop());
    }
    const name = this.bag.pop(); this.last = name; this.cur = name;
    this.routine = this['atk_' + name]();
    this.wait = 0; this.accDt = 0;
    this.G.stats.attacks++;
  }

  update(dt) {
    if (!this.visible) return;
    // 이동 (임계 감쇠)
    const k = 1 - Math.exp(-dt * this.tk);
    this.x += (this.tx - this.x) * k; this.z += (this.tz - this.z) * k;
    this.kickX *= Math.exp(-dt * 7); this.kickZ *= Math.exp(-dt * 7);
    this.flash = Math.max(0, this.flash - dt);
    this.formPulse = Math.max(0, this.formPulse - dt * 2);
    this.alpha += (this.alphaT - this.alpha) * (1 - Math.exp(-dt * 6));
    this.shieldV += ((this.shield ? 1 : 0) - this.shieldV) * (1 - Math.exp(-dt * 10));

    if (this.state === 'declare') {
      this.declT -= dt;
      if (this.declT <= 0) this.beginRun();
    } else if (this.state === 'run') {
      this.stepT += dt; this.timeLeft -= dt;
      this.analysis = Math.min(100, this.analysis + dt * (this.def.analysisRate || 0));
      if (this.def.id === 'lunarinth' && this.step.kind === 'last') {
        this._growT -= dt;
        if (this._growT <= 0) {
          this._growT = 0.3; this.grow = clamp(1 - this.ratio, 0, 1); this.applyStats();
          if (!this.enrage && this.grow > 0.6) { this.enrage = true; this.G.onEnrage(this); }
        }
      }
      if (this.timeLeft <= 0) { this.endStep('timeout'); return; }
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
      } else {
        this.idleT -= dt;
        if (this.idleT > 0.5 && Math.random() < dt * 0.6) this.glide(rnd(-6.5, 6.5), rnd(-8, -4), rnd(0.9, 1.5));
        if (this.idleT <= 0) this.pickAttack();
      }
    }
    this.updateDecoys(dt);
  }

  // ───── 피격 ─────
  /** isUlt: 궁극기 틱 (소리/연출을 가볍게) */
  damage(amount, G, x, z, isUlt = false) {
    if (!this.alive || amount <= 0) return;
    if (!this.vulnerable || this.shield) {
      if (!isUlt) G.fx.burst(x, 1.6, z, 3, { color: this.shield ? 0xc89bff : 0xffffff, speed: 2, size: 0.3, life: 0.3 });
      if (this.shield && !isUlt) G.audio.sfx.play('decoy_pop', { pan: G.audio.pan(this.x), vol: 0.25, pitch: 1.6 });
      return;
    }
    this.hp -= amount; this.flash = 0.06;
    G.stats.damage += amount;
    if (!isUlt) {
      G.audio.sfx.play(amount > 15 ? 'hit_boss_heavy' : 'hit_boss', { pan: G.audio.pan(this.x), pitch: rnd(0.9, 1.2) });
      G.fx.burst(x, 1.6, z, 3, { color: [0xffffff, this.pal.b], speed: 3, size: 0.5, life: 0.45 });
    }
    if (this.hp <= 0) { this.hp = 0; G.ui.setBoss(0); this.endStep('broken'); return; }
    G.ui.setBoss(this.ratio);
  }

  // ───── 환영 (분신) ─────
  spawnDecoy(x, z, life, fireOffset) {
    const d = this.decoys.find((q) => !q.active); if (!d) return null;
    Object.assign(d, { active: true, x, z, hp: 64, life, t: 0, fire: fireOffset, alpha: 0 });
    d.spr.visible = true; this.G.audio.sfx.play('teleport', { pan: this.G.audio.pan(x), vol: 0.7 });
    this.G.fx.ring(x, this.h * 0.55, z, this.def.decoyColor ?? 0x9bb8ff, 6, 0.5);
    return d;
  }
  killDecoy(d, pop = true) {
    d.active = false; d.spr.visible = false;
    if (pop) {
      this.G.audio.sfx.play('decoy_pop', { pan: this.G.audio.pan(d.x) });
      this.G.fx.burst(d.x, this.h * 0.55, d.z, 26, { color: [this.def.decoyColor ?? 0x9bb8ff, 0xffffff, this.pal.a], speed: 6, size: 0.9, life: 0.9 });
      this.G.fx.ring(d.x, this.h * 0.55, d.z, 0xbfd0ff, 7, 0.5);
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
        const a = Math.atan2(this.G.player.z - d.z, this.G.player.x - d.x), n = this.n(7, 3);
        for (let i = 0; i < n; i++) this.G.bullets.spawn({ owner: 'boss', x: d.x, z: d.z, a: a + (i / (n - 1) - 0.5) * 1.3, speed: 5.6 * this.spd, kind: 'orb', size: 1.0, color: this.def.decoyBullet ?? 0x8fb0ff });
        this.G.audio.sfx.play('orb', { pan: this.G.audio.pan(d.x) });
      }
    }
  }

  // ───── 렌더 ─────
  render(dt, t) {
    this.scaleK += (this.scaleT - this.scaleK) * (1 - Math.exp(-dt * 2.2));
    const sc = this.scaleK, h = this.h * sc, w = h * this.aspect;
    this.bobY = h * 0.6 + Math.sin(t * 1.6) * 0.26;
    const px = this.x + this.kickX, pz = this.z + this.kickZ;
    const visible = this.visible && this.alpha > 0.01;
    this.spr.visible = visible;
    this.spr.position.set(px, this.bobY, pz);
    this.spr.scale.set(w, h, 1);
    const tint = (this.step && this.step.tint) || this.form.tint || [1, 1, 1];
    const f = this.flash > 0 ? 1.9 : 1;
    this.mat.color.setRGB(tint[0] * f, tint[1] * f, tint[2] * f);
    this.mat.opacity = this.alpha;
    // 오라
    const as = (13 + Math.sin(t * 2) * 0.8) * sc * (h / (6.6 * sc));
    this.aura.visible = visible; this.aura.position.set(px, this.bobY, pz - 0.2); this.aura.scale.set(as, as, 1);
    this.aura.material.color.setHex(this.pal.glow); this.aura.material.opacity = (0.28 + 0.12 * Math.sin(t * 3) + this.formPulse * 0.3) * this.alpha;
    // 그림자
    this.shadow.visible = visible; this.shadow.position.x = px; this.shadow.position.z = pz;
    const ss = (h / 6.6) * 4.2 * (1 - (this.bobY - h * 0.55) * 0.04); this.shadow.scale.set(ss, 1, ss * 0.8);
    // 방어막
    this.shieldSpr.visible = visible && this.shieldV > 0.02;
    if (this.shieldSpr.visible) {
      const s = h * 0.95 * (1 + Math.sin(t * 6) * 0.02);
      this.shieldSpr.position.set(px, this.bobY, pz + 0.1); this.shieldSpr.scale.set(s, s, 1);
      this.shieldSpr.material.opacity = this.shieldV * 0.85; this.shieldSpr.material.rotation = t * 0.8;
    }
    // 분신
    for (const d of this.decoys) {
      if (!d.active) continue;
      d.spr.position.set(d.x, h * 0.6 + Math.sin(t * 1.6 + d.x) * 0.26, d.z);
      d.spr.scale.set(w, h, 1);
      d.mat.opacity = d.alpha * (0.55 + 0.3 * Math.sin(t * 17 + d.x * 3));
    }
    if (this.renderExtra) this.renderExtra(dt, t, px, pz, visible);
  }
}
