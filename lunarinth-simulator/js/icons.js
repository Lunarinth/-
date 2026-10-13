// 아이템 아이콘 · 픽업 · 문 · 함정문 텍스처를 캔버스로 그린다 (외부 이미지 없음).
import * as THREE from '../vendor/three.module.min.js';
import { RARITY } from './items.js';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

function star(g, cx, cy, r1, r2, n = 5, rot = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, r = i % 2 ? r2 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }
function heartPath(g, cx, cy, s) { g.beginPath(); g.moveTo(cx, cy + s * 0.75); g.bezierCurveTo(cx - s * 1.25, cy - s * 0.05, cx - s * 0.62, cy - s * 0.95, cx, cy - s * 0.38); g.bezierCurveTo(cx + s * 0.62, cy - s * 0.95, cx + s * 1.25, cy - s * 0.05, cx, cy + s * 0.75); g.closePath(); }

/** 모양 하나를 그린다. g 는 (0,0)-(128,128) 기준 */
function drawShape(g, shape, col) {
  const grd = g.createLinearGradient(0, 16, 0, 112); grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, col); grd.addColorStop(1, shade(col, -0.45));
  g.fillStyle = grd; g.strokeStyle = 'rgba(20,10,40,.9)'; g.lineWidth = 5; g.lineJoin = 'round'; g.lineCap = 'round';
  const fs = () => { g.fill(); g.stroke(); };
  switch (shape) {
    case 'sword': g.save(); g.translate(64, 64); g.rotate(-Math.PI / 4); g.beginPath(); g.moveTo(0, -52); g.lineTo(9, -38); g.lineTo(9, 22); g.lineTo(-9, 22); g.lineTo(-9, -38); g.closePath(); fs(); g.beginPath(); g.rect(-24, 22, 48, 9); fs(); g.beginPath(); g.rect(-5, 31, 10, 20); fs(); g.restore(); break;
    case 'moon': g.beginPath(); g.arc(60, 64, 48, Math.PI * 0.32, Math.PI * 1.68, false); g.quadraticCurveTo(48, 64, 60 + Math.cos(Math.PI * 0.32) * 48, 64 + Math.sin(Math.PI * 0.32) * 48); g.closePath(); fs(); break;
    case 'star': star(g, 64, 66, 50, 22, 5); fs(); break;
    case 'heart': heartPath(g, 64, 70, 44); fs(); break;
    case 'drop': g.beginPath(); g.moveTo(64, 12); g.bezierCurveTo(100, 60, 100, 112, 64, 112); g.bezierCurveTo(28, 112, 28, 60, 64, 12); g.closePath(); fs(); break;
    case 'book': g.beginPath(); g.rect(24, 20, 80, 90); fs(); g.beginPath(); g.moveTo(36, 20); g.lineTo(36, 110); g.stroke(); break;
    case 'lemon': g.beginPath(); g.ellipse(64, 66, 46, 34, -0.3, 0, Math.PI * 2); fs(); g.beginPath(); g.moveTo(98, 42); g.lineTo(110, 32); g.stroke(); break;
    case 'infinity': g.lineWidth = 16; g.strokeStyle = 'rgba(20,10,40,.9)'; g.beginPath(); g.ellipse(42, 64, 24, 18, 0, 0, Math.PI * 2); g.ellipse(86, 64, 24, 18, 0, 0, Math.PI * 2); g.stroke(); g.lineWidth = 9; g.strokeStyle = grd; g.beginPath(); g.ellipse(42, 64, 24, 18, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(86, 64, 24, 18, 0, 0, Math.PI * 2); g.stroke(); break;
    case 'eye': g.beginPath(); g.moveTo(10, 64); g.quadraticCurveTo(64, 10, 118, 64); g.quadraticCurveTo(64, 118, 10, 64); fs(); g.fillStyle = 'rgba(20,10,40,.9)'; g.beginPath(); g.arc(64, 64, 16, 0, Math.PI * 2); g.fill(); break;
    case 'gear': g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 36 : 50; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.closePath(); fs(); g.fillStyle = 'rgba(20,10,40,.9)'; g.beginPath(); g.arc(64, 64, 13, 0, Math.PI * 2); g.fill(); break;
    case 'key': g.beginPath(); g.arc(40, 46, 24, 0, Math.PI * 2); fs(); g.beginPath(); g.rect(56, 40, 56, 12); fs(); g.beginPath(); g.rect(92, 52, 9, 16); fs(); g.beginPath(); g.rect(76, 52, 9, 12); fs(); break;
    case 'bomb': star(g, 64, 64, 52, 28, 4, 0); fs(); break;
    case 'ring': g.lineWidth = 18; g.strokeStyle = 'rgba(20,10,40,.9)'; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); g.lineWidth = 11; g.strokeStyle = grd; g.stroke(); break;
    case 'shield': g.beginPath(); g.moveTo(64, 12); g.lineTo(108, 28); g.quadraticCurveTo(104, 92, 64, 116); g.quadraticCurveTo(24, 92, 20, 28); g.closePath(); fs(); break;
    case 'clock': g.beginPath(); g.arc(64, 66, 46, 0, Math.PI * 2); fs(); g.beginPath(); g.moveTo(64, 66); g.lineTo(64, 34); g.moveTo(64, 66); g.lineTo(88, 74); g.stroke(); break;
    case 'feather': g.beginPath(); g.moveTo(24, 110); g.quadraticCurveTo(30, 30, 104, 16); g.quadraticCurveTo(96, 86, 24, 110); fs(); break;
    case 'mask': g.beginPath(); g.ellipse(64, 60, 48, 40, 0, 0, Math.PI * 2); fs(); g.fillStyle = 'rgba(20,10,40,.9)'; g.beginPath(); g.ellipse(46, 56, 10, 6, 0.3, 0, Math.PI * 2); g.ellipse(82, 56, 10, 6, -0.3, 0, Math.PI * 2); g.fill(); break;
    case 'thread': g.beginPath(); g.ellipse(64, 64, 34, 46, 0, 0, Math.PI * 2); fs(); g.lineWidth = 3; for (let y = 32; y < 98; y += 9) { g.beginPath(); g.moveTo(34, y); g.lineTo(94, y + 6); g.stroke(); } break;
    case 'crown': g.beginPath(); g.moveTo(16, 98); g.lineTo(22, 36); g.lineTo(44, 64); g.lineTo(64, 24); g.lineTo(84, 64); g.lineTo(106, 36); g.lineTo(112, 98); g.closePath(); fs(); break;
    case 'flower': for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5 - Math.PI / 2; g.beginPath(); g.ellipse(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 22, 14, a, 0, Math.PI * 2); fs(); } g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fill(); g.stroke(); break;
    case 'bolt': g.beginPath(); g.moveTo(74, 10); g.lineTo(30, 72); g.lineTo(60, 72); g.lineTo(50, 118); g.lineTo(98, 52); g.lineTo(68, 52); g.closePath(); fs(); break;
    case 'mirror': g.beginPath(); g.ellipse(64, 52, 36, 42, 0, 0, Math.PI * 2); fs(); g.beginPath(); g.rect(56, 92, 16, 26); fs(); break;
    case 'seed': g.beginPath(); g.ellipse(64, 70, 30, 40, 0.4, 0, Math.PI * 2); fs(); g.beginPath(); g.moveTo(64, 30); g.quadraticCurveTo(80, 10, 100, 14); g.stroke(); break;
    case 'bread': g.beginPath(); g.moveTo(16, 82); g.quadraticCurveTo(64, -6, 112, 82); g.quadraticCurveTo(64, 108, 16, 82); fs(); g.lineWidth = 4; for (const x of [44, 64, 84]) { g.beginPath(); g.moveTo(x - 8, 50); g.lineTo(x + 6, 74); g.stroke(); } break;
    default: g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); fs();
  }
}
function shade(hex, k) {
  const n = parseInt(hex.replace('#', '').padEnd(6, hex.slice(-1)), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${f(r)},${f(gg)},${f(b)})`;
}
function normCol(c) { if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; return c; }

const ICON_CACHE = new Map();
/** 아이템 아이콘: { canvas, tex, url } */
export function itemIcon(item) {
  if (ICON_CACHE.has(item.id)) return ICON_CACHE.get(item.id);
  const [c, g] = cv(128, 128), ic = item.icon || {}, col = normCol(ic.col || '#ffffff');
  // 희귀도 테두리 광채
  const rc = RARITY[item.rarity] ? RARITY[item.rarity].color : '#fff';
  const halo = g.createRadialGradient(64, 64, 20, 64, 64, 64); halo.addColorStop(0, rc + '00'); halo.addColorStop(0.7, rc + '33'); halo.addColorStop(1, rc + '00');
  g.fillStyle = halo; g.fillRect(0, 0, 128, 128);
  drawShape(g, ic.shape || 'circle', col);
  if (ic.glyph) {
    g.font = `900 ${ic.glyph.length > 1 ? 30 : 40}px "Noto Serif KR", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(20,10,40,.95)'; g.strokeText(ic.glyph, 64, 70); g.fillStyle = '#fff'; g.fillText(ic.glyph, 64, 70);
  }
  const out = { canvas: c, tex: tex(c), url: c.toDataURL() };
  ICON_CACHE.set(item.id, out);
  return out;
}

