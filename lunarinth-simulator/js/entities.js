// 풀링되는 월드 객체: 탄, 파티클, 바닥 텔레그래프(원/범), 투척체.
// 좌표계: x = 좌우, z = 앞뒤(+z가 카메라 쪽), y = 높이. 각도 a 는 (cos a, sin a) = (x, z) 방향.
import * as THREE from '../vendor/three.module.min.js';

const BULLET_Y = 0.9;
const KIND_TEX = { crescent: 'crescent', shard: 'shard', ring: 'ring', star: 'spark', glyph: 'glyph', pixel: 'pixel', page: 'pagebullet', blade: 'blade', petal: 'petal' };
const ADD = THREE.AdditiveBlending;
const TAU = Math.PI * 2;

function spriteMat(map, o = {}) {
  return new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: o.add === false ? THREE.NormalBlending : ADD, color: o.color ?? 0xffffff, opacity: o.opacity ?? 1 });
}
const wrapPi = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

// ───────────────────────── 탄 ─────────────────────────
export class Bullets {
  static mono = false; // APOTHEOSIS: 적 탄은 전부 흰색
  constructor(scene, T, n = 900) {
    this.T = T; this.cursor = 0;
    this.list = [];
    for (let i = 0; i < n; i++) {
      const mat = spriteMat(T.orb), spr = new THREE.Sprite(mat); spr.visible = false; spr.renderOrder = 10;
      const cmat = spriteMat(T.orb, { color: 0xffffff }), core = new THREE.Sprite(cmat); core.visible = false; core.renderOrder = 11;
      scene.add(spr); scene.add(core);
      this.list.push({ active: false, spr, mat, core, cmat });
    }
  }

  spawn(o) {
    const L = this.list, n = L.length;
    let b = null;
    for (let k = 0; k < n; k++) { const c = L[(this.cursor + k) % n]; if (!c.active) { b = c; this.cursor = (this.cursor + k + 1) % n; break; } }
    if (!b) return null;
    const a = o.a ?? 0, sp = o.speed ?? 6;
    b.active = true; b.owner = o.owner || 'boss'; b.kind = o.kind || 'orb';
    b.x = o.x; b.z = o.z; b.vx = Math.cos(a) * sp; b.vz = Math.sin(a) * sp;
    b.size = o.size ?? 1;
    b.hr = o.hr ?? b.size * (b.kind === 'crescent' ? 0.3 : b.kind === 'shard' ? 0.24 : b.kind === 'star' ? 0.26 : b.kind === 'glyph' ? 0.3 : b.kind === 'blade' ? 0.2 : b.kind === 'pixel' || b.kind === 'page' ? 0.28 : b.kind === 'petal' ? 0.25 : 0.28);
    b.armAt = (o.delay || 0) + (o.arm ?? (o.hold ? 0.55 : 0)); // 출현 직후에는 판정이 없다 (눈앞에서 생긴 탄에 즉사하지 않게)
    b.hold = o.hold || 0; b.reaim = !!o.reaim; b.relSpeed = sp; b.relA = a;
    b.life = o.life ?? 9; b.age = 0;
    b.homing = o.homing || 0; b.homeT = o.homeT ?? 3; b.turn = o.turn || 0;
    b.accel = o.accel || 0; b.minS = o.minS ?? 0; b.maxS = o.maxS ?? 99;
    b.spin = o.spin || 0; b.rot = o.rot ?? (b.kind === 'crescent' || b.kind === 'blade' || b.kind === 'page' || b.kind === 'petal' ? -a : 0);
    b.dmg = o.dmg ?? 1; b.grazed = false; b.reflected = false; b.trail = !!o.trail; b.trailT = 0;
    b.delay = o.delay || 0; b.tag = o.tag || null; b.accelAt = o.accelAt || 0; b.orbit = o.orbit ? { ...o.orbit } : null;
    b.speeds = o.speeds || null; b.baseS = sp; b.wob = o.wob || null; b.wobPh = o.wobPh ?? 0; b.fn = o.fn || null;
    b.color = (Bullets.mono && b.owner === 'boss') ? 0xffffff : (o.color ?? 0xffffff);
    b.mat.map = this.T[KIND_TEX[b.kind] || 'orb'];
    b.mat.color.setHex(b.color); b.mat.opacity = 0; b.mat.rotation = b.rot;
    const hot = (b.kind === 'orb' || b.kind === 'shard' || b.kind === 'star' || b.kind === 'pixel') && b.owner !== 'player';
    b.core.visible = hot; b.cmat.opacity = 0;
    b.spr.visible = true; b.spr.position.set(b.x, BULLET_Y, b.z);
    b.core.position.set(b.x, BULLET_Y, b.z);
    return b;
  }

