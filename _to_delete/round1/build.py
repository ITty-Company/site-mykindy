# python3 _notes/build.py — генерує public/*.html з _notes/content.py (тільки UA). Механіка — як у go-teach, розкладка — своя.
import json, re, os, sys, html
sys.path.insert(0, os.path.dirname(__file__))
from content import T, TG, IG, DM, FOUNDER, SITE, BOOKS
ROOT = os.path.join(os.path.dirname(__file__), '..', 'public')
logo = open(os.path.join(ROOT, 'assets/logo.svg')).read()
LOGO_VB = re.search(r'viewBox="([^"]+)"', logo).group(1)
LOGO_IN = re.search(r'</title>(.*)</svg>', logo, re.S).group(1)
PAGES = [('index', 'index.html', 'nav_home'), ('books', 'knyhy.html', 'nav_books'), ('order', 'zamovyty.html', 'nav_order'), ('gift', 'podarunok.html', 'nav_gift'), ('about', 'pro-nas.html', 'nav_about'), ('c', 'kontakty.html', 'nav_c')]
HREF = {k: f for k, f, _ in PAGES}
def t(k): return T[k]
def esc(s): return html.escape(s, quote=True)
def ext(h, label, cls='btn', extra=''): return f'<a class="{cls}" href="{h}" rel="noopener" target="_blank"{extra}>{label}</a>'
def a(h, label, cls='btn', extra=''): return f'<a class="{cls}" href="{h}"{extra}>{label}</a>'
def fold(tag, cls, text, extra=''):  # заголовок «Розкладачка»: common.js розбиває на літери
    return f'<{tag} class="{cls} fold"{extra}>{text}</{tag}>'
KITE = '<svg class="kite-ico" viewBox="-40 -56 80 124" aria-hidden="true"><path d="M0 -50 L-34 -8 L0 0 Z" fill="#F6B324"/><path d="M0 -50 L34 -8 L0 0 Z" fill="#FFCB55"/><path d="M-34 -8 L0 62 L0 0 Z" fill="#E8762A"/><path d="M34 -8 L0 62 L0 0 Z" fill="#F39A2C"/><path d="M0 -50 L-34 -8 L0 62 L34 -8 Z M0 -50 L0 62 M-34 -8 L34 -8" stroke="#221B3A" stroke-width="3" stroke-linejoin="round" fill="none"/></svg>'

def head(pid, tkey, dkey, lenis=False):
    path = HREF.get(pid, '404.html')
    canon = SITE + '/' + ('' if path == 'index.html' else path.replace('.html', ''))
    i18n = {k: t(k) for k in ['menu', 'close', 'page', 'c_name_err', 'c_book_err', 'msg_hi', 'msg_name', 'msg_book', 'msg_love', 'c_copy', 'c_copied', 'g_letter_def']}
    i18n['tg'] = TG; i18n['dm'] = DM; i18n['books'] = [[b[0], b[1]] for b in BOOKS]
    base = '<base href="/">' if pid == '404' else ''
    imp = '/' if pid == '404' else './'
    libs = ['gsap.min.js', 'ScrollTrigger.min.js', 'DrawSVGPlugin.min.js', 'ScrambleTextPlugin.min.js']
    scripts = ''.join(f'<script src="assets/vendor/gsap/{f}" defer></script>' for f in libs)
    if lenis: scripts = '<script src="assets/vendor/lenis.min.js" defer></script>' + scripts
    return f'''<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">{base}
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(t(tkey))}</title>
<meta name="description" content="{esc(t(dkey))}">
<meta name="theme-color" content="#FFFAF0">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="website"><meta property="og:site_name" content="MyKindy"><meta property="og:title" content="{esc(t(tkey))}"><meta property="og:description" content="{esc(t(dkey))}">
<meta property="og:image" content="{SITE}/assets/img/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="uk_UA"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="assets/fonts/montserrat-alternates-800-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/mulish-300-800-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/fonts/fonts.css">
<link rel="stylesheet" href="assets/css/site.css">
<script>try{{if(sessionStorage.getItem('mk-tail'))document.documentElement.classList.add('tail-in')}}catch(e){{}}</script>
<script type="importmap">{{"imports":{{"three":"{imp}assets/vendor/three.module.min.js","three/addons/":"{imp}assets/vendor/three-addons/"}}}}</script>
{scripts}
<script type="application/json" id="i18n">{json.dumps(i18n, ensure_ascii=False)}</script>
</head>'''

