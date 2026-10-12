// 플레이어: 성검사 클레르 (루나린스를 징벌하러 온 초대 하녀장). 동방식 조작.
//   Z 샷(연사) / X 궁극기 / Shift 저속(피탄점 표시) / 방향키 이동
// 피탄점은 작고 (hr), 그레이즈 판정은 그보다 넓다. 피탄 직후 아주 짧은 "데스밤" 유예 동안 X 로 사망을 취소할 수 있다.
import * as THREE from '../vendor/three.module.min.js';
import { ARENA_R } from './scene.js';

export const PLAYER = {
  speed: 8.6, focusSpeed: 3.6, hr: 0.12, grazeR: 0.55,
  shotCd: 0.085,
  respawnInv: 3.0, deathWin: 0.17,
  maxUlt: 3, ultDur: 2.5, ultTotal: 280, ultInv: 4.2,
};

const FWD = -Math.PI / 2; // 보스 쪽 (−z)

export class Player {
  constructor(scene, T, frames) {
    this.frames = frames;
    this.T = T;
    this.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }));
    this.spr.renderOrder = 6; scene.add(this.spr);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.shadow.position.y = 0.045; scene.add(this.shadow);
    // 피탄점: 작은 흰 점 + 붉은 테두리. 저속 시 테두리 링이 커진다.
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
    this.core.renderOrder = 30; scene.add(this.core);
    this.dotRim = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, depthTest: false, color: 0xff3b6b, opacity: 0.9 }));
    this.dotRim.renderOrder = 29; scene.add(this.dotRim);
    this.focusRing = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xfff1c9, opacity: 0 }));
    this.focusRing.renderOrder = 28; scene.add(this.focusRing);
    // 궁극기: 성검의 빛줄기
    this.ultBeam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.beam, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9a6, opacity: 0 }));
    this.ultBeam.position.y = 0.09; this.ultBeam.renderOrder = -6; this.ultBeam.visible = false; scene.add(this.ultBeam);
    this.aspect = 192 / 256; this.height = 2.1;
    this.reset();
  }

  setSprite(frames, aspect, height = 2.6) { this.frames = frames; this.aspect = aspect; this.height = height; }

  /** lives: 이번 난이도의 잔기 수 */
  reset(lives = 3) {
    this.x = 0; this.z = 6.2; this.baseLives = lives; this.lives = lives; this.ults = PLAYER.maxUlt;
    this.inv = 0; this.shotCd = 0; this.face = 1; this.walkT = 0; this.invertT = 0; this.slowT = 0;
    this.vx = 0; this.vz = 0; this.sealT = 0;
    this.moving = false; this.alive = true; this.focus = false; this.dying = 0; this.focusK = 0;
    this.ultT = 0; this.ultTick = 0; this.ultR = 0; this.ultMode = 'normal'; this.ultAge = 0;
    this.spr.visible = this.shadow.visible = this.core.visible = this.dotRim.visible = true;
    this.ultBeam.visible = false;
  }

  get safe() { return this.inv > 0 || this.dying > 0 || this.ultT > 0 || !this.alive; }
  get ultActive() { return this.ultT > 0; }

  update(dt, input, G, canShoot = true) {
    if (!this.alive) return;
    this.inv = Math.max(0, this.inv - dt); this.shotCd = Math.max(0, this.shotCd - dt);
    this.invertT = Math.max(0, this.invertT - dt); this.sealT = Math.max(0, this.sealT - dt);
    const ox = this.x, oz = this.z;
    this.focus = input.focusHeld;
    this.focusK += ((this.focus ? 1 : 0) - this.focusK) * (1 - Math.exp(-dt * 18));

    const mv = input.move(this.invertT > 0);
    this.moving = mv[0] !== 0 || mv[1] !== 0;
    const bound = G.zones.bound ? 0.45 : 1;
    const sp = (this.focus ? PLAYER.focusSpeed : PLAYER.speed) * bound;
    this.x += mv[0] * sp * dt; this.z += mv[1] * sp * dt;
    const l = Math.hypot(this.x, this.z), lim = ARENA_R - 0.55;
    if (l > lim) { this.x *= lim / l; this.z *= lim / l; }
    if (mv[0] !== 0) this.face = mv[0] > 0 ? 1 : -1;
    if (dt > 0) { const k = 0.35; this.vx += ((this.x - ox) / dt - this.vx) * k; this.vz += ((this.z - oz) / dt - this.vz) * k; }

    // 사망 유예 (데스밤)
    if (this.dying > 0) {
      this.dying -= dt;
      if (input.take('ult') && this.ults > 0) { this.dying = 0; this.inv = 0.4; G.useUlt(true); }
      else if (this.dying <= 0) this._die(G);
    } else if (input.take('ult')) {
      if (this.ults > 0 && this.ultT <= 0 && G.canUlt()) G.useUlt(false);
    }

    // 샷
    if (canShoot && this.sealT <= 0 && input.shotHeld && this.shotCd <= 0 && this.dying <= 0) this._fire(G);

    // 궁극기 지속
    if (this.ultT > 0) this._ultUpdate(dt, G);

    G.ui.setUlt(this.ults);
  }

  _fire(G) {
    this.shotCd = PLAYER.shotCd;
    const B = G.bullets, x = this.x, z = this.z - 0.5;
    const mk = (dx, a, dmg, o = {}) => B.spawn({ owner: 'player', kind: 'shard', x: x + dx, z, a, speed: o.speed ?? 34, size: o.size ?? 0.8, hr: o.hr ?? 0.34, life: 0.95, color: o.color ?? 0xffe9a6, dmg, rot: -(a - FWD), homing: o.homing || 0, homeT: 1.1 });
    if (this.focus) {
      // 저속: 정면에 집중된 3줄 + 유도 검기 2
      mk(-0.32, FWD, 2.45); mk(0, FWD, 2.6); mk(0.32, FWD, 2.45);
      mk(-0.85, FWD - 0.18, 1.3, { color: 0xffd36b, homing: 6.5, size: 0.8, hr: 0.28, speed: 26 });
      mk(0.85, FWD + 0.18, 1.3, { color: 0xffd36b, homing: 6.5, size: 0.8, hr: 0.28, speed: 26 });
    } else {
      // 일반: 5갈래 부채꼴
      for (let i = -2; i <= 2; i++) mk(i * 0.28, FWD + i * 0.13, i === 0 ? 2.1 : 1.65, { color: i === 0 ? 0xfff6dc : 0xffe08a });
    }
    G.audio.sfx.play('shoot', { pan: G.audio.pan(this.x), vol: 0.5 });
  }

  /** 피탄. 즉사하지 않고 짧은 유예가 생긴다. @returns true if hit registered */
  hurt(G) {
    if (this.safe) return false;
    this.dying = PLAYER.deathWin;
    G.audio.sfx.play('hurt', { pan: G.audio.pan(this.x), vol: 0.9 });
    G.world.shake(0.4, 0.25);
    G.fx.burst(this.x, 1, this.z, 10, { color: [0xffb0d0, 0xffffff], speed: 5, size: 0.6, life: 0.5 });
    return true;
  }

  _die(G) {
    if (G.state !== 'fight') { this.inv = 1.0; return; } // 단계 종료·연출 중의 피탄은 무효
    this.lives = Math.max(0, this.lives - 1);
    G.stats.hits++; G.run.stepHit = true;
    G.ui.setLives(this.lives, this.baseLives);
    G.ui.flash('#ff4f7a', 450, 0.6);
    G.fx.burst(this.x, 1, this.z, 34, { color: [0xffb0d0, 0xffffff, 0xffd36b], speed: 8, size: 0.9, life: 1.0 });
    G.fx.ring(this.x, 0.5, this.z, 0xff7aa8, 8, 0.6);
    G.hitstop(0.1);
    if (this.lives <= 0) { this.alive = false; G.onPlayerDown(); return; }
    // 리스폰: 탄 소거, 궁극기 보충, 무적
    this.ults = PLAYER.maxUlt; this.inv = PLAYER.respawnInv;
    this.x = 0; this.z = 6.2;
    G.bullets.clearBoss(G.fx); G.zones.clear(); G.beams.clear();
    G.audio.sfx.play('graze', { vol: 1.2 });
    if (Math.random() < 0.6) G.boss.barkFor('hurtPlayer');
  }

  // ───── 궁극기 ─────
  /** 선언 연출이 끝난 뒤 실제 발동. mode: normal | resist | immune | reject (보스 단계가 정한다) */
  beginUlt(G, mode) {
    this.ults = Math.max(0, this.ults - 1);
    this.ultMode = mode; this.ultT = PLAYER.ultDur; this.ultTick = 0; this.ultR = 1.5; this.ultAge = 0;
    this.inv = Math.max(this.inv, PLAYER.ultInv - PLAYER.ultDur);
    G.ui.setUlt(this.ults);
    G.world.shake(0.7, 0.5); G.world.beat(1.4);
    G.fx.ring(this.x, 0.5, this.z, 0xffe9a6, 14, 0.8);
    G.fx.burst(this.x, 1, this.z, 40, { color: [0xffffff, 0xffe9a6, 0xffd36b], speed: 11, size: 1.0, life: 1.0, up: 1.4 });
    this.ultBeam.visible = mode !== 'reject';
  }

  _ultUpdate(dt, G) {
    this.ultT -= dt; this.ultAge += dt;
    const B = G.boss;
    const k = 1 - this.ultT / PLAYER.ultDur;
    if (this.ultMode !== 'reject') {
      // 확산하는 성광이 탄을 지운다
      this.ultR = Math.min(26, 1.5 + this.ultAge * 34);
      for (const b of G.bullets.list) {
        if (!b.active || b.owner !== 'boss') continue;
        if ((b.x - this.x) ** 2 + (b.z - this.z) ** 2 < this.ultR * this.ultR) { G.fx.puff(b.x, 0.9, b.z, 0xffe9a6, 1); G.bullets.kill(b); }
      }
      G.zones.clear(); G.beams.clear();
      // 피해 틱
      this.ultTick -= dt;
      if (this.ultTick <= 0 && B.alive && B.vulnerable) {
        this.ultTick = 0.1;
        const f = this.ultMode === 'normal' ? 1 : this.ultMode === 'resist' ? 0.33 : 0;
        const ticks = PLAYER.ultDur / 0.1;
        B.damage((PLAYER.ultTotal / ticks) * f, G, B.x, B.z, true);
        G.fx.burst(B.x, B.bobY, B.z, 3, { color: [0xffe9a6, 0xffffff], speed: 6, size: 0.7, life: 0.4 });
      }
      // 빛줄기: 플레이어 → 보스
      const bx = B.x, bz = B.z, dx = bx - this.x, dz = bz - this.z, len = Math.hypot(dx, dz) || 1;
      this.ultBeam.position.set(this.x + dx / 2, 0.09, this.z + dz / 2);
      this.ultBeam.rotation.y = -Math.atan2(dz, dx);
      const w = (2.6 + Math.sin(this.ultAge * 30) * 0.5) * (k > 0.8 ? (1 - k) / 0.2 : 1);
      this.ultBeam.scale.set(len, 1, Math.max(0.05, w));
      this.ultBeam.material.opacity = 0.95;
      if (Math.random() < 0.9) G.fx.emit({ x: this.x + dx * Math.random(), y: 0.6 + Math.random(), z: this.z + dz * Math.random(), life: 0.5, s0: 0.7, s1: 0, color: 0xffe9a6, tex: 'spark', vy: 1.5 });
    }
    if (Math.random() < dt * 22) G.fx.ring(this.x, 0.4, this.z, 0xffe9a6, Math.min(this.ultR, 16) * 0.8, 0.5);
    if (this.ultT <= 0) { this.ultBeam.visible = false; this.inv = Math.max(this.inv, PLAYER.ultInv - PLAYER.ultDur); }
  }

  render(dt, t) {
    const h = this.height, w = h * this.aspect;
    const bob = this.moving ? Math.abs(Math.sin(t * 14)) * 0.1 * (this.focus ? 0.4 : 1) : Math.sin(t * 2.2) * 0.04;
    this.walkT += this.moving ? dt : 0;
    this.spr.material.map = this.frames[this.moving && Math.floor(this.walkT * 7) % 2 ? 1 : 0];
    this.spr.scale.set(w * this.face, h, 1);
    this.spr.position.set(this.x, h / 2 + bob, this.z);
    const blink = this.inv > 0 && this.ultT <= 0 && Math.floor(t * 20) % 2 === 0;
    this.spr.material.opacity = blink ? 0.3 : this.dying > 0 ? 0.55 : this.focus ? 0.8 : 1;
    this.spr.material.color.setRGB(this.invertT > 0 ? 1.0 : 1, this.invertT > 0 ? 0.6 : 1, this.invertT > 0 ? 1.3 : 1);
    this.shadow.position.x = this.x; this.shadow.position.z = this.z; this.shadow.scale.set(1.7, 1, 1.7);

    // 피탄점 (항상 표시: 작은 점 / 저속 시 테두리 링 확대)
    const dy = 0.95, cs = 0.2 + this.focusK * 0.06;
    this.core.position.set(this.x, dy, this.z); this.dotRim.position.set(this.x, dy, this.z); this.focusRing.position.set(this.x, dy, this.z);
    this.core.material.opacity = this.alive ? 1 : 0; this.core.scale.setScalar(cs);
    this.dotRim.material.opacity = this.alive ? 0.95 : 0; this.dotRim.scale.setScalar(cs * 2.1);
    this.focusRing.material.opacity = this.focusK * 0.9; this.focusRing.scale.setScalar(0.9 + this.focusK * 0.5 + Math.sin(t * 8) * 0.03);
    this.focusRing.material.rotation = t * 1.6;
  }
}
