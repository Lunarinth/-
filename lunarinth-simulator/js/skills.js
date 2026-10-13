// 액티브 스킬 (C 키). 아이템으로 얻고, 방을 정리할 때마다 충전된다 (보스전에서는 시간에 따라 천천히 충전).
// use(id) 가 true 를 돌려주면 충전이 소모된다.
import { ARENA_R } from './scene.js';
import { rollItem } from './items.js';

const TAU = Math.PI * 2;
const FWD = -Math.PI / 2;

/** 스킬별 필요 충전량(방 개수)과 표시 이름 */
export const SKILLS = {
  barrier: { charge: 2, name: '월광의 방벽' },
  timestop: { charge: 4, name: '시간의 모래' },
  blink: { charge: 1, name: '섬광 이동' },
  purify: { charge: 3, name: '탄막 정화' },
  clone: { charge: 4, name: '성검의 분신' },
  prayer: { charge: 4, name: '하녀장의 기도' },
  berserk: { charge: 3, name: '폭주' },
  well: { charge: 3, name: '중력 우물' },
  meteor: { charge: 3, name: '별똥별' },
  lemon: { charge: 2, name: '레몬 수류탄' },
  moonMask: { charge: 6, name: '달의 가면' },
  loop: { charge: 4, name: '무한 루프' },
  reroll: { charge: 3, name: '운명의 실타래' },
  lens: { charge: 2, name: '관측 렌즈' },
  holyBurst: { charge: 3, name: '성검 개방' },
};

export class Skills {
  constructor(G) { this.G = G; this.timers = []; this.wells = []; }
  charge(id) { return (SKILLS[id] || { charge: 3 }).charge; }
  reset() { this.timers.length = 0; this.wells.length = 0; }

  /** delay 초 뒤에 fn 실행 (게임 시간 기준 — 일시정지 · 시간 정지에 맞춰 멈춘다) */
  later(delay, fn) { this.timers.push({ t: delay, fn }); }

  /** 모든 적 (병사 + 보스) */
  enemies() {
    const G = this.G, out = G.mobs.list.filter((m) => m.alive);
    if (G.state === 'fight' && G.boss && G.boss.alive && G.boss.visible) out.push(G.boss);
    return out;
  }
  /** 반경 안의 적에게 피해 */
  blast(x, z, r, dmg, color = 0xffe9a6) {
    const G = this.G;
    for (const e of this.enemies()) {
      const er = e.hr ?? e.hitR ?? 1;
      if ((e.x - x) ** 2 + (e.z - z) ** 2 < (r + er) ** 2) G.hitEnemy(e, dmg, e.x, e.z);
    }
    G.fx.ring(x, 0.5, z, color, r * 2.2, 0.6);
    G.fx.burst(x, 1, z, 26, { color: [0xffffff, color], speed: 9, size: 0.9, life: 0.7, up: 1.2 });
    G.world.shake(0.35, 0.3);
  }