  kill(b) { b.active = false; b.spr.visible = false; b.core.visible = false; }

  clearBoss(fx) {
    for (const b of this.list) if (b.active && b.owner === 'boss') { if (fx) fx.puff(b.x, BULLET_Y, b.z, b.color, 1); this.kill(b); }
  }
  clearAll() { for (const b of this.list) if (b.active) this.kill(b); }
  count() { let c = 0; for (const b of this.list) if (b.active) c++; return c; }

  update(dt, px, pz, fx, tx = 0, tz = -6) {
    for (const b of this.list) {
      if (!b.active) continue;
      b.age += dt;
      if (b.delay > 0) { b.delay -= dt; continue; }
      if (b.hold > 0) {
        // 정지 상태로 대기했다가 방출 (별자리 · 마법진 등). reaim 이면 방출 순간 플레이어를 조준한다.
        b.hold -= dt;
        if (b.hold <= 0) {
          const ra = b.reaim ? Math.atan2(pz - b.z, px - b.x) : b.relA;
          b.vx = Math.cos(ra) * b.relSpeed; b.vz = Math.sin(ra) * b.relSpeed;
        } else {
          const pop0 = Math.min(1, b.age / 0.14), s0 = b.size * (0.35 + 0.65 * pop0);
          b.mat.opacity = pop0 * (0.55 + 0.35 * Math.sin(b.age * 14)); b.spr.scale.set(s0, s0, 1);
          if (b.core.visible) { b.cmat.opacity = pop0; b.core.scale.set(s0 * 0.42, s0 * 0.42, 1); }
          b.life -= dt; if (b.life <= 0) this.kill(b);
          continue;
        }
      }
      if (b.homing && (b.owner === 'boss' || b.owner === 'player') && b.age < b.homeT) {
        const gx = b.owner === 'boss' ? px : tx, gz = b.owner === 'boss' ? pz : tz;
        const sp = Math.hypot(b.vx, b.vz) || 1, cur = Math.atan2(b.vz, b.vx), want = Math.atan2(gz - b.z, gx - b.x);
        const d = Math.max(-b.homing * dt, Math.min(b.homing * dt, wrapPi(want - cur)));
        const na = cur + d; b.vx = Math.cos(na) * sp; b.vz = Math.sin(na) * sp;
      }
      if (b.turn) {
        const c = Math.cos(b.turn * dt), s = Math.sin(b.turn * dt), vx = b.vx * c - b.vz * s;
        b.vz = b.vx * s + b.vz * c; b.vx = vx;
      }
      if (b.speeds) { // 변속: [[시간, 배율], ...] 키프레임 보간 (정지 · 급가속 · 감속 반복)
        const K = b.speeds; let m = K[K.length - 1][1];
        for (let i = 0; i < K.length - 1; i++) if (b.age < K[i + 1][0]) { const u = Math.max(0, (b.age - K[i][0]) / (K[i + 1][0] - K[i][0])); m = K[i][1] + (K[i + 1][1] - K[i][1]) * u; break; }
        const sp0 = Math.hypot(b.vx, b.vz) || 0.0001, ns0 = Math.max(0.0001, b.baseS * m); b.vx *= ns0 / sp0; b.vz *= ns0 / sp0;
      }
      if (b.wob) { // 왜곡: 진행 방향이 사인파로 흔들린다 [진폭(rad/s), 주파수]
        const r = b.wob[0] * Math.sin(b.wob[1] * b.age + b.wobPh) * dt, c = Math.cos(r), sn = Math.sin(r), vx = b.vx * c - b.vz * sn;
        b.vz = b.vx * sn + b.vz * c; b.vx = vx;
      }
      if (b.fn) b.fn(b, dt);
      if (b.accel && b.age >= b.accelAt) {
        const sp = Math.hypot(b.vx, b.vz) || 0.0001, ns = Math.max(b.minS, Math.min(b.maxS, sp + b.accel * dt));
        b.vx *= ns / sp; b.vz *= ns / sp;
      }
      if (b.orbit) {
        // 한 점을 중심으로 공전하는 탄 (빛의 고리 등)
        const ob = b.orbit; ob.ang += ob.w * dt; if (ob.dr) ob.r += ob.dr * dt;
        b.x = ob.cx + Math.cos(ob.ang) * ob.r; b.z = ob.cz + Math.sin(ob.ang) * ob.r;
      } else { b.x += b.vx * dt; b.z += b.vz * dt; }
      b.life -= dt;
      if (b.life <= 0 || b.x * b.x + b.z * b.z > 20 * 20) { this.kill(b); continue; }
      if (b.spin) b.mat.rotation += b.spin * dt;
      // 등장 연출 (팝인)
      const pop = Math.min(1, b.age / 0.14), s = b.size * (0.35 + 0.65 * pop) * 1.0;
      const fade = b.life < 0.3 ? b.life / 0.3 : 1;
      b.mat.opacity = pop * fade * (b.owner === 'player' ? 0.62 : 0.95);
      b.spr.scale.set(s, s, 1);
      b.spr.position.set(b.x, BULLET_Y, b.z);
      if (b.core.visible) {
        const cs = s * 0.42; b.cmat.opacity = pop * fade; b.core.scale.set(cs, cs, 1); b.core.position.set(b.x, BULLET_Y, b.z);
      }
      if (b.trail && fx) { b.trailT -= dt; if (b.trailT <= 0) { b.trailT = 0.07; fx.emit({ x: b.x, y: BULLET_Y, z: b.z, life: 0.55, s0: b.size * 0.7, s1: 0.1, color: b.color, vy: 0.1, tex: 'orb', op: 0.6 }); } }
    }
  }
}

