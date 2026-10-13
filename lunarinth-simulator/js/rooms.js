// 방 전투(인카운터). 아이작의 방처럼 적이 방 안에 머무르며, 모두 쓰러뜨려야 문이 열린다.
// 층마다 병사 문양 · 탄 모양 · 행동 구성이 다르다. 행동: 배회 · 추격 · 공전 · 포대 · 돌진 · 저격 · 떼 · 소환 · 정예.
import { ARENA_R } from './scene.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pickW = (arr) => { let t = 0; for (const [, w] of arr) t += w; let r = Math.random() * t; for (const [v, w] of arr) { r -= w; if (r <= 0) return v; } return arr[0][0]; };
const inArena = (x, z, m = 1.2) => { const l = Math.hypot(x, z), lim = ARENA_R - m; return l > lim ? [x * lim / l, z * lim / l] : [x, z]; };

// ───────────── 층별 구성 ─────────────
// types: 쓰는 병사 문양 / kinds: 탄 모양 / sp: 탄속 / beh: 행동 가중치 / gim: 층 기믹
export const THEMES = {
  opsir: { types: ['star', 'lens', 'comet'], kinds: ['star', 'orb'], col: [0xcfe0ff, 0x9cc3ff], sp: 1.0, beh: [['hover', 4], ['orbit', 2], ['turret', 2], ['sniper', 2], ['swarm', 1]], gim: 'stars' },
  astra: { types: ['circuit', 'node'], kinds: ['pixel'], col: [0x9fd8ff, 0xffffff], sp: 0.9, beh: [['rail', 4], ['hover', 2], ['turret', 2], ['swarm', 2]], gim: 'lag' },
  tramont: { types: ['rose', 'swift'], kinds: ['petal', 'blade'], col: [0xff9fb8, 0xffd36b], sp: 1.45, beh: [['dasher', 4], ['hover', 2], ['sniper', 2], ['swarm', 2]], gim: 'dash' },
  index: { types: ['tome', 'leaf'], kinds: ['page'], col: [0x9fe8c4, 0xffe39a], sp: 1.05, beh: [['hover', 3], ['turret', 3], ['swarm', 3], ['summoner', 1], ['orbit', 2]], gim: 'walls' },
  bellis: { types: ['ledger', 'seal', 'rune'], kinds: ['glyph'], col: [0xc89bff, 0xffffff], sp: 1.0, beh: [['hover', 3], ['bomber', 3], ['turret', 2], ['orbit', 2]], gim: 'marks' },
  lunarinth: { types: ['moon', 'eclipse', 'phase'], kinds: ['crescent', 'orb'], col: [0xe3d6ff, 0xfff1c9], sp: 1.1, beh: [['hover', 3], ['orbit', 3], ['chase', 2], ['sniper', 2], ['bomber', 1]], gim: 'moon' },
  arkesia: { types: ['doll', 'mask', 'spool'], kinds: ['shard'], col: [0xff6a80, 0xffffff], sp: 1.15, beh: [['dancer', 4], ['hover', 2], ['dasher', 2], ['summoner', 1]], gim: 'strings' },
  arkesiaHell: { types: ['doll', 'mask', 'spool'], kinds: ['shard'], col: [0xff2b3d, 0xffffff], sp: 1.3, beh: [['dancer', 4], ['dasher', 3], ['chase', 2], ['summoner', 2]], gim: 'strings' },
  manager: { types: ['doll', 'mask', 'spider'], kinds: ['shard', 'orb'], col: [0xffffff, 0xffffff], sp: 1.4, beh: [['dancer', 3], ['dasher', 3], ['chase', 2], ['sniper', 2]], gim: 'strings' },
};

