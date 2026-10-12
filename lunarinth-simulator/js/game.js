// 게임 본체: 타이틀 → 난이도/캐릭터 선택 → 스테이지(보스 대사 → 단계 반복 → 클리어) → 엔딩/컨티뉴/게임오버.
// 동방식 구조: 보스는 "단계(통상/스킬/라스트)"로 진행되고, 스킬 발동 시 이름이 선언된다.
import { World } from './scene.js';
import { Bullets, Particles, Zones, Beams, Flyers } from './entities.js';
import { Player, PLAYER } from './player.js';
import { Opsir } from './bosses/opsir.js';
import { Bellis } from './bosses/bellis.js';
import { Lunarinth, PAL } from './bosses/lunarinth.js';
import { Mobs } from './mobs.js';
import { makeStageScript } from './stages.js';
import { STAGES, DIFFS, CHARS, SCRIPT, ENDINGS, PLAYER_ULT } from './lore.js';

const EXTRA_KEY = 'lunarinth.extra.v1';
import { UI } from './ui.js';
import { Input } from './input.js';
import { AudioEngine } from './audio/engine.js';
import { Sfx } from './audio/sfx.js';
import { MusicDirector } from './audio/music.js';
import { makeTextures, makePlayerTextures, loadImage } from './art.js';
import * as THREE from '../vendor/three.module.min.js';

const SETTINGS_KEY = 'lunarinth.settings.v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SPELL_NAME = (st) => `${st.tag ? st.tag + ' ' : ''}「${st.name}」`;
const CONTINUES = 3; // 기본 컨티뉴 횟수

const BOSS_ASSETS = {
  opsir: { cls: Opsir, img: 'assets/opsir.png' },
  bellis: { cls: Bellis, img: 'assets/bellis.png' },
  lunarinth: { cls: Lunarinth, img: 'assets/lunarinth.png' },
};
// 대사창 초상화 크롭 (이미지 대비 비율)
const FACE = {
  luna: { sx: 0.2, sy: 0.02, sw: 0.55 },
  opsir: { sx: 0.34, sy: 0.04, sw: 0.5 },
  bellis: { sx: 0.18, sy: 0.0, sw: 0.62 },
  claire: { sx: 0.2, sy: 0.1, sw: 0.6 },
};

class Settings {
  constructor() {
    this.shake = true; this.calm = false;
    try { Object.assign(this, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* noop */ }
  }
  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ shake: this.shake, calm: this.calm })); } catch (e) { /* noop */ } }
}

export class Game {
  constructor() {
    this.state = 'loading';
    this.timeScale = 1; this.hitstopT = 0;
    this.veil = false; this.veilV = 0; this.madnessT = 0;
    this.t = 0; this.fightT = 0;
    this.paused = false; this.ultBusy = false; this.sealed = false; this.veilLv = 0.98; this._ultDying = false;
    this.stageRoutine = null; this._stageWait = 0; this._stageAcc = 0; this._stageDone = null; this.downFrom = 'fight';
    this._lastTs = 0; this._token = 0;
    this.run = this.makeRun(DIFFS[1], CHARS[0]);
    this.stats = this.newStats();
  }

  newStats() { return { hits: 0, graze: 0, damage: 0, attacks: 0, ults: 0, spellsSeen: 0, spellsCaptured: 0, mobs: 0, ultDeaths: 0, ultSurvived: 0 }; }
  makeRun(diff, char) {
    return { diff, char, stageIdx: 0, continues: 0, continuesMax: CONTINUES, stepHit: false, stepUlt: false, practice: null };
  }

  async init() {
    const canvas = document.getElementById('gl');
    this.settings = new Settings();
    this.engine = new AudioEngine();
    this.sfx = new Sfx(this.engine);
    this.music = new MusicDirector(this.engine);
    this.audio = { E: this.engine, sfx: this.sfx, music: this.music, pan: (x) => Math.max(-1, Math.min(1, x / 12)) };
    this.ui = new UI({ audio: this.engine, sfx: this.sfx, settings: this.settings });
    this.input = new Input();
    this.input.block = () => !this.ui.el.dialog.hidden || this.state === 'menu';

    this.T = makeTextures();
    this.world = new World(canvas, this.T);
    this.world.shakeOn = this.settings.shake;
    const scene = this.world.scene;

    this.bullets = new Bullets(scene, this.T);
    this.fx = new Particles(scene, this.T);
    this.zones = new Zones(scene, this.T);
    this.beams = new Beams(scene, this.T);
    this.flyers = new Flyers(scene, this.T);
    this.mobs = new Mobs(scene, this.T, this);

    const pt = makePlayerTextures();
    this.player = new Player(scene, this.T, pt.frames);
    // 성검사 클레르 (assets/claire.png). 실패하면 직접 그린 임시 스프라이트를 쓴다.
    let claireImg = null;
    try {
      claireImg = await loadImage('assets/claire.png');
      const t = new THREE.Texture(claireImg); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = 4;
      this.player.setSprite([t, t], claireImg.width / claireImg.height, 2.9);
    } catch (e) { /* 임시 스프라이트 유지 */ }

    // 보스 3인 (스프라이트는 전부 미리 만들어 두고 스테이지마다 하나만 보인다)
    this.bosses = {}; const imgs = { claire: claireImg };
    for (const [id, a] of Object.entries(BOSS_ASSETS)) {
      const img = await loadImage(a.img);
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; tex.anisotropy = 4;
      this.bosses[id] = new a.cls(scene, this.T, tex, img.width / img.height, this);
      imgs[id] = img;
    }
    this.boss = this.bosses.opsir;

    // 초상화 (대사창 / 스킬 컷인)
    const portraits = {};
    for (const [who, key] of [['luna', 'lunarinth'], ['opsir', 'opsir'], ['bellis', 'bellis'], ['claire', 'claire']]) {
      const img = imgs[key]; if (!img) continue;
      const f = FACE[who];
      portraits[who] = { kind: 'img', img, sx: img.width * f.sx, sy: img.height * f.sy, sw: img.width * f.sw, sh: img.width * f.sw };
    }
    if (!portraits.claire) portraits.claire = { kind: 'canvas', canvas: pt.portrait.image };
    this.ui.setPortraits(portraits);

    this._wireUI();
    this.input.onAny = () => { this.engine.init(); };

    this.toMenu(true);
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading').remove(), 1200);
    requestAnimationFrame((ts) => this._frame(ts));
    document.addEventListener('visibilitychange', () => { if (document.hidden && (this.state === 'fight' || this.state === 'stage') && !this.paused) this.setPause(true); });
    window.__lunarinth = this; // 디버그/테스트 훅
  }

