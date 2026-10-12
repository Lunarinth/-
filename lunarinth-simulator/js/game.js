// 게임 본체: 상태 머신(메뉴 → 인트로 → 전투 → 페이즈 전환 → 승리/패배), 충돌, 연출, 메인 루프.
import { World } from './scene.js';
import { Bullets, Particles, Zones, Beams, Flyers } from './entities.js';
import { Player, PLAYER } from './player.js';
import { Boss, BOSS_MAX_HP, PAL } from './boss.js';
import { PHASES, SCRIPT, BARKS } from './lore.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { AudioEngine } from './audio/engine.js';
import { Sfx } from './audio/sfx.js';
import { MusicDirector } from './audio/music.js';
import { makeTextures, makePlayerTextures, loadImage } from './art.js';
import * as THREE from '../vendor/three.module.min.js';

const SETTINGS_KEY = 'lunarinth.settings.v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Settings {
  constructor() {
    this.auto = true; this.shake = true; this.calm = false;
    try { Object.assign(this, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* noop */ }
  }
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ auto: this.auto, shake: this.shake, calm: this.calm })); } catch (e) { /* noop */ } }
}

export class Game {
  constructor() {
    this.state = 'loading';
    this.timeScale = 1; this.hitstopT = 0;
    this.veil = false; this.veilV = 0; this.madnessT = 0;
    this.t = 0; this.fightT = 0;
    this.checkpoint = 0; this.reached = 0;
    this.stats = { hits: 0, graze: 0, damage: 0, attacks: 0, parries: 0 };
    this.paused = false;
    this._lastTs = 0;
  }

