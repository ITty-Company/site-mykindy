// choreo.js — хореографія «Книги-розкладачки». Чисті функції від progress p (0..1): без DOM, без стану, без three.
// pose(p) → кут обкладинки, підйом 5 шарів, розліт, «вітрина» продуктів, кроки процесу, ніч, змій, гірлянда, камера.
export const W = 20, D = 26, BT = 0.4, HB = 0.8, SY = BT + HB; // сторінка 20×26 см, обкладинка 4 мм, блок 8 мм
// 5 шарів-продуктів (порядок = порядок туру). z — лінія згину на розвороті; h/hw — висота й півширина (для виносок і вітрини)
export const LAYERS = [
  { id: 'hero', x: 0, z: -2.8, h: 14.8, hw: 6.2, sc: 0.72 },
  { id: 'kazka', x: 0, z: -9.4, h: 15.4, hw: 14.5, sc: 0.6 },
  { id: 'abetka', x: 0, z: 6.4, h: 3.4, hw: 6.2, sc: 1.2 },
  { id: 'cyfry', x: -12.2, z: 5.6, h: 6.0, hw: 5.5, sc: 1.25 },
  { id: 'pak', x: 12.0, z: 4.2, h: 8.6, hw: 3.4, sc: 1.2 },
];
export const ZORDER = LAYERS.map((l, i) => i).sort((a, b) => LAYERS[a].z - LAYERS[b].z); // задній шар — першим
export const SHOW = [0, SY + 2.2, 17.5];
export const SEGS = [
  { id: 'heroi', t0: 0.00, t1: 0.08, scr: 1 }, { id: 'vidkryite', t0: 0.08, t1: 0.20, scr: 2 }, { id: 'shary', t0: 0.20, t1: 0.36, scr: 3 },
  { id: 'personalna', t0: 0.36, t1: 0.412, scr: 4 }, { id: 'kazka', t0: 0.412, t1: 0.464, scr: 4 }, { id: 'abetka', t0: 0.464, t1: 0.516, scr: 4 },
  { id: 'cyfry', t0: 0.516, t1: 0.568, scr: 4 }, { id: 'pakuvannia', t0: 0.568, t1: 0.62, scr: 4 },
  { id: 'yak', t0: 0.62, t1: 0.78, scr: 5 }, { id: 'nich', t0: 0.78, t1: 0.90, scr: 6 }, { id: 'zamovyty', t0: 0.90, t1: 1.00, scr: 7 },
];
export const FOCUS = [0, 0.19, 0.28, 0.388, 0.44, 0.492, 0.544, 0.596, 0.66, 0.85, 0.99];
export const MAGNETS = [0, 0.19, 0.28, 0.388, 0.44, 0.492, 0.544, 0.596, 0.85, 0.99];
export const STEPS = [0.62, 0.652, 0.684, 0.716, 0.748, 0.78]; // межі кроків 01–05
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const ss = (x) => x * x * (3 - 2 * x);
export const sss = (x) => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (p, a, b) => ss(seg(p, a, b));
const bump = (p, a, b) => Math.sin(Math.PI * seg(p, a, b));
// пружина «back.out»: 0→1 з перельотом ~9%, точно 1 на кінці (чиста функція)
export const spring = (s) => { if (s <= 0) return 0; if (s >= 1) return 1; const c = 2.2; return 1 + (c + 1) * Math.pow(s - 1, 3) + c * Math.pow(s - 1, 2); };
export const segAt = (p) => SEGS.find((s) => p < s.t1) || SEGS[SEGS.length - 1];
export const stepAt = (p) => { for (let i = 0; i < 5; i++) if (p < STEPS[i + 1]) return i; return 4; };
export const TOUR = SEGS.slice(3, 8);

/* ---------- обкладинка ---------- */
export function open(p) {
  if (p < 0.70) return ramp(p, 0.088, 0.15);
  if (p < 0.745) return 1 - ramp(p, 0.716, 0.738);              // крок 04: книга закривається
  if (p < 0.779) return 0.13 * ramp(p, 0.752, 0.766);           // крок 05: прочиняється, звідти світло
  if (p < 0.9) return lerp(0.13, 1, ramp(p, 0.782, 0.81));        // ніч: розкривається знову
  return 1 - ramp(p, 0.918, 0.952);                               // фінал: закривається
}
/* ---------- шари: підйом на згинах ---------- */
function rise(p, i) {
  const r = ZORDER.indexOf(i);
  if (p < 0.62) return spring(seg(p, 0.128 + r * 0.011, 0.168 + r * 0.011));
  if (p < 0.78) {
    const fold = 1 - ramp(p, 0.62, 0.632);
    if (LAYERS[i].id === 'hero') return Math.max(fold, spring(seg(p, 0.686, 0.702)) * (1 - ramp(p, 0.708, 0.716)));
    return fold;
  }
  if (p < 0.9) return spring(seg(p, 0.806 + r * 0.008, 0.836 + r * 0.008));
  return 1 - ramp(p, 0.902 + (4 - r) * 0.002, 0.918 + (4 - r) * 0.002);
}
/* ---------- тур: шар виїжджає у вітрину ---------- */
function show(p, j) { const s = TOUR[j]; return ramp(p, s.t0 + 0.002, s.t0 + 0.018) * (1 - ramp(p, s.t1 - 0.014, s.t1 - 0.001)); }