// ───────────── 행동 (path) ─────────────
function moveTo(m, tx, tz, k, dt) { m.x += (tx - m.x) * Math.min(1, dt * k); m.z += (tz - m.z) * Math.min(1, dt * k); }
const BEH = {
  hover: () => (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; if (d.tx === undefined || t > d.next) { [d.tx, d.tz] = inArena(rnd(-7, 7), rnd(-7.5, 3)); d.next = t + rnd(1.4, 3); } moveTo(m, d.tx, d.tz, 1.1, dt); return [m.x, m.z]; },
  chase: (G, sp = 2.2) => (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; const P = G.player, a = Math.atan2(P.z - m.z, P.x - m.x); m.x += Math.cos(a) * sp * dt; m.z += Math.sin(a) * sp * dt; return inArena(m.x, m.z); },
  orbit: () => { const r = rnd(4.5, 7.5), w = (Math.random() < 0.5 ? -1 : 1) * rnd(0.35, 0.6), ph = rnd(0, TAU); return (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; const tx = Math.cos(ph + t * w) * r, tz = -1.5 + Math.sin(ph + t * w) * r * 0.75; moveTo(m, tx, tz, 2, dt); return [m.x, m.z]; }; },
  turret: () => (t, m) => [m.x0, m.z0],
  rail: () => { const pts = []; let x = Math.round(rnd(-3, 3)) * 2.5, z = Math.round(rnd(-3, 0)) * 2.5; for (let i = 0; i < 8; i++) { pts.push([x, z]); if (i % 2) x = clamp(x + (Math.random() < 0.5 ? -5 : 5), -7.5, 7.5); else z = clamp(z + (Math.random() < 0.5 ? -5 : 5), -7.5, 5); } return (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; d.i = d.i ?? 0; const [tx, tz] = pts[d.i % pts.length]; const dx = tx - m.x, dz = tz - m.z, l = Math.hypot(dx, dz); if (l < 0.15) { d.i++; d.turned = true; } else { const s = Math.min(l, 4.5 * dt); m.x += dx / l * s; m.z += dz / l * s; } return [m.x, m.z]; }; },
  dasher: (G) => (t, m) => {
    const d = m.data, dt = t - (d.lt ?? t); d.lt = t; d.ph = d.ph ?? 'idle'; d.pt = (d.pt ?? 0) + dt;
    if (d.ph === 'idle') { if (d.tx === undefined) [d.tx, d.tz] = inArena(rnd(-6, 6), rnd(-7, 2)); moveTo(m, d.tx, d.tz, 1.5, dt); if (d.pt > rnd(1.6, 2.4)) { d.ph = 'aim'; d.pt = 0; const P = G.player; d.a = Math.atan2(P.z - m.z, P.x - m.x); G.beams.spawn({ x: m.x, z: m.z, a: d.a, w: 0.5, len: 14, warn: 0.55, dur: 0.05, dmg: 0, color: m.ty.glow }); } }
    else if (d.ph === 'aim') { if (d.pt > 0.55) { d.ph = 'dash'; d.pt = 0; } }
    else if (d.ph === 'dash') { m.x += Math.cos(d.a) * 15 * dt; m.z += Math.sin(d.a) * 15 * dt; [m.x, m.z] = inArena(m.x, m.z); if (d.pt > 0.45) { d.ph = 'idle'; d.pt = 0; d.tx = undefined; d.dashed = true; } }
    return [m.x, m.z];
  },
  sniper: () => { const side = Math.random() < 0.5 ? -1 : 1; return (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; moveTo(m, Math.sin(t * 0.5) * 6 * side, -7.4 + Math.sin(t * 0.8) * 0.6, 1.2, dt); return [m.x, m.z]; }; },
  swarm: (G) => { const ph = rnd(0, TAU); return (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; const P = G.player, a = Math.atan2(P.z - m.z, P.x - m.x) + Math.sin(t * 2 + ph) * 1.1; m.x += Math.cos(a) * 3.2 * dt; m.z += Math.sin(a) * 3.2 * dt; return inArena(m.x, m.z); }; },
  summoner: () => (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; moveTo(m, Math.sin(t * 0.4) * 5, -6 + Math.cos(t * 0.6), 0.8, dt); return [m.x, m.z]; },
  bomber: () => (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; if (d.tx === undefined || t > d.next) { [d.tx, d.tz] = inArena(rnd(-7, 7), rnd(-7, 1)); d.next = t + rnd(2, 3.5); } moveTo(m, d.tx, d.tz, 0.9, dt); return [m.x, m.z]; },
  dancer: () => { const r = rnd(2.5, 5), w = (Math.random() < 0.5 ? -1 : 1) * rnd(0.9, 1.4), cx = rnd(-4, 4), cz = rnd(-6, 0); return (t, m) => { const d = m.data, dt = t - (d.lt ?? t); d.lt = t; moveTo(m, cx + Math.cos(t * w) * r, cz + Math.sin(t * w * 2) * r * 0.45, 2.6, dt); return [m.x, m.z]; }; },
};

