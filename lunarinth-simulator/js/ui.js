// DOM 기반 UI: 타이틀·난이도/캐릭터 선택, HUD, 대사창, 스킬 선언 컷인, 컨티뉴/엔딩/결과, 설정집.
import { OFFICIAL, ROSTER, DIFFS, CHARS, NAMES, STORY, MOB_NOTE, EXTRA, EXTRA_DIFF, HELL_DIFF } from './lore.js';
import { OPSIR } from './bosses/opsir.js';
import { ASTRA } from './bosses/astra.js';
import { TRAMONT } from './bosses/tramont.js';
import { INDEX } from './bosses/indexer.js';
import { BELLIS } from './bosses/bellis.js';
import { ARKESIA } from './bosses/arkesia.js';
import { LUNARINTH } from './bosses/lunarinth.js';

const $ = (s) => document.querySelector(s);
const STAR = `<svg viewBox="0 0 32 32"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs><path fill="url(#hg)" stroke="rgba(255,255,255,.85)" stroke-width="1.2" d="M22 3a13 13 0 1 0 0 26 10.5 10.5 0 1 1 0-26z"/></svg>`;
const GEM = `<svg viewBox="0 0 24 24"><path d="M12 1 L21 12 L12 23 L3 12 Z" fill="currentColor" stroke="rgba(255,255,255,.85)" stroke-width="1.2"/></svg>`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KIND_LABEL = { nonspell: '전초', spell: '술식', last: '최종 술식', ult: '성광', ultimate: '달의 오의' };
const SPELL_TAG = (st) => `${st.tag ? st.tag + ' ' : ''}「${st.name}」`;

export class UI {
  constructor({ audio, sfx, settings }) {
    this.audio = audio; this.sfx = sfx; this.settings = settings;
    this.el = {
      hud: $('#hud'), fill: $('#bb-fill'), ghost: $('#bb-ghost'), form: $('#bb-form'), pips: $('#bb-pips'), bname: $('#bb-name'), bepi: $('#bb-epi'),
      timer: $('#bb-timer'), spell: $('#spellname'), stars: $('#stars'), gems: $('#ult-gems'), graze: $('#st-graze'), cont: $('#st-cont'),
      warn: $('#warn'), bubble: $('#bubble'), banner: $('#banner'), announce: $('#announce'), dialog: $('#dialog'),
      dName: $('#d-name'), dText: $('#d-text'), dCanvas: $('#d-canvas'), dPortrait: document.querySelector('.d-portrait'),
      flash: $('#fx-flash'), veil: $('#fx-veil'), menu: $('#menu'), declare: $('#declare'), dcCanvas: $('#dc-canvas'),
      ending: $('#ending'), selDiff: $('#sel-diff'), selChar: $('#sel-char'),
      ana: $('#bb-ana'), anaFill: $('#ana-fill'), anaNum: $('#ana-num'),
    };
    this.on = {};
    this.starCount = 0; this.gemCount = 0;
    this.portraits = {};
    this._warnT = 0; this._bubT = 0; this._annT = 0; this._dcT = 0;
    this.screen = null; this.diffIdx = 1; this.charIdx = 0; this.pickedDiff = DIFFS[1]; this.extraMode = false;
    this.craftUnlocked = (id) => id === 'claire';
    this._kbuf = '';
    try { const d = localStorage.getItem('lunarinth.lastdiff'); if (d != null && DIFFS[+d]) this.diffIdx = +d; } catch (e) { /* noop */ }
    this._bindMenus();
    this._buildSelects();
    this._buildCodex();
    this._bindKeys();
    this._titleFx();
    this.refreshExtra();
  }

