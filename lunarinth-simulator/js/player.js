// 플레이어: 성검사 클레르. 동방식 조작 + 로그라이크 성장.
//   Z 샷(연사) / X 성광(폭탄) / C 액티브 스킬 / Shift 저속(피탄점 표시) / 방향키 이동
// 능력치는 아이템 · 변신 · 일시 버프를 합쳐 recalc() 로 다시 계산한다. 파워(P) 0.00~4.00 에 따라 탄 줄이 늘어난다.
import * as THREE from '../vendor/three.module.min.js';
import { ARENA_R } from './scene.js';
import { ITEM_BY_ID, TRANSFORMS } from './items.js';

export const PLAYER = {
  speed: 8.6, focusSpeed: 3.6, hr: 0.075, grazeR: 0.5,
  shotCd: 0.085,
  hitInv: 1.7, respawnInv: 2.5,
  maxUlt: 3, ultDur: 2.5, ultTotal: 280, ultInv: 4.2,
  bombStart: 2, bombMax: 6, hpCap: 12,
};

const FWD = -Math.PI / 2; // 보스 쪽 (−z)
const TAU = Math.PI * 2;
const BASE = { dmg: 1, rate: 1, shotSpeed: 1, range: 1, speed: 1, size: 1, luck: 0, magnet: 2.2, crit: 0, homing: 0, pierce: 0, bounce: 0, split: 0, explode: 0, wave: 0, chain: 0, poison: 0, leech: 0, streams: 0, back: 0, side: 0, diag: 0, ring: 0, slowAura: 0, bombMax: 0 };
const OPT_LOOK = {
  sun: { col: 0xffb040, tex: 'orb', s: 0.9 }, moon: { col: 0xd9c8ff, tex: 'crescent', s: 1.0 }, star: { col: 0xcfe0ff, tex: 'spark', s: 1.0 },
  lemon: { col: 0xffe14a, tex: 'orb', s: 0.9 }, book: { col: 0x9fe8c4, tex: 'pagebullet', s: 1.0 }, puppet: { col: 0xff8a9a, tex: 'mob_doll', s: 1.2 },
  infinity: { col: 0x5fe8c0, tex: 'orb', s: 0.85 }, clone: { col: 0xffe08a, tex: 'crescent', s: 1.6 }, moonGuard: { col: 0xe3d6ff, tex: 'crescent', s: 1.1 },
};

