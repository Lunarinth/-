// 진행용 통상 스테이지(잡몹 웨이브). 병사는 캐릭터가 아니라 해당 보스의 힘이 빚은 문양이다.
// 스테이지마다 전용 세트피스(SCRIPTS)를 가진다. 앞부분(a) → 중간 보스 → 뒷부분(b) → 보스 순서로 진행된다.
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
    /** 직각으로 꺾이며 레일을 따라 움직이는 경로 (회로 병사). pts: [[x,z],...], speed: 단위/초 */
    rail(pts, speed = 4) {
      const segs = []; let tot = 0;
      for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(l); tot += l; }
      return (t) => { let d = Math.min(tot, t * speed); for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const f = d / segs[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } d -= segs[i]; } const e = pts[pts.length - 1]; return [e[0], e[1] + (t * speed - tot) * 0.0]; };
    },
    /** 두 병사를 줄로 잇는다: 줄은 입자로 그려지고, snapAt 초에 경고 뒤 실제 판정 줄(빔)이 된다 */
    tie(a, b, snapAt = 0) {
      const G = this.G; let snapped = false, acc = 0;
      const prev = a.fire;
      a.fire = (m, dt, mm) => {
        if (prev) prev(m, dt, mm);
        if (!b.alive || !m.alive) return;
        acc += dt;
        if (acc > 0.05) { acc = 0; const f = Math.random(); G.fx.emit({ x: m.x + (b.x - m.x) * f, y: 1.5, z: m.z + (b.z - m.z) * f, life: 0.35, s0: 0.28, s1: 0, color: 0xff4f6e, tex: 'orb', op: 0.8 }); }
        if (snapAt && !snapped && m.age > snapAt) { snapped = true; const ang = Math.atan2(b.z - m.z, b.x - m.x), len = Math.hypot(b.x - m.x, b.z - m.z); G.beams.spawn({ x: m.x, z: m.z, a: ang, w: 0.5, len, warn: 0.8, dur: 0.2, color: 0xff4f6e }); G.audio.sfx.play('twang', { vol: 0.4 }); }
      };
    },
    /** 병사 둘레를 도는 탄 (병사가 죽으면 사라진다) */
    orbiters(m, n, r, w, o = {}) {
      const G = this.G, ph = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        const k = i;
        G.bullets.spawn({ owner: 'boss', kind: o.kind || 'orb', x: m.x, z: m.z, a: 0, speed: 0, size: o.size ?? 1.0, color: o.color ?? m.ty.color, life: o.life ?? 12, arm: 0.5,
          fn: (b) => { if (!m.alive) { G.bullets.kill(b); return; } const ang = ph + (k * TAU) / n + b.age * w, rr = r * Math.min(1, b.age / 0.8); b.x = m.x + Math.cos(ang) * rr; b.z = m.z + Math.sin(ang) * rr; } });
      }
    },
  };
  return S;
}

const lv = (S) => S.G.run.diff.lv;
const hell = (S) => S.G.run.diff.lv >= 4;
/** 발사 패턴 공장: 반복해서 쓰이는 단순한 사격만 모아 둔다 */
const F = {
  aim: (S, n, spread, sp, gap, t0 = 0.6, o = {}) => { let t = t0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap; S.M.fan(m, S.n(n, 1), spread, S.M.aim(m), { speed: sp, size: 1.0, ...o }); } }; },
  down: (S, n, sp, gap, t0 = 0.5, o = {}) => { let t = t0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap; S.M.fan(m, S.n(n, 2), 0.35, Math.PI / 2, { speed: sp, size: 1.0, ...o }); } }; },
  ring: (S, n, sp, gap, t0 = 0.8, o = {}) => { let t = t0, k = 0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap; k++; S.M.ring(m, S.n(n, 6), { a0: k * 0.3, speed: sp, size: 1.05, ...o }); } }; },
  spiral: (S, dir, arms, sp, gap = 0.16, o = {}) => { let a = 0, t = 0; return (m, dt) => { t -= dt; if (t <= 0) { t = gap; a += 0.5 * dir; for (let k = 0; k < arms; k++) S.M.shoot(m, { a: a + (k * TAU) / arms, speed: sp, size: 0.95, ...o }); } }; },
};