  // ───── 메뉴/모달 ─────
  _bindMenus() {
    const sfx = this.sfx;
    document.addEventListener('mouseover', (e) => { if (e.target.closest && e.target.closest('button')) sfx.play('ui_hover'); });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx.play('ui_click'); });
    $('#btn-start').onclick = () => this.openSelect('diff');
    $('#btn-extra').onclick = () => {
      if (this.extraUnlocked()) { this.extraMode = true; this.pickedDiff = EXTRA_DIFF; this.openSelect('char'); }
      else { this.warn(`EXTRA 잠김 — ${EXTRA.unlock}`, 3200, true); this.sfx.play('hurt', { vol: 0.25 }); }
    };
    $('#btn-hell').onclick = () => { if (this.hellUnlocked()) { this.extraMode = true; this.pickedDiff = HELL_DIFF; this.openSelect('char'); } };
    $('#btn-codex').onclick = () => this.modal('#m-codex', true);
    $('#btn-settings').onclick = () => this.modal('#m-settings', true);
    $('#btn-help').onclick = () => this.modal('#m-help', true);
    document.querySelectorAll('.modal .close').forEach((b) => { b.onclick = () => this.modal('#' + b.closest('.modal').id, false); });
    $('#btn-resume').onclick = () => this.on.resume && this.on.resume();
    $('#btn-pause-settings').onclick = () => this.modal('#m-settings', true);
    $('#btn-pause-menu').onclick = () => this.on.toMenu && this.on.toMenu();
    $('#btn-retry').onclick = () => this.on.retry && this.on.retry();
    $('#btn-result-menu').onclick = () => this.on.toMenu && this.on.toMenu();
    $('#btn-cont-yes').onclick = () => this.on.continueYes && this.on.continueYes();
    $('#btn-cont-no').onclick = () => this.on.continueNo && this.on.continueNo();

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
    bind('#o-mute', null, true); bind('#o-shake', 'shake'); bind('#o-calm', 'calm');
    // 테스터용 암호: 입력하면 컨티뉴 무제한 (EXTRA 제외)
    const pw = $('#o-pass');
    if (pw) pw.oninput = () => {
      const v = pw.value.trim().toLowerCase(), on = v === 'lunacute';
      if (on !== !!this._dbg) { this._dbg = on; this.on.debugInf && this.on.debugInf(on); }
      if (v === 'lunaugly' && !this.hellUnlocked()) { this.on.unlockHell && this.on.unlockHell(); }
    };
    document.body.classList.toggle('calm', S.calm);
  }

  modal(sel, show) { $(sel).hidden = !show; }
  anyModalOpen() { return [...document.querySelectorAll('.modal')].some((m) => !m.hidden); }
  closeModals() { document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; }); }

  // ───── 난이도 / 캐릭터 선택 ─────
  _buildSelects() {
    const dc = $('#diff-cards');
    dc.innerHTML = DIFFS.map((d, i) => `
      <button class="card diff" data-i="${i}" style="--c:${d.color}">
        <span class="c-en">${d.name}</span><span class="c-kr">${d.kr}</span><span class="c-sub">${d.sub}</span>
        <span class="c-bars"><i style="--v:${Math.min(1, d.cnt / 1.7)}"></i><i style="--v:${Math.min(1, (d.spd - 0.7) / 0.6)}"></i><i style="--v:${Math.min(1, (d.hp - 0.7) / 0.6)}"></i></span>
        <span class="c-bl"><em>탄수</em><em>탄속</em><em>체력</em></span>
      </button>`).join('');
    dc.querySelectorAll('.card').forEach((b) => {
      b.onclick = () => { this.diffIdx = +b.dataset.i; this._paintDiff(); this.confirm(); };
      b.onmouseenter = () => { this.diffIdx = +b.dataset.i; this._paintDiff(); };
    });
    const cc = $('#char-cards');
    cc.innerHTML = CHARS.map((c, i) => `
      <button class="card char ${c ? '' : 'empty'}" data-i="${i}">
        <span class="c-art"><canvas width="220" height="260"></canvas></span>
        <span class="c-en">${c ? c.name : '— — —'}</span><span class="c-kr">${c ? c.kr : '준비 중'}</span>
      </button>`).join('');
    this.refreshChars();
    cc.querySelectorAll('.card').forEach((b) => {
      b.onclick = () => { this.charIdx = +b.dataset.i; this._paintChar(); this.confirm(); };
      b.onmouseenter = () => { this.charIdx = +b.dataset.i; this._paintChar(); };
    });
    this._paintDiff(); this._paintChar();
  }

  _paintDiff() {
    document.querySelectorAll('#diff-cards .card').forEach((b, i) => b.classList.toggle('sel', i === this.diffIdx));
    const d = DIFFS[this.diffIdx];
    $('#diff-desc').innerHTML = `<b style="color:${d.color}">${d.name} — ${d.kr}</b><br>${d.sub}<br><small>탄수 ×${d.cnt} · 탄속 ×${d.spd} · 보스 체력 ×${d.hp} · 내 체력 ${d.php}${d.lv >= 2 ? ' · 추가 패턴 있음' : ''}</small>`;
  }
  refreshChars() {
    document.querySelectorAll('#char-cards .card').forEach((b, i) => { const c = CHARS[i]; b.classList.toggle('locked', !!c && !this.craftUnlocked(c.id)); });
    if (this.screen === 'char') this._paintCharArt();
  }
  _paintChar() {
    document.querySelectorAll('#char-cards .card').forEach((b, i) => b.classList.toggle('sel', i === this.charIdx));
    const c = CHARS[this.charIdx];
    if (c && !this.craftUnlocked(c.id)) { $('#char-desc').innerHTML = `<b>${c.name}</b> — 잠김<br><small>${c.id === 'astra' ? '2스테이지의 아스트라를 처음 쓰러뜨리면 사용할 수 있습니다. (난이도 무관)' : ''}</small>`; return; }
    $('#char-desc').innerHTML = c ? `<b>${c.name}</b> — ${c.kr}<br>${c.desc}<br><small>${c.shot}<br>궁극기: ${c.ult[0]} 「${c.ult[1]}」</small>` : '<b>빈 슬롯</b><br><small>아직 사용할 수 없습니다. (추후 추가 예정)</small>';
  }
  _paintCharArt() {
    document.querySelectorAll('#char-cards .card').forEach((card, i) => {
      const c = CHARS[i], cv = card.querySelector('canvas'), p = c && this.full && this.full[c.img]; if (!cv) return;
      const g = cv.getContext('2d'); g.clearRect(0, 0, 220, 260);
      if (!c) return;
      if (p) { const k = Math.min(200 / p.width, 250 / p.height); g.drawImage(p, 0, 0, p.width, p.height, (220 - p.width * k) / 2, 250 - p.height * k, p.width * k, p.height * k); }
      else { const q = this.portraits.claire; if (q && q.kind === 'canvas') g.drawImage(q.canvas, 0, 0, 220, 220); }
    });
  }

  openSelect(which) {
    this.screen = which;
    this.el.menu.hidden = true;
    this.el.selDiff.hidden = which !== 'diff'; this.el.selChar.hidden = which !== 'char';
    if (which === 'diff') this._paintDiff(); else { this._paintCharArt(); this._paintChar(); }
    document.body.dataset.screen = 'select';
  }
  closeSelect() { this.screen = null; this.el.selDiff.hidden = true; this.el.selChar.hidden = true; }
  back() {
    this.sfx.play('ui_hover');
    if (this.screen === 'char' && this.extraMode) { this.extraMode = false; this.closeSelect(); this.showMenu(true); }
    else if (this.screen === 'char') this.openSelect('diff');
    else if (this.screen === 'diff') { this.closeSelect(); this.showMenu(true); }
  }
  confirm() {
    if (this.screen === 'diff') {
      this.pickedDiff = DIFFS[this.diffIdx];
      try { localStorage.setItem('lunarinth.lastdiff', String(this.diffIdx)); } catch (e) { /* noop */ }
      this.sfx.play('ui_click'); this.openSelect('char');
    } else if (this.screen === 'char') {
      const c = CHARS[this.charIdx];
      if (!c) { this.warn('아직 선택할 수 없는 슬롯입니다', 1200, true); this.sfx.play('hurt', { vol: 0.3 }); return; }
      if (!this.craftUnlocked(c.id)) { this.warn('아직 잠겨 있는 기체입니다', 1400, true); this.sfx.play('hurt', { vol: 0.3 }); return; }
      this.closeSelect();
      if (this.extraMode) { this.extraMode = false; this.on.startExtra && this.on.startExtra(c, this.pickedDiff); }
      else this.on.start && this.on.start(this.pickedDiff, c);
    }
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat || !this.el.dialog.hidden) return;
      const code = e.code, yes = code === 'KeyZ' || code === 'Enter', no = code === 'KeyX' || code === 'Escape';
      // 컨티뉴
      if (!$('#m-continue').hidden) { if (yes) { e.preventDefault(); this.on.continueYes && this.on.continueYes(); } else if (code === 'KeyX') { e.preventDefault(); this.on.continueNo && this.on.continueNo(); } return; }
      // 모달(설정/조작/설정집): 취소로 닫기 (일시정지 메뉴가 열려 있을 때의 Esc는 게임이 처리)
      const open = ['#m-help', '#m-settings', '#m-codex'].find((s) => !$(s).hidden);
      if (open && no && $('#m-pause').hidden) { e.preventDefault(); this.modal(open, false); return; }
      if (this.anyModalOpen()) return;
      if (this.screen === 'diff' || this.screen === 'char') {
        const key = this.screen === 'diff' ? 'diffIdx' : 'charIdx', n = this.screen === 'diff' ? DIFFS.length : CHARS.length;
        if (code === 'ArrowLeft' || code === 'KeyA') { this[key] = (this[key] + n - 1) % n; this.sfx.play('ui_hover'); this.screen === 'diff' ? this._paintDiff() : this._paintChar(); }
        else if (code === 'ArrowRight' || code === 'KeyD') { this[key] = (this[key] + 1) % n; this.sfx.play('ui_hover'); this.screen === 'diff' ? this._paintDiff() : this._paintChar(); }
        else if (yes) { e.preventDefault(); this.confirm(); }
        else if (no) { e.preventDefault(); this.back(); }
        return;
      }
      if (!this.el.menu.hidden) {
        // 타이틀에서 "claude" 를 입력하면 EXTRA 개방
        if (/^Key[A-Z]$/.test(code)) { this._kbuf = (this._kbuf + code.slice(3).toLowerCase()).slice(-6); if (this._kbuf === 'claude' && !this.extraUnlocked()) { this.on.unlockExtra && this.on.unlockExtra(); this._kbuf = ''; } }
        const btns = [...document.querySelectorAll('#m-main button')], cur = btns.indexOf(document.activeElement);
        if (code === 'ArrowDown' || code === 'KeyS') { e.preventDefault(); btns[(cur + 1) % btns.length].focus(); }
        else if (code === 'ArrowUp' || code === 'KeyW') { e.preventDefault(); btns[(cur + btns.length - 1) % btns.length].focus(); }
        else if (code === 'KeyZ' && cur >= 0) { e.preventDefault(); btns[cur].click(); }
        else if (yes && cur < 0) { e.preventDefault(); btns[0].click(); }
      }
    });
  }

  // ───── EXTRA ─────
  extraUnlocked() { try { return localStorage.getItem('lunarinth.extra.v1') === '1'; } catch (e) { return false; } }
  hellUnlocked() { try { return localStorage.getItem('lunarinth.hell.v1') === '1'; } catch (e) { return false; } }
  refreshExtra() {
    $('#btn-hell').hidden = !this.hellUnlocked();
    const b = $('#btn-extra'), on = this.extraUnlocked();
    b.classList.toggle('locked', !on);
    b.innerHTML = on ? 'EXTRA <i class="lock">— 개방됨</i>' : 'EXTRA <i class="lock">🔒</i>';
  }

  // 타이틀 배경 파티클 (떨어지는 달 조각 / 별빛)
  _titleFx() {
    const cv = $('#m-fx'), g = cv.getContext('2d'); let w = 0, h = 0;
    const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.6, v: 0.01 + Math.random() * 0.04, d: Math.random() * 6.28, c: Math.random() < 0.3 ? 1 : 0 }));
    const resize = () => { w = cv.width = innerWidth; h = cv.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (this.el.menu.hidden && this.el.selDiff.hidden && this.el.selChar.hidden) return;
      g.clearRect(0, 0, w, h);
      for (const p of P) {
        p.y += p.v * dt * 3; p.d += dt; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        const x = (p.x + Math.sin(p.d * 0.7) * 0.015) * w, y = p.y * h, r = p.s * 3;
        g.globalAlpha = 0.35 + 0.35 * Math.sin(p.d * 2); g.fillStyle = p.c ? '#ffd9f0' : '#e8dcff';
        if (p.c) { g.beginPath(); g.arc(x, y, r * 1.5, 0, 6.28); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + r * 0.6, y - r * 0.2, r * 1.3, 0, 6.28); g.fill(); g.globalCompositeOperation = 'source-over'; }
        else { g.beginPath(); g.moveTo(x, y - r * 1.6); g.lineTo(x + r * 0.4, y); g.lineTo(x, y + r * 1.6); g.lineTo(x - r * 0.4, y); g.closePath(); g.fill(); }
      }
      g.globalAlpha = 1;
    };
    requestAnimationFrame(loop);
  }

  // ───── 설정집 ─────
  _buildCodex() {
    const O = OFFICIAL;
    const tag = (t) => `<span class="tag ${t}">${t === 'off' ? '공식 설정' : t === 'prov' ? '제공 설정' : '창작 제안'}</span>`;
    const li = (a) => a.map((x) => `<li>${x}</li>`).join('');
    const skills = (def) => def.steps.filter((st) => st.kind !== 'ultimate').map((st, i) => `<li><span class="k ${st.kind}">${i + 1}. ${KIND_LABEL[st.kind]}</span> ${SPELL_TAG(st)} <small>— ${def.forms[st.form].label}${st.ultMode === 'immune' ? ' · 성광 면역' : st.ultMode === 'reject' ? ' · 성광 무효' : st.ultMode === 'resist' ? ' · 성광 저항' : ''}</small></li>`).join('');
    const defs = { opsir: OPSIR, astra: ASTRA, tramont: TRAMONT, index: INDEX, bellis: BELLIS, arkesia: { ...ARKESIA, steps: ARKESIA.allSteps.flatMap((x) => (x.variant ? Object.values(x.variant).map((v) => ({ ...x, ...v })) : [x])) } };
    const bossCard = (r, def) => `
      <div class="form"><b>${r.name} <small>${r.en} · STAGE ${r.stage}</small></b> ${tag(r.tag)}
        <div class="epi">${r.epithet}</div>
        <table class="rows">${r.rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
        <p class="note">${r.note}</p>
        <ul class="sk">${skills(def)}</ul>
      </div>`;
    $('#codex-body').innerHTML = `
      <h3>스토리 ${tag('prop')}</h3>
      ${STORY.lines.map((l) => `<p class="note">${l}</p>`).join('')}
      <p class="note">※ ${STORY.hidden}</p>
      <h3>병사 (통상 스테이지) ${tag('prop')}</h3><p class="note">${MOB_NOTE}</p>
      <h3>등장 보스</h3>
      ${ROSTER.filter((r) => r.id !== 'arkesia').map((r) => bossCard(r, defs[r.id])).join('')}
      <div class="form"><b>${O.name} <small>LUNARINTH · FINAL STAGE</small></b> ${tag('off')}
        <div class="epi">삼위(三位)의 달을 다스리는 저택의 주인</div>
        <ul>${li(O.look)}</ul><p>${O.personality}</p>
        <ul class="sk">${skills(LUNARINTH)}<li><span class="k last">？</span> ？？？？？？ <small>— 아직 알 수 없습니다</small></li></ul>
        <p class="note">형태 순서(LUMINA → UMBRA → LUNA)와 위 기술명·패턴·대사는 이 게임을 위한 <b>창작 제안</b>이며 공식 설정이 아닙니다. 미확정인 LUMINA / UMBRA의 고유 기술도 공식으로 확정하지 않았습니다.</p>
      </div>
      <h3>삼위일체 ${tag('off')}</h3>
      <p class="note">${O.note}</p>
      ${O.forms.map((f) => `<div class="form"><b>${f.name}</b> — ${f.moon} · ${f.theme}<ul>${li(f.notes)}</ul></div>`).join('')}
      <h3>공통 능력 ${tag('off')}</h3><ul>${li(O.abilities)}</ul>
      <h3>루센트 저택 ${tag('off')}</h3><ul>${O.house.map(([a, b]) => `<li><b>${a}</b> — ${b}</li>`).join('')}</ul>
      <h3>EXTRA ${tag('prop')}</h3><p class="note">${EXTRA.title} — ${EXTRA.sub}. 개방 조건: ${EXTRA.unlock}.<br>규칙: ${EXTRA.rules}<br>${EXTRA.hell}</p>
      ${this.extraUnlocked() ? bossCard(ROSTER.find((r) => r.id === 'arkesia'), defs.arkesia) : '<div class="form"><b>？？？ <small>EXTRA</small></b><p class="note">EXTRA를 개방하면 기록됩니다.</p></div>'}
      <h3>플레이어 ${tag('prop')}</h3>
      <ul><li><b>클레르</b> — 초대 하녀장 · 성검사. 궁극기 「성검 해방 — 징벌의 월광」</li><li><b>아스트라</b> — 기술실 담당. 2스테이지에서 처음 쓰러뜨린 뒤 사용 가능. 궁극기 「기술실 권한 — 시스템 오버라이드」</li></ul>
      <p class="note">“성검을 해방한 것은 루나린스가 처음”이라는 전제는 이 게임의 창작 설정입니다.</p>`;
  }

  showMenu(show) {
    this.el.menu.hidden = !show;
    if (show) { this.closeSelect(); this.screen = null; }
    document.body.dataset.screen = show ? 'menu' : 'play';
    if (show) setTimeout(() => { const b = $('#btn-start'); if (b && !this.el.menu.hidden) b.focus({ preventScroll: true }); }, 50);
  }
  showHud(show) { this.el.hud.hidden = !show; }

  // ───── HUD ─────
  setTheme(id) { document.body.dataset.phase = id; }
  setBossHeader(def) { this.el.bname.textContent = def.name; this.el.bepi.textContent = def.epithet; this.el.spell.hidden = true; }
  setBossStep(B, i) {
    const def = B.def, st = def.steps[i], f = def.forms[st.form];
    this.el.form.innerHTML = `<b>${f.label}</b> · ${f.sub}`;
    // 얼티메이트 스킬은 발동 전까지 존재를 보이지 않는다. 발동하면 그 5식만 표시된다.
    const ult = st.kind === 'ultimate', list = def.steps.map((s, k) => ({ s, k })).filter((o) => (o.s.kind === 'ultimate') === ult);
    this.el.pips.innerHTML = list.map(({ s, k }) => `<i class="pip ${s.kind === 'nonspell' ? 'n' : 's'} ${k < i ? 'done' : k === i ? 'cur' : ''}"></i>`).join('');
    const sp = this.el.spell; sp.hidden = false; sp.className = st.kind;
    sp.innerHTML = `<small>${KIND_LABEL[st.kind]}</small>${SPELL_TAG(st)}`;
  }
  setBoss(ratio) {
    this.el.fill.style.width = (Math.max(0, ratio) * 100).toFixed(2) + '%';
    this.el.ghost.style.width = (Math.max(0, ratio) * 100).toFixed(2) + '%';
  }
  setBossInstant(ratio) {
    this.el.ghost.style.transition = 'none'; this.el.fill.style.transition = 'none';
    this.setBoss(ratio);
    void this.el.ghost.offsetWidth;
    this.el.ghost.style.transition = ''; this.el.fill.style.transition = '';
  }
  setBossTimer(sec) {
    const t = this.el.timer;
    if (sec == null) { t.textContent = '--'; t.classList.remove('low'); return; }
    const s = Math.max(0, Math.ceil(sec)); t.textContent = String(s).padStart(2, '0'); t.classList.toggle('low', s <= 10);
  }
  setAnalysis(pct) {
    if (pct == null) { this.el.ana.hidden = true; return; }
    this.el.ana.hidden = false; this.el.anaFill.style.width = pct.toFixed(1) + '%'; this.el.anaNum.textContent = Math.round(pct) + '%';
  }
  setHp(n, max) {
    const h = this.el.stars;
    if (this.starCount !== max) { h.innerHTML = Array.from({ length: max }, () => `<div class="star">${STAR}</div>`).join(''); this.starCount = max; }
    [...h.children].forEach((c, i) => { const lost = i >= n; if (c.classList.contains('lost') !== lost) { c.classList.toggle('lost', lost); if (!lost) { c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); } } });
  }
  setSealed(on) { this.el.hud.classList.toggle('sealed', !!on); $('#sealtag').hidden = !on; }
  showBossUI(show) { for (const s of ['#bossbar', '#bb-timer']) $(s).style.visibility = show ? '' : 'hidden'; if (!show) this.el.spell.hidden = true; }
  setUlt(n, max = 3) {
    const h = this.el.gems;
    if (this.gemCount !== max) { h.innerHTML = Array.from({ length: max }, () => `<div class="gem">${GEM}</div>`).join(''); this.gemCount = max; }
    [...h.children].forEach((c, i) => c.classList.toggle('lost', i >= n));
  }
  setContinues(used, max) { this.el.cont.textContent = `${used} / ${max}`; }
  setDiff(d) { const e = $('#hud-diff'); e.textContent = d.name; e.style.color = d.color; }
  setStage(label) { $('#hud-stage').textContent = label; }
  setGraze(n) { this.el.graze.textContent = n; }

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

  /** 통상 발동 알림 (작은 라벨) */
  announce(text, ms = 1900) {
    const a = this.el.announce; a.textContent = text; a.hidden = true; void a.offsetWidth; a.hidden = false;
    clearTimeout(this._annT); this._annT = setTimeout(() => { a.hidden = true; }, ms);
  }

  /** 스킬 선언 컷인: 적 스킬(kind spell/last, 오른쪽) / 플레이어 궁극기(kind ult, 왼쪽) */
  declare({ who, kind, tag, name, side = 'right' }) {
    const d = this.el.declare;
    d.dataset.kind = kind; d.dataset.side = side;
    d.querySelector('.dc-kind').textContent = KIND_LABEL[kind] || '';
    d.querySelector('.dc-tag').textContent = tag || '';
    d.querySelector('.dc-name').textContent = `「${name}」`;
    const cv = this.el.dcCanvas, g = cv.getContext('2d'); g.clearRect(0, 0, 420, 420);
    const p = this.portraits[who];
    if (p) { if (p.kind === 'img') g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, 0, 0, 420, 420); else g.drawImage(p.canvas, 0, 0, 420, 420); }
    d.hidden = true; void d.offsetWidth; d.hidden = false;
    clearTimeout(this._dcT); this._dcT = setTimeout(() => { d.hidden = true; }, kind === 'ult' ? 1500 : 2100);
  }
  hideDeclare() { this.el.declare.hidden = true; clearTimeout(this._dcT); }

  // ───── 대사 ─────
  setPortraits(map, full) { this.portraits = map; this.full = full || this.full; }
  _paintPortrait(who) {
    const cv = this.el.dCanvas, g = cv.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const p = this.portraits[who];
    if (!p) return false;
    if (p.kind === 'img') g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, 0, 0, 256, 256);
    else g.drawImage(p.canvas, 0, 0, 256, 256);
    return true;
  }

  /** lines 를 순서대로 타자 효과로 보여주고 끝나면 resolve. Esc는 전체 건너뛰기. */
  playDialogue(lines, hooks = {}) {
    return new Promise((resolve) => {
      let i = 0, typing = false, full = '', pos = 0, timer = 0, done = false;
      const d = this.el.dialog, nameEl = this.el.dName, textEl = this.el.dText;
      d.hidden = false;
      const finish = () => {
        if (done) return; done = true; clearInterval(timer);
        window.removeEventListener('keydown', onKey); d.removeEventListener('click', advance);
        d.hidden = true; resolve();
      };
      const show = () => {
        const ln = lines[i];
        if (!ln) return finish();
        nameEl.textContent = ln.as || NAMES[ln.who] || '';
        textEl.className = 'd-text' + (ln.who === 'narr' ? ' narr' : '');
        const hasFace = ln.who !== 'narr' && this._paintPortrait(ln.who);
        this.el.dPortrait.classList.toggle('narr', !hasFace);
        d.dataset.who = ln.who;
        full = ln.text; pos = 0; typing = true; textEl.textContent = '';
        if (hooks.onLine) hooks.onLine(ln, i);
        clearInterval(timer);
        timer = setInterval(() => {
          pos++; textEl.textContent = full.slice(0, pos);
          if (pos % 2 === 0 && full[pos - 1] !== ' ') this.sfx.play('blip_' + ln.who);
          if (pos >= full.length) { typing = false; clearInterval(timer); }
        }, ln.who === 'luna' && /키+킥|키키/.test(ln.text) ? 34 : 36);
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

  // ───── 컨티뉴 / 엔딩 / 결과 ─────
  showContinue(left, max, dbg = false) {
    if (dbg) { $('#cont-left').innerHTML = `테스트 모드 — 컨티뉴 무제한<br><small>(기록에 남지 않습니다)</small>`; $('#m-continue').hidden = false; setTimeout(() => $('#btn-cont-yes').focus({ preventScroll: true }), 30); return; }
    $('#cont-left').innerHTML = `남은 컨티뉴 <b>${left}</b> / ${max}<br><span class="gems">${Array.from({ length: max }, (_, i) => `<i class="${i < left ? 'on' : ''}">◆</i>`).join('')}</span>`;
    $('#m-continue').hidden = false;
    setTimeout(() => $('#btn-cont-yes').focus({ preventScroll: true }), 30);
  }
  hideContinue() { $('#m-continue').hidden = true; }

  showEnding(title, name, sub) {
    const e = this.el.ending;
    e.querySelector('.e-title').textContent = title; e.querySelector('.e-name').textContent = name; e.querySelector('.e-sub').textContent = sub;
    e.hidden = true; void e.offsetWidth; e.hidden = false;
  }
  hideEnding() { this.el.ending.hidden = true; }

  showResult(win, rows, kicker = '', retryLabel = '처음부터 다시', title = null) {
    $('#r-kicker').textContent = kicker; $('#btn-retry').textContent = retryLabel;
    $('#r-title').textContent = title || (win ? '달이 저물었습니다' : '밤은 아직 끝나지 않았습니다');
    $('#r-stats').innerHTML = rows.map(([k, v]) => `${k} <b>${v}</b>`).join('<br>');
    $('#m-result').hidden = false;
  }
  hideResult() { $('#m-result').hidden = true; }
  showPause(show) { $('#m-pause').hidden = !show; }
}
