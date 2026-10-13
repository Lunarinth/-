import fs from 'fs'; import path from 'path';
import * as acorn from 'acorn'; import * as walk from 'acorn-walk';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const H = /[가-힣]/;
const out = new Map(); // key -> [files]
const add = (k, f) => { k = k.trim(); if (!k || !H.test(k)) return; if (!out.has(k)) out.set(k, new Set()); out.get(k).add(f); };
const files = [];
(function rec(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) rec(p); else if (p.endsWith('.js')) files.push(p); } })(ROOT + '/js');
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8'), rel = path.relative(ROOT, f);
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' });
  walk.full(ast, (n) => {
    if (n.type === 'Literal' && typeof n.value === 'string') { if (/<[a-z/]/i.test(n.value)) for (const part of n.value.split(/<[^>]*>/)) add(part, rel); else add(n.value, rel); }
    if (n.type === 'TemplateLiteral') {
      let k = ''; n.quasis.forEach((q, i) => { k += q.value.cooked; if (i < n.expressions.length) k += `{${i}}`; });
      // HTML 템플릿은 태그 사이 텍스트 조각으로 나눈다
      if (/<[a-z]/i.test(k)) for (const part of k.split(/<[^>]*>/)) add(part, rel); else add(k, rel);
    }
  });
}
// index.html 텍스트 · 속성
const html = fs.readFileSync(ROOT + '/index.html', 'utf8');
for (const m of html.matchAll(/>([^<>]+)</g)) add(m[1].replace(/\s+/g, ' '), 'index.html');
for (const m of html.matchAll(/(?:title|placeholder|content)="([^"]+)"/g)) add(m[1], 'index.html');
const list = [...out.entries()].map(([k, s]) => ({ k, f: [...s].join(',') }));
fs.writeFileSync(path.join(ROOT, 'tools/i18n_keys.json'), JSON.stringify(list, null, 0));
const byFile = {}; for (const e of list) for (const f of e.f.split(',')) byFile[f] = (byFile[f] || 0) + 1;
console.log(list.length, 'keys', list.reduce((s, e) => s + e.k.length, 0), 'chars'); console.log(byFile);
