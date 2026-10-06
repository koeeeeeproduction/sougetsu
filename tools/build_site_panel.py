#!/usr/bin/env python3
"""Builds website/panel/ (the clickable demo on sougetsustore.com) from the real panel in client/.
Leaves out: host scripts (.jsx), Python helpers (.py), the pixel companions (only the classic Shadow Ninja pet is public),
and all but 8 sounds. Injects tools/site/panel_preview.js as the first script (stand-in for After Effects).
usage: python3 tools/build_site_panel.py"""
import json, os, re, shutil
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC, OUT = os.path.join(ROOT, 'client'), os.path.join(ROOT, 'website', 'panel')
DEMO_SOUNDS = ['soft-click-02.wav', 'soft-switch-07.wav', 'power-up-12.wav', 'jingle-sax-04.wav', 'laser-01.wav', 'open-02.wav', 'tone-two-01.wav', 'scroll-05.wav']
SKIP_FILES = {'akira_pixel.js'}
shutil.rmtree(OUT, ignore_errors=True)
def ignore(d, names):
    out = [n for n in names if n.endswith(('.py', '.jsx', '.pyc')) or n in SKIP_FILES or n == '__pycache__']
    if os.path.basename(os.path.dirname(d)) == 'sounds':   # inside a sound category folder
        out += [n for n in names if n.lower().endswith(('.wav', '.mp3', '.ogg')) and n not in DEMO_SOUNDS]
    return out
shutil.copytree(SRC, OUT, ignore=ignore)
# sounds index for the demo subset (drop empty categories)
idx = json.load(open(os.path.join(SRC, 'sounds', 'sounds.json')))
items = [i for i in idx['items'] if os.path.basename(i['file']) in DEMO_SOUNDS and os.path.exists(os.path.join(OUT, i['file']))]
json.dump({'v': 1, 'count': len(items), 'items': items}, open(os.path.join(OUT, 'sounds', 'sounds.json'), 'w'), indent=0)
for c in os.listdir(os.path.join(OUT, 'sounds')):
    p = os.path.join(OUT, 'sounds', c)
    if os.path.isdir(p) and not os.listdir(p): os.rmdir(p)
shutil.copy(os.path.join(ROOT, 'tools', 'site', 'panel_preview.js'), os.path.join(OUT, 'preview.js'))
# public demo: Shadow Ninja only - no pixel-companion ids or picker in the shipped companion script
pp = os.path.join(OUT, 'js_akira', 'akira_personality.js'); ps = open(pp, encoding='utf-8').read()
for old, new in (("px: 'itachi'", "px: ''"), ("(S.set.pxLast || 'itachi')", "''"), ('<button data-t="companion">BUDDY</button>', '')):
    if old not in ps: raise SystemExit('personality sanitize: not found ' + old)
    ps = ps.replace(old, new)
open(pp, 'w', encoding='utf-8').write(ps)
if re.search(r'(?i)\b(itachi|luffy|gojo|frieren|nagi)\b', ps): raise SystemExit('character name left in the public companion script')

p = os.path.join(OUT, 'index.html'); s = open(p, encoding='utf-8').read()
s = re.sub(r'\s*<meta name="ai-cracking-protection"[^>]*>', '', s)
s = re.sub(r'\s*<script src="js_akira/akira_pixel\.js[^"]*"></script>', '', s)
s = s.replace('<head>', '<head>\n    <script src="preview.js"></script>\n    <meta name="robots" content="noindex">', 1)
open(p, 'w', encoding='utf-8').write(s)
n = sum(len(f) for _, _, f in os.walk(OUT)); size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
print('website/panel: %d files, %.1f MB, %d demo sounds' % (n, size / 1048576, len(items)))
