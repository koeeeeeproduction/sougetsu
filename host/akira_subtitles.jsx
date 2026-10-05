// Sougetsu Akira FX - subtitle editor + clipboard-image fallback (clean-room). Batch F.
// Subtitles = the text layers of the active composition (created by SRT import or auto captions), ordered by start time.
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var G = $.global, F = $._flex, H = F._h;
    if (!H) { return; }

    function J(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"'; }
    function pad(n, w) { var s = String(n); while (s.length < w) { s = "0" + s; } return s; }
    function srtTime(sec) {
        if (sec < 0) { sec = 0; }
        var ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000); ms -= h * 3600000;
        var m = Math.floor(ms / 60000); ms -= m * 60000;
        var s = Math.floor(ms / 1000); ms -= s * 1000;
        return pad(h, 2) + ":" + pad(m, 2) + ":" + pad(s, 2) + "," + pad(ms, 3);
    }
    function parseSrtTime(str) {
        var m = /^\s*(\d+):(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?\s*$/.exec(String(str));
        if (!m) { return NaN; }
        var frac = m[4] ? parseInt((m[4] + "00").substring(0, 3), 10) : 0;
        return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + frac / 1000;
    }
    function docOf(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function textOf(L) { try { return String(docOf(L).value.text); } catch (e) { return ""; } }
    function setText(L, str) { var p = docOf(L), td = p.value; td.text = str; p.setValue(td); }
    function textLayers(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i) instanceof TextLayer) { out.push(comp.layer(i)); } }
        out.sort(function (a, b) { return a.inPoint - b.inPoint; });
        return out;
    }
    function oneLine(s, n) { var t = String(s).replace(/[\r\n]+/g, " "); return t.length > n ? t.substring(0, n - 1) + "\u2026" : t; }

    G.flex_getSubtitles = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"error":"Open a composition first."}'; }
        var ls = textLayers(comp), out = [], i;
        for (i = 0; i < ls.length; i += 1) {
            var L = ls[i], txt = textOf(L).replace(/\r\n|\r/g, "\n"), a = srtTime(L.inPoint), b = srtTime(L.outPoint);
            out.push('{"index":' + L.index + ',"displayStr":' + J(a + "  " + oneLine(txt, 60)) + ',"fullText":' + J(txt) + ',"inTimeStr":' + J(a) + ',"outTimeStr":' + J(b) + "}");
        }
        return '{"layers":[' + out.join(",") + "]}";
    };
    G.flex_updateSubtitle = function (index, newText, inStr, outStr) {
        if (F.isLocked) { return "Extension is locked. Enter your license key."; }
        var comp = H.activeComp();
        if (!comp) { return "Open a composition first."; }
        var L = null;
        try { L = comp.layer(parseInt(index, 10)); } catch (e) { L = null; }
        if (!L || !(L instanceof TextLayer)) { return "That subtitle layer no longer exists. Refresh the list."; }
        var tin = parseSrtTime(inStr), tout = parseSrtTime(outStr);
        if (isNaN(tin) || isNaN(tout)) { return "Times must look like 00:00:01,500"; }
        if (tout <= tin) { return "The end time must be after the start time."; }
        app.beginUndoGroup("Update Subtitle");
        try {
            setText(L, String(newText).replace(/\r\n|\n/g, "\r"));
            if (tin < L.inPoint) { L.inPoint = tin; L.outPoint = tout; } else { L.outPoint = tout; L.inPoint = tin; }
        } catch (e2) { app.endUndoGroup(); return e2.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function escRx(s) { return String(s).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); }
    G.flex_replaceWordInComp = function (search, replacement) {
        if (F.isLocked) { return "Extension is locked. Enter your license key."; }
        var comp = H.activeComp();
        if (!comp) { return "Open a composition first."; }
        if (!String(search).length) { return "Enter text to search for."; }
        var ls = textLayers(comp), i, changed = 0, rx = new RegExp(escRx(search), "gi");
        app.beginUndoGroup("Replace Text In Comp");
        try {
            for (i = 0; i < ls.length; i += 1) {
                var t = textOf(ls[i]);
                if (rx.test(t)) { rx.lastIndex = 0; setText(ls[i], t.replace(rx, function () { return String(replacement); })); changed += 1; }
                rx.lastIndex = 0;
            }
        } catch (e) { app.endUndoGroup(); return e.toString(); }
        app.endUndoGroup();
        return "SUCCESS:" + changed;
    };
    function transform(mode, t) {
        if (mode === "upper") { return t.toUpperCase(); }
        if (mode === "lower") { return t.toLowerCase(); }
        if (mode === "title") { return t.toLowerCase().replace(/(^|[\s\r\n\-"(])([a-z\u00e0-\u00ff])/g, function (m, p, c) { return p + c.toUpperCase(); }); }
        if (mode === "sentence") { return t.toLowerCase().replace(/(^|[.!?]\s+|[\r\n]+)([a-z\u00e0-\u00ff])/g, function (m, p, c) { return p + c.toUpperCase(); }); }
        return null;
    }
    G.flex_transformSubtitlesInComp = function (mode) {
        if (F.isLocked) { return "Extension is locked. Enter your license key."; }
        var comp = H.activeComp();
        if (!comp) { return "Open a composition first."; }
        mode = String(mode);
        if (transform(mode, "a") === null) { return "Unknown text transform: " + mode; }
        var ls = textLayers(comp), i, n = 0;
        app.beginUndoGroup("Transform Subtitles");
        try { for (i = 0; i < ls.length; i += 1) { var t = textOf(ls[i]), r = transform(mode, t); if (r !== t) { setText(ls[i], r); } n += 1; } }
        catch (e) { app.endUndoGroup(); return e.toString(); }
        app.endUndoGroup();
        return "SUCCESS:" + n;
    };

    // ---------- clipboard image (base64 PNG) -> file -> comp, used when the panel cannot write the file itself ----------
    var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    function b64ToBinary(s) {
        s = String(s).replace(/^data:[^,]*,/, "").replace(/[^A-Za-z0-9+\/]/g, "");
        var out = [], i = 0, a, b, c, d, n = s.length;
        function at(k) { return k < n ? B64.indexOf(s.charAt(k)) : -1; }   // note: indexOf("") is 0, so never look past the end
        while (i < n) {
            a = at(i); b = at(i + 1); c = at(i + 2); d = at(i + 3); i += 4;
            if (b < 0) { break; }
            out.push(String.fromCharCode((a << 2) | (b >> 4)));
            if (c >= 0) { out.push(String.fromCharCode(((b & 15) << 4) | (c >> 2))); }
            if (c >= 0 && d >= 0) { out.push(String.fromCharCode(((c & 3) << 6) | d)); }
        }
        return out.join("");
    }
    G.b64ToBinary_Akira = b64ToBinary; // exposed for testing
    G.pasteImage_FlexGUI = function (base64, appName) {
        if (F.isLocked) { return "Extension is locked."; }
        if (typeof G.getPasteImagePath_FlexGUI !== "function" || typeof G.pasteImageFromFile_FlexGUI !== "function") { return "The paste helper is not loaded."; }
        var path = G.getPasteImagePath_FlexGUI();
        if (String(path).indexOf("ERR") === 0) { return path; }
        try {
            var f = new File(path);
            if (!f.parent.exists) { f.parent.create(); }
            f.encoding = "BINARY";
            if (!f.open("w")) { return "Could not write the temporary image."; }
            f.write(b64ToBinary(base64)); f.close();
        } catch (e) { return e.toString(); }
        return G.pasteImageFromFile_FlexGUI(path, appName, false);
    };
})();