// ───────────── 사격 (fire) ─────────────
function mkFire(G, th, beh, lv, elite) {
  const M = G.mobs, kind = th.kinds[Math.floor(Math.random() * th.kinds.length)], col = th.col[Math.floor(Math.random() * th.col.length)];
  const sp = th.sp * (1 + lv * 0.04), n = (k, mn = 1) => Math.max(mn, Math.round(k * G.run.diff.cnt * (1 + lv * 0.06) * (elite ? 1.4 : 1)));
  const rate = (1 + lv * 0.05) * (G.run.diff.rate || 1) * (elite ? 1.25 : 1);
  const base = { kind, color: col, size: 1.0 };
  const extra = th.gim === 'strings' ? { speeds: [[0, 1.4], [0.5, 0.2], [0.85, 1.8]] } : th.gim === 'moon' ? { spin: 5 } : th.gim === 'dash' ? {} : {};
  let c = rnd(0.6, 1.6), k = 0;
  const every = (sec, fn) => (m, dt) => { c -= dt * rate; if (c <= 0) { c = sec; k++; fn(m); } };
  switch (beh) {
    case 'turret': return every(0.16, (m) => { const a = k * 0.45; for (let i = 0; i < (elite ? 3 : 2); i++) M.shoot(m, { ...base, ...extra, a: a + (i * TAU) / (elite ? 3 : 2), speed: 4.2 * sp }); });
    case 'sniper': return every(2.2, (m) => { const a = M.aim(m); G.beams.spawn({ x: m.x, z: m.z, a, w: 0.35, len: 24, warn: 0.6, dur: 0.05, dmg: 0, color: col }); setTimeout(() => { if (m.alive) M.fan(m, n(3, 2), 0.12, a, { ...base, speed: 10 * sp, kind: th.gim === 'dash' ? 'blade' : kind }); }, 600); });
    case 'swarm': return every(2.4, (m) => M.shoot(m, { ...base, ...extra, a: M.aim(m), speed: 4.6 * sp }));
    case 'chase': return every(1.8, (m) => M.ring(m, n(8, 5), { ...base, ...extra, speed: 3.6 * sp }));
    case 'orbit': return every(1.4, (m) => M.fan(m, n(3, 2), 0.5, M.aim(m), { ...base, ...extra, speed: 5.2 * sp }));
    case 'dasher': return (m, dt) => { if (m.data.dashed) { m.data.dashed = false; M.ring(m, n(10, 6), { ...base, ...extra, speed: 4.4 * sp }); } };
    case 'rail': return (m) => { if (m.data.turned) { m.data.turned = false; for (let i = 0; i < 4; i++) M.shoot(m, { ...base, a: (i * TAU) / 4 + (k++ % 2) * TAU / 8, speed: 4 * sp }); } };
    case 'summoner': return every(4.5, (m) => { if (M.count() < 14) for (let i = 0; i < 2; i++) spawnMob(G, th, 'swarm', lv, { x: m.x + rnd(-1.5, 1.5), z: m.z + rnd(-1, 1.5), small: true }); M.ring(m, n(10, 6), { ...base, speed: 3.6 * sp }); });
    case 'bomber': return every(2.6, (m) => { const P = G.player; G.zones.spawn({ x: P.x + rnd(-1, 1), z: P.z + rnd(-1, 1), r: 1.7, warn: 1.0, dur: 0.25, color: col, onBoom: (zz) => { for (let i = 0; i < n(6, 4); i++) G.bullets.spawn({ owner: 'boss', ...base, x: zz.x, z: zz.z, a: (i * TAU) / n(6, 4), speed: 4 * sp * G.run.diff.spd }); } }); });
    case 'dancer': return every(1.5, (m) => M.fan(m, n(4, 2), 0.9, M.aim(m), { ...base, ...extra, speed: 5 * sp, wob: [1.4, 2.4] }));
    default: return every(1.6, (m) => { if (k % 3 === 0) M.ring(m, n(10, 6), { ...base, ...extra, speed: 3.8 * sp }); else M.fan(m, n(3, 2), 0.6, M.aim(m), { ...base, ...extra, speed: 5.2 * sp }); });
  }
}