  _wireUI() {
    const ui = this.ui;
    ui.on.start = (diff, char) => { this.engine.init(); this.sfx.play('ui_start'); this.startRun(diff, char); };
    ui.on.retry = () => {
      ui.hideResult();
      const pr = this.run.practice;
      if (pr) this.startPractice(this.run.diff, this.run.char, pr.bossId, pr.stepIdx);
      else this.startRun(this.run.diff, this.run.char);
    };
    ui.on.practice = (diff, char, bossId, stepIdx) => { this.engine.init(); this.sfx.play('ui_start'); this.startPractice(diff, char, bossId, stepIdx); };
    ui.on.unlockExtra = () => { this.unlockExtra(); this.sfx.play('heal'); this.ui.warn('EXTRA 개방 — (미구현 · 준비 중)', 2600); };
    ui.on.toMenu = () => this.toMenu();
    ui.on.resume = () => this.setPause(false);
    ui.on.continueYes = () => this.doContinue();
    ui.on.continueNo = () => this.gameOver();
  }

  // ───── 화면 전환 ─────
  toMenu(first = false) {
    this._token++; if (this._stageDone) { this._stageDone(); this._stageDone = null; }
    this.state = 'menu'; this.paused = false; this.timeScale = 1; this.ultBusy = false; this.sealed = false; this._ultDying = false; this.stageRoutine = null;
    this.ui.setSealed(false); this.world.setFall(null); this.veilLv = 0.98;
    this.ui.closeModals(); this.ui.hideResult(); this.ui.showHud(false); this.ui.hideBark(); this.ui.hideEnding(); this.ui.hideDeclare();
    this.ui.setTheme('lumina'); this.world.setTheme('lumina'); this.world.setDolly(0);
    this.ui.showMenu(true); this.ui.setVeil(0); this.ui.madness(false); this.veil = false; this.madnessT = 0;
    this.clearField();
    for (const b of Object.values(this.bosses)) { b.reset(); b.visible = false; b.alpha = 0; }
    this.player.reset(this.run.diff.php); this.player.invertT = 0; this.ui.showBossUI(true);
    if (this.engine.ready) this.music.play('menu', { fade: first ? 3 : 1.6, immediate: true });
    else {
      // 첫 입력 후 오디오가 켜지면 메뉴 음악 시작
      const prev = this.input.onAny;
      this.input.onAny = (e) => { this.engine.init(); if (this.state === 'menu') this.music.play('menu', { fade: 3, immediate: true }); this.input.onAny = prev; void e; };
    }
  }

  clearField() {
    this.bullets.clearAll(); this.zones.clear(); this.beams.clear(); this.flyers.clear(); this.mobs.clear();
    for (const b of Object.values(this.bosses || {})) b.cancelAttack();
    this.player.ultBeam.visible = false;
  }
  clearBossField() { this.bullets.clearBoss(this.fx); this.zones.clear(); this.beams.clear(); this.flyers.clear(); }

  duckMusic(v) { if (this.engine.ready) this.engine.musicDuck.gain.setTargetAtTime(v, this.engine.ctx.currentTime, 0.15); }
  lineSfx(ln) {
    if (ln.sfx) { if (ln.sfx === 'laugh_soft') this.sfx.play('laugh', { vol: 0.55, pitch: 1.05 }); else this.sfx.play(ln.sfx); }
    if (ln.who === 'luna' && this.boss.visible) this.fx.ring(this.boss.x, this.boss.bobY || 4, this.boss.z, this.boss.pal.glow, 6, 0.5);
  }
  async talk(lines) {
    if (!lines || !lines.length) return;
    this.duckMusic(0.55);
    await this.ui.playDialogue(lines, { onLine: (ln) => this.lineSfx(ln) });
    this.duckMusic(1);
  }

  // ───── 런 / 스테이지 ─────
  async startRun(diff, char) {
    this._token++;
    const my = this._token;
    this.run = this.makeRun(diff, char);
    this.stats = this.newStats(); this.fightT = 0; this.sealed = false; this.ui.setSealed(false);
    this.ui.showMenu(false); this.ui.closeModals(); this.ui.hideResult(); this.ui.hideEnding();
    this.player.reset(diff.php); this.player.x = 0; this.player.z = 6.2;
    this.ui.setHp(this.player.hp, this.player.maxHp); this.ui.setUlt(this.player.ults);
    this.ui.setContinues(0, CONTINUES); this.ui.setDiff(diff);
    // 프롤로그: 저택의 분열
    this.state = 'cutscene'; this.clearField(); this.ui.showHud(false);
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.world.setTheme('lumina'); this.ui.setTheme('lumina'); this.world.setDolly(0.4);
    this.music.play('ending', { fade: 1.5, immediate: true });
    await this.talk(SCRIPT.prologue); if (my !== this._token) return;
    await this.playStage(0);
  }