// ═══════════════════════════ STAGE 1 · 관측대 ═══════════════════════════
// 느긋한 입문: 별똥별, 별자리 도형, 시선(빔), 쌍성 포대, 유성군
const stage1 = {
  a: [
    function* shootingStars(S) { // 별똥별: 빠른 혜성이 비스듬히 가로지르고, 꼬리의 별이 느리게 남는다
      const { M } = S;
      for (let i = 0; i < 7; i++) {
        const from = i % 2 ? 1 : -1, z0 = -9 + (i % 4) * 2.2;
        M.spawn({ type: 'comet', x: from * 13, z: z0, hp: 3, size: 1.6, life: 6, spin: 0, path: (t) => [from * 13 - from * t * 9.5, z0 + t * 2.6],
          fire: (() => { let c = 0.2; return (m, dt) => { c -= dt; if (c <= 0) { c = 0.22; M.shoot(m, { a: Math.PI / 2, speed: 1.6, size: 0.8, kind: 'star', color: 0xcfe0ff, life: 5 }); } }; })() });
        yield 0.7;
      }
      yield* S.clear(8); yield 0.5;
    },
    function* constellation(S) { // 별자리: 별 병사가 오각형 꼭짓점에 자리잡고, 정지한 별 선이 그려진 뒤 사방으로 쏟아진다
      const { M } = S, cx = 0, cz = -6;
      for (let rep = 0; rep < 2; rep++) {
        const pts = Array.from({ length: 5 }, (_, i) => [cx + Math.cos(-Math.PI / 2 + (i * TAU) / 5 + rep * 0.3) * 5.2, cz + Math.sin(-Math.PI / 2 + (i * TAU) / 5 + rep * 0.3) * 3.4]);
        pts.forEach(([x, z], i) => M.spawn({ type: 'star', x, z: -11.5, hp: 6, size: 1.9, life: 9, path: (t) => [x, t < 1.4 ? -11.5 + (z + 11.5) * (t / 1.4) : z + (t > 7 ? (t - 7) * 3 : 0)],
          fire: (() => { let done = false; return (m) => { if (m.age > 2.2 && !done) { done = true; const [x1, z1] = pts[(i + 1) % 5]; for (let k = 0; k < 7; k++) { const f = (k + 0.5) / 7; G_hold(S, m.x + (x1 - m.x) * f, m.z + (z1 - m.z) * f, 2.0 + i * 0.12); } } }; })() }));
        yield 5.5; yield* S.clear(5);
      }
      yield 0.5;
    },
    function* sightLines(S) { // 시선: 렌즈 병사가 조준선(빔)을 긋고 별을 쏜다
      const { M, G } = S;
      for (const x of [-6, 0, 6, -3, 3]) {
        S.drift({ type: 'lens', x, hp: 7, size: 2.0, hold: 3, fire: (() => { let c = 1.2, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.9; k++; const a = M.aim(m); G.beams.spawn({ x: m.x, z: m.z, a, w: 0.55, len: 26, warn: 0.9, dur: 0.14, color: 0x9cc3ff }); setTimeout(() => { if (m.alive) M.fan(m, S.n(3, 2), 0.3, a, { speed: 8, kind: 'star', size: 1.0 }); }, 900); } }; })() });
        yield 0.9;
      }
      yield* S.clear(11); yield 0.5;
    },
  ],
  b: [
    function* twinStars(S) { // 쌍성 포대: 좌우 터렛이 서로 반대로 나선, 위에서 혜성이 가로지른다
      const { M } = S;
      S.turret({ type: 'star', side: -1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6.5, fire: F.spiral(S, 1, 2, 4.4) });
      S.turret({ type: 'star', side: 1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6.5, fire: F.spiral(S, -1, 2, 4.4) });
      yield 2;
      for (let i = 0; i < 5; i++) { M.spawn({ type: 'comet', x: -13, z: -9, hp: 3, size: 1.5, life: 5, path: (t) => [-13 + t * 11, -9 + t * 1.8 + i * 0.5] }); yield 1.1; }
      yield* S.clear(10); yield 0.6;
    },
    function* meteorShower(S) { // 유성군: 위에서 아래로 떨어지는 줄기 + 틈
      const { M } = S;
      for (let w = 0; w < 6; w++) {
        const gap = rnd(-6, 6);
        for (let x = -9; x <= 9; x += 3) if (Math.abs(x - gap) > 2.2) M.spawn({ type: 'comet', x, z: -12, hp: 2, size: 1.3, life: 6, path: (t) => [x + Math.sin(t * 2) * 0.4, -12 + t * 6.5] });
        yield 1.6;
      }
      yield* S.clear(8); yield 0.5;
    },
    function* bigConstellation(S) { // 엘리트: 큰 성좌 + 렌즈 호위
      const { M } = S;
      M.spawn({ type: 'star', x: 0, z: -11.5, size: 3.6, hp: 80, life: 26, hr: 1.25, spin: 0.5, path: (t) => [Math.sin(t * 0.5) * 4, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.8) * 0.8],
        fire: (() => { let c = 1.6, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; k++; M.ring(m, S.n(18, 9), { a0: k * 0.2, speed: 4.2, size: 1.0, accel: 0.6, maxS: 7 }); M.fan(m, S.n(5, 3), 0.9, M.aim(m), { speed: 7, size: 1.0 }); } }; })() });
      yield 2;
      for (const x of [-7, 7, -4, 4]) { S.drift({ type: 'lens', x, hp: 6, size: 1.8, hold: 2, fire: F.aim(S, 3, 0.4, 6.6, 1.3) }); yield 1.4; }
      yield* S.clear(16); yield 0.5;
    },
  ],
};
/** 정지했다가 풀려나는 별 (별자리 선) */
function G_hold(S, x, z, hold) { S.G.bullets.spawn({ owner: 'boss', kind: 'star', x, z, a: Math.atan2(S.G.player.z - z, S.G.player.x - x), speed: 5.2 * S.G.run.diff.spd, size: 1.0, color: 0xcfe0ff, hold, reaim: true, life: hold + 6 }); }

