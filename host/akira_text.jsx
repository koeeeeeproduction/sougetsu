// Sougetsu Akira FX - text tools (clean-room). Batch C2.
// Behaviour is our own design built from each button's label. ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    // ---------- helpers ----------
    function textProp(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function setText(L, str) { var tp = textProp(L), td = tp.value; td.text = str; tp.setValue(td); }
    function sameJust(a, b) { return a === b; }
    function addEffectByName(L, matchName) {
        try { return L.property("ADBE Effect Parade").addProperty(matchName); } catch (e) { return null; }
    }
    function trySet(effect, names, value) {   // set the first property that exists (names may be display names or match names)
        var i;
        for (i = 0; i < names.length; i += 1) {
            try { var p = effect.property(names[i]); if (p) { p.setValue(value); return true; } } catch (e) { }
        }
        return false;
    }
    function newTextLayer(comp, text, size, rgb, centerY) {
        var L = comp.layers.addText(String(text));
        var tp = textProp(L), td = tp.value;
        td.fontSize = size || 100;
        td.fillColor = rgb || [1, 1, 1]; td.applyFill = true;
        td.justification = ParagraphJustification.CENTER_JUSTIFY;
        tp.setValue(td);
        L.transform.position.setValue([comp.width / 2, centerY === undefined ? comp.height / 2 : centerY]);
        return L;
    }
    function selectOnly(comp, layers) {
        var sel = comp.selectedLayers, i;
        for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
        for (i = 0; i < layers.length; i += 1) { layers[i].selected = true; }
    }

    // ---------- new text layers ----------
    F.addTextLayer = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Add Text Layer");
        try { var L = newTextLayer(comp, "Text", 100, [1, 1, 1]); selectOnly(comp, [L]); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.createCustomTextLayer = function (text) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Create Text Layer");
        try { var L = newTextLayer(comp, String(text || "Text"), 100, [1, 1, 1]); selectOnly(comp, [L]); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function addGlow(L, radius, intensity) {
        var fx = addEffectByName(L, "ADBE Glo2");
        if (!fx) { return false; }
        trySet(fx, ["Glow Radius", "ADBE Glo2-0003"], radius);
        trySet(fx, ["Glow Intensity", "ADBE Glo2-0004"], intensity);
        return true;
    }
    F.createGlowingRedText = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Glowing Red Text");
        try {
            var L = newTextLayer(comp, "GLOW", 160, [1, 0.12, 0.12]);
            L.name = "Glowing Red Text";
            addGlow(L, 60, 1.6);
            selectOnly(comp, [L]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // glow + drop shadow on the selected text layers
    F.applyEffectsToSelectedTextLayer = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp), i, done = 0;
        app.beginUndoGroup("Text Glow + Shadow");
        try {
            for (i = 0; i < layers.length; i += 1) {
                if (!(layers[i] instanceof TextLayer)) { continue; }
                addGlow(layers[i], 40, 1.2);
                var sh = addEffectByName(layers[i], "ADBE Drop Shadow");
                if (sh) { trySet(sh, ["Opacity", "ADBE Drop Shadow-0002"], 160); trySet(sh, ["Softness", "ADBE Drop Shadow-0006"], 20); }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Select a text layer first.";
    };

    // ---------- SRT import ----------
    function parseSRT(s) {
        s = String(s).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        var blocks = s.split(/\n\s*\n/), cues = [], i, j;
        var rx = /(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/;
        for (i = 0; i < blocks.length; i += 1) {
            var lines = blocks[i].split("\n"), at = -1;
            for (j = 0; j < lines.length; j += 1) { if (lines[j].indexOf("-->") !== -1) { at = j; break; } }
            if (at < 0) { continue; }
            var m = rx.exec(lines[at]);
            if (!m) { continue; }
            var start = parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / Math.pow(10, m[4].length);
            var end = parseInt(m[5], 10) * 3600 + parseInt(m[6], 10) * 60 + parseInt(m[7], 10) + parseInt(m[8], 10) / Math.pow(10, m[8].length);
            var text = lines.slice(at + 1).join("\r").replace(/<[^>]+>/g, "").replace(/^\s+|\s+$/g, "");
            if (!text || end <= start) { continue; }
            cues.push({ start: start, end: end, text: text });
        }
        return cues;
    }
    F.parseSRT = parseSRT; // exposed for testing
    F.importSRT = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var f;
        if (path && String(path).length && String(path) !== "undefined") { f = new File(String(path)); }
        else { f = File.openDialog("Choose an SRT subtitle file", "SRT:*.srt"); }
        if (!f) { return "ERR:No file selected."; }
        if (!f.exists) { return "ERR:File not found."; }
        f.encoding = "UTF-8";
        if (!f.open("r")) { return "ERR:Could not open the file."; }
        var raw = f.read(); f.close();
        var cues = parseSRT(raw), i;
        if (!cues.length) { return "ERR:No subtitles found in that file."; }
        app.beginUndoGroup("Import SRT");
        try {
            for (i = 0; i < cues.length; i += 1) {
                var L = newTextLayer(comp, cues[i].text, 60, [1, 1, 1], comp.height * 0.88);
                L.name = cues[i].text.replace(/\r/g, " ").substring(0, 40);
                L.startTime = 0;
                L.inPoint = Math.min(cues[i].start, comp.duration);
                L.outPoint = Math.min(cues[i].end, comp.duration);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- split text into one layer per character / word / line ----------
    function centerAnchor(L, time) {
        var r = H.sourceRect(L, time);
        if (!r) { return; }
        var c = [r.left + r.width / 2, r.top + r.height / 2];
        var off = H.offsetFromAnchor(L, c, time), pos = H.getPos(L, time), t = L.transform;
        var np = [pos[0] + off[0], pos[1] + off[1]]; if (pos.length > 2) { np.push(pos[2]); }
        var a = t.anchorPoint.valueAtTime(time, false), na = [c[0], c[1]]; if (a.length > 2) { na.push(a[2]); }
        H.setProp(t.anchorPoint, na, time);
        H.setPos(L, np, time);
    }
    function pieces(lineText, mode) {
        var out = [], m, rx;
        if (mode === "lines") { if (lineText.replace(/\s+/g, "").length) { out.push({ idx: 0, text: lineText }); } return out; }
        rx = (mode === "chars") ? /\S/g : /\S+/g;
        while ((m = rx.exec(lineText)) !== null) { out.push({ idx: m.index, text: m[0] }); }
        return out;
    }
    F.splitText = function (mode) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        mode = String(mode || "words");
        if (mode !== "chars" && mode !== "words" && mode !== "lines") { return "ERR:Unknown split mode."; }
        var sel = H.selectedLayers(comp), targets = [], i, j, k;
        for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof TextLayer) { targets.push(sel[i]); } }
        if (!targets.length) { return "ERR:Select a text layer first."; }
        var time = comp.time, created = [];
        app.beginUndoGroup("Split Text");
        try {
            for (i = 0; i < targets.length; i += 1) {
                var L = targets[i], td = textProp(L).value;
                if (td.boxText) { app.endUndoGroup(); return "ERR:Box (paragraph) text is not supported. Convert it to point text first."; }
                var lines = String(td.text).split(/\r\n|\r|\n/);
                var just = td.justification;
                var tmp = L.duplicate();
                setText(tmp, "|");
                var barW = H.sourceRect(tmp, time).width;
                var widthOf = function (str) {
                    if (!str.length) { return 0; }
                    setText(tmp, str + "|");
                    return H.sourceRect(tmp, time).width - barW;
                };
                setText(tmp, "A"); var h1 = H.sourceRect(tmp, time).height;
                setText(tmp, "A\rA"); var lineH = H.sourceRect(tmp, time).height - h1;
                var plan = [];
                for (j = 0; j < lines.length; j += 1) {
                    var lw = widthOf(lines[j]), x0 = 0;
                    if (just === ParagraphJustification.CENTER_JUSTIFY) { x0 = -lw / 2; }
                    else if (just === ParagraphJustification.RIGHT_JUSTIFY) { x0 = -lw; }
                    var ps = pieces(lines[j], mode);
                    for (k = 0; k < ps.length; k += 1) {
                        var startX = (mode === "lines") ? x0 : x0 + widthOf(lines[j].substring(0, ps[k].idx));
                        plan.push({ text: ps[k].text, dx: startX, dy: j * lineH });
                    }
                }
                tmp.remove();
                for (j = 0; j < plan.length; j += 1) {
                    var P = L.duplicate();
                    var tpp = textProp(P), d2 = tpp.value;
                    d2.text = plan[j].text; d2.justification = ParagraphJustification.LEFT_JUSTIFY;
                    tpp.setValue(d2);
                    P.name = plan[j].text;
                    var a = P.transform.anchorPoint.valueAtTime(time, false);
                    var shift = H.offsetFromAnchor(P, [a[0] + plan[j].dx, a[1] + plan[j].dy], time), pos = H.getPos(P, time);
                    var np = [pos[0] + shift[0], pos[1] + shift[1]]; if (pos.length > 2) { np.push(pos[2]); }
                    H.setPos(P, np, time);
                    centerAnchor(P, time);
                    created.push(P);
                }
                L.remove();
            }
            selectOnly(comp, created);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return created.length ? "SUCCESS" : "ERR:Nothing to split.";
    };

    // ---------- number counter ----------
    function escStr(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r|\n/g, " "); }
    function counterExpr(fmt, pre, suf, sep) {
        return "v = Math.round(effect(\"counterVal\")(\"Slider\"));\n" +
            "fmt = \"" + escStr(fmt) + "\"; pre = \"" + escStr(pre) + "\"; suf = \"" + escStr(suf) + "\"; sep = \"" + escStr(sep) + "\";\n" +
            "function commas(n) { s = Math.abs(n).toString(); out = \"\"; c = 0;\n" +
            "  for (i = s.length - 1; i >= 0; i--) { out = s.charAt(i) + out; c++; if (c % 3 == 0 && i > 0) out = sep + out; }\n" +
            "  return (n < 0 ? \"-\" : \"\") + out; }\n" +
            "if (fmt == \"ig\") { if (v >= 1000000) txt = (v / 1000000).toFixed(1) + \"M\"; else if (v >= 10000) txt = (v / 1000).toFixed(1) + \"K\"; else txt = commas(v); }\n" +
            "else if (fmt == \"yt\") { if (v >= 1000000) txt = (v / 1000000).toFixed(1) + \"M\"; else if (v >= 1000) txt = (v / 1000).toFixed(1) + \"K\"; else txt = v.toString(); }\n" +
            "else { txt = commas(v); }\n" +
            "pre + txt + suf";
    }
    function counterComment(fmt, pre, suf, sep, val) {
        return "AKIRA_COUNTER|" + encodeURIComponent(fmt) + "|" + encodeURIComponent(pre) + "|" + encodeURIComponent(suf) + "|" + encodeURIComponent(sep) + "|" + encodeURIComponent(val);
    }
    function readCounter(L) {
        var c = String(L.comment || "");
        if (c.indexOf("AKIRA_COUNTER|") !== 0) { return null; }
        var p = c.split("|");
        return { format: decodeURIComponent(p[1]), prefix: decodeURIComponent(p[2]), suffix: decodeURIComponent(p[3]), separator: decodeURIComponent(p[4]), value: decodeURIComponent(p[5]) };
    }
    function findControl(L, name) {
        var fx = L.property("ADBE Effect Parade"), i;
        if (!fx) { return null; }
        for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).name === name) { return fx.property(i).property(1); } }
        return null;
    }
    // arg: "format|prefix|suffix|separator|value|flag|flag"; format basic | ig | yt. Updates a selected counter, otherwise creates one.
    F.createNumberCounter = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = String(arg || "").split("|");
        var fmt = (p[0] === "ig" || p[0] === "yt") ? p[0] : "basic";
        var pre = p[1] || "", suf = p[2] || "", sep = (p[3] === undefined || p[3] === "") ? "," : p[3];
        var val = parseFloat(p[4]); if (isNaN(val)) { val = 1000; }
        var sel = H.selectedLayers(comp), L = null, i;
        for (i = 0; i < sel.length; i += 1) { if (readCounter(sel[i])) { L = sel[i]; break; } }
        app.beginUndoGroup("Number Counter");
        try {
            var fresh = !L;
            if (fresh) {
                L = newTextLayer(comp, "0", 200, [1, 1, 1]);
                L.name = "Counter";
                var sl = L.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
                sl.name = "counterVal";
            }
            var ctl = findControl(L, "counterVal");
            if (!ctl) { app.endUndoGroup(); return "ERR:This layer has no counter control."; }
            textProp(L).expression = counterExpr(fmt, pre, suf, sep);
            L.comment = counterComment(fmt, pre, suf, sep, String(val));
            if (fresh) {
                var t0 = comp.time;
                ctl.setValueAtTime(t0, 0);
                ctl.setValueAtTime(Math.min(t0 + 2, comp.duration), val);
                var ease = [new KeyframeEase(0, 33.333)];
                try { ctl.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33.333)], ease); ctl.setTemporalEaseAtKey(2, ease, [new KeyframeEase(0, 33.333)]); } catch (e1) { }
                selectOnly(comp, [L]);
            } else if (ctl.numKeys >= 2) { ctl.setValueAtKey(ctl.numKeys, val); }
            else { ctl.setValue(val); }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
    F.getCounterDetails = function () {
        var comp = H.activeComp();
        if (!comp) { return "none"; }
        var sel = H.selectedLayers(comp), i;
        for (i = 0; i < sel.length; i += 1) {
            var d = readCounter(sel[i]);
            if (d) { return '{"format":' + jsonStr(d.format) + ',"prefix":' + jsonStr(d.prefix) + ',"suffix":' + jsonStr(d.suffix) + ',"separator":' + jsonStr(d.separator) + ',"value":' + jsonStr(d.value) + "}"; }
        }
        return "none";
    };

    // ---------- keyframe buttons for a named effect control (used by the counter) ----------
    function controlOnSelected(comp, name) {
        var sel = H.selectedLayers(comp), i;
        for (i = 0; i < sel.length; i += 1) { var c = findControl(sel[i], String(name)); if (c) { return c; } }
        return null;
    }
    F.toggleKeyframe = function (name) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var c = controlOnSelected(comp, name);
        if (!c) { return "ERR:Select a layer with that control."; }
        var t = comp.time;
        app.beginUndoGroup("Toggle Keyframe");
        try {
            var hit = false;
            if (c.numKeys > 0) {
                var idx = c.nearestKeyIndex(t);
                if (Math.abs(c.keyTime(idx) - t) < comp.frameDuration / 2) { c.removeKey(idx); hit = true; }
            }
            if (!hit) { c.setValueAtTime(t, c.valueAtTime(t, false)); }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function jump(name, dir) {
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var c = controlOnSelected(comp, name);
        if (!c || !(c.numKeys > 0)) { return "ERR:No keyframes on that control."; }
        var t = comp.time, eps = comp.frameDuration / 2, best = null, i;
        for (i = 1; i <= c.numKeys; i += 1) {
            var kt = c.keyTime(i);
            if (dir > 0 && kt > t + eps && (best === null || kt < best)) { best = kt; }
            if (dir < 0 && kt < t - eps && (best === null || kt > best)) { best = kt; }
        }
        if (best === null) { return "ERR:No " + (dir > 0 ? "next" : "previous") + " keyframe."; }
        comp.time = best;
        return "SUCCESS";
    }
    F.jumpToNextKeyframe = function (name) { var g = H.locked(); return g ? g : jump(name, 1); };
    F.jumpToPrevKeyframe = function (name) { var g = H.locked(); return g ? g : jump(name, -1); };
})();