  async init() {
    const canvas = document.getElementById('gl');
    this.settings = new Settings();
    this.engine = new AudioEngine();
    this.sfx = new Sfx(this.engine);
    this.music = new MusicDirector(this.engine);
    this.audio = { E: this.engine, sfx: this.sfx, music: this.music, pan: (x) => Math.max(-1, Math.min(1, x / 12)) };
    this.ui = new UI({ audio: this.engine, sfx: this.sfx, settings: this.settings });
    this.input = new Input(canvas);

    this.T = makeTextures();
    this.world = new World(canvas, this.T);
    this.world.shakeOn = this.settings.shake;
    const scene = this.world.scene;

    // 보스 스프라이트 로딩 (+ 대사 초상화용 이미지)
    const img = await loadImage('assets/lunarinth.png');
    const bossTex = new THREE.Texture(img); bossTex.colorSpace = THREE.SRGBColorSpace; bossTex.needsUpdate = true;
    bossTex.anisotropy = 4;

    this.bullets = new Bullets(scene, this.T);
    this.fx = new Particles(scene, this.T);
    this.zones = new Zones(scene, this.T);
    this.beams = new Beams(scene, this.T);
    this.flyers = new Flyers(scene, this.T);

    const pt = makePlayerTextures();
    this.player = new Player(scene, this.T, pt.frames);
    // 성검사 클레르 (assets/claire.png). 실패하면 직접 그린 임시 스프라이트를 쓴다.
    let claireImg = null;
    try {
      claireImg = await loadImage('assets/claire.png');
      const t = new THREE.Texture(claireImg); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = 4;
      this.player.setSprite([t, t], claireImg.width / claireImg.height, 2.9);
    } catch (e) { /* 임시 스프라이트 유지 */ }

    this.boss = new Boss(scene, this.T, bossTex, img.width / img.height, this);

    // 초상화: 루나린스는 일러스트의 얼굴 부분, 클레르는 그려둔 흉상
    this.ui.setPortraits({
      luna: { kind: 'img', img, sx: img.width * 0.2, sy: img.height * 0.02, sw: img.width * 0.55, sh: img.width * 0.55 },
      claire: claireImg ? { kind: 'img', img: claireImg, sx: claireImg.width * 0.2, sy: claireImg.height * 0.1, sw: claireImg.width * 0.6, sh: claireImg.width * 0.6 } : { kind: 'canvas', canvas: pt.portrait.image },
    });

    this._wireUI();
    this.input.onAny = () => { this.engine.init(); };

    this.ui.setHearts(PLAYER.maxHp, PLAYER.maxHp);
    this.ui.setBossInstant(1);
    this.toMenu(true);
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading').remove(), 1200);
    requestAnimationFrame((ts) => this._frame(ts));
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'fight' && !this.paused) this.setPause(true); });
    // 디버그/테스트 훅
    window.__lunarinth = this;
  }

  _wireUI() {
    const ui = this.ui;
    ui.on.start = () => { this.engine.init(); this.sfx.play('ui_start'); this.startRun(true); };
    ui.on.retry = () => { ui.hideResult(); this.startRun(false, this.checkpoint); };
    ui.on.toMenu = () => this.toMenu();
    ui.on.resume = () => this.setPause(false);
    const restart = document.getElementById('btn-restart');
    restart.onclick = () => { ui.hideResult(); this.startRun(false, 0); };
  }

  // ───── 화면 전환 ─────
  toMenu(first = false) {
    this.state = 'menu'; this.paused = false;
    this.ui.closeModals(); this.ui.hideResult(); this.ui.showHud(false); this.ui.hideBark();
    this.ui.setTheme('lumina'); this.world.setTheme('lumina'); this.world.setDolly(0);
    this.ui.showMenu(true); this.ui.setVeil(0); this.ui.madness(false); this.veil = false;
    this.clearField(); this.boss.reset(0); this.boss.vulnerable = false; this.player.reset();
    this.ui.setHearts(this.player.hp, this.player.max); this.ui.setBossInstant(1); this.ui.setBoss(1, 0);
    if (this.engine.ready) this.music.play('menu', { fade: first ? 3 : 1.6, immediate: true });
    else {
      // 첫 입력 후 오디오가 켜지면 메뉴 음악 시작
      const prev = this.input.onAny;
      this.input.onAny = (e) => { this.engine.init(); if (this.state === 'menu') this.music.play('menu', { fade: 3, immediate: true }); this.input.onAny = prev; void e; };
    }
  }

  clearField() {
    this.bullets.clearAll(); this.zones.clear(); this.beams.clear(); this.flyers.clear();
    this.boss.cancelAttack();
  }

  resetStats() { this.stats = { hits: 0, graze: 0, damage: 0, attacks: 0, parries: 0 }; this.fightT = 0; }

  async startRun(withIntro, fromPhase = 0) {
    this.state = 'cutscene';
    this.engine.init();
    this.ui.showMenu(false); this.ui.closeModals(); this.ui.hideResult();
    this.clearField(); this.resetStats();
    this.player.reset(); this.boss.reset(fromPhase);
    this.boss.vulnerable = false; this.reached = fromPhase;
    this.ui.setHearts(this.player.hp, this.player.max); this.ui.setGraze(0);
    const ph = PHASES[fromPhase];
    this.ui.setTheme(ph.id); this.world.setTheme(ph.id); this.ui.setBossInstant(this.boss.hp / BOSS_MAX_HP); this.ui.setBoss(this.boss.hp / BOSS_MAX_HP, fromPhase);
    this.world.setDolly(withIntro ? 0.5 : 0);
    this.ui.showHud(true);
    this.music.setIntensity(0);
    this.music.play(withIntro ? 'menu' : ph.music, { fade: 1.5, immediate: true });
    if (withIntro) {
      this.duckMusic(0.55);
      await this.ui.playDialogue(SCRIPT.intro, { onLine: (ln) => this.lineSfx(ln) });
      this.duckMusic(1);
    }
    await this.beginPhaseFight(fromPhase, withIntro);
  }

  lineSfx(ln) {
    if (!ln.sfx) return;
    if (ln.sfx === 'laugh_soft') this.sfx.play('laugh', { vol: 0.55, pitch: 1.05 });
    else this.sfx.play(ln.sfx);
    this.fx.ring(this.boss.x, this.boss.bobY || 4, this.boss.z, this.boss.pal.glow, 6, 0.5);
  }

  duckMusic(v) { if (this.engine.ready) this.engine.musicDuck.gain.setTargetAtTime(v, this.engine.ctx.currentTime, 0.15); }

  /** 페이즈 전투 시작: 배너 + 음악 + 잠깐의 준비 시간 */
  async beginPhaseFight(i, first) {
    const ph = PHASES[i];
    this.state = 'banner';
    this.ui.setTheme(ph.id); this.world.setTheme(ph.id);
    this.music.play(ph.music, { fade: first ? 2.2 : 0.6, immediate: true });
    this.world.setDolly(0);
    this.boss.phase = i; this.boss.applyPhaseStats();
    this.ui.setBoss(this.boss.hp / BOSS_MAX_HP, i);
    this.sfx.play('phase_flash');
    this.ui.banner(ph.form, ph.title, 3000);
    await sleep(1700);
    this.boss.vulnerable = true; this.boss.alive = true;
    this.boss.idleT = 0.9;
    this.state = 'fight';
    this.reached = Math.max(this.reached, i); this.checkpoint = this.reached;
  }

  // ───── 페이즈 전환 ─────
  async beginPhaseChange(next) {
    if (this.state !== 'fight') return;
    this.state = 'transition';
    const B = this.boss;
    B.cancelAttack(); B.vulnerable = false;
    this.bullets.clearBoss(this.fx); this.zones.clear(); this.beams.clear(); this.flyers.clear();
    this.setVeil(false); this.madnessT = 0; this.ui.madness(false); this.player.invertT = 0;
    // 1) 경직 + 슬로모션 + 섬광
    this.ui.flash('#ffffff', 900, 0.9); this.world.shake(1.0, 0.8); this.world.beat(1.2);
    this.sfx.play('phase_flash'); this.sfx.play('boss_down', { vol: 0.5 });
    this.fx.burst(B.x, B.bobY, B.z, 60, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 10, size: 1.1, life: 1.2, up: 1.5 });
    this.fx.ring(B.x, B.bobY, B.z, 0xffffff, 18, 0.9);
    this.timeScale = 0.2; this.world.kickFov(-4);
    await sleep(900);
    this.timeScale = 1;
    // 2) 대사
    this.world.setDolly(0.7); this.duckMusic(0.35);
    const script = next === 1 ? SCRIPT.p1to2 : SCRIPT.p2to3;
    await this.ui.playDialogue(script, { onLine: (ln) => this.lineSfx(ln) });
    this.duckMusic(1);
    // 3) 변신: 라이저 → 임팩트 + 테마 전환
    this.state = 'transform';
    const dur = 2.6;
    this.music.riser(dur);
    this.world.setDolly(1);
    const nextPh = PHASES[next];
    this.ui.setTheme(nextPh.id); this.world.setTheme(nextPh.id);
    for (let i = 0; i < 12; i++) {
      this.fx.burst(B.x, B.bobY, B.z, 10, { color: [0xffffff, PAL[nextPh.id].glow], speed: 6, size: 0.8, life: 0.9, up: 1.2 });
      this.world.shake(0.1 + i * 0.03, 0.25);
      await sleep(dur * 1000 / 12);
    }
    B.setPhase(next); B.scaleT = next === 2 ? 1.32 : 1;
    this.music.boom(); this.ui.flash('#ffffff', 1100, 1.0); this.world.shake(1.2, 0.9); this.world.beat(1.5);
    this.sfx.play('phase_flash');
    this.fx.ring(B.x, B.bobY, B.z, PAL[nextPh.id].glow, 22, 1.0);
    this.music.setIntensity(0);
    await this.beginPhaseFight(next, false);
    // 오프닝 일격: 형태가 바뀌었음을 알리는 큰 효과
    if (next === 2) { this.sfx.play('laugh_big', { vol: 0.9 }); }
  }

  onEnrage() {
    this.ui.warn('루나틱 오버드라이브', 1800);
    this.music.setIntensity(1); this.world.beat(1.5); this.ui.flash('#ff7ac8', 600, 0.45);
    this.sfx.play('laugh_big', { vol: 0.85 }); this.world.shake(0.7, 0.6);
    this.boss.bark('low');
  }

  // ───── 승리 / 패배 ─────
  async beginVictory() {
    if (this.state === 'victory') return;
    this.state = 'victory';
    const B = this.boss; B.cancelAttack(); B.vulnerable = false;
    this.bullets.clearBoss(this.fx); this.zones.clear(); this.beams.clear(); this.flyers.clear();
    this.setVeil(false); this.ui.madness(false); this.player.invertT = 0; this.madnessT = 0;
    this.ui.setBoss(0);
    this.sfx.play('boss_down'); this.ui.flash('#ffffff', 1400, 1); this.world.shake(1.4, 1.2);
    this.music.stop(1.2);
    this.timeScale = 0.25; this.world.setDolly(0.6);
    for (let i = 0; i < 16; i++) {
      this.fx.burst(B.x + (Math.random() - 0.5) * 3, B.bobY + (Math.random() - 0.5) * 3, B.z, 14, { color: [0xffffff, 0xfff1c9, 0xd9c8ff, 0xff7ac8], speed: 8, size: 1.0, life: 1.4, up: 1.4 });
      await sleep(130);
    }
    this.timeScale = 1;
    B.scaleT = 1; this.world.setTheme('lumina'); this.ui.setTheme('lumina');
    await sleep(700);
    this.music.play('victory', { fade: 2.5, immediate: true });
    this.sfx.play('victory');
    this.duckMusic(0.6);
    await this.ui.playDialogue(SCRIPT.victory, { onLine: (ln) => this.lineSfx(ln) });
    this.duckMusic(1);
    const t = Math.round(this.fightT);
    this.ui.showResult(true, [['클리어 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`], ['피격', this.stats.hits], ['그레이즈', this.stats.graze], ['패링 성공', this.stats.parries], ['준 피해', Math.round(this.stats.damage)]]);
    document.getElementById('btn-restart').hidden = true;
    this.state = 'result';
  }

  async onPlayerDown() {
    if (this.state !== 'fight') { return; }
    this.state = 'defeat';
    const B = this.boss; B.cancelAttack(); B.vulnerable = false;
    this.timeScale = 0.2; this.world.shake(0.9, 0.8); this.music.stop(1.0);
    this.sfx.play('defeat'); this.ui.setVeil(0); this.ui.madness(false);
    this.fx.burst(this.player.x, 1, this.player.z, 40, { color: [0xffffff, 0xffd36b, 0xff7aa8], speed: 8, size: 0.9, life: 1.2 });
    await sleep(1100);
    this.timeScale = 1;
    this.bullets.clearBoss(this.fx); this.zones.clear(); this.beams.clear(); this.flyers.clear();
    this.music.play('defeat', { fade: 2, immediate: true });
    this.duckMusic(0.6);
    await this.ui.playDialogue(SCRIPT.defeat, { onLine: (ln) => this.lineSfx(ln) });
    this.duckMusic(1);
    const t = Math.round(this.fightT);
    this.ui.showResult(false, [['도달한 형태', PHASES[this.boss.phase].form], ['보스 체력', Math.round((this.boss.hp / BOSS_MAX_HP) * 100) + '%'], ['버틴 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`], ['그레이즈', this.stats.graze]]);
    document.getElementById('btn-restart').hidden = this.checkpoint === 0;
    this.state = 'result';
  }

  // ───── 보조 ─────
  setVeil(on) { this.veil = on; }
  setMadness(sec) { this.madnessT = sec; this.ui.madness(true); }
  hitstop(sec) { this.hitstopT = Math.max(this.hitstopT, sec); }
  setPause(p) {
    if (p === this.paused) return;
    if (p && this.state !== 'fight') return;
    this.paused = p; this.ui.showPause(p);
    this.sfx.play(p ? 'pause' : 'unpause');
    if (p) this.engine.suspend(); else this.engine.resume();
    if (!p) this.ui.modal('#m-settings', false);
  }

  // ───── 충돌 ─────
  collide(dt) {
    const P = this.player, B = this.boss, bl = this.bullets.list;
    const parrying = P.parryT > 0 && !P.parryHit;
    let parried = 0;
    for (const b of bl) {
      if (!b.active || b.delay > 0) continue;
      if (b.owner === 'player') {
        // 플레이어 탄 → 가짜 / 보스
        let used = false;
        for (const d of B.decoys) {
          if (!d.active) continue;
          if ((b.x - d.x) ** 2 + (b.z - d.z) ** 2 < (1.7 + b.hr) ** 2) {
            d.hp -= b.dmg; this.fx.burst(b.x, 1.6, b.z, 2, { color: 0x9bb8ff, speed: 3, size: 0.4, life: 0.3 });
            this.sfx.play('hit_boss', { pan: this.audio.pan(d.x), pitch: 0.7, vol: 0.6 });
            if (d.hp <= 0) B.killDecoy(d, true);
            this.bullets.kill(b); used = true; break;
          }
        }
        if (used) continue;
        if (B.alive && B.visible && (b.x - B.x) ** 2 + (b.z - B.z) ** 2 < (B.hitR * B.scaleK + b.hr) ** 2) {
          B.damage(b.dmg, this, b.x, b.z);
          this.bullets.kill(b);
        }
        continue;
      }
      // 보스 탄 → 플레이어
      const dx = b.x - P.x, dz = b.z - P.z, d2 = dx * dx + dz * dz;
      if (parrying && d2 < PLAYER.parryR * PLAYER.parryR) {
        // 반사: 보스 방향으로
        const a = Math.atan2(B.z - b.z, B.x - b.x);
        b.owner = 'player'; b.reflected = true; b.dmg = 38; b.hr = Math.max(b.hr, 0.6); b.size = Math.max(b.size, 1.5);
        b.vx = Math.cos(a) * 19; b.vz = Math.sin(a) * 19; b.homing = 0; b.accel = 0; b.turn = 0; b.trail = false; b.life = 2;
        b.mat.color.setHex(0xffe08a); b.age = 1;
        parried++; continue;
      }
      const hr = b.hr + PLAYER.hr;
      if (d2 < hr * hr) {
        if (P.hurt(this, b.dmg)) this.bullets.kill(b);
        continue;
      }
      // 그레이즈
      if (!b.grazed && d2 < (hr + 0.7) ** 2 && !P.safe) {
        b.grazed = true; this.stats.graze++; P.grazeAcc++;
        this.ui.setGraze(this.stats.graze);
        this.sfx.play('graze', { pan: this.audio.pan(P.x) });
        this.fx.emit({ x: b.x, y: 1.0, z: b.z, life: 0.25, s0: 0.6, s1: 0, color: 0xffffff, tex: 'spark' });
        if (P.grazeAcc >= 50) { P.grazeAcc = 0; P.heal(this); }
      }
    }
    if (parried) {
      P.parryHit = true; P.parryCd = PLAYER.parryCdHit; this.stats.parries++;
      this.sfx.play('parry_ok', { pan: this.audio.pan(P.x) });
      this.hitstop(0.08); this.world.shake(0.4, 0.25); this.ui.flash('#ffe9a6', 300, 0.35);
      this.fx.burst(P.x, 1, P.z, 22, { color: [0xffffff, 0xffd36b], speed: 8, size: 0.8, life: 0.7 });
      this.fx.ring(P.x, 0.9, P.z, 0xffffff, 9, 0.4);
      if (Math.random() < 0.5) B.bark('parry');
    }
    // 바닥 공격
    const zh = this.zones.update(dt, P.x, P.z, PLAYER.hr, this.fx, this.audio, this.world);
    const bh = this.beams.update(dt, P.x, P.z, PLAYER.hr, this.fx, this.audio, this.world);
    if (zh || bh) P.hurt(this, Math.max(zh, bh));
  }

  // ───── 메인 루프 ─────
  _frame(ts) {
    requestAnimationFrame((t) => this._frame(t));
    const rawDt = Math.min(0.05, (ts - (this._lastTs || ts)) / 1000);
    this._lastTs = ts;
    this.t += rawDt;

    if (this.hitstopT > 0) { this.hitstopT -= rawDt; this._render(rawDt, 0); return; }

    const input = this.input;
    if (input.take('pause')) {
      if (this.ui.anyModalOpen() && !document.getElementById('m-pause').hidden) { /* 모달 닫기 */ this.ui.modal('#m-settings', false); }
      else if (this.state === 'fight') this.setPause(!this.paused);
      else if (this.state === 'menu') this.ui.closeModals();
    }
    if (this.paused) { this._render(rawDt, 0); input.endFrame(); return; }

    const dt = rawDt * this.timeScale;
    const active = this.state === 'fight' || this.state === 'transition' || this.state === 'banner' || this.state === 'victory' || this.state === 'defeat' || this.state === 'transform' || this.state === 'cutscene';
    if (active) this.simulate(dt, rawDt);
    this._render(rawDt, dt);
    input.endFrame();
  }

  simulate(dt, rawDt) {
    const P = this.player, B = this.boss, fighting = this.state === 'fight';
    // 플레이어는 전투 중 + 배너 중에는 움직일 수 있다 (준비 시간)
    const canControl = fighting || this.state === 'banner';
    if (canControl) {
      P.update(dt, this.input, this);
    }
    if (fighting) {
      this.fightT += rawDt;
      B.update(dt);
    } else if (this.state !== 'cutscene') {
      B.update(dt); // 전환 중에도 이동/분신 처리
    }
    this.bullets.update(dt, P.x, P.z, this.fx);
    if (fighting || this.state === 'banner') this.collide(dt);
    this.flyers.update(dt, this.fx);
    this.fx.update(dt);

    // 광기 / 장막 타이머
    if (this.madnessT > 0) { this.madnessT -= dt; if (this.madnessT <= 0) this.ui.madness(false); }
    this.veilV += ((this.veil ? 1 : 0) - this.veilV) * (1 - Math.exp(-dt * 2.4));

    // 앰비언트 입자
    if (Math.random() < dt * 14) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 11;
      this.fx.emit({ x: Math.cos(a) * r, y: 0.2, z: Math.sin(a) * r, vy: 0.6 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 0.3, life: 3.2, s0: 0.25 + Math.random() * 0.25, s1: 0.0, color: B.pal.b, tex: 'crescent', op: 0.55, spin: 0.6 });
    }

    // HUD
    if (fighting) { this.ui.setTime(this.fightT); }
  }

  _render(rawDt, dt) {
    const P = this.player, B = this.boss;
    this.world.update(rawDt, P.x);
    P.render(rawDt, this.t);
    const showP = this.state !== 'menu'; P.spr.visible = P.shadow.visible = P.core.visible = showP;
    B.render(rawDt, this.t);
    // 말풍선 / 장막 위치
    if (!this.ui.el.bubble.hidden) { const [sx, sy] = this.world.project(B.x, B.bobY + 4.4 * B.scaleK, B.z); this.ui.moveBark(sx, sy); }
    this.ui.setVeil(this.veilV * 0.98, ...this.world.project(P.x, 1.0, P.z));
    this.world.render();
    void dt;
  }
}
