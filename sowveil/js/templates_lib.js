/* Sowveil - the 20 template compositions. Each template turns its settings into a scene (see js/scene.js):
   layers listed bottom first, keyed tracks [t, value, ease], behaviours. The live preview and the After Effects
   build both read that scene. Comp space is 1920x1080 unless a template says otherwise. */
(function (root) {
    'use strict';
    var CX = 960, CY = 540;
    function k(t, v, e) { return [t, v, e]; }
    function L(type, name, o) { var x = { type: type, name: name }, n; for (n in o) { if (o.hasOwnProperty(n)) { x[n] = o[n]; } } return x; }
    function rect(name, o) { return L('rect', name, o); }
    function ell(name, o) { return L('ellipse', name, o); }
    function path(name, o) { return L('path', name, o); }
    function text(name, o) { return L('text', name, o); }
    function grad(name, o) { return L('grad', name, o); }
    function nul(name, o) { return L('null', name, o); }
    function anim(l, a) { l.anim = l.anim || {}; var n; for (n in a) { if (a.hasOwnProperty(n)) { l.anim[n] = a[n]; } } return l; }
    // entrances
    function popScale(t, d, s) { s = s === undefined ? 100 : s; return [k(t, 0), k(t + d * 0.62, s * 1.08, 'out'), k(t + d, s, 'inOut')]; }
    function fadeIn(t, d) { return [k(t, 0), k(t + (d || 0.25), 100, 'linear')]; }
    function rise(pos, t, d, dist) { return [k(t, [pos[0], pos[1] + (dist === undefined ? 60 : dist)]), k(t + d, pos, 'expo')]; }
    function arc(cx, cy, r, a0, a1, n) { var o = [], i; for (i = 0; i <= n; i++) { var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
    function heart(s) { var o = [], i; for (i = 0; i < 48; i++) { var t = i / 48 * Math.PI * 2; o.push([16 * Math.pow(Math.sin(t), 3) * s, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s]); } return o; }
    var CURSOR = [[0, 0], [0, 58], [14, 45], [24, 68], [35, 63], [25, 41], [44, 41]];
    function cursor(name, track, clickT) {
        var c = path(name, { points: CURSOR, closed: true, fill: '#ffffff', stroke: { color: '#111111', width: 4 }, pos: track[0][1], shadow: { opacity: 35, blur: 14, dist: 6 } });
        anim(c, { pos: track });
        if (clickT !== undefined) { c.anim.scale = [k(clickT - 0.1, 100), k(clickT, 82, 'out'), k(clickT + 0.2, 100, 'out')]; }
        return c;
    }
    function burst(prefix, at, t, color, n, r0, r1) {
        var o = [], i;
        for (i = 0; i < n; i++) {
            o.push(anim(ell(prefix + ' ' + (i + 1), { size: [r0, r0], pos: at, stroke: { color: color, width: 8 }, opacity: 0 }),
                { size: [k(t + i * 0.12, [r0, r0]), k(t + i * 0.12 + 0.75, [r1, r1], 'out')], opacity: [k(t + i * 0.12 - 0.01, 0, 'hold'), k(t + i * 0.12, 100, 'hold'), k(t + i * 0.12 + 0.75, 0, 'in')], strokeWidth: [k(t + i * 0.12, 12), k(t + i * 0.12 + 0.75, 1, 'out')] }));
        }
        return o;
    }
    function sparks(prefix, at, t, color, n, dist, size) {
        var o = [], i;
        for (i = 0; i < n; i++) {
            var a = i / n * Math.PI * 2, to = [at[0] + Math.cos(a) * dist, at[1] + Math.sin(a) * dist];
            o.push(anim(ell(prefix + ' ' + (i + 1), { size: [size, size], pos: at, fill: color, opacity: 0 }),
                { pos: [k(t, at), k(t + 0.6, to, 'expo')], opacity: [k(t - 0.01, 0, 'hold'), k(t, 100, 'hold'), k(t + 0.6, 0, 'in')], scale: [k(t, 100), k(t + 0.6, 30, 'in')] }));
        }
        return o;
    }
    function tw(s, size) { return String(s).length * size * 0.52; }   // rough text width (Arial bold)
    function hex(c, a) { return c; }

    var C = function (id, label, def) { return { id: id, label: label, type: 'color', def: def }; };
    var TX = function (id, label, def) { return { id: id, label: label, type: 'text', def: def }; };
    var NU = function (id, label, min, max, def, unit, step) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, unit: unit, step: step || 1 }; };
    var SPEED = NU('speed', 'Speed', 50, 200, 100, '%', 5);
    // time-scale every key/behaviour time in a scene (Speed setting)
    function speed(S, pct) {
        var f = 100 / Math.max(10, pct || 100), i, n;
        function tk(tr) { var j; for (j = 0; j < tr.length; j++) { tr[j][0] = tr[j][0] * f; } }
        S.dur = Math.round(S.dur * f * 100) / 100;
        for (i = 0; i < S.layers.length; i++) {
            var l = S.layers[i];
            if (l.anim) { for (n in l.anim) { if (l.anim.hasOwnProperty(n)) { tk(l.anim[n]); } } }
            if (l.clip && l.clip.anim) { tk(l.clip.anim); }
            if (l.inPoint !== undefined) { l.inPoint *= f; } if (l.outPoint !== undefined) { l.outPoint *= f; }
            var B = l.behave || {};
            if (B.type) { B.type.start *= f; B.type.cps /= f; }
            if (B.count) { B.count.start *= f; B.count.dur *= f; }
            if (B.blink) { B.blink.from = (B.blink.from || 0) * f; if (B.blink.to !== undefined) { B.blink.to *= f; } B.blink.period *= f; }
            if (B.shake) { B.shake.t *= f; B.shake.dur *= f; }
            if (B.spin) { B.spin /= f; }
            if (B.float) { B.float.freq /= f; }
            if (B.pulse) { B.pulse.freq /= f; }
        }
        return S;
    }

    var T = [];
    function add(def) { T.push(def); }

    // 1 ---------- Click Burst Prompt (from the Click VFX project) ----------
    add({
        id: 'click-prompt', title: 'Click Burst Prompt', category: 'UI', params: [TX('prompt', 'Prompt', 'Create a launch video for my app'), C('accent', 'Accent', '#6d5cff'), C('bg1', 'Background top', '#0b0f2a'), C('bg2', 'Background bottom', '#3a1c71'), SPEED],
        scene: function (p) {
            var bar = [CX, 560], send = [CX + 540, 560], ly = [];
            ly.push(anim(ell('Glow', { size: [1100, 700], pos: [CX, 600], fill: p.accent, opacity: 40, blur: 160, behave: { float: { amp: 30, freq: 0.15 } } }), { opacity: fadeIn(0, 1.2) }));
            ly.push(nul('Bar', { pos: bar, anim: { scale: [k(0.2, 88), k(1.0, 100, 'expo')] } }));
            var kids = [
                rect('Prompt Bar', { size: [1240, 150], radius: 75, fill: '#ffffff', shadow: { opacity: 35, blur: 40, dist: 18 } }),
                ell('Attach Button', { size: [78, 78], pos: [-540, 0], fill: '#f0f0f6' }),
                path('Attach Icon', { points: [[-556, 0], [-524, 0]], stroke: { color: '#2b2b36', width: 6 } }),
                path('Attach Icon 2', { points: [[-540, -16], [-540, 16]], stroke: { color: '#2b2b36', width: 6 } }),
                path('Tools Icon', { points: [[-468, -12], [-418, -12]], stroke: { color: '#2b2b36', width: 6 } }),
                path('Tools Icon 2', { points: [[-468, 12], [-418, 12]], stroke: { color: '#2b2b36', width: 6 } }),
                ell('Tools Knob', { size: [16, 16], pos: [-452, -12], fill: '#2b2b36' }),
                ell('Tools Knob 2', { size: [16, 16], pos: [-432, 12], fill: '#2b2b36' }),
                text('Prompt Text', { text: p.prompt, align: 'left', fontSize: 40, weight: 500, fill: '#1b1b22', pos: [-370, 14], behave: { type: { text: p.prompt, start: 1.0, cps: 24 } } }),
                rect('Mic', { size: [24, 40], radius: 12, pos: [430, -6], stroke: { color: '#2b2b36', width: 5 } }),
                path('Mic Arc', { points: arc(430, -2, 22, 10, 170, 10), stroke: { color: '#2b2b36', width: 5 } }),
                anim(ell('Send', { size: [96, 96], pos: [540, 0], fill: p.accent }), { scale: [k(3.45, 100), k(3.55, 84, 'out'), k(3.85, 100, 'out')] }),
                path('Send Arrow', { points: [[540, 20], [540, -20]], stroke: { color: '#ffffff', width: 7 } }),
                path('Send Arrow Head', { points: [[524, -4], [540, -20], [556, -4]], stroke: { color: '#ffffff', width: 7 } })
            ];
            kids.forEach(function (c) { c.parent = 'Bar'; c.anim = c.anim || {}; c.anim.opacity = fadeIn(0.2, 0.4); ly.push(c); });
            var caretX = -370 + tw(p.prompt, 40) * 0.95;
            ly.push(rect('Caret', { parent: 'Bar', size: [4, 48], pos: [-372, 0], fill: p.accent, behave: { blink: { period: 0.9, from: 0, to: 6 } }, anim: { pos: [k(1.0, [-372, 0]), k(1.0 + p.prompt.length / 24, [caretX, 0], 'linear')] } }));
            burst('Ring', send, 3.5, p.accent, 3, 96, 460).forEach(function (r) { ly.push(r); });
            sparks('Spark', send, 3.5, '#ffffff', 10, 170, 14).forEach(function (r) { ly.push(r); });
            ly.push(cursor('Cursor', [k(2.4, [1780, 1000]), k(3.35, [send[0] + 6, send[1] + 8], 'expo')], 3.5));
            var toast = anim(nul('Toast', { pos: [CX, 360] }), { scale: popScale(4.1, 0.6) });
            ly.push(toast);
            ly.push(anim(rect('Toast Pill', { parent: 'Toast', size: [520, 84], radius: 42, fill: '#ffffff', fillOpacity: 92, shadow: { opacity: 30, blur: 30, dist: 10 } }), { opacity: fadeIn(4.1, 0.2) }));
            ly.push(anim(ell('Toast Dot', { parent: 'Toast', size: [22, 22], pos: [-200, 0], fill: p.accent, behave: { pulse: { amp: 0.25, freq: 1.4 } } }), { opacity: fadeIn(4.1, 0.2) }));
            ly.push(anim(text('Toast Text', { parent: 'Toast', text: 'Generating your video…', fontSize: 32, weight: 700, fill: '#1b1b22', pos: [20, 11] }), { opacity: fadeIn(4.1, 0.2) }));
            return { name: 'Click Burst Prompt', w: 1920, h: 1080, dur: 6, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });

    // 2 ---------- Notification Stack ----------
    add({
        id: 'notifications', title: 'Notification Stack', category: 'UI', params: [TX('n1', 'Notification 1', 'Payment received: $2,400'), TX('n2', 'Notification 2', 'New signup from Berlin'), TX('n3', 'Notification 3', 'Your video finished rendering'), C('accent', 'Accent', '#00c2a8'), C('bg1', 'Background top', '#141e30'), C('bg2', 'Background bottom', '#243b55'), SPEED],
        scene: function (p) {
            var ly = [], items = [[p.n1, '#ff9f43'], [p.n2, p.accent], [p.n3, '#6d5cff']], n = items.length, i, j;
            ly.push(text('Headline', { text: 'Stay in the loop', fontSize: 64, weight: 800, fill: '#ffffff', pos: [CX, 190], anim: { opacity: fadeIn(0.1, 0.4), pos: rise([CX, 190], 0.1, 0.8, 30) } }));
            for (i = n - 1; i >= 0; i--) {
                var t0 = 0.6 + i * 1.3, tr = [k(t0 - 0.01, [CX, 160]), k(t0 + 0.7, [CX, 420], 'expo')], sc = [k(t0, 100)];
                for (j = i + 1; j < n; j++) { var tj = 0.6 + j * 1.3; tr.push(k(tj, [CX, 420 + (j - i - 1) * 190])); tr.push(k(tj + 0.7, [CX, 420 + (j - i) * 190], 'expo')); sc.push(k(tj, 100 - (j - i - 1) * 4)); sc.push(k(tj + 0.7, 100 - (j - i) * 4, 'expo')); }
                var nm = 'Notif ' + (i + 1);
                ly.push(nul(nm, { pos: [CX, 160], anim: { pos: tr, scale: sc } }));
                var op = [k(t0, 0), k(t0 + 0.35, 100, 'linear')];
                ly.push(rect(nm + ' Card', { parent: nm, size: [860, 160], radius: 40, fill: '#ffffff', fillOpacity: 94, shadow: { opacity: 30, blur: 30, dist: 12 }, anim: { opacity: op } }));
                ly.push(rect(nm + ' Icon', { parent: nm, size: [92, 92], radius: 24, pos: [-344, 0], fill: items[i][1], anim: { opacity: op } }));
                ly.push(text(nm + ' App', { parent: nm, text: 'SOWVEIL', fontSize: 24, weight: 700, fill: '#8a8a96', align: 'left', tracking: 80, pos: [-270, -22], anim: { opacity: op } }));
                ly.push(text(nm + ' Title', { parent: nm, text: items[i][0], fontSize: 36, weight: 700, fill: '#16161c', align: 'left', pos: [-270, 30], anim: { opacity: op } }));
                ly.push(text(nm + ' Time', { parent: nm, text: 'now', fontSize: 24, weight: 500, fill: '#8a8a96', align: 'right', pos: [390, -22], anim: { opacity: op } }));
            }
            return { name: 'Notification Stack', w: 1920, h: 1080, dur: 6, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });

    // 3 ---------- Analytics Card ----------
    add({
        id: 'analytics', title: 'Analytics Card', category: 'Data', params: [TX('title', 'Title', 'Monthly revenue'), NU('value', 'Value', 0, 999999, 12480), TX('badge', 'Badge', '+24%'), C('accent', 'Accent', '#7c5cff'), C('bg', 'Background', '#0b0b10'), SPEED],
        scene: function (p) {
            var ly = [], hs = [0.35, 0.5, 0.42, 0.66, 0.58, 0.82, 1], i, base = 840;
            ly.push(ell('Glow', { size: [1200, 800], pos: [CX, 620], fill: p.accent, opacity: 22, blur: 200 }));
            ly.push(anim(nul('Card', { pos: [CX, CY] }), { scale: [k(0.1, 92), k(0.9, 100, 'expo')] }));
            ly.push(anim(rect('Card Body', { parent: 'Card', size: [1180, 720], radius: 52, fill: '#15151d', stroke: { color: '#2a2a38', width: 2 } }), { opacity: fadeIn(0.1, 0.4) }));
            ly.push(anim(text('Title', { parent: 'Card', text: p.title, align: 'left', fontSize: 36, weight: 600, fill: '#9a9aae', pos: [-520, -260] }), { opacity: fadeIn(0.4, 0.4) }));
            ly.push(anim(text('Value', { parent: 'Card', text: '$' + Number(p.value).toLocaleString('en-US'), align: 'left', fontSize: 104, weight: 800, fill: '#ffffff', pos: [-524, -150], behave: { count: { from: 0, to: +p.value, start: 0.5, dur: 1.8, prefix: '$', sep: true } } }), { opacity: fadeIn(0.5, 0.3) }));
            ly.push(anim(nul('Badge', { parent: 'Card', pos: [430, -200] }), { scale: popScale(1.6, 0.6) }));
            ly.push(rect('Badge Pill', { parent: 'Badge', size: [170, 70], radius: 35, fill: '#1f3d2c' }));
            ly.push(text('Badge Text', { parent: 'Badge', text: p.badge, fontSize: 34, weight: 700, fill: '#3ddc84', pos: [0, 12] }));
            ly.push(path('Axis', { parent: 'Card', points: [[-520, 300], [520, 300]], stroke: { color: '#2a2a38', width: 3 }, anim: { trimEnd: [k(0.3, 0), k(1.0, 100, 'expo')] }, trimEnd: 0 }));
            var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            for (i = 0; i < 7; i++) {
                var x = -450 + i * 150, hgt = 380 * hs[i], t0 = 0.8 + i * 0.1;
                ly.push(anim(rect('Bar ' + (i + 1), { parent: 'Card', size: [84, hgt], radius: 18, anchor: [0, hgt / 2], pos: [x, 290], fill: i === 6 ? p.accent : '#2c2c3c' }), { scale: [k(t0, [100, 0]), k(t0 + 0.8, [100, 100], 'expo')] }));
                ly.push(anim(text('Day ' + (i + 1), { parent: 'Card', text: days[i], fontSize: 26, weight: 600, fill: '#6f6f80', pos: [x, 345] }), { opacity: fadeIn(t0, 0.3) }));
            }
            void base;
            return { name: 'Analytics Card', w: 1920, h: 1080, dur: 6, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 4 ---------- Line Graph Draw ----------
    add({
        id: 'line-graph', title: 'Line Graph Draw', category: 'Data', params: [TX('title', 'Title', 'Active users'), NU('value', 'End value', 0, 999999, 48200), C('accent', 'Line colour', '#00d4ff'), C('bg1', 'Background top', '#05060f'), C('bg2', 'Background bottom', '#101634'), SPEED],
        scene: function (p) {
            var ly = [], ys = [0.15, 0.32, 0.26, 0.5, 0.44, 0.7, 0.62, 0.92], pts = [], i, x0 = 420, x1 = 1500, y0 = 860, y1 = 360;
            for (i = 0; i < 5; i++) { ly.push(path('Grid ' + (i + 1), { points: [[x0, y0 - i * 125], [x1, y0 - i * 125]], stroke: { color: '#1f2440', width: 2 }, trimEnd: 0, anim: { trimEnd: [k(0.1 + i * 0.05, 0), k(0.9 + i * 0.05, 100, 'expo')] } })); }
            for (i = 0; i < ys.length; i++) { pts.push([x0 + (x1 - x0) * i / (ys.length - 1), y0 - (y0 - y1) * ys[i]]); }
            ly.push(path('Line Glow', { points: pts, stroke: { color: p.accent, width: 22 }, opacity: 35, blur: 18, trimEnd: 0, anim: { trimEnd: [k(1.0, 0), k(3.0, 100, 'inOut')] } }));
            ly.push(path('Line', { points: pts, stroke: { color: p.accent, width: 8 }, trimEnd: 0, anim: { trimEnd: [k(1.0, 0), k(3.0, 100, 'inOut')] } }));
            for (i = 0; i < pts.length; i++) {
                var tt = 1.0 + 2.0 * Math.min(1, Math.max(0, (SVSceneEaseInv(i / (pts.length - 1)))));
                ly.push(anim(ell('Dot ' + (i + 1), { size: [26, 26], pos: pts[i], fill: '#ffffff', stroke: { color: p.accent, width: 6 } }), { scale: popScale(tt, 0.4) }));
            }
            ly.push(anim(text('Title', { text: p.title, align: 'left', fontSize: 40, weight: 600, fill: '#8f96c8', pos: [x0, 200] }), { opacity: fadeIn(0.2, 0.4) }));
            ly.push(anim(text('Value', { text: Number(p.value).toLocaleString('en-US'), align: 'left', fontSize: 96, weight: 800, fill: '#ffffff', pos: [x0, 300], behave: { count: { from: 0, to: +p.value, start: 1.0, dur: 2.0, sep: true } } }), { opacity: fadeIn(0.3, 0.3) }));
            ly.push(anim(nul('Tag', { pos: [pts[pts.length - 1][0], pts[pts.length - 1][1] - 70] }), { scale: popScale(3.0, 0.5) }));
            ly.push(rect('Tag Pill', { parent: 'Tag', size: [170, 60], radius: 30, fill: p.accent }));
            ly.push(text('Tag Text', { parent: 'Tag', text: 'NEW HIGH', fontSize: 24, weight: 800, fill: '#05060f', pos: [0, 9] }));
            return { name: 'Line Graph Draw', w: 1920, h: 1080, dur: 6, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });
    // where an inOut-eased draw reaches fraction x (dots pop as the line passes them)
    function SVSceneEaseInv(x) { var lo = 0, hi = 1, i; for (i = 0; i < 20; i++) { var m = (lo + hi) / 2; if (root.SVScene.bez(60, 60, m) < x) { lo = m; } else { hi = m; } } return (lo + hi) / 2; }

    // 5 ---------- Search Typing Results ----------
    add({
        id: 'search', title: 'Search Typing Results', category: 'UI', params: [TX('query', 'Search', 'motion design templates'), TX('r1', 'Result 1', 'Glass UI kit'), TX('r2', 'Result 2', 'SaaS launch pack'), TX('r3', 'Result 3', 'Kinetic type presets'), C('accent', 'Accent', '#ff5c8a'), C('bg', 'Background', '#f3f4f8'), SPEED],
        scene: function (p) {
            var ly = [], tEnd = 0.9 + p.query.length / 16, rows = [p.r1, p.r2, p.r3], i;
            ly.push(anim(nul('Search', { pos: [CX, 300] }), { scale: [k(0.1, 90), k(0.8, 100, 'expo')] }));
            ly.push(anim(rect('Search Bar', { parent: 'Search', size: [1120, 128], radius: 64, fill: '#ffffff', shadow: { opacity: 18, blur: 40, dist: 14 } }), { opacity: fadeIn(0.1, 0.3) }));
            ly.push(anim(ell('Lens', { parent: 'Search', size: [40, 40], pos: [-482, -6], stroke: { color: '#6a6a78', width: 6 } }), { opacity: fadeIn(0.2, 0.3) }));
            ly.push(anim(path('Lens Handle', { parent: 'Search', points: [[-468, 8], [-452, 24]], stroke: { color: '#6a6a78', width: 6 } }), { opacity: fadeIn(0.2, 0.3) }));
            ly.push(text('Query', { parent: 'Search', text: p.query, align: 'left', fontSize: 42, weight: 500, fill: '#16161c', pos: [-420, 15], behave: { type: { text: p.query, start: 0.9, cps: 16 } } }));
            ly.push(rect('Caret', { parent: 'Search', size: [4, 50], pos: [-420, 0], fill: p.accent, behave: { blink: { period: 0.9, from: 0, to: 7 } }, anim: { pos: [k(0.9, [-420, 0]), k(tEnd, [-420 + tw(p.query, 42) * 0.92, 0], 'linear')] } }));
            for (i = 0; i < rows.length; i++) {
                var t0 = tEnd + 0.3 + i * 0.15, y = 500 + i * 150, nm = 'Result ' + (i + 1);
                ly.push(anim(nul(nm, { pos: [CX, y] }), { pos: rise([CX, y], t0, 0.8, 50) }));
                var op = fadeIn(t0, 0.3);
                ly.push(anim(rect(nm + ' Card', { parent: nm, size: [1120, 124], radius: 32, fill: '#ffffff' }), { opacity: op }));
                ly.push(anim(rect(nm + ' Thumb', { parent: nm, size: [84, 84], radius: 20, pos: [-490, 0], fill: i === 0 ? p.accent : i === 1 ? '#6d5cff' : '#00c2a8' }), { opacity: op }));
                ly.push(anim(text(nm + ' Title', { parent: nm, text: rows[i], align: 'left', fontSize: 38, weight: 700, fill: '#16161c', pos: [-420, -2] }), { opacity: op }));
                ly.push(anim(text(nm + ' Sub', { parent: nm, text: 'Template · 4K · editable', align: 'left', fontSize: 26, weight: 500, fill: '#8a8a96', pos: [-420, 36] }), { opacity: op }));
            }
            return { name: 'Search Typing Results', w: 1920, h: 1080, dur: Math.max(6, tEnd + 2.5), fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 6 ---------- Chat Conversation ----------
    add({
        id: 'chat', title: 'Chat Conversation', category: 'UI', params: [TX('m1', 'Message 1', 'Did the launch video render?'), TX('m2', 'Reply 1', 'Yes! Exporting now'), TX('m3', 'Message 2', 'It looks incredible.'), TX('m4', 'Reply 2', 'Built it in five minutes'), C('accent', 'Your bubbles', '#0a84ff'), C('bg', 'Background', '#0e0e12'), SPEED],
        scene: function (p) {
            var ly = [], msgs = [[p.m1, 0], [p.m2, 1], [p.m3, 0], [p.m4, 1]], times = [0.4, 1.6, 4.0, 5.2], ys = [260, 410, 560, 710], i;
            for (i = 0; i < msgs.length; i++) {
                var me = msgs[i][1] === 1, w = Math.max(220, tw(msgs[i][0], 40) + 90), x = me ? 1500 - w / 2 : 420 + w / 2, nm = 'Msg ' + (i + 1), t0 = times[i];
                ly.push(anim(nul(nm, { pos: [x, ys[i]] }), { scale: popScale(t0, 0.5), pos: rise([x, ys[i]], t0, 0.6, 30) }));
                ly.push(anim(rect(nm + ' Bubble', { parent: nm, size: [w, 110], radius: 46, fill: me ? p.accent : '#2a2a32' }), { opacity: fadeIn(t0, 0.15) }));
                ly.push(anim(text(nm + ' Text', { parent: nm, text: msgs[i][0], fontSize: 40, weight: 500, fill: '#ffffff', pos: [0, 14] }), { opacity: fadeIn(t0, 0.15) }));
            }
            // typing indicator between reply 1 and message 2
            ly.push(anim(nul('Typing', { pos: [500, 560] }), { scale: [k(2.7, 0), k(3.0, 100, 'out'), k(3.85, 100), k(4.0, 0, 'in')] }));
            ly.push(rect('Typing Bubble', { parent: 'Typing', size: [160, 90], radius: 45, fill: '#2a2a32' }));
            for (i = 0; i < 3; i++) { ly.push(ell('Typing Dot ' + (i + 1), { parent: 'Typing', size: [20, 20], pos: [-40 + i * 40, 0], fill: '#a0a0ac', behave: { float: { amp: 8, freq: 2.2, phase: i * 0.12 } } })); }
            return { name: 'Chat Conversation', w: 1920, h: 1080, dur: 7, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 7 ---------- Pricing Cards ----------
    add({
        id: 'pricing', title: 'Pricing Cards', category: 'Marketing', params: [NU('p1', 'Starter price', 0, 999, 9), NU('p2', 'Pro price', 0, 999, 29), NU('p3', 'Team price', 0, 999, 79), C('accent', 'Accent', '#7c5cff'), C('bg1', 'Background top', '#0c0b16'), C('bg2', 'Background bottom', '#1d1838'), SPEED],
        scene: function (p) {
            var ly = [], plans = [['Starter', p.p1], ['Pro', p.p2], ['Team', p.p3]], i, f;
            ly.push(anim(text('Headline', { text: 'Simple pricing', fontSize: 70, weight: 800, fill: '#ffffff', pos: [CX, 170] }), { opacity: fadeIn(0.1, 0.4), pos: rise([CX, 170], 0.1, 0.8, 30) }));
            for (i = 0; i < 3; i++) {
                var x = CX + (i - 1) * 500, hot = i === 1, nm = 'Plan ' + plans[i][0], t0 = 0.4 + (i === 1 ? 0.25 : i === 0 ? 0 : 0.12);
                ly.push(anim(nul(nm, { pos: [x, 590] }), { pos: rise([x, 590], t0, 0.9, 140), scale: hot ? [k(t0 + 0.6, 100), k(t0 + 1.1, 107, 'expo')] : undefined }));
                if (!hot) { delete ly[ly.length - 1].anim.scale; }
                var op = fadeIn(t0, 0.35);
                ly.push(anim(rect(nm + ' Card', { parent: nm, size: [440, 640], radius: 44, fill: hot ? '#201a3d' : '#16151f', stroke: { color: hot ? p.accent : '#2c2a3c', width: hot ? 4 : 2 }, glow: hot ? { color: p.accent, radius: 40, intensity: 0.6 } : undefined }), { opacity: op }));
                ly.push(anim(text(nm + ' Name', { parent: nm, text: plans[i][0].toUpperCase(), fontSize: 30, weight: 700, tracking: 120, fill: hot ? p.accent : '#9a98b0', pos: [0, -230] }), { opacity: op }));
                ly.push(anim(text(nm + ' Price', { parent: nm, text: '$' + plans[i][1], fontSize: 110, weight: 800, fill: '#ffffff', pos: [0, -100], behave: { count: { from: 0, to: +plans[i][1], start: t0 + 0.3, dur: 1.2, prefix: '$' } } }), { opacity: op }));
                ly.push(anim(text(nm + ' Per', { parent: nm, text: 'per month', fontSize: 26, weight: 500, fill: '#77758c', pos: [0, -50] }), { opacity: op }));
                for (f = 0; f < 3; f++) {
                    ly.push(anim(path(nm + ' Check ' + (f + 1), { parent: nm, points: [[-160, 40 + f * 70], [-148, 52 + f * 70], [-126, 28 + f * 70]], stroke: { color: hot ? p.accent : '#5c5a74', width: 6 }, trimEnd: 0 }), { trimEnd: [k(t0 + 0.7 + f * 0.1, 0), k(t0 + 1.0 + f * 0.1, 100, 'out')] }));
                    ly.push(anim(text(nm + ' Feature ' + (f + 1), { parent: nm, text: ['Unlimited exports', 'All templates', 'Priority support'][f], align: 'left', fontSize: 28, weight: 500, fill: '#c8c6dc', pos: [-100, 50 + f * 70] }), { opacity: fadeIn(t0 + 0.7 + f * 0.1, 0.3) }));
                }
                if (hot) {
                    ly.push(anim(nul('Popular', { parent: nm, pos: [0, -320] }), { scale: popScale(t0 + 1.0, 0.5) }));
                    ly.push(rect('Popular Pill', { parent: 'Popular', size: [200, 56], radius: 28, fill: p.accent }));
                    ly.push(text('Popular Text', { parent: 'Popular', text: 'POPULAR', fontSize: 24, weight: 800, tracking: 100, fill: '#ffffff', pos: [0, 9] }));
                }
            }
            return { name: 'Pricing Cards', w: 1920, h: 1080, dur: 5, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });

    // 8 ---------- Toggle Switches ----------
    add({
        id: 'toggles', title: 'Toggle Switches', category: 'UI', params: [TX('l1', 'Row 1', 'Auto captions'), TX('l2', 'Row 2', '4K export'), TX('l3', 'Row 3', 'Motion blur'), C('accent', 'On colour', '#34c759'), C('bg', 'Background', '#eceef3'), SPEED],
        scene: function (p) {
            var ly = [], rows = [p.l1, p.l2, p.l3], i;
            ly.push(anim(nul('Panel', { pos: [CX, CY] }), { scale: [k(0.1, 90), k(0.8, 100, 'expo')] }));
            ly.push(anim(rect('Panel Card', { parent: 'Panel', size: [900, 560], radius: 48, fill: '#ffffff', shadow: { opacity: 14, blur: 50, dist: 20 } }), { opacity: fadeIn(0.1, 0.3) }));
            for (i = 0; i < 3; i++) {
                var y = -160 + i * 160, t0 = 1.0 + i * 0.6, op = fadeIn(0.3 + i * 0.1, 0.3);
                if (i) { ly.push(anim(path('Divider ' + i, { parent: 'Panel', points: [[-380, y - 80], [380, y - 80]], stroke: { color: '#ececf2', width: 2 } }), { opacity: op })); }
                ly.push(anim(text('Label ' + (i + 1), { parent: 'Panel', text: rows[i], align: 'left', fontSize: 42, weight: 600, fill: '#16161c', pos: [-380, y + 15] }), { opacity: op }));
                ly.push(anim(rect('Track ' + (i + 1), { parent: 'Panel', size: [128, 72], radius: 36, pos: [300, y], fill: '#d6d6de' }), { opacity: op, fill: [k(t0, '#d6d6de'), k(t0 + 0.25, p.accent, 'out')] }));
                ly.push(anim(ell('Ripple ' + (i + 1), { parent: 'Panel', size: [64, 64], pos: [332, y], fill: p.accent, opacity: 0 }), { size: [k(t0, [64, 64]), k(t0 + 0.5, [150, 150], 'out')], opacity: [k(t0 - 0.01, 0, 'hold'), k(t0, 40, 'hold'), k(t0 + 0.5, 0, 'in')] }));
                ly.push(anim(ell('Knob ' + (i + 1), { parent: 'Panel', size: [60, 60], pos: [272, y], fill: '#ffffff', shadow: { opacity: 25, blur: 8, dist: 3 } }), { opacity: op, pos: [k(t0, [272, y]), k(t0 + 0.3, [328, y], 'snap')], size: [k(t0, [60, 60]), k(t0 + 0.12, [74, 60], 'out'), k(t0 + 0.3, [60, 60], 'out')] }));
            }
            return { name: 'Toggle Switches', w: 1920, h: 1080, dur: 4.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 9 ---------- Loading to Success ----------
    add({
        id: 'success', title: 'Loading → Success', category: 'UI', params: [TX('label', 'Message', 'Payment complete'), C('accent', 'Success colour', '#22c55e'), C('bg', 'Background', '#0c0d12'), SPEED],
        scene: function (p) {
            var ly = [], c = [CX, 480], i;
            ly.push(ell('Track', { size: [240, 240], pos: c, stroke: { color: '#23252f', width: 14 }, anim: { opacity: [k(2.0, 100), k(2.3, 0, 'linear')] } }));
            ly.push(ell('Spinner', { size: [240, 240], pos: c, stroke: { color: p.accent, width: 14 }, trimEnd: 25, anim: { rot: [k(0, 0), k(2.0, 900, 'in')], trimEnd: [k(1.7, 25), k(2.15, 100, 'out')], opacity: [k(2.2, 100), k(2.35, 0, 'linear')] } }));
            ly.push(anim(ell('Fill', { size: [240, 240], pos: c, fill: p.accent, glow: { color: p.accent, radius: 50, intensity: 0.8 } }), { scale: popScale(2.2, 0.55) }));
            ly.push(path('Check', { points: [[c[0] - 52, c[1] + 2], [c[0] - 14, c[1] + 40], [c[0] + 58, c[1] - 38]], stroke: { color: '#ffffff', width: 18 }, trimEnd: 0, anim: { trimEnd: [k(2.55, 0), k(2.95, 100, 'out')] } }));
            for (i = 0; i < 8; i++) {
                var a = i * 45 * Math.PI / 180, p0 = [c[0] + Math.cos(a) * 170, c[1] + Math.sin(a) * 170], p1 = [c[0] + Math.cos(a) * 240, c[1] + Math.sin(a) * 240];
                ly.push(path('Burst ' + (i + 1), { points: [p0, p1], stroke: { color: p.accent, width: 10 }, trimEnd: 0, anim: { trimEnd: [k(2.45, 0), k(2.7, 100, 'out')], trimStart: [k(2.6, 0), k(2.95, 100, 'out')] } }));
            }
            ly.push(anim(text('Message', { text: p.label, fontSize: 64, weight: 800, fill: '#ffffff', pos: [CX, 770] }), { opacity: fadeIn(2.9, 0.4), pos: rise([CX, 770], 2.9, 0.8, 40) }));
            return { name: 'Loading to Success', w: 1920, h: 1080, dur: 5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 10 ---------- Kinetic Title Slam ----------
    add({
        id: 'slam', title: 'Kinetic Title Slam', category: 'Typography', params: [TX('w1', 'Word 1', 'BUILD'), TX('w2', 'Word 2', 'SHIP'), TX('w3', 'Word 3', 'REPEAT'), C('accent', 'Flash colour', '#ff2e63'), C('bg', 'Background', '#08080b'), SPEED],
        scene: function (p) {
            var ly = [], words = [p.w1, p.w2, p.w3], times = [0.4, 1.2, 2.0], i, jit = [];
            for (i = 0; i < 3; i++) { var t = times[i]; jit.push(k(t, [CX, CY], 'hold'), k(t + 0.05, [CX + 22, CY - 14], 'linear'), k(t + 0.1, [CX - 16, CY + 12], 'linear'), k(t + 0.15, [CX + 8, CY - 6], 'linear'), k(t + 0.22, [CX, CY], 'linear')); }
            ly.push(rect('Flash', { size: [1920, 1080], pos: [CX, CY], fill: p.accent, opacity: 0, anim: { opacity: [k(0.4, 0, 'hold'), k(0.41, 70, 'hold'), k(0.6, 0, 'out'), k(1.2, 0, 'hold'), k(1.21, 55, 'hold'), k(1.4, 0, 'out'), k(2.0, 0, 'hold'), k(2.01, 80, 'hold'), k(2.25, 0, 'out')] } }));
            ly.push(nul('Rig', { pos: [CX, CY], anim: { pos: jit, scale: [k(2.6, 100), k(4.5, 106, 'soft')] } }));
            for (i = 0; i < 3; i++) {
                var y = (i - 1) * 210 + 75, t0 = times[i];
                ly.push(anim(text('Word ' + (i + 1), { parent: 'Rig', text: words[i], fontSize: 230, weight: 900, tracking: -20, fill: i === 1 ? p.accent : '#ffffff', pos: [0, y] }), { scale: [k(t0, 380), k(t0 + 0.32, 100, 'expo')], opacity: [k(t0 - 0.01, 0, 'hold'), k(t0, 100, 'hold')], blur: [k(t0, 30), k(t0 + 0.25, 0, 'out')] }));
            }
            return { name: 'Kinetic Title Slam', w: 1920, h: 1080, dur: 4.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 11 ---------- Countdown Launch ----------
    add({
        id: 'countdown', title: 'Countdown Launch', category: 'Typography', params: [TX('title', 'Final word', 'LAUNCH'), C('accent', 'Accent', '#ffb703'), C('bg1', 'Background top', '#0d0221'), C('bg2', 'Background bottom', '#241734'), SPEED],
        scene: function (p) {
            var ly = [], c = [CX, CY], i;
            ly.push(ell('Ring Track', { size: [560, 560], pos: c, stroke: { color: '#2d2440', width: 16 }, anim: { opacity: [k(3.0, 100), k(3.2, 0, 'linear')] } }));
            ly.push(ell('Ring', { size: [560, 560], pos: c, stroke: { color: p.accent, width: 16 }, trimEnd: 0, glow: { color: p.accent, radius: 30, intensity: 0.8 }, anim: { trimEnd: [k(0, 0), k(3.0, 100, 'linear')], opacity: [k(3.0, 100), k(3.2, 0, 'linear')] } }));
            for (i = 0; i < 3; i++) {
                var t0 = i;
                ly.push(anim(text('Number ' + (3 - i), { text: String(3 - i), fontSize: 340, weight: 900, fill: '#ffffff', pos: [CX, CY + 120] }), { scale: [k(t0, 150), k(t0 + 0.35, 100, 'expo'), k(t0 + 0.8, 100), k(t0 + 1.0, 60, 'in')], opacity: [k(t0, 0), k(t0 + 0.12, 100, 'linear'), k(t0 + 0.8, 100), k(t0 + 1.0, 0, 'linear')] }));
            }
            ly.push(anim(text('Title', { text: p.title, fontSize: 230, weight: 900, tracking: 60, fill: p.accent, pos: [CX, CY + 80], glow: { color: p.accent, radius: 50, intensity: 1 } }), { scale: [k(3.0, 40), k(3.45, 100, 'expo')], opacity: [k(2.99, 0, 'hold'), k(3.0, 100, 'hold')] }));
            sparks('Spark', c, 3.05, p.accent, 14, 620, 26).forEach(function (s) { ly.push(s); });
            burst('Shock', c, 3.0, '#ffffff', 2, 300, 1500).forEach(function (s) { ly.push(s); });
            return { name: 'Countdown Launch', w: 1920, h: 1080, dur: 5, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });

    // 12 ---------- Orbit Logo Reveal ----------
    add({
        id: 'orbit-logo', title: 'Orbit Logo Reveal', category: 'Logo', params: [TX('brand', 'Brand name', 'sowveil'), TX('tagline', 'Tagline', 'motion, simplified'), C('accent', 'Accent', '#7c5cff'), C('accent2', 'Second colour', '#00d4ff'), C('bg', 'Background', '#07070b'), SPEED],
        scene: function (p) {
            var ly = [], cols = [p.accent, p.accent2, '#ff5c8a'], i, lx = CX - tw(p.brand, 150) / 2 - 40;
            ly.push(nul('Orbit', { pos: [CX, CY], behave: { spin: 140 }, anim: { pos: [k(2.4, [CX, CY]), k(3.0, [lx, CY], 'expo')], scale: [k(0, 60), k(1.0, 100, 'expo')] } }));
            for (i = 0; i < 3; i++) {
                var a = i * 120 * Math.PI / 180, op = [Math.cos(a) * 230, Math.sin(a) * 230];
                ly.push(anim(ell('Planet ' + (i + 1), { parent: 'Orbit', size: [70, 70], pos: op, fill: cols[i], glow: { color: cols[i], radius: 30, intensity: 0.8 } }), { pos: [k(1.8, op), k(2.5, [0, 0], 'in')], opacity: [k(0.1, 0), k(0.4, 100, 'linear'), k(2.45, 100), k(2.55, 0, 'linear')] }));
            }
            ly.push(anim(ell('Logo', { size: [180, 180], pos: [lx, CY], fill: p.accent, glow: { color: p.accent, radius: 60, intensity: 0.9 } }), { scale: popScale(2.45, 0.6), pos: [k(2.4, [CX, CY]), k(3.0, [lx, CY], 'expo')] }));
            ly.push(anim(ell('Logo Cut', { size: [80, 80], pos: [lx + 30, CY - 30], fill: '#ffffff' }), { scale: popScale(2.7, 0.5), pos: [k(2.4, [CX + 30, CY - 30]), k(3.0, [lx + 30, CY - 30], 'expo')] }));
            var bx = lx + 140;
            ly.push(text('Brand', { text: p.brand, align: 'left', fontSize: 150, weight: 800, tracking: -10, fill: '#ffffff', pos: [bx, CY + 52], clip: { rect: [bx - 10, CY - 120, 1400, 220] }, anim: { pos: [k(2.9, [bx - 260, CY + 52]), k(3.7, [bx, CY + 52], 'expo')] } }));
            ly.push(anim(text('Tagline', { text: p.tagline, align: 'left', fontSize: 40, weight: 500, tracking: 60, fill: '#8f8fa8', pos: [bx + 6, CY + 140] }), { opacity: fadeIn(3.5, 0.6) }));
            return { name: 'Orbit Logo Reveal', w: 1920, h: 1080, dur: 5.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 13 ---------- Bento Feature Grid ----------
    add({
        id: 'bento', title: 'Bento Feature Grid', category: 'Marketing', params: [TX('f1', 'Feature 1', 'Auto captions'), TX('f2', 'Feature 2', '3D carousel'), TX('f3', 'Feature 3', 'Templates'), TX('f4', 'Feature 4', 'Glass UI'), TX('f5', 'Feature 5', 'Backgrounds'), NU('stat', 'Big number', 0, 99999, 143), C('accent', 'Accent', '#7c5cff'), C('bg', 'Background', '#09090d'), SPEED],
        scene: function (p) {
            var ly = [], tiles = [[-470, -170, 560, 380, 'stat'], [170, -170, 640, 380, p.f1], [-570, 210, 360, 340, p.f2], [-110, 210, 520, 340, p.f3], [430, 210, 520, 340, p.f4]], i, ic = [p.accent, '#00d4ff', '#ff5c8a', '#ffb703', '#22c55e'];
            for (i = 0; i < tiles.length; i++) {
                var T0 = tiles[i], nm = 'Tile ' + (i + 1), t0 = 0.2 + i * 0.12, pos = [CX + T0[0], CY + T0[1]];
                ly.push(anim(nul(nm, { pos: pos }), { scale: popScale(t0, 0.6), pos: rise(pos, t0, 0.7, 40) }));
                ly.push(anim(rect(nm + ' Card', { parent: nm, size: [T0[2], T0[3]], radius: 40, fill: '#15151c', stroke: { color: '#26262f', width: 2 } }), { opacity: fadeIn(t0, 0.2) }));
                if (T0[4] === 'stat') {
                    ly.push(text(nm + ' Number', { parent: nm, text: String(p.stat), fontSize: 170, weight: 900, fill: '#ffffff', pos: [0, 30], behave: { count: { from: 0, to: +p.stat, start: t0 + 0.2, dur: 1.4 } } }));
                    ly.push(anim(text(nm + ' Caption', { parent: nm, text: 'presets included', fontSize: 34, weight: 600, fill: '#8a8a9a', pos: [0, 100] }), { opacity: fadeIn(t0 + 0.4, 0.3) }));
                } else {
                    ly.push(anim(rect(nm + ' Icon', { parent: nm, size: [96, 96], radius: 26, pos: [-T0[2] / 2 + 90, -T0[3] / 2 + 90], fill: ic[i], glow: { color: ic[i], radius: 30, intensity: 0.5 } }), { opacity: fadeIn(t0 + 0.2, 0.2), rot: [k(t0 + 0.2, -30), k(t0 + 0.8, 0, 'expo')] }));
                    ly.push(anim(text(nm + ' Label', { parent: nm, text: T0[4], align: 'left', fontSize: 46, weight: 800, fill: '#ffffff', pos: [-T0[2] / 2 + 42, T0[3] / 2 - 50] }), { opacity: fadeIn(t0 + 0.3, 0.3) }));
                }
            }
            return { name: 'Bento Feature Grid', w: 1920, h: 1080, dur: 4.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 14 ---------- Social Like Burst ----------
    add({
        id: 'like', title: 'Social Like Burst', category: 'Social', params: [TX('user', 'Username', '@sowveil'), NU('likes', 'Likes', 0, 999999, 1203), C('heart', 'Heart colour', '#ff2d55'), C('img1', 'Image colour A', '#ff9a8b'), C('img2', 'Image colour B', '#6a5cff'), C('bg', 'Background', '#eef0f6'), SPEED],
        scene: function (p) {
            var ly = [], hp = [-300, 330], hx = [CX + hp[0], CY + hp[1]];
            ly.push(anim(nul('Post', { pos: [CX, CY] }), { pos: rise([CX, CY], 0.1, 0.9, 80) }));
            ly.push(anim(rect('Post Card', { parent: 'Post', size: [760, 960], radius: 44, fill: '#ffffff', shadow: { opacity: 14, blur: 50, dist: 20 } }), { opacity: fadeIn(0.1, 0.3) }));
            ly.push(anim(ell('Avatar', { parent: 'Post', size: [70, 70], pos: [-305, -400], fill: p.img2 }), { opacity: fadeIn(0.3, 0.3) }));
            ly.push(anim(text('User', { parent: 'Post', text: p.user, align: 'left', fontSize: 32, weight: 700, fill: '#16161c', pos: [-255, -389] }), { opacity: fadeIn(0.3, 0.3) }));
            ly.push(anim(grad('Photo', { parent: 'Post', size: [700, 620], radius: 30, pos: [0, -30], grad: { colors: [p.img1, p.img2], angle: 45 } }), { opacity: fadeIn(0.35, 0.4) }));
            ly.push(anim(path('Heart Outline', { parent: 'Post', points: heart(2.2), closed: true, pos: hp, stroke: { color: '#16161c', width: 6 } }), { opacity: [k(0.5, 0), k(0.8, 100, 'linear'), k(2.69, 100), k(2.7, 0, 'hold')] }));
            ly.push(anim(path('Heart', { parent: 'Post', points: heart(2.2), closed: true, pos: hp, fill: p.heart }), { scale: [k(2.7, 0), k(2.95, 125, 'out'), k(3.2, 100, 'inOut')], opacity: [k(2.69, 0, 'hold'), k(2.7, 100, 'hold')] }));
            sparks('Particle', hx, 2.75, p.heart, 10, 150, 18).forEach(function (s) { ly.push(s); });
            ly.push(anim(text('Likes', { parent: 'Post', text: 'Liked by ' + Number(p.likes + 1).toLocaleString('en-US'), align: 'left', fontSize: 30, weight: 600, fill: '#16161c', pos: [-330, 420], behave: { count: { from: +p.likes, to: +p.likes + 1, start: 2.7, dur: 0.05, sep: true, prefix: 'Liked by ' } } }), { opacity: fadeIn(0.6, 0.3) }));
            ly.push(cursor('Cursor', [k(1.6, [1500, 1000]), k(2.55, [hx[0] + 6, hx[1] + 6], 'expo')], 2.7));
            return { name: 'Social Like Burst', w: 1920, h: 1080, dur: 4.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 15 ---------- Retro Grid Horizon ----------
    add({
        id: 'retro', title: 'Retro Grid Horizon', category: 'Backgrounds', params: [TX('title', 'Title', 'NIGHT DRIVE'), C('neon', 'Neon', '#ff3d81'), C('grid', 'Grid', '#00e5ff'), C('sky1', 'Sky top', '#0b0221'), C('sky2', 'Sky horizon', '#5a1a6e'), SPEED],
        scene: function (p) {
            var ly = [], hz = 700, i, P = 1.6, dur = 6.4;
            ly.push(grad('Sun', { size: [520, 520], radius: 260, pos: [CX, 560], grad: { colors: ['#ffd36e', p.neon], angle: 90 }, glow: { color: p.neon, radius: 80, intensity: 0.7 }, anim: { pos: [k(0, [CX, 620]), k(2.0, [CX, 560], 'soft')] } }));
            for (i = 0; i < 5; i++) { ly.push(rect('Sun Stripe ' + (i + 1), { size: [600, 10 + i * 6], pos: [CX, 600 + i * 34], fill: p.sky2 })); }
            ly.push(rect('Ground', { size: [1920, 1080 - hz], pos: [CX, hz + (1080 - hz) / 2], fill: '#0a0018' }));
            for (i = -8; i <= 8; i++) { ly.push(path('Grid V ' + (i + 9), { points: [[CX + i * 30, hz], [CX + i * 260, 1080]], stroke: { color: p.grid, width: 3 }, opacity: 70, glow: i === 0 ? { color: p.grid, radius: 14, intensity: 0.4 } : undefined })); }
            for (i = 0; i < 5; i++) {
                var tr = [], off = i * P / 5, t = -off, first = true;
                while (t < dur + P) {
                    var a = Math.max(0, t), f0 = (a - t) / P;
                    tr.push(k(a + (first ? 0 : 0.001), [CX, hz + (1080 - hz) * f0 * f0], first ? undefined : 'hold')); tr.push(k(t + P, [CX, 1080], 'in')); first = false; t += P;
                }
                ly.push(path('Grid H ' + (i + 1), { points: [[-960, 0], [960, 0]], stroke: { color: p.grid, width: 3 }, opacity: 70, pos: [CX, hz], anim: { pos: tr } }));
            }
            ly.push(rect('Horizon Glow', { size: [1920, 6], pos: [CX, hz], fill: p.neon, glow: { color: p.neon, radius: 40, intensity: 1 } }));
            ly.push(anim(text('Title', { text: p.title, fontSize: 170, weight: 900, tracking: 160, fill: '#ffffff', pos: [CX, 330], glow: { color: p.neon, radius: 50, intensity: 1.2 } }), { opacity: [k(0.5, 0), k(0.6, 100, 'hold'), k(0.68, 20, 'hold'), k(0.76, 100, 'hold'), k(0.9, 40, 'hold'), k(1.0, 100, 'hold')], tracking: [k(0.5, 400), k(2.0, 160, 'expo')] }));
            return { name: 'Retro Grid Horizon', w: 1920, h: 1080, dur: dur, fps: 30, bg: { colors: [p.sky1, p.sky2], angle: 90 }, layers: ly };
        }
    });

    // 16 ---------- Phone App Scroll ----------
    add({
        id: 'phone-scroll', title: 'Phone App Scroll', category: 'Device', params: [TX('headline', 'Headline', 'Everything in one place'), TX('app', 'Screen title', 'Inbox'), C('accent', 'Accent', '#6d5cff'), C('bg1', 'Background top', '#e8ecff'), C('bg2', 'Background bottom', '#f9e8ff'), SPEED],
        scene: function (p) {
            var ly = [], ph = [1180, 560], i, cols = [p.accent, '#ff5c8a', '#00c2a8', '#ffb703'];
            ly.push(anim(text('Headline', { text: p.headline.replace(' in ', '\nin '), align: 'left', fontSize: 92, weight: 800, fill: '#14141c', pos: [220, 470] }), { opacity: fadeIn(0.3, 0.5), pos: rise([220, 470], 0.3, 0.9, 40) }));
            ly.push(anim(nul('Phone', { pos: ph }), { pos: rise(ph, 0, 1.0, 200), rot: [k(0, 6), k(1.0, 0, 'expo')] }));
            ly.push(rect('Phone Frame', { parent: 'Phone', size: [500, 1000], radius: 84, fill: '#0e0e14', shadow: { opacity: 30, blur: 60, dist: 30 } }));
            ly.push(rect('Screen', { parent: 'Phone', size: [460, 960], radius: 64, fill: '#f6f7fb' }));
            ly.push(nul('List', { parent: 'Phone', pos: [0, 0], anim: { pos: [k(1.4, [0, 0]), k(2.4, [0, -420], 'expo'), k(3.6, [0, -420]), k(4.4, [0, -760], 'expo')] } }));
            var clip = function () { var r = [ph[0] - 230, ph[1] - 330, 460, 810]; return { rect: r, anim: [k(0, [r[0], r[1] + 200, r[2], r[3]]), k(1.0, r, 'expo')] }; };
            for (i = 0; i < 9; i++) {
                var y = -260 + i * 170;
                ly.push(rect('Row ' + (i + 1), { parent: 'List', size: [400, 140], radius: 30, pos: [0, y], fill: '#ffffff', clip: clip() }));
                ly.push(ell('Row Avatar ' + (i + 1), { parent: 'List', size: [70, 70], pos: [-140, y], fill: cols[i % 4], clip: clip() }));
                ly.push(rect('Row Line ' + (i + 1), { parent: 'List', size: [200, 18], radius: 9, pos: [10, y - 18], fill: '#d9dbe6', clip: clip() }));
                ly.push(rect('Row Line B ' + (i + 1), { parent: 'List', size: [140, 14], radius: 7, pos: [-20, y + 20], fill: '#eceef4', clip: clip() }));
            }
            ly.push(rect('Header', { parent: 'Phone', size: [460, 150], radius: 64, pos: [0, -405], fill: '#f6f7fb' }));
            ly.push(text('Screen Title', { parent: 'Phone', text: p.app, align: 'left', fontSize: 52, weight: 800, fill: '#14141c', pos: [-190, -370] }));
            ly.push(anim(nul('Badge', { pos: [ph[0] + 280, ph[1] - 300], behave: { float: { amp: 14, freq: 0.6 } } }), { scale: popScale(2.6, 0.6) }));
            ly.push(ell('Badge Dot', { parent: 'Badge', size: [120, 120], fill: p.accent, shadow: { opacity: 30, blur: 30, dist: 10 } }));
            ly.push(text('Badge Num', { parent: 'Badge', text: '24', fontSize: 52, weight: 800, fill: '#ffffff', pos: [0, 18] }));
            return { name: 'Phone App Scroll', w: 1920, h: 1080, dur: 5, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 0 }, layers: ly };
        }
    });

    // 17 ---------- Text Mask Reveal ----------
    add({
        id: 'mask-title', title: 'Text Mask Reveal', category: 'Typography', params: [TX('l1', 'Line 1', 'Design that'), TX('l2', 'Line 2', 'moves people.'), TX('sub', 'Subtitle', 'SOWVEIL STUDIO · 2026'), C('accent', 'Accent', '#ff5c39'), C('bg', 'Background', '#f4efe6'), C('ink', 'Text colour', '#141414'), SPEED],
        scene: function (p) {
            var ly = [], lines = [p.l1, p.l2], i;
            for (i = 0; i < 2; i++) {
                var y = 470 + i * 190, t0 = 0.3 + i * 0.18;
                ly.push(text('Line ' + (i + 1), { text: lines[i], align: 'left', fontSize: 170, weight: 800, tracking: -20, fill: i ? p.accent : p.ink, pos: [240, y], clip: { rect: [200, y - 160, 1600, 200] }, anim: { pos: [k(t0, [240, y + 200]), k(t0 + 1.0, [240, y], 'expo')] } }));
            }
            ly.push(path('Rule', { points: [[244, 760], [1100, 760]], stroke: { color: p.ink, width: 6 }, trimEnd: 0, anim: { trimEnd: [k(1.0, 0), k(1.9, 100, 'expo')] } }));
            ly.push(anim(text('Subtitle', { text: p.sub, align: 'left', fontSize: 36, weight: 700, tracking: 200, fill: p.ink, pos: [244, 840] }), { opacity: fadeIn(1.4, 0.5), pos: rise([244, 840], 1.4, 0.8, 30) }));
            return { name: 'Text Mask Reveal', w: 1920, h: 1080, dur: 4, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 18 ---------- Glass Cards Fan ----------
    add({
        id: 'glass-fan', title: 'Glass Cards Fan', category: '3D / Glass', params: [TX('name', 'Card name', 'SOWVEIL PRO'), C('blob1', 'Blob 1', '#7c5cff'), C('blob2', 'Blob 2', '#ff5c8a'), C('blob3', 'Blob 3', '#00d4ff'), C('bg', 'Background', '#07070c'), SPEED],
        scene: function (p) {
            var ly = [], blobs = [[p.blob1, [700, 420]], [p.blob2, [1250, 700]], [p.blob3, [1150, 330]]], i;
            for (i = 0; i < 3; i++) { ly.push(ell('Blob ' + (i + 1), { size: [620, 620], pos: blobs[i][1], fill: blobs[i][0], opacity: 85, blur: 120, behave: { float: { amp: 40, x: 30, freq: 0.12 + i * 0.04, phase: i } } })); }
            ly.push(anim(nul('Fan', { pos: [CX, CY + 40] }), { scale: [k(0, 80), k(1.0, 100, 'expo')] }));
            var rots = [-14, 0, 14], offs = [[-330, 40], [0, -30], [330, 40]];
            for (i = 0; i < 3; i++) {
                var nm = 'Card ' + (i + 1);
                ly.push(anim(nul(nm, { parent: 'Fan', pos: [0, 0], behave: { float: { amp: 10, freq: 0.4, phase: i * 0.4 } } }), { pos: [k(0.6, [0, 0]), k(1.6, offs[i], 'expo')], rot: [k(0.6, 0), k(1.6, rots[i], 'expo')] }));
                ly.push(anim(rect(nm + ' Glass', { parent: nm, size: [520, 320], radius: 38, fill: '#ffffff', fillOpacity: 14, stroke: { color: '#ffffff', width: 2 } }), { opacity: fadeIn(0.1, 0.4) }));
                ly.push(anim(rect(nm + ' Chip', { parent: nm, size: [72, 56], radius: 12, pos: [-180, -50], fill: '#ffd36e' }), { opacity: fadeIn(0.2, 0.4) }));
                ly.push(anim(text(nm + ' Number', { parent: nm, text: '•••• ' + (4821 + i * 1117), align: 'left', fontSize: 36, weight: 700, fill: '#ffffff', tracking: 80, pos: [-216, 50] }), { opacity: fadeIn(0.2, 0.4) }));
                ly.push(anim(text(nm + ' Name', { parent: nm, text: p.name, align: 'left', fontSize: 24, weight: 700, fill: '#ffffff', tracking: 160, opacity: 70, pos: [-216, 110] }), { opacity: fadeIn(0.2, 0.4) }));
            }
            return { name: 'Glass Cards Fan', w: 1920, h: 1080, dur: 5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 19 ---------- Progress Rings ----------
    add({
        id: 'rings', title: 'Progress Rings', category: 'Data', params: [NU('a', 'Ring 1 %', 0, 100, 82), NU('b', 'Ring 2 %', 0, 100, 64), NU('c', 'Ring 3 %', 0, 100, 95), TX('la', 'Label 1', 'Retention'), TX('lb', 'Label 2', 'Conversion'), TX('lc', 'Label 3', 'Uptime'), C('bg', 'Background', '#0b0b12'), SPEED],
        scene: function (p) {
            var ly = [], vals = [p.a, p.b, p.c], labs = [p.la, p.lb, p.lc], cols = ['#7c5cff', '#00d4ff', '#22c55e'], i;
            ly.push(anim(text('Header', { text: 'This quarter', fontSize: 60, weight: 800, fill: '#ffffff', pos: [CX, 200] }), { opacity: fadeIn(0.1, 0.4) }));
            for (i = 0; i < 3; i++) {
                var x = CX + (i - 1) * 470, c = [x, 560], t0 = 0.5 + i * 0.15;
                ly.push(anim(ell('Track ' + (i + 1), { size: [320, 320], pos: c, stroke: { color: '#1d1d2a', width: 30 } }), { scale: popScale(t0 - 0.2, 0.5) }));
                ly.push(ell('Ring ' + (i + 1), { size: [320, 320], pos: c, stroke: { color: cols[i], width: 30 }, trimEnd: 0, glow: { color: cols[i], radius: 24, intensity: 0.5 }, anim: { trimEnd: [k(t0, 0), k(t0 + 1.8, +vals[i], 'inOut')] } }));
                ly.push(text('Percent ' + (i + 1), { text: vals[i] + '%', fontSize: 84, weight: 800, fill: '#ffffff', pos: [x, 590], behave: { count: { from: 0, to: +vals[i], start: t0, dur: 1.8, suffix: '%' } } }));
                ly.push(anim(text('Label ' + (i + 1), { text: labs[i], fontSize: 36, weight: 600, fill: '#8a8aa0', pos: [x, 800] }), { opacity: fadeIn(t0 + 0.4, 0.4) }));
            }
            return { name: 'Progress Rings', w: 1920, h: 1080, dur: 4.5, fps: 30, bg: p.bg, layers: ly };
        }
    });

    // 20 ---------- CTA Button Click ----------
    add({
        id: 'cta', title: 'CTA Button Click', category: 'Marketing', params: [TX('headline', 'Headline', 'Ready to ship?'), TX('button', 'Button', 'Get started'), TX('after', 'After click', 'Welcome!'), C('accent', 'Button colour', '#6d5cff'), C('done', 'Done colour', '#22c55e'), C('bg1', 'Background top', '#0f0c29'), C('bg2', 'Background bottom', '#302b63'), SPEED],
        scene: function (p) {
            var ly = [], b = [CX, 640], i;
            ly.push(anim(text('Headline', { text: p.headline, fontSize: 110, weight: 800, fill: '#ffffff', pos: [CX, 420] }), { opacity: fadeIn(0.2, 0.4), pos: rise([CX, 420], 0.2, 0.9, 40) }));
            // dotted shock ring (a halftone ring of dots) that expands from the button on click
            ly.push(nul('Dots', { pos: b, anim: { scale: [k(3.05, 30), k(3.9, 300, 'out')] } }));
            for (i = 0; i < 28; i++) {
                var a = i / 28 * Math.PI * 2;
                ly.push(ell('Dot ' + (i + 1), { parent: 'Dots', size: [16, 16], pos: [Math.cos(a) * 200, Math.sin(a) * 120], fill: p.accent, opacity: 0, anim: { opacity: [k(3.04, 0, 'hold'), k(3.05, 100, 'hold'), k(3.9, 0, 'in')] } }));
            }
            ly.push(anim(nul('Button', { pos: b, behave: { pulse: { amp: 0.025, freq: 1.2 } } }), { scale: [k(0.6, 0), k(1.1, 100, 'out'), k(2.95, 100), k(3.05, 88, 'out'), k(3.35, 100, 'out')] }));
            ly.push(rect('Button Body', { parent: 'Button', size: [560, 140], radius: 70, fill: p.accent, glow: { color: p.accent, radius: 40, intensity: 0.6 }, anim: { fill: [k(3.05, p.accent), k(3.3, p.done, 'out')] } }));
            ly.push(text('Button Label', { parent: 'Button', text: p.button, fontSize: 52, weight: 800, fill: '#ffffff', pos: [0, 18], anim: { opacity: [k(3.05, 100), k(3.15, 0, 'linear')] } }));
            ly.push(text('Button Done', { parent: 'Button', text: p.after, fontSize: 52, weight: 800, fill: '#ffffff', pos: [0, 18], opacity: 0, anim: { opacity: [k(3.15, 0), k(3.3, 100, 'linear')], pos: [k(3.15, [0, 50]), k(3.5, [0, 18], 'expo')] } }));
            ly.push(cursor('Cursor', [k(1.8, [1500, 980]), k(2.85, [b[0] + 120, b[1] + 20], 'expo')], 3.05));
            return { name: 'CTA Button Click', w: 1920, h: 1080, dur: 5, fps: 30, bg: { colors: [p.bg1, p.bg2], angle: 90 }, layers: ly };
        }
    });

    function defaults(def) { var o = {}; def.params.forEach(function (q) { o[q.id] = q.def; }); return o; }
    function build(def, vals) {
        var v = defaults(def), n;
        for (n in vals) { if (vals.hasOwnProperty(n) && vals[n] !== undefined) { v[n] = vals[n]; } }
        var S = def.scene(v);
        S.layers = S.layers.filter(Boolean);
        return speed(S, v.speed);
    }
    root.SVTemplates = { list: T, build: build, defaults: defaults };
})(typeof window !== 'undefined' ? window : globalThis);
