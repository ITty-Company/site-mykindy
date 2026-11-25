// common.js — шапка/меню (паперові ярлики), курсор «Змійок» (кільце + змій на пружині з verlet-ниткою), заголовки «Розкладачка»,
// шторка «Хвіст змія», футер «MyKındy» (змій підхоплює крапку над i), reveal, magnetic, tilt, спільне ім'я героя.
export const Q = new URLSearchParams(location.search);
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE = matchMedia('(pointer: fine)').matches;
export const MOBILE = matchMedia('(max-width: 760px)').matches || (matchMedia('(pointer: coarse)').matches && innerWidth < 1024);
export const STILL = Q.has('p') || Q.has('still');
// режим зйомки (автоматизований браузер: скріншоти/fullPage): reveal-анімації одразу в кінцевому стані, щоб контент не губився в кадрі
export const SHOT = navigator.webdriver === true || Q.has('shot');
export const I = JSON.parse(document.getElementById('i18n')?.textContent || '{}');
export const ss = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch {} }, del(k) { try { sessionStorage.removeItem(k); } catch {} } };
export const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
export const gsapP = () => new Promise((r) => { const ch = () => (window.gsap ? r(window.gsap) : setTimeout(ch, 16)); ch(); });
document.documentElement.classList.add('js');

