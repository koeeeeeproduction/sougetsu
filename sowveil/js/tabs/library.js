/* Sowveil - Project Library tab: search saved projects, see a cover + every comp's preview,
   import the whole project or open straight into one comp. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var data = { projects: [], path: '' }, open = null, query = '', loaded = false;

    function lib() { return SV.get('libDir', ''); }
    function load(cb) {
        SV.call('scanProjects', { lib: lib() }).then(function (r) {
            loaded = true;
            if (r.ok && r.projects) { data = r; } else if (!r.ok && !r.dev) { SV.toast(r.error, 'error'); }
            if (cb) { cb(); }
        });
    }
    function fmtDate(ms) { if (!ms) { return ''; } var d = new Date(ms); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function match(s) { return !query || String(s).toLowerCase().indexOf(query) !== -1; }
    function thumb(path, label) {
        var t = h('div', { class: 'thumb', text: path ? '' : label });
        if (path) { t.style.backgroundImage = 'url("' + SV.fileUrl(path) + '?v=' + Date.now() % 1e6 + '")'; }
        return t;
    }

    function render(root) {
        root.innerHTML = '';
        var search = h('input', { placeholder: open ? 'Search comps in this project' : 'Search projects and comps', value: query });
        search.addEventListener('input', function () { query = search.value.trim().toLowerCase(); draw(); });
        var bar = h('div', { class: 'toolbar' }, [h('div', { class: 'search', html: SV.icon('search') }, []), null]);
        bar.firstChild.appendChild(search);
        if (!open) {
            bar.appendChild(h('button', { class: 'btn small', html: '+ Save project', title: 'Copy the open project into the library with previews of every comp', onclick: function () { act(this, 'saveProject', { lib: lib() }); } }));
            bar.appendChild(h('button', { class: 'btn ghost small', text: 'Add .aep', title: 'Add project files from disk', onclick: function () { act(this, 'addProjects', { lib: lib() }); } }));
            bar.appendChild(h('button', { class: 'round-btn', html: SV.icon('folder'), title: 'Library folder', onclick: folderMenu }));
        }
        var body = h('div');
        root.appendChild(bar); root.appendChild(body);
        function draw() { body.innerHTML = ''; if (open) { drawProject(body); } else { drawGrid(body); } }
        function act(btn, fn, args) {
            var orig = btn.innerHTML; btn.disabled = true; btn.textContent = 'Working…';
            SV.call(fn, args, { timeout: 600000 }).then(function (r) {
                btn.disabled = false; btn.innerHTML = orig;
                if (r.ok || r.error !== 'cancelled') { SV.result(r); }
                load(draw);
            });
        }
        function folderMenu() {
            SV.call('pickFolder', { prompt: 'Choose the Project Library folder' }).then(function (r) { if (r.ok) { SV.set('libDir', r.path); load(draw); SV.toast('Library: ' + r.path); } });
        }
        if (!loaded) { body.appendChild(h('div', { class: 'empty', text: 'Loading library…' })); load(draw); } else { draw(); }
        setTimeout(function () { search.focus(); }, 30);
    }

    function drawGrid(body) {
        var list = data.projects.filter(function (p) { return match(p.name) || p.comps.some(function (c) { return match(c.name); }); });
        if (!data.projects.length) {
            body.appendChild(h('div', { class: 'empty', html: '<b>Your project library is empty.</b><br>Open a project and press <b>+ Save open project</b>, or add .aep files from disk.<br>Every comp gets its own preview.' }));
            return;
        }
        if (!list.length) { body.appendChild(h('div', { class: 'empty', text: 'No projects or comps match "' + query + '".' })); return; }
        var grid = h('div', { class: 'grid' });
        list.forEach(function (p, i) {
            var hits = query ? p.comps.filter(function (c) { return match(c.name); }).length : 0;
            var del = h('button', { class: 'del', title: 'Remove from library', text: '✕', onclick: function (e) {
                e.stopPropagation(); if (!confirm('Remove "' + p.name + '" from the library? (Your original file is not touched.)')) { return; }
                SV.call('deleteProject', { lib: lib(), id: p.id }).then(function (r) { SV.result(r); load(function () { SV.refresh(); }); });
            } });
            var card = h('div', { class: 'card', style: { animationDelay: Math.min(i, 12) * 25 + 'ms' }, onclick: function () { open = p.id; query = ''; SV.refresh(); } }, [
                thumb(p.cover, 'PROJECT'),
                h('span', { class: 'badge', text: p.comps.length + (p.comps.length === 1 ? ' comp' : ' comps') }), del,
                h('div', { class: 'cap' }, [h('div', { class: 'c1', text: p.name, title: p.name }), h('div', { class: 'c2', text: hits ? hits + ' matching comp' + (hits === 1 ? '' : 's') : fmtDate(p.created) + ' · ' + fmtSize(p.size) })])
            ]);
            grid.appendChild(card);
        });
        body.appendChild(grid);
    }

    function drawProject(body) {
        var p = null; data.projects.forEach(function (x) { if (x.id === open) { p = x; } });
        if (!p) { open = null; drawGrid(body); return; }
        var head = h('div', { class: 'section' }, [
            h('div', { class: 'crumb' }, [
                h('button', { class: 'round-btn', html: SV.icon('back'), title: 'All projects', onclick: function () { open = null; query = ''; SV.refresh(); } }),
                h('span', { text: p.name, title: p.source || p.aep })
            ]),
            h('div', { style: { display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' } }, [
                SV.ui.action('Import whole project', function () { return SV.call('importProject', { aep: p.aep, name: p.name }).then(function (r) { SV.result(r); }); }),
                h('button', { class: 'btn ghost small', text: 'Rename', onclick: function () {
                    var n = prompt('Project name', p.name); if (!n) { return; }
                    SV.call('renameProject', { lib: lib(), id: p.id, name: n }).then(function (r) { SV.result(r); load(function () { SV.refresh(); }); });
                } }),
                h('button', { class: 'btn ghost small', text: 'Show folder', onclick: function () { SV.call('revealFile', { path: p.aep }); } })
            ]),
            h('div', { class: 'hint', text: p.comps.length + ' comps · saved ' + fmtDate(p.created) + ' · ' + fmtSize(p.size) + '. Click a comp to import the project and open that comp.' })
        ]);
        body.appendChild(head);
        var comps = p.comps.filter(function (c) { return match(c.name); });
        if (!comps.length) { body.appendChild(h('div', { class: 'empty', text: p.comps.length ? 'No comps match.' : 'This project has no compositions.' })); return; }
        var grid = h('div', { class: 'grid' });
        comps.forEach(function (c, i) {
            grid.appendChild(h('div', { class: 'card', style: { animationDelay: Math.min(i, 12) * 25 + 'ms' }, title: 'Import and open "' + c.name + '"', onclick: function () {
                SV.toast('Importing "' + c.name + '"…');
                SV.call('importProject', { aep: p.aep, comp: c.name, name: p.name }).then(function (r) { SV.result(r); });
            } }, [
                thumb(c.thumb, 'COMP'),
                h('div', { class: 'cap' }, [h('div', { class: 'c1', text: c.name, title: c.name }), h('div', { class: 'c2', text: (c.w ? c.w + '×' + c.h + ' · ' : '') + (c.dur ? c.dur + 's' : '') })])
            ]));
        });
        body.appendChild(grid);
    }

    SV.registerTab({ id: 'library', label: 'Project Library', icon: 'library', full: render });
})();
