// 층(floor) 생성과 방 사이의 문. 아이작의 번제처럼 격자 위에 방을 뻗어 나가게 만들고,
// 막다른 방에 보스방 · 보물방 · 휴식방(상인) · 도전방을 배치한다.
import * as THREE from '../vendor/three.module.min.js';
import { ARENA_R } from './scene.js';

export const DIRS = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
export const OPP = { N: 'S', S: 'N', W: 'E', E: 'W' };
const W = 9, H = 8;
const key = (x, y) => `${x},${y}`;

export const ROOM_INFO = {
  start: { name: '시작의 방', color: 0xd9c8ff },
  normal: { name: '방', color: 0xffffff },
  treasure: { name: '보물방', color: 0xffd34a },
  rest: { name: '휴식방', color: 0x7fe3b5 },
  mini: { name: '수호자의 방', color: 0xff9a4a },
  challenge: { name: '도전방', color: 0xc48bff },
  boss: { name: '보스방', color: 0xff3b5c },
};

/** cfg: { idx(층 번호 0~), rooms(목표 방 수), infinite(인피니트 해금), special } */
export function genFloor(cfg, rng = Math.random) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const grid = new Map(), list = [];
    const add = (x, y) => { const r = { key: key(x, y), gx: x, gy: y, type: 'normal', doors: {}, cleared: false, visited: false, known: false, pickups: [], data: {} }; grid.set(r.key, r); list.push(r); return r; };
    const start = add(4, 4);
    const nCount = (x, y) => Object.values(DIRS).reduce((c, [dx, dy]) => c + (grid.has(key(x + dx, y + dy)) ? 1 : 0), 0);
    let guard = 0;
    while (list.length < cfg.rooms && guard++ < 2000) {
      const base = list[Math.floor(rng() * list.length)];
      const [dx, dy] = Object.values(DIRS)[Math.floor(rng() * 4)];
      const x = base.gx + dx, y = base.gy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H || grid.has(key(x, y))) continue;
      if (nCount(x, y) > 1) continue;
      if (rng() < 0.5 && list.length > 1 && base === start) continue; // 시작 방에서만 뻗어 나가지 않게
      add(x, y);
    }
    // 연결
    for (const r of list) for (const [d, [dx, dy]] of Object.entries(DIRS)) { const n = grid.get(key(r.gx + dx, r.gy + dy)); if (n) r.doors[d] = n.key; }
    // 거리 (BFS)
    const dist = new Map([[start.key, 0]]), q = [start];
    while (q.length) { const r = q.shift(); for (const k of Object.values(r.doors)) if (!dist.has(k)) { dist.set(k, dist.get(r.key) + 1); q.push(grid.get(k)); } }
    for (const r of list) r.dist = dist.get(r.key);
    const dead = list.filter((r) => r !== start && Object.keys(r.doors).length === 1).sort((a, b) => b.dist - a.dist);
    const need = 3 + (cfg.idx >= 1 ? 1 : 0);
    if (dead.length < need) continue;
    // 배치
    const boss = dead.shift(); boss.type = 'boss';
    if (boss.dist < 3) continue;
    const pick = () => dead.splice(Math.floor(rng() * dead.length), 1)[0];
    const tre = pick(); tre.type = 'treasure'; tre.cleared = true; if (cfg.idx >= 1 && !cfg.noLock) tre.lock = true;
    const rest = pick(); rest.type = 'rest'; rest.cleared = true;
    rest.merchant = cfg.infinite && rng() < 0.32 ? 'infinite' : rng() < 0.8 ? 'sitra' : null;
    if (cfg.idx >= 1 && dead.length) { const ch = pick(); ch.type = 'challenge'; }
    // 수호자의 방 (중간 보스): 시작과 보스 사이의 일반 방
    if (cfg.mid) {
      const cand = list.filter((r) => r.type === 'normal' && r !== start && r.dist >= 2);
      if (!cand.length) continue;
      const m = cand[Math.floor(rng() * cand.length)]; m.type = 'mini';
    }
    start.type = 'start'; start.cleared = true; start.visited = true; start.known = true;
    for (const k of Object.values(start.doors)) grid.get(k).known = true;
    return { grid, list, start: start.key, boss: boss.key, idx: cfg.idx };
  }
  throw new Error('floor generation failed');
}

// ───────────────────────── 문 · 함정문 · 상인 표시 ─────────────────────────
const DOOR_POS = { N: [0, -ARENA_R + 0.35], S: [0, ARENA_R - 0.35], W: [-ARENA_R + 0.35, 0], E: [ARENA_R - 0.35, 0] };
export { DOOR_POS };