// ───────────────────────── 파티클 ─────────────────────────
export class Particles {
  constructor(scene, T, n = 700) {
    this.T = T; this.cursor = 0; this.list = [];
    for (let i = 0; i < n; i++) {
      const mat = spriteMat(T.dot), spr = new THREE.Sprite(mat); spr.visible = false; spr.renderOrder = 12; scene.add(spr);
      this.list.push({ active: false, spr, mat });
    }
  }
  emit(o) {
    const L = this.list, n = L.length;
    let p = null;
    for (let k = 0; k < n; k++) { const c = L[(this.cursor + k) % n]; if (!c.active) { p = c; this.cursor = (this.cursor + k + 1) % n; break; } }
    if (!p) return;
    p.active = true; p.x = o.x; p.y = o.y; p.z = o.z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.grav = o.grav || 0; p.drag = o.drag ?? 0;
    p.life = p.max = o.life ?? 0.6; p.s0 = o.s0 ?? 0.4; p.s1 = o.s1 ?? 0; p.op = o.op ?? 1;
    p.mat.map = this.T[o.tex || 'dot']; p.mat.color.setHex(o.color ?? 0xffffff); p.mat.rotation = o.rot || 0; p.spin = o.spin || 0;
    p.spr.visible = true; p.spr.position.set(p.x, p.y, p.z);
  }
  burst(x, y, z, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, e = (Math.random() - 0.3) * (o.up ?? 1), sp = (o.speed ?? 4) * (0.35 + Math.random() * 0.8);
      this.emit({
        x, y, z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: e * sp * 0.8 + (o.lift ?? 0.5),
        grav: o.grav ?? 5, drag: o.drag ?? 1.2, life: (o.life ?? 0.6) * (0.6 + Math.random() * 0.7),
        s0: (o.size ?? 0.5) * (0.6 + Math.random() * 0.8), s1: 0, color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : (o.color ?? 0xffffff),
        tex: o.tex || 'spark', spin: (Math.random() - 0.5) * 6, op: 1,
      });
    }
  }
  puff(x, y, z, color, n = 1) { this.burst(x, y, z, 3 * n, { color, speed: 2.2, size: 0.38, life: 0.45, grav: 0 }); }
  ring(x, y, z, color, size = 4, life = 0.5) { this.emit({ x, y, z, life, s0: 0.3, s1: size, color, tex: 'ring', op: 0.9 }); }
  update(dt) {
    for (const p of this.list) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.spr.visible = false; continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy -= p.grav * dt; p.vy *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05 && p.grav) { p.y = 0.05; p.vy = Math.abs(p.vy) * 0.3; }
      const t = 1 - p.life / p.max, s = p.s0 + (p.s1 - p.s0) * t;
      p.mat.opacity = p.op * (t < 0.15 ? t / 0.15 : 1 - Math.pow(t, 2.2)); p.mat.rotation += p.spin * dt;
      p.spr.scale.set(s, s, 1); p.spr.position.set(p.x, p.y, p.z);
    }
  }
}

