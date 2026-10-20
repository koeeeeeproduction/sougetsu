// Sowveil host engine tests (mock After Effects): text animation, backgrounds, carousel, selection info, Remove.
'use strict';
const A = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('./mock_ae');
const HOST = path.join(__dirname, '..', 'sowveil', 'host');
const PARTS = ['akira/akira_tools.jsx', 'akira/akira_rigs.jsx', 'akira/akira_saas.jsx', 'akira/akira_templates2.jsx',
    'sv_core.jsx', 'sv_text.jsx', 'sv_expressions.jsx', 'sv_gradients.jsx', 'sv_carousel.jsx', 'sv_media.jsx', 'sv_captions.jsx', 'sv_library.jsx'];
let passed = 0;
function t(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL', name, '\n ', e.message.slice(0, 500), (e.stack || '').split('\n')[1] || ''); process.exitCode = 1; } }

function env(opts) {
    const e = M.makeEnv(Object.assign({ files: [], locked: true }, opts || {}));
    if (opts && opts.withAkira) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'host', 'akira_core.jsx'), 'utf8'), e.ctx, { filename: 'akira_core.jsx' }); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'host', 'akira_tools.jsx'), 'utf8'), e.ctx, { filename: 'akira_tools.jsx' }); }
    e.ctx.$._svA = e.ctx.$._svA || {}; e.ctx.$._svA.isLocked = false;   // what sowveil.jsx does before loading parts
    PARTS.forEach(f => vm.runInContext(fs.readFileSync(path.join(HOST, f), 'utf8'), e.ctx, { filename: f }));
    e.SV = e.ctx.$._sv;
    e.call = (fn, args) => JSON.parse(e.SV[fn](args || {}));
    return e;
}
function text(e, name) { const L = e.comp.layers.addText(name || 'Hello World'); L.selected = true; return L; }
function animators(L) { return L.property('ADBE Text Properties').property('ADBE Text Animators'); }
function compiles(expr) { new Function(expr); return true; }   // AE expressions are JS: must at least parse

// ---------------- text animation ----------------
t('text: Fade Up adds a named animator with a sweeping range selector', () => {
    const e = env(); const L = text(e); e.comp.time = 2;
    const r = e.call('textAnimate', { preset: 'fade-up', label: 'Fade Up', duration: 1, stagger: 40, distance: 40 });
    A.ok(r.ok, r.error);
    const an = animators(L); A.strictEqual(an.numProperties, 1);
    A.strictEqual(an.property(1).name, 'Sowveil · Fade Up');
    const props = an.property(1).property('ADBE Text Animator Properties');
    A.strictEqual(props.property('ADBE Text Opacity').value, 0, 'hidden state = opacity 0');
    const off = an.property(1).property('ADBE Text Selectors').property(1).property('ADBE Text Percent Offset');
    A.strictEqual(JSON.stringify(off.keys.map(k => [k.t, k.v])), '[[2,-40],[3,100]]', 'offset sweeps -width -> 100 from the playhead');
});
t('text: backward order sweeps the other way with a Ramp Down shape', () => {
    const e = env(); const L = text(e);
    e.call('textAnimate', { preset: 'blur-in', order: 'backward', stagger: 30, duration: 2 });
    const sel = animators(L).property(1).property('ADBE Text Selectors').property(1);
    A.strictEqual(JSON.stringify(sel.property('ADBE Text Percent Offset').keys.map(k => k.v)), '[100,-30]');
    A.strictEqual(sel.property('ADBE Text Range Advanced').property('ADBE Text Range Shape').value, 3);
});
t('text: Pop adds an overshoot animator riding the sweep (Triangle shape)', () => {
    const e = env(); const L = text(e);
    A.ok(e.call('textAnimate', { preset: 'pop', label: 'Pop', overshoot: true, overshootAmt: 25 }).ok);
    const an = animators(L); A.strictEqual(an.numProperties, 2);
    A.strictEqual(an.property(2).name, 'Sowveil · Pop overshoot');
    A.strictEqual(JSON.stringify(an.property(2).property('ADBE Text Animator Properties').property('ADBE Text Scale 3D').value), '[125,125,100]');
    A.strictEqual(an.property(2).property('ADBE Text Selectors').property(1).property('ADBE Text Range Advanced').property('ADBE Text Range Shape').value, 4);
});
t('text: every preset applies cleanly', () => {
    ['fade-up', 'hero-reveal', 'slide', 'blur-in', 'letter-rise', 'word-stagger', 'pop', 'drop-in', 'spin-in', 'skew-in', 'tracking-in', 'typewriter', 'scramble', 'color-sweep'].forEach(id => {
        const e = env(); text(e); const r = e.call('textAnimate', { preset: id }); A.ok(r.ok, id + ': ' + r.error);
    });
});
t('text: clear errors without a comp or without text layers', () => {
    const e1 = env({ noComp: true }); A.ok(/composition/.test(e1.call('textAnimate', { preset: 'pop' }).error));
    const e2 = env(); const s = e2.comp.layers.addShape(); s.selected = true;
    A.ok(/text layers/.test(e2.call('textAnimate', { preset: 'pop' }).error));
    const e3 = env(); text(e3); A.ok(/Unknown/.test(e3.call('textAnimate', { preset: 'nope' }).error));
});
t('text: Add Text creates a centred, selected text layer', () => {
    const e = env(); const r = e.call('addText', { text: 'Hi' });
    A.ok(r.ok, r.error); A.ok(e.comp.layer(1) instanceof e.ctx.TextLayer); A.ok(e.comp.layer(1).selected);
});