def header(pid):
    nav = ''.join(f'<a class="tag" href="{f}"{" aria-current=page" if p == pid else ""}><span>{t(k)}</span></a>' for p, f, k in PAGES[1:])
    mlinks = ''.join(f'<li><a href="{f}"{" aria-current=page" if p == pid else ""}><span class="mn">{i+1:02d}</span><span class="ml">{t(k)}</span></a></li>' for i, (p, f, k) in enumerate(PAGES))
    counter = f'<p class="pg" aria-hidden="true"><span class="pg-k">{t("page")}</span> <b id="pg-n">01</b><span class="pg-of"> / 07</span></p>' if pid == 'index' else ''
    return f'''<a class="skip" href="#main">{t('skip')}</a>
<header class="hd{' hd-index' if pid == 'index' else ''}">
  <a class="logo" href="index.html" aria-label="{t('site')} — {t('nav_home')}"><svg class="logo-svg" viewBox="{LOGO_VB}" aria-hidden="true">{LOGO_IN}</svg></a>
  <nav class="hd-nav" aria-label="{t('menu')}">{nav}</nav>
  {counter}
  <div class="hd-r">
    {ext(TG, t('tg_btn'), 'btn btn-s hd-tg', ' data-magnetic')}
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span>{t('menu')}</span><i></i></button>
  </div>
  <svg class="hd-thread" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1000" d="M0 4 C 120 1, 240 7, 360 4 S 600 1, 720 4 S 900 7, 1000 4"/></svg>
</header>
<div class="menu" id="menu" hidden>
  <div class="menu-sheet">
    <ol class="menu-list">{mlinks}</ol>
    <div class="menu-foot">{KITE}<p>{t('ft_t')}</p><p>{ext(TG, 'Telegram', 'mlk')} · {ext(IG, 'Instagram', 'mlk')}</p></div>
  </div>
</div>'''

def footer(pid):
    links = ''.join(f'<li><a href="{f}">{t(k)}</a></li>' for p, f, k in PAGES)
    outs = ''.join(f'<li><a href="{h}" rel="noopener" target="_blank">{n}</a></li>' for n, h in [('Telegram', TG), ('Instagram', IG), ('Instagram Direct', DM), ('Засновниця @yak_ilona', FOUNDER)])
    return f'''<footer class="ft">
  <div class="wrap ft-grid">
    <div class="ft-a"><p class="ft-t">{t('ft_t')}</p><div class="actions">{a(HREF['order'], t('cta_build'), 'btn btn-kite', ' data-magnetic')}{ext(TG, t('cta_tg'), 'btn btn-ghost-l')}</div></div>
    <div><h2 class="ft-h">{t('ft_pages')}</h2><ul class="ft-list">{links}</ul></div>
    <div><h2 class="ft-h">{t('ft_links')}</h2><ul class="ft-list">{outs}</ul></div>
  </div>
  <div class="ft-giant" aria-hidden="true">
    <p class="ft-word">MyK<span class="ft-i">ı<i class="ft-dot"></i></span>ndy</p>
    <svg class="ft-fly" viewBox="0 0 1000 400" preserveAspectRatio="none"><path class="ft-path" d="M-40 360 C 160 260, 260 60, 470 120 S 640 300, 545 70"/></svg>
    <div class="ft-kite">{KITE}</div>
  </div>
  <div class="wrap ft-bot"><p class="ft-c">{t('ft_c')}</p><a class="ft-up" href="#main">{t('ft_up')} ↑</a></div>
</footer>'''

CURTAIN = f'''<div class="tail" aria-hidden="true"><svg class="tail-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="tailg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#F6B324"/><stop offset="1" stop-color="#E8762A"/></linearGradient></defs><path class="tail-p" d="M-20 128 C 8 96, 22 104, 40 72 S 62 34, 78 30 S 104 6, 124 -24"/></svg><div class="tail-kite">{KITE}</div></div>'''
CUR = f'<div class="cur" aria-hidden="true"><svg class="cur-th"><path/></svg><i class="cur-ring"></i><i class="cur-dot"></i><div class="cur-kite">{KITE}</div></div>'

