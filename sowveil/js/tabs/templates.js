/* Sowveil - Templates: the 81 editable motion templates (Templates 2.0 engine from Akira FX).
   Gallery with live thumbnails, search and categories; a card opens the full template editor
   (preview, content, style, motion) whose Build button creates the comp in After Effects. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var query = '', cat = 'All';
    // the template engine talks to AE through these globals
    window.csInterface = window.csInterface || SV.cs;
    window.showStatus = window.showStatus || function (msg, type) { SV.toast(String(msg), type === 'error' ? 'error' : ''); };

    function T() { return window.AkiraT2; }
    function render(root) {
        root.innerHTML = '';
        var api = T();
        if (!api || !api.list) { root.appendChild(h('div', { class: 'empty', text: 'The template engine did not load.' })); return; }
        var ids = api.list(), specs = ids.map(function (id) { var s = api.get(id); return { id: id, title: s.title || id, category: s.category || 'UI Kit', tags: String(s.tags || ''), spec: s }; });
        var cats = ['All'].concat(specs.map(function (s) { return s.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).sort());
        var search = h('input', { placeholder: 'Search ' + specs.length + ' templates', value: query });
        var bar = h('div', { class: 'toolbar' }, [h('div', { class: 'search', html: SV.icon('search') })]);
        bar.firstChild.appendChild(search);
        var chips = h('div', { class: 'tp-chips' }, cats.map(function (c) {
            return h('button', { class: 'tp-chip' + (c === cat ? ' on' : ''), text: c, onclick: function () { cat = c; [].forEach.call(chips.children, function (b) { b.classList.toggle('on', b.textContent === c); }); draw(); } });
        }));
        var grid = h('div', { class: 'grid tp-grid' });
        root.appendChild(bar); root.appendChild(h('div', { class: 'section', style: { padding: '8px 14px' } }, [chips])); root.appendChild(grid);
        var io = window.IntersectionObserver ? new IntersectionObserver(function (en) {
            en.forEach(function (e) { if (e.isIntersecting && !e.target.__drawn) { e.target.__drawn = true; try { api.thumb(e.target, e.target.__spec); } catch (x) { } io.unobserve(e.target); } });
        }, { root: root, rootMargin: '120px' }) : null;
        function draw() {
            grid.innerHTML = '';
            var q = query.toLowerCase(), n = 0;
            specs.forEach(function (s) {
                if (cat !== 'All' && s.category !== cat) { return; }
                if (q && (s.title + ' ' + s.category + ' ' + s.tags + ' ' + s.id).toLowerCase().indexOf(q) < 0) { return; }
                var cv = h('canvas', { class: 'tp-cv' }); cv.__spec = s.spec;
                grid.appendChild(h('div', { class: 'card', style: { animationDelay: Math.min(n, 16) * 15 + 'ms' }, title: 'Open ' + s.title, onclick: function () { api.open(s.id); } }, [
                    h('div', { class: 'thumb tp-thumb' }, [cv]),
                    h('div', { class: 'cap' }, [h('div', { class: 'c1', text: s.title }), h('div', { class: 'c2', text: s.category })])
                ]));
                n++;
                if (io) { io.observe(cv); } else { setTimeout(function () { try { api.thumb(cv, s.spec); } catch (x) { } }, 0); }
            });
            if (!n) { grid.appendChild(h('div', { class: 'empty', text: 'No templates match.' })); }
        }
        search.addEventListener('input', function () { query = search.value.trim(); draw(); });
        draw();
    }

    SV.registerTab({ id: 'templates', label: 'Templates', icon: 'templates', full: render });
})();
