/* Sowveil - Glass tab: frosted glass panels (Glass Morph engine from Akira FX) and the optional
   Liquid Glass effect plugin, with a live preview. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var PRESETS = [
        { id: 'panel', label: 'Glass Panel', subtitle: 'New frosted card', desc: 'Adds a rounded glass card in the middle of the comp: blurred backdrop, soft white fill, hairline edge and a drop shadow. Move, scale or rotate the "Glass Panel" layer - the blur follows.',
          run: function () { return SV.akira('applyGlassMorph', [], 'Glass panel added.'); }, cta: 'Add glass panel' },
        { id: 'selection', label: 'Glass From Selection', subtitle: 'Your shapes become glass', desc: 'Turns the selected layers (shapes, text, logos) into glass: whatever is behind them is blurred inside their outline.',
          run: function () { return SV.akira('applyGlassMorphShape', [], 'Glass applied.'); }, cta: 'Make selection glass' },
        { id: 'liquid', label: 'Liquid Glass', subtitle: 'Refractive glass (plugin)', desc: 'Uses the separate "Liquid Glass" effect plugin (if you have it installed) to bend the background through the selected shape layers.', toggle: true,
          run: function (v) { return SV.akira('convertSelectedShapesToLiquidGlass', [v.hide ? 'true' : 'false'], 'Converted to Liquid Glass.'); }, cta: 'Convert to Liquid Glass' },
        { id: 'track', label: 'Track Liquid Glass', subtitle: 'Re-link glass to a shape', desc: 'Select one source shape plus the Liquid Glass layers, and they will follow that shape.', toggle: true,
          run: function (v) { return SV.akira('trackLiquidGlassToShape', [v.hide ? 'true' : 'false'], 'Glass tracked.'); }, cta: 'Track to shape' },
        { id: 'remove', label: 'Remove Glass', subtitle: 'Clean up glass layers', desc: 'Select any part of a glass setup (or nothing) and remove the glass layers Sowveil created. Your own layers are kept.',
          run: function () { return SV.akira('removeGlassMorph', [], 'Glass removed.'); }, cta: 'Remove glass', danger: true }
    ];
    PRESETS.forEach(function (p) { p.params = p.toggle ? [{ id: 'hide', label: 'Hide the source shape', type: 'toggle', def: true }] : []; });

    function preview(box, item) {
        box.innerHTML = '';
        var bg = h('div', { class: 'gl-bg' }, [h('i', { class: 'gl-b1' }), h('i', { class: 'gl-b2' }), h('i', { class: 'gl-b3' })]);
        box.appendChild(bg);
        if (item.id === 'remove') { box.appendChild(h('div', { class: 'gl-card gl-gone', text: 'glass removed' })); return; }
        var cls = item.id === 'liquid' || item.id === 'track' ? 'gl-card gl-liquid' : 'gl-card';
        var card = h('div', { class: cls }, [h('div', { class: 'gl-line w60' }), h('div', { class: 'gl-line w40' }), h('div', { class: 'gl-pill' })]);
        if (item.id === 'selection') { card = h('div', { class: 'gl-word', text: 'GLASS' }); }
        box.appendChild(card);
    }

    SV.registerTab({
        id: 'glass', label: 'Glass', icon: 'glass',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            el.appendChild(h('div', { class: 'section ex-head' }, [h('div', { class: 'ex-title', text: item.label }), h('div', { class: 'ex-desc', style: { marginTop: '6px' }, text: item.desc })]));
            var box = h('div', { class: 'preview gl-stage' });
            el.appendChild(SV.ui.section('Live preview', [box]));
            if (item.params.length) { el.appendChild(SV.ui.params('glass', item, v)); }
            el.appendChild(SV.ui.section('', [SV.ui.action(item.cta, function () { return item.run(v).then(function (r) { SV.result(r); }); }, item.danger ? 'danger' : '')]));
            preview(box, item);
        }
    });
})();
