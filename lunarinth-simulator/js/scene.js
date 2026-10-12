// Three.js 월드: 2.5D 카메라, 하늘/달/구름/폐허 시차 배경, 부유하는 아레나, 페이즈별 테마.
import * as THREE from '../vendor/three.module.min.js';

export const ARENA_R = 10.2;

const THEMES = {
  lumina: { top: 0x0c0730, mid: 0x2e2174, bot: 0xa485ea, moon: 0xfff4d6, rune: 0xd9c8ff, cloud: 0xcdbbff, ruin: 0x140b38, ruinFar: 0x5b49a8, star: 1.0, moonScale: 62, nx: -0.42, ny: 0.5, mc: [1, 0, 0] },
  umbra: { top: 0x03010a, mid: 0x12083a, bot: 0x3a1b78, moon: 0x8a66e0, rune: 0x8a5cff, cloud: 0x3a2a70, ruin: 0x05020f, ruinFar: 0x1f1245, star: 0.7, moonScale: 66, nx: 0.38, ny: 0.5, mc: [0, 1, 0] },
  astral: { top: 0x020618, mid: 0x0b2155, bot: 0x4a7fd8, moon: 0xdce9ff, rune: 0x9cc3ff, cloud: 0x7fa8ff, ruin: 0x050b24, ruinFar: 0x1d3b86, star: 1.3, moonScale: 56, nx: 0.42, ny: 0.5, mc: [1, 0, 0] },
  arcane: { top: 0x07010f, mid: 0x2a0a4d, bot: 0x7a2fb8, moon: 0xd9a8ff, rune: 0xc060ff, cloud: 0x6a2a9a, ruin: 0x0a0214, ruinFar: 0x3b1166, star: 0.8, moonScale: 64, nx: -0.35, ny: 0.45, mc: [0, 1, 0] },
  void: { top: 0x000000, mid: 0x04010a, bot: 0x180a2e, moon: 0x6a50b0, rune: 0x7a4bd8, cloud: 0x160c2a, ruin: 0x020106, ruinFar: 0x0b0618, star: 0.3, moonScale: 40, nx: 0.38, ny: 0.5, mc: [0, 0, 0] },
  luna: { top: 0x1c0530, mid: 0x6a1a6e, bot: 0xff8ac8, moon: 0xffe9b0, rune: 0xff7ac8, cloud: 0xff9ad0, ruin: 0x1d0828, ruinFar: 0x8a2f85, star: 0.55, moonScale: 200, nx: 0.0, ny: 0.34, mc: [0, 0, 1] },
};

for (const t of Object.values(THEMES)) {
  for (const k of ['top', 'mid', 'bot', 'moon', 'rune', 'cloud', 'ruin', 'ruinFar']) t[k + 'C'] = new THREE.Color(t[k]);
}

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
    floor.renderOrder = -20; root.add(floor);
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

  /** p: 0(하늘 위) ~ 1(거의 지면 가까이). null 이면 해제 */
  setFall(p) { this.fall = p; }

  setTheme(id) { if (THEMES[id]) this.theme = id; }

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

    for (const cl of this.clouds) { cl.map.offset.x += cl.sp * dt; cl.m.material.color.copy(c.cloud); }
    this.ruins[0].m.material.color.copy(c.ruinFar);
    this.ruins[1].m.material.color.copy(c.ruin);

    this.rune.rotation.y += dt * 0.05; this.rune2.rotation.y -= dt * 0.11;
    this.rune.material.color.copy(c.rune); this.rune2.material.color.copy(c.rune);
    this.rune.material.opacity = 0.34 + this.pulse * 0.25; this.rune2.material.opacity = 0.3 + this.pulse * 0.25;
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
