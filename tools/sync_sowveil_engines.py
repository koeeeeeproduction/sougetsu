#!/usr/bin/env python3
"""Copy the Akira FX engines Sowveil reuses into sowveil/host/akira/, renamed into Sowveil's own
ExtendScript namespaces so both extensions can be installed side by side without touching each other:

    $._akira      -> $._svA      (shared helpers, glass, captions)
    $._akiraSaaS  -> $._svSaaS   (UI animations, gradient wipe, halftone wave)
    $._akiraT2    -> $._svT2     (Templates 2.0)
    $.global (expression library globals in akira_expressions.jsx) -> $._svG

Run after changing any of the source files:  python3 tools/sync_sowveil_engines.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'host')
DST = os.path.join(ROOT, 'sowveil', 'host', 'akira')
FILES = ['akira_tools.jsx', 'akira_json.jsx', 'akira_rigs.jsx', 'akira_saas.jsx', 'akira_templates2.jsx', 'akira_expressions.jsx', 'akira_captions.jsx', 'akira_layers.jsx']
RENAMES = [(r'\$\._akiraSaaS\b', '$._svSaaS'), (r'\$\._akiraT2\b', '$._svT2'), (r'\$\._akira_extension_path\b', '$._sv_extension_path'), (r'\$\._akira\b', '$._svA')]
# user-visible labels (layer names, undo steps, messages). Hidden AKIRA_* tags stay as they are.
LABELS = [('Sougetsu Akira FX', 'Sowveil'), ('Akira FX', 'Sowveil'), ('AkiraCarousel', 'SowveilCarousel'), ('AkiraProjects', 'SowveilProjects'), ('Akira ', 'Sowveil ')]


def main():
    os.makedirs(DST, exist_ok=True)
    for name in FILES:
        s = open(os.path.join(SRC, name), encoding='utf-8').read()
        for pat, rep in RENAMES:
            s = re.sub(pat, rep, s)
        for a, b in LABELS:
            s = s.replace(a, b)
        if name == 'akira_expressions.jsx':   # keep the library's functions out of the global scope Akira FX uses
            s = s.replace('var G = $.global,', 'if (typeof $._svG === "undefined") { $._svG = {}; }\n    var G = $._svG,', 1)
            if '$._svG' not in s:
                raise SystemExit('akira_expressions.jsx: could not namespace G')
        left = re.findall(r'\$\._akira\w*', s)
        if left:
            raise SystemExit('%s still references %s' % (name, sorted(set(left))))
        hdr = '// Synced from host/%s by tools/sync_sowveil_engines.py - edit the original, then re-run the sync.\n' % name
        open(os.path.join(DST, name), 'w', encoding='utf-8').write(hdr + s)
        print('synced', name)
    # Whisper transcription script used by the Captions tab
    py = open(os.path.join(ROOT, 'client', 'js_akira', 'autocaptions.py'), encoding='utf-8').read()
    for a, b in LABELS:
        py = py.replace(a, b)
    os.makedirs(os.path.join(ROOT, 'sowveil', 'py'), exist_ok=True)
    open(os.path.join(ROOT, 'sowveil', 'py', 'autocaptions.py'), 'w', encoding='utf-8').write(py)
    print('synced autocaptions.py')
    # Templates 2.0 panel module + its op recorder (panel side of the Templates tab)
    import base64
    vend = os.path.join(ROOT, 'sowveil', 'js', 'vendor')
    os.makedirs(vend, exist_ok=True)
    for src, dst in (('akira_templates2.js', 'templates2.js'), ('akira_t2_record.js', 't2_record.js')):
        raw = open(os.path.join(ROOT, 'client', 'js_akira', src), encoding='utf-8').read()
        m = re.search(r'atob\("([A-Za-z0-9+/=]+)"\)', raw)
        js = base64.b64decode(m.group(1)).decode('utf-8') if m else raw
        js = js.replace('$._akiraT2', '$._svT2').replace("hostFile: 'host/templates2'", "hostFile: 'host/akira/akira_templates2'")
        js = js.replace('        payload: function () {', '        thumb: drawThumb,\n        payload: function () {')
        for a, b in LABELS + [('Sougetsu', 'Sowveil'), ('SOUGETSU', 'SOWVEIL'), ('sougetsu', 'sowveil')]:
            js = js.replace(a, b)
        if '$._akira' in js:
            raise SystemExit(dst + ' still references $._akira')
        open(os.path.join(vend, dst), 'w', encoding='utf-8').write('/* Synced from client/js_akira/%s by tools/sync_sowveil_engines.py */\n' % src + js)
        print('synced', dst)
    # Text Animation tab = Akira's expression library; 3D Carousel tab = Akira's carousel builder
    for src, dst in (('expressions.js', 'expressions.js'), ('carousel_3d.js', 'carousel3d.js')):
        raw = open(os.path.join(ROOT, 'client', 'js_akira', src), encoding='utf-8').read()
        m = re.search(r'atob\("([A-Za-z0-9+/=]+)"\)', raw)
        js = base64.b64decode(m.group(1)).decode('utf-8') if m else raw
        js = js.replace('$._akira.', '$._svA.')
        js = js.replace('buildCarousel3D is missing from the compiled host \u2014 recompile host/index.jsx to jsxbin.', 'Sowveil host not loaded \u2014 restart After Effects.')
        for a, b in LABELS + [('Sougetsu', 'Sowveil'), ('SOUGETSU', 'SOWVEIL'), ('sougetsu', 'sowveil')]:
            js = js.replace(a, b)
        if re.search(r'\$\._akira', js):
            raise SystemExit(dst + ' still references $._akira')
        open(os.path.join(vend, dst), 'w', encoding='utf-8').write('/* Synced from client/js_akira/%s by tools/sync_sowveil_engines.py */\n' % src + js)
        print('synced', dst)


if __name__ == '__main__':
    main()