// ---------------- selection info + remove ----------------
t('selInfo reports layers and Sowveil presence; Remove strips the animators', () => {
    const e = env(); const L = text(e);
    A.strictEqual(e.call('selInfo').hasSv, false);
    e.call('textAnimate', { preset: 'pop' });
    const s = e.call('selInfo'); A.ok(s.comp); A.strictEqual(s.layers, 1); A.strictEqual(s.hasSv, true);
    const r = e.call('removeSowveil'); A.ok(r.ok, r.error); A.strictEqual(r.stats.animators, 2);
    A.strictEqual(animators(L).numProperties, 0);
    A.strictEqual(e.call('selInfo').hasSv, false);
});

// ---------------- expressions ----------------
const CODES = { scalar: '// sowveil · W\nwiggle(2, 40, 1);', vector: '// sowveil · W\nwiggle(2, 40, 1);', scale: '// sowveil · W\nwiggle(2, 4, 1);' };
t('expressions: Position target applies to every selected layer', () => {
    const e = env(); const a = e.comp.layers.addSolid([1, 1, 1], 'A', 100, 100), b = e.comp.layers.addSolid([1, 1, 1], 'B', 100, 100); a.selected = b.selected = true;
    const r = e.call('applyExpression', { label: 'Wiggle', target: 'position', codes: CODES }); A.ok(r.ok, r.error);
    [a, b].forEach(L => A.ok(L.transform.position.expression.indexOf('// sowveil') === 0));
    A.strictEqual(e.call('selInfo').hasSv, true, 'Remove bar sees it');
});
t('expressions: Scale gets the scale variant; Auto falls back to the preset default target', () => {
    const e = env(); const a = e.comp.layers.addSolid([1, 1, 1], 'A', 100, 100); a.selected = true;
    e.call('applyExpression', { label: 'W', target: 'scale', codes: CODES }); A.ok(/wiggle\(2, 4, 1\)/.test(a.transform.scale.expression));
    e.call('applyExpression', { label: 'W', target: 'auto', fallback: 'rotation', codes: CODES }); A.ok(a.transform.rotation.expression.length > 0);
    A.ok(/Select/.test(env().call('applyExpression', { target: 'position', codes: CODES }).error));
});

// ---------------- animated gradients (Backgrounds) ----------------
t('gradients: new layer = tagged solid at the bottom with 4 orbiting keyed points', () => {
    const e = env(); e.comp.layers.addShape().name = 'Art';
    const r = e.call('animatedGradient', { label: 'Deep Navy', colors: ['#050B14', '#0A192F', '#112240', '#233554'], target: 'new' }); A.ok(r.ok, r.error);
    const L = e.comp.layer(e.comp.numLayers); A.ok(/Sowveil Gradient · Deep Navy/.test(L.name)); A.ok(/sowveil/.test(L.comment));
    const g = L.property('ADBE Effect Parade').property(1); A.strictEqual(g.matchName, 'ADBE 4ColorGradient'); A.strictEqual(g.name, 'Sowveil · Deep Navy');
    [1, 3, 5, 7].forEach(i => A.strictEqual(g.property(i).numKeys, 9));
});
t('gradients: Selected layer mode needs exactly one layer', () => {
    const e = env(); A.ok(/exactly one/.test(e.call('animatedGradient', { colors: ['#000000'], target: 'layer' }).error));
    const L = e.comp.layers.addShape(); L.selected = true; A.ok(e.call('animatedGradient', { colors: ['#ff0000', '#00ff00'], target: 'layer' }).ok);
});

