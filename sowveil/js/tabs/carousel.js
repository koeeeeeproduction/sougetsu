/* Sowveil - 3D Carousel tab: Akira FX's 3D Carousel builder (js/vendor/carousel3d.js) - look gallery,
   live 3D preview, cards from timeline layers or media files, built by $._svA.buildCarousel3D. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    // the builder keeps references to its DOM, so it is mounted once into a node that moves with the tab
    var wrap = h('div', { id: 'car-view-carousel3d', class: 'car3d-wrap' });

    SV.registerTab({
        id: 'carousel', label: '3D Carousel', icon: 'carousel',
        full: function (root) {
            var api = window.SowveilCarousel3D;
            if (!api) { root.appendChild(h('div', { class: 'empty', text: 'The 3D Carousel module did not load.' })); return; }
            root.appendChild(wrap);
            api.activate();
            var off = SV.on('tab', function (id) { if (id !== 'carousel') { try { api.deactivate(); } catch (e) { } off(); } });
        }
    });
})();
