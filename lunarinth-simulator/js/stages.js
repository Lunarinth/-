// 진행용 통상 스테이지(잡몹 웨이브). 병사는 캐릭터가 아니라 해당 보스의 힘이 빚은 문양이다.
// 스테이지마다 병사 문양과 수치(STAGE_CFG)가 다르고, 웨이브 틀(TEMPLATES)을 앞부분(a) / 뒷부분(b)으로 나눠 조합한다.
// 앞부분 → 중간 보스 → 뒷부분 → 보스 순서로 진행된다.
// 각 스크립트는 제너레이터: `yield 초` = 대기, `yield* S.clear(timeout)` = 병사가 모두 사라질 때까지 대기.
import { MOB_TYPES } from './mobs.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

/** 스크립트에서 쓰는 보조 API */
function api(G) {
  const M = G.mobs;
  const S = {
    G, M,
    n: (k, min = 1) => M.n(k, min),
    alive: () => M.count(),
    /** 병사가 모두 사라질 때까지(최대 timeout초) 기다린다 */
    *clear(timeout = 14) { let t = 0; while (M.count() > 0 && t < timeout) { const dt = yield 0; t += dt; } },
    /** 위에서 내려오는 정찰형: 중간에서 속도가 줄어 사격 후 빠져나간다 */
    drift(o) {
      const { x, vz = 2.6, hold = 2.2, stopZ = -5, ...rest } = o;
      return M.spawn({ x, z: -11.5, life: 14, ...rest, path: (t) => {
        const tIn = (stopZ + 11.5) / vz;
        if (t < tIn) return [x, -11.5 + vz * t];
        if (t < tIn + hold) return [x, stopZ];
        return [x, stopZ - (t - tIn - hold) * vz * 1.2];
      } });
    },
    /** 좌우를 가로지르는 사인 궤적 */
    swoop(o) {
      const { from = -1, z = -6, amp = 2.2, speed = 5.2, ...rest } = o;
      return M.spawn({ x: from * 13, z, life: 12, ...rest, path: (t) => [from * 13 - from * t * speed, z + Math.sin(t * 1.9) * amp] });
    },
    /** 측면에서 들어와 멈춰 서서 회전 사격 */
    turret(o) {
      const { side = 1, z = -4, x = 7, stay = 5, ...rest } = o;
      return M.spawn({ x: side * 13, z, life: stay + 4, ...rest, path: (t) => {
        const tIn = 1.6; const tx = side * x;
        if (t < tIn) return [side * 13 + (tx - side * 13) * (t / tIn), z];
        if (t < tIn + stay) return [tx, z];
        return [tx + side * (t - tIn - stay) * 6, z];
      } });
    },
  };
  return S;
}


// ───────────────── 웨이브 틀 ─────────────────
// c: 스테이지 설정 { main, alt, sp(탄속), dn(탄 수), mv(병사 속도), hp, rt(발사 빈도) }
const aimFire = (S, c, n, spread, sp, gap = 2.0, t0 = 0.8) => { let t = t0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap / c.rt; S.M.fan(m, S.n(n * c.dn, 1), spread, S.M.aim(m), { speed: sp * c.sp, size: 1.0 }); } }; };
const downFire = (S, c, n, sp, gap = 1.0, t0 = 0.5) => { let t = t0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap / c.rt; S.M.fan(m, S.n(n * c.dn, 2), 0.35, Math.PI / 2, { speed: sp * c.sp, size: 1.0 }); } }; };
const ringFire = (S, c, n, sp, gap = 1.2, t0 = 0.8) => { let t = t0, k = 0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap / c.rt; k++; S.M.ring(m, S.n(n * c.dn, 6), { a0: k * 0.3, speed: sp * c.sp, size: 1.05 }); } }; };
const spiralFire = (S, c, dir, arms = 2, gap = 0.16) => { let a = 0, t = 0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap / c.rt; a += 0.5 * dir; for (let k = 0; k < arms; k++) S.M.shoot(m, { a: a + (k * TAU) / arms, speed: 4.6 * c.sp, size: 0.95 }); } }; };

