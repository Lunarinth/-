// 게임 본체: 타이틀 → 난이도 선택 → 저택 탐험(층 → 방 → 보스방) → 엔딩/컨티뉴/게임오버.
// 아이작의 번제식 구조: 층마다 방이 격자로 이어져 있고, 방의 적을 모두 쓰러뜨려야 문이 열린다.
// 보물방 · 휴식방(상인) · 수호자의 방(중간 보스) · 도전방 · 보스방. 보스를 쓰러뜨리면 다음 층으로 내려가는 함정문이 열린다.
// 동방식 구조는 그대로: 보스는 "단계(통상/스킬/라스트)"로 진행되고, 스킬 발동 시 이름이 선언된다.
import { World } from './scene.js';
import { Bullets, Particles, Zones, Beams, Flyers } from './entities.js';
import { Player, PLAYER } from './player.js';
import { Opsir } from './bosses/opsir.js';
import { Bellis, BELLIS_MID } from './bosses/bellis.js';
import { Astra } from './bosses/astra.js';
import { Tramont } from './bosses/tramont.js';
import { Indexer, INDEX_MID } from './bosses/indexer.js';
import * as ArkMod from './bosses/arkesia.js';
import { LUNARINTH_MID } from './bosses/lunarinth.js';
import { Manager, ErrorArkesia, APO_MID } from './bosses/manager.js';
import { SigilMid, makeSigilDef, SIGIL_KEYS } from './bosses/sigilmid.js';
import { Lunarinth, PAL } from './bosses/lunarinth.js';
import { Mobs } from './mobs.js';
import { makeStageScript } from './stages.js';
import { STAGES, EXTRA_STAGE, HELL_STAGE, APO_STAGE, APO_DIFF, EXTRA_DIFF, DIFFS, CHARS, SCRIPT, ENDINGS, PLAYER_ULT, SHOP } from './lore.js';
import { ITEMS, ITEM_BY_ID, RARITY, TRANSFORMS, rollItem } from './items.js';
import { makeRogueTextures } from './icons.js';
import { Pickups } from './pickups.js';
import { genFloor, RoomView, DOOR_POS, OPP } from './floor.js';
import { makeEncounter, roomGimmick } from './rooms.js';
import { Skills } from './skills.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { AudioEngine } from './audio/engine.js';
import { Sfx } from './audio/sfx.js';
import { MusicDirector } from './audio/music.js';
import { makeTextures, makePlayerTextures, loadImage } from './art.js';
import * as THREE from '../vendor/three.module.min.js';

const EXTRA_KEY = 'lunarinth.extra.v1';
const HELL_KEY = 'lunarinth.hell.v1';
const APO_KEY = 'lunarinth.apo.open';
const APO_DONE = 'lunarinth.apo.done';
const INF_KEY = 'lunarinth.infinite.v1'; // 첫 클리어 이후 인피니트 등장
const MET_KEY = 'lunarinth.met.';
const SETTINGS_KEY = 'lunarinth.settings.v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CONTINUES = 3; // 기본 컨티뉴 횟수
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* noop */ } };
const pickW = (arr) => { let t = 0; for (const [, w] of arr) t += Math.max(0, w); let r = Math.random() * t; for (const [v, w] of arr) { r -= Math.max(0, w); if (r <= 0) return v; } return arr[0][0]; };

// 층별 적 체력 보정: 처음엔 약한 하녀장이 물건과 파워로 강해지는 만큼 보스도 층마다 단단해진다
const HP_SCALE = [0.45, 0.58, 0.7, 0.82, 0.94, 1.05];
// 보스를 쓰러뜨리면 떨어지는 유물
const RELIC = { opsir: 'opsirScope', astra: 'astraCircuit', tramont: 'tramontRapier', index: 'indexKey', bellis: 'bellisTome', arkesia: 'arkesiaThread', arkesiaHell: 'arkesiaThread' };