  // ───── 프랙티스: 스테이지/단계를 골라 연습 (전부 기본 개방) ─────
  async startPractice(diff, char, bossId, stepIdx) {
    this._token++;
    const my = this._token;
    this.run = this.makeRun(diff, char); this.run.practice = { bossId, stepIdx };
    this.stats = this.newStats(); this.fightT = 0; this.sealed = false; this.ui.setSealed(false); this.ui.setDiff(diff);
    const idx = STAGES.findIndex((s) => s.id === bossId); this.run.stageIdx = idx;
    const st = STAGES[idx], B = this.bosses[bossId], def = B.def;
    this.ui.showMenu(false); this.ui.closeModals(); this.ui.hideResult(); this.ui.hideEnding(); this.ui.hideContinue();
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.boss = B; B.reset(); this.clearField(); this.timeScale = 1; this.world.setFall(null); this.veilLv = 0.98; this.paused = false; this.ui.showPause(false);
    const P = this.player; P.reset(diff.php); P.inv = 1.2;
    this.ui.setHp(P.hp, P.maxHp); this.ui.setUlt(P.ults); this.ui.setContinues(0, CONTINUES); this.ui.setStage(`PRACTICE · ${st.label}`);
    this.ui.showHud(true); this.ui.hideBark(); this.ui.setAnalysis(null);
    this.world.setDolly(0); this.music.setIntensity(0);
    if (stepIdx < 0) {
      // 병사 웨이브만 연습
      this.ui.showBossUI(false);
      const f0 = def.forms[def.steps[0].form]; this.world.setTheme(f0.theme || def.theme); this.ui.setTheme(f0.theme || def.theme);
      this.music.play(st.stageMusic, { fade: 1.0, immediate: true });
      this.ui.banner('PRACTICE', `${st.mobName}`, 1800); await sleep(1400); if (my !== this._token) return;
      await this.runWaves(st); if (my !== this._token) return;
      await this.practiceEnd('clear'); return;
    }
    const step = def.steps[stepIdx], f = def.forms[step.form];
    B.appear(); this.ui.setBossHeader(def); this.ui.setBossStep(B, stepIdx); this.ui.setBossInstant(1); this.ui.showBossUI(true);
    const th = step.theme || f.theme || def.theme; this.world.setTheme(th); this.ui.setTheme(th);
    this.music.play(step.music || f.music || def.music, { fade: 0.8, immediate: true });
    this.state = 'cutscene';
    this.ui.banner('PRACTICE', `${def.name} — ${SPELL_NAME(step)}`, 1800);
    await sleep(1500); if (my !== this._token) return;
    this.state = 'fight';
    B.startStep(stepIdx);
  }

