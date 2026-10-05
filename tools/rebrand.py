#!/usr/bin/env python3
"""Replace leftover "Flex" branding with Sougetsu / Akira everywhere a user can see it.

Only text inside string literals and HTML text nodes is touched, never code identifiers ($._flex, *_FlexGUI,
FlexBeats.*, flex_* CSS/localStorage keys stay as they are). Base64-wrapped client scripts are decoded, edited and
re-encoded. Translations (client/i18n/*.json) get the same rule as the English source so they keep matching.
Re-running is safe (idempotent).

  sample/preview text (templates, text-animation previews) -> "Sougetsu"
  feature names, labels, messages                           -> "Akira"
Kept on purpose (third-party names / real external files): "Flex Downloader" app + its .exe paths, the FlexBrowser
app, the Liquid Glass plug-in id com.captureflex.liquidglass, the FLEX_SETTINGS_PATH env var, the .flexpack extension.
usage: python3 tools/rebrand.py            (from the repo root)
"""
import base64, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SAMPLE_FILES = {'flex_templates2.js', 'flex_text_multi.js', 'text.js', 'flex_saas_text.js', 'flex_saasfx.js', 'autocaption_anim.js',
                'template_studio.js', 'flex_caption_motion.js', 'flex_caption_studio.js', 'motion_showcase.js', 'flex_text_stagger.js',
                'flex_text_2d.js', 'flex_text_props.js'}
KEEP = ['Flex Downloader', 'flex-downloader', 'FlexBrowser', 'com.captureflex.liquidglass', 'FLEX_SETTINGS_PATH', 'captureflex']
EXACT = [  # (old, new) applied inside string content before the word rule
    ('FlexGUIPro/', 'SougetsuAkiraFX/'), ('FlexSettings.json', 'AkiraSettings.json'), ('FlexConsole', 'AkiraConsole'),
    ('FlexAI-AE-Memory.md', 'AkiraAI-AE-Memory.md'), ('FlexFontReport', 'AkiraFontReport'), ('FlexCurve20', 'AkiraCurve20'),
    ('Flex Curve 2.0', 'Akira Curve 2.0'), ('FlexPack', 'AkiraPack'), ('FlexCarousel', 'AkiraCarousel'),
    ('Flex Liquid Glass', 'Liquid Glass'), ('Flex Glass', 'Akira Glass'),
    ('FLEX_MAP_', 'AKIRA_MAP_'), ('FLEX_GLOBE', 'AKIRA_GLOBE'), ('|FLEX_DRAW|', '|AKIRA_DRAW|'),
    ('Flex_', 'Akira_'), ('flex_custom_shake', 'akira_custom_shake'), ('flex_shake', 'akira_shake'),
    ('GUI PRO', 'AKIRA FX'), ('GUI Pro', 'Akira FX'),
    ('flex — zsh', 'akira — zsh'), ('flex build', 'akira build'), ('flex render', 'akira render'),
]
WORD = re.compile(r'(?:(?<=\\[ntr])|(?<![\w$.#\-]))(Flex|FLEX)(?![\w\-])')
PATH_SEG = re.compile(r"""(['"])Documents\1(\s*,\s*)(['"])Flex\3""")


def brand_text(s, sample):
    if 'Flex' not in s and 'FLEX' not in s and 'flex' not in s and 'GUI' not in s:
        return s
    keep = {}
    for i, k in enumerate(KEEP):
        tok = '\x00K%d\x00' % i
        if k in s:
            s = s.replace(k, tok); keep[tok] = k
    for a, b in EXACT:
        s = s.replace(a, b)
    if s == 'GUI':  # preview word lists: ['FLEX', 'GUI', ...]
        s = 'AKIRA'
    s = WORD.sub(lambda m: ('Sougetsu' if sample else 'Akira') if m.group(1) == 'Flex' else ('SOUGETSU' if sample else 'AKIRA'), s)
    for tok, k in keep.items():
        s = s.replace(tok, k)
    return s


