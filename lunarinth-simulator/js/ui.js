// DOM 기반 UI: HUD, 대사창, 배너, 말풍선, 모달, 설정집.
import { OFFICIAL, MOVES, PHASES } from './lore.js';

const $ = (s) => document.querySelector(s);
const HEART = `<svg viewBox="0 0 32 32"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs><path fill="url(#hg)" stroke="rgba(255,255,255,.8)" stroke-width="1.2" d="M22 3a13 13 0 1 0 0 26 10.5 10.5 0 1 1 0-26z"/></svg>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class UI {
  constructor({ audio, sfx, settings }) {
    this.audio = audio; this.sfx = sfx; this.settings = settings;
    this.el = {
      hud: $('#hud'), fill: $('#bb-fill'), ghost: $('#bb-ghost'), form: $('#bb-form'), title: $('#bb-title'),
      hearts: $('#hearts'), dash: $('#sk-dash'), parry: $('#sk-parry'), graze: $('#st-graze'), time: $('#st-time'),
      warn: $('#warn'), bubble: $('#bubble'), banner: $('#banner'), dialog: $('#dialog'),
      dName: $('#d-name'), dText: $('#d-text'), dCanvas: $('#d-canvas'), dPortrait: document.querySelector('.d-portrait'),
      flash: $('#fx-flash'), veil: $('#fx-veil'), menu: $('#menu'),
    };
    this.on = {};
    this.heartCount = 0;
    this.portraits = {};
    this._dlg = null;
    this._warnT = 0; this._bubT = 0;
    this._bindMenus();
    this._buildCodex();
  }

  // ───── 메뉴/모달 ─────
  _bindMenus() {
    const sfx = this.sfx;
    document.addEventListener('mouseover', (e) => { if (e.target.closest && e.target.closest('button')) sfx.play('ui_hover'); });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx.play('ui_click'); });
    $('#btn-start').onclick = () => this.on.start && this.on.start();
    $('#btn-codex').onclick = () => this.modal('#m-codex', true);
    $('#btn-settings').onclick = () => this.modal('#m-settings', true);
    $('#btn-help').onclick = () => this.modal('#m-help', true);
    document.querySelectorAll('.modal .close').forEach((b) => { b.onclick = () => this.modal('#' + b.closest('.modal').id, false); });
    $('#btn-resume').onclick = () => this.on.resume && this.on.resume();
    $('#btn-pause-settings').onclick = () => this.modal('#m-settings', true);
    $('#btn-pause-menu').onclick = () => this.on.toMenu && this.on.toMenu();
    $('#btn-retry').onclick = () => this.on.retry && this.on.retry();
    $('#btn-result-menu').onclick = () => this.on.toMenu && this.on.toMenu();

    const A = this.audio, S = this.settings;
    for (const k of ['master', 'music', 'sfx']) {
      const inp = $('#v-' + k), out = inp.parentElement.querySelector('output');
      inp.value = Math.round(A.vol[k] * 100); out.textContent = inp.value;
      inp.oninput = () => { A.setVolume(k, inp.value / 100); out.textContent = inp.value; if (k === 'sfx') sfx.play('ui_click'); };
    }
    const bind = (id, key, audio) => {
      const el = $(id); el.checked = audio ? A.muted : S[key];
      el.onchange = () => { if (audio) A.setMuted(el.checked); else { S[key] = el.checked; S.save(); document.body.classList.toggle('calm', S.calm); } };
    };
    bind('#o-mute', null, true); bind('#o-auto', 'auto'); bind('#o-shake', 'shake'); bind('#o-calm', 'calm');
    document.body.classList.toggle('calm', S.calm);
  }

  modal(sel, show) { $(sel).hidden = !show; }
  anyModalOpen() { return [...document.querySelectorAll('.modal')].some((m) => !m.hidden); }
  closeModals() { document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; }); }

  _buildCodex() {
    const O = OFFICIAL;
    const tag = (t) => `<span class="tag ${t === 'off' ? 'off' : 'prop'}">${t === 'off' ? '공식 설정' : '창작 제안'}</span>`;
    const li = (a) => a.map((x) => `<li>${x}</li>`).join('');
    const props = Object.values(MOVES).map((m) => `<li>${m}</li>`).join('');
    $('#codex-body').innerHTML = `
      <h3>정체성 ${tag('off')}</h3>
      <ul><li><b>${O.name}</b> — ${O.rank}</li><li>신격: ${O.divinity} · 상징: ${O.symbol}</li></ul>
      <h3>외형 ${tag('off')}</h3><ul>${li(O.look)}</ul>
      <h3>성격 ${tag('off')}</h3><p>${O.personality}</p>
      <h3>삼위일체 ${tag('off')}</h3>
      <p class="note">${O.note}</p>
      ${O.forms.map((f) => `<div class="form"><b>${f.name}</b> — ${f.moon} · ${f.theme}<ul>${li(f.notes)}</ul></div>`).join('')}
      <h3>공통 능력 ${tag('off')}</h3><ul>${li(O.abilities)}</ul>
      <h3>루센트 저택 ${tag('off')}</h3><ul>${O.house.map(([a, b]) => `<li><b>${a}</b> — ${b}</li>`).join('')}</ul>
      <h3>이 게임의 연출 ${tag('prop')}</h3>
      <p class="note">형태 순서(LUMINA → UMBRA → LUNA), 아래 기술명과 공격 패턴, 대사는 이 게임을 위한 <b>창작 제안</b>이며 공식 설정이 아닙니다.
      미확정인 LUMINA / UMBRA의 고유 기술도 공식으로 확정하지 않았습니다. 플레이어 캐릭터는 루나린스를 징벌하러 온 성검사 클레르이며, “성검을 해방한 것은 루나린스가 처음”이라는 전제는 이 게임의 창작 설정입니다.</p>
      <ul>${props}</ul>`;
  }

  showMenu(show) { this.el.menu.hidden = !show; document.body.dataset.screen = show ? 'menu' : 'play'; }
  showHud(show) { this.el.hud.hidden = !show; }

  // ───── HUD ─────
  setTheme(id) { document.body.dataset.phase = id; }
  setBoss(ratio, phaseIdx) {
    this.el.fill.style.width = (Math.max(0, ratio) * 100).toFixed(2) + '%';
    this.el.ghost.style.width = (Math.max(0, ratio) * 100).toFixed(2) + '%';
    if (phaseIdx != null) { const p = PHASES[phaseIdx]; this.el.form.textContent = p.form; this.el.title.textContent = p.title; }
  }
  setBossInstant(ratio) {
    this.el.ghost.style.transition = 'none'; this.el.fill.style.transition = 'none';
    this.setBoss(ratio);
    void this.el.ghost.offsetWidth;
    this.el.ghost.style.transition = ''; this.el.fill.style.transition = '';
  }
  setHearts(hp, max) {
    const h = this.el.hearts;
    if (this.heartCount !== max) { h.innerHTML = Array.from({ length: max }, () => `<div class="heart">${HEART}</div>`).join(''); this.heartCount = max; }
    [...h.children].forEach((c, i) => {
      const lost = i >= hp;
      if (c.classList.contains('lost') !== lost) { c.classList.toggle('lost', lost); if (!lost) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } }
    });
  }
  setSkill(which, ratio) { // ratio: 0 = 준비됨, 1 = 쿨다운 시작
    const sk = which === 'dash' ? this.el.dash : this.el.parry;
    const ring = sk.querySelector('.ring');
    ring.style.strokeDashoffset = (125.7 * ratio).toFixed(1);
    const cd = ratio > 0.001;
    if (sk._cd && !cd) { sk.classList.remove('ready-flash'); void sk.offsetWidth; sk.classList.add('ready-flash'); }
    sk._cd = cd; sk.classList.toggle('cd', cd);
  }
  setGraze(n) { this.el.graze.textContent = n; }
  setTime(s) { const m = Math.floor(s / 60); this.el.time.textContent = `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

  warn(text, ms = 1600) {
    const w = this.el.warn; w.textContent = text; w.classList.add('show');
    clearTimeout(this._warnT); this._warnT = setTimeout(() => w.classList.remove('show'), ms);
  }
  bark(text, x, y, ms = 1700) {
    const b = this.el.bubble; b.textContent = text; b.style.left = x + 'px'; b.style.top = y + 'px'; b.hidden = false;
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bubT); this._bubT = setTimeout(() => { b.hidden = true; }, ms);
  }
  moveBark(x, y) { if (!this.el.bubble.hidden) { this.el.bubble.style.left = x + 'px'; this.el.bubble.style.top = y + 'px'; } }
  hideBark() { this.el.bubble.hidden = true; }

  flash(color = '#fff', ms = 500, peak = 0.85) {
    if (this.settings.calm) peak *= 0.35;
    const f = this.el.flash; f.style.background = color;
    f.animate([{ opacity: peak }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }
  setVeil(strength, sx, sy) {
    this.el.veil.style.opacity = strength;
    if (sx != null) { this.el.veil.style.setProperty('--px', sx + 'px'); this.el.veil.style.setProperty('--py', sy + 'px'); }
  }
  madness(on) { document.body.classList.toggle('madness', on); }

  async banner(form, title, ms = 3200) {
    const b = this.el.banner;
    b.querySelector('.b-form').textContent = form; b.querySelector('.b-title').textContent = title;
    b.hidden = true; void b.offsetWidth; b.hidden = false;
    await sleep(ms); b.hidden = true;
  }

  // ───── 대사 ─────
  setPortraits(map) { this.portraits = map; }
  _paintPortrait(who) {
    const cv = this.el.dCanvas, g = cv.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const p = this.portraits[who];
    if (!p) return;
    if (p.kind === 'img') g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, 0, 0, 256, 256);
    else g.drawImage(p.canvas, 0, 0, 256, 256);
  }

  /** lines 를 순서대로 타자 효과로 보여주고 끝나면 resolve. Esc는 전체 건너뛰기. */
  playDialogue(lines, hooks = {}) {
    return new Promise((resolve) => {
      let i = 0, typing = false, full = '', pos = 0, timer = 0, done = false;
      const d = this.el.dialog, nameEl = this.el.dName, textEl = this.el.dText;
      const names = { luna: '루나린스', claire: '클레르 · 초대 하녀장', narr: '' };
      d.hidden = false;
      const finish = () => {
        if (done) return; done = true; clearInterval(timer);
        window.removeEventListener('keydown', onKey); d.removeEventListener('click', advance);
        d.hidden = true; resolve();
      };
      const show = () => {
        const ln = lines[i];
        if (!ln) return finish();
        nameEl.textContent = names[ln.who] || '';
        textEl.className = 'd-text' + (ln.who === 'narr' ? ' narr' : '');
        this.el.dPortrait.classList.toggle('narr', ln.who === 'narr');
        this._paintPortrait(ln.who);
        full = ln.text; pos = 0; typing = true; textEl.textContent = '';
        if (hooks.onLine) hooks.onLine(ln, i);
        clearInterval(timer);
        timer = setInterval(() => {
          pos++; textEl.textContent = full.slice(0, pos);
          if (pos % 2 === 0 && full[pos - 1] !== ' ') this.sfx.play('blip_' + ln.who);
          if (pos >= full.length) { typing = false; clearInterval(timer); }
        }, ln.who === 'luna' && /키+킥|키키/.test(ln.text) ? 34 : 38);
      };
      const advance = () => {
        if (typing) { clearInterval(timer); typing = false; textEl.textContent = full; return; }
        i++; show();
      };
      const onKey = (e) => {
        if (e.code === 'Escape') { e.preventDefault(); finish(); return; }
        if (['Enter', 'Space', 'KeyZ', 'KeyJ'].includes(e.code)) { e.preventDefault(); if (!e.repeat) advance(); }
      };
      window.addEventListener('keydown', onKey);
      d.addEventListener('click', advance);
      show();
    });
  }

  showResult(win, rows) {
    $('#r-title').textContent = win ? '달이 저물었습니다' : '밤은 아직 끝나지 않았습니다';
    $('#r-stats').innerHTML = rows.map(([k, v]) => `${k} <b>${v}</b>`).join('<br>');
    $('#m-result').hidden = false;
  }
  hideResult() { $('#m-result').hidden = true; }
  showPause(show) { $('#m-pause').hidden = !show; }
}
