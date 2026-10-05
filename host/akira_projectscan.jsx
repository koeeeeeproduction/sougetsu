// Sougetsu Akira FX - Project scans, relink & diagnostics (clean-room). Batch J3.
// Contract (read from the panel):
//   scanCompStructure() -> JSON tree from the active comp down through precomps
//   getNullLayers() -> JSON array [{index,name,compName}]
//   countOfflineMedia() -> JSON {count, items:[{id,name}]}
//   checkAutoRelinkMatches(folderPath, ignoreExt) -> "DETAIL:"+JSON {matched,total,items:[{name,found,path}]}
//   commitAutoRelink() -> "SUCCESS:msg" / "ERR:" (applies the last scan)
//   getLayerData(index|"") -> JSON dump of selected (or given index) layer's key properties
//   debugLayerData() -> same as getLayerData but for every selected layer, as a JSON array
//   getProjectSaveInfo() -> "UNSAVED|" / "FILE|path|modifiedMs"
//   httpPostCurl(url, encodeURIComponent(bodyJSON)) -> response text or "ERR:"
//   runDiagnostic() -> JSON blob for Settings > Copy Diagnostic Info
//   scanInstalledPlugins() -> JSON array of plugin file names found in the AE Plug-ins folder
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function enc(s) { return encodeURIComponent(String(s)); }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }

    // ---------- comp nesting tree from the active comp ----------
    function compNode(comp, seen) {
        if (seen[comp.id]) { return '{"name":' + jsonStr(comp.name) + ',"recursive":true}'; }
        seen[comp.id] = true;
        var kids = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var L = comp.layer(i);
            if (L.source && (L.source instanceof CompItem)) { kids.push(compNode(L.source, seen)); }
        }
        delete seen[comp.id];
        return '{"name":' + jsonStr(comp.name) + ',"numLayers":' + comp.numLayers + ',"children":[' + kids.join(",") + ']}';
    }
    F.scanCompStructure = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"error":"Open a composition first."}'; }
        return compNode(comp, {});
    };

    // ---------- null layers in the active comp ----------
    F.getNullLayers = function () {
        var comp = H.activeComp();
        if (!comp) { return "[]"; }
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var L = comp.layer(i);
            var lid = ""; try { lid = L.id === undefined ? "" : String(L.id); } catch (e) { }
            if (L.nullLayer) { out.push('{"index":' + L.index + ',"id":' + jsonStr(lid) + ',"compId":' + jsonStr(comp.id) + ',"name":' + jsonStr(L.name) + ',"compName":' + jsonStr(comp.name) + '}'); }
        }
        return "[" + out.join(",") + "]";
    };

    // ---------- offline footage count ----------
    function offlineItems() {
        var proj = app.project, out = [], i;
        for (i = 1; i <= proj.numItems; i += 1) {
            var it = proj.item(i);
            if (it instanceof FootageItem) {
                var mf = it.mainSource;
                if (mf && mf instanceof FileSource && mf.missingFootagePath) { out.push(it); }
            }
        }
        return out;
    }
    F.countOfflineMedia = function () {
        var items = offlineItems(), out = [], i;
        for (i = 0; i < items.length; i += 1) { out.push('{"id":' + items[i].id + ',"name":' + jsonStr(items[i].name) + '}'); }
        return '{"count":' + items.length + ',"items":[' + out.join(",") + ']}';
    };

    // ---------- relink: scan a folder tree for files matching offline items (no changes applied) ----------
    // checkAutoRelinkMatches("C:/path", ignoreExt) -> "DETAIL:"+JSON {matched,total,items:[{name,found,path}]}
    // commitAutoRelink() relinks what the last scan found -> "SUCCESS:msg" / "ERR:msg"
    function stem(n) { var d = n.lastIndexOf("."); return (d > 0 ? n.substring(0, d) : n).toLowerCase(); }
    function folderFiles(folderPath, ignoreExt) {
        var out = {}, count = 0, queue = [{ f: new Folder(String(folderPath)), d: 0 }];
        while (queue.length && count < 50000) {
            var q = queue.shift(), files, i;
            if (!q.f.exists) { continue; }
            try { files = q.f.getFiles(); } catch (e) { continue; }
            for (i = 0; i < files.length; i += 1) {
                if (files[i] instanceof File) {
                    var k = ignoreExt ? stem(files[i].name) : files[i].name.toLowerCase();
                    if (!out.hasOwnProperty(k)) { out[k] = files[i].fsName; }
                    count += 1;
                } else if (q.d < 10) { queue.push({ f: files[i], d: q.d + 1 }); }
            }
        }
        return out;
    }
    function itemKey(it, ignoreExt) {
        var n = it.name;
        try { if (it.mainSource && it.mainSource.missingFootagePath) { n = String(it.mainSource.missingFootagePath).replace(/\\/g, "/"); n = n.substring(n.lastIndexOf("/") + 1); } } catch (e) { }
        return ignoreExt ? stem(n) : n.toLowerCase();
    }
    F.checkAutoRelinkMatches = function (arg, ignoreExt) {
        var folderPath = String(arg || "");
        if (folderPath.indexOf("%") >= 0) { folderPath = decodeArg(folderPath); }
        ignoreExt = (ignoreExt === true || ignoreExt === "true");
        if (!new Folder(folderPath).exists) { return "ERR:Folder not found: " + folderPath; }
        var items = offlineItems(), map = folderFiles(folderPath, ignoreExt), rows = [], matched = 0, i;
        F._relinkPending = [];
        for (i = 0; i < items.length; i += 1) {
            var found = map[itemKey(items[i], ignoreExt)];
            if (found) { matched += 1; F._relinkPending.push({ id: items[i].id, path: found }); }
            rows.push('{"name":' + jsonStr(items[i].name) + ',"found":' + (found ? "true" : "false") + ',"path":' + jsonStr(found || "") + '}');
        }
        return 'DETAIL:{"matched":' + matched + ',"total":' + items.length + ',"items":[' + rows.join(",") + ']}';
    };

    // ---------- relink: apply the last scan (or an explicit [{id,newPath}] list) ----------
    F.commitAutoRelink = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var pairs = [], m, i, j;
        if (arg) {
            var s = decodeArg(arg), re = /"id"\s*:\s*(\d+)\s*,\s*"newPath"\s*:\s*"((?:\\.|[^"\\])*)"/g;
            while ((m = re.exec(s)) !== null) { pairs.push({ id: parseInt(m[1], 10), path: m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\") }); }
        } else if (F._relinkPending) { pairs = F._relinkPending; }
        if (!pairs.length) { return "ERR:Nothing to relink. Scan a folder first."; }
        var proj = app.project, done = 0;
        app.beginUndoGroup("Relink Media");
        try {
            for (i = 0; i < pairs.length; i += 1) {
                for (j = 1; j <= proj.numItems; j += 1) {
                    var it = proj.item(j);
                    if (it instanceof FootageItem && it.id === pairs[i].id) {
                        var f = new File(pairs[i].path);
                        if (f.exists) { try { it.replace(f); done += 1; } catch (e1) { } }
                        break;
                    }
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        F._relinkPending = null;
        return done ? ("SUCCESS:Relinked " + done + " item" + (done === 1 ? "" : "s") + ".") : "ERR:None of the matched files could be relinked.";
    };

    // ---------- single-layer debug dump ----------
    function layerDump(L, comp) {
        var fx = [], i, effParade = null;
        try { effParade = L.property("ADBE Effect Parade"); } catch (e0) { }
        if (effParade) { for (i = 1; i <= effParade.numProperties; i += 1) { fx.push(jsonStr(effParade.property(i).matchName)); } }
        var src = "";
        try { src = L.source ? L.source.name : ""; } catch (e1) { }
        return '{"index":' + L.index + ',"name":' + jsonStr(L.name) + ',"compName":' + jsonStr(comp.name) +
            ',"enabled":' + (L.enabled ? "true" : "false") + ',"locked":' + (L.locked ? "true" : "false") +
            ',"inPoint":' + L.inPoint + ',"outPoint":' + L.outPoint + ',"startTime":' + L.startTime +
            ',"is3D":' + (L.threeDLayer ? "true" : "false") + ',"blendMode":' + L.blendingMode +
            ',"source":' + jsonStr(src) + ',"effects":[' + fx.join(",") + ']}';
    }
    F.getLayerData = function (indexArg) {
        var comp = H.activeComp();
        if (!comp) { return '{"error":"Open a composition first."}'; }
        var idx = parseInt(indexArg, 10), L;
        if (!isNaN(idx) && idx >= 1 && idx <= comp.numLayers) { L = comp.layer(idx); }
        else { var sel = H.selectedLayers(comp); if (!sel.length) { return '{"error":"Select a layer."}'; } L = sel[0]; }
        return layerDump(L, comp);
    };
    F.debugLayerData = function () {
        var comp = H.activeComp();
        if (!comp) { return "[]"; }
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) { out.push(layerDump(sel[i], comp)); }
        return "[" + out.join(",") + "]";
    };

    // ---------- project save info ----------
    // The autosave timer only compares replies: changes when the project file is saved (path or modified time).
    F.getProjectSaveInfo = function () {
        var f = null;
        try { f = app.project.file; } catch (e) { }
        if (!f) { return "UNSAVED|"; }
        var t = "";
        try { t = String(f.modified ? f.modified.getTime() : ""); } catch (e1) { }
        return "FILE|" + f.fsName + "|" + t;
    };

    // ---------- HTTP POST via a system curl call (ExtendScript has no native HTTP client) ----------
    F.httpPostCurl = function (url, bodyArg) {
        try {
            var body = decodeArg(bodyArg || "");
            var tmp = new File(Folder.temp.fsName + "/akira_curl_" + Math.floor(Math.random() * 1e8) + ".json");
            tmp.encoding = "UTF-8"; tmp.open("w"); tmp.write(body); tmp.close();
            var cmd = 'curl -s -X POST -H "Content-Type: application/json" --data-binary @"' + tmp.fsName + '" "' + String(url) + '"';
            var result = system.callSystem(cmd);
            try { tmp.remove(); } catch (e0) { }
            return result || "";
        } catch (e) { return "ERR:" + e.toString(); }
    };

    // ---------- diagnostic blob for support requests ----------
    F.runDiagnostic = function () {
        var proj = app.project, path = "";
        try { if (proj.file) { path = proj.file.fsName; } } catch (e) { }
        var offline = offlineItems().length;
        return '{"appVersion":' + jsonStr(app.version) + ',"os":' + jsonStr($.os) + ',"panelVersion":' + jsonStr(F.coreVersion || "") +
            ',"locked":' + (F.isLocked ? "true" : "false") + ',"projectPath":' + jsonStr(path) +
            ',"numItems":' + proj.numItems + ',"offlineMedia":' + offline + '}';
    };

    // ---------- list installed third-party plugin files from the AE Plug-ins folder ----------
    F.scanInstalledPlugins = function () {
        try {
            var pluginsFolder = new Folder(Folder.appPackage ? Folder.appPackage.fsName + "/Plug-ins" : "");
            if (!pluginsFolder.exists) { pluginsFolder = new Folder(app.path.fsName + "/Plug-ins"); }
            if (!pluginsFolder.exists) { return "[]"; }
            var names = [];
            function walk(folder, depth) {
                if (depth > 4) { return; }
                var items = folder.getFiles(), i;
                for (i = 0; i < items.length; i += 1) {
                    if (items[i] instanceof Folder) { walk(items[i], depth + 1); }
                    else {
                        var n = items[i].name;
                        if (/\.(aex|plugin|bundle)$/i.test(n)) { names.push(jsonStr(n)); }
                    }
                }
            }
            walk(pluginsFolder, 0);
            return "[" + names.join(",") + "]";
        } catch (e) { return "[]"; }
    };
})();