def write(pid, tkey, dkey, body, cls, script, lenis=False):
    h = head(pid, tkey, dkey, lenis) + f'\n<body class="{cls}" data-page="{pid}">\n' + header(pid) + '\n' + body + '\n' + footer(pid) + '\n' + CURTAIN + CUR + f'\n<script type="module" src="assets/js/{script}"></script>\n</body>\n</html>\n'
    open(os.path.join(ROOT, HREF.get(pid, '404.html')), 'w').write(h)

def name_field(idn='hero-name'):
    return f'''<label class="namef" for="{idn}"><span class="namef-l">{t('name_lbl')}</span><input id="{idn}" class="name-in" type="text" maxlength="14" autocomplete="off" spellcheck="false" placeholder="{t('name_ph')}"><span class="namef-h">{t('name_hint')}</span></label>'''

def index():
    co = ''.join(f'<div class="co" data-co="{i}"><div class="co-box"><b>{n}</b><span>{s}</span></div></div>' for i, (n, s) in enumerate(t('co')))
    co_m = ''.join(f'<li><b>{n}</b> <span>— {s}</span></li>' for n, s in t('co'))
    steps = ''.join(f'<li class="pst" data-st="{i}"><span class="pst-n">{i+1:02d}</span><span class="pst-t"><b>{n}</b><span>{s}</span></span></li>' for i, (n, s) in enumerate(t('p_steps')))
    tour = [('t1', 'pnl-t1', 0.364, 0.41, 'personalna'), ('t2', 'pnl-t2', 0.416, 0.462, 'kazka'), ('t3', 'pnl-t3', 0.468, 0.514, 'abetka'), ('t4', 'pnl-t4', 0.52, 0.566, 'cyfry'), ('t5', 'pnl-t5', 0.572, 0.616, 'pakuvannia')]
    tours = ''.join(f'''<section class="pnl {c}" data-a="{a_}" data-b="{b_}" id="{i_}"><p class="kicker">{t(k + '_k')}</p>{fold('h2', 'h2', t(k + '_h'))}<p class="lead">{t(k + '_p')}</p>{name_field('t3-name') if k == 't3' else ''}</section>''' for k, c, a_, b_, i_ in tour)
    body = f'''<div class="pre" id="pre" role="status" aria-live="polite"><div class="pre-sheet"><div class="pre-in">
  <p class="pre-k">{t('pre_k')}</p><p class="pre-num"><b id="pre-n">000</b></p>
  <div class="pre-track" aria-hidden="true"><svg class="pre-line" viewBox="0 0 400 40" preserveAspectRatio="none"><path id="pre-path" d="M4 34 C 80 30, 120 6, 200 18 S 330 30, 396 8"/></svg><div class="pre-kite" id="pre-kite">{KITE}</div></div>
</div></div></div>
<canvas class="stage" id="stage" aria-hidden="true"></canvas>
<img class="poster" data-src="assets/img/poster.webp" alt="" hidden>
<p class="nogl" hidden>{t('nogl')}</p>
<main id="main">
<div class="copy" id="copy">
  <section class="pnl pnl-hero" data-a="-1" data-b="0.072" id="heroi">
    <p class="kicker">{t('h_k')}</p>
    {fold('h1', 'display', t('h1'))}
    <p class="lead">{t('h_p')}</p>
    {name_field()}
    <div class="actions">{a(HREF['order'], t('cta_build'), 'btn', ' data-magnetic')}{ext(TG, t('cta_tg'), 'btn btn-ghost')}</div>
  </section>
  <p class="cue pnl" data-a="-1" data-b="0.03"><span>{t('scroll')}</span><i></i></p>
  <section class="pnl pnl-s1" data-a="0.092" data-b="0.196" id="vidkryite"><p class="kicker">{t('s1_k')}</p>{fold('h2', 'h2', t('s1_h'))}<p class="lead">{t('s1_p')}</p></section>
  <section class="pnl pnl-s2" data-a="0.206" data-b="0.352" id="shary"><p class="kicker">{t('s2_k')}</p>{fold('h2', 'h2 h2-xl', t('s2_h'))}<p class="lead">{t('s2_p')}</p><ul class="co-m">{co_m}</ul></section>
  {tours}
  <section class="pnl pnl-p" data-a="0.626" data-b="0.776" id="yak"><p class="kicker">{t('p_k')}</p><ol class="psteps">{steps}</ol><svg class="pthread" viewBox="0 0 10 300" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M5 0 C 9 60, 1 120, 5 180 S 9 260, 5 300"/></svg></section>
  <section class="pnl pnl-n" data-a="0.79" data-b="0.896" id="nich">{fold('p', 'nq', t('n_q'))}<p class="nsrc">{t('n_src')}</p></section>
  <section class="pnl pnl-f" data-a="0.912" data-b="2" id="zamovyty">{fold('h2', 'h2 h2-f', t('f_h'))}<p class="lead">{t('f_p')}</p><div class="actions">{a(HREF['order'], t('cta_build'), 'btn btn-kite', ' data-magnetic')}{ext(TG, t('cta_tg'), 'btn btn-ghost-l')}</div></section>
</div>
<div class="cos" id="cos" aria-hidden="true">{co}</div>
<div class="spacer" id="spacer" style="height:1250vh"></div>
</main>'''
    write('index', 'ti_index', 'de_index', body, 'is-index is-locked', 'app.js')

