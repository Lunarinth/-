// 스테이지 잡몹: "병사"는 캐릭터가 아니라 문양(별 · 룬 · 달)이다. 각 보스의 힘이 빚어낸 사역물로 표현된다.
// 이동은 직선 속도 또는 path(t) 함수, 공격은 fire(m, dt) 콜백으로 정의한다.
import * as THREE from '../vendor/three.module.min.js';
import { PLAYER } from './player.js';

const TAU = Math.PI * 2;
const ADD = THREE.AdditiveBlending;

export const MOB_TYPES = {
  star: { tex: 'mob_star', color: 0xcfe0ff, glow: 0x7fa8ff, bullet: { kind: 'star', color: 0xcfe0ff, alt: 0x9cc3ff } },
  lens: { tex: 'mob_lens', color: 0x9cc3ff, glow: 0x4a7fd8, bullet: { kind: 'orb', color: 0x9cc3ff, alt: 0xffffff } },
  rune: { tex: 'mob_rune', color: 0xc89bff, glow: 0xb06bff, bullet: { kind: 'glyph', color: 0xc89bff, alt: 0xa66bff } },
  page: { tex: 'mob_page', color: 0xffd36b, glow: 0xb06bff, bullet: { kind: 'glyph', color: 0xffd36b, alt: 0xffffff } },
  moon: { tex: 'mob_moon', color: 0xfff1c9, glow: 0xd9c8ff, bullet: { kind: 'crescent', color: 0xe3d6ff, alt: 0xfff1c9 } },
  eclipse: { tex: 'mob_eclipse', color: 0xa07bff, glow: 0x7a4bd8, bullet: { kind: 'orb', color: 0xa07bff, alt: 0xe4d6ff } },
};

