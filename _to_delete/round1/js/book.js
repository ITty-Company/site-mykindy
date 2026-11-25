// book.js — процедурна «Книга-розкладачка» (см): палітурні дошки з тканинним корінцем, блоки сторінок, обкладинка з тисненим змієм
// і рамкою під ім'я, 5 паперових pop-up шарів (фігурка-герой із банером імені, казковий замок із лісом і місяцем, абетка-кубики
// з іменем, цифри 1 2 3 з кнопками-таблетками, подарунковий пакет зі стрічкою), змій із хвостом і бантиками, нитка з гірляндою,
// аркуші історії, стрічка пакування, в'язаний плед. Жодних зовнішніх моделей.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLYPHS } from './glyphs.js';
import * as TX from './textures.js';
import { W, D, BT, HB, SY, LAYERS } from './choreo.js';
const { C } = TX;

/* ---------- SVG-контур гліфа → THREE.Shape[] ---------- */
const glyphCache = new Map();
function parsePath(d) {
  const toks = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g) || []; const subs = []; let cur = null, i = 0, cmd = '', x = 0, y = 0;
  const num = () => +toks[i++];
  while (i < toks.length) {
    if (/[MLHVQCZ]/.test(toks[i])) cmd = toks[i++];
    if (cmd === 'M') { x = num(); y = num(); cur = new THREE.Path(); cur.moveTo(x, y); subs.push(cur); cmd = 'L'; }
    else if (cmd === 'L') { x = num(); y = num(); cur.lineTo(x, y); }
    else if (cmd === 'H') { x = num(); cur.lineTo(x, y); }
    else if (cmd === 'V') { y = num(); cur.lineTo(x, y); }
    else if (cmd === 'Q') { const a = num(), b = num(); x = num(); y = num(); cur.quadraticCurveTo(a, b, x, y); }
    else if (cmd === 'C') { const a = num(), b = num(), c = num(), e = num(); x = num(); y = num(); cur.bezierCurveTo(a, b, c, e, x, y); }
    else if (cmd === 'Z') { cur.closePath(); }
    else i++;
  }
  return subs;
}
const area = (pts) => { let a = 0; for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p.x * q.y - q.x * p.y; } return a / 2; };
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
export function glyph(ch) {
  if (glyphCache.has(ch)) return glyphCache.get(ch);
  const g = GLYPHS.g[ch]; if (!g) { glyphCache.set(ch, null); return null; }
  const subs = parsePath(g[1]).map((p) => ({ p, pts: p.getPoints(6) })); subs.forEach((s) => (s.a = area(s.pts)));
  const big = subs.reduce((m, s) => (Math.abs(s.a) > Math.abs(m.a) ? s : m), subs[0]); const outerSign = Math.sign(big.a);
  const outers = subs.filter((s) => Math.sign(s.a) === outerSign), holes = subs.filter((s) => Math.sign(s.a) !== outerSign);
  const shapes = outers.map((o) => { const sh = new THREE.Shape(); sh.curves = o.p.curves; sh.currentPoint = o.p.currentPoint; sh.holes = []; sh._pts = o.pts; return sh; });
  holes.forEach((h) => { const host = shapes.find((s) => inside(h.pts[0], s._pts)) || shapes[0]; const hp = new THREE.Path(); hp.curves = h.p.curves; host.holes.push(hp); });
  const r = { w: g[0], shapes }; glyphCache.set(ch, r); return r;
}
const geoCache = new Map();
// гліф висотою ~ cap-height 'size' (см), глибина depth; фронт у z=0, тіло в -z; базова лінія y=0, центр по x
export function glyphGeo(ch, size, depth, bevel = 0.06) {
  const key = ch + size + depth; if (geoCache.has(key)) return geoCache.get(key);
  const gl = glyph(ch); if (!gl) return null;
  const s = size / 700, geo = new THREE.ExtrudeGeometry(gl.shapes, { depth: depth / s, bevelEnabled: true, bevelThickness: bevel / s, bevelSize: bevel / s * 0.8, bevelSegments: 2, curveSegments: 5 });
  geo.scale(s, s, s); geo.translate(-gl.w * s / 2, 0, -depth - bevel); geo.computeVertexNormals();
  const r = { geo, w: gl.w * s }; geoCache.set(key, r); return r;
}

