// 진행용 통상 스테이지(잡몹 웨이브). 병사는 캐릭터가 아니라 해당 보스의 힘이 빚은 문양이다.
//   STAGE 1  옵서의 성좌 병사 — 별 · 렌즈 문양
//   STAGE 5  벨리스의 서술 병사 — 룬 · 서장 문양
//   FINAL    루나린스의 월병 — 달 · 월식 문양
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

// ───────────────── STAGE 1: 별의 병사 ─────────────────
function* stage1(S) {
  const { M } = S;
  const aimShot = (n, spread, speed, ty) => (m) => { M.fan(m, S.n(n, 1), spread, M.aim(m), { speed, size: 1.0, kind: ty }); };
  // 웨이브 1: 별 문양 V자 편대
  yield 1.2;
  for (let i = 0; i < 5; i++) {
    S.swoop({ type: 'star', from: i % 2 ? 1 : -1, z: -7 + Math.abs(i - 2) * 1.2, hp: 4, size: 1.7, fire: (() => { let c = 0.8; return (m, dt) => { c -= dt; if (c <= 0) { c = 2.0; aimShot(1, 0, 6, 'star')(m); } }; })() });
    yield 0.45;
  }
  yield* S.clear(9); yield 0.6;
  // 웨이브 2: 렌즈 문양 — 위에서 내려와 조준 부채
  for (const x of [-6, -2, 2, 6]) {
    S.drift({ type: 'lens', x, hp: 7, size: 2.0, hold: 2.6, fire: (() => { let c = 0.4; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.15; M.fan(m, S.n(3, 2), 0.5, M.aim(m), { speed: 6.2, size: 0.95 }); } }; })() });
    yield 0.7;
  }
  yield* S.clear(11); yield 0.6;
  // 웨이브 3: 측면 터렛 — 별 나선
  S.turret({ type: 'star', side: -1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.16; a += 0.55; M.shoot(m, { a: a, speed: 4.6, size: 0.95 }); M.shoot(m, { a: a + Math.PI, speed: 4.6, size: 0.95 }); } }; })() });
  S.turret({ type: 'star', side: 1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.16; a -= 0.55; M.shoot(m, { a: a + Math.PI, speed: 4.6, size: 0.95 }); M.shoot(m, { a: a, speed: 4.6, size: 0.95 }); } }; })() });
  yield 2.5;
  for (let i = 0; i < 6; i++) { S.swoop({ type: 'lens', from: i % 2 ? 1 : -1, z: -8.5, amp: 1.2, hp: 4, size: 1.5, fire: (() => { let c = 1.2; return (m, dt) => { c -= dt; if (c <= 0) { c = 99; aimShot(1, 0, 6.4, 'orb')(m); } }; })() }); yield 0.8; }
  yield* S.clear(10); yield 0.8;
  // 웨이브 4: 큰 성좌 — 별 고리 (엘리트)
  M.spawn({ type: 'star', x: 0, z: -11.5, size: 3.4, hp: 70, life: 22, hr: 1.2, spin: 0.5,
    path: (t) => [Math.sin(t * 0.5) * 4, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.8) * 0.8],
    fire: (() => { let c = 1.6, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; k++; M.ring(m, S.n(18, 10), { a0: k * 0.2, speed: 4.2, size: 1.0, accel: 0.5, maxS: 7 }); M.fan(m, S.n(5, 3), 0.9, M.aim(m), { speed: 7, size: 1.0 }); } }; })() });
  yield 2;
  for (const x of [-7, 7, -4, 4]) { S.drift({ type: 'lens', x, hp: 6, size: 1.8, hold: 2, fire: (() => { let c = 0.6; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.3; M.fan(m, S.n(3, 2), 0.4, M.aim(m), { speed: 6.6, size: 0.95 }); } }; })() }); yield 1.4; }
  yield* S.clear(16);
}