  async practiceEnd(reason) {
    const my = this._token, st = this.run.practice;
    this.state = 'result'; this.sealed = false; this.ui.setSealed(false); this.player.alive = true;
    this.clearBossField(); this.mobs.clear(); this.ui.setVeil(0); this.ui.madness(false);
    this.music.stop(0.8);
    await sleep(900); if (my !== this._token) return;
    this.music.play(reason === 'clear' || reason === 'broken' ? 'victory' : 'ending', { fade: 1.5, immediate: true });
    const B = this.boss, step = st.stepIdx >= 0 ? B.def.steps[st.stepIdx] : null;
    const label = reason === 'broken' ? '격파' : reason === 'timeout' ? (step && step.kind === 'ultimate' ? '버텨냄' : '시간 종료') : reason === 'dead' ? '쓰러짐' : '웨이브 클리어';
    const t = Math.round(this.fightT);
    this.ui.showResult(true, [
      ['대상', step ? `${B.def.name} — ${SPELL_NAME(step)}` : `${B.def.name} 스테이지 — 병사`], ['결과', label], ['난이도', this.run.diff.name],
      ['걸린 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`], ['피격', this.stats.hits], ['그레이즈', this.stats.graze], ['병사 격파', this.stats.mobs],
    ], 'PRACTICE', '다시 연습', '연습 종료');
  }

  /** 진행용 통상 스테이지(병사 웨이브) → 보스 */
  async playStage(idx) {
    const my = ++this._token;
    this.run.stageIdx = idx;
    const st = STAGES[idx], B = this.bosses[st.id], def = B.def;
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.boss = B; B.reset(); // 보스는 웨이브가 끝난 뒤 등장
    this.state = 'cutscene'; this.timeScale = 1; this.sealed = false; this.ui.setSealed(false); this.world.setFall(null); this.veilLv = 0.98;
    this.clearField(); this.ui.showHud(true); this.ui.hideBark(); this.ui.showBossUI(false);
    const P = this.player;
    P.ults = PLAYER.maxUlt; P.inv = 1.5; P.hp = P.maxHp; P.alive = true; P.x = 0; P.z = 6.2;
    this.ui.setUlt(P.ults); this.ui.setHp(P.hp, P.maxHp); this.ui.setStage(st.label);
    const f0 = def.forms[def.steps[0].form], th = f0.theme || def.theme;
    this.world.setTheme(th); this.ui.setTheme(th); this.world.setDolly(0);
    this.music.setIntensity(0);
    this.music.play(st.stageMusic, { fade: 1.6, immediate: true });
    this.ui.banner(st.label, `${st.place} — ${st.mobName}`, 3000);
    await sleep(2200); if (my !== this._token) return;
    // 통상 스테이지: 문양 병사의 웨이브
    await this.runWaves(st); if (my !== this._token) return;
    // 보스 경고 → 등장 → 대사
    this.state = 'cutscene'; this.clearBossField(); this.mobs.clear();
    this.music.stop(0.8); this.sfx.play('declare'); this.ui.flash('#ffffff', 500, 0.4);
    this.ui.banner('WARNING', st.warn.replace('WARNING — ', ''), 2400);
    await sleep(2300); if (my !== this._token) return;
    this.world.setDolly(0.5); B.appear();
    this.ui.setBossHeader(def); this.ui.setBossStep(B, 0); this.ui.setBossInstant(1); this.ui.setBossTimer(null); this.ui.setAnalysis(null); this.ui.showBossUI(true);
    this.music.play(f0.music || def.music, { fade: 1.8, immediate: true });
    this.ui.banner(def.en, `${def.name} — ${def.epithet}`, 3000);
    await sleep(1800); if (my !== this._token) return;
    await this.talk(SCRIPT[st.id].intro); if (my !== this._token) return;
    this.world.setDolly(0);
    this.state = 'fight';
    if (def.hasAnalysis) this.ui.setAnalysis(B.analysis);
    B.startStep(0);
  }

  /** 병사 웨이브 실행: 스크립트가 끝나고 병사가 모두 사라지면 resolve */
  runWaves(st) {
    this.mobs.clear();
    this.stageRoutine = makeStageScript(this, st.id); this._stageWait = 0; this._stageAcc = 0;
    this.state = 'stage';
    return new Promise((res) => { this._stageDone = res; });
  }

  _stepStage(dt) {
    const R = this.stageRoutine;
    if (!R) { if (this.mobs.count() === 0 && this._stageDone) { const d = this._stageDone; this._stageDone = null; d(); } return; }
    this._stageWait -= dt; this._stageAcc += dt;
    let guard = 0;
    while (this._stageWait <= 0 && guard++ < 24) {
      const r = R.next(this._stageAcc); this._stageAcc = 0;
      if (r.done) { this.stageRoutine = null; break; }
      const v = r.value || 0;
      if (v === 0) { this._stageWait = 0; break; }
      this._stageWait += v;
    }
    if (!this.stageRoutine && this.mobs.count() === 0 && this._stageDone) { const d = this._stageDone; this._stageDone = null; d(); }
  }

  // ───── 단계 콜백 (보스가 호출) ─────
  onStepStart(B, step, i, quick) {
    this.run.stepHit = false; this.run.stepUlt = false;
    const form = B.form, def = B.def, ultimate = step.kind === 'ultimate';
    this.ui.setBossStep(B, i); this.ui.setBossInstant(1); this.ui.setBossTimer(step.time);
    const th = step.theme || form.theme || def.theme;
    this.world.setTheme(th); this.ui.setTheme(th);
    this.sealed = ultimate; this.ui.setSealed(ultimate);
    if (ultimate) { this.music.setIntensity(step.intensity ?? 0); this.music.play(step.music || form.music || def.music, { fade: 0.6, immediate: true }); }
    else this.music.play(form.music || def.music, { fade: 1.2, immediate: false });
    if (this.state !== 'cutscene') this.state = 'fight';
    const isSpell = step.kind !== 'nonspell';
    if (isSpell) {
      this.stats.spellsSeen++;
      this.sfx.play(ultimate ? 'ultimate' : 'declare');
      this.ui.declare({ who: def.id === 'lunarinth' ? 'luna' : def.id, kind: step.kind, tag: step.tag, name: step.name, side: 'right' });
      this.world.beat(ultimate ? 1.6 : 1.0); this.world.shake(ultimate ? 0.5 : 0.25, 0.3);
      this.fx.ring(B.x, B.bobY, B.z, B.pal.glow, 14, 0.8);
      this.fx.burst(B.x, B.bobY, B.z, 24, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 9, size: 0.9, life: 0.9, up: 1.4 });
      if (ultimate) { this.ui.flash('#000000', 500, 0.5); if (Math.random() < 0.7) B.barkFor('ultimate'); }
      else B.bark();
    } else {
      this.ui.announce(`통상 「${step.name}」`);
      this.sfx.play('cast');
    }
    void quick;
  }

