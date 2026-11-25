// textures.js — усі текстури процедурні (canvas): зерно паперу, в'язаний плед, обкладинка з рамкою «Тут буде ім'я»,
// форзац зі зміями, зріз сторінок, тканинний корінець з іменем, банер імені, аркуш із рядками історії.
import * as THREE from 'three';
const C = { milk: '#FFFAF0', plaid: '#F3E6D3', ink: '#221B3A', kite: '#F6B324', tail: '#E8762A', tailInk: '#A9480E', sky: '#CFE6F5', dusk: '#2E2650', feather: '#615A72' };
export { C };
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function tex(c, { srgb = true, rep = null, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
export function grain(size = 256) {
  const [c, g] = cv(size, size), r = rng(7), d = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = 238 + (r() - 0.5) * 26 - (r() < 0.02 ? 22 : 0); d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
  g.putImageData(d, 0, 0);
  // волокна
  g.globalAlpha = 0.05; g.strokeStyle = '#6a5a48';
  for (let i = 0; i < 120; i++) { g.lineWidth = 0.6 + r(); g.beginPath(); const x = r() * size, y = r() * size; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 20 - 10, y + r() * 20 - 10, x + r() * 30 - 15, y + r() * 30 - 15); g.stroke(); }
  return tex(c, { srgb: false, rep: [1, 1] });
}
export function plaid(size = 1024) {
  const [c, g] = cv(size, size), r = rng(11);
  g.fillStyle = '#F4E8D6'; g.fillRect(0, 0, size, size);
  const cols = 16, cw = size / cols, rows = 32, rh = size / rows;
  for (let i = 0; i < cols; i++) {
    const cable = i % 4 === 1;
    for (let j = 0; j < rows; j++) {
      const x = i * cw, y = j * rh, shade = cable ? 0.06 : 0.035;
      // петля «V» в'язки
      const grd = g.createLinearGradient(x, y, x, y + rh);
      grd.addColorStop(0, `rgba(255,255,255,${0.35})`); grd.addColorStop(1, `rgba(120,90,60,${shade + 0.05})`);
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(x + 2, y); g.quadraticCurveTo(x + cw * 0.25, y + rh * 1.1, x + cw / 2, y + rh); g.quadraticCurveTo(x + cw * 0.75, y + rh * 1.1, x + cw - 2, y); g.quadraticCurveTo(x + cw / 2, y + rh * 0.55, x + 2, y); g.fill();
    }
    g.fillStyle = 'rgba(120,90,60,0.07)'; g.fillRect(i * cw - 1, 0, 2, size);
  }
  g.globalAlpha = 0.05; for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#8a6a48'; g.fillRect(r() * size, r() * size, 1 + r() * 2, 1); }
  return tex(c, { rep: [7, 7], aniso: 8 });
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function kitePath(g, x, y, s) { g.beginPath(); g.moveTo(x, y - 50 * s); g.lineTo(x + 34 * s, y - 8 * s); g.lineTo(x, y + 62 * s); g.lineTo(x - 34 * s, y - 8 * s); g.closePath(); }
// обкладинка 20.6×27 → 824×1080; рамка під ім'я по центру, назва внизу
export const COVER = { w: 824, h: 1080, frame: [112, 470, 600, 240] };
export function cover(hasName) {
  const { w, h } = COVER, [c, g] = cv(w, h), r = rng(3);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#BFDDF2'); grd.addColorStop(0.65, '#DCEEF8'); grd.addColorStop(1, '#F6EEDC'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // хмаринки
  g.fillStyle = 'rgba(255,255,255,0.75)';
  [[150, 220, 1], [620, 160, 0.8], [690, 820, 0.9], [120, 880, 0.7]].forEach(([x, y, s]) => { g.beginPath(); g.ellipse(x, y, 90 * s, 28 * s, 0, 0, 7); g.ellipse(x + 40 * s, y - 20 * s, 50 * s, 30 * s, 0, 0, 7); g.ellipse(x - 40 * s, y - 10 * s, 40 * s, 22 * s, 0, 0, 7); g.fill(); });
  // нитка змія (сам змій — об'ємний)
  g.strokeStyle = C.ink; g.lineWidth = 3; g.lineCap = 'round'; g.setLineDash([]);
  g.beginPath(); g.moveTo(640, 360); g.bezierCurveTo(600, 420, 700, 450, 690, 500); g.stroke();
  // рамка під ім'я
  const [fx, fy, fw, fh] = COVER.frame;
  g.fillStyle = 'rgba(255,250,240,0.92)'; rr(g, fx, fy, fw, fh, 36); g.fill();
  g.strokeStyle = C.tailInk; g.lineWidth = 4; g.setLineDash([18, 12]); rr(g, fx + 14, fy + 14, fw - 28, fh - 28, 26); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.tailInk; g.textAlign = 'center';
  g.font = '600 30px "Montserrat Alternates"';
  if (!hasName) { g.font = '800 54px "Montserrat Alternates"'; g.fillStyle = 'rgba(169,72,14,0.85)'; g.fillText('ТУТ БУДЕ ІМ’Я', w / 2, fy + fh / 2 + 18); }
  else { g.font = '400 32px Kurale'; g.fillText('головний герой —', w / 2, fy - 22); }
  // назва серії
  g.fillStyle = C.ink; g.font = '800 66px "Montserrat Alternates"'; g.fillText('MyKindy', w / 2, h - 150);
  g.font = '400 34px Kurale'; g.fillStyle = C.feather; g.fillText('персональна книга', w / 2, h - 100);
  // тканинна фактура
  g.globalAlpha = 0.06; for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#3b4a66'; g.fillRect(r() * w, r() * h, 2, 1); }
  return tex(c, { aniso: 8 });
}
export function endpaper() {
  const [c, g] = cv(512, 640); g.fillStyle = C.plaid; g.fillRect(0, 0, 512, 640);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) {
    const px = x * 92 + (y % 2) * 46 + 20, py = y * 84 + 40; g.save(); g.translate(px, py); g.rotate(-0.25); kitePath(g, 0, 0, 0.32);
    g.fillStyle = (x + y) % 3 ? 'rgba(232,118,42,0.22)' : 'rgba(246,179,36,0.35)'; g.fill(); g.restore();
  }
  return tex(c);
}
export function pageEdge() {
  const [c, g] = cv(64, 256); g.fillStyle = '#FBF5EA'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 3) { g.fillStyle = `rgba(150,120,90,${0.08 + (y % 9 === 0 ? 0.08 : 0)})`; g.fillRect(0, y, 64, 1); }
  return tex(c, { rep: [1, 1] });
}
export function spine(name) {
  const [c, g] = cv(1024, 128); g.fillStyle = C.tail; g.fillRect(0, 0, 1024, 128);
  const r = rng(5); g.globalAlpha = 0.12; for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#5a2a08'; g.fillRect(r() * 1024, r() * 128, 2, 1); }
  g.globalAlpha = 1; g.fillStyle = C.milk; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 64px "Montserrat Alternates"'; g.fillText((name || 'MyKindy').toUpperCase(), 512, 68);
  return tex(c);
}
export function banner(name) {
  const [c, g] = cv(1024, 256); g.fillStyle = C.milk; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = C.tail; g.lineWidth = 8; g.setLineDash([22, 14]); rr(g, 20, 20, 984, 216, 30); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  const t = name ? name : 'ваша дитина'; let fs = 120; g.font = `800 ${fs}px "Montserrat Alternates"`;
  while (g.measureText(t).width > 860 && fs > 40) { fs -= 6; g.font = `800 ${fs}px "Montserrat Alternates"`; }
  g.fillText(t, 512, 136);
  return tex(c, { aniso: 8 });
}
export function storySheet(seed) {
  const [c, g] = cv(512, 660), r = rng(seed); g.fillStyle = '#FFFCF5'; g.fillRect(0, 0, 512, 660);
  g.fillStyle = 'rgba(34,27,58,0.55)';
  for (let y = 90; y < 600; y += 34) { let x = 60; while (x < 440) { const w = 18 + r() * 60; if (x + w > 452) break; g.fillRect(x, y, w, 7); x += w + 10; } if (r() < 0.18) y += 20; }
  g.fillStyle = 'rgba(246,179,36,0.9)'; kitePath(g, 256, 40, 0.3); g.fill();
  return tex(c);
}
export function glowPage() {
  const [c, g] = cv(256, 320); const grd = g.createRadialGradient(128, 160, 10, 128, 160, 170);
  grd.addColorStop(0, '#FFF3C8'); grd.addColorStop(0.5, '#FFD37A'); grd.addColorStop(1, '#F6B324'); g.fillStyle = grd; g.fillRect(0, 0, 256, 320);
  return tex(c);
}