export class RoomView {
  constructor(scene, RT) {
    this.RT = RT; this.doors = {};
    const plateGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    for (const d of Object.keys(DIRS)) {
      const arch = new THREE.Sprite(new THREE.SpriteMaterial({ map: RT.door, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const bars = new THREE.Sprite(new THREE.SpriteMaterial({ map: RT.doorBars, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff3b5c }));
      const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: RT.doorLock, transparent: true, depthWrite: false }));
      const plate = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ map: RT.pedestal, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      for (const o of [arch, bars, icon]) { o.renderOrder = 4; o.visible = false; scene.add(o); }
      plate.renderOrder = -9; plate.visible = false; plate.position.y = 0.07; scene.add(plate);
      this.doors[d] = { arch, bars, icon, plate, t: 0 };
    }
    this.trap = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ map: RT.trapdoor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.trap.renderOrder = -8; this.trap.position.y = 0.08; this.trap.visible = false; scene.add(this.trap);
    this.npc = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); this.npc.renderOrder = 5; this.npc.visible = false; scene.add(this.npc);
    this.deco = new THREE.Sprite(new THREE.SpriteMaterial({ map: RT.fountain, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.deco.renderOrder = 4; this.deco.visible = false; scene.add(this.deco);
    this.t = 0; this.trapOn = false; this.npcTex = {};
  }
  /** room: 현재 방, floor: 층, open: 문이 열려 있는가 */
  set(floor, room, open) {
    this.floor = floor; this.room = room; this.open = open;
    for (const [d, D] of Object.entries(this.doors)) {
      const k = room.doors[d], on = !!k;
      D.arch.visible = D.plate.visible = on; D.bars.visible = on && !open; D.icon.visible = false;
      if (!on) continue;
      const to = floor.grid.get(k), col = (to && (to.type === 'boss' || to.type === 'treasure' || to.type === 'rest' || to.type === 'mini' || to.type === 'challenge')) ? ROOM_COLORS[to.type] : 0xffffff;
      D.arch.material.color.setHex(col); D.plate.material.color.setHex(col);
      D.locked = !!(to && to.lock && !to.unlocked);
      D.icon.visible = D.locked; D.icon.material.map = this.RT.doorLock;
      if (to && to.type === 'boss') { D.icon.visible = true; D.icon.material.map = this.RT.skull; }
      D.to = to;
    }
    this.npc.visible = false; this.deco.visible = false;
    if (room.type === 'rest') {
      if (room.merchant && this.npcTex[room.merchant]) { const n = this.npcTex[room.merchant]; this.npc.material.map = n.tex; this.npc.material.needsUpdate = true; this.npc.visible = true; this.npcAspect = n.aspect; }
      else this.deco.visible = !room.data.fountainUsed; // 쓴 샘물은 마른다
    }
  }
  setOpen(open) { this.open = open; for (const D of Object.values(this.doors)) D.bars.visible = D.arch.visible && !open; }
  showTrap(on) { this.trapOn = on; this.trap.visible = on; }
  hideAll() { for (const D of Object.values(this.doors)) { D.arch.visible = D.bars.visible = D.icon.visible = D.plate.visible = false; } this.trap.visible = false; this.trapOn = false; this.npc.visible = false; this.deco.visible = false; }
  update(dt) {
    this.t += dt;
    for (const [d, D] of Object.entries(this.doors)) {
      if (!D.arch.visible) continue;
      const [x, z] = DOOR_POS[d], far = d === 'N', near = d === 'S';
      const h = near ? 2.0 : far ? 3.6 : 3.0;
      D.arch.position.set(x, h / 2, z); D.arch.scale.set(h * 0.9, h, 1);
      D.arch.material.opacity = this.open ? 0.85 + Math.sin(this.t * 3) * 0.1 : 0.4;
      D.bars.position.set(x, h / 2, z + (near ? -0.1 : 0.05)); D.bars.scale.set(h * 0.9, h, 1); D.bars.material.opacity = 0.9;
      D.icon.position.set(x, h * 0.95, z + 0.1); D.icon.scale.set(1, 1, 1);
      D.plate.position.set(x, 0.07, z); const ps = this.open ? 2.4 + Math.sin(this.t * 4) * 0.15 : 1.8; D.plate.scale.set(ps, 1, ps); D.plate.material.opacity = this.open ? 0.75 : 0.3;
    }
    if (this.trap.visible) { this.trap.scale.set(3.4, 1, 3.4); this.trap.position.set(0, 0.08, -1.0); this.trap.rotation.y = this.t * 0.4; }
    if (this.npc.visible) { const h = 4.2, w = h * (this.npcAspect || 0.8); this.npc.position.set(0, h / 2 + Math.sin(this.t * 1.6) * 0.1, -6.2); this.npc.scale.set(w, h, 1); }
    if (this.deco.visible) { this.deco.position.set(0, 1.6, -6.2); this.deco.scale.set(4, 4, 1); this.deco.material.opacity = 0.75 + Math.sin(this.t * 2) * 0.1; }
  }
}
const ROOM_COLORS = { boss: 0xff3b5c, treasure: 0xffd34a, rest: 0x7fe3b5, mini: 0xff9a4a, challenge: 0xc48bff };