const TEMPLATES = {
  // 별/문양 V자 편대: 좌우에서 가로지르며 조준탄
  *V(S, c) {
    for (let i = 0; i < 5 + (c.len | 0); i++) { S.swoop({ type: c.main, from: i % 2 ? 1 : -1, z: -7 + Math.abs(i - 2) * 1.2, speed: 5.2 * c.mv, hp: 4 * c.hp, size: 1.7, fire: aimFire(S, c, 1, 0, 6, 2.0, 0.8) }); yield 0.45 / c.mv; }
    yield* S.clear(9); yield 0.6;
  },
  // 위에서 내려와 조준 부채
  *rain(S, c) {
    for (const x of [-6, -2, 2, 6]) { S.drift({ type: c.alt, x, hp: 7 * c.hp, size: 2.0, vz: 2.6 * c.mv, hold: 2.6, fire: aimFire(S, c, 3, 0.5, 6.2, 1.15, 0.4) }); yield 0.7 / c.mv; }
    yield* S.clear(11); yield 0.6;
  },
  // 측면 터렛 나선 + 가로지르는 병사
  *turrets(S, c) {
    S.turret({ type: c.main, side: -1, x: 8, z: -3.5, hp: 16 * c.hp, size: 2.3, stay: 6, fire: spiralFire(S, c, 1) });
    S.turret({ type: c.main, side: 1, x: 8, z: -3.5, hp: 16 * c.hp, size: 2.3, stay: 6, fire: spiralFire(S, c, -1) });
    yield 2.5 / c.mv;
    for (let i = 0; i < 6; i++) { S.swoop({ type: c.alt, from: i % 2 ? 1 : -1, z: -8.5, amp: 1.2, speed: 5.2 * c.mv, hp: 4 * c.hp, size: 1.5, fire: aimFire(S, c, 1, 0, 6.4, 99, 1.2) }); yield 0.8 / c.mv; }
    yield* S.clear(10); yield 0.8;
  },
  // 전열: 한 줄로 내려와 정면 사격
  *lanes(S, c) {
    for (let i = 0; i < 6; i++) { S.drift({ type: c.main, x: -7.5 + i * 3, hp: 6 * c.hp, size: 1.9, vz: 2.6 * c.mv, hold: 2.4, stopZ: -6.5, fire: downFire(S, c, 3, 5.4, 1.0, 0.5) }); yield 0.35 / c.mv; }
    yield* S.clear(10); yield 0.6;
  },
  // 양쪽에서 집게처럼: 고리탄
  *pincer(S, c) {
    for (let i = 0; i < 4; i++) { S.swoop({ type: c.alt, from: i % 2 ? 1 : -1, z: -5 - (i % 2) * 2, amp: 1.2, speed: 5.8 * c.mv, hp: 8 * c.hp, size: 2.0, fire: ringFire(S, c, 12, 5.0, 1.1, 0.8) }); yield 0.9 / c.mv; }
    yield* S.clear(11); yield 0.7;
  },
  // 대형 문양(엘리트): 고리 + 조준 부채 (+ 구역 지정)
  *elite(S, c) {
    const G = S.G, M = S.M;
    M.spawn({ type: c.main, x: 0, z: -11.5, size: 3.5, hp: 72 * c.hp, life: 24, hr: 1.25, spin: 0.45,
      path: (t) => [Math.sin(t * 0.5 * c.mv) * 4.2, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.8) * 0.8],
      fire: (() => { let t = 1.6, k = 0; return (m, dt) => { t -= dt; if (t <= 0) { t = 1.5 / c.rt; k++; M.ring(m, S.n(18 * c.dn, 9), { a0: k * 0.2, speed: 4.2 * c.sp, size: 1.0, accel: 0.5, maxS: 7 * c.sp }); M.fan(m, S.n(5 * c.dn, 3), 0.9, M.aim(m), { speed: 7 * c.sp, size: 1.0 });
        if (c.zones && k % 2) G.zones.spawn({ x: G.player.x + rnd(-3, 3), z: G.player.z + rnd(-3, 3), r: 1.8, warn: 1.1, dur: 0.25, color: 0xc89bff }); } }; })() });
    yield 2;
    for (const x of [-7, 7, -4, 4]) { S.drift({ type: c.alt, x, hp: 6 * c.hp, size: 1.8, vz: 2.6 * c.mv, hold: 2, fire: aimFire(S, c, 3, 0.4, 6.6, 1.3, 0.6) }); yield 1.4 / c.mv; }
    yield* S.clear(16); yield 0.5;
  },
};

// 스테이지별 설정. 2: 탄은 얌전하지만 기믹 · 3: 탄 수는 적고 탄속/병사가 빠름 · 4: 5보다 필드가 어려움
const STAGE_CFG = {
  opsir:     { main: 'star',    alt: 'lens',    sp: 1.0,  dn: 1.0,  mv: 1.0,  hp: 1.0,  rt: 1.0,  a: ['V', 'rain', 'turrets'],                 b: ['lanes', 'elite', 'rain'] },
  astra:     { main: 'circuit', alt: 'circuit', sp: 0.92, dn: 0.8,  mv: 0.95, hp: 0.9,  rt: 0.9,  a: ['V', 'lanes', 'rain'],                  b: ['pincer', 'turrets', 'elite'] },
  tramont:   { main: 'rose',    alt: 'rose',    sp: 1.55, dn: 0.6,  mv: 1.5,  hp: 0.8,  rt: 1.0,  a: ['V', 'pincer', 'rain'],                 b: ['lanes', 'V', 'elite'] },
  index:     { main: 'tome',    alt: 'tome',    sp: 1.1,  dn: 1.3,  mv: 1.05, hp: 1.25, rt: 1.25, a: ['lanes', 'pincer', 'turrets', 'rain'],  b: ['V', 'turrets', 'elite', 'pincer', 'elite'], zones: true },
  bellis:    { main: 'ledger',  alt: 'ledger',  sp: 1.0,  dn: 1.0,  mv: 1.0,  hp: 1.0,  rt: 1.0,  a: ['lanes', 'rain', 'turrets'],            b: ['pincer', 'elite', 'rain'], zones: true },
  lunarinth: { main: 'moon',    alt: 'eclipse', sp: 1.05, dn: 1.05, mv: 1.05, hp: 1.1,  rt: 1.05, a: ['V', 'rain', 'turrets'],                b: ['pincer', 'elite', 'lanes', 'rain'] },
  arkesia:   { main: 'puppet',  alt: 'puppet',  sp: 1.15, dn: 1.1,  mv: 1.1,  hp: 1.1,  rt: 1.1,  a: ['V', 'pincer', 'turrets'],              b: ['lanes', 'elite', 'rain'], zones: true },
};

function* run(S, cfg, part) {
  const c = { len: 0, ...cfg };
  yield part === 'a' ? 1.2 : 0.8;
  for (const name of c[part]) yield* TEMPLATES[name](S, c);
}

/** 스테이지 웨이브 스크립트 생성기. part: 'a'(중간 보스 전) | 'b'(중간 보스 후) */
export function makeStageScript(G, id, part = 'a') {
  const S = api(G);
  return run(S, STAGE_CFG[id] || STAGE_CFG.opsir, part);
}
export { MOB_TYPES };
