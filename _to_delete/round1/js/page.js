// page.js — внутрішні сторінки: полегшена сцена тієї ж «Книги-розкладачки» (своя поза на кожній сторінці + короткий скраб hero),
// Lenis, горизонтальна пін-галерея, бігучий рядок від швидкості, стопка карток, параллакс, зміна фону по главах, конверт із сургучем,
// стрічка DrawSVG, слова цитати, конструктор замовлення (ім'я → книга → підтвердження, текст для Telegram/Instagram).
import { initCommon, REDUCED, MOBILE, STILL, FINE, cursor, I, gsapP, hero } from './common.js';
import { pose, clamp, ss as smooth, LAYERS } from './choreo.js';
initCommon();
const page = document.body.dataset.page;
const canvas = document.querySelector('.stage-lite');
const heroEl = document.querySelector('.ihero') || document.querySelector('.nf');
const lerp = (a, b, k) => a + (b - a) * k;
const heroP = () => { if (!heroEl) return 0; const r = heroEl.getBoundingClientRect(), h = heroEl.offsetHeight - innerHeight; return h > 40 ? clamp(-r.top / h) : clamp(-r.top / innerHeight); };
const ctorState = { s: 1, book: -1 };
const sm = { open: 0, rise: [0, 0, 0, 0, 0], ribbon: 0, glow: 0 };
const BOOK_LAYER = { personalna: 0, kazka: 1, abetka: 2, cyfry: 3 };

/* ---------- пози сторінок ---------- */
const CFG = {
  books: (lp) => { const P = pose(0.19); P.explode = smooth(lp) * 0.9; P.cam = { pos: [lerp(-8, 10, lp), lerp(30, 26, lp), 54], target: [-19, lerp(5, 7, lp), 0], fov: 34, obj: [0, 6, 0] }; return P; },
  order: (lp, dt) => {
    const s = ctorState.s, b = ctorState.book, P = pose(0.19);
    const k = 1 - Math.exp(-4 * dt), want = { open: s === 2 ? 1 : 0, ribbon: s === 3 ? 1 : 0, glow: s === 3 ? 1 : 0 };
    sm.open += (want.open - sm.open) * k; sm.ribbon += (want.ribbon - sm.ribbon) * k; sm.glow += (want.glow - sm.glow) * k;
    sm.rise = sm.rise.map((r, i) => r + (((s === 2 && sm.open > 0.85 && i === b) ? 1 : 0) - r) * (1 - Math.exp(-6 * dt)));
    P.open = sm.open; P.rise = sm.rise; P.ribbon = sm.ribbon * (1 - sm.open); P.stamp = 1; P.nameGlow = sm.glow; P.night = 0; P.kite = 0; P.garland = 0; P.explode = 0; P.show = [0, 0, 0, 0, 0]; P.breathe = 1;
    P.cam = { pos: [lerp(8, -2, sm.open), lerp(40, 36, sm.open), lerp(46, 54, sm.open)], target: [lerp(-3.5, -15, sm.open), lerp(-1, 3, sm.open), lerp(1, 0, sm.open)], fov: 32, obj: [lerp(10, 0, sm.open), 2, 0] };
    return P;
  },
  gift: (lp) => { const P = pose(lerp(0.737, 0.7498, smooth(lp))); P.cam = { pos: [lerp(-2, 3, lp), 46, 58], target: [-9, 0.5, 3], fov: 32, obj: [10, 1, 0] }; return P; },
  about: (lp) => { const P = pose(0.704); P.ink = lerp(0.7, 1, smooth(clamp(lp * 1.4))); P.cam = { pos: [lerp(2, -3, lp), 19, 46], target: [-13, 6.5, -3], fov: 34, obj: [0, 8, -3] }; return P; },
  c: (lp) => { const P = pose(0.86); P.night = 0.3; P.cam = { pos: [lerp(-14, -8, lp), 13, 58], target: [-21, 11, 0], fov: 38, obj: [-3, 10, 0] }; return P; },
  '404': (lp, dt, t) => { const P = pose(0.19); P.rise = [0, 0, 0, 0, 0]; P.kite = 0.6 + 0.4 * Math.sin(t * 0.2) ** 2; P.cam = { pos: [-6, 42, 40], target: [-19, 4, -2], fov: 34, obj: [0, 4, 0] }; return P; },
};
function mobileCam(c, asp) { if (asp >= 1.05) return c; const f = Math.min(1.9, Math.sqrt(1.4 / asp)), t = c.obj || c.target; return { pos: c.pos.map((v, i) => t[i] + (v - c.target[i]) * f), target: [t[0], t[1] - 3, t[2]], fov: c.fov }; }
async function initLite() {
  if (!canvas || !CFG[page]) return;
  const po = canvas.parentElement.querySelector('.poster');
  let S;
  try { const mod = await import('./scene.js'); S = await mod.createScene({ canvas, mode: 'lite', mobile: MOBILE, still: STILL }); }
  catch (e) { console.info('3D недоступне:', e && e.message); if (po) { po.src = po.dataset.src; po.hidden = false; } canvas.hidden = true; return; }
  S.st.reduced = REDUCED; window.__scene = S; S.setName(hero.get());
  addEventListener('mk-name', (e) => S.setName(e.detail));
  addEventListener('resize', () => S.resize());
  if (FINE) addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); const inside = e.clientY >= r.top && e.clientY <= r.bottom && !e.target.closest('a,button,input,textarea,label,.hd,.ctor'); S.pointer(e.clientX, e.clientY, inside); }, { passive: true });
  let last = performance.now(), frames = 0, fpsT = last, visible = true, lp = 0; window.__fps = 0;
  new IntersectionObserver((es) => es.forEach((e) => (visible = e.isIntersecting))).observe(canvas);
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    frames++; if (now - fpsT > 1000) { window.__fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
    if (document.hidden || !visible) return;
    lp += (heroP() - lp) * (1 - Math.exp(-6 * dt)); if (STILL) lp = heroP();
    const P = CFG[page](lp, dt, S.st.time); P.drop = 1; P.cam = mobileCam(P.cam, S.st.w / S.st.h);
    S.frame(dt, P); cursor.overBook = S.st.overBook;
  };
  requestAnimationFrame(loop);
}