  async onStepEnd(B, reason, i) {
    const my = this._token;
    if (this.state !== 'fight') return;
    this.state = 'between';
    const step = B.step, isSpell = step.kind !== 'nonspell', ultimate = step.kind === 'ultimate';
    this.clearBossField(); this.setVeil(false); this.ui.madness(false); this.madnessT = 0; this.player.invertT = 0; this.player.sealT = 0;
    this.ui.setBossTimer(null);
    const last = i + 1 >= B.stepCount;
    const nextUlt = B.def.steps[i + 1] && B.def.steps[i + 1].kind === 'ultimate' && !ultimate;
    if (ultimate) {
      // 얼티메이트 스킬: 버텨내거나(timeout) 맞아서 쓰러지면(dead) 다음 식으로 넘어간다
      this._ultDying = false;
      if (reason === 'dead') this.ui.warn(`쓰러졌습니다 — ${step.tag.split(' ')[0]} 종료, 다음 식으로`, 1800);
      else { this.stats.ultSurvived++; this.sfx.play('heal'); this.ui.warn(`버텨냈습니다 — ${step.tag.split(' ')[0]} 돌파`, 1800); this.ui.flash('#fff1c9', 500, 0.35); }
    } else if (reason === 'broken') {
      this.sfx.play('boss_down', { vol: last ? 0.9 : 0.45 });
      this.ui.flash('#ffffff', last ? 900 : 450, last ? 0.9 : 0.55); this.world.shake(last ? 1.2 : 0.7, 0.6);
      this.fx.burst(B.x, B.bobY, B.z, last ? 60 : 36, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 10, size: 1.0, life: 1.1, up: 1.4 });
      this.fx.ring(B.x, B.bobY, B.z, 0xffffff, last ? 20 : 14, 0.8);
      if (isSpell) {
        this.stats.spellsCaptured += (!this.run.stepHit && !this.run.stepUlt) ? 1 : 0;
        this.ui.warn(!this.run.stepHit && !this.run.stepUlt ? '스킬 격파 — 노 미스·노 궁극기' : '스킬 격파', 1700);
      }
    } else {
      this.sfx.play('telegraph');
      this.ui.warn(isSpell ? '스킬 시간 초과' : '통상 시간 초과', 1300);
      this.fx.ring(B.x, B.bobY, B.z, B.pal.glow, 10, 0.6);
    }
    if (!this.player.alive && this.sealed) this.player.revive(this);
    if (this.run.practice) { await this.practiceEnd(reason); return; }
    if (nextUlt) { await this.fakeDefeat(B, i); return; }
    if (last) { this.stageClear(B); return; }
    this.timeScale = 0.3; await sleep(500); this.timeScale = 1; if (my !== this._token) return;
    await sleep(ultimate ? 900 : 500); if (my !== this._token) return;
    const next = B.def.steps[i + 1];
    if (next.pre) await this.stepIntro(B, next);
    if (my !== this._token) return;
    this.state = 'fight';
    B.startStep(i + 1);
  }

  /** 단계 사이 연출: 대사 + (형태가 바뀔 때) 변신 연출 */
  async stepIntro(B, next) {
    const my = this._token, id = B.def.id;
    if (next.transform) {
      this.ui.flash('#ffffff', 900, 0.9); this.world.shake(1.0, 0.8); this.world.beat(1.2);
      this.sfx.play('phase_flash');
      this.fx.burst(B.x, B.bobY, B.z, 50, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 10, size: 1.1, life: 1.2, up: 1.5 });
      this.timeScale = 0.2; this.world.kickFov(-4); await sleep(800); this.timeScale = 1;
      this.world.setDolly(0.7);
    }
    await this.talk(SCRIPT[id][next.pre]); if (my !== this._token) return;
    if (next.transform) {
      const nf = B.def.forms[next.form], dur = 2.6;
      this.music.riser(dur); this.world.setDolly(1);
      this.ui.setTheme(nf.theme); this.world.setTheme(nf.theme);
      for (let k = 0; k < 12; k++) {
        this.fx.burst(B.x, B.bobY, B.z, 10, { color: [0xffffff, nf.pal.glow], speed: 6, size: 0.8, life: 0.9, up: 1.2 });
        this.world.shake(0.1 + k * 0.03, 0.25);
        await sleep((dur * 1000) / 12); if (my !== this._token) return;
      }
      B.scaleT = next.form === 'luna' ? 1.32 : 1;
      this.music.boom(); this.ui.flash('#ffffff', 1100, 1.0); this.world.shake(1.2, 0.9); this.world.beat(1.5);
      this.sfx.play('phase_flash'); this.fx.ring(B.x, B.bobY, B.z, nf.pal.glow, 22, 1.0);
      if (next.form === 'luna') this.sfx.play('laugh_big', { vol: 0.9 });
      this.music.setIntensity(0); this.world.setDolly(0);
      await sleep(300);
    } else {
      this.music.boom(); this.world.beat(1.2); this.ui.flash(`#${(B.pal.glow).toString(16).padStart(6, '0')}`, 500, 0.4);
    }
  }

  onEnrage(B) {
    // 발악기는 루나린스의 라스트 스킬에만 있다 (체력이 줄수록 점점 강해지는 것이 핵심이고, 이 호출은 연출용)
    this.ui.warn('마지막 발악 — 공격이 격화됩니다', 1500);
    this.world.beat(1.2); this.ui.flash(`#${(B.pal.glow).toString(16).padStart(6, '0')}`, 450, 0.3);
    if (B.def.id === 'lunarinth') { this.music.setIntensity(1); this.sfx.play('laugh_big', { vol: 0.8 }); B.barkFor('low'); }
  }

  /** 라스트 스킬 격파 → 격파된 척하던 루나린스가 되살아나 얼티메이트 스킬을 시작한다 */
  async fakeDefeat(B, i) {
    const my = this._token;
    this.state = 'cutscene';
    this.sfx.play('boss_down'); this.ui.flash('#ffffff', 1300, 1); this.world.shake(1.2, 0.9);
    this.music.stop(0.6);
    this.timeScale = 0.25; this.world.setDolly(0.6);
    for (let k = 0; k < 10; k++) {
      this.fx.burst(B.x + (Math.random() - 0.5) * 3, B.bobY + (Math.random() - 0.5) * 3, B.z, 14, { color: [0xffffff, 0xfff1c9, B.pal.glow], speed: 8, size: 1.0, life: 1.3, up: 1.4 });
      await sleep(120); if (my !== this._token) return;
    }
    this.timeScale = 1; B.alphaT = 0.18; B.scaleT = 1;
    this.world.setTheme('lumina'); this.ui.setTheme('lumina');
    await sleep(1500); if (my !== this._token) return; // 정적
    await this.talk(SCRIPT.lunarinth.fakeEnd); if (my !== this._token) return;
    // 웃음소리가 쏟아지고, 새로운 BGM이 나타난다
    B.alphaT = 1; B.scaleT = 1.32; B.formPulse = 1;
    this.world.setTheme('void'); this.ui.setTheme('void'); this.world.setDolly(0.7);
    this.sfx.play('laugh_big'); setTimeout(() => this.sfx.play('laugh_big', { pitch: 1.1 }), 500); setTimeout(() => this.sfx.play('laugh', { pitch: 0.9 }), 1100);
    this.ui.flash('#000000', 900, 0.9); this.world.shake(1.0, 1.2); this.world.beat(1.5); this.ui.madness(true); setTimeout(() => this.ui.madness(false), 2200);
    this.music.setIntensity(0); this.music.play('ultimate', { fade: 0.5, immediate: true });
    this.ui.banner('ULTIMATE SKILL', '진짜 발악 — 한 번이라도 닿으면 끝', 3000);
    await sleep(1800); if (my !== this._token) return;
    await this.talk(SCRIPT.lunarinth.ultimateStart); if (my !== this._token) return;
    this.world.setDolly(0);
    this.sealed = true; this.ui.setSealed(true);
    this.ui.warn('잔기 · 컨티뉴 · 궁극기 — 전부 봉인', 2200);
    this.state = 'fight';
    B.startStep(i + 1);
  }

  async stageClear(B) {
    const my = this._token, idx = this.run.stageIdx, st = STAGES[idx];
    this.state = 'stageclear'; B.alive = true; B.vulnerable = false;
    this.music.stop(1.2); this.sealed = false; this.ui.setSealed(false); this.player.alive = true;
    this.timeScale = 0.25; this.world.setDolly(0.6);
    if (B.step && B.step.kind === 'ultimate') { this.ui.flash('#ffffff', 1800, 1); this.world.shake(1.4, 1.2); }
    for (let k = 0; k < 14; k++) {
      this.fx.burst(B.x + (Math.random() - 0.5) * 3, B.bobY + (Math.random() - 0.5) * 3, B.z, 14, { color: [0xffffff, 0xfff1c9, B.pal.glow, B.pal.b], speed: 8, size: 1.0, life: 1.4, up: 1.4 });
      await sleep(130); if (my !== this._token) return;
    }
    this.timeScale = 1;
    B.alphaT = 0; B.scaleT = 1; this.world.setFall(null); this.veilLv = 0.98;
    this.world.setTheme('lumina'); this.ui.setTheme('lumina');
    await sleep(700); if (my !== this._token) return;
    this.music.play('victory', { fade: 2.0, immediate: true }); this.sfx.play('victory');
    await this.talk(SCRIPT[st.id].outro); if (my !== this._token) return;
    B.visible = false; this.ui.hideBark();
    if (idx + 1 < STAGES.length) {
      this.ui.banner('STAGE CLEAR', `${B.def.name} 격파`, 2200);
      await sleep(2300); if (my !== this._token) return;
      await this.playStage(idx + 1);
    } else {
      await this.runEnding();
    }
  }

  // ───── 엔딩 / 결과 ─────
  isExtraUnlocked() { try { return localStorage.getItem(EXTRA_KEY) === '1'; } catch (e) { return false; } }
  unlockExtra() { try { localStorage.setItem(EXTRA_KEY, '1'); } catch (e) { /* noop */ } this.ui.refreshExtra(); }

  async runEnding() {
    const my = this._token;
    this.state = 'ending'; this.ui.showHud(false); this.ui.hideBark();
    const n = this.run.continues, E = n === 0 ? ENDINGS.A : ENDINGS.B;
    this.world.setDolly(0);
    this.music.play('ending', { fade: 2.5, immediate: true });
    await this.talk(typeof E.lines === 'function' ? E.lines(n === 0 ? this.stats.ultDeaths : n) : E.lines); if (my !== this._token) return;
    this.ui.showEnding(E.title, E.name, E.sub);
    // EXTRA 개방 조건: NORMAL 이상에서 노 컨티뉴 클리어
    const unlocked = n === 0 && this.run.diff.lv >= 1;
    if (unlocked) { const was = this.isExtraUnlocked(); this.unlockExtra(); if (!was) setTimeout(() => this.ui.warn('EXTRA 개방 — (미구현 · 준비 중)', 2600), 2600); }
    await sleep(6500); if (my !== this._token) return;
    this.ui.hideEnding();
    const t = Math.round(this.fightT);
    this.ui.showResult(true, [
      ['난이도', this.run.diff.name], ['클리어 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`],
      ['컨티뉴', `${n}회`], ['피격', this.stats.hits], ['스킬 격파 · 노미스 취득', `${this.stats.spellsCaptured} / ${this.stats.spellsSeen}`],
      ['얼티메이트 스킬', `돌파 ${this.stats.ultSurvived} · 쓰러짐 ${this.stats.ultDeaths}`],
      ['병사 격파', this.stats.mobs], ['그레이즈', this.stats.graze], ['궁극기 사용', this.stats.ults],
    ], n === 0 ? '— 노 컨티뉴 클리어 —' : '— 컨티뉴 클리어 —');
    this.state = 'result';
  }

  async onPlayerDown() {
    if (this.state !== 'fight' && this.state !== 'stage') return;
    const my = this._token;
    this.downFrom = this.state;
    this.state = 'defeat';
    const B = this.boss; B.cancelAttack(); B.vulnerable = false;
    if (this.run.practice) {
      // 프랙티스: 컨티뉴 없이 같은 단계를 바로 다시
      this.timeScale = 0.3; this.world.shake(0.7, 0.5); this.sfx.play('defeat', { vol: 0.5 });
      await sleep(700); if (my !== this._token) return;
      this.timeScale = 1; this.clearBossField(); this.mobs.clear(); this.player.reset(this.run.diff.php); this.player.inv = 2.5;
      this.ui.setHp(this.player.hp, this.player.maxHp); this.ui.setUlt(this.player.ults); this.ui.warn('다시 도전', 1000);
      if (this.downFrom === 'stage') { this.state = 'stage'; this.runWaves(STAGES[this.run.stageIdx]).then(() => { if (my === this._token) this.practiceEnd('clear'); }); }
      else { this.state = 'fight'; B.startStep(B.stepIdx, { quick: true }); }
      return;
    }
    this.timeScale = 0.2; this.world.shake(0.9, 0.8); this.music.stop(1.0);
    this.sfx.play('defeat'); this.ui.setVeil(0); this.ui.madness(false); this.ui.setBossTimer(null);
    this.fx.burst(this.player.x, 1, this.player.z, 40, { color: [0xffffff, 0xffd36b, 0xff7aa8], speed: 8, size: 0.9, life: 1.2 });
    await sleep(1100); if (my !== this._token) return;
    this.timeScale = 1;
    this.clearBossField();
    this.music.play('defeat', { fade: 2, immediate: true });
    const left = this.run.continuesMax - this.run.continues;
    if (left > 0) { this.state = 'continue'; this.ui.showContinue(left, this.run.continuesMax); }
    else this.gameOver();
  }

  /** 얼티메이트 스킬 중 피격: 체력과 관계없이 즉사 → 그 식은 끝나고 다음 식으로 */
  onUltimateDeath() {
    if (this._ultDying || this.state !== 'fight') return;
    this._ultDying = true; this.stats.ultDeaths++;
    const P = this.player; P.alive = false; P.deathFx(this);
    this.ui.setVeil(0); this.hitstop(0.12);
    this.boss.endStep('dead');
  }

  doContinue() {
    const B = this.boss, P = this.player;
    this.run.continues++;
    this.ui.hideContinue(); this.ui.setContinues(this.run.continues, CONTINUES);
    P.reset(this.run.diff.php); P.inv = 3; this.ui.setHp(P.hp, P.maxHp); this.ui.setUlt(P.ults);
    this.sfx.play('heal'); this.ui.flash('#ffffff', 600, 0.5);
    this.clearBossField(); this.timeScale = 1;
    if (this.downFrom === 'stage') {
      // 병사 웨이브는 이어서 진행 (화면의 병사는 정리)
      this.mobs.clear(); this.state = 'stage'; this.music.play(STAGES[this.run.stageIdx].stageMusic, { fade: 1.0, immediate: true });
    } else {
      this.state = 'fight';
      B.startStep(B.stepIdx, { quick: true }); // 현재 단계를 처음부터 다시
    }
  }

  async gameOver() {
    const my = this._token;
    this.ui.hideContinue(); this.state = 'gameover';
    await this.talk(SCRIPT.gameover); if (my !== this._token) return;
    const t = Math.round(this.fightT), B = this.boss;
    this.ui.showResult(false, [
      ['난이도', this.run.diff.name], ['도달', `${STAGES[this.run.stageIdx].label} — ${B.def.name}`],
      ['단계', B.visible ? `${B.stepIdx + 1} / ${B.stepCount}` : '병사 웨이브'], ['버틴 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`],
      ['컨티뉴 사용', `${this.run.continues}회`], ['병사 격파', this.stats.mobs], ['그레이즈', this.stats.graze],
    ], 'GAME OVER');
    this.state = 'result';
  }

  // ───── 플레이어 궁극기 ─────
  canUlt() { return (this.state === 'stage' || (this.state === 'fight' && this.boss.state !== 'between')) && !this.ultBusy && !this.sealed; }

  async useUlt(saved) {
    const P = this.player, B = this.boss;
    if (this.ultBusy || this.sealed) return;
    this.ultBusy = true;
    const inStage = this.state === 'stage';
    const mode = inStage || !B.step ? 'normal' : (B.step.ultMode || 'normal');
    this.stats.ults++; this.run.stepUlt = true;
    this.sfx.play('ult_declare');
    this.ui.declare({ who: this.run.char ? this.run.char.id : 'claire', kind: 'ult', tag: PLAYER_ULT.tag, name: PLAYER_ULT.name, side: 'left' });
    this.timeScale = 0;
    await sleep(720);
    this.timeScale = 1;
    if (this.state !== 'fight' && this.state !== 'between' && this.state !== 'stage') { this.ultBusy = false; return; }
    this.sfx.play('ult');
    P.beginUlt(this, mode);
    if (!inStage) {
      if (mode === 'reject') { this.ui.warn('리젝트 — 궁극기가 무효화되었습니다', 1800); B.barkFor(B.def.id + 'Ult'); }
      else if (mode === 'immune') { this.ui.warn('면역 — 이 스킬에는 궁극기가 통하지 않습니다', 1800); }
      else if (mode === 'resist') { this.ui.warn('저항 — 궁극기 피해가 크게 줄어듭니다', 1500); if (Math.random() < 0.6) B.barkFor('ult'); }
      else if (Math.random() < 0.5) B.barkFor(B.def.id + 'Ult');
      if (B.addAnalysis) B.addAnalysis(10);
    }
    void saved;
    this.ultBusy = false;
  }

  // ───── 보조 ─────
  setVeil(on, lv = 0.98) { this.veil = on; if (on) this.veilLv = lv; }
  setMadness(sec) { this.madnessT = sec; this.ui.madness(true); }
  hitstop(sec) { this.hitstopT = Math.max(this.hitstopT, sec); }
  setPause(p) {
    if (p === this.paused) return;
    if (p && this.state !== 'fight' && this.state !== 'stage') return;
    this.paused = p; this.ui.showPause(p);
    this.sfx.play(p ? 'pause' : 'unpause');
    if (p) this.engine.suspend(); else this.engine.resume();
    if (!p) this.ui.modal('#m-settings', false);
  }

  // ───── 충돌 ─────
  collide(dt) {
    const P = this.player, B = this.boss, bl = this.bullets.list;
    const hr0 = PLAYER.hr, gr0 = PLAYER.grazeR;
    for (const b of bl) {
      if (!b.active || b.delay > 0 || (b.owner === 'boss' && b.age < b.armAt)) continue;
      if (b.owner === 'player') {
        let used = false;
        for (const m of this.mobs.list) {
          if (!m.alive) continue;
          if ((b.x - m.x) ** 2 + (b.z - m.z) ** 2 < (m.hr + b.hr) ** 2) { this.mobs.damage(m, b.dmg, b.x, b.z); this.bullets.kill(b); used = true; break; }
        }
        if (used) continue;
        for (const d of B.decoys) {
          if (!d.active) continue;
          if ((b.x - d.x) ** 2 + (b.z - d.z) ** 2 < (1.7 + b.hr) ** 2) {
            d.hp -= b.dmg * 3; this.fx.burst(b.x, 1.6, b.z, 2, { color: 0x9bb8ff, speed: 3, size: 0.4, life: 0.3 });
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
      const hr = b.hr + hr0;
      if (d2 < hr * hr) {
        if (P.hurt(this)) this.bullets.kill(b);
        continue;
      }
      // 그레이즈
      if (!b.grazed && d2 < (b.hr + gr0) ** 2 && !P.safe) {
        b.grazed = true; this.stats.graze++;
        this.ui.setGraze(this.stats.graze);
        this.sfx.play('graze', { pan: this.audio.pan(P.x) });
        this.fx.emit({ x: b.x, y: 1.0, z: b.z, life: 0.25, s0: 0.6, s1: 0, color: 0xffffff, tex: 'spark' });
        if (B.onGraze) B.onGraze();
      }
    }
    // 바닥 공격
    const zh = this.zones.update(dt, P.x, P.z, hr0, this.fx, this.audio, this.world);
    const bh = this.beams.update(dt, P.x, P.z, hr0, this.fx, this.audio, this.world);
    if (zh || bh) P.hurt(this);
  }

  // ───── 메인 루프 ─────
  _frame(ts) {
    requestAnimationFrame((t) => this._frame(t));
    if (this._manual) return; // 테스트용: 외부에서 simulate()/_render() 를 직접 구동
    const rawDt = Math.min(0.05, (ts - (this._lastTs || ts)) / 1000);
    this._lastTs = ts;
    this.t += rawDt;

    if (this.hitstopT > 0) { this.hitstopT -= rawDt; this._render(rawDt, 0); return; }

    const input = this.input;
    if (input.take('pause')) {
      if (!document.getElementById('m-settings').hidden && this.paused) this.ui.modal('#m-settings', false);
      else if (this.state === 'fight' || this.state === 'stage' || this.paused) this.setPause(!this.paused);
    }
    if (this.paused) { this._render(rawDt, 0); input.endFrame(); return; }

    const dt = rawDt * this.timeScale;
    const active = ['fight', 'stage', 'between', 'banner', 'stageclear', 'defeat', 'cutscene', 'ending', 'continue', 'gameover', 'result'].includes(this.state);
    if (active) this.simulate(dt, rawDt);
    this._render(rawDt, dt);
    input.endFrame();
  }

  simulate(dt, rawDt) {
    const P = this.player, B = this.boss, fighting = this.state === 'fight', staging = this.state === 'stage';
    const canControl = fighting || staging || this.state === 'between' || this.state === 'cutscene' || this.state === 'stageclear';
    if (canControl) P.update(dt, this.input, this, fighting || staging || this.state === 'between');
    if (fighting || staging) this.fightT += rawDt;
    if (staging) this._stepStage(dt);
    if (this.state !== 'menu') B.update(dt);
    this.mobs.update(dt, this);
    this.bullets.update(dt, P.x, P.z, this.fx, B.x, B.z);
    if (fighting || staging) this.collide(dt);
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
    if (fighting && B.state === 'run') {
      const sec = Math.max(0, B.timeLeft);
      const prev = this._lastSec; this._lastSec = Math.ceil(sec);
      this.ui.setBossTimer(sec);
      if (sec <= 10 && this._lastSec !== prev) this.sfx.play('gauge', { pitch: 0.8 });
      if (B.def.hasAnalysis) this.ui.setAnalysis(B.analysis);
      if (B.step.kind === 'ultimate') this.ui.setBoss(Math.max(0, B.timeLeft / B.step.time)); // 얼티메이트 스킬은 남은 시간이 게이지
    }
  }

  _render(rawDt, dt) {
    const P = this.player, B = this.boss;
    this.world.update(rawDt, P.x);
    P.render(rawDt, this.t);
    const showP = this.state !== 'menu'; P.spr.visible = P.shadow.visible = P.core.visible = P.dotRim.visible = showP;
    P.focusRing.visible = showP;
    for (const b of Object.values(this.bosses)) { if (b === B) b.render(rawDt, this.t); else { b.visible = false; b.alpha = 0; b.render(rawDt, this.t); } }
    if (!this.ui.el.bubble.hidden) { const [sx, sy] = this.world.project(B.x, B.bobY + B.h * 0.67 * B.scaleK, B.z); this.ui.moveBark(sx, sy); }
    this.ui.setVeil(this.veilV * this.veilLv, ...this.world.project(P.x, 1.0, P.z));
    this.world.render();
    void dt;
  }
}

export { PAL };
