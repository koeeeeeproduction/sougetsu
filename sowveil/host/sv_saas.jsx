// Sowveil - SaaS Effects: Gradient Wipe (depth-map Colorama), Depth Reveal, Halftone Wave, Match Cut Zoom,
// UI Morph, Mockup Transition, 3D Glass Shape and Glass Refraction Scene.
// Every effect property is found by matchName or display name - never by index: effects with topic headers
// (4-Color Gradient, Colorama...) count the headers as properties, so indexes shift between effects.
// Gradient Wipe and Displacement Map read the *source* of their map layer (effects and transforms ignored),
// so generated depth maps are always precomposed.
// ES3 only.
if (typeof $._sv === "undefined") { $._sv = {}; }

(function () {
    var SV = $._sv, U = SV._u;
    if (!U) { return; }

    // ---------- helpers ----------
    function fx(L) { return L.property("ADBE Effect Parade"); }
    function addFx(L, mn, name) { var e = fx(L).addProperty(mn); if (name) { try { e.name = name; } catch (x) { } } return e; }
    // first property of an effect/group that matches one of the names (matchName or display name, case-insensitive)
    function prop(group, names) {
        var i, j, p;
        if (!group) { return null; }
        for (i = 0; i < names.length; i += 1) { try { p = group.property(names[i]); if (p) { return p; } } catch (e) { } }
        try {
            for (j = 1; j <= group.numProperties; j += 1) {
                p = group.property(j);
                for (i = 0; i < names.length; i += 1) { if (String(p.name).toLowerCase() === String(names[i]).toLowerCase()) { return p; } }
            }
        } catch (e2) { }
        return null;
    }
    function set(group, names, v) { var p = prop(group, names); if (p) { try { p.setValue(v); return true; } catch (e) { } } return false; }
    // property whose display name matches a regex (for third-party-ish effects such as CC Ball Action)
    function setLike(group, re, v) {
        var j, p;
        try { for (j = 1; j <= group.numProperties; j += 1) { p = group.property(j); if (re.test(String(p.name))) { p.setValue(v); return true; } } } catch (e) { }
        return false;
    }
    function clearKeys(p) { try { while (p.numKeys > 0) { p.removeKey(1); } } catch (e) { } }
    function easeKey(p, k, inSpeed, inInf, outSpeed, outInf) {
        try {
            var v = p.keyValue(k), dims = (v instanceof Array) ? v.length : 1, a = [], b = [], i;
            if (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL) { dims = 1; }
            for (i = 0; i < dims; i += 1) { a.push(new KeyframeEase(inSpeed, Math.max(0.1, Math.min(100, inInf)))); b.push(new KeyframeEase(outSpeed, Math.max(0.1, Math.min(100, outInf)))); }
            p.setTemporalEaseAtKey(k, a, b);
        } catch (e) { }
    }
    // two keys whose speed peaks in the middle (the "speed graph" every transcript asks for)
    function peakKeys(p, t0, v0, t1, v1, influence) {
        clearKeys(p);
        p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1);
        var inf = influence === undefined ? 80 : influence;
        easeKey(p, 1, 0, inf, 0, inf); easeKey(p, 2, 0, inf, 0, inf);
    }
    function center(L, t) {
        try {
            var r = L.sourceRectAtTime(t, false), a = L.transform.anchorPoint.value, s = L.transform.scale.value, p = L.transform.position.value;
            return [p[0] + (r.left + r.width / 2 - a[0]) * s[0] / 100, p[1] + (r.top + r.height / 2 - a[1]) * s[1] / 100];
        } catch (e) { return [L.containingComp.width / 2, L.containingComp.height / 2]; }
    }
    function deselectAll(comp) { var i; for (i = 1; i <= comp.numLayers; i += 1) { try { comp.layer(i).selected = false; } catch (e) { } } }
    function precompose(comp, L, name) {
        var idx = L.index, inner = comp.layers.precompose([idx], name, true);
        var P = comp.layer(idx);
        try { P.name = name; } catch (e) { }
        return { layer: P, comp: inner };
    }
    function mattes(layer, matte, type) {
        if (typeof layer.setTrackMatte === "function") { layer.setTrackMatte(matte, type); try { matte.enabled = false; } catch (e) { } return; }
        matte.moveBefore(layer); layer.trackMatteType = type;
    }
    // layer-picker params are bound once the stacking is final (indexes shift while layers are added and moved)
    var refs = [];
    function bindLater(group, names, layer) { refs.push([prop(group, names), layer]); }
    function bindAll() { var i; for (i = 0; i < refs.length; i += 1) { try { if (refs[i][0]) { refs[i][0].setValue(refs[i][1].index); } } catch (e) { } } refs = []; }
    function solid(comp, c, name) { return comp.layers.addSolid(c, name, comp.width, comp.height, comp.pixelAspect, comp.duration); }
    function isStill(L) { try { return !L.source || L.source.duration === 0 || (L.source.mainSource && L.source.mainSource.isStill); } catch (e) { return true; } }
    function tagged(L, name) { L.name = U.uniqueName(L.containingComp, name); U.tag(L); return L; }

    // A frozen copy of L showing its frame at comp time t (time remap holds the frame; stills are just copied).
    function freezeCopy(L, t, a, b, name) {
        var F = L.duplicate();
        if (!isStill(L)) {
            try {
                F.timeRemapEnabled = true;
                var tr = F.property("ADBE Time Remapping"), src = Math.max(0, (t - L.startTime) * (100 / (L.stretch || 100)));
                clearKeys(tr); tr.setValue(src);
            } catch (e) { }
        }
        F.startTime = a; F.inPoint = a; F.outPoint = b;
        return tagged(F, name);
    }

    // Depth map layer (disabled) from a file, an automatic luminance map, or a direction ramp - always usable by Gradient Wipe.
    function depthLayer(comp, o, ref, a, b, label) {
        var mode = U.str(o.depth, "auto"), D;
        if (mode === "file" && o.depthFile && new File(o.depthFile).exists) {
            D = comp.layers.add(app.project.importFile(new ImportOptions(new File(o.depthFile))));
            D.startTime = a; D.inPoint = a; D.outPoint = b;
        } else if (mode === "ramp") {
            var S = solid(comp, [0, 0, 0], "Depth Ramp"), r = addFx(S, "ADBE Ramp"), W = comp.width, H = comp.height, d = U.str(o.rampDir, "bottom");
            var pts = d === "top" ? [[W / 2, 0], [W / 2, H]] : d === "left" ? [[0, H / 2], [W, H / 2]] : d === "right" ? [[W, H / 2], [0, H / 2]] : d === "center" ? [[W / 2, H / 2], [W, H]] : [[W / 2, H], [W / 2, 0]];
            set(r, ["ADBE Ramp-0001", "Start of Ramp"], pts[0]); set(r, ["ADBE Ramp-0002", "Start Color"], [1, 1, 1]);
            set(r, ["ADBE Ramp-0003", "End of Ramp"], pts[1]); set(r, ["ADBE Ramp-0004", "End Color"], [0, 0, 0]);
            if (d === "center") { set(r, ["ADBE Ramp-0005", "Ramp Shape"], 2); }
            S.startTime = a; S.inPoint = a; S.outPoint = b;
            D = precompose(comp, S, label).layer;
        } else {
            // automatic: the frozen frame in greyscale, softened - bright areas read as near (works best on photos with a lit subject)
            var G = freezeCopy(ref, o._freezeAt, a, b, "Depth Auto");
            var tint = addFx(G, "ADBE Tint"); set(tint, ["ADBE Tint-0003", "Amount to Tint"], 100);
            set(addFx(G, "ADBE Gaussian Blur 2"), ["ADBE Gaussian Blur 2-0001", "Blurriness"], U.num(o.depthBlur, 40));
            if (U.bool(o.depthInvert, false)) { addFx(G, "ADBE Invert"); }
            D = precompose(comp, G, label).layer;
        }
        D.name = U.uniqueName(comp, label); U.tag(D);
        try { D.enabled = false; } catch (e) { }
        return D;
    }

    // ---------- 1. Gradient Wipe (depth map + Colorama colour sweep, as in the Gradient Wipe preset) ----------
    // o: dir in|out, duration, depth auto|file|ramp, depthFile, rampDir, cycles, softness, invert, influence, makeRoom, ffx (patched preset path)
    SV.gradientWipe = function (o) {
        refs = [];
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        var sel = U.selected(comp); if (sel.length !== 1) { return U.fail("Select the one video or image layer to transition into (or out of)."); }
        refs = [];
        return U.run("Sowveil Gradient Wipe", function () {
            var L = sel[0], dur = Math.max(0.1, U.num(o.duration, 1)), out = U.str(o.dir, "in") === "out", fd = comp.frameDuration;
            if (!out && L.inPoint - dur < 0) {
                if (!U.bool(o.makeRoom, true)) { throw new Error("There is no room before the layer starts. Move it later or turn on Make room."); }
                L.startTime += dur - L.inPoint;
            }
            var cut = out ? L.outPoint : L.inPoint, a = out ? cut : cut - dur, b = out ? cut + dur : cut;
            o._freezeAt = out ? cut - fd : cut;
            var frame = freezeCopy(L, o._freezeAt, a, b, "GW Frame");
            var depth = depthLayer(comp, o, L, a, b, "GW Depth");
            var top = freezeCopy(L, o._freezeAt, a, b, "Sowveil · Gradient Wipe");
            // the preset carries the custom Colorama palette (Output Cycle cannot be set from a script)
            var applied = false;
            if (o.ffx && new File(o.ffx).exists) {
                try { deselectAll(comp); top.selected = true; top.applyPreset(new File(o.ffx)); applied = true; } catch (eP) { applied = false; }
            }
            var col = prop(fx(top), ["APC Colorama"]), gw = prop(fx(top), ["ADBE Gradient Wipe"]);
            if (!col) { col = addFx(top, "APC Colorama"); set(col, ["APC Colorama-0010", "Use Preset Palette"], 3); }
            if (!gw) { gw = addFx(top, "ADBE Gradient Wipe"); }
            try { col.name = "Sowveil · Colorama"; gw.name = "Sowveil · Gradient Wipe"; } catch (eN) { }
            var ph = prop(col, ["APC Colorama-0008", "Phase Shift"]), inf = U.num(o.influence, 75), turns = U.num(o.cycles, 2) * 360;
            peakKeys(ph, a, out ? turns : 0, b, out ? 0 : turns, inf);
            var tc = prop(gw, ["ADBE Gradient Wipe-0001", "Transition Completion"]);
            peakKeys(tc, a, out ? 100 : 0, b, out ? 0 : 100, inf);
            set(gw, ["ADBE Gradient Wipe-0002", "Transition Softness"], U.num(o.softness, 50));
            bindLater(gw, ["ADBE Gradient Wipe-0003", "Gradient Layer"], depth);
            set(gw, ["ADBE Gradient Wipe-0004", "Gradient Placement"], 3);   // stretch to fit
            set(gw, ["ADBE Gradient Wipe-0005", "Invert Gradient"], U.bool(o.invert, false) ? 1 : 0);
            // stacking: wipe on top, plain frame under it, depth map (hidden) under that, then the clip
            frame.moveBefore(L); depth.moveBefore(L); top.moveBefore(frame);
            deselectAll(comp); top.selected = true;
            bindAll();
            return U.ok({ message: "Gradient wipe " + (out ? "out of" : "into") + " \"" + L.name + "\" (" + dur + "s" + (applied ? ", custom palette" : "") + ")." });
        });
    };

    // ---------- 2. Depth Reveal: the clip appears through a colour / blur / fog cover, nearest parts first ----------
    // o: look gradient|blur|fog|solid, colors[4], duration, depth, depthFile, rampDir, softness, farFirst, push, parX, parY, influence
    SV.depthReveal = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        var sel = U.selected(comp); if (sel.length !== 1) { return U.fail("Select the one photo or video layer to reveal."); }
        refs = [];
        return U.run("Sowveil Depth Reveal", function () {
            var L = sel[0], t0 = Math.max(L.inPoint, comp.time), dur = Math.max(0.1, U.num(o.duration, 1.5)), end = L.outPoint;
            o._freezeAt = t0;
            var depth = depthLayer(comp, o, L, t0, end, "Reveal Depth");
            var look = U.str(o.look, "gradient"), cols = o.colors || ["#2b0f3a", "#ff6b6b", "#ffb347", "#6a2c70"], C;
            if (look === "blur") {
                C = solid(comp, [1, 1, 1], "Reveal Blur"); C.adjustmentLayer = true;
                set(addFx(C, "ADBE Gaussian Blur 2"), ["ADBE Gaussian Blur 2-0001", "Blurriness"], U.num(o.blur, 80));
            } else if (look === "fog") {
                C = solid(comp, U.hex(cols[0], [1, 1, 1]), "Reveal Fog");
            } else if (look === "solid") {
                C = solid(comp, U.hex(cols[0], [0, 0, 0]), "Reveal Solid");
            } else {
                C = solid(comp, [0, 0, 0], "Reveal Gradient");
                var g = addFx(C, "ADBE 4ColorGradient"), k;
                for (k = 0; k < 4; k += 1) { set(g, ["Color " + (k + 1), "ADBE 4ColorGradient-000" + (2 * k + 2)], U.hex(cols[k % cols.length], [1, 1, 1])); }
            }
            tagged(C, "Sowveil · Depth Reveal"); C.inPoint = t0; C.outPoint = t0 + dur + comp.frameDuration;
            var gw = addFx(C, "ADBE Gradient Wipe", "Sowveil · Reveal");
            peakKeys(prop(gw, ["ADBE Gradient Wipe-0001", "Transition Completion"]), t0, 0, t0 + dur, 100, U.num(o.influence, 70));
            set(gw, ["ADBE Gradient Wipe-0002", "Transition Softness"], U.num(o.softness, 30));
            bindLater(gw, ["ADBE Gradient Wipe-0003", "Gradient Layer"], depth);
            set(gw, ["ADBE Gradient Wipe-0004", "Gradient Placement"], 3);
            set(gw, ["ADBE Gradient Wipe-0005", "Invert Gradient"], U.bool(o.farFirst, false) ? 1 : 0);
            depth.moveBefore(L); C.moveBefore(depth);
            var push = U.num(o.push, 8);
            if (push) {
                var sc = L.transform.scale, sv = sc.value, big = [];
                for (k = 0; k < sv.length; k += 1) { big.push(sv[k] * (1 + push / 100)); }
                if (sc.numKeys === 0) { peakKeys(sc, t0, big, t0 + dur + 0.6, sv, 60); }
            }
            var px = U.num(o.parX, 0), py = U.num(o.parY, 0);
            if (px || py) {
                var dm = addFx(L, "ADBE Displacement Map", "Sowveil · Parallax");
                bindLater(dm, ["ADBE Displacement Map-0001", "Displacement Map Layer"], depth);
                set(dm, ["ADBE Displacement Map-0006", "Displacement Map Behavior"], 3);
                peakKeys(prop(dm, ["ADBE Displacement Map-0003", "Max Horizontal Displacement"]), t0, px, t0 + dur + 0.6, 0, 60);
                peakKeys(prop(dm, ["ADBE Displacement Map-0005", "Max Vertical Displacement"]), t0, py, t0 + dur + 0.6, 0, 60);
            }
            bindAll();
            return U.ok({ message: "Depth reveal on \"" + L.name + "\"." });
        });
    };

    // ---------- 3. Halftone Wave: dots that light up as a ring travels out from a layer ----------
    // o: color, spacing, dot, waves, duration, interval, ring, softness, glow, mode full|inside|behind
    SV.halftoneWave = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        refs = [];
        return U.run("Sowveil Halftone Wave", function () {
            var sel = U.selected(comp), src = sel.length ? sel[0] : null, t0 = comp.time, i;
            var waves = Math.max(1, Math.min(4, Math.round(U.num(o.waves, 1)))), dur = Math.max(0.2, U.num(o.duration, 1.2)), gap = U.num(o.interval, 0.35);
            var total = (waves - 1) * gap + dur, sc = comp.height / 1080;
            var c = src ? center(src, t0) : [comp.width / 2, comp.height / 2];
            // the travelling rings live in their own comp: CC Ball Action turns their pixels into the dot grid
            var inner = app.project.items.addComp("Halftone Wave Rings", comp.width, comp.height, comp.pixelAspect, Math.max(total + comp.frameDuration, 0.5), comp.frameRate);
            var ring = inner.layers.addShape(); ring.name = "Rings";
            var reach = Math.sqrt(comp.width * comp.width + comp.height * comp.height) * 1.1;
            for (i = 0; i < waves; i += 1) {
                var grp = ring.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); grp.name = "Wave " + (i + 1);
                var cg = grp.property("ADBE Vectors Group");
                var size = cg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size");
                var st = cg.addProperty("ADBE Vector Graphic - Stroke");
                st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]);
                st.property("ADBE Vector Stroke Width").setValue(U.num(o.ring, 160) * sc);
                var a = i * gap;
                peakKeys(size, a, [0, 0], a + dur, [reach * 2, reach * 2], 30);
                var op = st.property("ADBE Vector Stroke Opacity"); op.setValueAtTime(a, 100); op.setValueAtTime(a + dur * 0.55, 100); op.setValueAtTime(a + dur, 0);
            }
            ring.transform.position.setValue(c);
            var soft = U.num(o.softness, 50);
            if (soft > 0) { set(addFx(ring, "ADBE Gaussian Blur 2"), ["ADBE Gaussian Blur 2-0001", "Blurriness"], soft * sc); }
            var W = comp.layers.add(inner); tagged(W, "Sowveil · Halftone Wave");
            W.startTime = t0; W.inPoint = t0; W.outPoint = t0 + total + comp.frameDuration;
            var ba = addFx(W, "CC Ball Action");
            setLike(ba, /scatter/i, 0);
            setLike(ba, /grid\s*spacing/i, Math.max(3, Math.round(U.num(o.spacing, 22) * sc)));
            setLike(ba, /^(ball\s*)?size$/i, U.num(o.dot, 45));
            var fill = addFx(W, "ADBE Fill"); set(fill, ["ADBE Fill-0002", "Color"], U.hex(o.color, [0.4, 0.36, 1]));
            if (U.bool(o.glow, true)) { var gl = addFx(W, "ADBE Glo2"); set(gl, ["ADBE Glo2-0003", "Glow Radius"], 30 * sc); set(gl, ["ADBE Glo2-0004", "Glow Intensity"], 0.8); }
            var mode = U.str(o.mode, src ? "behind" : "full");
            if (src && mode === "inside") {
                var m = src.duplicate(); m.name = U.uniqueName(comp, "Halftone Matte"); U.tag(m);
                W.moveBefore(src); m.moveBefore(W); mattes(W, m, TrackMatteType.ALPHA);
            } else if (src && mode === "behind") {
                W.moveAfter(src);
            }
            bindAll();
            return U.ok({ message: "Halftone wave from " + (src ? "\"" + src.name + "\"" : "the comp centre") + "." });
        });
    };

    // ---------- 4. Match Cut Zoom: the fixed object rides a null that pushes in through the cut ----------
    // o: zoom (%), before (frames), after (frames), influence
    SV.matchCutZoom = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        var sel = U.selected(comp); if (!sel.length) { return U.fail("Select the object(s) that stay fixed through the cut, with the playhead on the cut."); }
        refs = [];
        return U.run("Sowveil Match Cut Zoom", function () {
            var t = comp.time, fd = comp.frameDuration, a = t - U.num(o.before, 6) * fd, b = t + U.num(o.after, 6) * fd, i, cx = 0, cy = 0;
            for (i = 0; i < sel.length; i += 1) { var c = center(sel[i], t); cx += c[0]; cy += c[1]; }
            var N = comp.layers.addNull(); tagged(N, "Sowveil · Match Cut Zoom");
            N.transform.position.setValue([cx / sel.length, cy / sel.length]);
            for (i = 0; i < sel.length; i += 1) { if (!sel[i].parent) { sel[i].parent = N; } }
            var z = U.num(o.zoom, 115);
            peakKeys(N.transform.scale, a, [100, 100, 100], b, [z, z, 100], U.num(o.influence, 85));
            bindAll();
            return U.ok({ message: "Zoom " + z + "% through the cut on " + sel.length + " layer" + (sel.length === 1 ? "" : "s") + "." });
        });
    };

    // ---------- 5. UI Morph: shape A stretches into the cut, shape B settles out of it ----------
    // o: grow (%), before (frames), after (frames), axis auto|x|y|both, influence
    function rectSize(L) { var f = null; try { U.walk(L.property("ADBE Root Vectors Group"), function (p) { if (!f && p.matchName === "ADBE Vector Rect Size") { f = p; } }); } catch (e) { } return f; }
    function dims(L, t) { var r = rectSize(L); if (r) { return r.valueAtTime(t, false); } try { var q = L.sourceRectAtTime(t, false); return [q.width, q.height]; } catch (e) { return [100, 100]; } }
    SV.uiMorph = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        var sel = U.selected(comp); if (sel.length < 1 || sel.length > 2) { return U.fail("Select the outgoing shape and (optionally) the incoming one."); }
        refs = [];
        return U.run("Sowveil UI Morph", function () {
            var A = sel[0], B = sel.length > 1 ? sel[1] : null, fd = comp.frameDuration;
            if (B && B.inPoint < A.inPoint) { var tmp = A; A = B; B = tmp; }
            var cut = B ? B.inPoint : comp.time, g = U.num(o.grow, 15) / 100, before = U.num(o.before, 6) * fd, after = U.num(o.after, 8) * fd;
            var da = dims(A, cut - fd), db = B ? dims(B, cut) : da, axis = U.str(o.axis, "auto");
            if (axis === "auto") { var rx = db[0] / Math.max(1, da[0]), ry = db[1] / Math.max(1, da[1]); axis = Math.abs(ry - 1) >= Math.abs(rx - 1) ? "y" : "x"; }
            var fx2 = axis === "x" || axis === "both" ? 1 + g : 1, fy2 = axis === "y" || axis === "both" ? 1 + g : 1;
            var r = rectSize(A), ka = cut - before, kb = cut - fd, inf = U.num(o.influence, 85);
            if (r) {
                var v = r.valueAtTime(ka, false), to = [v[0] * fx2, v[1] * fy2];
                clearKeys(r); r.setValueAtTime(ka, v); r.setValueAtTime(kb, to);
                var sp = [Math.abs(to[0] - v[0]), Math.abs(to[1] - v[1])], spd = Math.max(sp[0], sp[1]) / Math.max(fd, kb - ka) * 2;
                easeKey(r, 1, 0, inf, 0, inf); easeKey(r, 2, spd, 15, spd, 15);
            } else {
                var s = A.transform.scale, sv = s.valueAtTime(ka, false);
                clearKeys(s); s.setValueAtTime(ka, sv); s.setValueAtTime(kb, [sv[0] * fx2, sv[1] * fy2, sv[2] || 100]);
                easeKey(s, 1, 0, inf, 0, inf); easeKey(s, 2, g * 100 / Math.max(fd, kb - ka) * 2, 15, 0, 15);
            }
            if (B) {
                var bs = B.transform.scale, bv = bs.valueAtTime(cut, false), shrink = [bv[0] / fx2, bv[1] / fy2, bv[2] || 100];
                clearKeys(bs); bs.setValueAtTime(cut, shrink); bs.setValueAtTime(cut + after, bv);
                easeKey(bs, 1, 0, 15, g * 100 / Math.max(fd, after) * 2, 15); easeKey(bs, 2, 0, inf, 0, inf);
            }
            bindAll();
            return U.ok({ message: "UI morph at " + Math.round(cut / fd) + "f (" + axis.toUpperCase() + ")." });
        });
    };

    // ---------- 6. Mockup Transition: the moving UI continues inside a device ----------
    // o: device phone|laptop|browser, duration, scale (final %), frameColor, shadow, influence
    var DEVICES = {
        phone: { w: 860, h: 1760, r: 120, sw: 790, sh: 1690, sr: 96, sy: 0 },
        laptop: { w: 1840, h: 1180, r: 40, sw: 1720, sh: 1075, sr: 14, sy: -10 },
        browser: { w: 1800, h: 1110, r: 28, sw: 1800, sh: 1040, sr: 0, sy: 35 }
    };
    function roundRect(L, name, size, radius, pos, color) {
        var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); grp.name = name;
        var cg = grp.property("ADBE Vectors Group"), rc = cg.addProperty("ADBE Vector Shape - Rect");
        rc.property("ADBE Vector Rect Size").setValue(size); rc.property("ADBE Vector Rect Roundness").setValue(radius);
        try { rc.property("ADBE Vector Rect Position").setValue(pos || [0, 0]); } catch (e) { }
        if (color) { cg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(color); }
        return grp;
    }
    SV.mockup = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        var sel = U.selected(comp); if (!sel.length) { return U.fail("Select the UI layers whose motion should continue inside the device."); }
        refs = [];
        return U.run("Sowveil Mockup Transition", function () {
            var t = comp.time, dur = Math.max(0.1, U.num(o.duration, 0.8)), d = DEVICES[U.str(o.device, "phone")] || DEVICES.phone, i, idx = [];
            for (i = 0; i < sel.length; i += 1) { idx.push(sel[i].index); }
            var inner = comp.layers.precompose(idx, "Mockup Screen", true), S = null;
            for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).source === inner) { S = comp.layer(i); break; } }
            if (!S) { S = comp.layer(Math.min.apply(null, idx)); }
            tagged(S, "Mockup Screen");
            var cx = comp.width / 2, cy = comp.height / 2;
            var rig = comp.layers.addNull(); tagged(rig, "Sowveil · Mockup Rig"); rig.transform.position.setValue([cx, cy]);
            var body = comp.layers.addShape(); tagged(body, "Device Frame");
            roundRect(body, "Body", [d.w, d.h], d.r, [0, 0], U.hex(o.frameColor, [0.09, 0.09, 0.1]));
            if (U.str(o.device, "phone") === "phone") { roundRect(body, "Island", [220, 64], 32, [0, -d.sh / 2 + 70], [0, 0, 0]); }
            if (U.str(o.device, "phone") === "browser") { roundRect(body, "Dots", [90, 18], 9, [-d.w / 2 + 80, -d.h / 2 + 34], [0.95, 0.4, 0.35]); }
            var base = null;
            if (U.str(o.device, "phone") === "laptop") { base = comp.layers.addShape(); tagged(base, "Laptop Base"); roundRect(base, "Base", [d.w * 1.16, 60], 30, [0, d.h / 2 + 28], U.hex(o.frameColor, [0.09, 0.09, 0.1])); base.parent = rig; base.transform.position.setValue([0, 0]); }
            var screen = comp.layers.addShape(); tagged(screen, "Screen Matte");
            roundRect(screen, "Screen", [d.sw, d.sh], d.sr, [0, d.sy], [1, 1, 1]);
            // stacking: screen content (matted by the screen shape) above the device body
            body.moveAfter(S); screen.moveBefore(S); mattes(S, screen, TrackMatteType.ALPHA);
            body.parent = rig; screen.parent = rig; body.transform.position.setValue([0, 0]); screen.transform.position.setValue([0, 0]);
            // content fills the screen: cover-fit the comp into the screen rectangle
            var fit = Math.max(d.sw / comp.width, d.sh / comp.height) * 100;
            S.parent = rig; S.transform.position.setValue([0, d.sy]); S.transform.scale.setValue([fit, fit, 100]);
            // at the cut the screen fills the frame (so nothing changes), then the device pulls back
            var full = Math.max(comp.width / d.sw, comp.height / d.sh) * 100, fin = U.num(o.scale, 55);
            peakKeys(rig.transform.scale, t, [full, full, 100], t + dur, [fin, fin, 100], U.num(o.influence, 80));
            if (U.bool(o.shadow, true)) { var ds = addFx(body, "ADBE Drop Shadow", "Sowveil · Shadow"); set(ds, ["ADBE Drop Shadow-0002", "Opacity"], 120); set(ds, ["ADBE Drop Shadow-0005", "Softness"], 120); set(ds, ["ADBE Drop Shadow-0004", "Distance"], 40); }
            bindAll();
            return U.ok({ message: "Mockup transition into a " + U.str(o.device, "phone") + "." });
        });
    };

    // ---------- 7. 3D Glass Shape: extruded shape, Advanced 3D, environment light, glow + light sweeps ----------
    // o: shape ring|circle|square|star|pill, colorA, colorB, size, depth, bevel, spin, tint, glow, sweep
    function addShapePath(cg, shape, s) {
        if (shape === "square" || shape === "pill") {
            var r = cg.addProperty("ADBE Vector Shape - Rect"); r.property("ADBE Vector Rect Size").setValue(shape === "pill" ? [s * 1.6, s * 0.7] : [s, s]);
            r.property("ADBE Vector Rect Roundness").setValue(shape === "pill" ? s * 0.35 : s * 0.22); return;
        }
        if (shape === "star") {
            var st = cg.addProperty("ADBE Vector Shape - Star");
            set(st, ["ADBE Vector Star Type", "Type"], 1); set(st, ["ADBE Vector Star Points", "Points"], 5);
            set(st, ["ADBE Vector Star Outer Radius", "Outer Radius"], s / 2); set(st, ["ADBE Vector Star Inner Radius", "Inner Radius"], s / 4.2);
            set(st, ["ADBE Vector Star Outer Roundess", "Outer Roundness"], 20); set(st, ["ADBE Vector Star Inner Roundess", "Inner Roundness"], 20); return;
        }
        cg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([s, s]);
        if (shape === "ring") {
            cg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([s * 0.52, s * 0.52]);
            var mg = cg.addProperty("ADBE Vector Filter - Merge"); set(mg, ["ADBE Vector Merge Type", "Mode"], 5);   // exclude intersections
        }
    }
    function gradFill(cg, a, b, s) {
        var gf = cg.addProperty("ADBE Vector Graphic - G-Fill");
        set(gf, ["ADBE Vector Grad Start Pt", "Start Point"], [-s / 2, -s / 2]); set(gf, ["ADBE Vector Grad End Pt", "End Point"], [s / 2, s / 2]);
        try {
            var gc = prop(gf, ["ADBE Vector Grad Colors", "Colors"]);
            if (gc) { gc.setValue([0, a[0], a[1], a[2], 1, b[0], b[1], b[2], 0, 1, 1, 1]); }
        } catch (e) { cg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(a); }
    }
    function make3D(L, depth, bevel) {
        L.threeDLayer = true;
        var go = prop(L, ["ADBE Extrsn Options Grp", "Geometry Options"]);
        set(go, ["ADBE Extrsn Depth", "Extrusion Depth"], depth);
        set(go, ["ADBE Bevel Styles", "Bevel Style"], bevel > 0 ? 3 : 1);
        set(go, ["ADBE Bevel Depth", "Bevel Depth"], bevel);
        set(go, ["ADBE Hole Bevel Depth", "Hole Bevel Depth"], 100);
        var mo = prop(L, ["ADBE Material Options Group", "Material Options"]);
        set(mo, ["ADBE Specular Coefficient", "Specular Intensity"], 80);
        set(mo, ["ADBE Shininess Coefficient", "Specular Shininess"], 90);
        set(mo, ["ADBE Metal Coefficient", "Metal"], 100);
        set(mo, ["ADBE Reflection Coefficient", "Reflection Intensity"], 70);
        set(mo, ["ADBE Glossiness Coefficient", "Reflection Sharpness"], 100);
    }
    function envLight(comp, intensity) {
        var Lt = comp.layers.addLight("Environment Light", [comp.width / 2, comp.height / 2]);
        try { Lt.lightType = LightType.ENVIRONMENT; } catch (e) { try { Lt.lightType = LightType.AMBIENT; } catch (e2) { } }
        set(prop(Lt, ["ADBE Light Options Group", "Light Options"]), ["ADBE Light Intensity", "Intensity"], intensity);
        U.tag(Lt);
        return Lt;
    }
    function glassShapeComp(name, w, h, dur, fps, o) {
        var c = app.project.items.addComp(name, w, h, 1, dur, fps);
        try { c.renderer = "ADBE Advanced 3d"; } catch (e) { }
        var s = U.num(o.size, 520), L = c.layers.addShape(); L.name = "Glass Shape";
        var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); grp.name = "Shape";
        var cg = grp.property("ADBE Vectors Group");
        addShapePath(cg, U.str(o.shape, "ring"), s);
        gradFill(cg, U.hex(o.colorA, [0.75, 0.86, 1]), U.hex(o.colorB, [0.55, 0.36, 1]), s);
        L.transform.position.setValue([w / 2, h / 2, 0]);
        make3D(L, U.num(o.depth, 120), U.num(o.bevel, 18));
        L.transform.xRotation.setValue(U.num(o.tilt, 20));
        L.transform.yRotation.expression = U.MARK + "\ntime*" + U.num(o.spin, 35) + ";";
        envLight(c, U.num(o.light, 110));
        return c;
    }
    SV.glassShape = function (o) {
        var comp = U.comp(); if (!comp) { return U.fail("Open a composition first."); }
        refs = [];
        return U.run("Sowveil 3D Glass Shape", function () {
            var inner = glassShapeComp("Glass Shape 3D", comp.width, comp.height, comp.duration, comp.frameRate, o);
            var P = comp.layers.add(inner); tagged(P, "Sowveil · 3D Glass Shape");
            P.startTime = 0;
            if (U.bool(o.glow, true)) { var gl = addFx(P, "ADBE Glo2"); set(gl, ["ADBE Glo2-0002", "Glow Threshold"], 60); set(gl, ["ADBE Glo2-0003", "Glow Radius"], 60); set(gl, ["ADBE Glo2-0004", "Glow Intensity"], 0.6); }
            var sm = addFx(P, "ADBE Set Matte3"); bindLater(sm, ["ADBE Set Matte3-0001", "Take Matte From Layer"], P);
            var tn = addFx(P, "ADBE Tint"); set(tn, ["ADBE Tint-0002", "Map White To"], U.hex(o.tint, [0.85, 0.9, 1])); set(tn, ["ADBE Tint-0003", "Amount to Tint"], U.num(o.tintAmount, 25));
            var bc = addFx(P, "ADBE Brightness & Contrast 2"); set(bc, ["ADBE Brightness & Contrast 2-0002", "Contrast"], 15);
            var mc = addFx(P, "ADBE Matte Choker"); set(mc, ["ADBE Matte Choker-0003", "Choke 1"], 4);
            if (U.bool(o.sweep, true)) {
                var k, sw;
                for (k = 0; k < 2; k += 1) {
                    sw = addFx(P, "CC Light Sweep", "Sowveil · Light Sweep " + (k + 1));
                    set(sw, ["CC Light Sweep-0002", "Direction"], k ? -35 : 35);
                    set(sw, ["CC Light Sweep-0004", "Width"], k ? 30 : 60);
                    var c0 = prop(sw, ["CC Light Sweep-0001", "Center"]);
                    if (c0) { c0.expression = U.MARK + "\nvar p=(time*" + (0.35 + k * 0.2) + ")%1.4;[thisComp.width*(p-0.2),thisComp.height/2]"; }
                }
            }
            bindAll();
            return U.ok({ message: "3D glass shape added (Advanced 3D comp \"" + inner.name + "\")." });
        });
    };

    // ---------- 8. Glass Refraction Scene: RGB-split glass shape that refracts text behind it ----------
    // o: shape, colorA, colorB, text, bgTop, bgBottom, grid, spin, aberration, refraction
    SV.glassScene = function (o) {
        refs = [];
        return U.run("Sowveil Glass Refraction Scene", function () {
            var w = 1920, h = 1080, dur = U.num(o.duration, 10), fps = 60;
            var shapeComp = glassShapeComp("Glass Scene Shape", w, h, dur, fps, o);
            var c = app.project.items.addComp("Sowveil Glass Scene", w, h, 1, dur, fps);
            // background + grid + text (bottom of the stack)
            var bg = solid(c, [0, 0, 0], "Background"), rp = addFx(bg, "ADBE Ramp");
            set(rp, ["ADBE Ramp-0001", "Start of Ramp"], [w / 2, 0]); set(rp, ["ADBE Ramp-0002", "Start Color"], U.hex(o.bgTop, [0.05, 0.08, 0.22]));
            set(rp, ["ADBE Ramp-0003", "End of Ramp"], [w / 2, h]); set(rp, ["ADBE Ramp-0004", "End Color"], U.hex(o.bgBottom, [0.85, 0.88, 1]));
            var grid = null;
            if (U.bool(o.grid, true)) {
                grid = solid(c, [1, 1, 1], "Grid"); var gd = addFx(grid, "ADBE Grid");
                set(gd, ["ADBE Grid-0002", "Size From"], 2); set(gd, ["ADBE Grid-0004", "Width"], 120); set(gd, ["ADBE Grid-0006", "Border"], 2);
                grid.transform.opacity.setValue(25);
            }
            var T = c.layers.addText(U.str(o.text, "Sowveil")), td = T.property("ADBE Text Properties").property("ADBE Text Document"), doc = td.value;
            doc.fontSize = 220; doc.fillColor = [1, 1, 1]; doc.applyFill = true; doc.justification = ParagraphJustification.CENTER_JUSTIFY;
            try { doc.fauxBold = true; } catch (eB) { } td.setValue(doc);
            T.transform.position.setValue([w / 2, h / 2 + 70]);
            // the glass: displacement source (hidden), RGB split copies, colour overlay
            var disp = c.layers.add(shapeComp); disp.name = "Displacement";
            var cm = addFx(disp, "ADBE Channel Mixer"); set(cm, ["Monochrome", "ADBE Channel Mixer-0013"], 1);
            var names = ["Red", "Green", "Blue"], preset = [5, 6, 7], L = [], i, ab = U.num(o.aberration, 12);
            for (i = 0; i < 3; i += 1) {
                L[i] = c.layers.add(shapeComp); L[i].name = names[i];
                var col = addFx(L[i], "APC Colorama", "Sowveil · " + names[i]);
                set(col, ["APC Colorama-0010", "Use Preset Palette"], preset[i]);
                set(col, ["APC Colorama-0018", "Modify Alpha"], 0);
                try { L[i].blendingMode = BlendingMode.SCREEN; } catch (eS) { }
            }
            for (i = 0; i < 3; i += 1) {
                var dm = addFx(L[i], "ADBE Displacement Map", "Sowveil · Split");
                bindLater(dm, ["ADBE Displacement Map-0001", "Displacement Map Layer"], L[(i + 1) % 3]);
                set(dm, ["ADBE Displacement Map-0002", "Use For Horizontal Displacement"], 2 + (i + 1) % 3);
                set(dm, ["ADBE Displacement Map-0003", "Max Horizontal Displacement"], ab * (i + 1) / 2);
                set(dm, ["ADBE Displacement Map-0004", "Use For Vertical Displacement"], 2 + (i + 1) % 3);
                set(dm, ["ADBE Displacement Map-0005", "Max Vertical Displacement"], ab * (3 - i) / 2);
            }
            var tint = c.layers.add(shapeComp); tint.name = "Color";
            var fl = addFx(tint, "ADBE Fill"); set(fl, ["ADBE Fill-0002", "Color"], U.hex(o.colorA, [1, 0.8, 0.9]));
            try { tint.blendingMode = BlendingMode.OVERLAY; } catch (eO) { }
            // noise + glass adjustment layers, matted to the shape
            var nz = solid(c, [1, 1, 1], "Noise"); nz.adjustmentLayer = true; set(addFx(nz, "ADBE Noise"), ["ADBE Noise-0001", "Amount of Noise"], 6);
            var gl = solid(c, [1, 1, 1], "Glass"); gl.adjustmentLayer = true;
            var cc = addFx(gl, "CC Glass", "Sowveil · Glass");
            bindLater(cc, ["CC Glass-0001", "Bump Map"], disp); set(cc, ["CC Glass-0004", "Height"], 10); set(cc, ["CC Glass-0005", "Displacement"], U.num(o.refraction, 20));
            // text seen through the glass: blurred, displaced and refracted inside the shape only
            var tb = solid(c, [1, 1, 1], "Text Blur"); tb.adjustmentLayer = true;
            set(addFx(tb, "ADBE Box Blur2"), ["ADBE Box Blur2-0001", "Blur Radius"], 7);
            var dm2 = addFx(tb, "ADBE Displacement Map"); bindLater(dm2, ["ADBE Displacement Map-0001", "Displacement Map Layer"], disp);
            set(dm2, ["ADBE Displacement Map-0003", "Max Horizontal Displacement"], 10); set(dm2, ["ADBE Displacement Map-0005", "Max Vertical Displacement"], 10);
            set(addFx(tb, "ADBE Camera Lens Blur"), ["ADBE Camera Lens Blur-0001", "Blur Radius"], 10);
            var cc2 = addFx(tb, "CC Glass"); bindLater(cc2, ["CC Glass-0001", "Bump Map"], disp); set(cc2, ["CC Glass-0003", "Softness"], 200); set(cc2, ["CC Glass-0004", "Height"], 100);
            // order (top -> bottom): Color, Blue, Green, Red, Glass, Noise, Displacement(hidden), Text Blur, Text, Grid, Background
            bg.moveToEnd(); if (grid) { grid.moveBefore(bg); } T.moveBefore(grid || bg); tb.moveBefore(T);
            disp.moveBefore(tb); nz.moveBefore(disp); gl.moveBefore(nz);
            L[0].moveBefore(gl); L[1].moveBefore(L[0]); L[2].moveBefore(L[1]); tint.moveBefore(L[2]);
            function matteTo(layer, inverted) { var m = disp.duplicate(); m.name = layer.name + " Matte"; m.moveBefore(layer); mattes(layer, m, inverted ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA); }
            matteTo(tb, false); matteTo(gl, false); matteTo(nz, true);
            disp.enabled = false;
            U.tag(c.layer(1));
            try { c.openInViewer(); } catch (eV) { }
            bindAll();
            return U.ok({ message: "Glass refraction scene built (comp \"" + c.name + "\")." });
        });
    };
})();