/* ---------- ім'я героя: спільне для всіх сторінок ---------- */
const NAME_RE = /[^A-Za-zА-ЩЬЮЯЄІЇҐа-щьюяєіїґ’'\- ]/g;
export const hero = {
  get: () => (Q.get('name') || ls.get('mk-name') || '').replace(NAME_RE, '').slice(0, 14),
  set(v) { v = (v || '').replace(NAME_RE, '').slice(0, 14); ls.set('mk-name', v); dispatchEvent(new CustomEvent('mk-name', { detail: v })); return v; },
};
function initNames() {
  const ins = [...document.querySelectorAll('.name-in')];
  ins.forEach((el) => {
    el.value = hero.get();
    el.addEventListener('input', () => { const c = el.selectionStart, v = el.value.replace(NAME_RE, ''); if (v !== el.value) { el.value = v; el.setSelectionRange(c - 1, c - 1); } hero.set(v); ins.forEach((o) => { if (o !== el) o.value = v; }); });
  });
}

/* ---------- «Розкладачка»: літери встають з площини як pop-up ---------- */
function splitNode(node, chars, inEm) {
  [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/([ \t\n\r]+)/).forEach((w) => {
        if (!w) return; if (/^[ \t\n\r]+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
        const ws = document.createElement('span'); ws.className = 'fw';
        [...w].forEach((ch) => { const s = document.createElement('span'); s.className = 'fc'; s.textContent = ch; if (inEm) s.dataset.em = '1'; ws.appendChild(s); chars.push(s); });
        frag.appendChild(ws);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') splitNode(n, chars, inEm || n.tagName === 'EM');
  });
}
export function foldInit(el) {
  if (el._f) return el._f;
  const chars = []; const label = el.textContent.replace(/\s+/g, ' ').trim(); splitNode(el, chars, false);
  el.setAttribute('aria-label', label); el.querySelectorAll('.fw').forEach((w) => w.setAttribute('aria-hidden', 'true'));
  el._f = { chars, state: 'out' };
  const flat = !(REDUCED || STILL || SHOT);
  chars.forEach((c) => { c.style.setProperty('--fx', flat ? '88deg' : '0deg'); c.style.setProperty('--fs', flat ? 0 : 1); });
  if (!flat) el._f.state = 'in';
  el.classList.add('fold-ready');
  return el._f;
}
export async function foldPlay(el, dir = 1) {
  const f = foldInit(el); if (REDUCED || STILL || SHOT) return;
  const want = dir > 0 ? 'in' : 'out'; if (f.state === want) return; f.state = want;
  const gsap = await gsapP(); gsap.killTweensOf(f.chars);
  const main = f.chars.filter((c) => !c.dataset.em), em = f.chars.filter((c) => c.dataset.em);
  if (dir > 0) {
    gsap.to(main, { '--fx': '0deg', '--fs': 1, duration: 0.8, ease: 'back.out(1.6)', stagger: Math.min(0.03, 0.9 / Math.max(1, main.length)) });
    gsap.to(em, { '--fx': '0deg', '--fs': 1, duration: 0.9, ease: 'back.out(1.8)', stagger: 0.035, delay: Math.min(0.6, main.length * 0.02) + 0.15 });
  } else gsap.to(f.chars, { '--fx': '88deg', '--fs': 0, duration: 0.35, ease: 'power2.in', stagger: 0.008 });
}
function initFolds() {
  const all = [...document.querySelectorAll('.fold')]; all.forEach(foldInit);
  const io = new IntersectionObserver((es) => es.forEach((e) => foldPlay(e.target, e.isIntersecting ? 1 : -1)), { threshold: 0.3 });
  all.forEach((h) => { if (!h.closest('.copy')) io.observe(h); });
}

/* ---------- шапка, меню ---------- */
function initHeader() {
  const btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu');
  if (btn) {
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; btn.querySelector('span').textContent = open ? I.close : I.menu;
      document.documentElement.style.overflow = open ? 'hidden' : ''; document.body.classList.toggle('menu-open', open);
      if (open) menu.querySelector('a')?.focus();
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
    menu.addEventListener('click', (e) => { if (e.target === menu) set(false); });
  }
  const hd = document.querySelector('.hd'), idx = document.body.classList.contains('is-index');
  const upd = () => { if (!idx) { hd.classList.toggle('hd-solid', scrollY > 40); const H = document.documentElement.scrollHeight - innerHeight; hd.style.setProperty('--hp', H > 0 ? (scrollY / H).toFixed(4) : 0); } };
  addEventListener('scroll', upd, { passive: true }); upd();
}

/* ---------- курсор «Змійок» ---------- */
export const cursor = { overBook: false };
function initCursor() {
  const el = document.querySelector('.cur'); if (!el || !FINE || REDUCED) return;
  document.documentElement.classList.add('has-cur');
  const ring = el.querySelector('.cur-ring'), dot = el.querySelector('.cur-dot'), kite = el.querySelector('.cur-kite'), path = el.querySelector('.cur-th path');
  let x = -100, y = -100, rx = -100, ry = -100, seen = false, link = false;
  const N = 12, P = Array.from({ length: N }, () => ({ x: -100, y: -100, px: -100, py: -100 })), seg = 7;
  const K = { x: -100, y: -100, vx: 0, vy: 0, a: 0 };
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; if (!seen) { seen = true; rx = x; ry = y; K.x = x - 40; K.y = y - 60; P.forEach((p) => { p.x = p.px = x; p.y = p.py = y; }); el.classList.add('on'); } }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    link = !!e.target.closest('a,button,select,input,textarea,label,summary,[data-tilt]'); el.classList.toggle('link', link);
    // над формою й інтерактивом змій ховається, кільце менше — не закриває картки опцій і поля
    el.classList.toggle('calm', link || !!e.target.closest('form,.ctor,.faq,.opts'));
    el.classList.toggle('form', !!e.target.closest('form,.ctor'));
    el.classList.toggle('dark', !!e.target.closest('.ft,.band,.menu .x,.facts-sec,.card:nth-child(5)'));
  });
  document.addEventListener('pointerleave', () => el.classList.remove('on'));
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    rx += (x - rx) * 0.3; ry += (y - ry) * 0.3;
    dot.style.transform = `translate(${x}px,${y}px)`; ring.style.transform = `translate(${rx}px,${ry}px)`;
    el.classList.toggle('book', cursor.overBook && !link);
    // змій летить на пружині трохи вище-ліворуч від курсора
    const tx = x - 46, ty = y - 74; K.vx += ((tx - K.x) * 26 - K.vx * 5.2) * dt; K.vy += ((ty - K.y) * 26 - K.vy * 5.2) * dt; K.x += K.vx * dt; K.y += K.vy * dt;
    const wind = link ? Math.sin(now / 180) * 0.35 + 0.4 : 0; K.a += ((K.vx * 0.0016 + wind - 0.2) - K.a) * Math.min(1, dt * 8);
    kite.style.transform = `translate(${K.x.toFixed(1)}px,${K.y.toFixed(1)}px) rotate(${(K.a * 57).toFixed(1)}deg)`;
    // verlet-нитка від кільця до змія
    P[0].x = rx; P[0].y = ry;
    for (let i = 1; i < N; i++) { const p = P[i], vx = (p.x - p.px) * 0.94, vy = (p.y - p.py) * 0.94; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 18 * dt; }
    P[N - 1].x = K.x; P[N - 1].y = K.y + 12;
    for (let it = 0; it < 4; it++) for (let i = 0; i < N - 1; i++) { const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, df = (d - seg) / d * 0.5; if (i > 0) { a.x += dx * df; a.y += dy * df; } if (i + 1 < N - 1) { b.x -= dx * df; b.y -= dy * df; } }
    let d = `M${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`; for (let i = 1; i < N; i++) d += ` L${P[i].x.toFixed(1)} ${P[i].y.toFixed(1)}`; path.setAttribute('d', d);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------- шторка «Хвіст змія» ---------- */