// ───────────────────────── 바닥 텔레그래프 ─────────────────────────
// 원형 폭발 구역: 경고(warn) → 폭발(active) → 소멸.
export class Zones {
  constructor(scene, T, n = 48) {
    this.T = T; this.list = [];
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const disc = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: T.zone, transparent: true, depthWrite: false, blending: ADD, opacity: 0 }));
      const conv = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: ADD, opacity: 0 }));
      disc.position.y = 0.05; conv.position.y = 0.06; disc.visible = conv.visible = false; disc.renderOrder = -10; conv.renderOrder = -9;
      const pil = new THREE.Sprite(spriteMat(T.pillar)); pil.visible = false; pil.renderOrder = 9;
      scene.add(disc); scene.add(conv); scene.add(pil);
      this.list.push({ active: false, disc, conv, pil });
    }
  }
  spawn(o) {
    const z = this.list.find((q) => !q.active); if (!z) return null;
    z.active = true; z.x = o.x; z.z = o.z; z.r = o.r ?? 1.6; z.warn = o.warn ?? 0.9; z.dur = o.dur ?? 0.3; z.t = 0; z.state = 0;
    z.color = o.color ?? 0xffffff; z.dmg = o.dmg ?? 1; z.onBoom = o.onBoom || null; z.kind = o.kind || 'light'; z.pull = o.pull;
    z.disc.position.set(z.x, 0.05, z.z); z.conv.position.set(z.x, 0.06, z.z);
    z.disc.material.color.setHex(z.color); z.conv.material.color.setHex(z.color); z.pil.material.color.setHex(z.color);
    z.disc.visible = z.conv.visible = true; z.pil.visible = false;
    return z;
  }
  clear() { for (const z of this.list) if (z.active) { z.active = false; z.disc.visible = z.conv.visible = z.pil.visible = false; } }
  /** @returns 플레이어가 맞은 데미지 (없으면 0). 폭발 구역 안에 있는 동안 계속 판정되지만 무적 시간이 연타를 막는다. */
  update(dt, px, pz, pr, fx, audio, world) {
    let hit = 0;
    this.bound = false; // 구속 마법진(bind) 안에 있으면 true — 이동 속도가 느려진다
    this.invert = false; this.lag = false; this.pullX = 0; this.pullZ = 0; // 기믹 장: 조작 반전 / 입력 지연 / 중력
    for (const z of this.list) {
      if (!z.active) continue;
      z.t += dt;
      if (z.kind === 'bind' || z.kind === 'invert' || z.kind === 'lag' || z.kind === 'gravity') {
        // 구속진: 경고 없이 페이드 인 → 유지 → 소멸. 피해는 없고 이동만 둔화시킨다.
        const life = z.warn + z.dur, k = z.t / life;
        z.disc.scale.set(z.r * 2, 1, z.r * 2); z.conv.scale.set(z.r * 2.15, 1, z.r * 2.15);
        z.conv.rotation.y += dt * 1.4;
        const fade = Math.min(1, z.t / 0.35) * (z.t > life - 0.4 ? Math.max(0, (life - z.t) / 0.4) : 1);
        z.disc.material.opacity = 0.42 * fade; z.conv.material.opacity = 0.85 * fade;
        const inside = z.t > 0.35 && (px - z.x) ** 2 + (pz - z.z) ** 2 < z.r * z.r;
        if (inside) {
          if (z.kind === 'bind') this.bound = true;
          else if (z.kind === 'invert') this.invert = true;
          else if (z.kind === 'lag') this.lag = true;
          else { const dx = z.x - px, dz = z.z - pz, d = Math.hypot(dx, dz) || 1, s = (z.pull ?? 4.2) * (0.5 + 0.5 * Math.min(1, d / z.r)); this.pullX += (dx / d) * s; this.pullZ += (dz / d) * s; }
        }
        if (z.kind === 'gravity') z.conv.rotation.y -= dt * 3.2;
        if (k >= 1) { z.active = false; z.disc.visible = z.conv.visible = z.pil.visible = false; }
        continue;
      }
      if (z.state === 0) {
        const k = z.t / z.warn;
        z.disc.scale.set(z.r * 2, 1, z.r * 2);
        z.disc.material.opacity = 0.22 + 0.5 * k + 0.12 * Math.sin(z.t * 22);
        const cs = z.r * 2 * (1 + (1 - k) * 1.1); z.conv.scale.set(cs, 1, cs); z.conv.material.opacity = 0.35 + 0.5 * k;
        if (z.t >= z.warn) {
          z.state = 1; z.t = 0;
          z.pil.visible = true; z.pil.position.set(z.x, 4.6, z.z);
          fx.burst(z.x, 0.3, z.z, 14, { color: [z.color, 0xffffff], speed: 5, size: 0.6, life: 0.7, up: 1.5 });
          fx.ring(z.x, 0.2, z.z, z.color, z.r * 2.4, 0.45);
          audio.sfx.play('zone_hit', { pan: audio.pan(z.x) });
          world.shake(0.18, 0.2);
          if (z.onBoom) z.onBoom(z);
        }
      } else if (z.state === 1) {
        const k = z.t / z.dur;
        z.pil.scale.set(z.r * 1.9 * (1 - k * 0.4), 12, 1); z.pil.material.opacity = 1 - k;
        z.disc.material.opacity = 1 - k * 0.8; z.conv.material.opacity = 0;
        if (z.dmg && (px - z.x) ** 2 + (pz - z.z) ** 2 < (z.r + pr) ** 2) hit = Math.max(hit, z.dmg);
        if (z.t >= z.dur) { z.active = false; z.disc.visible = z.conv.visible = z.pil.visible = false; }
      }
    }
    return hit;
  }
}

