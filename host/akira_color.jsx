// Sougetsu Akira FX - color & effects tools (clean-room). Batch C1.
// Behaviour is our own design built from each button's label. ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    // ---------- helpers ----------
    function hexToRGB(hex) {
        var s = String(hex || "").replace(/^\s+|\s+$/g, "").replace(/^#/, "");
        if (/^[0-9a-fA-F]{3}$/.test(s)) { s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2); }
        if (!/^[0-9a-fA-F]{6}$/.test(s)) { return null; }
        return [parseInt(s.substr(0, 2), 16) / 255, parseInt(s.substr(2, 2), 16) / 255, parseInt(s.substr(4, 2), 16) / 255];
    }
    function cssToRGB(s) {
        s = String(s || "");
        var m = /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i.exec(s);
        if (m) { return [parseFloat(m[1]) / 255, parseFloat(m[2]) / 255, parseFloat(m[3]) / 255]; }
        return hexToRGB(s);
    }
    function jsonStr(s) {
        return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"';
    }
    function realLayers(comp) {   // selected layers that can carry effects/colors
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) { if (!H.isCamOrLight(sel[i])) { out.push(sel[i]); } }
        return out;
    }
    function allLayers(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { out.push(comp.layer(i)); }
        return out;
    }
    function effectsOf(layer) { return layer.property("ADBE Effect Parade"); }
    // children of an effect that hold a given value type, in order (independent of the app language)
    function childrenOfType(effect, valueType) {
        var out = [], i;
        for (i = 1; i <= effect.numProperties; i += 1) {
            var p = effect.property(i);
            if (p.propertyType === PropertyType.PROPERTY && p.propertyValueType === valueType) { out.push(p); }
        }
        return out;
    }
    function setColorProp(p, rgb, time) {
        var v = [rgb[0], rgb[1], rgb[2], 1];
        H.setProp(p, v, time);
    }
    function addEffect(layer, matchName) {
        var fx = effectsOf(layer);
        if (!fx) { return null; }
        try { return fx.addProperty(matchName); } catch (e) { return null; }
    }

    // ---------- applyColor ----------
    // walk a shape layer's contents, recolor fills (and strokes if there is no fill); returns number changed
    function recolorShapes(group, rgb, time, state) {
        var i;
        for (i = 1; i <= group.numProperties; i += 1) {
            var p = group.property(i);
            if (p.matchName === "ADBE Vector Graphic - Fill") {
                H.setProp(p.property("ADBE Vector Fill Color"), [rgb[0], rgb[1], rgb[2], 1], time); state.fills += 1;
            } else if (p.matchName === "ADBE Vector Graphic - Stroke") {
                state.strokes.push(p);
            } else if (p.propertyType === PropertyType.INDEXED_GROUP || p.propertyType === PropertyType.NAMED_GROUP) {
                recolorShapes(p, rgb, time, state);
            }
        }
    }
    function colorOneLayer(L, rgb, time) {
        if (L instanceof ShapeLayer) {
            var st = { fills: 0, strokes: [] }, k;
            recolorShapes(L.property("ADBE Root Vectors Group"), rgb, time, st);
            if (!st.fills) {
                for (k = 0; k < st.strokes.length; k += 1) { H.setProp(st.strokes[k].property("ADBE Vector Stroke Color"), [rgb[0], rgb[1], rgb[2], 1], time); }
                return st.strokes.length > 0;
            }
            return true;
        }
        if (L instanceof TextLayer) {
            var tp = L.property("ADBE Text Properties").property("ADBE Text Document"), td = tp.value;
            td.fillColor = [rgb[0], rgb[1], rgb[2]]; td.applyFill = true;
            tp.setValue(td);
            return true;
        }
        if (L.source && L.source.mainSource && (L.source.mainSource instanceof SolidSource)) {
            L.source.mainSource.color = [rgb[0], rgb[1], rgb[2]];
            return true;
        }
        // footage, precomps, nulls...: use a Fill effect
        var fx = effectsOf(L), i, fill = null;
        for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).matchName === "ADBE Fill") { fill = fx.property(i); break; } }
        if (!fill) { fill = addEffect(L, "ADBE Fill"); }
        if (!fill) { return false; }
        var cp = childrenOfType(fill, PropertyValueType.COLOR);
        if (!cp.length) { return false; }
        setColorProp(cp[0], rgb, time);
        return true;
    }
    function rampPoints(L, time, n) {
        var r = H.sourceRect(L, time) || { left: 0, top: 0, width: (L.width || 100), height: (L.height || 100) };
        if (n === 2) { return [[r.left + r.width / 2, r.top], [r.left + r.width / 2, r.top + r.height]]; }
        return [[r.left, r.top], [r.left + r.width, r.top], [r.left, r.top + r.height], [r.left + r.width, r.top + r.height]];
    }
    function applyGradient(L, rgbs, time) {
        var four = rgbs.length === 4;
        var fx = addEffect(L, four ? "ADBE 4ColorGradient" : "ADBE Ramp");
        if (!fx) { return false; }
        var cols = childrenOfType(fx, PropertyValueType.COLOR), pts = childrenOfType(fx, PropertyValueType.TwoD_SPATIAL), i;
        var pos = rampPoints(L, time, four ? 4 : 2);
        for (i = 0; i < rgbs.length && i < cols.length; i += 1) { setColorProp(cols[i], rgbs[i], time); }
        for (i = 0; i < pos.length && i < pts.length; i += 1) { H.setProp(pts[i], pos[i], time); }
        return true;
    }
    // arg: "solid|RRGGBB" | "gradient|RRGGBB|RRGGBB" | "fourcolor|RRGGBB|RRGGBB|RRGGBB|RRGGBB"
    F.applyColor = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|"), kind = parts[0], rgbs = [], i;
        for (i = 1; i < parts.length; i += 1) { var c = hexToRGB(parts[i]); if (!c) { return "ERR:Invalid color: " + parts[i]; } rgbs.push(c); }
        if (!rgbs.length) { return "ERR:No color given."; }
        var layers = realLayers(comp), done = 0, time = comp.time;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Apply Color");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var ok;
                if (kind === "gradient") { ok = applyGradient(layers[i], [rgbs[0], rgbs[rgbs.length > 1 ? 1 : 0]], time); }
                else if (kind === "fourcolor") { while (rgbs.length < 4) { rgbs.push(rgbs[rgbs.length - 1]); } ok = applyGradient(layers[i], rgbs.slice(0, 4), time); }
                else { ok = colorOneLayer(layers[i], rgbs[0], time); }
                if (ok) { done += 1; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Could not apply the color to the selected layers.";
    };
    // arg: CSS color such as "rgb(255, 80, 0)" (from the color picker modal)
    F.applyColorToSelection = function (css) {
        var rgb = cssToRGB(css);
        if (!rgb) { return "ERR:Invalid color."; }
        var hex = "", i, v;
        for (i = 0; i < 3; i += 1) { v = Math.round(rgb[i] * 255).toString(16); hex += (v.length < 2 ? "0" : "") + v; }
        return F.applyColor("solid|" + hex);
    };
    F.applyFill = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = realLayers(comp), i, done = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Add Fill");
        try { for (i = 0; i < layers.length; i += 1) { if (addEffect(layers[i], "ADBE Fill")) { done += 1; } } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Could not add Fill.";
    };

    // ---------- effects by name ----------
    var COMMON = { "blur": "ADBE Gaussian Blur 2", "gaussian blur": "ADBE Gaussian Blur 2", "glow": "ADBE Glo2", "drop shadow": "ADBE Drop Shadow",
        "shadow": "ADBE Drop Shadow", "fill": "ADBE Fill", "tint": "ADBE Tint", "tritone": "ADBE Tritone", "curves": "ADBE CurvesCustom",
        "levels": "ADBE Pro Levels2", "hue saturation": "ADBE HUE SATURATION", "hue/saturation": "ADBE HUE SATURATION", "fractal noise": "ADBE Fractal Noise",
        "turbulent displace": "ADBE Turbulent Displace", "echo": "ADBE Echo", "wave warp": "ADBE Wave Warp", "gradient ramp": "ADBE Ramp", "ramp": "ADBE Ramp",
        "4-color gradient": "ADBE 4ColorGradient", "invert": "ADBE Invert", "sharpen": "ADBE Sharpen", "motion blur": "ADBE Motion Blur", "noise": "ADBE Noise" };
    function resolveEffect(name) {
        var key = String(name).replace(/^\s+|\s+$/g, ""), low = key.toLowerCase(), i;
        if (COMMON[low]) { return COMMON[low]; }
        try {
            var list = app.effects, partial = null;
            for (i = 0; i < list.length; i += 1) {
                if (list[i].matchName === key || list[i].displayName.toLowerCase() === low) { return list[i].matchName; }
                if (!partial && list[i].displayName.toLowerCase().indexOf(low) !== -1) { partial = list[i].matchName; }
            }
            if (partial) { return partial; }
        } catch (e) { }
        return /^ADBE /.test(key) ? key : null;
    }
    F.applyEffectToSelection = function (name) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var mn = resolveEffect(name);
        if (!mn) { return "ERR:Effect not found: " + name; }
        var layers = realLayers(comp), i, done = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Apply " + name);
        try { for (i = 0; i < layers.length; i += 1) { if (addEffect(layers[i], mn)) { done += 1; } } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Could not apply " + name + ".";
    };
    F.applyFFX = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var f = new File(String(path));
        if (!f.exists) { return "ERR:Preset file not found."; }
        var layers = realLayers(comp), i;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Apply Preset");
        try { for (i = 0; i < layers.length; i += 1) { layers[i].applyPreset(f); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- FX tab: the whole composition ----------
    F.scanTimelineFX = function () {
        var comp = H.activeComp();
        if (!comp) { return "[]"; }
        var map = {}, order = [], i, j;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var fx = effectsOf(comp.layer(i));
            if (!fx) { continue; }
            for (j = 1; j <= fx.numProperties; j += 1) {
                var e = fx.property(j), mn = e.matchName;
                if (!map[mn]) { map[mn] = { matchName: mn, name: e.name, count: 0, activeCount: 0 }; order.push(mn); }
                map[mn].count += 1;
                if (e.enabled) { map[mn].activeCount += 1; }
            }
        }
        var parts = [];
        for (i = 0; i < order.length; i += 1) {
            var m = map[order[i]];
            parts.push('{"matchName":' + jsonStr(m.matchName) + ',"name":' + jsonStr(m.name) + ',"count":' + m.count + ',"activeCount":' + m.activeCount + '}');
        }
        return "[" + parts.join(",") + "]";
    };
    function eachEffect(comp, matchName, fn) {    // matchName null = every effect; iterate backwards so removal is safe
        var i, j, n = 0;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var fx = effectsOf(comp.layer(i));
            if (!fx) { continue; }
            for (j = fx.numProperties; j >= 1; j -= 1) {
                var e = fx.property(j);
                if (matchName === null || e.matchName === matchName) { fn(e, comp.layer(i)); n += 1; }
            }
        }
        return n;
    }
    F.deleteFX = function (matchName) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Delete Effect");
        var n;
        try { n = eachEffect(comp, String(matchName), function (e) { e.remove(); }); }
        catch (e1) { app.endUndoGroup(); return "ERR:" + e1.toString(); }
        app.endUndoGroup();
        return n ? "SUCCESS" : "ERR:Effect not found in this composition.";
    };
    F.deleteAllFX = function () {   // selected layers only
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = realLayers(comp), i, j, n = 0;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Delete All Effects");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var fx = effectsOf(layers[i]);
                for (j = fx.numProperties; j >= 1; j -= 1) { fx.property(j).remove(); n += 1; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // arg: "matchName|true" or "matchName|false"
    F.toggleFX = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = String(arg), bar = s.lastIndexOf("|");
        if (bar < 0) { return "ERR:Bad arguments."; }
        var mn = s.substring(0, bar), on = (s.substring(bar + 1) === "true");
        app.beginUndoGroup("Toggle Effect");
        try { eachEffect(comp, mn, function (e) { e.enabled = on; }); }
        catch (e1) { app.endUndoGroup(); return "ERR:" + e1.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.toggleAllFX = function (state) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var on = (String(state) === "true");
        app.beginUndoGroup("Toggle All Effects");
        try { eachEffect(comp, null, function (e) { e.enabled = on; }); }
        catch (e1) { app.endUndoGroup(); return "ERR:" + e1.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.highlightFXLayers = function (matchName) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var i, j, sel = comp.selectedLayers, hits = [];
        for (i = 1; i <= comp.numLayers; i += 1) {
            var fx = effectsOf(comp.layer(i));
            if (!fx) { continue; }
            for (j = 1; j <= fx.numProperties; j += 1) { if (fx.property(j).matchName === String(matchName)) { hits.push(comp.layer(i)); break; } }
        }
        for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
        for (i = 0; i < hits.length; i += 1) { hits[i].selected = true; }
        return hits.length ? "SUCCESS" : "ERR:No layer uses that effect.";
    };

    // ---------- label colors: nearest of After Effects' 16 labels (approximate RGB values) ----------
    var LABELS = [[181, 56, 56], [228, 216, 76], [169, 203, 199], [229, 188, 201], [169, 169, 202], [229, 188, 155], [169, 202, 169], [76, 120, 191],
                  [75, 155, 75], [138, 79, 155], [229, 131, 59], [161, 116, 61], [242, 63, 163], [60, 200, 208], [185, 160, 125], [46, 94, 61]];
    F.setLayerLabelColorFromHex = function (hex) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var rgb = hexToRGB(hex);
        if (!rgb) { return "ERR:Invalid color."; }
        var best = 0, bestD = 1e12, i;
        for (i = 0; i < LABELS.length; i += 1) {
            var dr = rgb[0] * 255 - LABELS[i][0], dg = rgb[1] * 255 - LABELS[i][1], db = rgb[2] * 255 - LABELS[i][2];
            var d = dr * dr + dg * dg + db * db;
            if (d < bestD) { bestD = d; best = i; }
        }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Set Label Color");
        try { for (i = 0; i < layers.length; i += 1) { layers[i].label = best + 1; } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- gradient lock: toggle expressions that keep a Gradient Ramp on the layer's bounds ----------
    F.fxLock = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return ""; }
        var layers = realLayers(comp), i, j, touched = 0, locking = null;
        var MARK = "// akira-gradient-lock";
        var startX = MARK + "\nr = thisLayer.sourceRectAtTime(time, false); [r.left + r.width / 2, r.top]";
        var endX = MARK + "\nr = thisLayer.sourceRectAtTime(time, false); [r.left + r.width / 2, r.top + r.height]";
        app.beginUndoGroup("Gradient Lock");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var fx = effectsOf(layers[i]);
                for (j = 1; j <= fx.numProperties; j += 1) {
                    if (fx.property(j).matchName !== "ADBE Ramp") { continue; }
                    var pts = childrenOfType(fx.property(j), PropertyValueType.TwoD_SPATIAL);
                    if (pts.length < 2) { continue; }
                    if (locking === null) { locking = (String(pts[0].expression).indexOf(MARK) === -1); }
                    pts[0].expression = locking ? startX : "";
                    pts[1].expression = locking ? endX : "";
                    touched += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        if (!touched) { return ""; }
        return locking ? "LOCKED" : "UNLOCKED";
    };
})();
