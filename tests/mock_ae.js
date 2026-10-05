// Minimal After Effects DOM mock for running the ExtendScript host files under Node (vm).
// Not a full emulation: enough property-tree, layer and keyframe behaviour to exercise the host logic and replies.
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');

const PVT = { NO_VALUE: 0, OneD: 1, TwoD: 2, TwoD_SPATIAL: 3, ThreeD: 4, ThreeD_SPATIAL: 5, COLOR: 6, CUSTOM_VALUE: 7, LAYER_INDEX: 8, SHAPE: 9 };
const PT = { PROPERTY: 1, INDEXED_GROUP: 2, NAMED_GROUP: 3 };

class Prop {
  constructor(name, matchName, value, vt) {
    this.name = name; this.matchName = matchName || name; this._v = value === undefined ? 0 : value;
    this.propertyType = PT.PROPERTY; this.propertyValueType = vt || (Array.isArray(value) ? (value.length === 2 ? PVT.TwoD : value.length === 3 ? PVT.ThreeD_SPATIAL : PVT.COLOR) : PVT.OneD);
    this.expression = ''; this.keys = []; this.enabled = true; this.parentProperty = null; this.dimensionsSeparated = false;
  }
  get expressionEnabled() { return !!this.expression; }
  get value() { return this.valueAtTime(0, false); }
  valueAtTime(t) {
    if (!this.keys.length) return this._v;
    let k = this.keys[0]; for (const kk of this.keys) if (kk.t <= t) k = kk; return k.v;
  }
  setValue(v) { if (this.keys.length) throw new Error('setValue on keyed property ' + this.name); this._v = v; }
  setValueAtTime(t, v) { const i = this.keys.findIndex(k => Math.abs(k.t - t) < 1e-9); if (i >= 0) this.keys[i].v = v; else { this.keys.push({ t, v }); this.keys.sort((a, b) => a.t - b.t); } }
  setValuesAtTimes(ts, vs) { ts.forEach((t, i) => this.setValueAtTime(t, vs[i])); }
  get numKeys() { return this.keys.length; }
  keyTime(i) { return this.keys[i - 1].t; } keyValue(i) { return this.keys[i - 1].v; }
  removeKey(i) { this.keys.splice(i - 1, 1); }
  setTemporalEaseAtKey() { } setInterpolationTypeAtKey() { } setSpatialTangentsAtKey() { } addToMotionGraphicsTemplate() { return true; }
  nearestKeyIndex(t) { let b = 1, d = 1e9; this.keys.forEach((k, i) => { if (Math.abs(k.t - t) < d) { d = Math.abs(k.t - t); b = i + 1; } }); return b; }
  keyInInterpolationType() { return 1; } keyOutInterpolationType() { return 1; } isInterpolationTypeValid() { return true; }
  remove() { const a = this.parentProperty._kids; a.splice(a.indexOf(this), 1); }
  get propertyIndex() { return this.parentProperty._kids.indexOf(this) + 1; }
}

