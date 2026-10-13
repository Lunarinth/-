// 바닥에 떨어지는 픽업: 동전 · 하트 · 열쇠 · 성광(폭탄) · 파워(P) · 점수 · 아이템(받침대, 상점 가격표).
// 방을 떠나면 남은 픽업은 방 데이터에 저장되고, 다시 들어오면 그대로 놓인다.
import * as THREE from '../vendor/three.module.min.js';
import { itemIcon } from './icons.js';
import { ITEM_BY_ID } from './items.js';
import { ARENA_R } from './scene.js';

const ADD = THREE.AdditiveBlending;
const SIZE = { coin: 0.9, coin5: 1.0, heart: 1.0, key: 1.0, bomb: 1.0, p: 0.75, P: 1.25, point: 0.7, item: 1.9 };

export class Pickups {
  constructor(scene, RT, n = 140) {
    this.RT = RT; this.list = [];
    for (let i = 0; i < n; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: RT.coin, transparent: true, depthWrite: false }));
      spr.renderOrder = 7; spr.visible = false; scene.add(spr);
      const ped = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: RT.pedestal, transparent: true, depthWrite: false, blending: ADD, opacity: 0.8 }));
      ped.position.y = 0.06; ped.renderOrder = -8; ped.visible = false; scene.add(ped);
      this.list.push({ active: false, spr, ped });
    }
  }

  /** o: { type, x, z, vx, vz, itemId, price, free(받침대 없이), shop } */
  spawn(o) {
    const p = this.list.find((q) => !q.active); if (!p) return null;
    Object.assign(p, { active: true, type: o.type, x: o.x, z: o.z, vx: o.vx ?? 0, vz: o.vz ?? 0, age: 0, itemId: o.itemId || null, price: o.price || 0, shop: !!o.shop, pool: o.pool || null, auto: !!o.auto, seller: o.seller || null, delay: o.delay ?? 0.35, lock: !!o.lock, value: o.value || 1, bob: Math.random() * 6 });
    const it = p.itemId ? ITEM_BY_ID[p.itemId] : null;
    p.spr.material.map = it ? itemIcon(it).tex : (this.RT[p.type] || this.RT.coin);
    p.spr.material.needsUpdate = true; p.spr.visible = true;
    p.ped.visible = p.type === 'item';
    return p;
  }
  /** 흩뿌리기: 위치에서 랜덤한 방향으로 튀어나간다 */
  burst(type, x, z, n = 1, o = {}) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 3; this.spawn({ type, x, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, ...o }); } }
  /** 받침대 위 아이템을 다른 아이템으로 바꾼다 (운명의 실타래) */
  respec(p, itemId) { p.itemId = itemId; const it = ITEM_BY_ID[itemId]; p.spr.material.map = itemIcon(it).tex; p.spr.material.needsUpdate = true; p.age = 0; }
  /** 바닥의 파워 · 점수 아이템을 전부 플레이어에게 끌어온다 */
  collectAll() { for (const p of this.list) if (p.active && (p.type === 'p' || p.type === 'P' || p.type === 'point')) { p.auto = true; p.delay = Math.min(p.delay, 0.25); } }
  kill(p) { p.active = false; p.spr.visible = false; p.ped.visible = false; }
  clear() { for (const p of this.list) if (p.active) this.kill(p); }
  items() { return this.list.filter((p) => p.active && p.type === 'item'); }

  snapshot() { return this.list.filter((p) => p.active).map((p) => ({ type: p.type, x: p.x, z: p.z, itemId: p.itemId, price: p.price, shop: p.shop, value: p.value, pool: p.pool, seller: p.seller })); }
  restore(arr) { this.clear(); for (const d of arr || []) this.spawn({ ...d, delay: 0.2 }); }

  update(dt, G) {
    const P = G.player, mag = P.magnetR ? P.magnetR() : 2.2;
    for (const p of this.list) {
      if (!p.active) continue;
      p.age += dt; p.delay -= dt;
      const isItem = p.type === 'item';
      // 이동 (마찰) · 자석
      if (!isItem) {
        const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz);
        const small = p.type === 'p' || p.type === 'P' || p.type === 'point';
        // 동방식 자동 회수: 회수선(화면 위쪽) · 단계 격파 · 풀 파워
        const auto = small && (p.auto || P.z < -3.6);
        const magnetic = p.delay <= 0 && P.alive && (auto || d < mag || small && (P.focus && d < mag * 2.2));
        if (magnetic && !(p.type === 'heart' && P.hp >= P.maxHp) && !p.shop) { const sp = (auto ? 40 : 14) / Math.max(0.6, d); p.vx += (dx / d) * sp * dt * 6; p.vz += (dz / d) * sp * dt * 6; }
        p.vx *= Math.exp(-dt * 3.2); p.vz *= Math.exp(-dt * 3.2);
        p.x += p.vx * dt; p.z += p.vz * dt;
        const l = Math.hypot(p.x, p.z), lim = ARENA_R - 0.8; if (l > lim) { p.x *= lim / l; p.z *= lim / l; p.vx *= -0.4; p.vz *= -0.4; }
      }
      // 렌더
      const s = SIZE[p.type] ?? 1, y = isItem ? 1.6 + Math.sin(p.age * 2 + p.bob) * 0.18 : 0.55 + Math.abs(Math.sin(p.age * 5 + p.bob)) * 0.15;
      p.spr.position.set(p.x, y, p.z); p.spr.scale.set(s, s, 1); p.spr.material.opacity = Math.min(1, p.age * 4);
      if (isItem) { p.ped.position.set(p.x, 0.06, p.z); const ps = 2.6 + Math.sin(p.age * 2) * 0.1; p.ped.scale.set(ps, 1, ps); p.ped.material.opacity = 0.55 + 0.2 * Math.sin(p.age * 3); }
      // 줍기
      if (p.lock && (P.x - p.x) ** 2 + (P.z - p.z) ** 2 > 2.6) p.lock = false; // 내려놓은 물건은 한 번 떨어졌다가 다시 밟아야 집는다
      if (p.delay <= 0 && P.alive && !p.lock) {
        const r = isItem ? 1.1 : 0.85;
        if ((P.x - p.x) ** 2 + (P.z - p.z) ** 2 < r * r) { if (G.collectPickup(p)) this.kill(p); }
      }
    }
  }
}