  use(id) {
    const G = this.G, P = G.player, st = P.st, sfx = G.audio.sfx, ui = G.ui;
    const name = (SKILLS[id] || {}).name || id;
    const say = (t) => ui.announce(`액티브 「${name}」${t ? ' — ' + t : ''}`, 1600);
    switch (id) {
      case 'barrier':
        P.buffs.barrier = 4; sfx.play('decoy_pop'); G.fx.ring(P.x, 0.8, P.z, 0xd9c8ff, 8, 0.6); say();
        return true;
      case 'timestop':
        G.freezeT = 3; sfx.play('phase_flash', { vol: 0.6 }); ui.flash('#e9e0ff', 500, 0.45); document.body.classList.add('timestop'); say('3초');
        return true;
      case 'blink': {
        const mv = P.lastMv && (P.lastMv[0] || P.lastMv[1]) ? P.lastMv : [0, -1];
        const l = Math.hypot(mv[0], mv[1]) || 1, dx = mv[0] / l, dz = mv[1] / l;
        const x0 = P.x, z0 = P.z, lim = ARENA_R - 0.6;
        let x1 = x0 + dx * 5.5, z1 = z0 + dz * 5.5; const r = Math.hypot(x1, z1); if (r > lim) { x1 *= lim / r; z1 *= lim / r; }
        for (const e of this.enemies()) {
          const vx = x1 - x0, vz = z1 - z0, l2 = vx * vx + vz * vz || 1;
          let u = ((e.x - x0) * vx + (e.z - z0) * vz) / l2; u = Math.max(0, Math.min(1, u));
          const ex = x0 + vx * u - e.x, ez = z0 + vz * u - e.z, er = (e.hr ?? e.hitR ?? 1) + 0.9;
          if (ex * ex + ez * ez < er * er) G.hitEnemy(e, 14 * st.dmg, e.x, e.z);
        }
        for (let k = 0; k <= 10; k++) G.fx.emit({ x: x0 + (x1 - x0) * k / 10, y: 1, z: z0 + (z1 - z0) * k / 10, life: 0.4, s0: 1.2, s1: 0, color: 0xffffff, tex: 'spark' });
        P.x = x1; P.z = z1; P.inv = Math.max(P.inv, 0.45); sfx.play('dash');
        return true;
      }
      case 'purify': {
        let n = 0;
        for (const b of G.bullets.list) if (b.active && b.owner === 'boss') { if (n++ < 50) G.pickups.spawn({ type: 'point', x: b.x, z: b.z, delay: 0.15 }); G.fx.puff(b.x, 0.9, b.z, 0x9fe8ff, 1); G.bullets.kill(b); }
        G.zones.clear(); G.beams.clear(); ui.flash('#bff4ff', 450, 0.4); sfx.play('heal'); say(`${n}발 정화`);
        return true;
      }
      case 'clone':
        P.buffs.clone = 8; P.recalc(); sfx.play('ult', { vol: 0.5 }); G.fx.burst(P.x, 1, P.z, 20, { color: [0xffe08a, 0xffffff], speed: 6, size: 0.8, life: 0.6 }); say('8초');
        return true;
      case 'prayer':
        if (P.hp >= P.maxHp) { ui.warn('이미 체력이 가득합니다', 900); return false; }
        P.heal(1); ui.setHp(P.hp, P.maxHp); sfx.play('heal'); G.fx.ring(P.x, 0.6, P.z, 0xff9ad0, 6, 0.6); say();
        return true;
      case 'berserk':
        P.buffs.berserk = 6; P.recalc(); sfx.play('laugh', { vol: 0.35, pitch: 1.4 }); ui.flash('#ff5a5a', 350, 0.3); say('6초');
        return true;
      case 'well':
        this.wells.push({ x: P.x, z: P.z - 3, t: 5, tick: 0 }); sfx.play('cast'); say();
        return true;
      case 'meteor': {
        const tg = this.enemies(); if (!tg.length) { ui.warn('표적이 없습니다', 800); return false; }
        tg.slice(0, 12).forEach((e, i) => {
          const x = e.x, z = e.z;
          G.zones.spawn({ x, z, r: 1.6, warn: 0.6 + i * 0.08, dur: 0.05, color: 0xffd0a0, dmg: 0 });
          this.later(0.6 + i * 0.08, () => { this.blast(x, z, 2.2, 22 * st.dmg, 0xffd0a0); sfx.play('boom', { vol: 0.5 }); });
        });
        say(`${Math.min(12, tg.length)}발`);
        return true;
      }
      case 'lemon': {
        const t = G.nearestEnemy(P.x, P.z, 30) || { x: P.x, z: P.z - 6 };
        const x0 = P.x, z0 = P.z, x1 = t.x, z1 = t.z;
        for (let k = 1; k <= 6; k++) this.later(k * 0.08, () => G.fx.emit({ x: x0 + (x1 - x0) * k / 6, y: 1 + Math.sin(k / 6 * Math.PI) * 2.5, z: z0 + (z1 - z0) * k / 6, life: 0.25, s0: 0.9, s1: 0.4, color: 0xffe14a, tex: 'orb' }));
        this.later(0.55, () => { this.blast(x1, z1, 3.6, 34 * st.dmg, 0xffe14a); for (let i = 0; i < 12; i++) P._spawn(G, x1, z1, (i * TAU) / 12, 2 * st.dmg, { color: 0xffe14a, kind: 'orb', size: 0.8 }); sfx.play('boom', { vol: 0.7 }); });
        sfx.play('cast'); return true;
      }
      case 'moonMask':
        P.buffs.moonMask = 10; P.recalc(); sfx.play('laugh_big', { vol: 0.4 }); ui.flash('#ff9ad8', 600, 0.45); ui.banner('달의 가면', '10초간 달의 모습으로', 1600);
        return true;
      case 'loop':
        P.buffs.loop = 8; sfx.play('glitch', { vol: 0.4 }); ui.flash('#5fe8c0', 350, 0.3); say('8초');
        return true;
      case 'reroll': {
        const its = G.pickups.items(); if (!its.length) { ui.warn('바꿀 아이템이 없습니다', 900); return false; }
        const owned = new Set(P.items);
        for (const p of its) { const it = rollItem(p.pool || 'treasure', owned); G.pickups.respec(p, it.id); G.fx.burst(p.x, 1.6, p.z, 14, { color: [0xffd0e0, 0xffffff], speed: 4, size: 0.6, life: 0.6 }); }
        G.saveRoomPickups && G.saveRoomPickups(); sfx.play('twang'); say();
        return true;
      }
      case 'lens':
        G.revealMap(false); P.buffs.lens = 10; P.recalc(); sfx.play('heal', { vol: 0.5 }); say('지도 · 유도 10초');
        return true;
      case 'holyBurst': {
        const w = 1.9;
        for (const e of this.enemies()) if (e.z < P.z + 0.5 && Math.abs(e.x - P.x) < w + (e.hr ?? e.hitR ?? 1)) G.hitEnemy(e, 46 * st.dmg, e.x, e.z);
        for (const b of G.bullets.list) if (b.active && b.owner === 'boss' && b.z < P.z + 0.5 && Math.abs(b.x - P.x) < w) G.bullets.kill(b);
        for (let z = P.z; z > -ARENA_R - 2; z -= 0.8) G.fx.emit({ x: P.x + (Math.random() - 0.5) * w, y: 0.8 + Math.random(), z, life: 0.6, s0: 2.2, s1: 0, color: 0xfff1c9, tex: 'spark', vy: 1.5 });
        ui.flash('#fff1c9', 500, 0.6); G.world.shake(0.7, 0.4); sfx.play('ult'); say();
        return true;
      }
      default: return false;
    }
  }

