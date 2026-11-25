// app.js — головна: чесний прелоадер (лічильник 000→100: геометрія/текстури, шрифти, 24 рівні кадри; змій летить по нитці),
// аркуш прелоадера складається вниз, камера пролітає з-над змія на обкладинці; скрол = одна pose(p); лічильник «СТОРІНКА 0X / 07»,
// виноски шарів, кроки процесу, ніч; магніти; ім'я героя → 3D; ?demo=1, ?p=, ?pre=1, ?q=, ?clean.
import { initCommon, Q, REDUCED, MOBILE, STILL, cursor, foldPlay, ss, gsapP, hero } from './common.js';
import { pose, SEGS, FOCUS, MAGNETS, clamp, sss, segAt } from './choreo.js';

initCommon();
const DEMO = Q.get('demo') === '1';
const PFIX = Q.has('p') ? clamp(parseFloat(Q.get('p')) || 0) : null;
if (Q.has('clean')) { const s = document.createElement('style'); s.textContent = '.hd,.copy,.cos,.cur,.ft{display:none!important}'; document.head.appendChild(s); }
const body = document.body, pre = document.getElementById('pre'), preN = document.getElementById('pre-n'), prePath = document.getElementById('pre-path'), preKite = document.getElementById('pre-kite');
const canvas = document.getElementById('stage'), spacer = document.getElementById('spacer'), footer = document.querySelector('.ft'), hd = document.querySelector('.hd');
const panels = [...document.querySelectorAll('.copy .pnl')].map((el) => ({ el, a: +el.dataset.a, b: +el.dataset.b, h: el.querySelector('.fold'), o: -1 }));
const pgN = document.getElementById('pg-n'), coEls = [...document.querySelectorAll('.co')], psts = [...document.querySelectorAll('.pst')], pth = document.querySelector('.pnl-p');

/* ---------- чесний прелоадер ---------- */
let actual = 0, shown = 0; const add = (v) => { actual = Math.min(1, actual + v); };
const PRE = Q.get('pre') === '1', firstVisit = PRE || !ss.get('mk-pre');
const skipPre = !PRE && (REDUCED || PFIX != null || (location.hash && SEGS.some((s) => '#' + s.id === location.hash)));
let preDone = false, skipReq = false; const preT0 = performance.now(); let lastPre = preT0;
const PL = prePath.getTotalLength ? prePath.getTotalLength() : 400; prePath.style.strokeDasharray = PL;
function preTick(now) {
  if (preDone) return;
  const dt = Math.min(1 / 30, (now - lastPre) / 1000); lastPre = now; // повільний кадр рухає лічильник максимум на 1/30 с
  shown += (actual - shown) * Math.min(1, dt * 7); if (actual - shown < 0.004) shown = actual;
  preN.textContent = String(Math.round(shown * 100)).padStart(3, '0');
  prePath.style.strokeDashoffset = (PL * (1 - shown)).toFixed(1);
  const pt = prePath.getPointAtLength(PL * shown), w = prePath.ownerSVGElement.clientWidth;
  preKite.style.transform = `translate(${(pt.x / 400 * w).toFixed(1)}px, ${(pt.y + 14).toFixed(1)}px) rotate(${(Math.sin(now / 300) * 8).toFixed(1)}deg)`;
  requestAnimationFrame(preTick);
}
if (!skipPre) requestAnimationFrame(preTick);
if (!firstVisit && !skipPre) pre.classList.add('quick');
const askSkip = () => { if (performance.now() - preT0 > 1000) skipReq = true; };
addEventListener('wheel', askSkip, { passive: true }); addEventListener('touchstart', askSkip, { passive: true }); addEventListener('keydown', (e) => { if (['Space', 'ArrowDown', 'PageDown', 'Escape'].includes(e.code)) askSkip(); });
document.fonts.ready.then(() => add(0.1));

