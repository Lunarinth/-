// 플레이어: 성검사 클레르 (루나린스를 징벌하러 온 초대 하녀장).
// 이동 / 대시(짧은 무적) / 성검 참격(자동 조준) / 성검 막기(탄 반사).
import * as THREE from '../vendor/three.module.min.js';
import { ARENA_R } from './scene.js';

export const PLAYER = {
  speed: 8.8, hr: 0.3, maxHp: 5,
  dashDur: 0.17, dashSpeed: 27, dashCd: 0.8, dashGhost: 0.34,
  parryWindow: 0.24, parryCdMiss: 1.15, parryCdHit: 0.35, parryR: 2.25,
  atkCd: 0.1, shotDmg: 8,
};

export class Player {
  constructor(scene, T, frames) {
    this.frames = frames;
    this.spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false }));
    this.spr.renderOrder = 6; scene.add(this.spr);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.shadow.position.y = 0.045; scene.add(this.shadow);
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
    this.core.renderOrder = 7; this.core.scale.set(0.42, 0.42, 1); scene.add(this.core);
    this.aspect = 192 / 256; this.height = 2.1;
    this.reset();
  }

  setSprite(frames, aspect, height = 2.6) { this.frames = frames; this.aspect = aspect; this.height = height; }

  reset() {
    this.x = 0; this.z = 6.2; this.hp = PLAYER.maxHp; this.max = PLAYER.maxHp;
    this.inv = 0; this.dashT = 0; this.dashCd = 0; this.ghost = 0; this.dashDx = 0; this.dashDz = -1;
    this.parryT = 0; this.parryCd = 0; this.atkCd = 0; this.face = 1; this.walkT = 0; this.invertT = 0;
    this.moving = false; this.alive = true; this.healsLeft = 2; this.grazeAcc = 0;
    this.spr.visible = this.shadow.visible = this.core.visible = true;
  }

  get safe() { return this.inv > 0 || this.ghost > 0 || !this.alive; }

  update(dt, input, G) {
    if (!this.alive) return;
    this.inv = Math.max(0, this.inv - dt); this.ghost = Math.max(0, this.ghost - dt);
    this.dashCd = Math.max(0, this.dashCd - dt); this.parryCd = Math.max(0, this.parryCd - dt);
    this.atkCd = Math.max(0, this.atkCd - dt); this.parryT = Math.max(0, this.parryT - dt);
    this.invertT = Math.max(0, this.invertT - dt);

    const mv = input.move(this.invertT > 0);
    this.moving = mv[0] !== 0 || mv[1] !== 0;

    // 대시
    if (input.take('dash') && this.dashCd <= 0 && this.dashT <= 0) {
      const d = this.moving ? mv : [this.face > 0 ? 1 : -1, 0];
      this.dashDx = d[0]; this.dashDz = d[1]; this.dashT = PLAYER.dashDur; this.dashCd = PLAYER.dashCd; this.ghost = PLAYER.dashGhost;
      G.audio.sfx.play('dash', { pan: G.audio.pan(this.x) });
      G.fx.ring(this.x, 0.15, this.z, 0xffd36b, 2.6, 0.3);
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.x += this.dashDx * PLAYER.dashSpeed * dt; this.z += this.dashDz * PLAYER.dashSpeed * dt;
      G.fx.emit({ x: this.x, y: 1.0, z: this.z, life: 0.28, s0: 1.4, s1: 0.6, color: 0xffc94d, tex: 'orb', op: 0.45 });
    } else {
      this.x += mv[0] * PLAYER.speed * dt; this.z += mv[1] * PLAYER.speed * dt;
    }
    const l = Math.hypot(this.x, this.z), lim = ARENA_R - 0.55;
    if (l > lim) { this.x *= lim / l; this.z *= lim / l; }
    if (mv[0] !== 0) this.face = mv[0] > 0 ? 1 : -1;

    // 패링
    if (input.take('parry') && this.parryCd <= 0 && this.dashT <= 0) {
      this.parryT = PLAYER.parryWindow; this.parryCd = PLAYER.parryCdMiss; this.parryHit = false;
      G.audio.sfx.play('parry', { pan: G.audio.pan(this.x) });
      G.fx.ring(this.x, 0.9, this.z, 0xffe9a6, PLAYER.parryR * 2.1, PLAYER.parryWindow + 0.05);
    }

    // 공격 (자동 조준)
    if ((G.settings.auto || input.attackHeld) && this.atkCd <= 0 && this.dashT <= 0 && G.boss.alive) {
      this.atkCd = PLAYER.atkCd;
      const a = Math.atan2(G.boss.z - this.z, G.boss.x - this.x) + (Math.random() - 0.5) * 0.05;
      G.bullets.spawn({ owner: 'player', kind: 'crescent', x: this.x, z: this.z, a, speed: 27, size: 1.15, hr: 0.5, life: 1.4, spin: 14, color: 0xffd36b, dmg: PLAYER.shotDmg });
      G.audio.sfx.play('shoot', { pan: G.audio.pan(this.x) });
    }

    // 쿨다운 HUD
    G.ui.setSkill('dash', this.dashCd / PLAYER.dashCd);
    G.ui.setSkill('parry', this.parryCd / PLAYER.parryCdMiss);
  }

  /** @returns true if damage was taken */
  hurt(G, dmg = 1) {
    if (this.safe) return false;
    this.hp = Math.max(0, this.hp - dmg); this.inv = 1.6;
    G.audio.sfx.play('hurt', { pan: G.audio.pan(this.x) });
    G.world.shake(0.55, 0.4); G.ui.flash('#ff4f7a', 400, 0.55);
    G.fx.burst(this.x, 1, this.z, 18, { color: [0xffb0d0, 0xffffff], speed: 6, size: 0.7, life: 0.7 });
    G.fx.ring(this.x, 0.5, this.z, 0xff7aa8, 5, 0.5);
    G.hitstop(0.09);
    G.ui.setHearts(this.hp, this.max);
    G.stats.hits++;
    if (this.hp <= 0) { this.alive = false; G.onPlayerDown(); }
    else if (Math.random() < 0.5) G.boss.bark('hurtPlayer');
    return true;
  }

  heal(G) {
    if (this.hp >= this.max || this.healsLeft <= 0) return;
    this.hp++; this.healsLeft--;
    G.audio.sfx.play('heal');
    G.ui.setHearts(this.hp, this.max);
    G.fx.burst(this.x, 1, this.z, 16, { color: [0xfff1c9, 0xffffff], speed: 4, size: 0.6, life: 0.9, grav: -1 });
    G.ui.warn('달빛의 가호 — 체력 회복', 1300);
  }

  render(dt, t) {
    const h = this.height, w = h * this.aspect;
    const bob = this.moving ? Math.abs(Math.sin(t * 14)) * 0.12 : Math.sin(t * 2.2) * 0.04;
    this.walkT += this.moving ? dt : 0;
    this.spr.material.map = this.frames[this.moving && Math.floor(this.walkT * 7) % 2 ? 1 : 0];
    this.spr.scale.set(w * this.face, h, 1);
    this.spr.position.set(this.x, h / 2 + bob, this.z);
    const blink = this.inv > 0 && Math.floor(t * 20) % 2 === 0;
    this.spr.material.opacity = blink ? 0.25 : this.ghost > 0 ? 0.55 : 1;
    this.spr.material.color.setRGB(this.invertT > 0 ? 1.0 : 1, this.invertT > 0 ? 0.6 : 1, this.invertT > 0 ? 1.3 : 1);
    this.shadow.position.x = this.x; this.shadow.position.z = this.z; this.shadow.scale.set(1.7, 1, 1.7);
    this.core.position.set(this.x, 0.95, this.z);
    this.core.material.opacity = this.alive ? 0.9 : 0;
    const p = this.parryT > 0 ? 1 : 0;
    this.core.scale.setScalar(0.4 + p * 0.25 + Math.sin(t * 9) * 0.03);
  }
}
