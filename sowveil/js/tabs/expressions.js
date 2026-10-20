/* Sowveil - Expressions tab. Each preset generates real After Effects expression code; the live
   preview runs that SAME code through a tiny AE-like evaluator (wiggle, loopOut, key(), add()...)
   so what you see is what Apply puts on the layer. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var N = function (id, label, min, max, def, step, unit) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, step: step || 1, unit: unit }; };
    var head = function (label) { return '// sowveil · ' + label + '\n'; };
    var f = function (n) { return String(Math.round(n * 1000) / 1000); };
    // keyed() = code that needs keyframes; the preview gives the property two keys.
    var KEYED_GUARD = 'var n = 0;\nif (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) { n--; } }\n';

    var PRESETS = [
        { id: 'wiggle', label: 'Wiggle', subtitle: 'Shake on any property', sig: 'wiggle(freq, amp, octaves)', target: 'position',
          desc: 'Organic random motion. Frequency = wiggles per second, amount = how far it travels, octaves = extra detail.',
          params: [N('freq', 'Frequency', 0.1, 20, 2, 0.1, '/s'), N('amp', 'Amount', 0, 300, 40), N('oct', 'Octaves', 1, 6, 1)],
          code: function (v) { var c = 'wiggle(' + f(v.freq) + ', ' + f(v.amp) + ', ' + v.oct + ');'; return { scalar: c, vector: c, scale: c }; } },
        { id: 'bounce', label: 'Bounce', subtitle: 'Overshoot after each key', sig: 'velocity × sin / e^(decay·t)', target: 'position', keyed: true,
          desc: 'After every keyframe the property overshoots and settles, using the speed it arrived with. Needs at least two keyframes.',
          params: [N('amp', 'Amplitude', 0, 0.3, 0.06, 0.005), N('freq', 'Frequency', 0.5, 8, 2.5, 0.1), N('decay', 'Decay', 1, 15, 6, 0.5)],
          code: function (v) {
              var c = 'var amp = ' + f(v.amp) + ', freq = ' + f(v.freq) + ', decay = ' + f(v.decay) + ';\n' + KEYED_GUARD +
                  'var t = n > 0 ? time - key(n).time : 0;\n' +
                  'if (n > 0 && t < 2) {\n  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n  add(value, mul(v, amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t)));\n} else {\n  value;\n}';
              return { scalar: c, vector: c, scale: c };
          } },
        { id: 'bounce-out', label: 'Bounce Out', subtitle: 'Bounce tail after last key', sig: 'velocity × |sin| / e^(decay·t)', target: 'position', keyed: true,
          desc: 'Like a ball landing: after the last keyframe it bounces back a few times, each smaller than the last.',
          params: [N('amp', 'Amplitude', 0, 0.3, 0.08, 0.005), N('freq', 'Bounces', 0.5, 6, 2, 0.1), N('decay', 'Decay', 1, 15, 4, 0.5)],
          code: function (v) {
              var c = 'var amp = ' + f(v.amp) + ', freq = ' + f(v.freq) + ', decay = ' + f(v.decay) + ';\n' + KEYED_GUARD +
                  'if (n > 0) {\n  var t = time - key(n).time;\n  var v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n  add(value, mul(v, -amp * Math.abs(Math.sin(freq * t * Math.PI)) / Math.exp(decay * t)));\n} else {\n  value;\n}';
              return { scalar: c, vector: c, scale: c };
          } },
        { id: 'loop-out', label: 'Loop Out', subtitle: 'Cycle keyframes forever', sig: 'loopOut(mode, keys)', target: 'position', keyed: true,
          desc: 'Loops the keyframes after the last one. Cycle = repeat, Ping-pong = back and forth, Offset = keeps adding, Continue = keeps the last speed.',
          params: [{ id: 'mode', label: 'Mode', type: 'seg', def: 'cycle', options: [['cycle', 'Cycle'], ['pingpong', 'Ping-pong'], ['offset', 'Offset'], ['continue', 'Continue']] }, N('keys', 'Keys (0 = all)', 0, 20, 0)],
          code: function (v) { var c = 'loopOut("' + v.mode + '", ' + v.keys + ');'; return { scalar: c, vector: c, scale: c }; } },
        { id: 'random-seed', label: 'Random Seed', subtitle: 'Reproducible noise', sig: 'seedRandom(seed) + wiggle', target: 'position',
          desc: 'Wiggle with a fixed seed: the same seed always gives the same motion, so duplicates can share or differ on purpose.',
          params: [N('seed', 'Seed', 0, 999, 7), N('freq', 'Frequency', 0.1, 20, 1.5, 0.1, '/s'), N('amp', 'Amount', 0, 300, 30)],
          code: function (v) { var c = 'seedRandom(' + v.seed + ', false);\nwiggle(' + f(v.freq) + ', ' + f(v.amp) + ');'; return { scalar: c, vector: c, scale: c }; } },
        { id: 'sine-wave', label: 'Sine Wave', subtitle: 'Smooth periodic motion', sig: 'value + amp·sin(2π·f·t)', target: 'position',
          desc: 'A perfectly smooth back-and-forth. Position moves up and down, scale pulses, rotation rocks.',
          params: [N('amp', 'Amplitude', 0, 300, 40), N('freq', 'Frequency', 0.05, 10, 0.8, 0.05, '/s'), N('phase', 'Phase', 0, 360, 0, 1, '°')],
          code: function (v) {
              var s = f(v.amp) + ' * Math.sin(time * ' + f(v.freq) + ' * 2 * Math.PI + degreesToRadians(' + v.phase + '))';
              return { scalar: 'value + ' + s + ';', vector: 'var s = ' + s + ';\nadd(value, [0, s]);', scale: 'var s = ' + s + ';\nadd(value, [s, s]);' };
          } },
        { id: 'hover-float', label: 'Hover Float', subtitle: 'Gentle floating icon', sig: 'value + [0, −amp·sin(2π·s·t)]', target: 'position',
          desc: 'A soft idle float, like an app icon waiting to be tapped.',
          params: [N('amp', 'Height', 0, 100, 12), N('speed', 'Speed', 0.05, 3, 0.5, 0.05, '/s')],
          code: function (v) {
              var s = f(v.amp) + ' * Math.sin(time * ' + f(v.speed) + ' * 2 * Math.PI)';
              return { scalar: 'value + ' + s + ' * 0.15;', vector: 'add(value, [0, -' + s + ']);', scale: 'var s = ' + s + ' * 0.08;\nadd(value, [s, s]);' };
          } },
        { id: 'throw', label: 'Throw', subtitle: 'Launch, then glide to a stop', sig: 'velocity · (1 − e^(−d·t)) / d', target: 'position',
          desc: 'Starts with a push and slows down naturally, measured from the layer\'s in-point.',
          params: [N('vx', 'Velocity X', -3000, 3000, 900, 10), N('vy', 'Velocity Y', -3000, 3000, -300, 10), N('decay', 'Friction', 0.5, 15, 3, 0.1)],
          code: function (v) {
              var k = 'var d = ' + f(v.decay) + ', k = (1 - Math.exp(-d * (time - inPoint))) / d;\n';
              return { scalar: k + 'value + ' + f(v.vx) + ' * k;', vector: k + 'add(value, mul([' + f(v.vx) + ', ' + f(v.vy) + '], k));', scale: k + 'add(value, mul([' + f(v.vx) + ', ' + f(v.vx) + '], k * 0.1));' };
          } },
        { id: 'breathe', label: 'Breathe', subtitle: 'Soft scale pulse', sig: 'value + amp·sin(2π·s·t)', target: 'scale',
          desc: 'A slow in-and-out pulse. Great on logos, buttons and glows.',
          params: [N('amp', 'Amount', 0, 50, 6, 0.5, '%'), N('speed', 'Speed', 0.05, 3, 0.4, 0.05, '/s')],
          code: function (v) {
              var s = f(v.amp) + ' * Math.sin(time * ' + f(v.speed) + ' * 2 * Math.PI)';
              return { scalar: 'value + ' + s + ';', vector: 'var s = ' + s + ';\nadd(value, [0, s]);', scale: 'var s = ' + s + ';\nadd(value, [s, s]);' };
          } },
        { id: 'auto-fade', label: 'Auto-Fade', subtitle: 'Fade in and out at layer edges', sig: 'linear(time, in, in + f, 0, 1)', target: 'opacity',
          desc: 'Fades in after the layer starts and out before it ends - trim the layer and the fades follow.',
          params: [N('fadeIn', 'Fade in', 0, 5, 0.5, 0.05, 's'), N('fadeOut', 'Fade out', 0, 5, 0.5, 0.05, 's')],
          code: function (v) {
              var k = 'var k = Math.min(linear(time, inPoint, inPoint + ' + f(v.fadeIn) + ', 0, 1), linear(time, outPoint - ' + f(v.fadeOut) + ', outPoint, 1, 0));\n';
              return { scalar: k + 'value * k;', vector: k + 'mul(value, k);', scale: k + 'mul(value, k);' };
          } },
        { id: 'flicker', label: 'Flicker', subtitle: 'Random strobe', sig: 'seedRandom(floor(t·rate))', target: 'opacity',
          desc: 'Randomly drops the value a few times per second - broken neon, glitchy UI, candle light.',
          params: [N('rate', 'Rate', 1, 60, 12, 1, '/s'), N('chance', 'Off chance', 0, 100, 25, 1, '%'), N('min', 'Off level', 0, 100, 15, 1, '%')],
          code: function (v) {
              var k = 'seedRandom(Math.floor(time * ' + v.rate + '), true);\nvar k = random() < ' + f(v.chance / 100) + ' ? ' + f(v.min / 100) + ' : 1;\n';
              return { scalar: k + 'value * k;', vector: k + 'mul(value, k);', scale: k + 'mul(value, k);' };
          } },
        { id: 'spin', label: 'Spin', subtitle: 'Constant rotation', sig: 'value + speed·time', target: 'rotation',
          desc: 'Turns forever at a steady speed (degrees per second). Negative = counter-clockwise.',
          params: [N('speed', 'Speed', -720, 720, 90, 5, '°/s')],
          code: function (v) { return { scalar: 'value + time * ' + f(v.speed) + ';', vector: 'add(value, [time * ' + f(v.speed) + ', 0]);', scale: 'value;' }; } }
    ];
    PRESETS.forEach(function (p) { p.params = p.params.concat([]); });

    // ---------- tiny AE expression evaluator for the preview ----------
    function noise1(x, seed) {   // smooth deterministic noise in [-1, 1]
        var s = 0, a = 0, i;
        for (i = 1; i <= 3; i++) { var ph = Math.sin(seed * 12.9898 * i) * 43758.5453; s += Math.sin(x * (1.3 + i * 0.71) + (ph - Math.floor(ph)) * 6.283) / i; a += 1 / i; }
        return s / a;
    }
    function vec(op, a, b) {
        if (Array.isArray(a) && Array.isArray(b)) { return a.map(function (x, i) { return op(x, b[i] || 0); }); }
        if (Array.isArray(a)) { return a.map(function (x) { return op(x, b); }); }
        if (Array.isArray(b)) { return b.map(function (x) { return op(a, x); }); }
        return op(a, b);
    }
    var EVAL = new Function('ctx', 'code', 'with (ctx) { return eval(code); }');  // non-strict on purpose: AE expressions return their last statement
    function evaluate(code, cat, t, keys, layerDur) {
        var base = cat === 'vector' ? [0, 0] : cat === 'scale' ? [100, 100] : (cat === 'opacity' ? 100 : 0), seed = 1;
        function valueAt(tt) {
            if (!keys) { return base; }
            if (tt <= keys[0].t) { return keys[0].v; }
            if (tt >= keys[1].t) { return keys[1].v; }
            var u = (tt - keys[0].t) / (keys[1].t - keys[0].t), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
            return vec(function (a, b) { return a + (b - a) * e; }, keys[0].v, keys[1].v);
        }
        var ctx = {
            value: valueAt(t), time: t, inPoint: 0, outPoint: layerDur, numKeys: keys ? keys.length : 0, thisComp: { frameDuration: 1 / 30 },
            Math: Math,
            key: function (n) { return { time: keys[n - 1].t, value: keys[n - 1].v }; },
            nearestKey: function (tt) { var b = 1; if (keys) { keys.forEach(function (k, i) { if (Math.abs(k.t - tt) < Math.abs(keys[b - 1].t - tt)) { b = i + 1; } }); } return { index: b }; },
            velocityAtTime: function (tt) { var d = 1 / 600; return vec(function (a, b) { return (b - a) / (2 * d); }, valueAt(tt - d), valueAt(tt + d)); },
            add: function (a, b) { return vec(function (x, y) { return x + y; }, a, b); },
            sub: function (a, b) { return vec(function (x, y) { return x - y; }, a, b); },
            mul: function (a, b) { return vec(function (x, y) { return x * y; }, a, b); },
            degreesToRadians: function (d) { return d * Math.PI / 180; },
            linear: function (x, a, b, c, d) { if (b === a) { return x < a ? c : d; } var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return vec(function (p, q) { return p + (q - p) * u; }, c, d); },
            seedRandom: function (s) { seed = s + 1; },
            random: function () { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); },
            wiggle: function (fq, amp, oct) {
                var v = valueAt(t), k = seed;
                return Array.isArray(v) ? v.map(function (x, i) { return x + noise1(t * fq * 2.2, k * 7 + i * 3) * amp; }) : v + noise1(t * fq * 2.2, k * 7) * amp;
            },
            loopOut: function (mode) {
                if (!keys) { return base; }
                var t0 = keys[0].t, t1 = keys[keys.length - 1].t, dur = t1 - t0;
                if (t <= t1 || dur <= 0) { return valueAt(t); }
                var cyc = Math.floor((t - t0) / dur), u = (t - t0) - cyc * dur;
                if (mode === 'pingpong') { return valueAt(cyc % 2 ? t1 - u : t0 + u); }
                if (mode === 'offset') { var d = vec(function (a, b) { return b - a; }, keys[0].v, keys[1].v); return vec(function (a, b) { return a + b * cyc; }, valueAt(t0 + u), d); }
                if (mode === 'continue') { var vel = ctx.velocityAtTime(t1 - 0.01); return vec(function (a, b) { return a + b * (t - t1); }, keys[1].v, vel); }
                return valueAt(t0 + u);
            }
        };
        try { return EVAL(ctx, code); } catch (e) { return base; }
    }

    // ---------- preview ----------
    var CAT = { position: 'vector', scale: 'scale', rotation: 'scalar', opacity: 'opacity' };
    function codeFor(item, v, target) { var c = item.code(v), cat = CAT[target]; return head(item.label) + (cat === 'vector' ? c.vector : cat === 'scale' ? c.scale : c.scalar); }
    function keysFor(item, target) {
        if (!item.keyed) { return null; }
        var cat = CAT[target];
        if (cat === 'vector') { return [{ t: 0.3, v: [-110, 0] }, { t: 0.9, v: [110, 0] }]; }
        if (cat === 'scale') { return [{ t: 0.3, v: [60, 60] }, { t: 0.9, v: [130, 130] }]; }
        if (cat === 'opacity') { return [{ t: 0.3, v: 20 }, { t: 0.9, v: 100 }]; }
        return [{ t: 0.3, v: -90 }, { t: 0.9, v: 90 }];
    }
    function highlight(code) {
        return SV.esc(code).replace(/(\/\/[^\n]*)|("[^"\n]*")|\b(var|if|else|return|true|false)\b|\b(\d+\.?\d*)\b|\b([A-Za-z_]\w*)(?=\()/g, function (m, cm, st, kw, nu, fn) {
            if (cm) { return '<span class="sx-c">' + cm + '</span>'; }
            if (st) { return '<span class="sx-s">' + st + '</span>'; }
            if (kw) { return '<span class="sx-k">' + kw + '</span>'; }
            if (nu) { return '<span class="sx-n">' + nu + '</span>'; }
            return '<span class="sx-f">' + fn + '</span>';
        });
    }

    SV.registerTab({
        id: 'expressions', label: 'Expressions', icon: 'code',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            var target = SV.get('exprTarget', 'auto');
            function resolved() { return target === 'auto' ? item.target : target; }
            el.appendChild(h('div', { class: 'section ex-head' }, [
                h('div', { class: 'ex-title', text: item.label }),
                h('code', { class: 'ex-sig', text: item.sig }),
                h('div', { class: 'ex-desc', text: item.desc })
            ]));
            var obj = h('div', { class: 'ex-obj' }), chip = h('span', { class: 'ex-chip' }), stage = h('div', { class: 'preview ex-stage' }, [obj, chip]);
            el.appendChild(SV.ui.section('Live preview', [stage]));
            var codeEl = h('pre', { class: 'ex-code' }), copy = h('button', { class: 'btn ghost small ex-copy', text: 'Copy' });
            el.appendChild(SV.ui.section('Live code', [h('div', { class: 'ex-codewrap' }, [codeEl, copy])]));
            var tseg = SV.ui.param({ type: 'seg', label: '', options: [['auto', 'Auto'], ['position', 'Position'], ['scale', 'Scale'], ['rotation', 'Rotation'], ['opacity', 'Opacity']] }, target, function (t) { target = t; SV.set('exprTarget', t); draw(); });
            tseg.firstChild.remove(); tseg.style.justifyContent = 'flex-start';
            el.appendChild(SV.ui.section('Target property', [tseg]));
            el.appendChild(SV.ui.params('expressions', item, v, function () { draw(); }));
            var hint = h('div', { class: 'hint' });
            el.appendChild(SV.ui.section('', [SV.ui.action('Apply', function () {
                var c = item.code(v), hd = head(item.label);
                return SV.call('applyExpression', { label: item.label, target: target, fallback: item.target, codes: { scalar: hd + c.scalar, vector: hd + c.vector, scale: hd + c.scale } }).then(function (r) { SV.result(r); });
            }), hint]));
            copy.addEventListener('click', function () {
                var txt = codeEl.textContent;
                var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1200); };
                try { navigator.clipboard.writeText(txt).then(done, function () { fallback(); }); } catch (e) { fallback(); }
                function fallback() { var ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e2) { } ta.remove(); }
            });
            function draw() {
                var t = resolved(), code = codeFor(item, v, t);
                codeEl.innerHTML = highlight(code);
                chip.textContent = t.charAt(0).toUpperCase() + t.slice(1) + (item.keyed ? ' · 2 keys' : '');
                hint.textContent = target === 'auto'
                    ? 'Auto: applies to the properties you selected in the timeline; with only layers selected it uses ' + item.target + '.'
                    : 'Applies to ' + target + ' on every selected layer.' + (item.keyed ? ' Add at least two keyframes first.' : '');
            }
            var raf = 0, t0 = performance.now(), PERIOD = 4;
            function frame(now) {
                var t = ((now - t0) / 1000) % PERIOD, tg = resolved(), cat = CAT[tg], c = item.code(v);
                var code = cat === 'vector' ? c.vector : cat === 'scale' ? c.scale : c.scalar;
                var r = evaluate(code, cat === 'opacity' ? 'opacity' : cat, t, keysFor(item, tg), PERIOD);
                var tr = '', op = 1;
                if (tg === 'position') { tr = 'translate(' + Math.max(-150, Math.min(150, (r[0] || 0) * 0.55)) + 'px,' + Math.max(-70, Math.min(70, (r[1] || 0) * 0.55)) + 'px)'; }
                else if (tg === 'scale') { var s = Math.max(0, Math.min(2.6, (r[0] || 0) / 100)); tr = 'scale(' + s + ',' + Math.max(0, Math.min(2.6, (r[1] || 0) / 100)) + ')'; }
                else if (tg === 'rotation') { tr = 'rotate(' + r + 'deg)'; }
                else { op = Math.max(0, Math.min(1, r / 100)); }
                obj.style.transform = tr; obj.style.opacity = op;
                raf = requestAnimationFrame(frame);
            }
            draw(); raf = requestAnimationFrame(frame);
            var off = SV.on('inspector:leave', function () { cancelAnimationFrame(raf); off(); });
        }
    });
})();
