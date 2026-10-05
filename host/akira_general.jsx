// Sougetsu Akira FX - General tab tools: shape/transform value setter, fill/stroke toggle, true duplicate, extract from pre-comp (clean-room). Batch H.
// Behaviour is our own design built from each button's label. ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    // ---------- helpers ----------
    function hexToRGB(hex) {
        var s = String(hex || "").replace(/^\s+|\s+$/g, "").replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(s)) { return null; }
        return [parseInt(s.substr(0, 2), 16) / 255, parseInt(s.substr(2, 2), 16) / 255, parseInt(s.substr(4, 2), 16) / 255];
    }
    function tryGet(group, names) {          // first property that exists, trying match names then display names
        var i;
        for (i = 0; i < names.length; i += 1) { try { var p = group.property(names[i]); if (p) { return p; } } catch (e) { } }
        return null;
    }
    function ensure(group, names) {          // find it, or add it (dash/gap entries only exist once added)
        var p = tryGet(group, names);
        if (p) { return p; }
        try { return group.addProperty(names[0]); } catch (e) { return null; }
    }
    // gather every stroke / fill / rect / ellipse / group-contents of a shape layer
    function collect(L) {
        var out = { strokes: [], fills: [], rects: [], ellipses: [], contents: [] };
        function walk(contents) {
            var i;
            out.contents.push(contents);
            for (i = 1; i <= contents.numProperties; i += 1) {
                var p = contents.property(i), mn = p.matchName;
                if (mn === "ADBE Vector Graphic - Stroke") { out.strokes.push(p); }
                else if (mn === "ADBE Vector Graphic - Fill") { out.fills.push(p); }
                else if (mn === "ADBE Vector Shape - Rect") { out.rects.push(p); }
                else if (mn === "ADBE Vector Shape - Ellipse") { out.ellipses.push(p); }
                else if (mn === "ADBE Vector Group") { var inner = p.property("ADBE Vectors Group"); if (inner) { walk(inner); } }
            }
        }
        var root = L.property("ADBE Root Vectors Group");
        if (root) { walk(root); }
        return out;
    }
    function shapeLayers(comp) {
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof ShapeLayer) { out.push(sel[i]); } }
        return out;
    }
    function set(p, v, time) { if (p) { H.setProp(p, v, time); return 1; } return 0; }

    // ---------- setNativeTransform("property|axis|value") ----------
    var TRANSFORM = { pos: 1, ap: 1, scale: 1, rot: 1, rotX: 1, rotY: 1, opac: 1 };
    F.setNativeTransform = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var parts = String(arg).split("|"), prop = parts[0], axis = parts[1] || "all", raw = parts.slice(2).join("|");
        if (TRANSFORM[prop]) {
            var r = F.scrubTransform(prop + "|" + axis + "|" + raw);
            return r === "OK" ? "SUCCESS" : r;
        }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var time = comp.time, n = 0, i, k;
        var isColor = (prop === "fillColor" || prop === "strokeColor");
        var rgb = isColor ? hexToRGB(raw) : null, val = parseFloat(raw);
        if (isColor && !rgb) { return "ERR:Invalid color."; }
        if (!isColor && isNaN(val)) { return "ERR:Invalid value."; }
        var layers = isColor ? H.selectedLayers(comp) : shapeLayers(comp);
        if (!layers.length) { return isColor ? "ERR:Select at least one layer." : "ERR:Select a shape layer."; }
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (L instanceof TextLayer && isColor) {      // text: set the character fill / stroke colour
                    var tp = L.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
                    if (prop === "fillColor") { td.fillColor = rgb; td.applyFill = true; } else { td.strokeColor = rgb; td.applyStroke = true; }
                    tp.setValue(td); n += 1; continue;
                }
                if (!(L instanceof ShapeLayer)) { continue; }
                var c = collect(L);
                if (prop === "fillColor") { for (k = 0; k < c.fills.length; k += 1) { n += set(c.fills[k].property("ADBE Vector Fill Color"), [rgb[0], rgb[1], rgb[2], 1], time); } }
                else if (prop === "strokeColor") { for (k = 0; k < c.strokes.length; k += 1) { n += set(c.strokes[k].property("ADBE Vector Stroke Color"), [rgb[0], rgb[1], rgb[2], 1], time); } }
                else if (prop === "strokeWidth") { for (k = 0; k < c.strokes.length; k += 1) { n += set(c.strokes[k].property("ADBE Vector Stroke Width"), val, time); } }
                else if (prop === "lineCap" || prop === "lineJoin") {
                    var mn = prop === "lineCap" ? "ADBE Vector Stroke Line Cap" : "ADBE Vector Stroke Line Join";
                    for (k = 0; k < c.strokes.length; k += 1) { n += set(c.strokes[k].property(mn), Math.max(1, Math.min(3, Math.round(val))), time); }
                }
                else if (prop === "taperStartLen" || prop === "taperEndLen" || prop === "taperStartWidth" || prop === "taperEndWidth") {
                    var names = { taperStartLen: ["ADBE Vector Taper Start Length", "Start Length"], taperEndLen: ["ADBE Vector Taper End Length", "End Length"],
                        taperStartWidth: ["ADBE Vector Taper Start Width", "Start Width"], taperEndWidth: ["ADBE Vector Taper End Width", "End Width"] }[prop];
                    for (k = 0; k < c.strokes.length; k += 1) {
                        var tg = tryGet(c.strokes[k], ["ADBE Vector Stroke Taper", "Taper"]);
                        if (tg) { n += set(tryGet(tg, names), val, time); }
                    }
                }
                else if (prop === "dashSize" || prop === "gapSize" || prop === "dashOffset") {
                    for (k = 0; k < c.strokes.length; k += 1) {
                        var dg = tryGet(c.strokes[k], ["ADBE Vector Stroke Dashes", "Dashes"]);
                        if (!dg) { continue; }
                        if (prop === "dashOffset") { n += set(ensure(dg, ["ADBE Vector Stroke Offset", "Offset"]), val, time); }
                        else {
                            var dash = ensure(dg, ["ADBE Vector Stroke Dash 1", "Dash"]), gap = ensure(dg, ["ADBE Vector Stroke Gap 1", "Gap"]);
                            n += set(prop === "dashSize" ? dash : gap, val, time);
                        }
                    }
                }
                else if (prop === "trimStart" || prop === "trimEnd" || prop === "trimOffset") {
                    var tmn = { trimStart: "ADBE Vector Trim Start", trimEnd: "ADBE Vector Trim End", trimOffset: "ADBE Vector Trim Offset" }[prop];
                    for (k = 0; k < c.contents.length; k += 1) {
                        if (k === 0 && c.contents.length > 1) { continue; }       // trim paths live inside a group, not at the layer root
                        var trim = tryGet(c.contents[k], ["ADBE Vector Filter - Trim"]);
                        if (!trim) { try { trim = c.contents[k].addProperty("ADBE Vector Filter - Trim"); } catch (e1) { trim = null; } }
                        if (trim) { n += set(trim.property(tmn), val, time); }
                    }
                }
                else if (prop === "shapeSize") {
                    var boxes = c.rects.concat(c.ellipses);
                    for (k = 0; k < boxes.length; k += 1) {
                        var sp = tryGet(boxes[k], boxes[k].matchName === "ADBE Vector Shape - Rect" ? ["ADBE Vector Rect Size"] : ["ADBE Vector Ellipse Size"]);
                        if (!sp) { continue; }
                        var cur = sp.valueAtTime(time, false), nv = [cur[0], cur[1]];
                        if (axis === "x") { nv[0] = val; } else if (axis === "y") { nv[1] = val; } else { nv[0] = val; nv[1] = val; }
                        n += set(sp, nv, time);
                    }
                }
                else if (prop === "shapeRoundness") { for (k = 0; k < c.rects.length; k += 1) { n += set(tryGet(c.rects[k], ["ADBE Vector Rect Roundness"]), Math.max(0, val), time); } }
                else { return "ERR:Unknown property: " + prop; }
            }
        } catch (e) { return "ERR:" + e.toString(); }
        return n ? "SUCCESS" : "ERR:Nothing to change on the selected layers.";
    };

    // ---------- toggleShapeAttr("fill" | "stroke"): show/hide every fill or stroke on the selected shape layers ----------
    F.toggleShapeAttr = function (kind) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = shapeLayers(comp), i, k, items = [];
        if (!layers.length) { return "ERR:Select a shape layer."; }
        for (i = 0; i < layers.length; i += 1) {
            var c = collect(layers[i]), list = String(kind) === "stroke" ? c.strokes : c.fills;
            for (k = 0; k < list.length; k += 1) { items.push(list[k]); }
        }
        if (!items.length) { return "ERR:No " + (String(kind) === "stroke" ? "strokes" : "fills") + " found on the selected layers."; }
        var anyOn = false;
        for (i = 0; i < items.length; i += 1) { if (items[i].enabled) { anyOn = true; break; } }
        app.beginUndoGroup("Toggle " + kind);
        try { for (i = 0; i < items.length; i += 1) { items[i].enabled = !anyOn; } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- trueDup: duplicate selected pre-comp layers so the copy has its OWN comp (and nested comps) ----------
    function dupComp(src, map) {
        if (map[src.id]) { return map[src.id]; }
        var d = src.duplicate(); map[src.id] = d;
        var i;
        for (i = 1; i <= d.numLayers; i += 1) {
            var L = d.layer(i);
            if (L.source instanceof CompItem) { L.replaceSource(dupComp(L.source, map), false); }
        }
        return d;
    }
    F.trueDup = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp), todo = [], i;
        for (i = 0; i < sel.length; i += 1) { if (sel[i].source instanceof CompItem) { todo.push(sel[i]); } }
        if (!todo.length) { return "ERR:Select a pre-comp layer first."; }
        var made = [];
        app.beginUndoGroup("True Duplicate");
        try {
            for (i = 0; i < todo.length; i += 1) {
                var copy = todo[i].duplicate();
                copy.replaceSource(dupComp(todo[i].source, {}), false);
                made.push(copy);
            }
            for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
            for (i = 0; i < made.length; i += 1) { made[i].selected = true; }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- unPrecomp: move a pre-comp's layers into the parent comp, keeping position, timing and parenting ----------
    function isIdentity(L, comp, time) {
        var t = L.transform, p = t.position.valueAtTime(time, false), s = t.scale.valueAtTime(time, false), a = t.anchorPoint.valueAtTime(time, false);
        var src = L.source;
        return Math.abs(p[0] - a[0]) < 0.001 && Math.abs(p[1] - a[1]) < 0.001 && Math.abs(s[0] - 100) < 0.001 && Math.abs(s[1] - 100) < 0.001 &&
               Math.abs(t.rotation.valueAtTime(time, false)) < 0.001 && !L.threeDLayer && !L.parent &&
               Math.abs(a[0] - src.width / 2) < 0.001 && Math.abs(a[1] - src.height / 2) < 0.001 && comp.width === src.width && comp.height === src.height;
    }
    F.unPrecomp = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp), todo = [], i, j;
        for (i = 0; i < sel.length; i += 1) { if (sel[i].source instanceof CompItem) { todo.push(sel[i]); } }
        if (!todo.length) { return "ERR:Select a pre-comp layer first."; }
        var time = comp.time, moved = 0, kept = 0;
        app.beginUndoGroup("Extract From Pre-comp");
        try {
            for (i = 0; i < todo.length; i += 1) {
                var pl = todo[i], inner = pl.source, copies = [], holder = null;
                if (inner.numLayers > 0 && typeof inner.layer(1).copyToComp !== "function") { app.endUndoGroup(); return "ERR:This version of After Effects cannot copy layers from a script."; }
                if (!isIdentity(pl, comp, time)) {                  // carry the pre-comp layer's own transform over with a null
                    holder = comp.layers.addNull();
                    holder.name = pl.name + " (transform)";
                    holder.moveBefore(pl);
                    var ht = holder.transform, pt = pl.transform;
                    ht.anchorPoint.setValue(pt.anchorPoint.valueAtTime(time, false));
                    ht.position.setValue(pt.position.valueAtTime(time, false));
                    ht.scale.setValue(pt.scale.valueAtTime(time, false));
                    ht.rotation.setValue(pt.rotation.valueAtTime(time, false));
                    holder.startTime = pl.startTime;
                    if (pl.parent) { holder.parent = pl.parent; }
                }
                for (j = 1; j <= inner.numLayers; j += 1) {        // top to bottom, each lands just above the pre-comp layer
                    var src = inner.layer(j);
                    src.copyToComp(comp);
                    var nl = comp.layer(1);
                    nl.moveBefore(pl);
                    nl.startTime = nl.startTime + pl.startTime;
                    if (nl.inPoint < pl.inPoint) { nl.inPoint = pl.inPoint; }
                    if (nl.outPoint > pl.outPoint) { nl.outPoint = pl.outPoint; }
                    copies.push({ from: src, to: nl });
                }
                for (j = 0; j < copies.length; j += 1) {            // restore parenting among the copies; free layers follow the transform null
                    var par = copies[j].from.parent, target = null, k;
                    if (par) { for (k = 0; k < copies.length; k += 1) { if (copies[k].from === par) { target = copies[k].to; } } }
                    else if (holder) { target = holder; }
                    if (target) { copies[j].to.parent = target; }
                }
                var fx = pl.property("ADBE Effect Parade"), mk = pl.property("ADBE Mask Parade");
                if (pl.adjustmentLayer || (fx && fx.numProperties > 0) || (mk && mk.numProperties > 0)) { pl.enabled = false; kept += 1; }   // its look cannot move into the layers, so keep it (hidden)
                else { pl.remove(); }
                moved += copies.length;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return moved ? "SUCCESS" : "ERR:The pre-comp has no layers.";
    };
})();