def ihero(kind, k, h1, p, actions='', extra='', tall=True):
    return f'''<section class="ihero ihero-{kind}{' ihero-tall' if tall else ''}">
  <div class="ihero-stick"><canvas class="stage stage-lite" aria-hidden="true"></canvas><img class="poster" data-src="assets/img/poster.webp" alt="" hidden>
  <div class="wrap ihero-copy"><p class="kicker">{t(k)}</p>{fold('h1', 'display display-i', t(h1))}<p class="lead">{t(p)}</p>{('<div class="actions">' + actions + '</div>') if actions else ''}</div>{extra}</div>
</section>'''

POP = {
    'personalna': '<i class="pl pl-bg" style="--c:#CFE6F5"></i><i class="pl pl-a pf-body"></i><i class="pl pl-b pf-head"></i><i class="pl pl-c pf-ban"><b>ім’я</b></i>',
    'kazka': '<i class="pl pl-bg" style="--c:#2E2650"></i><i class="pl pl-a pk-hill"></i><i class="pl pl-b pk-castle"></i><i class="pl pl-c pk-moon"></i>',
    'abetka': '<i class="pl pl-bg" style="--c:#F3E6D3"></i><i class="pl pl-a pa-cube" style="--x:12%;--c:#F6B324"><b>А</b></i><i class="pl pl-b pa-cube" style="--x:40%;--c:#CFE6F5"><b>Б</b></i><i class="pl pl-c pa-cube" style="--x:68%;--c:#E8762A"><b class="l">В</b></i>',
    'cyfry': '<i class="pl pl-bg" style="--c:#FFF4E2"></i><i class="pl pl-a pc-d"><b>1</b><b>2</b><b>3</b></i><i class="pl pl-b pc-b"><u style="--c:#F6B324"></u><u style="--c:#221B3A"></u><u style="--c:#D2452C"></u></i>',
}