  update(dt) {
    const G = this.G;
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; t.t -= dt; if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); } }
    for (let i = this.wells.length - 1; i >= 0; i--) {
      const w = this.wells[i]; w.t -= dt; w.tick -= dt;
      for (const b of G.bullets.list) {
        if (!b.active || b.owner !== 'boss') continue;
        const dx = w.x - b.x, dz = w.z - b.z, d = Math.hypot(dx, dz);
        if (d < 0.8) { G.fx.puff(b.x, 0.9, b.z, 0xffe36b, 1); G.bullets.kill(b); }
        else if (d < 6) { const k = (14 / d) * dt; b.vx += dx * k; b.vz += dz * k; }
      }
      if (w.tick <= 0) { w.tick = 0.2; for (const e of this.enemies()) if ((e.x - w.x) ** 2 + (e.z - w.z) ** 2 < 6.25) G.hitEnemy(e, 3 * G.player.st.dmg, e.x, e.z); }
      if (Math.random() < dt * 20) G.fx.emit({ x: w.x + (Math.random() - 0.5) * 5, y: 0.6, z: w.z + (Math.random() - 0.5) * 5, life: 0.4, s0: 0.5, s1: 0, color: 0xffe36b, tex: 'spark' });
      if (Math.random() < dt * 6) G.fx.ring(w.x, 0.4, w.z, 0xffe36b, 4.5, 0.5);
      if (w.t <= 0) this.wells.splice(i, 1);
    }
  }
}
export { FWD };
