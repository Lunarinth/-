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
  circuit: { tex: 'mob_circuit', color: 0x9fd8ff, glow: 0x4aa8ff, bullet: { kind: 'pixel', color: 0x9fd8ff, alt: 0xffffff } },
  rose: { tex: 'mob_rose', color: 0xff9fb8, glow: 0xff8aa8, bullet: { kind: 'petal', color: 0xff9fb8, alt: 0xffd36b } },
  tome: { tex: 'mob_tome', color: 0x7fe3b5, glow: 0x3fd49a, bullet: { kind: 'page', color: 0x9fe8c4, alt: 0xffe39a } },
  ledger: { tex: 'mob_ledger', color: 0xc89bff, glow: 0xb06bff, bullet: { kind: 'glyph', color: 0xc89bff, alt: 0xffffff } },
  puppet: { tex: 'mob_puppet', color: 0xff8a9a, glow: 0xff4f6a, bullet: { kind: 'shard', color: 0xff8a9a, alt: 0xffffff } },
  eclipse: { tex: 'mob_eclipse', color: 0xa07bff, glow: 0x7a4bd8, bullet: { kind: 'orb', color: 0xa07bff, alt: 0xe4d6ff } },
  // ── 스테이지별 변종 ──
  comet: { tex: 'mob_comet', color: 0xdff0ff, glow: 0x7fa8ff, bullet: { kind: 'star', color: 0xcfe0ff, alt: 0xffffff } },
  node: { tex: 'mob_node', color: 0x9fd8ff, glow: 0x4aa8ff, bullet: { kind: 'pixel', color: 0x9fd8ff, alt: 0xffffff } },
  swift: { tex: 'mob_swift', color: 0xffb0c4, glow: 0xff8aa8, bullet: { kind: 'blade', color: 0xffd0dc, alt: 0xffffff } },
  leaf: { tex: 'mob_leaf', color: 0xffe39a, glow: 0x3fd49a, bullet: { kind: 'page', color: 0xffe39a, alt: 0x9fe8c4 } },
  seal: { tex: 'mob_seal', color: 0xd6b4ff, glow: 0xb06bff, bullet: { kind: 'glyph', color: 0xd6b4ff, alt: 0xffffff } },
  phase: { tex: 'mob_phase', color: 0xfff1c9, glow: 0xd9c8ff, bullet: { kind: 'crescent', color: 0xfff1c9, alt: 0xe3d6ff } },
  doll: { tex: 'mob_doll', color: 0xff8a9a, glow: 0xff4f6a, bullet: { kind: 'shard', color: 0xff6a80, alt: 0xffffff } },
  mask: { tex: 'mob_mask', color: 0xffd0d8, glow: 0xff4f6a, bullet: { kind: 'shard', color: 0xffa0b0, alt: 0xffffff } },
  spool: { tex: 'mob_spool', color: 0xff5a70, glow: 0xff2b4d, bullet: { kind: 'orb', color: 0xff5a70, alt: 0xffffff } },
};