// ───────────────── STAGE 5: 룬의 병사 ─────────────────
function* stage5(S) {
  const { M, G } = S;
  yield 1.2;
  // 웨이브 1: 룬 문양 — 전열에서 직선 글리프
  for (let i = 0; i < 6; i++) {
    S.drift({ type: 'rune', x: -7.5 + i * 3, hp: 6, size: 1.9, hold: 2.4, stopZ: -6.5, fire: (() => { let c = 0.5; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.0; M.fan(m, S.n(3, 2), 0.35, Math.PI / 2, { speed: 5.4, size: 1.0 }); } }; })() });
    yield 0.35;
  }
  yield* S.clear(10); yield 0.6;
  // 웨이브 2: 서장 문양 — 구역 지정(마법진) + 글리프 방사
  for (let i = 0; i < 3; i++) {
    S.swoop({ type: 'page', from: i % 2 ? 1 : -1, z: -5 - i * 1.2, amp: 1.6, hp: 12, size: 2.1, fire: (() => { let c = 1.0, t = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 2.2; t++; M.ring(m, S.n(10, 6), { speed: 4.2, size: 1.0 }); G.zones.spawn({ x: G.player.x, z: G.player.z, r: 1.7, warn: 1.1, dur: 0.25, color: 0xc89bff }); } }; })() });
    yield 1.4;
  }
  yield* S.clear(11); yield 0.6;
  // 웨이브 3: 마법진 포대 — 좌우 터렛이 교차 나선
  S.turret({ type: 'rune', side: -1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 6.5, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.14; a += 0.42; for (let k = 0; k < 3; k++) M.shoot(m, { a: a + (k * TAU) / 3, speed: 4.8, size: 0.95 }); } }; })() });
  S.turret({ type: 'rune', side: 1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 6.5, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.14; a -= 0.42; for (let k = 0; k < 3; k++) M.shoot(m, { a: a + (k * TAU) / 3, speed: 4.8, size: 0.95 }); } }; })() });
  yield 3;
  for (let i = 0; i < 6; i++) { S.swoop({ type: 'page', from: i % 2 ? 1 : -1, z: -9, amp: 0.9, hp: 5, size: 1.5, fire: (() => { let c = 1.0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.8; M.fan(m, S.n(3, 2), 0.5, M.aim(m), { speed: 6.2, size: 1.0 }); } }; })() }); yield 0.75; }
  yield* S.clear(10); yield 0.8;
  // 웨이브 4: 대형 마법진 (엘리트) — 감사 개시
  M.spawn({ type: 'rune', x: 0, z: -11.5, size: 3.6, hp: 90, life: 24, hr: 1.3, spin: -0.4,
    path: (t) => [Math.sin(t * 0.45) * 4.5, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.7) * 0.8],
    fire: (() => { let c = 1.4, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.6; k++; M.ring(m, S.n(16, 9), { a0: k * 0.25, speed: 4.4, size: 1.0 }); if (k % 2) for (let i = 0; i < 3; i++) G.zones.spawn({ x: G.player.x + rnd(-3, 3), z: G.player.z + rnd(-3, 3), r: 1.8, warn: 1.1, dur: 0.25, color: 0xc89bff }); } }; })() });
  yield 2.2;
  for (const x of [-6, 6, -3, 3]) { S.drift({ type: 'page', x, hp: 6, size: 1.8, hold: 2.2, fire: (() => { let c = 0.6; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.2; M.fan(m, S.n(5, 3), 0.8, M.aim(m), { speed: 6.2, size: 1.0 }); } }; })() }); yield 1.3; }
  yield* S.clear(16);
}