/* ---------- примітиви паперу ---------- */
function ex(shape, depth = 0.1, bevel = 0.025) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 14 });
  g.translate(0, 0, -depth - bevel); return g;
}
function rrect(x, y, w, h, r) { const s = new THREE.Shape(); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function rpath(x, y, w, h, r) { const s = new THREE.Path(); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
function poly(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
function circ(x, y, r) { const s = new THREE.Shape(); s.absarc(x, y, r, 0, Math.PI * 2, false); return s; }
function star(x, y, r) { const p = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 2, rr = i % 2 ? r * 0.38 : r; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return poly(p); }

export function buildWorld({ mobile = false } = {}) {
  const grain = TX.grain(256); grain.repeat.set(0.25, 0.25);
  const mats = [];
  const paper = (color, o = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, map: grain, ...o }); m.userData.base = new THREE.Color(color); mats.push(m); return m; };
  const root = new THREE.Group();
  const book = new THREE.Group(); root.add(book);
  const shadowAll = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });

  /* плед */
  const pg = new THREE.PlaneGeometry(320, 320, mobile ? 40 : 90, mobile ? 40 : 90); pg.rotateX(-Math.PI / 2);
  { const a = pg.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), z = a.getZ(i), r = Math.hypot(x - 2, z), k = Math.max(0, Math.min(1, (r - 34) / 40)); a.setY(i, k * (1.6 * Math.sin(x * 0.07 + z * 0.03) + 1.1 * Math.sin(z * 0.11 - x * 0.02) + 0.6) - 0.02); } pg.computeVertexNormals(); }
  const plaidTex = TX.plaid(mobile ? 512 : 1024); plaidTex.repeat.set(16, 16);
  const plaid = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: plaidTex, roughness: 1, color: '#FFFFFF' })); plaid.receiveShadow = true; plaid.position.x = 2; root.add(plaid);

  /* палітурка: задня дошка + правий блок; ліва половина (обкладинка + лівий блок) — на шарнірі pivot */
  const BW = W + 0.6, BD = D + 1;
  const cloth = paper(C.tail, { roughness: 0.95 }), edgeTex = TX.pageEdge();
  const edgeM = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 }), whiteM = paper('#FFFCF5');
  const coverTex = { t: TX.cover(false) }, coverM = new THREE.MeshStandardMaterial({ map: coverTex.t, roughness: 0.78 }), endM = new THREE.MeshStandardMaterial({ map: TX.endpaper(), roughness: 0.95 });
  const boardGeo = new THREE.BoxGeometry(BW, BT, BD);
  const back = new THREE.Mesh(boardGeo, [cloth, cloth, endM, cloth, cloth, cloth]); back.position.set(BW / 2, BT / 2, 0); book.add(back);
  const blockGeo = new THREE.BoxGeometry(W, HB, D);
  const blockR = new THREE.Mesh(blockGeo, [edgeM, edgeM, whiteM, whiteM, edgeM, edgeM]); blockR.position.set(W / 2 + 0.05, BT + HB / 2, 0); book.add(blockR);
  const pivot = new THREE.Group(); pivot.position.set(0, SY, 0); book.add(pivot);
  const blockL = new THREE.Mesh(blockGeo, [edgeM, edgeM, whiteM, whiteM, edgeM, edgeM]); blockL.position.set(W / 2 + 0.05, HB / 2, 0); pivot.add(blockL);
  const front = new THREE.Mesh(boardGeo, [cloth, cloth, coverM, endM, cloth, cloth]); front.position.set(BW / 2, HB + BT / 2, 0); pivot.add(front);
  // корінець — тканина з іменем (видно, коли книга закрита)
  const spineTex = { t: TX.spine('') };
  const spineM = new THREE.MeshStandardMaterial({ map: spineTex.t, roughness: 0.95 });
  const spineP = new THREE.Group(); book.add(spineP);
  const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2 * SY, BD), [cloth, spineM, cloth, cloth, cloth, cloth]); spineMesh.position.set(-0.15, SY, 0); spineP.add(spineMesh);
  // тиснений змій на обкладинці (4 грані, як у лого)
  const kiteParts = (s, d) => {
    const P = (a) => a.map(([x, y]) => [x * s, -y * s]);
    return [[P([[0, -50], [-34, -8], [0, 0]]), C.kite], [P([[0, -50], [34, -8], [0, 0]]), '#FFCB55'], [P([[-34, -8], [0, 62], [0, 0]]), C.tail], [P([[34, -8], [0, 62], [0, 0]]), '#F39A2C']].map(([pts, col]) => new THREE.Mesh(ex(poly(pts), d, 0.02), paper(col, { roughness: 0.55 })));
  };
  const emb = new THREE.Group(); kiteParts(0.05, 0.12).forEach((m) => emb.add(m)); emb.rotation.set(-Math.PI / 2, 0, -0.25); emb.position.set(BW / 2 + 5.7, HB + BT + 0.11, -7.6); pivot.add(emb);
  // ім'я на обкладинці (3D-літери, «золото» змія)
  const nameM = new THREE.MeshPhysicalMaterial({ color: C.kite, roughness: 0.32, metalness: 0.15, clearcoat: 0.6, clearcoatRoughness: 0.3, emissive: '#F6B324', emissiveIntensity: 0 });
  const coverName = new THREE.Group(); coverName.position.set(BW / 2, HB + BT + 0.55, 2.75); pivot.add(coverName);

  /* 5 шарів */
  const layers = [], hitMeshes = [], L = {};
  const nightGlow = [];
  LAYERS.forEach((l, i) => {
    const g = new THREE.Group(); g.userData = { i, spr: { y: 0, v: 0 } };
    const content = new THREE.Group(); g.add(content); g.userData.content = content;
    g.position.set(l.x, SY, l.z); book.add(g); layers.push(g); L[l.id] = content;
  });
  const add = (grp, geo, mat, z = 0, x = 0, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); grp.add(m); return m; };

  // — Авторська казка: пагорби, ліс, замок із вікнами, місяць і зірки на паперових ніжках
  {
    const g = L.kazka, hw = 14.4;
    const hills = (h0, amp, f, ph) => { const pts = [[-hw, 0]]; for (let i = 0; i <= 40; i++) { const x = -hw + (2 * hw * i) / 40; pts.push([x, h0 + amp * Math.sin(x * f + ph) + amp * 0.5 * Math.sin(x * f * 2.3 + ph * 2)]); } pts.push([hw, 0]); return poly(pts); };
    add(g, ex(hills(5.2, 1.3, 0.32, 0.4)), paper(C.sky), -0.9);
    add(g, ex(hills(3.2, 0.9, 0.45, 2.1)), paper('#A9D0EA'), -0.25);
    // замок
    const cast = new THREE.Shape(); const cx = 3.2;
    cast.moveTo(cx - 4.4, 0); cast.lineTo(cx - 4.4, 7.2); cast.lineTo(cx - 3.6, 7.2); cast.lineTo(cx - 3.6, 7.9); cast.lineTo(cx - 2.8, 7.9); cast.lineTo(cx - 2.8, 7.2); cast.lineTo(cx - 2.0, 7.2); cast.lineTo(cx - 2.0, 7.9); cast.lineTo(cx - 1.2, 7.9); cast.lineTo(cx - 1.2, 7.2);
    cast.lineTo(cx + 1.2, 7.2); cast.lineTo(cx + 1.2, 7.9); cast.lineTo(cx + 2.0, 7.9); cast.lineTo(cx + 2.0, 7.2); cast.lineTo(cx + 2.8, 7.2); cast.lineTo(cx + 2.8, 7.9); cast.lineTo(cx + 3.6, 7.9); cast.lineTo(cx + 3.6, 7.2); cast.lineTo(cx + 4.4, 7.2); cast.lineTo(cx + 4.4, 0); cast.closePath();
    const door = new THREE.Path(); door.moveTo(cx - 1, 0.4); door.lineTo(cx - 1, 2.4); door.absarc(cx, 2.4, 1, Math.PI, 0, true); door.lineTo(cx + 1, 0.4); door.closePath(); cast.holes.push(door);
    [[-2.6, 4.2], [2.6, 4.2]].forEach(([x, y]) => cast.holes.push(rpath(cx + x - 0.55, y, 1.1, 1.5, 0.5)));
    const wallM = paper('#FFF4E2');
    add(g, ex(cast, 0.14), wallM, -0.5);
    const tower = (x, w, h, roofH) => { const s = rrect(x - w / 2, 0, w, h, 0.15); s.holes.push(rpath(x - 0.45, h - 2.6, 0.9, 1.4, 0.44)); add(g, ex(s, 0.14), wallM, -0.38); add(g, ex(poly([[x - w / 2 - 0.5, h - 0.05], [x, h + roofH], [x + w / 2 + 0.5, h - 0.05]]), 0.14), paper(C.tail), -0.36); };
    tower(cx - 4.6, 2.2, 10.2, 3.2); tower(cx + 4.6, 2.2, 9.4, 3.0); tower(cx, 2.6, 12.0, 3.4);
    // прапорець
    add(g, ex(poly([[cx + 0.05, 15.4], [cx + 1.8, 14.9], [cx + 0.05, 14.4]]), 0.06), paper(C.kite), -0.36);
    // світло у вікнах (за вирізами)
    const winM = new THREE.MeshStandardMaterial({ color: '#FFE7A8', emissive: '#FFC24A', emissiveIntensity: 0, roughness: 1 }); nightGlow.push(winM);
    add(g, new THREE.PlaneGeometry(10, 12).translate(cx, 6, 0), winM, -0.75);
    // ліс
    const pine = (x, s, col, z) => { const t = []; for (let k = 0; k < 3; k++) { const y0 = (1.2 + k * 2.0) * s, w = (2.4 - k * 0.55) * s; t.push([x - w, y0], [x - w * 0.35, y0 + 1.5 * s]); } const pts = [[x - 0.3 * s, 0], [x - 0.3 * s, 1.2 * s]]; for (let k = 0; k < 3; k++) { const y0 = (1.2 + k * 2.0) * s, w = (2.4 - k * 0.55) * s; pts.push([x - w, y0], [x - w * 0.3, y0 + 1.1 * s]); } pts.push([x, 7.8 * s]); for (let k = 2; k >= 0; k--) { const y0 = (1.2 + k * 2.0) * s, w = (2.4 - k * 0.55) * s; pts.push([x + w * 0.3, y0 + 1.1 * s], [x + w, y0]); } pts.push([x + 0.3 * s, 1.2 * s], [x + 0.3 * s, 0]); add(g, ex(poly(pts), 0.12), paper(col), z); };
    pine(-11.6, 1.05, C.dusk, -0.55); pine(-8.4, 0.82, '#4A3F7A', -0.3); pine(-6.0, 0.62, C.dusk, -0.12); pine(12.4, 0.75, '#4A3F7A', -0.3);
    // місяць на ніжці
    const moon = new THREE.Shape(); moon.absarc(-8.6, 13.4, 1.7, Math.PI * 0.35, Math.PI * 1.65, false); moon.absarc(-7.9, 13.4, 1.35, Math.PI * 1.5, Math.PI * 0.5, true);
    const moonM = paper(C.kite, { emissive: '#F6B324', emissiveIntensity: 0, roughness: 0.7 }); nightGlow.push(moonM);
    add(g, ex(moon, 0.12), moonM, -0.6);
    add(g, ex(rrect(-8.7, 4, 0.16, 8, 0.05), 0.04, 0), paper('#E9DCC8'), -0.7);
    const starM = paper('#FFE08A', { emissive: '#FFD36A', emissiveIntensity: 0 }); nightGlow.push(starM);
    [[-3.6, 14.2, 0.55], [9.6, 13.6, 0.5], [-12.4, 11.0, 0.42], [11.8, 10.4, 0.36]].forEach(([x, y, r]) => { add(g, ex(star(x, y, r), 0.08), starM, -0.62); add(g, ex(rrect(x - 0.05, 3, 0.1, y - 3.2, 0.03), 0.03, 0), paper('#E9DCC8'), -0.7); });
  }
  // — Персональна книга: паперова фігурка дитини з паперовим змієм і банер з іменем
  const inkM = []; // матеріали, що «розфарбовуються» на кроці 03
  {
    const g = L.hero, skin = paper('#F2C9A0'), hair = paper(C.ink), dress = paper(C.tail), legs = paper(C.dusk), shoes = paper(C.ink), cheek = paper('#F0A08A');
    inkM.push(skin, hair, dress, legs, shoes, cheek);
    add(g, ex(rrect(-1.15, 0, 0.95, 3.4, 0.4), 0.12), legs, -0.3); add(g, ex(rrect(0.2, 0, 0.95, 3.4, 0.4), 0.12), legs, -0.3);
    add(g, ex(rrect(-1.45, -0.05, 1.45, 0.75, 0.35), 0.1), shoes, -0.12); add(g, ex(rrect(0.05, -0.05, 1.45, 0.75, 0.35), 0.1), shoes, -0.12);
    add(g, ex(poly([[-2.5, 2.9], [2.5, 2.9], [1.45, 7.2], [-1.45, 7.2]]), 0.14), dress, -0.18);
    const armL = add(g, ex(rrect(-0.4, -3.2, 0.8, 3.4, 0.4), 0.1), skin, -0.24, -1.7, 7.0); armL.rotation.z = -0.35;
    const armR = add(g, ex(rrect(-0.4, -3.2, 0.8, 3.4, 0.4), 0.1), skin, -0.24, 1.7, 7.0); armR.rotation.z = 2.2;
    add(g, ex(circ(0, 9.0, 2.0), 0.14), skin, -0.1);
    const hs = new THREE.Shape(); hs.absarc(0, 9.3, 2.25, Math.PI * 0.05, Math.PI * 0.95, false); hs.quadraticCurveTo(-1.4, 9.4, -0.4, 10.1); hs.quadraticCurveTo(0.6, 9.2, 2.2, 9.3); add(g, ex(hs, 0.1), hair, 0.0);
    add(g, ex(circ(-0.75, 8.85, 0.17), 0.04), hair, 0.08); add(g, ex(circ(0.75, 8.85, 0.17), 0.04), hair, 0.08);
    add(g, ex(circ(-1.25, 8.2, 0.33), 0.03), cheek, 0.06); add(g, ex(circ(1.25, 8.2, 0.33), 0.03), cheek, 0.06);
    const sm = new THREE.Shape(); sm.absarc(0, 8.25, 0.6, Math.PI * 1.15, Math.PI * 1.85, false); sm.absarc(0, 8.35, 0.48, Math.PI * 1.85, Math.PI * 1.15, true); add(g, ex(sm, 0.03), hair, 0.08);
    // маленький паперовий змій у руці
    const kk = new THREE.Group(); kiteParts(0.028, 0.06).forEach((m) => kk.add(m)); kk.position.set(5.7, 11.0, -0.2); kk.rotation.z = -0.3; g.add(kk);
    { const s = rrect(0, -0.03, 1.5, 0.06, 0.02), m = add(g, ex(s, 0.02, 0), hair, -0.2, 4.3, 8.9); m.rotation.z = 0.5; }
    // банер з іменем
    const bTex = { t: TX.banner('') };
    const bs = new THREE.Shape(); bs.moveTo(-5.4, 13.1); bs.lineTo(5.4, 13.1); bs.lineTo(4.7, 13.95); bs.lineTo(5.4, 14.8); bs.lineTo(-5.4, 14.8); bs.lineTo(-4.7, 13.95); bs.closePath();
    const bGeo = ex(bs, 0.08, 0.02);
    { const uv = bGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + 5.4) / 10.8, (uv.getY(i) - 13.1) / 1.7); }
    const bM = new THREE.MeshStandardMaterial({ map: bTex.t, roughness: 0.9 });
    add(g, bGeo, bM, -0.4); g.userData.bTex = bTex; g.userData.bM = bM;
    add(g, ex(rrect(-0.05, 10.8, 0.1, 2.4, 0.03), 0.03, 0), paper('#E9DCC8'), -0.5);
  }
  // — Іменна абетка: кубики з літерами (перебудовуються під ім'я)
  const cubeGeo = new RoundedBoxGeometry(3.2, 3.2, 3.2, 3, 0.32); cubeGeo.translate(0, 1.6, -1.6);
  const cubeMats = [paper(C.kite, { roughness: 0.7 }), paper(C.sky, { roughness: 0.7 }), paper(C.tail, { roughness: 0.7 }), paper('#FFF4E2', { roughness: 0.7 })];
  const letMats = [paper(C.ink, { roughness: 0.5 }), paper(C.dusk, { roughness: 0.5 }), paper(C.milk, { roughness: 0.5 }), paper(C.tailInk, { roughness: 0.5 })];
  const abc = new THREE.Group(); L.abetka.add(abc);
  // — Інтерактивна книга цифр: 1 2 3 + основа з кнопками-таблетками
  const buttons = [];
  {
    const g = L.cyfry, cols = [paper(C.kite, { roughness: 0.6 }), paper(C.ink, { roughness: 0.6 }), paper(C.tail, { roughness: 0.6 })];
    ['1', '2', '3'].forEach((d, k) => { const gg = glyphGeo(d, 3.1, 0.45, 0.05); if (gg) { const m = add(g, gg.geo, cols[k], -0.1, -3.6 + k * 3.6, 2.6); m.castShadow = true; } });
    add(g, ex(rrect(-5.5, 0, 11, 2.4, 0.6), 0.22, 0.04), paper('#FFF4E2'), -0.3);
    const bc = ['#F6B324', '#221B3A', '#D2452C'];
    bc.forEach((col, k) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.5, 28).rotateX(Math.PI / 2).translate(0, 0, 0.25), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }));
      b.position.set(-3.6 + k * 3.6, 1.2, -0.32); g.add(b); buttons.push(b); b.userData.spr = { y: 0, v: 0 };
    });
  }
  // — Пакування: білий пакет, ручки, жовта стрічка з бантом, змій-лого
  const bow = new THREE.Group();
  {
    const g = L.pak, white = paper('#FFFFFF', { roughness: 0.75 }), yellow = paper(C.kite, { roughness: 0.55 });
    const bag = new THREE.Mesh(new RoundedBoxGeometry(6.6, 7.4, 2.8, 2, 0.12), white); bag.position.set(0, 3.7, -1.5); g.add(bag);
    // складка-клапан
    add(g, new THREE.BoxGeometry(6.62, 0.08, 2.82).translate(0, 6.6, -1.5), paper('#F2EDE4'), 0);
    [-1.6, 1.6].forEach((x) => { const h = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 24, Math.PI), paper(C.ink, { roughness: 0.6 })); h.position.set(x * 0.6, 7.4, -1.5 + x * 0.25); h.rotation.y = 0; g.add(h); });
    const lk = new THREE.Group(); kiteParts(0.03, 0.03).forEach((m) => lk.add(m)); lk.position.set(0, 4.2, -0.05); lk.rotation.z = -0.2; g.add(lk);
    // стрічка: петлі банта + кінці
    const loop = new THREE.TorusGeometry(0.75, 0.16, 8, 22); loop.scale(1.3, 0.75, 0.5);
    const l1 = new THREE.Mesh(loop, yellow); l1.position.set(-0.95, 0, 0); l1.rotation.z = 0.35; bow.add(l1);
    const l2 = new THREE.Mesh(loop, yellow); l2.position.set(0.95, 0, 0); l2.rotation.z = -0.35; bow.add(l2);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), yellow); bow.add(knot);
    const tailG = new THREE.BoxGeometry(0.42, 1.8, 0.06).translate(0, -0.9, 0);
    const t1 = new THREE.Mesh(tailG, yellow); t1.rotation.z = 0.35; bow.add(t1); const t2 = new THREE.Mesh(tailG, yellow); t2.rotation.z = -0.3; bow.add(t2);
    bow.userData.t = [t1, t2]; bow.position.set(0, 6.9, 0.05); g.add(bow);
  }
  layers.forEach((g) => { shadowAll(g); g.traverse((m) => { if (m.isMesh) { m.userData.layer = g.userData.i; hitMeshes.push(m); } }); });

  /* аркуші історії (крок 02) */
  const sheets = [0, 1, 2].map((i) => { const piv = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, D - 0.6).rotateX(-Math.PI / 2).translate(W / 2 - 0.2, 0, 0), new THREE.MeshStandardMaterial({ map: TX.storySheet(20 + i), roughness: 0.95, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; piv.add(m); piv.position.set(0, SY + 0.04 + i * 0.01, 0); piv.visible = false; book.add(piv); return piv; });
  /* сяйво зсередини (крок 05) */
  const glowM = new THREE.MeshBasicMaterial({ map: TX.glowPage(), transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const glowP = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, D - 0.4).rotateX(-Math.PI / 2), glowM); glowP.position.set(W / 2, SY + 0.03, 0); book.add(glowP);
  /* стрічка пакування (крок 04) */
  const ribM = paper(C.kite, { roughness: 0.5 });
  const ribA = new THREE.Mesh(new THREE.BoxGeometry(BW + 0.12, 2 * SY + 0.14, 1.5), ribM); ribA.position.set(BW / 2, SY, 2.2);
  const ribB = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2 * SY + 0.12, BD + 0.12), ribM); ribB.position.set(13.2, SY, 0);
  const pBow = bow.clone(); pBow.scale.setScalar(2.2); pBow.rotation.x = -Math.PI / 2; pBow.position.set(13.2, 2 * SY + 0.1, 2.2);
  [ribA, ribB, pBow].forEach((m) => { m.visible = false; book.add(m); shadowAll(m); });

  /* змій, хвіст, нитка, гірлянда */
  const kite = new THREE.Group(); const kBody = new THREE.Group(); kiteParts(0.075, 0.08).forEach((m) => kBody.add(m)); kite.add(kBody);
  const stickM = paper(C.ink, { roughness: 0.6 });
  const st1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8.4, 6), stickM); st1.position.set(0, -0.45, 0.06); kBody.add(st1);
  const st2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 6), stickM); st2.rotation.z = Math.PI / 2; st2.position.set(0, 0.6, 0.06); kBody.add(st2);
  kite.visible = false; root.add(kite); shadowAll(kite);
  const tube = (n, rad) => { const g = new THREE.BufferGeometry(), R = 4; g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * R * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((n + 1) * R * 3), 3)); const idx = []; for (let i = 0; i < n; i++) for (let r = 0; r < R; r++) { const a = i * R + r, b = i * R + ((r + 1) % R), c = a + R, d = b + R; idx.push(a, c, b, b, c, d); } g.setIndex(idx); g.userData = { n, R, rad }; return g; };
  const thread = new THREE.Mesh(tube(64, 0.05), stickM); thread.visible = false; thread.frustumCulled = false; root.add(thread);
  const tailM = paper(C.tailInk, { roughness: 0.7 });
  const tail = new THREE.Mesh(tube(24, 0.05), tailM); tail.visible = false; tail.frustumCulled = false; root.add(tail);
  const bows = [0, 1, 2].map(() => { const b = new THREE.Group(); const t = poly([[0, 0], [-0.9, 0.55], [-0.9, -0.55]]), t2 = poly([[0, 0], [0.9, 0.55], [0.9, -0.55]]); b.add(new THREE.Mesh(ex(t, 0.04, 0), paper(C.tail)), new THREE.Mesh(ex(t2, 0.04, 0), paper(C.kite))); b.visible = false; root.add(b); return b; });
  const GN = mobile ? 26 : 44;
  const garland = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false }), GN);
  garland.instanceMatrix.setUsage(THREE.DynamicDrawUsage); garland.frustumCulled = false; root.add(garland);
  { const cA = new THREE.Color('#FFD36A'), cB = new THREE.Color('#FFB35A'), cC = new THREE.Color('#FFF0C0'); for (let i = 0; i < GN; i++) garland.setColorAt(i, [cA, cB, cC][i % 3].clone().multiplyScalar(1.7)); }
  garland.count = 0;
  // ім'я, що злітає (крок 01)
  const flyName = new THREE.Group(); root.add(flyName); flyName.visible = false;
  const flyM = new THREE.MeshPhysicalMaterial({ color: C.kite, roughness: 0.35, clearcoat: 0.5, emissive: '#F6B324', emissiveIntensity: 0.25 });

  /* ім'я → обкладинка, кубики, банер, корінець */
  let curName = null;
  function letters(name) { return [...(name || '').toUpperCase().replace(/'/g, '’')].filter((ch) => GLYPHS.g[ch] || ch === ' '); }
  function setName(name) {
    name = (name || '').trim().slice(0, 14); if (name === curName) return; curName = name;
    const chars = letters(name), has = chars.some((c) => c !== ' ');
    // обкладинка
    coverTex.t.dispose(); coverTex.t = TX.cover(has); coverM.map = coverTex.t; coverM.needsUpdate = true;
    coverName.clear(); flyName.clear();
    if (has) {
      const size = 3.0, gw = chars.map((c) => (c === ' ' ? 1.2 : glyphGeo(c, size, 0.5, 0.06).w * 0.92));
      const tot = gw.reduce((a, b) => a + b, 0), fit = Math.min(1, 13.6 / tot); let x = -tot * fit / 2;
      chars.forEach((c, k) => { const w = gw[k] * fit; if (c !== ' ') { const m = new THREE.Mesh(glyphGeo(c, size, 0.5, 0.06).geo, nameM); m.scale.setScalar(fit); m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0, 0); m.castShadow = true; m.userData.x = x + w / 2; coverName.add(m);
        const f = new THREE.Mesh(glyphGeo(c, size, 0.5, 0.06).geo, flyM); f.userData = { k, n: chars.length, x: x + w / 2, fit }; flyName.add(f); } x += w; });
    }
    // кубики абетки: ім'я або «АБЕТКА»
    abc.clear();
    const src = (has ? chars.filter((c) => c !== ' ') : [...'АБВГҐД']).slice(0, 9), n = src.length, sp = 3.7, fit = Math.min(1, 12.5 / (n * sp));
    src.forEach((ch, k) => {
      const grp = new THREE.Group(); grp.position.set((k - (n - 1) / 2) * sp * fit, 0, 0); grp.scale.setScalar(fit); grp.rotation.y = ((k * 37) % 7 - 3) * 0.035;
      const cube = new THREE.Mesh(cubeGeo, cubeMats[k % 4]); grp.add(cube);
      const gg = glyphGeo(ch, 1.9, 0.3, 0.05); if (gg) { const lm = new THREE.Mesh(gg.geo, letMats[[0, 0, 2, 3][k % 4]]); lm.position.set(0, 0.62, 0.32); grp.add(lm); }
      grp.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; m.userData.layer = 2; } });
      abc.add(grp);
    });
    hitMeshes.length = 0; layers.forEach((g) => g.traverse((m) => { if (m.isMesh) hitMeshes.push(m); }));
    // банер і корінець
    const bt = L.hero.userData.bTex; bt.t.dispose(); bt.t = TX.banner(has ? name : ''); L.hero.userData.bM.map = bt.t; L.hero.userData.bM.needsUpdate = true;
    spineTex.t.dispose(); spineTex.t = TX.spine(has ? name : ''); spineM.map = spineTex.t; spineM.needsUpdate = true;
  }
  setName('');
  shadowAll(book); plaid.castShadow = false;

  return { root, book, pivot, spineP, coverName, nameM, layers, hitMeshes, buttons, bow, sheets, glowM, glowP, ribA, ribB, pBow, kite, kBody, thread, tail, bows, garland, GN, flyName, flyM, nightGlow, inkM, paperMats: mats, setName, get name() { return curName; } };
}