// ---------------- captions ----------------
t('captions: one text layer with keyed captions, highlight selector, pop and a sized box', () => {
    const e = env();
    const blocks = [{ text: 'hello there', start: 0.5, end: 1.4, words: [0.5, 0.9] }, { text: 'general kenobi', start: 2.5, end: 3.2, words: [2.5, 2.8] }];
    const r = e.call('buildCaptions', { blocks, offset: 1, style: { highlight: true, box: true, anim: 'pop', size: 64 } }); A.ok(r.ok, r.error);
    let T = null, B = null; for (let i = 1; i <= e.comp.numLayers; i++) { const L = e.comp.layer(i); if (/^Sowveil Captions$/.test(L.name)) T = L; if (/Box$/.test(L.name)) B = L; }
    A.ok(T && B, 'text + box layers');
    const st = T.property('ADBE Text Properties').property('ADBE Text Document');
    A.strictEqual(JSON.stringify(st.keys.map(k => [k.t, k.v.text])), JSON.stringify([[1.5, 'hello there'], [2.4, ' '], [3.5, 'general kenobi'], [4.2, ' ']]), 'captions keyed with blanks in the gaps (offset applied)');
    const an = T.property('ADBE Text Properties').property('ADBE Text Animators').property(1); A.strictEqual(an.name, 'Sowveil · Highlight');
    const amt = an.property('ADBE Text Selectors').property(1).property('ADBE Text Expressible Amount').expression; compiles(amt); A.ok(/textIndex/.test(amt));
    compiles(T.transform.scale.expression); compiles(B.transform.position.expression); compiles(B.transform.opacity.expression);
});
t('captions: nothing to build without blocks', () => { A.ok(/transcribe/.test(env().call('buildCaptions', { blocks: [] }).error)); });

// ---------------- shared engines from Akira FX, under Sowveil's own namespace ----------------
t('engines: UI animations / glass / templates load as $._svSaaS / $._svA / $._svT2, unlocked', () => {
    const e = env();
    A.strictEqual(typeof e.ctx.$._svSaaS.wipe, 'function'); A.strictEqual(typeof e.ctx.$._svSaaS.halftoneWave, 'function');
    A.strictEqual(typeof e.ctx.$._svA.applyGlassMorph, 'function'); A.strictEqual(typeof e.ctx.$._svT2.build, 'function');
    const L = e.comp.layers.addSolid([1, 1, 1], 'Card', 400, 300); L.selected = true;
    A.ok(/^SUCCESS/.test(e.ctx.$._svSaaS.wipe('direction=left;duration=0.8;delay=0.1;feather=160')), 'gradient wipe runs without any license');
    A.ok(/^SUCCESS/.test(e.ctx.$._svSaaS.halftoneWave('color=#8b7dff;waves=1;duration=1')), 'halftone wave runs');
    A.ok(/^SUCCESS/.test(e.ctx.$._svA.applyGlassMorph()), 'glass panel runs');
});
t('engines: Sowveil never touches Akira FX (namespace + license gate stay intact)', () => {
    const e = env({ withAkira: true });
    A.strictEqual(e.ctx.$._akira.isLocked, true, 'Akira stays locked');
    A.ok(e.ctx.$._akira._h && e.ctx.$._svA._h && e.ctx.$._akira._h !== e.ctx.$._svA._h, 'separate helper objects');
    A.strictEqual(e.ctx.$._akira.applyGlassMorph, undefined, 'Sowveil did not add functions to $._akira');
    A.strictEqual(e.ctx.$._akiraSaaS, undefined); A.strictEqual(e.ctx.$._akiraT2, undefined);
    const L = e.comp.layers.addSolid([1, 1, 1], 'Card', 400, 300); L.selected = true;
    A.ok(/^SUCCESS/.test(e.ctx.$._svSaaS.wipe('direction=top')), 'Sowveil still works next to a locked Akira');
});
t('engines: no "Akira" label leaks into layers Sowveil creates', () => {
    const e = env(); const L = e.comp.layers.addSolid([1, 1, 1], 'Card', 400, 300); L.selected = true;
    e.ctx.$._svSaaS.cursor('style=arrow'); e.ctx.$._svSaaS.halftoneWave('color=#ffffff');
    for (let i = 1; i <= e.comp.numLayers; i++) A.ok(!/Akira|Sougetsu/.test(e.comp.layer(i).name), e.comp.layer(i).name);
});

