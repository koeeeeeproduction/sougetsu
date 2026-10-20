/* Sowveil - UI Motion Kit: Akira FX's product-demo rigs panel (js/vendor/saasfx.js) - stagger, depth reveal,
   cursor, hover, text, code glyphs, prompt bar, halftone wave, carousel, attach, background, gradient wipe, glass.
   Akira opens it as a modal; Sowveil shows the same panel inside the tab. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    // Akira's panel runs its glass buttons through a global run(fn) -> $._akira.fn()
    window.run = window.run || function (fn) { SV.akira(fn).then(function (r) { SV.result(r); }); };

    var kept = null;   // the panel is built once and moved in and out of the tab, so its settings survive tab switches
    SV.registerTab({
        id: 'motion', label: 'UI Motion Kit', icon: 'motion',
        full: function (root) {
            var api = window.SowveilUIKit;
            if (!kept && api) { try { api.inject(); api.open(); } catch (e) { console.error(e); } kept = document.getElementById('saasfx-modal'); }
            var m = kept;
            if (!m) { root.appendChild(h('div', { class: 'empty', text: 'The UI Motion Kit did not load.' })); return; }
            m.classList.add('active');
            root.appendChild(h('div', { class: 'uikit-wrap' }, [m]));
        }
    });
})();
