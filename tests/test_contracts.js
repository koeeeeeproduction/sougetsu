// Contract tests for the 56 host functions finished in this round, against the reply formats the panel parses.
// Run: node tests/test_contracts.js
'use strict';
const A = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const M = require('./mock_ae');
const FILES = ['akira_tools.jsx', 'akira_json.jsx', 'akira_organizer.jsx', 'akira_other.jsx', 'akira_shapes2.jsx', 'akira_rigs.jsx', 'akira_maps.jsx'];
let passed = 0;
const norm = (x) => JSON.parse(JSON.stringify(x));
const deq = (a, b, m) => A.deepStrictEqual(norm(a), norm(b), m);
function t(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL', name, e.message.slice(0,600), e.stack.split('\n')[1]); process.exitCode = 1; } }
function env(o) { return M.makeEnv(Object.assign({ files: FILES }, o || {})); }
function dec(r) { A.ok(r.indexOf('OK:') === 0, r); return JSON.parse(decodeURIComponent(r.substring(3))); }
function tmpJSON(obj) { const p = path.join(os.tmpdir(), 'akira-' + Math.random().toString(36).slice(2) + '.json'); fs.writeFileSync(p, JSON.stringify(obj)); return p; }
function shape(e, name) { const L = e.comp.layers.addShape(); L.name = name || 'S'; return L; }

// ---------- engine flags / guards ----------
t('engine flags are properties the panel compares', () => {
  const e = env();
  A.strictEqual(e.F.akiraMapEngineVersion >= 20, true);
  A.strictEqual(typeof e.F.akiraTypeReAlignVersion !== 'undefined', true);
  A.strictEqual(typeof e.F.akiraProjectOrganizerVersion !== 'undefined', true);
  A.strictEqual(e.F.saasVersion >= 9, false);
  ['akiraProjectAnalyze', 'akiraProjectOrganize', 'akiraProjectBoardLayout', 'akiraProjectBoardRestore'].forEach(n => A.strictEqual(typeof e.F[n], 'function', n));
  A.strictEqual(e.F.isLocked, false);
});
t('locked engine refuses writes', () => {
  const e = env({ locked: true });
  A.ok(/^ERR:/.test(e.F.createPrimitive('rect')));
  A.ok(/^ERR:/.test(e.F.akiraMap_createFromFile('x')));
  A.ok(/^ERROR:/.test(e.F.shapeMorpher(1, 'linear', false, false, false, '{}')));
});
t('no comp -> clean errors', () => {
  const e = env({ noComp: true });
  A.ok(/^ERR:/.test(e.F.addShapeLayer())); A.strictEqual(e.F.getCarouselDetails(), 'none');
  A.strictEqual(e.F.getExtraShapeData(), 'none'); A.strictEqual(e.F.akiraMap_listRigs(), '[]'); A.strictEqual(e.F.akiraMap_activeRig(), 'null');
});
t('run dispatcher', () => {
  const e = env();
  A.strictEqual(e.F.run('addShapeLayer'), 'SUCCESS'); A.ok(/^ERR:Unknown/.test(e.F.run('nope')));
});

// ---------- Other ----------
t('effects inspector rows + toggle/delete', () => {
  const e = env(), L = shape(e); L.selected = true;
  const fx = L.property('ADBE Effect Parade'); fx.addProperty('ADBE Gaussian Blur 2'); fx.addProperty('ADBE Slider Control');
  const rows = JSON.parse(e.F.getSelectedLayerEffects());
  A.strictEqual(rows.length, 4); deq(Object.keys(rows[0]).sort(), ['fxActive', 'fxIndex', 'fxName', 'matchName', 'propName']);
  A.strictEqual(rows[3].fxIndex, 2); A.strictEqual(rows[3].propName, 'Slider');
  A.strictEqual(e.F.toggleLayerEffectActive(1), 'Disabled'); A.strictEqual(e.F.toggleLayerEffectActive(1), 'Enabled');
  A.strictEqual(e.F.deleteLayerEffect(1), 'SUCCESS'); A.strictEqual(fx.numProperties, 1);
  A.ok(/^ERR:/.test(e.F.deleteLayerEffect(5)));
  A.strictEqual(e.F.deleteAllLayerEffects(), 'SUCCESS'); A.strictEqual(fx.numProperties, 0);
  L.selected = false; A.ok(/^ERR:/.test(e.F.getSelectedLayerEffects()));
});
t('system labels: per type, no undo step when unchanged', () => {
  const e = env(), S = shape(e), T = e.comp.layers.addText('x'); S.selected = T.selected = true;
  A.strictEqual(e.F.applySystemLabelsToSelected(), 'SUCCESS'); A.strictEqual(S.label, 8); A.strictEqual(T.label, 1);
  A.strictEqual(e.F.applySystemLabelsToSelected(), 'SUCCESS'); A.strictEqual(e.undo(), 0);
});
t('trimToBelowLayer + createExtrusion', () => {
  const e = env(), B = shape(e, 'B'); B.inPoint = 2; B.outPoint = 5; const T = e.comp.layers.addText('t'); T.selected = true;
  A.strictEqual(e.F.trimToBelowLayer(), 'SUCCESS'); deq([T.inPoint, T.outPoint], [2, 5]);
  A.strictEqual(e.F.createExtrusion('35'), 'SUCCESS'); A.strictEqual(T.threeDLayer, true);
  A.strictEqual(T.property('ADBE Extrsn Options Grp').property('ADBE Extrsn Depth').value, 35);
});
t('text re-align contracts', () => {
  const e = env(), T = e.comp.layers.addText('Hello'); T.selected = true; T.transform.position.setValue([500, 300]);
  let s = dec(e.F.akiraTypeSelection()); A.strictEqual(s.textCount, 1); A.strictEqual(s.justification, 'left'); A.strictEqual(s.risk, 0);
  // simulate AE reflow: centre justification moves the text box left by half its width
  const td = T.property('ADBE Text Properties').property('ADBE Text Document');
  const orig = td.setValue.bind(td); td.setValue = (d) => { orig(d); T.rect = d.justification === 7415 ? { left: -100, top: -20, width: 100, height: 40 } : { left: -50, top: -20, width: 100, height: 40 }; };
  let r = dec(e.F.akiraTypeAlign('center', 'visual')); deq(r, { changed: 1, skipped: 0 });
  deq(T.transform.anchorPoint.value, [-50, 0]); // anchor followed the reflow -> no visual jump
  r = dec(e.F.akiraTypeCenter('both')); A.strictEqual(r.changed, 1);
  const p = T.transform.position.value, a = T.transform.anchorPoint.value;
  deq([p[0] + (-100 + 50 - a[0]), p[1] + (-20 + 20 - a[1])], [960, 540]);
  r = dec(e.F.akiraTypeResetAnchor()); A.strictEqual(r.changed, 1); deq(T.transform.anchorPoint.value, [0, 0]);
  T.transform.position.setValueAtTime(1, [0, 0]); r = dec(e.F.akiraTypeAlign('right', 'anchor')); deq(r, { changed: 0, skipped: 1 });
  A.strictEqual(dec(e.F.akiraTypeSelection()).risk, 1);
  A.ok(/^ERR:/.test(e.F.akiraTypeAlign('diagonal', 'visual')));
});

// ---------- Shapes ----------
t('primitives / empty shape', () => {
  const e = env();
  ['circle', 'rect', 'cross', 'line'].forEach(k => A.strictEqual(e.F.createPrimitive(k), 'SUCCESS'));
  A.strictEqual(e.comp.numLayers, 4); deq(e.comp.layer(1).transform.position.value, [960, 540]);
  A.strictEqual(e.F.addShapeLayer(), 'SUCCESS'); A.strictEqual(e.undo(), 0);
});
t('shape presets', () => {
  const e = env(), L = shape(e); L.selected = true;
  ['dashes', 'waveWarp', 'roughenEdges', 'trimStart', 'trimEnd', 'exclusion'].forEach(k => A.strictEqual(e.F.applyShapePreset(k), 'SUCCESS', k));
  A.strictEqual(L.blendingMode, 27); A.strictEqual(L.property('ADBE Effect Parade').numProperties, 2);
  A.ok(/^ERR:/.test(e.F.applyShapePreset('bogus')));
});
t('taper read-out', () => {
  const e = env(), L = shape(e); L.selected = true; A.strictEqual(e.F.getExtraShapeData(), 'none');
  L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
  deq(JSON.parse(e.F.getExtraShapeData()), { taperStartLen: 10, taperEndLen: 20, taperStartWidth: 30, taperEndWidth: 40 });
});
t('createCustomShapes (raw and URI-encoded JSON)', () => {
  const e = env(), q = { type: 'ellipse', count: 6, sizeX: 80, sizeY: 80, round: 0, fill: 'ff0055', stroke: '', strokeWidth: 0, layout: 'radial' };
  A.strictEqual(e.F.createCustomShapes(encodeURIComponent(JSON.stringify(q))), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 6);
  A.strictEqual(e.F.createCustomShapes(JSON.stringify(Object.assign(q, { type: 'star', count: 3, layout: 'grid' }))), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 9);
});
t('La Path corner rig', () => {
  const e = env(), L = shape(e, 'Box'); L.selected = true;
  A.strictEqual(e.F.laPathGetSelectedState(), 'none');
  const pg = L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Shape - Group');
  const sh = new M.Shape(); sh.vertices = [[0, 0], [100, 0], [100, 100]]; sh.inTangents = sh.outTangents = [[0, 0], [0, 0], [0, 0]]; pg.property('ADBE Vector Shape').setValue(sh);
  A.strictEqual(e.F.laPathGetSelectedState(), 'noControllers');
  A.strictEqual(e.F.laPathStart(), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 4);
  A.ok(/createPath/.test(pg.property('ADBE Vector Shape').expression));
  A.strictEqual(e.F.laPathSet('24|1.5|0.5|true'), 'SUCCESS'); A.strictEqual(e.undo(), 0);
  A.strictEqual(e.F.laPathGetSelectedState(), 'hasControllers|24|1.5|0.5');
  A.ok(/^ERR:/.test(e.F.laPathStart()));
  A.strictEqual(e.F.laPathDelete(), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 1);
  const back = pg.property('ADBE Vector Shape').value; deq(back.vertices, [[0, 0], [100, 0], [100, 100]]); A.strictEqual(back.closed, true);
  A.strictEqual(pg.property('ADBE Vector Shape').expression, ''); A.strictEqual(e.F.laPathGetSelectedState(), 'noControllers');
});
t('shape morpher + remove', () => {
  const e = env(), mk = (n, v) => { const L = shape(e, n); const pg = L.property('ADBE Root Vectors Group').addProperty('ADBE Vector Shape - Group'); const s = new M.Shape(); s.vertices = v; pg.property('ADBE Vector Shape').setValue(s); L.selected = true; return [L, pg.property('ADBE Vector Shape')]; };
  const [B] = mk('B', [[1, 1]]), [Aa, pa] = mk('A', [[0, 0]]);
  A.ok(/^ERROR:/.test(env().F.shapeMorpher(1, 'linear', false, false, false, '{}')));
  A.strictEqual(e.F.shapeMorpher(1, 'easy-ease', true, true, false, JSON.stringify({ mode: 'path', useTrails: true, trailCount: 2, trailDelay: 0.05 })), 'SUCCESS');
  A.strictEqual(pa.numKeys, 3); A.strictEqual(B.enabled, false); A.strictEqual(e.comp.numLayers, 4);
  Aa.selected = true; B.selected = false;
  A.strictEqual(e.F.removeMorph(), 'SUCCESS'); A.strictEqual(pa.numKeys, 0); A.strictEqual(B.enabled, true); A.strictEqual(e.comp.numLayers, 2);
});

// ---------- Rigs ----------
t('carousel create / details / realtime / sync / paste path', () => {
  const e = env(), a = shape(e, 'a'), b = shape(e, 'b'), c = shape(e, 'c'); a.selected = b.selected = c.selected = true;
  A.ok(/^ERR:/.test(env().F.createCarousel('2d|false|none|false|600')));
  A.strictEqual(e.F.createCarousel('auto|false|none|true|480'), 'SUCCESS');
  A.ok(/akira-carousel/.test(a.transform.position.expression) && /N=3/.test(a.transform.position.expression));
  const d = JSON.parse(e.F.getCarouselDetails());
  A.strictEqual(d.format, '2d'); A.strictEqual(d.radius, 480); A.strictEqual(d.guideCircle, true); A.strictEqual(d.influence, 100); A.strictEqual(d.orient, 0);
  A.strictEqual(e.F.updateCarouselControlRealTime('Radius', 700), 'OK'); A.strictEqual(JSON.parse(e.F.getCarouselDetails()).radius, 700); A.strictEqual(e.undo(), 0);
  A.strictEqual(e.F.updateCarouselControlRealTime('Orient to Center', 1), 'OK'); A.strictEqual(JSON.parse(e.F.getCarouselDetails()).orient, 1);
  const n4 = shape(e, 'd'); [a, b, c].forEach(l => l.selected = false); n4.selected = true;
  A.strictEqual(e.F.syncCarousel(), 'SUCCESS'); A.ok(/N=4/.test(a.transform.position.expression) && /N=4/.test(n4.transform.position.expression));
  const src = shape(e, 'path src'); n4.selected = false; src.selected = true;
  const pg = src.property('ADBE Root Vectors Group').addProperty('ADBE Vector Shape - Group'); const s = new M.Shape(); s.vertices = [[0, 0], [10, 10]]; pg.property('ADBE Vector Shape').setValue(s);
  A.strictEqual(e.F.pastePathToCarouselControl(), 'SUCCESS'); A.strictEqual(JSON.parse(e.F.getCarouselDetails()).format, '2d-path');
  A.ok(/pointOnPath/.test(a.transform.position.expression));
});
t('orb cloner + effector', () => {
  const e = env(); A.ok(/^ERR:/.test(e.F.addOrbEffector('450|-160|35|30|-100')));
  A.strictEqual(e.F.createOrbCloner('2d|false|none|false|600|5|450|-160|35|30|-100'), 'SUCCESS');
  const names = e.comp._l.map(l => l.name);
  A.strictEqual(names.filter(n => /^Orb Clone/.test(n)).length, 5); A.ok(names.indexOf('Orb Effector') >= 0);
  A.strictEqual(e.F.addOrbEffector('300|0|20|10|-50'), 'SUCCESS'); A.ok(e.comp._l.some(l => l.name === 'Orb Effector 2'));
  const clone = e.comp._l.find(l => l.name === 'Orb Clone 3'); A.ok(/Orb Effector/.test(clone.transform.scale.expression));
});
t('buildCarousel3D', () => {
  const e = env(), L = shape(e, 'card src');
  const payload = { preset: 'cylindrical_ring', name: 'Cylindrical Ring', axis: 'y', facing: 'tangent', count: 6, radius: 700, arc: 360, tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.24, cardW: 260, source: 'timeline', media: [], layers: [1], duration: 8, turns: 1, direction: 1, loop: true, stepped: false, depthBlur: true, introOutro: false, style: 'fade', camera: { zoom: 2666, pos: [0, -600, -2200], poi: [0, 0, 0] }, swatches: ['ff0055', '22aaff'] };
  const r = e.F.buildCarousel3D(JSON.stringify(payload)); A.ok(/^OK:6 cards/.test(r), r);
  A.strictEqual(L.parent.name, 'AkiraCarousel Spin'); A.strictEqual(e.comp._l.filter(l => /^AkiraCarousel Card/.test(l.name)).length, 5);
  const spin = e.comp._l.find(l => l.name === 'AkiraCarousel Spin'); A.strictEqual(spin.transform.yRotation.numKeys, 2); A.ok(/loopOut/.test(spin.transform.yRotation.expression));
  A.ok(/^ERR:/.test(e.F.buildCarousel3D('{bad')));
});
t('shape morpher: rectangle -> ellipse tool shapes, different positions', () => {
  const e = env();
  const R = shape(e, 'Rect'); const rg = R.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'); const rc = rg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect');
  rc.property('ADBE Vector Rect Size').setValue([200, 100]); R.transform.position.setValue([500, 500]); R.selected = true;
  const El = shape(e, 'Ell'); const eg = El.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'); eg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size').setValue([100, 100]);
  El.transform.position.setValue([700, 500]); El.selected = true;
  const r = e.F.shapeMorpher(1, 'easy-ease', false, false, false, '{"mode":"path"}');
  A.strictEqual(r, 'SUCCESS', r);
  const src = R.index < El.index ? R : El, vg = src.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');
  const path = vg.property(1); A.strictEqual(path.matchName, 'ADBE Vector Shape - Group');
  const pp = path.property('ADBE Vector Shape'); A.strictEqual(pp.numKeys, 2);
  const k1 = pp.keyValue(1), k2 = pp.keyValue(2); A.strictEqual(k1.vertices.length, k2.vertices.length);
  if (src === R) { const xs = k2.vertices.map(v => v[0]); A.ok(Math.min(...xs) >= 149 && Math.max(...xs) <= 251, 'ellipse lands at +200px in rect space: ' + xs); }
  A.strictEqual(e.undo(), 0);
});
t('layer morph: any layers fly into the last-selected target, remove restores them', () => {
  const e = env();
  const a = e.comp.layers.addText('Hello'); a.transform.position.setValue([200, 300]); a.rect = { left: 0, top: -40, width: 200, height: 40 };
  const b = e.comp.layers.addSolid([1, 0, 0], 'Card', 400, 400); b.transform.position.setValue([1200, 600]); b.transform.anchorPoint.setValue([200, 200]); b.rect = { left: 0, top: 0, width: 400, height: 400 };
  a.selected = true; b.selected = true;
  const r = e.F.shapeMorpher(0.8, 'easy-ease', false, false, false, JSON.stringify({ useTrails: true, trailCount: 2, trailDelay: 0.04, pathCurve: 55 }));
  A.ok(/^SUCCESS:Morphed 1 layer into Card/.test(r), r);
  const p = a.transform.position; A.strictEqual(p.numKeys, 2);
  const end = p.keyValue(2); A.ok(Math.abs(end[0] - 1000) < 1 && Math.abs(end[1] - 800) < 1, 'text centre lands on the card centre: ' + end);
  const sc = a.transform.scale.keyValue(3); A.ok(Math.abs(sc[0] - 200) < 0.01 && Math.abs(sc[1] - 1000) < 0.01, 'matches the card size: ' + sc);
  A.strictEqual(a.transform.opacity.keyValue(2), 0); A.strictEqual(b.transform.opacity.numKeys, 2); A.strictEqual(b.transform.scale.numKeys, 3);
  A.strictEqual(e.comp.numLayers, 4);
  b.selected = false;
  A.strictEqual(e.F.removeMorph(), 'SUCCESS');
  A.strictEqual(p.numKeys, 0); deq(p.value, [200, 300]); A.strictEqual(b.transform.opacity.numKeys, 0); A.strictEqual(e.comp.numLayers, 2);
  A.ok(/^ERROR:/.test(e.F.shapeMorpher(1, 'linear', false, false, false, '{}')));
  A.strictEqual(e.undo(), 0);
});
t('glass morph apply / shape / remove', () => {
  const e = env();
  A.strictEqual(e.F.applyGlassMorph(), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 3);
  const blur = e.comp._l.find(l => / Blur$/.test(l.name)); A.ok(blur.adjustmentLayer && blur.trackMatte);
  const S = shape(e, 'Card'); S.selected = true;
  A.strictEqual(e.F.applyGlassMorphShape(), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 6);
  A.strictEqual(e.F.removeGlassMorph(), 'SUCCESS'); A.strictEqual(e.comp.numLayers, 4); A.strictEqual(S.comment, '');
  S.selected = false; A.strictEqual(e.F.removeGlassMorph(), 'SUCCESS'); deq(e.comp._l.map(l => l.name), ['Card']);
  A.ok(/^ERR:/.test(e.F.removeGlassMorph()));
});
t('liquid glass: missing plugin vs installed', () => {
  let e = env(); A.strictEqual(e.F.convertSelectedShapesToLiquidGlass('true'), 'ERR:The Liquid Glass effect is a separate plugin and is not installed.');
  e = env({ effects: [{ displayName: 'Liquid Glass', matchName: 'LG Glass' }] });
  const S = shape(e, 'Pill'); S.selected = true;
  const r = e.F.convertSelectedShapesToLiquidGlass('true'); A.ok(/^SUCCESS:Converted 1/.test(r), r); A.strictEqual(S.enabled, false);
  const G = e.comp._l.find(l => /^Liquid Glass/.test(l.name)); G.selected = true;
  A.ok(/^SUCCESS:Tracked 1 glass layer/.test(e.F.trackLiquidGlassToShape('false')));
});
t('light sweep lock + shatter', () => {
  const e = env(), L = shape(e); L.selected = true; A.strictEqual(e.F.fxLightSweepLock(true), '');
  L.property('ADBE Effect Parade').addProperty('CC Light Sweep');
  A.strictEqual(e.F.fxLightSweepLock(true), 'LOCKED'); A.strictEqual(e.F.fxLightSweepLock(false), 'UNLOCKED'); A.strictEqual(e.F.fxLightSweepLock(), 'LOCKED');
  e.comp.time = 2; A.strictEqual(e.F.applyShatterEffect(), 'SUCCESS');
  const rad = L.property('ADBE Effect Parade').property('ADBE Shatter').property('Force 1').property('Radius');
  deq(rad.keys.map(k => k.v), [0, 0.45]); A.strictEqual(e.undo(), 0);
});

