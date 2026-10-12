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

  // ───── 스테이지별 전장 환경: 바닥 + 배경 실루엣 ─────
  const rr = (seed0) => { let sd = seed0; return () => ((sd = (sd * 16807) % 2147483647) / 2147483647); };
  const floorVar = (c0, c1, c2, line, style) => mk(1024, 1024, (g) => {
    const gr = g.createRadialGradient(512, 512, 40, 512, 512, 500);
    gr.addColorStop(0, c0); gr.addColorStop(0.7, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 500, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(512, 512, 496, 0, Math.PI * 2); g.clip();
    g.strokeStyle = line; g.fillStyle = line;
    if (style === 'grid') { g.lineWidth = 2; for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(512 + i * 64, 0); g.lineTo(512 + i * 64, 1024); g.stroke(); g.beginPath(); g.moveTo(0, 512 + i * 64); g.lineTo(1024, 512 + i * 64); g.stroke(); } g.lineWidth = 3; for (let i = 0; i < 26; i++) { const x = 40 + ((i * 197) % 940), y = 40 + ((i * 331) % 940); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 64, y); g.lineTo(x + 64, y + 64); g.stroke(); g.fillRect(x - 4, y - 4, 8, 8); } }
    else if (style === 'check') { for (let i = -8; i < 8; i++) for (let j = -8; j < 8; j++) if ((i + j) & 1) { g.globalAlpha = 0.5; g.fillRect(512 + i * 80, 512 + j * 80, 80, 80); } g.globalAlpha = 1; }
    else if (style === 'planks') { g.lineWidth = 2; for (let j = -9; j <= 9; j++) { g.beginPath(); g.moveTo(0, 512 + j * 56); g.lineTo(1024, 512 + j * 56); g.stroke(); for (let i = 0; i < 9; i++) { const x = ((i * 173 + j * 97) % 1024 + 1024) % 1024; g.beginPath(); g.moveTo(x, 512 + j * 56); g.lineTo(x, 512 + j * 56 + 56); g.stroke(); } } }
    else if (style === 'tiles') { g.lineWidth = 2; for (let k = 1; k < 8; k++) { g.strokeRect(512 - k * 62, 512 - k * 62, k * 124, k * 124); } for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(512, 512); g.lineTo(512 + Math.cos(i * Math.PI / 2 + 0.78) * 700, 512 + Math.sin(i * Math.PI / 2 + 0.78) * 700); g.stroke(); } }
    else if (style === 'boards') { g.lineWidth = 3; for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(512 + i * 58, 0); g.lineTo(512 + i * 58, 1024); g.stroke(); } g.globalAlpha = 0.25; g.beginPath(); g.arc(512, 512, 180, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.restore();
    g.strokeStyle = line; g.globalAlpha = 0.9; g.lineWidth = 5; g.beginPath(); g.arc(512, 512, 494, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 0.35; g.lineWidth = 2; g.beginPath(); g.arc(512, 512, 478, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  });
  T.envFloor = {
    observatory: floorVar('#16254f', '#0f1a3d', '#060d24', 'rgba(150,190,255,.14)', 'tiles'),
    techlab: floorVar('#0e2b3d', '#0a1d2e', '#040e18', 'rgba(110,220,255,.22)', 'grid'),
    terrace: floorVar('#5a3a45', '#3d2433', '#1e101c', 'rgba(255,190,150,.16)', 'check'),
    library: floorVar('#3f2a1a', '#2a1a10', '#120a06', 'rgba(255,214,140,.14)', 'planks'),
    archive: floorVar('#2a1650', '#1a0c36', '#0a0420', 'rgba(210,170,255,.16)', 'tiles'),
    theater: floorVar('#4a0f1c', '#2c0810', '#120308', 'rgba(255,120,140,.2)', 'boards'),
    moongarden: T.floor,
  };
  const silhouette = (seed0, drawOne) => mk(2048, 512, (g, w, h) => {
    g.fillStyle = '#fff'; const r = rr(seed0); let x = 0;
    while (x < w) { const bw = 80 + r() * 150, bh = 150 + r() * 280; g.beginPath(); drawOne(g, x, h, bw, bh, r()); g.closePath(); g.fill(); x += bw * (0.55 + r() * 0.5); }
  });
  const hole = (g, x, y, ww, hh) => { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillRect(x, y, ww, hh); g.restore(); };
  T.envRuins = {
    // 관측대: 돔과 망원경 탑
    observatory: silhouette(21, (g, x, h, bw, bh, k) => {
      if (k < 0.5) { g.moveTo(x, h); g.lineTo(x, h - bh * 0.5); g.arc(x + bw / 2, h - bh * 0.5, bw / 2, Math.PI, 0); g.lineTo(x + bw, h); }
      else { g.moveTo(x + bw * 0.3, h); g.lineTo(x + bw * 0.38, h - bh); g.lineTo(x + bw * 0.5, h - bh); g.lineTo(x + bw * 0.7, h); }
    }),
    // 기술실: 서버 랙 탑과 안테나
    techlab: silhouette(33, (g, x, h, bw, bh, k) => {
      if (k < 0.65) { g.rect(x, h - bh, bw * 0.7, bh); } else { g.moveTo(x + bw * 0.3, h); g.lineTo(x + bw * 0.34, h - bh * 1.15); g.lineTo(x + bw * 0.38, h); }
    }),
    // 테라스: 아치 회랑과 굴뚝 · 돔
    terrace: silhouette(47, (g, x, h, bw, bh, k) => {
      if (k < 0.5) { g.rect(x, h - bh * 0.55, bw, bh * 0.55); g.moveTo(x + bw * 0.1, h - bh * 0.55); g.arc(x + bw / 2, h - bh * 0.55, bw * 0.4, Math.PI, 0); }
      else if (k < 0.8) { g.rect(x + bw * 0.3, h - bh * 0.9, bw * 0.22, bh * 0.9); }
      else { g.moveTo(x, h); g.lineTo(x + bw / 2, h - bh * 0.7); g.lineTo(x + bw, h); }
    }),
    // 도서관: 서가 벽 (칸막이) + 아치창
    library: mk(2048, 512, (g, w, h) => {
      g.fillStyle = '#fff'; const r = rr(59); let x = 0;
      while (x < w) { const bw = 110 + r() * 120, bh = 200 + r() * 230; g.fillRect(x, h - bh, bw, bh); for (let y = h - bh + 24; y < h; y += 34) hole(g, x + 6, y, bw - 12, 5); if (r() < 0.4) { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(x + bw * 0.3, h - bh * 0.4); g.lineTo(x + bw * 0.3, h - bh * 0.6); g.quadraticCurveTo(x + bw / 2, h - bh * 0.78, x + bw * 0.7, h - bh * 0.6); g.lineTo(x + bw * 0.7, h - bh * 0.4); g.fill(); g.restore(); } x += bw + 8 + r() * 30; }
    }),
    // 기록실: 가는 기둥과 두루마리 통
    archive: silhouette(71, (g, x, h, bw, bh, k) => {
      if (k < 0.6) { g.rect(x + bw * 0.35, h - bh, bw * 0.2, bh); g.moveTo(x + bw * 0.3, h - bh); g.arc(x + bw * 0.45, h - bh, bw * 0.16, Math.PI, 0); }
      else { g.moveTo(x, h); g.lineTo(x, h - bh * 0.6); g.lineTo(x + bw, h - bh * 0.6); g.lineTo(x + bw, h); }
    }),
    // 극장: 프로시니엄 기둥과 커튼 주름
    theater: silhouette(83, (g, x, h, bw, bh, k) => {
      if (k < 0.5) { g.rect(x, h - bh * 1.1, bw * 0.28, bh * 1.1); }
      else { g.moveTo(x, h); g.quadraticCurveTo(x + bw * 0.2, h - bh * 0.9, x + bw * 0.5, h - bh * 0.35); g.quadraticCurveTo(x + bw * 0.8, h - bh * 0.9, x + bw, h); }
    }),
    moongarden: T.ruins,
  };

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


  // ───── v4: 새 탄 종류 ─────
  T.pixel = mk(64, 64, (g) => { // 픽셀(패킷) 탄
    g.shadowColor = '#fff'; g.shadowBlur = 10; g.fillStyle = '#fff'; g.fillRect(14, 14, 36, 36);
    g.shadowBlur = 0; g.fillStyle = 'rgba(180,180,180,.8)'; g.fillRect(14, 14, 18, 18);
  });
  T.pagebullet = mk(96, 96, (g) => { // 페이지(쪽) 탄
    g.shadowColor = '#fff'; g.shadowBlur = 10; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(26, 14, 44, 68, 5); g.fill();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(120,120,120,.85)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(34, 28 + i * 11); g.lineTo(62, 28 + i * 11); g.stroke(); }
  });
  T.blade = mk(128, 64, (g) => { // 검섬(칼날) 탄: +x 방향으로 뾰족
    g.shadowColor = '#fff'; g.shadowBlur = 12; g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(8, 32); g.quadraticCurveTo(60, 22, 120, 32); g.quadraticCurveTo(60, 42, 8, 32); g.fill();
    g.shadowBlur = 0; g.fillStyle = 'rgba(200,200,200,.75)'; g.beginPath(); g.moveTo(40, 32); g.lineTo(118, 32); g.lineTo(60, 27); g.closePath(); g.fill();
  });
  T.petal = mk(96, 96, (g) => { // 꽃잎 탄
    g.shadowColor = '#fff'; g.shadowBlur = 10; g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(48, 12); g.bezierCurveTo(80, 28, 80, 68, 48, 86); g.bezierCurveTo(16, 68, 16, 28, 48, 12); g.fill();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(150,150,150,.8)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(48, 20); g.lineTo(48, 78); g.stroke();
  });
  T.holo = mk(256, 160, (g) => { // 홀로그램 패널 (시야 차단 기믹)
    g.fillStyle = 'rgba(80,170,255,.55)'; g.beginPath(); g.roundRect(6, 6, 244, 148, 10); g.fill();
    g.strokeStyle = 'rgba(200,240,255,.95)'; g.lineWidth = 4; g.beginPath(); g.roundRect(6, 6, 244, 148, 10); g.stroke();
    g.strokeStyle = 'rgba(220,245,255,.8)'; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(24, 34 + i * 18); g.lineTo(24 + 70 + ((i * 53) % 110), 34 + i * 18); g.stroke(); }
    g.beginPath(); g.arc(196, 70, 34, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(196, 30); g.lineTo(196, 110); g.moveTo(156, 70); g.lineTo(236, 70); g.stroke();
  });
  // 병사 문양 추가: 회로 / 장미창 / 서가 / 장부 / 인형
  T.mob_circuit = sig((g) => {
    circ(g, 112); circ(g, 92, 2.5);
    g.lineWidth = 4; g.strokeRect(78, 78, 100, 100);
    for (let i = 0; i < 4; i++) { for (const [x, y, dx, dy] of [[98 + i * 20, 78, 0, -26], [98 + i * 20, 178, 0, 26], [78, 98 + i * 20, -26, 0], [178, 98 + i * 20, 26, 0]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke(); } }
    g.globalAlpha = 0.35; g.fillRect(104, 104, 48, 48); g.globalAlpha = 1; g.beginPath(); g.arc(128, 128, 10, 0, Math.PI * 2); g.fill();
  });
  T.mob_rose = sig((g) => {
    circ(g, 112); circ(g, 100, 2);
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.beginPath(); g.ellipse(128 + Math.cos(a) * 56, 128 + Math.sin(a) * 56, 26, 11, a, 0, Math.PI * 2); g.stroke(); }
    circ(g, 32, 4); g.beginPath(); g.arc(128, 128, 9, 0, Math.PI * 2); g.fill();
  });
  T.mob_tome = sig((g) => {
    circ(g, 112); circ(g, 96, 2);
    g.lineWidth = 4; g.strokeRect(76, 90, 104, 78); g.beginPath(); g.moveTo(128, 90); g.lineTo(128, 168); g.stroke();
    g.beginPath(); g.arc(128, 70, 14, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(128, 84); g.lineTo(128, 116); g.moveTo(128, 104); g.lineTo(140, 104); g.stroke();
    g.lineWidth = 2.5; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(88, 108 + k * 18); g.lineTo(118, 108 + k * 18); g.moveTo(138, 108 + k * 18); g.lineTo(168, 108 + k * 18); g.stroke(); }
  });
  T.mob_ledger = sig((g) => {
    circ(g, 112); circ(g, 100, 2);
    g.lineWidth = 3.5; g.strokeRect(72, 64, 112, 128);
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(72, 90 + k * 18); g.lineTo(184, 90 + k * 18); g.stroke(); }
    g.beginPath(); g.moveTo(112, 64); g.lineTo(112, 192); g.stroke(); circ(g, 22, 4);
  });
  T.mob_puppet = sig((g) => {
    circ(g, 112); circ(g, 96, 2);
    g.lineWidth = 4; g.beginPath(); g.moveTo(78, 74); g.lineTo(178, 74); g.stroke(); g.beginPath(); g.moveTo(128, 74); g.lineTo(128, 96); g.stroke();
    for (const x of [92, 128, 164]) { g.lineWidth = 2; g.beginPath(); g.moveTo(x, 74); g.lineTo(128, 120); g.stroke(); }
    g.lineWidth = 4; g.beginPath(); g.arc(128, 132, 22, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(128, 154); g.lineTo(128, 196); g.moveTo(104, 168); g.lineTo(152, 168); g.moveTo(128, 196); g.lineTo(108, 224); g.moveTo(128, 196); g.lineTo(148, 224); g.stroke();
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