/** 병사 하나 소환 */
export function spawnMob(G, th, beh, lv, o = {}) {
  const small = !!o.small, elite = !!o.elite;
  const type = small ? th.types[th.types.length - 1] : elite ? th.types[0] : th.types[Math.floor(Math.random() * Math.min(2, th.types.length))];
  let x = o.x, z = o.z;
  if (x === undefined) { for (let i = 0; i < 20; i++) { [x, z] = inArena(rnd(-8, 8), rnd(-8, 4)); if ((x - G.player.x) ** 2 + (z - G.player.z) ** 2 > 16) break; } }
  const hp = (small ? 3 : elite ? 40 : beh === 'turret' ? 14 : 8) * (1 + lv * 0.45) * (G.run.hpScale || 1);
  const size = small ? 1.3 : elite ? 3.2 : beh === 'turret' ? 2.3 : 1.9;
  const path = beh === 'chase' || beh === 'swarm' || beh === 'dasher' ? BEH[beh](G) : BEH[beh] ? BEH[beh](G) : BEH.hover(G);
  const m = G.mobs.spawn({ type, x, z, hp, size, life: 9999, hr: size * 0.42, path, fire: mkFire(G, th, beh, lv, elite), spin: beh === 'dasher' ? 0 : 0.8, face: beh === 'dasher' || type === 'swift' });
  if (m) { m.room = true; m.elite = elite; G.fx.ring(x, 0.4, z, m.ty.glow, 3, 0.5); }
  return m;
}

/** 방 하나의 인카운터: 웨이브 배열을 돌려준다. kind: 'normal' | 'challenge' */
export function makeEncounter(G, themeId, lv, kind = 'normal') {
  const th = THEMES[themeId] || THEMES.opsir;
  const waves = [];
  const nW = kind === 'challenge' ? 3 : lv >= 2 && Math.random() < 0.45 ? 2 : 1;
  for (let w = 0; w < nW; w++) {
    const cnt = Math.min(9, Math.round(3 + lv * 0.6 + Math.random() * 2 + (kind === 'challenge' ? 1 : 0)));
    const elite = (lv >= 1 && Math.random() < 0.18 + lv * 0.04) || (kind === 'challenge' && w === nW - 1);
    waves.push(() => {
      const ms = [];
      for (let i = 0; i < cnt; i++) {
        const beh = pickW(th.beh);
        if (beh === 'swarm') { for (let j = 0; j < 3; j++) ms.push(spawnMob(G, th, 'swarm', lv, { small: true })); i += 1; }
        else ms.push(spawnMob(G, th, beh, lv));
      }
      if (elite) ms.push(spawnMob(G, th, 'hover', lv, { elite: true }));
      // 층 기믹
      if (th.gim === 'lag' && Math.random() < 0.5) G.zones.spawn({ kind: 'lag', x: rnd(-5, 5), z: rnd(-3, 5), r: 3, warn: 0.8, dur: 10, color: 0x5fb4ff });
      if (th.gim === 'strings') { const live = ms.filter(Boolean); for (let i = 0; i + 1 < live.length; i += 2) G.mobs.link(live[i], live[i + 1], { every: 4, warn: 1, dur: 0.4 }); }
      if (th.gim === 'walls' && lv >= 1) G._roomWall = 6;
      return ms;
    });
  }
  return { waves, wi: 0, th };
}

/** 도서관 기믹: 주기적으로 틈이 있는 책장 벽이 내려온다 */
export function roomGimmick(G, dt) {
  if (G._roomWall > 0) {
    G._roomWallT = (G._roomWallT ?? 3) - dt;
    if (G._roomWallT <= 0) { G._roomWallT = 3.2; G._roomWall--; const gap = rnd(-6, 6); for (let x = -10; x <= 10; x += 1.6) if (Math.abs(x - gap) > 2) G.bullets.spawn({ owner: 'boss', kind: 'page', x, z: -11, a: Math.PI / 2, speed: 3.6 * G.run.diff.spd, size: 1.05, color: 0x9fe8c4, life: 8 }); }
  }
}
