// scene.js — renderer, денне світло з вікна (key + м'яка тінь) → нічна лампа, postFX (bloom на гірлянді/місяці/вікнах, grade:
// віньєтка, зерно 3.5%, тепло/ніч), рівні якості, адаптивний DPR, наведення: шар під курсором піднімається на пружині, кнопки цифр
// натискаються, книга нахиляється до курсора. Усе — адитивно поверх чистої pose(p).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld } from './book.js';
import { W, SY, LAYERS, ZORDER, SHOW, frameCam, kitePath, clamp, spring } from './choreo.js';

const DBG = new URLSearchParams(location.search).getAll('dbg');
const QUALITY = [
  { dpr: 2.0, shadow: 2048, msaa: 4, bloom: 1 },
  { dpr: 1.5, shadow: 2048, msaa: 4, bloom: 1 },
  { dpr: 1.2, shadow: 1024, msaa: 0, bloom: 0 },
];
const MOB = [{ dpr: 1.5, shadow: 1024, msaa: 0, bloom: 1 }, { dpr: 1.15, shadow: 1024, msaa: 0, bloom: 0 }];
const LITE = [{ dpr: 1.6, shadow: 1024, msaa: 4, bloom: 1 }, { dpr: 1.2, shadow: 1024, msaa: 0, bloom: 0 }];
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVig: { value: 0.14 }, uAspect: { value: 1 }, uNight: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uIris: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uGrain,uVig,uAspect,uNight,uIris; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(c, c*vec3(0.86,0.84,1.08) + vec3(0.012,0.008,0.03), uNight*0.55);
      c *= mix(vec3(1.03,1.0,0.96), vec3(1.0), uNight);
      vec2 q = (vUv-0.5)*vec2(uAspect,1.0); c *= 1.0 - (uVig + uNight*0.12)*smoothstep(0.35, 1.05, length(q))*2.0;
      c += (h(floor(vUv*uRes) + fract(uTime)*91.7) - 0.5)*uGrain*(0.25 + l*0.5);
      float ir = smoothstep(uIris*1.25 - 0.08, uIris*1.25, length(q)); c = mix(c, vec3(3.0,2.86,2.5), ir);
      gl_FragColor = vec4(max(c, 0.0), 1.0); }`,
};

export async function createScene({ canvas, mode = 'full', mobile = false, still = false, qFixed = null, step = async () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('no-webgl2');
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); const bgDay = new THREE.Color('#F3E7D4'), bgNight = new THREE.Color('#221B3A');
  scene.background = bgDay.clone(); scene.fog = new THREE.Fog(bgDay.clone(), 90, 230);
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 600);
  const levels = mode === 'lite' ? LITE : mobile ? MOB : QUALITY;
  let level = qFixed != null ? Math.min(+qFixed, levels.length - 1) : 0; const Qn = () => levels[level];
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
  await step(0.1);
  await Promise.all(['800 60px "Montserrat Alternates"', '600 30px "Montserrat Alternates"', '400 40px Kurale'].map((f) => document.fonts.load(f, 'АБВ ім’я').catch(() => {})));
  const Wd = buildWorld({ mobile }); scene.add(Wd.root);
  await step(0.35);

  // світло: вікно (key + тінь), небесний fill, лампа на ніч, сяйво з книги
  const sun = new THREE.DirectionalLight('#FFF4E4', 2.4); sun.position.set(-34, 62, 30); sun.target.position.set(2, 0, 2);
  sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 20; sc.far = 160;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#EAF3FB', '#E2CDB0', 1.1); scene.add(hemi);
  const lamp = new THREE.PointLight('#FFD2A0', 0, 120, 1.4); lamp.position.set(-24, 24, -6); scene.add(lamp);
  const inner = new THREE.PointLight('#FFC870', 0, 40, 1.6); inner.position.set(9, 3.5, 2); scene.add(inner);
  const gl = new THREE.PointLight('#FFC56A', 0, 50, 1.5); scene.add(gl);

  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: levels[0].msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: GradeShader.vertexShader, fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec3 bad = isnan(c.rgb); c.rgb = vec3(bad.x ? 0.0 : c.r, bad.y ? 0.0 : c.g, bad.z ? 0.0 : c.b); gl_FragColor = vec4(clamp(c.rgb, 0.0, 40.0), 1.0); }' }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 1.6); composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);
  composer.addPass(new OutputPass());

  const st = { w: 1, h: 1, dprScale: 1, frameAvg: 16, slowT: 0, fastT: 0, time: 0, reduced: false, interactive: !still,
    ptr: { x: -9999, y: -9999, on: false, nx: 0, ny: 0, sx: 0, sy: 0 }, hover: -1, hoverBtn: -1, overBook: false,
    tilt: { x: 0, y: 0, vx: 0, vy: 0 }, mobile, portrait: false };
  function applyLevel() {
    const q = Qn(); sun.shadow.mapSize.set(q.shadow, q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    bloom.enabled = !!q.bloom;
    for (const t of [composer.renderTarget1, composer.renderTarget2]) if (t.samples !== q.msaa) { t.samples = q.msaa; t.dispose(); }
    resize();
  }
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; st.w = w; st.h = h; st.portrait = w / h < 1.05;
    const dpr = Math.max(0.6, Math.min(devicePixelRatio || 1, Qn().dpr) * st.dprScale);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); composer.setPixelRatio(dpr); composer.setSize(w, h);
    bloom.resolution.set(w * dpr / 2, h * dpr / 2);
    camera.aspect = w / h;
    if (st.portrait && mode === 'full') camera.setViewOffset(w, h, 0, h * 0.18, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    grade.uniforms.uAspect.value = w / h; grade.uniforms.uRes.value.set(w * dpr, h * dpr);
  }
  applyLevel();

  /* ---------- допоміжне ---------- */
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler();
  const paperW = new THREE.Color('#FFFCF5'), tmpC = new THREE.Color();
  const lerp = (a, b, t) => a + (b - a) * t;
  function updTube(mesh, pts, rad) {
    const g = mesh.geometry, { n, R } = g.userData, pos = g.attributes.position.array, nor = g.attributes.normal.array;
    for (let i = 0; i <= n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)], p = pts[i];
      v1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); v2.crossVectors(v1, UP); if (v2.lengthSq() < 1e-6) v2.set(1, 0, 0); v2.normalize(); v3.crossVectors(v2, v1).normalize();
      for (let r = 0; r < R; r++) { const an = (r / R) * Math.PI * 2, cs = Math.cos(an), sn = Math.sin(an), o = (i * R + r) * 3;
        const nx = v2.x * cs + v3.x * sn, ny = v2.y * cs + v3.y * sn, nz = v2.z * cs + v3.z * sn;
        pos[o] = p[0] + nx * rad; pos[o + 1] = p[1] + ny * rad; pos[o + 2] = p[2] + nz * rad; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  }
  const thrPts = Array.from({ length: 65 }, () => [0, 0, 0]), tailPts = Array.from({ length: 25 }, () => [0, 0, 0]), kp = [0, 0, 0];
  const anchors = LAYERS.map(() => new THREE.Vector3());
  const hoverS = LAYERS.map(() => ({ y: 0, v: 0 }));
  const btnS = [0, 1, 2].map(() => ({ y: 0, v: 0 }));
  const sprStep = (s, tgt, dt, k = 190, d = 19) => { s.v += ((tgt - s.y) * k - s.v * d) * dt; s.y += s.v * dt; return s.y; };
  const YAW = [0.28, -0.22, 0.0, 0.26, -0.3];

  function apply(P, dt) {
    const t = st.time, calm = still || st.reduced;
    const br = calm ? 0 : P.breathe * Math.sin(t * 1.4);
    Wd.book.position.y = br * 0.06; Wd.book.rotation.y = st.tilt.y * 0.5; Wd.book.rotation.x = st.tilt.x * 0.25 + br * 0.004;
    Wd.pivot.rotation.z = Math.PI * P.open; Wd.spineP.rotation.z = P.open * Math.PI / 2;
    // ім'я на обкладинці: «друк» (крок 04) і сяйво у фіналі
    Wd.coverName.visible = P.open < 0.55;
    Wd.coverName.children.forEach((m, k) => { const s = clamp(P.stamp * 1.6 - k * 0.08 * (1 - P.stamp)); m.position.y = (1 - s) * 5; m.visible = s > 0.02; });
    Wd.nameM.emissiveIntensity = P.nameGlow * 0.55 + P.night * 0.15;
    // шари
    const showing = P.show.some((s) => s > 0.001);
    Wd.layers.forEach((g, i) => {
      const l = LAYERS[i], r = P.rise[i], rank = ZORDER.indexOf(i), e = P.explode, s = P.show[i];
      g.visible = P.open > 0.6 && (r > 0.004 || P.open > 0.97);
      if (!g.visible) return;
      const hov = sprStep(hoverS[i], st.hover === i && !calm ? 1 : 0, dt);
      let x = l.x * (1 + 0.25 * e), y = SY + (0.02 + rank * 0.035) * (1 - Math.min(1, r)) + e * (0.6 + 1.6 * (4 - rank)), z = l.z * (1 + 0.5 * e) + e * 1.5;
      let ry = 0, sc = 1;
      if (s > 0) { const k = s; x = lerp(x, SHOW[0], k); y = lerp(y, SHOW[1], k) + Math.sin(Math.PI * k) * 5; z = lerp(z, SHOW[2], k); ry = YAW[i] * k; sc = lerp(1, l.sc, k); }
      else if (showing) { y -= 0; }
      g.position.set(x, y + hov * 0.7, z + hov * 0.5);
      g.rotation.set((Math.PI / 2) * (1 - r), ry + (calm ? 0 : Math.sin(t * 0.8 + i) * 0.012 * r), 0);
      g.scale.set(sc, sc, sc * (0.06 + 0.94 * Math.min(1, Math.max(0, r))));
      anchors[i].set(l.hw * (i === 1 ? 0.85 : 1), l.h * 0.86, 0); g.localToWorld(anchors[i]);
    });
    // кнопки цифр
    Wd.buttons.forEach((b, k) => { const hv = sprStep(btnS[k], st.hoverBtn === k && !calm ? 1 : 0, dt, 260, 16); b.position.z = -0.32 - 0.3 * Math.max(P.press[k], hv); b.material.emissive?.set(k === 1 ? '#000' : b.material.color); if (b.material.emissiveIntensity != null) b.material.emissiveIntensity = 0.35 * Math.max(P.press[k], hv); });
    // бант на пакеті
    { const k = P.show[4] > 0 || P.p > 0.62 || P.p < 0.36 ? (P.p > 0.36 && P.p < 0.62 ? P.bagRibbon : 1) : 1; const s = spring(k); Wd.bow.scale.setScalar(0.25 + 0.75 * s); Wd.bow.userData.t.forEach((m, j) => (m.scale.y = s)); }
    // розфарбування героя (крок 03)
    Wd.inkM.forEach((m) => { tmpC.copy(paperW).lerp(m.userData.base, P.ink); m.color.copy(tmpC); });
    // ніч: вікна, місяць, зірки
    Wd.nightGlow.forEach((m, k) => (m.emissiveIntensity = P.night * (k === 0 ? 2.2 : 0.9)));
    // аркуші історії (крок 02)
    Wd.sheets.forEach((s, i) => { const k = P.sheets[i]; s.visible = P.open > 0.95 && k > 0.001 && k < 0.999; s.rotation.z = Math.PI * k; });
    // сяйво зсередини (крок 05)
    Wd.glowM.opacity = P.glowIn; Wd.glowP.visible = P.glowIn > 0.01; inner.intensity = P.glowIn * 260;
    // стрічка пакування (крок 04)
    const rb = P.ribbon; [Wd.ribA, Wd.ribB, Wd.pBow].forEach((m) => (m.visible = rb > 0.01 && P.open < 0.05));
    Wd.ribA.scale.set(Math.max(0.01, rb), 1, 1); Wd.ribB.scale.set(1, 1, Math.max(0.01, rb)); Wd.pBow.scale.setScalar(2.2 * spring(clamp(rb * 1.4 - 0.4)) + 0.001);
    // ім'я злітає (крок 01)
    Wd.flyName.visible = P.fly > 0.001 && P.fall < 0.999 && P.open > 0.9;
    if (Wd.flyName.visible) Wd.flyName.children.forEach((m) => {
      const { k, n, x } = m.userData, f = spring(clamp(P.fly * 1.5 - k * 0.5 / Math.max(1, n))), d = clamp(P.fall * 1.6 - k * 0.6 / Math.max(1, n));
      const hx = x * 1.15, hy = SY + 8 + Math.sin(k * 1.3 + t * (calm ? 0 : 1.6)) * 0.35, hz = 4;
      const tx = W / 2 + x * 0.45, ty = SY + 0.06, tz = -5;
      m.position.set(lerp(lerp(0, hx, f), tx, d), lerp(lerp(SY, hy, f), ty, d) + Math.sin(Math.PI * d) * 2, lerp(lerp(0, hz, f), tz, d));
      m.rotation.set(-Math.PI / 2 * d + (1 - f) * -1.2, 0, 0); m.scale.setScalar(lerp(0.3 + 0.7 * f, 0.4, d) * (1 - d * 0.6));
    });
    // змій, нитка, хвіст, гірлянда
    const kk = P.kite; Wd.kite.visible = kk > 0.002; Wd.thread.visible = Wd.tail.visible = kk > 0.002; Wd.bows.forEach((b) => (b.visible = kk > 0.05));
    let gN = 0;
    if (kk > 0.002) {
      kitePath(kk, kp); const sw = calm ? 0 : 1, kf = P.kiteFin || 0; kp[0] = lerp(kp[0], -7, kf); kp[1] = lerp(kp[1], 7, kf); kp[2] = lerp(kp[2], 3, kf);
      const kx = kp[0] + sw * 0.6 * Math.sin(t * 0.9) * kk, ky = kp[1] + sw * 0.4 * Math.sin(t * 1.3) * kk, kz = kp[2];
      Wd.kite.position.set(kx, ky, kz); Wd.kite.rotation.set(-0.3, 0.25, -0.35 + sw * 0.1 * Math.sin(t * 1.1)); Wd.kite.scale.setScalar(0.2 + 0.8 * clamp(kk * 2.5));
      v1.set(0, -0.0, 0); Wd.kite.updateMatrixWorld(); v1.set(0, 0.6, 0.1).applyMatrix4(Wd.kite.matrixWorld);
      const ao = P.open, A = [lerp(0.3, 0.0, ao), lerp(2 * SY + 0.05, SY + 0.05, ao), lerp(4, 0, ao)];
      for (let i = 0; i <= 64; i++) { const u = i / 64, sag = Math.sin(Math.PI * u) * (2.2 * kk), wob = sw * Math.sin(u * 7 + t * 1.4) * 0.25 * u;
        thrPts[i][0] = lerp(A[0], v1.x, u) + wob; thrPts[i][1] = lerp(A[1], v1.y, u) - sag; thrPts[i][2] = lerp(A[2], v1.z, u) + wob * 0.6; }
      updTube(Wd.thread, thrPts, 0.05);
      // хвіст звисає від нижнього кута змія
      v2.set(0, -4.6, 0.05).applyMatrix4(Wd.kite.matrixWorld); const tl = 9 * clamp(kk * 1.6);
      for (let i = 0; i <= 24; i++) { const u = i / 24; tailPts[i][0] = v2.x + u * tl * 0.35 + sw * Math.sin(u * 6 - t * 3) * 0.5 * u; tailPts[i][1] = v2.y - u * tl * 0.9; tailPts[i][2] = v2.z + u * tl * 0.25 + sw * Math.cos(u * 5 - t * 2.4) * 0.4 * u; }
      updTube(Wd.tail, tailPts, 0.05);
      Wd.bows.forEach((b, j) => { const p = tailPts[6 + j * 7]; b.position.set(p[0], p[1], p[2]); b.rotation.set(0, 0.4, sw * Math.sin(t * 2 + j) * 0.4); b.scale.setScalar(0.9 * clamp(kk * 2 - 0.3)); });
      // гірлянда на нитці
      gN = Math.floor(Wd.GN * P.garland);
      for (let i = 0; i < gN; i++) { const u = (i + 0.5) / Wd.GN, j = Math.round(u * 64), p = thrPts[j], tw = calm ? 1 : 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7);
        m4.compose(v3.set(p[0], p[1] - 0.18, p[2]), q4.identity(), v2.setScalar(tw * clamp(P.garland * Wd.GN - i))); Wd.garland.setMatrixAt(i, m4); }
      gl.position.set(thrPts[32][0], thrPts[32][1], thrPts[32][2]);
    }
    Wd.garland.count = gN; Wd.garland.instanceMatrix.needsUpdate = true; gl.intensity = P.garland * 70;
    // світло день → ніч
    const n = P.night;
    sun.intensity = lerp(2.4, 0.18, n); hemi.intensity = lerp(1.1, 0.24, n); hemi.color.set(n > 0.5 ? '#7A74C0' : '#EAF3FB'); hemi.groundColor.set(n > 0.5 ? '#3A2F5A' : '#E2CDB0'); lamp.intensity = n * 150;
    scene.environmentIntensity = lerp(0.45, 0.12, n);
    scene.background.copy(bgDay).lerp(bgNight, n); scene.fog.color.copy(scene.background);
    grade.uniforms.uNight.value = n; bloom.strength = lerp(0.35, 0.42, n); bloom.threshold = lerp(1.6, 0.85, n);
    // камера
    const c = frameCam(P.cam, st.portrait && mode === 'full' ? st.w / st.h : 2), par = calm ? 0 : 1, d = P.drop ?? 1;
    const dd = 1 - Math.pow(1 - d, 3), arc = Math.sin(Math.PI * dd) * (1 - dd);
    const CP = [15.5, 9, -2], CT = [15.6, 2.4, -7.4];
    camera.position.set(lerp(CP[0], c.pos[0], dd) + st.ptr.sx * 1.4 * par + arc * 10, lerp(CP[1], c.pos[1], dd) + st.ptr.sy * 0.9 * par, lerp(CP[2], c.pos[2], dd));
    camera.fov = lerp(44, c.fov, dd); camera.updateProjectionMatrix();
    camera.lookAt(lerp(CT[0], c.target[0], dd), lerp(CT[1], c.target[1], dd), lerp(CT[2], c.target[2], dd)); camera.updateMatrixWorld();
    grade.uniforms.uIris.value = mode === 'full' ? Math.min(1.6, 0.02 + d * 2.2) : 1.6;
  }

  /* ---------- курсор: наведення ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pointer(cx, cy, active) { const p = st.ptr; if (!st.interactive) return; const r = canvas.getBoundingClientRect(); p.x = cx - r.left; p.y = cy - r.top; p.on = active; p.nx = (p.x / r.width) * 2 - 1; p.ny = -(p.y / r.height) * 2 + 1; }
  function projectW(v) { v1.copy(v).project(camera); return [(v1.x * 0.5 + 0.5) * st.w, (-v1.y * 0.5 + 0.5) * st.h, v1.z < 1 && Math.abs(v1.x) < 1.1 && Math.abs(v1.y) < 1.1]; }
  let rayT = 0;
  function interact(dt) {
    const p = st.ptr; rayT += dt;
    if (!(p.on && st.interactive && !st.reduced)) { st.hover = -1; st.hoverBtn = -1; st.overBook = false; return; }
    if (rayT < 1 / 30) return; rayT = 0; // raycast 30 раз/с
    ndc.set(p.nx, p.ny); ray.setFromCamera(ndc, camera);
    const cand = Wd.hitMeshes.filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
    const hits = ray.intersectObjects(cand, false);
    st.hover = hits.length ? hits[0].object.userData.layer ?? -1 : -1; st.hoverBtn = hits.length ? Wd.buttons.indexOf(hits[0].object) : -1;
    const bh = ray.intersectObjects([Wd.book.children[0], Wd.book.children[1]], false);
    st.overBook = st.hover >= 0 || bh.length > 0;
  }

  // прогрів шейдерів (частина чесного лічильника)
  Wd.layers.forEach((g) => (g.visible = true)); Wd.sheets.forEach((s) => (s.visible = true)); [Wd.ribA, Wd.ribB, Wd.pBow, Wd.kite, Wd.thread, Wd.tail, Wd.glowP].forEach((m) => (m.visible = true));
  camera.position.set(10, 40, 40); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); resize();
  renderer.compile(scene, camera); composer.render(0.016);
  await step(0.3);

  function frame(dt, P) {
    dt = Math.min(dt, 1 / 20); if (!still) st.time += dt;
    grade.uniforms.uTime.value = still ? 0.5 : st.time;
    const T = st.tilt, on = st.interactive && !st.reduced && st.ptr.on ? 1 : 0;
    T.vx += ((st.ptr.ny * 0.05 * on - T.x) * 38 - T.vx * 8.5) * dt; T.vy += ((st.ptr.nx * 0.08 * on - T.y) * 38 - T.vy * 8.5) * dt; T.x += T.vx * dt; T.y += T.vy * dt;
    const k = 1 - Math.exp(-4 * dt); st.ptr.sx += ((st.ptr.on ? st.ptr.nx : 0) - st.ptr.sx) * k; st.ptr.sy += ((st.ptr.on ? st.ptr.ny : 0) - st.ptr.sy) * k;
    apply(P, dt); interact(dt);
    if (DBG.includes('nopost')) renderer.render(scene, camera); else composer.render(dt);
    if (!still && qFixed == null) {
      st.frameAvg += (dt * 1000 - st.frameAvg) * 0.08;
      if (st.frameAvg > 30) { st.slowT += dt; st.fastT = 0; } else if (st.frameAvg < 15) { st.fastT += dt; st.slowT = 0; } else { st.slowT = st.fastT = 0; }
      if (st.slowT > 1) { st.slowT = 0; if (st.dprScale > 0.64) { st.dprScale -= 0.12; resize(); } else if (level < levels.length - 1) { level++; st.dprScale = 0.9; applyLevel(); } }
      if (st.fastT > 4 && st.dprScale < 1) { st.fastT = 0; st.dprScale = Math.min(1, st.dprScale + 0.06); resize(); }
    }
  }
  return { renderer, scene, camera, st, frame, resize, pointer, projectW, anchors, world: Wd, setName: (n) => Wd.setName(n), get level() { return level; }, get dpr() { return renderer.getPixelRatio(); } };
}