// ═══════════════════════════ STAGE 2 · 기술실 ═══════════════════════════
// 탄은 얌전하고 느리다. 병사는 직각 레일로 움직이며 축을 따라 쏘고, 가끔 푸른 구역(입력 지연)이 깔린다.
const stage2 = {
  a: [
    function* railPatrol(S) { // 레일 순찰: 직각으로 꺾이며 이동, 꺾을 때마다 십자 사격
      const { M } = S;
      const mk = (pts, delay) => M.spawn({ type: 'circuit', x: pts[0][0], z: pts[0][1], hp: 7, size: 1.9, life: 16, path: S.rail(pts, 4.2),
        fire: (() => { let last = -1; return (m) => { const seg = Math.floor(m.age * 4.2 / 6); if (seg !== last && m.age > 0.5) { last = seg; for (let k = 0; k < 4; k++) M.shoot(m, { a: (k * TAU) / 4, speed: 4.2, kind: 'pixel', size: 1.0 }); } }; })() });
      mk([[-12, -9], [-6, -9], [-6, -3], [4, -3], [4, -9], [12, -9]], 0); yield 1.2;
      mk([[12, -6], [6, -6], [6, 0], [-4, 0], [-4, -6], [-12, -6]], 0); yield 1.2;
      mk([[0, -12], [0, -7], [-8, -7], [-8, -2], [8, -2], [8, -12]], 0);
      yield* S.clear(14); yield 0.6;
    },
    function* dataStream(S) { // 데이터 스트림: 가로 줄이 내려오고 틈이 한 칸씩 이동
      const { G } = S; let gap = rnd(-6, 6);
      for (let r = 0; r < 8; r++) {
        gap = Math.max(-7.5, Math.min(7.5, gap + (r % 2 ? -1 : 1) * 2.2));
        for (let x = -10; x <= 10; x += 1.7) if (Math.abs(x - gap) > 1.9) G.bullets.spawn({ owner: 'boss', kind: 'pixel', x, z: -11, a: Math.PI / 2, speed: 3.6 * G.run.diff.spd, size: 1.0, color: r % 2 ? 0x9fd8ff : 0xffffff, life: 9 });
        yield 1.0;
      }
      yield 1.5;
    },
    function* lagField(S) { // 푸른 구역: 느린 입력 지연 구역 + 칩 병사
      const { G, M } = S;
      G.zones.spawn({ kind: 'lag', x: -4, z: 2, r: 3.4, warn: 0.8, dur: 9, color: 0x5fb4ff });
      for (let i = 0; i < 4; i++) { S.drift({ type: 'node', x: -7 + i * 4.6, hp: 4, size: 1.4, hold: 2.4, fire: F.aim(S, 3, 0.5, 4.6, 1.2) }); yield 0.9; }
      yield* S.clear(11); yield 0.6; void M;
    },
  ],
  b: [
    function* nodeSwarm(S) { // 칩 떼: 격자로 정렬해 내려오다 한꺼번에 90도 꺾는다
      const { M } = S;
      for (let wv = 0; wv < 3; wv++) {
        const side = wv % 2 ? -1 : 1;
        for (let i = 0; i < 6; i++) { const x = -7.5 + i * 3; M.spawn({ type: 'node', x, z: -12, hp: 3, size: 1.3, life: 11, path: (t) => (t < 3 ? [x, -12 + t * 3.4] : [x + side * (t - 3) * 6.5, -12 + 3 * 3.4]), fire: F.down(S, 2, 4.4, 1.2, 0.4 + i * 0.1) }); }
        yield 3.6;
      }
      yield* S.clear(12); yield 0.5;
    },
    function* firewallRails(S) { // 방화벽: 두 줄의 포대가 서로 다른 축으로 쏜다
      S.turret({ type: 'circuit', side: -1, x: 8, z: -3, hp: 16, size: 2.3, stay: 7, fire: F.spiral(S, 1, 3, 4.2, 0.2, { kind: 'pixel' }) });
      S.turret({ type: 'circuit', side: 1, x: 8, z: -6, hp: 16, size: 2.3, stay: 7, fire: F.down(S, 3, 4.6, 1.0) });
      yield 3;
      for (let i = 0; i < 4; i++) { S.swoop({ type: 'node', from: i % 2 ? 1 : -1, z: -8, amp: 0.8, speed: 5, hp: 4, size: 1.4, fire: F.aim(S, 1, 0, 5.4, 99, 1.0) }); yield 0.8; }
      yield* S.clear(10); yield 0.6;
    },
    function* mainframe(S) { // 엘리트: 중앙 서버 + 입력 반전 구역 한 번
      const { M, G } = S;
      M.spawn({ type: 'circuit', x: 0, z: -11.5, size: 3.6, hp: 78, life: 26, hr: 1.25, spin: 0.2, path: (t) => [Math.sin(t * 0.45) * 4.5, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.7) * 0.8],
        fire: (() => { let c = 1.4, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.7; k++; M.ring(m, S.n(14, 8), { a0: k * 0.25, speed: 4.0, kind: 'pixel', size: 1.0 }); if (k === 3) G.zones.spawn({ kind: 'invert', x: G.player.x, z: G.player.z, r: 3, warn: 0.9, dur: 5, color: 0xff8ad0 }); } }; })() });
      yield 2.5;
      for (const x of [-6, 6, -3, 3]) { S.drift({ type: 'node', x, hp: 5, size: 1.5, hold: 2.2, fire: F.aim(S, 3, 0.6, 4.8, 1.3) }); yield 1.3; }
      yield* S.clear(16); yield 0.5;
    },
  ],
};

