// DOM 기반 UI: 타이틀·난이도/캐릭터 선택, HUD, 대사창, 스킬 선언 컷인, 컨티뉴/엔딩/결과, 설정집.
import { OFFICIAL, ROSTER, DIFFS, NAMES, STORY, MOB_NOTE, EXTRA, EXTRA_DIFF, APO_DIFF } from './lore.js';
import { ITEMS, ITEM_BY_ID, RARITY, TRANSFORMS } from './items.js';
import { itemIcon } from './icons.js';
import { SKILLS } from './skills.js';
import { ROOM_INFO } from './floor.js';
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
const KIND_LABEL = { nonspell: '통상', spell: '스킬', last: '라스트 스킬', ult: '성광', ultimate: '얼티메이트 스킬' };
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
      ending: $('#ending'), selDiff: $('#sel-diff'),
      ana: $('#bb-ana'), anaFill: $('#ana-fill'), anaNum: $('#ana-num'),
    };
    this.on = {};
    this.starCount = 0; this.gemCount = 0;
    this.portraits = {};
    this._warnT = 0; this._bubT = 0; this._annT = 0; this._dcT = 0;
    this.screen = null; this.diffIdx = 1; this.pickedDiff = DIFFS[1];
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
      if (this.extraUnlocked()) { this.showMenu(false); this.on.startExtra && this.on.startExtra(EXTRA_DIFF); }
      else { this.warn(`EXTRA 잠김 — ${EXTRA.unlock}`, 3200, true); this.sfx.play('hurt', { vol: 0.25 }); }
    };
    $('#btn-apo').onclick = () => { if (this.apoOpen && this.apoOpen()) { this.showMenu(false); this.on.startApo && this.on.startApo(APO_DIFF); } };
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
      if (v === 'claude') { this.on.unlockApo && this.on.unlockApo(); }
    };
    document.body.classList.toggle('calm', S.calm);
  }

  /** 모달 열기/닫기. 나중에 연 모달이 항상 위에 뜬다 (일시정지 → 설정 등) */
  modal(sel, show) { const el = $(sel); el.hidden = !show; if (show) el.style.zIndex = String(20 + (this._mz = (this._mz || 0) + 1)); }
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
    this._paintDiff();
  }

  _paintDiff() {
    document.querySelectorAll('#diff-cards .card').forEach((b, i) => b.classList.toggle('sel', i === this.diffIdx));
    const d = DIFFS[this.diffIdx];
    $('#diff-desc').innerHTML = `<b style="color:${d.color}">${d.name} — ${d.kr}</b><br>${d.sub}<br><small>탄수 ×${d.cnt} · 탄속 ×${d.spd} · 보스 체력 ×${d.hp} · 시작 체력 ${d.php}${d.lv >= 2 ? ' · 추가 패턴 있음' : ''}</small>`;
  }
  openSelect(which) {
    this.screen = which;
    this.el.menu.hidden = true;
    this.el.selDiff.hidden = which !== 'diff';
    this._paintDiff();
    document.body.dataset.screen = 'select';
  }
  closeSelect() { this.screen = null; this.el.selDiff.hidden = true; }
  back() {
    this.sfx.play('ui_hover');
    if (this.screen === 'diff') { this.closeSelect(); this.showMenu(true); }
  }
  confirm() {
    if (this.screen !== 'diff') return;
    this.pickedDiff = DIFFS[this.diffIdx];
    try { localStorage.setItem('lunarinth.lastdiff', String(this.diffIdx)); } catch (e) { /* noop */ }
    this.sfx.play('ui_click'); this.closeSelect();
    this.on.start && this.on.start(this.pickedDiff);
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
      if (this.screen === 'diff') {
        const n = DIFFS.length;
        if (code === 'ArrowLeft' || code === 'KeyA') { this.diffIdx = (this.diffIdx + n - 1) % n; this.sfx.play('ui_hover'); this._paintDiff(); }
        else if (code === 'ArrowRight' || code === 'KeyD') { this.diffIdx = (this.diffIdx + 1) % n; this.sfx.play('ui_hover'); this._paintDiff(); }
        else if (yes) { e.preventDefault(); this.confirm(); }
        else if (no) { e.preventDefault(); this.back(); }
        return;
      }
      if (!this.el.menu.hidden) {
        // 타이틀에서 "claude" 를 입력하면 EXTRA 개방
        if (/^Key[A-Z]$/.test(code)) { this._kbuf = (this._kbuf + code.slice(3).toLowerCase()).slice(-6); if (this._kbuf === 'claude') { if (!this.extraUnlocked()) this.on.unlockExtra && this.on.unlockExtra(); this.on.unlockApo && this.on.unlockApo(); this._kbuf = ''; } }
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
    // HELL 은 장난용이라 타이틀에서 고를 수 없다
    $('#btn-apo').hidden = !(this.apoOpen && this.apoOpen());
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
      if (this.el.menu.hidden && this.el.selDiff.hidden) return;
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
      <h3>EXTRA ${tag('prop')}</h3><p class="note">${EXTRA.title} — ${EXTRA.sub}. 개방 조건: ${EXTRA.unlock}.<br>규칙: ${EXTRA.rules}</p>
      ${this.extraUnlocked() ? bossCard(ROSTER.find((r) => r.id === 'arkesia'), defs.arkesia) : '<div class="form"><b>？？？ <small>EXTRA</small></b><p class="note">EXTRA를 개방하면 기록됩니다.</p></div>'}
      <h3>플레이어 ${tag('prop')}</h3>
      <ul><li><b>클레르</b> — 초대 하녀장 · 성검사. 성광(폭탄) 「성검 해방 — 징벌의 월광」</li></ul>
      <h3>상인 ${tag('prop')}</h3>
      <ul><li><b>시트라</b> — 정문을 맡은 직무대리. 휴식방에 가끔 레몬 수레를 끌고 나타나 저택 창고의 물건을 판다.</li>
      <li><b>인피니트</b> — 끝없는 복도에서 온 상인. 달이 한 번 저문 밤(첫 클리어) 이후에만 휴식방에 나타나며, 유니크 · 레전더리 물건만 판다.</li></ul>
      <h3>변신 ${tag('prop')}</h3>
      <ul>${Object.entries(TRANSFORMS).map(([k, t]) => `<li><b>${t.name}</b> <small>(${k} 계열 3개)</small> — ${t.desc}</li>`).join('')}</ul>
      <h3>물건 도감 ${tag('prop')}</h3>
      <div class="item-dex">${ITEMS.map((it) => `<div class="dex-it" style="--rc:${RARITY[it.rarity].color}" title="${it.desc}"><img src="${itemIcon(it).url}" alt=""><b>${it.name}</b><small>${RARITY[it.rarity].name}${it.tags && it.tags.length ? ' · ' + it.tags.join('/') : ''}</small><span>${it.desc}</span></div>`).join('')}</div>
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
    const ult = st.kind === 'ultimate', list = def.steps.map((s, k) => ({ s, k })).filter((o) => (o.s.kind === 'ultimate') === ult && (!o.s.fake || o.k === i));
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
  // ───── 로그라이크 HUD ─────
  setRogue(P) {
    $('#r-coins').textContent = String(P.coins).padStart(2, '0'); $('#r-keys').textContent = String(P.keys).padStart(2, '0');
    const pw = P.power; $('#pw-fill').style.width = (pw / 4 * 100).toFixed(1) + '%'; $('#pw-num').textContent = pw >= 4 ? 'MAX' : pw.toFixed(2);
    $('#sc-num').textContent = String(Math.floor(P.score)).padStart(9, '0');
  }
  refreshActive(P) {
    const box = $('#active-slot'), a = P.active; box.hidden = !a; if (!a) return;
    const it = ITEM_BY_ID[a.id], img = $('#act-img'); if (img.dataset.id !== a.id) { img.src = itemIcon(it).url; img.dataset.id = a.id; }
    $('#act-name').textContent = (SKILLS[a.skill] || {}).name || it.name;
    const bars = $('#act-bars'); bars.innerHTML = Array.from({ length: a.max }, (_, i) => `<i class="${i < a.charge ? 'on' : ''}"></i>`).join('');
    box.classList.toggle('ready', a.charge >= a.max);
  }
  setItems(P) {
    const el = $('#items-strip'), ids = P.items;
    if (el.dataset.n === String(ids.length)) return; el.dataset.n = String(ids.length);
    el.innerHTML = ids.slice(-24).map((id) => { const it = ITEM_BY_ID[id]; return `<img src="${itemIcon(it).url}" title="${it.name}" style="--rc:${RARITY[it.rarity].color}">`; }).join('');
  }
  itemBanner(it, sub) {
    const b = $('#itembanner'); b.querySelector('.ib-name').textContent = it.name; b.querySelector('.ib-desc').textContent = sub || it.desc;
    b.style.setProperty('--rc', RARITY[it.rarity] ? RARITY[it.rarity].color : '#fff');
    b.querySelector('img').src = itemIcon(it).url;
    b.hidden = true; void b.offsetWidth; b.hidden = false; clearTimeout(this._ibT); this._ibT = setTimeout(() => { b.hidden = true; }, 2600);
  }
  /** 가격표 · 이름표: [{x, y, text, cls}] (화면 좌표) */
  setTags(list) {
    const root = $('#tags'); this._tagPool = this._tagPool || [];
    while (this._tagPool.length < list.length) { const d = document.createElement('div'); d.className = 'tag'; root.appendChild(d); this._tagPool.push(d); }
    this._tagPool.forEach((d, i) => { const t = list[i]; if (!t) { d.hidden = true; return; } d.hidden = false; d.className = 'tag ' + (t.cls || ''); if (d._t !== t.text) { d.innerHTML = t.text; d._t = t.text; } d.style.left = t.x + 'px'; d.style.top = t.y + 'px'; });
  }
  hint(html) { const h = $('#hint'); if (!html) { h.hidden = true; return; } h.hidden = false; if (h._t !== html) { h.innerHTML = html; h._t = html; } }
  /** 미니맵: 아이작처럼 아는 방만 보인다 */
  drawMap(floor, cur) {
    const cv = $('#minimap'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    if (!floor) return;
    const known = floor.list.filter((r) => r.known || r.visited);
    let minX = 99, maxX = -99, minY = 99, maxY = -99;
    for (const r of known) { minX = Math.min(minX, r.gx); maxX = Math.max(maxX, r.gx); minY = Math.min(minY, r.gy); maxY = Math.max(maxY, r.gy); }
    const cw = Math.min(26, (W - 16) / (maxX - minX + 1)), ch = Math.min(20, (H - 16) / (maxY - minY + 1));
    const ox = (W - (maxX - minX + 1) * cw) / 2 - minX * cw, oy = (H - (maxY - minY + 1) * ch) / 2 - minY * ch;
    for (const r of known) {
      const x = ox + r.gx * cw, y = oy + r.gy * ch, isCur = r === cur;
      g.fillStyle = isCur ? 'rgba(255,255,255,.95)' : r.visited ? 'rgba(200,190,255,.55)' : 'rgba(120,110,160,.35)';
      g.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
      if (r.type !== 'normal' && r.type !== 'start') {
        const col = '#' + ROOM_INFO[r.type].color.toString(16).padStart(6, '0');
        g.fillStyle = isCur ? '#222' : col; g.font = `bold ${Math.floor(ch * 0.62)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const glyph = { boss: '☠', treasure: '★', rest: r.merchant === 'infinite' ? '∞' : r.merchant === 'sitra' ? '◎' : '♨', mini: '◆', challenge: '⚔' }[r.type] || '';
        g.fillText(r.lock && !r.unlocked ? '🔒' : glyph, x + cw / 2, y + ch / 2 + 1);
      }
    }
  }
  setPauseItems(P) {
    const el = $('#pause-items'); if (!el) return;
    const rows = P.items.map((id) => ITEM_BY_ID[id]).concat(P.active ? [ITEM_BY_ID[P.active.id]] : []);
    const tf = P.transforms.map((t) => `<span class="tf">${TRANSFORMS[t].name}</span>`).join('');
    el.innerHTML = (tf ? `<div class="tfs">변신 ${tf}</div>` : '') + (rows.length ? rows.map((it) => `<div class="pi" style="--rc:${RARITY[it.rarity].color}"><img src="${itemIcon(it).url}"><b>${it.name}</b><small>${it.desc}</small></div>`).join('') : '<small>아직 얻은 물건이 없습니다</small>');
  }

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
      lines = [...lines];
      let i = 0, typing = false, full = '', pos = 0, timer = 0, done = false, chOn = false, chCur = 0;
      const chEl = this.el.dialog.querySelector('.d-choices');
      const showChoices = (ln) => {
        chOn = true; chCur = 0; chEl.hidden = false;
        chEl.innerHTML = ln.choices.map((c, k) => `<button data-k="${k}">${c.text}</button>`).join('');
        const paint = () => [...chEl.children].forEach((b, k) => b.classList.toggle('sel', k === chCur));
        [...chEl.children].forEach((b, k) => { b.onclick = (e) => { e.stopPropagation(); pick(k); }; b.onmouseenter = () => { chCur = k; paint(); }; });
        chEl._paint = paint; paint();
      };
      const pick = (k) => {
        const ln = lines[i], c = ln.choices[k]; chOn = false; chEl.hidden = true; chEl.innerHTML = '';
        this.sfx.play('ui_click');
        if (c.then) lines.splice(i + 1, 0, ...(typeof c.then === 'function' ? c.then() : c.then));
        if (c.fn) c.fn();
        if (hooks.onChoice) hooks.onChoice(ln, k);
        i++; show();
      };
      const d = this.el.dialog, nameEl = this.el.dName, textEl = this.el.dText;
      d.hidden = false;
      const finish = () => {
        if (done) return; done = true; clearInterval(timer);
        window.removeEventListener('keydown', onKey); d.removeEventListener('click', advance);
        chEl.hidden = true; chEl.innerHTML = ''; d.hidden = true; resolve();
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
          if (pos >= full.length) { typing = false; clearInterval(timer); if (ln.choices) showChoices(ln); }
        }, ln.who === 'luna' && /키+킥|키키/.test(ln.text) ? 34 : 36);
      };
      const advance = () => {
        if (chOn) return;
        if (typing) { clearInterval(timer); typing = false; textEl.textContent = full; if (lines[i] && lines[i].choices) showChoices(lines[i]); return; }
        i++; show();
      };
      const onKey = (e) => {
        if (chOn) {
          e.preventDefault(); if (e.repeat) return;
          const n = lines[i].choices.length;
          if (['ArrowDown', 'KeyS'].includes(e.code)) { chCur = (chCur + 1) % n; chEl._paint(); this.sfx.play('ui_hover'); }
          else if (['ArrowUp', 'KeyW'].includes(e.code)) { chCur = (chCur + n - 1) % n; chEl._paint(); this.sfx.play('ui_hover'); }
          else if (['Enter', 'Space', 'KeyZ', 'KeyJ', 'KeyE'].includes(e.code)) pick(chCur);
          else if (e.code === 'Escape' || e.code === 'KeyX') pick(lines[i].cancel ?? n - 1);
          return;
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          // 선택지가 남아 있으면 건너뛰기는 그 선택지에서 멈춘다
          const ci = lines.findIndex((l, k) => k >= i && l.choices);
          if (ci >= 0) { clearInterval(timer); i = ci; show(); clearInterval(timer); typing = false; textEl.textContent = full; showChoices(lines[i]); return; }
          finish(); return;
        }
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
  /** 선택창: 고른 번호를 돌려준다. o.cancel: X · Esc 로 고를 번호 */
  choose(title, options, o = {}) {
    return new Promise((resolve) => {
      const el = $('#choice'), list = el.querySelector('.ch-list');
      el.querySelector('.ch-title').innerHTML = title;
      list.innerHTML = options.map((t, i) => `<button data-i="${i}">${t}</button>`).join('');
      const btns = [...list.children]; let cur = o.def || 0;
      const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === cur));
      const done = (i) => { window.removeEventListener('keydown', onKey, true); el.hidden = true; this.choiceOpen = false; this.sfx.play('ui_click'); resolve(i); };
      const onKey = (e) => {
        const c = e.code;
        if (['ArrowDown', 'KeyS', 'ArrowRight', 'KeyD'].includes(c)) { if (!e.repeat) { cur = (cur + 1) % btns.length; paint(); this.sfx.play('ui_hover'); } }
        else if (['ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA'].includes(c)) { if (!e.repeat) { cur = (cur + btns.length - 1) % btns.length; paint(); this.sfx.play('ui_hover'); } }
        else if (['KeyZ', 'Enter', 'Space', 'KeyE'].includes(c)) { if (!e.repeat) done(cur); }
        else if (c === 'KeyX' || c === 'Escape') { if (!e.repeat && o.cancel != null) done(o.cancel); }
        else return;
        e.preventDefault(); e.stopImmediatePropagation();
      };
      btns.forEach((b, i) => { b.onclick = () => done(i); b.onmouseenter = () => { cur = i; paint(); }; });
      paint(); el.hidden = false; this.choiceOpen = true; this.sfx.play('cast', { vol: 0.4 });
      window.addEventListener('keydown', onKey, true);
    });
  }
  hideResult() { $('#m-result').hidden = true; }
  showPause(show) { $('#m-pause').hidden = !show; }
}
