/* Sowveil - Templates: 20 animated compositions (js/templates_lib.js). The gallery cards play live previews,
   a card opens the template with a large live preview, scrubber and settings, and Build creates the same
   animation as a new comp in After Effects (host/sv_scene.jsx). */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var query = '', cat = 'All', open = null, loops = [];

    function lib() { return window.SVTemplates; }
    function vals(def) { return SV.vals('templates', { id: def.id, params: def.params }); }
    function stopAll() { loops.forEach(function (l) { l.stop(); }); loops = []; }
    // one animation loop per canvas; paused while off screen
    function live(cv, getScene, opts) {
        opts = opts || {};
        var raf = 0, t0 = performance.now(), visible = true, S = getScene(), io = null, stopped = false;
        function frame(now) {
            if (stopped) { return; }
            if (visible) {
                var W = cv.clientWidth || 300, H = cv.clientHeight || 170, dpr = Math.min(2, window.devicePixelRatio || 1);
                if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
                var t = opts.time ? opts.time() : ((now - t0) / 1000) % (S.dur + 0.6);
                try { window.SVScene.render(cv.getContext('2d'), S, Math.min(t, S.dur), cv.width, cv.height); } catch (e) { }
                if (opts.onTime) { opts.onTime(t, S.dur); }
            }
            raf = requestAnimationFrame(frame);
        }
        if (window.IntersectionObserver && opts.lazy) { io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }); io.observe(cv); }
        raf = requestAnimationFrame(frame);
        var api = { stop: function () { stopped = true; cancelAnimationFrame(raf); if (io) { io.disconnect(); } }, refresh: function () { S = getScene(); }, restart: function () { t0 = performance.now(); }, scene: function () { return S; } };
        loops.push(api);
        return api;
    }

    function gallery(root) {
        var L = lib(), list = L.list;
        var cats = ['All'].concat(list.map(function (d) { return d.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
        var search = h('input', { placeholder: 'Search ' + list.length + ' templates', value: query });
        var bar = h('div', { class: 'toolbar' }, [h('div', { class: 'search', html: SV.icon('search') })]); bar.firstChild.appendChild(search);
        var chips = h('div', { class: 'tp-chips' }, cats.map(function (c) {
            return h('button', { class: 'tp-chip' + (c === cat ? ' on' : ''), text: c, onclick: function () { cat = c; [].forEach.call(chips.children, function (b) { b.classList.toggle('on', b.textContent === c); }); draw(); } });
        }));
        var grid = h('div', { class: 'grid tp-grid' });
        root.appendChild(bar); root.appendChild(h('div', { class: 'section', style: { padding: '8px 14px' } }, [chips])); root.appendChild(grid);
        function draw() {
            stopAll(); grid.innerHTML = '';
            var q = query.toLowerCase(), n = 0;
            list.forEach(function (d) {
                if (cat !== 'All' && d.category !== cat) { return; }
                if (q && (d.title + ' ' + d.category).toLowerCase().indexOf(q) < 0) { return; }
                var cv = h('canvas', { class: 'tp-cv' });
                grid.appendChild(h('div', { class: 'card', style: { animationDelay: Math.min(n, 16) * 15 + 'ms' }, title: 'Open ' + d.title, onclick: function () { open = d.id; SV.refresh(); } }, [
                    h('div', { class: 'thumb tp-thumb' }, [cv]),
                    h('div', { class: 'cap' }, [h('div', { class: 'c1', text: d.title }), h('div', { class: 'c2', text: d.category })])
                ]));
                live(cv, function () { return L.build(d, vals(d)); }, { lazy: true });
                n++;
            });
            if (!n) { grid.appendChild(h('div', { class: 'empty', text: 'No templates match.' })); }
        }
        search.addEventListener('input', function () { query = search.value.trim(); draw(); });
        draw();
    }

    function detail(root, d) {
        var L = lib(), v = vals(d), playing = true, scrubT = 0;
        var back = h('button', { class: 'btn ghost small', html: SV.icon('back') + ' All templates', onclick: function () { open = null; SV.refresh(); } });
        root.appendChild(h('div', { class: 'toolbar' }, [back, h('div', { class: 'tp-title', text: d.title })]));
        var cv = h('canvas', { class: 'tp-big' }), stage = h('div', { class: 'tp-stage' }, [cv]);
        var range = h('input', { type: 'range', class: 'range', min: 0, max: 1000, value: 0 }), clock = h('span', { class: 'tp-clock', text: '0.0s' });
        var play = h('button', { class: 'btn ghost small', text: '❚❚', onclick: function () { playing = !playing; play.textContent = playing ? '❚❚' : '▶'; if (playing) { loop.restart(); } } });
        range.addEventListener('input', function () { playing = false; play.textContent = '▶'; scrubT = range.value / 1000 * loop.scene().dur; });
        var t0 = performance.now();
        var loop = live(cv, function () { return L.build(d, v); }, {
            time: function () { if (playing) { scrubT = ((performance.now() - t0) / 1000) % (loop ? loop.scene().dur + 0.6 : 6); } return scrubT; },
            onTime: function (t, dur) { if (playing) { range.value = Math.round(Math.min(1, t / dur) * 1000); } clock.textContent = Math.min(t, dur).toFixed(1) + 's / ' + dur.toFixed(1) + 's'; }
        });
        root.appendChild(h('div', { class: 'section' }, [stage, h('div', { class: 'tp-scrub' }, [play, range, clock])]));
        var item = { id: d.id, params: d.params };
        var body = h('div', { class: 'tp-detail' });
        body.appendChild(SV.ui.params('templates', item, v, function () { loop.refresh(); }));
        body.appendChild(SV.ui.section('', [
            SV.ui.action('Build in After Effects', function () {
                var S = L.build(d, v);
                return SV.call('buildScene', { scene: S }, { timeout: 120000 }).then(function (r) { SV.result(r); });
            }),
            h('div', { class: 'hint', text: 'Creates a new ' + 1920 + '×' + 1080 + ' comp in the "Sowveil Templates" folder with every layer, keyframe and ease from the preview. Text stays editable; counters, typing and loops are expressions.' })
        ]));
        root.appendChild(body);
    }

    SV.registerTab({
        id: 'templates', label: 'Templates', icon: 'templates',
        full: function (root) {
            stopAll();
            var L = lib();
            if (!L || !window.SVScene) { root.appendChild(h('div', { class: 'empty', text: 'The template library did not load.' })); return; }
            var d = null; L.list.forEach(function (x) { if (x.id === open) { d = x; } });
            if (d) { detail(root, d); } else { gallery(root); }
            var off = SV.on('tab', function (id) { if (id !== 'templates') { stopAll(); off(); } });
        }
    });
})();
