// Sowveil host engine tests (mock After Effects): Akira text library + carousel, backgrounds, captions, selection info, Remove, loader.
'use strict';
const A = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('./mock_ae');
const HOST = path.join(__dirname, '..', 'sowveil', 'host');
const PARTS = ['akira/akira_tools.jsx', 'akira/akira_json.jsx', 'akira/akira_rigs.jsx',
    'akira/akira_expressions.jsx', 'akira/akira_captions.jsx', 'akira/akira_layers.jsx',
    'sv_core.jsx', 'sv_expressions.jsx', 'sv_saas.jsx', 'sv_scene.jsx', 'sv_media.jsx', 'sv_captions.jsx', 'sv_library.jsx'];
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

// ---------------- text animation = Akira's expression library ----------------
global.window = {}; require('../sowveil/js/vendor/expressions.js'); const LIB = global.window.expressionLibrary;
function G(e, fn, ...args) { return JSON.parse(e.ctx.$._svG[fn](...args)); }
t('text: the library is Akira FX\'s (7 categories, 143 presets) and every buildCode compiles', () => {
    A.deepStrictEqual(Object.keys(LIB), ['textanimator', 'text', 'motion', 'physics', 'transform', 'effects', 'glitch']);
    let n = 0;
    for (const c in LIB) for (const x of LIB[c]) {
        n++; const p = {}; (x.params || []).forEach(q => { p[q.name] = q.default; });
        const code = x.buildCode ? x.buildCode(p) : x.code; A.ok(typeof code === 'string' && code.length, x.name);
    }
    A.strictEqual(n, 143);
});
t('text: applyExpressionToTargets lives in $._svG (not the global scope Akira FX uses)', () => {
    const e = env(); A.strictEqual(typeof e.ctx.$._svG.applyExpressionToTargets, 'function');
    A.strictEqual(typeof e.ctx.applyExpressionToTargets, 'undefined');
});
t('text: an animator preset adds a "Sowveil ·" Expressible Selector animator with its properties', () => {
    const e = env(); const L = text(e);
    const x = LIB.textanimator[0], p = {}; x.params.forEach(q => { p[q.name] = q.default; });
    const r = G(e, 'applyExpressionToTargets', '// sowveil\n' + x.buildCode(p), 'animator', 'Sowveil · ' + x.name, { basedOn: 3, props: [{ type: 'position', value: [0, 80] }, { type: 'opacity', value: 0 }] });
    A.ok(r.success, r.error);
    const an = animators(L).property(1); A.strictEqual(an.name, 'Sowveil · Apple Style Text');
    const sel = an.property('ADBE Text Selectors').property(1); A.strictEqual(sel.matchName, 'ADBE Text Expressible Selector');
    A.ok(/textIndex/.test(sel.property('ADBE Text Expressible Amount').expression));
    A.strictEqual(e.call('selInfo').hasSv, true);
});
t('text: transform presets go on every picked property; errors are clear', () => {
    const e = env(); const L = e.comp.layers.addSolid([1, 1, 1], 'S', 100, 100); L.selected = true;
    const r = G(e, 'applyExpressionToTargets', '// sowveil\nwiggle(5, 20)', 'Position,Rotation', 'Sowveil · Wiggle', { basedOn: 1, props: [] });
    A.ok(r.success, r.error); A.strictEqual(r.count, 2);
    A.ok(/wiggle/.test(L.transform.position.expression)); A.ok(/wiggle/.test(L.transform.rotation.expression));
    A.ok(/text layer/i.test(G(e, 'applyExpressionToTargets', 'x', 'animator', 'n', {}).error));
    const e2 = env({ noComp: true }); A.ok(/composition/i.test(G(e2, 'applyExpressionToTargets', 'x', 'Position', 'n', {}).error));
});
t('text: Remove expressions from selection (Akira deleteSelectedExpressions) clears them', () => {
    const e = env(); const L = e.comp.layers.addSolid([1, 1, 1], 'S', 100, 100); L.selected = true;
    G(e, 'applyExpressionToTargets', 'wiggle(5, 20)', 'Position,Scale', 'n', {});
    A.strictEqual(e.ctx.$._svA.deleteSelectedExpressions(), 'SUCCESS:2'); A.strictEqual(L.transform.position.expression, '');
});