/* ---------- ефекти секцій ---------- */
async function initMotion() {
  const gsap = await gsapP(); const ST = window.ScrollTrigger; if (!ST) return;
  gsap.registerPlugin(ST, ...[window.DrawSVGPlugin, window.ScrambleTextPlugin].filter(Boolean));
  if (!REDUCED && window.Lenis && !STILL) { const l = new window.Lenis({ lerp: 0.1 }); window.__lenis = l; l.on('scroll', ST.update); gsap.ticker.add((t) => l.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
  // горизонтальна галерея (knyhy)
  document.querySelectorAll('[data-horizontal]').forEach((sec) => {
    const tr = sec.querySelector('.track'); if (!tr || REDUCED) return;
    gsap.to(tr, { x: () => -(tr.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', pin: true, scrub: 0.8, end: () => '+=' + (tr.scrollWidth - innerWidth), invalidateOnRefresh: true } });
  });
  const bio = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in', e.isIntersecting)), { threshold: 0.55 });
  document.querySelectorAll('.bk').forEach((b) => (REDUCED ? b.classList.add('in') : bio.observe(b)));
  // бігучий рядок, що прискорюється від швидкості скролу
  document.querySelectorAll('[data-marquee]').forEach((el, i) => {
    if (REDUCED) return;
    const tw = gsap.to(el, { xPercent: i % 2 ? 0 : -33.333, startAt: { xPercent: i % 2 ? -33.333 : 0 }, repeat: -1, duration: +el.dataset.marquee, ease: 'none' });
    ST.create({ trigger: el, onUpdate: (s) => { gsap.to(tw, { timeScale: 1 + Math.min(Math.abs(s.getVelocity()) / 250, 5), duration: 0.2, overwrite: true, onComplete: () => gsap.to(tw, { timeScale: 1, duration: 1 }) }); } });
  });
  // стопка карток
  document.querySelectorAll('[data-stack]').forEach((w) => { const c = [...w.querySelectorAll('.card')]; c.forEach((el, i) => { if (i === c.length - 1 || REDUCED) return; gsap.to(el, { scale: 0.92, opacity: 0.5, rotate: i % 2 ? 1.5 : -1.5, ease: 'none', scrollTrigger: { trigger: c[i + 1], start: 'top bottom', end: 'top 30%', scrub: true } }); }); });
  // параллакс паперових вирізок
  document.querySelectorAll('[data-speed]').forEach((el) => { if (REDUCED) return; gsap.to(el, { yPercent: -100 * +el.dataset.speed, rotate: 30 * +el.dataset.speed, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  // зміна фону по главах (pro-nas)
  const secs = [...document.querySelectorAll('[data-bg]')];
  if (secs.length) {
    secs.forEach((s) => ST.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: (st) => { if (st.isActive) { gsap.to(document.body, { backgroundColor: s.dataset.bg, color: s.dataset.fg || '#221B3A', duration: 0.7 }); } } }));
    ST.create({ trigger: secs[0], start: 'top 55%', onLeaveBack: () => gsap.to(document.body, { backgroundColor: '#FFFAF0', color: '#221B3A', duration: 0.5 }) });
  }
  // конверт: печатка ламається, клапан відкривається, лист виїжджає
  const env = document.querySelector('.env');
  if (env) {
    const set = (p) => { env.style.setProperty('--s', smooth(clamp(p / 0.18)).toFixed(3)); env.style.setProperty('--o', smooth(clamp((p - 0.16) / 0.3)).toFixed(3)); env.style.setProperty('--l', smooth(clamp((p - 0.44) / 0.36)).toFixed(3)); env.querySelector('.env-letter').style.zIndex = p > 0.6 ? 3 : 1; };
    if (REDUCED) set(1); else ST.create({ trigger: '.env-sec', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate: (s) => set(s.progress) });
    const nm = document.getElementById('env-name'), put = (v) => { const t = v || I.g_letter_def; if (window.ScrambleTextPlugin && !REDUCED) gsap.to(nm, { duration: 0.8, scrambleText: { text: t, chars: 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ', speed: 0.5 } }); else nm.textContent = t; };
    put(hero.get()); addEventListener('mk-name', (e) => put(e.detail));
  }
  // стрічка на пакеті малюється (DrawSVG)
  const bag = document.querySelector('.bag-svg');
  if (bag && window.DrawSVGPlugin && !REDUCED) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: bag, start: 'top 80%', end: 'center 45%', scrub: 0.6 } });
    tl.from(bag.querySelector('.bag-h'), { drawSVG: 0, duration: 0.5 }).from(bag.querySelectorAll('.bag-r'), { drawSVG: '50% 50%', duration: 0.8, stagger: 0.2 }).from(bag.querySelector('.bag-bow'), { drawSVG: 0, duration: 1 });
  }
  // цитата: слова загоряються по скролу
  document.querySelectorAll('.words').forEach((p) => {
    const ws = p.textContent.trim().split(/\s+/); p.innerHTML = ws.map((w) => `<span class="w">${w}</span> `).join('');
    const spans = [...p.querySelectorAll('.w')]; if (REDUCED) { spans.forEach((s) => s.classList.add('on')); return; }
    ST.create({ trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: (s) => spans.forEach((sp, i) => sp.classList.toggle('on', i < s.progress * spans.length + 0.5)) });
  });
  // полиця (корінці встають), факти (ярлики падають), контакти (рядки розгортаються) — IO + CSS, по черзі
  [['.spines', '.sp'], ['.facts', '.fact'], ['.crows', '.crow']].forEach(([w, s]) => {
    const box = document.querySelector(w); if (!box || REDUCED) return; const els = [...box.querySelectorAll(s)];
    els.forEach((el, i) => { el.classList.add('anim'); el.style.setProperty('--i', i); });
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { els.forEach((el) => el.classList.add('in')); io.disconnect(); } }), { threshold: 0.15 }); io.observe(box);
  });
  // FAQ — плавне відкриття
  addEventListener('load', () => ST.refresh());
}

/* ---------- конструктор замовлення ---------- */
function initCtor() {
  const f = document.getElementById('ctor-f'); if (!f) return;
  const steps = [...document.querySelectorAll('.ctor-steps li')], s1 = f.querySelector('.cs-1'), s2 = f.querySelector('.cs-2'), done = document.getElementById('ctor-done');
  const msgEl = document.getElementById('msg'), cp = document.getElementById('copy-btn'), stEl = document.getElementById('copy-st');
  const nameIn = f.elements.name, nameFld = nameIn.closest('.fld');
  const valid = (v) => /^[A-Za-zА-ЩЬЮЯЄІЇҐа-щьюяєіїґ’'\- ]{2,14}$/.test(v.trim()) && /[A-Za-zА-ЩЬЮЯЄІЇҐа-щьюяєіїґ]{2}/.test(v);
  const show = (s) => {
    ctorState.s = s; s1.hidden = s !== 1; s2.hidden = s !== 2; done.hidden = s !== 3; f.hidden = s === 3;
    steps.forEach((li, i) => li.classList.toggle('on', i < s));
  };
  const pre = new URLSearchParams(location.search).get('kn');
  if (pre && BOOK_LAYER[pre] != null) { const r = f.querySelector(`input[value="${pre}"]`); if (r) { r.checked = true; ctorState.book = BOOK_LAYER[pre]; } }
  nameIn.addEventListener('input', () => nameFld.classList.remove('bad'));
  f.querySelector('[data-next]').addEventListener('click', () => { if (!valid(nameIn.value)) { nameFld.classList.add('bad'); nameIn.focus(); return; } hero.set(nameIn.value.trim()); show(2); f.querySelector('input[name=book]:checked, input[name=book]').focus(); });
  f.querySelector('[data-back]').addEventListener('click', () => { show(1); nameIn.focus(); });
  f.querySelectorAll('input[name=book]').forEach((r) => r.addEventListener('change', () => { ctorState.book = BOOK_LAYER[r.value]; s2.classList.remove('bad'); }));
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (ctorState.s === 1) { f.querySelector('[data-next]').click(); return; }
    const r = f.querySelector('input[name=book]:checked'); if (!r) { s2.classList.add('bad'); return; }
    const name = nameIn.value.trim(), love = f.elements.love.value.trim(), book = (I.books.find((b) => b[0] === r.value) || [])[1];
    const msg = [I.msg_hi, `${I.msg_name}: ${name}`, `${I.msg_book}: ${book}`].concat(love ? [`${I.msg_love}: ${love}`] : []).join('\n');
    msgEl.textContent = msg; done.querySelector('.c-name-out').textContent = name; show(3); done.focus(); stEl.textContent = ''; cp.textContent = I.c_copy;
  });
  cp.addEventListener('click', async () => {
    const msg = msgEl.textContent; let ok = false;
    try { await navigator.clipboard.writeText(msg); ok = true; } catch { const ta = document.createElement('textarea'); ta.value = msg; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch {} ta.remove(); }
    cp.textContent = ok ? I.c_copied : I.c_copy; stEl.textContent = ok ? I.c_copied : '';
  });
  document.getElementById('ctor-edit').addEventListener('click', () => { show(2); });
  show(1);
}
initLite(); initMotion(); initCtor();