def books():
    cards = ''.join(f'''<article class="bk" id="{bid}" data-tilt><div class="bk-pop" aria-hidden="true"><div class="bk-page">{POP[bid]}</div></div>
  <div class="bk-t"><p class="bk-n">{i+1:02d} / 04</p><h3 class="h3">{name}</h3><p>{short}</p><p class="bk-d">{det}</p><p class="bk-ex"><span>У постах:</span> {ex}</p>{a(HREF['order'] + '?kn=' + bid, t('b_more') + ' →', 'link')}</div></article>''' for i, (bid, name, short, det, ex) in enumerate(BOOKS))
    shelf = ''.join(f'<li class="sp" data-tilt style="--h:{h}%;--c:{c}"><span>{n}</span></li>' for n, h, c in zip(t('shelf'), [92, 78, 100, 86], ['#E8762A', '#2E2650', '#F6B324', '#CFE6F5']))
    body = '<main id="main">' + ihero('books', 'b_k', 'b_h1', 'b_p', a('#vitryna', t('b_gal_k') + ' ↓', 'btn') + a(HREF['order'], t('cta_build'), 'link')) + f'''
<section class="sec gal" id="vitryna" data-horizontal><div class="gal-head wrap"><p class="kicker">{t('b_gal_k')}</p>{fold('h2', 'h2', t('b_gal_h'))}</div><div class="track">{cards}</div></section>
<section class="sec marq" aria-hidden="true"><p class="marq-row" data-marquee="22">{t('b_marq') * 3}</p><p class="marq-row marq-rev" data-marquee="26">{t('b_marq') * 3}</p></section>
<section class="sec shelf"><div class="wrap shelf-grid"><div><p class="kicker">{t('b_shelf_k')}</p>{fold('h2', 'h2', t('b_shelf_h'))}<p class="lead">{t('b_shelf_p')}</p>{ext(IG, 'Instagram @mykindy_story', 'link')}</div><ul class="spines">{shelf}</ul></div></section>
<section class="sec band"><div class="wrap band-in" data-reveal="up">{fold('h2', 'h2', t('b_cta_h'))}<p class="lead">{t('b_cta_p')}</p><div class="actions">{ext(TG, t('cta_tg'), 'btn btn-kite', ' data-magnetic')}{a(HREF['order'], t('cta_build'), 'btn btn-ghost-l')}</div></div></section>
</main>'''
    write('books', 'ti_books', 'de_books', body, 'is-inner p-books', 'page.js', True)

def order():
    opts = ''.join(f'<label class="opt" data-tilt><input type="radio" name="book" value="{bid}"><span class="opt-in"><b>{name}</b><span>{short}</span></span></label>' for bid, name, short, det, ex in BOOKS)
    steps = ''.join(f'<li class="card"><span class="card-n">{i+1:02d}</span><h3 class="h3">{n}</h3><p>{s}</p></li>' for i, (n, s) in enumerate(t('p_steps')))
    faq = ''.join(f'<details class="faq"><summary>{q}<i aria-hidden="true"></i></summary><p>{ans}</p></details>' for q, ans in t('faq'))
    ctor = f'''<div class="ctor" id="ctor">
  <ol class="ctor-steps" aria-hidden="true"><li class="on">{t('c_s1')}</li><li>{t('c_s2')}</li><li>{t('c_s3')}</li></ol>
  <form class="ctor-f" id="ctor-f" novalidate>
    <fieldset class="cs cs-1" data-s="1"><legend class="h3">{t('c_name_h')}</legend>
      <label class="fld"><span class="fl">{t('c_name_l')}</span><input name="name" class="name-in" maxlength="14" autocomplete="off" required><em class="err">{t('c_name_err')}</em></label>
      <label class="fld"><span class="fl">{t('c_love_l')}</span><textarea name="love" rows="2" maxlength="300" placeholder="{t('c_love_ph')}"></textarea></label>
      <div class="actions"><button class="btn" type="button" data-next>{t('c_next')} →</button></div></fieldset>
    <fieldset class="cs cs-2" data-s="2" hidden><legend class="h3">{t('c_book_h')}</legend><div class="opts">{opts}</div><em class="err err-book">{t('c_book_err')}</em>
      <div class="actions"><button class="btn" type="submit">{t('c_done')}</button><button class="link" type="button" data-back>← {t('c_back')}</button></div></fieldset>
  </form>
  <div class="cs cs-3" id="ctor-done" hidden tabindex="-1"><h3 class="h3">{t('c_ok_h')}</h3><p>{t('c_ok_p')}</p><pre class="msg" id="msg"></pre>
    <div class="actions"><button class="btn" type="button" id="copy-btn">{t('c_copy')}</button>{ext(TG, t('c_open_tg'), 'btn btn-ghost')}{ext(DM, t('c_open_ig'), 'link')}</div>
    <p class="small" id="copy-st" role="status" aria-live="polite"></p><button class="link" type="button" id="ctor-edit">← {t('c_edit')}</button></div>
  <p class="small mut">{t('c_safe')}</p>
</div>'''
    body = '<main id="main">' + f'''<section class="ihero ihero-order" id="konstruktor"><div class="ihero-stick"><canvas class="stage stage-lite" aria-hidden="true"></canvas><img class="poster" data-src="assets/img/poster.webp" alt="" hidden>
  <div class="wrap order-grid"><div class="ihero-copy"><p class="kicker">{t('o_k')}</p>{fold('h1', 'display display-i', t('o_h1'))}<p class="lead">{t('o_p')}</p></div>{ctor}</div></div></section>
<section class="sec ost"><div class="wrap"><p class="kicker">{t('o_steps_k')}</p>{fold('h2', 'h2', t('o_steps_h'))}<ol class="stack" data-stack>{steps}</ol></div></section>
<section class="sec faqs"><div class="wrap faq-grid"><div><p class="kicker">{t('o_faq_k')}</p>{fold('h2', 'h2', t('o_faq_h'))}</div><div class="faq-l" data-reveal="up" data-stagger>{faq}</div></div></section>
</main>'''
    write('order', 'ti_order', 'de_order', body, 'is-inner p-order', 'page.js', True)

