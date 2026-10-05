// Sougetsu Akira FX - Captions tab: presets + word-level captions (clean-room). Batch J2.
// Contract (read from the panel):
//   getSelectedLayerAcInfo() -> JSON {ok:bool, text, font, fontSize, fillColor:[r,g,b], hasBox:bool}
//   createCaptionPresetLayer(presetId) -> "SUCCESS" / "ERR:"
//   applyCaptionPresetStyle(presetId) -> "SUCCESS" / "ERR:"  (applies to selected text layers)
//   applyGenericTextKeyframes(presetName) -> "SUCCESS" / "ERR:"  (pop/fade/typewriter on selected text layers)
//   importWordCaptions(path) -> "SUCCESS" / "ERR:"  (JSON file: [{word,start,end}, ...] -> one layer, per-word source text keys)
//   splitTextSeparate() -> "SUCCESS" / "ERR:"  (splits selected text layer's lines into separate stacked layers)
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function num(n) { return isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0"; }
    function docOf(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function textLayers(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i) instanceof TextLayer) { out.push(comp.layer(i)); } }
        return out;
    }
    function selTextLayers(comp) {
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof TextLayer) { out.push(sel[i]); } }
        return out;
    }

    // ---------- caption style presets: font, size, fill, optional background box ----------
    var PRESETS = {
        clean:    { font: "Arial-BoldMT", size: 64, fill: [1, 1, 1], stroke: null, box: null },
        bold:     { font: "Arial-BoldMT", size: 72, fill: [1, 0.85, 0.1], stroke: [0, 0, 0], strokeW: 4, box: null },
        boxed:    { font: "Arial-BoldMT", size: 60, fill: [1, 1, 1], stroke: null, box: [0, 0, 0, 0.75] },
        outline:  { font: "Arial-BoldMT", size: 66, fill: [1, 1, 1], stroke: [0, 0, 0], strokeW: 6, box: null },
        minimal:  { font: "ArialMT", size: 50, fill: [0.9, 0.9, 0.9], stroke: null, box: null }
    };

    function applyStyleToLayer(L, preset, comp) {
        var p = docOf(L), td = p.value;
        try { td.font = preset.font; } catch (e0) { }
        td.fontSize = preset.size;
        td.fillColor = preset.fill;
        td.applyFill = true;
        if (preset.stroke) { td.strokeColor = preset.stroke; td.strokeWidth = preset.strokeW || 3; td.applyStroke = true; td.strokeOverFill = false; }
        else { td.applyStroke = false; }
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        p.setValue(td);
        // background box: a solid behind the text, precomposed so it tracks text bounds via expression-linked size
        if (preset.box) {
            var name = L.name + " BG";
            var already = false, i;
            for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === name) { already = true; break; } }
            if (!already) {
                var sol = comp.layers.addSolid([preset.box[0], preset.box[1], preset.box[2]], name, comp.width, comp.height, 1);
                sol.moveAfter(L);
                try { sol.transform.opacity.setValue((preset.box[3] || 1) * 100); } catch (e1) { }
                try {
                    sol.property("ADBE Transform Group").property("ADBE Position").expression =
                        'r = thisComp.layer("' + L.name.replace(/"/g, '\\"') + '").sourceRectAtTime(time,false); [r.left+r.width/2, r.top+r.height/2]';
                    sol.property("ADBE Transform Group").property("ADBE Scale").expression =
                        'r = thisComp.layer("' + L.name.replace(/"/g, '\\"') + '").sourceRectAtTime(time,false); s=[(r.width+40)/width*100,(r.height+30)/height*100]; s';
                } catch (e2) { }
            }
        }
    }

    F.getSelectedLayerAcInfo = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"ok":false}'; }
        var layers = selTextLayers(comp);
        if (!layers.length) { return '{"ok":false}'; }
        var L = layers[0], td;
        try { td = docOf(L).value; } catch (e) { return '{"ok":false}'; }
        var hasBox = false, i;
        for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === L.name + " BG") { hasBox = true; break; } }
        var fc = td.fillColor || [1, 1, 1];
        return '{"ok":true,"text":' + jsonStr(td.text) + ',"font":' + jsonStr(td.font || "") +
            ',"fontSize":' + num(td.fontSize || 0) + ',"fillColor":[' + num(fc[0]) + "," + num(fc[1]) + "," + num(fc[2]) + ']' +
            ',"hasBox":' + (hasBox ? "true" : "false") + '}';
    };

    F.applyCaptionPresetStyle = function (presetId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var preset = PRESETS[String(presetId)];
        if (!preset) { return "ERR:Unknown caption preset: " + presetId; }
        var layers = selTextLayers(comp);
        if (!layers.length) { return "ERR:Select at least one text layer."; }
        app.beginUndoGroup("Apply Caption Style");
        try { var i; for (i = 0; i < layers.length; i += 1) { applyStyleToLayer(layers[i], preset, comp); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.createCaptionPresetLayer = function (presetId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var preset = PRESETS[String(presetId)] || PRESETS.clean;
        app.beginUndoGroup("Create Caption Layer");
        try {
            var L = comp.layers.addText("Caption");
            L.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height * 0.85]);
            applyStyleToLayer(L, preset, comp);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- generic text motion presets applied to Source Text / transform ----------
    F.applyGenericTextKeyframes = function (name) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selTextLayers(comp);
        if (!layers.length) { return "ERR:Select at least one text layer."; }
        name = String(name);
        app.beginUndoGroup("Text Keyframes: " + name);
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], t = comp.time, dur = 0.35;
                var op = L.transform.opacity, sc = L.transform.scale, pos = L.transform.position;
                if (name === "fadeUp") {
                    op.setValueAtTime(t, 0); op.setValueAtTime(t + dur, 100);
                    var p0 = pos.value;
                    pos.setValueAtTime(t, [p0[0], p0[1] + 30]); pos.setValueAtTime(t + dur, p0);
                } else if (name === "popIn") {
                    var s0 = sc.value;
                    sc.setValueAtTime(t, [0, 0]); sc.setValueAtTime(t + dur, [s0[0] * 1.1, s0[1] * 1.1]); sc.setValueAtTime(t + dur + 0.1, s0);
                    op.setValueAtTime(t, 0); op.setValueAtTime(t + 0.08, 100);
                } else if (name === "typewriter") {
                    var td = docOf(L).value, full = String(td.text), n = full.length, steps = Math.max(n, 1), k;
                    var anim = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
                    var sel2 = anim.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
                    sel2.property("ADBE Text Percent Start").setValueAtTime(t, 0);
                    sel2.property("ADBE Text Percent Start").setValueAtTime(t + steps * 0.04, 0);
                    sel2.property("ADBE Text Percent End").setValueAtTime(t, 0);
                    sel2.property("ADBE Text Percent End").setValueAtTime(t + steps * 0.04, 100);
                    try { anim.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity").setValue(0); } catch (e0) { }
                } else if (name === "fadeIn") {
                    op.setValueAtTime(t, 0); op.setValueAtTime(t + dur, 100);
                } else {
                    app.endUndoGroup(); return "ERR:Unknown text preset: " + name;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- import word-level captions (JSON [{word,start,end}]) as a single layer with keyed Source Text ----------
    F.importWordCaptions = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var f = new File(String(path));
        if (!f.exists) { return "ERR:File not found: " + path; }
        f.encoding = "UTF-8";
        if (!f.open("r")) { return "ERR:Could not open file."; }
        var raw = f.read(); f.close();
        var words = [], re = /"word"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"start"\s*:\s*([0-9.]+)\s*,\s*"end"\s*:\s*([0-9.]+)/g, m;
        while ((m = re.exec(raw)) !== null) {
            words.push({ word: m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"), start: parseFloat(m[2]), end: parseFloat(m[3]) });
        }
        if (!words.length) { return "ERR:No words found in file (expected JSON [{word,start,end}])."; }
        app.beginUndoGroup("Import Word Captions");
        try {
            var L = comp.layers.addText(words[0].word);
            L.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height * 0.85]);
            var p = docOf(L), i;
            for (i = 0; i < words.length; i += 1) {
                var td = p.value; td.text = words[i].word; p.setValueAtTime(words[i].start, td);
            }
            L.inPoint = words[0].start;
            L.outPoint = words[words.length - 1].end;
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- split a text layer's lines into separate stacked text layers ----------
    F.splitTextSeparate = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selTextLayers(comp);
        if (!layers.length) { return "ERR:Select a text layer."; }
        app.beginUndoGroup("Split Text (Separate)");
        var made = 0;
        try {
            var li;
            for (li = 0; li < layers.length; li += 1) {
                var L = layers[li], td = docOf(L).value, lines = String(td.text).split(/\r\n|\r|\n/);
                if (lines.length < 2) { continue; }
                var basePos = L.transform.position.value, lineH = (td.fontSize || 50) * 1.2, i;
                for (i = 0; i < lines.length; i += 1) {
                    if (!lines[i].length) { continue; }
                    var nl = L.duplicate();
                    var ntd = docOf(nl).value; ntd.text = lines[i]; docOf(nl).setValue(ntd);
                    nl.name = lines[i].substring(0, 24);
                    nl.transform.position.setValue([basePos[0], basePos[1] + (i - (lines.length - 1) / 2) * lineH]);
                    made += 1;
                }
                L.remove();
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return made ? "SUCCESS" : "ERR:Selected text has only one line.";
    };
})();
