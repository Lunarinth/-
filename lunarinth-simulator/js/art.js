// 절차적 텍스처. 외부 이미지는 보스 스프라이트(assets/lunarinth.png) 하나뿐이고
// 나머지(탄, 달, 구름, 아레나, 플레이어)는 전부 캔버스로 그린다.
import * as THREE from '../vendor/three.module.min.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function mk(w, h, fn) { const [c, g] = canvas(w, h); fn(g, w, h); return tex(c); }

function crescentPath(g, cx, cy, r, cut = 0.82, off = 0.34) {
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(cx + r * off, cy - r * 0.08, r * cut, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
}

export function makeTextures() {
  const T = {};

  T.crescent = mk(128, 128, (g) => {
    g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = 18; g.fillStyle = '#fff';
    crescentPath(g, 58, 64, 44);
    g.shadowBlur = 0;
    const gr = g.createLinearGradient(20, 20, 90, 100);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.55)');
    g.fillStyle = gr; crescentPath(g, 58, 64, 40, 0.8, 0.33);
  });

  T.orb = mk(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.95)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });

  T.shard = mk(128, 128, (g) => {
    g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 16;
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(64, 10); g.lineTo(88, 64); g.lineTo(64, 118); g.lineTo(40, 64); g.closePath(); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(190,190,190,.7)';
    g.beginPath(); g.moveTo(64, 10); g.lineTo(88, 64); g.lineTo(64, 64); g.closePath(); g.fill();
  });

  T.ring = mk(128, 128, (g) => {
    g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = '#fff'; g.shadowBlur = 12;
    g.beginPath(); g.arc(64, 64, 48, 0, Math.PI * 2); g.stroke();
  });

  T.spark = mk(128, 128, (g) => {
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 14;
    g.beginPath();
    g.moveTo(64, 4); g.quadraticCurveTo(68, 60, 124, 64); g.quadraticCurveTo(68, 68, 64, 124);
    g.quadraticCurveTo(60, 68, 4, 64); g.quadraticCurveTo(60, 60, 64, 4); g.fill();
  });

  T.shadow = mk(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    gr.addColorStop(0, 'rgba(0,0,0,.65)'); gr.addColorStop(0.6, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });

  T.pillar = mk(128, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)');
    gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.65, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    g.globalCompositeOperation = 'destination-in';
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.4, 'rgba(0,0,0,.85)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = v; g.fillRect(0, 0, 128, 256);
  });

  // 텔레그래프 원 (바닥 데칼)
  T.zone = mk(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 120);
    gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(0.85, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,.55)');
    g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();
    g.setLineDash([10, 12]); g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,255,255,.7)'; crescentPath(g, 120, 128, 34);
  });

  // 범 텔레그래프: 길이 방향 = 텍스처 x
  T.beam = mk(256, 64, (g) => {
    const v = g.createLinearGradient(0, 0, 0, 64);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.35, 'rgba(255,255,255,.9)');
    v.addColorStop(0.5, 'rgba(255,255,255,1)'); v.addColorStop(0.65, 'rgba(255,255,255,.9)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(0, 0, 256, 64);
    g.globalCompositeOperation = 'destination-in';
    const h = g.createLinearGradient(0, 0, 256, 0);
    h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.9, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = h; g.fillRect(0, 0, 256, 64);
  });

  // 하늘의 달 (헤일로 포함)
  T.moon = mk(1024, 1024, (g) => {
    const halo = g.createRadialGradient(512, 512, 200, 512, 512, 512);
    halo.addColorStop(0, 'rgba(255,255,255,.55)'); halo.addColorStop(0.4, 'rgba(255,255,255,.16)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 1024, 1024);
    const body = g.createRadialGradient(470, 450, 40, 512, 512, 230);
    body.addColorStop(0, '#ffffff'); body.addColorStop(0.7, '#e9e4ff'); body.addColorStop(1, '#bfb4e6');
    g.fillStyle = body; g.beginPath(); g.arc(512, 512, 230, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(512, 512, 230, 0, Math.PI * 2); g.clip();
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 34; i++) {
      const x = 330 + r() * 360, y = 330 + r() * 360, rad = 8 + r() * 36;
      const cg = g.createRadialGradient(x - rad * 0.2, y - rad * 0.2, 1, x, y, rad);
      cg.addColorStop(0, 'rgba(120,105,170,.28)'); cg.addColorStop(1, 'rgba(120,105,170,0)');
      g.fillStyle = cg; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  });


  // 초승달 / 그믐달(신월) 하늘 달: 페이즈별로 크로스페이드한다.
  T.moonCrescent = mk(1024, 1024, (g) => {
    const halo = g.createRadialGradient(512, 512, 120, 512, 512, 512);
    halo.addColorStop(0, 'rgba(255,255,255,.4)'); halo.addColorStop(0.5, 'rgba(255,255,255,.1)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 1024, 1024);
    const [tc, tg] = canvas(1024, 1024);
    const body = tg.createRadialGradient(450, 450, 40, 512, 512, 240);
    body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#d8ccff');
    tg.fillStyle = body; tg.beginPath(); tg.arc(512, 512, 235, 0, Math.PI * 2); tg.fill();
    tg.globalCompositeOperation = 'destination-out';
    tg.beginPath(); tg.arc(512 + 105, 512 - 28, 218, 0, Math.PI * 2); tg.fill();
    g.shadowColor = '#fff'; g.shadowBlur = 40; g.drawImage(tc, 0, 0);
  });
  T.moonNew = mk(1024, 1024, (g) => {
    const halo = g.createRadialGradient(512, 512, 200, 512, 512, 500);
    halo.addColorStop(0, 'rgba(255,255,255,.0)'); halo.addColorStop(0.5, 'rgba(255,255,255,.22)'); halo.addColorStop(0.62, 'rgba(255,255,255,.06)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = 'rgba(6,2,18,.95)'; g.beginPath(); g.arc(512, 512, 232, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.shadowColor = '#fff'; g.shadowBlur = 30;
    g.beginPath(); g.arc(512, 512, 234, 0, Math.PI * 2); g.stroke();
  });

  T.cloud = mk(1024, 256, (g) => {
    let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const x = r() * 1024, y = 90 + r() * 80, rad = 40 + r() * 80;
      const cg = g.createRadialGradient(x, y, 2, x, y, rad);
      cg.addColorStop(0, 'rgba(255,255,255,.2)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = cg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      if (x < rad) { g.save(); g.translate(1024, 0); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
    }
  });

  // 아레나 바닥: 어두운 대리석 + 타일 선
  T.floor = mk(1024, 1024, (g) => {
    const gr = g.createRadialGradient(512, 512, 40, 512, 512, 500);
    gr.addColorStop(0, '#2b1a4d'); gr.addColorStop(0.7, '#1d1038'); gr.addColorStop(1, '#0d0620');
    g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 500, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(512, 512, 496, 0, Math.PI * 2); g.clip();
    g.strokeStyle = 'rgba(190,170,255,.09)'; g.lineWidth = 2;
    for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(512 + i * 64, 0); g.lineTo(512 + i * 64, 1024); g.stroke(); g.beginPath(); g.moveTo(0, 512 + i * 64); g.lineTo(1024, 512 + i * 64); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(210,190,255,.55)'; g.lineWidth = 5;
    g.beginPath(); g.arc(512, 512, 494, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(210,190,255,.2)'; g.lineWidth = 2;
    g.beginPath(); g.arc(512, 512, 478, 0, Math.PI * 2); g.stroke();
  });

  // 회전하는 달의 마법진 (가산 합성)
  T.rune = mk(1024, 1024, (g) => {
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 8;
    g.lineWidth = 3;
    for (const rad of [470, 440, 300, 180]) { g.beginPath(); g.arc(512, 512, rad, 0, Math.PI * 2); g.stroke(); }
    g.lineWidth = 2;
    // 6각 별 두 개
    for (const rot of [0, Math.PI / 6]) {
      g.beginPath();
      for (let i = 0; i < 6; i++) { const a = rot + (i * 2 * Math.PI) / 3 - Math.PI / 2; const x = 512 + Math.cos(a) * 300, y = 512 + Math.sin(a) * 300; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath(); g.stroke();
    }
    // 달의 위상 12개
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2, x = 512 + Math.cos(a) * 455, y = 512 + Math.sin(a) * 455;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.stroke();
      const ph = i / 12; g.beginPath();
      g.arc(0, 0, 15, -Math.PI / 2, Math.PI / 2, false);
      g.ellipse(0, 0, Math.abs(Math.cos(ph * Math.PI * 2)) * 15, 15, 0, Math.PI / 2, -Math.PI / 2, ph < 0.5);
      g.fill(); g.restore();
    }
    // 중앙 초승달
    g.shadowBlur = 14; crescentPath(g, 500, 512, 120, 0.82, 0.3);
    // 방사선
    g.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(512 + Math.cos(a) * 180, 512 + Math.sin(a) * 180); g.lineTo(512 + Math.cos(a) * 300, 512 + Math.sin(a) * 300); g.stroke(); }
  });

  // 고딕 폐허 실루엣 (배경 시차 레이어)
  T.ruins = mk(2048, 512, (g, w, h) => {
    g.fillStyle = '#fff';
    let x = 0, seed = 5; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    while (x < w) {
      const bw = 90 + r() * 140, bh = 180 + r() * 260, kind = r();
      g.beginPath();
      if (kind < 0.45) { // 첨탑
        g.moveTo(x, h); g.lineTo(x, h - bh * 0.6); g.lineTo(x + bw / 2, h - bh); g.lineTo(x + bw, h - bh * 0.6); g.lineTo(x + bw, h);
      } else if (kind < 0.8) { // 고딕 아치 벽
        g.moveTo(x, h); g.lineTo(x, h - bh * 0.7);
        g.lineTo(x + bw, h - bh * 0.7); g.lineTo(x + bw, h);
        const aw = bw * 0.55, ax = x + (bw - aw) / 2;
        g.lineTo(ax + aw, h); g.lineTo(ax + aw, h - bh * 0.35);
        g.quadraticCurveTo(ax + aw / 2, h - bh * 0.62, ax, h - bh * 0.35); g.lineTo(ax, h);
      } else { // 부서진 기둥
        g.moveTo(x + bw * 0.25, h); g.lineTo(x + bw * 0.3, h - bh * 0.8); g.lineTo(x + bw * 0.55, h - bh * 0.7); g.lineTo(x + bw * 0.75, h);
      }
      g.closePath(); g.fill();
      x += bw * (0.55 + r() * 0.5);
    }
  });

  // 룬 문자 탄 (벨리스의 마도서 문자). 얇은 고리 안에 각진 룬 한 글자.
  T.glyph = mk(128, 128, (g) => {
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = '#fff'; g.shadowBlur = 14;
    g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 9;
    g.beginPath(); g.moveTo(50, 30); g.lineTo(50, 100); g.stroke();
    g.beginPath(); g.moveTo(50, 50); g.lineTo(84, 30); g.stroke();
    g.beginPath(); g.moveTo(50, 72); g.lineTo(84, 52); g.stroke();
    g.beginPath(); g.arc(84, 92, 3, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
  });

  // 별 모양 탄 (옵서의 별자리). 4각 별 + 중심 광점.
  T.star = T.spark;


  // ───── 병사 문양 (스테이지 잡몹): 캐릭터가 아니라 문양/성좌/달 모양의 사역물 ─────
  const sig = (draw) => mk(256, 256, (g) => { g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 14; draw(g); });
  const circ = (g, r, lw = 5) => { g.lineWidth = lw; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); };
  T.mob_star = sig((g) => { // 별 문양 (옵서의 성좌 병사)
    circ(g, 112); circ(g, 94, 2.5);
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 36 : 82; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.closePath();
    g.globalAlpha = 0.28; g.fill(); g.globalAlpha = 1; g.stroke();
    g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
  });
  T.mob_lens = sig((g) => { // 렌즈 문양 (관측)
    circ(g, 112); circ(g, 84, 3); g.setLineDash([8, 10]); circ(g, 62, 2.5); g.setLineDash([]);
    g.lineWidth = 3; for (const [x0, y0, x1, y1] of [[128, 8, 128, 70], [128, 186, 128, 248], [8, 128, 70, 128], [186, 128, 248, 128]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    g.beginPath(); g.arc(128, 128, 14, 0, Math.PI * 2); g.fill();
  });
  T.mob_rune = sig((g) => { // 마법진 문양 (벨리스의 룬 병사)
    circ(g, 112); circ(g, 100, 2);
    for (const rot of [0, Math.PI]) { g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 3; i++) { const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / 3; g.lineTo(128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84); } g.closePath(); g.stroke(); }
    g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.beginPath(); g.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.stroke(); }
    circ(g, 26, 4);
  });
  T.mob_page = sig((g) => { // 서장 문양 (펼쳐진 마도서)
    circ(g, 112); circ(g, 96, 2);
    g.lineWidth = 4; g.beginPath(); g.moveTo(128, 70); g.lineTo(128, 188); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(128, 76); g.quadraticCurveTo(128 + s * 50, 58, 128 + s * 82, 84); g.lineTo(128 + s * 82, 176); g.quadraticCurveTo(128 + s * 50, 150, 128, 188); g.stroke();
      g.lineWidth = 2.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(128 + s * 14, 96 + k * 18); g.lineTo(128 + s * 66, 94 + k * 18); g.stroke(); } g.lineWidth = 4; }
  });
  T.mob_moon = sig((g) => { // 달 문양 (루나린스의 월병)
    circ(g, 112); circ(g, 98, 2);
    crescentPath(g, 118, 128, 64, 0.84, 0.34);
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.arc(128 + Math.cos(a) * 105, 128 + Math.sin(a) * 105, 4.5, 0, Math.PI * 2); g.fill(); }
  });
  T.mob_eclipse = sig((g) => { // 월식 문양 (그늘진 월병)
    circ(g, 112, 4);
    g.globalAlpha = 0.5; g.beginPath(); g.arc(128, 128, 66, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.lineWidth = 3; for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8; g.beginPath(); g.moveTo(128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74); g.lineTo(128 + Math.cos(a) * (i % 2 ? 92 : 104), 128 + Math.sin(a) * (i % 2 ? 92 : 104)); g.stroke(); }
    circ(g, 66, 3);
  });

  T.dot = mk(32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });

  return T;
}

