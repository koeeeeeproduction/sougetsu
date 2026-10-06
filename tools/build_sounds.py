#!/usr/bin/env python3
"""Sound Lab library builder.
  python3 tools/build_sounds.py [--import DIR]
--import DIR  copies every .wav/.mp3/.ogg/.m4a/.aif from DIR (recursively) into client/sounds/<Category>/, sorted by name
              (sub-folders become categories; loose files are sorted by their name prefix), skipping corrupt and duplicate files.
Always rewrites client/sounds/sounds.json (the panel's index: category, name, file, duration)."""
import hashlib, json, os, re, shutil, struct, subprocess, sys, wave
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LIB = os.path.join(ROOT, 'client', 'sounds')
EXT = ('.wav', '.mp3', '.ogg', '.m4a', '.aif', '.aiff')
RULES = [  # name prefix -> category for loose files
    (r'^jingle', 'Jingles'), (r'^(soft-)?switch|^toggle', 'Switches & Toggles'), (r'^(soft-)?click|^soft-mouse|^glass-tap|^pluck|^pep', 'Clicks & Taps'),
    (r'^soft-hover|^scroll|^hover', 'Hovers & Scrolls'), (r'^(open|close|minimize|maximize|back)', 'Windows & Navigation'),
    (r'^(power|zap|laser|phase)', 'Power-ups & Zaps'), (r'^(tone|confirm|error|question|notification|alert)', 'Tones & Alerts'),
    (r'^(drop|scratch|space|whoosh|swoosh|swipe)', 'Drops & FX'), (r'^(impact|hit|boom)', 'Impacts'), (r'^(riser|rise)', 'Risers')]
def category(name):
    n = name.lower()
    for rx, cat in RULES:
        if re.search(rx, n): return cat
    return 'Misc'
def pretty(fn):
    s = re.sub(r'\s*\(\d+\)$', '', os.path.splitext(fn)[0])
    return ' '.join(w.capitalize() if not w.isdigit() else w for w in re.split(r'[-_ ]+', s) if w)
def duration(path):
    try:
        with wave.open(path) as w: return round(w.getnframes() / float(w.getframerate()), 3)
    except Exception:
        try: return round(float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]).decode().strip()), 3)
        except Exception: return None
def valid(path):
    if path.lower().endswith('.wav'):
        try:
            with wave.open(path) as w: return w.getnframes() > 0
        except Exception: return False
    return duration(path) is not None
def do_import(src):
    seen = {}
    for root, _, fs in os.walk(LIB):
        for f in fs:
            if f.lower().endswith(EXT): seen[hashlib.md5(open(os.path.join(root, f), 'rb').read()).hexdigest()] = 1
    added, bad, dup = 0, [], 0
    for root, _, fs in os.walk(src):
        for f in sorted(fs):
            if not f.lower().endswith(EXT): continue
            p = os.path.join(root, f); h = hashlib.md5(open(p, 'rb').read()).hexdigest()
            if h in seen: dup += 1; continue
            if not valid(p): bad.append(f); continue
            rel = os.path.relpath(root, src); cat = rel if rel != '.' else category(f)
            dst = os.path.join(LIB, cat); os.makedirs(dst, exist_ok=True)
            name = re.sub(r'\s*\(\d+\)(\.\w+)$', r'\1', f)
            shutil.copy2(p, os.path.join(dst, name)); seen[h] = 1; added += 1
    print('imported %d, skipped %d duplicates, %d unreadable%s' % (added, dup, len(bad), (': ' + ', '.join(bad)) if bad else ''))
def index():
    items = []
    for cat in sorted(os.listdir(LIB)):
        d = os.path.join(LIB, cat)
        if not os.path.isdir(d): continue
        for f in sorted(os.listdir(d)):
            if f.lower().endswith(EXT):
                items.append({'id': cat + '/' + f, 'name': pretty(f), 'cat': cat, 'file': 'sounds/' + cat + '/' + f, 'dur': duration(os.path.join(d, f))})
    json.dump({'v': 1, 'count': len(items), 'items': items}, open(os.path.join(LIB, 'sounds.json'), 'w'), indent=0)
    print('index: %d sounds in %d categories' % (len(items), len(set(i['cat'] for i in items))))
if __name__ == '__main__':
    os.makedirs(LIB, exist_ok=True)
    if '--import' in sys.argv: do_import(sys.argv[sys.argv.index('--import') + 1])
    index()
