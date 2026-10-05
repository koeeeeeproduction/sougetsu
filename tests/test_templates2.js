// Templates 2.0: record every registered template (client recorder) and build it with host/akira_templates2.jsx in the AE mock.
const fs = require('fs'), path = require('path'), vm = require('vm'), A = require('assert');
const { makeEnv } = require('./mock_ae');
const ROOT = path.join(__dirname, '..');
function unwrap(f) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'), m = /atob\("([A-Za-z0-9+/=]+)"\)/.exec(s); return m ? Buffer.from(m[1], 'base64').toString('utf8') : s; }
// permissive DOM stub: every property is a callable stub object
function any() { const f = function () { return any(); }; return new Proxy(f, { get: (t, k) => k === Symbol.toPrimitive ? () => '' : (k === 'length' ? 0 : (k in t ? t[k] : (t[k] = any()))), set: (t, k, v) => { t[k] = v; return true; } }); }
const doc = any(); doc.createElement = () => { const e = any(); e.getContext = () => null; return e; };
const win = { document: doc, setTimeout: () => 0, clearTimeout() { }, localStorage: null, console, JSON, Math, Object, Array, String, Number, Date, RegExp, Error, parseFloat, parseInt, isFinite, isNaN, encodeURIComponent, decodeURIComponent, escape, unescape, atob: (b) => Buffer.from(b, 'base64').toString('binary') };
win.addEventListener = () => { }; win.removeEventListener = () => { }; win.window = win; win.self = win;
vm.createContext(win);
vm.runInContext(unwrap('client/js_akira/akira_templates2.js'), win, { filename: 'akira_templates2.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'client/js_akira/akira_t2_record.js'), 'utf8'), win, { filename: 'akira_t2_record.js' });
const T = win.AkiraT2, ids = T.list();
A.ok(ids.length > 50, 'templates registered: ' + ids.length);
// capture the exact command build() would send
let sent = null;
win.csInterface = { evalScript: (cmd, cb) => { if (/kernelVersion/.test(cmd)) { cb('ready'); return; } sent = cmd; cb('SUCCESS:ok'); }, getSystemPath: () => '' };
function defaults(fields) { const o = {}; (fields || []).forEach(f => { if (!f) return; if (f.type === 'group') Object.assign(o, defaults(f.fields)); else if (f.key) o[f.key] = JSON.parse(JSON.stringify(f.default === undefined ? (f.type === 'list' ? [] : f.type === 'toggle' ? false : f.type === 'number' ? 0 : '') : f.default)); }); return o; }
const mctx = { font: '10px sans-serif', save() { }, restore() { }, measureText(s) { const px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 10])[1]); return { width: String(s).length * px * 0.55 }; } };
const ORDER = [...fs.readFileSync(path.join(ROOT, 'host', 'akira_loader.jsx'), 'utf8').matchAll(/load\("([^"]+)"/g)].map(m => m[1]);
let ok = 0, bad = [];
for (const id of ids) {
  try {
    const spec = T.get(id), mk = () => { const d = { content: defaults(spec.fields), style: { fontScale: 100, depth3D: false }, motion: {}, theme: {} }; if (spec.prepare) { spec.prepare(d, win.AkiraT2Preview(mctx, d, spec, 0)); } return d; };
    const data = mk(); data.__ops = win.AkiraT2Record(spec, mk()); data.__size = spec.size; data.__title = spec.title || id; data.__dur = 5;
    A.ok(data.__ops.length > 0, 'ops recorded');
    const env = makeEnv({ files: ORDER });
    const cmd = T.command(id, data), r = vm.runInContext(cmd, env.ctx);
    A.ok(/^SUCCESS:/.test(r), r);
    A.strictEqual(env.undo(), 0, 'undo closed');
    const comp = env.items.find(c => c.comment === 'AKIRA_T2|' + id);
    A.ok(comp && comp.numLayers > 1, 'layers built');
    ok++;
  } catch (e) { bad.push(id + ': ' + (e && e.message)); }
}
if (bad.length) { console.log(bad.slice(0, 15).join('\n')); }
console.log('templates2: ' + ok + '/' + ids.length + ' built');
process.exitCode = bad.length ? 1 : 0;
if (process.env.T2DUMP) {
  const spec = T.get(process.env.T2DUMP), d = { content: defaults(spec.fields), style: { fontScale: 100 }, motion: {}, theme: {} };
  if (spec.prepare) spec.prepare(d, win.AkiraT2Preview(mctx, d, spec, 0));
  const ops = win.AkiraT2Record(spec, d);
  console.log(spec.size, ops.length); ops.slice(0, 25).forEach(o => console.log(JSON.stringify(o).slice(0, 220)));
}