// ───────── 클레르(플레이어) 스프라이트 ─────────
// 초대 하녀장. 은빛 식기를 던진다. 직접 그린 임시 아트이며 assets/player.png 가 있으면 그것을 우선한다.
export function drawClaire(g, w, h, step = 0) {
  g.clearRect(0, 0, w, h);
  const cx = w / 2, bob = Math.sin(step * Math.PI) * 3;
  const S = h / 256;
  g.save(); g.scale(S, S); g.translate((w / S - 192) / 2, 0);
  const X = 96;
  const outline = '#1b1230';
  const fillP = (col, path) => { g.fillStyle = col; g.strokeStyle = outline; g.lineWidth = 3; g.lineJoin = 'round'; path(); g.fill(); g.stroke(); };

  // 다리 / 구두
  const lk = step ? 4 : -4;
  fillP('#f6e2d6', () => { g.beginPath(); g.roundRect(X - 22 + lk, 186, 14, 40, 5); });
  fillP('#f6e2d6', () => { g.beginPath(); g.roundRect(X + 8 - lk, 186, 14, 40, 5); });
  fillP('#2a1e3d', () => { g.beginPath(); g.roundRect(X - 28 + lk, 220, 26, 16, 6); });
  fillP('#2a1e3d', () => { g.beginPath(); g.roundRect(X + 2 - lk, 220, 26, 16, 6); });

  g.translate(0, bob);
  // 치마 + 앞치마
  fillP('#2a1e3d', () => { g.beginPath(); g.moveTo(X - 24, 120); g.lineTo(X + 24, 120); g.lineTo(X + 52, 205); g.quadraticCurveTo(X, 218, X - 52, 205); g.closePath(); });
  fillP('#fbf7ff', () => { g.beginPath(); g.moveTo(X - 14, 128); g.lineTo(X + 14, 128); g.lineTo(X + 26, 200); g.quadraticCurveTo(X, 208, X - 26, 200); g.closePath(); });
  g.strokeStyle = '#cdbfe8'; g.lineWidth = 3; g.beginPath(); g.moveTo(X - 40, 206); g.quadraticCurveTo(X, 220, X + 40, 206); g.stroke();
  // 몸통 / 팔
  fillP('#2a1e3d', () => { g.beginPath(); g.roundRect(X - 26, 100, 52, 36, 10); });
  fillP('#fbf7ff', () => { g.beginPath(); g.moveTo(X - 10, 100); g.lineTo(X + 10, 100); g.lineTo(X + 8, 134); g.lineTo(X - 8, 134); g.closePath(); });
  fillP('#2a1e3d', () => { g.beginPath(); g.roundRect(X - 44, 104, 18, 34, 8); });
  fillP('#2a1e3d', () => { g.beginPath(); g.roundRect(X + 26, 98, 18, 34, 8); });
  fillP('#f6e2d6', () => { g.beginPath(); g.arc(X - 35, 142, 8, 0, Math.PI * 2); });
  fillP('#f6e2d6', () => { g.beginPath(); g.arc(X + 35, 136, 8, 0, Math.PI * 2); });
  // 은쟁반 (오른손)
  g.fillStyle = '#e8eefc'; g.strokeStyle = outline; g.lineWidth = 3;
  g.beginPath(); g.ellipse(X + 46, 128, 22, 7, -0.3, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(X + 42, 126, 10, 2.5, -0.3, 0, Math.PI * 2); g.fill();
  // 뒷머리
  fillP('#1d1a33', () => { g.beginPath(); g.ellipse(X, 62, 44, 50, 0, 0, Math.PI * 2); });
  // 얼굴
  fillP('#f9e8dd', () => { g.beginPath(); g.ellipse(X, 70, 34, 32, 0, 0, Math.PI * 2); });
  // 앞머리
  g.fillStyle = '#1d1a33'; g.strokeStyle = outline; g.lineWidth = 3;
  g.beginPath(); g.moveTo(X - 36, 64); g.quadraticCurveTo(X - 30, 30, X, 30); g.quadraticCurveTo(X + 30, 30, X + 36, 64);
  g.quadraticCurveTo(X + 20, 52, X + 8, 60); g.quadraticCurveTo(X, 48, X - 8, 60); g.quadraticCurveTo(X - 20, 52, X - 36, 64); g.closePath(); g.fill(); g.stroke();
  // 눈
  for (const dx of [-14, 14]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(X + dx, 74, 8, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3aa6b8'; g.beginPath(); g.ellipse(X + dx, 76, 6, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0d1a28'; g.beginPath(); g.ellipse(X + dx, 77, 3, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(X + dx - 2, 72, 2.4, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = '#a6636b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X - 5, 90); g.quadraticCurveTo(X, 92, X + 5, 90); g.stroke();
  // 헤드드레스
  fillP('#fbf7ff', () => { g.beginPath(); g.roundRect(X - 34, 28, 68, 14, 7); });
  g.strokeStyle = '#cdbfe8'; g.lineWidth = 2;
  for (let i = -28; i <= 28; i += 8) { g.beginPath(); g.moveTo(X + i, 30); g.lineTo(X + i + 3, 40); g.stroke(); }
  fillP('#2a1e3d', () => { g.beginPath(); g.moveTo(X + 34, 36); g.lineTo(X + 58, 24); g.lineTo(X + 54, 48); g.closePath(); });
  fillP('#2a1e3d', () => { g.beginPath(); g.moveTo(X + 34, 36); g.lineTo(X + 60, 50); g.lineTo(X + 44, 56); g.closePath(); });
  g.restore();
}

export function makePlayerTextures() {
  const frames = [0, 1].map((s) => mk(192, 256, (g, w, h) => drawClaire(g, w, h, s)));
  const portrait = mk(256, 256, (g, w, h) => {
    g.save(); g.translate(-30, -22); g.scale(1.55, 1.55); drawClaire(g, 192, 256, 0); g.restore();
  });
  return { frames, portrait };
}

export function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}
