/* Sowveil - UI Animations tab: the UI effects engine from Akira FX (stagger, cursor, hover, wipe,
   halftone wave, prompt bar, code glyphs, UI carousel, attach, UI text) with small live previews. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var N = function (id, label, min, max, def, step, unit) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, step: step || 1, unit: unit }; };
    var T = function (id, label, def) { return { id: id, label: label, type: 'toggle', def: def }; };
    var C = function (id, label, def) { return { id: id, label: label, type: 'color', def: def }; };
    var S = function (id, label, def, opts) { return { id: id, label: label, type: 'seg', def: def, options: opts }; };
    var L = function (id, label, def, opts) { return { id: id, label: label, type: 'select', def: def, options: opts }; };
    var X = function (id, label, def, ph) { return { id: id, label: label, type: 'text', def: def, placeholder: ph }; };
    var enc = encodeURIComponent;

    var PRESETS = [
        { id: 'stagger', label: 'UI Stagger', subtitle: 'Cards cascade in', hint: 'Select the UI layers (cards, buttons, rows). A control null keeps delay and timing editable.',
          params: [L('style', 'Style', 'rise', [['rise', 'Rise'], ['pop', 'Pop'], ['bounce', 'Bounce'], ['scale', 'Scale'], ['blur', 'Blur'], ['fade', 'Fade']]), L('order', 'Order', 'top', [['top', 'Top to bottom'], ['left', 'Left to right'], ['stack', 'Layer stack'], ['random', 'Random']]),
              N('delay', 'Delay', 0, 1, 0.08, 0.01, 's'), N('duration', 'Duration', 0.1, 3, 0.6, 0.05, 's'), N('rise', 'Distance', 0, 300, 40, 1, 'px'), T('controller', 'Control null', true)],
          run: function (v) { return SV.motion('stagger', v); } },
        { id: 'cursor', label: '3D Cursor', subtitle: 'Moves and clicks your UI', hint: 'Select the buttons/cards in the order the cursor should click them.',
          params: [S('style', 'Cursor', 'arrow', [['arrow', 'Arrow'], ['hand', 'Hand'], ['dot', 'Dot']]), L('order', 'Order', 'stack', [['stack', 'Selection'], ['bottom', 'Bottom up'], ['position', 'By position']]),
              N('travel', 'Travel time', 0.1, 3, 0.7, 0.05, 's'), N('hold', 'Hold', 0.05, 3, 0.5, 0.05, 's'), N('size', 'Size', 20, 300, 100, 1, '%'), N('click', 'Click depth', 0, 60, 16),
              T('tilt', '3D tilt', true), T('ripple', 'Click ripple', true), T('shadow', 'Shadow', true), T('press', 'Press targets', true), C('fill', 'Fill', '#ffffff'), C('stroke', 'Stroke', '#111111')],
          run: function (v) { return SV.motion('cursor', v); } },
        { id: 'hover', label: 'Proximity Hover', subtitle: 'Cards lift near the cursor', hint: 'Select the cards. They lift and grow as the cursor (or a null) passes over them.',
          params: [N('radius', 'Radius', 40, 1000, 260, 5, 'px'), N('lift', 'Lift', 0, 80, 14), N('grow', 'Grow', 0, 40, 6, 1, '%'), T('shadow', 'Shadow', true)],
          run: function (v) { return SV.motion('hover', v); } },
        { id: 'wipe', label: 'Gradient Wipe', subtitle: 'Feathered directional reveal', hint: 'Select the layers to reveal; they wipe on one after another from the playhead.',
          params: [S('direction', 'From', 'left', [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']]), N('duration', 'Duration', 0.05, 4, 0.8, 0.05, 's'), N('delay', 'Stagger', 0, 1, 0.1, 0.01, 's'), N('feather', 'Feather', 0, 600, 160, 5)],
          run: function (v) { return SV.motion('wipe', v); } },
        { id: 'halftone', label: 'Halftone Wave', subtitle: 'Expanding ring of dots', hint: 'Select a layer to emit from (or nothing for the comp centre).',
          params: [C('color', 'Colour', '#8b7dff'), L('waves', 'Waves', '1', [['1', '1'], ['2', '2'], ['3', '3']]), N('duration', 'Duration', 0.2, 5, 1, 0.05, 's'), N('interval', 'Wave gap', 0, 2, 0.35, 0.05, 's'),
              N('ring', 'Ring width', 10, 600, 150, 5), N('softness', 'Softness', 0, 200, 50), N('spacing', 'Dot spacing', 4, 120, 22), N('dot', 'Dot size', 5, 100, 45, 1, '%'), N('distortion', 'Distortion', 0, 200, 60), T('glow', 'Glow', true)],
          run: function (v) { return SV.motion('halftoneWave', v); } },
        { id: 'prompt', label: 'AI Prompt Bar', subtitle: 'Typing search / prompt UI', hint: 'Builds a prompt bar that types your text.',
          params: [X('text', 'Typed text', 'create a landing page for my business'), X('placeholder', 'Placeholder', 'Ask anything...'), N('cps', 'Typing speed', 2, 60, 16, 1, 'chars/s'), C('accent', 'Accent', '#8b7dff')],
          run: function (v) { return SV.motion('promptBar', { text: enc(v.text), placeholder: enc(v.placeholder), cps: v.cps, accent: enc(v.accent) }); } },
        { id: 'glyphs', label: 'Code Glyphs', subtitle: 'Code + glyph rain template', hint: 'Builds a tech headline with glyph rain and scrolling code. Use | in the headline to split it into beats.',
          params: [X('text', 'Headline', 'Sowveil | ships every frame'), L('palette', 'Palette', 'mint', [['mint', 'Mint'], ['aurora', 'Aurora'], ['sunset', 'Sunset']]), C('accent', 'Accent', '#8b7dff'),
              N('count', 'Glyph count', 4, 120, 28), N('density', 'Density', 5, 100, 55, 1, '%'), N('rate', 'Rate', 1, 30, 6), N('duration', 'Duration', 2, 30, 8, 0.5, 's'), T('codeOn', 'Code layer', true), T('bg', 'Background', true)],
          run: function (v) {
              return SV.motion('codeGlyphs', { text: enc(v.text), glyphs: enc('/ / / / / / / / / / / < > * - | \\'), code: enc('const app = express();\nawait db.connect();\nres.json({ ok: true });\nexport default handler;'),
                  palette: v.palette, accent: enc(v.accent), count: v.count, density: v.density, rate: v.rate, duration: v.duration, codeOn: v.codeOn, bg: v.bg });
          } },
        { id: 'ui-carousel', label: 'UI Carousel', subtitle: 'Cards slide through focus', hint: 'Select the cards in order; one at a time slides into the focus spot.',
          params: [N('hold', 'Hold', 0.1, 5, 1, 0.05, 's'), N('move', 'Move', 0.1, 3, 0.6, 0.05, 's'), N('gap', 'Gap', 0, 400, 40), N('focus', 'Focus scale', 40, 200, 100, 1, '%'), N('side', 'Side scale', 20, 150, 82, 1, '%'), N('sideOpacity', 'Side opacity', 0, 100, 45, 1, '%'), T('loop', 'Loop', true)],
          run: function (v) { return SV.motion('carousel', v); } },
        { id: 'ui-text', label: 'UI Text', subtitle: 'Letters, words, typing, scramble', hint: 'Select text layers.',
          params: [L('mode', 'Mode', 'letters', [['letters', 'Letters'], ['words', 'Words'], ['color', 'Colour sweep'], ['scramble', 'Scramble'], ['typing', 'Typing'], ['colortype', 'Colour typing']]),
              N('duration', 'Duration', 0.1, 4, 0.8, 0.05, 's'), N('rise', 'Rise', 0, 200, 40), C('color', 'Colour', '#8b7dff'), N('cps', 'Typing speed', 2, 60, 14, 1, 'chars/s'), T('caret', 'Caret', true)],
          run: function (v) { return SV.motion('textAnim', v); } },
        { id: 'attach', label: 'Attach Layer', subtitle: 'Follow without parenting', hint: 'Select the follower first, then the layer to follow.',
          params: [T('rotation', 'Follow rotation', false), T('scale', 'Follow scale', false)],
          run: function (v) { return SV.motion('attach', v); } }
    ];

    // ---------- small live previews ----------
    function card(x, y, w, hh, extra) { return h('div', { class: 'mo-card', style: Object.assign({ left: x + '%', top: y + '%', width: w + '%', height: hh + '%' }, extra || {}) }); }
    function preview(box, item, v) {
        box.innerHTML = ''; var A = [], loop = { iterations: Infinity };
        function anim(el, frames, o) { A.push(el.animate(frames, Object.assign({ fill: 'both' }, loop, o))); }
        var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        if (item.id === 'stagger' || item.id === 'ui-carousel' || item.id === 'hover' || item.id === 'cursor' || item.id === 'wipe') {
            var cards = [0, 1, 2].map(function (i) { var c = card(12 + i * 27, 30, 22, 40); box.appendChild(c); return c; });
            var period = 3000;
            if (item.id === 'stagger') {
                var from = { rise: 'translateY(30px)', pop: 'scale(.4)', bounce: 'translateY(40px)', scale: 'scale(.6)', blur: 'none', fade: 'none' }[v.style];
                cards.forEach(function (c, i) {
                    var d = v.delay * 1000 * i, dur = v.duration * 1000;
                    anim(c, [{ opacity: 0, transform: from, filter: v.style === 'blur' ? 'blur(8px)' : 'none', offset: 0 }, { opacity: 0, transform: from, offset: d / period },
                        { opacity: 1, transform: v.style === 'bounce' || v.style === 'pop' ? 'scale(1.08)' : 'none', filter: 'none', offset: Math.min(0.95, (d + dur * 0.7) / period) },
                        { opacity: 1, transform: 'none', offset: Math.min(0.97, (d + dur) / period) }, { opacity: 1, transform: 'none', offset: 1 }], { duration: period, easing: 'ease-out' });
                });
            } else if (item.id === 'wipe') {
                var dir = { left: 'to right', right: 'to left', top: 'to bottom', bottom: 'to top' }[v.direction];
                cards.forEach(function (c, i) {
                    c.style.webkitMaskImage = 'linear-gradient(' + dir + ', #000 40%, transparent 60%)'; c.style.webkitMaskSize = '300% 300%';
                    var pos = { left: ['100% 0', '0 0'], right: ['0 0', '100% 0'], top: ['0 100%', '0 0'], bottom: ['0 0', '0 100%'] }[v.direction];
                    anim(c, [{ webkitMaskPosition: pos[0], offset: 0 }, { webkitMaskPosition: pos[0], offset: i * v.delay * 1000 / period }, { webkitMaskPosition: pos[1], offset: Math.min(0.9, (i * v.delay + v.duration) * 1000 / period) }, { webkitMaskPosition: pos[1], offset: 1 }], { duration: period });
                });
            } else {
                var cur = h('div', { class: 'mo-cursor' + (v.style === 'dot' ? ' dot' : '') }); box.appendChild(cur);
                var stops = [[20, 75], [47, 50], [74, 50], [20, 75]];
                anim(cur, stops.map(function (p, i) { return { left: p[0] + '%', top: p[1] + '%', offset: i / (stops.length - 1) }; }), { duration: period, easing: 'ease-in-out' });
                cards.forEach(function (c, i) {
                    var t = (i + 1) / 3 * 0.66;
                    if (item.id === 'hover') { anim(c, [{ transform: 'none', boxShadow: 'none', offset: 0 }, { transform: 'none', offset: Math.max(0, t - 0.12) }, { transform: 'translateY(-' + v.lift * 0.5 + 'px) scale(' + (1 + v.grow / 100) + ')', boxShadow: '0 10px 18px rgba(0,0,0,.35)', offset: t }, { transform: 'none', boxShadow: 'none', offset: Math.min(1, t + 0.15) }, { transform: 'none', offset: 1 }], { duration: period }); }
                    else if (item.id === 'cursor') { anim(c, [{ transform: 'none', offset: 0 }, { transform: 'none', offset: Math.max(0, t - 0.03) }, { transform: 'scale(.92)', offset: t }, { transform: 'none', offset: Math.min(1, t + 0.06) }, { transform: 'none', offset: 1 }], { duration: period }); }
                    else { anim(c, [{ transform: 'translateX(' + (-i * 100) + '%) scale(' + v.side / 100 + ')', opacity: v.sideOpacity / 100 }, { transform: 'translateX(' + ((2 - i) * 100) + '%) scale(' + v.side / 100 + ')', opacity: v.sideOpacity / 100 }], { duration: period * 1.2, easing: 'steps(3, jump-none)' }); }
                });
            }
        } else if (item.id === 'halftone') {
            var dots = h('div', { class: 'mo-dots', style: { backgroundImage: 'radial-gradient(' + v.color + ' ' + (v.dot / 100 * 3) + 'px, transparent ' + (v.dot / 100 * 3 + 0.8) + 'px)', backgroundSize: Math.max(4, v.spacing * 0.35) + 'px ' + Math.max(4, v.spacing * 0.35) + 'px' } });
            box.appendChild(dots);
            var ring = Math.max(4, v.ring * 0.08), soft = v.softness * 0.1, waves = +v.waves || 1, dur = Math.max(0.2, v.duration) * 1000, gap = v.interval * 1000, t0 = performance.now();
            (function tick(now) {
                var t = (now - t0) % (dur + gap * (waves - 1) + 700), stops = [];
                for (var w = 0; w < waves; w++) {
                    var u = (t - w * gap) / dur; if (u < 0 || u > 1) { continue; }
                    var r = (1 - Math.pow(1 - u, 2)) * 190, a = Math.max(0, r - ring);
                    stops.push('radial-gradient(circle at 50% 50%, transparent ' + a + 'px, #000 ' + (a + soft) + 'px, #000 ' + r + 'px, transparent ' + (r + soft) + 'px)');
                }
                dots.style.webkitMaskImage = stops.length ? stops.join(',') : 'linear-gradient(transparent, transparent)';
                box._raf = requestAnimationFrame(tick);
            })(t0);
            if (v.glow) { dots.style.filter = 'drop-shadow(0 0 6px ' + v.color + ')'; }
        } else if (item.id === 'prompt') {
            var bar = h('div', { class: 'mo-prompt', style: { borderColor: v.accent } }), txt = h('span'), caret = h('i', { class: 'mo-caret', style: { background: v.accent } });
            bar.appendChild(txt); bar.appendChild(caret); box.appendChild(bar);
            var full = v.text || v.placeholder, idx = 0, iv = setInterval(function () { idx = (idx + 1) % (full.length + 25); txt.textContent = idx ? full.slice(0, Math.min(idx, full.length)) : ''; txt.style.opacity = idx ? 1 : .5; if (!idx) { txt.textContent = v.placeholder; } }, 1000 / Math.max(2, v.cps));
            box._iv = iv;
        } else if (item.id === 'glyphs') {
            var pal = { mint: ['#3cffb0', '#0b1410'], aurora: ['#8b7dff', '#0b0b18'], sunset: ['#ffb35c', '#1a0d0a'] }[v.palette];
            box.style.background = v.bg ? pal[1] : '';
            var head = h('div', { class: 'mo-glyph-head', text: (v.text || '').split('|')[0], style: { color: '#fff' } }), rain = h('div', { class: 'mo-rain', style: { color: pal[0] } });
            box.appendChild(rain); box.appendChild(head);
            var G = '/<>*-|\\{}01'; box._iv = setInterval(function () { var s = ''; for (var i = 0; i < Math.round(v.count * 1.6); i++) { s += Math.random() * 100 < v.density ? G.charAt(Math.floor(Math.random() * G.length)) : ' '; } rain.textContent = s; }, 1000 / v.rate);
        } else if (item.id === 'ui-text') {
            var word = h('div', { class: 'tp-stage', style: { fontSize: '24px' } }); box.appendChild(word);
            'Ship faster'.split('').forEach(function (ch, i) {
                var sp = h('span', { class: 'tp-unit', text: ch === ' ' ? ' ' : ch }); word.appendChild(sp);
                anim(sp, [{ opacity: 0, transform: 'translateY(' + v.rise * 0.4 + 'px)', color: v.mode.indexOf('color') >= 0 ? v.color : '' }, { opacity: 1, transform: 'none', color: '' }], { duration: v.duration * 1000, delay: i * 60, iterations: 1, easing: 'ease-out' });
            });
            box._iv = setInterval(function () { preview(box, item, v); }, v.duration * 1000 + 1600);
        } else if (item.id === 'attach') {
            var lead = card(20, 35, 18, 30), fol = h('div', { class: 'mo-cursor dot' }); box.appendChild(lead); box.appendChild(fol);
            anim(lead, [{ transform: 'translate(0,0)' }, { transform: 'translate(160%, -40%)' }, { transform: 'translate(0,0)' }], { duration: 3000, easing: 'ease-in-out' });
            anim(fol, [{ left: '29%', top: '30%' }, { left: '58%', top: '18%' }, { left: '29%', top: '30%' }], { duration: 3000, easing: 'ease-in-out' });
        }
        box._anims = A;
    }
    function stop(box) { (box._anims || []).forEach(function (a) { a.cancel(); }); clearInterval(box._iv); cancelAnimationFrame(box._raf); }

    SV.registerTab({
        id: 'motion', label: 'UI Animations', icon: 'motion',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            var box = h('div', { class: 'preview mo-stage' });
            el.appendChild(SV.ui.section('Live preview', [box]));
            var redraw = function () { stop(box); preview(box, item, v); };
            el.appendChild(SV.ui.params('motion', item, v, redraw));
            el.appendChild(SV.ui.section('', [SV.ui.action('Apply ' + item.label, function () { return item.run(v).then(function (r) { SV.result(r, item.label + ' applied.'); }); }), h('div', { class: 'hint', text: item.hint })]));
            redraw();
            var off = SV.on('inspector:leave', function () { stop(box); off(); });
        }
    });
})();
