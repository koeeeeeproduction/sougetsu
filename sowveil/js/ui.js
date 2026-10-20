/* Sowveil - app shell: tabs (top pills or icon rail), master list + inspector, controls,
   status bar with live AE selection, remove bar, theme, layout, settings. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var tabs = [], state = { tab: null, sel: {} }, values = SV.get('values', {});
    SV.tabs = tabs;

    // ---------- registry ----------
    // def: { id, label, icon, items(): [{id,label,subtitle}], inspector(el, item, vals), full(el) }
    SV.registerTab = function (def) { tabs.push(def); };
    SV.tabById = function (id) { for (var i = 0; i < tabs.length; i++) { if (tabs[i].id === id) { return tabs[i]; } } return null; };

    // ---------- parameter values (per tab+preset, remembered) ----------
    SV.vals = function (tabId, item) {
        var key = tabId + ':' + item.id, v = values[key] || {}, out = {};
        (item.params || []).forEach(function (p) { out[p.id] = (v[p.id] !== undefined) ? v[p.id] : p.def; });
        return out;
    };
    function saveVal(tabId, itemId, pid, val) {
        var key = tabId + ':' + itemId; values[key] = values[key] || {}; values[key][pid] = val;
        clearTimeout(saveVal.t); saveVal.t = setTimeout(function () { SV.set('values', values); }, 250);
    }
    SV.resetVals = function (tabId, itemId) { delete values[tabId + ':' + itemId]; SV.set('values', values); };

    // ---------- controls ----------
    var ui = SV.ui = {};
    ui.section = function (label, kids, right) {
        return h('div', { class: 'section' }, [label ? h('div', { class: 'sec-label' }, [h('span', { text: label }), right || null]) : null].concat(kids));
    };
    function pct(p, v) { return Math.max(0, Math.min(100, ((v - p.min) / (p.max - p.min)) * 100)) + '%'; }
    ui.param = function (p, val, onChange) {
        if (p.type === 'select') {
            var s = h('select', { class: 'sel', onchange: function () { onChange(s.value); } }, p.options.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
            s.value = val; return h('div', { class: 'row' }, [h('label', { text: p.label }), s]);
        }
        if (p.type === 'seg') {
            var wrap = h('div', { class: 'segctl' });
            p.options.forEach(function (o) {
                var b = h('button', { class: o[0] === val ? 'on' : '', text: o[1], onclick: function () {
                    [].forEach.call(wrap.children, function (c) { c.className = ''; }); b.className = 'on'; onChange(o[0]);
                } });
                wrap.appendChild(b);
            });
            return h('div', { class: 'row' }, [h('label', { text: p.label }), wrap]);
        }
        if (p.type === 'color') {
            var sw = h('label', { class: 'swatch', style: { background: val } }), inp = h('input', { type: 'color', value: val });
            inp.addEventListener('input', function () { sw.style.background = inp.value; onChange(inp.value); });
            sw.appendChild(inp); return h('div', { class: 'row' }, [h('label', { text: p.label }), sw]);
        }
        if (p.type === 'toggle') {
            var cb = h('input', { type: 'checkbox' }); cb.checked = !!val;
            cb.addEventListener('change', function () { onChange(cb.checked); });
            return h('div', { class: 'row' }, [h('label', { text: p.label }), h('label', { class: 'toggle' }, [cb, h('span')])]);
        }
        if (p.type === 'text') {
            var t = h('input', { class: 'txt-in', value: val, placeholder: p.placeholder || '' });
            t.addEventListener('input', function () { onChange(t.value); });
            return h('div', {}, [h('div', { class: 'row' }, [h('label', { text: p.label })]), t]);
        }
        // number: label + typed field + slider (typed value may exceed the slider range)
        var num = h('input', { class: 'num', value: val }), rng = h('input', { class: 'range', type: 'range', min: p.min, max: p.max, step: p.step || 1, value: val });
        rng.style.setProperty('--p', pct(p, val));
        function set(v, from) {
            v = parseFloat(v); if (isNaN(v)) { return; }
            if (from !== 'num') { num.value = v; }
            if (from !== 'rng') { rng.value = Math.max(p.min, Math.min(p.max, v)); }
            rng.style.setProperty('--p', pct(p, Math.max(p.min, Math.min(p.max, v))));
            onChange(v);
        }
        rng.addEventListener('input', function () { set(rng.value, 'rng'); });
        num.addEventListener('change', function () { set(num.value, 'num'); });
        num.addEventListener('keydown', function (e) { if (e.key === 'Enter') { num.blur(); } });
        return h('div', {}, [h('div', { class: 'row' }, [h('label', { text: p.label + (p.unit ? ' (' + p.unit + ')' : '') }), num]), rng]);
    };
    // Build a parameter section for a preset and keep values in sync.
    ui.params = function (tabId, item, vals, onChange) {
        var rows = (item.params || []).filter(function (p) { return !p.when || p.when(vals); }).map(function (p) {
            return ui.param(p, vals[p.id], function (v) { vals[p.id] = v; saveVal(tabId, item.id, p.id, v); if (onChange) { onChange(p.id, v); } });
        });
        var reset = h('button', { class: 'btn ghost small', text: 'Reset', onclick: function () { SV.resetVals(tabId, item.id); SV.refresh(); } });
        return ui.section('Parameters', rows.length ? rows : [h('div', { class: 'hint', text: 'No settings for this preset.' })], rows.length ? reset : null);
    };
    // Primary action button with a pulse + busy state. fn returns a Promise.
    ui.action = function (label, fn, cls) {
        var b = h('button', { class: 'btn block ' + (cls || ''), text: label });
        b.addEventListener('click', function () {
            if (b.disabled) { return; }
            b.appendChild(h('span', { class: 'pulse' }));
            var orig = b.textContent; b.disabled = true; b.firstChild.nodeValue = 'Working…';
            Promise.resolve(fn()).then(function () { }, function (e) { SV.toast(String(e && e.message || e), 'error'); }).then(function () {
                b.disabled = false; b.firstChild.nodeValue = orig; var p = b.querySelector('.pulse'); if (p) { p.remove(); }
            });
        });
        return b;
    };

    // ---------- favorites ----------
    function favs(tabId) { return SV.get('fav:' + tabId, []); }
    function toggleFav(tabId, id) { var f = favs(tabId), i = f.indexOf(id); if (i < 0) { f.push(id); } else { f.splice(i, 1); } SV.set('fav:' + tabId, f); }

    // ---------- layout: tabs ----------
    var seg, segPill, rail, content, railPill;
    function buildTabs() {
        seg = document.getElementById('seg'); segPill = document.getElementById('segPill'); rail = document.getElementById('rail');
        railPill = h('div', { class: 'rail-pill' }); rail.appendChild(railPill);
        tabs.forEach(function (t) {
            seg.appendChild(h('button', { class: 'seg-btn', 'data-tab': t.id, text: t.label, onclick: function () { SV.show(t.id); } }));
            rail.appendChild(h('button', { class: 'rail-btn', 'data-tab': t.id, title: t.label, html: SV.icon(t.icon), onclick: function () { SV.show(t.id); } }));
        });
        // wheel + drag scrolling for the pill strip
        var sc = document.getElementById('tabsScroll'), start = null, dragging = false;
        sc.addEventListener('wheel', function (e) { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); sc.scrollLeft += e.deltaY; } }, { passive: false });
        sc.addEventListener('pointerdown', function (e) { start = { x: e.clientX, s: sc.scrollLeft }; dragging = false; });
        sc.addEventListener('pointermove', function (e) {
            if (!start) { return; } var dx = e.clientX - start.x;
            if (!dragging && Math.abs(dx) < 6) { return; } dragging = true; sc.scrollLeft = start.s - dx;
        });
        window.addEventListener('pointerup', function () {
            if (dragging) { sc.addEventListener('click', function stop(ev) { ev.stopPropagation(); ev.preventDefault(); sc.removeEventListener('click', stop, true); }, true); }
            start = null; dragging = false;
        });
    }
    function movePills(animate) {
        var b = seg.querySelector('[data-tab="' + state.tab + '"]');
        [].forEach.call(seg.querySelectorAll('.seg-btn'), function (x) { x.classList.toggle('on', x === b); });
        [].forEach.call(rail.querySelectorAll('.rail-btn'), function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === state.tab); });
        if (b) {
            if (!animate) { segPill.style.transition = 'opacity .18s'; }
            segPill.style.left = b.offsetLeft + 'px'; segPill.style.width = b.offsetWidth + 'px'; segPill.style.opacity = 1;
            if (!animate) { requestAnimationFrame(function () { segPill.style.transition = ''; }); }
            b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        var rb = rail.querySelector('.rail-btn[data-tab="' + state.tab + '"]');
        if (rb) { railPill.style.top = rb.offsetTop + 'px'; }
    }

    // ---------- master list + inspector ----------
    SV.show = function (tabId) {
        var first = !state.tab;
        state.tab = tabId; SV.set('tab', tabId);
        movePills(!first);
        render();
    };
    SV.refresh = function () { render(true); };
    function render(keepScroll) {
        var t = SV.tabById(state.tab), scroll = 0, ins = content.querySelector('.inspector');
        if (keepScroll && ins) { scroll = ins.scrollTop; }
        content.innerHTML = '';
        if (!t) { return; }
        if (t.full) { var f = h('div', { class: 'full' }); content.appendChild(f); t.full(f); return; }
        var items = t.items(), fav = favs(t.id);
        if (!state.sel[t.id] || !items.some(function (i) { return i.id === state.sel[t.id]; })) { state.sel[t.id] = items[0] && items[0].id; }
        var sorted = items.slice().sort(function (a, b) { return (fav.indexOf(a.id) < 0) - (fav.indexOf(b.id) < 0); });
        var nFav = items.filter(function (i) { return fav.indexOf(i.id) >= 0; }).length;
        var list = h('div', { class: 'master-list' }), pill = h('div', { class: 'list-pill' });
        list.appendChild(pill);
        sorted.forEach(function (it, i) {
            var isFav = fav.indexOf(it.id) >= 0, on = it.id === state.sel[t.id];
            var star = h('button', { class: 'star' + (isFav ? ' fav' : ''), title: isFav ? 'Unfavorite' : 'Favorite', text: isFav ? '★' : '☆', onclick: function (e) { e.stopPropagation(); toggleFav(t.id, it.id); render(true); } });
            var row = h('button', { class: 'item' + (on ? ' on' : ''), 'data-id': it.id, onclick: function () { select(it.id); } }, [
                h('span', { class: 'bul' }), h('span', { class: 'txt' }, [h('span', { class: 't1', text: it.label }), h('span', { class: 't2', text: it.subtitle || '' })]), star
            ]);
            list.appendChild(row);
            if (isFav && i === nFav - 1 && nFav < items.length) { list.appendChild(h('div', { class: 'fav-sep' })); }
        });
        var master = h('aside', { class: 'master' }, [h('div', { class: 'master-head' }, [h('span', { text: t.label }), h('span', { text: String(items.length) })]), list]);
        var inspector = h('section', { class: 'inspector' });
        content.appendChild(master); content.appendChild(inspector);
        placePill(list, pill, false);
        drawInspector(inspector);
        if (keepScroll) { inspector.scrollTop = scroll; }
        function select(id) {
            state.sel[t.id] = id;
            [].forEach.call(list.querySelectorAll('.item'), function (r) { r.classList.toggle('on', r.getAttribute('data-id') === id); });
            placePill(list, pill, true);
            drawInspector(inspector);
        }
    }
    function placePill(list, pill, animate) {
        var on = list.querySelector('.item.on');
        if (!on) { pill.style.opacity = 0; return; }
        if (!animate) { pill.style.transition = 'opacity .18s'; }
        pill.style.top = on.offsetTop + 'px'; pill.style.height = on.offsetHeight + 'px'; pill.style.opacity = 1;
        if (!animate) { requestAnimationFrame(function () { pill.style.transition = ''; }); }
    }
    function drawInspector(el) {
        var t = SV.tabById(state.tab), item = null, items = t.items(), i;
        for (i = 0; i < items.length; i++) { if (items[i].id === state.sel[t.id]) { item = items[i]; } }
        SV.emit('inspector:leave');
        el.innerHTML = '';
        if (!item) { el.appendChild(h('div', { class: 'empty', text: 'Nothing here yet.' })); return; }
        try { t.inspector(el, item, SV.vals(t.id, item)); }
        catch (e) { console.error(e); el.innerHTML = ''; el.appendChild(h('div', { class: 'empty', text: 'This preset could not be shown: ' + e.message })); }
    }

    // ---------- narrow mode (panel too thin for two columns) ----------
    function watchWidth() {
        var apply = function (w) { content.classList.toggle('narrow', w > 0 && w < 330); };
        if (window.ResizeObserver) { new ResizeObserver(function (en) { apply(en[0].contentRect.width); }).observe(content); }
        else { window.addEventListener('resize', function () { apply(content.clientWidth); }); }
        apply(content.clientWidth);
    }

    // ---------- theme + layout ----------
    function aeIsDark() {
        try {
            var c = SV.cs.hostEnvironment.appSkinInfo.panelBackgroundColor.color;
            return (c.red + c.green + c.blue) / 3 < 128;
        } catch (e) { return null; }
    }
    SV.theme = function () { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; };
    SV.setTheme = function (t) {
        document.documentElement.classList.toggle('dark', t === 'dark'); SV.set('theme', t);
        var b = document.getElementById('themeBtn'); if (b) { b.innerHTML = SV.icon(t === 'dark' ? 'sun' : 'moon'); }
        SV.emit('theme', t);
    };
    SV.layout = function () { return SV.get('layout', 'default'); };
    SV.setLayout = function (l) { SV.set('layout', l); document.documentElement.classList.toggle('layout-sidebar', l === 'sidebar'); setTimeout(function () { movePills(false); }, 0); };

    // ---------- selection poll + status bar + remove bar ----------
    SV.selInfo = { comp: false, layers: 0, props: 0, keys: 0, hasSv: false };
    var polling = false, pointerDown = false;
    function poll() {
        if (polling || document.hidden || pointerDown || !SV.isCEP()) { return; }
        polling = true;
        SV.call('selInfo', {}, { timeout: 4000 }).then(function (r) {
            polling = false;
            if (!r || !r.ok) { return; }
            var prev = SV.selInfo; SV.selInfo = r;
            if (prev.layers !== r.layers || prev.hasSv !== r.hasSv || prev.comp !== r.comp || prev.keys !== r.keys || prev.props !== r.props) { status(); SV.emit('selection', r); }
        });
    }
    function status() {
        var s = SV.selInfo, dot = document.getElementById('connDot'), ct = document.getElementById('connText'), st = document.getElementById('selText');
        dot.classList.toggle('on', SV.isCEP()); ct.textContent = SV.isCEP() ? 'Connected' : 'Browser preview';
        st.textContent = !SV.isCEP() ? 'not in After Effects' : !s.comp ? 'No active comp'
            : s.keys ? s.keys + (s.keys === 1 ? ' keyframe' : ' keyframes') + ' selected'
                : s.props ? s.props + (s.props === 1 ? ' property' : ' properties') + ' selected'
                    : s.layers + (s.layers === 1 ? ' layer' : ' layers') + ' selected';
        removeBar();
    }
    function removeBar() {
        var host = document.getElementById('banners'), bar = document.getElementById('removeBar');
        if (!SV.selInfo.hasSv) { if (bar) { bar.remove(); } return; }
        if (bar) { return; }
        var btn = h('button', { text: 'Remove ✕' });
        bar = h('div', { class: 'bar remove', id: 'removeBar' }, [h('span', { text: 'This layer has Sowveil applied.' }), btn]);
        btn.addEventListener('click', function () {
            btn.disabled = true; btn.textContent = 'Removing…';
            SV.call('removeSowveil', {}).then(function (r) {
                SV.result(r, 'Sowveil removed.');
                bar.remove(); SV.selInfo.hasSv = false; setTimeout(poll, 150);
            });
        });
        host.appendChild(bar);
    }
    SV.on('applied', function () { setTimeout(poll, 200); });

    // ---------- settings ----------
    SV.openSettings = function () {
        var wrap = document.getElementById('settings'); wrap.innerHTML = '';
        function close() { wrap.hidden = true; }
        var themeSeg = ui.param({ type: 'seg', label: 'Appearance', options: [['light', 'Light'], ['dark', 'Dark']] }, SV.theme(), function (v) { SV.setTheme(v); });
        var layoutSeg = ui.param({ type: 'seg', label: 'Layout', options: [['default', 'Top tabs'], ['sidebar', 'Sidebar']] }, SV.layout(), function (v) { SV.setLayout(v); });
        var modal = h('div', { class: 'modal' }, [
            h('div', { class: 'modal-head' }, [h('span', { text: 'Settings' }), h('button', { class: 'round-btn', html: SV.icon('close'), onclick: close })]),
            h('div', { class: 'modal-body' }, [
                h('div', { class: 'group' }, [themeSeg, layoutSeg, h('div', { class: 'hint', text: 'Sidebar puts the tabs in an icon rail on the left.' })]),
                h('div', { class: 'group' }, [
                    h('div', { class: 'kv' }, [h('span', { text: 'Sowveil' }), h('b', { text: 'v' + SV.VERSION })]),
                    h('div', { class: 'kv' }, [h('span', { text: 'Host' }), h('b', { text: SV.isCEP() ? 'After Effects' : 'Browser preview' })])
                ])
            ])
        ]);
        wrap.appendChild(modal);
        wrap.onclick = function (e) { if (e.target === wrap) { close(); } };
        wrap.hidden = false;
    };

    // ---------- boot ----------
    SV.boot = function () {
        content = document.getElementById('content');
        var stored = SV.get('theme', null), ae = aeIsDark();
        SV.setTheme(stored || (ae === null ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : (ae ? 'dark' : 'light')));
        document.getElementById('themeBtn').addEventListener('click', function () { SV.setTheme(SV.theme() === 'dark' ? 'light' : 'dark'); });
        var logo = document.getElementById('logoBtn'); logo.innerHTML = SV.icon('mark', 'mark'); logo.addEventListener('click', SV.openSettings);
        document.getElementById('verText').textContent = 'Sowveil ' + SV.VERSION + ' · After Effects';
        buildTabs();
        SV.setLayout(SV.layout());
        watchWidth();
        var start = SV.get('tab', tabs[0].id); SV.show(SV.tabById(start) ? start : tabs[0].id);
        status();
        // pause animations + polling while hidden; skip polls while a pointer is held (slider drags)
        document.addEventListener('visibilitychange', function () { document.body.classList.toggle('sv-hidden', document.hidden); if (!document.hidden) { poll(); } });
        window.addEventListener('pointerdown', function () { pointerDown = true; }, true);
        window.addEventListener('pointerup', function () { pointerDown = false; }, true);
        if (SV.isCEP()) { poll(); setInterval(poll, 1200); }
    };
})();