// 직선 범: 경고 → 발사 → 소멸. 사각 스윕 판정.
export class Beams {
  constructor(scene, T, n = 14) {
    this.list = [];
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: T.beam, transparent: true, depthWrite: false, blending: ADD, opacity: 0 }));
      const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: T.beam, transparent: true, depthWrite: false, blending: ADD, opacity: 0, color: 0xffffff }));
      m.visible = core.visible = false; m.renderOrder = -8; core.renderOrder = -7; scene.add(m); scene.add(core);
      this.list.push({ active: false, m, core });
    }
  }
  spawn(o) {
    const b = this.list.find((q) => !q.active); if (!b) return null;
    Object.assign(b, { active: true, x: o.x, z: o.z, a: o.a, w: o.w ?? 1.3, len: o.len ?? 26, warn: o.warn ?? 0.9, dur: o.dur ?? 0.25, t: 0, state: 0, color: o.color ?? 0xffffff, dmg: o.dmg ?? 1, fired: false, onFire: o.onFire || null, quiet: !!o.quiet });
    b.m.material.color.setHex(b.color); b.m.visible = b.core.visible = true;
    return b;
  }
  clear() { for (const b of this.list) if (b.active) { b.active = false; b.m.visible = b.core.visible = false; } }
  update(dt, px, pz, pr, fx, audio, world) {
    let hit = 0;
    for (const b of this.list) {
      if (!b.active) continue;
      b.t += dt;
      let w, op;
      if (b.state === 0) {
        const k = b.t / b.warn; w = b.w * (0.12 + 0.12 * k); op = 0.3 + 0.5 * k * (0.7 + 0.3 * Math.sin(b.t * 30));
        if (b.t >= b.warn) {
          b.state = 1; b.t = 0;
          if (!b.quiet) { world.shake(0.28, 0.25); audio.sfx.play('beam_fire', { pan: audio.pan(b.x) }); }
          const ex = b.x + Math.cos(b.a) * b.len * 0.5, ez = b.z + Math.sin(b.a) * b.len * 0.5;
          if (!b.quiet) fx.ring(b.x, 0.8, b.z, b.color, 3, 0.4); void ex; void ez;
          if (b.onFire) b.onFire(b);
        }
      } else {
        const k = b.t / b.dur; w = b.w * (1 - k * 0.55); op = 1 - k * k;
        const dx = Math.cos(b.a), dz = Math.sin(b.a), rx = px - b.x, rz = pz - b.z;
        const along = rx * dx + rz * dz, perp = Math.abs(-rx * dz + rz * dx);
        if (along > -0.5 && along < b.len && perp < w * 0.5 + pr && b.dmg) hit = Math.max(hit, b.dmg);
        if (!b.quiet && Math.random() < 0.6) fx.emit({ x: b.x + dx * Math.random() * b.len, y: 0.4 + Math.random() * 0.6, z: b.z + dz * Math.random() * b.len, life: 0.4, s0: 0.5, s1: 0, color: 0xffffff, tex: 'spark', vy: 1.5 });
        if (b.t >= b.dur) { b.active = false; b.m.visible = b.core.visible = false; continue; }
      }
      const cx = b.x + Math.cos(b.a) * b.len * 0.5, cz = b.z + Math.sin(b.a) * b.len * 0.5;
      for (const [mesh, ww, oo] of [[b.m, w, op], [b.core, w * 0.4, op * (b.state ? 1 : 0.4)]]) {
        mesh.position.set(cx, 0.07, cz); mesh.rotation.y = -b.a; mesh.scale.set(b.len, 1, Math.max(0.05, ww)); mesh.material.opacity = oo;
      }
    }
    return hit;
  }
}

