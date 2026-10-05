// Sougetsu Akira FX - Trim Pack + Rectangle editor shape tools (clean-room). Batch I3.
// Contracts read from the panel:
//   trimPackAddLine("hr"|"vt")                 -> "SUCCESS" / "ERR:"
//   trimPackAddTrim(mode,alt,offset,frames,copies,easeIn,easeOut,offsetVal) -> "SUCCESS" / "ERR:"
//   trimPackConvertToSelectiveLine()           -> "SUCCESS" / "ERR:"
//   trimPackReversePathDirection()             -> "SUCCESS" / "ERR:"
//   rectDetectState() -> "type|left|right|top|bottom|width|height|centerX|centerY" or "none"
//   rectModifySide("left"|"right"|"top"|"bottom"|"width"|"height", value) -> "SUCCESS" / "ERR:"
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function selShapes(comp) {
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof ShapeLayer) { out.push(sel[i]); } }
        return out;
    }
    function rootOf(L) { return L.property("ADBE Root Vectors Group"); }
    function addGroup(root, name) {
        var g = root.addProperty("ADBE Vector Group"); g.name = name;
        return g.property("ADBE Vectors Group");
    }
    function addStroke(contents, color, width) {
        var s = contents.addProperty("ADBE Vector Graphic - Stroke");
        try { s.property("ADBE Vector Stroke Color").setValue([color[0], color[1], color[2], 1]); } catch (e) { }
        try { s.property("ADBE Vector Stroke Width").setValue(width); } catch (e2) { }
        try { s.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e3) { }   // round
        return s;
    }
    function makePathGroup(contents, verts, closed) {
        var pg = contents.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
        sh.vertices = verts;
        var it = [], i; for (i = 0; i < verts.length; i += 1) { it.push([0, 0]); }
        sh.inTangents = it; sh.outTangents = it; sh.closed = !!closed;
        pg.property("ADBE Vector Shape").setValue(sh);
        return pg;
    }

    // ---------- Add Line: a horizontal or vertical stroked line with Trim Paths, animatable ----------
    F.trimPackAddLine = function (mode) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var horiz = String(mode) !== "vt";
        app.beginUndoGroup("Add Line");
        try {
            var L = comp.layers.addShape(); L.name = horiz ? "Line H" : "Line V";
            var contents = rootOf(L), grp = addGroup(contents, "Line");
            var half = (horiz ? comp.width : comp.height) * 0.3;
            var verts = horiz ? [[-half, 0], [half, 0]] : [[0, -half], [0, half]];
            makePathGroup(grp, verts, false);
            addStroke(grp, [1, 1, 1], 6);
            var trim = grp.addProperty("ADBE Vector Filter - Trim");
            var endP = trim.property("ADBE Vector Trim End"), t = comp.time;
            endP.setValueAtTime(t, 0); endP.setValueAtTime(Math.min(t + 1, comp.duration), 100);
            try { var e = [new KeyframeEase(0, 75)]; endP.setTemporalEaseAtKey(1, e, e); endP.setTemporalEaseAtKey(2, e, e); } catch (e1) { }
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- Convert to a single-stroke "selective line": merge each selected shape layer's strokes into one trimmed line group ----------
    F.trimPackConvertToSelectiveLine = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp), i, done = 0;
        if (!layers.length) { return "ERR:Select a shape layer."; }
        app.beginUndoGroup("Convert To Line");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var contents = rootOf(layers[i]), j, hasTrim = false;
                for (j = 1; j <= contents.numProperties; j += 1) {
                    var grp = contents.property(j);
                    if (grp.matchName !== "ADBE Vector Group") { continue; }
                    var inner = grp.property("ADBE Vectors Group"), k, fill = null, trim = null;
                    for (k = 1; k <= inner.numProperties; k += 1) {
                        var mn = inner.property(k).matchName;
                        if (mn === "ADBE Vector Graphic - Fill") { fill = inner.property(k); }
                        if (mn === "ADBE Vector Filter - Trim") { trim = inner.property(k); }
                    }
                    if (fill) { fill.enabled = false; }
                    if (!trim) {
                        trim = inner.addProperty("ADBE Vector Filter - Trim");
                        var endP = trim.property("ADBE Vector Trim End"), t = comp.time;
                        endP.setValueAtTime(t, 0); endP.setValueAtTime(Math.min(t + 1, comp.duration), 100);
                    }
                    hasTrim = true;
                }
                if (hasTrim) { done += 1; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:No shape groups found to convert.";
    };

    // ---------- Reverse path direction of selected shapes ----------
    function reverseShape(sh) {
        var n = sh.vertices.length, v = [], it = [], ot = [], i;
        for (i = n - 1; i >= 0; i -= 1) { v.push(sh.vertices[i]); it.push(sh.outTangents[i]); ot.push(sh.inTangents[i]); }
        var ns = new Shape(); ns.vertices = v; ns.inTangents = it; ns.outTangents = ot; ns.closed = sh.closed; return ns;
    }
    F.trimPackReversePathDirection = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp), i, done = 0;
        if (!layers.length) { return "ERR:Select a shape layer."; }
        function walk(group) {
            var j;
            for (j = 1; j <= group.numProperties; j += 1) {
                var p = group.property(j);
                if (p.matchName === "ADBE Vector Shape - Group") {
                    var sp = p.property("ADBE Vector Shape");
                    if (!sp.expressionEnabled && sp.numKeys === 0) { sp.setValue(reverseShape(sp.value)); done += 1; }
                } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) { walk(p); }
            }
        }
        app.beginUndoGroup("Reverse Path");
        try { for (i = 0; i < layers.length; i += 1) { walk(rootOf(layers[i])); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:No editable paths found.";
    };

    // ---------- Add Trim: staggered Trim Paths animation across selected shape layers (the "playground") ----------
    // args: mode, alt(bool), offset(bool), frames, copies, easeIn, easeOut, offsetVal
    F.trimPackAddTrim = function (mode, alt, offset, frames, copies, easeIn, easeOut, offsetVal) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp), i;
        if (!layers.length) { return "ERR:Select a shape layer."; }
        var fr = parseFloat(frames); if (isNaN(fr) || fr <= 0) { fr = 10; }
        var dur = fr * comp.frameDuration;
        var ei = Math.max(0, Math.min(100, parseFloat(easeIn))); if (isNaN(ei)) { ei = 50; }
        var eo = Math.max(0, Math.min(100, parseFloat(easeOut))); if (isNaN(eo)) { eo = 50; }
        var doOffset = (offset === true || String(offset) === "true"), stagger = doOffset ? comp.frameDuration * Math.max(1, Math.round(parseFloat(offsetVal) / 60) || 3) : 0;
        var reverse = (alt === true || String(alt) === "true");
        app.beginUndoGroup("Add Trim Animation");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var contents = rootOf(layers[i]), trim = contents.addProperty("ADBE Vector Filter - Trim");
                var startP = trim.property("ADBE Vector Trim Start"), endP = trim.property("ADBE Vector Trim End");
                var t0 = comp.time + i * stagger, t1 = t0 + dur, anim = reverse ? startP : endP, other = reverse ? endP : startP;
                other.setValue(reverse ? 100 : 0);
                anim.setValueAtTime(t0, reverse ? 100 : 0);
                anim.setValueAtTime(t1, reverse ? 0 : 100);
                try {
                    anim.setTemporalEaseAtKey(1, [new KeyframeEase(0, Math.max(0.1, eo))], [new KeyframeEase(0, Math.max(0.1, eo))]);
                    anim.setTemporalEaseAtKey(2, [new KeyframeEase(0, Math.max(0.1, ei))], [new KeyframeEase(0, Math.max(0.1, ei))]);
                } catch (e1) { }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- Rectangle editor: read/modify a single selected rectangle's sides ----------
    function findRect(L) {
        var contents = rootOf(L), result = null;
        function walk(group) {
            var j;
            for (j = 1; j <= group.numProperties; j += 1) {
                var p = group.property(j);
                if (result) { return; }
                if (p.matchName === "ADBE Vector Shape - Rect") { result = p; return; }
                if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) { walk(p); }
            }
        }
        walk(contents);
        return result;
    }
    function rectInfo(L) {
        var r = findRect(L); if (!r) { return null; }
        var size = r.property("ADBE Vector Rect Size").value, pos = r.property("ADBE Vector Rect Position").value;
        var cx = pos[0], cy = pos[1], w = size[0], h = size[1];
        return { prop: r, left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, width: w, height: h, centerX: cx, centerY: cy };
    }
    F.rectDetectState = function () {
        var comp = H.activeComp();
        if (!comp) { return "none"; }
        var layers = selShapes(comp), i;
        for (i = 0; i < layers.length; i += 1) {
            var info = rectInfo(layers[i]);
            if (info) {
                return ["rect", info.left, info.right, info.top, info.bottom, info.width, info.height, info.centerX, info.centerY].join("|");
            }
        }
        return "none";
    };
    F.rectModifySide = function (side, value) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp), i, v = parseFloat(value);
        if (isNaN(v)) { return "ERR:Invalid value."; }
        side = String(side);
        app.beginUndoGroup("Edit Rectangle");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var info = rectInfo(layers[i]);
                if (!info) { continue; }
                var left = info.left, right = info.right, top = info.top, bottom = info.bottom;
                if (side === "left") { left = v; } else if (side === "right") { right = v; }
                else if (side === "top") { top = v; } else if (side === "bottom") { bottom = v; }
                else if (side === "width") { var cx = info.centerX; left = cx - v / 2; right = cx + v / 2; }
                else if (side === "height") { var cy = info.centerY; top = cy - v / 2; bottom = cy + v / 2; }
                else { app.endUndoGroup(); return "ERR:Unknown side: " + side; }
                if (right < left) { var tx = left; left = right; right = tx; }
                if (bottom < top) { var ty = top; top = bottom; bottom = ty; }
                info.prop.property("ADBE Vector Rect Size").setValue([right - left, bottom - top]);
                info.prop.property("ADBE Vector Rect Position").setValue([(left + right) / 2, (top + bottom) / 2]);
                app.endUndoGroup();
                return "SUCCESS";
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "ERR:Select a layer with a rectangle.";
    };

    // ---------- shapeOperation("op" or "op|value"): one dispatcher for the Shapes tab buttons ----------
    // Behaviour matches the panel's expectations (own implementation):
    //   createStar, createPolygon|sides, addTrim, addRepeater|copies, addZigZag|size, addTwist|angle,
    //   addRoundCorners|radius, mergePaths, addGradFill, addGradStroke, reversePath, flipH, flipV, blendMode|name
    var BLEND = { add: "ADD", color: "COLOR", colorBurn: "COLOR_BURN", colorDodge: "COLOR_DODGE", darken: "DARKEN", difference: "DIFFERENCE",
        exclusion: "EXCLUSION", hardLight: "HARD_LIGHT", hue: "HUE", lighten: "LIGHTEN", luminosity: "LUMINOSITY", multiply: "MULTIPLY",
        normal: "NORMAL", overlay: "OVERLAY", saturation: "SATURATION", screen: "SCREEN", softLight: "SOFT_LIGHT" };
    function firstGroupContents(L) {   // the "Contents" of the first vector group, where filters attach; else the root
        var root = rootOf(L), i;
        for (i = 1; i <= root.numProperties; i += 1) { if (root.property(i).matchName === "ADBE Vector Group") { return root.property(i).property("ADBE Vectors Group"); } }
        return root;
    }
    function hasFilter(contents, mn) {
        var i; for (i = 1; i <= contents.numProperties; i += 1) { if (contents.property(i).matchName === mn) { return true; } } return false;
    }
    function reverseAllPaths(group) {
        var i;
        for (i = 1; i <= group.numProperties; i += 1) {
            var p = group.property(i);
            if (p.matchName === "ADBE Vector Shape") {
                if (p.numKeys === 0 && !p.expressionEnabled) {
                    var sh = p.value, v = sh.vertices, it = sh.inTangents, ot = sh.outTangents, n = v.length, nv = [], ni = [], no = [], k;
                    for (k = n - 1; k >= 0; k -= 1) { nv.push(v[k]); ni.push(it[k]); no.push(ot[k]); }
                    var ns = new Shape(); ns.vertices = nv; ns.inTangents = ni; ns.outTangents = no; ns.closed = sh.closed; p.setValue(ns);
                }
            } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) { reverseAllPaths(p); }
        }
    }
    function makeStar(comp, polygon, sides) {
        var L = comp.layers.addShape(); L.name = polygon ? "Polygon" : "Star";
        var contents = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var star = contents.addProperty("ADBE Vector Shape - Star"), r = Math.min(comp.width, comp.height);
        if (polygon) {
            try { star.property("ADBE Vector Star Type").setValue(1); } catch (e0) { }
            try { star.property("ADBE Vector Star Points").setValue(sides); } catch (e1) { }
            try { star.property("ADBE Vector Star Outer Radius").setValue(r * 0.4); } catch (e2) { }
        } else {
            try { star.property("ADBE Vector Star Points").setValue(5); } catch (e3) { }
            try { star.property("ADBE Vector Star Outer Radius").setValue(r * 0.4); } catch (e4) { }
            try { star.property("ADBE Vector Star Inner Radius").setValue(r * 0.18); } catch (e5) { }
        }
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        try { fill.property("ADBE Vector Fill Color").setValue(polygon ? [0.2, 0.5, 0.9, 1] : [0.9, 0.7, 0.1, 1]); } catch (e6) { }
        var stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
        try { stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]); stroke.property("ADBE Vector Stroke Width").setValue(3); } catch (e7) { }
        L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        return L;
    }
    F.shapeOperation = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|"), op = parts[0], val = parts.length > 1 ? parseFloat(parts[1]) : NaN;

        if (op === "createStar" || op === "createPolygon") {
            app.beginUndoGroup("Create Shape");
            try {
                var L = makeStar(comp, op === "createPolygon", isNaN(val) ? 6 : val);
                var sel = comp.selectedLayers, i;
                for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
                L.selected = true;
            } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
            app.endUndoGroup();
            return "SUCCESS";
        }

        var layers = H.selectedLayers(comp), i, done = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Shape: " + op);
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L2 = layers[i];
                if (op === "blendMode") { try { L2.blendingMode = BlendingMode[BLEND[parts[1]] || "NORMAL"]; done += 1; } catch (eb) { } continue; }
                if (op === "flipH" || op === "flipV") {
                    try { var sc = L2.transform.scale, sv = sc.value; sc.setValue(op === "flipH" ? [-sv[0], sv[1]] : [sv[0], -sv[1]]); done += 1; } catch (ef) { } continue;
                }
                if (!(L2 instanceof ShapeLayer)) { continue; }
                var root = rootOf(L2), target = firstGroupContents(L2);
                if (op === "reversePath") { reverseAllPaths(root); done += 1; }
                else if (op === "mergePaths") { if (!hasFilter(root, "ADBE Vector Filter - Merge")) { root.addProperty("ADBE Vector Filter - Merge"); } done += 1; }
                else if (op === "addTrim") { if (!hasFilter(target, "ADBE Vector Filter - Trim")) { target.addProperty("ADBE Vector Filter - Trim"); } done += 1; }
                else if (op === "addRepeater") { var rp = target.addProperty("ADBE Vector Filter - Repeater"); try { rp.property("ADBE Vector Repeater Copies").setValue(isNaN(val) ? 3 : val); } catch (e1) { } done += 1; }
                else if (op === "addZigZag") { var zz = target.addProperty("ADBE Vector Filter - Zigzag"); try { zz.property("ADBE Vector Zigzag Size").setValue(isNaN(val) ? 10 : val); zz.property("ADBE Vector Zigzag Detail").setValue(5); } catch (e2) { } done += 1; }
                else if (op === "addTwist") { var tw = target.addProperty("ADBE Vector Filter - Twist"); try { tw.property("ADBE Vector Twist Angle").setValue(isNaN(val) ? 60 : val); } catch (e3) { } done += 1; }
                else if (op === "addRoundCorners") { var rc = target.addProperty("ADBE Vector Filter - RC"); try { rc.property("ADBE Vector RoundCorner Radius").setValue(isNaN(val) ? 20 : val); } catch (e4) { } done += 1; }
                else if (op === "addGradFill") { target.addProperty("ADBE Vector Graphic - G-Fill"); done += 1; }
                else if (op === "addGradStroke") { target.addProperty("ADBE Vector Graphic - G-Stroke"); done += 1; }
                else { app.endUndoGroup(); return "ERR:Unknown shape operation: " + op; }
            }
        } catch (e5) { app.endUndoGroup(); return "ERR:" + e5.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:This operation needs a shape layer.";
    };
})();