def gift():
    body = '<main id="main">' + ihero('gift', 'g_k', 'g_h1', 'g_p', a(HREF['order'], t('cta_build'), 'btn', ' data-magnetic') + ext(TG, t('cta_tg'), 'link')) + f'''
<section class="sec env-sec" id="konvert"><div class="env-stick"><div class="wrap env-grid">
  <div class="env-copy"><p class="kicker">{t('g_env_k')}</p>{fold('h2', 'h2', t('g_env_h'))}<p class="lead">{t('g_env_p')}</p></div>
  <div class="env" aria-hidden="true"><div class="env-back"></div><div class="env-letter"><p class="env-l1">{t('g_letter')}</p><p class="env-name" id="env-name">{t('g_letter_def')}</p>{KITE}</div><div class="env-front"></div><div class="env-flap"></div><div class="env-seal"><span>M</span><i class="seal-a"></i><i class="seal-b"></i></div></div>
</div></div></section>
<section class="sec bag-sec"><div class="wrap bag-grid">
  <svg class="bag-svg" viewBox="0 0 300 340" aria-hidden="true"><path class="bag-h" d="M110 80 C 110 30, 190 30, 190 80"/><rect class="bag-b" x="50" y="80" width="200" height="240" rx="6"/><path class="bag-r" d="M150 80 L150 320"/><path class="bag-r" d="M50 170 L250 170"/><path class="bag-bow" d="M150 170 C 110 120, 80 150, 108 176 C 120 186, 140 178, 150 170 C 160 178, 180 186, 192 176 C 220 150, 190 120, 150 170 M150 170 L128 220 M150 170 L174 222"/><g transform="translate(150 255) scale(0.5)"><path d="M0 -50 L-34 -8 L0 0 Z" fill="#F6B324"/><path d="M0 -50 L34 -8 L0 0 Z" fill="#FFCB55"/><path d="M-34 -8 L0 62 L0 0 Z" fill="#E8762A"/><path d="M34 -8 L0 62 L0 0 Z" fill="#F39A2C"/></g></svg>
  <div><p class="kicker">{t('g_bag_k')}</p>{fold('h2', 'h2', t('g_bag_h'))}<p class="lead">{t('g_bag_p')}</p>{ext(IG, t('g_bag_link') + ' →', 'link')}</div>
</div></section>
<section class="sec gq"><div class="wrap"><blockquote class="gq-q"><p class="words">{t('g_q')}</p><footer>{t('g_q_src')}</footer></blockquote></div></section>
<section class="sec band band-night"><div class="wrap band-in" data-reveal="up">{fold('h2', 'h2', t('g_cta_h'))}<div class="actions">{a(HREF['order'], t('cta_build'), 'btn btn-kite', ' data-magnetic')}{ext(TG, t('cta_tg'), 'btn btn-ghost-l')}</div></div></section>
</main>'''
    write('gift', 'ti_gift', 'de_gift', body, 'is-inner p-gift', 'page.js', True)

