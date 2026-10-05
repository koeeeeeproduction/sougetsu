// Sougetsu Akira FX - expressions, text animators and bulk tools (clean-room). Batch E.
// These are GLOBAL functions: the panel calls them directly, e.g. evalScript('applyExpressionToTargets("...", "animator", "Name", {...})').
// They answer with a JSON string, {"success":true,...} or {"success":false,"error":"..."}.
// ES3 only: no let/const, arrow functions, JSON, Array.indexOf/forEach.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var G = $.global, F = $._flex, H = F._h;
    if (!H) { return; }

    // ---------- tiny JSON helpers (ExtendScript has none) ----------
    function J(v) {
        var t = typeof v, i, out, k;
        if (v === null || v === undefined) { return "null"; }
        if (t === "number") { return isFinite(v) ? String(v) : "null"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"'; }
        if (v instanceof Array) { out = []; for (i = 0; i < v.length; i += 1) { out.push(J(v[i])); } return "[" + out.join(",") + "]"; }
        out = [];
        for (k in v) { if (v.hasOwnProperty(k) && typeof v[k] !== "function") { out.push(J(k) + ":" + J(v[k])); } }
        return "{" + out.join(",") + "}";
    }
    function parseJSON(text) {
        if (typeof text !== "string") { return text; }
        var s = String(text);
        var probe = s.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, "");
        if (!/^[\],:{}\s]*$/.test(probe)) { return null; }
        try { return eval("(" + s + ")"); } catch (e) { return null; }
    }
    function ok(extra) { var o = { success: true }, k; if (extra) { for (k in extra) { if (extra.hasOwnProperty(k)) { o[k] = extra[k]; } } } return J(o); }
    function fail(msg) { return J({ success: false, error: String(msg) }); }
    function locked() { return F.isLocked ? fail("Extension is locked. Enter your license key.") : null; }

    // ---------- property helpers ----------
    function layerType(L) {
        if (L instanceof TextLayer) { return "text"; }
        if (L instanceof ShapeLayer) { return "shape"; }
        if (L instanceof CameraLayer) { return "camera"; }
        if (L instanceof LightLayer) { return "light"; }
        if (L.adjustmentLayer) { return "adjustment"; }
        if (L.nullLayer) { return "null"; }
        try {
            if (L.source instanceof CompItem) { return "precomp"; }
            if (L.source && L.source.mainSource instanceof SolidSource) { return "solid"; }
        } catch (e) { }
        return "footage";
    }
    function walk(group, fn, path) {
        var i;
        for (i = 1; i <= group.numProperties; i += 1) {
            var p = group.property(i), pp = (path ? path + "|" : "") + p.matchName;
            if (p.propertyType === PropertyType.PROPERTY) { fn(p, pp); } else { walk(p, fn, pp); }
        }
    }
    function propByPath(layer, path) {
        var parts = String(path).split("|"), cur = layer, i;
        for (i = 0; i < parts.length; i += 1) {
            if (!cur) { return null; }
            try { cur = cur.property(parts[i]); } catch (e) { return null; }
        }
        return cur && cur.propertyType === PropertyType.PROPERTY ? cur : null;
    }
    function findPropertyByName(layer, name) {   // "position", "Position", "ADBE Position", or an effect property by display name
        var key = String(name).toLowerCase().replace(/[^a-z0-9]/g, ""), t = layer.transform, found = null;
        var map = { position: t.position, scale: t.scale, rotation: (layer.threeDLayer ? t.zRotation : t.rotation), opacity: t.opacity, anchor: t.anchorPoint, anchorpoint: t.anchorPoint };
        if (map[key]) { return map[key]; }
        walk(layer, function (p) { if (!found && (p.matchName === name || String(p.name).toLowerCase().replace(/[^a-z0-9]/g, "") === key)) { found = p; } });
        return found;
    }
    function allLayers(comp) { var out = [], i; for (i = 1; i <= comp.numLayers; i += 1) { out.push(comp.layer(i)); } return out; }
    function allComps() {
        var out = [], i, p = app.project;
        for (i = 1; i <= p.numItems; i += 1) { if (p.item(i) instanceof CompItem) { out.push(p.item(i)); } }
        return out;
    }
    function compsFor(scope) { if (String(scope) === "project") { return allComps(); } var c = H.activeComp(); return c ? [c] : []; }
    function setExpr(p, code) {
        if (!p || !p.canSetExpression) { return false; }
        try { p.expression = code; return true; } catch (e) { return false; }
    }

    // ---------- text animators (the 26 text animation cards) ----------
    var ANIM_PROPS = {
        opacity: "ADBE Text Opacity", position: "ADBE Text Position 3D", scale: "ADBE Text Scale 3D", rotation: "ADBE Text Rotation",
        rotationx: "ADBE Text Rotation X", rotationy: "ADBE Text Rotation Y", tracking: "ADBE Text Tracking Amount", skew: "ADBE Text Skew",
        anchor: "ADBE Text Anchor Point 3D", blur: "ADBE Text Blur", fill: "ADBE Text Fill Color", chr: "ADBE Text Character Offset"
    };
    function animValue(type, v) {
        if (type === "position" || type === "anchor") { return [v[0], v[1], v.length > 2 ? v[2] : 0]; }
        if (type === "scale") { return (v instanceof Array) ? [v[0], v[1], v.length > 2 ? v[2] : 100] : [v, v, 100]; }
        if (type === "blur") { return (v instanceof Array) ? [v[0], v[1]] : [v, v]; }
        if (type === "fill") { return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
        return v;
    }
    function addAnimator(layer, code, name, settings) {
        var group = layer.property("ADBE Text Properties").property("ADBE Text Animators");
        var an = group.addProperty("ADBE Text Animator");
        an.name = name;
        var pr = an.property("ADBE Text Animator Properties"), props = (settings && settings.props) || [], i;
        for (i = 0; i < props.length; i += 1) {
            var type = String(props[i].type).toLowerCase(), mn = ANIM_PROPS[type];
            if (!mn) { continue; }
            var q = null;
            try { q = pr.addProperty(mn); } catch (e1) { q = null; }
            if (q) { try { q.setValue(animValue(type, props[i].value)); } catch (e2) { } }
        }
        var ss = an.property("ADBE Text Selectors");
        while (ss.numProperties > 0) { try { ss.property(1).remove(); } catch (e3) { break; } }
        var se = ss.addProperty("ADBE Text Expressible Selector");
        var based = (settings && settings.basedOn >= 1 && settings.basedOn <= 4) ? settings.basedOn : 1;
        try { se.property("ADBE Text Range Type2").setValue(based); } catch (e4) { }
        var amt = se.property("ADBE Text Expressible Amount");
        amt.expression = code;
        return an;
    }
    // targets: comma list of Position, Scale, Rotation, Opacity, SourceText, Color, Zoom, animator
    G.applyExpressionToTargets = function (code, targets, name, settings) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return fail("Select at least one layer first."); }
        code = String(code); name = String(name || "Expression");
        if (typeof settings === "string") { settings = parseJSON(settings); }
        var list = String(targets).split(","), count = 0, i, j, wantsAnimator = false, textSeen = false;
        app.beginUndoGroup(name);
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], t = L.transform;
                for (j = 0; j < list.length; j += 1) {
                    var tg = String(list[j]).toLowerCase();
                    if (tg === "animator") {
                        wantsAnimator = true;
                        if (L instanceof TextLayer) { textSeen = true; addAnimator(L, code, name, settings); count += 1; }
                    } else if (tg === "position") {
                        if (t.position.dimensionsSeparated) { if (setExpr(t.xPosition, code)) { count += 1; } if (setExpr(t.yPosition, code)) { count += 1; } }
                        else if (setExpr(t.position, code)) { count += 1; }
                    } else if (tg === "scale") { if (setExpr(t.scale, code)) { count += 1; } }
                    else if (tg === "rotation") { if (setExpr(L.threeDLayer ? t.zRotation : t.rotation, code)) { count += 1; } }
                    else if (tg === "opacity") { if (setExpr(t.opacity, code)) { count += 1; } }
                    else if (tg === "sourcetext") {
                        if (L instanceof TextLayer && setExpr(L.property("ADBE Text Properties").property("ADBE Text Document"), code)) { count += 1; }
                    } else if (tg === "zoom") {
                        if (L instanceof CameraLayer) { try { if (setExpr(L.property("ADBE Camera Options Group").property("ADBE Camera Zoom"), code)) { count += 1; } } catch (e0) { } }
                    } else if (tg === "color") {
                        var colorProp = null;
                        if (L instanceof ShapeLayer) { walk(L, function (p) { if (!colorProp && p.matchName === "ADBE Vector Fill Color") { colorProp = p; } }); }
                        if (colorProp && setExpr(colorProp, code)) { count += 1; }
                    }
                }
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        if (wantsAnimator && !textSeen && count === 0) { return fail("Select a text layer first."); }
        return count ? ok({ count: count }) : fail("No matching property accepted the expression.");
    };

    // ---------- applying expressions to selected properties ----------
    G.smartApplyExpression = function (code, append) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var props = comp.selectedProperties, i, count = 0;
        var real = [];
        for (i = 0; i < props.length; i += 1) { if (props[i].propertyType === PropertyType.PROPERTY) { real.push(props[i]); } }
        if (!real.length) { return fail("No properties selected"); }
        app.beginUndoGroup("Apply Expression");
        try { for (i = 0; i < real.length; i += 1) { if (setExpr(real[i], String(code))) { count += 1; } } }
        catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ count: count });
    };
    // the selected property, applied to the same property on every layer of the comp
    G.applyExpressionToAll = function (code) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var sel = comp.selectedProperties, i, j, paths = [];
        for (i = 0; i < sel.length; i += 1) {
            if (sel[i].propertyType !== PropertyType.PROPERTY) { continue; }
            var chain = [], n = sel[i], d;
            for (d = sel[i].propertyDepth; d > 0; d -= 1) { chain.unshift(n.matchName); n = n.parentProperty; }
            paths.push(chain.join("|"));
        }
        if (!paths.length) { return fail("No properties selected"); }
        var layers = allLayers(comp), count = 0;
        app.beginUndoGroup("Apply Expression To All");
        try {
            for (i = 0; i < layers.length; i += 1) { for (j = 0; j < paths.length; j += 1) { if (setExpr(propByPath(layers[i], paths[j]), String(code))) { count += 1; } } }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ count: count });
    };

    // ---------- bulk paste ----------
    function layerEntry(L, comp, ci) { return { index: L.index, name: L.name, type: layerType(L), compName: comp.name, compIndex: ci }; }
    function collect(comps, filter) {
        var out = [], i, j;
        for (i = 0; i < comps.length; i += 1) {
            var ls = allLayers(comps[i]);
            for (j = 0; j < ls.length; j += 1) { if (!filter || filter === "all" || layerType(ls[j]) === filter) { out.push(layerEntry(ls[j], comps[i], i)); } }
        }
        return out;
    }
    G.getLayersByType = function (filter) {
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        return ok({ layers: collect([comp], String(filter || "all")) });
    };
    G.getAllLayersFromAllComps = function (filter) { return ok({ layers: collect(allComps(), String(filter || "all")) }); };
    function bulkApply(entries, property, code) {
        var applied = 0, failed = 0, i;
        for (i = 0; i < entries.length; i += 1) {
            var e = entries[i], comp = e.comp, L = null;
            try { L = comp.layer(e.index); } catch (x) { L = null; }
            var p = L ? findPropertyByName(L, property) : null;
            if (p && setExpr(p, String(code))) { applied += 1; } else { failed += 1; }
        }
        return { applied: applied, failed: failed, total: entries.length };
    }
    G.bulkApplyExpression = function (indices, property, code) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var idx = parseJSON(indices), entries = [], i;
        if (!(idx instanceof Array) || !idx.length) { return fail("No layers selected"); }
        for (i = 0; i < idx.length; i += 1) { entries.push({ comp: comp, index: parseInt(idx[i], 10) }); }
        app.beginUndoGroup("Bulk Apply Expression");
        var r;
        try { r = bulkApply(entries, property, code); } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok(r);
    };
    G.bulkApplyExpressionAllComps = function (layerData, property, code) {
        var g = locked(); if (g) { return g; }
        var data = parseJSON(layerData), entries = [], comps = allComps(), i, j;
        if (!(data instanceof Array) || !data.length) { return fail("No layers selected"); }
        for (i = 0; i < data.length; i += 1) {
            var c = null;
            for (j = 0; j < comps.length; j += 1) { if (comps[j].name === data[i].compName) { c = comps[j]; break; } }
            if (!c && typeof data[i].compIndex === "number") { c = comps[data[i].compIndex] || null; }
            if (c) { entries.push({ comp: c, index: parseInt(data[i].index, 10) }); }
        }
        if (!entries.length) { return fail("Could not find the selected layers."); }
        app.beginUndoGroup("Bulk Apply Expression");
        var r;
        try { r = bulkApply(entries, property, code); } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok(r);
    };

    // ---------- expression manager: scan / enable / disable / delete / jump / edit ----------
    G.__akiraExprScan = [];
    G.scanAllExpressions = function (scope) {
        var comps = compsFor(scope), out = [], cache = [], ci, li;
        if (!comps.length) { return fail("No active composition"); }
        for (ci = 0; ci < comps.length; ci += 1) {
            var ls = allLayers(comps[ci]);
            for (li = 0; li < ls.length; li += 1) {
                (function (L, comp) {
                    walk(L, function (p, path) {
                        var code = "";
                        try { if (p.canSetExpression) { code = p.expression; } } catch (e) { code = ""; }
                        if (!code || !code.length) { return; }
                        var err = ""; try { err = p.expressionError || ""; } catch (e2) { err = ""; }
                        var enabled = true; try { enabled = p.expressionEnabled; } catch (e3) { }
                        var status = err ? "error" : (enabled ? "valid" : "warning");
                        var id = cache.length + 1;
                        cache.push({ prop: p });
                        var rec = { id: id, comp: comp.name, layer: L.name, property: p.name, propertyPath: path, code: code, status: status, health: err ? 0 : (enabled ? 100 : 60) };
                        if (err) { rec.error = err; } else if (!enabled) { rec.error = "Expression is disabled"; }
                        out.push(rec);
                    });
                })(ls[li], comps[ci]);
            }
        }
        G.__akiraExprScan = cache;
        return ok({ expressions: out });
    };
    function fromCache(ids) {
        var arr = parseJSON(ids), out = [], i;
        if (!(arr instanceof Array)) { arr = (ids instanceof Array) ? ids : []; }
        for (i = 0; i < arr.length; i += 1) { var rec = G.__akiraExprScan[parseInt(arr[i], 10) - 1]; if (rec) { out.push(rec.prop); } }
        return out;
    }
    G.bulkExpressionAction = function (action, ids) {
        var g = locked(); if (g) { return g; }
        var props = fromCache(ids), i, n = 0, text = [];
        if (!props.length) { return fail("Run a scan first, then select expressions."); }
        action = String(action);
        app.beginUndoGroup("Expression " + action);
        try {
            for (i = 0; i < props.length; i += 1) {
                try {
                    if (action === "enable") { props[i].expressionEnabled = true; n += 1; }
                    else if (action === "disable") { props[i].expressionEnabled = false; n += 1; }
                    else if (action === "delete") { props[i].expression = ""; n += 1; }
                    else if (action === "copy") { text.push(props[i].expression); n += 1; }
                } catch (ep) { }
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ processed: n, text: text.join("\n\n") });
    };
    G.toggleAllExpressions = function (scope, enabled) {
        var g = locked(); if (g) { return g; }
        var comps = compsFor(scope), ci, li, count = 0, on = (enabled === true || String(enabled) === "true");
        if (!comps.length) { return fail("No active composition"); }
        app.beginUndoGroup(on ? "Enable Expressions" : "Disable Expressions");
        try {
            for (ci = 0; ci < comps.length; ci += 1) {
                var ls = allLayers(comps[ci]);
                for (li = 0; li < ls.length; li += 1) {
                    walk(ls[li], function (p) {
                        try { if (p.canSetExpression && p.expression && p.expression.length) { p.expressionEnabled = on; count += 1; } } catch (e) { }
                    });
                }
            }
        } catch (e2) { app.endUndoGroup(); return fail(e2.toString()); }
        app.endUndoGroup();
        return ok({ count: count });
    };
    function findLayer(compName, layerName) {
        var comps = allComps(), i, j;
        for (i = 0; i < comps.length; i += 1) {
            if (comps[i].name !== compName) { continue; }
            for (j = 1; j <= comps[i].numLayers; j += 1) { if (comps[i].layer(j).name === layerName) { return { comp: comps[i], layer: comps[i].layer(j) }; } }
        }
        return null;
    }
    G.updateExpression = function (compName, layerName, path, code) {
        var g = locked(); if (g) { return g; }
        var hit = findLayer(String(compName), String(layerName));
        if (!hit) { return fail("Layer not found."); }
        var p = propByPath(hit.layer, path);
        if (!p) { p = findPropertyByName(hit.layer, path); }
        if (!p) { return fail("Property not found."); }
        app.beginUndoGroup("Update Expression");
        try { p.expression = String(code); } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({});
    };
    G.jumpToExpression = function (compName, layerName, path) {
        var hit = findLayer(String(compName), String(layerName));
        if (!hit) { return fail("Layer not found."); }
        try { hit.comp.openInViewer(); } catch (e) { }
        var sel = hit.comp.selectedLayers, i, found = false;
        for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
        hit.layer.selected = true;
        var p = propByPath(hit.layer, path) || findPropertyByName(hit.layer, path);
        if (p) { try { p.selected = true; found = true; } catch (e2) { } }
        return ok({ propertyFound: found });
    };
    G.freezeExpressionAtTime = function () {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var props = comp.selectedProperties, targets = [], i;
        for (i = 0; i < props.length; i += 1) { if (props[i].propertyType === PropertyType.PROPERTY && props[i].canSetExpression && props[i].expression && props[i].expression.length) { targets.push(props[i]); } }
        if (!targets.length) {
            var ls = H.selectedLayers(comp);
            for (i = 0; i < ls.length; i += 1) { walk(ls[i], function (p) { try { if (p.canSetExpression && p.expression && p.expression.length) { targets.push(p); } } catch (e) { } }); }
        }
        if (!targets.length) { return fail("No expressions found on the selection."); }
        var t = comp.time, count = 0;
        app.beginUndoGroup("Freeze Expression");
        try {
            for (i = 0; i < targets.length; i += 1) {
                var v = targets[i].valueAtTime(t, false);
                targets[i].expression = "";
                if (targets[i].numKeys > 0) { targets[i].setValueAtTime(t, v); } else { targets[i].setValue(v); }
                count += 1;
            }
        } catch (e2) { app.endUndoGroup(); return fail(e2.toString()); }
        app.endUndoGroup();
        return ok({ count: count });
    };

    // ---------- text helpers ----------
    G.removeTextPanelExpressions = function () {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var ls = H.selectedLayers(comp), i, j, count = 0;
        app.beginUndoGroup("Remove Text Animators");
        try {
            for (i = 0; i < ls.length; i += 1) {
                if (!(ls[i] instanceof TextLayer)) { continue; }
                var animators = ls[i].property("ADBE Text Properties").property("ADBE Text Animators");
                for (j = animators.numProperties; j >= 1; j -= 1) {
                    var a = animators.property(j), sels = a.property("ADBE Text Selectors"), has = false, k;
                    for (k = 1; k <= sels.numProperties; k += 1) { if (sels.property(k).matchName === "ADBE Text Expressible Selector") { has = true; } }
                    if (has) { a.remove(); count += 1; }
                }
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ count: count });
    };
    G.getSelectedLayerText = function () {
        var comp = H.activeComp();
        if (!comp) { return ""; }
        var ls = H.selectedLayers(comp), i;
        for (i = 0; i < ls.length; i += 1) {
            if (ls[i] instanceof TextLayer) { try { return String(ls[i].property("ADBE Text Properties").property("ADBE Text Document").value.text); } catch (e) { return ""; } }
        }
        return "";
    };
    var BLEND = { normal: "NORMAL", add: "ADD", lineardodge: "ADD", screen: "SCREEN", multiply: "MULTIPLY", overlay: "OVERLAY", softlight: "SOFT_LIGHT", hardlight: "HARD_LIGHT",
        lighten: "LIGHTEN", darken: "DARKEN", difference: "DIFFERENCE", colordodge: "COLOR_DODGE", colorburn: "COLOR_BURN", exclusion: "EXCLUSION", hue: "HUE",
        saturation: "SATURATION", color: "COLOR", luminosity: "LUMINOSITY", silhouettealpha: "SILHOUETE_ALPHA", stenciluma: "STENCIL_LUMA" };
    G.setSelectedLayersBlendMode = function (mode) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var key = String(mode).toLowerCase().replace(/[^a-z]/g, ""), name = BLEND[key];
        if (!name || typeof BlendingMode[name] === "undefined") { return fail("Unknown blend mode: " + mode); }
        var ls = H.selectedLayers(comp), i, n = 0;
        if (!ls.length) { return fail("Select at least one layer."); }
        app.beginUndoGroup("Blend Mode");
        try { for (i = 0; i < ls.length; i += 1) { try { ls[i].blendingMode = BlendingMode[name]; n += 1; } catch (ex) { } } }
        catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ count: n });
    };

    // ---------- layer stagger: delay between selected layers ----------
    G.applyStagger = function (delay, unit, method) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var ls = H.selectedLayers(comp), n = ls.length, i;
        if (n < 2) { return fail("Select at least two layers."); }
        ls.sort(function (a, b) { return a.index - b.index; });
        var d = parseFloat(delay); if (isNaN(d)) { return fail("Enter a delay."); }
        var u = String(unit || "frames").toLowerCase(), secs = (u.indexOf("frame") === 0) ? d * comp.frameDuration : ((u.indexOf("ms") === 0 || u.indexOf("milli") === 0) ? d / 1000 : d);
        var m = String(method || "sequential").toLowerCase();
        app.beginUndoGroup("Stagger Layers");
        try {
            for (i = 0; i < n; i += 1) {
                var step = i;
                if (m === "reverse") { step = n - 1 - i; }
                else if (m === "random") { step = Math.floor(Math.random() * n); }
                else if (m === "center" || m === "pyramid") { step = Math.min(i, n - 1 - i); }
                else if (m === "edges") { step = Math.abs(i - (n - 1) / 2); }
                ls[i].startTime = ls[i].startTime + step * secs;
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ count: n });
    };

    // ---------- glow helpers (host-side $._flex functions) ----------
    function setFx(effect, names, value) {
        var i;
        for (i = 0; i < names.length; i += 1) { try { var p = effect.property(names[i]); if (p) { p.setValue(value); return true; } } catch (e) { } }
        return false;
    }
    // layered glow stack approximating a "deep glow": threshold %, radius px, exposure (intensity)
    F.applyDeepGlowRig = function (threshold, radius, exposure) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var ls = H.selectedLayers(comp), i, k, done = 0;
        if (!ls.length) { return fail("Select a layer first."); }
        var th = parseFloat(threshold), r = parseFloat(radius), ex = parseFloat(exposure);
        if (isNaN(th)) { th = 60; } if (isNaN(r)) { r = 60; } if (isNaN(ex)) { ex = 1; }
        var stack = [{ rad: r * 0.35, mul: 1.0 }, { rad: r, mul: 0.7 }, { rad: r * 2.6, mul: 0.45 }];
        app.beginUndoGroup("Deep Glow Rig");
        try {
            for (i = 0; i < ls.length; i += 1) {
                if (H.isCamOrLight(ls[i])) { continue; }
                for (k = 0; k < stack.length; k += 1) {
                    var fx = ls[i].property("ADBE Effect Parade").addProperty("ADBE Glo2");
                    fx.name = "Akira Glow " + (k + 1);
                    setFx(fx, ["Glow Threshold", "ADBE Glo2-0002"], th * 2.55);
                    setFx(fx, ["Glow Radius", "ADBE Glo2-0003"], stack[k].rad);
                    setFx(fx, ["Glow Intensity", "ADBE Glo2-0004"], ex * stack[k].mul);
                }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return done ? ok({ layers: done }) : fail("Select a layer that can take effects.");
    };
    // trailing copies of the selected text layers: each copy starts later, fainter and softer, with a glow
    F.applyGlowingTrailText = function (delayFrames) {
        var g = locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("No active composition"); }
        var ls = H.selectedLayers(comp), i, k, made = 0, texts = [];
        for (i = 0; i < ls.length; i += 1) { if (ls[i] instanceof TextLayer) { texts.push(ls[i]); } }
        if (!texts.length) { return fail("Select a text layer first."); }
        var d = parseFloat(delayFrames); if (isNaN(d) || d <= 0) { d = 3; }
        app.beginUndoGroup("Glowing Trail Text");
        try {
            for (i = 0; i < texts.length; i += 1) {
                var L = texts[i], base = L.startTime;
                for (k = 1; k <= 5; k += 1) {
                    var c = L.duplicate();
                    c.name = L.name + " trail " + k;
                    c.startTime = base + k * d * comp.frameDuration;
                    c.transform.opacity.setValue(Math.max(5, 70 - k * 12));
                    c.moveAfter(L);
                    try { c.blendingMode = BlendingMode.ADD; } catch (e1) { }
                    var gl = c.property("ADBE Effect Parade").addProperty("ADBE Glo2");
                    setFx(gl, ["Glow Radius", "ADBE Glo2-0003"], 20 + k * 14);
                    setFx(gl, ["Glow Intensity", "ADBE Glo2-0004"], 1.4);
                    made += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ layers: made });
    };
})();