export class Player {
  constructor(scene, T, frames) {
    this.frames = frames;
    this.T = T; this.scene = scene;
    this.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }));
    this.spr.renderOrder = 6; scene.add(this.spr);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.shadow.position.y = 0.045; scene.add(this.shadow);
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
    this.core.renderOrder = 30; scene.add(this.core);
    this.dotRim = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, depthTest: false, color: 0xff3b6b, opacity: 0.9 }));
    this.dotRim.renderOrder = 29; scene.add(this.dotRim);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff, opacity: 0 }));
    this.glow.renderOrder = 5; this.glow.visible = false; scene.add(this.glow);
    this.focusRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xfff1c9, opacity: 0 }));
    this.focusRing.renderOrder = 28; scene.add(this.focusRing);
    this.shieldSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xe8e0ff, opacity: 0 }));
    this.shieldSpr.renderOrder = 27; scene.add(this.shieldSpr);
    this.chargeRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe08a, opacity: 0 }));
    this.chargeRing.renderOrder = 27; scene.add(this.chargeRing);
    // 궁극기(성광): 성검의 빛줄기 / 레이저 무기
    const beamMat = (c) => new THREE.MeshBasicMaterial({ map: T.beam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: c, opacity: 0 });
    this.ultBeam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), beamMat(0xffe9a6));
    this.ultBeam.position.y = 0.09; this.ultBeam.renderOrder = -6; this.ultBeam.visible = false; scene.add(this.ultBeam);
    this.laser = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), beamMat(0xff8aa8));
    this.laser.position.y = 0.95; this.laser.renderOrder = 9; this.laser.visible = false; scene.add(this.laser);
    // 옵션 스프라이트 풀
    this.optSpr = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.renderOrder = 7; s.visible = false; scene.add(s); return s; });
    this.aspect = 192 / 256; this.height = 2.1;
    this.reset();
  }

  setSprite(frames, aspect, height = 2.6) { this.frames = frames; this.aspect = aspect; this.height = height; }

  /** 런 시작 시 초기화. hp: 시작 체력 */
  reset(hp = 5) {
    this.x = 0; this.z = 6.2; this.baseHp = hp; this.maxHp = hp; this.hp = hp; this.ults = PLAYER.bombStart;
    this.inv = 0; this.shotCd = 0; this.face = 1; this.walkT = 0; this.invertT = 0; this.slowT = 0;
    this.vx = 0; this.vz = 0; this.sealT = 0;
    this.moving = false; this.alive = true; this.focus = false; this.focusK = 0;
    this.ultT = 0; this.ultTick = 0; this.ultR = 0; this.ultMode = 'normal'; this.ultAge = 0;
    this.spr.visible = this.shadow.visible = this.core.visible = this.dotRim.visible = true;
    this.ultBeam.visible = false; this.laser.visible = false;
    // 로그라이크 상태
    this.items = []; this.tags = {}; this.transforms = []; this.active = null; this.optDefs = [];
    this.coins = 0; this.keys = 1; this.power = 0; this.score = 0; this.kills = 0; this.killStack = 0; this.leechN = 0;
    this.buffs = {}; this.roomShield = false; this.reviveUsed = false; this.charge = 0; this.shotN = 0; this.laserTick = 0;
    this.recalc();
  }
  /** 방 진입마다: 방마다 한 번 막는 베일 갱신 */
  onEnterRoom() { this.roomShield = !!this.flags.roomShield; this.killStack = 0; }

  get safe() { return this.inv > 0 || this.ultT > 0 || !this.alive || (this.buffs.barrier > 0 && false); }
  get ultActive() { return this.ultT > 0; }
  get plv() { return Math.min(4, Math.floor(this.power + 1e-6)); }
  magnetR() { return this.st ? this.st.magnet : 2.2; }

  // ───── 능력치 ─────
  recalc() {
    const st = { ...BASE }, mul = {}, flags = {}, shot = { kind: 'shard' }, opts = [];
    if (this.buffs && this.buffs.clone > 0) opts.push('clone');
    let hp = 0;
    const apply = (src) => {
      if (src.stats) for (const [k, v] of Object.entries(src.stats)) st[k] = (st[k] ?? 0) + v;
      if (src.mul) for (const [k, v] of Object.entries(src.mul)) mul[k] = (mul[k] ?? 1) * v;
      if (src.flags) for (const [k, v] of Object.entries(src.flags)) flags[k] = Math.max(flags[k] ?? 0, v);
      if (src.shot) Object.assign(shot, src.shot);
      if (src.options) opts.push(...src.options);
      if (src.hp) hp += src.hp;
    };
    for (const id of this.items) apply(ITEM_BY_ID[id]);
    for (const t of this.transforms) apply(TRANSFORMS[t]);
    for (const [k, v] of Object.entries(mul)) st[k] *= v;
    // 일시 버프
    if (this.buffs.berserk > 0) { st.dmg *= 1.8; st.rate *= 1.5; }
    if (this.buffs.lens > 0) st.homing += 4;
    if (this.buffs.moonMask > 0) { st.dmg *= 1.6; st.speed += 0.2; st.size += 0.5; shot.kind = 'crescent'; st.pierce += 2; }
    if (flags.lastStand && this.hp === 1) st.dmg *= flags.lastStand;
    if (flags.killStack) st.dmg += Math.min(2, this.killStack * 0.05);
    st.dmg = Math.max(0.3, st.dmg); st.rate = Math.max(0.35, st.rate); st.speed = Math.max(0.5, st.speed); st.size = Math.max(0.4, st.size); st.range = Math.max(0.4, st.range);
    this.st = st; this.flags = flags; this.shotDef = shot;
    const newMax = Math.max(1, Math.min(PLAYER.hpCap, this.baseHp + hp));
    this.maxHp = newMax; this.hp = Math.min(this.hp ?? newMax, newMax);
    this.bombCap = PLAYER.bombMax + (st.bombMax || 0); this.ults = Math.min(this.ults, this.bombCap);
    this._setOptions(opts);
  }
  _setOptions(list) {
    const keep = this.optDefs || [];
    this.optDefs = list.slice(0, this.optSpr.length).map((type, i) => keep[i] && keep[i].type === type ? keep[i] : { type, x: this.x, z: this.z, cd: Math.random() * 0.4, ang: (i * TAU) / Math.max(1, list.length), t: 0, tx: null });
  }

  heal(n) { const was = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); return this.hp - was; }
  addPower(v) { const was = this.plv; this.power = Math.max(0, Math.min(4, this.power + v)); return this.plv !== was; }

  /** 아이템 획득. 변신 달성 시 transform id 를 돌려준다 */
  addItem(item, G) {
    if (item.active) {
      const old = this.active; this.active = { id: item.id, skill: item.active, charge: 0, max: G.skills.charge(item.active) };
      this.active.charge = this.active.max; // 처음 집으면 바로 쓸 수 있다
      return { swapped: old ? old.id : null };
    }
    this.items.push(item.id);
    let tf = null;
    for (const t of item.tags || []) {
      this.tags[t] = (this.tags[t] || 0) + 1;
      if (this.tags[t] >= 3 && !this.transforms.includes(t) && TRANSFORMS[t]) { this.transforms.push(t); tf = t; }
    }
    const was = this.maxHp;
    this.recalc();
    if (this.maxHp > was) this.hp += this.maxHp - was;
    if (item.onGet) item.onGet(G, this);
    if (tf && TRANSFORMS[tf].onGet) TRANSFORMS[tf].onGet(G, this);
    this.hp = Math.min(this.hp, this.maxHp); this.ults = Math.min(this.ults, this.bombCap);
    return { transform: tf };
  }

  update(dt, input, G, canShoot = true) {
    this.G = G;
    if (!this.alive) return;
    this.inv = Math.max(0, this.inv - dt); this.shotCd = Math.max(0, this.shotCd - dt);
    this.invertT = Math.max(0, this.invertT - dt); this.sealT = Math.max(0, this.sealT - dt);
    // 버프 시간
    let changed = false;
    for (const k of Object.keys(this.buffs)) { if (this.buffs[k] > 0) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) { this.buffs[k] = 0; changed = true; } } }
    if (changed) this.recalc();
    const ox = this.x, oz = this.z;
    this.focus = input.focusHeld;
    this.focusK += ((this.focus ? 1 : 0) - this.focusK) * (1 - Math.exp(-dt * 18));

    // 기믹: 조작 반전 / 입력 지연
    let mv = input.move(this.invertT > 0 || G.zones.invert);
    this._mvq = this._mvq || []; this._mvq.push([G.t, mv]); while (this._mvq.length > 90) this._mvq.shift();
    if (G.zones.lag) { const tt = G.t - 0.32; let pick = this._mvq[0][1]; for (const [t0, m] of this._mvq) { if (t0 <= tt) pick = m; else break; } mv = pick; }
    this.moving = mv[0] !== 0 || mv[1] !== 0;
    const bound = G.zones.bound ? 0.45 : 1;
    const sp = (this.focus ? PLAYER.focusSpeed : PLAYER.speed) * bound * (this.focus ? 1 : this.st.speed);
    this.x += mv[0] * sp * dt + (G.zones.pullX || 0) * dt; this.z += mv[1] * sp * dt + (G.zones.pullZ || 0) * dt;
    const l = Math.hypot(this.x, this.z), lim = ARENA_R - 0.55;
    if (l > lim) { this.x *= lim / l; this.z *= lim / l; }
    if (mv[0] !== 0) this.face = mv[0] > 0 ? 1 : -1;
    if (dt > 0) { const k = 0.35; this.vx += ((this.x - ox) / dt - this.vx) * k; this.vz += ((this.z - oz) / dt - this.vz) * k; }
    if (this.moving) this.lastMv = mv;

    // 성광(X)
    if (input.take('ult')) {
      if (G.sealed) G.ui.warn('성광이 봉인되어 있습니다', 900);
      else if (this.ults > 0 && this.ultT <= 0 && G.canUlt()) G.useUlt(false);
    }
    // 액티브 스킬(C)
    if (input.take('skill') && canShoot) {
      if (!this.active) G.ui.warn('액티브 스킬이 없습니다', 800);
      else if (G.sealed) G.ui.warn('지금은 쓸 수 없습니다', 800);
      else if (this.active.charge < this.active.max) { G.ui.warn('충전이 부족합니다', 700); G.audio.sfx.play('hurt', { vol: 0.2, pitch: 1.6 }); }
      else if (G.skills.use(this.active.skill)) { this.active.charge = 0; G.ui.refreshActive(this); }
    }

    // 샷
    const sd = this.shotDef, wantShot = canShoot && this.sealT <= 0 && input.shotHeld;
    if (sd.laser) this._laser(dt, G, wantShot);
    else {
      this.laser.visible = false;
      if (sd.charge) {
        if (wantShot) { this.charge = Math.min(1, this.charge + dt * 0.95 * this.st.rate); if (this.charge >= 1 && !this._chFull) { this._chFull = true; G.audio.sfx.play('gauge', { pitch: 1.6 }); } }
        else if (this.charge > 0.12) { this._fireCharge(G, this.charge); this.charge = 0; this._chFull = false; }
        else this.charge = 0;
      } else if (wantShot && this.shotCd <= 0) this._fire(G);
    }
    this._options(dt, G, wantShot);

    // 궁극기 지속
    if (this.ultT > 0) this._ultUpdate(dt, G);
    // 멈춘 초침: 주위의 적탄 감속
    if (this.st.slowAura) for (const b of G.bullets.list) if (b.active && b.owner === 'boss' && !b._slowed && (b.x - this.x) ** 2 + (b.z - this.z) ** 2 < 9) { b._slowed = true; b.vx *= 0.55; b.vz *= 0.55; if (b.baseS) b.baseS *= 0.55; }
    // 방벽 버프: 닿는 적탄 소거
    if (this.buffs.barrier > 0) for (const b of G.bullets.list) if (b.active && b.owner === 'boss' && (b.x - this.x) ** 2 + (b.z - this.z) ** 2 < 2.6 * 2.6) { G.fx.puff(b.x, 0.9, b.z, 0xd9c8ff, 1); G.bullets.kill(b); }
  }

  // ───── 사격 ─────
  bulletOpts(extra = {}) {
    const st = this.st, sd = this.shotDef, crit = Math.random() < st.crit;
    return {
      owner: 'player', kind: sd.kind, size: 0.8 * st.size * (crit ? 1.3 : 1), hr: 0.34 * st.size, speed: 32 * st.shotSpeed, life: 0.95 * st.range,
      homing: st.homing, homeT: 1.4, pierce: st.pierce, bounce: st.bounce, split: st.split, explode: st.explode, chain: st.chain, poison: st.poison,
      slowHit: !!this.flags.slowHit, crit, boomerang: !!sd.boomerang, wave: st.wave, orbitShot: !!sd.orbit, ...extra,
    };
  }
  _spawn(G, x, z, a, dmg, o = {}) {
    const B = G.bullets, opt = this.bulletOpts(o), color = opt.crit ? 0xff5a7a : (o.color ?? (this.buffs.moonMask > 0 ? 0xffb0e8 : 0xffe9a6));
    const b = B.spawn({ ...opt, x, z, a, dmg: dmg * (opt.crit ? 3 : 1), color, rot: -(a - FWD) });
    if (!b) return null;
    b.pierceLeft = opt.pierce; b.bounceLeft = opt.bounce; b.split = opt.split; b.explodeR = opt.explode; b.chainN = opt.chain; b.poison = opt.poison; b.slowHit = opt.slowHit; b.hitSet = null;
    if (opt.wave || opt.boomerang || opt.orbitShot || opt.bounce) {
      const P = this, w = opt.wave, ph = Math.random() * 6, life0 = b.life, ang0 = a;
      b.fn = (bb, dt) => {
        if (w) { const r = w * 6 * Math.cos(bb.age * 12 + ph) * dt, c = Math.cos(r), s = Math.sin(r), vx = bb.vx * c - bb.vz * s; bb.vz = bb.vx * s + bb.vz * c; bb.vx = vx; }
        if (opt.boomerang && !bb._back && bb.age > life0 * 0.42) { bb._back = true; bb.vx = -bb.vx; bb.vz = -bb.vz; bb.hitSet = null; }
        if (opt.orbitShot && bb.age < 0.35) { const oa = ang0 + bb.age * 16, r = 1.4; bb.x = P.x + Math.cos(oa) * r; bb.z = P.z + Math.sin(oa) * r; if (bb.age + dt >= 0.35) { const sp = Math.hypot(bb.vx, bb.vz); bb.vx = Math.cos(ang0) * sp; bb.vz = Math.sin(ang0) * sp; } }
        if (bb.bounceLeft > 0) { const l = Math.hypot(bb.x, bb.z); if (l > ARENA_R - 0.3) { const nx = bb.x / l, nz = bb.z / l, d = bb.vx * nx + bb.vz * nz; if (d > 0) { bb.vx -= 2 * d * nx; bb.vz -= 2 * d * nz; bb.bounceLeft--; bb.life = Math.max(bb.life, 0.6); } } }
      };
    }
    return b;
  }
  _fire(G) {
    const st = this.st, lv = this.plv, loop = this.buffs.loop > 0 ? 2 : 1;
    this.shotCd = Math.max(0.03, PLAYER.shotCd / st.rate);
    const n = Math.min(11, 1 + lv + Math.max(0, Math.round(st.streams)));
    const dmg = (3.2 * st.dmg * (1 + 0.55 * (n - 1))) / n; // 파워 0 · 아이템 없음 ≈ 초당 38
    const x = this.x, z = this.z - 0.5;
    for (let rep = 0; rep < loop; rep++) {
      const off = rep ? 0.05 : 0;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0 : i / (n - 1) - 0.5;
        if (this.focus) this._spawn(G, x + k * (0.32 * (n - 1)), z, FWD + off, dmg * 1.1);
        else this._spawn(G, x + k * 0.5, z, FWD + k * (0.13 * (n - 1)) + off, dmg);
      }
    }
    for (let i = 0; i < st.back; i++) this._spawn(G, x, this.z + 0.4, -FWD + (i - (st.back - 1) / 2) * 0.12, dmg * 0.8);
    for (let i = 0; i < st.side; i++) { this._spawn(G, x - 0.4, this.z, Math.PI + i * 0.1, dmg * 0.8); this._spawn(G, x + 0.4, this.z, 0 - i * 0.1, dmg * 0.8); }
    if (st.diag) for (const a of [FWD - 0.8, FWD + 0.8, -FWD - 0.8, -FWD + 0.8]) this._spawn(G, x, this.z, a, dmg * 0.75 * st.diag);
    this.shotN++;
    if (st.ring && this.shotN % Math.max(3, Math.round(st.ring)) === 0) for (let i = 0; i < 8; i++) this._spawn(G, this.x, this.z, (i * TAU) / 8, dmg * 1.2, { color: 0xffd0a0 });
    G.audio.sfx.play('shoot', { pan: G.audio.pan(this.x), vol: 0.45 });
  }
  _fireCharge(G, c) {
    const st = this.st, lv = this.plv;
    const dmg = 34 * st.dmg * c * (1 + 0.4 * lv), n = 1 + Math.floor(lv / 2);
    for (let i = 0; i < n; i++) { const b = this._spawn(G, this.x, this.z - 0.6, FWD + (i - (n - 1) / 2) * 0.16, dmg, { kind: 'blade', size: 1.4 + 2.2 * c, hr: 0.5 + c * 0.6, pierce: 99, speed: 26 * st.shotSpeed, color: 0xfff1c9 }); if (b) b.pierceLeft = 99; }
    G.audio.sfx.play('ult', { vol: 0.35 + c * 0.3 }); G.world.shake(0.15 + c * 0.25, 0.2);
  }
  _laser(dt, G, on) {
    const L = this.laser;
    if (!on) { L.visible = false; return; }
    const st = this.st, lv = this.plv, len = 22 * st.range, w = 0.55 + lv * 0.12 + st.size * 0.2;
    L.visible = true; L.position.set(this.x, 0.95, this.z - 0.4 - len / 2); L.rotation.y = Math.PI / 2; L.scale.set(len, 1, w * (1 + Math.sin(G.t * 40) * 0.1)); L.material.opacity = 0.9;
    this.laserTick -= dt;
    if (this.laserTick <= 0) {
      this.laserTick = 0.07;
      const dmg = 2.6 * st.dmg * (1 + 0.42 * lv) * (this.buffs.loop > 0 ? 1.8 : 1), x0 = this.x, z0 = this.z - 0.4, z1 = z0 - len;
      const hitLine = (x, z, r) => z < z0 && z > z1 && Math.abs(x - x0) < r + w * 0.5;
      for (const m of G.mobs.list) if (m.alive && hitLine(m.x, m.z, m.hr)) G.mobs.damage(m, dmg, m.x, m.z, true);
      const B = G.boss; if (B && B.alive && B.visible && hitLine(B.x, B.z, B.hitR)) B.damage(dmg, G, B.x, B.z, true);
      if (Math.random() < 0.5) G.audio.sfx.play('shoot', { vol: 0.2, pitch: 1.8 });
    }
    if (Math.random() < 0.6) G.fx.emit({ x: this.x + (Math.random() - 0.5) * w, y: 0.95, z: this.z - Math.random() * len, life: 0.3, s0: 0.5, s1: 0, color: 0xff8aa8, tex: 'spark' });
  }

  // ───── 옵션(사역마) ─────
  _options(dt, G, firing) {
    const n = this.optDefs.length, st = this.st;
    this.optDefs.forEach((o, i) => {
      o.t += dt; o.cd -= dt;
      let tx, tz;
      if (o.type === 'book' || o.type === 'moonGuard') { o.ang += dt * (o.type === 'book' ? 2.6 : -2.2); const r = o.type === 'book' ? 1.7 : 2.1; tx = this.x + Math.cos(o.ang) * r; tz = this.z + Math.sin(o.ang) * r; }
      else if (o.type === 'infinity') { const s = o.t * 1.6 + i * Math.PI; tx = this.x + Math.sin(s) * 1.8; tz = this.z - 0.6 + Math.sin(s * 2) * 0.6; }
      else if (o.type === 'puppet') {
        const tgt = G.nearestEnemy ? G.nearestEnemy(this.x, this.z, 9) : null;
        if (tgt && firing) { tx = tgt.x; tz = tgt.z; if ((o.x - tgt.x) ** 2 + (o.z - tgt.z) ** 2 < 1.2 && o.cd <= 0) { o.cd = 0.25; G.hitEnemy(tgt, 1.9 * st.dmg, o.x, o.z); G.fx.burst(o.x, 1.2, o.z, 3, { color: 0xff8a9a, speed: 3, size: 0.4, life: 0.3 }); } }
        else { const side = i % 2 ? 1 : -1; tx = this.x + side * 1.4; tz = this.z + 0.8; }
      } else { const side = i % 2 ? 1 : -1, rank = Math.floor(i / 2) + 1, sp = this.focus ? 0.55 : 1.15; tx = this.x + side * sp * rank; tz = this.z + 0.2 + (this.focus ? -0.3 : 0.25) * rank; }
      const k = o.type === 'puppet' ? 6 : 14; o.x += (tx - o.x) * Math.min(1, dt * k); o.z += (tz - o.z) * Math.min(1, dt * k);
      // 막기형 옵션: 적탄 소거
      if (o.type === 'book' || o.type === 'moonGuard') for (const b of G.bullets.list) if (b.active && b.owner === 'boss' && (b.x - o.x) ** 2 + (b.z - o.z) ** 2 < 0.55) { G.bullets.kill(b); G.fx.puff(b.x, 0.9, b.z, OPT_LOOK[o.type].col, 1); }
      if (!firing || o.cd > 0) return;
      const dm = st.dmg;
      const mk = (a, sp, d, ex = {}) => this._spawn(G, o.x, o.z, a, d, ex);
      switch (o.type) {
        case 'sun': o.cd = 0.3; mk(FWD, 22, 1.2 * dm, { homing: 6 + st.homing, color: 0xffb040, kind: 'orb', size: 0.7 }); break;
        case 'moon': o.cd = 0.36; mk(FWD, 24, 1.6 * dm, { kind: 'crescent', color: 0xd9c8ff, size: 1.0, pierce: 1 }); break;
        case 'star': o.cd = 0.42; for (const d of [-0.25, 0, 0.25]) mk(FWD + d, 22, 0.8 * dm, { kind: 'star', color: 0xcfe0ff, size: 0.8 }); break;
        case 'lemon': o.cd = 0.6; { const b = mk(FWD + (Math.random() - 0.5) * 0.8, 16, 2.0 * dm, { kind: 'orb', color: 0xffe14a, size: 0.9, bounce: 3 }); if (b) b.bounceLeft = 3; } break;
        case 'clone': o.cd = 0.1; for (const d of [-0.12, 0, 0.12]) mk(FWD + d, 30, 1.0 * dm, { color: 0xffe08a }); break;
        case 'infinity': o.cd = 0.22; mk(FWD + Math.sin(o.t * 3) * 0.3, 26, 1.1 * dm, { kind: 'orb', color: 0x5fe8c0, size: 0.7 }); break;
        default: break;
      }
    });
  }

  /** 피탄. @returns true if hit registered */
  hurt(G) {
    if (this.safe) return false;
    if (G.state !== 'fight' && G.state !== 'stage' && G.state !== 'room') return false;
    if (G.sealed) { if (G.run.debugInf) return false; G.onUltimateDeath(); return true; }
    if (G.run.apo) { this.inv = 0.6; G.stats.hits++; G.audio.sfx.play('hurt', { pan: G.audio.pan(this.x), vol: 0.5 }); G.fx.burst(this.x, 1, this.z, 12, { color: [0xffffff], speed: 5, size: 0.7, life: 0.5 }); return true; }
    if (this.roomShield) { this.roomShield = false; this.inv = 1.0; G.audio.sfx.play('decoy_pop', { vol: 0.8 }); G.fx.ring(this.x, 0.8, this.z, 0xe8e0ff, 6, 0.5); G.ui.warn('베일이 피격을 막았다', 900); return true; }
    this.hp = Math.max(0, this.hp - 1); this.inv = PLAYER.hitInv;
    this.addPower(-0.25);
    G.stats.hits++; G.run.stepHit = true;
    G.ui.setHp(this.hp, this.maxHp);
    G.audio.sfx.play('hurt', { pan: G.audio.pan(this.x), vol: 0.9 });
    G.world.shake(0.45, 0.3); G.ui.flash('#ff4f7a', 380, 0.5); G.hitstop(0.07);
    G.fx.burst(this.x, 1, this.z, 22, { color: [0xffb0d0, 0xffffff, 0xffd36b], speed: 7, size: 0.8, life: 0.8 });
    G.fx.ring(this.x, 0.5, this.z, 0xff7aa8, 6, 0.5);
    if (this.flags.thorns) for (let i = 0; i < 16; i++) this._spawn(G, this.x, this.z, (i * TAU) / 16, 3 * this.st.dmg, { color: 0xff5a7a, kind: 'petal', pierce: 2 });
    if (this.flags.lastStand) this.recalc();
    if (this.hp <= 0) {
      if (this.flags.revive && !this.reviveUsed) { this.reviveUsed = true; this.hp = 2; this.inv = 3; G.ui.banner('두 번째 기회', '성검이 다시 빛난다', 2000); G.audio.sfx.play('heal'); G.ui.setHp(this.hp, this.maxHp); return true; }
      if (G.state === 'fight' && G.boss.step && G.boss.step.endure && G.boss.state === 'run') { G.onEndureDeath(); return true; } // 버티기 시련은 쓰러져도 넘어간다
      this.alive = false; G.onPlayerDown(); return true;
    }
    if (G.state === 'fight' && Math.random() < 0.5) G.boss.barkFor(G.boss.def.id + 'Hit');
    return true;
  }

  deathFx(G) {
    G.audio.sfx.play('defeat', { vol: 0.6 }); G.world.shake(0.9, 0.7); G.ui.flash('#ffffff', 600, 0.7);
    G.fx.burst(this.x, 1, this.z, 46, { color: [0xffffff, 0xffd36b, 0xff7aa8], speed: 9, size: 1.0, life: 1.1 });
    G.fx.ring(this.x, 0.5, this.z, 0xffd36b, 10, 0.7);
  }
  revive(G) {
    this.alive = true; this.x = 0; this.z = 6.2; this.inv = PLAYER.respawnInv; this.hp = this.maxHp; this.ultT = 0; this.ultBeam.visible = false;
    G.ui.setHp(this.hp, this.maxHp);
  }

  // ───── 성광(폭탄) ─────
  beginUlt(G, mode) {
    this.ults = Math.max(0, this.ults - 1);
    this.ultMode = mode; this.ultT = PLAYER.ultDur; this.ultTick = 0; this.ultR = 1.5; this.ultAge = 0;
    this.inv = Math.max(this.inv, PLAYER.ultInv - PLAYER.ultDur);
    G.ui.setUlt(this.ults, this.bombCap);
    G.world.shake(0.7, 0.5); G.world.beat(1.4);
    G.fx.ring(this.x, 0.5, this.z, 0xffe9a6, 14, 0.8);
    G.fx.burst(this.x, 1, this.z, 40, { color: [0xffffff, 0xffe9a6, 0xffd36b], speed: 11, size: 1.0, life: 1.0, up: 1.4 });
    this.ultBeam.material.color.setHex(0xffe9a6);
    this.ultBeam.visible = mode !== 'reject' && G.state === 'fight';
  }
  _ultUpdate(dt, G) {
    this.ultT -= dt; this.ultAge += dt;
    const B = G.boss;
    const k = 1 - this.ultT / PLAYER.ultDur;
    if (this.ultMode !== 'reject') {
      this.ultR = Math.min(26, 1.5 + this.ultAge * 34);
      for (const b of G.bullets.list) {
        if (!b.active || b.owner !== 'boss') continue;
        if ((b.x - this.x) ** 2 + (b.z - this.z) ** 2 < this.ultR * this.ultR) { G.fx.puff(b.x, 0.9, b.z, 0xffe9a6, 1); G.bullets.kill(b); if (Math.random() < 0.08) G.pickups.spawn({ type: 'point', x: b.x, z: b.z }); }
      }
      G.zones.clear(); G.beams.clear();
      this.ultTick -= dt;
      if (this.ultTick <= 0) {
        this.ultTick = 0.1;
        const f = this.ultMode === 'normal' ? 1 : this.ultMode === 'resist' ? 0.33 : 0;
        const ticks = PLAYER.ultDur / 0.1, dmgMul = 0.6 + 0.4 * this.st.dmg;
        if (G.state === 'fight' && B.alive && B.vulnerable && f > 0) {
          B.damage((PLAYER.ultTotal / ticks) * f * dmgMul * (G.run.hpScale || 1), G, B.x, B.z, true);
          G.fx.burst(B.x, B.bobY, B.z, 3, { color: [0xffe9a6, 0xffffff], speed: 6, size: 0.7, life: 0.4 });
        }
        for (const m of G.mobs.list) if (m.alive && (m.x - this.x) ** 2 + (m.z - this.z) ** 2 < this.ultR * this.ultR) G.mobs.damage(m, 7 * dmgMul, m.x, m.z, true);
      }
      const fighting = G.state === 'fight', bx = B.x, bz = B.z, dx = bx - this.x, dz = bz - this.z, len = Math.hypot(dx, dz) || 1;
      this.ultBeam.visible = fighting;
      this.ultBeam.position.set(this.x + dx / 2, 0.09, this.z + dz / 2);
      this.ultBeam.rotation.y = -Math.atan2(dz, dx);
      const w = (2.6 + Math.sin(this.ultAge * 30) * 0.5) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      this.ultBeam.scale.set(len, 1, Math.max(0.05, w));
      this.ultBeam.material.opacity = 0.95;
      if (fighting && Math.random() < 0.9) G.fx.emit({ x: this.x + dx * Math.random(), y: 0.6 + Math.random(), z: this.z + dz * Math.random(), life: 0.5, s0: 0.7, s1: 0, color: 0xffe9a6, tex: 'spark', vy: 1.5 });
    }
    if (Math.random() < dt * 22) G.fx.ring(this.x, 0.4, this.z, 0xffe9a6, Math.min(this.ultR, 16) * 0.8, 0.5);
    if (this.ultT <= 0) { this.ultBeam.visible = false; this.inv = Math.max(this.inv, PLAYER.ultInv - PLAYER.ultDur); }
  }

  render(dt, t) {
    const h = this.height * (this.buffs.moonMask > 0 ? 1.12 : 1), w = h * this.aspect;
    const bob = this.moving ? Math.abs(Math.sin(t * 14)) * 0.1 * (this.focus ? 0.4 : 1) : Math.sin(t * 2.2) * 0.04;
    this.walkT += this.moving ? dt : 0;
    this.spr.material.map = this.frames[this.moving && Math.floor(this.walkT * 7) % 2 ? 1 : 0];
    this.spr.scale.set(w * this.face, h, 1);
    this.spr.position.set(this.x, h / 2 + bob, this.z);
    const blink = this.inv > 0 && this.ultT <= 0 && Math.floor(t * 20) % 2 === 0;
    this.spr.material.opacity = blink ? 0.3 : this.focus ? 0.8 : 1;
    const odd = this.invertT > 0 || (this.G && this.G.zones && (this.G.zones.invert || this.G.zones.lag));
    // 변신 색조
    const tf = this.transforms.length ? TRANSFORMS[this.transforms[this.transforms.length - 1]] : null;
    let tint = tf ? tf.tint : [1, 1, 1];
    if (this.buffs.moonMask > 0) tint = [1.35, 0.95, 1.3];
    this.spr.material.color.setRGB(tint[0], tint[1] * (odd ? 0.65 : 1), tint[2] * (odd ? 1.3 : 1));
    this.shadow.position.x = this.x; this.shadow.position.z = this.z; this.shadow.scale.set(1.7, 1, 1.7);
    const apo = !!(this.G && this.G.run && this.G.run.apo);
    const auraCol = apo ? 0xffffff : this.buffs.moonMask > 0 ? 0xff9ad8 : tf ? tf.aura : null;
    this.glow.visible = !!auraCol && this.alive;
    if (this.glow.visible) { this.glow.material.color.setHex(auraCol); this.glow.position.set(this.x, h / 2, this.z - 0.1); const gs = h * (apo ? 1.9 : 1.5) + Math.sin(t * 3) * 0.2; this.glow.scale.set(gs, gs, 1); this.glow.material.opacity = (apo ? 0.55 : 0.32) + Math.sin(t * 4) * 0.08; if (apo) this.spr.material.color.setRGB(2.4, 2.4, 2.4); }
    // 방벽 / 베일 표시
    const sh = this.buffs.barrier > 0 ? 1 : this.roomShield ? 0.35 : 0;
    this.shieldSpr.visible = sh > 0 && this.alive; if (this.shieldSpr.visible) { this.shieldSpr.position.set(this.x, 1.0, this.z); const s = sh === 1 ? 5.2 : 2.4; this.shieldSpr.scale.set(s, s, 1); this.shieldSpr.material.opacity = 0.35 + 0.2 * Math.sin(t * 6); this.shieldSpr.material.rotation = t; }
    // 모아쏘기 링
    this.chargeRing.visible = this.charge > 0.05; if (this.chargeRing.visible) { this.chargeRing.position.set(this.x, 1.0, this.z); const s = 1 + this.charge * 2.4; this.chargeRing.scale.set(s, s, 1); this.chargeRing.material.opacity = this.charge >= 1 ? 0.9 : 0.5; this.chargeRing.material.rotation = -t * 3; }
    // 옵션
    this.optSpr.forEach((s, i) => {
      const o = this.optDefs[i]; s.visible = !!o && this.alive;
      if (!o) return; const L = OPT_LOOK[o.type] || OPT_LOOK.sun;
      const tex = this.T[L.tex] || this.T.orb; if (s.material.map !== tex) { s.material.map = tex; s.material.needsUpdate = true; }
      s.material.color.setHex(L.col); s.position.set(o.x, 1.1 + Math.sin(t * 3 + i) * 0.1, o.z); const sc = L.s * (o.type === 'puppet' ? 1.4 : 0.9); s.scale.set(sc, sc, 1); s.material.rotation = t * 2 + i;
    });
    // 피탄점
    const dy = 0.95, cs = 0.15 + this.focusK * 0.05;
    this.core.position.set(this.x, dy, this.z); this.dotRim.position.set(this.x, dy, this.z); this.focusRing.position.set(this.x, dy, this.z);
    this.core.material.opacity = this.alive ? 1 : 0; this.core.scale.setScalar(cs);
    this.dotRim.material.opacity = this.alive ? 0.95 : 0; this.dotRim.scale.setScalar(cs * 2.1);
    this.focusRing.material.opacity = this.focusK * 0.9; this.focusRing.scale.setScalar(0.9 + this.focusK * 0.5 + Math.sin(t * 8) * 0.03);
    this.focusRing.material.rotation = t * 1.6;
  }
}