// ═══════════════════════════ STAGE 3 · 테라스 ═══════════════════════════
// 탄 수는 적지만 병사도 탄도 매우 빠르다. 질주 · 채찍 · 크루아상(되돌아오는 초승달).
const stage3 = {
  a: [
    function* sprinters(S) { // 질주: 꽃잎 날개가 줄지어 가로질러 달린다
      const { M } = S;
      for (let i = 0; i < 8; i++) {
        const from = i % 2 ? 1 : -1, z = -9 + (i % 5) * 2.4;
        M.spawn({ type: 'swift', x: from * 13, z, hp: 3, size: 1.7, life: 5, spin: 0, path: (t) => [from * 13 - from * t * 14, z], fire: (() => { let c = 0.3; return (m, dt) => { c -= dt; if (c <= 0) { c = 99; M.shoot(m, { a: M.aim(m), speed: 11, kind: 'blade', size: 1.2 }); } }; })() });
        yield 0.55;
      }
      yield* S.clear(7); yield 0.4;
    },
    function* petalWhips(S) { // 꽃잎 채찍: 휘어 들어오는 가는 탄 줄
      const { M } = S;
      for (const x of [-6, 6, 0]) {
        S.drift({ type: 'rose', x, vz: 4, hp: 6, size: 2.0, hold: 3.2, stopZ: -6, fire: (() => { let c = 0.8, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.6; k++; for (let i = 0; i < S.n(7, 4); i++) M.shoot(m, { a: M.aim(m) + (k % 2 ? 0.9 : -0.9), speed: 9, kind: 'petal', size: 1.1, turn: (k % 2 ? -1 : 1) * 1.6, delay: i * 0.06, life: 4 }); } }; })() });
        yield 1.2;
      }
      yield* S.clear(11); yield 0.5;
    },
    function* croissants(S) { // 크루아상: 멀리 나갔다 되돌아오는 초승달
      const { M, G } = S;
      for (let w = 0; w < 4; w++) {
        const a0 = rnd(0, TAU), x = rnd(-5, 5);
        M.spawn({ type: 'rose', x, z: -9, hp: 6, size: 2.0, life: 7, path: (t) => [x + Math.sin(t) * 3, -9 + Math.min(t, 2) * 1.3],
          fire: (() => { let done = false; return (m) => { if (m.age > 1 && !done) { done = true; for (let k = 0; k < S.n(6, 4); k++) G.bullets.spawn({ owner: 'boss', kind: 'crescent', x: m.x, z: m.z, a: a0 + (k * TAU) / S.n(6, 4), speed: 10 * G.run.diff.spd, size: 1.4, color: 0xffd36b, spin: 6, life: 5, fn: (b) => { if (!b._f && b.age > 0.8) { b._f = 1; b.vx = -b.vx * 0.9; b.vz = -b.vz * 0.9; } } }); } }; })() });
        yield 1.6;
      }
      yield* S.clear(9); yield 0.5;
    },
  ],
  b: [
    function* rush(S) { // 돌진: 장미 병사들이 위에서 아래로 단번에 내리꽂힌다
      const { M } = S;
      for (let w = 0; w < 4; w++) {
        for (let i = 0; i < 4; i++) { const x = -7.5 + i * 5 + (w % 2) * 2.5; M.spawn({ type: 'swift', x, z: -12, hp: 3, size: 1.6, life: 5, spin: 0, path: (t) => [x, -12 + t * 12], fire: F.down(S, 1, 12, 0.35, 0.2, { kind: 'blade' }) }); }
        yield 1.5;
      }
      yield* S.clear(8); yield 0.5;
    },
    function* whipTurrets(S) { // 채찍 포대: 좌우에서 빠른 나선 + 휘는 탄
      S.turret({ type: 'rose', side: -1, x: 8, z: -4, hp: 14, size: 2.3, stay: 6, fire: F.spiral(S, 1, 2, 8, 0.22, { kind: 'blade' }) });
      S.turret({ type: 'rose', side: 1, x: 8, z: -4, hp: 14, size: 2.3, stay: 6, fire: F.spiral(S, -1, 2, 8, 0.22, { kind: 'blade' }) });
      yield 3;
      for (let i = 0; i < 5; i++) { S.swoop({ type: 'swift', from: i % 2 ? 1 : -1, z: -8.5, amp: 1.2, speed: 9, hp: 3, size: 1.5, fire: F.aim(S, 3, 0.3, 10, 99, 0.8) }); yield 0.8; }
      yield* S.clear(10); yield 0.5;
    },
    function* patissier(S) { // 엘리트: 큰 장미창 — 빠른 부채 + 크루아상 + 빠른 고리
      const { M, G } = S;
      M.spawn({ type: 'rose', x: 0, z: -11.5, size: 3.6, hp: 70, life: 26, hr: 1.25, spin: 0.6, path: (t) => [Math.sin(t * 0.8) * 5, t < 2 ? -11.5 + t * 3.2 : -5.2 + Math.sin(t * 1.1) * 0.8],
        fire: (() => { let c = 1.2, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.2; k++; const f = k % 3;
          if (f === 0) M.fan(m, S.n(5, 3), 0.5, M.aim(m), { speed: 12, kind: 'blade', size: 1.2 });
          else if (f === 1) for (let i = 0; i < S.n(4, 3); i++) G.bullets.spawn({ owner: 'boss', kind: 'crescent', x: m.x, z: m.z, a: M.aim(m) + (i - 1.5) * 0.4, speed: 9 * G.run.diff.spd, size: 1.4, color: 0xffd36b, spin: 6, life: 4, fn: (b) => { if (!b._f && b.age > 0.7) { b._f = 1; b.vx = -b.vx; b.vz = -b.vz; } } });
          else M.ring(m, S.n(16, 8), { speed: 8, kind: 'petal', size: 1.1 }); } }; })() });
      yield 2.5;
      for (const x of [-7, 7, -3.5, 3.5]) { S.drift({ type: 'swift', x, vz: 5, hp: 4, size: 1.6, hold: 1.6, fire: F.aim(S, 3, 0.4, 11, 1.0) }); yield 1.1; }
      yield* S.clear(16); yield 0.5;
    },
  ],
};

