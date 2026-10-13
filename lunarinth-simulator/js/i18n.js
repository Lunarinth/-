// 언어 지원 (한국어 · English). 한 빌드에 두 언어가 함께 들어 있다.
// 게임 로직과 데이터는 한국어 원문 그대로 두고, 화면에 보이는 순간에만 바꿔 끼운다.
//   1) 정확히 일치하는 문장 → 사전(i18n_en.js)
//   2) 숫자 · 이름이 섞인 문장 → {0} 자리표시자 패턴
//   3) 그래도 없으면 ' · ', ' — ' 같은 구분자 단위로 쪼개서 조각마다 번역
// DOM 은 MutationObserver 가 지켜보다가 한글이 들어오면 바꾼다. 대사는 타자 효과 전에 T() 로 미리 바꾼다.
import { EN } from './i18n_en.js';

const KEY = 'lunarinth.lang';
const HANGUL = /[가-힣]/;

function detect() {
  try { const v = localStorage.getItem(KEY); if (v === 'ko' || v === 'en') return v; } catch (e) { /* noop */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ko';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
export const LANG = detect();
export const isEn = LANG === 'en';

/** 언어를 바꾸고 다시 불러온다 (진행 중인 판은 타이틀로 돌아간다) */
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch (e) { /* noop */ }
  location.reload();
}

// ───── 사전 · 패턴 준비 ─────
const exact = new Map();
const patterns = [];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const [ko, en] of Object.entries(EN)) {
  const k = ko.trim();
  if (/\{\d+\}/.test(k)) {
    const ids = [...k.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
    const lit = k.replace(/\{\d+\}/g, '');
    if (!HANGUL.test(lit) || (lit.match(/[가-힣]/g) || []).length < 2) continue; // 한글 없는 틀 · '{0}개' 같은 너무 짧은 틀은 오작동하므로 제외 (숫자 단위는 아래 UNIT 규칙)
    const re = new RegExp('^' + k.split(/\{\d+\}/).map(esc).join('([\\s\\S]*?)') + '$');
    patterns.push({ re, ids, en, weight: lit.length });
    // 틀의 글자 부분만 따로 화면에 나뉘어 보이는 경우 (예: '스토리 {0}' 의 '스토리')
    const bare = k.replace(/\{\d+\}/g, '').trim(), bareEn = en.replace(/\{\d+\}/g, '').trim();
    if (bare && bare.length >= 2 && !exact.has(bare) && !/^[·—\-:]/.test(bare)) exact.set(bare, bareEn);
  } else exact.set(k, en);
}
patterns.sort((a, b) => b.weight - a.weight); // 글자가 많은(구체적인) 틀부터
// '· 성광 저항' 처럼 접두어가 붙은 항목은 접두어 없는 형태로도 찾을 수 있게
for (const [k, v] of [...exact]) { const m = /^[·—–]\s*(.+)$/.exec(k); if (m && !exact.has(m[1])) exact.set(m[1], v.replace(/^[·—–]\s*/, '')); }
// 기술 이름에서 앞 단어만 떼어 쓰는 경우 (제1식 · 제1막 · 광란 제1막 …)
const KO_NUM = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'], ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
for (let i = 1; i <= 9; i++) {
  if (!exact.has(`제${i}식`)) exact.set(`제${i}식`, `Form ${KO_NUM[i]}`);
  if (!exact.has(`제${i}막`)) exact.set(`제${i}막`, `Act ${ROMAN[i]}`);
}

const cache = new Map();
const SPLIT = /( · | — | – | \| |\n|「|」|“|”|: |, )/;

// 숫자 + 단위: '3개' → '3', '8초' → '8 sec'
const UNIT = { 개: '', 회: '', 번: '', 초: ' sec', 발: ' shots', 줄: ' streams', 단계: '' };
function core(s) {
  if (exact.has(s)) return exact.get(s);
  if (!s) return null;
  const u = /^([\d.,]+)\s*(개|회|번|초|발|줄|단계)$/.exec(s);
  if (u) return u[1] + UNIT[u[2]];
  for (const p of patterns) {
    const m = p.re.exec(s);
    if (!m) continue;
    let out = p.en;
    p.ids.forEach((id, i) => { out = out.split(`{${id}}`).join(translate(m[i + 1])); });
    return out;
  }
  return null;
}

/** 문자열 하나 번역 (앞뒤 공백 유지) */
function translate(s) {
  if (!HANGUL.test(s)) return s;
  if (cache.has(s)) return cache.get(s);
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), body = m[2];
  const r = deep(body);
  const res = r == null ? s : m[1] + r + m[3];
  if (cache.size > 6000) cache.clear();
  cache.set(s, res);
  return res;
}

/** 사전 · 패턴으로 안 되면: 접두어 떼기 → 「」 안쪽 통째로 → 구분자 조각을 가장 길게 이어 붙여 맞추기 */
function deep(body) {
  let r = core(body);
  if (r != null) return r;
  // 접두어: '— ', '· ', '※ ', '1. ', '▸ '
  const pm = /^((?:[—–※·•▸]|\d+\.)\s*)([\s\S]+)$/.exec(body);
  if (pm) { const t = deep(pm[2]); if (t != null) return pm[1] + t; }
  // 「이름」 은 괄호 안을 통째로
  let txt = body;
  if (/「[^」]+」/.test(txt)) txt = txt.replace(/「([^」]+)」/g, (_, x) => '“' + (deep(x.trim()) ?? x) + '”');
  if (!HANGUL.test(txt)) return txt;
  // 구분자 조각: 앞에서부터 가장 길게 이어 붙여 사전과 맞춘다
  const parts = txt.split(SPLIT);
  if (parts.length < 2) return txt === body ? null : txt;
  const out = []; let changed = txt !== body;
  for (let i = 0; i < parts.length;) {
    let hit = null, hj = i;
    if (HANGUL.test(parts.slice(i, i + 2).join(''))) for (let j = parts.length - 1; j >= i; j--) { const seg = parts.slice(i, j + 1).join(''); if (!HANGUL.test(seg)) continue; const t = core(seg.trim()); if (t != null) { hit = seg.replace(seg.trim(), t); hj = j; break; } }
    if (hit != null) { out.push(hit); changed = true; i = hj + 1; } else { out.push(parts[i]); i++; }
  }
  return changed ? out.join('') : null;
}

/** 화면에 보일 문자열 번역. 한국어 모드에서는 그대로 돌려준다 */
export function T(s) { return isEn && typeof s === 'string' ? translate(s) : s; }

// ───── DOM 자동 번역 ─────
function fixText(node) { const v = node.nodeValue; if (v && HANGUL.test(v)) { const t = translate(v); if (t !== v) node.nodeValue = t; } }
function fixAttrs(el) { for (const a of ['title', 'placeholder', 'aria-label']) { const v = el.getAttribute && el.getAttribute(a); if (v && HANGUL.test(v)) el.setAttribute(a, translate(v)); } }
export function translateTree(root) {
  if (!isEn || !root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = root;
  while (n) { if (n.nodeType === 3) fixText(n); else if (n.nodeType === 1) fixAttrs(n); n = w.nextNode(); }
}

export function installI18n() {
  document.documentElement.lang = LANG;
  document.body.classList.toggle('lang-en', isEn);
  if (!isEn) return;
  document.title = translate(document.title);
  translateTree(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixAttrs(m.target);
      else for (const n of m.addedNodes) { if (n.nodeType === 3) fixText(n); else if (n.nodeType === 1) translateTree(n); }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] });
}
