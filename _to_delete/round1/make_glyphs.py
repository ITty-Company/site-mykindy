# python3 _notes/make_glyphs.py — контури гліфів Montserrat Alternates 800 (OFL) → public/assets/js/glyphs.js (ExtrudeGeometry: ім'я, абетка, цифри)
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import json, os
F = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'fonts') + '/'
fonts = [TTFont(F + f) for f in ['montserrat-alternates-800-cyrillic.woff2', 'montserrat-alternates-800-cyrillic-ext.woff2', 'montserrat-alternates-800-latin.woff2', 'montserrat-alternates-800-latin-ext.woff2']]
CH = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789' + "’'-"
out = {'upm': fonts[0]['head'].unitsPerEm, 'g': {}}
for ch in CH:
    for t in fonts:
        cm = t.getBestCmap()
        if ord(ch) in cm: break
    else: continue
    gs = t.getGlyphSet(); g = cm[ord(ch)]
    pen = SVGPathPen(gs, ntos=lambda v: str(round(v))); gs[g].draw(pen)
    out['g'][ch] = [gs[g].width, pen.getCommands()]
p = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'js', 'glyphs.js')
open(p, 'w').write('/* Montserrat Alternates ExtraBold 800 (SIL OFL 1.1) — контури гліфів для об’ємних літер (fontTools із локальних woff2) */\nexport const GLYPHS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out['g']), out['upm'], os.path.getsize(p))