export class Mobs {
  constructor(scene, T, G, n = 48) {
    this.G = G; this.T = T; this.list = []; this._uid = 0; this.linkPool = [];
    // 실(링크) 풀: 병사와 병사를 잇는 선. 주기적으로 팽팽해져 피해를 줄 수 있다 (경고 → 판정)
    const lg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const mk = (ro) => { const m = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ map: T.beam, transparent: true, depthWrite: false, blending: ADD, opacity: 0 })); m.visible = false; m.renderOrder = ro; scene.add(m); return m; };
      this.linkPool.push({ used: false, top: mk(5), gnd: mk(-7) });
    }
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
      uid: ++this._uid, face: !!o.face, faceA: 0, sway: o.sway || 0, swayF: o.swayF || 2.2, swayPh: o.swayPh ?? Math.random() * 6, tint: o.tint ?? null, rimOn: o.rim !== false, op: o.op ?? 0.95, px: o.x, pz: o.z,
    });
    m.hp = m.hpMax; m.hr = o.hr ?? m.size * 0.42;
    m.mat.map = this.T[ty.tex]; m.mat.color.setHex(ty.color); m.rmat.color.setHex(ty.glow);
    m.spr.visible = m.rim.visible = m.sh.visible = true; m.mat.opacity = 0; m.rmat.opacity = 0;
    return m;
  }

  count() { let c = 0; for (const m of this.list) if (m.alive) c++; return c; }
  clear(silent = true) { for (const m of this.list) if (m.alive) this._remove(m, !silent); this.clearLinks(); }
  clearLinks() { for (const L of this.linkPool) if (L.used) { L.used = false; L.top.visible = L.gnd.visible = false; } }

  /** 두 병사(또는 {x,z} 점)를 잇는 실. o: { color, w, every(주기), warn, dur, lw(판정폭), life, once, t0 }.
   *  every > 0 이면 every초마다 warn초 경고(굵어짐) 후 dur초 동안 팽팽해져 닿으면 피해. 한쪽이 죽으면 끊어진다. */
  link(a, b, o = {}) {
    const L = this.linkPool.find((q) => !q.used); if (!L || !a || !b) return null;
    Object.assign(L, { used: true, a, b, ua: a.uid, ub: b.uid, color: o.color ?? 0xff4a60, w: o.w ?? 0.1, every: o.every || 0, warn: o.warn ?? 1.0, dur: o.dur ?? 0.45, lw: o.lw ?? 0.5, t: o.t0 || 0, life: o.life ?? 999, age: 0, once: !!o.once, state: 0, mx: 0, mz: 0 });
    L.top.material.color.setHex(L.color); L.gnd.material.color.setHex(L.color);
    return L;
  }
  _ep(e, u) { return e.uid === undefined ? e : (e.alive && e.uid === u ? e : null); }
  _links(dt, G) {
    const P = G.player;
    for (const L of this.linkPool) {
      if (!L.used) continue;
      const A = this._ep(L.a, L.ua), Bq = this._ep(L.b, L.ub);
      L.age += dt;
      if (!A || !Bq || L.age > L.life) {
        if (L.mx || L.mz) G.fx.burst(L.mx, 1.4, L.mz, 6, { color: [L.color, 0xffffff], speed: 3, size: 0.4, life: 0.5, grav: 0 });
        L.used = false; L.top.visible = L.gnd.visible = false; continue;
      }
      if (L.every > 0) {
        L.t += dt; const tot = L.every + L.warn + L.dur;
        if (L.t >= tot) { L.t = 0; if (L.once) { L.used = false; L.top.visible = L.gnd.visible = false; continue; } }
        L.state = L.t < L.every ? 0 : L.t < L.every + L.warn ? 1 : 2;
      }
      const dx = Bq.x - A.x, dz = Bq.z - A.z, len = Math.hypot(dx, dz) || 0.01, a = Math.atan2(dz, dx), mx = (A.x + Bq.x) / 2, mz = (A.z + Bq.z) / 2;
      L.mx = mx; L.mz = mz;
      const fade = Math.min(1, L.age / 0.4);
      const sh = 0.5 + 0.2 * Math.sin(L.age * 7);
      L.top.visible = true; L.top.position.set(mx, 1.45, mz); L.top.rotation.y = -a;
      L.top.scale.set(len, 1, L.state === 2 ? 0.3 : L.w); L.top.material.opacity = fade * (L.state ? 0.95 : sh);
      if (L.state === 0) L.gnd.visible = false;
      else {
        const k = L.state === 1 ? (L.t - L.every) / L.warn : 1;
        const w = L.state === 1 ? 0.1 + 0.18 * k : L.lw;
        L.gnd.visible = true; L.gnd.position.set(mx, 0.07, mz); L.gnd.rotation.y = -a; L.gnd.scale.set(len, 1, w);
        L.gnd.material.opacity = L.state === 1 ? 0.25 + 0.5 * k * (0.6 + 0.4 * Math.sin(L.t * 30)) : 1;
        if (L.state === 2 && G.state === 'stage') {
          const vx = Bq.x - A.x, vz = Bq.z - A.z, l2 = vx * vx + vz * vz || 1;
          let u = ((P.x - A.x) * vx + (P.z - A.z) * vz) / l2; u = Math.max(0, Math.min(1, u));
          const ex = A.x + vx * u - P.x, ez = A.z + vz * u - P.z;
          if (ex * ex + ez * ez < (L.lw / 2 + PLAYER.hr) ** 2) P.hurt(G);
        }
      }
    }
  }

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
      m.px = m.x; m.pz = m.z;
      if (m.path) { const p = m.path(m.age + m.t0, m); m.x = p[0]; m.z = p[1]; } else { m.x += m.vx * dt; m.z += m.vz * dt; }
      if (m.face && dt > 0 && (m.x !== m.px || m.z !== m.pz)) m.faceA = -Math.atan2(m.z - m.pz, m.x - m.px);
      if (m.fire && m.age > 0.5 && !m.leaving) m.fire(m, dt, this);
      if (m.age > m.life || Math.abs(m.x) > 18 || m.z > 14 || m.z < -18) { this._remove(m, false); continue; }
      // 접촉 피해
      if (m.age > 0.6 && G.state === 'stage' && (m.x - G.player.x) ** 2 + (m.z - G.player.z) ** 2 < (m.hr * 0.8 + PLAYER.hr) ** 2) G.player.hurt(G);
      // 렌더
      const fade = Math.min(1, m.age / 0.4) * (m.life - m.age < 0.4 ? Math.max(0, (m.life - m.age) / 0.4) : 1);
      const pulse = 1 + Math.sin(m.age * 5) * 0.04, s = m.size * pulse;
      m.spr.position.set(m.x, 1.5, m.z); m.spr.scale.set(s, s, 1); m.spr.material.rotation = (m.face ? m.faceA : m.age * m.spin) + (m.sway ? Math.sin(m.age * m.swayF + m.swayPh) * m.sway : 0);
      const f = m.flash > 0 ? 2.0 : 1; m.mat.color.setHex(m.tint ?? m.ty.color); if (f > 1) m.mat.color.multiplyScalar(f);
      m.mat.opacity = fade * m.op;
      m.rim.position.set(m.x, 1.5, m.z - 0.05); m.rim.scale.set(s * 1.35, s * 1.35, 1); m.rmat.rotation = -m.age * m.spin * 0.6; m.rmat.opacity = m.rimOn ? fade * 0.55 : 0;
      m.sh.position.x = m.x; m.sh.position.z = m.z; m.sh.scale.set(s * 0.9, 1, s * 0.9);
    }
    this._links(dt, G);
  }
}