// ═══════════════════════════ STAGE 4 · 도서관 ═══════════════════════════
// 가장 어려운 일반 스테이지: 서가 벽 · 낱장 떼 · 책을 두른 정예 · 떨어지는 책.
const stage4 = {
  a: [
    function* pageWalls(S) { // 낱장 벽: 틈의 위치가 규칙적으로 이동하는 벽이 연달아 내려온다
      const { G } = S; let gap = 0;
      for (let w = 0; w < 9; w++) {
        gap = ((gap + 3 + (w % 3)) % 14) - 7;
        for (let x = -10; x <= 10; x += 1.5) if (Math.abs(x - gap) > 1.8) G.bullets.spawn({ owner: 'boss', kind: 'page', x, z: -11, a: Math.PI / 2, speed: 4.2 * G.run.diff.spd, size: 1.15, color: 0x9fe8c4, life: 9 });
        yield 0.95;
      }
      yield 1.2;
    },
    function* leafSwarm(S) { // 낱장 떼: 작은 낱장 병사가 사인 곡선으로 흩날리며 쏜다
      const { M } = S;
      for (let i = 0; i < 12; i++) { const x0 = rnd(-8, 8), ph = rnd(0, TAU); M.spawn({ type: 'leaf', x: x0, z: -12, hp: 2, size: 1.2, life: 10, path: (t) => [x0 + Math.sin(t * 1.6 + ph) * 3.4, -12 + t * 2.9], fire: F.aim(S, 1, 0, 5.4, 1.5, 0.8 + i * 0.08) }); yield 0.45; }
      yield* S.clear(12); yield 0.5;
    },
    function* shelfTurrets(S) { // 서가 포대 + 아래서 올라오는 구역 폭격
      const { G } = S;
      S.turret({ type: 'tome', side: -1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 7, fire: F.spiral(S, 1, 3, 4.4, 0.18, { kind: 'page' }) });
      S.turret({ type: 'tome', side: 1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 7, fire: F.spiral(S, -1, 3, 4.4, 0.18, { kind: 'page' }) });
      yield 2.5;
      for (let i = 0; i < 5; i++) { G.zones.spawn({ x: G.player.x + rnd(-2, 2), z: G.player.z + rnd(-2, 2), r: 1.9, warn: 1.0, dur: 0.25, color: 0x3fd49a, onBoom: (z) => { for (let k = 0; k < S.n(8, 5); k++) G.bullets.spawn({ owner: 'boss', kind: 'page', x: z.x, z: z.z, a: (k * TAU) / S.n(8, 5), speed: 4.4 * G.run.diff.spd, size: 1.1, color: 0xffe39a }); } }); yield 0.9; }
      yield* S.clear(10); yield 0.5;
    },
    function* orbitBooks(S) { // 책을 두른 정예: 낱장이 병사를 돌고, 병사는 천천히 내려온다
      const { M } = S;
      for (const x of [-5, 5]) { const m = M.spawn({ type: 'tome', x, z: -12, hp: 34, size: 2.6, life: 18, hr: 1, path: (t) => [x + Math.sin(t * 0.6) * 2, t < 2 ? -12 + t * 3.3 : -5.4 + Math.sin(t * 0.7) * 0.8], fire: F.aim(S, 3, 0.5, 5, 1.6, 2) }); if (m) S.orbiters(m, S.n(8, 5), 2.6, 1.3, { kind: 'page', color: 0x9fe8c4 }); yield 1; }
      yield* S.clear(16); yield 0.5;
    },
  ],
  b: [
    function* fallingBooks(S) { // 떨어지는 책: 큰 낙하 구역이 줄지어 박힌다
      const { G } = S;
      for (let w = 0; w < 5; w++) {
        for (let i = 0; i < 4; i++) { const x = rnd(-8, 8), z = rnd(-6, 8); G.zones.spawn({ x, z, r: 2.1, warn: 1.0 + i * 0.12, dur: 0.3, color: 0xffe39a, onBoom: (zz) => { for (let k = 0; k < S.n(6, 4); k++) G.bullets.spawn({ owner: 'boss', kind: 'page', x: zz.x, z: zz.z, a: Math.random() * TAU, speed: 4.6 * G.run.diff.spd, size: 1.1, color: 0x9fe8c4 }); } }); }
        yield 1.7;
      }
      yield 1.2;
    },
    function* walls2(S) { // 이중 벽: 좌우에서 동시에 들어오는 서가 줄
      const { G } = S;
      for (let w = 0; w < 6; w++) {
        const gz = rnd(-3, 6);
        for (let z = -9; z <= 10; z += 1.5) { if (Math.abs(z - gz) < 2) continue; for (const side of [-1, 1]) G.bullets.spawn({ owner: 'boss', kind: 'page', x: side * 12.5, z, a: side < 0 ? 0 : Math.PI, speed: 4.4 * G.run.diff.spd, size: 1.1, color: 0xffe39a, life: 9 }); }
        yield 1.4;
      }
      yield 1.2;
    },
    function* archivists(S) { // 사서 병사 줄: 한 줄로 내려와 좌우로 흩어지며 부채
      const { M } = S;
      for (let w = 0; w < 3; w++) { for (let i = 0; i < 6; i++) { const x = -7.5 + i * 3; S.drift({ type: 'tome', x, hp: 7, size: 1.9, hold: 2.5, stopZ: -6.5, fire: F.down(S, 3, 5.2, 0.9, 0.5 + i * 0.1, { kind: 'page' }) }); yield 0.3; } yield 2.4; }
      yield* S.clear(12); yield 0.5; void M;
    },
    function* grandReader(S) { // 엘리트 2기 + 낱장 떼
      const { M } = S;
      for (const x of [-4.5, 4.5]) M.spawn({ type: 'tome', x, z: -11.5, size: 3.4, hp: 70, life: 26, hr: 1.2, spin: 0.3, path: (t) => [x + Math.sin(t * 0.5 + x) * 3, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.8) * 0.8],
        fire: (() => { let c = 1.5, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.3; k++; M.ring(m, S.n(16, 9), { a0: k * 0.2, speed: 4.4, kind: 'page', size: 1.1 }); M.fan(m, S.n(5, 3), 0.9, M.aim(m), { speed: 7, kind: 'page', size: 1.1 }); } }; })() });
      yield 3;
      for (let i = 0; i < 8; i++) { const x0 = rnd(-8, 8); M.spawn({ type: 'leaf', x: x0, z: -12, hp: 2, size: 1.2, life: 9, path: (t) => [x0 + Math.sin(t * 1.8) * 3, -12 + t * 3.2], fire: F.aim(S, 1, 0, 5.6, 1.4) }); yield 0.6; }
      yield* S.clear(18); yield 0.5;
    },
  ],
};

