// Sowveil - Animated gradient backgrounds (the palette backgrounds from Akira FX).
// A 4-Color Gradient whose four points travel on smooth orbits across the layer's duration.
// New layer: full-comp solid at the bottom of the comp. Or applied onto one selected layer.
(function () {
    var SV = $._sv, U = SV._u;
    var ORBITS = [
        { cx: 0.22, cy: 0.24, rx: 0.20, ry: 0.14, phase: 0.00, dir: 1 },
        { cx: 0.78, cy: 0.26, rx: 0.17, ry: 0.19, phase: 0.35, dir: -1 },
        { cx: 0.24, cy: 0.76, rx: 0.19, ry: 0.16, phase: 0.62, dir: -1 },
        { cx: 0.76, cy: 0.74, rx: 0.16, ry: 0.20, phase: 0.85, dir: 1 }
    ];
    var STEPS = 8;

    SV.animatedGradient = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var cols = a.colors || [], label = U.str(a.label, "Gradient"), sel = U.selected(c), onLayer = U.str(a.target, "new") === "layer";
        if (cols.length < 1) { return U.fail("Pick a palette."); }
        if (onLayer && sel.length !== 1) { return U.fail("Select exactly one layer, or switch to New layer."); }
        var loops = Math.max(0.25, U.num(a.loops, 1)), blend = U.num(a.blend, 120);
        return U.run("Sowveil Gradient · " + label, function () {
            var L, t0 = 0, dur = c.duration, i, s;
            if (onLayer) {
                L = sel[0]; t0 = Math.max(0, L.inPoint);
                if (L.outPoint - L.inPoint > 0.01) { dur = L.outPoint - L.inPoint; }
            } else {
                L = c.layers.addSolid([0, 0, 0], U.uniqueName(c, "Sowveil Gradient · " + label), c.width, c.height, c.pixelAspect, c.duration);
                U.tag(L); L.moveToEnd(); try { L.label = 8; } catch (eL) { }
            }
            var g = U.fx(L).addProperty("ADBE 4ColorGradient");
            g.name = "Sowveil · " + label;
            var W = c.width, H = c.height;
            if (onLayer) { try { var r = L.sourceRectAtTime(c.time, false); W = r.width; H = r.height; } catch (eR) { } }
            for (i = 0; i < 4; i += 1) {
                g.property(i * 2 + 2).setValue(U.hex(cols[i % cols.length]));
                var pp = g.property(i * 2 + 1), o = ORBITS[i];
                for (s = 0; s <= STEPS; s += 1) {
                    var ph = s / STEPS, ang = (ph * loops * o.dir + o.phase) * Math.PI * 2;
                    pp.setValueAtTime(t0 + dur * ph, [(o.cx + Math.cos(ang) * o.rx) * W, (o.cy + Math.sin(ang) * o.ry) * H]);
                }
                try { for (s = 1; s <= pp.numKeys; s += 1) { pp.setInterpolationTypeAtKey(s, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } } catch (eK) { }
            }
            try { g.property(9).setValue(blend); } catch (eB) { }
            try { g.property(10).setValue(0); } catch (eJ) { }
            return U.ok({ message: label + " gradient on \"" + L.name + "\" (" + Math.round(dur * 100) / 100 + "s)." });
        });
    };
})();
