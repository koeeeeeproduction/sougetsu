#!/usr/bin/env python3
"""Unwrap / rewrap the base64-wrapped client scripts:
   (function(){var s=document.createElement("script");s.text=decodeURIComponent(escape(atob("..."))); ...})();
usage: wraptool.py unwrap FILE OUT.js      -> writes the decoded source
       wraptool.py wrap   FILE SRC.js      -> replaces FILE's payload with SRC.js (UTF-8, base64)
       wraptool.py sub    FILE OLD NEW     -> literal replace inside the decoded source (must match exactly once)"""
import base64, re, sys

PAT = re.compile(r'atob\("([A-Za-z0-9+/=]+)"\)')

def load(path):
    s = open(path, encoding='utf-8').read()
    m = PAT.findall(s)
    if len(m) != 1:
        sys.exit('%s: expected exactly one atob() payload, found %d' % (path, len(m)))
    return s, base64.b64decode(m[0]).decode('utf-8')

def save(path, outer, src):
    enc = base64.b64encode(src.encode('utf-8')).decode('ascii')
    open(path, 'w', encoding='utf-8').write(PAT.sub(lambda _: 'atob("%s")' % enc, outer, count=1))

cmd, path = sys.argv[1], sys.argv[2]
outer, src = load(path)
if cmd == 'unwrap':
    open(sys.argv[3], 'w', encoding='utf-8').write(src)
elif cmd == 'wrap':
    save(path, outer, open(sys.argv[3], encoding='utf-8').read())
elif cmd == 'sub':
    old, new = sys.argv[3], sys.argv[4]
    if src.count(old) != 1:
        sys.exit('pattern found %d times' % src.count(old))
    save(path, outer, src.replace(old, new))
else:
    sys.exit(__doc__)