// ---------------- carousel ----------------
t('carousel: cards parent to a controller null with live controls and valid expressions', () => {
    const e = env(); const cards = [1, 2, 3, 4].map(i => { const L = e.comp.layers.addSolid([1, 1, 1], 'Card ' + i, 400, 300); L.selected = true; return L; });
    const r = e.call('carousel', { tilt: 15, spin: 20, backOpacity: 30, camera: true });
    A.ok(r.ok, r.error);
    const ctrl = cards[0].parent; A.ok(ctrl, 'parented'); A.ok(/Sowveil Carousel/.test(ctrl.name)); A.ok(ctrl.threeDLayer);
    const names = []; for (let i = 1; i <= ctrl.property('ADBE Effect Parade').numProperties; i++) names.push(ctrl.property('ADBE Effect Parade').property(i).name);
    A.deepStrictEqual(names, ['Radius', 'Rotation', 'Spin', 'Rise', 'Back Opacity', 'Face Camera']);
    A.strictEqual(ctrl.transform.xRotation.value, 15);
    cards.forEach(c => { A.strictEqual(c.parent, ctrl); A.ok(c.threeDLayer); [c.transform.position, c.transform.orientation, c.transform.opacity].forEach(p => { A.ok(p.expression.indexOf('// sowveil') === 0); compiles(p.expression); }); });
    let cams = 0; for (let i = 1; i <= e.comp.numLayers; i++) if (e.comp.layer(i) instanceof e.ctx.CameraLayer) cams++;
    A.strictEqual(cams, 1);
});
t('carousel: one selected layer is duplicated into the requested copies', () => {
    const e = env(); const L = e.comp.layers.addSolid([1, 1, 1], 'Card', 400, 300); L.selected = true;
    A.ok(e.call('carousel', { copies: 6, camera: false }).ok);
    let kids = 0; for (let i = 1; i <= e.comp.numLayers; i++) if (e.comp.layer(i).parent) kids++;
    A.strictEqual(kids, 6);
});
t('carousel: Remove on the controller frees the cards and deletes the rig', () => {
    const e = env(); const cards = [1, 2, 3].map(i => { const L = e.comp.layers.addSolid([1, 1, 1], 'C' + i, 400, 300); L.selected = true; return L; });
    e.call('carousel', { camera: false });
    const ctrl = cards[0].parent; e.comp._l.forEach(l => { l.selected = false; }); ctrl.selected = true;
    const r = e.call('removeSowveil'); A.ok(r.ok, r.error);
    A.strictEqual(e.comp._l.indexOf(ctrl), -1, 'controller deleted');
    cards.forEach(c => { A.strictEqual(c.parent, null); A.strictEqual(c.transform.position.expression, ''); });
});
t('carousel: needs a selection', () => {
    const e = env(); A.ok(/Select/.test(e.call('carousel', {}).error));
});

// ---------------- loader: how After Effects really starts the panel ----------------
t('loader: with no $.fileName, the panel-provided folder loads every part with no errors', () => {
    const e = M.makeEnv({ files: [], locked: true });
    e.ctx.$.fileName = '';
    e.ctx.$.evalFile = (f) => vm.runInContext(fs.readFileSync(f.fullName || f.p, 'utf8'), e.ctx, { filename: String(f.fullName || f.p) });
    e.ctx.$._sv_root = path.join(__dirname, '..', 'sowveil');
    vm.runInContext(fs.readFileSync(path.join(HOST, 'sowveil.jsx'), 'utf8'), e.ctx, { filename: 'sowveil.jsx' });
    A.deepStrictEqual(Array.from(e.ctx.$._sv_loadErrors || ['loader did not run']), []);
    ['selInfo', 'textAnimate', 'applyExpression', 'animatedGradient', 'carousel', 'buildCaptions', 'scanProjects', 'importMedia'].forEach(fn => A.strictEqual(typeof e.ctx.$._sv[fn], 'function', fn));
    A.strictEqual(typeof e.ctx.$._svSaaS.wipe, 'function'); A.strictEqual(typeof e.ctx.$._svA.applyGlassMorph, 'function'); A.strictEqual(typeof e.ctx.$._svT2.build, 'function');
    A.ok(e.ctx.$._svA._h, 'shared helpers ready');
});
t('loader: finds itself from $.fileName too', () => {
    const e = M.makeEnv({ files: [], locked: true });
    e.ctx.$.fileName = path.join(HOST, 'sowveil.jsx');
    e.ctx.$.evalFile = (f) => vm.runInContext(fs.readFileSync(f.fullName || f.p, 'utf8'), e.ctx, { filename: String(f.fullName || f.p) });
    vm.runInContext(fs.readFileSync(path.join(HOST, 'sowveil.jsx'), 'utf8'), e.ctx, { filename: 'sowveil.jsx' });
    A.strictEqual(typeof e.ctx.$._sv.selInfo, 'function');
});

console.log(process.exitCode ? 'SOME SOWVEIL TESTS FAILED' : 'ALL ' + passed + ' SOWVEIL TESTS PASSED');