// child factories per matchName (what addProperty / auto-access creates)
const EFFECTS = {
  'ADBE Slider Control': () => [new Prop('Slider', 'ADBE Slider Control-0001', 0)],
  'ADBE Checkbox Control': () => [new Prop('Checkbox', 'ADBE Checkbox Control-0001', 0)],
  'ADBE Angle Control': () => [new Prop('Angle', 'ADBE Angle Control-0001', 0)],
  'ADBE Point Control': () => [new Prop('Point', 'ADBE Point Control-0001', [0, 0], PVT.TwoD_SPATIAL)],
  'ADBE Gaussian Blur 2': () => [new Prop('Blurriness', 'ADBE Gaussian Blur 2-0001', 0), new Prop('Blur Dimensions', 'ADBE Gaussian Blur 2-0002', 1), new Prop('Repeat Edge Pixels', 'ADBE Gaussian Blur 2-0003', 0)],
  'CC Light Sweep': () => [new Prop('Center', 'CC Light Sweep-0001', [0, 0], PVT.TwoD_SPATIAL), new Prop('Direction', 'CC Light Sweep-0002', 0)],
};
const SHAPE_KIDS = {
  'ADBE Vector Group': () => [group('Contents', 'ADBE Vectors Group'), group('Transform', 'ADBE Vector Transform Group', true)],
  'ADBE Vector Shape - Group': () => [new Prop('Path', 'ADBE Vector Shape', null, PVT.SHAPE)],
  'ADBE Vector Shape - Ellipse': () => [new Prop('Size', 'ADBE Vector Ellipse Size', [100, 100], PVT.TwoD), new Prop('Position', 'ADBE Vector Ellipse Position', [0, 0], PVT.TwoD_SPATIAL)],
  'ADBE Vector Shape - Rect': () => [new Prop('Size', 'ADBE Vector Rect Size', [100, 100], PVT.TwoD), new Prop('Roundness', 'ADBE Vector Rect Roundness', 0), new Prop('Position', 'ADBE Vector Rect Position', [0, 0], PVT.TwoD_SPATIAL)],
  'ADBE Vector Shape - Star': () => ['Points', 'Outer Radius', 'Inner Radius'].map(n => new Prop(n, 'ADBE Vector Star ' + n, 0)),
  'ADBE Vector Graphic - Fill': () => [new Prop('Color', 'ADBE Vector Fill Color', [1, 0, 0]), new Prop('Opacity', 'ADBE Vector Fill Opacity', 100)],
  'ADBE Vector Graphic - Stroke': () => [new Prop('Color', 'ADBE Vector Stroke Color', [1, 1, 1]), new Prop('Stroke Width', 'ADBE Vector Stroke Width', 2), new Prop('Opacity', 'ADBE Vector Stroke Opacity', 100),
    new Prop('Line Cap', 'ADBE Vector Stroke Line Cap', 1), new Prop('Line Join', 'ADBE Vector Stroke Line Join', 1), group('Dashes', 'ADBE Vector Stroke Dashes'),
    (() => { const t = group('Taper', 'ADBE Vector Stroke Taper'); ['Start Length', 'End Length', 'Start Width', 'End Width'].forEach((n, i) => t._add(new Prop(n, 'ADBE Vector Taper ' + n, [10, 20, 30, 40][i]))); return t; })()],
  'ADBE Vector Filter - Trim': () => [new Prop('Start', 'ADBE Vector Trim Start', 0), new Prop('End', 'ADBE Vector Trim End', 100), new Prop('Offset', 'ADBE Vector Trim Offset', 0)],
  'ADBE Vector Stroke Dash 1': null, 'ADBE Vector Stroke Gap 1': null,
};
class Group extends Prop {
  constructor(name, matchName, lenient) { super(name, matchName, null); this.propertyType = PT.NAMED_GROUP; this.propertyValueType = PVT.NO_VALUE; this._kids = []; this.lenient = lenient; }
  get numProperties() { return this._kids.length; }
  _add(p) { p.parentProperty = this; this._kids.push(p); return p; }
  property(k) {
    if (typeof k === 'number') { if (this.lenient) { while (this._kids.length < k) this._add(new Prop('p' + (this._kids.length + 1), this.matchName + '-' + String(this._kids.length + 1).padStart(4, '0'), 0)); } return this._kids[k - 1]; }
    const f = this._kids.find(c => c.matchName === k || c.name === k);
    if (f) return f;
    if (this.lenient) return this._add(new Group(k, k, true));
    return null;
  }
  addProperty(mn) {
    let p;
    if (this.lenient || EFFECTS[mn] || SHAPE_KIDS[mn] || /Effect Parade/.test(this.matchName) || /Vectors Group|Root Vectors|Stroke Dashes/.test(this.matchName)) {
      if (/Stroke Dash|Stroke Gap/.test(mn)) p = new Prop(mn, mn, 0);
      else { p = new Group(mn.replace(/^ADBE (Vector )?/, ''), mn, !EFFECTS[mn] && !SHAPE_KIDS[mn]); (EFFECTS[mn] || SHAPE_KIDS[mn] || (() => []))().forEach(c => p._add(c)); }
    } else throw new Error('addProperty ' + mn + ' not allowed on ' + this.matchName);
    return this._add(p);
  }
}
function group(n, mn, lenient) { return new Group(n, mn, lenient); }

class Shape { constructor() { this.vertices = []; this.inTangents = []; this.outTangents = []; this.closed = true; } }
class KeyframeEase { constructor(s, i) { this.speed = s; this.influence = i; } }

