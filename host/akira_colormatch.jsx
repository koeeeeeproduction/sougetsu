// Sougetsu Akira FX - Color Match tab (clean-room). Batch J1.
// Contract (read from the panel):
//   getSelectedLayersForColorMatch() -> JSON array [{index,name,hasEffects}]
//   getActiveFourColorGradient() -> JSON {found:bool, colors:[[r,g,b],...]} (0..1 per channel) or {found:false}
//   applyColorMatchParameters(encodeURIComponent(JSON)) -> "SUCCESS" / "ERR:"
//     JSON shape: {hue:Number, lightness:Number, saturation:Number} degrees/percent deltas,
//     computed client-side by sampling source/target thumbnails and sent here to apply.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function num(n) { return isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0"; }
    function decodeArg(arg) {
        var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); }
        return s;
    }
    function numField(s, name, def) {
        var m = new RegExp('"' + name + '"\\s*:\\s*(-?[0-9.]+)').exec(s);
        return m ? parseFloat(m[1]) : def;
    }

    // ---------- list selected layers for the source/target pickers ----------
    F.getSelectedLayersForColorMatch = function () {
        var comp = H.activeComp();
        if (!comp) { return "[]"; }
        var layers = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < layers.length; i += 1) {
            var L = layers[i], fx = null, hasFx = false;
            try { fx = L.property("ADBE Effect Parade"); hasFx = fx && fx.numProperties > 0; } catch (e) { }
            out.push('{"index":' + L.index + ',"name":' + jsonStr(L.name) + ',"hasEffects":' + (hasFx ? "true" : "false") + '}');
        }
        return "[" + out.join(",") + "]";
    };

    // ---------- read an existing 4-Color Gradient effect on the active/selected layer, if any ----------
    F.getActiveFourColorGradient = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"found":false}'; }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return '{"found":false}'; }
        var L = layers[0], fx;
        try { fx = L.property("ADBE Effect Parade"); } catch (e) { return '{"found":false}'; }
        if (!fx) { return '{"found":false}'; }
        var i;
        for (i = 1; i <= fx.numProperties; i += 1) {
            var e = fx.property(i);
            if (e.matchName !== "ADBE 4ColorGradient") { continue; }
            var cols = [], idx = ["ADBE 4ColorGradient-0003", "ADBE 4ColorGradient-0005", "ADBE 4ColorGradient-0007", "ADBE 4ColorGradient-0009"], j;
            for (j = 0; j < idx.length; j += 1) {
                var c; try { c = e.property(idx[j]).value; } catch (e1) { c = [1, 1, 1, 1]; }
                cols.push("[" + num(c[0]) + "," + num(c[1]) + "," + num(c[2]) + "]");
            }
            return '{"found":true,"colors":[' + cols.join(",") + ']}';
        }
        return '{"found":false}';
    };

    // ---------- apply a hue/lightness/saturation delta (computed client-side) to selected layers ----------
    F.applyColorMatchParameters = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer to match."; }
        var s = decodeArg(arg);
        var hue = numField(s, "hue", 0), light = numField(s, "lightness", 0), sat = numField(s, "saturation", 0);
        app.beginUndoGroup("Color Match");
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], fx;
                try { fx = L.property("ADBE Effect Parade"); } catch (e0) { continue; }
                if (!fx) { continue; }
                var hls = fx.addProperty("ADBE HUE SATURATION"); // built-in Hue/Saturation effect
                if (!hls) { continue; }
                try { hls.property("Master Hue").setValue(hue); } catch (e1) { }
                try { hls.property("Master Lightness").setValue(light); } catch (e2) { }
                try { hls.property("Master Saturation").setValue(sat); } catch (e3) { }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
})();
