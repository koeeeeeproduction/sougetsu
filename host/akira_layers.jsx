// Sougetsu Akira FX - main layer tools, imports, transform sliders and project helpers (clean-room). Batch D2.
// Behaviour is our own design built from each button's label. ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    // ---------- helpers ----------
    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function byIndex(layers) { layers.sort(function (a, b) { return a.index - b.index; }); return layers; }
    function pad(n, w) { var s = String(n); while (s.length < w) { s = "0" + s; } return s; }
    function walkProps(group, fn) {
        var i;
        for (i = 1; i <= group.numProperties; i += 1) {
            var p = group.property(i);
            if (p.propertyType === PropertyType.PROPERTY) { fn(p); } else { walkProps(p, fn); }
        }
    }
    function importFootage(path) {
        var f = new File(String(path));
        if (!f.exists) { return null; }
        try { return app.project.importFile(new ImportOptions(f)); } catch (e) { return null; }
    }
    function addItemToComp(comp, item) {
        var L = comp.layers.add(item);
        try { L.startTime = comp.time; } catch (e) { }
        return L;
    }

    // ---------- new layers ----------
    F.addCamera = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Add Camera");
        try { comp.layers.addCamera("Camera 1", [comp.width / 2, comp.height / 2]); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // adjustment layer placed above the selection, spanning its in/out points
    F.createAdj = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = byIndex(H.selectedLayers(comp)), i;
        app.beginUndoGroup("Create Adjustment Layer");
        try {
            var L = comp.layers.addSolid([1, 1, 1], "Adjustment Layer", comp.width, comp.height, comp.pixelAspect, comp.duration);
            L.adjustmentLayer = true;
            if (sel.length) {
                var minIn = sel[0].inPoint, maxOut = sel[0].outPoint;
                for (i = 1; i < sel.length; i += 1) { if (sel[i].inPoint < minIn) { minIn = sel[i].inPoint; } if (sel[i].outPoint > maxOut) { maxOut = sel[i].outPoint; } }
                L.moveBefore(sel[0]);
                L.inPoint = minIn; L.outPoint = maxOut;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- selection tools ----------
    F.precompSeparately = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = byIndex(H.selectedLayers(comp)), i, done = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Precompose Separately");
        try {
            for (i = layers.length - 1; i >= 0; i -= 1) {      // bottom first so indices of the others do not shift under us
                comp.layers.precompose([layers[i].index], layers[i].name + " Comp", true);
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Nothing to precompose.";
    };
    // pattern with # for the running number, e.g. "Item_##" -> Item_01, Item_02...
    F.renameSelectedLayers = function (pattern) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = String(pattern || "");
        if (!p.length) { return "ERR:Enter a name pattern."; }
        var layers = byIndex(H.selectedLayers(comp)), i;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var m = /#+/.exec(p);
        app.beginUndoGroup("Rename Layers");
        try {
            for (i = 0; i < layers.length; i += 1) {
                if (m) { layers[i].name = p.replace(/#+/, pad(i + 1, m[0].length)); }
                else { layers[i].name = layers.length > 1 ? p + " " + (i + 1) : p; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // each layer starts N frames after the one above it
    F.staggerSelectedLayers = function (frames) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var n = parseFloat(frames);
        if (isNaN(n)) { return "ERR:Enter the number of frames."; }
        var layers = byIndex(H.selectedLayers(comp)), i;
        if (layers.length < 2) { return "ERR:Select at least two layers."; }
        app.beginUndoGroup("Stagger Layers");
        try { for (i = 0; i < layers.length; i += 1) { layers[i].startTime = layers[i].startTime + i * n * comp.frameDuration; } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.splitLayers = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp), t = comp.time, i, done = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Split Layers");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (t > L.inPoint && t < L.outPoint) {
                    var d = L.duplicate();
                    L.outPoint = t;
                    d.inPoint = t;
                    done += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Move the playhead inside a selected layer first.";
    };
    F.splitMasksToLayers = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp);
        if (sel.length !== 1) { return "ERR:Select exactly one layer."; }
        var L = sel[0], masks = L.property("ADBE Mask Parade"), n = masks ? masks.numProperties : 0, j, k;
        if (n < 2) { return "ERR:The layer needs at least two masks."; }
        app.beginUndoGroup("Split Masks To Layers");
        try {
            var names = [];
            for (j = 1; j <= n; j += 1) { names.push(masks.property(j).name); }
            for (j = 1; j <= n; j += 1) {
                var D = L.duplicate(), dm = D.property("ADBE Mask Parade");
                for (k = n; k >= 1; k -= 1) { if (k !== j) { dm.property(k).remove(); } }
                D.name = L.name + " - " + names[j - 1];
            }
            L.remove();
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.splitShapeGroupsToLayers = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp);
        if (sel.length !== 1 || !(sel[0] instanceof ShapeLayer)) { return "ERR:Select exactly one shape layer."; }
        var L = sel[0], root = L.property("ADBE Root Vectors Group"), idx = [], names = [], i, j, k;
        for (i = 1; i <= root.numProperties; i += 1) { if (root.property(i).matchName === "ADBE Vector Group") { idx.push(i); names.push(root.property(i).name); } }
        if (idx.length < 2) { return "ERR:The shape layer needs at least two groups."; }
        app.beginUndoGroup("Split Shape Groups To Layers");
        try {
            for (j = 0; j < idx.length; j += 1) {
                var D = L.duplicate(), dr = D.property("ADBE Root Vectors Group");
                for (k = idx.length - 1; k >= 0; k -= 1) { if (k !== j) { dr.property(idx[k]).remove(); } }
                D.name = L.name + " - " + names[j];
            }
            L.remove();
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- expressions ----------
    function targetProps(comp, withExpression) {
        var out = [], sp = comp.selectedProperties, i;
        for (i = 0; i < sp.length; i += 1) {
            if (sp[i].propertyType === PropertyType.PROPERTY) { out.push(sp[i]); }
        }
        if (!out.length) {
            var layers = H.selectedLayers(comp);
            for (i = 0; i < layers.length; i += 1) { walkProps(layers[i], function (p) { out.push(p); }); }
        }
        var res = [];
        for (i = 0; i < out.length; i += 1) {
            if (!withExpression || (out[i].canSetExpression && out[i].expression && out[i].expression.length && out[i].expressionEnabled)) { res.push(out[i]); }
        }
        return res;
    }
    F.deleteSelectedExpressions = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var props = targetProps(comp, true), i;
        if (!props.length) { return "ERR:No expressions found on the selection."; }
        app.beginUndoGroup("Remove Expressions");
        try { for (i = 0; i < props.length; i += 1) { props[i].expression = ""; } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function sampleTimes(comp) {
        var out = [], t0 = comp.workAreaStart, n = Math.max(1, Math.round(comp.workAreaDuration / comp.frameDuration)), i;
        for (i = 0; i <= n; i += 1) { out.push(Math.min(t0 + i * comp.frameDuration, comp.duration)); }
        return out;
    }
    function sampleValues(p, times) {
        var v = [], i;
        for (i = 0; i < times.length; i += 1) { v.push(p.valueAtTime(times[i], false)); }
        return v;
    }
    function maxDiff(a, b) {
        if (typeof a === "number") { return Math.abs(a - b); }
        var m = 0, i;
        for (i = 0; i < a.length; i += 1) { var d = Math.abs(a[i] - b[i]); if (d > m) { m = d; } }
        return m;
    }
    function lerp(a, b, f) {
        if (typeof a === "number") { return a + (b - a) * f; }
        var out = [], i;
        for (i = 0; i < a.length; i += 1) { out.push(a[i] + (b[i] - a[i]) * f); }
        return out;
    }
    F.bakeSelectedExpressions = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var props = targetProps(comp, true), i, j;
        if (!props.length) { return "ERR:No expressions found on the selection."; }
        var times = sampleTimes(comp);
        app.beginUndoGroup("Bake Expressions");
        try {
            for (i = 0; i < props.length; i += 1) {
                var vals = sampleValues(props[i], times);
                props[i].expression = "";
                for (j = 0; j < times.length; j += 1) { props[i].setValueAtTime(times[j], vals[j]); }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // keeps only the keyframes needed to stay within `tolerance` of the baked curve; returns JSON
    F.bakeExpressionsSmart = function (tolerance) {
        var g = H.locked(); if (g) { return '{"success":false,"error":' + jsonStr(g.replace(/^ERR:/, "")) + "}"; }
        var comp = H.activeComp();
        if (!comp) { return '{"success":false,"error":"Open a composition first."}'; }
        var tol = parseFloat(tolerance); if (isNaN(tol) || tol < 0) { tol = 0.5; }
        var props = targetProps(comp, true), i, j, k, created = 0, total = 0;
        if (!props.length) { return '{"success":false,"error":"No expressions found on the selection."}'; }
        var times = sampleTimes(comp);
        app.beginUndoGroup("Bake Expressions (Smart)");
        try {
            for (i = 0; i < props.length; i += 1) {
                var vals = sampleValues(props[i], times), keep = [0], start = 0, n = vals.length;
                for (j = 2; j < n; j += 1) {
                    var bad = false;
                    for (k = start + 1; k < j; k += 1) {
                        var f = (times[k] - times[start]) / (times[j] - times[start]);
                        if (maxDiff(vals[k], lerp(vals[start], vals[j], f)) > tol) { bad = true; break; }
                    }
                    if (bad) { keep.push(j - 1); start = j - 1; }
                }
                if (n > 1) { keep.push(n - 1); }
                props[i].expression = "";
                for (j = 0; j < keep.length; j += 1) { props[i].setValueAtTime(times[keep[j]], vals[keep[j]]); }
                created += keep.length; total += n;
            }
        } catch (e) { app.endUndoGroup(); return '{"success":false,"error":' + jsonStr(e.toString()) + "}"; }
        app.endUndoGroup();
        return '{"success":true,"keyframesCreated":' + created + ',"totalFrames":' + total + "}";
    };

    // ---------- imports ----------
    F.importFileJSX = function (path) {
        var g = H.locked(); if (g) { return g; }
        app.beginUndoGroup("Import File");
        var item = importFootage(path);
        app.endUndoGroup();
        return item ? "OK" : "ERR:Failed to import file: " + String(path);
    };
    // import a media file and drop it into the active comp at the playhead
    F.importReference = function (path) {
        var g = H.locked(); if (g) { return g; }
        app.beginUndoGroup("Import Reference");
        var item = importFootage(path);
        if (!item) { app.endUndoGroup(); return "ERR:Failed to import file: " + String(path); }
        var comp = H.activeComp();
        try { if (comp) { addItemToComp(comp, item); } } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.importImageToAe = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Import Image");
        var item = importFootage(path);
        if (!item) { app.endUndoGroup(); return "ERR:Failed to import file: " + String(path); }
        try { var L = addItemToComp(comp, item); L.transform.position.setValue([comp.width / 2, comp.height / 2]); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.browseForMedia = function () {
        var f = File.openDialog("Choose a media file");
        return f ? f.fsName : "";
    };
    F.getSelectedLayerPath = function () {
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp);
        if (!sel.length) { return "ERR:Select a footage layer."; }
        var L = sel[0];
        return (L.source && L.source.file) ? L.source.file.fsName : "ERR:The selected layer has no source file.";
    };
    // arg: replacementPath, duplicateLayer(bool), hideOriginal(bool), originalPath
    F.replaceSelectedLayerSource = function (path, dup, hide) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = H.selectedLayers(comp);
        if (!sel.length) { return "ERR:Select a layer first."; }
        app.beginUndoGroup("Replace Layer Source");
        try {
            var item = importFootage(path);
            if (!item) { app.endUndoGroup(); return "ERR:Failed to import file: " + String(path); }
            var L = sel[0], target = (dup === true || String(dup) === "true") ? L.duplicate() : L;
            target.replaceSource(item, true);
            if (target !== L && (hide === true || String(hide) === "true")) { L.enabled = false; }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.purge = function () {
        try { app.purge(PurgeTarget.ALL_CACHES); } catch (e) { return "ERR:" + e.toString(); }
        return "SUCCESS";
    };

    // ---------- comp settings ----------
    // arg: "fps" or "fps|durationSeconds" (either side may be empty)
    F.setCompSettings = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg || "").split("|"), fps = parseFloat(parts[0]), dur = parts.length > 1 ? parseFloat(parts[1]) : NaN;
        if (isNaN(fps) && isNaN(dur)) { return "ERR:Enter a frame rate or a duration."; }
        app.beginUndoGroup("Comp Settings");
        try {
            if (!isNaN(fps) && fps > 0) { comp.frameRate = fps; }
            if (!isNaN(dur) && dur > 0) { comp.duration = dur; }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function shiftPos(L, dx, dy) {
        var t = L.transform, p = t.position;
        if (p.dimensionsSeparated) {
            var xs = [t.xPosition, t.yPosition], ds = [dx, dy], a, k;
            for (a = 0; a < 2; a += 1) {
                if (xs[a].numKeys > 0) { for (k = 1; k <= xs[a].numKeys; k += 1) { xs[a].setValueAtKey(k, xs[a].keyValue(k) - ds[a]); } }
                else { xs[a].setValue(xs[a].value - ds[a]); }
            }
            return;
        }
        var i, v;
        if (p.numKeys > 0) {
            for (i = 1; i <= p.numKeys; i += 1) { v = p.keyValue(i); v[0] -= dx; v[1] -= dy; p.setValueAtKey(i, v); }
        } else { v = p.value; v[0] -= dx; v[1] -= dy; p.setValue(v); }
    }
    // "Comp Cutter": crop the comp to the bounds of its (unparented) layers at the playhead
    F.cropCompToContent = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var i, c, time = comp.time, minX = 1e12, minY = 1e12, maxX = -1e12, maxY = -1e12, any = false, layers = [];
        for (i = 1; i <= comp.numLayers; i += 1) { layers.push(comp.layer(i)); }
        for (i = 0; i < layers.length; i += 1) {
            var L = layers[i];
            if (H.isCamOrLight(L) || L.parent || !L.enabled || L.adjustmentLayer) { continue; }
            var r = H.sourceRect(L, time);
            if (!r) { continue; }
            var pos = H.getPos(L, time), corners = [[r.left, r.top], [r.left + r.width, r.top], [r.left, r.top + r.height], [r.left + r.width, r.top + r.height]];
            for (c = 0; c < 4; c += 1) {
                var o = H.offsetFromAnchor(L, corners[c], time), x = pos[0] + o[0], y = pos[1] + o[1];
                if (x < minX) { minX = x; } if (x > maxX) { maxX = x; } if (y < minY) { minY = y; } if (y > maxY) { maxY = y; }
            }
            any = true;
        }
        if (!any) { return "ERR:No visible layers to crop to."; }
        var w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
        if (w < 4) { w = 4; } if (h < 4) { h = 4; }
        if (w > 30000 || h > 30000) { return "ERR:The content is larger than the maximum comp size."; }
        app.beginUndoGroup("Crop Comp To Content");
        try {
            for (i = 0; i < layers.length; i += 1) { if (!layers[i].parent) { shiftPos(layers[i], minX, minY); } }
            comp.width = w; comp.height = h;
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- transform sliders: "prop|axis|value" sets an absolute value on the selected layers ----------
    function setTransform(prop, axis, val, comp) {
        var layers = H.selectedLayers(comp), i, done = 0, time = comp.time;
        for (i = 0; i < layers.length; i += 1) {
            var L = layers[i], t = L.transform;
            if (H.isCamOrLight(L) && prop !== "pos" && prop !== "rot") { continue; }
            if (prop === "pos") {
                var p = H.getPos(L, time), np = [p[0], p[1]]; if (p.length > 2) { np.push(p[2]); }
                if (axis === "x" || axis === "all") { np[0] = val; }
                if (axis === "y" || axis === "all") { np[1] = val; }
                if (axis === "z" && np.length > 2) { np[2] = val; }
                H.setPos(L, np, time);
            } else if (prop === "ap") {
                var a = t.anchorPoint.valueAtTime(time, false), na = [a[0], a[1]]; if (a.length > 2) { na.push(a[2]); }
                if (axis === "x" || axis === "all") { na[0] = val; }
                if (axis === "y" || axis === "all") { na[1] = val; }
                if (axis === "z" && na.length > 2) { na[2] = val; }
                H.setProp(t.anchorPoint, na, time);
            } else if (prop === "scale") {
                var s = t.scale.valueAtTime(time, false), ns = [s[0], s[1]]; if (s.length > 2) { ns.push(s[2]); }
                if (axis === "x") { ns[0] = val; } else if (axis === "y") { ns[1] = val; } else if (axis === "z" && ns.length > 2) { ns[2] = val; }
                else { ns[0] = val; ns[1] = val; if (ns.length > 2) { ns[2] = val; } }   // "all" / "linked"
                H.setProp(t.scale, ns, time);
            } else if (prop === "rot") { H.setProp(L.threeDLayer ? t.zRotation : t.rotation, val, time); }
            else if (prop === "rotX" && L.threeDLayer) { H.setProp(t.xRotation, val, time); }
            else if (prop === "rotY" && L.threeDLayer) { H.setProp(t.yRotation, val, time); }
            else if (prop === "opac") { H.setProp(t.opacity, val, time); }
            else { continue; }
            done += 1;
        }
        return done;
    }
    F.scrubTransform = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = String(arg).split("|"), val = parseFloat(p[2]);
        if (isNaN(val)) { return "ERR:Invalid value."; }
        try { return setTransform(p[0], p[1] || "all", val, comp) ? "OK" : "ERR:Nothing to change."; }
        catch (e) { return "ERR:" + e.toString(); }
    };
    F.finalizeScrub = F.scrubTransform;
    // "pos|x|y;scale|x|y;rot|v;rotX|v;rotY|v;opac|v" restores a whole transform state
    F.applyTransformState = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var segs = String(arg).split(";"), i, done = 0;
        app.beginUndoGroup("Restore Transform");
        try {
            for (i = 0; i < segs.length; i += 1) {
                var p = segs[i].split("|"), k = p[0], a = parseFloat(p[1]), b = parseFloat(p[2]);
                if (isNaN(a)) { continue; }
                if (k === "pos" || k === "scale" || k === "ap") {
                    if (!isNaN(b)) { done += setTransform(k, "x", a, comp) + setTransform(k, "y", b, comp); } else { done += setTransform(k, "all", a, comp); }
                } else { done += setTransform(k, "all", a, comp); }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Nothing to restore.";
    };

    // ---------- fonts + project organizer ----------
    F.getSystemFonts = function () {
        var names = [], seen = {}, i, j;
        try {
            var all = app.fonts.allFonts;
            for (i = 0; i < all.length; i += 1) {
                var fam = all[i];
                for (j = 0; j < fam.length; j += 1) {
                    var ps = fam[j].postScriptName;
                    if (ps && !seen[ps]) { seen[ps] = true; names.push(ps); }
                }
            }
        } catch (e) { return "[]"; }
        names.sort();
        var out = [];
        for (i = 0; i < names.length; i += 1) { out.push(jsonStr(names[i])); }
        return "[" + out.join(",") + "]";
    };
    // "sortAssets|cleanGuides|cleanDisabled|cleanEmptyText|normalizeComps|duration|fps|alignWorkarea" (flags are "true"/"false")
    F.organizeProject = function (arg) {
        var g = H.locked(); if (g) { return g; }
        if (!app.project) { return "ERR:No project is open."; }
        var p = String(arg).split("|"), on = function (i) { return String(p[i]) === "true"; };
        var sortAssets = on(0), cleanDisabled = on(2), cleanEmptyText = on(3), normalize = on(4), align = on(7);
        var dur = parseFloat(p[5]), fps = parseFloat(p[6]), moved = 0, removedDisabled = 0, removedText = 0, normalized = 0, i, j;
        app.beginUndoGroup("Organize Project");
        try {
            var proj = app.project;
            if (sortAssets) {
                var buckets = {}, folderFor = function (nm) {
                    if (buckets[nm]) { return buckets[nm]; }
                    var k, f = null;
                    for (k = 1; k <= proj.numItems; k += 1) { if (proj.item(k) instanceof FolderItem && proj.item(k).name === nm && proj.item(k).parentFolder === proj.rootFolder) { f = proj.item(k); break; } }
                    buckets[nm] = f || proj.items.addFolder(nm);
                    return buckets[nm];
                };
                var rootItems = [];
                for (i = 1; i <= proj.numItems; i += 1) { if (proj.item(i).parentFolder === proj.rootFolder && !(proj.item(i) instanceof FolderItem)) { rootItems.push(proj.item(i)); } }
                for (i = 0; i < rootItems.length; i += 1) {
                    var it = rootItems[i], name;
                    if (it instanceof CompItem) { name = "Comps"; }
                    else if (it.mainSource && (it.mainSource instanceof SolidSource)) { name = "Solids"; }
                    else if (it.hasVideo === false && it.hasAudio) { name = "Audio"; }
                    else { name = "Footage"; }
                    it.parentFolder = folderFor(name); moved += 1;
                }
            }
            for (i = 1; i <= proj.numItems; i += 1) {
                var item = proj.item(i);
                if (!(item instanceof CompItem)) { continue; }
                if (cleanDisabled || cleanEmptyText) {
                    for (j = item.numLayers; j >= 1; j -= 1) {
                        var L = item.layer(j);
                        if (cleanDisabled && L.enabled === false) { L.remove(); removedDisabled += 1; continue; }
                        if (cleanEmptyText && (L instanceof TextLayer)) {
                            var td = L.property("ADBE Text Properties").property("ADBE Text Document").value;
                            if (String(td.text).replace(/\s+/g, "") === "") { L.remove(); removedText += 1; }
                        }
                    }
                }
                if (normalize) {
                    if (!isNaN(fps) && fps > 0) { item.frameRate = fps; }
                    if (!isNaN(dur) && dur > 0) { item.duration = dur; }
                    normalized += 1;
                }
                if (align) { item.workAreaStart = 0; item.workAreaDuration = item.duration; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "Organized: " + moved + " item(s) sorted, " + removedDisabled + " disabled layer(s) and " + removedText + " empty text layer(s) removed, " + normalized + " comp(s) normalized.";
    };
})();
