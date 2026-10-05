// Sougetsu Akira FX - Font Replacement engine (clean-room). Batch K.
// Contract (read from the panel, prefix frHost_):
//   frHost_loadFonts()                     -> "OK:"+usedCount  (rebuilds the project font-usage cache)
//   frHost_scan()                          -> JSON [{font,count,comps:[...],installed:bool}]
//   frHost_usable(fontPostScriptName)      -> "true" / "false"
//   frHost_ffWhere(fontPostScriptName)     -> JSON {installed,family,style}
//   frHost_ffGoto(fontPostScriptName)      -> "OK:"+count (selects every layer using that font, jumps to its comp)
//   frHost_ffPickFolder()                  -> folder path or ""
//   frHost_ffCollect(encodeURIComponent(destFolder)) -> JSON {found:[...],missing:[...]}
//   frHost_ffInstall(fontFilePath)         -> "SUCCESS" / "ERR:"
//   frHost_ffInstallLocal(folderPath)      -> "OK:"+count installed
//   frHost_ffRebind(encodeURIComponent(JSON {oldFont,newFont})) -> "SUCCESS"  (stages a mapping, does not touch text yet)
//   frHost_replace(encodeURIComponent(JSON {oldFont,newFont,scope})) -> "OK:"+count  (scope: "all"|"selected")
//   frHost_replaceMulti(encodeURIComponent(JSON [{oldFont,newFont},...])) -> "OK:"+count
//   frHost_report()                        -> JSON (scan + staged rebind overlay)
//   frHost_saveReport(path)                -> "OK:"+path / "ERR:"
//   getFontReplSettings()                  -> JSON of stored settings + rebind map
//   saveFontReplSettings(encodeURIComponent(JSON)) -> "SUCCESS"
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function strField(s, name) { var m = new RegExp('"' + name + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(s); return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""; }

    // ---------- settings (own file, separate from the asset-library settings) ----------
    function readText(f) { f.encoding = "UTF-8"; if (!f.exists || !f.open("r")) { return ""; } var s = f.read(); f.close(); return s; }
    function writeText(f, s) { f.encoding = "UTF-8"; if (f.open("w")) { f.write(s); f.close(); return true; } return false; }
    function dataFolder() { var fo = new Folder(Folder.userData.fullName + "/SougetsuAkiraFX"); if (!fo.exists) { fo.create(); } return fo; }
    function settingsFile() { return new File(dataFolder().fullName + "/font_repl.ini"); }
    function readSettings() {
        var o = {}, s = readText(settingsFile()), lines = s.split(/\r\n|\r|\n/), i;
        for (i = 0; i < lines.length; i += 1) {
            var at = lines[i].indexOf("=");
            if (at > 0) { try { o[lines[i].substring(0, at)] = decodeURIComponent(lines[i].substring(at + 1)); } catch (e) { } }
        }
        return o;
    }
    function writeSettings(o) {
        var out = [], k;
        for (k in o) { if (o.hasOwnProperty(k) && o[k] !== "" && o[k] !== null && o[k] !== undefined) { out.push(k + "=" + encodeURIComponent(o[k])); } }
        writeText(settingsFile(), out.join("\n"));
    }
    function rebindMap() {
        var s = readSettings(), map = {}, k;
        for (k in s) { if (s.hasOwnProperty(k) && k.indexOf("rebind:") === 0) { map[k.substring(7)] = s[k]; } }
        return map;
    }
    function setRebind(oldFont, newFont) { var s = readSettings(); s["rebind:" + oldFont] = newFont; writeSettings(s); }

    // ---------- installed fonts ----------
    function installedFamilies() {
        var out = {}, i, j;
        try {
            var all = app.fonts.allFonts;
            for (i = 0; i < all.length; i += 1) {
                var fam = all[i];
                for (j = 0; j < fam.length; j += 1) { if (fam[j].postScriptName) { out[fam[j].postScriptName] = { family: fam[j].family, style: fam[j].style }; } }
            }
        } catch (e) { }
        return out;
    }

    // ---------- scan every comp's text layers for fonts in use ----------
    function allComps() {
        var out = [], i, p = app.project;
        for (i = 1; i <= p.numItems; i += 1) { if (p.item(i) instanceof CompItem) { out.push(p.item(i)); } }
        return out;
    }
    function docOf(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function scanUsage() {
        var comps = allComps(), usage = {}, order = [], ci, li;
        for (ci = 0; ci < comps.length; ci += 1) {
            var comp = comps[ci];
            for (li = 1; li <= comp.numLayers; li += 1) {
                var L = comp.layer(li);
                if (!(L instanceof TextLayer)) { continue; }
                var font = ""; try { font = docOf(L).value.font || ""; } catch (e) { continue; }
                if (!font) { continue; }
                if (!usage[font]) { usage[font] = { font: font, count: 0, comps: {} }; order.push(font); }
                usage[font].count += 1;
                usage[font].comps[comp.name] = true;
            }
        }
        var list = [], i;
        for (i = 0; i < order.length; i += 1) {
            var u = usage[order[i]], compNames = [], k;
            for (k in u.comps) { if (u.comps.hasOwnProperty(k)) { compNames.push(k); } }
            list.push({ font: u.font, count: u.count, comps: compNames });
        }
        return list;
    }

    F.frHost_loadFonts = function () {
        try { F._fontCache = scanUsage(); return "OK:" + F._fontCache.length; }
        catch (e) { return "ERR:" + e.toString(); }
    };

    F.frHost_scan = function () {
        var list, installed;
        try { list = scanUsage(); installed = installedFamilies(); } catch (e) { return "[]"; }
        var out = [], i;
        for (i = 0; i < list.length; i += 1) {
            var u = list[i], compsJson = [], c;
            for (c = 0; c < u.comps.length; c += 1) { compsJson.push(jsonStr(u.comps[c])); }
            out.push('{"font":' + jsonStr(u.font) + ',"count":' + u.count + ',"comps":[' + compsJson.join(",") + ']' +
                ',"installed":' + (installed[u.font] ? "true" : "false") + '}');
        }
        return "[" + out.join(",") + "]";
    };

    F.frHost_usable = function (fontName) {
        var installed = installedFamilies();
        return installed[String(fontName)] ? "true" : "false";
    };

    F.frHost_ffWhere = function (fontName) {
        var installed = installedFamilies(), hit = installed[String(fontName)];
        if (!hit) { return '{"installed":false}'; }
        return '{"installed":true,"family":' + jsonStr(hit.family) + ',"style":' + jsonStr(hit.style) + '}';
    };

    F.frHost_ffGoto = function (fontName) {
        var comps = allComps(), found = 0, firstComp = null, ci, li;
        fontName = String(fontName);
        for (ci = 0; ci < comps.length; ci += 1) {
            var comp = comps[ci], hitInThisComp = false;
            for (li = 1; li <= comp.numLayers; li += 1) {
                var L = comp.layer(li);
                if (!(L instanceof TextLayer)) { continue; }
                var font = ""; try { font = docOf(L).value.font || ""; } catch (e) { continue; }
                if (font !== fontName) { L.selected = false; continue; }
                L.selected = true; found += 1; hitInThisComp = true;
                if (!firstComp) { firstComp = comp; }
            }
        }
        if (found && firstComp) { try { firstComp.openInViewer(); } catch (e1) { } }
        return found ? ("OK:" + found) : "ERR:No layers use that font.";
    };

    // ---------- collect / install font files ----------
    F.frHost_ffPickFolder = function () {
        var f = Folder.selectDialog("Choose a folder");
        return f ? f.fsName : "";
    };

    function systemFontFolders() {
        var out = [];
        if ($.os.indexOf("Windows") !== -1) {
            out.push(new Folder("C:/Windows/Fonts"));
            out.push(new Folder(Folder.userData.fullName + "/../Local/Microsoft/Windows/Fonts"));
        } else {
            out.push(new Folder("/Library/Fonts"));
            out.push(new Folder(Folder.userData.fullName + "/Fonts")); // ~/Library/Fonts on mac (userData = ~/Library/Application Support)
            out.push(new Folder("/System/Library/Fonts"));
        }
        return out;
    }
    function fuzzyMatchFile(folder, fontPostScriptName) {
        if (!folder.exists) { return null; }
        var files = folder.getFiles(function (f) { return f instanceof File && /\.(ttf|otf|ttc)$/i.test(f.name); }), i;
        var needle = String(fontPostScriptName).replace(/[-_ ]/g, "").toLowerCase();
        for (i = 0; i < files.length; i += 1) {
            var base = files[i].name.replace(/\.(ttf|otf|ttc)$/i, "").replace(/[-_ ]/g, "").toLowerCase();
            if (base === needle || base.indexOf(needle) !== -1 || needle.indexOf(base) !== -1) { return files[i]; }
        }
        return null;
    }
    F.frHost_ffCollect = function (destArg) {
        var destPath = decodeArg(destArg);
        if (!destPath.length) { return '{"found":[],"missing":[],"error":"No destination folder."}'; }
        var dest = new Folder(destPath);
        if (!dest.exists) { dest.create(); }
        var used = scanUsage(), folders = systemFontFolders(), found = [], missing = [], i, j;
        for (i = 0; i < used.length; i += 1) {
            var hit = null;
            for (j = 0; j < folders.length && !hit; j += 1) { hit = fuzzyMatchFile(folders[j], used[i].font); }
            if (hit) { try { hit.copy(dest.fullName + "/" + hit.name); found.push(jsonStr(used[i].font)); } catch (e) { missing.push(jsonStr(used[i].font)); } }
            else { missing.push(jsonStr(used[i].font)); }
        }
        return '{"found":[' + found.join(",") + '],"missing":[' + missing.join(",") + ']}';
    };

    function userFontInstallFolder() {
        if ($.os.indexOf("Windows") !== -1) { return new Folder(Folder.userData.fullName + "/../Local/Microsoft/Windows/Fonts"); }
        return new Folder(Folder.userData.fullName + "/Fonts");
    }
    F.frHost_ffInstall = function (fontFilePath) {
        var g = H.locked(); if (g) { return g; }
        var src = new File(String(fontFilePath));
        if (!src.exists) { return "ERR:Font file not found."; }
        var destFolder = userFontInstallFolder();
        if (!destFolder.exists) { destFolder.create(); }
        try {
            var ok = src.copy(destFolder.fullName + "/" + src.name);
            return ok ? "SUCCESS" : "ERR:Copy failed.";
        } catch (e) { return "ERR:" + e.toString(); }
    };
    F.frHost_ffInstallLocal = function (folderPath) {
        var g = H.locked(); if (g) { return g; }
        var src = new Folder(String(folderPath));
        if (!src.exists) { return "ERR:Folder not found."; }
        var files = src.getFiles(function (f) { return f instanceof File && /\.(ttf|otf|ttc)$/i.test(f.name); });
        var destFolder = userFontInstallFolder();
        if (!destFolder.exists) { destFolder.create(); }
        var done = 0, i;
        for (i = 0; i < files.length; i += 1) {
            try { if (files[i].copy(destFolder.fullName + "/" + files[i].name)) { done += 1; } } catch (e) { }
        }
        return "OK:" + done;
    };

    // ---------- stage a rebind mapping (old font -> replacement) without touching the project yet ----------
    F.frHost_ffRebind = function (arg) {
        var s = decodeArg(arg), oldFont = strField(s, "oldFont"), newFont = strField(s, "newFont");
        if (!oldFont.length || !newFont.length) { return "ERR:oldFont and newFont are required."; }
        setRebind(oldFont, newFont);
        return "SUCCESS";
    };

    // ---------- apply replacements ----------
    function replaceFontEverywhere(oldFont, newFont, scope) {
        var comps, count = 0, ci, li;
        if (scope === "selected") { var active = H.activeComp(); comps = active ? [active] : []; }
        else { comps = allComps(); }
        for (ci = 0; ci < comps.length; ci += 1) {
            var comp = comps[ci];
            var layers = (scope === "selected") ? H.selectedLayers(comp) : null, li2;
            if (layers) {
                for (li2 = 0; li2 < layers.length; li2 += 1) {
                    var L = layers[li2];
                    if (!(L instanceof TextLayer)) { continue; }
                    var p = docOf(L), td;
                    try { td = p.value; } catch (e) { continue; }
                    if (td.font === oldFont) { td.font = newFont; p.setValue(td); count += 1; }
                }
            } else {
                for (li = 1; li <= comp.numLayers; li += 1) {
                    var L2 = comp.layer(li);
                    if (!(L2 instanceof TextLayer)) { continue; }
                    var p2 = docOf(L2), td2;
                    try { td2 = p2.value; } catch (e2) { continue; }
                    if (td2.font === oldFont) { td2.font = newFont; p2.setValue(td2); count += 1; }
                }
            }
        }
        return count;
    }
    F.frHost_replace = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var s = decodeArg(arg), oldFont = strField(s, "oldFont"), newFont = strField(s, "newFont");
        var scopeM = /"scope"\s*:\s*"(all|selected)"/.exec(s), scope = scopeM ? scopeM[1] : "all";
        if (!oldFont.length || !newFont.length) { return "ERR:oldFont and newFont are required."; }
        var count;
        app.beginUndoGroup("Replace Font");
        try { count = replaceFontEverywhere(oldFont, newFont, scope); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + count;
    };
    F.frHost_replaceMulti = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var s = decodeArg(arg), re = /"oldFont"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"newFont"\s*:\s*"((?:\\.|[^"\\])*)"/g, m, pairs = [];
        while ((m = re.exec(s)) !== null) {
            pairs.push({ oldFont: m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"), newFont: m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\") });
        }
        if (!pairs.length) { return "ERR:No replacement pairs supplied."; }
        var total = 0, i;
        app.beginUndoGroup("Replace Fonts (Batch)");
        try { for (i = 0; i < pairs.length; i += 1) { total += replaceFontEverywhere(pairs[i].oldFont, pairs[i].newFont, "all"); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + total;
    };

    // ---------- report ----------
    F.frHost_report = function () {
        var list, installed, map;
        try { list = scanUsage(); installed = installedFamilies(); map = rebindMap(); } catch (e) { return "[]"; }
        var out = [], i;
        for (i = 0; i < list.length; i += 1) {
            var u = list[i], compsJson = [], c;
            for (c = 0; c < u.comps.length; c += 1) { compsJson.push(jsonStr(u.comps[c])); }
            var rebind = map[u.font] || "";
            var status = installed[u.font] ? "installed" : (rebind.length ? "staged" : "missing");
            out.push('{"font":' + jsonStr(u.font) + ',"count":' + u.count + ',"comps":[' + compsJson.join(",") + ']' +
                ',"installed":' + (installed[u.font] ? "true" : "false") + ',"rebindTo":' + jsonStr(rebind) + ',"status":' + jsonStr(status) + '}');
        }
        return "[" + out.join(",") + "]";
    };
    F.frHost_saveReport = function (path) {
        var g = H.locked(); if (g) { return g; }
        var list;
        try { list = scanUsage(); } catch (e) { return "ERR:" + e.toString(); }
        var installed = installedFamilies(), map = rebindMap();
        var lines = ["Font\tUsageCount\tComps\tInstalled\tRebindTo\tStatus"], i;
        for (i = 0; i < list.length; i += 1) {
            var u = list[i], rebind = map[u.font] || "";
            var status = installed[u.font] ? "installed" : (rebind.length ? "staged" : "missing");
            lines.push(u.font + "\t" + u.count + "\t" + u.comps.join(";") + "\t" + (installed[u.font] ? "yes" : "no") + "\t" + rebind + "\t" + status);
        }
        var target = (path && String(path).length) ? String(path) : (dataFolder().fullName + "/font_report.txt");
        var f = new File(target);
        if (!writeText(f, lines.join("\n"))) { return "ERR:Could not write report."; }
        return "OK:" + f.fsName;
    };

    // ---------- settings ----------
    F.getFontReplSettings = function () {
        var s = readSettings(), map = rebindMap(), out = [], k;
        for (k in map) { if (map.hasOwnProperty(k)) { out.push('{"oldFont":' + jsonStr(k) + ',"newFont":' + jsonStr(map[k]) + '}'); } }
        return '{"collectFolder":' + jsonStr(s.collectFolder || "") + ',"installFolder":' + jsonStr(s.installFolder || "") +
            ',"lastReportPath":' + jsonStr(s.lastReportPath || "") + ',"rebind":[' + out.join(",") + ']}';
    };
    F.saveFontReplSettings = function (arg) {
        var s = decodeArg(arg), o = readSettings();
        var cf = strField(s, "collectFolder"), inf = strField(s, "installFolder"), lr = strField(s, "lastReportPath");
        if (cf.length) { o.collectFolder = cf; }
        if (inf.length) { o.installFolder = inf; }
        if (lr.length) { o.lastReportPath = lr; }
        writeSettings(o);
        return "SUCCESS";
    };
})();