function initTail() {
  const tl = document.querySelector('.tail'); if (!tl) return;
  const path = tl.querySelector('.tail-p'), kite = tl.querySelector('.tail-kite'), svg = tl.querySelector('.tail-svg');
  path.setAttribute('pathLength', '1');
  const L = path.getTotalLength();
  const place = (k) => { const pt = path.getPointAtLength(L * Math.min(1, Math.max(0, k))), pt2 = path.getPointAtLength(L * Math.min(1, k + 0.02)); const a = Math.atan2((pt2.y - pt.y) * innerHeight, (pt2.x - pt.x) * innerWidth) * 57.3 + 90; kite.style.transform = `translate(${(pt.x * innerWidth / 100).toFixed(1)}px,${(pt.y * innerHeight / 100).toFixed(1)}px) rotate(${a.toFixed(1)}deg)`; };
  const html = document.documentElement;
  if (html.classList.contains('tail-in')) {
    ss.del('mk-tail');
    if (REDUCED) html.classList.remove('tail-in');
    else gsapP().then((gsap) => {
      const o = { k: 0 }; tl.classList.add('run'); html.classList.remove('tail-in'); path.style.strokeWidth = 150; path.style.strokeDashoffset = 0; kite.style.opacity = 1; place(1.0);
      gsap.to(o, { k: 1, duration: 0.75, ease: 'power2.in', delay: 0.05, onUpdate: () => { svg.style.transform = `translate(${o.k * 40}%,${-o.k * 115}%)`; place(1); kite.style.transform += ` translate(${o.k * innerWidth * 0.2}px,${-o.k * innerHeight * 0.6}px)`; }, onComplete: () => { tl.classList.remove('run'); svg.style.transform = ''; path.style.strokeWidth = 0; path.style.strokeDashoffset = 1; kite.style.opacity = 0; } });
    });
  }
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !/(\.html|\/)$/.test(u.pathname) || (u.pathname === location.pathname && u.hash)) return;
    e.preventDefault();
    if (REDUCED) { location.href = u.href; return; }
    const gsap = await gsapP(), o = { k: 0, w: 0 }; tl.classList.add('run'); kite.style.opacity = 1; svg.style.transform = '';
    gsap.to(o, { k: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: () => { path.style.strokeDashoffset = 1 - o.k; place(o.k); } });
    gsap.to(o, { w: 150, duration: 0.55, delay: 0.32, ease: 'power2.in', onUpdate: () => (path.style.strokeWidth = o.w), onComplete: () => { ss.set('mk-tail', '1'); location.href = u.href; } });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) { tl.classList.remove('run'); path.style.strokeWidth = 0; path.style.strokeDashoffset = 1; kite.style.opacity = 0; } });
}

/* ---------- футер: змій летить і стає крапкою над «ı» ---------- */
function initFooter() {
  const box = document.querySelector('.ft-giant'); if (!box) return;
  const path = box.querySelector('.ft-path'), kite = box.querySelector('.ft-kite'), dot = box.querySelector('.ft-dot'), svg = box.querySelector('.ft-fly');
  const L = path.getTotalLength(); let k = REDUCED ? 1 : 0, kt = k, raf = 0;
  const draw = () => {
    const W = svg.clientWidth, H = svg.clientHeight, e = 1 - Math.pow(1 - Math.min(1, k), 2);
    // кінцева точка — центр крапки над ı (DOM), шлях масштабується до неї
    const br = box.getBoundingClientRect(), dr = dot.getBoundingClientRect(), ex = dr.left + dr.width / 2 - br.left, ey = dr.top + dr.height / 2 - br.top;
    const pt = path.getPointAtLength(L * e), end = path.getPointAtLength(L), sx = W / 1000, sy = H / 400;
    const px = pt.x * sx + (ex - end.x * sx) * e, py = pt.y * sy + (ey - end.y * sy) * e;
    const s = 1 - 0.55 * Math.max(0, (e - 0.8) / 0.2);
    kite.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) translate(-50%,-92%) rotate(${(-18 + 18 * e).toFixed(1)}deg) scale(${s.toFixed(3)})`;
    dot.style.setProperty('--d', Math.max(0, (e - 0.92) / 0.08).toFixed(3)); box.style.setProperty('--pa', (0.6 * (1 - e)).toFixed(3));
  };
  const tick = () => { k += (kt - k) * 0.08; draw(); if (Math.abs(kt - k) > 0.001) raf = requestAnimationFrame(tick); else { k = kt; draw(); raf = 0; } };
  const upd = () => { const r = box.getBoundingClientRect(); kt = REDUCED ? 1 : Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight * 0.35))); if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); draw(); upd();
}

/* ---------- reveal, magnetic, tilt ---------- */
function initReveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); else if (e.boundingClientRect.top > 0) e.target.classList.remove('in'); }), { threshold: 0.2 });
  document.querySelectorAll('[data-reveal]').forEach((el) => (REDUCED || SHOT ? el.classList.add('in') : io.observe(el)));
}
function initMagnetic() {
  if (!FINE || REDUCED) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const run = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18; el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`; raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.1 ? requestAnimationFrame(run) : 0; };
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); tx = (e.clientX - r.left - r.width / 2) * 0.3; ty = (e.clientY - r.top - r.height / 2) * 0.35; if (!raf) raf = requestAnimationFrame(run); });
    el.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(run); });
  });
}
function initTilt() {
  if (!FINE || REDUCED) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5; el.style.transform = `perspective(900px) rotateY(${(nx * 10).toFixed(2)}deg) rotateX(${(-ny * 8).toFixed(2)}deg)`; el.style.transition = 'transform .1s'; });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; el.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)'; });
  });
}
export function initCommon() { initHeader(); initNames(); initCursor(); initTail(); initFooter(); initFolds(); initReveal(); initMagnetic(); initTilt(); }
