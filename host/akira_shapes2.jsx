// Sougetsu Akira FX - shape layer tools (clean-room). Contracts read from client/index.html + js_flex/commands.js:
//   addShapeLayer()                         -> "SUCCESS" / "ERR:"   (empty shape layer)
//   createPrimitive(type)                   -> "SUCCESS" / "ERR:"   type circle|rect|cross|line, sized to the comp
//   applyShapePreset(name)                  -> "SUCCESS" / "ERR:"   dashes|waveWarp|roughenEdges|trimStart|trimEnd|exclusion
//   getExtraShapeData()                     -> JSON {taperStartLen,taperEndLen,taperStartWidth,taperEndWidth} / "none"
//   createCustomShapes(json | enc(json))    -> "SUCCESS" / "ERR:"   {type,count,sizeX,sizeY,round,fill,stroke,strokeWidth,layout}
//   laPathStart() / laPathDelete()          -> "SUCCESS" / "ERR:"   corner-rounding rig: one null per vertex + rounding sliders
//   laPathSet("radius|leftMult|rightMult|scrub") -> "SUCCESS" / "ERR:"  (no undo group while scrubbing)
//   laPathGetSelectedState()                -> "hasControllers|radius|left|right" / "noControllers" / "none"
//   shapeMorpher(dur, easing, return, linearPath, pairs, optionsJSON) -> "SUCCESS" / "ERROR:msg"
//   removeMorph()                           -> "SUCCESS" / "ERROR:msg"
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }
    var NO_COMP = "ERR:Open a composition first.";

    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
    function hexRgb(h) {
        var v = String(h || "").replace("#", ""), n;
        if (v.length === 3) { v = v.charAt(0) + v.charAt(0) + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2); }
        n = parseInt(v, 16); if (isNaN(n) || v.length !== 6) { return null; }
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    function strField(s, k, d) { var m = new RegExp('"' + k + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(s); return m ? m[1] : d; }
    function numField(s, k, d) { var m = new RegExp('"' + k + '"\\s*:\\s*(-?[0-9.eE+-]+)').exec(s); return m ? parseFloat(m[1]) : d; }
    function boolField(s, k, d) { var m = new RegExp('"' + k + '"\\s*:\\s*(true|false)').exec(s); return m ? m[1] === "true" : d; }
    function selShapes(comp) { var s = H.selectedLayers(comp), o = [], i; for (i = 0; i < s.length; i += 1) { if (s[i] instanceof ShapeLayer) { o.push(s[i]); } } return o; }
    function root(L) { return L.property("ADBE Root Vectors Group"); }
    function group(contents, name) { var g = contents.addProperty("ADBE Vector Group"); g.name = name; return g.property("ADBE Vectors Group"); }
    function fill(c, rgb) { var f = c.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(rgb); return f; }
    function stroke(c, rgb, w) {
        var s = c.addProperty("ADBE Vector Graphic - Stroke");
        s.property("ADBE Vector Stroke Color").setValue(rgb); s.property("ADBE Vector Stroke Width").setValue(w);
        return s;
    }
    function pathGroup(c, verts, closed) {
        var pg = c.addProperty("ADBE Vector Shape - Group"), sh = new Shape(), z = [], i;
        for (i = 0; i < verts.length; i += 1) { z.push([0, 0]); }
        sh.vertices = verts; sh.inTangents = z; sh.outTangents = z; sh.closed = !!closed;
        pg.property("ADBE Vector Shape").setValue(sh);
        return pg;
    }
    function center(comp, L) { L.transform.position.setValue([comp.width / 2, comp.height / 2]); }
    // Every stroke / every path group under a property group, depth-first.
    function findAll(grp, matchName, out) {
        var i;
        for (i = 1; i <= grp.numProperties; i += 1) {
            var p = grp.property(i);
            if (p.matchName === matchName) { out.push(p); }
            if (p.propertyType !== PropertyType.PROPERTY) { findAll(p, matchName, out); }
        }
        return out;
    }
    function undoWrap(title, fn) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        app.beginUndoGroup(title);
        var r;
        try { r = fn(comp); } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return r === undefined ? "SUCCESS" : r;
    }

    // ================= create =================
    F.addShapeLayer = function () {
        return undoWrap("Add Shape Layer", function (comp) { var L = comp.layers.addShape(); L.name = "Shape Layer"; center(comp, L); });
    };

    F.createPrimitive = function (type) {
        var t = String(type || "rect");
        return undoWrap("Create " + t, function (comp) {
            var s = Math.round(Math.min(comp.width, comp.height) * 0.4), L = comp.layers.addShape(), c;
            var blue = [0.2, 0.55, 1];
            if (t === "circle") {
                L.name = "Circle"; c = group(root(L), "Circle");
                c.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([s, s]); fill(c, blue);
            } else if (t === "cross") {
                L.name = "Cross"; c = group(root(L), "Cross");
                var w = Math.round(s * 0.22), r1 = c.addProperty("ADBE Vector Shape - Rect"), r2 = c.addProperty("ADBE Vector Shape - Rect");
                r1.property("ADBE Vector Rect Size").setValue([s, w]); r2.property("ADBE Vector Rect Size").setValue([w, s]);
                c.addProperty("ADBE Vector Filter - Merge"); fill(c, blue);
            } else if (t === "line") {
                L.name = "Line"; c = group(root(L), "Line");
                pathGroup(c, [[-s / 2, 0], [s / 2, 0]], false);
                var st = stroke(c, [1, 1, 1], Math.max(4, Math.round(s * 0.02)));
                try { st.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e1) { }
            } else {
                L.name = "Rectangle"; c = group(root(L), "Rectangle");
                c.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue([s, s]); fill(c, blue);
            }
            center(comp, L);
        });
    };

    F.applyShapePreset = function (name) {
        var n = String(name || "");
        return undoWrap("Shape Preset: " + n, function (comp) {
            var layers = selShapes(comp), i, j, t = comp.time;
            if (n === "waveWarp" || n === "roughenEdges" || n === "exclusion") { layers = H.selectedLayers(comp); }
            if (!layers.length) { return (n === "waveWarp" || n === "roughenEdges" || n === "exclusion") ? "ERR:Select a layer first." : "ERR:Select a shape layer first."; }
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (n === "waveWarp") { L.property("ADBE Effect Parade").addProperty("ADBE Wave Warp"); }
                else if (n === "roughenEdges") { L.property("ADBE Effect Parade").addProperty("ADBE Roughen Edges"); }
                else if (n === "exclusion") { L.blendingMode = BlendingMode.EXCLUSION; }
                else if (n === "dashes") {
                    var strokes = findAll(root(L), "ADBE Vector Graphic - Stroke", []);
                    if (!strokes.length) { stroke(root(L), [1, 1, 1], 6); strokes = findAll(root(L), "ADBE Vector Graphic - Stroke", []); }
                    for (j = 0; j < strokes.length; j += 1) {
                        var d = strokes[j].property("ADBE Vector Stroke Dashes");
                        if (!d.property("ADBE Vector Stroke Dash 1")) { d.addProperty("ADBE Vector Stroke Dash 1"); }
                        if (!d.property("ADBE Vector Stroke Gap 1")) { d.addProperty("ADBE Vector Stroke Gap 1"); }
                        d.property("ADBE Vector Stroke Dash 1").setValue(20); d.property("ADBE Vector Stroke Gap 1").setValue(10);
                    }
                } else if (n === "trimStart" || n === "trimEnd") {
                    var trim = root(L).addProperty("ADBE Vector Filter - Trim"), p;
                    p = trim.property(n === "trimStart" ? "ADBE Vector Trim Start" : "ADBE Vector Trim End");
                    if (n === "trimEnd") { trim.property("ADBE Vector Trim Start").setValue(0); }
                    p.setValueAtTime(t, 0); p.setValueAtTime(t + 1, 100);
                    try { var ez = new KeyframeEase(0, 60); p.setTemporalEaseAtKey(1, [ez], [ez]); p.setTemporalEaseAtKey(2, [ez], [ez]); } catch (e2) { }
                } else { return "ERR:Unknown shape preset: " + n; }
            }
        });
    };

    F.getExtraShapeData = function () {
        var comp = H.activeComp(); if (!comp) { return "none"; }
        var layers = selShapes(comp); if (!layers.length) { return "none"; }
        var strokes = findAll(root(layers[0]), "ADBE Vector Graphic - Stroke", []);
        if (!strokes.length) { return "none"; }
        try {
            var tp = strokes[0].property("ADBE Vector Stroke Taper");
            return '{"taperStartLen":' + tp.property("ADBE Vector Taper Start Length").value +
                ',"taperEndLen":' + tp.property("ADBE Vector Taper End Length").value +
                ',"taperStartWidth":' + tp.property("ADBE Vector Taper Start Width").value +
                ',"taperEndWidth":' + tp.property("ADBE Vector Taper End Width").value + '}';
        } catch (e) { return "none"; }
    };

    // ================= console: "make 30 squares round 20 size 80 fill red layout radial" =================
    F.createCustomShapes = function (arg) {
        var s = decodeArg(arg);
        var type = strField(s, "type", "rectangle"), count = Math.max(1, Math.min(500, Math.round(numField(s, "count", 1))));
        var sx = numField(s, "sizeX", 100), sy = numField(s, "sizeY", sx), round = numField(s, "round", 0);
        var fillRgb = strField(s, "fill", "00ffff") === "none" ? null : hexRgb(strField(s, "fill", "00ffff"));
        var strokeRgb = hexRgb(strField(s, "stroke", "")), sw = numField(s, "strokeWidth", 4), layout = strField(s, "layout", "grid");
        return undoWrap("Create " + count + " Shapes", function (comp) {
            var i, cols = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / cols), gap = Math.max(sx, sy) * 1.4;
            var seed = 7;
            function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
            for (i = 0; i < count; i += 1) {
                var L = comp.layers.addShape(), c = group(root(L), type), p;
                L.name = type.charAt(0).toUpperCase() + type.substring(1) + " " + (i + 1);
                if (type === "ellipse") { c.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([sx, sy]); }
                else if (type === "star") {
                    var st = c.addProperty("ADBE Vector Shape - Star");
                    st.property("ADBE Vector Star Points").setValue(5);
                    st.property("ADBE Vector Star Outer Radius").setValue(sx / 2); st.property("ADBE Vector Star Inner Radius").setValue(sx / 4);
                    if (round) { try { st.property("ADBE Vector Star Outer Roundess").setValue(round); } catch (eR) { } }
                } else {
                    var r = c.addProperty("ADBE Vector Shape - Rect");
                    r.property("ADBE Vector Rect Size").setValue([sx, sy]); r.property("ADBE Vector Rect Roundness").setValue(round);
                }
                if (fillRgb) { fill(c, fillRgb); }
                if (strokeRgb && sw > 0) { stroke(c, strokeRgb, sw); }
                if (layout === "radial") {
                    var rad = Math.max(gap * count / (2 * Math.PI), gap), a = (i / count) * Math.PI * 2 - Math.PI / 2;
                    p = [comp.width / 2 + Math.cos(a) * rad, comp.height / 2 + Math.sin(a) * rad];
                    L.transform.rotation.setValue(a * 180 / Math.PI + 90);
                } else if (layout === "random") {
                    p = [sx / 2 + rnd() * (comp.width - sx), sy / 2 + rnd() * (comp.height - sy)];
                } else if (layout === "stack") {
                    p = [comp.width / 2 + i * 8, comp.height / 2 + i * 8];
                } else {
                    var col = i % cols, row = Math.floor(i / cols);
                    p = [comp.width / 2 + (col - (cols - 1) / 2) * gap, comp.height / 2 + (row - (rows - 1) / 2) * gap];
                }
                L.transform.position.setValue(p);
            }
        });
    };

    // ================= La Path: adjustable corner roundness =================
    // START: one null per vertex of the selected layer's first path (the nulls drive the vertices) plus three
    // sliders on the shape layer; the path expression rebuilds the path with bezier handles sized by
    // Radius x Left/Right multiplier. DELETE restores the original path stored in the layer comment.
    var LA_TAG = "AKIRA_LAPATH|", LA_NULL = "AKIRA_LAPATH_NULL|";
    var FX_R = "LaPath Radius", FX_L = "LaPath Left Mult", FX_RT = "LaPath Right Mult";
    function laTarget(comp) {
        var s = selShapes(comp); if (!s.length) { return null; }
        var paths = findAll(root(s[0]), "ADBE Vector Shape", []);
        return paths.length ? { layer: s[0], path: paths[0] } : null;
    }
    function laHas(L) { try { return !!L.property("ADBE Effect Parade").property(FX_R); } catch (e) { return false; } }
    function slider(L, name, v) { var e = L.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); return e; }
    function shapeToText(sh) {
        var out = [], i;
        for (i = 0; i < sh.vertices.length; i += 1) {
            out.push([sh.vertices[i][0], sh.vertices[i][1], sh.inTangents[i][0], sh.inTangents[i][1], sh.outTangents[i][0], sh.outTangents[i][1]].join(","));
        }
        return (sh.closed ? "1" : "0") + ";" + out.join(";");
    }
    function textToShape(t) {
        var parts = String(t).split(";"), sh = new Shape(), v = [], it = [], ot = [], i;
        for (i = 1; i < parts.length; i += 1) {
            var n = parts[i].split(",");
            if (n.length < 6) { continue; }
            v.push([parseFloat(n[0]), parseFloat(n[1])]); it.push([parseFloat(n[2]), parseFloat(n[3])]); ot.push([parseFloat(n[4]), parseFloat(n[5])]);
        }
        sh.vertices = v; sh.inTangents = it; sh.outTangents = ot; sh.closed = parts[0] === "1";
        return sh;
    }
    function laNulls(comp, L) {
        var out = [], i, tag = LA_NULL + L.name + "|";
        for (i = 1; i <= comp.numLayers; i += 1) { if (String(comp.layer(i).comment || "").indexOf(tag) === 0) { out.push(comp.layer(i)); } }
        return out;
    }
    F.laPathStart = function () {
        return undoWrap("La Path Start", function (comp) {
            var tgt = laTarget(comp); if (!tgt) { return "ERR:Select a shape layer with a path."; }
            var L = tgt.layer, t = comp.time;
            if (laHas(L)) { return "ERR:This path already has controllers. Use SET or DELETE."; }
            if (tgt.path.numKeys > 0) { return "ERR:The path is animated. Remove its keyframes first."; }
            var sh = tgt.path.value, n = sh.vertices.length, i, names = [];
            if (n < 2) { return "ERR:The path needs at least two points."; }
            L.comment = LA_TAG + shapeToText(sh);
            slider(L, FX_R, 0); slider(L, FX_L, 1); slider(L, FX_RT, 1);
            for (i = 0; i < n; i += 1) {
                var nl = comp.layers.addNull(), off = H.offsetFromAnchor(L, sh.vertices[i], t), p = H.getPos(L, t);
                nl.name = L.name + " · Pt " + (i + 1);
                nl.comment = LA_NULL + L.name + "|" + i;
                nl.transform.anchorPoint.setValue([50, 50]);
                nl.transform.position.setValue([p[0] + off[0], p[1] + off[1]]);
                nl.moveBefore(L);
                names.push('"' + esc(nl.name) + '"');
            }
            tgt.path.expression = "// akira-lapath\n" +
                "const N=[" + names.join(",") + "];\n" +
                "const R=effect(\"" + FX_R + "\")(1), LM=effect(\"" + FX_L + "\")(1), RM=effect(\"" + FX_RT + "\")(1);\n" +
                "const pts=N.map(n=>{const c=thisComp.layer(n);return fromComp(c.toComp(c.anchorPoint));});\n" +
                "const closed=" + (sh.closed ? "true" : "false") + ", k=pts.length, inT=[], outT=[];\n" +
                "function unit(a,b){const d=sub(b,a),l=length(d);return l>0?div(d,l):[0,0];}\n" +
                "for(let i=0;i<k;i++){\n" +
                "  const prev=(i>0||closed)?pts[(i-1+k)%k]:null, next=(i<k-1||closed)?pts[(i+1)%k]:null;\n" +
                "  if(!prev||!next||R<=0){inT.push([0,0]);outT.push([0,0]);continue;}\n" +
                "  const r=Math.min(R,length(pts[i],prev)/2,length(pts[i],next)/2)*0.5523;\n" +
                "  inT.push(mul(unit(pts[i],prev),r*LM)); outT.push(mul(unit(pts[i],next),r*RM));\n" +
                "}\n" +
                "createPath(pts,inT,outT,closed);";
        });
    };
    F.laPathSet = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p = String(arg || "").split("|"), r = parseFloat(p[0]) || 0, lm = parseFloat(p[1]), rm = parseFloat(p[2]), scrub = p[3] === "true";
        if (isNaN(lm)) { lm = 1; } if (isNaN(rm)) { rm = 1; }
        var tgt = laTarget(comp); if (!tgt || !laHas(tgt.layer)) { return "ERR:Press START on a shape path first."; }
        var fx = tgt.layer.property("ADBE Effect Parade");
        if (!scrub) { app.beginUndoGroup("La Path Set"); }
        try {
            fx.property(FX_R).property(1).setValue(Math.max(0, r));
            fx.property(FX_L).property(1).setValue(lm); fx.property(FX_RT).property(1).setValue(rm);
        } catch (e) { if (!scrub) { app.endUndoGroup(); } return "ERR:" + e.toString(); }
        if (!scrub) { app.endUndoGroup(); }
        return "SUCCESS";
    };
    F.laPathGetSelectedState = function () {
        var comp = H.activeComp(); if (!comp) { return "none"; }
        var tgt = laTarget(comp); if (!tgt) { return "none"; }
        if (!laHas(tgt.layer)) { return "noControllers"; }
        var fx = tgt.layer.property("ADBE Effect Parade");
        return "hasControllers|" + fx.property(FX_R).property(1).value + "|" + fx.property(FX_L).property(1).value + "|" + fx.property(FX_RT).property(1).value;
    };
    F.laPathDelete = function () {
        return undoWrap("La Path Delete", function (comp) {
            var tgt = laTarget(comp); if (!tgt || !laHas(tgt.layer)) { return "ERR:No path controllers on the selected layer."; }
            var L = tgt.layer, c = String(L.comment || ""), i, fx = L.property("ADBE Effect Parade");
            tgt.path.expression = "";
            if (c.indexOf(LA_TAG) === 0) { tgt.path.setValue(textToShape(c.substring(LA_TAG.length))); L.comment = ""; }
            var nulls = laNulls(comp, L); for (i = 0; i < nulls.length; i += 1) { nulls[i].remove(); }
            var names = [FX_R, FX_L, FX_RT]; for (i = 0; i < names.length; i += 1) { try { fx.property(names[i]).remove(); } catch (e) { } }
        });
    };

    // ================= Shape Morpher =================
    // Morphs each selected shape layer into the next one (or 1->2, 3->4 with pairs) with path keyframes on the
    // first path of the source; the target is hidden. Tagged in .comment so removeMorph can undo it.
    var MORPH = "AKIRA_MORPH|", TRAIL = "AKIRA_MORPH_TRAIL|";
    function firstPath(L) { var p = findAll(root(L), "ADBE Vector Shape", []); return p.length ? p[0] : null; }
    function easeKeys(prop, easing, inf, outf) {
        var n = prop.numKeys, k, e;
        if (easing === "linear") { for (k = 1; k <= n; k += 1) { prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR); } return; }
        for (k = 1; k <= n; k += 1) {
            var ein = 33, eout = 33;
            if (easing === "ease-in") { ein = 75; eout = 0.1; }
            else if (easing === "ease-out") { ein = 0.1; eout = 75; }
            else if (easing === "custom") { ein = inf; eout = outf; }
            else if (easing === "elastic" || easing === "bounce") { ein = 85; eout = 10; }
            var dims = 1; try { var v = prop.keyValue(k); if (v instanceof Array) { dims = prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? 1 : v.length; } } catch (e0) { }
            var ia = [], oa = [], d;
            for (d = 0; d < dims; d += 1) { ia.push(new KeyframeEase(0, Math.max(0.1, Math.min(100, ein)))); oa.push(new KeyframeEase(0, Math.max(0.1, Math.min(100, eout)))); }
            try { prop.setTemporalEaseAtKey(k, ia, oa); } catch (e1) { }
        }
    }
    F.shapeMorpher = function (duration, easing, returnMorph, linearPath, pairMorph, optionsStr) {
        var g = H.locked(); if (g) { return "ERROR:" + g.substring(4); }
        var comp = H.activeComp(); if (!comp) { return "ERROR:Open a composition first."; }
        var layers = selShapes(comp), i, k;
        if (layers.length < 2) { return "ERROR:Select at least two shape layers (source first, then target)."; }
        layers.sort(function (a, b) { return a.index - b.index; });
        var o = String(optionsStr || "{}"), dur = Math.max(comp.frameDuration, parseFloat(duration) || 1), ease = String(easing || "easy-ease");
        var inf = numField(o, "customEaseIn", 50), outf = numField(o, "customEaseOut", 50);
        var trails = boolField(o, "useTrails", false), trailCount = Math.max(1, Math.round(numField(o, "trailCount", 3))), trailDelay = numField(o, "trailDelay", 0.04);
        var amp = numField(o, "bounceAmp", 0.1), freq = numField(o, "bounceFreq", 2), decay = numField(o, "bounceDecay", 5);
        var pairs = [];
        if (pairMorph === true || String(pairMorph) === "true") { for (i = 0; i + 1 < layers.length; i += 2) { pairs.push([layers[i], layers[i + 1]]); } }
        else { for (i = 0; i + 1 < layers.length; i += 1) { pairs.push([layers[i], layers[i + 1]]); } }
        app.beginUndoGroup("Shape Morph");
        try {
            var t0 = comp.time;
            for (i = 0; i < pairs.length; i += 1) {
                var A = pairs[i][0], B = pairs[i][1], pa = firstPath(A), pb = firstPath(B);
                if (!pa || !pb) { continue; }
                var start = t0 + i * dur, shA = pa.valueAtTime(start, false), shB = pb.valueAtTime(start, false);
                while (pa.numKeys) { pa.removeKey(pa.numKeys); }
                pa.setValueAtTime(start, shA); pa.setValueAtTime(start + dur, shB);
                if (returnMorph === true || String(returnMorph) === "true") { pa.setValueAtTime(start + dur * 2, shA); }
                easeKeys(pa, ease, inf, outf);
                if (linearPath === true || String(linearPath) === "true") {
                    var pos = A.transform.position, pA = pos.valueAtTime(start, false), pB = B.transform.position.valueAtTime(start, false);
                    if (!pos.dimensionsSeparated) {
                        pos.setValueAtTime(start, pA); pos.setValueAtTime(start + dur, pB);
                        if (returnMorph === true || String(returnMorph) === "true") { pos.setValueAtTime(start + dur * 2, pA); }
                        for (k = 1; k <= pos.numKeys; k += 1) { try { pos.setSpatialTangentsAtKey(k, [0, 0, 0], [0, 0, 0]); } catch (e3) { } }
                        easeKeys(pos, ease, inf, outf);
                    }
                }
                if (ease === "elastic" || ease === "bounce") {
                    // overshoot on scale after the morph lands (paths can't take arithmetic in expressions)
                    A.transform.scale.expression = "// akira-morph\nconst t0=" + (start + dur) + ";if(time<t0){value}else{const t=time-t0," +
                        (ease === "bounce" ? "a=Math.abs(Math.sin(t*" + freq + "*Math.PI*2))" : "a=Math.sin(t*" + freq + "*Math.PI*2)") +
                        "*" + amp + "*100/Math.exp(" + decay + "*t);value.map(v=>v+a)}";
                }
                A.comment = MORPH + B.name;
                B.enabled = false;
                if (trails) {
                    for (k = 1; k <= trailCount; k += 1) {
                        var d = A.duplicate();
                        d.name = A.name + " Trail " + k; d.comment = TRAIL + A.name;
                        d.startTime = A.startTime + k * trailDelay;
                        d.transform.opacity.setValue(Math.max(5, 100 - k * (80 / trailCount)));
                        d.moveAfter(A);
                    }
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERROR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.removeMorph = function () {
        var g = H.locked(); if (g) { return "ERROR:" + g.substring(4); }
        var comp = H.activeComp(); if (!comp) { return "ERROR:Open a composition first."; }
        var sel = H.selectedLayers(comp), i, j, done = 0;
        app.beginUndoGroup("Remove Morph");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var A = sel[i], c = String(A.comment || "");
                if (c.indexOf(MORPH) !== 0) { continue; }
                var target = c.substring(MORPH.length), pa = firstPath(A);
                if (pa && pa.numKeys) { var first = pa.keyValue(1); while (pa.numKeys) { pa.removeKey(pa.numKeys); } pa.setValue(first); }
                try { if (String(A.transform.scale.expression).indexOf("akira-morph") !== -1) { A.transform.scale.expression = ""; } } catch (e1) { }
                for (j = comp.numLayers; j >= 1; j -= 1) {
                    var L = comp.layer(j), lc = String(L.comment || "");
                    if (lc === TRAIL + A.name) { L.remove(); continue; }
                    if (L.name === target && !L.enabled) { L.enabled = true; }
                }
                A.comment = ""; done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERROR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERROR:Select a morphed shape layer.";
    };
})();
