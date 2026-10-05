// Contract tests for the engines the panel loads separately: shakes, highlighter, motion showcase, SaaS effects.
// Run: node tests/test_engines.js
'use strict';
const A = require('assert'), fs = require('fs'), path = require('path');
const M = require('./mock_ae');
const ORDER = [...fs.readFileSync(path.join(__dirname, '..', 'host', 'akira_loader.jsx'), 'utf8').matchAll(/load\("([^"]+)"/g)].map(m => m[1]);
let passed = 0;
function t(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL', name, e.message.slice(0, 500), (e.stack.split('\n')[1] || '')); process.exitCode = 1; } }
function env(o) { return M.makeEnv(Object.assign({ files: ORDER }, o || {})); }
const SHAKES = 'Shake_001_JF BasicShake_001_JF QuickShake_001_JF WaveV1_Shake_001_JF WaveV2_Shake_001_JF BounceInShake_001_JF BounceOutShake_001_JF SqueezeV1Shake_001_JF SqueezeV2Shake_001_JF WarpShake_001_JF LensShake_001_JF InvertShake_001_JF InvertPixleShake_001_JF DarkFlickerShake_001_JF WhiteFlickerShake_001_JF AddCustomShake_JF'.split(' ');

t('every engine flag the panel checks', () => {
  const e = env();
  A.ok(e.F.saasVersion >= 9); A.ok(e.F.highlighterVersion >= 7); A.ok(e.F.flexMapEngineVersion >= 20); A.ok(e.F.uiTemplateXVersion >= 8);
  A.strictEqual(e.ctx._flexMotionShowcaseHostVersion, '1.0.1'); A.strictEqual(e.ctx._flexReferenceWorkspaceHostVersion, '2.0.0');
  A.strictEqual(typeof e.F.flexProjectOrganizerVersion !== 'undefined', true); A.strictEqual(typeof e.F.flexTypeReAlignVersion !== 'undefined', true);
  SHAKES.forEach(n => A.strictEqual(typeof e.ctx[n], 'function', n));
  ['getMotionShowcaseSelection_FlexGUI', 'buildMotionShowcase_FlexGUI', 'updateMotionShowcase_FlexGUI', 'queueMotionShowcase_FlexGUI'].forEach(n => A.strictEqual(typeof e.ctx[n], 'function', n));
  ['list', 'create', 'apply', 'animate', 'remove', 'toEGP'].forEach(n => A.strictEqual(typeof e.ctx.$._flexHL[n], 'function', n));
  ['stagger', 'depthPrepare', 'depthReveal', 'cursor', 'hover', 'textAnim', 'codeGlyphs', 'promptBar', 'halftoneWave', 'carousel', 'attach', 'background', 'wipe'].forEach(n => A.strictEqual(typeof e.ctx.$._flexSaaS[n], 'function', n));
});

t('every shake preset builds its adjustment layer like the original engine', () => {
  SHAKES.forEach(n => {
    const e = env(), L = e.comp.layers.addText('t'); L.selected = true; L.inPoint = 0.5; L.outPoint = 4; e.comp.time = 1;
    A.strictEqual(e.ctx[n](1, 100, 100, 8, 5, 100, 1, 1, 1), 'true', n);
    const S = e.comp._l.find(l => l.adjustmentLayer);
    A.ok(S, n); A.strictEqual(S.index, L.index - 1, n + ' sits above the layer');
    A.strictEqual(S.inPoint, 0.5, n); A.strictEqual(S.outPoint, 4, n); A.strictEqual(S.label, 8, n); A.strictEqual(S.stretch, 100, n);
    const tile = S.property('ADBE Effect Parade').property('ADBE Tile'); A.ok(tile.property(1).numKeys >= 4, n + ' tile jolt keys');
    A.strictEqual(tile.property(1).keys[0].t, 1, n + ' starts at the playhead');
    A.ok(e.comp._l.some(l => l.name === 'Akira_flash'), n + ' flash'); A.strictEqual(e.undo(), 0, n);
  });
  const e = env(); A.strictEqual(e.ctx.BasicShake_001_JF(1, 100, 100, 1, 5, 100, 1, 1, 0), 'ERROR: Please select at least one layer.');
  const a = e.comp.layers.addText('a'), b = e.comp.layers.addText('b'); a.selected = b.selected = true;
  A.ok(/only works with one selected layer/.test(e.ctx.QuickShake_001_JF(1, 100, 100, 1, 5, 100, 1, 1, 0)));
  A.strictEqual(e.ctx.BasicShake_001_JF(1, 100, 100, 1, 5, 100, 1, 1, 0), 'true'); // basic covers the whole selection with one layer
  A.strictEqual(e.ctx.QuickShake_001_JF(0, 100, 100, 1, 5, 100, 1, 1, 0), 'true');
  A.strictEqual(e.comp._l.filter(l => l.name === 'Akira_quick').length, 2);
  A.ok(/^ERROR:/.test(env({ noComp: true }).ctx.BasicShake_001_JF(1, 100, 100, 1, 5, 100, 1, 1, 0)));
  A.ok(/^ERROR:/.test(env({ locked: true }).ctx.BasicShake_001_JF(1, 100, 100, 1, 5, 100, 1, 1, 0)));
});
t('shake speed becomes layer stretch (200 - speed)', () => {
  const run = (speed) => { const e = env(), L = e.comp.layers.addText('t'); L.selected = true; e.ctx.BasicShake_001_JF(1, speed, 100, 1, 5, 100, 1, 1, 0); return e.comp._l.find(l => l.adjustmentLayer).stretch; };
  A.strictEqual(run(50), 150); A.strictEqual(run(150), 50);
});

t('highlighter: create / list / apply / animate / toEGP / remove', () => {
  const e = env(), HL = e.ctx.$._flexHL, T = e.comp.layers.addText('Hello'), U = e.comp.layers.addText('World');
  A.strictEqual(HL.list(), 'OK:'); A.ok(/^ERR:/.test(HL.create('style=box')));
  T.selected = U.selected = true;
  const r = HL.create('style=underline;colorMode=fill;fill=#ff0000;stroke=#00ff00;dot=#0000ff;strokeW=3;round=8;padX=12;padY=4;multiply=true;cursor=true;dir=smart;perLayer=false');
  A.ok(/^OK:1:hl\d+$/.test(r), r); const id = r.split(':')[2];
  const rows = HL.list().substring(3).split('\n'); A.strictEqual(rows.length, 1); A.strictEqual(rows[0].split('\t')[0], id);
  const L = e.comp._l.find(l => l.comment.indexOf('AKIRA_HL|' + id) === 0), fx = L.property('ADBE Effect Parade');
  A.deepStrictEqual(JSON.parse(JSON.stringify(fx.property('Fill Color').property(1).value)), [1, 0, 0]);
  A.strictEqual(fx.property('Stroke On').property(1).value, 0); A.strictEqual(L.blendingMode, 5);
  A.ok(L.index > T.index && L.index > U.index, 'box sits behind the text');
  const box = L.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group').property(1);
  A.ok(/"Hello"/.test(box.property(1).expression) && /"World"/.test(box.property(1).expression) && /t=b-/.test(box.property(1).expression));
  A.strictEqual(HL.apply('id=' + id + ';fill=#00ff00;padX=30;multiply=false'), 'OK:1'); A.strictEqual(fx.property('Pad X').property(1).value, 30); A.strictEqual(L.blendingMode, 1);
  A.strictEqual(HL.apply('id=nope;fill=#00ff00'), 'ERR:NO_SUCH_RIG');
  e.comp.time = 2; A.strictEqual(HL.animate('id=' + id + ';dur=0.5;from=5'), 'OK:1');
  A.deepStrictEqual(fx.property('Reveal').property(1).keys.map(k => [k.t, k.v]), [[2, 0], [2.5, 100]]); A.strictEqual(fx.property('From').property(1).value, 5);
  A.ok(/^OK:\d+$/.test(HL.toEGP('id=' + id)));
  A.strictEqual(HL.create('style=box;perLayer=true').split(':')[1], '2'); A.strictEqual(HL.list().substring(3).split('\n').length, 3);
  A.strictEqual(HL.remove('id=' + id), 'OK:1'); A.strictEqual(HL.list().substring(3).split('\n').length, 2);
  A.strictEqual(env({ noComp: true }).ctx.$._flexHL.list(), 'ERR:NO_COMP'); A.strictEqual(e.undo(), 0);
});

t('motion showcase: selection / build / update / queue', () => {
  const e = env(), a = e.comp.layers.add(new M.FootageItem({ p: '/x/a.png' })), b = e.comp.layers.add(new M.FootageItem({ p: '/x/b.png' })), c = e.comp.layers.addText('Title');
  a.selected = b.selected = c.selected = true;
  const sel = e.ctx.getMotionShowcaseSelection_FlexGUI(encodeURIComponent('')).split('\n'); A.strictEqual(sel.length, 3); A.ok(/^\d+\|/.test(sel[0]));
  const idx = sel.map(s => s.split('|')[0]).join(',');
  const cfg = ['orbit', '9:16', 15, 58, 70, 10, 55, 4, 36, '#101010', '1', '1', idx].join('|');
  const r = e.ctx.buildMotionShowcase_FlexGUI(encodeURIComponent(cfg)); A.ok(/^SUCCESS:Built a 3-card orbit/.test(r), r);
  const sc = e.items.find(i => i instanceof M.CompItem && /^Motion Showcase/.test(i.name));
  A.deepStrictEqual([sc.width, sc.height], [1080, 1920]); A.ok(/^AKIRA_SHOWCASE\|/.test(sc.comment));
  const cards = sc._l.filter(l => /^AKIRA_SHOWCASE_CARD/.test(l.comment)); A.strictEqual(cards.length, 3); A.ok(/akira-showcase/.test(cards[0].transform.position.expression));
  const upd = ['orbit', '9:16', 20, 80, 60, 20, 40, 0, 36, '#101010', '0', '0', idx].join('|');
  A.strictEqual(e.ctx.updateMotionShowcase_FlexGUI(encodeURIComponent(upd)), 'SUCCESS:Showcase updated.');
  const C = sc._l.find(l => l.name === 'Showcase Control'); A.strictEqual(C.property('ADBE Effect Parade').property('Radius').property(1).value, 80); A.strictEqual(sc.duration, 20);
  A.ok(/^SUCCESS:Added/.test(e.ctx.queueMotionShowcase_FlexGUI(''))); A.strictEqual(e.ctx.queued, sc);
  A.ok(/^ERR:/.test(e.ctx.buildMotionShowcase_FlexGUI(encodeURIComponent('orbit|1:1|15|58|70|10|55|4|36|#000|1|1|' + sel[0].split('|')[0]))));
  A.strictEqual(e.undo(), 0);
});

t('SaaS effects: every generator replies SUCCESS on a sensible selection', () => {
  const e = env(), X = e.ctx.$._flexSaaS;
  const mk = () => { e.comp._l.forEach(l => l.selected = false); const a = e.comp.layers.addShape(), b = e.comp.layers.addShape(); a.name = 'A'; b.name = 'B'; a.transform.position.setValue([300, 200]); b.transform.position.setValue([900, 600]); a.selected = b.selected = true; return [a, b]; };
  const ok = (r, what) => A.ok(/^SUCCESS:/.test(r), what + ': ' + r);
  mk(); ok(X.stagger('order=top;style=rise;delay=0.08;duration=0.6;rise=40;controller=true'), 'stagger live');
  A.ok(e.comp._l.some(l => l.name === 'Akira UI Stagger'));
  mk(); ok(X.stagger('order=left;style=pop;delay=0.1;duration=0.5;rise=40;controller=false'), 'stagger keys');
  mk(); ok(X.stagger('order=random;style=blur;delay=0.1;duration=0.5;rise=40;controller=false'), 'stagger blur');
  mk(); ok(X.cursor('style=arrow;order=stack;travel=0.7;hold=0.5;click=16;size=100;tilt=true;ripple=true;shadow=true;press=true;fill=#ffffff;stroke=#111111'), 'cursor');
  A.ok(e.comp._l.some(l => l.name === 'Akira Cursor') && e.comp._l.some(l => /^Cursor Ripple/.test(l.name)));
  mk(); ok(X.hover('radius=260;lift=14;grow=6;shadow=true'), 'hover');
  mk(); ok(X.wipe('direction=left;duration=0.8;feather=160;delay=0.1'), 'wipe');
  const [lead, f] = mk(); ok(X.attach('rotation=true;scale=true'), 'attach'); A.ok(/akira-attach/.test(f.transform.position.expression) !== /akira-attach/.test(lead.transform.position.expression));
  mk(); ok(X.carousel('hold=1;move=0.6;gap=40;focus=100;side=82;sideOpacity=45;loop=true'), 'carousel');
  mk(); ok(X.background('palette=aurora;speed=0.6;amount=180;grain=true;accent=#00ff55;clip=false;style=drift'), 'background');
  A.strictEqual(e.comp._l[e.comp.numLayers - 1].name, 'Akira Background');
  mk(); ok(X.halftoneWave('color=#00ff55;waves=2;duration=1;interval=0.35;ring=150;softness=50;spacing=22;dot=45;distortion=60;glow=true;clip=inside'), 'halftone');
  e.comp._l.forEach(l => l.selected = false); const T = e.comp.layers.addText('Ship faster'); T.selected = true;
  ['letters', 'words', 'color', 'scramble', 'typing', 'colortype'].forEach(m => ok(X.textAnim('mode=' + m + ';duration=0.8;rise=40;color=#00ff55;cps=14;caret=true'), 'text ' + m));
  A.ok(/akira-typing/.test(T.property('ADBE Text Properties').property('ADBE Text Document').expression));
  ok(X.codeGlyphs('text=' + encodeURIComponent('Akira | ships') + ';glyphs=' + encodeURIComponent('/ < >') + ';code=' + encodeURIComponent('const a=1;') + ';palette=mint;accent=%2300ff55;count=10;density=55;rate=6;duration=8;codeOn=true;bg=true'), 'glyphs');
  ok(X.promptBar('text=' + encodeURIComponent('make a site') + ';placeholder=' + encodeURIComponent('Ask anything...') + ';cps=16;accent=%2300ff55'), 'prompt');
  const prep = X.depthPrepare(''); A.ok(/^OK:.+\t.+\t0$/.test(prep), prep);
  const photo = e.comp.layers.add(new M.FootageItem({ p: '/x/photo.jpg' })); e.comp._l.forEach(l => l.selected = false); photo.selected = true;
  ok(X.depthReveal('source=gradient;look=gradient;io=out;palette=sunset;accent=#00ff55;style=sweep;farFirst=false;soft=25;direction=bottom;duration=1.5;blur=0;push=5;zoom=5;slide=40;parX=10;parY=5;sway=2'), 'depth');
  const gw = e.comp._l.find(l => /^Depth Reveal/.test(l.name)).property('ADBE Effect Parade').property('ADBE Gradient Wipe');
  A.strictEqual(gw.property(3).value, e.comp._l.find(l => l.name === 'Depth Map').index);
  e.comp._l.forEach(l => l.selected = false); A.ok(/^ERR:/.test(X.stagger('style=rise')));
  A.strictEqual(e.undo(), 0);
});

console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL ' + passed + ' ENGINE TESTS PASSED');