// ---------------- selection info + remove ----------------
t('selInfo reports layers and Sowveil presence; Remove strips the animators', () => {
    const e = env(); const L = text(e);
    A.strictEqual(e.call('selInfo').hasSv, false);
    G(e, 'applyExpressionToTargets', '// sowveil\nvar x = 1; x', 'animator', 'Sowveil · Pop', { basedOn: 1, props: [{ type: 'scale', value: [0, 0] }] });
    G(e, 'applyExpressionToTargets', '// sowveil\nvar y = 1; y', 'animator', 'Sowveil · Fade', { basedOn: 1, props: [{ type: 'opacity', value: 0 }] });
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

// ---------------- animated gradients (Backgrounds) = Akira's own build script ----------------
global.window = global.window || {}; global.window.addEventListener = () => {}; global.document = global.document || { readyState: 'loading' }; require('../sowveil/js/vendor/gradient_bg.js'); const GBG = global.window.SowveilGradientBG;
t('gradients: Akira\'s script builds a bottom solid with 4 orbiting keyed points and no "Akira" label', () => {
    const e = env(); e.comp.layers.addShape().name = 'Art';
    const r = vm.runInContext(GBG.buildScript(['#050B14', '#0A192F', '#112240', '#233554'], { newLayer: true, blend: 120 }), e.ctx);
    A.ok(/^OK\|/.test(r), r);
    const L = e.comp.layer(e.comp.numLayers); A.strictEqual(L.name, 'Gradient BG');
    const g = L.property('ADBE Effect Parade').property(1); A.strictEqual(g.matchName, 'ADBE 4ColorGradient');
    let keyed = 0; for (let i = 1; i <= g.numProperties; i++) if (g.property(i).numKeys === 9) keyed++;
    A.strictEqual(keyed, 4);
    A.ok(!/Akira/.test(GBG.buildScript(['#000000'], {})));
});
t('gradients: with one layer selected (and New layer off) it goes on that layer', () => {
    const e = env(); const L = e.comp.layers.addShape(); L.selected = true;
    const r = vm.runInContext(GBG.buildScript(['#ff0000', '#00ff00'], { newLayer: false }), e.ctx);
    A.ok(/^OK\|/.test(r), r); A.strictEqual(L.property('ADBE Effect Parade').property(1).matchName, 'ADBE 4ColorGradient');
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
t('engines: glass loads as $._svA, unlocked', () => {
    const e = env();
    A.strictEqual(typeof e.ctx.$._svA.applyGlassMorph, 'function');
    const L = e.comp.layers.addSolid([1, 1, 1], 'Card', 400, 300); L.selected = true;
    A.ok(/^SUCCESS/.test(e.ctx.$._svA.applyGlassMorph()), 'glass panel runs');
});
t('engines: Sowveil never touches Akira FX (namespace + license gate stay intact)', () => {
    const e = env({ withAkira: true });
    A.strictEqual(e.ctx.$._akira.isLocked, true, 'Akira stays locked');
    A.ok(e.ctx.$._akira._h && e.ctx.$._svA._h && e.ctx.$._akira._h !== e.ctx.$._svA._h, 'separate helper objects');
    A.strictEqual(e.ctx.$._akira.applyGlassMorph, undefined, 'Sowveil did not add functions to $._akira');
    A.strictEqual(e.ctx.$._akiraSaaS, undefined);
});

// ---------------- SaaS Effects (host/sv_saas.jsx) ----------------
function clip(e, name) { const L = e.comp.layers.addSolid([1, 1, 1], name || 'Clip', 1920, 1080); L.source.duration = 5; L.source.mainSource = { isStill: false }; L.startTime = 2; L.inPoint = 2; L.outPoint = 7; L.selected = true; return L; }
function effectsOf(L) { const fx = L.property('ADBE Effect Parade'), out = []; for (let i = 1; i <= fx.numProperties; i++) out.push(fx.property(i).matchName); return out; }
t('saas: gradient wipe = frozen frame + hidden depth precomp + Colorama/Gradient Wipe keyed into the cut', () => {
    const e = env(); const L = clip(e);
    const ffx = path.join(__dirname, '..', 'sowveil', 'presets', 'gradient_wipe.ffx');
    const r = e.call('gradientWipe', { dir: 'in', duration: 1, depth: 'auto', cycles: 2, softness: 50, ffx });
    A.ok(r.ok, r.error);
    const top = e.comp.layer(1); A.ok(/Gradient Wipe/.test(top.name)); A.strictEqual(top.presetApplied, ffx, 'custom palette preset applied');
    A.strictEqual(top.inPoint, 1); A.strictEqual(top.outPoint, 2); A.strictEqual(top.property('ADBE Time Remapping').numKeys, 0, 'frame frozen');
    const fx = top.property('ADBE Effect Parade'), gw = fx.property('ADBE Gradient Wipe'), col = fx.property('APC Colorama');
    const tc = gw.property('ADBE Gradient Wipe-0001'); A.deepStrictEqual([tc.keyTime(1), tc.keyValue(1), tc.keyTime(2), tc.keyValue(2)], [1, 0, 2, 100]);
    A.strictEqual(col.property('APC Colorama-0008').keyValue(2), 720);
    const depth = e.comp._l.find(l => /GW Depth/.test(l.name)); A.ok(depth && depth.source instanceof e.ctx.CompItem, 'depth map precomposed'); A.strictEqual(depth.enabled, false);
    A.strictEqual(gw.property('ADBE Gradient Wipe-0003').value, depth.index);
    A.ok(e.comp._l.indexOf(top) < e.comp._l.indexOf(L), 'wipe sits above the clip');
});
t('saas: gradient wipe makes room when the clip starts at 0, and needs exactly one layer', () => {
    const e = env(); const L = clip(e); L.startTime = 0; L.inPoint = 0; L.outPoint = 5;
    A.ok(e.call('gradientWipe', { duration: 1.5, depth: 'ramp' }).ok); A.strictEqual(L.startTime, 1.5);
    const e2 = env(); A.ok(/one/.test(e2.call('gradientWipe', {}).error));
});
t('saas: the Colorama palette patch rewrites the Output Cycle in the preset', () => {
    global.window = global.window || {};
    const buf = fs.readFileSync(path.join(__dirname, '..', 'sowveil', 'presets', 'gradient_wipe.ffx'));
    const SVp = { hexToRgb: h => [1, 2, 3].map(i => parseInt(h.substr(i * 2 - 1, 2), 16) / 255) };
    const src = fs.readFileSync(path.join(__dirname, '..', 'sowveil', 'js', 'tabs', 'saas.js'), 'utf8');
    const m = /SV\.patchColorama = (function[\s\S]*?\n    \});/.exec(src); A.ok(m, 'patch function found');
    const patch = new Function('SV', 'c255', 'Buffer', 'return ' + m[1].replace(/;$/, ''))(SVp, h => SVp.hexToRgb(h).map(x => Math.round(x * 255)), Buffer);
    const orig = patch(buf, ['#ffb5b5', '#ff8fab', '#ff8fab', '#e1fcff', '#ffb3c6', '#ffe5ec']);
    A.ok(orig.equals(buf), 'the preset palette patches to the identical file');
    const out = patch(buf, ['#112233']); A.strictEqual(out.length, buf.length);
    const at = out.indexOf('aRbp', out.indexOf('aRbs')) + 8; A.deepStrictEqual([...out.slice(at, at + 8)], [0, 0, 0, 0, 255, 0x11, 0x22, 0x33]);
});
t('saas: depth reveal keys a Gradient Wipe on a cover layer over the clip', () => {
    const e = env(); const L = clip(e); e.comp.time = 3;
    const r = e.call('depthReveal', { look: 'gradient', colors: ['#000000', '#ff0000', '#00ff00', '#0000ff'], duration: 1.5, depth: 'ramp', parX: 20 }); A.ok(r.ok, r.error);
    const C = e.comp._l.find(l => /Depth Reveal/.test(l.name)); A.ok(C);
    const gw = C.property('ADBE Effect Parade').property('ADBE Gradient Wipe'); A.strictEqual(gw.property('ADBE Gradient Wipe-0001').keyTime(2), 4.5);
    A.ok(effectsOf(C).indexOf('ADBE 4ColorGradient') >= 0); A.ok(effectsOf(L).indexOf('ADBE Displacement Map') >= 0);
});
t('saas: halftone wave = ring comp under CC Ball Action, tinted, behind the source', () => {
    const e = env(); const B = e.comp.layers.addShape(); B.name = 'Button'; B.selected = true;
    const r = e.call('halftoneWave', { color: '#8b7dff', waves: 2, mode: 'behind' }); A.ok(r.ok, r.error);
    const W = e.comp._l.find(l => /Halftone Wave/.test(l.name)); A.ok(W.source instanceof e.ctx.CompItem);
    A.deepStrictEqual(effectsOf(W).slice(0, 2), ['CC Ball Action', 'ADBE Fill']); A.strictEqual(e.comp._l.indexOf(W), e.comp._l.indexOf(B) + 1, 'behind the button');
    A.strictEqual(W.source.layer(1).property('ADBE Root Vectors Group').numProperties, 2, 'two waves');
});
t('saas: match cut zoom parents the object to a keyed null peaking on the cut', () => {
    const e = env(); const L = e.comp.layers.addShape(); L.selected = true; e.comp.time = 2;
    A.ok(e.call('matchCutZoom', { zoom: 115, before: 5, after: 5 }).ok);
    const N = L.parent; A.ok(/Match Cut/.test(N.name)); const sc = N.transform.scale;
    A.strictEqual(sc.numKeys, 2); A.ok(Math.abs((sc.keyTime(1) + sc.keyTime(2)) / 2 - 2) < 1e-9, 'symmetric around the cut'); A.deepEqual(sc.keyValue(2), [115, 115, 100]);
});
t('saas: UI morph stretches A\'s rectangle into the cut and settles B out of it', () => {
    const e = env();
    const mk = (n, sz, inP) => { const L = e.comp.layers.addShape(); L.name = n; const g = L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'); g.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect').property('ADBE Vector Rect Size').setValue(sz); L.inPoint = inP; L.selected = true; return L; };
    const A1 = mk('A', [400, 120], 0), B1 = mk('B', [300, 500], 2);
    A.ok(e.call('uiMorph', { grow: 15 }).ok);
    let rs; (function walk(g) { for (let i = 1; i <= g.numProperties; i++) { const p = g.property(i); if (p.matchName === 'ADBE Vector Rect Size') rs = p; else if (p._kids) walk(p); } })(A1.property('ADBE Root Vectors Group'));
    A.deepEqual(Array.from(rs.keyValue(2)).map(Math.round), [400, 138]); A.strictEqual(B1.transform.scale.keyTime(1), 2);
});
t('saas: mockup precomposes the UI into a matted device screen on a scaling rig', () => {
    const e = env(); const L = e.comp.layers.addShape(); L.selected = true; e.comp.time = 1;
    A.ok(e.call('mockup', { device: 'phone' }).ok);
    const S = e.comp._l.find(l => /Mockup Screen/.test(l.name)); A.ok(S.source instanceof e.ctx.CompItem); A.ok(S.trackMatte, 'matted');
    const rig = S.parent; A.ok(/Mockup Rig/.test(rig.name)); A.strictEqual(rig.transform.scale.numKeys, 2);
});
t('saas: 3D glass shape and the glass refraction scene build Advanced 3D comps with valid expressions', () => {
    const e = env();
    A.ok(e.call('glassShape', { shape: 'ring' }).ok);
    const inner = e.items.find(i => i.name === 'Glass Shape 3D'); A.strictEqual(inner.renderer, 'ADBE Advanced 3d');
    const S = inner._l.find(l => l.name === 'Glass Shape'); A.ok(S.threeDLayer); compiles(S.transform.yRotation.expression);
    A.ok(inner._l.some(l => l instanceof e.ctx.LightLayer));
    const r = e.call('glassScene', { text: 'Hello' }); A.ok(r.ok, r.error);
    const sc = e.items.find(i => i.name === 'Sowveil Glass Scene'); A.ok(sc._l.length >= 12);
    ['Red', 'Green', 'Blue', 'Glass', 'Noise', 'Text Blur', 'Background'].forEach(n => A.ok(sc._l.some(l => l.name === n), n));
});

// ---------------- Templates: 20 scenes, built by host/sv_scene.jsx ----------------
require('../sowveil/js/scene.js'); require('../sowveil/js/templates_lib.js'); const TPL = global.window.SVTemplates;
function allExpr(L) { const out = []; (function walk(g) { for (let i = 1; i <= g.numProperties; i++) { const p = g.property(i); if (p.expression) out.push(p.expression); if (p._kids) walk(p); } })(L.root); return out; }
t('templates: 20 templates, every one builds a comp whose layers, parents and expressions are valid', () => {
    A.strictEqual(TPL.list.length, 20);
    TPL.list.forEach(d => {
        const e = env(), S = TPL.build(d, {});
        const r = e.call('buildScene', { scene: S }); A.ok(r.ok, d.id + ': ' + r.error);
        const c = e.items.find(i => i instanceof e.ctx.CompItem && i.name === S.name); A.ok(c, d.id + ' comp');
        A.ok(c.numLayers >= S.layers.length + 1, d.id + ' layers');
        S.layers.forEach(l => { if (l.parent) { const L = c._l.find(x => x.name === l.name); A.ok(L.parent && L.parent.name === l.parent, d.id + ': ' + l.name + ' parent'); } });
        c._l.forEach(L => allExpr(L).forEach(x => { try { compiles(x.replace(/thisComp|thisLayer/g, 'this')); } catch (err) { throw new Error(d.id + ' ' + L.name + ': ' + err.message + '\n' + x); } }));
    });
});
t('templates: keys keep the preview\'s timing and the Speed setting rescales them', () => {
    const d = TPL.list.find(x => x.id === 'success');
    const e = env(), S = TPL.build(d, {}); e.call('buildScene', { scene: S });
    const c = e.items.find(i => i.name === S.name), sp = c._l.find(l => l.name === 'Spinner');
    A.strictEqual(sp.transform.rotation.numKeys, 2); A.strictEqual(sp.transform.rotation.keyTime(2), 2);
    const fast = TPL.build(d, { speed: 200 }); A.strictEqual(fast.dur, 2.5);
    A.strictEqual(fast.layers.find(l => l.name === 'Spinner').anim.rot[1][0], 1);
});
t('templates: the typewriter / counter text expressions produce the preview text', () => {
    const d = TPL.list.find(x => x.id === 'analytics'), e = env(), S = TPL.build(d, {}); e.call('buildScene', { scene: S });
    const c = e.items.find(i => i.name === S.name), V = c._l.find(l => l.name === 'Value');
    const x = V.property('ADBE Text Properties').property('ADBE Text Document').expression;
    const val = new Function('time', 'return ' + '(function(){' + x.replace(/;([^;]*);$/, ';return $1;') + '})()');
    A.strictEqual(val(10), '$12,480'); A.strictEqual(val(0), '$0');
    A.strictEqual(global.window.SVScene.sample([[0, 0], [1, 100, 'linear']], 0.5), 50);
});

// ---------------- 3D carousel = Akira's builder ----------------
t('carousel: $._svA.buildCarousel3D builds the rig with Sowveil names', () => {
    const e = env(); const L = e.comp.layers.addSolid([1, 1, 1], 'card src', 400, 300); L.selected = true;
    const payload = { preset: 'cylindrical_ring', name: 'Cylindrical Ring', axis: 'y', facing: 'tangent', count: 6, radius: 700, arc: 360, tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.24, cardW: 260, source: 'timeline', media: [], layers: [L.index], duration: 8, turns: 1, direction: 1, loop: true, stepped: false, depthBlur: true, introOutro: false, style: 'fade', camera: { zoom: 2666, pos: [0, -600, -2200], poi: [0, 0, 0] }, swatches: ['ff0055', '22aaff'] };
    const r = e.ctx.$._svA.buildCarousel3D(JSON.stringify(payload)); A.ok(/^OK:6 cards/.test(r), r);
    A.strictEqual(L.parent.name, 'SowveilCarousel Spin');
    for (let i = 1; i <= e.comp.numLayers; i++) A.ok(!/Akira/.test(e.comp.layer(i).name), e.comp.layer(i).name);
});
t('carousel: the panel module calls $._svA, never $._akira', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sowveil', 'js', 'vendor', 'carousel3d.js'), 'utf8');
    A.ok(src.indexOf('$._svA.buildCarousel3D(') > 0); A.ok(!/\$\._akira/.test(src)); A.ok(/window\.SowveilCarousel3D/.test(src));
});

// ---------------- loader: how After Effects really starts the panel ----------------
t('loader: with no $.fileName, the panel-provided folder loads every part with no errors', () => {
    const e = M.makeEnv({ files: [], locked: true });
    e.ctx.$.fileName = '';
    e.ctx.$.evalFile = (f) => vm.runInContext(fs.readFileSync(f.fullName || f.p, 'utf8'), e.ctx, { filename: String(f.fullName || f.p) });
    e.ctx.$._sv_root = path.join(__dirname, '..', 'sowveil');
    vm.runInContext(fs.readFileSync(path.join(HOST, 'sowveil.jsx'), 'utf8'), e.ctx, { filename: 'sowveil.jsx' });
    A.deepStrictEqual(Array.from(e.ctx.$._sv_loadErrors || ['loader did not run']), []);
    ['selInfo', 'applyExpression', 'buildCaptions', 'scanProjects', 'importMedia'].forEach(fn => A.strictEqual(typeof e.ctx.$._sv[fn], 'function', fn));
    ['gradientWipe', 'depthReveal', 'halftoneWave', 'matchCutZoom', 'uiMorph', 'mockup', 'glassShape', 'glassScene'].forEach(fn => A.strictEqual(typeof e.ctx.$._sv[fn], 'function', fn));
    A.strictEqual(typeof e.ctx.$._svA.applyGlassMorph, 'function');
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