let undoDepth = 0, undoMax = 0;
class AVLayer {
  constructor(comp, name, kind) {
    this.containingComp = comp; this.name = name; this.kind = kind; this.comment = ''; this.selected = false; this.enabled = true;
    this.label = 0; this.inPoint = 0; this.outPoint = 10; this.startTime = 0; this.threeDLayer = false; this.nullLayer = kind === 'null'; this.adjustmentLayer = false;
    this.guideLayer = false; this.parent = null; this.source = null; this.rect = { left: -50, top: -20, width: 100, height: 40 }; this.blendingMode = 1;
    const tg = group('Transform', 'ADBE Transform Group');
    const P = (n, mn, v, vt) => tg._add(new Prop(n, mn, v, vt));
    this.transform = {
      anchorPoint: P('Anchor Point', 'ADBE Anchor Point', [0, 0], PVT.ThreeD_SPATIAL), position: P('Position', 'ADBE Position', [0, 0], PVT.ThreeD_SPATIAL),
      scale: P('Scale', 'ADBE Scale', [100, 100], PVT.ThreeD), rotation: P('Rotation', 'ADBE Rotate Z', 0), opacity: P('Opacity', 'ADBE Opacity', 100),
      xRotation: P('X Rotation', 'ADBE Rotate X', 0), yRotation: P('Y Rotation', 'ADBE Rotate Y', 0), pointOfInterest: P('Point of Interest', 'ADBE Point of Interest', [0, 0, 0]),
    };
    this.transform.zRotation = this.transform.rotation;
    this.root = group('root', 'root');
    this.root._add(group('Effects', 'ADBE Effect Parade'));
    this.root._add(tg); this.root._add(group('Masks', 'ADBE Mask Parade', true));
    if (kind === 'shape') this.root._add(group('Contents', 'ADBE Root Vectors Group'));
    if (kind === 'text') { const tp = group('Text', 'ADBE Text Properties', true); tp._add(new Prop('Source Text', 'ADBE Text Document', { text: name, fontSize: 50, justification: 7413, boxText: false }, PVT.CUSTOM_VALUE)); this.root._add(tp); }
    if (kind === 'camera') { const co = group('Camera Options', 'ADBE Camera Options Group', true); this.root._add(co); }
    if (kind === 'shape' || kind === 'text') { const eg = group('Geometry Options', 'ADBE Extrsn Options Grp'); eg._add(new Prop('Extrusion Depth', 'ADBE Extrsn Depth', 0)); this.root._add(eg); }
  }
  property(k) { return this.root.property(k); }
  get index() { return this.containingComp._l.indexOf(this) + 1; }
  sourceRectAtTime() { return this.rect; }
  remove() { const a = this.containingComp._l; a.splice(a.indexOf(this), 1); }
  moveBefore(o) { this.remove(); const a = this.containingComp._l; a.splice(a.indexOf(o), 0, this); }
  moveAfter(o) { this.remove(); const a = this.containingComp._l; a.splice(a.indexOf(o) + 1, 0, this); }
  moveToEnd() { this.remove(); this.containingComp._l.push(this); }
  moveToBeginning() { this.remove(); this.containingComp._l.unshift(this); }
  duplicate() { const d = new this.constructor(this.containingComp, this.name, this.kind); d.comment = this.comment; d.source = this.source; d.threeDLayer = this.threeDLayer; this.containingComp._l.splice(this.index - 1, 0, d); return d; }
  setTrackMatte(m, t) { this.trackMatte = m; this.trackMatteType = t; }
  copyToComp(c) { const L = new this.constructor(c, this.name, this.kind); c._l.unshift(L); return L; }
  get width() { return this.source ? this.source.width : 100; }
}
class ShapeLayer extends AVLayer { } class TextLayer extends AVLayer { } class CameraLayer extends AVLayer { } class LightLayer extends AVLayer { }
class FolderItem { constructor(n) { this.name = n; } }
class FootageItem { constructor(f) { this.file = f; this.width = 640; this.height = 360; this.name = String(f.p).split('/').pop(); } }
class CompItem {
  constructor(name, w, h, par, dur, fps) {
    this.name = name; this.width = w || 1920; this.height = h || 1080; this.pixelAspect = par || 1; this.duration = dur || 10; this.frameRate = fps || 25;
    this.frameDuration = 1 / this.frameRate; this.time = 0; this.comment = ''; this.motionBlur = false; this._l = []; this.renderer = 'ADBE Ernst'; this.workAreaStart = 0; this.workAreaDuration = 2;
    const c = this, put = (L) => { c._l.unshift(L); return L; };
    this.layers = {
      addShape: () => put(new ShapeLayer(c, 'Shape Layer', 'shape')), addNull: () => { const L = put(new AVLayer(c, 'Null', 'null')); L.source = { width: 100, height: 100 }; return L; },
      addText: (t) => put(new TextLayer(c, t || 'Text', 'text')), addCamera: (n) => put(new CameraLayer(c, n, 'camera')),
      addSolid: (col, n, w, h) => { const L = put(new AVLayer(c, n, 'solid')); L.source = { width: w, height: h, mainSource: {} }; L.color = col; return L; },
      add: (item) => { const L = put(new AVLayer(c, item.name, 'av')); L.source = item; L.transform.anchorPoint.setValue([item.width / 2, item.height / 2]); return L; },
    };
  }
  get numLayers() { return this._l.length; }
  layer(i) { return this._l[i - 1]; }
  get selectedLayers() { return this._l.filter(l => l.selected); }
  saveFrameToPng(t, f) { this.savedFrame = f.p; }
  openInViewer() { }
}

