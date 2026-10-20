/* Sowveil - Text Animation tab: preset list, live in-panel preview that mirrors the AE sweep,
   parameters, apply to the selected text layers. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;

    function common(extra, o) {
        o = o || {};
        return (extra || []).concat([
            { id: 'duration', label: 'Duration', type: 'number', min: 0.2, max: 5, step: 0.05, def: o.duration || 1, unit: 's' },
            { id: 'stagger', label: 'Stagger width', type: 'number', min: 1, max: 100, step: 1, def: o.stagger || 40, unit: '%' },
            { id: 'basedOn', label: 'Animate by', type: 'select', def: o.basedOn || 'chars', options: [['chars', 'Letters'], ['words', 'Words'], ['lines', 'Lines']] },
            { id: 'order', label: 'Order', type: 'seg', def: 'forward', options: [['forward', '→'], ['backward', '←'], ['random', 'Random']] },
            { id: 'ease', label: 'Easing', type: 'number', min: 1, max: 100, step: 1, def: 75, unit: '%' },
            { id: 'start', label: 'Start at', type: 'seg', def: 'playhead', options: [['playhead', 'Playhead'], ['layer', 'Layer in']] }
        ]);
    }
    var DIST = function (d) { return { id: 'distance', label: 'Distance', type: 'number', min: 0, max: 300, step: 1, def: d, unit: 'px' }; };
    var BLUR = function (d) { return { id: 'blur', label: 'Blur', type: 'number', min: 0, max: 60, step: 1, def: d }; };
    var SCALE = function (d) { return { id: 'scaleFrom', label: 'Start scale', type: 'number', min: 0, max: 200, step: 1, def: d, unit: '%' }; };
    var OVER = [{ id: 'overshoot', label: 'Overshoot', type: 'toggle', def: true }, { id: 'overshootAmt', label: 'Overshoot amount', type: 'number', min: 0, max: 80, step: 1, def: 20 }];

    var PRESETS = [
        { id: 'fade-up', label: 'Fade Up', subtitle: 'Rise + fade, per letter', params: common([DIST(40)]) },
        { id: 'hero-reveal', label: 'Hero Reveal', subtitle: 'Scale + blur + fade', params: common([SCALE(60), BLUR(14)], { basedOn: 'words', stagger: 60, duration: 1.2 }) },
        { id: 'slide', label: 'Slide In', subtitle: 'From any side', params: common([{ id: 'direction', label: 'From', type: 'seg', def: 'left', options: [['left', 'Left'], ['right', 'Right'], ['up', 'Below'], ['down', 'Above']] }, DIST(80)]) },
        { id: 'blur-in', label: 'Blur In', subtitle: 'Defocus to focus', params: common([BLUR(20)], { stagger: 50 }) },
        { id: 'letter-rise', label: 'Letter Rise', subtitle: 'Spring up, scale + blur', params: common([DIST(50), SCALE(70), BLUR(8)].concat(OVER), { stagger: 30 }) },
        { id: 'word-stagger', label: 'Word Stagger', subtitle: 'Per-word slide + blur', params: common([DIST(30), BLUR(10)], { basedOn: 'words', stagger: 45 }) },
        { id: 'pop', label: 'Pop', subtitle: 'Scale in with a bounce', params: common(OVER, { stagger: 30, duration: 0.8 }) },
        { id: 'drop-in', label: 'Drop In', subtitle: 'Falls in from above', params: common([DIST(90)].concat(OVER), { stagger: 35 }) },
        { id: 'spin-in', label: 'Spin In', subtitle: 'Rotate + rise', params: common([{ id: 'angle', label: 'Angle', type: 'number', min: -360, max: 360, step: 1, def: 90, unit: '°' }, DIST(20)]) },
        { id: 'skew-in', label: 'Skew In', subtitle: 'Leaning slide', params: common([{ id: 'skew', label: 'Skew', type: 'number', min: -70, max: 70, step: 1, def: 35, unit: '°' }, DIST(60)]) },
        { id: 'tracking-in', label: 'Tracking In', subtitle: 'Letters gather together', params: common([{ id: 'tracking', label: 'Tracking', type: 'number', min: 0, max: 1500, step: 10, def: 400 }], { duration: 1.4, stagger: 100 }) },
        { id: 'typewriter', label: 'Typewriter', subtitle: 'One letter at a time', params: common([], { duration: 1.6 }) },
        { id: 'scramble', label: 'Scramble', subtitle: 'Decodes into place', params: common([{ id: 'chaos', label: 'Chaos', type: 'number', min: 1, max: 60, step: 1, def: 12 }], { stagger: 30, duration: 1.4 }) },
        { id: 'color-sweep', label: 'Color Sweep', subtitle: 'Colour wave across text', params: common([{ id: 'color', label: 'Colour', type: 'color', def: '#8b7dff' }], { stagger: 30 }) }
    ];

    // ---------- live preview ----------
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*';
    function units(text, by) {
        if (by === 'words') { return text.split(/(\s+)/).filter(function (s) { return s.length; }); }
        if (by === 'lines') { return [text]; }
        return text.split('');
    }
    function hiddenLook(id, v, scale) {
        var d = (v.distance || 0) * scale, b = (v.blur || 0) * scale;
        switch (id) {
            case 'fade-up': return { opacity: 0, transform: 'translate3d(0,' + d + 'px,0)' };
            case 'hero-reveal': return { opacity: 0, transform: 'scale(' + v.scaleFrom / 100 + ')', filter: 'blur(' + b + 'px)' };
            case 'slide': var x = v.direction === 'left' ? -d : v.direction === 'right' ? d : 0, y = v.direction === 'up' ? d : v.direction === 'down' ? -d : 0;
                return { opacity: 0, transform: 'translate3d(' + x + 'px,' + y + 'px,0)' };
            case 'blur-in': return { opacity: 0, filter: 'blur(' + b + 'px)' };
            case 'letter-rise': return { opacity: 0, transform: 'translate3d(0,' + d + 'px,0) scale(' + v.scaleFrom / 100 + ')', filter: 'blur(' + b + 'px)' };
            case 'word-stagger': return { opacity: 0, transform: 'translate3d(0,' + d + 'px,0)', filter: 'blur(' + b + 'px)' };
            case 'pop': return { opacity: 0, transform: 'scale(0)' };
            case 'drop-in': return { opacity: 0, transform: 'translate3d(0,' + (-d) + 'px,0)' };
            case 'spin-in': return { opacity: 0, transform: 'translate3d(0,' + d + 'px,0) rotate(' + v.angle + 'deg)' };
            case 'skew-in': return { opacity: 0, transform: 'translate3d(' + d + 'px,0,0) skewX(' + (-v.skew) + 'deg)' };
            case 'typewriter': case 'scramble': return { opacity: 0 };
            case 'color-sweep': return { color: v.color };
        }
        return { opacity: 0 };
    }
    var IDENT = { opacity: 1, transform: 'none', filter: 'blur(0.0001px)' };
    function play(stage, item, v, text) {
        stage.innerHTML = '';
        var scale = 0.28, us = units(text, item.id === 'tracking-in' ? 'lines' : v.basedOn), n = us.length || 1;
        var w = Math.max(1, Math.min(100, item.id === 'typewriter' ? 1 : v.stagger)), dur = v.duration * 1000;
        var order = us.map(function (_, i) { return i; });
        if (v.order === 'random') { order.sort(function () { return Math.random() - 0.5; }); }
        var easing = item.id === 'typewriter' ? 'steps(1,end)' : 'cubic-bezier(' + (0.2 + (100 - v.ease) / 250) + ',0.8,' + (0.5 - v.ease / 400) + ',1)';
        us.forEach(function (u, i) {
            var span = h('span', { class: 'tp-unit', text: u.replace(/ /g, ' ') });
            stage.appendChild(span);
            if (/^\s+$/.test(u)) { return; }
            var rank = order.indexOf(i), p = ((v.order === 'backward' ? n - 1 - rank : rank) + 0.5) / n * 100;
            var delay = p / (100 + w) * dur, len = Math.max(30, w / (100 + w) * dur);
            var from = hiddenLook(item.id, v, scale), to = item.id === 'color-sweep' ? { color: getComputedStyle(stage).color } : IDENT;
            var frames = [from, to];
            if ((item.id === 'pop' || item.id === 'letter-rise' || item.id === 'drop-in') && v.overshoot) {
                var mid = item.id === 'pop' ? { opacity: 1, transform: 'scale(' + (1 + v.overshootAmt / 100) + ')', offset: 0.65 }
                    : { opacity: 1, transform: 'translate3d(0,' + (-v.overshootAmt * scale) + 'px,0)', filter: 'blur(0.0001px)', offset: 0.65 };
                frames = [from, mid, to];
            }
            span.animate(frames, { duration: len, delay: delay, easing: easing, fill: 'both' });
            if (item.id === 'scramble') {
                var real = u, t0 = performance.now(), iv = setInterval(function () {
                    var t = performance.now() - t0;
                    if (t >= delay + len) { span.textContent = real; clearInterval(iv); return; }
                    if (t >= delay) { span.textContent = GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }
                }, 50);
                stage._timers = (stage._timers || []).concat(iv);
            }
        });
        if (item.id === 'tracking-in') {
            stage.animate([{ letterSpacing: (v.tracking / 1000) + 'em' }, { letterSpacing: '-0.01em' }], { duration: dur, easing: easing, fill: 'both' });
        }
    }

    SV.registerTab({
        id: 'text', label: 'Text Animation', icon: 'text',
        items: function () { return PRESETS; },
        inspector: function (el, item, v) {
            var text = SV.get('previewText', 'Sowveil');
            var stage = h('div', { class: 'tp-stage' }), box = h('div', { class: 'preview' }, [stage]);
            var timer = 0;
            function replay() {
                (stage._timers || []).forEach(clearInterval); stage._timers = [];
                clearTimeout(timer); play(stage, item, v, text || ' ');
                timer = setTimeout(replay, v.duration * 1000 + 1400);  // loop with a short hold
            }
            box.appendChild(h('button', { class: 'preview-replay', text: '↻ Replay', onclick: replay }));
            var txt = h('input', { class: 'txt-in', value: text, placeholder: 'Preview text' });
            txt.addEventListener('input', function () { text = txt.value; SV.set('previewText', text); replay(); });
            el.appendChild(SV.ui.section('Live preview', [box, h('div', { style: { marginTop: '8px' } }, [txt])]));
            el.appendChild(SV.ui.params('text', item, v, function () { replay(); }));
            el.appendChild(SV.ui.section('', [
                SV.ui.action('Apply to selected text', function () {
                    var args = Object.assign({ preset: item.id, label: item.label }, v);
                    return SV.call('textAnimate', args).then(function (r) { SV.result(r); });
                }),
                h('div', { style: { height: '8px' } }),
                SV.ui.action('Add a text layer', function () {
                    return SV.call('addText', { text: text || 'Sowveil' }).then(function (r) { SV.result(r); });
                }, 'ghost'),
                h('div', { class: 'hint', text: 'Select text layers in your comp, then Apply. Each preset is a regular Text Animator you can still edit in the timeline; the Remove bar strips it in one undo.' })
            ]));
            replay();
            var off = SV.on('inspector:leave', function () { clearTimeout(timer); (stage._timers || []).forEach(clearInterval); off(); });
        }
    });
})();