export class Mobs {
  constructor(scene, T, G, n = 48) {
    this.G = G; this.T = T; this.list = [];
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({ map: T.mob_star, transparent: true, depthWrite: false, blending: ADD, opacity: 0 });
      const spr = new THREE.Sprite(mat); spr.renderOrder = 6; spr.visible = false; scene.add(spr);
      const rmat = new THREE.SpriteMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: ADD, opacity: 0 });
      const rim = new THREE.Sprite(rmat); rim.renderOrder = 5; rim.visible = false; scene.add(rim);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.5 }));
      sh.position.y = 0.04; sh.visible = false; scene.add(sh);
      this.list.push({ alive: false, spr, mat, rim, rmat, sh });
    }
  }

  /** o: { type, x, z, hp, size, vx, vz, path(t,m)->[x,z], life, fire(m,dt), onDeath, spin, hr } */
  spawn(o) {
    const m = this.list.find((q) => !q.alive); if (!m) return null;
    const ty = MOB_TYPES[o.type] || MOB_TYPES.star, D = this.G.run.diff;
    Object.assign(m, {
      alive: true, ty, type: o.type, x: o.x, z: o.z, x0: o.x, z0: o.z, vx: o.vx || 0, vz: o.vz || 0, path: o.path || null,
      size: o.size ?? 2.0, hpMax: Math.max(1, (o.hp ?? 8) * (0.85 + D.hp * 0.15)), age: 0, life: o.life ?? 20, flash: 0,
      fire: o.fire || null, onDeath: o.onDeath || null, spin: o.spin ?? 0.8, t0: o.t0 || 0, data: o.data || {}, leaving: false,
    });
    m.hp = m.hpMax; m.hr = o.hr ?? m.size * 0.42;
    m.mat.map = this.T[ty.tex]; m.mat.color.setHex(ty.color); m.rmat.color.setHex(ty.glow);
    m.spr.visible = m.rim.visible = m.sh.visible = true; m.mat.opacity = 0; m.rmat.opacity = 0;
    return m;
  }

  count() { let c = 0; for (const m of this.list) if (m.alive) c++; return c; }
  clear(silent = true) { for (const m of this.list) if (m.alive) this._remove(m, !silent); }

  _remove(m, fx) {
    m.alive = false; m.spr.visible = m.rim.visible = m.sh.visible = false;
    if (fx) this.G.fx.burst(m.x, 1.5, m.z, 12, { color: [0xffffff, m.ty.color], speed: 5, size: 0.7, life: 0.6 });
  }

  // ───── 공격 보조 (콜백에서 사용) ─────
  aim(m) { return Math.atan2(this.G.player.z - m.z, this.G.player.x - m.x); }
  n(k, min = 1) { return Math.max(min, Math.round(k * this.G.run.diff.cnt)); }
  shoot(m, o = {}) {
    const D = this.G.run.diff, b = m.ty.bullet;
    return this.G.bullets.spawn({ owner: 'boss', kind: b.kind, color: b.color, size: 1.0, x: m.x, z: m.z, ...o, speed: (o.speed ?? 5) * D.spd });
  }
  ring(m, n, o = {}) { const a0 = o.a0 ?? Math.random() * TAU; for (let i = 0; i < n; i++) this.shoot(m, { ...o, a: a0 + (i * TAU) / n }); }
  fan(m, n, spread, a, o = {}) { for (let i = 0; i < n; i++) this.shoot(m, { ...o, a: a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) }); }

  /** 플레이어 탄/궁극기로 피해. 처치되면 true */
  damage(m, amt, x, z, silent = false) {
    if (!m.alive || m.age < 0.35) return false;
    m.hp -= amt; m.flash = 0.06;
    const G = this.G;
    if (!silent) G.audio.sfx.play('hit_boss', { pan: G.audio.pan(m.x), pitch: 1.5, vol: 0.35 });
    if (m.hp <= 0) {
      G.stats.mobs++; G.audio.sfx.play('decoy_pop', { pan: G.audio.pan(m.x), vol: 0.55, pitch: 1.3 });
      G.fx.burst(m.x, 1.5, m.z, 18, { color: [0xffffff, m.ty.color, m.ty.glow], speed: 7, size: 0.8, life: 0.8 });
      G.fx.ring(m.x, 1.2, m.z, m.ty.glow, 4, 0.4);
      if (m.onDeath) m.onDeath(m);
      this._remove(m, false);
      return true;
    }
    void x; void z;
    return false;
  }

  update(dt, G) {
    for (const m of this.list) {
      if (!m.alive) continue;
      m.age += dt; m.flash = Math.max(0, m.flash - dt);
      if (m.path) { const p = m.path(m.age + m.t0, m); m.x = p[0]; m.z = p[1]; } else { m.x += m.vx * dt; m.z += m.vz * dt; }
      if (m.fire && m.age > 0.5 && !m.leaving) m.fire(m, dt, this);
      if (m.age > m.life || Math.abs(m.x) > 15 || m.z > 13 || m.z < -15) { this._remove(m, false); continue; }
      // 접촉 피해
      if (m.age > 0.6 && G.state === 'stage' && (m.x - G.player.x) ** 2 + (m.z - G.player.z) ** 2 < (m.hr * 0.8 + PLAYER.hr) ** 2) G.player.hurt(G);
      // 렌더
      const fade = Math.min(1, m.age / 0.4) * (m.life - m.age < 0.4 ? Math.max(0, (m.life - m.age) / 0.4) : 1);
      const pulse = 1 + Math.sin(m.age * 5) * 0.04, s = m.size * pulse;
      m.spr.position.set(m.x, 1.5, m.z); m.spr.scale.set(s, s, 1); m.spr.material.rotation = m.age * m.spin;
      const f = m.flash > 0 ? 2.0 : 1; m.mat.color.setHex(m.ty.color); if (f > 1) m.mat.color.multiplyScalar(f);
      m.mat.opacity = fade * 0.95;
      m.rim.position.set(m.x, 1.5, m.z - 0.05); m.rim.scale.set(s * 1.35, s * 1.35, 1); m.rmat.rotation = -m.age * m.spin * 0.6; m.rmat.opacity = fade * 0.55;
      m.sh.position.x = m.x; m.sh.position.z = m.z; m.sh.scale.set(s * 0.9, 1, s * 0.9);
    }
  }
}
