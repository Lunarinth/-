// Three.js 월드: 2.5D 카메라, 하늘/달/구름/폐허 시차 배경, 부유하는 아레나, 페이즈별 테마.
import * as THREE from '../vendor/three.module.min.js';

export const ARENA_R = 10.2;

const THEMES = {
  lumina: { top: 0x0c0730, mid: 0x2e2174, bot: 0xa485ea, moon: 0xfff4d6, rune: 0xd9c8ff, cloud: 0xcdbbff, ruin: 0x140b38, ruinFar: 0x5b49a8, star: 1.0, moonScale: 62, nx: -0.42, ny: 0.5, mc: [1, 0, 0] },
  umbra: { top: 0x03010a, mid: 0x12083a, bot: 0x3a1b78, moon: 0x8a66e0, rune: 0x8a5cff, cloud: 0x3a2a70, ruin: 0x05020f, ruinFar: 0x1f1245, star: 0.7, moonScale: 66, nx: 0.38, ny: 0.5, mc: [0, 1, 0] },
  astral: { top: 0x020618, mid: 0x0b2155, bot: 0x4a7fd8, moon: 0xdce9ff, rune: 0x9cc3ff, cloud: 0x7fa8ff, ruin: 0x050b24, ruinFar: 0x1d3b86, star: 1.3, moonScale: 56, nx: 0.42, ny: 0.5, mc: [1, 0, 0] },
  arcane: { top: 0x07010f, mid: 0x2a0a4d, bot: 0x7a2fb8, moon: 0xd9a8ff, rune: 0xc060ff, cloud: 0x6a2a9a, ruin: 0x0a0214, ruinFar: 0x3b1166, star: 0.8, moonScale: 64, nx: -0.35, ny: 0.45, mc: [0, 1, 0] },
  void: { top: 0x000000, mid: 0x04010a, bot: 0x180a2e, moon: 0x6a50b0, rune: 0x7a4bd8, cloud: 0x160c2a, ruin: 0x020106, ruinFar: 0x0b0618, star: 0.3, moonScale: 40, nx: 0.38, ny: 0.5, mc: [0, 0, 0] },
  techlab: { top: 0x01060f, mid: 0x07283f, bot: 0x2ec4e8, moon: 0xbff4ff, rune: 0x6fe3ff, cloud: 0x3aa6cf, ruin: 0x020a14, ruinFar: 0x0d4560, star: 0.5, moonScale: 44, nx: 0.4, ny: 0.5, mc: [0, 1, 0] },
  terrace: { top: 0x2a0f2e, mid: 0xa8466a, bot: 0xffb27a, moon: 0xffe6c9, rune: 0xffc59a, cloud: 0xffa89a, ruin: 0x2a0f22, ruinFar: 0x9a4a63, star: 0.45, moonScale: 58, nx: -0.45, ny: 0.4, mc: [1, 0, 0] },
  library: { top: 0x080a06, mid: 0x1e3a22, bot: 0x8ab04a, moon: 0xf4f0c0, rune: 0xe8d88a, cloud: 0x5a8a4a, ruin: 0x0a0f06, ruinFar: 0x35572a, star: 0.35, moonScale: 40, nx: 0.45, ny: 0.55, mc: [0, 1, 0] },
  theater: { top: 0x080106, mid: 0x4a0a1c, bot: 0xe0405a, moon: 0xffc0c8, rune: 0xff6a80, cloud: 0xb0304a, ruin: 0x10020a, ruinFar: 0x6a1428, star: 0.3, moonScale: 36, nx: 0.0, ny: 0.55, mc: [0, 1, 0] },
  hell: { top: 0x040001, mid: 0x3c0612, bot: 0xff2b3d, moon: 0xff9a9a, rune: 0xff3045, cloud: 0xa01426, ruin: 0x080002, ruinFar: 0x4e0a1a, star: 0.25, moonScale: 44, nx: 0.0, ny: 0.55, mc: [0, 1, 0] },
  luna: { top: 0x1c0530, mid: 0x6a1a6e, bot: 0xff8ac8, moon: 0xffe9b0, rune: 0xff7ac8, cloud: 0xff9ad0, ruin: 0x1d0828, ruinFar: 0x8a2f85, star: 0.55, moonScale: 200, nx: 0.0, ny: 0.34, mc: [0, 0, 1] },
};

