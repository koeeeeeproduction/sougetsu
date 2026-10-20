// Sowveil - Backgrounds engine. Full-comp, editable backgrounds placed at the bottom of the comp.
// Built only from stock effects (4-Color Gradient, Gradient Ramp, Gaussian Blur, Noise) and
// shape-layer repeaters, so they render on any After Effects install in any language.
(function () {
    var SV = $._sv, U = SV._u;

    function solid(c, color, name) {
        var L = c.layers.addSolid(color, U.uniqueName(c, name), c.width, c.height, c.pixelAspect, c.duration);
        U.tag(L); return L;
    }
    function shapeLayer(c, name) { var L = c.layers.addShape(); L.name = U.uniqueName(c, name); U.tag(L); return L; }
    function group(L, name) {
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name = name;
        return g.property("ADBE Vectors Group");
    }
    function fill(contents, color, opacity) {
        var f = contents.addProperty("ADBE Vector Graphic - Fill");
        f.property("ADBE Vector Fill Color").setValue(color);
        if (opacity !== undefined) { f.property("ADBE Vector Fill Opacity").setValue(opacity); }
        return f;
    }
    function repeater(contents, copies, dx, dy) {
        var r = contents.addProperty("ADBE Vector Filter - Repeater");
        r.property("ADBE Vector Repeater Copies").setValue(copies);
        r.property("ADBE Vector Repeater Offset").setValue(-(copies - 1) / 2);
        r.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Position").setValue([dx, dy]);
        return r;
    }
    function drift(speed, radius, phase) {
        return U.MARK + "\nvar s = " + speed + ", r = " + radius + " * thisComp.height;\n" +
            "[value[0] + Math.sin(time * s + " + phase + ") * r, value[1] + Math.cos(time * s * 0.8 + " + phase + ") * r]";
    }
    function settle(c, layers, a) {
        // put the background under everything else, newest first so their own order is kept
        var i;
        for (i = 0; i < layers.length; i += 1) { layers[i].moveToEnd(); }
        if (U.bool(a.lock, false)) { for (i = 0; i < layers.length; i += 1) { layers[i].locked = true; } }
    }

    var MAKE = {
        mesh: function (c, a) {
            var L = solid(c, [0, 0, 0], "Sowveil BG · Mesh Gradient"), g = U.fx(L).addProperty("ADBE 4ColorGradient");
            g.name = "Sowveil · Mesh";
            var w = c.width, h = c.height, pts = [[w * 0.1, h * 0.1], [w * 0.9, h * 0.15], [w * 0.15, h * 0.9], [w * 0.9, h * 0.85]];
            var cols = [U.hex(a.c1), U.hex(a.c2), U.hex(a.c3), U.hex(a.c4)], i;
            for (i = 0; i < 4; i += 1) {
                g.property(1 + i * 2).setValue(pts[i]);
                g.property(2 + i * 2).setValue(cols[i]);
                if (U.bool(a.animate, true)) { g.property(1 + i * 2).expression = drift(U.num(a.speed, 0.4), 0.18, i * 1.7); }
            }
            try { g.property(9).setValue(U.num(a.blend, 100)); } catch (e) { }
            return [L];
        },
        linear: function (c, a) {
            var L = solid(c, [0, 0, 0], "Sowveil BG · Linear Gradient"), r = U.fx(L).addProperty("ADBE Ramp");
            r.name = "Sowveil · Gradient";
            var ang = U.num(a.angle, 135) * Math.PI / 180, cx = c.width / 2, cy = c.height / 2, len = Math.sqrt(c.width * c.width + c.height * c.height) / 2;
            r.property(1).setValue([cx - Math.cos(ang) * len, cy - Math.sin(ang) * len]);
            r.property(2).setValue(U.hex(a.c1));
            r.property(3).setValue([cx + Math.cos(ang) * len, cy + Math.sin(ang) * len]);
            r.property(4).setValue(U.hex(a.c2));
            r.property(5).setValue(1);
            try { r.property(6).setValue(U.num(a.scatter, 8)); } catch (e) { }
            return [L];
        },
        radial: function (c, a) {
            var L = solid(c, [0, 0, 0], "Sowveil BG · Radial Glow"), r = U.fx(L).addProperty("ADBE Ramp");
            r.name = "Sowveil · Glow";
            var cx = c.width * U.num(a.x, 50) / 100, cy = c.height * U.num(a.y, 45) / 100;
            r.property(1).setValue([cx, cy]);
            r.property(2).setValue(U.hex(a.c1));
            r.property(3).setValue([cx + c.width * U.num(a.size, 60) / 100, cy]);
            r.property(4).setValue(U.hex(a.c2));
            r.property(5).setValue(2);
            try { r.property(6).setValue(8); } catch (e) { }
            if (U.bool(a.animate, false)) { r.property(1).expression = drift(U.num(a.speed, 0.3), 0.06, 0); }
            return [L];
        },
        aurora: function (c, a) {
            var base = solid(c, U.hex(a.base, [0.03, 0.03, 0.08]), "Sowveil BG · Aurora Base");
            var L = shapeLayer(c, "Sowveil BG · Aurora"), cols = [U.hex(a.c1), U.hex(a.c2), U.hex(a.c3)], i, k = c.height / 1080;
            var spots = [[-0.25, -0.15], [0.25, -0.05], [0, 0.22]];
            for (i = 0; i < 3; i += 1) {
                var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); grp.name = "Blob " + (i + 1);
                var ct = grp.property("ADBE Vectors Group");
                ct.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([c.width * 0.75, c.height * 0.6]);
                fill(ct, cols[i], U.num(a.intensity, 85));
                var tp = grp.property("ADBE Vector Transform Group").property("ADBE Vector Position");
                tp.setValue([spots[i][0] * c.width, spots[i][1] * c.height]);
                if (U.bool(a.animate, true)) { tp.expression = drift(U.num(a.speed, 0.35), 0.16, i * 2.1); }
            }
            var b = U.fx(L).addProperty("ADBE Gaussian Blur 2"); b.name = "Sowveil · Softness";
            b.property(1).setValue(U.num(a.softness, 260) * k);
            try { b.property(3).setValue(1); } catch (e) { }   // repeat edge pixels
            return [L, base];
        },
        grid: function (c, a) {
            var base = solid(c, U.hex(a.base, [0.05, 0.05, 0.07]), "Sowveil BG · Grid Base");
            var L = shapeLayer(c, "Sowveil BG · Grid"), sp = Math.max(8, U.num(a.spacing, 80) * c.height / 1080), lw = Math.max(1, U.num(a.line, 2));
            var col = U.hex(a.c1), op = U.num(a.opacity, 18), nx = Math.ceil(c.width / sp) + 3, ny = Math.ceil(c.height / sp) + 3;
            var v = group(L, "Columns");
            v.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue([lw, c.height + sp * 4]);
            fill(v, col, op); repeater(v, nx, sp, 0);
            var hz = group(L, "Rows");
            hz.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue([c.width + sp * 4, lw]);
            fill(hz, col, op); repeater(hz, ny, 0, sp);
            if (U.bool(a.animate, false)) {
                L.transform.position.expression = U.MARK + "\nvar sp = " + sp + ", v = " + U.num(a.speed, 30) + ";\nvalue + [(time * v) % sp, (time * v) % sp]";
            }
            return [L, base];
        },
        dots: function (c, a) {
            var base = solid(c, U.hex(a.base, [0.05, 0.05, 0.07]), "Sowveil BG · Dots Base");
            var L = shapeLayer(c, "Sowveil BG · Dots"), sp = Math.max(8, U.num(a.spacing, 48) * c.height / 1080), d = Math.max(1, U.num(a.dot, 5) * c.height / 1080);
            var g = group(L, "Dots");
            g.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([d, d]);
            fill(g, U.hex(a.c1), U.num(a.opacity, 35));
            repeater(g, Math.ceil(c.width / sp) + 3, sp, 0);
            repeater(g, Math.ceil(c.height / sp) + 3, 0, sp);
            if (U.bool(a.animate, false)) {
                L.transform.position.expression = U.MARK + "\nvar sp = " + sp + ", v = " + U.num(a.speed, 20) + ";\nvalue + [0, (time * v) % sp]";
            }
            return [L, base];
        },
        spotlight: function (c, a) {
            var L = solid(c, [0, 0, 0], "Sowveil BG · Spotlight"), r = U.fx(L).addProperty("ADBE Ramp");
            r.name = "Sowveil · Spotlight";
            r.property(1).setValue([c.width / 2, c.height * U.num(a.y, 0) / 100]);
            r.property(2).setValue(U.hex(a.c1));
            r.property(3).setValue([c.width / 2, c.height * U.num(a.reach, 110) / 100]);
            r.property(4).setValue(U.hex(a.c2));
            r.property(5).setValue(2);
            return [L];
        },
        grain: function (c, a) {
            var L = solid(c, [0.5, 0.5, 0.5], "Sowveil BG · Film Grain"), n = U.fx(L).addProperty("ADBE Noise");
            n.name = "Sowveil · Grain";
            n.property(1).setValue(U.num(a.amount, 35));
            try { n.property(2).setValue(0); } catch (e) { }   // monochrome noise
            L.blendingMode = BlendingMode.OVERLAY;
            L.transform.opacity.setValue(U.num(a.opacity, 60));
            return [L];
        }
    };

    SV.background = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var kind = U.str(a.kind, "mesh"), make = MAKE[kind];
        if (!make) { return U.fail("Unknown background."); }
        return U.run("Sowveil Background · " + kind, function () {
            var layers = make(c, a);
            if (kind === "grain") { layers[0].moveToBeginning(); } else { settle(c, layers, a); }
            return U.ok({ message: U.str(a.label, "Background") + " added." });
        });
    };
})();
