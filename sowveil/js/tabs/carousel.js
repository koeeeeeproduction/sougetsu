/* Sowveil - 3D Carousel tab: style list, live CSS-3D preview, parameters, build from selected layers. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var N = function (id, label, min, max, def, unit, step) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, unit: unit, step: step || 1 }; };
    function params(o) {
        return [
            N('radius', 'Radius px (0 = auto)', 0, 3000, 0, '', 10),
            N('tilt', 'Tilt', -60, 60, o.tilt, '°'),
            N('spin', 'Spin', -180, 180, o.spin, '°/s'),
            N('rise', 'Spiral rise', 0, 300, o.rise || 0, 'px'),
            N('backOpacity', 'Back opacity', 0, 100, o.back, '%'),
            { id: 'faceCamera', label: 'Cards face camera', type: 'toggle', def: !!o.face },
            N('copies', 'Copies (one layer selected)', 2, 24, 8),
            { id: 'camera', label: 'Add a camera if missing', type: 'toggle', def: true }
        ];
    }
    var PRESETS = [
        { id: 'ring', label: 'Ring', subtitle: 'Classic turning ring', axis: 'y', params: params({ tilt: 12, spin: 20, back: 35 }) },
        { id: 'showcase', label: 'Showcase', subtitle: 'Flat, slow, front focus', axis: 'y', params: params({ tilt: 0, spin: 10, back: 15 }) },
        { id: 'orbit', label: 'Orbit', subtitle: 'Cards always face you', axis: 'y', params: params({ tilt: 22, spin: 30, back: 45, face: true }) },
        { id: 'wheel', label: 'Ferris Wheel', subtitle: 'Vertical rotation', axis: 'x', params: params({ tilt: 0, spin: 18, back: 30 }) },
        { id: 'spiral', label: 'Spiral', subtitle: 'Rising helix', axis: 'y', params: params({ tilt: 10, spin: 25, back: 30, rise: 60 }) }
    ];
    var COLORS = ['#6d5cff', '#ff5ca8', '#00c2ff', '#ffb35c', '#3cffb0', '#ff7a59', '#b45cff', '#5cffea'];

    function preview(box, item, v) {
        box.innerHTML = '';
        var n = Math.min(12, Math.max(6, SV.selInfo.layers > 1 ? SV.selInfo.layers : v.copies));
        var scene = h('div', { style: { position: 'absolute', inset: 0, perspective: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' } });
        var ring = h('div', { style: { position: 'relative', width: '1px', height: '1px', transformStyle: 'preserve-3d', transform: 'rotateX(' + (-v.tilt) + 'deg)' } });
        var spinner = h('div', { style: { position: 'absolute', transformStyle: 'preserve-3d' } });
        var r = v.radius > 0 ? Math.min(120, v.radius * 0.12) : Math.max(60, 46 * n / (2 * Math.PI) * 1.25);
        for (var i = 0; i < n; i++) {
            var ang = i * 360 / n, rise = (i - (n - 1) / 2) * v.rise * 0.12;
            var t = item.axis === 'x'
                ? 'rotateX(' + (-ang) + 'deg) translateZ(' + r + 'px) translateX(' + rise + 'px)'
                : 'rotateY(' + ang + 'deg) translateZ(' + r + 'px) translateY(' + rise + 'px)' + (v.faceCamera ? ' rotateY(' + (-ang) + 'deg)' : '');
            spinner.appendChild(h('div', { style: { position: 'absolute', left: '-22px', top: '-15px', width: '44px', height: '30px', borderRadius: '6px', background: COLORS[i % COLORS.length], boxShadow: '0 4px 14px rgba(0,0,0,.25)', transform: t, backfaceVisibility: 'visible' } }));
        }
        ring.appendChild(spinner); scene.appendChild(ring); box.appendChild(scene);
        var axis = item.axis === 'x' ? 'rotateX' : 'rotateY', dir = v.spin >= 0 ? -1 : 1, period = 360 / Math.max(1, Math.abs(v.spin)) * 1000;
        spinner.animate([{ transform: axis + '(0deg)' }, { transform: axis + '(' + (dir * 360) + 'deg)' }], { duration: Math.min(period, 60000), iterations: Infinity });
    }

    SV.registerTab({
        id: 'carousel', label: '3D Carousel', icon: 'carousel',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            var box = h('div', { class: 'preview' });
            el.appendChild(SV.ui.section('Live preview', [box]));
            var redraw = function () { preview(box, item, v); };
            el.appendChild(SV.ui.params('carousel', item, v, redraw));
            el.appendChild(SV.ui.section('', [
                SV.ui.action('Build carousel from selection', function () {
                    return SV.call('carousel', Object.assign({ preset: item.id, axis: item.axis }, v)).then(function (r) { SV.result(r); });
                }),
                h('div', { class: 'hint', text: 'Select 2+ layers (images, precomps, shapes, text) - or one layer to duplicate it. A controller null keeps Radius, Rotation, Spin, Rise, Back Opacity and Face Camera live; tilt or move the null to move the whole ring.' })
            ]));
            redraw();
            var off = SV.on('selection', redraw), off2 = SV.on('inspector:leave', function () { off(); off2(); });
        }
    });
})();