/* ---------- камера: ключі + Catmull-Rom по позиції, sss між ключами ---------- */
const K = [ // [p, позиція камери, ціль, fov, центр об'єкта (для мобільного кадру)]
  [0.00, [13, 35, 45], [-0.8, 0.4, 3.4], 31, [10, 1, 1]],
  [0.075, [16, 32, 41], [0.6, 0.6, 3.0], 31, [10, 1, 1]],
  [0.19, [-3, 27, 42], [4.2, 4.2, -1.4], 33, [0, 4, -1]],
  [0.28, [33, 31, 54], [-6.5, 6.8, 1.5], 34, [0, 7, 0]],
  [0.355, [10, 20, 47], [0, 6.2, 6], 34, [0, 6, 5]],
  [0.388, [-12, 12, 45], [-4.6, 7.4, 17], 31, [0, 8.5, 17.5]],
  [0.44, [12, 17, 46], [5.6, 9.4, 16.5], 32, [0, 8, 17]],
  [0.492, [1, 10, 41], [0, 4.6, 17.5], 30, [0, 5, 17.5]],
  [0.544, [-13, 19, 41], [-5.6, 8.4, 17], 31, [0, 5, 17.5]],
  [0.596, [15, 14, 42], [5.2, 7.6, 17.5], 31, [0, 8, 17.5]],
  [0.64, [-3, 40, 33], [-7, 2.5, 1.5], 34, [0, 2, 0]],
  [0.70, [-2, 39, 34], [-6, 1.5, 1.5], 34, [0, 1, 0]],
  [0.735, [3, 40, 44], [1.5, 0.6, 2.2], 31, [10, 1, 1]],
  [0.775, [3, 30, 37], [1, 1.4, 1.4], 32, [9, 1, 1]],
  [0.85, [3, 11, 56], [-2, 13.0, 0], 38, [-4, 9, 0]],
  [0.99, [5, 31, 50], [3.5, -2.5, 7], 34, [4, 5, 0]],
  [1.00, [5, 31, 50], [3.5, -2.5, 7], 34, [4, 5, 0]],
];
const cr = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
export function camera(p) {
  p = clamp(p); let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++;
  const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(K.length - 1, i + 2)];
  const t = sss(seg(p, k1[0], k2[0]));
  const v = (n) => [0, 1, 2].map((a) => cr(k0[n][a], k1[n][a], k2[n][a], k3[n][a], t));
  return { pos: v(1), target: v(2), fov: lerp(k1[3], k2[3], t), obj: v(4) };
}

/* ---------- змій: політ із розвороту ---------- */
export function kitePath(k, out = [0, 0, 0]) {
  // із жолоба (0,SY,0) вгору-назад-ліворуч, петля і зависання над книгою
  const P = [[0, SY, 0], [1.5, 6, 2], [-5, 12, 4], [-13, 16, -2], [-15, 17.5, -7]];
  const s = k * (P.length - 1), i = Math.min(P.length - 2, Math.floor(s)), t = s - i;
  const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
  for (let n = 0; n < 3; n++) out[n] = cr(a[n], b[n], c[n], d[n], t);
  return out;
}

export function pose(p) {
  p = clamp(p);
  const P = { p, open: open(p) };
  P.rise = LAYERS.map((l, i) => rise(p, i));
  const tour = ramp(p, 0.356, 0.372) * (1 - ramp(p, 0.606, 0.62));
  P.explode = p < 0.37 ? ramp(p, 0.2, 0.25) * (1 - ramp(p, 0.33, 0.362)) : 0;
  P.show = TOUR.map((s, j) => (p > 0.35 && p < 0.63 ? show(p, j) : 0));
  if (tour > 0) P.rise = P.rise.map((r, i) => r * (1 - 0.94 * tour * (1 - P.show[i])));
  const cy = TOUR[3], pk = TOUR[4];
  P.press = [0, 1, 2].map((b) => bump(p, cy.t0 + 0.02 + b * 0.008, cy.t0 + 0.028 + b * 0.008));
  P.bagRibbon = ramp(p, pk.t0 + 0.016, pk.t0 + 0.034);
  // процес
  P.fly = ramp(p, 0.624, 0.646); P.fall = ramp(p, 0.652, 0.668);
  P.sheets = [0, 1, 2].map((i) => ramp(p, 0.656 + i * 0.008, 0.678 + i * 0.008));
  P.ink = p < 0.62 || p > 0.72 ? 1 : (1 - ramp(p, 0.62, 0.63)) + ramp(p, 0.694, 0.712);
  P.stamp = p < 0.70 ? 1 : p < 0.734 ? 0 : spring(seg(p, 0.734, 0.748));
  P.ribbon = ramp(p, 0.738, 0.75) * (1 - ramp(p, 0.751, 0.758));
  P.glowIn = bump(p, 0.75, 0.79);
  P.step = p >= 0.62 && p < 0.78 ? stepAt(p) : -1;
  // ніч
  P.night = ramp(p, 0.772, 0.812);
  P.kite = ramp(p, 0.79, 0.862);
  P.garland = ramp(p, 0.82, 0.88);
  P.kiteFin = ramp(p, 0.9, 0.965);
  P.nameGlow = ramp(p, 0.94, 0.985);
  P.breathe = p < 0.09 ? 1 : p > 0.95 ? 1 : 0.35;
  P.cam = camera(p);
  return P;
}

// кадр під aspect: на портреті — ціль = центр об'єкта, камера далі (текст унизу; об'єкт може обрізатися краями)
export function frameCam(c, asp) {
  if (asp >= 1.05) return c;
  const f = Math.min(2.0, Math.sqrt(1.5 / asp)), t = c.obj;
  return { pos: c.pos.map((v, i) => t[i] + (v - c.target[i]) * f), target: t, fov: c.fov, obj: t };
}
