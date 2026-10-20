/* Sowveil - Backgrounds tab: preset list, animated CSS preview, parameters, add to comp. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var C = function (id, label, def) { return { id: id, label: label, type: 'color', def: def }; };
    var N = function (id, label, min, max, def, unit, step) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, unit: unit, step: step || 1 }; };
    var T = function (id, label, def) { return { id: id, label: label, type: 'toggle', def: def }; };

    var PRESETS = [
        { id: 'mesh', label: 'Mesh Gradient', subtitle: 'Four drifting colours', params: [C('c1', 'Colour 1', '#6d5cff'), C('c2', 'Colour 2', '#ff5ca8'), C('c3', 'Colour 3', '#00c2ff'), C('c4', 'Colour 4', '#ffb35c'), N('blend', 'Blend', 0, 400, 100), T('animate', 'Animate', true), N('speed', 'Speed', 0, 3, 0.4, '', 0.05)] },
        { id: 'aurora', label: 'Aurora', subtitle: 'Soft glowing light', params: [C('base', 'Base', '#07070f'), C('c1', 'Colour 1', '#3cffb0'), C('c2', 'Colour 2', '#6d5cff'), C('c3', 'Colour 3', '#ff5ca8'), N('intensity', 'Intensity', 10, 100, 85, '%'), N('softness', 'Softness', 40, 600, 260), T('animate', 'Animate', true), N('speed', 'Speed', 0, 3, 0.35, '', 0.05)] },
        { id: 'linear', label: 'Linear Gradient', subtitle: 'Two-colour ramp', params: [C('c1', 'Start', '#1b1446'), C('c2', 'End', '#6d5cff'), N('angle', 'Angle', 0, 360, 135, '°'), N('scatter', 'Dither', 0, 50, 8)] },
        { id: 'radial', label: 'Radial Glow', subtitle: 'Centre light falloff', params: [C('c1', 'Centre', '#6d5cff'), C('c2', 'Edge', '#0a0a14'), N('x', 'Centre X', 0, 100, 50, '%'), N('y', 'Centre Y', 0, 100, 45, '%'), N('size', 'Size', 10, 150, 60, '%'), T('animate', 'Drift', false), N('speed', 'Speed', 0, 3, 0.3, '', 0.05)] },
        { id: 'spotlight', label: 'Spotlight', subtitle: 'Light from above', params: [C('c1', 'Light', '#3a3a52'), C('c2', 'Dark', '#060609'), N('y', 'Source Y', -50, 100, 0, '%'), N('reach', 'Reach', 30, 200, 110, '%')] },
        { id: 'grid', label: 'Grid', subtitle: 'Blueprint lines', params: [C('base', 'Base', '#0b0b12'), C('c1', 'Lines', '#8b7dff'), N('spacing', 'Spacing', 16, 300, 80, 'px'), N('line', 'Line width', 1, 10, 2, 'px'), N('opacity', 'Line opacity', 2, 100, 18, '%'), T('animate', 'Scroll', false), N('speed', 'Speed', 0, 200, 30)] },
        { id: 'dots', label: 'Dot Pattern', subtitle: 'Halftone-style dots', params: [C('base', 'Base', '#0b0b12'), C('c1', 'Dots', '#ffffff'), N('spacing', 'Spacing', 12, 200, 48, 'px'), N('dot', 'Dot size', 1, 40, 5, 'px'), N('opacity', 'Opacity', 2, 100, 35, '%'), T('animate', 'Scroll', false), N('speed', 'Speed', 0, 200, 20)] },
        { id: 'grain', label: 'Film Grain', subtitle: 'Overlay texture on top', params: [N('amount', 'Amount', 1, 100, 35, '%'), N('opacity', 'Opacity', 5, 100, 60, '%')] }
    ];

    function preview(box, item, v) {
        box.innerHTML = ''; box.style.background = ''; box.style.backgroundImage = '';
        var s = 0.28;
        if (item.id === 'mesh') {
            box.style.background = 'radial-gradient(at 10% 10%,' + v.c1 + ' 0,transparent 60%),radial-gradient(at 90% 15%,' + v.c2 + ' 0,transparent 60%),radial-gradient(at 15% 90%,' + v.c3 + ' 0,transparent 60%),radial-gradient(at 90% 85%,' + v.c4 + ' 0,transparent 60%),' + v.c1;
            if (v.animate) { box.animate([{ backgroundSize: '100% 100%', backgroundPosition: '0 0' }, { backgroundSize: '140% 140%', backgroundPosition: '30% 20%' }, { backgroundSize: '100% 100%', backgroundPosition: '0 0' }], { duration: 9000 / Math.max(0.1, v.speed), iterations: Infinity }); }
        } else if (item.id === 'aurora') {
            box.style.background = v.base;
            [v.c1, v.c2, v.c3].forEach(function (col, i) {
                var b = h('div', { style: { position: 'absolute', width: '75%', height: '60%', left: (12 + i * 14) + '%', top: (10 + (i % 2) * 25) + '%', borderRadius: '50%', background: col, opacity: v.intensity / 100, filter: 'blur(' + (v.softness * s / 3) + 'px)' } });
                box.appendChild(b);
                if (v.animate) { b.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + (i % 2 ? -18 : 18) + '%,' + (i ? 10 : -10) + '%)' }, { transform: 'translate(0,0)' }], { duration: (7000 + i * 1500) / Math.max(0.1, v.speed), iterations: Infinity, easing: 'ease-in-out' }); }
            });
        } else if (item.id === 'linear') {
            box.style.background = 'linear-gradient(' + (v.angle + 90) + 'deg,' + v.c1 + ',' + v.c2 + ')';
        } else if (item.id === 'radial') {
            box.style.background = 'radial-gradient(circle at ' + v.x + '% ' + v.y + '%,' + v.c1 + ' 0,' + v.c2 + ' ' + v.size + '%)';
        } else if (item.id === 'spotlight') {
            box.style.background = 'radial-gradient(ellipse at 50% ' + v.y + '%,' + v.c1 + ' 0,' + v.c2 + ' ' + v.reach + '%)';
        } else if (item.id === 'grid') {
            var g = Math.max(4, v.spacing * s), a = Math.round(v.opacity * 2.55).toString(16).padStart(2, '0');
            box.style.background = v.base;
            box.style.backgroundImage = 'linear-gradient(' + v.c1 + a + ' ' + Math.max(1, v.line * s) + 'px,transparent 0),linear-gradient(90deg,' + v.c1 + a + ' ' + Math.max(1, v.line * s) + 'px,transparent 0)';
            box.style.backgroundSize = g + 'px ' + g + 'px';
            if (v.animate) { box.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: g + 'px ' + g + 'px' }], { duration: g / Math.max(1, v.speed * s) * 1000, iterations: Infinity }); }
        } else if (item.id === 'dots') {
            var d = Math.max(3, v.spacing * s), a2 = Math.round(v.opacity * 2.55).toString(16).padStart(2, '0');
            box.style.background = v.base;
            box.style.backgroundImage = 'radial-gradient(' + v.c1 + a2 + ' ' + Math.max(0.6, v.dot * s / 2) + 'px,transparent ' + Math.max(0.8, v.dot * s / 2 + 0.6) + 'px)';
            box.style.backgroundSize = d + 'px ' + d + 'px';
            if (v.animate) { box.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: '0 ' + d + 'px' }], { duration: d / Math.max(1, v.speed * s) * 1000, iterations: Infinity }); }
        } else if (item.id === 'grain') {
            box.style.background = 'linear-gradient(135deg,#6d5cff,#ff5ca8)';
            var svg = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>') + '")';
            var gr = h('div', { style: { position: 'absolute', inset: '-20px', backgroundImage: svg, opacity: v.amount / 100 * v.opacity / 100 * 1.6, mixBlendMode: 'overlay' } });
            box.appendChild(gr);
            gr.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-10px,6px)' }, { transform: 'translate(7px,-8px)' }], { duration: 300, iterations: Infinity, easing: 'steps(3)' });
        }
    }

    SV.registerTab({
        id: 'backgrounds', label: 'Backgrounds', icon: 'bg',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            var box = h('div', { class: 'preview' });
            el.appendChild(SV.ui.section('Live preview', [box]));
            var redraw = function () { box.getAnimations ? box.getAnimations({ subtree: true }).forEach(function (an) { an.cancel(); }) : 0; preview(box, item, v); };
            el.appendChild(SV.ui.params('backgrounds', item, v, redraw));
            el.appendChild(SV.ui.section('', [
                SV.ui.action(item.id === 'grain' ? 'Add grain on top' : 'Add background to comp', function () {
                    return SV.call('background', Object.assign({ kind: item.id, label: item.label }, v)).then(function (r) { SV.result(r); });
                }),
                h('div', { class: 'hint', text: item.id === 'grain' ? 'Adds an overlay grain layer above everything.' : 'Placed at the bottom of the active comp. Every setting stays editable in Effect Controls / Contents.' })
            ]));
            redraw();
        }
    });
})();