// ═══════════════════════════ STAGE 5 · 기록실 ═══════════════════════════
// 차갑고 정밀하다: 표식 → 폭발, 룬 선, 도장 구역, 회전하는 봉인 편대.
const stage5 = {
  a: [
    function* marking(S) { // 표식: 봉인이 플레이어를 표시하고 잠시 뒤 터진다
      const { G, M } = S;
      for (const x of [-6, 6, 0]) { S.drift({ type: 'seal', x, hp: 7, size: 1.9, hold: 4, fire: (() => { let c = 1.0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; G.zones.spawn({ x: G.player.x, z: G.player.z, r: 1.8, warn: 1.0, dur: 0.25, color: 0xc89bff, onBoom: (z) => { for (let k = 0; k < S.n(8, 5); k++) G.bullets.spawn({ owner: 'boss', kind: 'glyph', x: z.x, z: z.z, a: (k * TAU) / S.n(8, 5), speed: 4.2 * G.run.diff.spd, size: 1.0, color: 0xc89bff }); } }); } }; })() }); yield 1.1; }
      yield* S.clear(12); yield 0.5; void M;
    },
    function* runeLines(S) { // 룬 선: 가로·세로 선이 번갈아 그어진다
      const { G } = S;
      for (let w = 0; w < 5; w++) {
        for (let k = 0; k < 4; k++) { const x = -9 + k * 6 + rnd(-1, 1); G.beams.spawn({ x, z: -11, a: Math.PI / 2, w: 0.7, len: 24, warn: 0.9, dur: 0.18, color: 0xc89bff }); }
        yield 1.3;
        for (let k = 0; k < 3; k++) { const z = -6 + k * 5 + rnd(-1, 1); G.beams.spawn({ x: -12, z, a: 0, w: 0.7, len: 26, warn: 0.9, dur: 0.18, color: 0xc89bff }); }
        yield 1.3;
      }
      yield 0.8;
    },
    function* sealFormation(S) { // 봉인 편대: 원을 그리며 천천히 도는 6기
      const { M } = S;
      for (let i = 0; i < 6; i++) { const ph = (i * TAU) / 6; M.spawn({ type: 'seal', x: 0, z: -6, hp: 6, size: 1.7, life: 12, path: (t) => { const r = Math.min(1, t / 1.5) * 5.2; return [Math.cos(ph + t * 0.5) * r, -5 + Math.sin(ph + t * 0.5) * r * 0.55]; }, fire: F.aim(S, 1, 0, 4.8, 1.8, 1 + i * 0.25, { kind: 'glyph' }) }); }
      yield* S.clear(14); yield 0.6;
    },
  ],
  b: [
    function* stamps(S) { // 도장: 구역이 순서대로 쾅쾅 박힌다
      const { G } = S;
      for (let w = 0; w < 4; w++) { for (let i = 0; i < 7; i++) { G.zones.spawn({ x: -9 + i * 3 + (w % 2) * 1.5, z: -4 + (i % 3) * 3, r: 1.9, warn: 0.9 + i * 0.18, dur: 0.25, color: 0xc89bff }); } yield 2.6; }
      yield 1;
    },
    function* ledgerTurrets(S) { // 장부 포대: 룬 나선 + 위에서 룬 병사
      S.turret({ type: 'ledger', side: -1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 6.5, fire: F.spiral(S, 1, 3, 4.8, 0.14, { kind: 'glyph' }) });
      S.turret({ type: 'ledger', side: 1, x: 8.2, z: -3, hp: 18, size: 2.4, stay: 6.5, fire: F.spiral(S, -1, 3, 4.8, 0.14, { kind: 'glyph' }) });
      yield 3;
      for (let i = 0; i < 6; i++) { S.swoop({ type: 'seal', from: i % 2 ? 1 : -1, z: -9, amp: 0.9, hp: 5, size: 1.5, fire: F.aim(S, 3, 0.5, 6.2, 1.8, 1) }); yield 0.75; }
      yield* S.clear(10); yield 0.6;
    },
    function* auditor(S) { // 엘리트: 큰 봉인 — 육각 회전 빔 + 표식
      const { M, G } = S;
      M.spawn({ type: 'seal', x: 0, z: -11.5, size: 3.6, hp: 86, life: 26, hr: 1.3, spin: -0.4, path: (t) => [Math.sin(t * 0.45) * 4.5, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.7) * 0.8],
        fire: (() => { let c = 1.4, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.8; k++; M.ring(m, S.n(16, 9), { a0: k * 0.25, speed: 4.4, kind: 'glyph', size: 1.0 }); if (k % 2) for (let i = 0; i < 3; i++) G.zones.spawn({ x: G.player.x + rnd(-3, 3), z: G.player.z + rnd(-3, 3), r: 1.8, warn: 1.1, dur: 0.25, color: 0xc89bff }); } }; })() });
      yield 2.4;
      for (const x of [-6, 6, -3, 3]) { S.drift({ type: 'seal', x, hp: 6, size: 1.8, hold: 2.2, fire: F.aim(S, 5, 0.8, 6.2, 1.2) }); yield 1.3; }
      yield* S.clear(16); yield 0.5;
    },
  ],
};