const BOSS_ASSETS = {
  opsir: { cls: Opsir, img: 'assets/opsir.png' },
  astra: { cls: Astra, img: 'assets/astra.png' },
  tramont: { cls: Tramont, img: 'assets/tramont.png' },
  index: { cls: Indexer, img: 'assets/index.png' },
  bellis: { cls: Bellis, img: 'assets/bellis.png' },
  lunarinth: { cls: Lunarinth, img: 'assets/lunarinth.png' },
  arkesia: { cls: ArkMod.Arkesia, img: 'assets/arkesia.png' },
  manager: { cls: Manager, img: 'assets/manager.png' },
};
// 대사창 초상화 크롭 (이미지 대비 비율)
const FACE = {
  luna: { sx: 0.2, sy: 0.02, sw: 0.55 },
  opsir: { sx: 0.34, sy: 0.04, sw: 0.5 },
  bellis: { sx: 0.18, sy: 0.0, sw: 0.62 },
  claire: { sx: 0.2, sy: 0.1, sw: 0.6 },
  astra: { sx: 0.26, sy: 0.06, sw: 0.42 },
  tramont: { sx: 0.3, sy: 0.0, sw: 0.4 },
  index: { sx: 0.36, sy: 0.1, sw: 0.46 },
  arkesia: { sx: 0.24, sy: 0.07, sw: 0.5 },
  manager: { sx: 0.3, sy: 0.08, sw: 0.4 },
  sitra: { sx: 0.3, sy: 0.13, sw: 0.42 },
  infinite: { sx: 0.3, sy: 0.06, sw: 0.4 },
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
    this.freezeT = 0; this.floor = null; this.room = null; this.encounter = null; this.roomCombat = false; this._waveT = 0; this._doorCd = 0; this._actT = 0;
    this.run = this.makeRun(DIFFS[1]);
    this.stats = this.newStats();
  }

  newStats() { return { hits: 0, graze: 0, damage: 0, attacks: 0, ults: 0, spellsSeen: 0, spellsCaptured: 0, mobs: 0, ultDeaths: 0, ultSurvived: 0, items: 0, rooms: 0, skills: 0 }; }
  makeRun(diff, extra = false) {
    const dbg = !!this.debugInf; // 테스트용 암호: EXTRA · HELL 에서도 적용된다
    const special = diff.apo ? APO_STAGE : diff.hell ? HELL_STAGE : extra ? EXTRA_STAGE : null;
    return {
      diff, char: CHARS[0], extra, hell: !!diff.hell, apo: !!diff.apo, stages: special ? [special] : STAGES, special: !!special,
      stageIdx: 0, continues: 0, continuesMax: extra ? 0 : CONTINUES, stepHit: false, stepUlt: false, debugInf: dbg, debugUsed: 0,
      hpScale: special ? 1.1 : HP_SCALE[0],
    };
  }
  get stageList() { return this.run.stages || STAGES; }

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
    Object.assign(this.T, makeRogueTextures());
    this.world = new World(canvas, this.T);
    this.world.shakeOn = this.settings.shake;
    const scene = this.world.scene;

    this.bullets = new Bullets(scene, this.T);
    this.fx = new Particles(scene, this.T);
    this.zones = new Zones(scene, this.T);
    this.beams = new Beams(scene, this.T);
    this.flyers = new Flyers(scene, this.T);
    this.mobs = new Mobs(scene, this.T, this);
    this.pickups = new Pickups(scene, this.T);
    this.roomView = new RoomView(scene, this.T);
    this.skills = new Skills(this);

    const pt = makePlayerTextures();
    this.player = new Player(scene, this.T, pt.frames);
    const mkTex = (img) => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; t.anisotropy = 4; return t; };
    // 성검사 클레르 (assets/claire.png). 실패하면 직접 그린 임시 스프라이트를 쓴다.
    let claireImg = null;
    try {
      claireImg = await loadImage('assets/claire.png');
      const t = mkTex(claireImg);
      this.player.setSprite([t, t], claireImg.width / claireImg.height, 2.9);
    } catch (e) { /* 임시 스프라이트 유지 */ }

    // 보스 (스프라이트는 전부 미리 만들어 두고 층마다 하나만 보인다)
    this.bosses = {}; const imgs = { claire: claireImg };
    for (const [id, a] of Object.entries(BOSS_ASSETS)) {
      const img = await loadImage(a.img);
      this.bosses[id] = new a.cls(scene, this.T, mkTex(img), img.width / img.height, this);
      imgs[id] = img;
    }
    // 중간 보스: 문양 파수병 5종 + 벨리스(6층) + 인덱스(EXTRA). 키는 'm_' + 층의 mid id
    for (const k of SIGIL_KEYS) { const def = makeSigilDef(k); this.bosses['m_' + def.id] = new SigilMid(scene, this.T, this.T[def.sprite], 1, this, def); }
    this.bosses.m_bellis = new Bellis(scene, this.T, mkTex(imgs.bellis), imgs.bellis.width / imgs.bellis.height, this, BELLIS_MID);
    if (ArkMod.ARKESIA_HELL) { const a = imgs.arkesia; this.bosses.arkesiaHell = new ArkMod.Arkesia(scene, this.T, mkTex(a), a.width / a.height, this, ArkMod.ARKESIA_HELL); }
    { const l = imgs.lunarinth; this.bosses.m_lunarinth_mid = new Lunarinth(scene, this.T, mkTex(l), l.width / l.height, this, LUNARINTH_MID); }
    { const a = imgs.arkesia; this.bosses.m_apo_mid = new ErrorArkesia(scene, this.T, mkTex(a), a.width / a.height, this, APO_MID); }
    this.bosses.m_index = new Indexer(scene, this.T, mkTex(imgs.index), imgs.index.width / imgs.index.height, this, INDEX_MID);
    this.boss = this.bosses.opsir;

    // 상인: 시트라 · 인피니트
    for (const id of ['sitra', 'infinite']) {
      try { const img = await loadImage(`assets/${id}.png`); imgs[id] = img; this.roomView.npcTex[id] = { tex: mkTex(img), aspect: img.width / img.height }; } catch (e) { /* 상인 없이 진행 */ }
    }

    // 초상화 (대사창 / 스킬 컷인)
    const portraits = {};
    for (const [who, key] of [['luna', 'lunarinth'], ['opsir', 'opsir'], ['bellis', 'bellis'], ['claire', 'claire'], ['astra', 'astra'], ['tramont', 'tramont'], ['index', 'index'], ['arkesia', 'arkesia'], ['manager', 'manager'], ['sitra', 'sitra'], ['infinite', 'infinite']]) {
      const img = imgs[key]; if (!img) continue;
      const f = FACE[who];
      portraits[who] = { kind: 'img', img, sx: img.width * f.sx, sy: img.height * f.sy, sw: img.width * f.sw, sh: img.width * f.sw };
    }
    if (!portraits.claire) portraits.claire = { kind: 'canvas', canvas: pt.portrait.image };
    this.ui.setPortraits(portraits, imgs);

    this._wireUI();
    this.input.onAny = () => { this.engine.init(); };

    this.ui.refreshExtra();
    this.toMenu(true);
    document.getElementById('loading').classList.add('done');
    setTimeout(() => document.getElementById('loading').remove(), 1200);
    requestAnimationFrame((ts) => this._frame(ts));
    document.addEventListener('visibilitychange', () => { if (document.hidden && !(this.run && this.run.apo) && this.isPlayState() && !this.paused) this.setPause(true); });
    window.__lunarinth = this; // 디버그/테스트 훅
  }

  isPlayState() { return this.state === 'fight' || this.state === 'stage' || this.state === 'room'; }

  _wireUI() {
    const ui = this.ui;
    ui.apoOpen = () => this.isApoOpen();
    ui.on.start = (diff) => { this.engine.init(); this.sfx.play('ui_start'); this.startRun(diff, false); };
    ui.on.startExtra = (diff) => { this.engine.init(); this.sfx.play('ui_start'); this.startRun(diff || EXTRA_DIFF, true); };
    ui.on.startApo = () => { this.engine.init(); this.sfx.play('ui_start'); this.startRun(APO_DIFF, true); };
    ui.on.unlockApo = () => { const was = this.isApoOpen(); this.unlockApo(); if (!was) { this.sfx.play('heal'); this.ui.warn('……무언가 열렸다', 2600); } };
    ui.on.unlockHell = () => { this.unlockHell(); this.sfx.play('heal'); this.ui.warn('HELL 개방 — 타이틀에서 선택할 수 있습니다', 2600); };
    ui.on.retry = () => { ui.hideResult(); this.startRun(this.run.diff, this.run.extra); };
    ui.on.unlockExtra = () => { this.unlockExtra(); this.sfx.play('heal'); this.ui.warn('EXTRA 개방 — 타이틀에서 선택할 수 있습니다', 2600); };
    ui.on.debugInf = (on) => { this.debugInf = on; if (this.run) this.run.debugInf = on; this.sfx.play(on ? 'heal' : 'hurt', { vol: 0.5 }); this.ui.warn(on ? '테스트 모드 — 컨티뉴 무제한' : '테스트 모드 해제', 2200); };
    ui.on.toMenu = () => this.toMenu();
    ui.on.resume = () => this.setPause(false);
    ui.on.continueYes = () => this.doContinue();
    ui.on.continueNo = () => this.gameOver();
  }

  // ───── 화면 전환 ─────
  toMenu(first = false) {
    this._token++; if (this._stageDone) { this._stageDone(); this._stageDone = null; } this._midDone = null;
    this.state = 'menu'; this.paused = false; this.timeScale = 1; this.ultBusy = false; this.sealed = false; this._ultDying = false; this.stageRoutine = null;
    this.ui.setSealed(false); this.world.setFall(null); this.veilLv = 0.98;
    // 보스전 도중 탈주해도 다음 판에 아무것도 남지 않도록 연출/타이머 상태를 전부 초기화한다
    this.hitstopT = 0; this.downFrom = 'fight'; this.freezeT = 0; document.body.classList.remove('timestop');
    this.floor = null; this.room = null; this.encounter = null; this.roomCombat = false; this._descending = false;
    this.ui.setBossTimer(null); this.ui.setAnalysis(null); this.ui.hideContinue(); this.ui.hideDeclare();
    for (const id of ['#warn', '#announce', '#banner', '#itembanner']) { const el = document.querySelector(id); if (el) { el.classList.remove('show'); if (id !== '#warn') el.hidden = true; } }
    this.engine.resume();
    this.ui.closeModals(); this.ui.hideResult(); this.ui.showHud(false); this.ui.hideBark(); this.ui.hideEnding(); this.ui.hideDeclare();
    this.ui.setTags([]); this.ui.hint(null); this.ui.drawMap(null);
    this.setMono(false); this.ui.setTheme('lumina'); this.world.setTheme('lumina'); this.world.setEnv('moongarden'); this.world.setDolly(0);
    this.ui.showMenu(true); this.ui.setVeil(0); this.ui.madness(false); this.veil = false; this.madnessT = 0;
    this.clearField(); this.pickups.clear(); this.roomView.hideAll(); this.skills.reset();
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

  /** HUD 전체 갱신 */
  refreshHud() {
    const P = this.player, ui = this.ui;
    ui.setHp(P.hp, P.maxHp); ui.setUlt(P.ults, P.bombCap); ui.setRogue(P); ui.setItems(P); ui.refreshActive(P);
  }

  // ───── 런 ─────
  async startRun(diff, extra = false) {
    this._token++;
    const my = this._token;
    this.run = this.makeRun(diff, extra);
    this.stats = this.newStats(); this.fightT = 0; this.sealed = false; this.ui.setSealed(false);
    this.ui.showMenu(false); this.ui.closeModals(); this.ui.hideResult(); this.ui.hideEnding();
    const P = this.player;
    P.reset(diff.php); P.x = 0; P.z = 6.2;
    this.skills.reset(); this.pickups.clear(); this.roomView.hideAll(); this.floor = null; this.room = null;
    // EXTRA · HELL · APOTHEOSIS: 저택 6층을 지나온 하녀장처럼 미리 강해진 상태로 시작한다
    if (this.run.special) {
      P.power = 3; P.coins = 25; P.keys = 2; P.ults = 3;
      const owned = new Set();
      for (let i = 0; i < 4; i++) { const it = rollItem(i === 3 ? 'boss' : 'treasure', owned, Math.random, 10); if (it.active) { i--; owned.add(it.id); continue; } owned.add(it.id); P.addItem(it, this); }
      P.hp = P.maxHp;
    }
    this.refreshHud();
    this.ui.setContinues(0, this.run.continuesMax); this.ui.setDiff(diff);
    // 프롤로그: 저택의 분열
    this.state = 'cutscene'; this.clearField(); this.ui.showHud(false);
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.world.setTheme('lumina'); this.ui.setTheme('lumina'); this.world.setDolly(0.4);
    this.setMono(!!diff.apo);
    this.world.setEnv(diff.apo ? 'apo' : 'moongarden'); if (diff.apo) { this.world.setTheme('mono'); this.ui.setTheme('mono'); }
    this.music.play(diff.apo ? 'stageApo' : 'ending', { fade: 1.5, immediate: true });
    await this.talk(diff.apo ? SCRIPT.apoStart : extra ? SCRIPT.arkesia.pre || SCRIPT.arkesia.prologue || [] : SCRIPT.prologue); if (my !== this._token) return;
    await this.enterFloor(0);
  }

  floorTheme(st) { const B = this.bosses[st.id], def = B.def, f0 = def.forms[def.steps[0].form]; return st.theme || f0.theme || def.theme; }
  applyFloorLook(st) {
    const th = this.run.apo ? 'mono' : this.floorTheme(st);
    this.world.setEnv(st.env); this.world.setTheme(th); this.ui.setTheme(th); this.world.setDolly(0);
  }

  /** 층 시작: 지도 생성 → 시작 방 */
  async enterFloor(i) {
    const my = ++this._token, run = this.run, P = this.player;
    run.stageIdx = i;
    const st = this.stageList[i];
    run.hpScale = run.special ? 1.1 : HP_SCALE[i] ?? 1;
    this.floor = genFloor({ idx: run.special ? 2 : i, rooms: run.special ? 13 : 8 + i, infinite: this.isInfiniteUnlocked(), mid: !!st.mid });
    if (P.flags.map) this.revealMap(true); else if (P.flags.compass) this.revealMap(false);
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.boss = this.bosses[st.id]; this.boss.reset();
    this.state = 'cutscene'; this.timeScale = 1; this.sealed = false; this.ui.setSealed(false); this.world.setFall(null); this.veilLv = 0.98;
    this.clearField(); this.pickups.clear(); this.roomView.hideAll(); this.room = null;
    this.ui.showHud(true); this.ui.hideBark(); this.ui.showBossUI(false); this.ui.setBossTimer(null);
    this.applyFloorLook(st);
    this.music.setIntensity(0); this.music.play(st.stageMusic, { fade: 1.6, immediate: true });
    this.ui.setStage(run.special ? st.label : `${i + 1}층 · ${st.place}`);
    this.ui.banner(st.label, `${st.place} — ${st.mobName}`, 2800);
    P.x = 0; P.z = 4; P.inv = 1.5; P.alive = true;
    this.refreshHud();
    await sleep(1500); if (my !== this._token) return;
    this.enterRoom(this.floor.grid.get(this.floor.start), null);
  }

  revealMap(full) {
    if (!this.floor) return;
    for (const r of this.floor.list) if (full || r.type !== 'normal') r.known = true;
    this.ui.drawMap(this.floor, this.room);
  }

  /** 방 이동. dir: 이전 방에서 통과한 문 방향 (N/S/E/W) */
  enterRoom(room, dir) {
    const my = ++this._token, F = this.floor, P = this.player, prev = this.room;
    if (prev && prev !== room) prev.pickups = this.pickups.snapshot();
    this.clearField(); this.skills.wells.length = 0; this.freezeT = 0; document.body.classList.remove('timestop');
    this.room = room; room.visited = true; room.known = true;
    for (const k of Object.values(room.doors)) F.grid.get(k).known = true;
    if (dir) { const [dx, dz] = DOOR_POS[OPP[dir]], l = Math.hypot(dx, dz); P.x = dx - (dx / l) * 1.9; P.z = dz - (dz / l) * 1.9; }
    else { P.x = 0; P.z = 4; }
    P.vx = P.vz = 0; P.inv = Math.max(P.inv, 0.6); P.onEnterRoom(); if (P.flags.killStack) P.recalc();
    this.pickups.restore(room.pickups); room.pickups = [];
    this.roomView.set(F, room, room.cleared);
    this.roomView.showTrap(!!room.data.trap);
    this.ui.drawMap(F, room); this.ui.hint(null);
    this.ui.flash('#000000', 380, 0.85);
    this._doorCd = 0.5; this.encounter = null; this.roomCombat = false;
    this.state = 'room';
    this.stats.rooms++;
    switch (room.type) {
      case 'normal': case 'challenge':
        if (!room.cleared) this.startEncounter(room);
        break;
      case 'treasure':
        if (!room.data.spawned) { room.data.spawned = true; this.spawnItem('treasure', 0, -1.5); }
        break;
      case 'rest':
        if (!room.data.spawned) { room.data.spawned = true; this.stockRest(room); }
        if (room.merchant) this.meetMerchant(room, my);
        break;
      case 'mini':
        if (!room.cleared) this.playMini(room);
        break;
      case 'boss':
        if (!room.cleared) this.playBoss(room);
        break;
      default: break;
    }
  }

  themeId() { return this.stageList[this.run.stageIdx].id; }
  encounterLv() { const r = this.run; return r.special ? 3.2 + r.diff.lv * 0.25 : r.stageIdx * 0.55 + r.diff.lv * 0.35; }

  startEncounter(room) {
    this.roomCombat = true; this.roomView.setOpen(false);
    this.encounter = makeEncounter(this, this.themeId(), this.encounterLv(), room.type === 'challenge' ? 'challenge' : 'normal');
    this._waveT = 0.7; this._roomWall = 0;
    if (room.type === 'challenge') { this.ui.banner('도전방', '세 번의 습격을 버텨라', 2000); this.sfx.play('warning', { vol: 0.6 }); }
    else this.sfx.play('door', { pitch: 0.7 });
  }

  _stepRoom(dt) {
    const P = this.player;
    if (this.roomCombat && this.encounter) {
      roomGimmick(this, dt);
      const E = this.encounter;
      if (this.mobs.count() === 0) {
        if (E.wi < E.waves.length) {
          this._waveT -= dt;
          if (this._waveT <= 0) {
            const ms = E.waves[E.wi++]().filter(Boolean); this._waveT = 0.9;
            // 잃어버린 대본: 방에 들어서면 적 하나가 즉시 쓰러진다
            if (P.flags.scriptKill && E.wi === 1 && ms.length) { const m = ms[Math.floor(Math.random() * ms.length)]; m.age = 1; this.fx.burst(m.x, 1.5, m.z, 10, { color: [0xffffff], speed: 4, size: 0.6, life: 0.5 }); this.mobs.damage(m, 1e6, m.x, m.z, true); }
          }
        } else this.roomClear();
      }
    }
    this._checkDoors(dt);
    this._merchantTouch(dt);
  }

  /** 방의 적을 모두 쓰러뜨림 → 문이 열리고 보상이 떨어진다 */
  roomClear() {
    const room = this.room, P = this.player;
    room.cleared = true; this.roomCombat = false; this.encounter = null; this._roomWall = 0;
    this.roomView.setOpen(true); this.sfx.play('door'); this.ui.drawMap(this.floor, room);
    this.chargeActive(1);
    if (room.type === 'challenge') {
      this.spawnItem('challenge', 0, -1); this.pickups.burst('coin', 0, 0, 3);
      this.ui.announce('도전 성공 — 보상이 나타났다', 1800);
      return;
    }
    const luck = P.st.luck;
    if (Math.random() < 0.6 + luck * 0.05) {
      const t = pickW([['coin', 4 + luck], ['coin5', 0.7 + luck * 0.3], ['heart', P.hp < P.maxHp ? 3 : 0.8], ['key', 2], ['bomb', P.ults < P.bombCap ? 2 : 0.4], ['P', 1.2]]);
      this.pickups.spawn({ type: t, x: 0, z: 0, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3 });
      this.fx.ring(0, 0.4, 0, 0xffffff, 3, 0.4);
    }
  }

  chargeActive(n) {
    const a = this.player.active; if (!a || a.charge >= a.max) return;
    a.charge = Math.min(a.max, a.charge + n);
    if (a.charge >= a.max) { this.sfx.play('gauge', { pitch: 1.4 }); this.ui.announce(`액티브 충전 완료 — C`, 1400); }
    this.ui.refreshActive(this.player);
  }

  _checkDoors(dt) {
    if (this._doorCd > 0) { this._doorCd -= dt; return; }
    const room = this.room, P = this.player;
    if (!room || this.roomCombat || !room.cleared || !P.alive) return;
    for (const d of Object.keys(DOOR_POS)) {
      const k = room.doors[d]; if (!k) continue;
      const to = this.floor.grid.get(k), [x, z] = DOOR_POS[d];
      if ((P.x - x) ** 2 + (P.z - z) ** 2 > 1.45 * 1.45) continue;
      if (to.lock && !to.unlocked) {
        if (P.flags.masterKey || P.keys > 0) {
          if (!P.flags.masterKey) P.keys--;
          to.unlocked = true; this.sfx.play('unlock'); this.roomView.set(this.floor, room, true); this.ui.setRogue(P); this.ui.drawMap(this.floor, room);
          this.fx.burst(x, 1.5, z, 16, { color: [0xffd34a, 0xffffff], speed: 5, size: 0.6, life: 0.6 }); this._doorCd = 0.35;
        } else if (this.t - (this._lockWarn || 0) > 1.5) { this._lockWarn = this.t; this.ui.warn('열쇠가 필요합니다', 1000); this.sfx.play('hurt', { vol: 0.2, pitch: 1.6 }); }
        return;
      }
      this.sfx.play('door'); this.enterRoom(to, d);
      return;
    }
    // 함정문: 다음 층으로
    if (room.data.trap && P.x * P.x + (P.z + 1) ** 2 < 1.3 * 1.3) this.nextFloor();
  }

  async nextFloor() {
    if (this._descending) return;
    this._descending = true;
    const my = ++this._token, P = this.player;
    this.state = 'cutscene'; this.sfx.play('teleport'); this.ui.flash('#000000', 1100, 1);
    this.fx.burst(P.x, 1, P.z, 30, { color: [0xffffff, 0xd9c8ff], speed: 6, size: 0.8, life: 0.8, up: 1.4 });
    await sleep(1000); this._descending = false; if (my !== this._token) return;
    await this.enterFloor(this.run.stageIdx + 1);
  }

  // ───── 보물 · 상점 ─────
  spawnItem(pool, x, z, o = {}) {
    const owned = new Set(this.player.items); if (this.player.active) owned.add(this.player.active.id);
    for (const p of this.pickups.items()) owned.add(p.itemId);
    const it = o.itemId ? ITEM_BY_ID[o.itemId] : rollItem(pool, owned, Math.random, this.player.st.luck * 2);
    this.fx.ring(x, 0.4, z, 0xffe9a6, 5, 0.7); this.fx.burst(x, 1.5, z, 18, { color: [0xffffff, 0xffe9a6], speed: 5, size: 0.7, life: 0.7, up: 1.2 });
    return this.pickups.spawn({ type: 'item', itemId: it.id, x, z, pool, price: o.price || 0, shop: !!o.price, seller: o.seller || null, delay: 0.8 });
  }
  priceOf(p) { return Math.max(1, Math.round(p.price * (1 - (this.player.flags.discount || 0)))); }

  stockRest(room) {
    const m = room.merchant;
    if (!m) { this.pickups.spawn({ type: 'heart', x: -1.5, z: -1 }); this.pickups.spawn({ type: 'heart', x: 1.5, z: -1 }); return; }
    this.pickups.spawn({ type: 'heart', x: 0, z: 3.5 });
    if (m === 'sitra') {
      [-4, 0, 4].forEach((x) => { const p = this.spawnItem('shop', x, -2.4, { price: 1, seller: 'sitra' }); if (p) p.price = RARITY[ITEM_BY_ID[p.itemId].rarity].price; });
      const goods = [['heart', 3], ['key', 5], ['bomb', 5], ['P', 8]].sort(() => Math.random() - 0.5).slice(0, 3);
      goods.forEach(([type, price], i) => this.pickups.spawn({ type, x: -3 + i * 3, z: 0.8, price, shop: true, seller: 'sitra' }));
    } else {
      [-4, 0, 4].forEach((x) => { const p = this.spawnItem('infinite', x, -2.4, { price: 1, seller: 'infinite' }); if (p) p.price = Math.round(RARITY[ITEM_BY_ID[p.itemId].rarity].price * 0.85); });
    }
  }

  async meetMerchant(room, my) {
    const who = room.merchant, key = MET_KEY + who;
    if (!lsGet(key)) {
      this.state = 'cutscene';
      await sleep(450); if (my !== this._token) return;
      await this.talk(SHOP[who].first); if (my !== this._token) return;
      lsSet(key, '1'); this.state = 'room';
    } else { await sleep(500); if (my !== this._token) return; this.merchantSay('greet'); }
  }
  merchantSay(kind) {
    const who = this.room && this.room.merchant; if (!who || !SHOP[who]) return;
    const arr = SHOP[who][kind]; if (!arr || !arr.length) return;
    const [sx, sy] = this.world.project(0, 4.6, -6.2);
    this.ui.bark(arr[Math.floor(Math.random() * arr.length)], sx, sy, 2200);
    this.sfx.play('blip_' + who); setTimeout(() => this.sfx.play('blip_' + who), 70);
  }
  _merchantTouch(dt) {
    const room = this.room, P = this.player; if (!room || !room.merchant) return;
    this._mtT = Math.max(0, (this._mtT || 0) - dt);
    if (this._mtT <= 0 && P.x * P.x + (P.z + 6.2) ** 2 < 2.2 * 2.2) { this._mtT = 3.5; this.merchantSay('greet'); }
  }

  // ───── 픽업 ─────
  collectPickup(p) {
    const P = this.player, ui = this.ui, sfx = this.sfx;
    if (p.shop && p.price > 0) {
      const cost = this.priceOf(p);
      if (P.coins < cost) {
        if (this.t - (this._poorT || 0) > 1.8) { this._poorT = this.t; this.merchantSay('poor'); ui.warn(`동전이 모자랍니다 — ◎ ${cost}`, 1100); sfx.play('hurt', { vol: 0.2, pitch: 1.5 }); }
        return false;
      }
      if (p.type === 'heart' && P.hp >= P.maxHp) return false;
      if (p.type === 'bomb' && P.ults >= P.bombCap) return false;
      P.coins -= cost; sfx.play('buy'); this.merchantSay('buy');
    }
    switch (p.type) {
      case 'coin': P.coins += 1; sfx.play('coin'); break;
      case 'coin5': P.coins += 5; sfx.play('coin', { pitch: 0.85 }); break;
      case 'heart': if (P.hp >= P.maxHp) return false; P.heal(1); ui.setHp(P.hp, P.maxHp); sfx.play('heal', { vol: 0.6 }); this.fx.ring(P.x, 0.6, P.z, 0xff7aa8, 4, 0.4); break;
      case 'key': P.keys++; sfx.play('pickup', { pitch: 0.8 }); break;
      case 'bomb': if (P.ults >= P.bombCap) return false; P.ults++; ui.setUlt(P.ults, P.bombCap); sfx.play('pickup', { pitch: 0.6 }); break;
      case 'p': if (P.power >= 4) { P.score += 500; sfx.play('power', { pitch: 1.3 }); } else { if (P.addPower(0.05)) this.onPowerUp(); sfx.play('power'); } break;
      case 'P': if (P.power >= 4) P.score += 5000; else if (P.addPower(1)) this.onPowerUp(); sfx.play('power', { pitch: 0.7 }); break;
      case 'point': P.score += 300 * (1 + P.plv) * (p.z < -2 ? 2 : 1); sfx.play('coin', { pitch: 1.6, vol: 0.5 }); break;
      case 'item': this.giveItem(ITEM_BY_ID[p.itemId], p); break;
      default: break;
    }
    ui.setRogue(P);
    return true;
  }
  onPowerUp() {
    const P = this.player;
    this.fx.ring(P.x, 0.6, P.z, 0xff5a5a, 5, 0.5);
    if (P.plv >= 4) { this.ui.banner('FULL POWER', '성검이 온전히 깨어났다', 1800); this.sfx.play('ult', { vol: 0.5 }); }
    else this.ui.announce(`POWER UP — ${P.plv}단계 · 탄 ${1 + P.plv}줄`, 1400);
  }

  giveItem(it, from) {
    const P = this.player, ui = this.ui;
    const res = P.addItem(it, this);
    this.stats.items++;
    this.sfx.play('item_get'); ui.itemBanner(it, it.active ? `${it.desc} · 충전 ${P.active.max}` : null);
    this.fx.burst(P.x, 1.6, P.z, 26, { color: [0xffffff, 0xffe9a6], speed: 6, size: 0.8, life: 0.8, up: 1.4 });
    if (res.swapped) { const old = ITEM_BY_ID[res.swapped]; this.pickups.spawn({ type: 'item', itemId: old.id, x: from ? from.x : P.x, z: from ? from.z : P.z, lock: true, pool: 'treasure', delay: 0.2 }); }
    if (res.transform) {
      const T = TRANSFORMS[res.transform];
      setTimeout(() => {
        if (this.state === 'menu') return;
        ui.banner('TRANSFORM', `${T.name} — ${T.desc}`, 2800); this.sfx.play('transform');
        ui.flash('#' + T.aura.toString(16).padStart(6, '0'), 700, 0.6); this.world.shake(0.6, 0.5);
        this.fx.burst(P.x, 1.5, P.z, 50, { color: [0xffffff, T.aura], speed: 9, size: 1.0, life: 1.0, up: 1.5 });
        this.refreshHud();
      }, 900);
    }
    this.refreshHud();
  }

  onMobKilled(m) {
    const P = this.player, luck = P.st.luck;
    P.kills++; P.score += 100 * (1 + P.plv);
    if (P.flags.killStack) { P.killStack++; P.recalc(); }
    if (P.st.leech > 0) { P.leechN++; if (P.leechN >= Math.ceil(40 / P.st.leech)) { P.leechN = 0; if (P.heal(1)) { this.ui.setHp(P.hp, P.maxHp); this.fx.ring(P.x, 0.6, P.z, 0xd02040, 4, 0.5); this.sfx.play('heal', { vol: 0.5 }); } } }
    const x = m.x, z = m.z;
    if (m.elite) { this.pickups.burst('p', x, z, 5); this.pickups.burst('P', x, z, 1); this.pickups.burst('coin5', x, z, 1); if (Math.random() < 0.3) this.pickups.burst(Math.random() < 0.5 ? 'key' : 'bomb', x, z, 1); return; }
    if (Math.random() < 0.6) this.pickups.burst('p', x, z, 1 + (Math.random() < 0.3 ? 1 : 0));
    if (Math.random() < 0.035) this.pickups.burst('P', x, z, 1);
    if (Math.random() < 0.1 + luck * 0.025) this.pickups.burst('coin', x, z, 1);
    if (Math.random() < 0.012 + luck * 0.004) this.pickups.burst('heart', x, z, 1);
  }

  /** 가장 가까운 적 (병사 또는 보스) */
  nearestEnemy(x, z, r = 40) {
    let best = null, bd = r * r;
    for (const m of this.mobs.list) if (m.alive && m.age > 0.3) { const d = (m.x - x) ** 2 + (m.z - z) ** 2; if (d < bd) { bd = d; best = m; } }
    const B = this.boss;
    if (this.state === 'fight' && B && B.alive && B.visible && B.vulnerable) { const d = (B.x - x) ** 2 + (B.z - z) ** 2; if (d < bd) best = B; }
    return best;
  }
  hitEnemy(t, dmg, x, z) {
    if (!t) return;
    if (t === this.boss) { if (t.alive && t.visible && t.vulnerable) t.damage(dmg, this, x, z, true); }
    else this.mobs.damage(t, dmg, x, z, true);
  }

  // ───── 수호자의 방 · 보스방 ─────
  async playMini(room) {
    const my = this._token, st = this.stageList[this.run.stageIdx];
    this.roomCombat = true; this.roomView.setOpen(false);
    await sleep(400); if (my !== this._token) return;
    await this.playMid(st, my); if (my !== this._token) return;
    this.boss = this.bosses[st.id]; this.state = 'room';
    this.applyFloorLook(st); this.music.play(st.stageMusic, { fade: 1.2, immediate: true });
    this.player.inv = 1.2;
    this.roomClear();
    this.spawnItem('treasure', 0, -2); this.pickups.spawn({ type: 'heart', x: 2.5, z: 0 });
  }

  /** 보스방: (APOTHEOSIS 는 거미 무대 먼저) → 경고 → 등장 → 대사 → 단계 전투 */
  async playBoss(room) {
    const my = this._token, run = this.run, st = this.stageList[run.stageIdx], B = this.bosses[st.id], def = B.def;
    this.roomCombat = true; this.roomView.setOpen(false);
    for (const b of Object.values(this.bosses)) { b.visible = false; b.alpha = 0; }
    this.boss = B; B.reset(); B.ghostForce = false;
    this.state = 'cutscene';
    await sleep(500); if (my !== this._token) return;
    if (run.apo) { this.music.play(st.stageMusic, { fade: 0.8, immediate: true }); await this.runWaves(st, 'b'); if (my !== this._token) return; }
    this.state = 'cutscene'; this.clearBossField(); this.mobs.clear();
    this.music.stop(0.8); this.sfx.play('warning'); this.ui.flash('#ffffff', 500, 0.4);
    this.ui.banner('WARNING', st.warn.replace('WARNING — ', ''), 2400);
    await sleep(2300); if (my !== this._token) return;
    this.world.setDolly(0.5); B.appear();
    const veiled = (st.id === 'arkesia' && !run.hell) || st.id === 'manager'; // 정체는 본인이 밝히기 전까지 ？？？
    const f0 = def.forms[def.steps[0].form];
    this.ui.setBossHeader(veiled ? { ...def, name: '？？？', epithet: '' } : def); this.ui.setBossStep(B, 0); this.ui.setBossInstant(1); this.ui.setBossTimer(null); this.ui.setAnalysis(null); this.ui.showBossUI(true);
    this.music.play(f0.music || def.music, { fade: 1.8, immediate: true });
    this.ui.banner(veiled ? '？？？' : def.en, veiled ? (st.id === 'manager' ? '실을 쥔 손' : '실 끝에서 웃는 그림자') : `${def.name} — ${def.epithet}`, 3000);
    await sleep(1800); if (my !== this._token) return;
    await this.talk(SCRIPT[this.scriptKey(st)].intro); if (my !== this._token) return;
    if (veiled && st.id !== 'manager') this.ui.setBossHeader(def); // 무대 관리자는 이름을 밝히는 장면(fakeScene)에서야 표시된다
    this.world.setDolly(0);
    this.state = 'fight'; this._actT = 0;
    if (def.hasAnalysis) this.ui.setAnalysis(B.analysis);
    B.startStep(0);
  }

  scriptKey(st) { return st.id === 'arkesiaHell' ? 'hellArkesia' : st.id === 'manager' ? 'apoManager' : st.id; }

  /** 중간 보스전. 문양 파수병은 말이 없고, 벨리스 · 인덱스는 짧은 대사가 있다. 격파되면 resolve */
  async playMid(st, my) {
    const M = this.bosses['m_' + st.mid], def = M.def;
    this.state = 'cutscene'; this.clearBossField(); this.mobs.clear();
    this.music.stop(0.6); this.sfx.play('mid_appear'); this.ui.flash('#ffffff', 400, 0.3);
    await sleep(700); if (my !== this._token) return;
    this.boss = M; M.isMid = true; M.appear();
    this.ui.setBossHeader(def); this.ui.setBossStep(M, 0); this.ui.setBossInstant(1); this.ui.setBossTimer(null); this.ui.setAnalysis(null); this.ui.showBossUI(true);
    this.world.setDolly(0.4);
    const f0 = def.forms[def.steps[0].form], th = def.theme || f0.theme;
    this.world.setTheme(th); this.ui.setTheme(th);
    this.music.play(def.music || 'midboss', { fade: 0.8, immediate: true });
    this.ui.banner('MID BOSS', `${def.name}`, 2200);
    await sleep(1500); if (my !== this._token) return;
    const line = this.midLines(st).intro;
    if (line) await this.talk(line); if (my !== this._token) return;
    this.world.setDolly(0);
    this.state = 'fight'; this._actT = 0;
    M.startStep(0);
    await new Promise((res) => { this._midDone = res; });
    this._midDone = null;
  }

  midLines(st) {
    const k = st.mid === 'bellis' ? 'bellisMid' : st.mid === 'index' ? 'midIndex' : st.mid === 'lunarinth_mid' ? 'hellMid' : st.mid === 'apo_mid' ? 'apoMid' : null;
    return (k && SCRIPT[k]) || {};
  }

  /** 중간 보스 격파 연출 → 대사 → 방 정리 */
  async midClear(B) {
    const my = this._token, st = this.stageList[this.run.stageIdx];
    this.state = 'cutscene'; B.alive = true; B.vulnerable = false; this.clearBossField();
    this.music.stop(0.6); this.timeScale = 0.3;
    this.fx.burst(B.x, B.bobY, B.z, 50, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 10, size: 1.0, life: 1.1, up: 1.4 });
    this.fx.ring(B.x, B.bobY, B.z, 0xffffff, 18, 0.8); this.sfx.play('boss_down', { vol: 0.7 }); this.ui.flash('#ffffff', 600, 0.6);
    this.pickups.burst('p', B.x, B.z + 1, 8); this.pickups.burst('point', B.x, B.z + 1, 6);
    await sleep(700); if (my !== this._token) return;
    this.timeScale = 1; B.alphaT = 0; B.cancelAttack();
    await sleep(600); if (my !== this._token) return;
    const line = this.midLines(st).outro;
    if (line) await this.talk(line); if (my !== this._token) return;
    B.visible = false; this.ui.hideBark(); this.ui.showBossUI(false);
    const d = this._midDone; this._midDone = null; if (d) d();
  }

  /** 병사 웨이브 실행 (APOTHEOSIS 거미 무대): 스크립트가 끝나고 병사가 모두 사라지면 resolve */
  runWaves(st, part = 'a') {
    this.mobs.clear();
    this.stageRoutine = makeStageScript(this, st.id, part); this._stageWait = 0; this._stageAcc = 0;
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
      // 동방처럼: 단계를 깨면 파워 · 점수 아이템이 쏟아진다
      this.pickups.burst('p', B.x, B.z + 1.5, isSpell ? 6 : 3); this.pickups.burst('point', B.x, B.z + 1.5, isSpell ? 6 : 3);
      if (isSpell) {
        const capture = !this.run.stepHit && !this.run.stepUlt;
        this.stats.spellsCaptured += capture ? 1 : 0;
        if (capture) { this.player.score += 100000; this.pickups.burst('P', B.x, B.z + 1.5, 1); }
        this.ui.warn(capture ? '스킬 격파 — 노 미스·노 궁극기' : '스킬 격파', 1700);
      }
    } else {
      this.sfx.play(step.endure ? 'heal' : 'telegraph');
      this.ui.warn(step.endure ? '버텨냈습니다' : isSpell ? '스킬 시간 초과' : '통상 시간 초과', 1300);
      this.fx.ring(B.x, B.bobY, B.z, B.pal.glow, 10, 0.6);
    }
    if (!this.player.alive && this.sealed) this.player.revive(this);
    const nextFake = B.def.steps[i + 1] && B.def.steps[i + 1].fake;
    if (nextFake) { await this.fakeScene(B, i, nextFake); return; }
    if (nextUlt) { await this.fakeDefeat(B, i); return; }
    if (last) { if (B.isMid) this.midClear(B); else this.stageClear(B); return; }
    this.timeScale = 0.3; await sleep(500); this.timeScale = 1; if (my !== this._token) return;
    await sleep(ultimate ? 900 : 500); if (my !== this._token) return;
    const next = B.def.steps[i + 1];
    if (next.pre) await this.stepIntro(B, next);
    if (my !== this._token) return;
    this.state = 'fight';
    B.startStep(i + 1);
  }

  setMono(on) {
    document.body.classList.toggle('mono', on); Bullets.mono = on; Mobs.mono = on;
  }

  /** 쓰러진 척하는 연출 (무대 관리자 / 벨리스 뒤의 루나린스 잔상) → 숨은 마지막 단계 시작 */
  async fakeScene(B, i, kind) {
    const my = this._token;
    this.state = 'cutscene';
    this.sfx.play('boss_down'); this.ui.flash('#ffffff', 1100, 1); this.world.shake(1.0, 0.8);
    this.fx.burst(B.x, B.bobY, B.z, 50, { color: [0xffffff, B.pal.glow, B.pal.b], speed: 10, size: 1.0, life: 1.1, up: 1.4 });
    this.timeScale = 0.3; await sleep(700); this.timeScale = 1; if (my !== this._token) return;
    if (kind === 'manager') {
      this.music.stop(0.6); B.alphaT = 0.1; await sleep(1500); if (my !== this._token) return;
      B.alphaT = 1; this.sfx.play('twang'); this.world.setDolly(0.5);
      await this.talk(SCRIPT.apoManager.reveal); if (my !== this._token) return;
      this.ui.setBossHeader(B.def); this.world.setDolly(0);
      this.music.play('manager', { fade: 0.4, immediate: true });
      this.ui.banner('무대 관리자', '모든 대본의 난사 — 99초', 2600);
    } else {
      B.kick(0, 1.2); B.ghostForce = true; this.sfx.play('laugh', { vol: 0.5 });
      await sleep(800); if (my !== this._token) return;
      await this.talk(SCRIPT.bellisProxy); if (my !== this._token) return;
      this.ui.banner('빌려온 달', '99초를 버텨라', 2600);
    }
    this.state = 'fight';
    B.startStep(i + 1);
  }

  // ───── 해금 ─────
  isApoOpen() { return lsGet(APO_KEY) === '1'; }
  isApoDone() { return lsGet(APO_DONE) === '1'; }
  /** EXTRA · HELL 을 깨거나 암호를 넣으면 숨은 무대가 (다시) 열린다 */
  unlockApo() { lsSet(APO_DONE, null); lsSet(APO_KEY, '1'); this.ui.refreshExtra(); }
  isInfiniteUnlocked() { return lsGet(INF_KEY) === '1'; }
  unlockInfinite() { lsSet(INF_KEY, '1'); }

  /** APOTHEOSIS 종료: 대사 → 버튼은 다시 EXTRA 를 깰 때까지 숨는다 */
  async apoEnd(B) {
    const my = this._token;
    this.state = 'ending'; this.music.stop(1.5); B.alphaT = 0.3;
    this.ui.showHud(false); this.roomView.hideAll(); this.pickups.clear(); this.ui.setTags([]); this.ui.hint(null);
    await this.talk(SCRIPT.apoManager.outro); if (my !== this._token) return;
    lsSet(APO_DONE, '1'); lsSet(APO_KEY, null);
    this.ui.showEnding('APOTHEOSIS', '풀어진 직조기', '그 문은 처음부터 없었다');
    await sleep(6500); if (my !== this._token) return;
    this.ui.hideEnding(); this.toMenu();
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
    if (B.def.id === 'lunarinth') { this.music.setIntensity(1); this.sfx.play('laugh_big', { vol: 0.8 }); B.barkFor(B.def.id + 'Low'); }
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

  /** 층의 주인 격파 → 대사 → 유물 · 함정문 (마지막 층이면 엔딩) */
  async stageClear(B) {
    const my = this._token, idx = this.run.stageIdx, st = this.stageList[idx];
    this.state = 'stageclear'; B.alive = true; B.vulnerable = false;
    this.music.stop(1.2); this.sealed = false; this.ui.setSealed(false); this.player.alive = true;
    this.timeScale = 0.25; this.world.setDolly(0.6);
    if (B.step && B.step.kind === 'ultimate') { this.ui.flash('#ffffff', 1800, 1); this.world.shake(1.4, 1.2); }
    for (let k = 0; k < 14; k++) {
      this.fx.burst(B.x + (Math.random() - 0.5) * 3, B.bobY + (Math.random() - 0.5) * 3, B.z, 14, { color: [0xffffff, 0xfff1c9, B.pal.glow, B.pal.b], speed: 8, size: 1.0, life: 1.4, up: 1.4 });
      await sleep(130); if (my !== this._token) return;
    }
    this.timeScale = 1;
    if (this.run.apo) { await this.apoEnd(B); return; }
    B.alphaT = 0; B.scaleT = 1; this.world.setFall(null); this.veilLv = 0.98;
    this.world.setTheme('lumina'); this.ui.setTheme('lumina');
    await sleep(700); if (my !== this._token) return;
    this.music.play('victory', { fade: 2.0, immediate: true }); this.sfx.play('victory');
    await this.talk(SCRIPT[this.scriptKey(st)].outro); if (my !== this._token) return;
    B.visible = false; this.ui.hideBark(); this.ui.showBossUI(false);
    if (idx + 1 < this.stageList.length) {
      const room = this.room; room.cleared = true; this.roomCombat = false; room.data.trap = true;
      this.state = 'room'; this.roomView.setOpen(true); this.roomView.showTrap(true); this.ui.drawMap(this.floor, room);
      this.applyFloorLook(st);
      const owned = new Set(this.player.items), rid = RELIC[st.id];
      this.spawnItem('boss', 0, -4.2, rid && !owned.has(rid) ? { itemId: rid } : {});
      this.pickups.spawn({ type: 'heart', x: -2.6, z: -2 }); this.pickups.burst('coin', 2.6, -2, 3);
      this.chargeActive(2);
      this.ui.banner('FLOOR CLEAR', `${B.def.name} 격파 — 함정문이 열렸다`, 2400);
    } else {
      await this.runEnding();
    }
  }

  // ───── 엔딩 / 결과 ─────
  isExtraUnlocked() { return lsGet(EXTRA_KEY) === '1'; }
  unlockExtra() { lsSet(EXTRA_KEY, '1'); this.ui.refreshExtra(); }
  isHellUnlocked() { return lsGet(HELL_KEY) === '1'; }
  unlockHell() { lsSet(HELL_KEY, '1'); this.ui.refreshExtra(); }

  async runEnding() {
    const my = this._token;
    this.state = 'ending'; this.ui.showHud(false); this.ui.hideBark(); this.roomView.hideAll(); this.pickups.clear(); this.ui.setTags([]); this.ui.hint(null);
    const n = this.run.continues, ex = this.run.extra, hell = this.run.hell, E = hell ? (ENDINGS.HELL || ENDINGS.EX) : ex ? ENDINGS.EX : n === 0 ? ENDINGS.A : ENDINGS.B;
    this.world.setDolly(0);
    this.music.play('ending', { fade: 2.5, immediate: true });
    await this.talk(typeof E.lines === 'function' ? E.lines(n === 0 ? this.stats.ultDeaths : n) : E.lines); if (my !== this._token) return;
    this.ui.showEnding(E.title, E.name, E.sub);
    const notes = [];
    // 첫 클리어: 끝없는 복도의 상인이 나타나기 시작한다
    if (!ex && !this.isInfiniteUnlocked()) { this.unlockInfinite(); notes.push('끝없는 복도의 상인 「인피니트」가 휴식방에 나타나기 시작합니다'); }
    // EXTRA · HELL 을 깨면 숨은 무대가 (다시) 열린다
    if (ex && !this.run.apo) { const was = this.isApoOpen(); this.unlockApo(); if (!was) notes.push('……어딘가의 막이 다시 올라갔다'); }
    if (ex && !hell && !this.run.debugUsed && !this.isHellUnlocked()) { this.unlockHell(); notes.push('HELL 개방 — 타이틀에서 선택할 수 있습니다'); }
    // EXTRA 개방 조건: NORMAL 이상에서 노 컨티뉴 클리어
    const unlocked = !ex && n === 0 && this.run.diff.lv >= 1 && !this.run.debugUsed;
    if (unlocked && !this.isExtraUnlocked()) { this.unlockExtra(); notes.push('EXTRA 개방 — 타이틀에서 선택할 수 있습니다'); }
    notes.forEach((t, i) => setTimeout(() => this.ui.warn(t, 2800), 2600 + i * 3000));
    await sleep(6500 + Math.max(0, notes.length - 1) * 3000); if (my !== this._token) return;
    this.ui.hideEnding();
    const t = Math.round(this.fightT), P = this.player;
    this.ui.showResult(true, [
      ['난이도', this.run.diff.name], ['클리어 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`],
      ['점수', Math.floor(P.score).toLocaleString()], ['컨티뉴', `${n}회`], ['피격', this.stats.hits],
      ['물건', `${P.items.length}개${P.transforms.length ? ` · 변신 ${P.transforms.map((k) => TRANSFORMS[k].name).join(', ')}` : ''}`],
      ['스킬 격파 · 노미스 취득', `${this.stats.spellsCaptured} / ${this.stats.spellsSeen}`],
      ['얼티메이트 스킬', `돌파 ${this.stats.ultSurvived} · 쓰러짐 ${this.stats.ultDeaths}`],
      ['병사 격파', this.stats.mobs], ['그레이즈', this.stats.graze],
    ], ex ? `— ${this.run.diff.name} 클리어 —` : n === 0 ? '— 노 컨티뉴 클리어 —' : '— 컨티뉴 클리어 —');
    this.state = 'result';
  }

  async onPlayerDown() {
    if (!this.isPlayState()) return;
    const my = this._token;
    this.downFrom = this.state;
    this.state = 'defeat';
    const B = this.boss;
    if (this.downFrom === 'fight') { B.cancelAttack(); B.vulnerable = false; if (B.state === 'run' || B.state === 'declare') B.state = 'idle'; } // 패배 연출·컨티뉴 화면에서 보스가 멋대로 공격하지 않게 멈춘다
    this.timeScale = 0.2; this.world.shake(0.9, 0.8); this.music.stop(1.0);
    this.sfx.play('defeat'); this.ui.setVeil(0); this.ui.madness(false); this.ui.setBossTimer(null);
    this.fx.burst(this.player.x, 1, this.player.z, 40, { color: [0xffffff, 0xffd36b, 0xff7aa8], speed: 8, size: 0.9, life: 1.2 });
    await sleep(1100); if (my !== this._token) return;
    this.timeScale = 1;
    this.clearBossField();
    this.music.play('defeat', { fade: 2, immediate: true });
    const left = this.run.continuesMax - this.run.continues;
    if (this.run.debugInf) { this.state = 'continue'; this.ui.showContinue(left, this.run.continuesMax, true); }
    else if (left > 0) { this.state = 'continue'; this.ui.showContinue(left, this.run.continuesMax); }
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
    if (this.run.debugInf && this.run.continues >= this.run.continuesMax) this.run.debugUsed++; // 암호로 쓴 컨티뉴는 기록에 남기지 않는다
    else this.run.continues++;
    this.ui.hideContinue(); this.ui.setContinues(this.run.continues, this.run.continuesMax);
    // 모은 물건 · 파워는 그대로, 체력과 성광만 다시 채운다
    P.alive = true; P.hp = P.maxHp; P.inv = 3; P.ults = Math.max(P.ults, PLAYER.bombStart); P.ultT = 0;
    this.refreshHud();
    this.sfx.play('heal'); this.ui.flash('#ffffff', 600, 0.5);
    this.clearBossField(); this.timeScale = 1;
    const st = this.stageList[this.run.stageIdx];
    if (this.downFrom === 'stage') {
      this.mobs.clear(); this.state = 'stage'; this.music.play(st.stageMusic, { fade: 1.0, immediate: true });
    } else if (this.downFrom === 'room') {
      this.state = 'room'; this.music.play(st.stageMusic, { fade: 1.0, immediate: true });
    } else {
      this.state = 'fight';
      B.startStep(B.stepIdx, { quick: true }); // 현재 단계를 처음부터 다시
    }
  }

  async gameOver() {
    const my = this._token;
    this.ui.hideContinue(); this.state = 'gameover';
    await this.talk(this.run.hell ? (SCRIPT.gameoverHell || SCRIPT.gameoverExtra) : this.run.extra ? SCRIPT.gameoverExtra : SCRIPT.gameover); if (my !== this._token) return;
    const t = Math.round(this.fightT), st = this.stageList[this.run.stageIdx], P = this.player;
    this.ui.showResult(false, [
      ['난이도', this.run.diff.name], ['도달', this.run.special ? `${st.label} — ${st.place}` : `${this.run.stageIdx + 1}층 — ${st.place}`],
      ['버틴 시간', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`], ['점수', Math.floor(P.score).toLocaleString()],
      ['물건', `${P.items.length}개`], ['컨티뉴 사용', this.run.extra ? '불가' : `${this.run.continues}회`], ['병사 격파', this.stats.mobs], ['그레이즈', this.stats.graze],
    ], 'GAME OVER');
    this.state = 'result';
  }

  // ───── 플레이어 궁극기(성광) ─────
  canUlt() { return (this.state === 'stage' || this.state === 'room' || (this.state === 'fight' && this.boss.state !== 'between')) && !this.ultBusy && !this.sealed; }

  async useUlt(saved) {
    const P = this.player, B = this.boss;
    if (this.ultBusy || this.sealed) return;
    this.ultBusy = true;
    const inStage = this.state !== 'fight';
    const mode = inStage || !B.step ? 'normal' : (B.step.ultMode || 'normal');
    this.stats.ults++; this.run.stepUlt = true;
    this.sfx.play('ult_declare');
    const U = PLAYER_ULT.claire;
    this.ui.declare({ who: 'claire', kind: 'ult', tag: U.tag, name: U.name, side: 'left' });
    this.timeScale = 0;
    await sleep(720);
    this.timeScale = 1;
    if (!['fight', 'between', 'stage', 'room'].includes(this.state)) { this.ultBusy = false; return; }
    this.sfx.play('ult');
    P.beginUlt(this, mode);
    if (!inStage) {
      if (mode === 'reject') { this.ui.warn('리젝트 — 궁극기가 무효화되었습니다', 1800); B.barkFor(B.def.id + 'Ult'); }
      else if (mode === 'immune') { this.ui.warn('면역 — 이 스킬에는 궁극기가 통하지 않습니다', 1800); }
      else if (mode === 'resist') { this.ui.warn('저항 — 궁극기 피해가 크게 줄어듭니다', 1500); if (Math.random() < 0.6) B.barkFor(B.def.id + 'Ult'); }
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
    if (p && !this.isPlayState()) return;
    this.paused = p; if (p) this.ui.setPauseItems(this.player); this.ui.showPause(p);
    this.sfx.play(p ? 'pause' : 'unpause');
    if (p) this.engine.suspend(); else this.engine.resume();
    if (!p) this.ui.modal('#m-settings', false);
  }

  // ───── 충돌 ─────
  /** 플레이어 탄이 적에게 닿음: 관통 · 분열 · 폭발 · 연쇄 · 독 · 감속. 탄이 소모되면 true */
  _bulletHit(b, tgt, isBoss) {
    const key = isBoss ? 'boss' : tgt.uid;
    if (b.hitSet && b.hitSet.has(key)) return false;
    const P = this.player;
    if (isBoss) tgt.damage(b.dmg, this, b.x, b.z); else this.mobs.damage(tgt, b.dmg, b.x, b.z);
    if (b.poison) { tgt.poisonT = 3; tgt.poisonD = Math.max(tgt.poisonD || 0, b.poison * 2.4 * P.st.dmg); }
    if (b.slowHit && !isBoss) tgt.slowT = 2;
    if (b.explodeR) this._explode(b.x, b.z, b.explodeR, b.dmg * 0.6);
    if (b.chainN) this._chain(tgt, b.chainN, b.dmg * 0.55);
    if (b.split > 0) {
      const a = Math.atan2(b.vz, b.vx);
      for (const s of [-0.6, 0.6]) { const c = P._spawn(this, b.x, b.z, a + s, b.dmg * 0.5, { size: 0.55 * P.st.size, split: 0 }); if (c) { c.split = 0; c.hitSet = new Set([key]); } }
      b.split = 0;
    }
    if (b.pierceLeft > 0) { b.pierceLeft--; (b.hitSet || (b.hitSet = new Set())).add(key); return false; }
    this.bullets.kill(b); return true;
  }
  _explode(x, z, r, dmg) {
    for (const m of this.mobs.list) if (m.alive && (m.x - x) ** 2 + (m.z - z) ** 2 < (r + m.hr) ** 2) this.mobs.damage(m, dmg, x, z, true);
    const B = this.boss; if (this.state === 'fight' && B.alive && B.visible && B.vulnerable && (B.x - x) ** 2 + (B.z - z) ** 2 < (r + B.hitR) ** 2) B.damage(dmg, this, x, z, true);
    if (Math.random() < 0.5) { this.fx.ring(x, 0.9, z, 0xffb060, r * 2, 0.3); this.fx.burst(x, 1, z, 4, { color: [0xffd0a0, 0xffffff], speed: 4, size: 0.5, life: 0.3 }); }
  }
  _chain(from, n, dmg) {
    const hit = new Set([from.uid]); let cur = from;
    for (let k = 0; k < n; k++) {
      let best = null, bd = 25;
      for (const m of this.mobs.list) if (m.alive && !hit.has(m.uid)) { const d = (m.x - cur.x) ** 2 + (m.z - cur.z) ** 2; if (d < bd) { bd = d; best = m; } }
      if (!best) break;
      hit.add(best.uid);
      for (let i = 1; i <= 5; i++) this.fx.emit({ x: cur.x + (best.x - cur.x) * i / 5 + (Math.random() - 0.5) * 0.3, y: 1.4, z: cur.z + (best.z - cur.z) * i / 5, life: 0.2, s0: 0.6, s1: 0, color: 0x9fd8ff, tex: 'spark' });
      this.mobs.damage(best, dmg, best.x, best.z, true); cur = best;
    }
  }
  _poison(dt) {
    const tick = (e, isBoss) => {
      if (!(e.poisonT > 0)) return;
      e.poisonT -= dt; e.poisonAcc = (e.poisonAcc || 0) + dt;
      if (e.poisonAcc >= 0.5) { e.poisonAcc = 0; if (isBoss) { if (e.vulnerable) e.damage(e.poisonD * 0.5, this, e.x, e.z, true); } else this.mobs.damage(e, e.poisonD * 0.5, e.x, e.z, true); this.fx.emit({ x: e.x, y: 1.6, z: e.z, life: 0.5, s0: 0.6, s1: 0, color: 0x8aff6a, tex: 'orb', vy: 1 }); }
    };
    for (const m of this.mobs.list) if (m.alive) tick(m, false);
    if (this.state === 'fight' && this.boss.alive) tick(this.boss, true);
  }

  collide(dt) {
    const P = this.player, B = this.boss, bl = this.bullets.list;
    const hr0 = PLAYER.hr, gr0 = PLAYER.grazeR, bossOn = this.state === 'fight' && B.alive && B.visible;
    for (const b of bl) {
      if (!b.active || b.delay > 0 || (b.owner === 'boss' && b.age < b.armAt)) continue;
      if (b.owner === 'player') {
        let used = false;
        for (const m of this.mobs.list) {
          if (!m.alive) continue;
          if ((b.x - m.x) ** 2 + (b.z - m.z) ** 2 < (m.hr + b.hr) ** 2) { if (this._bulletHit(b, m, false)) { used = true; break; } }
        }
        if (used || !b.active) continue;
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
        if (bossOn && (b.x - B.x) ** 2 + (b.z - B.z) ** 2 < (B.hitR * B.scaleK + b.hr) ** 2) this._bulletHit(b, B, true);
        continue;
      }
      // 적 탄 → 플레이어
      const dx = b.x - P.x, dz = b.z - P.z, d2 = dx * dx + dz * dz;
      const hr = b.hr + hr0;
      if (d2 < hr * hr) {
        if (P.hurt(this)) this.bullets.kill(b);
        continue;
      }
      // 그레이즈
      if (!b.grazed && d2 < (b.hr + gr0) ** 2 && !P.safe) {
        b.grazed = true; this.stats.graze++; P.score += 50;
        this.ui.setGraze(this.stats.graze);
        this.sfx.play('graze', { pan: this.audio.pan(P.x) });
        this.fx.emit({ x: b.x, y: 1.0, z: b.z, life: 0.25, s0: 0.6, s1: 0, color: 0xffffff, tex: 'spark' });
        if (P.flags.grazePower && P.power < 4) { if (P.addPower(0.01 * P.flags.grazePower)) this.onPowerUp(); }
        if (B.onGraze && this.state === 'fight') B.onGraze();
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
    if (this.run.apo && this.isPlayState() && input.take('pause')) {
      // APOTHEOSIS: 멈출 수 없다. 오히려 5초간 조작이 뒤집힌다.
      this.player.invertT = 5; this.ui.warn('실이 몸을 틀어쥔다 — 나갈 수 없다', 1800); this.sfx.play('glitch', { vol: 0.8 }); this.ui.flash('#ffffff', 300, 0.3);
    }
    if (input.take('pause')) {
      if (!document.getElementById('m-settings').hidden && this.paused) this.ui.modal('#m-settings', false);
      else if (this.isPlayState() || this.paused) this.setPause(!this.paused);
    }
    if (this.paused) { this._render(rawDt, 0); input.endFrame(); return; }

    const dt = rawDt * this.timeScale;
    const active = ['fight', 'stage', 'room', 'between', 'banner', 'stageclear', 'defeat', 'cutscene', 'ending', 'continue', 'gameover', 'result'].includes(this.state);
    if (active) this.simulate(dt, rawDt);
    this._render(rawDt, dt);
    input.endFrame();
  }

  simulate(dt, rawDt) {
    const P = this.player, B = this.boss, st = this.state;
    const fighting = st === 'fight', staging = st === 'stage', rooming = st === 'room', play = fighting || staging || rooming;
    const canControl = play || st === 'between' || st === 'cutscene' || st === 'stageclear';
    if (canControl) P.update(dt, this.input, this, play || st === 'between');
    if (play) this.fightT += rawDt;
    const frozen = this.freezeT > 0;
    if (frozen) { this.freezeT -= dt; if (this.freezeT <= 0) { this.freezeT = 0; document.body.classList.remove('timestop'); } }
    if (staging) this._stepStage(dt);
    if (rooming) this._stepRoom(dt);
    if (st !== 'menu') B.update(frozen ? 0 : dt);
    this.mobs.update(dt, this);
    const tg = this.nearestEnemy(P.x, P.z, 40) || B;
    this.bullets.update(dt, P.x, P.z, this.fx, tg.x, tg.z, frozen);
    if (play) this.collide(dt);
    if (canControl) this.pickups.update(dt, this);
    this.skills.update(dt);
    this._poison(dt);
    this.roomView.update(rawDt);
    this.flyers.update(dt, this.fx);
    this.fx.update(dt);
    // 보스전 중에는 시간에 따라 액티브가 천천히 충전된다
    if (fighting && P.active && P.active.charge < P.active.max) { this._actT += dt; if (this._actT >= 18) { this._actT = 0; this.chargeActive(1); } }

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
      if (B.step.kind === 'ultimate' || B.step.endure) this.ui.setBoss(Math.max(0, B.timeLeft / B.step.time)); // 얼티메이트 · 버티기는 남은 시간이 게이지
    }
    this._hudT = (this._hudT || 0) - rawDt;
    if (this._hudT <= 0) { this._hudT = 0.12; this.ui.setRogue(P); }
  }

  /** 상점 가격표 · 발밑 물건 설명 */
  _renderTags() {
    const P = this.player, show = this.state === 'room' || this.state === 'fight' || this.state === 'stage';
    if (!show) { if (this._tagsOn) { this._tagsOn = false; this.ui.setTags([]); this.ui.hint(null); } return; }
    this._tagsOn = true;
    const tags = []; let near = null, nd = 5;
    for (const p of this.pickups.list) {
      if (!p.active) continue;
      if (p.shop && p.price > 0) {
        const isItem = p.type === 'item', [sx, sy] = this.world.project(p.x, isItem ? 0.25 : 0.1, p.z + (isItem ? 1.15 : 0.7)), c = this.priceOf(p);
        tags.push({ x: sx, y: sy, text: `◎ ${c}`, cls: P.coins < c ? 'poor' : p.seller === 'infinite' ? 'inf' : '' });
      }
      if (p.type === 'item') { const d = (p.x - P.x) ** 2 + (p.z - P.z) ** 2; if (d < nd) { nd = d; near = p; } }
    }
    this.ui.setTags(tags);
    if (near) { const it = ITEM_BY_ID[near.itemId], R = RARITY[it.rarity]; this.ui.hint(`<b style="color:${R.color}">${it.name}</b> <small>${R.name}${it.active ? ' · 액티브(C)' : ''}</small><br>${it.desc}`); }
    else this.ui.hint(null);
  }

  _render(rawDt, dt) {
    const P = this.player, B = this.boss;
    this.world.update(rawDt, P.x);
    P.render(rawDt, this.t);
    const showP = this.state !== 'menu'; P.spr.visible = P.shadow.visible = P.core.visible = P.dotRim.visible = showP;
    P.focusRing.visible = showP;
    for (const b of Object.values(this.bosses)) { if (b === B) b.render(rawDt, this.t); else { b.visible = false; b.alpha = 0; b.render(rawDt, this.t); } }
    if (!this.ui.el.bubble.hidden && B.visible) { const [sx, sy] = this.world.project(B.x, B.bobY + B.h * 0.67 * B.scaleK, B.z); this.ui.moveBark(sx, sy); }
    this.ui.setVeil(this.veilV * this.veilLv, ...this.world.project(P.x, 1.0, P.z));
    this._renderTags();
    this.world.render();
    void dt;
  }
}

export { PAL, ITEMS };
