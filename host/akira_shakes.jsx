// Sougetsu Akira FX - camera shakes. Behaviour matched to the original v1.7.4 engine (reference: decompiled
// FOR_SOUGETSU_fixed_2.js, BasicShake_001_JF ... WhiteFlickerShake_001_JF), rewritten as one data-driven builder.
// Contract (client/js_flex/shake_logic.js):
//   <Preset>_001_JF(atCompTime 0/1, speed%, strength%, labelColor 1-16, flashFrames, flashOpacity, flashLabel, flashOverlay 0/1, flashOn 0/1)
//   -> "true" on success / "ERROR: msg"
// Per selected layer: an adjustment layer above it spanning its in/out, label = labelColor, Motion Tile (mirror edges,
// 110% output height) whose centre jolts, directional Motion Blur that decays, the preset's own look effect, and the
// layer is time-stretched by (200 - speed)% so the speed slider changes the shake speed. Basic Shake makes a single
// "akira_shake" layer over the whole selection. Keyframe timing uses a fixed 1/30 s step like the original.
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var G = $.global, F = $._flex, H = F._h;
    if (!H) { return; }
    var BLUR = 55, FD = 1 / 30;
    var LABEL_RGB = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0.7, 1, 1], [1, 0.7, 1], [0.7, 0.7, 0.7], [1, 0.7, 0.3], [0.729, 1, 0.702], [0.075, 0.604, 1],
        [0.388, 0.871, 0.278], [0.608, 0.341, 0.98], [0.98, 0.69, 0.341], [0.49, 0.333, 0.149], [1, 0.424, 0.988], [0.424, 1, 0.953], [1, 0.827, 0.675], [0.11, 0.549, 0.075]];

    function n(v) { var x = Number(v); return isNaN(x) ? 0 : x; }
    function labelRgb(i) { return LABEL_RGB[i] || [0, 0, 0]; }
    function eff(L, mn) { try { return L.property("ADBE Effect Parade").addProperty(mn); } catch (e) { return null; } } // optional (Cycore) effects
    function keys(p, t0, pairs) { var i; for (i = 0; i < pairs.length; i += 1) { p.setValueAtTime(t0 + pairs[i][0] * FD, pairs[i][1]); } }
    function smooth(p, inInf, outInf) {
        var k;
        for (k = 1; k <= p.numKeys; k += 1) {
            try { p.setTemporalEaseAtKey(k, [new KeyframeEase(0, k === 1 ? inInf : outInf)], [new KeyframeEase(0, k === 1 ? inInf : outInf)]); } catch (e) { }
        }
    }
    function scaleWipes(L, t, end, s, dir) {
        var i, sign = [1, -1];
        for (i = 0; i < 2; i += 1) {
            var w = eff(L, "CC Scale Wipe"); if (!w) { return; }
            try {
                w.property(3).setValue(dir);
                var p = w.property(1);
                p.setValueAtTime(t, 2 * s * sign[i]); p.setValueAtTime(end, 0);
                p.setTemporalEaseAtKey(1, [new KeyframeEase(0, 1)], [new KeyframeEase(0, 1)]);
                p.setTemporalEaseAtKey(2, [new KeyframeEase(0, 100)], [new KeyframeEase(0, 100)]);
            } catch (e) { }
        }
    }
    function exposureFlicker(L, t, end, s, sign) {
        var x = eff(L, "ADBE Exposure2"); if (!x) { return; }
        var amp = [0.5, 0, 0.4, 0, 0.3, 0, 0.3, 0, 0.2, 0], i;
        for (i = 0; i < amp.length; i += 1) { x.property(5).setValueAtTime(t + i * FD, 1 + sign * amp[i] * s); }
        x.property(5).setValueAtTime(end, 1 + sign * 0.1 * s);
    }

    // len = keyframe span in 1/30 s frames, jolt = frames of the 2nd/3rd tile-centre keys, blur = frame the motion blur reaches 0
    var PRESETS = {
        Basic: { name: "akira_shake", len: 10, jolt: [2, 5], blur: 5, whole: true },
        Quick: { name: "Akira_quick", len: 5, jolt: [2, 3], blur: 5, tile: [0.035, 0.03, 0.01] },
        WaveV1: { name: "Akira_wave", len: 14, jolt: [3, 7], blur: 7, look: function (L, t, end, s, comp) {
            var td = eff(L, "ADBE Turbulent Displace"); if (!td) { return; }
            var k = 1080 / comp.width;
            keys(td.property(2), t, [[0, 38 * s], [8, 10 * s]]); td.property(2).setValueAtTime(end, 0);
            keys(td.property(3), t, [[0, 80 * k], [10, 200 * k]]); td.property(3).setValueAtTime(end, 320);
            keys(td.property(6), t, [[0, -50], [10, 65]]); td.property(6).setValueAtTime(end, 100);
        } },
        WaveV2: { name: "Akira_wave_v2", len: 14, jolt: [3, 7], blur: 7, look: function (L, t, end, s) {
            var td = eff(L, "ADBE Turbulent Displace"); if (!td) { return; }
            td.property(2).setValueAtTime(t, 45 * s * 0.8); td.property(2).setValueAtTime(end, 0); smooth(td.property(2), 50, 50);
            td.property(3).setValueAtTime(t, 130 * s * 0.8); td.property(3).setValueAtTime(end, 477 * s * 0.8); smooth(td.property(3), 50, 50);
            td.property(6).setValueAtTime(t, 26); td.property(6).setValueAtTime(end, 368);
        } },
        Warp: { name: "Akira_warp", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) {
            var o = eff(L, "ADBE Optics Compensation"); if (!o) { return; }
            try { o.property(2).setValue(true); } catch (e) { }
            o.property(1).setValueAtTime(t, 75 * s); o.property(1).setValueAtTime(end, 0);
        } },
        Lens: { name: "Akira_lens", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) {
            var l = eff(L, "CC Lens"); if (!l) { return; }
            l.property(2).setValueAtTime(t, 190 - s * 95); l.property(2).setValueAtTime(t + 3 * FD, 260 - s * 130); l.property(2).setValueAtTime(end, 500);
        } },
        BounceIn: { name: "Akira_bounce_in", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s, comp, tile) {
            keys(tile.property(2), t, [[0, 100 - 15 * s], [2, 100 - 10 * s], [4, 100]]);
            keys(tile.property(3), t, [[0, 100 - 15 * s], [3, 100], [5, 100 - 10 * s], [9, 100]]);
        } },
        BounceOut: { name: "Akira_bounce_out", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s, comp, tile) {
            keys(tile.property(3), t, [[0, 100 - 5 * s], [2, 100 - 10 * s], [4, 100]]);
            keys(tile.property(2), t, [[0, 100 - 15 * s], [3, 100], [5, 100 - 5 * s], [9, 100]]);
            scaleWipes(L, t, end, s, 0);
        } },
        Invert: { name: "Akira_invert", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) {
            var iv = eff(L, "ADBE Invert"); if (!iv) { return; }
            keys(iv.property(1), t, [[0, 9 * s], [1, 1], [2, 8]]);
            keys(iv.property(2), t, [[2, 0], [3, 100]]);
        } },
        InvertPixle: { name: "Akira_invert_pixle", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end) {
            var iv = eff(L, "ADBE Invert");
            if (iv) { keys(iv.property(1), t, [[0, 9], [1, 1], [2, 8]]); keys(iv.property(2), t, [[2, 0], [3, 100]]); }
            var b = eff(L, "CS BlockLoad"); if (!b) { return; }
            keys(b.property(1), t, [[0, 1], [1, 100], [3, 3], [5, 10], [7, 64]]); b.property(1).setValueAtTime(end, 41);
            keys(b.property(2), t, [[0, 16], [1, 5], [3, 15], [5, 4], [7, 16]]); b.property(2).setValueAtTime(end, 16);
        } },
        SqueezeV1: { name: "Akira_squeeze_y", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) { scaleWipes(L, t, end, s, 0); } },
        SqueezeV2: { name: "Akira_squeeze_x", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) { scaleWipes(L, t, end, s, 90); } },
        DarkFlicker: { name: "Akira_dark_flicker", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) { exposureFlicker(L, t, end, s, -1); } },
        WhiteFlicker: { name: "Akira_white_flicker", len: 10, jolt: [2, 5], blur: 5, look: function (L, t, end, s) { exposureFlicker(L, t, end, s, 1); } }
    };

    function flash(comp, atCti, target, start, frames, opacity, label, overlay) {
        var len = comp.frameDuration * (frames > 0 ? frames : 20);
        var f = comp.layers.addSolid([1, 1, 1], "Akira_flash", comp.width, comp.height, 1, len);
        f.moveBefore(target);
        var t = atCti ? comp.time : start;
        f.startTime = t; f.inPoint = t; f.outPoint = t + len;
        if (overlay === 1) { f.blendingMode = BlendingMode.OVERLAY; }
        f.label = label;
        var op = f.property("ADBE Transform Group").property("ADBE Opacity");
        op.setValueAtTime(t, opacity); op.setValueAtTime(t + len, 0);
    }

    function build(comp, P, target, inP, outP, atCti, s, stretch, label) {
        var L = comp.layers.addSolid(labelRgb(label), P.name, comp.width, comp.height, 1, Math.max(comp.frameDuration, outP - inP));
        L.moveBefore(target);
        L.adjustmentLayer = true;
        L.startTime = inP; L.inPoint = inP; L.outPoint = outP;
        L.label = label;
        L.motionBlur = true;
        var t = atCti ? comp.time : inP, end = t + P.len * FD, c = [comp.width / 2, comp.height / 2];
        var tile = L.property("ADBE Effect Parade").addProperty("ADBE Tile");
        tile.property(6).setValue(true);
        tile.property(5).setValue(110);
        var a = P.tile || [0.045, 0.02, 0.01];
        keys(tile.property(1), t, [[0, [c[0], c[1] * (1 + a[0] * s)]], [P.jolt[0], [c[0], c[1] * (1 - a[1] * s)]], [P.jolt[1], [c[0], c[1] * (1 + a[2] * s)]]]);
        tile.property(1).setValueAtTime(end, c);
        if (P.look) { P.look(L, t, end, s, comp, tile); }
        var mb = eff(L, "ADBE Motion Blur");
        if (mb) { mb.property(2).setValueAtTime(t, BLUR * s); mb.property(2).setValueAtTime(t + P.blur * FD, 0); }
        L.stretch = stretch;
        L.inPoint = inP; L.outPoint = outP;
        return L;
    }

    function shake(key, a) {
        if (F.isLocked) { return "ERROR: Extension is locked."; }
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) { return "ERROR: Please select a composition."; }
        var sel = comp.selectedLayers, P = PRESETS[key] || PRESETS.Basic, i;
        if (sel.length <= 0) { return "ERROR: Please select at least one layer."; }
        var atCti = n(a[0]) !== 0, stretch = 200 - n(a[1]), s = n(a[2]) / 100, label = n(a[3]);
        var flashOn = n(a[8]) !== 0, fFrames = n(a[4]), fOpacity = n(a[5]), fLabel = n(a[6]), fOverlay = n(a[7]);
        if (stretch === 0) { stretch = 1; }
        if (!P.whole && atCti && sel.length > 1) { return "ERROR: The comp time option only works with one selected layer."; }
        app.beginUndoGroup("Akira Shake");
        try {
            if (P.whole) {
                var inP = 999999, outP = -999999, top = sel[0], list = [];
                for (i = 0; i < sel.length; i += 1) {
                    list.push(sel[i]);
                    if (sel[i].inPoint < inP) { inP = sel[i].inPoint; }
                    if (sel[i].outPoint > outP) { outP = sel[i].outPoint; }
                    if (sel[i].index < top.index) { top = sel[i]; }
                }
                if (flashOn) { flash(comp, atCti, list[0], inP, fFrames, fOpacity, fLabel, fOverlay); }
                build(comp, P, top, inP, outP, atCti, s, stretch, label);
            } else {
                var targets = []; for (i = 0; i < sel.length; i += 1) { targets.push(sel[i]); }
                for (i = 0; i < targets.length; i += 1) {
                    var a0 = Math.min(targets[i].inPoint, targets[i].outPoint), a1 = Math.max(targets[i].inPoint, targets[i].outPoint);
                    if (flashOn) { flash(comp, atCti, targets[i], a0, fFrames, fOpacity, fLabel, fOverlay); }
                    build(comp, P, targets[i], a0, a1, atCti, s, stretch, label);
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERROR: " + e.toString(); }
        app.endUndoGroup();
        return "true";
    }

    function bind(globalName, key) { G[globalName] = function (a, b, c, d, e, f, g2, h, i) { return shake(key, [a, b, c, d, e, f, g2, h, i]); }; }
    bind("Shake_001_JF", "Basic");
    bind("BasicShake_001_JF", "Basic");
    bind("QuickShake_001_JF", "Quick");
    bind("WaveV1_Shake_001_JF", "WaveV1");
    bind("WaveV2_Shake_001_JF", "WaveV2");
    bind("BounceInShake_001_JF", "BounceIn");
    bind("BounceOutShake_001_JF", "BounceOut");
    bind("SqueezeV1Shake_001_JF", "SqueezeV1");
    bind("SqueezeV2Shake_001_JF", "SqueezeV2");
    bind("WarpShake_001_JF", "Warp");
    bind("LensShake_001_JF", "Lens");
    bind("InvertShake_001_JF", "Invert");
    bind("InvertPixleShake_001_JF", "InvertPixle");
    bind("DarkFlickerShake_001_JF", "DarkFlicker");
    bind("WhiteFlickerShake_001_JF", "WhiteFlicker");
    // the panel no longer has the custom-shake pane; keep the name so nothing errors if it is called
    bind("AddCustomShake_JF", "Basic");
})();
