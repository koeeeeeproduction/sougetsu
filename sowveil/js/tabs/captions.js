/* Sowveil - Auto Captions: transcribe a layer (or file) locally with Whisper (sowveil/py/autocaptions.py),
   edit the text, pick a style, build one tidy captions layer with word-by-word highlight. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var cp = SV.node('child_process'), fs = SV.node('fs'), path = SV.node('path'), os = SV.node('os');
    var IS_WIN = os ? os.platform() === 'win32' : false;
    var env = { py: null, whisper: false, ffmpeg: false, checked: false };
    var state = { src: SV.get('capSrc', null), blocks: SV.get('capBlocks', []), proc: null };

    var STYLES = [
        { id: 'clean', label: 'Clean', s: { font: 'Arial-BoldMT', size: 64, color: '#ffffff', highlight: true, highlightColor: '#ffd60a', highlightScale: 0, stroke: false, box: false, caps: false, anim: 'pop', y: 82 } },
        { id: 'bold', label: 'Bold Pop', s: { font: 'Arial-BoldMT', size: 78, color: '#ffffff', highlight: true, highlightColor: '#ffd60a', highlightScale: 12, stroke: true, strokeColor: '#000000', strokeWidth: 8, box: false, caps: true, anim: 'pop', y: 78 } },
        { id: 'boxed', label: 'Boxed', s: { font: 'Arial-BoldMT', size: 58, color: '#ffffff', highlight: true, highlightColor: '#8b7dff', highlightScale: 0, stroke: false, box: true, boxColor: '#000000', boxOpacity: 75, radius: 14, anim: 'rise', y: 84 } },
        { id: 'karaoke', label: 'Karaoke', s: { font: 'Arial-BoldMT', size: 66, color: '#9a9aa2', highlight: true, highlightColor: '#3cffb0', highlightScale: 6, stroke: false, box: false, caps: false, anim: 'fade', y: 82 } },
        { id: 'minimal', label: 'Minimal', s: { font: 'ArialMT', size: 48, color: '#f2f2f2', highlight: false, stroke: false, box: false, caps: false, anim: 'fade', y: 88 } }
    ];
    function style() { var id = SV.get('capStyle', 'clean'), base = STYLES.filter(function (x) { return x.id === id; })[0] || STYLES[0]; return Object.assign({}, base.s, SV.get('capOver:' + base.id, {})); }
    function setStyle(k, v) { var id = SV.get('capStyle', 'clean'), o = SV.get('capOver:' + id, {}); o[k] = v; SV.set('capOver:' + id, o); }

    // ---------- environment ----------
    function run(cmd, args, cb, opts) {
        try {
            var p = cp.spawn(cmd, args, Object.assign({ windowsHide: true }, opts || {})), out = '';
            p.stdout.on('data', function (d) { out += d; }); p.stderr.on('data', function (d) { out += d; });
            p.on('error', function () { cb(false, out); }); p.on('close', function (code) { cb(code === 0, out); });
            return p;
        } catch (e) { cb(false, ''); return null; }
    }
    function spawnEnv() {
        var e = Object.assign({}, process.env), bin = path.join(os.homedir(), 'Sowveil', 'bin'), sep = IS_WIN ? ';' : ':';
        var extra = [bin].concat(IS_WIN ? [] : ['/opt/homebrew/bin', '/usr/local/bin']);
        e.PATH = extra.join(sep) + sep + (e.PATH || e.Path || ''); e.Path = e.PATH; e.PYTHONIOENCODING = 'utf-8';
        return e;
    }
    function detect(cb) {
        if (!cp) { env.checked = true; cb(); return; }
        var cands = IS_WIN ? ['py', 'python', 'python3'] : ['python3', '/opt/homebrew/bin/python3', '/usr/local/bin/python3', 'python'];
        (function next(i) {
            if (i >= cands.length) { env.py = null; env.whisper = false; ffm(); return; }
            run(cands[i], ['-c', 'import sys; print(sys.version_info[0])'], function (ok, out) {
                if (!ok || String(out).trim().charAt(0) !== '3') { next(i + 1); return; }
                env.py = cands[i];
                run(env.py, ['-c', 'import whisper; print("ok")'], function (ok2) { env.whisper = ok2; ffm(); }, { env: spawnEnv() });
            }, { env: spawnEnv() });
        })(0);
        function ffm() { run('ffmpeg', ['-version'], function (ok) { env.ffmpeg = ok; env.checked = true; cb(); }, { env: spawnEnv() }); }
    }
    function scriptPath() {
        var d = SV.cs.getSystemPath(SystemPath.EXTENSION);
        try { d = decodeURIComponent(d); } catch (e) { }
        d = d.replace(/^file:[\/\\]+/i, IS_WIN ? '' : '/');
        return path.join(d, 'py', 'autocaptions.py');
    }

    // ---------- words -> caption blocks ----------
    function blocksFrom(json, maxWords, scale) {
        var words = [];
        (json.segments || []).forEach(function (sg) {
            if (sg.words && sg.words.length) { sg.words.forEach(function (w) { words.push({ w: String(w.word || '').trim(), s: +w.start, e: +w.end, seg: sg }); }); }
            else {
                var parts = String(sg.text || '').trim().split(/\s+/).filter(Boolean), d = (sg.end - sg.start) / Math.max(1, parts.length);
                parts.forEach(function (p, i) { words.push({ w: p, s: sg.start + i * d, e: sg.start + (i + 1) * d, seg: sg }); });
            }
        });
        var out = [], cur = null;
        words.forEach(function (w, i) {
            if (!w.w) { return; }
            var gap = cur ? w.s - cur.end : 0;
            if (!cur || cur.words.length >= maxWords || gap > 0.6 || (i && w.seg !== words[i - 1].seg && cur.words.length >= Math.ceil(maxWords / 2))) {
                cur = { text: '', start: w.s * scale, end: w.e * scale, words: [] }; out.push(cur);
            }
            cur.text = (cur.text ? cur.text + ' ' : '') + w.w; cur.words.push(w.s * scale); cur.end = w.e * scale;
        });
        return out;
    }
    function fmt(t) { var m = Math.floor(t / 60), s = (t - m * 60).toFixed(1); return m + ':' + (s < 10 ? '0' : '') + s; }

    // ---------- UI ----------
    function render(root) {
        root.innerHTML = '';
        if (!cp) { root.appendChild(h('div', { class: 'empty', text: 'Auto Captions runs inside After Effects (it needs the panel\'s Node.js access to run Whisper).' })); return; }

        // 1. source
        var srcLbl = h('div', { class: 'hint', style: { marginTop: 0, wordBreak: 'break-all' } });
        function drawSrc() { srcLbl.textContent = state.src ? state.src.name + (state.src.layer ? ' (layer, starts at ' + fmt(state.src.startTime) + ')' : ' (file)') : 'No source yet.'; }
        root.appendChild(SV.ui.section('1 · Source', [srcLbl, h('div', { style: { display: 'flex', gap: '6px', marginTop: '8px' } }, [
            h('button', { class: 'btn small', text: 'Use selected layer', onclick: function () {
                SV.call('mediaInfo', {}).then(function (r) { if (!r.ok) { SV.toast(r.error, 'error'); return; } state.src = { path: r.path, name: r.name, layer: true, startTime: r.startTime, stretch: r.stretch || 100 }; SV.set('capSrc', state.src); drawSrc(); });
            } }),
            h('button', { class: 'btn ghost small', text: 'Choose file…', onclick: function () {
                SV.call('pickFile', { prompt: 'Choose video or audio to transcribe' }).then(function (r) { if (r.ok) { state.src = { path: r.path, name: r.name, layer: false, startTime: 0, stretch: 100 }; SV.set('capSrc', state.src); drawSrc(); } });
            } })
        ])]));
        drawSrc();

        // 2. transcribe
        var model = SV.ui.param({ type: 'select', label: 'Model', options: [['tiny', 'Tiny (fastest)'], ['base', 'Base'], ['small', 'Small'], ['medium', 'Medium'], ['turbo', 'Turbo (best speed/quality)'], ['large', 'Large (best)']] }, SV.get('capModel', 'turbo'), function (v) { SV.set('capModel', v); });
        var lang = SV.ui.param({ type: 'select', label: 'Language', options: [['auto', 'Auto detect'], ['en', 'English'], ['ru', 'Russian'], ['kk', 'Kazakh'], ['uk', 'Ukrainian'], ['es', 'Spanish'], ['de', 'German'], ['fr', 'French'], ['pt', 'Portuguese'], ['tr', 'Turkish'], ['ar', 'Arabic'], ['hi', 'Hindi'], ['ja', 'Japanese'], ['ko', 'Korean'], ['zh', 'Chinese']] }, SV.get('capLang', 'auto'), function (v) { SV.set('capLang', v); });
        var words = SV.ui.param({ type: 'number', label: 'Words per caption', min: 1, max: 12, step: 1 }, SV.get('capWords', 3), function (v) { SV.set('capWords', v); });
        var envNote = h('div', { class: 'hint' }), bar = h('i'), prog = h('div', { class: 'progress', hidden: true }, [bar]), logEl = h('div', { class: 'log', hidden: true });
        var installBtn = h('button', { class: 'btn ghost small', hidden: true }), go = h('button', { class: 'btn block', text: 'Transcribe' });
        var cancel = h('button', { class: 'btn ghost block', text: 'Cancel', style: { display: 'none', marginTop: '8px' } });
        function drawEnv() {
            installBtn.hidden = true;
            if (!env.checked) { envNote.textContent = 'Checking Python + Whisper…'; return; }
            if (!env.py) { envNote.innerHTML = '<b>Python 3 is not installed.</b> Install it from python.org (tick "Add to PATH"), then reopen the panel.'; return; }
            if (!env.whisper) { envNote.textContent = 'Whisper is not installed yet (one-time, ~1-2 GB with its AI model).'; installBtn.textContent = 'Install Whisper'; installBtn.hidden = false; return; }
            if (!env.ffmpeg) { envNote.textContent = 'ffmpeg is missing - Whisper needs it to read media.'; installBtn.textContent = IS_WIN ? 'Install ffmpeg (winget)' : 'Install ffmpeg (Homebrew)'; installBtn.hidden = false; return; }
            envNote.textContent = 'Ready: Python + Whisper + ffmpeg. Everything runs on this computer.';
        }
        function log(s) { logEl.hidden = false; logEl.textContent = (logEl.textContent + s).slice(-6000); logEl.scrollTop = 1e9; }
        installBtn.addEventListener('click', function () {
            installBtn.disabled = true; prog.hidden = false; bar.style.width = '35%';
            var p = !env.whisper ? [env.py, ['-m', 'pip', 'install', '-U', 'openai-whisper']] : IS_WIN ? ['winget', ['install', '--id', 'Gyan.FFmpeg', '-e', '--silent', '--accept-package-agreements', '--accept-source-agreements']] : ['brew', ['install', 'ffmpeg']];
            log('$ ' + p[0] + ' ' + p[1].join(' ') + '\n');
            var pr = cp.spawn(p[0], p[1], { env: spawnEnv(), windowsHide: true });
            pr.stdout.on('data', function (d) { log(String(d)); }); pr.stderr.on('data', function (d) { log(String(d)); });
            pr.on('error', function (e) { log('\n' + e.message + '\n'); installBtn.disabled = false; });
            pr.on('close', function (code) { installBtn.disabled = false; bar.style.width = '100%'; log('\nexit ' + code + '\n'); env.checked = false; drawEnv(); detect(drawEnv); });
        });
        go.addEventListener('click', function () {
            if (!state.src) { SV.toast('Choose a source first.', 'error'); return; }
            if (!env.py || !env.whisper) { SV.toast('Install Python + Whisper first.', 'error'); return; }
            var tmp = os.tmpdir(), stamp = Date.now(), srt = path.join(tmp, 'sowveil_' + stamp + '.srt'), js = path.join(tmp, 'sowveil_' + stamp + '.json');
            var args = [scriptPath(), '--input', state.src.path, '--output', srt, '--emit-json', js, '--engine', 'local', '--model', SV.get('capModel', 'turbo')];
            if (SV.get('capLang', 'auto') !== 'auto') { args.push('--language', SV.get('capLang', 'auto')); }
            go.disabled = true; go.textContent = 'Transcribing…'; cancel.style.display = ''; prog.hidden = false; bar.style.width = '8%'; logEl.textContent = '';
            log('Model ' + SV.get('capModel', 'turbo') + ' - the first run downloads it.\n');
            var p = state.proc = cp.spawn(env.py, args, { env: spawnEnv(), windowsHide: true });
            function chunk(d) {
                var s = String(d); log(s);
                var m = /(\d{1,3})%/.exec(s); if (m) { bar.style.width = Math.max(10, Math.min(95, +m[1])) + '%'; }
                else if (/-->|\[\d\d:/.test(s)) { bar.style.width = Math.min(90, parseFloat(bar.style.width) + 3) + '%'; }
            }
            p.stdout.on('data', chunk); p.stderr.on('data', chunk);
            p.on('error', function (e) { finish(); SV.toast('Could not start Python: ' + e.message, 'error'); });
            p.on('close', function (code) {
                finish();
                if (code !== 0 || !fs.existsSync(js)) { SV.toast(code === null ? 'Cancelled.' : 'Transcription failed - see the log.', 'error'); return; }
                try {
                    var scale = (state.src.stretch || 100) / 100;
                    state.blocks = blocksFrom(JSON.parse(fs.readFileSync(js, 'utf8')), SV.get('capWords', 3), scale);
                    SV.set('capBlocks', state.blocks); bar.style.width = '100%';
                    SV.toast(state.blocks.length + ' captions ready - edit them, then Build.');
                    drawEdit();
                } catch (e) { SV.toast('Could not read the transcript: ' + e.message, 'error'); }
            });
            function finish() { state.proc = null; go.disabled = false; go.textContent = 'Transcribe'; cancel.style.display = 'none'; }
        });
        cancel.addEventListener('click', function () { if (state.proc) { try { state.proc.kill(); } catch (e) { } } });
        root.appendChild(SV.ui.section('2 · Transcribe', [model, lang, words, h('div', { class: 'row' }, [envNote, installBtn]), go, cancel, h('div', { style: { height: '8px' } }), prog, logEl]));

        // 3. edit
        var editWrap = h('div');
        function drawEdit() {
            editWrap.innerHTML = '';
            if (!state.blocks.length) { editWrap.appendChild(h('div', { class: 'hint', text: 'Transcribe to edit the captions here.' })); return; }
            var list = h('div', { class: 'cap-list' });
            state.blocks.forEach(function (b, i) {
                var inp = h('input', { class: 'txt-in', value: b.text });
                inp.addEventListener('change', function () {
                    var n = inp.value.trim().split(/\s+/).filter(Boolean).length || 1;
                    b.text = inp.value.trim();
                    if (n !== b.words.length) { var d = (b.end - b.start) / n; b.words = []; for (var k = 0; k < n; k++) { b.words.push(b.start + k * d); } }
                    SV.set('capBlocks', state.blocks);
                });
                list.appendChild(h('div', { class: 'cap-row' }, [h('span', { class: 'cap-t', text: fmt(b.start) }), inp,
                    h('button', { class: 'star', title: 'Delete caption', text: '✕', style: { opacity: 1 }, onclick: function () { state.blocks.splice(i, 1); SV.set('capBlocks', state.blocks); drawEdit(); } })]));
            });
            editWrap.appendChild(list);
        }
        root.appendChild(SV.ui.section('3 · Edit text', [editWrap]));
        drawEdit();

        // 4. style + build
        var styleSeg = SV.ui.param({ type: 'seg', label: '', options: STYLES.map(function (s) { return [s.id, s.label]; }) }, SV.get('capStyle', 'clean'), function (v) { SV.set('capStyle', v); drawStyle(); });
        styleSeg.firstChild.remove(); styleSeg.style.flexWrap = 'wrap';
        var pv = h('div', { class: 'preview cap-pv' }), sWrap = h('div');
        var P = [
            { id: 'size', label: 'Size', type: 'number', min: 20, max: 200, step: 1 }, { id: 'color', label: 'Text colour', type: 'color' },
            { id: 'highlight', label: 'Word highlight', type: 'toggle' }, { id: 'highlightColor', label: 'Highlight colour', type: 'color' }, { id: 'highlightScale', label: 'Highlight grow', type: 'number', min: 0, max: 40, step: 1, unit: '%' },
            { id: 'stroke', label: 'Outline', type: 'toggle' }, { id: 'strokeColor', label: 'Outline colour', type: 'color' },
            { id: 'box', label: 'Box behind', type: 'toggle' }, { id: 'boxColor', label: 'Box colour', type: 'color' }, { id: 'boxOpacity', label: 'Box opacity', type: 'number', min: 0, max: 100, step: 1, unit: '%' },
            { id: 'caps', label: 'ALL CAPS', type: 'toggle' }, { id: 'anim', label: 'Entrance', type: 'seg', options: [['pop', 'Pop'], ['rise', 'Rise'], ['fade', 'Fade'], ['none', 'None']] },
            { id: 'y', label: 'Height', type: 'number', min: 5, max: 98, step: 1, unit: '%' }, { id: 'font', label: 'Font (PostScript name)', type: 'text' }
        ];
        var hiTimer = 0;
        function drawStyle() {
            var s = style(); sWrap.innerHTML = '';
            P.forEach(function (p) { sWrap.appendChild(SV.ui.param(Object.assign({}, p), s[p.id] !== undefined ? s[p.id] : (p.type === 'toggle' ? false : p.type === 'color' ? '#000000' : p.type === 'number' ? p.min : ''), function (v) { setStyle(p.id, v); paint(); })); });
            paint();
        }
        function paint() {
            var s = style(), sample = (state.blocks[0] && state.blocks[0].text) || 'your captions look like this';
            pv.innerHTML = '';
            var line = h('div', { class: 'cap-line', style: { top: s.y + '%', fontSize: Math.max(9, s.size * 0.2) + 'px', color: s.color, textTransform: s.caps ? 'uppercase' : 'none',
                webkitTextStroke: s.stroke ? Math.max(0.5, (s.strokeWidth || 6) * 0.08) + 'px ' + (s.strokeColor || '#000') : '0',
                background: s.box ? (s.boxColor || '#000') : 'transparent', opacity: 1, padding: s.box ? '3px 8px' : '0', borderRadius: s.box ? '6px' : '0' } });
            if (s.box) { line.style.background = hexA(s.boxColor || '#000000', (s.boxOpacity === undefined ? 75 : s.boxOpacity) / 100); }
            var spans = sample.split(/\s+/).map(function (w) { var sp = h('span', { text: w + ' ' }); line.appendChild(sp); return sp; });
            pv.appendChild(line);
            clearInterval(hiTimer); var k = 0;
            hiTimer = setInterval(function () {
                spans.forEach(function (sp, i) { var on = s.highlight && i === k % spans.length; sp.style.color = on ? s.highlightColor : ''; sp.style.display = 'inline-block'; sp.style.transform = on && s.highlightScale ? 'scale(' + (1 + s.highlightScale / 100) + ')' : 'none'; });
                k++;
            }, 380);
        }
        function hexA(hx, a) { var r = SV.hexToRgb(hx); return 'rgba(' + Math.round(r[0] * 255) + ',' + Math.round(r[1] * 255) + ',' + Math.round(r[2] * 255) + ',' + a + ')'; }
        var build = SV.ui.action('Build captions in comp', function () {
            if (!state.blocks.length) { SV.toast('Transcribe first.', 'error'); return Promise.resolve(); }
            var off = state.src && state.src.layer ? state.src.startTime : 0;
            return SV.call('buildCaptions', { blocks: state.blocks, offset: off, style: style() }, { timeout: 180000 }).then(function (r) { SV.result(r); });
        });
        root.appendChild(SV.ui.section('4 · Style', [styleSeg, h('div', { style: { height: '8px' } }), pv, sWrap, h('div', { style: { height: '8px' } }), build,
            h('div', { class: 'hint', text: 'Builds one "Sowveil Captions" layer (+ a box layer if on). Captions from a layer line up with that layer automatically.' })]));
        drawStyle();
        var off = SV.on('inspector:leave', function () { clearInterval(hiTimer); off(); });
        if (!env.checked) { detect(drawEnv); } drawEnv();
    }

    SV.registerTab({ id: 'captions', label: 'Auto Captions', icon: 'captions', full: render });
})();