// ───────────────────────── 투척체 (거대한 달 등) ─────────────────────────
export class Flyers {
  constructor(scene, T) {
    this.scene = scene; this.T = T; this.list = [];
    for (let i = 0; i < 4; i++) {
      const spr = new THREE.Sprite(spriteMat(T.moon)); spr.visible = false; spr.renderOrder = 8; scene.add(spr);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0 }));
      sh.visible = false; sh.position.y = 0.04; scene.add(sh);
      this.list.push({ active: false, spr, sh });
    }
  }
  launch(o) {
    const f = this.list.find((q) => !q.active); if (!f) { if (o.onLand) o.onLand(); return; }
    Object.assign(f, { active: true, x0: o.x0, z0: o.z0, y0: o.y0 ?? 4, x1: o.x1, z1: o.z1, dur: o.dur, t: 0, size: o.size ?? 3, color: o.color ?? 0xffffff, onLand: o.onLand, arc: o.arc ?? 5 });
    f.spr.material.color.setHex(f.color); f.spr.visible = f.sh.visible = true;
  }
  clear() { for (const f of this.list) { f.active = false; f.spr.visible = f.sh.visible = false; } }
  update(dt, fx) {
    for (const f of this.list) {
      if (!f.active) continue;
      f.t += dt; const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k) * 0.35 + k * 0.65;
      const x = f.x0 + (f.x1 - f.x0) * e, z = f.z0 + (f.z1 - f.z0) * e, y = f.y0 * (1 - e) + 1.4 * e + Math.sin(e * Math.PI) * f.arc;
      const s = f.size * (0.6 + 0.4 * k);
      f.spr.position.set(x, y, z); f.spr.scale.set(s, s, 1); f.spr.material.rotation += dt * 2;
      f.sh.position.set(x, 0.04, z); f.sh.scale.set(s * 1.2, 1, s * 1.2); f.sh.material.opacity = 0.2 + 0.6 * k;
      if (Math.random() < 0.8) fx.emit({ x, y, z, life: 0.5, s0: s * 0.5, s1: 0.1, color: f.color, tex: 'orb', op: 0.5, vy: 0.2 });
      if (k >= 1) { f.active = false; f.spr.visible = f.sh.visible = false; if (f.onLand) f.onLand(f); }
    }
  }
}