function makeEnv(opts) {
  opts = opts || {};
  undoDepth = 0; undoMax = 0;
  const comp = opts.noComp ? null : new CompItem('Main', 1920, 1080);
  const items = [];
  items.addComp = (n, w, h, par, d, f) => { const c = new CompItem(n, w, h, par, d, f); items.push(c); return c; };
  items.addFolder = (n) => { const f = new FolderItem(n); items.push(f); return f; };
  const File = function (p) { this.p = String(p); this.fullName = this.p; this.exists = fs.existsSync(this.p); this.encoding = ''; this.parent = { fullName: path.dirname(this.p) }; };
  File.prototype.open = function () { return this.exists; }; File.prototype.read = function () { return fs.readFileSync(this.p, 'utf8'); }; File.prototype.close = function () { };
  File.openDialog = () => null;
  const ctx = {
    console, Shape, KeyframeEase, File, Folder: Object.assign(function (p) { this.fullName = p; }, { temp: { fullName: require('os').tmpdir() } }), ImportOptions: function (f) { this.file = f; },
    CompItem, FolderItem, FootageItem, AVLayer, ShapeLayer, TextLayer, CameraLayer, LightLayer, SolidSource: function () { },
    PropertyType: PT, PropertyValueType: PVT,
    ParagraphJustification: { LEFT_JUSTIFY: 7413, CENTER_JUSTIFY: 7415, RIGHT_JUSTIFY: 7414 },
    KeyframeInterpolationType: { LINEAR: 6612, BEZIER: 6613, HOLD: 6614 }, BlendingMode: { NORMAL: 1, MULTIPLY: 5, EXCLUSION: 27 },
    TrackMatteType: { ALPHA: 1, ALPHA_INVERTED: 2, LUMA: 3 }, AutoOrientType: { CAMERA_OR_POINT_OF_INTEREST: 3 },
    alert: (m) => { throw new Error('alert: ' + m); },
    app: {
      beginUndoGroup() { undoDepth++; undoMax = Math.max(undoMax, undoDepth); }, endUndoGroup() { undoDepth--; },
      effects: opts.effects || [],
      project: { activeItem: comp, items, renderQueue: { items: { add: (c) => { ctx.queued = c; return {}; } } }, importFile: (o) => { const it = new FootageItem(o.file); items.push(it); return it; } },
    },
  };
  ctx.$ = { global: ctx, _flex: { isLocked: !!opts.locked } };
  vm.createContext(ctx);
  const host = path.join(__dirname, '..', 'host');
  (opts.files || []).forEach(f => vm.runInContext(fs.readFileSync(path.join(host, f), 'utf8'), ctx, { filename: f }));
  ctx.$._flex.isLocked = !!opts.locked;
  return { ctx, F: ctx.$._flex, comp, items, undo: () => undoDepth };
}

module.exports = { makeEnv, Shape, Prop, Group, AVLayer, ShapeLayer, TextLayer, CompItem, FootageItem };