// ═══════════════════════════ STAGE 6 · 달의 정원 ═══════════════════════════
const stage6 = {
  a: [
    function* crescentWaves(S) { // 초승달 파도: 월병이 가로지르며 부채꼴 초승달을 뿌린다
      const { M } = S;
      for (let i = 0; i < 6; i++) { S.swoop({ type: 'moon', from: i % 2 ? 1 : -1, z: -6.5 + (i % 3) * 0.9, amp: 1.8, hp: 5, size: 1.9, fire: F.aim(S, 5, 0.9, 5.6, 1.7, 0.9, { kind: 'crescent', size: 1.2 }) }); yield 0.6; }
      yield* S.clear(10); yield 0.5; void M;
    },
    function* eclipses(S) { // 월식 병사: 느린 유도구
      const { M } = S;
      for (const x of [-6, 0, 6]) { S.drift({ type: 'eclipse', x, hp: 12, size: 2.2, hold: 3.4, stopZ: -5.8, fire: (() => { let c = 0.8; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.8; M.shoot(m, { a: M.aim(m), speed: 3.8, size: 1.5, hr: 0.4, homing: 1.1, homeT: 2.6, trail: true, life: 6 }); M.fan(m, S.n(3, 2), 1.0, M.aim(m), { speed: 5, size: 1.0 }); } }; })() }); yield 1.0; }
      yield* S.clear(12); yield 0.5;
    },
    function* moonbeams(S) { // 달빛 줄기: 위에서 내려오는 빛기둥이 좌에서 우로 훑는다
      const { G } = S;
      for (let w = 0; w < 4; w++) { const dir = w % 2 ? -1 : 1; for (let k = 0; k < 8; k++) { const x = dir * (-9 + k * 2.4); G.beams.spawn({ x, z: -11, a: Math.PI / 2, w: 0.9, len: 24, warn: 0.7, dur: 0.16, color: 0xfff1c9 }); yield 0.22; } yield 1.1; }
      yield 0.6;
    },
  ],
  b: [
    function* phases(S) { // 위상 정예: 초승 → 상현 → 만월 순으로 공격이 바뀐다
      const { M } = S;
      M.spawn({ type: 'phase', x: 0, z: -11.5, size: 3.8, hp: 110, life: 28, hr: 1.35, spin: 0.35, path: (t) => [Math.sin(t * 0.4) * 4, t < 2.5 ? -11.5 + t * 2.6 : -5.2 + Math.sin(t * 0.7) * 0.8],
        fire: (() => { let c = 1.4, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; k++; const f = k % 3;
          if (f === 0) M.fan(m, S.n(9, 5), 1.5, M.aim(m), { speed: 6.6, kind: 'crescent', size: 1.2 });
          else if (f === 1) for (let i = 0; i < S.n(4, 2); i++) M.shoot(m, { a: M.aim(m) + rnd(-0.8, 0.8), speed: 3.8, size: 1.5, hr: 0.4, homing: 1.2, homeT: 2.4, trail: true, life: 6, kind: 'orb', color: 0xa07bff });
          else M.ring(m, S.n(20, 12), { speed: 5.4, size: 1.05, accel: 0.4, maxS: 8 }); } }; })() });
      yield 2;
      for (const x of [-7, 7, -3.5, 3.5]) { S.drift({ type: x < 0 ? 'moon' : 'eclipse', x, hp: 7, size: 1.9, hold: 2.2, fire: F.aim(S, 5, 0.9, 6.2, 1.2) }); yield 1.3; }
      yield* S.clear(18); yield 0.5;
    },
    function* moonTurrets(S) {
      S.turret({ type: 'eclipse', side: -1, x: 8.2, z: -3.2, hp: 18, size: 2.4, stay: 6.5, fire: F.spiral(S, 1, 2, 4.6, 0.15) });
      S.turret({ type: 'eclipse', side: 1, x: 8.2, z: -3.2, hp: 18, size: 2.4, stay: 6.5, fire: F.spiral(S, -1, 2, 4.6, 0.15) });
      yield 2.5;
      for (let i = 0; i < 4; i++) { S.swoop({ type: 'moon', from: i % 2 ? 1 : -1, z: -5 - (i % 2) * 2, amp: 1.2, speed: 6, hp: 8, size: 2.0, fire: F.ring(S, 12, 5.2, 1.1, 0.8, { kind: 'crescent' }) }); yield 0.9; }
      yield* S.clear(14); yield 0.6;
    },
    function* gardenGate(S) { // 문지기: 큰 월병 둘이 마주 보고 선다
      const { M } = S;
      for (const s of [-1, 1]) M.spawn({ type: 'moon', x: s * 5, z: -11.5, size: 3.4, hp: 70, life: 22, hr: 1.2, spin: 0.4 * s, path: (t) => [s * (5 - Math.sin(Math.min(t, 6) * 0.4) * 1.5), t < 2.5 ? -11.5 + t * 2.6 : -5.5], fire: F.ring(S, 16, 4.8, 1.4, 1.2, { kind: 'crescent' }) });
      yield* S.clear(20); yield 0.6;
    },
  ],
};

