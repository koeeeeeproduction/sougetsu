/* Sowveil - Downloader tab. Uses yt-dlp (fetched once into ~/Sowveil/bin, or found on PATH),
   runs it through Node, shows progress, then imports the file into After Effects. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var cp = SV.node('child_process'), fs = SV.node('fs'), path = SV.node('path'), os = SV.node('os'), https = SV.node('https');
    var IS_WIN = os ? os.platform() === 'win32' : /Win/.test(navigator.platform);
    var BIN_DIR = os && path ? path.join(os.homedir(), 'Sowveil', 'bin') : '';
    var YT_NAME = IS_WIN ? 'yt-dlp.exe' : 'yt-dlp_macos';
    var tools = { yt: null, ffmpeg: null, checked: false };
    var job = null;

    var Q = { id: 'quality', label: 'Quality', type: 'select', def: '1080', options: [['best', 'Best available'], ['2160', '4K'], ['1440', '1440p'], ['1080', '1080p'], ['720', '720p'], ['480', '480p']] };
    var COMMON = [
        { id: 'importIt', label: 'Import into project', type: 'toggle', def: true },
        { id: 'addToComp', label: 'Add to active comp', type: 'toggle', def: false }
    ];
    var PRESETS = [
        { id: 'video', label: 'Video', subtitle: 'MP4, up to 4K', params: [Q].concat(COMMON) },
        { id: 'audio', label: 'Audio only', subtitle: 'M4A or MP3', params: [{ id: 'audioFormat', label: 'Format', type: 'seg', def: 'm4a', options: [['m4a', 'M4A'], ['mp3', 'MP3']] }].concat(COMMON) },
        { id: 'thumbnail', label: 'Thumbnail', subtitle: 'Cover image', params: COMMON.slice(0, 1) }
    ];

    // ---------- tools ----------
    function run(cmd, args, cb) {
        try {
            var p = cp.spawn(cmd, args, { windowsHide: true }), out = '';
            p.stdout.on('data', function (d) { out += d; }); p.stderr.on('data', function (d) { out += d; });
            p.on('error', function () { cb(false, ''); }); p.on('close', function (code) { cb(code === 0, out); });
        } catch (e) { cb(false, ''); }
    }
    function detect(cb) {
        if (!cp) { tools.checked = true; cb(); return; }
        var local = path.join(BIN_DIR, YT_NAME), ffLocal = path.join(BIN_DIR, IS_WIN ? 'ffmpeg.exe' : 'ffmpeg');
        var pending = 2;
        function done() { if (--pending === 0) { tools.checked = true; cb(); } }
        if (fs.existsSync(local)) { tools.yt = local; done(); }
        else { run('yt-dlp', ['--version'], function (ok) { tools.yt = ok ? 'yt-dlp' : null; done(); }); }
        if (fs.existsSync(ffLocal)) { tools.ffmpeg = ffLocal; done(); }
        else { run('ffmpeg', ['-version'], function (ok) { tools.ffmpeg = ok ? 'ffmpeg' : null; done(); }); }
    }
    function fetchTo(url, dest, onPct, cb, hops) {
        hops = hops || 0;
        https.get(url, { headers: { 'User-Agent': 'Sowveil' } }, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 6) { res.resume(); fetchTo(res.headers.location, dest, onPct, cb, hops + 1); return; }
            if (res.statusCode !== 200) { res.resume(); cb('Download failed (HTTP ' + res.statusCode + ')'); return; }
            var total = parseInt(res.headers['content-length'], 10) || 0, got = 0, tmp = dest + '.part', out = fs.createWriteStream(tmp);
            res.on('data', function (d) { got += d.length; if (total) { onPct(got / total * 100); } });
            res.pipe(out);
            out.on('finish', function () { out.close(function () { try { fs.renameSync(tmp, dest); if (!IS_WIN) { fs.chmodSync(dest, 493); } cb(null); } catch (e) { cb(e.message); } }); });
            out.on('error', function (e) { cb(e.message); });
        }).on('error', function (e) { cb(e.message); });
    }
    function installYt(onPct, cb) {
        try { fs.mkdirSync(BIN_DIR, { recursive: true }); } catch (e) { }
        var dest = path.join(BIN_DIR, YT_NAME);
        fetchTo('https://github.com/yt-dlp/yt-dlp/releases/latest/download/' + YT_NAME, dest, onPct, function (err) { if (!err) { tools.yt = dest; } cb(err); });
    }

    // ---------- download ----------
    function outDir() {
        var d = SV.get('dlDir', '');
        if (!d && os && path) { d = path.join(os.homedir(), 'Documents', 'Sowveil Downloads'); }
        return d;
    }
    function buildArgs(kind, v, dir, url) {
        var a = ['--no-playlist', '--newline', '--progress', '--no-mtime', '-o', path.join(dir, '%(title).80s [%(id)s].%(ext)s')];
        if (tools.ffmpeg && tools.ffmpeg !== 'ffmpeg') { a.push('--ffmpeg-location', tools.ffmpeg); }
        if (kind === 'video') {
            var cap = v.quality === 'best' ? '' : '[height<=' + v.quality + ']';
            if (tools.ffmpeg) { a.push('-f', 'bv*' + cap + '[ext=mp4]+ba[ext=m4a]/bv*' + cap + '+ba/b' + cap, '--merge-output-format', 'mp4'); }
            else { a.push('-f', 'b' + cap + '[ext=mp4]/b[ext=mp4]/b'); }
        } else if (kind === 'audio') {
            if (v.audioFormat === 'mp3' && tools.ffmpeg) { a.push('-f', 'ba/b', '-x', '--audio-format', 'mp3'); }
            else { a.push('-f', 'ba[ext=m4a]/ba'); }
        } else {
            a.push('--skip-download', '--write-thumbnail');
            if (tools.ffmpeg) { a.push('--convert-thumbnails', 'jpg'); }
        }
        a.push('--print', 'after_move:filepath', url);
        return a;
    }
    function newestFile(dir, since) {
        var best = null, bt = since;
        try { fs.readdirSync(dir).forEach(function (n) { if (/\.(part|ytdl|temp)$/i.test(n)) { return; } var p = path.join(dir, n), t = fs.statSync(p).mtimeMs; if (t >= bt) { bt = t; best = p; } }); } catch (e) { }
        return best;
    }
    function start(kind, v, url, ui) {
        var dir = outDir();
        try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
        var since = Date.now() - 1000, finalPath = null, log = '';
        ui.set(0, 'Starting…');
        var p = cp.spawn(tools.yt, buildArgs(kind, v, dir, url), { windowsHide: true });
        job = p;
        function line(s) {
            log += s + '\n'; ui.log(log.split('\n').slice(-40).join('\n'));
            var m = /\[download\]\s+([\d.]+)%/.exec(s);
            if (m) { ui.set(parseFloat(m[1]), 'Downloading ' + m[1] + '%'); }
            else if (/\[Merger\]|\[ExtractAudio\]|\[ThumbnailsConvertor\]/.test(s)) { ui.set(99, 'Processing…'); }
            else if (/^([A-Za-z]:[\\/]|\/)/.test(s.trim()) && fs.existsSync(s.trim())) { finalPath = s.trim(); }
        }
        var buf = '';
        function feed(d) { buf += d; var parts = buf.split(/\r?\n|\r/); buf = parts.pop(); parts.forEach(line); }
        p.stdout.on('data', feed); p.stderr.on('data', feed);
        p.on('error', function (e) { job = null; ui.fail('Could not start the downloader: ' + e.message); });
        p.on('close', function (code) {
            job = null; if (buf) { line(buf); }
            if (code !== 0) { ui.fail(code === null ? 'Cancelled.' : 'Download failed - see the log below.'); return; }
            var file = finalPath || newestFile(dir, since);
            if (!file) { ui.fail('Finished, but the file could not be found in ' + dir); return; }
            var recent = SV.get('dlRecent', []); recent.unshift({ path: file, name: path.basename(file), kind: kind, at: Date.now() }); SV.set('dlRecent', recent.slice(0, 12));
            ui.set(100, 'Saved ' + path.basename(file));
            if (v.importIt || v.addToComp) {
                SV.call('importMedia', { path: file, addToComp: !!v.addToComp }).then(function (r) { SV.result(r); ui.done(); });
            } else { SV.toast('Saved to ' + dir); ui.done(); }
        });
    }

    // ---------- UI ----------
    SV.registerTab({
        id: 'downloader', label: 'Downloader', icon: 'download',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            if (!cp) {
                el.appendChild(h('div', { class: 'empty', text: 'The downloader runs inside After Effects (it needs the panel\'s Node.js access).' }));
                return;
            }
            var url = h('input', { class: 'txt-in', placeholder: 'Paste a video link (YouTube, Vimeo, X, TikTok…)', value: SV.get('dlUrl', '') });
            url.addEventListener('input', function () { SV.set('dlUrl', url.value); });
            var paste = h('button', { class: 'btn ghost small', text: 'Paste', onclick: function () { try { navigator.clipboard.readText().then(function (t) { url.value = t.trim(); SV.set('dlUrl', url.value); }); } catch (e) { } } });
            el.appendChild(SV.ui.section('Link', [h('div', { style: { display: 'flex', gap: '6px' } }, [url, paste])]));
            el.appendChild(SV.ui.params('downloader', item, v));

            var dirLbl = h('div', { class: 'hint', style: { marginTop: 0, wordBreak: 'break-all' }, text: outDir() });
            var pick = h('button', { class: 'btn ghost small', text: 'Change…', onclick: function () {
                SV.call('pickFolder', { prompt: 'Save downloads to' }).then(function (r) { if (r.ok) { SV.set('dlDir', r.path); dirLbl.textContent = r.path; } });
            } });
            el.appendChild(SV.ui.section('Save to', [h('div', { class: 'row' }, [dirLbl, pick])]));

            var bar = h('i'), prog = h('div', { class: 'progress' }, [bar]), stat = h('div', { class: 'hint', text: '' }), logEl = h('div', { class: 'log', hidden: true });
            var toolNote = h('div', { class: 'hint' });
            var go = h('button', { class: 'btn block', text: 'Download' }), cancel = h('button', { class: 'btn ghost block', text: 'Cancel', style: { marginTop: '8px', display: 'none' } });
            var ui = {
                set: function (p, s) { bar.style.width = p + '%'; stat.textContent = s; },
                log: function (s) { logEl.hidden = false; logEl.textContent = s; logEl.scrollTop = 1e9; },
                fail: function (s) { stat.textContent = s; SV.toast(s, 'error'); ui.done(); },
                done: function () { go.disabled = false; go.textContent = 'Download'; cancel.style.display = 'none'; drawRecent(); }
            };
            function refreshTools() {
                toolNote.textContent = !tools.checked ? 'Checking downloader…'
                    : !tools.yt ? 'First download installs yt-dlp (about 15 MB, one time).'
                        : tools.ffmpeg ? 'yt-dlp + ffmpeg ready: full quality and MP3 available.'
                            : 'yt-dlp ready. Install ffmpeg for 1080p+ merges and MP3 (otherwise best single-file quality is used).';
            }
            go.addEventListener('click', function () {
                var u = url.value.trim();
                if (!/^https?:\/\//i.test(u)) { SV.toast('Paste a full link starting with https://', 'error'); return; }
                go.disabled = true; go.textContent = 'Working…'; cancel.style.display = '';
                var begin = function () { start(item.id, v, u, ui); };
                if (tools.yt) { begin(); return; }
                ui.set(0, 'Installing yt-dlp…');
                installYt(function (p) { ui.set(p, 'Installing yt-dlp… ' + Math.round(p) + '%'); }, function (err) {
                    refreshTools();
                    if (err) { ui.fail('Could not install yt-dlp: ' + err); return; }
                    begin();
                });
            });
            cancel.addEventListener('click', function () { if (job) { try { job.kill(); } catch (e) { } } });
            el.appendChild(SV.ui.section('', [go, cancel, h('div', { style: { height: '10px' } }), prog, stat, logEl, toolNote,
                h('div', { class: 'hint', text: 'Only download media you own or have permission to use.' })]));

            var recentWrap = h('div');
            function drawRecent() {
                var list = SV.get('dlRecent', []); recentWrap.innerHTML = '';
                if (!list.length) { recentWrap.appendChild(h('div', { class: 'hint', text: 'Nothing downloaded yet.' })); return; }
                list.forEach(function (r) {
                    var exists = fs.existsSync(r.path);
                    recentWrap.appendChild(h('div', { class: 'row', style: { opacity: exists ? 1 : 0.45 } }, [
                        h('span', { style: { fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }, text: r.name, title: r.path }),
                        h('span', { style: { display: 'flex', gap: '4px', flex: 'none' } }, exists ? [
                            h('button', { class: 'btn ghost small', text: 'Import', onclick: function () { SV.call('importMedia', { path: r.path, addToComp: false }).then(function (x) { SV.result(x); }); } }),
                            h('button', { class: 'btn ghost small', text: 'Show', onclick: function () { SV.call('revealFile', { path: r.path }); } })
                        ] : [h('span', { class: 'hint', text: 'missing' })])
                    ]));
                });
            }
            el.appendChild(SV.ui.section('Recent', [recentWrap]));
            drawRecent(); refreshTools();
            if (!tools.checked) { detect(refreshTools); }
        }
    });
})();