for (const t of Object.values(THEMES)) {
  for (const k of ['top', 'mid', 'bot', 'moon', 'rune', 'cloud', 'ruin', 'ruinFar']) t[k + 'C'] = new THREE.Color(t[k]);
}

// ───────── 전장별 배경 연출 ─────────
// 각 레이어: tex, color(배열이면 무작위), n(개수), s[최소,최대] 크기, op 불투명도, box 출현 범위, v* 속도 범위, sway[진폭,주파수], spin, tw(반짝임), thread(세로 실), streak(유성)
const BOX = { x: [-23, 23], y: [0.4, 8], z: [-17, 10] };
const ENV_FX = {
  observatory: [
    { tex: 'spark', color: [0xcfe0ff, 0x9cc3ff, 0xffffff], n: 40, s: [0.2, 0.55], op: 0.55, vx: [-0.25, 0.25], vy: [0.02, 0.2], vz: [-0.1, 0.1], tw: 0.5, box: { ...BOX, y: [1, 9] } },
    { tex: 'dot', color: 0x9cc3ff, n: 30, s: [0.12, 0.25], op: 0.5, vx: [-0.1, 0.1], vy: [0.05, 0.25], vz: [0, 0], tw: 0.7, box: BOX },
    { tex: 'beam', color: 0xdff0ff, n: 2, streak: true, s: [6, 0.14], op: 0.8, every: [3, 8] },
  ],
  techlab: [
    { tex: 'pixel', color: [0x6fe3ff, 0x9ff0ff, 0x2ec4e8], n: 56, s: [0.16, 0.34], op: 0.5, vx: [0, 0], vy: [1.0, 2.4], vz: [0, 0], lane: 1.6, tw: 0.3, box: { ...BOX, y: [0, 7] }, fadeTop: 7 },
    { tex: 'beam', color: 0x6fe3ff, n: 6, streak: true, s: [4, 0.07], op: 0.55, every: [1.5, 4], flat: true },
  ],
  terrace: [
    { tex: 'petal', color: [0xff9fb8, 0xffc0cc, 0xffd0a0], n: 52, s: [0.34, 0.72], op: 0.7, vx: [0.5, 1.4], vy: [-1.5, -0.7], vz: [0.1, 0.5], sway: [0.9, 1.8], spin: [-1.5, 1.5], box: { ...BOX, y: [0.4, 9] } },
    { tex: 'dot', color: 0xffe0b0, n: 24, s: [0.15, 0.3], op: 0.4, vx: [0.2, 0.7], vy: [-0.1, 0.2], vz: [0, 0], tw: 0.6, box: BOX },
  ],
  library: [
    { tex: 'pagebullet', color: [0xffe9a0, 0xfff4d0, 0xe8d88a], n: 20, s: [0.5, 0.95], op: 0.4, vx: [-0.25, 0.25], vy: [-0.35, 0.25], vz: [-0.1, 0.1], sway: [0.5, 0.7], spin: [-0.6, 0.6], box: { ...BOX, y: [0.8, 8] } },
    { tex: 'dot', color: 0xffe9a0, n: 56, s: [0.08, 0.2], op: 0.5, vx: [-0.08, 0.08], vy: [0.04, 0.2], vz: [0, 0], tw: 0.6, box: BOX },
  ],
  archive: [
    { tex: 'glyph', color: [0xc89bff, 0xe0c8ff, 0xa66bff], n: 24, s: [0.45, 0.95], op: 0.4, vx: [-0.1, 0.1], vy: [0.25, 0.7], vz: [0, 0], spin: [-0.5, 0.5], tw: 0.35, box: { ...BOX, y: [0, 8] }, fadeTop: 8 },
    { tex: 'dot', color: 0xd9c8ff, n: 36, s: [0.1, 0.22], op: 0.5, vx: [-0.05, 0.05], vy: [0.1, 0.4], vz: [0, 0], tw: 0.6, box: BOX },
  ],
  moongarden: [
    { tex: 'crescent', color: [0xe3d6ff, 0xfff1c9], n: 16, s: [0.4, 0.85], op: 0.4, vx: [-0.2, 0.2], vy: [0.15, 0.5], vz: [0, 0], sway: [0.6, 0.8], spin: [-0.6, 0.6], tw: 0.3, box: { ...BOX, y: [0, 8] }, fadeTop: 8 },
    { tex: 'dot', color: [0xfff1c9, 0xd9c8ff, 0xffd0f0], n: 48, s: [0.14, 0.34], op: 0.65, vx: [-0.2, 0.2], vy: [0.1, 0.45], vz: [-0.1, 0.1], sway: [0.4, 1.1], tw: 0.8, box: BOX },
    { tex: 'beam', color: 0xfff1c9, n: 1, streak: true, s: [6, 0.12], op: 0.7, every: [5, 11] },
  ],
  theater: [
    { tex: 'pillar', color: 0xff6a80, n: 22, s: [0.1, 8], op: 0.28, thread: true, sway: [0.35, 0.6], box: { x: [-22, 22], y: [10, 10], z: [-17, 9] } },
    { tex: 'dot', color: [0xffc0c8, 0xff6a80], n: 50, s: [0.1, 0.26], op: 0.5, vx: [-0.12, 0.12], vy: [0.05, 0.3], vz: [0, 0], tw: 0.7, box: BOX },
    { tex: 'spark', color: 0xffd0d8, n: 10, s: [0.25, 0.5], op: 0.5, vx: [-0.1, 0.1], vy: [-0.1, 0.1], vz: [0, 0], tw: 0.9, box: BOX },
  ],
  theaterHell: [
    { tex: 'pillar', color: [0xff2b3d, 0xff5060], n: 34, s: [0.1, 8], op: 0.36, thread: true, sway: [0.6, 1.1], box: { x: [-22, 22], y: [10, 10], z: [-17, 9] } },
    { tex: 'spark', color: [0xff3045, 0xff7a7a], n: 44, s: [0.22, 0.6], op: 0.65, vx: [-0.3, 0.3], vy: [0.8, 2.2], vz: [0, 0], tw: 0.8, box: { ...BOX, y: [0, 7] }, fadeTop: 7 },
    { tex: 'dot', color: 0xff2b3d, n: 30, s: [0.12, 0.3], op: 0.5, vx: [-0.2, 0.2], vy: [0.1, 0.5], vz: [0, 0], tw: 0.8, box: BOX },
  ],
};
// 전장별 색조/움직임: cloud 구름 농도, cloudSp 구름 속도 배율, rune 바닥 마법진 농도, tint 바닥 색조, sway 원경 흔들림 [진폭, 속도]
const ENV_CFG = {
  observatory: { cloud: 0.55, cloudSp: 0.4, rune: 0.6, tint: 0xd8e4ff, sway: [2, 0.03] },
  techlab: { cloud: 0.5, cloudSp: 2.2, rune: 0.35, tint: 0xd0f4ff, sway: [1, 0.12] },
  terrace: { cloud: 1.1, cloudSp: 1.6, rune: 0.5, tint: 0xfff0e6, sway: [2.5, 0.05] },
  library: { cloud: 0.7, cloudSp: 0.3, rune: 0.55, tint: 0xfff0d8, sway: [1.2, 0.04] },
  archive: { cloud: 0.8, cloudSp: 0.5, rune: 1.1, tint: 0xe8d8ff, sway: [1, 0.03] },
  moongarden: { cloud: 1.15, cloudSp: 1.0, rune: 1.0, tint: 0xffffff, sway: [3, 0.04] },
  theater: { cloud: 0.8, cloudSp: 0.3, rune: 0.55, tint: 0xffe6ea, sway: [5, 0.22] },
  theaterHell: { cloud: 1.1, cloudSp: 0.8, rune: 0.8, tint: 0xffd0d0, sway: [8, 0.5] },
};
const DEF_CFG = { cloud: 1, cloudSp: 1, rune: 1, tint: 0xffffff, sway: [1.5, 0.03] };
const ENV_TINT = {}; for (const k of Object.keys(ENV_CFG)) ENV_TINT[k] = new THREE.Color(ENV_CFG[k].tint);
const rr = (a, b) => a + Math.random() * (b - a);
const WHITE = new THREE.Color(0xffffff);

