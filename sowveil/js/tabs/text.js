/* Sowveil - Text Animation tab: Akira FX's expression library (js/vendor/expressions.js, 143 presets in
   7 categories), applied with the same host engine Akira uses ($._svG.applyExpressionToTargets). */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var GROUPS = [['textanimator', 'Text Animators'], ['text', 'Source Text'], ['motion', 'Motion'], ['physics', 'Physics'],
        ['transform', 'Transform'], ['effects', 'Effects'], ['glitch', 'Glitch']];
    var TARGET_NAMES = { position: 'Position', scale: 'Scale', rotation: 'Rotation', opacity: 'Opacity', sourcetext: 'SourceText', color: 'Color', zoom: 'Zoom', animator: 'animator' };
    var BASED_ON = [[1, 'Characters'], [2, 'Characters (no spaces)'], [3, 'Words'], [4, 'Lines']];

    function lib() { return window.expressionLibrary || {}; }
    var cache = {};
    function itemsOf(group) {
        if (cache[group]) { return cache[group]; }
        var list = lib()[group] || [];
        cache[group] = list.map(function (e, i) {
            var targets = (e.targets || []).map(function (t) { return String(t).toLowerCase(); });
            var params = (e.params || []).map(function (p) { return { id: p.name, label: p.label, type: 'number', min: p.min, max: p.max, def: p['default'], step: p.step }; });
            if (targets.indexOf('animator') >= 0 && !e.customApply) {
                params.push({ id: '_basedOn', label: 'Based on', type: 'select', def: String(e.defaultBasedOn || 1), options: BASED_ON.map(function (b) { return [String(b[0]), b[1]]; }) });
            }
            return { id: group + ':' + i, label: e.name, subtitle: e.description, params: params, exp: e, targets: targets };
        });
        return cache[group];
    }

    function codeFor(item, v) {
        var e = item.exp, p = {}, k;
        (e.params || []).forEach(function (x) { p[x.name] = v[x.name] === undefined ? x['default'] : v[x.name]; });
        try { if (typeof e.buildCode === 'function') { k = e.buildCode(p); if (k) { return String(k); } } } catch (err) { console.error(err); }
        return String(e.code || '');
    }
    // Animator properties for text animator presets: fixed values, or driven by a slider (param/axis/paramSign).
    function animatorProps(item, v) {
        var out = [], byType = {};
        (item.exp.animatorProps || []).forEach(function (ap) {
            var val = ap.value instanceof Array ? ap.value.slice() : ap.value;
            if (ap.param) {
                var n = parseFloat(v[ap.param]); if (isNaN(n)) { n = 0; }
                n *= ap.paramSign || 1;
                if (ap.axis === 'x') { val = [n, (val && val[1]) || 0]; }
                else if (ap.axis === 'y') { val = [(val && val[0]) || 0, n]; }
                else if (val instanceof Array) { val = ap.type === 'scale' ? [n, n] : [val[0], n]; }
                else { val = n; }
            }
            var prev = byType[ap.type];
            if (prev && ap.type === 'position' && ap.axis) {   // posX + posY presets share one Position property
                if (ap.axis === 'x') { prev.value[0] = val[0]; } else { prev.value[1] = val[1]; }
                return;
            }
            var o = { type: ap.type, value: val };
            byType[ap.type] = o; out.push(o);
        });
        return out;
    }
    function pickedTargets(item) {
        var all = item.targets.filter(function (t) { return t !== 'any'; });
        if (item.exp.lockedTargets || all.length < 2) { return all; }
        var saved = SV.get('tgt:' + item.id, null);
        return saved && saved.length ? saved.filter(function (t) { return all.indexOf(t) >= 0; }) : [all[0]];
    }

    function apply(item, v) {
        var e = item.exp, code = codeFor(item, v), name = 'Sowveil · ' + e.name;
        if (e.customApply) {
            if (e.name === 'Deep Glow 2 Emulator') { return SV.akira('applyDeepGlowRig', [v.threshold, v.radius, v.exposure]).then(function (r) { SV.result(r, 'Glow added'); }); }
            if (e.name === 'Glowing Trailing Text') { return SV.akira('applyGlowingTrailText', [Math.max(1, Math.round((v.delay || 0.2) * 30))]).then(function (r) { SV.result(r, 'Trail added'); }); }
        }
        if (item.targets.indexOf('any') >= 0) {
            return SV.lib('smartApplyExpression', ['// sowveil\n' + code, false]).then(function (r) { SV.result(r.ok ? { ok: true, message: 'Applied to ' + r.count + ' propert' + (r.count === 1 ? 'y' : 'ies') } : r); });
        }
        var tg = pickedTargets(item);
        if (!tg.length) { SV.toast('Pick at least one property.', 'error'); return Promise.resolve(); }
        var settings = { basedOn: parseInt(v._basedOn || e.defaultBasedOn || 1, 10), props: animatorProps(item, v) };
        var tstr = tg.map(function (t) { return TARGET_NAMES[t] || t; }).join(',');
        return SV.lib('applyExpressionToTargets', ['// sowveil\n' + code, tstr, name, settings]).then(function (r) {
            SV.result(r.ok ? { ok: true, message: e.name + ' applied (' + r.count + ')' } : r);
        });
    }

    function copyText(btn, txt) {
        var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1200); };
        function fallback() { var ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e2) { } ta.remove(); }
        try { navigator.clipboard.writeText(txt).then(done, fallback); } catch (e) { fallback(); }
    }

    // ---------- live preview: Akira FX's preview engine (js/vendor/preview), driven the way Akira drives it ----------
    var PARAM_MAP = { dur: 'duration', totalSec: 'duration', startNum: 'startVal', revealSpeed: 'duration', wordsPerSec: 'charsPerSec', speed: 'freq', intensity: 'amp',
        startAmp: 'amp', decaySpeed: 'decay', gridSize: 'snap', v0: 'velocity', drag: 'friction', overshootPct: 'amp', throwSpeed: 'velocity', driftAmount: 'amp',
        initialVelocity: 'velocity', freqX: 'freq', ampX: 'amp', anticipation: 'duration', popAmount: 'pullback', rate: 'freq', amount: 'amp', flicker: 'freq',
        frequency: 'freq', probability: 'stutterRate' };
    function perChar(item) {
        var e = item.exp;
        if (item.id.indexOf('textanimator:') === 0 || String(e.category || '').toLowerCase() === 'textanimator') { return !!(e.animatorProps && e.animatorProps.length) || item.targets.indexOf('animator') >= 0; }
        return !!(e.animatorProps && e.animatorProps.length && item.targets.indexOf('animator') >= 0);
    }
    function playPreview(item, v) {
        var P = window.LivePreviewEngine, e = item.exp;
        if (!P) { return; }
        var name = String(e.name || '').toLowerCase(), pc = perChar(item), type = 'wiggle';
        if (pc) { type = '__textanimator__'; }
        else if (window.PreviewEngine && PreviewEngine.Formulas && PreviewEngine.Formulas[name]) { type = name; }
        var params = {};
        (e.params || []).forEach(function (x) { var val = v[x.name] === undefined ? x['default'] : v[x.name]; params[PARAM_MAP[x.name] || x.name] = val; });
        params._targets = pickedTargets(item);
        if (pc) {
            params._perChar = true; params._taName = name; params._animatorProps = e.animatorProps || [];
            params._exit = !!e.exitMode; if (e.easePreview) { params._ease = true; }
            params._basedOn = parseInt(v._basedOn || e.defaultBasedOn || 1, 10);
        }
        try { P.play(type, params); } catch (err) { console.error(err); }
    }

    SV.registerTab({
        id: 'text', label: 'Text Animation', icon: 'text',
        groups: GROUPS,
        items: function (group) { return itemsOf(group || 'textanimator'); },
        inspector: function (el, item, v) {
            var e = item.exp;
            el.appendChild(h('div', { class: 'section ex-head' }, [
                h('div', { class: 'ex-title', text: e.name }),
                h('code', { class: 'ex-sig', text: item.targets.map(function (t) { return t === 'animator' ? 'Text Animator' : t === 'any' ? 'Selected property' : (TARGET_NAMES[t] || t); }).join(' · ') }),
                h('div', { class: 'ex-desc', text: e.description || '' })
            ]));

            if (window.LivePreviewEngine) {
                window.AKIRA_THEME_RGB = '139, 125, 255';   // preview accent = Sowveil violet
                var cv = h('canvas', { class: 'tx-cv' }), stage = h('div', { class: 'preview tx-stage' }, [cv]);
                el.appendChild(SV.ui.section('Live preview', [stage]));
                requestAnimationFrame(function () { try { LivePreviewEngine.init(cv); playPreview(item, v); } catch (err) { console.error(err); } });
                var off = SV.on('inspector:leave', function () { try { LivePreviewEngine.stop(); } catch (err) { } off(); });
            }

            var all = item.targets.filter(function (t) { return t !== 'any' && t !== 'animator'; });
            if (all.length > 1 && !e.customApply) {
                var picked = pickedTargets(item);
                var chips = h('div', { class: 'tp-chips' }, all.map(function (t) {
                    return h('button', {
                        class: 'tp-chip' + (picked.indexOf(t) >= 0 ? ' on' : ''), text: TARGET_NAMES[t] || t,
                        onclick: e.lockedTargets ? null : function () {
                            var i = picked.indexOf(t); if (i < 0) { picked.push(t); } else if (picked.length > 1) { picked.splice(i, 1); }
                            SV.set('tgt:' + item.id, picked); this.classList.toggle('on', picked.indexOf(t) >= 0);
                            playPreview(item, v);
                        }
                    });
                }));
                el.appendChild(SV.ui.section(e.lockedTargets ? 'Applies to' : 'Apply to', [chips]));
            }

            var codeEl = h('pre', { class: 'ex-code' }), copy = h('button', { class: 'btn ghost small ex-copy', text: 'Copy' });
            function showCode() { codeEl.textContent = codeFor(item, v); playPreview(item, v); }
            el.appendChild(SV.ui.params('text', item, v, showCode));
            if (!e.customApply) {
                el.appendChild(SV.ui.section('Expression', [h('div', { class: 'ex-codewrap' }, [codeEl, copy])]));
                copy.addEventListener('click', function () { copyText(copy, codeFor(item, v)); });
                showCode();
            }

            var hint = item.targets.indexOf('animator') >= 0 ? 'Select text layers, then Apply. It adds a Text Animator you can edit in the timeline.'
                : item.targets.indexOf('any') >= 0 ? 'Select one or more properties in the timeline, then Apply.'
                : item.targets.indexOf('sourcetext') >= 0 ? 'Select text layers, then Apply. The expression goes on Source Text.'
                : 'Select layers, then Apply.';
            el.appendChild(SV.ui.section('', [
                SV.ui.action('Apply', function () { return apply(item, v); }),
                h('div', { style: { height: '8px' } }),
                SV.ui.action('Remove expressions from selection', function () {
                    return SV.akira('deleteSelectedExpressions', [], 'Expressions removed').then(function (r) {
                        if (r.ok && /^\d+$/.test(r.message || '')) { r.message = r.message + ' expression' + (r.message === '1' ? '' : 's') + ' removed'; }
                        SV.result(r);
                    });
                }, 'ghost'),
                h('div', { class: 'hint', text: hint })
            ]));
        }
    });
})();
