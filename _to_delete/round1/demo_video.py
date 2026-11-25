#!/usr/bin/env python3
"""Демо-відео 1280x720 30 fps, покадрово: index ?demo=1&pre=1 (фейковий годинник Playwright → детерміновано), потім внутрішні сторінки.
Вихід: sites/mykindy-demo.mp4. Mac Chrome (Metal) при CH=1, інакше вбудований Chromium."""
import subprocess, shutil, time, tempfile, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PORT = 8796
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', str(ROOT / 'public')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
base = f'http://127.0.0.1:{PORT}/'
TMP = Path(tempfile.mkdtemp(prefix='mk_demo_'))
MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
from playwright.sync_api import sync_playwright
FR = [0]; FRAME_MS = 1000 / 30; SPEED = 55.0 / 36.0  # таймлайн demo ~55 с → ~36 с відео
def shot(pg): pg.screenshot(path=str(TMP / f'f{FR[0]:05d}.jpg'), type='jpeg', quality=88); FR[0] += 1
def tick(pg, ms):
    for _ in range(2): pg.clock.run_for(ms / 2)
try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=MAC, headless=True, args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']) if os.environ.get('CH') else pw.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = br.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
        pg = ctx.new_page(); pg.clock.install(time=0)
        pg.add_init_script("(()=>{const o=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>o(()=>cb(performance.now()));})()")
        pg.clock.pause_at(1000); pg.goto(base + 'index.html?demo=1&pre=1')
        t = 0
        while t < 14000:
            tick(pg, FRAME_MS); shot(pg); t += FRAME_MS
            if t > 800 and pg.evaluate("!document.getElementById('pre')"): break
        for _ in range(20): tick(pg, FRAME_MS); shot(pg)
        n = 0
        while not pg.evaluate('window.__demo.done') and n < 2400: tick(pg, FRAME_MS * SPEED); shot(pg); n += 1
        for _ in range(40): tick(pg, FRAME_MS); shot(pg)
        ctx.close()
        ctx = br.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1); pg = ctx.new_page()
        for name, frac in (('knyhy', 0.55), ('zamovyty', 0.0), ('podarunok', 0.5)):
            pg.goto(base + name + '.html'); pg.wait_for_timeout(3000)
            if name == 'zamovyty':
                for _ in range(15): shot(pg); pg.wait_for_timeout(30)
                pg.fill('#ctor-f input[name=name]', 'Марта'); pg.wait_for_timeout(600)
                for _ in range(30): shot(pg); pg.wait_for_timeout(30)
                pg.click('[data-next]'); pg.click('label.opt:nth-child(2)')
                for _ in range(60): shot(pg); pg.wait_for_timeout(30)
                pg.click('.cs-2 button[type=submit]')
                for _ in range(60): shot(pg); pg.wait_for_timeout(30)
                continue
            H = pg.evaluate('document.documentElement.scrollHeight - innerHeight')
            for _ in range(12): pg.wait_for_timeout(20); shot(pg)
            N = 90
            for i in range(1, N + 1):
                e = (i / N); e = e * e * (3 - 2 * e)
                pg.evaluate(f'(window.__lenis&&window.__lenis.scrollTo({int(H*frac*e)},{{immediate:true}}))||scrollTo(0,{int(H*frac*e)})'); pg.wait_for_timeout(25); shot(pg)
            for _ in range(10): pg.wait_for_timeout(20); shot(pg)
        ctx.close(); br.close()
    out = ROOT.parent / 'mykindy-demo.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', str(TMP / 'f%05d.jpg'), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', str(out)], check=True)
    print(out, out.stat().st_size, FR[0] / 30)
finally:
    srv.terminate(); shutil.rmtree(TMP, ignore_errors=True)