STR = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'|`(?:\\.|[^`\\])*`')
TEXT = re.compile(r'>([^<>]+)<')


def brand_code(src, sample, html=False):
    src = PATH_SEG.sub(lambda m: m.group(1) + 'Documents' + m.group(1) + m.group(2) + m.group(3) + 'Sougetsu' + m.group(3), src)
    src = re.sub(r"""\[\s*(['"])Documents\1\s*,\s*(['"])Flex\2\s*\]""", lambda m: "[%sDocuments%s, %sSougetsu%s]" % (m.group(1), m.group(1), m.group(2), m.group(2)), src)
    src = STR.sub(lambda m: m.group(0)[0] + brand_text(m.group(0)[1:-1], sample) + m.group(0)[-1], src)
    if html:
        src = TEXT.sub(lambda m: '>' + brand_text(m.group(1), sample) + '<', src)
    return src


B64 = re.compile(r'atob\("([A-Za-z0-9+/=]+)"\)')


def process_file(path):
    name = os.path.basename(path)
    sample = name in SAMPLE_FILES
    s = open(path, encoding='utf-8').read()
    def unwrap(m):
        inner = base64.b64decode(m.group(1)).decode('utf-8')
        inner = brand_code(inner, sample, html=False)
        return 'atob("%s")' % base64.b64encode(inner.encode('utf-8')).decode('ascii')
    out = B64.sub(unwrap, s)
    if path.endswith(('.js', '.jsx')):
        # outside the payload only the wrapper is left for wrapped files; plain files are branded directly
        if not B64.search(s):
            out = brand_code(out, sample)
    elif path.endswith('.html'):
        parts = re.split(r'(atob\("[A-Za-z0-9+/=]+"\))', out)
        out = ''.join(p if p.startswith('atob("') else brand_code(p, sample, html=True) for p in parts)
    if out != s:
        open(path, 'w', encoding='utf-8').write(out)
        return True
    return False


def sample_strings():
    """English UI strings that live in sample/preview files get "Sougetsu" in every translation too."""
    found = set()
    for root, _, files in os.walk(os.path.join(ROOT, 'client')):
        for f in files:
            if f in SAMPLE_FILES:
                s = open(os.path.join(root, f), encoding='utf-8', errors='replace').read()
                for m in B64.finditer(s):
                    s += base64.b64decode(m.group(1)).decode('utf-8', 'replace')
                found.add(s)
    return '\n'.join(found)


def process_i18n():
    d = os.path.join(ROOT, 'client', 'i18n')
    en_path = os.path.join(d, 'en.json')
    en = json.load(open(en_path, encoding='utf-8'))
    samples = sample_strings()
    flags = [('Flex' in s or 'FLEX' in s) and (s in samples) for s in en['strings']]
    changed = 0
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json'):
            continue
        p = os.path.join(d, f)
        raw = open(p, encoding='utf-8').read()
        data = json.loads(raw)
        if f == 'protected.json':
            data['brands'] = [b for b in (brand_text(x, False) for x in data['brands']) if b]
            data['brands'] = list(dict.fromkeys(data['brands']))
        elif f == 'en.json':
            data['strings'] = [brand_text(s, flags[i]) for i, s in enumerate(data['strings'])]
        elif isinstance(data, dict) and isinstance(data.get('t'), list):
            data['t'] = [brand_text(s, flags[i] if i < len(flags) else False) if isinstance(s, str) else s for i, s in enumerate(data['t'])]
        else:
            continue
        new = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        if new != raw:
            open(p, 'w', encoding='utf-8').write(new); changed += 1
    return changed


if __name__ == '__main__':
    n = 0
    for base in ['client', 'host', 'tests', 'tools']:
        for root, _, files in os.walk(os.path.join(ROOT, base)):
            for f in files:
                if f in ('rebrand.py',) or 'i18n' in root:
                    continue
                if f.endswith(('.js', '.jsx', '.html')) and process_file(os.path.join(root, f)):
                    n += 1
    print('files changed:', n, ' translation files changed:', process_i18n())