// ═══════════════════════════ EXTRA · 인형극장 ═══════════════════════════
// 줄에 매달려 춤추는 인형: 병사끼리 붉은 줄로 이어져 있고, 줄은 끊어지며 가로지른다. 탄은 멈칫하고 흔들린다.
const speedsA = [[0, 1.3], [0.6, 0.3], [1.2, 1.6]];
const stageEx = (H) => ({
  a: [
    function* waltzDolls(S) { // 왈츠: 두 인형이 줄로 이어져 원을 그리며 춤춘다
      const { M } = S;
      for (let p = 0; p < (H ? 3 : 2); p++) {
        const cx = (p - 1) * 5, ph = p;
        const mk = (s) => M.spawn({ type: 'doll', x: cx, z: -12, hp: 8, size: 2.0, life: 12, path: (t) => { const r = 3 + Math.min(1, t / 2) * 1.2; return [cx + Math.cos(t * 0.9 * s + ph) * r * s, -6 + Math.sin(t * 0.9 * s + ph) * r * 0.55 + (t < 2 ? (2 - t) * -2.5 : 0)]; },
          fire: F.aim(S, 3, 0.6, 4.4, 1.5, 1, { kind: 'shard', speeds: speedsA, wob: [1.2, 2.2] }) });
        const a = mk(1), b = mk(-1); if (a && b) S.tie(a, b, 4.2);
        yield 1.2;
      }
      yield* S.clear(14); yield 0.5;
    },
    function* maskParade(S) { // 가면 행렬: 느리게 가로지르다 멈춰 열린다
      const { M, G } = S;
      for (let i = 0; i < 5; i++) {
        const from = i % 2 ? 1 : -1, z = -8 + (i % 3) * 2;
        M.spawn({ type: 'mask', x: from * 13, z, hp: 6, size: 1.9, life: 9, path: (t) => [from * (13 - Math.min(t, 3.2) * 3.4), z], fire: (() => { let done = false; return (m) => { if (m.age > 3.4 && !done) { done = true; const n = S.n(10, 6); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: m.x, z: m.z, a: (k * TAU) / n, speed: 4.6 * G.run.diff.spd, size: 1.05, color: 0xffa0b0, speeds: [[0, 0.3], [0.6, 0.3], [1.0, 1.8]], wob: [1.6 * (k % 2 ? 1 : -1), 2.4], life: 7 }); } }; })() });
        yield 1.2;
      }
      yield* S.clear(12); yield 0.5;
    },
    function* spools(S) { // 실패: 천장에서 줄이 풀리며 가로로 쓸고 간다
      const { M, G } = S;
      for (let i = 0; i < 4; i++) {
        const x = -7 + i * 4.6; const m = M.spawn({ type: 'spool', x, z: -11.5, hp: 8, size: 1.8, life: 8, path: (t) => [x, t < 1.4 ? -11.5 + t * 3 : -7.3], fire: (() => { let done = false; return (mm) => { if (mm.age > 2 && !done) { done = true; G.beams.spawn({ x: mm.x, z: mm.z, a: Math.PI / 2, w: 0.6, len: 24, warn: 0.8, dur: 0.2, color: 0xff4f6e }); } }; })() });
        void m; yield 0.9;
      }
      yield* S.clear(10); yield 0.6;
    },
  ],
  b: [
    function* chorusLine(S) { // 합창대: 줄지어 선 인형들이 박자에 맞춰 순서대로 쏜다
      const { M } = S, n = H ? 8 : 6;
      const dolls = [];
      for (let i = 0; i < n; i++) { const x = -9 + i * (18 / (n - 1)); dolls.push(M.spawn({ type: 'doll', x, z: -12, hp: 7, size: 1.8, life: 13, path: (t) => [x, t < 1.6 ? -12 + t * 3.1 : -7 + Math.sin(t * 1.6 + i) * 0.5],
        fire: (() => { let c = 1.6 + i * 0.22; return (m, dt) => { c -= dt; if (c <= 0) { c = n * 0.22; M.fan(m, S.n(3, 2), 0.5, M.aim(m), { speed: 5.2, kind: 'shard', size: 1.05, speeds: [[0, 1], [0.5, 0.2], [0.8, 1.9]] }); } }; })() })); }
      for (let i = 0; i + 1 < dolls.length; i++) if (dolls[i] && dolls[i + 1]) S.tie(dolls[i], dolls[i + 1], 6 + i * 0.4);
      yield* S.clear(16); yield 0.6;
    },
    function* stagePortals(S) { // 무대 장치: 포대 + 낙하 구역
      const { G } = S;
      S.turret({ type: 'mask', side: -1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6.5, fire: F.spiral(S, 1, 3, 4.4, 0.17, { wob: [1.3, 2.4] }) });
      S.turret({ type: 'mask', side: 1, x: 8, z: -3.5, hp: 16, size: 2.3, stay: 6.5, fire: F.spiral(S, -1, 3, 4.4, 0.17, { wob: [-1.3, 2.4] }) });
      yield 3;
      for (let i = 0; i < (H ? 7 : 5); i++) { G.zones.spawn({ x: G.player.x + rnd(-2, 2), z: G.player.z + rnd(-2, 2), r: 1.9, warn: 1.0, dur: 0.25, color: 0xff4f6e, onBoom: (z) => { const n = S.n(8, 5); for (let k = 0; k < n; k++) G.bullets.spawn({ owner: 'boss', kind: 'shard', x: z.x, z: z.z, a: (k * TAU) / n, speed: 4.2 * G.run.diff.spd, size: 1.0, color: 0xffa0b0, speeds: [[0, 0.3], [0.7, 0.3], [1.0, 1.9]] }); } }); yield 0.8; }
      yield* S.clear(10); yield 0.5;
    },
    function* puppetMaster(S) { // 엘리트: 큰 인형 — 줄로 이어진 작은 인형 넷을 거느린다
      const { M } = S;
      const boss = M.spawn({ type: 'doll', x: 0, z: -11.5, size: 3.6, hp: 80, life: 28, hr: 1.25, spin: 0.2, path: (t) => [Math.sin(t * 0.5) * 4, t < 2.5 ? -11.5 + t * 2.6 : -5 + Math.sin(t * 0.8) * 0.8],
        fire: (() => { let c = 1.5, k = 0; return (m, dt) => { c -= dt; if (c <= 0) { c = 1.5; k++; M.ring(m, S.n(16, 9), { a0: k * 0.2, speed: 4.4, kind: 'shard', size: 1.0, speeds: [[0, 1.4], [0.7, 0.3], [1.3, 1.6]] }); } }; })() });
      yield 1.5;
      for (let i = 0; i < 4; i++) { const ph = (i * TAU) / 4; const s = M.spawn({ type: 'doll', x: 0, z: -9, hp: 8, size: 1.5, life: 22, path: (t) => [(boss && boss.alive ? boss.x : 0) + Math.cos(ph + t * 0.9) * 4.8, (boss && boss.alive ? boss.z : -5) + 1.5 + Math.sin(ph + t * 0.9) * 2.4], fire: F.aim(S, 1, 0, 5, 1.6, 1.2 + i * 0.3, { kind: 'shard', wob: [1.5, 2] }) }); if (s && boss) S.tie(boss, s, 0); yield 0.3; }
      yield* S.clear(22); yield 0.5;
    },
  ],
});

const SCRIPTS = { opsir: stage1, astra: stage2, tramont: stage3, index: stage4, bellis: stage5, lunarinth: stage6, arkesia: stageEx(false), arkesiaHell: stageEx(true) };

function* run(S, id, part) {
  const list = (SCRIPTS[id] || SCRIPTS.opsir)[part];
  yield part === 'a' ? 1.2 : 0.8;
  for (const f of list) { yield* f(S); if (hell(S)) { /* 광란: 구간 사이 간격이 짧다 */ } }
}

/** 스테이지 웨이브 스크립트 생성기. part: 'a'(중간 보스 전) | 'b'(중간 보스 후) */
export function makeStageScript(G, id, part = 'a') {
  return run(api(G), id, part);
}
export { MOB_TYPES };