// ---------- Maps ----------
t('maps: create, list, select, active, sync, refresh, trace, tracker, bake', () => {
  const e = env(), frame = { minX: 0.5, maxX: 0.6, minY: 0.3, maxY: 0.35625 };
  const img = tmpJSON({}); // any existing file stands in for the basemap png
  const cp = tmpJSON({ version: 19, level: 'VIEW', locationName: 'Test', aspect: 1.7778, fill: [0.1, 0.1, 0.1], baseFrameMerc: frame, basemapPath: img,
    labels: [{ name: 'City', x: 0.5, y: 0.5, rank: 1 }], features: [{ name: 'Country Borders', paths: [[[0, 0], [1, 0], [1, 1]]], stroke: [1, 1, 1], strokeWidth: 2, isClosed: true }], paths: [] });
  const r = e.F.akiraMap_createFromFile(cp); A.ok(/^OK:\d+:RIG:m\d+$/.test(r), r);
  const parts = r.split(':'), idx = +parts[1], id = parts[3];
  const rig = e.comp.layer(idx), mc = rig.source;
  A.strictEqual(mc.width, 1920); A.strictEqual(mc.height, 1080);
  deq(mc._l.map(l => l.comment.split('|')[0]), ['AKIRA_MAP_LABEL_V1', 'AKIRA_MAP_FEATURE_V1', 'AKIRA_MAP_BASEMAP_V1', 'AKIRA_MAP_BG_V1']);
  A.ok(/Akira Map Zoom/.test(rig.transform.scale.expression));
  const list = JSON.parse(e.F.akiraMap_listRigs()); A.strictEqual(list.length, 1); A.strictEqual(list[0].id, id); A.strictEqual(list[0].baseFrameMerc, '0.5,0.6,0.3,0.35625');
  A.strictEqual(e.F.akiraMap_selectRig(99, id), 'OK:' + idx); A.strictEqual(rig.selected, true);
  A.strictEqual(JSON.parse(e.F.akiraMap_activeRig()).name, rig.name);
  // centre of the frame at the same zoom -> 100% and centred pan
  const zoom = 1 + Math.log2(1 / 0.1), cMerc = [0.55, 0.328125];
  const lon = cMerc[0] * 360 - 180, lat = 180 / Math.PI * Math.atan(Math.sinh(Math.PI - 2 * Math.PI * cMerc[1]));
  A.strictEqual(e.F.akiraMap_syncRigToView(idx, lat, lon, zoom, 0, id), 'OK');
  const fx = rig.property('ADBE Effect Parade');
  A.ok(Math.abs(fx.property('Akira Map Zoom').property(1).value - 100) < 1e-6);
  const pan = fx.property('Akira Map Pan').property(1).value; A.ok(Math.abs(pan[0] - 960) < 1e-6 && Math.abs(pan[1] - 540) < 1e-3, pan);
  // live refresh for a frame shifted right by half a frame: imagery lands at x=960
  const up = tmpJSON({ version: 19, layerIndex: idx, rigId: id, baseFrameMerc: { minX: 0.55, maxX: 0.65, minY: 0.3, maxY: 0.35625 }, basemapPath: img, labels: [], features: [] });
  A.strictEqual(e.F.akiraMap_replaceViewFromFile(up), 'OK');
  const bm = mc._l.find(l => /^AKIRA_MAP_BASEMAP/.test(l.comment)); A.ok(Math.abs(bm.transform.position.value[0] - 960) < 1e-6);
  A.strictEqual(mc._l.filter(l => /^AKIRA_MAP_LABEL/.test(l.comment)).length, 0);
  // outline into the rig
  const ol = tmpJSON({ version: 20, name: 'Spain', paths: [[[0, 0], [0.5, 0.5], [1, 0]]], geo: [], isClosed: true, layerIndex: idx, rigId: id, autoRig: true, replaceExisting: true, baseFrameMerc: frame, stroke: [1, 0, 0], strokeWidth: 3 });
  A.strictEqual(e.F.akiraMap_traceOutlineFromFile(ol), 'SUCCESS:' + idx + ':RIG:' + rig.name);
  A.strictEqual(e.F.akiraMap_traceOutlineFromFile(ol), 'SUCCESS:' + idx + ':RIG:' + rig.name);
  const outl = mc._l.filter(l => l.comment === 'AKIRA_MAP_OUTLINE_V1|Spain'); A.strictEqual(outl.length, 1); A.strictEqual(outl[0].name, 'Spain Outline');
  const root = outl[0].property('ADBE Root Vectors Group'); A.strictEqual(root.property(1).matchName, 'ADBE Vector Shape - Group');
  deq(root.property(1).property(1).value.vertices[1].map(v => Math.round(v * 1e6) / 1e6), [960, 540]);
  // tracker
  const tr = tmpJSON({ version: 20, layerIndex: idx, rigId: id, autoRig: true, name: 'Madrid', x: 0.25, y: 0.5, baseFrameMerc: frame, vectorPaths: [[[0, 0], [1, 1]]], stroke: [1, 1, 1], strokeWidth: 2 });
  const tres = e.F.akiraMap_createTrackerFromFile(tr); A.ok(/^OK:\d+$/.test(tres), tres);
  const T = e.comp.layer(+tres.split(':')[1]); A.strictEqual(T.name, 'Track · Madrid'); A.ok(/R\.toComp\(\[480,540\]\)/.test(T.transform.position.expression), T.transform.position.expression);
  A.ok(mc._l.some(l => l.comment.indexOf('AKIRA_MAP_PLACE_VECTOR_V1|Madrid|') === 0));
  // bake
  const rigNow = JSON.parse(e.F.akiraMap_listRigs())[0];
  A.strictEqual(e.F.akiraMap_bakeRig(rigNow.index, id), 'OK'); A.strictEqual(rig.transform.scale.expression, ''); deq(rig.transform.scale.value.map(Math.round), [100, 100]);
  A.strictEqual(e.F.akiraMap_listRigs(), '[]'); A.ok(/^ERR:/.test(e.F.akiraMap_syncRigToView(rigNow.index, 0, 0, 3, 0, id)));
  A.strictEqual(e.undo(), 0);
});
t('maps: animated rig keys + standalone outline', () => {
  const e = env(), frame = { minX: 0.4, maxX: 0.6, minY: 0.3, maxY: 0.4125 };
  const p = tmpJSON({ version: 19, level: 'ANIM', locationName: 'Fly', aspect: 1.7778, baseFrameMerc: frame, labels: [], features: [], paths: [],
    animation: { duration: 4, easing: 'smooth', waypoints: [{ lat: 10, lon: 10, zoom: 4, bearing: 0, timeFraction: 0 }, { lat: 20, lon: 30, zoom: 6, bearing: 30, timeFraction: 1 }] } });
  const r = e.F.akiraMap_createFromFile(p); A.ok(/^OK:/.test(r), r);
  const rig = e.comp.layer(+r.split(':')[1]), z = rig.property('ADBE Effect Parade').property('Akira Map Zoom').property(1);
  A.strictEqual(z.numKeys, 2); A.ok(z.keyValue(2) > z.keyValue(1)); A.strictEqual(JSON.parse(e.F.akiraMap_listRigs())[0].level, 'ANIM');
  const e2 = env(), ol = tmpJSON({ version: 20, name: 'Loose', paths: [[[0, 0], [1, 1]]], geo: [], isClosed: false, layerIndex: 0, rigId: '', autoRig: true, baseFrameMerc: frame });
  A.strictEqual(e2.F.akiraMap_traceOutlineFromFile(ol), 'SUCCESS:0:COMP:Loose Outline');
  A.ok(/^ERR:/.test(e2.F.akiraMap_createFromFile('/nope.json')));
});
t('JSON helper', () => {
  const e = env(), H = e.F._h;
  deq(H.parseJSON('{"a":[1,-2.5e1,{"b":"x\\"y\\u0041"}],"c":true,"d":null}'), { a: [1, -25, { b: 'x"yA' }], c: true, d: null });
  A.throws(() => H.parseJSON('{"a":1} x')); A.throws(() => H.parseJSON('alert(1)'));
});

console.log(process.exitCode ? 'SOME TESTS FAILED' : 'ALL ' + passed + ' CONTRACT TESTS PASSED');