/** 픽업/문/함정문/받침대 텍스처 묶음 */
export function makeRogueTextures() {
  const T = {};
  const mk = (w, h, fn) => { const [c, g] = cv(w, h); fn(g, w, h); return tex(c); };
  T.coin = mk(64, 64, (g) => { const gr = g.createRadialGradient(26, 24, 4, 32, 32, 28); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(1, '#c88a10'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.strokeStyle = '#7a4a00'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#7a4a00'; g.font = '900 30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('☾', 32, 34); });
  T.coin5 = mk(64, 64, (g) => { const gr = g.createRadialGradient(26, 24, 4, 32, 32, 28); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8aa0c8'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.strokeStyle = '#334'; g.lineWidth = 3; g.stroke(); g.fillStyle = '#334'; g.font = '900 28px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('5', 32, 34); });
  T.heart = mk(64, 64, (g) => { const gr = g.createLinearGradient(0, 8, 0, 60); gr.addColorStop(0, '#ffd0e0'); gr.addColorStop(1, '#e8305a'); g.fillStyle = gr; heartPath(g, 32, 36, 22); g.fill(); g.strokeStyle = '#601028'; g.lineWidth = 3; g.stroke(); });
  T.key = mk(64, 64, (g) => { g.fillStyle = '#ffd34a'; g.strokeStyle = '#6a4400'; g.lineWidth = 3; g.beginPath(); g.arc(20, 24, 12, 0, 7); g.fill(); g.stroke(); g.fillRect(28, 20, 30, 8); g.strokeRect(28, 20, 30, 8); g.fillRect(48, 28, 6, 10); g.fillRect(38, 28, 6, 7); });
  T.bomb = mk(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#ffc040'); g.fillStyle = gr; star(g, 32, 32, 28, 12, 4, 0); g.fill(); g.strokeStyle = '#7a4a00'; g.lineWidth = 3; g.stroke(); });
  T.p = mk(64, 64, (g) => { g.fillStyle = '#e83040'; g.fillRect(10, 10, 44, 44); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(10, 10, 44, 44); g.fillStyle = '#fff'; g.font = '900 32px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 32, 34); });
  T.P = T.p;
  T.point = mk(64, 64, (g) => { g.fillStyle = '#3070e8'; g.fillRect(10, 10, 44, 44); g.strokeStyle = '#fff'; g.lineWidth = 3; g.strokeRect(10, 10, 44, 44); g.fillStyle = '#fff'; g.font = '900 28px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('点', 32, 34); });
  T.pedestal = mk(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(200,180,255,.35)'); gr.addColorStop(1, 'rgba(200,180,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 44, 0, 7); g.stroke(); g.beginPath(); g.arc(64, 64, 30, 0, 7); g.stroke(); });
  // 문: 고딕 아치 (바닥에 놓이는 문양 + 세워진 아치 스프라이트)
  T.door = mk(256, 256, (g) => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 12; g.lineWidth = 10;
    g.beginPath(); g.moveTo(54, 240); g.lineTo(54, 110); g.quadraticCurveTo(128, -10, 202, 110); g.lineTo(202, 240); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(80, 240); g.lineTo(80, 120); g.quadraticCurveTo(128, 40, 176, 120); g.lineTo(176, 240); g.stroke();
    g.globalAlpha = 0.25; g.beginPath(); g.moveTo(80, 240); g.lineTo(80, 120); g.quadraticCurveTo(128, 40, 176, 120); g.lineTo(176, 240); g.closePath(); g.fill();
  });
  T.doorBars = mk(256, 256, (g) => { g.strokeStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.lineWidth = 9; for (const x of [96, 128, 160]) { g.beginPath(); g.moveTo(x, 236); g.lineTo(x, 90); g.stroke(); } g.lineWidth = 7; g.beginPath(); g.moveTo(72, 150); g.lineTo(184, 150); g.stroke(); });
  T.doorLock = mk(128, 128, (g) => { g.fillStyle = '#ffd34a'; g.strokeStyle = '#4a2a00'; g.lineWidth = 5; g.beginPath(); g.rect(34, 58, 60, 46); g.fill(); g.stroke(); g.beginPath(); g.arc(64, 58, 20, Math.PI, 0); g.stroke(); g.fillStyle = '#4a2a00'; g.beginPath(); g.arc(64, 78, 7, 0, 7); g.fill(); g.fillRect(61, 80, 6, 14); });
  T.skull = mk(128, 128, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 54, 36, 0, 7); g.fill(); g.fillRect(44, 76, 40, 26); g.fillStyle = '#300'; g.beginPath(); g.arc(50, 54, 10, 0, 7); g.arc(78, 54, 10, 0, 7); g.fill(); g.fillRect(52, 90, 6, 12); g.fillRect(70, 90, 6, 12); });
  T.trapdoor = mk(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 120); gr.addColorStop(0, '#000'); gr.addColorStop(0.7, '#1a0a30'); gr.addColorStop(1, 'rgba(26,10,48,0)'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = '#d9c8ff'; g.lineWidth = 6; g.shadowColor = '#d9c8ff'; g.shadowBlur = 16; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke(); g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.beginPath(); g.moveTo(128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70); g.lineTo(128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96); g.stroke(); } });
  T.fountain = mk(256, 256, (g) => { g.strokeStyle = '#bff'; g.shadowColor = '#bff'; g.shadowBlur = 14; g.lineWidth = 6; g.beginPath(); g.ellipse(128, 180, 90, 34, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(110, 180); g.lineTo(116, 90); g.lineTo(140, 90); g.lineTo(146, 180); g.stroke(); g.fillStyle = 'rgba(160,240,255,.35)'; g.beginPath(); g.ellipse(128, 180, 86, 30, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(128, 88); g.quadraticCurveTo(170, 40, 196, 150); g.moveTo(128, 88); g.quadraticCurveTo(86, 40, 60, 150); g.stroke(); });
  return T;
}
