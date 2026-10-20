/* Synced from client/js_akira/akira_saasfx.js by tools/sync_sowveil_engines.py */







(function () {
    'use strict';

    var VERSION = '1.5.0';
    var HOST_REQUIRED = 9;
    var STORE = 'akira_saasfx_v1';
    var MODAL = 'saasfx-modal';
    var STYLE_ID = 'saasfx-style';

    if (window.SowveilUIKit && typeof window.SowveilUIKit.inject === 'function') { return; }

    var S = null;

    function byId(id) { return document.getElementById(id); }
    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        if (html !== undefined) { e.innerHTML = html; }
        return e;
    }

    

    function css() {
        var M = '#' + MODAL + ' ';
        return [
            M + '.modal-box{width:340px;padding:18px 18px 14px;max-height:92vh;overflow:auto}',
            M + '.sf-intro{font-size:9.5px;line-height:1.5;color:#8a8a96;margin-bottom:10px}',
            M + '.sf-block,' + M + '.sf-intro,' + M + '.sf-status{flex:0 0 auto}',
            M + '.sf-block{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:7px;overflow:hidden}',
            M + '.sf-head{display:flex;align-items:center;gap:8px;padding:9px 10px;cursor:pointer;user-select:none}',
            M + '.sf-head svg{width:13px;height:13px;flex:0 0 13px;fill:currentColor;color:#8a8a96}',
            M + '.sf-head b{flex:1;font-size:9px;font-weight:900;letter-spacing:.9px;text-transform:uppercase;color:#bdbdc6}',
            M + '.sf-head i{font-style:normal;font-size:8.5px;color:#66666f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}',
            M + '.sf-block.open .sf-head b,' + M + '.sf-block.open .sf-head svg{color:var(--primary)}',
            M + '.sf-body{display:none;padding:2px 10px 10px}',
            M + '.sf-block.open .sf-body{display:block}',
            M + '.sf-label{font-size:8px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#6f6f7a;margin:8px 0 5px}',
            M + '.sf-seg{display:flex;gap:4px}',
            M + '.sf-seg-btn{flex:1;padding:6px 2px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:5px;color:#999;font-family:inherit;font-size:8.5px;font-weight:700;cursor:pointer;transition:all .15s ease}',
            M + '.sf-seg-btn:hover{color:#fff;border-color:rgba(255,255,255,.2)}',
            M + '.sf-seg-btn.active{color:var(--primary);border-color:var(--primary);background:var(--primary-dim,rgba(255,255,255,.06))}',
            M + '.sf-row{display:flex;gap:6px;align-items:stretch;margin-top:6px}',
            M + '.sf-num{flex:1;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 8px;height:27px;background:#141414;border:1px solid #2a2a2a;border-radius:5px;font-size:9px;color:#999;min-width:0}',
            M + '.sf-num input{width:44px;background:none;border:0;outline:0;color:#ddd;font-family:inherit;font-size:10px;text-align:right}',
            M + '.sf-check{flex:1;display:flex;align-items:center;gap:6px;font-size:9px;color:#9a9aa6;cursor:pointer;padding:0 2px;height:27px}',
            M + '.sf-check input{margin:0;accent-color:var(--primary)}',
            M + '.sf-sw{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:8px;color:#8a8a96}',
            M + '.sf-well{width:100%;height:22px;border:1px solid rgba(255,255,255,.16);border-radius:5px;cursor:pointer;box-shadow:inset 0 1px 2px rgba(0,0,0,.35)}',
            M + '.sf-well:hover{border-color:var(--primary)}',
            M + '.sf-go{display:flex;gap:6px;margin-top:9px}',
            M + '.sf-btn{flex:1;height:30px;border-radius:6px;border:1px solid var(--primary);background:var(--primary-dim,rgba(255,255,255,.06));color:var(--primary);font-family:inherit;font-size:9.5px;font-weight:900;letter-spacing:.8px;cursor:pointer;transition:all .15s ease}',
            M + '.sf-btn:hover{background:var(--primary);color:var(--accent-text-color,#000)}',
            M + '.sf-btn[disabled]{opacity:.45;cursor:default;pointer-events:none}',
            M + '.sf-block.open{border-color:var(--primary-dim,rgba(255,255,255,.12))}',
            M + '.sf-btn.ghost{flex:0 0 auto;padding:0 10px;border-color:rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:#aaa}',
            M + '.sf-btn.ghost:hover{color:#fff;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.06)}',
            M + '.sf-btn.danger{flex:0 0 auto;padding:0 10px;border-color:rgba(255,60,60,.4);background:rgba(255,60,60,.06);color:#ff5c5c}',
            M + '.sf-btn.danger:hover{background:#ff3333;color:#000}',
            M + '.sf-hint{font-size:8.5px;line-height:1.45;color:#66666f;margin-top:6px}',
            M + '.sf-status{font-size:9px;color:#8a8a96;min-height:14px;margin-top:6px;text-align:center}',
            M + '.sf-status.ok{color:var(--primary)}',
            M + '.sf-status.bad{color:#ff5c5c}',
            M + '.sf-thumb{display:none;margin-top:8px;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;background:#0b0b0b;text-align:center}',
            M + '.sf-thumb.on{display:block}',
            M + '.sf-thumb img{display:block;max-width:100%;max-height:110px;margin:0 auto}',
            M + '.sf-thumb span{display:block;font-size:8px;color:#6f6f7a;padding:3px 0 4px;letter-spacing:.3px}',
            M + '.sf-pv{margin-top:8px;border:1px solid rgba(255,255,255,.08);border-radius:6px;background:#0c0c0e;overflow:hidden}',
            M + '.sf-pv-stage{height:62px;display:flex;align-items:center;justify-content:center;padding:0 10px;overflow:hidden;cursor:pointer}',
            M + '.sf-pv-text{font-size:19px;font-weight:800;letter-spacing:-.2px;color:#ececf0;white-space:pre;line-height:1}',
            M + '.sf-pv-text span{display:inline-block;will-change:transform,opacity}',
            M + '.sf-pv-bar{display:flex;align-items:center;gap:6px;padding:0 6px 6px}',
            M + '.sf-pv-bar input{flex:1;min-width:0;height:22px;background:#141414;border:1px solid #2a2a2a;border-radius:4px;color:#bbb;font-family:inherit;font-size:9px;padding:0 6px;outline:0}',
            M + '.sf-pv-bar input:focus{border-color:var(--primary)}',
            M + '.sf-pv-bar button{flex:0 0 auto;height:22px;padding:0 8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:4px;color:#aaa;font-family:inherit;font-size:8.5px;font-weight:800;letter-spacing:.5px;cursor:pointer}',
            M + '.sf-pv-bar button:hover{color:var(--primary);border-color:var(--primary)}',
            M + '.sf-gy-canvas{display:block;width:100%;height:118px;cursor:pointer}',
            M + '.sf-hw-canvas{display:block;width:100%;height:112px;cursor:pointer}',
            M + '.sf-text,' + M + '.sf-area{display:block;width:100%;box-sizing:border-box;background:#141414;border:1px solid #2a2a2a;border-radius:5px;color:#ddd;font-family:inherit;font-size:10px;padding:6px 8px;outline:0;resize:vertical}',
            M + '.sf-area{font-family:Menlo,Consolas,monospace;font-size:9px;line-height:1.45;min-height:58px}',
            M + '.sf-text:focus,' + M + '.sf-area:focus{border-color:var(--primary)}'
        ].join('\n');
    }

    

    var DEFAULTS = {
        stOrder: 'top', stStyle: 'rise', stDelay: 0.08, stDur: 0.6, stRise: 40, stCtrl: true,
        drSource: 'ai', drLook: 'gradient', drIO: 'out', drPal: 'sunset', drStyle: 'sweep', drFar: false, drSoft: 25, drAdv: false,
        drParX: 0, drParY: 0, drSway: 0, drDir: 'bottom', drDur: 1.5, drBlur: 0, drPush: 0, drZoom: 0, drSlide: 0, cfgV: 3,
        cuOrder: 'stack', cuTravel: 0.7, cuHold: 0.5, cuClick: 16, cuSize: 100, cuTilt: true, cuRipple: true, cuShadow: true, cuPress: true, cuFill: '#ffffff', cuStroke: '#111111',
        txMode: 'letters', txDur: 0.8, txRise: 40, txColor: '#00ff55', txCps: 14, txCaret: true, txSample: 'Ship faster with Sowveil',
        bgPalette: 'aurora', bgSpeed: 0.6, bgAmount: 180, bgGrain: true,
        wpDir: 'left', wpDur: 0.8, wpFeather: 160, wpDelay: 0.1,
        hwColor: '', hwWaves: '1', hwDur: 1, hwGap: 0.35, hwRing: 150, hwSoft: 50, hwSpacing: 22, hwDot: 45, hwDistort: 60, hwGlow: true, hwClip: 'inside', bgClip: false, bgStyle: 'drift', cuStyle: 'arrow',
        hvRadius: 260, hvLift: 14, hvGrow: 6, hvShadow: true,
        caHold: 1, caMove: 0.6, caGap: 40, caFocus: 100, caSide: 82, caSideOp: 45, caLoop: true,
        atRot: false, atScale: false,
        pbText: 'create a landing page for my business', pbHint: 'Ask anything...', pbCps: 16,
        gyHead: 'Sowveil Ecosystem | will replace everyone', gyGlyphs: '/ / / / / / / / / / / < > * - | \\', gyPal: 'mint', gyCount: 28, gyDensity: 55, gyRate: 6, gyDur: 8, gyCode: true, gyBg: true,
        gyCodeText: 'const app = express();\n(req, res) => {\nconst orgs = await axios.get(url);\nconsole.error(err);\nres.json({ ok: true });\nexport default handler;\nif (!user) return;\nawait db.connect();',
        openBlock: 'stagger'
    };

    function load() {
        var out = {}, k, saved = null;
        for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { out[k] = DEFAULTS[k]; } }
        try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
        out.txColor = accent();
        out.hwColor = accent();
        if (saved && typeof saved === 'object' && saved.cfgV !== DEFAULTS.cfgV) { for (k in saved) { if (saved.hasOwnProperty(k) && /^dr/.test(k)) { delete saved[k]; } } }
        if (saved && typeof saved === 'object' && saved.gyHead === 'Build apps | that scale') { delete saved.gyHead; }
        if (saved && typeof saved === 'object') { for (k in saved) { if (saved.hasOwnProperty(k) && DEFAULTS.hasOwnProperty(k)) { out[k] = saved[k]; } } }
        return out;
    }

    function save() {
        if (!S) { return; }
        try { localStorage.setItem(STORE, JSON.stringify(S.cfg)); } catch (e) { }
    }

    function accent() {
        var v = '';
        try { v = localStorage.getItem('akira_theme') || ''; } catch (e) { v = ''; }
        return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#00ff55';
    }

    

    function status(msg, kind) {
        var s = byId('saasfx-status');
        if (s) { s.textContent = msg || ''; s.className = 'sf-status' + (kind ? ' ' + kind : ''); }
    }

    function toast(msg, kind) {
        if (typeof window.showStatus === 'function') { window.showStatus(msg, kind); }
    }

    



    var hostLoading = false;
    function loadHostFile(cb) {
        var bridge = window.csInterface, p = '';
        p = extensionDir();
        if (!p) { cb(false); return; }
        p = p + '/host/sowveil.jsx';
        p = p.replace(/\\/g, '/').replace(/"/g, '\\"');
        var js = 'try { var f = new File("' + p + '"); f.exists ? ($.evalFile(f), "OK") : "NOFILE"; } catch (e) { "ERR: " + e.toString(); }';
        bridge.evalScript(js, function (res) { cb(String(res) === 'OK'); });
    }
    function ensureHost(cb) {
        if (typeof window.csInterface === 'undefined' || !window.csInterface) { cb(false); return; }
        var CHECK = "(typeof $ !== 'undefined' && $._svA && $._svA.saasVersion >= " + HOST_REQUIRED + ") ? 'ready' : " +
            "((typeof $ !== 'undefined' && $._svA && $._svA.saasVersion) ? 'stale' : 'missing')";
        window.csInterface.evalScript(CHECK, function (res) {
            var r = String(res);
            if (r === 'ready') { cb(true); return; }
            if (hostLoading) { cb(false); return; }
            hostLoading = true;
            loadHostFile(function (loaded) {
                hostLoading = false;
                if (loaded) { cb(true); return; }
                var msg = 'Restart After Effects once — the SaaS Effects engine loads when AE starts.';
                status(msg, 'bad'); toast(msg, 'error');
                cb(false);
            });
        });
    }

    function call(fn, opts, after) {
        status('Working…');
        ensureHost(function (ready) {
            if (!ready) { return; }
            var payload = '"' + String(opts || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
            window.csInterface.evalScript('$._svSaaS.' + fn + '(' + payload + ')', function (res) {
                var r = String(res || '');
                if (r.indexOf('SUCCESS:') === 0) { status(r.substring(8), 'ok'); toast(r.substring(8), 'success'); }
                else if (r.indexOf('ERR:') === 0) { status(r.substring(4), 'bad'); toast(r.substring(4), 'error'); }
                else if (r.indexOf('OK:') !== 0) { status('No reply from After Effects.', 'bad'); }
                if (after) { after(r); }
            });
        });
    }

    function opts(pairs) {
        var out = [], k;
        for (k in pairs) { if (pairs.hasOwnProperty(k)) { out.push(k + '=' + String(pairs[k]).replace(/[;=]/g, '')); } }
        return out.join(';');
    }

    
    var BUILD = {
        stagger: function (c) { return opts({ order: c.stOrder, style: c.stStyle, delay: c.stDelay, duration: c.stDur, rise: c.stRise, controller: c.stCtrl }); },
        depthReveal: function (c) {
            return opts({ source: c.drSource, look: c.drLook, io: c.drIO, palette: c.drPal, accent: accent(), style: c.drStyle, farFirst: c.drFar, soft: c.drSoft,
                direction: c.drDir, duration: c.drDur, blur: c.drBlur, push: c.drPush, zoom: c.drZoom, slide: c.drSlide, parX: c.drParX, parY: c.drParY, sway: c.drSway });
        },
        cursor: function (c) { return opts({ style: c.cuStyle, order: c.cuOrder, travel: c.cuTravel, hold: c.cuHold, click: c.cuClick, size: c.cuSize, tilt: c.cuTilt, ripple: c.cuRipple, shadow: c.cuShadow, press: c.cuPress, fill: c.cuFill, stroke: c.cuStroke }); },
        textAnim: function (c) { return opts({ mode: c.txMode, duration: c.txDur, rise: c.txRise, color: c.txColor, cps: c.txCps, caret: c.txCaret }); },
        background: function (c) { return opts({ palette: c.bgPalette, speed: c.bgSpeed, amount: c.bgAmount, grain: c.bgGrain, accent: accent(), clip: c.bgClip, style: c.bgStyle }); },
        wipe: function (c) { return opts({ direction: c.wpDir, duration: c.wpDur, feather: c.wpFeather, delay: c.wpDelay }); },
        hover: function (c) { return opts({ radius: c.hvRadius, lift: c.hvLift, grow: c.hvGrow, shadow: c.hvShadow }); },
        carousel: function (c) { return opts({ hold: c.caHold, move: c.caMove, gap: c.caGap, focus: c.caFocus, side: c.caSide, sideOpacity: c.caSideOp, loop: c.caLoop }); },
        attach: function (c) { return opts({ rotation: c.atRot, scale: c.atScale }); },
        promptBar: function (c) {
            var enc = function (v) { return encodeURIComponent(String(v === undefined || v === null ? '' : v)); };
            return opts({ text: enc(c.pbText || DEFAULTS.pbText), placeholder: enc(c.pbHint), cps: c.pbCps, accent: enc(accent()) });
        },
        halftoneWave: function (c) {
            return opts({ color: c.hwColor || accent(), waves: c.hwWaves, duration: c.hwDur, interval: c.hwGap, ring: c.hwRing, softness: c.hwSoft,
                spacing: c.hwSpacing, dot: c.hwDot, distortion: c.hwDistort, glow: c.hwGlow, clip: c.hwClip });
        },
        codeGlyphs: function (c) {
            var enc = function (v) { return encodeURIComponent(String(v === undefined || v === null ? '' : v)); };
            
            return opts({ text: enc(gyHeadText()), glyphs: enc(gyGlyphText()), code: enc(c.gyCodeText), palette: c.gyPal, accent: enc(accent()), count: c.gyCount,
                density: c.gyDensity, rate: c.gyRate, duration: c.gyDur, codeOn: c.gyCode, bg: c.gyBg });
        }
    };

    

    var DEPTH_NEED = ['onnxruntime', 'numpy', 'PIL'];

    function nodeReq(name) {
        try { if (typeof window.require === 'function') { return window.require(name); } } catch (e) { }
        try { if (typeof require === 'function') { return require(name); } } catch (e2) { }
        return null;
    }

    function depthFail(msg) {
        if (S) { S.depthBusy = false; }
        setDepthBusy(false);
        status(msg, 'bad'); toast(msg, 'error');
    }

    function setDepthBusy(on) {
        var b = byId('saasfx-dr-go');
        if (!b) { return; }
        if (on) { b.setAttribute('disabled', 'disabled'); } else { b.removeAttribute('disabled'); }
    }

    

    function waitForFile(fs, file, limitMs, cb) {
        var start = Date.now(), last = -1;
        (function poll() {
            var size = -1;
            try { if (fs.existsSync(file)) { size = fs.statSync(file).size; } } catch (e) { size = -1; }
            if (size > 0 && size === last) { cb(true); return; }
            last = size;
            if (Date.now() - start > limitMs) { cb(size > 0); return; }
            setTimeout(poll, 150);
        })();
    }

    

    function extensionDir() {
        var p = '';
        try { p = String(window.csInterface.getSystemPath(SystemPath.EXTENSION) || ''); } catch (e) { return ''; }
        p = p.replace(/^file:(\/\/)?/i, '');
        try { p = decodeURIComponent(p); } catch (e2) { }
        if (/^\/[A-Za-z]:[\/\\]/.test(p)) { p = p.substring(1); }
        var os = nodeReq('os');
        if (os && os.platform() === 'win32') { p = p.replace(/\//g, '\\'); }
        return p;
    }

    function scanDepth(frame, out, cb) {
        var cp = nodeReq('child_process'), path = nodeReq('path');
        var py = (typeof window.getPythonCommand === 'function') ? window.getPythonCommand(DEPTH_NEED) : 'python3';
        var script = path.join(extensionDir(), 'py', 'depth.py');
        var child = null, done = false, buf = '', errTail = '';
        function finish(err) { if (done) { return; } done = true; clearTimeout(timer); cb(err); }
        try { child = cp.spawn(py, [script, '--in', frame, '--out', out], { windowsHide: true }); }
        catch (e) { finish('Could not start Python for the depth scan: ' + e.message); return; }
        var timer = setTimeout(function () { try { child.kill(); } catch (e) { } finish('The depth scan took too long and was stopped.'); }, 6 * 60 * 1000);
        child.stdout.on('data', function (d) {
            buf += String(d);
            var lines = buf.split('\n'); buf = lines.pop();
            lines.forEach(function (line) {
                var m = null;
                try { m = JSON.parse(line); } catch (e) { m = null; }
                if (!m) { return; }
                if (m.stage === 'download') { status('Downloading the depth model (first time only) ' + (m.progress || 0) + '%'); }
                else if (m.stage === 'scan') { status('Scanning depth…'); }
                else if (m.ok === true) { finish(null); }
                else if (m.ok === false) { finish(m.error || 'The depth scan failed.'); }
            });
        });
        child.stderr.on('data', function (d) { errTail = (errTail + String(d)).slice(-600); });
        child.on('error', function (e) { finish('Python could not run: ' + e.message); });
        child.on('close', function (code) {
            if (code === 0) { finish(null); return; }
            var last = errTail.trim().split('\n').pop() || ('exit code ' + code);
            finish('The depth scan failed: ' + last);
        });
    }

    function showDepthThumb(file) {
        var t = byId('saasfx-dr-thumb');
        if (!t) { return; }
        var img = t.querySelector('img');
        img.src = 'file://' + encodeURI(String(file).replace(/\\/g, '/')) + '?t=' + Date.now();
        t.classList.add('on');
    }

    function runDepth() {
        var c = S.cfg;
        if (c.drSource !== 'ai') { call('depthReveal', BUILD.depthReveal(c)); return; }
        if (S.depthBusy) { return; }
        var fs = nodeReq('fs');
        if (!fs || !nodeReq('child_process')) { depthFail('AI depth needs the panel\'s Node.js access. Pick Gradient instead.'); return; }
        if (typeof window.akiraPythonHas === 'function' && !window.akiraPythonHas(DEPTH_NEED)) {
            depthFail('AI depth needs Python with onnxruntime, numpy and Pillow — run Install / Fix Dependencies in the Background Remover once, or pick Gradient.');
            return;
        }
        S.depthBusy = true; setDepthBusy(true);
        call('depthPrepare', '', function (r) {
            if (r.indexOf('OK:') !== 0) { S.depthBusy = false; setDepthBusy(false); return; }
            var p = r.substring(3).split('\t');
            var frame = p[0], out = p[1], ready = p[2] === '1';
            if (/;/.test(out)) { depthFail('The project path contains ";" — save the project somewhere else first.'); return; }
            status('Rendering the frame to scan…');
            waitForFile(fs, frame, ready ? 1500 : 30000, function (ok) {
                if (!ok) { depthFail('After Effects did not render the frame to scan.'); return; }
                scanDepth(frame, out, function (err) {
                    if (err) { depthFail(err); return; }
                    showDepthThumb(out);
                    status('Building the reveal…');
                    call('depthReveal', BUILD.depthReveal(c) + ';map=' + out, function () { S.depthBusy = false; setDepthBusy(false); });
                });
            });
        });
    }

    

    var PV = { raf: 0, t0: 0, units: [], mode: '', last: -1 };
    function raf(f) { if (typeof window.requestAnimationFrame === 'function') { return window.requestAnimationFrame(f); } return setTimeout(function () { f(Date.now()); }, 33); }
    function unraf(id) { if (typeof window.cancelAnimationFrame === 'function') { window.cancelAnimationFrame(id); } else { clearTimeout(id); } }
    var SCRAMBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+?';

    function previewOn() {
        var m = byId(MODAL);
        if (!m || !m.classList.contains('active')) { return false; }
        var b = m.querySelector('.sf-block[data-block="text"]');
        return !!(b && b.classList.contains('open'));
    }

    function buildPreviewText() {
        var host = byId('saasfx-pv-text');
        if (!host) { return; }
        var text = String(S.cfg.txSample || DEFAULTS.txSample).substr(0, 60);
        host.innerHTML = '';
        PV.units = [];
        var words = S.cfg.txMode === 'words';
        var parts = words ? text.split(/(\s+)/) : text.split('');
        parts.forEach(function (p) {
            var span = document.createElement('span');
            span.textContent = p;
            host.appendChild(span);
            if (/\S/.test(p)) { PV.units.push({ el: span, ch: p }); }
        });
        PV.mode = S.cfg.txMode;
    }

    function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    function easeOut(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
    function mix(a, b, k) { return Math.round(a + (b - a) * k); }
    function hexRgb(h) { h = String(h || '').replace('#', ''); return [parseInt(h.substr(0, 2), 16) || 0, parseInt(h.substr(2, 2), 16) || 0, parseInt(h.substr(4, 2), 16) || 0]; }

    function drawPreview(now) {
        PV.raf = 0;
        if (!S || !previewOn()) { return; }
        var c = S.cfg, t = (now - PV.t0) / 1000, units = PV.units, n = units.length, i;
        var typing = c.txMode === 'typing', ctype = c.txMode === 'colortype';
        var total = (typing || ctype) ? (String(c.txSample || '').length / Math.max(1, c.txCps)) : c.txDur;
        if (t > total + 1.4) { PV.t0 = now; t = 0; }
        var s = easeOut(t / Math.max(0.05, c.txDur)), w = Math.max(1, n * 0.35);
        var rise = Math.max(-40, Math.min(40, c.txRise * 0.25));
        var base = [236, 236, 240], col = hexRgb(c.txColor);
        for (i = 0; i < n; i++) {
            var u = units[i], a, st = u.el.style;
            if (c.txMode === 'letters' || c.txMode === 'words') {
                a = smooth((s * (n + w) - i) / w);
                st.opacity = a; st.transform = 'translateY(' + ((1 - a) * rise).toFixed(1) + 'px)'; st.filter = a < 1 ? 'blur(' + ((1 - a) * 3).toFixed(2) + 'px)' : ''; st.color = '';
            } else if (c.txMode === 'color') {
                a = Math.max(0, Math.min(1, (n > 1 ? i / (n - 1) : 1) + (-1 + 2 * s)));
                st.opacity = 1; st.transform = ''; st.filter = '';
                st.color = 'rgb(' + mix(base[0], col[0], a) + ',' + mix(base[1], col[1], a) + ',' + mix(base[2], col[2], a) + ')';
            } else if (ctype) {
                var typed = Math.floor(t * c.txCps), fresh = Math.max(0, Math.min(1, 1 - (typed - 1 - i) / 6));
                st.transform = ''; st.filter = '';
                st.opacity = i < typed ? 1 : 0;
                st.color = 'rgb(' + mix(base[0], col[0], fresh) + ',' + mix(base[1], col[1], fresh) + ',' + mix(base[2], col[2], fresh) + ')';
            } else if (c.txMode === 'scramble') {
                var settled = i < s * n;
                st.transform = ''; st.filter = ''; st.color = '';
                if (settled) { u.el.textContent = u.ch; st.opacity = 1; }
                else {
                    var tick = Math.floor(t * 18);
                    if (u.tick !== tick) { u.tick = tick; u.el.textContent = SCRAMBLE.charAt(Math.floor(Math.random() * SCRAMBLE.length)); }
                    st.opacity = 0.35;
                }
            } else {
                st.transform = ''; st.filter = ''; st.color = '';
            }
        }
        if (typing) {
            var host = byId('saasfx-pv-text'), full = String(c.txSample || '').substr(0, 60);
            var k = Math.min(full.length, Math.floor(t * c.txCps));
            var caret = c.txCaret && (k < full.length || Math.floor(t * 2.4) % 2 === 0);
            var txt = full.substr(0, k) + (caret ? '|' : '');
            if (host && host.textContent !== txt) { host.textContent = txt; }
        }
        PV.raf = raf(drawPreview);
    }

    

    var HV = { raf: 0, t0: 0, last: 0 };

    function waveOn() {
        var m = byId(MODAL);
        if (!m || !m.classList.contains('active')) { return false; }
        var b = m.querySelector('.sf-block[data-block="halftone"]');
        return !!(b && b.classList.contains('open'));
    }

    function drawWave(now) {
        HV.raf = 0;
        if (!S || !waveOn()) { return; }
        HV.raf = raf(drawWave);
        if (now - HV.last < 30) { return; }
        HV.last = now;
        var cv = byId('saasfx-hw-canvas');
        var g = cv && cv.getContext ? cv.getContext('2d') : null;
        if (!g) { return; }
        var dpr = window.devicePixelRatio || 1, cw = cv.clientWidth || 300, ch = cv.clientHeight || 110;
        if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        var c = S.cfg, k = ch / 1080, t = (now - HV.t0) / 1000;
        var n = Math.max(1, Math.min(3, parseInt(c.hwWaves, 10) || 1)), dur = Math.max(0.2, +c.hwDur || 1), gap = Math.max(0.05, +c.hwGap || 0.35);
        if (t > 0.2 + dur + (n - 1) * gap + 0.8) { HV.t0 = now; t = 0; }
        var sp = Math.max(3, (+c.hwSpacing || 22) * k * 3), dot = sp * Math.max(0.1, Math.min(1, (+c.hwDot || 45) / 100));
        var ringW = Math.max(3, (+c.hwRing || 150) * k * 1.1), soft = Math.max(2, (+c.hwSoft || 50) * k) + ringW * 0.2;
        var cx = cw / 2, cy = ch / 2, maxR = Math.sqrt(cx * cx + cy * cy) + ringW;
        var rings = [], i;
        for (i = 0; i < n; i++) {
            var p = Math.min(1, Math.max(0, (t - 0.2 - i * gap) / dur));
            if (p > 0) { rings.push({ r: maxR * (1 - Math.pow(1 - p, 3)), a: 1 - Math.pow(p, 3) }); }
        }
        g.fillStyle = '#060608';
        g.fillRect(0, 0, cw, ch);
        var inside = c.hwClip !== 'behind', lw = cw * 0.56, lh = ch * 0.56, lx = (cw - lw) / 2, ly = (ch - lh) / 2, lr = Math.min(lw, lh) * 0.22;
        var shape = function () {
            g.beginPath();
            g.moveTo(lx + lr, ly); g.lineTo(lx + lw - lr, ly); g.quadraticCurveTo(lx + lw, ly, lx + lw, ly + lr);
            g.lineTo(lx + lw, ly + lh - lr); g.quadraticCurveTo(lx + lw, ly + lh, lx + lw - lr, ly + lh);
            g.lineTo(lx + lr, ly + lh); g.quadraticCurveTo(lx, ly + lh, lx, ly + lh - lr);
            g.lineTo(lx, ly + lr); g.quadraticCurveTo(lx, ly, lx + lr, ly); g.closePath();
        };
        g.save();
        if (inside) { shape(); g.fillStyle = '#17171c'; g.fill(); shape(); g.clip(); }
        g.fillStyle = c.hwColor || accent();
        if (c.hwGlow) { g.shadowColor = c.hwColor || accent(); g.shadowBlur = 6; } else { g.shadowBlur = 0; }
        var wob = (+c.hwDistort || 0) / 60;
        for (var y = sp / 2; y < ch; y += sp) {
            for (var x = sp / 2; x < cw; x += sp) {
                var dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx), lit = 0;
                d += Math.sin(ang * 5 + t * 3) * ringW * 0.18 * wob;
                for (i = 0; i < rings.length; i++) {
                    var off = Math.abs(d - rings[i].r) - ringW / 2;
                    var v = off <= 0 ? 1 : Math.max(0, 1 - off / soft);
                    lit = Math.max(lit, v * rings[i].a);
                }
                if (lit < 0.03) { continue; }
                g.globalAlpha = lit;
                g.beginPath();
                g.arc(x, y, dot / 2, 0, Math.PI * 2);
                g.fill();
            }
        }
        g.restore();
        g.globalAlpha = 1;
        g.shadowBlur = 0;
        if (!inside) { shape(); g.fillStyle = '#17171c'; g.fill(); }
        shape(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; g.stroke();
    }

    function restartWave() {
        if (!S) { return; }
        if (HV.raf) { unraf(HV.raf); HV.raf = 0; }
        if (!waveOn()) { return; }
        HV.t0 = (typeof window.requestAnimationFrame === 'function' && window.performance && performance.now) ? performance.now() : Date.now();
        HV.last = 0;
        HV.raf = raf(drawWave);
    }

    function restartPreview() {
        if (!S) { return; }
        if (PV.raf) { unraf(PV.raf); PV.raf = 0; }
        restartGlyphs();
        restartWave();
        if (!previewOn()) { return; }
        buildPreviewText();
        PV.t0 = (typeof window.requestAnimationFrame === 'function' && window.performance && performance.now) ? performance.now() : Date.now();
        PV.raf = raf(drawPreview);
    }

    function previewBox() {
        var box = el('div', 'sf-pv');
        var stage = el('div', 'sf-pv-stage');
        stage.setAttribute('data-tooltip', 'Click to replay');
        var txt = el('div', 'sf-pv-text'); txt.id = 'saasfx-pv-text';
        stage.appendChild(txt);
        stage.onclick = function () { restartPreview(); };
        var bar = el('div', 'sf-pv-bar');
        var inp = el('input'); inp.type = 'text'; inp.id = 'saasfx-txSample'; inp.maxLength = 60; inp.value = S.cfg.txSample; inp.placeholder = 'Preview text';
        inp.oninput = function () { S.cfg.txSample = inp.value || DEFAULTS.txSample; save(); restartPreview(); };
        var again = el('button', '', 'REPLAY'); again.type = 'button'; again.onclick = function () { restartPreview(); };
        bar.appendChild(inp); bar.appendChild(again);
        box.appendChild(stage); box.appendChild(bar);
        return box;
    }

    

    


    var GV = { raf: 0, t0: 0, last: 0 };
    var GPAL = {
        mint: { bg: '#E3F1E2', ink: '#1C201C', a1: '#E0602C', a2: '#B48BE6', a3: '#EFA27A', code: '#E58FD9' },
        paper: { bg: '#F6F4EF', ink: '#161616', a1: '#E0602C', a2: '#7C6CF2', a3: '#F2B24C', code: '#2FA37A' },
        night: { bg: '#0E1110', ink: '#EDEFEA', a1: '#FF7A45', a2: '#B99BFF', a3: '#F4C08A', code: '#6CE3B5' }
    };

    function glyphPalette() {
        var c = S.cfg, p = GPAL[c.gyPal];
        if (p) { return p; }
        var a = accent(), rgb = hexRgb(a), lite = [];
        for (var k = 0; k < 3; k++) { lite.push(Math.round(rgb[k] + (255 - rgb[k]) * 0.45)); }
        return { bg: '#0E0F10', ink: '#EDEFEB', a1: a, a2: 'rgb(' + lite.join(',') + ')', a3: '#8C9199', code: a };
    }

    function hrand(n) { var x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

    function glyphPreviewOn() {
        var m = byId(MODAL);
        if (!m || !m.classList.contains('active')) { return false; }
        var b = m.querySelector('.sf-block[data-block="glyphs"]');
        return !!(b && b.classList.contains('open'));
    }

    var GY_START = 0.3, GY_STEP = 0.28, GY_HOLD = 0.35, GY_DELAY = 0.2;

    function gyWords(s) { s = String(s || '').replace(/^\s+|\s+$/g, ''); return s.length ? s.split(/\s+/) : []; }
    function gyHeadText() { return String(S.cfg.gyHead || '').replace(/\s+/g, '').length ? S.cfg.gyHead : DEFAULTS.gyHead; }
    function gyGlyphText() { return gyWords(S.cfg.gyGlyphs).length ? S.cfg.gyGlyphs : DEFAULTS.gyGlyphs; }

    
    function gyTiming(text) {
        var ph = String(text).split('|'), t = GY_START, p;
        for (p = 0; p < ph.length - 1; p++) { t += gyWords(ph[p]).length * GY_STEP + GY_HOLD; }
        var w1 = gyWords(ph[0]).length;
        return {
            p1: GY_START + w1 * GY_STEP + GY_HOLD,
            last: t + Math.max(gyWords(ph[ph.length - 1]).length - 1, 0) * GY_STEP,
            gin: w1 >= 2 ? GY_START + GY_STEP : GY_START + GY_STEP + GY_HOLD
        };
    }

    function phraseText(text, t) {
        var phrases = String(text || '').split('|'), p, w, span;
        t -= GY_START;
        if (t < 0) { return { txt: '', words: 0 }; }
        for (p = 0; p < phrases.length; p++) {
            w = gyWords(phrases[p]);
            span = w.length * GY_STEP + GY_HOLD;
            if (t < span || p === phrases.length - 1) {
                var shown = w.slice(0, Math.min(w.length, Math.floor(t / GY_STEP) + 1));
                return { txt: shown.join(' '), words: shown.length, phrase: p };
            }
            t -= span;
        }
        return { txt: '', words: 0 };
    }

    function drawGlyphs(now) {
        GV.raf = 0;
        if (!S || !glyphPreviewOn()) { return; }
        GV.raf = raf(drawGlyphs);
        if (now - GV.last < 30) { return; }
        GV.last = now;
        var cv = byId('saasfx-gy-canvas');
        var g = cv && cv.getContext ? cv.getContext('2d') : null;
        if (!g) { return; }
        var dpr = window.devicePixelRatio || 1, cw = cv.clientWidth || 300, ch = cv.clientHeight || 110;
        if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
        var c = S.cfg, pal = glyphPalette(), t = (now - GV.t0) / 1000, i;
        var headText = gyHeadText(), tm = gyTiming(headText);
        var codeLines = String(c.gyCodeText || '').split(/\r\n|\r|\n/).filter(function (s) { return s.replace(/\s+/g, '').length; });
        var codeOn = !!c.gyCode && codeLines.length > 0, out = codeOn ? tm.last + GY_DELAY : 1e9;
        if (t > (codeOn ? out + 3.5 : tm.last + 2.5)) { GV.t0 = now; t = 0; }

        var VW = 640, k = cw / VW, VH = ch / k, size = 24;
        g.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
        g.fillStyle = c.gyBg ? pal.bg : '#101112';
        g.fillRect(0, 0, VW, VH);
        g.textBaseline = 'middle';
        g.font = '400 ' + size + 'px Inter, -apple-system, "Helvetica Neue", Arial, sans-serif';
        var head = phraseText(headText, t), cx = VW / 2, cy = VH / 2;
        var hw = Math.max(g.measureText(head.txt).width, size) / 2, hh = size * 0.36;
        var gi = size * 0.9, sp = size * 4, snap = size * 1.15, bgap = size * 0.9;
        var hb = Math.max(hw + bgap, size * 3.6);
        g.textAlign = 'center';
        if (head.txt) { g.fillStyle = pal.ink; g.fillText(head.txt, cx, cy); }
        if (t >= GY_START - 0.12 && t < out) {
            var slash = t < tm.p1 && head.words <= 1, off = head.txt ? hb : size * 0.18;
            g.fillStyle = t < tm.p1 ? pal.ink : pal.a2; g.fillText(slash ? '/' : '<', cx - off, cy);
            g.fillStyle = t < tm.p1 ? pal.ink : pal.a1; g.fillText(slash ? '/' : '>', cx + off, cy);
        }
        var set = gyWords(gyGlyphText());
        var n = Math.max(0, Math.min(48, Math.round(c.gyCount))), rate = Math.max(0.5, c.gyRate), seed = 7;
        var bStart = Math.min(tm.p1, out - 0.45);
        var burst = codeOn ? 1 + 0.8 * Math.max(0, Math.min(1, (t - bStart) / Math.max(out - bStart, 0.01))) : 1;
        for (i = 0; i < n && t < out; i++) {
            var slot = Math.floor(t * rate + i * 0.37), move = Math.floor(slot / 3);
            var appear = tm.gin + 1.0 * (i / Math.max(n, 1));
            if (t < appear || hrand(seed * 389 + i * 17 + slot * 104729) >= c.gyDensity / 100) { continue; }
            var faint = hrand(seed * 391 + i * 19 + slot * 7) < 0.2;
            var ang = Math.PI * 2 * ((i * 0.6180339887 + (hrand(seed * 977 + i * 31 + move * 7919) - 0.5) * 0.09) % 1);
            var rx = hb - bgap + gi + hrand(seed * 983 + i * 37 + move * 13) * sp * burst;
            var ry = hh + gi * 0.8 + hrand(seed * 991 + i * 41 + move * 17) * sp * 0.6 * burst;
            var y = Math.round(Math.sin(ang) * ry / snap) * snap, x = Math.cos(ang) * rx;
            var room = Math.min(cx, VW - cx) - 12, roomY = Math.min(cy, VH - cy) - 8;
            if (Math.abs(y) < hh + snap * 0.5) {
                if (hb + gi * 1.2 > room) { y = (Math.sin(ang) < 0 ? -1 : 1) * Math.max(snap, hh * 2 + 4); }
                else { x = (x < 0 ? -1 : 1) * Math.max(Math.abs(x), hb + gi * 1.2); }
            }
            x = Math.max(-room, Math.min(room, x)); y = Math.max(-roomY, Math.min(roomY, y));
            var r = hrand(seed * 53 + i * 101 + slot * 3571), m = 0.3, col = pal.ink;
            if (r < m * 0.45) { col = pal.a1; } else if (r < m * 0.75) { col = pal.a2; } else if (r < m) { col = pal.a3; }
            g.globalAlpha = faint ? 0.35 : 1;
            g.fillStyle = col;
            g.fillText(set[Math.floor(hrand(seed * 131 + i * 7 + slot * 1013) * set.length) % set.length], cx + x, cy + y);
        }
        g.globalAlpha = 1;
        if (codeOn && t >= out) {
            var cfs = Math.round(size * 0.5);
            g.font = '400 ' + cfs + 'px Menlo, Consolas, "JetBrains Mono", monospace';
            g.textAlign = 'left';
            for (var j = 0; j < 10; j++) {
                var rc = rate / 6, u = t * rc + j * 0.53, cs = Math.floor(u), into = (u - cs) / rc;
                if (t < out + 0.1 * j || hrand(seed * 739 + j * 19 + cs * 15013) >= 0.6) { continue; }
                var cfaint = hrand(seed * 743 + j * 23 + cs * 29) < 0.3;
                var line = codeLines[Math.floor(hrand(seed * 211 + j * 13 + cs * 6007) * codeLines.length) % codeLines.length];
                var lanes = [-1, 1, -2, 2, -3, 3, 0, 0, -4, 4], lane = lanes[j % 10];
                var side = lane === 0 ? (j % 2 === 0 ? -1 : 1) : (hrand(seed * 977 + 5003 + j * 37 + cs * 7919) < 0.5 ? -1 : 1);
                var y2 = lane * Math.max(snap, size);
                var charW = cfs * 0.6, minX = lane === 0 ? hb + gi * 1.2 : 0;
                if (lane === 0) { line = line.substr(0, Math.max(0, Math.floor(((side > 0) ? (VW - 8) - (cx + minX) : (cx - minX) - 8) / charW))); }
                var full = line.length * charW;
                var reach = gi + hrand(seed * 5 + j * 3 + cs * 11) * size * 7 * 0.6;
                var left = side > 0 ? cx + Math.max(reach, minX) : cx - Math.max(reach, minX) - full;
                if (lane === 0) { left = side > 0 ? Math.min(left, VW - 8 - full) : Math.max(left, 8); }
                else { left = Math.max(8, Math.min(left, VW - 8 - full)); }
                var rr = hrand(seed * 97 + j * 29 + cs * 2203);
                g.globalAlpha = cfaint ? 0.35 : 1;
                g.fillStyle = rr < 0.3 ? pal.a1 : (rr < 0.5 ? pal.code : pal.ink);
                g.fillText(line.substr(0, Math.max(0, Math.floor(into * Math.max(28, line.length * rc / 0.7)))), left, cy + y2);
            }
            g.globalAlpha = 1;
        }
    }

    function restartGlyphs() {
        if (!S) { return; }
        if (GV.raf) { unraf(GV.raf); GV.raf = 0; }
        if (!glyphPreviewOn()) { return; }
        GV.t0 = (typeof window.requestAnimationFrame === 'function' && window.performance && performance.now) ? performance.now() : Date.now();
        GV.last = 0;
        GV.raf = raf(drawGlyphs);
    }

    function glyphPreviewBox() {
        var box = el('div', 'sf-pv');
        var cv = el('canvas', 'sf-gy-canvas'); cv.id = 'saasfx-gy-canvas';
        cv.setAttribute('data-tooltip', 'Click to replay');
        cv.onclick = function () { restartGlyphs(); };
        box.appendChild(cv);
        return box;
    }

    function textInput(key, placeholder, max, multi) {
        var inp = el(multi ? 'textarea' : 'input', multi ? 'sf-area' : 'sf-text');
        if (!multi) { inp.type = 'text'; }
        inp.id = 'saasfx-' + key; inp.maxLength = max; inp.placeholder = placeholder;
        inp.value = S.cfg[key];
        if (multi) { inp.rows = 4; inp.spellcheck = false; }
        inp.oninput = function () { S.cfg[key] = inp.value; save(); restartGlyphs(); };
        return inp;
    }

    function plainInput(key, placeholder, max) {
        var inp = el('input', 'sf-text');
        inp.type = 'text'; inp.id = 'saasfx-' + key; inp.maxLength = max; inp.placeholder = placeholder;
        inp.value = S.cfg[key];
        inp.oninput = function () { S.cfg[key] = inp.value; save(); };
        return inp;
    }

    

    function seg(key, items) {
        var wrap = el('div', 'sf-seg'), i;
        for (i = 0; i < items.length; i++) {
            (function (it) {
                var b = el('button', 'sf-seg-btn' + (S.cfg[key] === it[0] ? ' active' : ''), it[1]);
                b.type = 'button';
                b.setAttribute('data-v', it[0]);
                b.onclick = function () {
                    var all = wrap.querySelectorAll('.sf-seg-btn'), j;
                    for (j = 0; j < all.length; j++) { all[j].classList.remove('active'); }
                    b.classList.add('active');
                    S.cfg[key] = it[0]; save(); refreshVisibility();
                };
                wrap.appendChild(b);
            })(items[i]);
        }
        return wrap;
    }

    function numField(key, label, min, max, step, tip) {
        var lab = el('label', 'sf-num', label);
        if (tip) { lab.setAttribute('data-tooltip', tip); }
        var inp = el('input');
        inp.type = 'number'; inp.min = min; inp.max = max; inp.step = step; inp.value = S.cfg[key];
        inp.id = 'saasfx-' + key;
        inp.onchange = function () {
            var v = parseFloat(inp.value);
            if (isNaN(v)) { v = DEFAULTS[key]; }
            if (v < min) { v = min; }
            if (v > max) { v = max; }
            inp.value = v; S.cfg[key] = v; save(); refreshVisibility();
        };
        lab.appendChild(inp);
        return lab;
    }

    function check(key, label) {
        var lab = el('label', 'sf-check');
        var inp = el('input'); inp.type = 'checkbox'; inp.checked = !!S.cfg[key]; inp.id = 'saasfx-' + key;
        inp.onchange = function () { S.cfg[key] = !!inp.checked; save(); refreshVisibility(); };
        lab.appendChild(inp);
        lab.appendChild(document.createTextNode(label));
        return lab;
    }

    function well(key, label) {
        var sw = el('div', 'sf-sw');
        var w = el('div', 'sf-well'); w.id = 'saasfx-' + key + '-well'; w.style.background = S.cfg[key];
        w.onclick = function () {
            var picker = window.AkiraColorPicker || (typeof AkiraColorPicker !== 'undefined' ? AkiraColorPicker : null);
            if (!picker || typeof picker.open !== 'function') { return; }
            picker.open(S.cfg[key], function (hex) {
                if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) { return; }
                S.cfg[key] = hex; w.style.background = hex; save(); refreshVisibility();
            });
        };
        sw.appendChild(w);
        sw.appendChild(el('span', '', label));
        return sw;
    }

    function row() { var r = el('div', 'sf-row'), i; for (i = 0; i < arguments.length; i++) { r.appendChild(arguments[i]); } return r; }
    function label(t) { return el('div', 'sf-label', t); }
    function hint(t) { return el('div', 'sf-hint', t); }

    function goButton(text, fn) {
        var b = el('button', 'sf-btn', text); b.type = 'button';
        b.onclick = function (ev) { fn(ev); };
        return b;
    }

    function block(id, icon, title, summary, fill) {
        var b = el('div', 'sf-block'); b.setAttribute('data-block', id);
        var head = el('div', 'sf-head');
        head.innerHTML = '<svg viewBox="0 0 24 24">' + icon + '</svg>';
        head.appendChild(el('b', '', title));
        head.appendChild(el('i', '', summary));
        head.onclick = function () { openBlock(id); };
        var body = el('div', 'sf-body');
        fill(body);
        b.appendChild(head); b.appendChild(body);
        return b;
    }

    function openBlock(id) {
        var all = byId(MODAL).querySelectorAll('.sf-block'), i;
        for (i = 0; i < all.length; i++) {
            var is = all[i].getAttribute('data-block') === id;
            if (is && all[i].classList.contains('open')) { all[i].classList.remove('open'); S.cfg.openBlock = ''; save(); return; }
            all[i].classList.toggle('open', is);
        }
        S.cfg.openBlock = id; save(); restartPreview();
    }

    function refreshVisibility() {
        var m = byId(MODAL);
        if (!m) { return; }
        var typing = S.cfg.txMode === 'typing' || S.cfg.txMode === 'colortype';
        var tRow = byId('saasfx-tx-typing'), aRow = byId('saasfx-tx-anim'), cRow = byId('saasfx-tx-color');
        if (tRow) { tRow.style.display = typing ? 'flex' : 'none'; }
        if (aRow) { aRow.style.display = typing ? 'none' : 'flex'; }
        if (cRow) { cRow.style.display = (S.cfg.txMode === 'color' || S.cfg.txMode === 'colortype') ? 'flex' : 'none'; }
        var caretBox = byId('saasfx-txCaret');
        if (caretBox && caretBox.parentNode) { caretBox.parentNode.style.display = S.cfg.txMode === 'colortype' ? 'none' : ''; }
        var riseRow = byId('saasfx-st-rise');
        if (riseRow) { riseRow.style.display = (S.cfg.stStyle === 'rise' || S.cfg.stStyle === 'pop' || S.cfg.stStyle === 'bounce') ? 'flex' : 'none'; }
        var bgPal = byId('saasfx-bg-pal');
        if (bgPal) { bgPal.style.display = ''; }
        var ai = S.cfg.drSource === 'ai';
        var aiBox = byId('saasfx-dr-ai'), grBox = byId('saasfx-dr-grad');
        if (aiBox) { aiBox.style.display = ai ? 'block' : 'none'; }
        if (grBox) { grBox.style.display = ai ? 'none' : 'block'; }
        var lk = S.cfg.drLook, show = function (id, on) { var e = byId(id); if (e) { e.style.display = on ? '' : 'none'; } };
        show('saasfx-dr-io', lk !== 'blur');
        show('saasfx-dr-pal', lk === 'gradient');
        show('saasfx-dr-style', lk === 'blur' && ai);
        show('saasfx-dr-adv', !!S.cfg.drAdv);
        var advBtn = byId('saasfx-dr-advbtn');
        if (advBtn) { advBtn.textContent = (S.cfg.drAdv ? '▾' : '▸') + ' 3D EXTRAS — push, zoom, parallax'; }
        restartPreview();
    }

    var ICONS = {
        stagger: '<path d="M3 5h8v3H3zM3 10.5h13v3H3zM3 16h18v3H3z"/>',
        depth: '<path d="M12 3 2 12l10 9 10-9-10-9zm0 3.2L18.8 12 12 18.1 5.2 12 12 6.2z"/><path d="M12 9 8.6 12l3.4 3.1 3.4-3.1L12 9z"/>',
        cursor: '<path d="M5 3l14 9.5-6 .8 3.4 6.2-2.6 1.4-3.4-6.2L6 19V3z"/>',
        text: '<path d="M4 4h16v3h-6.5v13h-3V7H4z"/>',
        glyphs: '<path d="M8.6 6 3 12l5.6 6 1.5-1.4L5.8 12l4.3-4.6zM15.4 6l-1.5 1.4 4.3 4.6-4.3 4.6 1.5 1.4L21 12z"/><path d="M13.1 4.5l1.9.6-4.1 14.4-1.9-.6z"/>',
        background: '<path d="M3 4h18v16H3z" opacity=".35"/><path d="M3 20l6-8 4 5 3-3 5 6z"/>',
        wipe: '<path d="M3 4h9v16H3z"/><path d="M14 4h7v16h-7z" opacity=".35"/>',
        hover: '<path d="M4 14h11v6H4z" opacity=".35"/><path d="M6 6h11v6H6z"/><path d="M17.5 13l4 9-2.3-.6-1.3 2-.9-9.8z"/>',
        carousel: '<path d="M8 5h8v14H8z"/><path d="M2 7h4v10H2zM18 7h4v10h-4z" opacity=".4"/>',
        attach: '<path d="M10.6 13.4a1 1 0 0 0 1.4 0l4.9-4.9a3 3 0 0 0-4.2-4.2l-1.6 1.6 1.4 1.4 1.6-1.6a1 1 0 0 1 1.4 1.4L10.6 12a1 1 0 0 0 0 1.4zm2.8-2.8a1 1 0 0 0-1.4 0l-4.9 4.9a3 3 0 0 0 4.2 4.2l1.6-1.6-1.4-1.4-1.6 1.6a1 1 0 0 1-1.4-1.4l4.9-4.9a1 1 0 0 0 0-1.4z"/>',
        prompt: '<path d="M6 8h12a4 4 0 0 1 0 8H6a4 4 0 0 1 0-8zm0 2a2 2 0 0 0 0 4h12a2 2 0 0 0 0-4z"/><path d="M7 11h6v2H7z"/><circle cx="17.5" cy="12" r="1.5"/>',
        halftone: '<circle cx="12" cy="12" r="2.2"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="18" cy="18" r="1"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".45"/>',
        glass: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h10v2H7zM7 14h6v2H7z"/>'
    };

    

    function buildModal() {
        var overlay = el('div', 'modal-overlay'); overlay.id = MODAL;
        var box = el('div', 'modal-box');
        var close = el('div', 'close-modal', '&times;');
        close.onclick = function () { if (typeof window.closeModal === 'function') { window.closeModal(MODAL); } else { overlay.classList.remove('active'); } };
        box.appendChild(close);
        var title = el('div', 'modal-title', 'UI MOTION KIT');
        title.style.cssText = 'color:var(--primary);margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:8px;';
        box.appendChild(title);
        box.appendChild(el('div', 'sf-intro', 'Product-demo rigs in one click. Select layers in the comp, open a section, press the button. Every rig leaves sliders behind so you can retime it later.'));

        box.appendChild(block('stagger', ICONS.stagger, 'UI Stagger', 'reveal selected layers in sequence', function (b) {
            b.appendChild(label('Order'));
            b.appendChild(seg('stOrder', [['top', 'Top → down'], ['left', 'Left → right'], ['stack', 'Layer order'], ['random', 'Random']]));
            b.appendChild(label('Motion'));
            b.appendChild(seg('stStyle', [['rise', 'Rise'], ['pop', 'Pop'], ['bounce', 'Bounce'], ['scale', 'Scale'], ['blur', 'Blur'], ['fade', 'Fade']]));
            b.appendChild(row(numField('stDelay', 'Delay s', 0, 5, 0.02, 'Gap between one layer and the next'), numField('stDur', 'Duration s', 0.05, 10, 0.05, 'How long each layer takes')));
            var r = row(numField('stRise', 'Rise px', -2000, 2000, 5, 'Distance each layer travels'), check('stCtrl', 'Controller null')); r.id = 'saasfx-st-rise';
            b.appendChild(r);
            b.appendChild(hint('Layers that already animate a property are left alone. With the controller on, Delay and Duration stay live on the "Sowveil UI Stagger" null.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE STAGGER', function () { call('stagger', BUILD.stagger(S.cfg)); }));
        }));

        box.appendChild(block('depth', ICONS.depth, 'Depth Reveal', 'AI depth · sweep · 3D parallax', function (b) {
            b.appendChild(label('Depth from'));
            b.appendChild(seg('drSource', [['ai', 'AI depth scan'], ['gradient', 'Gradient']]));
            b.appendChild(label('Look'));
            b.appendChild(seg('drLook', [['gradient', 'Gradient'], ['fog', 'Depth fog'], ['blur', 'Blur reveal']]));
            var io = el('div'); io.id = 'saasfx-dr-io';
            io.appendChild(label('Transition'));
            io.appendChild(seg('drIO', [['out', 'Depth → Photo'], ['in', 'Photo → Depth']]));
            b.appendChild(io);
            var pal = el('div'); pal.id = 'saasfx-dr-pal';
            pal.appendChild(label('Palette'));
            pal.appendChild(seg('drPal', [['sunset', 'Sunset'], ['neon', 'Neon'], ['aurora', 'Aurora'], ['ocean', 'Ocean'], ['accent', 'Accent']]));
            b.appendChild(pal);
            var st = el('div'); st.id = 'saasfx-dr-style';
            st.appendChild(label('Blur style'));
            st.appendChild(seg('drStyle', [['sweep', 'Depth sweep'], ['focus', 'Focus pull']]));
            b.appendChild(st);
            var gr = el('div'); gr.id = 'saasfx-dr-grad';
            gr.appendChild(label('Comes from'));
            gr.appendChild(seg('drDir', [['bottom', 'Bottom'], ['top', 'Top'], ['left', 'Left'], ['right', 'Right'], ['center', 'Centre']]));
            b.appendChild(gr);
            b.appendChild(row(check('drFar', 'Far things first'), numField('drSoft', 'Edge %', 1, 100, 1, 'Softness of the sweep front')));
            b.appendChild(row(numField('drDur', 'Duration s', 0.1, 10, 0.1), numField('drBlur', 'Blur', 0, 300, 5, 'Blur radius at the start (0 = none)')));
            var advBtn = el('div', 'sf-label'); advBtn.id = 'saasfx-dr-advbtn'; advBtn.style.cursor = 'pointer';
            advBtn.onclick = function () { S.cfg.drAdv = !S.cfg.drAdv; save(); refreshVisibility(); };
            b.appendChild(advBtn);
            var adv = el('div'); adv.id = 'saasfx-dr-adv';
            adv.appendChild(row(numField('drPush', 'Push', 0, 1000, 10, 'Displacement at the start'), numField('drZoom', 'Zoom %', 0, 100, 1, 'Extra scale at the start')));
            adv.appendChild(row(numField('drParX', 'Parallax X', -500, 500, 5, '3D-photo shift, sideways'), numField('drParY', 'Parallax Y', -500, 500, 5, '3D-photo shift, up and down')));
            adv.appendChild(row(numField('drSway', 'Sway / s', 0, 5, 0.05, 'Parallax cycles per second'), numField('drSlide', 'Slide px', 0, 2000, 10, 'How far it travels in')));
            b.appendChild(adv);
            var ai = el('div'); ai.id = 'saasfx-dr-ai';
            var thumb = el('div', 'sf-thumb'); thumb.id = 'saasfx-dr-thumb';
            thumb.appendChild(el('img')); thumb.appendChild(el('span', '', 'Depth map — white is near'));
            ai.appendChild(thumb);
            b.appendChild(ai);
            b.appendChild(hint('Depth fog turns the shot into white-fog silhouettes; Gradient paints the depth in a colour palette. The transition sweeps through the depth — near things first — and Progress on the "Sowveil Depth Reveal" null runs it. AI depth downloads its model once (about 99 MB).'));
            var go = goButton('CREATE DEPTH REVEAL', function () { runDepth(); }); go.id = 'saasfx-dr-go';
            b.appendChild(el('div', 'sf-go')).appendChild(go);
        }));

        box.appendChild(block('cursor', ICONS.cursor, '3D Cursor', 'flies to each layer and clicks', function (b) {
            b.appendChild(label('Pointer'));
            b.appendChild(seg('cuStyle', [['arrow', 'Arrow'], ['hand', 'Hand'], ['dot', 'Touch']]));
            b.appendChild(label('Click order'));
            b.appendChild(seg('cuOrder', [['stack', 'Top layer first'], ['bottom', 'Bottom first'], ['position', 'Top → down']]));
            b.appendChild(row(numField('cuTravel', 'Travel s', 0.1, 10, 0.05, 'Flight time between clicks'), numField('cuHold', 'Hold s', 0, 10, 0.05, 'Pause on each target')));
            b.appendChild(row(numField('cuClick', 'Click %', 0, 60, 1, 'How far the cursor shrinks on click'), numField('cuSize', 'Size %', 10, 400, 5)));
            b.appendChild(row(check('cuTilt', '3D tilt'), check('cuRipple', 'Click ripple')));
            b.appendChild(row(check('cuShadow', 'Shadow'), check('cuPress', 'Button press')));
            b.appendChild(row(well('cuFill', 'Cursor'), well('cuStroke', 'Outline')));
            b.appendChild(hint('A vector arrow, not a PNG. Size, Click Depth, Travel, Hold, Tilt, Press, Ripple Size, Shadow and both colours live on one "Sowveil Cursor Control" null — scale the cursor from there.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE CURSOR', function () { call('cursor', BUILD.cursor(S.cfg)); }));
        }));

        box.appendChild(block('hover', ICONS.hover, 'Proximity Hover', 'buttons lift as the cursor comes near', function (b) {
            b.appendChild(row(numField('hvRadius', 'Radius px', 10, 3000, 10, 'How close the pointer has to be'), numField('hvLift', 'Lift px', -200, 200, 1)));
            b.appendChild(row(numField('hvGrow', 'Grow %', -50, 100, 1), check('hvShadow', 'Deeper shadow')));
            b.appendChild(hint('Select the buttons or cards. They react to the Sowveil Cursor if the comp has one, otherwise to a new "Hover Pointer" null you can animate. Pick any other layer as the pointer on the "Sowveil Hover Control" null.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('MAKE HOVER', function () { call('hover', BUILD.hover(S.cfg)); }));
        }));

        box.appendChild(block('text', ICONS.text, 'Text Animations', 'sweep · letters · words · scramble · typing', function (b) {
            b.appendChild(previewBox());
            b.appendChild(label('Style'));
            b.appendChild(seg('txMode', [['letters', 'Letters'], ['words', 'Words'], ['color', 'Colour'], ['scramble', 'Scramble'], ['typing', 'Typing'], ['colortype', 'Colour typing']]));
            var a = row(numField('txDur', 'Duration s', 0.1, 10, 0.1), numField('txRise', 'Rise px', -500, 500, 5, 'Letters/words start this far down')); a.id = 'saasfx-tx-anim';
            b.appendChild(a);
            var c = row(well('txColor', 'Accent colour')); c.id = 'saasfx-tx-color';
            b.appendChild(c);
            var t = row(numField('txCps', 'Chars / s', 1, 200, 1), check('txCaret', 'Blinking caret')); t.id = 'saasfx-tx-typing';
            b.appendChild(t);
            b.appendChild(hint('Works on the selected text layers and keeps their styling. Typing is an expression: edit the words later and it retypes them.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('APPLY TO TEXT', function () { call('textAnim', BUILD.textAnim(S.cfg)); }));
        }));

        box.appendChild(block('glyphs', ICONS.glyphs, 'Code Glyphs', 'editable template · headline in < > · flicker', function (b) {
            b.appendChild(glyphPreviewBox());
            b.appendChild(label('Headline'));
            b.appendChild(textInput('gyHead', 'Sowveil Ecosystem | will replace everyone', 120, false));
            b.appendChild(hint('"|" starts the next phrase. Words in a phrase build up one by one. Leave Code lines empty for none.'));
            b.appendChild(label('Glyphs'));
            b.appendChild(textInput('gyGlyphs', '/ / / < > * - | \\', 120, false));
            b.appendChild(label('Code lines'));
            b.appendChild(textInput('gyCodeText', 'one line of code per line', 2000, true));
            b.appendChild(label('Palette'));
            b.appendChild(seg('gyPal', [['mint', 'Mint'], ['paper', 'Paper'], ['night', 'Night'], ['accent', 'Accent']]));
            b.appendChild(row(numField('gyCount', 'Glyphs', 4, 48, 1, 'How many glyph layers the template gets'), numField('gyDensity', 'Density %', 5, 100, 5, 'Share of glyphs showing at once')));
            b.appendChild(row(numField('gyRate', 'Flicker / s', 0.5, 30, 0.5, 'How often the glyphs change'), numField('gyDur', 'Length s', 2, 120, 1, 'Length of the template comp')));
            b.appendChild(row(check('gyCode', 'Typed code lines'), check('gyBg', 'Background')));
            b.appendChild(hint('Builds an editable "Sowveil Code Glyphs" comp and drops it at the playhead. Edit the Headline Text, Glyph Set and Code Lines layers inside it (or in Essential Graphics); timings follow the words automatically, and every count, colour and speed is on the "Glyph Control" null. Move that null to move the whole effect.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE TEMPLATE', function () { call('codeGlyphs', BUILD.codeGlyphs(S.cfg)); }));
        }));

        box.appendChild(block('prompt', ICONS.prompt, 'AI Prompt Bar', 'editable template · types, listens, sends', function (b) {
            b.appendChild(label('Prompt'));
            b.appendChild(plainInput('pbText', 'create a landing page for my business', 200));
            b.appendChild(label('Placeholder'));
            b.appendChild(plainInput('pbHint', 'Ask anything...', 80));
            b.appendChild(row(numField('pbCps', 'Chars / s', 2, 80, 1)));
            b.appendChild(hint('A glass prompt pill in your accent colour: pops in, types the prompt with a caret, the mic bars move while it types, then the send button presses. Words and colours are in Essential Graphics and on "Prompt Control".'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE PROMPT BAR', function () { call('promptBar', BUILD.promptBar(S.cfg)); }));
        }));

        box.appendChild(block('halftone', ICONS.halftone, 'Halftone Wave', 'dot shockwave from a layer · glow', function (b) {
            var pv = el('div', 'sf-pv');
            var cv = el('canvas', 'sf-hw-canvas'); cv.id = 'saasfx-hw-canvas';
            cv.setAttribute('data-tooltip', 'Click to replay');
            cv.onclick = function () { restartWave(); };
            pv.appendChild(cv);
            b.appendChild(pv);
            b.appendChild(row(well('hwColor', 'Dot colour'), check('hwGlow', 'Glow')));
            b.appendChild(label('With a layer selected'));
            b.appendChild(seg('hwClip', [['inside', 'Inside the layer'], ['behind', 'Behind the layer']]));
            b.appendChild(label('Waves'));
            b.appendChild(seg('hwWaves', [['1', '1 wave'], ['2', '2 waves'], ['3', '3 waves']]));
            b.appendChild(row(numField('hwDur', 'Duration s', 0.2, 10, 0.1), numField('hwGap', 'Gap s', 0.05, 3, 0.05, 'Time between waves')));
            b.appendChild(row(numField('hwRing', 'Ring px', 4, 1000, 5), numField('hwSoft', 'Softness', 0, 400, 5)));
            b.appendChild(row(numField('hwSpacing', 'Dot spacing', 6, 200, 1), numField('hwDot', 'Dot size %', 10, 100, 1)));
            b.appendChild(row(numField('hwDistort', 'Distortion', 0, 400, 5)));
            b.appendChild(hint('Select the layer the wave comes out of: a shape, text, logo or button (or nothing for the comp centre). Inside the layer = the dots are track-matted to it and the layer stays visible. Sizes are for 1080p and scale with the comp; every setting stays live on the Wave Control null and in Essential Graphics.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE WAVE', function () { call('halftoneWave', BUILD.halftoneWave(S.cfg)); }));
        }));

        box.appendChild(block('carousel', ICONS.carousel, 'UI Carousel', 'cards slide through, focus card full size', function (b) {
            b.appendChild(row(numField('caHold', 'Hold s', 0, 20, 0.1, 'Time each card stays in focus'), numField('caMove', 'Move s', 0.05, 10, 0.05)));
            b.appendChild(row(numField('caGap', 'Gap px', -500, 2000, 5), numField('caFocus', 'Focus %', 10, 300, 1)));
            b.appendChild(row(numField('caSide', 'Side %', 10, 300, 1), numField('caSideOp', 'Side opacity %', 0, 100, 1)));
            b.appendChild(row(check('caLoop', 'Loop round')));
            b.appendChild(hint('Select the cards (left to right is the order). Move the whole carousel with the "Sowveil Carousel Control" null; Start Card picks which card is first in focus.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE CAROUSEL', function () { call('carousel', BUILD.carousel(S.cfg)); }));
        }));

        box.appendChild(block('attach', ICONS.attach, 'Attach Layer', 'follow another layer without parenting', function (b) {
            b.appendChild(row(check('atRot', 'Follow rotation'), check('atScale', 'Follow scale')));
            b.appendChild(hint('Select the layer to follow FIRST, then the layers that should stick to it. They keep their offset and their own animation; change the target later on "Attach To".'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('ATTACH', function () { call('attach', BUILD.attach(S.cfg)); }));
        }));

        box.appendChild(block('background', ICONS.background, 'Background', 'animated gradient with drift + grain', function (b) {
            b.appendChild(label('Style'));
            b.appendChild(seg('bgStyle', [['drift', 'Drift'], ['horizon', 'Horizon'], ['stars', 'Stars']]));
            b.appendChild(label('Palette'));
            b.appendChild(seg('bgPalette', [['aurora', 'Aurora'], ['violet', 'Violet'], ['sunset', 'Sunset'], ['ocean', 'Ocean'], ['forest', 'Forest'], ['mono', 'Mono'], ['accent', 'Accent']]));
            b.appendChild(row(numField('bgSpeed', 'Drift speed', 0, 10, 0.1), numField('bgAmount', 'Drift px', 0, 2000, 10)));
            b.appendChild(row(check('bgGrain', 'Film grain'), check('bgClip', 'Clip to selected layer')));
            b.appendChild(hint('A full-frame solid with a four-colour gradient that slowly drifts. Speed and amount live on the layer; "Accent" builds the palette from your panel colour. Clip to selected layer: the gradient fills the selected shape or text through a track matte, and the layer stays visible.'));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE BACKGROUND', function () { call('background', BUILD.background(S.cfg)); }));
        }));

        box.appendChild(block('wipe', ICONS.wipe, 'Gradient Wipe', 'feathered directional reveal', function (b) {
            b.appendChild(label('From'));
            b.appendChild(seg('wpDir', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']]));
            b.appendChild(row(numField('wpDur', 'Duration s', 0.1, 10, 0.1), numField('wpFeather', 'Feather', 0, 2000, 10)));
            b.appendChild(row(numField('wpDelay', 'Stagger s', 0, 5, 0.02, 'Delay between layers, top to bottom')));
            b.appendChild(el('div', 'sf-go')).appendChild(goButton('CREATE WIPE', function () { call('wipe', BUILD.wipe(S.cfg)); }));
        }));

        box.appendChild(block('glass', ICONS.glass, 'Glass Panel', 'the Sowveil glass morph card', function (b) {
            b.appendChild(hint('Select a layer and press GLASS. Shift: glass from the selected shape layers. Alt/Option: the native Liquid Glass plug-in.'));
            var go = el('div', 'sf-go');
            go.appendChild(goButton('GLASS', function (ev) {
                if (ev && ev.altKey && typeof window.applyNativeAkiraGlass === 'function') { window.applyNativeAkiraGlass(); return; }
                if (typeof window.run !== 'function') { return; }
                if (ev && ev.shiftKey) { window.run('applyGlassMorphShape'); } else { window.run('applyGlassMorph'); }
            }));
            var rm = goButton('REMOVE', function () { if (typeof window.run === 'function') { window.run('removeGlassMorph'); } });
            rm.className = 'sf-btn danger';
            go.appendChild(rm);
            b.appendChild(go);
        }));

        var st = el('div', 'sf-status'); st.id = 'saasfx-status';
        box.appendChild(st);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        if (S.cfg.openBlock) { var first = overlay.querySelector('.sf-block[data-block="' + S.cfg.openBlock + '"]'); if (first) { first.classList.add('open'); } }
        refreshVisibility();
        return overlay;
    }

    

    function buildRow() {
        var hlBtn = document.querySelector('#preset-master-grid .preset-btn[onclick*="openHighlighterSettings"]');
        var hlRow = hlBtn ? hlBtn.parentNode : null;
        var grid = byId('preset-master-grid');
        if (!grid) { return null; }
        var r = el('div');
        r.id = 'saasfx-row';
        r.setAttribute('style', 'display:flex; gap:6px; width:100%; grid-column: 1 / -1;');
        var main = el('div', 'preset-item preset-btn');
        main.setAttribute('style', 'flex:1;');
        main.setAttribute('data-tooltip', 'SaaS demo rigs: stagger, depth reveal, cursor, hover, text, code glyphs, prompt bar, halftone wave, carousel, attach, background, wipe, glass');
        main.setAttribute('data-tags', 'saas effects product demo ui stagger depth reveal cursor click text animation typing scramble gradient background wipe glass halftone wave dots shockwave ripple hover proximity carousel attach follow prompt bar ai chat input bounce coloured typing horizon stars software');
        main.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 4h16v12H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20h8M12 16v4" stroke="currentColor" stroke-width="2"/><path d="M7 8h6v2H7zM7 11.5h10v2H7z" fill="currentColor"/></svg><div class="preset-text">UI MOTION KIT</div>';
        main.onclick = function () { open(); };
        var quick = el('div', 'preset-item preset-btn');
        quick.setAttribute('style', 'width:36px; flex-shrink:0; padding:0; justify-content:center;');
        quick.setAttribute('data-tooltip', 'Stagger the selected layers with the saved settings');
        quick.setAttribute('data-tags', 'stagger quick reveal');
        quick.innerHTML = '<svg viewBox="0 0 24 24" style="margin:0;"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg>';
        quick.onclick = function (ev) { if (ev) { ev.stopPropagation(); } call('stagger', BUILD.stagger(S.cfg)); };
        r.appendChild(main); r.appendChild(quick);
        if (hlRow && hlRow.parentNode === grid) { grid.insertBefore(r, hlRow); }
        else { grid.appendChild(r); }
        return r;
    }

    function open() {
        if (!S) { return; }
        if (!byId(MODAL)) { buildModal(); }
        if (typeof window.openModal === 'function') { window.openModal(MODAL); } else { byId(MODAL).classList.add('active'); }
        status('');
        refreshVisibility();
    }

    

    function inject() {
        if (S) { return true; }
        if (!byId('preset-master-grid')) { return false; }
        S = { cfg: load(), row: null };
        var style = el('style'); style.id = STYLE_ID; style.textContent = css();
        (document.head || document.documentElement).appendChild(style);
        S.row = buildRow();
        return !!S.row;
    }

    function restore() {
        if (!S) { return false; }
        var m = byId(MODAL), st = byId(STYLE_ID);
        if (m && m.parentNode) { m.parentNode.removeChild(m); }
        if (st && st.parentNode) { st.parentNode.removeChild(st); }
        if (S.row && S.row.parentNode) { S.row.parentNode.removeChild(S.row); }
        S = null;
        return true;
    }

    window.SowveilUIKit = {
        version: VERSION,
        inject: inject,
        restore: restore,
        open: open,
        payload: function (rig) { return S && BUILD[rig] ? BUILD[rig](S.cfg) : ''; },
        config: function () { return S ? S.cfg : null; }
    };

    function boot(tries) {
        try { if (localStorage.getItem('akira_saasfx_off') === '1') { return; } } catch (e) { }
        if (inject()) { return; }
        if (tries > 60) { return; }
        setTimeout(function () { boot(tries + 1); }, 500);
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { boot(0); }); }
    else { boot(0); }
})();