// ───────────────── FINAL: 달의 병사 ─────────────────
function* stage6(S) {
  const { M, G } = S;
  yield 1.2;
  // 웨이브 1: 초승달 병사 (LUMINA의 병사) — 우아한 부채
  for (let i = 0; i < 6; i++) {
    S.swoop({ type: 'moon', from: i % 2 ? 1 : -1, z: -6.5 + (i % 3) * 0.9, amp: 1.8, hp: 5, size: 1.9, fire: (() => { let c = 0.9; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.7; M.fan(m, S.n(5, 3), 0.9, M.aim(m), { speed: 5.6, size: 1.2 }); } }; })() });
    yield 0.6;
  }
  yield* S.clear(10); yield 0.6;
  // 웨이브 2: 월식 병사 (UMBRA의 병사) — 느린 유도구
  for (const x of [-6, 0, 6]) {
    S.drift({ type: 'eclipse', x, hp: 12, size: 2.2, hold: 3.4, stopZ: -5.8, fire: (() => { let c = 0.8; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.8; M.shoot(m, { a: M.aim(m), speed: 3.8, size: 1.5, hr: 0.4, homing: 1.1, homeT: 2.6, trail: true, life: 6 }); M.fan(m, S.n(3, 2), 1.0, M.aim(m), { speed: 5, size: 1.0 }); } }; })() });
    yield 1.0;
  }
  yield* S.clear(12); yield 0.6;
  // 웨이브 3: 만월 병사 (LUNA의 병사) — 빠른 고리
  for (let i = 0; i < 4; i++) {
    S.swoop({ type: 'moon', from: i % 2 ? 1 : -1, z: -5 - (i % 2) * 2, amp: 1.2, speed: 6, hp: 8, size: 2.0, fire: (() => { let c = 0.8, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.1; k++; M.ring(m, S.n(12, 7), { a0: k * 0.3, speed: 5.2, size: 1.05 }); } }; })() });
    yield 0.9;
  }
  S.turret({ type: 'eclipse', side: -1, x: 8.2, z: -3.2, hp: 18, size: 2.4, stay: 6, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.15; a += 0.5; M.shoot(m, { a, speed: 4.6, size: 1.0 }); M.shoot(m, { a: a + Math.PI, speed: 4.6, size: 1.0 }); } }; })() });
  S.turret({ type: 'eclipse', side: 1, x: 8.2, z: -3.2, hp: 18, size: 2.4, stay: 6, fire: (() => { let a = 0, c = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.15; a -= 0.5; M.shoot(m, { a, speed: 4.6, size: 1.0 }); M.shoot(m, { a: a + Math.PI, speed: 4.6, size: 1.0 }); } }; })() });
  yield* S.clear(14); yield 0.8;
  // 웨이브 4: 달의 파수병 (엘리트) — 삼위의 문양이 번갈아 발동
  M.spawn({ type: 'moon', x: 0, z: -11.5, size: 3.8, hp: 110, life: 26, hr: 1.35, spin: 0.35,
    path: (t) => [Math.sin(t * 0.4) * 4, t < 2.5 ? -11.5 + t * 2.6 : -5.2 + Math.sin(t * 0.7) * 0.8],
    fire: (() => { let c = 1.4, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; k++; const f = k % 3;
      if (f === 0) M.fan(m, S.n(9, 5), 1.5, M.aim(m), { speed: 6.6, size: 1.2 });
      else if (f === 1) { for (let i = 0; i < S.n(4, 2); i++) M.shoot(m, { a: M.aim(m) + rnd(-0.8, 0.8), speed: 3.8, size: 1.5, hr: 0.4, homing: 1.2, homeT: 2.4, trail: true, life: 6, kind: 'orb', color: 0xa07bff }); }
      else M.ring(m, S.n(20, 12), { speed: 5.4, size: 1.05, accel: 0.4, maxS: 8 }); } }; })() });
  yield 2;
  for (const x of [-7, 7, -3.5, 3.5]) { S.drift({ type: x < 0 ? 'moon' : 'eclipse', x, hp: 7, size: 1.9, hold: 2.2, fire: (() => { let c = 0.6; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.2; M.fan(m, S.n(5, 3), 0.9, M.aim(m), { speed: 6.2, size: 1.1 }); } }; })() }); yield 1.3; }
  yield* S.clear(18);
}

const SCRIPTS = { opsir: stage1, bellis: stage5, lunarinth: stage6 };

/** 스테이지 웨이브 스크립트 생성기 */
export function makeStageScript(G, id) {
  const S = api(G);
  return SCRIPTS[id](S);
}
export { MOB_TYPES };