/* ---------- сцена ---------- */
let S = null;
const state = { p: PFIX ?? 0, target: PFIX ?? 0, drop: skipPre ? 1 : 0, demo: { t: 0, p: 0, done: false, duration: 0 } };
window.__demo = state.demo;
async function boot() {
  await new Promise((r) => requestAnimationFrame(() => r()));
  try {
    const mod = await import('./scene.js');
    S = await mod.createScene({ canvas, mode: 'full', mobile: MOBILE, still: STILL, qFixed: Q.get('q'), step: async (v) => { add(v * 0.8 / 0.75); await new Promise((r) => setTimeout(r, 0)); } });
  } catch (err) {
    console.info('3D недоступне:', err && err.message);
    const po = document.querySelector('.poster'); po.src = po.dataset.src; po.hidden = false; document.querySelector('.nogl').hidden = false; canvas.hidden = true;
    actual = 1; finishPre(true); requestAnimationFrame(loop); return;
  }
  S.st.reduced = REDUCED; window.__scene = S;
  S.setName(DEMO && !hero.get() ? 'Марта' : hero.get());
  addEventListener('mk-name', (e) => S.setName(e.detail));
  addEventListener('resize', () => S.resize());
  let good = 0; const t0 = performance.now(); let last = t0;
  await new Promise((res) => {
    const f = (now) => { const dt = now - last; last = now; S.frame(Math.min(dt / 1000, 1 / 30), poseNow(state.p)); if (dt < 34) { good++; add(0.1 / 24); }
      if (good >= 24 || now - t0 > 4000 || skipPre) { actual = 1; res(); } else requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  finishPre(false); requestAnimationFrame(loop);
}
function finishPre(noGL) {
  const go = async () => {
    if (!skipPre) preN.textContent = '100';
    preDone = true; const gsap = await gsapP();
    body.classList.remove('is-locked'); ss.set('mk-pre', '1');
    if (PFIX != null) jumpTo(PFIX); else if (location.hash) { const i = SEGS.findIndex((x) => '#' + x.id === location.hash); if (i >= 0) jumpTo(FOCUS[i]); }
    if (skipPre || noGL) { pre.remove(); state.drop = 1; return; }
    setTimeout(() => {
      pre.classList.add('out');
      gsap.to(state, { drop: 1, duration: skipReq ? 0.01 : 2.4, ease: 'power2.inOut', delay: 0.15 });
      setTimeout(() => pre.remove(), 1500);
    }, firstVisit ? 280 : 0);
  };
  if (skipReq || skipPre || noGL) go(); else { const ch = () => (shown >= 0.995 || skipReq) ? go() : requestAnimationFrame(ch); ch(); }
}

/* ---------- скрол → p ---------- */
const range = () => Math.max(1, spacer.offsetHeight - innerHeight);
const scrollP = () => clamp(scrollY / range());
function jumpTo(p) { scrollTo({ top: p * range(), behavior: 'instant' }); state.target = state.p = p; }
let glide = null;
function glideTo(p) {
  const from = scrollY, to = p * range(), dist = Math.abs(p - scrollP()), dur = REDUCED ? 0.01 : 0.9 + 2.2 * dist, t0 = performance.now();
  const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  glide = (now) => { const k = Math.min(1, (now - t0) / 1000 / dur); scrollTo({ top: from + (to - from) * ease(k), behavior: 'instant' }); if (k >= 1) glide = null; };
}
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const i = SEGS.findIndex((x) => '#' + x.id === a.getAttribute('href')); if (i >= 0) { e.preventDefault(); glideTo(FOCUS[i]); } }));
let scrollTimer = 0;
addEventListener('scroll', () => {
  clearTimeout(scrollTimer); if (DEMO || STILL || REDUCED || glide) return;
  scrollTimer = setTimeout(() => { const p = scrollP(); if (p >= 0.999 || scrollY > range()) return; const m = MAGNETS.find((m) => Math.abs(m - p) < 0.02 && Math.abs(m - p) > 0.002); if (m != null) glideTo(m); }, 240);
}, { passive: true });
['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, () => { glide = null; }, { passive: true }));

/* ---------- demo director (детермінований прогін для відео) ---------- */
const DKEYS = [[0, 0], [3, 0], [6, 0.19], [8, 0.192], [11, 0.28], [13.5, 0.282], [16, 0.388], [18, 0.39], [20.5, 0.44], [22, 0.442], [24.5, 0.492], [26, 0.494], [28.5, 0.544], [30.5, 0.546], [33, 0.596], [35, 0.598], [42, 0.776], [45, 0.85], [47.5, 0.852], [51, 0.99], [53, 1]];
state.demo.duration = DKEYS.at(-1)[0] + 2.4;
function demoP(t) { if (t <= 0) return 0; for (let i = 1; i < DKEYS.length; i++) if (t <= DKEYS[i][0]) { const a = DKEYS[i - 1], b = DKEYS[i]; return a[1] + (b[1] - a[1]) * sss((t - a[0]) / (b[0] - a[0])); } return 1; }

/* ---------- поза + UI ---------- */
function poseNow(p) { const P = pose(p); P.drop = state.drop; return P; }
const fadeIn = (p, a, b, f = 0.012) => clamp((p - a) / f) * clamp((b - p) / f);
function updCallouts(P) {
  if (!S || MOBILE || S.st.portrait) return;
  coEls.forEach((el, i) => {
    const [x, y, vis] = S.projectW(S.anchors[i]);
    const o = vis ? fadeIn(P.p, 0.236 + i * 0.006, 0.33) * clamp(P.explode * 1.5 - 0.3) : 0;
    if (o <= 0) { if (el.style.opacity !== '0') el.style.opacity = 0; return; }
    el.style.setProperty('--lead', '44px'); el.style.opacity = o.toFixed(3);
    el.style.transform = `translate(${Math.min(x, innerWidth - 300).toFixed(1)}px,${Math.max(96, y).toFixed(1)}px)`;
  });
}
let curSeg = null, night = false;
function updUI(P) {
  const p = P.p;
  for (const pn of panels) {
    const f = 0.01;
    const o = (pn.a < 0 ? 1 : clamp((p - pn.a + f * 0.5) / f)) * (pn.b > 1 ? 1 : clamp((pn.b + f * 0.5 - p) / f));
    const oo = pn.a < 0 ? o * clamp(state.drop * 2.2 - 1.1) : o;
    if (Math.abs(oo - pn.o) > 0.001) { pn.el.style.opacity = oo.toFixed(3); pn.el.classList.toggle('vis', oo > 0.01); pn.o = oo; }
    if (pn.h && state.drop > 0.6) { const want = oo > 0.6 ? 1 : oo < 0.02 ? -1 : 0; if (want && want !== pn.dir) { pn.dir = want; foldPlay(pn.h, want); } }
  }
  const s = segAt(p);
  if (s !== curSeg) {
    curSeg = s; if (pgN) pgN.textContent = String(s.scr).padStart(2, '0');
    if (!STILL && !DEMO && state.drop >= 1 && scrollY < range()) history.replaceState(null, '', '#' + s.id);
  }
  hd.style.setProperty('--hp', p.toFixed(4));
  const nn = P.night > 0.5; if (nn !== night) { night = nn; body.classList.toggle('is-night', nn); }
  psts.forEach((li, j) => { li.classList.toggle('on', P.step === j); li.classList.toggle('done', P.step > j); });
  if (pth) pth.style.setProperty('--k', clamp((p - 0.62) / 0.16).toFixed(4));
  updCallouts(P);
}

/* ---------- цикл ---------- */
let last = performance.now(), frames = 0, fpsT = last, idleT = 0, skip = false; window.__fps = 0;
addEventListener('pointermove', (e) => { if (!S || e.pointerType === 'touch') return; const over = !e.target.closest('a,button,input,label,.hd,.ft,.menu'); S.pointer(e.clientX, e.clientY, over && scrollY < range() + 10); idleT = 0; }, { passive: true });
document.addEventListener('pointerleave', () => S && S.pointer(-9999, -9999, false));
addEventListener('pointerdown', (e) => { if (S && e.pointerType === 'touch' && !e.target.closest('a,button,input')) { S.pointer(e.clientX, e.clientY, true); idleT = 0; } }, { passive: true });
addEventListener('pointerup', (e) => { if (S && e.pointerType === 'touch') setTimeout(() => S.pointer(-9999, -9999, false), 500); }, { passive: true });
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  frames++; if (now - fpsT > 1000) { window.__fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
  if (document.hidden) return;
  if (glide) glide(now);
  if (DEMO) { state.demo.t += dt; if (state.drop >= 1) { const td = Math.max(0, state.demo.t - 2.4); state.target = demoP(td); state.demo.done = td >= DKEYS.at(-1)[0]; } state.p = state.target; }
  else if (PFIX != null) state.p = state.target = PFIX;
  else { state.target = scrollP(); state.p += (state.target - state.p) * (1 - Math.exp(-5 * dt)); if (Math.abs(state.target - state.p) < 1e-5) state.p = state.target; }
  state.demo.p = state.p;
  const P = poseNow(state.p); updUI(P);
  if (S) cursor.overBook = S.st.overBook;
  idleT += dt;
  const covered = footer.getBoundingClientRect().top <= 0;
  const idle = !DEMO && idleT > 2.5 && Math.abs(state.target - state.p) < 1e-4 && state.drop >= 1 && S?.st.hover < 0 && P.kite <= 0;
  skip = idle ? !skip : false; // спокій → 30 fps
  if (S && !covered && !skip) S.frame(idle ? dt * 2 : dt, P);
}
addEventListener('scroll', () => { idleT = 0; }, { passive: true });
addEventListener('mk-name', () => { idleT = 0; });
boot();
