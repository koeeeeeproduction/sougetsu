/* Sowveil - Backgrounds tab: the animated palette gradients from Akira FX. Every card is a live
   preview of the orbiting 4-colour gradient that gets built in After Effects. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var PALETTES = [
        { label: 'Deep Navy', colors: ["#050B14", "#0A192F", "#112240", "#233554"] },
        { label: 'Electric Purple', colors: ["#1E053A", "#3A0CA3", "#4361EE", "#4CC9F0"] },
        { label: 'Vibrant Green', colors: ["#00A344", "#00C652", "#33D675", "#66E598"] },
        { label: 'Warm Orange', colors: ["#E63946", "#F07167", "#FFB703", "#FB8500"] },
        { label: 'Light Blue', colors: ["#8ECAE6", "#219EBC", "#023047", "#126782"] },
        { label: 'Floral Blue', colors: ["#08101E", "#1A365D", "#2B6CB0", "#63B3ED"] },
        { label: 'Neutral Grey', colors: ["#F8F9FA", "#E9ECEF", "#DEE2E6", "#CED4DA"] },
        { label: 'Studio Crimson', colors: ["#0A0005", "#1D0312", "#3B0625", "#660A3B"] },
        { label: 'Deep Plum', colors: ["#0A0616", "#180D2F", "#2E165E", "#4E1E96"] },
        { label: 'Vibrant Magenta', colors: ["#FF94D1", "#FF4DB8", "#C529FF", "#7B1BFF"] },
        { label: 'Soft Lilac', colors: ["#FFFFFF", "#FCF3FF", "#F8E2FF", "#F1C9FF"] },
        { label: 'Dark Violet', colors: ["#140E24", "#24193F", "#392562", "#563690"] },
        { label: 'Neon Glow', colors: ["#FF1E89", "#D500F9", "#651FFF", "#3D00B7"] },
        { label: 'Neutral Grey 2', colors: ["#F8F9FA", "#F1F3F5", "#E9ECEF", "#DEE2E6"] },
        { label: 'Neon Magenta', colors: ["#FF0055", "#FF1E89", "#D500F9", "#9D00FF"] },
        { label: 'Deep Void', colors: ["#000000", "#0A0A0A", "#141414", "#222222"] },
        { label: 'Gamer Rgb', colors: ["#00FFFF", "#3A86FF", "#8338EC", "#FF006E"] },
        { label: 'Wing Sunset', colors: ["#023047", "#219EBC", "#FFB703", "#FB8500"] },
        { label: 'Aero Blue', colors: ["#48CAE4", "#90E0EF", "#CAF0F8", "#FFFFFF"] },
        { label: 'Retro Sunset', colors: ["#2B2D42", "#8D99AE", "#EF233C", "#D90429"] },
        { label: 'Pastel Dream', colors: ["#FFB5A7", "#FCD5CE", "#F8EDEB", "#F9DEC9"] },
        { label: 'Mint Fresh', colors: ["#E8F5E9", "#A5D6A7", "#66BB6A", "#43A047"] },
        { label: 'Cyberpunk', colors: ["#0B0C10", "#1F2833", "#C5A059", "#45A29E"] },
        { label: 'Ocean Depths', colors: ["#03045E", "#0077B6", "#00B4D8", "#90E0EF"] },
        { label: 'Forest Mist', colors: ["#1E352F", "#3E6359", "#789D90", "#A9CBB7"] },
        { label: 'Golden Hour', colors: ["#3D2645", "#8338EC", "#FF006E", "#FFBE0B"] },
        { label: 'Lavender Haze', colors: ["#312244", "#4D3B66", "#846CA8", "#E0B1CB"] },
        { label: 'Monochrome Tech', colors: ["#121212", "#242424", "#3a3a3a", "#e0e0e0"] },
        { label: 'Vintage Oat', colors: ["#D8C3A5", "#8E8D8A", "#E98074", "#E85D04"] },
        { label: 'Sherbet', colors: ["#FF9F1C", "#FFBF69", "#FFFFFF", "#2EC4B6"] },
        { label: 'Deep Berry', colors: ["#2B1B17", "#5C2626", "#9E2A2B", "#E07A5F"] }
    ];
    var ORBITS = [[0.22, 0.24, 0.20, 0.14, 0.00, 1], [0.78, 0.26, 0.17, 0.19, 0.35, -1], [0.24, 0.76, 0.19, 0.16, 0.62, -1], [0.76, 0.74, 0.16, 0.20, 0.85, 1]];
    var query = '';

    function custom() { return SV.get('bgCustom', []); }
    function swatchCard(p, i, opts) {
        var art = h('div', { class: 'thumb bg-art', style: { background: p.colors[0] } });
        p.colors.slice(0, 4).forEach(function (c, k) {
            var o = ORBITS[k], blob = h('i', { class: 'bg-blob', style: { left: (o[0] * 100) + '%', top: (o[1] * 100) + '%', background: 'radial-gradient(circle, ' + c + ' 0, ' + c + 'cc 25%, transparent 68%)',
                animationDuration: (9 + k * 1.7) + 's', animationDirection: o[5] > 0 ? 'normal' : 'reverse', animationDelay: (-o[4] * 9) + 's', '--rx': (o[2] * 100) + '%', '--ry': (o[3] * 100) + '%' } });
            art.appendChild(blob);
        });
        var dots = h('div', { class: 'bg-dots' }, p.colors.slice(0, 4).map(function (c) { return h('span', { style: { background: c } }); }));
        var card = h('div', { class: 'card', style: { animationDelay: Math.min(i, 16) * 18 + 'ms' }, title: 'Build ' + p.label, onclick: function () { apply(p); } },
            [art, h('div', { class: 'cap' }, [h('div', { class: 'c1', text: p.label }), dots])]);
        if (opts && opts.remove) { card.appendChild(h('button', { class: 'del', text: '✕', title: 'Delete palette', onclick: function (e) { e.stopPropagation(); opts.remove(); } })); }
        return card;
    }
    function apply(p) {
        SV.toast('Building ' + p.label + '…');
        SV.call('animatedGradient', { label: p.label, colors: p.colors, target: SV.get('bgTarget', 'new'), blend: SV.get('bgBlend', 120), loops: SV.get('bgLoops', 1) }).then(function (r) { SV.result(r); });
    }

    function render(root) {
        root.innerHTML = '';
        var search = h('input', { placeholder: 'Search palettes', value: query });
        var bar = h('div', { class: 'toolbar' }, [h('div', { class: 'search', html: SV.icon('search') })]);
        bar.firstChild.appendChild(search);
        var tgt = SV.ui.param({ type: 'seg', label: '', options: [['new', 'New layer'], ['layer', 'Selected layer']] }, SV.get('bgTarget', 'new'), function (v) { SV.set('bgTarget', v); });
        tgt.firstChild.remove(); tgt.style.margin = 0; bar.appendChild(tgt);
        var opts = h('div', { class: 'section bg-opts' }, [
            SV.ui.param({ type: 'number', label: 'Blend', min: 0, max: 400, step: 5, def: 120 }, SV.get('bgBlend', 120), function (v) { SV.set('bgBlend', v); }),
            SV.ui.param({ type: 'number', label: 'Orbits over the layer', min: 0.25, max: 6, step: 0.25, def: 1 }, SV.get('bgLoops', 1), function (v) { SV.set('bgLoops', v); }),
            h('div', { class: 'hint', text: 'Click a palette to build it. New layer = full-comp background at the bottom; Selected layer = the gradient animates across that layer\'s own duration.' })
        ]);
        var grid = h('div', { class: 'grid' });
        root.appendChild(bar); root.appendChild(opts); root.appendChild(grid);
        function draw() {
            grid.innerHTML = '';
            var q = query.toLowerCase(), i = 0;
            // custom palette maker
            if (!q) {
                var cols = SV.get('bgDraft', ['#6d5cff', '#ff5ca8', '#00c2ff', '#ffb35c']);
                var pick = h('div', { class: 'bg-pick' }, cols.map(function (c, k) {
                    var inp = h('input', { type: 'color', value: c }); inp.addEventListener('input', function () { cols[k] = inp.value; SV.set('bgDraft', cols); sw.style.background = inp.value; });
                    var sw = h('label', { class: 'swatch', style: { background: c } }, [inp]); return sw;
                }));
                grid.appendChild(h('div', { class: 'card bg-new' }, [h('div', { class: 'thumb' }, [pick]), h('div', { class: 'cap' }, [
                    h('div', { class: 'c1', text: 'Your palette' }),
                    h('div', { style: { display: 'flex', gap: '4px', marginTop: '4px' } }, [
                        h('button', { class: 'btn small', text: 'Build', onclick: function () { apply({ label: 'Custom', colors: cols.slice() }); } }),
                        h('button', { class: 'btn ghost small', text: 'Save', onclick: function () { var list = custom(); list.unshift({ label: 'Custom ' + (list.length + 1), colors: cols.slice() }); SV.set('bgCustom', list); draw(); } })
                    ])])]));
            }
            custom().forEach(function (p, k) {
                if (q && p.label.toLowerCase().indexOf(q) < 0) { return; }
                grid.appendChild(swatchCard(p, i++, { remove: function () { var list = custom(); list.splice(k, 1); SV.set('bgCustom', list); draw(); } }));
            });
            PALETTES.forEach(function (p) { if (!q || p.label.toLowerCase().indexOf(q) >= 0) { grid.appendChild(swatchCard(p, i++)); } });
            if (!grid.children.length) { grid.appendChild(h('div', { class: 'empty', text: 'No palette matches "' + query + '".' })); }
        }
        search.addEventListener('input', function () { query = search.value.trim(); draw(); });
        draw();
    }

    SV.registerTab({ id: 'backgrounds', label: 'Backgrounds', icon: 'bg', full: render });
})();
