// Sowveil host engine tests (mock After Effects): text animation, backgrounds, carousel, selection info, Remove.
'use strict';
const A = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const M = require('./mock_ae');
const HOST = path.join(__dirname, '..', 'sowveil', 'host');
const PARTS = ['sv_core.jsx', 'sv_text.jsx', 'sv_backgrounds.jsx', 'sv_carousel.jsx', 'sv_media.jsx', 'sv_library.jsx'];
let passed = 0;
function t(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL', name, '\n ', e.message.slice(0, 500), (e.stack || '').split('\n')[1] || ''); process.exitCode = 1; } }

function env(opts) {
    const e = M.makeEnv(Object.assign({ files: [], locked: true }, opts || {}));
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

// ---------------- backgrounds ----------------
t('backgrounds: mesh is a tagged solid at the bottom with a drifting 4-colour gradient', () => {
    const e = env(); const top = e.comp.layers.addShape(); top.name = 'Art';
    const r = e.call('background', { kind: 'mesh', c1: '#ff0000', c2: '#00ff00', c3: '#0000ff', c4: '#ffffff', animate: true, speed: 0.5 });
    A.ok(r.ok, r.error);
    const bg = e.comp.layer(e.comp.numLayers);
    A.ok(/Mesh Gradient/.test(bg.name)); A.ok(/sowveil/.test(bg.comment));
    const fx = bg.property('ADBE Effect Parade').property(1);
    A.strictEqual(fx.matchName, 'ADBE 4ColorGradient'); A.strictEqual(JSON.stringify(fx.property(2).value), '[1,0,0]');
    A.ok(fx.property(1).expression.indexOf('// sowveil') === 0); compiles(fx.property(1).expression);
});
t('backgrounds: aurora = blob shape layer over a base solid, both at the bottom', () => {
    const e = env(); e.comp.layers.addShape().name = 'Art';
    A.ok(e.call('background', { kind: 'aurora', c1: '#ff0000', c2: '#00ff00', c3: '#0000ff' }).ok);
    const n = e.comp.numLayers;
    A.ok(/Aurora Base/.test(e.comp.layer(n).name)); A.ok(/Aurora$/.test(e.comp.layer(n - 1).name)); A.strictEqual(e.comp.layer(1).name, 'Art');
});
t('backgrounds: every kind builds', () => {
    ['mesh', 'linear', 'radial', 'aurora', 'grid', 'dots', 'spotlight', 'grain'].forEach(k => { const e = env(); const r = e.call('background', { kind: k, animate: true }); A.ok(r.ok, k + ': ' + r.error); });
});
t('backgrounds: grain goes on top in overlay mode', () => {
    const e = env(); e.comp.layers.addShape();
    e.call('background', { kind: 'grain' });
    A.ok(/Film Grain/.test(e.comp.layer(1).name)); A.strictEqual(e.comp.layer(1).blendingMode, e.ctx.BlendingMode.OVERLAY);
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

console.log(process.exitCode ? 'SOME SOWVEIL TESTS FAILED' : 'ALL ' + passed + ' SOWVEIL TESTS PASSED');
