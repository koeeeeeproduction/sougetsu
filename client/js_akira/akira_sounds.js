/* Sougetsu Akira FX - Sound Lab.
 * Library index: client/sounds/sounds.json (built by tools/build_sounds.py). Sounds play right in the panel; "+" (or a
 * double-click / Shift+Enter) drops the sound into the active comp at the playhead via $._akira.importSound.
 * Quick search: type anywhere in the tab, or press "/" - every word must match the name or category.
 * Keys: up/down select, Enter play, Shift+Enter add to comp, F favourite, Esc clear search.
 * Favourites and recents are stored per machine (localStorage). */
(function () {
    'use strict';
    var FAV = 'akira_sound_favs', REC = 'akira_sound_recent', VOL = 'akira_sound_volume', AUTO = 'akira_sound_autoplay';
    var items = [], favs = load(FAV, {}), recent = load(REC, []), cat = 'All', query = '', sel = -1, shown = [], audio = null, playingId = '', raf = 0;
    function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
    function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function fmt(d) { return d == null ? '' : (d < 10 ? d.toFixed(1) : Math.round(d)) + 's'; }

    var css = document.createElement('style');
    css.textContent = [
        '#view-sounds{flex-direction:column;min-height:0;gap:8px}',
        '.sl-top{display:flex;gap:6px;align-items:center;flex-shrink:0}',
        '.sl-search{flex:1;display:flex;align-items:center;gap:6px;height:32px;padding:0 10px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid var(--glass-border,rgba(255,255,255,.08))}',
        '.sl-search:focus-within{border-color:var(--primary,#00ff55)}',
        '.sl-search svg{width:14px;height:14px;opacity:.6;flex:0 0 auto}',
        '.sl-search input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:12px;font-weight:600;font-family:inherit;user-select:text;-webkit-user-select:text}',
        '.sl-search .k{font-size:9px;color:#777;border:1px solid #444;border-radius:4px;padding:0 4px}',
        '.sl-search .x{cursor:pointer;color:#888;font-size:14px;display:none}.sl-search.has .x{display:block}.sl-search.has .k{display:none}',
        '.sl-count{font-size:9px;color:#777;white-space:nowrap}',
        '.sl-chips{display:flex;gap:4px;overflow-x:auto;flex-shrink:0;padding-bottom:2px;scrollbar-width:none}.sl-chips::-webkit-scrollbar{display:none}',
        '.sl-chip{flex:0 0 auto;height:22px;padding:0 9px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#999;font-size:9px;font-weight:800;font-family:inherit;letter-spacing:.4px;cursor:pointer;text-transform:uppercase}',
        '.sl-chip.on{border-color:var(--primary,#00ff55);color:var(--primary,#00ff55);background:rgba(255,255,255,.06)}',
        '.sl-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:3px;padding-right:2px}',
        '.sl-row{position:relative;display:flex;align-items:center;gap:8px;height:34px;padding:0 6px 0 4px;border-radius:8px;border:1px solid transparent;background:rgba(255,255,255,.025);cursor:pointer;overflow:hidden;flex-shrink:0}',
        '.sl-row:hover{background:rgba(255,255,255,.06)}.sl-row.sel{border-color:rgba(255,255,255,.18)}.sl-row.playing{border-color:var(--primary,#00ff55)}',
        '.sl-row .pg{position:absolute;left:0;bottom:0;height:2px;background:var(--primary,#00ff55);width:0}',
        '.sl-play{width:26px;height:26px;border-radius:7px;border:0;background:rgba(255,255,255,.07);color:#ddd;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
        '.sl-row.playing .sl-play{background:var(--primary,#00ff55);color:#000}',
        '.sl-play svg{width:11px;height:11px}',
        '.sl-meta{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}',
        '.sl-name{font-size:11px;font-weight:700;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sl-name b{color:var(--primary,#00ff55);font-weight:800}',
        '.sl-cat{font-size:8.5px;color:#777;letter-spacing:.3px;text-transform:uppercase}',
        '.sl-dur{font-size:9px;color:#888;font-variant-numeric:tabular-nums}',
        '.sl-ic{width:24px;height:24px;border:0;background:none;color:#777;cursor:pointer;font-size:14px;line-height:24px;padding:0;flex:0 0 auto;border-radius:6px}',
        '.sl-ic:hover{color:#fff;background:rgba(255,255,255,.08)}.sl-ic.fav{color:#ffd23f}',
        '.sl-bottom{display:flex;align-items:center;gap:8px;font-size:9.5px;color:#888;flex-shrink:0}',
        '.sl-bottom input[type=range]{flex:1;accent-color:var(--primary,#00ff55)}',
        '.sl-empty{padding:24px 8px;text-align:center;color:#777;font-size:11px}'
    ].join('\n');
    document.head.appendChild(css);

    var PLAY = '<svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>', STOP = '<svg viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" rx="1" fill="currentColor"/></svg>';
    var view, input, list, chips, count, box;

    function build() {
        view = document.getElementById('view-sounds');
        if (!view || view.getAttribute('data-built')) { return; }
        view.setAttribute('data-built', '1');
        view.innerHTML =
            '<div class="sl-top"><label class="sl-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
            '<input type="text" placeholder="Search sounds… (click, whoosh, jingle)" spellcheck="false"><span class="k">/</span><span class="x" title="Clear">×</span></label><span class="sl-count"></span></div>' +
            '<div class="sl-chips"></div><div class="sl-list" tabindex="0"></div>' +
            '<div class="sl-bottom"><span>🔊</span><input type="range" min="0" max="100" step="1" class="sl-vol"><label style="cursor:pointer;white-space:nowrap"><input type="checkbox" class="sl-auto"> play on select</label></div>';
        box = view.querySelector('.sl-search'); input = view.querySelector('input[type=text]'); list = view.querySelector('.sl-list'); chips = view.querySelector('.sl-chips'); count = view.querySelector('.sl-count');
        var vol = view.querySelector('.sl-vol'), auto = view.querySelector('.sl-auto');
        vol.value = load(VOL, 80); auto.checked = load(AUTO, false);
        vol.addEventListener('input', function () { store(VOL, +vol.value); if (audio) { audio.volume = vol.value / 100; } });
        auto.addEventListener('change', function () { store(AUTO, auto.checked); });
        input.addEventListener('input', function () { query = input.value; sel = 0; render(); });
        view.querySelector('.x').addEventListener('click', function () { input.value = query = ''; render(); input.focus(); });
        view.addEventListener('keydown', function (e) { if (e.target && e.target.closest && e.target.closest('.sl-bottom')) { return; } keys(e); });
        list.addEventListener('click', onClick); list.addEventListener('dblclick', function (e) { var r = e.target.closest('.sl-row'); if (r && !e.target.closest('button')) { add(shown[+r.getAttribute('data-i')]); } });
        loadIndex();
    }
    function loadIndex() {
        function done(txt) { try { items = JSON.parse(txt).items || []; } catch (e) { items = []; } renderChips(); render(); }
        try {
            var x = new XMLHttpRequest(); x.open('GET', 'sounds/sounds.json', true);
            x.onload = function () { if (x.responseText) { done(x.responseText); } else { viaFs(); } };
            x.onerror = viaFs; x.send();
        } catch (e) { viaFs(); }
        function viaFs() { try { var r = window.cep.fs.readFile(extDir() + '/client/sounds/sounds.json'); if (r.err === 0) { done(r.data); return; } } catch (e2) { } list.innerHTML = '<div class="sl-empty">Sound library not found.</div>'; }
    }
    function extDir() {
        var p = ''; try { p = String(new CSInterface().getSystemPath(SystemPath.EXTENSION)); } catch (e) { }
        p = p.replace(/^file:(\/\/)?/i, ''); try { p = decodeURIComponent(p); } catch (e2) { }
        if (/^\/[A-Za-z]:[\/\\]/.test(p)) { p = p.substring(1); }
        return p.replace(/\\/g, '/').replace(/\/$/, '');
    }
    function cats() { var s = {}, out = []; items.forEach(function (it) { if (!s[it.cat]) { s[it.cat] = 1; out.push(it.cat); } }); return out; }
    function renderChips() {
        var nf = Object.keys(favs).filter(function (k) { return favs[k]; }).length;
        chips.innerHTML = ['All', '★ Favourites', 'Recent'].concat(cats()).map(function (c) {
            var label = c === '★ Favourites' ? c + (nf ? ' ' + nf : '') : c;
            return '<button class="sl-chip' + (c === cat ? ' on' : '') + '" data-c="' + esc(c) + '">' + esc(label) + '</button>';
        }).join('');
        chips.querySelectorAll('.sl-chip').forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-c'); sel = 0; renderChips(); render(); }); });
    }
    function matches(it, words) {
        var hay = (it.name + ' ' + it.cat).toLowerCase();
        for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) < 0) { return false; } }
        return true;
    }
    function render() {
        if (!list) { return; }
        var words = query.toLowerCase().split(/\s+/).filter(Boolean), src = items;
        if (cat === '★ Favourites') { src = items.filter(function (it) { return favs[it.id]; }); }
        else if (cat === 'Recent') { src = recent.map(function (id) { return items.filter(function (it) { return it.id === id; })[0]; }).filter(Boolean); }
        else if (cat !== 'All') { src = items.filter(function (it) { return it.cat === cat; }); }
        shown = words.length ? src.filter(function (it) { return matches(it, words); }) : src;
        box.classList.toggle('has', !!query);
        count.textContent = shown.length + (shown.length === 1 ? ' sound' : ' sounds');
        if (sel >= shown.length) { sel = shown.length - 1; }
        if (!shown.length) {
            list.innerHTML = '<div class="sl-empty">' + (cat === '★ Favourites' && !words.length ? 'No favourites yet. Tap ☆ on any sound to keep it here.' : cat === 'Recent' && !words.length ? 'Sounds you add to a comp show up here.' : 'No sounds match “' + esc(query) + '”.') + '</div>';
            return;
        }
        list.innerHTML = shown.map(function (it, i) {
            var name = esc(it.name);
            words.forEach(function (w) { name = name.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<b>$1</b>'); });
            return '<div class="sl-row' + (i === sel ? ' sel' : '') + (it.id === playingId ? ' playing' : '') + '" data-i="' + i + '">' +
                '<button class="sl-play" data-a="play" title="Play / stop">' + (it.id === playingId ? STOP : PLAY) + '</button>' +
                '<div class="sl-meta"><div class="sl-name">' + name + '</div><div class="sl-cat">' + esc(it.cat) + '</div></div>' +
                '<span class="sl-dur">' + fmt(it.dur) + '</span>' +
                '<button class="sl-ic' + (favs[it.id] ? ' fav' : '') + '" data-a="fav" title="Favourite">' + (favs[it.id] ? '★' : '☆') + '</button>' +
                '<button class="sl-ic" data-a="add" title="Add to comp at the playhead">＋</button><div class="pg"></div></div>';
        }).join('');
    }
    function onClick(e) {
        var r = e.target.closest('.sl-row'); if (!r) { return; }
        var i = +r.getAttribute('data-i'), it = shown[i], b = e.target.closest('button'), a = b ? b.getAttribute('data-a') : '';
        if (a === 'fav') { toggleFav(it); return; }
        if (a === 'add') { add(it); return; }
        sel = i;
        if (a === 'play' || load(AUTO, false) || !b) { toggle(it); } else { render(); }
    }
    function toggleFav(it) { if (favs[it.id]) { delete favs[it.id]; } else { favs[it.id] = 1; } store(FAV, favs); renderChips(); render(); }
    function stop() { if (audio) { try { audio.pause(); } catch (e) { } audio = null; } playingId = ''; cancelAnimationFrame(raf); }
    function toggle(it) {
        if (!it) { return; }
        if (playingId === it.id) { stop(); render(); return; }
        stop();
        audio = new Audio(it.file); audio.volume = load(VOL, 80) / 100; playingId = it.id;
        audio.addEventListener('ended', function () { if (playingId === it.id) { stop(); render(); } });
        audio.addEventListener('error', function () { stop(); render(); toast('Could not play ' + it.name + '.', 'error'); });
        try { var pr = audio.play(); if (pr && pr.catch) { pr.catch(function () { }); } } catch (e) { }
        render(); progress();
    }
    function progress() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function step() {
            if (!audio) { return; }
            var row = list.querySelector('.sl-row.playing .pg');
            if (row && audio.duration) { row.style.width = (audio.currentTime / audio.duration * 100) + '%'; }
            raf = requestAnimationFrame(step);
        });
    }
    function toast(m, k) { try { if (typeof window.showStatus === 'function') { window.showStatus(m, k || 'success'); } } catch (e) { } }
    function add(it) {
        if (!it) { return; }
        var cs; try { cs = window.csInterface || new CSInterface(); } catch (e) { toast('Open Sougetsu Akira FX inside After Effects to add sounds.', 'error'); return; }
        var path = extDir() + '/client/' + it.file;
        cs.evalScript('$._akira.importSound("' + encodeURIComponent(path) + '","comp")', function (res) {
            res = String(res || '');
            if (res.indexOf('SUCCESS:') === 0) {
                toast(res.substring(8));
                recent = [it.id].concat(recent.filter(function (x) { return x !== it.id; })).slice(0, 30); store(REC, recent);
                if (cat === 'Recent') { render(); }
            } else { toast(res.indexOf('ERR:') === 0 ? res.substring(4) : 'Could not add the sound.', 'error'); }
        });
    }
    function keys(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); sel = Math.max(0, Math.min(shown.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); render();
            var r = list.querySelector('.sl-row.sel'); if (r && r.scrollIntoView) { r.scrollIntoView({ block: 'nearest' }); }
            if (load(AUTO, false)) { toggle(shown[sel]); }
        } else if (e.key === 'Enter') { e.preventDefault(); var it = shown[Math.max(0, sel)]; if (e.shiftKey) { add(it); } else { toggle(it); } }
        else if (e.key === 'Escape') { input.value = query = ''; stop(); render(); }
        else if ((e.key === 'f' || e.key === 'F') && e.target !== input && shown[sel]) { e.preventDefault(); toggleFav(shown[sel]); }
    }
    // "/" or typing a letter while the Sound Lab tab is open jumps into the search bar
    document.addEventListener('keydown', function (e) {
        if (!view || !view.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey) { return; }
        var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (typing) { return; }
        if (e.key === '/') { e.preventDefault(); input.focus(); input.select(); }
        else if (e.key.length === 1 && /[a-z0-9]/i.test(e.key) && !(e.key === 'f' || e.key === 'F')) { input.focus(); }
    });
    // build when the tab is first shown; stop playback when leaving it
    function watch() {
        var v = document.getElementById('view-sounds'); if (!v) { return; }
        new MutationObserver(function () { if (v.classList.contains('active')) { build(); setTimeout(function () { if (input) { input.focus(); } }, 50); } else { stop(); if (list) { render(); } } }).observe(v, { attributes: true, attributeFilter: ['class'] });
        if (v.classList.contains('active')) { build(); }
    }
    window.AkiraSounds = { open: function () { if (typeof window.switchTab === 'function') { window.switchTab('sounds'); } build(); }, items: function () { return items; } };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', watch); } else { watch(); }
})();