def about():
    facts = ''.join(f'<li class="fact" style="--r:{r}deg">{f}</li>' for f, r in zip(t('facts'), [-2, 1.5, -1, 2, -1.5, 1, -2.5]))
    body = '<main id="main">' + ihero('about', 'a_k', 'a_h1', 'a_p', ext(IG, '@mykindy_story', 'btn') + a(HREF['books'], t('nav_books'), 'link')) + f'''
<section class="sec who" data-bg="#FFFAF0"><div class="wrap who-grid">
  <div><p class="kicker">{t('a_who_k')}</p>{fold('h2', 'h2', t('a_who_h'))}</div>
  <div class="who-t" data-reveal="up" data-stagger><p class="lead">{t('a_who_p1')}</p><p>{t('a_who_p2')}</p></div>
  <i class="cut cut-a" data-speed="0.35" aria-hidden="true"></i><i class="cut cut-b" data-speed="-0.25" aria-hidden="true"></i><i class="cut cut-c" data-speed="0.5" aria-hidden="true"></i>
</div></section>
<section class="sec founder" data-bg="#CFE6F5"><div class="wrap founder-grid">
  <div class="polaroid" data-tilt aria-hidden="true"><div class="pol-img">{KITE}<span class="pol-at">@yak_ilona</span></div><p class="pol-cap">Founder · MyKindy</p></div>
  <div><p class="kicker">{t('a_f_k')}</p>{fold('h2', 'h2', t('a_f_h'))}<p class="lead">{t('a_f_p')}</p>{ext(FOUNDER, t('a_f_b') + ' →', 'btn btn-ghost')}</div>
</div></section>
<section class="sec quality" data-bg="#F3E6D3"><div class="wrap q-grid"><div><p class="kicker">{t('a_q_k')}</p>{fold('h2', 'h2', t('a_q_h'))}</div><div data-reveal="up"><p class="lead">{t('a_q_p')}</p>{ext(IG, t('a_q_b') + ' →', 'link')}</div></div></section>
<section class="sec facts-sec" data-bg="#2E2650" data-fg="#FFFAF0"><div class="wrap"><p class="kicker">{t('a_facts_k')}</p>{fold('h2', 'h2', t('a_facts_h'))}<ul class="facts">{facts}</ul></div></section>
</main>'''
    write('about', 'ti_about', 'de_about', body, 'is-inner p-about', 'page.js', True)

def contacts():
    rows = ''.join(f'<li><a class="crow" href="{h}" rel="noopener" target="_blank"><span class="crow-n">{n}</span><span class="crow-s">{s}</span><span class="crow-b">{b}<i aria-hidden="true">→</i></span></a></li>' for n, s, h, b in t('k_rows'))
    note = ''.join(f'<li><span>{i+1}</span>{x}</li>' for i, x in enumerate(t('k_note')))
    body = '<main id="main">' + ihero('c', 'k_k', 'k_h1', 'k_p', ext(TG, t('cta_tg'), 'btn', ' data-magnetic') + ext(IG, 'Instagram', 'link')) + f'''
<section class="sec clist"><div class="wrap"><ul class="crows">{rows}</ul></div></section>
<section class="sec note-sec"><div class="wrap note-grid"><div><p class="kicker">{t('k_note_k')}</p>{fold('h2', 'h2', t('k_note_h'))}<p class="lead">{t('k_note_p')}</p>{a(HREF['order'], t('k_build') + ' →', 'link')}</div><ol class="note" data-reveal="up" data-stagger>{note}</ol></div></section>
</main>'''
    write('c', 'ti_c', 'de_c', body, 'is-inner p-c', 'page.js', True)

def notfound():
    body = f'''<main id="main" class="nf"><div class="nf-stage"><canvas class="stage stage-lite" aria-hidden="true"></canvas></div>
<div class="wrap nf-in"><p class="kicker">404</p>{fold('h1', 'display', t('nf_h'))}<p class="lead">{t('nf_p')}</p><div class="actions">{a('index.html', t('nav_home'))}{a(HREF['books'], t('nav_books'), 'link')}</div></div></main>'''
    write('404', 'ti_404', 'de_index', body, 'is-inner p-404', 'page.js')

index(); books(); order(); gift(); about(); contacts(); notfound()
print('built')
