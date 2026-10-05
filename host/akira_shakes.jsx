// Sougetsu Akira FX - camera shakes (clean-room, own design). Contract read from client/js_flex/shake_logic.js:
//   <Preset>_001_JF(createAtCompTime, speed%, strength%, colorFx, flashFrames, flashStrength, flashColor, flashBlend, flashEnable)
//   -> "true" / "ERROR:msg"      (global functions, called directly by name)
// Each shake is an adjustment layer named "flex_shake" (js_flex/flex_rig_fixes.js trims new layers with that name to their
// keyframe span after every shake call) carrying Motion Tile (no black edges) + Transform keyframes per frame, plus a
// look effect for the special presets. Envelopes match the panel's SHAKE_PRESETS (14 frames, % of full strength).
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var G = $.global, F = $._flex, H = F._h;
    if (!H) { return; }

    var P = {
        BasicShake: { seed: 100, x: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        QuickShake: { seed: 120, x: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        WaveV1: { seed: 80, x: [50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0], y: [50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0], wave: true },
        WaveV2: { seed: 85, x: [100, 100, 80, 60, 40, 20, 0, 0, 0, 0, 0, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], wave: true },
        BounceIn: { seed: 200, x: [0, 0, 0, 0, 0, 0, 0, 50, 100, 100, 100, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 50, 100, 100, 100, 0, 0, 0], bounce: true },
        BounceOut: { seed: 210, x: [100, 100, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [100, 100, 100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], bounce: true },
        SqueezeV1: { seed: 300, x: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [100, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], squeeze: "y" },
        SqueezeV2: { seed: 301, x: [100, 50, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], squeeze: "x" },
        Warp: { seed: 400, x: [80, 100, 80, 60, 40, 20, 0, 0, 0, 0, 0, 0, 0, 0], y: [80, 100, 80, 60, 40, 20, 0, 0, 0, 0, 0, 0, 0, 0], optics: 1 },
        Lens: { seed: 450, x: [50, 100, 50, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [50, 100, 50, 25, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], optics: -1 },
        Invert: { seed: 500, x: [100, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [100, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], invert: true },
        InvertPixle: { seed: 550, x: [100, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], invert: true, mosaic: true },
        DarkFlicker: { seed: 600, x: [20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], flicker: -1 },
        WhiteFlicker: { seed: 650, x: [20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], y: [20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], flicker: 1 }
    };

    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function holdAll(p) { var k; for (k = 1; k <= p.numKeys; k += 1) { p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD); } }
    function lastNonZero(a, b) { var i; for (i = a.length - 1; i >= 0; i -= 1) { if (a[i] || b[i]) { return i; } } return 0; }

    function shake(key, a) {
        var g = H.locked(); if (g) { return "ERROR:" + g.substring(4); }
        var comp = H.activeComp(); if (!comp) { return "ERROR:Open a composition first."; }
        var pr = P[key] || P.BasicShake;
        var atCti = num(a[0], 1) === 1, speed = Math.max(10, num(a[1], 100)), strength = Math.max(0, num(a[2], 100)) / 100;
        var flashFrames = Math.max(1, Math.round(num(a[4], 5))), flashStrength = num(a[5], 100), flashOn = num(a[8], 0) === 1;
        var sel = H.selectedLayers(comp), fd = comp.frameDuration, step = fd * 100 / speed;
        var t0 = atCti || !sel.length ? comp.time : sel[0].inPoint;
        var amp = 60 * strength * comp.width / 1920, n = lastNonZero(pr.x, pr.y) + 2, i;
        var rnd = pr.seed;
        function rand() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
        app.beginUndoGroup("Akira Shake");
        try {
            var L = comp.layers.addSolid([1, 1, 1], "flex_shake", comp.width, comp.height, comp.pixelAspect, comp.duration);
            L.adjustmentLayer = true; L.label = 11;
            if (sel.length) { L.moveBefore(sel[0]); }
            L.startTime = 0; L.inPoint = t0; L.outPoint = Math.min(comp.duration, t0 + n * step + fd);
            var fx = L.property("ADBE Effect Parade");
            var tile = fx.addProperty("ADBE Tile");
            try { tile.property(4).setValue(300); tile.property(5).setValue(300); tile.property(6).setValue(1); } catch (eT) { }
            var tr = fx.addProperty("ADBE Geometry2"), pos = tr.property(2), c = [comp.width / 2, comp.height / 2];
            try { tr.property(10).setValue(0); tr.property(11).setValue(180); } catch (eS) { } // own shutter angle -> motion blur
            var sx = null, sy = null, us = null;
            if (pr.squeeze || pr.bounce) { try { tr.property(3).setValue(0); sy = tr.property(4); sx = tr.property(5); } catch (eU) { } }
            var optics = pr.optics ? fx.addProperty("ADBE Optics Compensation").property(1) : null;
            var inv = pr.invert ? fx.addProperty("ADBE Invert").property(2) : null;
            var mos = pr.mosaic ? fx.addProperty("ADBE Mosaic") : null;
            var bc = pr.flicker ? fx.addProperty("ADBE Brightness & Contrast 2").property(1) : null;
            for (i = 0; i < n; i += 1) {
                var t = t0 + i * step, ex = (pr.x[i] || 0) / 100, ey = (pr.y[i] || 0) / 100, sgn = (i % 2 === 0) ? 1 : -1;
                var dx, dy;
                if (pr.wave) { dx = Math.sin(i * Math.PI / 2) * ex * amp; dy = Math.cos(i * Math.PI / 2) * ey * amp * 0.6; }
                else { dx = sgn * ex * amp * (0.6 + 0.4 * rand()); dy = -sgn * ey * amp * (0.6 + 0.4 * rand()); }
                if (!pr.squeeze) { pos.setValueAtTime(t, [c[0] + dx, c[1] + dy]); }
                if (pr.squeeze === "y" && sy) { sy.setValueAtTime(t, 100 + sgn * ey * 30 * strength); }
                if (pr.squeeze === "x" && sx) { sx.setValueAtTime(t, 100 + sgn * ex * 30 * strength); }
                if (pr.bounce && sx) { var b = 100 + sgn * Math.max(ex, ey) * 12 * strength; sx.setValueAtTime(t, b); sy.setValueAtTime(t, b); }
                if (optics) { optics.setValueAtTime(t, Math.min(100, Math.max(ex, ey) * 70 * strength)); }
                if (inv) { inv.setValueAtTime(t, (Math.max(ex, ey) > 0 && i % 2 === 0) ? 0 : 100); }
                if (mos) { var blocks = (Math.max(ex, ey) > 0 && i % 2 === 0) ? 40 : 4000; mos.property(1).setValueAtTime(t, blocks); mos.property(2).setValueAtTime(t, Math.round(blocks * comp.height / comp.width)); }
                if (bc) { bc.setValueAtTime(t, (i % 2 === 0) ? pr.flicker * 100 * Math.max(ex, ey) * strength : 0); }
            }
            if (inv) { holdAll(inv); }
            if (mos) { holdAll(mos.property(1)); holdAll(mos.property(2)); }
            if (bc) { holdAll(bc); }
            if (flashOn) {
                var fl = fx.addProperty("ADBE Brightness & Contrast 2"); fl.name = "Flash";
                fl.property(1).setValueAtTime(t0, Math.min(150, flashStrength));
                fl.property(1).setValueAtTime(t0 + flashFrames * fd, 0);
            }
        } catch (e) { app.endUndoGroup(); return "ERROR:" + e.toString(); }
        app.endUndoGroup();
        return "true";
    }

    function bind(globalName, key) { G[globalName] = function (a, b, c, d, e, f, g2, h, i) { return shake(key, [a, b, c, d, e, f, g2, h, i]); }; }
    bind("Shake_001_JF", "BasicShake");
    bind("BasicShake_001_JF", "BasicShake");
    bind("QuickShake_001_JF", "QuickShake");
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
    bind("AddCustomShake_JF", "BasicShake");
})();
