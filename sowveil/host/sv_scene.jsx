// Sowveil - Templates builder. Turns a scene (the same JSON the panel's live preview draws, see js/scene.js)
// into a new composition: shape / text / gradient / null layers, keyframes with the preview's eases,
// and behaviours (float, spin, pulse, shake, blink, typewriter, counter) as expressions.
// Order of work matters: layers are created, then parented, then given values - setting .parent in AE
// keeps the child where it is, which would rewrite positions that are meant to be parent-relative.
// ES3 only (expression strings may use modern JS).
if (typeof $._sv === "undefined") { $._sv = {}; }

(function () {
    var SV = $._sv, U = SV._u;
    if (!U) { return; }
    var EASES = { inOut: [60, 60], soft: [33, 33], out: [8, 88], "in": [88, 8], snap: [4, 96], expo: [2, 98] };
    function easeOf(e) { if (e === "linear" || e === "hold") { return e; } if (e && e.length === 2) { return e; } return EASES[e] || EASES.inOut; }
    function col(c) { if (c instanceof Array) { return [c[0], c[1], c[2]]; } return U.hex(c, [1, 1, 1]); }
    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\r"); }
    function fx(L) { return L.property("ADBE Effect Parade"); }
    function setP(group, names, v) {
        var i, p;
        for (i = 0; i < names.length; i += 1) { try { p = group.property(names[i]); if (p) { p.setValue(v); return p; } } catch (e) { } }
        return null;
    }
    function num2(v) { return typeof v === "number" ? [v, v] : v; }
    function scale3(v) { var s = num2(v); return [s[0], s[1], 100]; }

    // keyframes + eases; conv maps a scene value to the property's value
    function keys(p, track, conv) {
        if (!p || !track || !track.length) { return; }
        var i, k;
        for (i = 0; i < track.length; i += 1) { p.setValueAtTime(track[i][0], conv ? conv(track[i][1]) : track[i][1]); }
        var spatial = p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL;
        for (i = 0; i < track.length; i += 1) {
            k = p.nearestKeyIndex(track[i][0]);
            var inE = i > 0 ? easeOf(track[i][2]) : EASES.soft, outE = i < track.length - 1 ? easeOf(track[i + 1][2]) : EASES.soft;
            try {
                var it = inE === "linear" ? KeyframeInterpolationType.LINEAR : inE === "hold" ? KeyframeInterpolationType.HOLD : KeyframeInterpolationType.BEZIER;
                var ot = outE === "linear" ? KeyframeInterpolationType.LINEAR : outE === "hold" ? KeyframeInterpolationType.HOLD : KeyframeInterpolationType.BEZIER;
                p.setInterpolationTypeAtKey(k, it, ot);
            } catch (e1) { }
            var dims = spatial ? 1 : ((p.keyValue(k) instanceof Array) ? p.keyValue(k).length : 1), a = [], b = [], d;
            var inInf = (inE instanceof Array) ? inE[1] : 33, outInf = (outE instanceof Array) ? outE[0] : 33;
            for (d = 0; d < dims; d += 1) { a.push(new KeyframeEase(0, Math.max(0.1, Math.min(100, inInf)))); b.push(new KeyframeEase(0, Math.max(0.1, Math.min(100, outInf)))); }
            try { if (inE instanceof Array || outE instanceof Array) { p.setTemporalEaseAtKey(k, a, b); } } catch (e2) { }
            if (spatial) { try { p.setSpatialTangentsAtKey(k, [0, 0, 0], [0, 0, 0]); } catch (e3) { } }
        }
    }
    function val(p, v, conv) { if (p && v !== undefined) { try { p.setValue(conv ? conv(v) : v); } catch (e) { } } }
    function setOrKey(p, base, track, conv) { if (track && track.length) { keys(p, track, conv); } else { val(p, base, conv); } }

    // ---------- shape contents ----------
    function roundedMask(L, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        var k = 0.5523 * r, s = new Shape();
        s.vertices = [[r, 0], [w - r, 0], [w, r], [w, h - r], [w - r, h], [r, h], [0, h - r], [0, r]];
        s.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
        s.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
        s.closed = true;
        var m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
        m.property("ADBE Mask Shape").setValue(s);
    }
    function shapeContents(L, S) {
        var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); grp.name = S.name;
        var cg = grp.property("ADBE Vectors Group"), A = S.anim || {}, geo;
        if (S.type === "rect") {
            geo = cg.addProperty("ADBE Vector Shape - Rect");
            setOrKey(geo.property("ADBE Vector Rect Size"), S.size, A.size);
            setOrKey(geo.property("ADBE Vector Rect Roundness"), S.radius || 0, A.radius);
        } else if (S.type === "ellipse") {
            geo = cg.addProperty("ADBE Vector Shape - Ellipse");
            setOrKey(geo.property("ADBE Vector Ellipse Size"), S.size, A.size);
        } else {
            geo = cg.addProperty("ADBE Vector Shape - Group");
            var sh = new Shape(), pts = S.points || [], i, z = [];
            for (i = 0; i < pts.length; i += 1) { z.push([0, 0]); }
            sh.vertices = pts; sh.inTangents = z; sh.outTangents = z; sh.closed = !!S.closed;
            geo.property("ADBE Vector Shape").setValue(sh);
        }
        if (S.stroke) {
            var st = cg.addProperty("ADBE Vector Graphic - Stroke");
            setOrKey(st.property("ADBE Vector Stroke Color"), S.stroke.color, A.strokeColor, col);
            setOrKey(st.property("ADBE Vector Stroke Width"), S.stroke.width || 4, A.strokeWidth);
            try { st.property("ADBE Vector Stroke Line Cap").setValue(2); st.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e) { }
            if (A.trimEnd || A.trimStart || S.trimEnd !== undefined || S.trimStart !== undefined) {
                var tr = cg.addProperty("ADBE Vector Filter - Trim");
                setOrKey(tr.property("ADBE Vector Trim End"), S.trimEnd === undefined ? 100 : S.trimEnd, A.trimEnd);
                setOrKey(tr.property("ADBE Vector Trim Start"), S.trimStart || 0, A.trimStart);
            }
        }
        if (S.fill) {
            var fl = cg.addProperty("ADBE Vector Graphic - Fill");
            setOrKey(fl.property("ADBE Vector Fill Color"), S.fill, A.fill, col);
            setOrKey(fl.property("ADBE Vector Fill Opacity"), S.fillOpacity === undefined ? 100 : S.fillOpacity, A.fillOpacity);
        }
        // AE draws the first item on top: stroke was added before fill, so it sits above it like in the preview
    }

    function fontFor(S) {
        var w = S.weight || 700, f = S.font || "sans";
        if (f === "mono") { return w >= 600 ? "CourierNewPS-BoldMT" : "CourierNewPSMT"; }
        if (f === "serif") { return w >= 600 ? "Georgia-Bold" : "Georgia"; }
        if (w >= 850) { return "Arial-Black"; }
        return w >= 600 ? "Arial-BoldMT" : "ArialMT";
    }
    function makeText(comp, S) {
        var L = comp.layers.addText(String(S.text).replace(/\n/g, "\r")), td = L.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value;
        d.fontSize = S.fontSize || 60; d.applyFill = true; d.fillColor = col(S.fill || "#ffffff"); d.applyStroke = false;
        try { d.font = fontFor(S); } catch (e) { }
        d.justification = S.align === "left" ? ParagraphJustification.LEFT_JUSTIFY : S.align === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY;
        try { d.tracking = S.tracking || 0; } catch (e2) { }
        td.setValue(d);
        return L;
    }

    // ---------- behaviours -> expressions ----------
    function behaviours(L, S) {
        var B = S.behave || {}, tr = L.transform, x;
        if (B.float || B.shake) {
            x = "var v=value;";
            if (B.float) { var f = B.float, w = "Math.sin((time+" + (f.phase || 0) + ")*" + (f.freq || 0.5) + "*Math.PI*2)"; x += "v=v+[" + (f.x || 0) + "*" + w + "," + (f.amp || 0) + "*" + w + "];"; }
            if (B.shake) { var k = B.shake; x += "if(time>=" + k.t + "&&time<" + (k.t + k.dur) + "){var q=1-(time-" + k.t + ")/" + k.dur + ";v=v+[Math.sin(time*97)*" + k.amp + "*q,Math.cos(time*83)*" + k.amp + "*q];}"; }
            tr.position.expression = x + "v;";
        }
        if (B.spin) { tr.rotation.expression = "value+time*" + B.spin + ";"; }
        if (B.pulse) { tr.scale.expression = "var k=1+" + (B.pulse.amp || 0.05) + "*Math.sin(time*" + (B.pulse.freq || 1) + "*Math.PI*2);[value[0]*k,value[1]*k];"; }
        if (B.blink) { tr.opacity.expression = "(time>=" + (B.blink.from || 0) + (B.blink.to !== undefined ? "&&time<" + B.blink.to : "") + ")?value*(Math.floor(time/" + (B.blink.period || 1) + "*2)%2==0?1:0):value;"; }
        var src = null;
        try { src = L.property("ADBE Text Properties").property("ADBE Text Document"); } catch (e) { src = null; }
        if (src && B.type) { src.expression = "var s=\"" + esc(B.type.text) + "\";s.substr(0,Math.max(0,Math.floor((time-" + B.type.start + ")*" + B.type.cps + ")));"; }
        if (src && B.count) {
            var c = B.count;
            src.expression = "var f=Math.max(0,Math.min(1,(time-" + c.start + ")/" + c.dur + "));f=1-Math.pow(1-f,3);" +
                "var s=(" + c.from + "+(" + (c.to - c.from) + ")*f).toFixed(" + (c.dec || 0) + ");" +
                (c.sep ? "s=s.replace(/\\B(?=(\\d{3})+(?!\\d))/g,\",\");" : "") +
                "\"" + esc(c.prefix || "") + "\"+s+\"" + esc(c.suffix || "") + "\";";
        }
    }
    function effects(L, S) {
        var A = S.anim || {};
        if (S.blur || A.blur) {
            var b = fx(L).addProperty("ADBE Gaussian Blur 2");
            setOrKey(b.property("ADBE Gaussian Blur 2-0001") || b.property(1), S.blur || 0, A.blur);
            setP(b, ["ADBE Gaussian Blur 2-0003", "Repeat Edge Pixels"], 0);
        }
        if (S.glow) {
            var g = fx(L).addProperty("ADBE Glo2");
            setP(g, ["ADBE Glo2-0002", "Glow Threshold"], 40 * 2.55);
            setP(g, ["ADBE Glo2-0003", "Glow Radius"], S.glow.radius || 30);
            setP(g, ["ADBE Glo2-0004", "Glow Intensity"], S.glow.intensity || 1.2);
        }
        if (S.shadow) {
            var d = fx(L).addProperty("ADBE Drop Shadow");
            setP(d, ["ADBE Drop Shadow-0001", "Shadow Color"], col(S.shadow.color || "#000000"));
            setP(d, ["ADBE Drop Shadow-0002", "Opacity"], (S.shadow.opacity === undefined ? 40 : S.shadow.opacity) * 2.55);
            setP(d, ["ADBE Drop Shadow-0003", "Direction"], 180);
            setP(d, ["ADBE Drop Shadow-0004", "Distance"], S.shadow.dist === undefined ? 10 : S.shadow.dist);
            setP(d, ["ADBE Drop Shadow-0005", "Softness"], S.shadow.blur || 20);
        }
        if (S.blend) {
            var m = { add: BlendingMode.ADD, screen: BlendingMode.SCREEN, overlay: BlendingMode.OVERLAY, multiply: BlendingMode.MULTIPLY };
            try { if (m[S.blend]) { L.blendingMode = m[S.blend]; } } catch (e) { }
        }
    }
    function gradFill(L, g, w, h) {
        var r = fx(L).addProperty("ADBE Ramp"), ang = (g.angle === undefined ? 90 : g.angle) * Math.PI / 180, dx = Math.cos(ang) * w / 2, dy = Math.sin(ang) * h / 2;
        setP(r, ["ADBE Ramp-0001", "Start of Ramp"], [w / 2 - dx, h / 2 - dy]); setP(r, ["ADBE Ramp-0002", "Start Color"], col(g.colors[0]));
        setP(r, ["ADBE Ramp-0003", "End of Ramp"], [w / 2 + dx, h / 2 + dy]); setP(r, ["ADBE Ramp-0004", "End Color"], col(g.colors[1]));
    }

    // scene = { name, w, h, dur, fps, bg, layers: [...] (bottom first) }
    SV.buildScene = function (a) {
        var S = a && a.scene; if (!S || !S.layers) { return U.fail("No template data."); }
        return U.run("Sowveil Template: " + S.name, function () {
            var w = S.w || 1920, h = S.h || 1080, dur = S.dur || 6, fps = S.fps || 30, i, L;
            var folder = null, it;
            for (i = 1; i <= app.project.numItems; i += 1) { it = app.project.item(i); if (it instanceof FolderItem && it.name === "Sowveil Templates") { folder = it; break; } }
            if (!folder) { folder = app.project.items.addFolder("Sowveil Templates"); }
            var comp = app.project.items.addComp(S.name, w, h, 1, dur, fps);
            try { comp.parentFolder = folder; } catch (eF) { }
            var bg = comp.layers.addSolid(col(S.bg && S.bg.colors ? S.bg.colors[0] : (S.bg || "#000000")), "Background", w, h, 1, dur);
            if (S.bg && S.bg.colors) { gradFill(bg, S.bg, w, h); }
            // 1) create
            var made = [], byName = {};
            for (i = 0; i < S.layers.length; i += 1) {
                var D = S.layers[i];
                if (D.type === "text") { L = makeText(comp, D); }
                else if (D.type === "null") { L = comp.layers.addNull(dur); }
                else if (D.type === "grad") { L = comp.layers.addSolid(col(D.grad.colors[0]), D.name, Math.max(4, Math.round(D.size[0])), Math.max(4, Math.round(D.size[1])), 1, dur); gradFill(L, D.grad, D.size[0], D.size[1]); if (D.radius) { roundedMask(L, D.size[0], D.size[1], D.radius); } }
                else { L = comp.layers.addShape(); shapeContents(L, D); }
                L.name = D.name;
                made.push(L); byName[D.name] = L;
            }
            // 2) parent (before any values are set)
            for (i = 0; i < S.layers.length; i += 1) { if (S.layers[i].parent && byName[S.layers[i].parent]) { made[i].parent = byName[S.layers[i].parent]; } }
            // 3) values, keys, behaviours, effects, mattes, timing
            for (i = 0; i < S.layers.length; i += 1) {
                var Dd = S.layers[i], Ll = made[i], A = Dd.anim || {}, tr = Ll.transform;
                var anchor = Dd.anchor || [0, 0];
                if (Dd.type === "grad") { anchor = [Dd.size[0] / 2 + anchor[0], Dd.size[1] / 2 + anchor[1]]; }
                val(tr.anchorPoint, anchor);
                setOrKey(tr.position, Dd.pos || [0, 0], A.pos);
                setOrKey(tr.scale, Dd.scale === undefined ? 100 : Dd.scale, A.scale, scale3);
                setOrKey(tr.rotation, Dd.rot || 0, A.rot);
                setOrKey(tr.opacity, Dd.opacity === undefined ? 100 : Dd.opacity, A.opacity);
                if (Dd.type === "text" && A.tracking) {   // tracking keys ride a text animator (the document value stays put)
                    try {
                        var an = Ll.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); an.name = "Tracking";
                        var tp = an.property("ADBE Text Animator Properties").addProperty("ADBE Text Tracking Amount"), base = Dd.tracking || 0, q, trk = [];
                        for (q = 0; q < A.tracking.length; q += 1) { trk.push([A.tracking[q][0], A.tracking[q][1] - base, A.tracking[q][2]]); }
                        keys(tp, trk);
                    } catch (eT) { }
                }
                behaviours(Ll, Dd);
                effects(Ll, Dd);
                if (Dd.inPoint !== undefined) { Ll.inPoint = Dd.inPoint; }
                if (Dd.outPoint !== undefined) { Ll.outPoint = Dd.outPoint; }
                if (Dd.type === "null") { Ll.enabled = false; }
                if (Dd.clip) {
                    var r = Dd.clip.rect, m = comp.layers.addShape(); m.name = Dd.name + " Matte";
                    var mg = m.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
                    var rc = mg.addProperty("ADBE Vector Shape - Rect"); mg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([1, 1, 1]);
                    setOrKey(rc.property("ADBE Vector Rect Size"), [r[2], r[3]], Dd.clip.anim ? (function (tk) { var o = [], q; for (q = 0; q < tk.length; q += 1) { o.push([tk[q][0], [tk[q][1][2], tk[q][1][3]], tk[q][2]]); } return o; })(Dd.clip.anim) : null);
                    setOrKey(m.transform.position, [r[0] + r[2] / 2, r[1] + r[3] / 2], Dd.clip.anim ? (function (tk) { var o = [], q; for (q = 0; q < tk.length; q += 1) { o.push([tk[q][0], [tk[q][1][0] + tk[q][1][2] / 2, tk[q][1][1] + tk[q][1][3] / 2], tk[q][2]]); } return o; })(Dd.clip.anim) : null);
                    m.moveBefore(Ll);
                    if (typeof Ll.setTrackMatte === "function") { Ll.setTrackMatte(m, TrackMatteType.ALPHA); m.enabled = false; } else { Ll.trackMatteType = TrackMatteType.ALPHA; }
                }
            }
            try { comp.openInViewer(); } catch (eV) { }
            return U.ok({ message: "\"" + S.name + "\" built (" + S.layers.length + " layers, " + dur + "s)." , comp: comp.name });
        });
    };
})();