const SKY_VS = `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FS = `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float pulse; uniform vec2 res; uniform vec2 glowAt;
void main(){
  vec2 uv = gl_FragCoord.xy / res; float y = uv.y;
  vec3 c = mix(bot, mid, smoothstep(0.05, 0.58, y)); c = mix(c, top, smoothstep(0.5, 1.0, y));
  float d = distance(uv * vec2(res.x / res.y, 1.0), glowAt * vec2(res.x / res.y, 1.0));
  c += (1.0 - smoothstep(0.0, 0.55, d)) * (0.1 + pulse * 0.12) * vec3(1.0, 0.75, 1.0);
  gl_FragColor = vec4(c, 1.0); }`;

export class World {
  constructor(canvas, T) {
    this.T = T;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.camBase = new THREE.Vector3(0, 13.6, 21.5);
    this.camLook = new THREE.Vector3(0, 0.6, -1.2);
    this.fovBase = 42;
    this.dolly = 0; this.dollyTarget = 0;
    this.shakeAmt = 0; this.shakeT = 0; this.shakeOn = true;
    this.fovKick = 0;
    this.theme = 'lumina';
    this.t = 0; this.pulse = 0; this._dir = new THREE.Vector3(); this._dir2 = new THREE.Vector3();

    this._buildSky();
    this._buildStars();
    this._buildMoons();
    this._buildLayers();
    this._buildArena();
    this._buildEnvFx();
    this.envK = { cloud: 1, cloudSp: 1, rune: 1, sa: 1.5, sf: 0.03, tint: new THREE.Color(0xffffff) };

    // 현재 보간 색상
    const th = THEMES.lumina;
    this.cur = {
      top: th.topC.clone(), mid: th.midC.clone(), bot: th.botC.clone(), moon: th.moonC.clone(),
      rune: th.runeC.clone(), cloud: th.cloudC.clone(), ruin: th.ruinC.clone(), ruinFar: th.ruinFarC.clone(),
      star: th.star, moonScale: th.moonScale, nx: th.nx, ny: th.ny, mc: [...th.mc],
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const pr = this.renderer.getPixelRatio();
    if (this.sky) this.sky.material.uniforms.res.value.set(w * pr, h * pr);
    this.camera.aspect = w / h;
    // 세로가 긴 화면에서는 시야를 넓혀서 아레나가 잘리지 않게 한다
    this.fovBase = w / h < 1.4 ? 42 + (1.4 - w / h) * 22 : 42;
    this.camera.fov = this.fovBase;
    this.camera.updateProjectionMatrix();
  }

  _buildSky() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, pulse: { value: 0 }, res: { value: new THREE.Vector2(1280, 720) }, glowAt: { value: new THREE.Vector2(0.5, 0.7) } },
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 16, 8), mat); this.sky.frustumCulled = false;
    this.sky.renderOrder = -100;
    this.scene.add(this.sky);
  }

  _buildStars() {
    // 별은 카메라에 붙어 있고(원경이라 시차 없음) 화면 위쪽 영역에 분포한다.
    const n = 520;
    this.starNdc = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { this.starNdc[i * 2] = Math.random() * 2 - 1; this.starNdc[i * 2 + 1] = 1 - Math.pow(Math.random(), 1.6) * 1.5; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ map: this.T.dot, size: 4.2, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
    this.stars.renderOrder = -90; this.stars.frustumCulled = false;
    this._starFov = -1;
    this.scene.add(this.stars);
  }

  _layoutStars() {
    const cam = this.camera, D = 200, th = Math.tan((cam.fov * Math.PI) / 360), p = this.stars.geometry.attributes.position, n = this.starNdc.length / 2;
    for (let i = 0; i < n; i++) p.setXYZ(i, this.starNdc[i * 2] * th * cam.aspect * D, this.starNdc[i * 2 + 1] * th * D, -D);
    p.needsUpdate = true; this._starFov = cam.fov + cam.aspect;
  }

  _buildMoons() {
    const mk = (map) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.renderOrder = -80; this.scene.add(s); return s;
    };
    this.moons = [mk(this.T.moonCrescent), mk(this.T.moonNew), mk(this.T.moon)]; // lumina, umbra, luna
    // 달 앞의 소용돌이 후광 (루나 페이즈에서 강해짐)
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.orb, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.0 }));
    this.halo.renderOrder = -79; this.scene.add(this.halo);
    // 종월: 하늘에서 내려오는 거대한 달
    this.fall = null;
    this.fallMoon = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.moon, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9c0, opacity: 0 }));
    this.fallMoon.renderOrder = -78; this.fallMoon.visible = false; this.scene.add(this.fallMoon);
  }

  _buildLayers() {
    const T = this.T;
    this.clouds = [];
    const defs = [{ z: -55, y: 7, w: 220, h: 55, op: 0.55, sp: 0.004 }, { z: -38, y: 3.5, w: 160, h: 40, op: 0.5, sp: -0.007 }, { z: -24, y: -0.5, w: 120, h: 30, op: 0.42, sp: 0.011 }];
    for (const d of defs) {
      const map = T.cloud.clone(); map.wrapS = THREE.RepeatWrapping; map.repeat.set(2, 1); map.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: d.op, blending: THREE.AdditiveBlending }));
      m.position.set(0, d.y, d.z); m.renderOrder = -70; this.scene.add(m); this.clouds.push({ m, map, sp: d.sp });
    }
    this.ruins = [];
    const rdefs = [{ z: -78, y: -17, w: 250, h: 30, far: true }, { z: -52, y: -15, w: 170, h: 20, far: false }];
    for (const d of rdefs) {
      const map = T.ruins.clone(); map.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: 0x000000 }));
      m.position.set(d.far ? 12 : -8, d.y + d.h / 2, d.z); m.renderOrder = -60 + (d.far ? 0 : 1);
      this.scene.add(m); this.ruins.push({ m, far: d.far });
    }
  }

  _buildArena() {
    const T = this.T;
    const root = (this.arena = new THREE.Group());
    const S = ARENA_R * 2 + 0.6;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.floor, transparent: true, depthWrite: false }));
    floor.renderOrder = -20; root.add(floor); this.floor = floor;
    this.rune = new THREE.Mesh(new THREE.PlaneGeometry(S, S).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.rune, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4 }));
    this.rune.position.y = 0.02; this.rune.renderOrder = -19; root.add(this.rune);
    this.rune2 = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.62, S * 0.62).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.rune, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
    this.rune2.position.y = 0.03; this.rune2.renderOrder = -18; root.add(this.rune2);
    // 두께: 떠 있는 섬
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R + 0.1, ARENA_R * 0.45, 3.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x120826, side: THREE.DoubleSide }));
    rock.position.y = -1.7; root.add(rock);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R + 0.05, 0.07, 6, 80).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd9c8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    rim.position.y = -0.02; root.add(rim); this.rim = rim;
    this.scene.add(root);
  }

  _buildEnvFx() {
    const g = new THREE.Group(); this.scene.add(g); this.fxGroup = g; this.fxs = [];
    for (let i = 0; i < 130; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.T.dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
      const spr = new THREE.Sprite(mat); spr.renderOrder = -5; spr.visible = false; g.add(spr);
      this.fxs.push({ spr, mat, on: false });
    }
  }
  _fxSpawn(p, L, init) {
    const B = L.box || BOX;
    p.L = L; p.x = rr(B.x[0], B.x[1]); p.y = rr(B.y[0], B.y[1]); p.z = rr(B.z[0], B.z[1]);
    if (L.lane) p.x = Math.round(p.x / L.lane) * L.lane;
    p.vx = L.vx ? rr(L.vx[0], L.vx[1]) : 0; p.vy = L.vy ? rr(L.vy[0], L.vy[1]) : 0; p.vz = L.vz ? rr(L.vz[0], L.vz[1]) : 0;
    p.ph = Math.random() * 6.28; p.sz = rr(L.s[0], L.s[1]); p.spin = L.spin ? rr(L.spin[0], L.spin[1]) : 0; p.rot = Math.random() * 6.28; p.x0 = p.x;
    p.mat.map = this.T[L.tex] || this.T.dot; p.mat.color.setHex(Array.isArray(L.color) ? L.color[(Math.random() * L.color.length) | 0] : L.color);
    p.age = init ? Math.random() * 20 : 0;
    if (L.streak) { p.wait = init ? rr(0, L.every[1]) : rr(L.every[0], L.every[1]); p.run = 0; p.spr.visible = false; return; }
    if (L.thread) { p.sz = rr(0.06, 0.14); p.len = rr(5, 10); p.y = 10.5; }
    p.spr.visible = true;
  }
  _applyEnvFx(id) {
    const cfg = ENV_FX[id] || []; let i = 0;
    for (const L of cfg) for (let k = 0; k < L.n && i < this.fxs.length; k++) { const p = this.fxs[i++]; p.on = true; this._fxSpawn(p, L, true); }
    for (; i < this.fxs.length; i++) { this.fxs[i].on = false; this.fxs[i].spr.visible = false; }
  }
  _updateEnvFx(dt) {
    const t = this.t;
    for (const p of this.fxs) {
      if (!p.on) continue;
      const L = p.L; p.age += dt;
      if (L.streak) {
        if (!p.run) {
          p.wait -= dt; if (p.wait > 0) continue;
          p.run = 1; p.age = 0;
          const flat = L.flat, a = flat ? (Math.random() < 0.5 ? 0 : Math.PI / 2) : rr(-0.7, -0.25) + (Math.random() < 0.5 ? 0 : Math.PI);
          p.sa = a; p.sx = flat ? rr(-18, 18) : rr(-26, 26); p.sy = flat ? 0.15 : rr(6, 13); p.sz0 = flat ? rr(-14, 8) : rr(-24, -12); p.sv = flat ? rr(10, 18) : rr(22, 34);
          p.spr.visible = true; if (flat) { p.sx = a === 0 ? -24 : rr(-18, 18); p.sz0 = a === 0 ? rr(-14, 8) : -18; }
        }
        const d = p.sv * p.age; p.spr.position.set(p.sx + Math.cos(p.sa) * d, p.sy + (L.flat ? 0 : Math.sin(p.sa) * d * 0.5), p.sz0 + (L.flat ? Math.sin(p.sa) * d : 0));
        p.spr.scale.set(L.s[0], L.s[1], 1); p.mat.rotation = L.flat ? 0 : -p.sa * 0.5;
        const k = Math.min(1, p.age / 0.3) * Math.max(0, 1 - p.age / 1.4); p.mat.opacity = L.op * k;
        if (p.age > 1.4) { p.run = 0; p.spr.visible = false; p.wait = rr(L.every[0], L.every[1]); }
        continue;
      }
      if (L.thread) {
        const sw = L.sway ? Math.sin(t * L.sway[1] + p.ph) * L.sway[0] : 0;
        p.spr.position.set(p.x + sw, p.y - p.len * 0.5, p.z); p.spr.scale.set(p.sz, p.len, 1); p.mat.opacity = L.op * (0.7 + 0.3 * Math.sin(t * 0.8 + p.ph));
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.spin * dt;
      const sw = L.sway ? Math.sin(t * L.sway[1] + p.ph) * L.sway[0] * dt : 0; p.x += sw;
      const B = L.box || BOX;
      if (p.x > B.x[1] + 2 || p.x < B.x[0] - 2 || p.y > B.y[1] + 1 || p.y < B.y[0] - 1.5 || p.z > B.z[1] + 2 || p.z < B.z[0] - 2) {
        this._fxSpawn(p, L, false);
        // 진행 방향의 반대편 가장자리에서 다시 시작
        if (L.vy && L.vy[0] > 0) p.y = B.y[0]; else if (L.vy && L.vy[1] < 0) p.y = B.y[1];
        if (L.vx && L.vx[0] > 0.3) p.x = B.x[0];
      }
      let op = L.op; if (L.tw) op *= 1 - L.tw * (0.5 + 0.5 * Math.sin(t * 2.3 + p.ph * 3));
      if (L.fadeTop) op *= Math.max(0, Math.min(1, (L.fadeTop - p.y) / 2.2)) * Math.min(1, (p.y - (L.box ? L.box.y[0] : 0) + 0.5) / 0.8);
      p.mat.opacity = op; p.mat.rotation = p.rot;
      p.spr.position.set(p.x, p.y, p.z); p.spr.scale.set(p.sz, p.sz, 1);
    }
  }

  /** p: 0(하늘 위) ~ 1(거의 지면 가까이). null 이면 해제 */
  setFall(p) { this.fall = p; }

  setTheme(id) { if (THEMES[id]) this.theme = id; }
  /** 스테이지 전장: 바닥과 배경 실루엣을 바꾼다 (색감은 setTheme) */
  setEnv(id) {
    if (this.env === id) return;
    this.env = id;
    const fl = this.T.envFloor && this.T.envFloor[id], ru = this.T.envRuins && this.T.envRuins[id];
    if (fl) { this.floor.material.map = fl; this.floor.material.needsUpdate = true; }
    if (ru) for (const r of this.ruins) { r.m.material.map = ru; r.m.material.needsUpdate = true; }
    this._applyEnvFx(id);
  }

  shake(a = 0.3, t = 0.3) { if (!this.shakeOn) return; this.shakeAmt = Math.max(this.shakeAmt, a); this.shakeT = Math.max(this.shakeT, t); }
  kickFov(v) { this.fovKick = v; }
  setDolly(v) { this.dollyTarget = v; }
  beat(v = 1) { this.pulse = Math.max(this.pulse, v); }

  project(x, y, z, out = new THREE.Vector3()) {
    out.set(x, y, z).project(this.camera);
    return [(out.x * 0.5 + 0.5) * window.innerWidth, (-out.y * 0.5 + 0.5) * window.innerHeight];
  }

  update(dt, px = 0) {
    this.t += dt;
    const th = THEMES[this.theme], c = this.cur, k = 1 - Math.exp(-dt * 1.6);
    c.top.lerp(th.topC, k); c.mid.lerp(th.midC, k); c.bot.lerp(th.botC, k);
    c.moon.lerp(th.moonC, k); c.rune.lerp(th.runeC, k); c.cloud.lerp(th.cloudC, k);
    c.ruin.lerp(th.ruinC, k); c.ruinFar.lerp(th.ruinFarC, k);
    c.star += (th.star - c.star) * k; c.moonScale += (th.moonScale - c.moonScale) * k;
    c.nx += (th.nx - c.nx) * k; c.ny += (th.ny - c.ny) * k;
    for (let i = 0; i < 3; i++) c.mc[i] += (th.mc[i] - c.mc[i]) * k;

    this.pulse *= Math.exp(-dt * 4);
    const u = this.sky.material.uniforms;
    u.top.value.copy(c.top); u.mid.value.copy(c.mid); u.bot.value.copy(c.bot); u.pulse.value = this.pulse;
    u.glowAt.value.set(0.5 + c.nx * 0.5, 0.5 + c.ny * 0.5);

    this.stars.material.opacity = c.star * (0.75 + 0.25 * Math.sin(this.t * 1.7));

    // 전장 색조/움직임 (보간)
    const ec = ENV_CFG[this.env] || DEF_CFG, E = this.envK;
    E.cloud += (ec.cloud - E.cloud) * k; E.cloudSp += (ec.cloudSp - E.cloudSp) * k; E.rune += (ec.rune - E.rune) * k;
    E.sa += (ec.sway[0] - E.sa) * k; E.sf += (ec.sway[1] - E.sf) * k; E.tint.lerp(ENV_TINT[this.env] || WHITE, k);
    this.floor.material.color.copy(E.tint);
    this.clouds.forEach((cl, i) => { cl.map.offset.x += cl.sp * E.cloudSp * dt; cl.m.material.color.copy(c.cloud); cl.m.material.opacity = [0.55, 0.5, 0.42][i] * E.cloud; });
    this.ruins[0].m.material.color.copy(c.ruinFar);
    this.ruins[1].m.material.color.copy(c.ruin);
    // 원경 시차: 폐허 실루엣이 천천히 흔들린다 (극장에서는 커튼처럼 크게 일렁임)
    this.ruins[0].m.position.x = 12 + Math.sin(this.t * E.sf) * E.sa * 1.8;
    this.ruins[1].m.position.x = -8 + Math.sin(this.t * E.sf * 1.3 + 1.2) * E.sa;
    this.ruins[1].m.position.y = -5 + Math.sin(this.t * E.sf * 2.1) * E.sa * 0.06;
    this._updateEnvFx(dt);

    this.rune.rotation.y += dt * 0.05; this.rune2.rotation.y -= dt * 0.11;
    this.rune.material.color.copy(c.rune); this.rune2.material.color.copy(c.rune);
    this.rune.material.opacity = (0.34 + this.pulse * 0.25) * E.rune; this.rune2.material.opacity = (0.3 + this.pulse * 0.25) * E.rune;
    this.rim.material.color.copy(c.rune);

    // 카메라: 플레이어 쪽으로 살짝 시차 이동 + 돌리 + 흔들림
    this.dolly += (this.dollyTarget - this.dolly) * (1 - Math.exp(-dt * 2.2));
    const d = this.dolly;
    this.fovKick *= Math.exp(-dt * 6);
    const cam = this.camera;
    cam.position.set(this.camBase.x + px * 0.14, this.camBase.y - d * 3.4, this.camBase.z - d * 6.2);
    let sx = 0, sy = 0;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * Math.min(1, this.shakeT * 4);
      sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    cam.position.x += sx; cam.position.y += sy;
    cam.lookAt(this.camLook.x + px * 0.1 + sx * 0.4, this.camLook.y + d * 2.2 + sy * 0.4, this.camLook.z - d * 2.5);
    const fov = this.fovBase - d * 6 + this.fovKick;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();

    // 원경(달, 별)은 카메라에 고정: 카메라 광선 위 먼 거리에 배치
    if (Math.abs(this._starFov - (cam.fov + cam.aspect)) > 0.02) this._layoutStars();
    this.stars.position.copy(cam.position); this.stars.quaternion.copy(cam.quaternion);
    const dir = this._dir.set(c.nx, c.ny, 0.5).unproject(cam).sub(cam.position).normalize();
    this.moons.forEach((m, i) => {
      m.material.color.copy(c.moon);
      m.material.opacity = Math.max(0, Math.min(1, c.mc[i]));
      m.position.copy(cam.position).addScaledVector(dir, 150);
      const sc = c.moonScale * (1 + this.pulse * 0.04 + (i === 2 && this.theme === 'luna' ? Math.sin(this.t * 2.2) * 0.012 : 0));
      m.scale.set(sc, sc, 1);
      m.visible = m.material.opacity > 0.01;
    });
    if (this.fall != null) {
      const p = Math.max(0, Math.min(1, this.fall)), e = Math.pow(p, 1.5), d2 = this._dir2.set(0, 1.5 - e * 1.55, 0.5).unproject(cam).sub(cam.position).normalize();
      this.fallMoon.visible = true; this.fallMoon.position.copy(cam.position).addScaledVector(d2, 135);
      const fs = 150 + e * 560; this.fallMoon.scale.set(fs, fs, 1); this.fallMoon.material.opacity = Math.min(0.95, p * 6); this.fallMoon.material.rotation = this.t * 0.02;
    } else this.fallMoon.visible = false;
    this.halo.position.copy(cam.position).addScaledVector(dir, 149);
    this.halo.material.color.copy(c.rune);
    this.halo.material.opacity = 0.2 * c.mc[2] + this.pulse * 0.1;
    const hs = c.moonScale * 1.6; this.halo.scale.set(hs, hs, 1);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
