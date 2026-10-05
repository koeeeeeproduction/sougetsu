// Sougetsu Akira FX - Comp Saver library, FFX presets and imports (clean-room). Batch D1.
// Library layout (our own design):
//   <library>/<category>/<uniqueId>/comp.aep   the saved comp (a reduced project: only that comp + its dependencies)
//                                   meta.txt   name=<url-encoded name>, created=<ms>
//                                   comp.png   still thumbnail      preview/frame_0001.png...  frames the panel turns into preview.gif
//   <ffxFolder>/<folders>/<name>.ffx           animation presets
// ES3 only: no let/const, arrow functions, JSON, Array.indexOf/forEach.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }
    var FFX_DIR = "FFX PRESETS";

    // ---------- generic helpers ----------
    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function plain(fileOrFolder) { return fileOrFolder.fsName.replace(/\\/g, "/"); }
    function safeName(s) { return String(s).replace(/[\\\/:*?"<>|]/g, "_").replace(/^\s+|\s+$/g, "").replace(/^\.+/, ""); }
    function isFolder(f) { return f instanceof Folder; }
    function rmrf(folder) {
        var items = folder.getFiles(), i;
        for (i = 0; i < items.length; i += 1) { if (items[i] instanceof Folder) { rmrf(items[i]); } else { try { items[i].remove(); } catch (e) { } } }
        try { folder.remove(); } catch (e2) { }
    }
    function copyDir(src, dst) {
        if (!dst.exists) { dst.create(); }
        var items = src.getFiles(), i;
        for (i = 0; i < items.length; i += 1) {
            if (items[i] instanceof Folder) { copyDir(items[i], new Folder(dst.fullName + "/" + items[i].name)); }
            else { items[i].copy(dst.fullName + "/" + items[i].name); }
        }
    }
    function moveDir(src, dst) { copyDir(src, dst); rmrf(src); }
    function uniqueFile(folder, name) {
        var f = new File(folder.fullName + "/" + name), dot = name.lastIndexOf("."), base = dot > 0 ? name.substring(0, dot) : name, ext = dot > 0 ? name.substring(dot) : "", n = 2;
        while (f.exists) { f = new File(folder.fullName + "/" + base + " " + n + ext); n += 1; }
        return f;
    }
    function readText(f) {
        f.encoding = "UTF-8";
        if (!f.exists || !f.open("r")) { return ""; }
        var s = f.read(); f.close(); return s;
    }
    function writeText(f, s) {
        f.encoding = "UTF-8";
        if (f.open("w")) { f.write(s); f.close(); return true; }
        return false;
    }

    // ---------- settings (library + presets locations) ----------
    function dataFolder() {
        var f = new Folder(Folder.userData.fullName + "/SougetsuAkiraFX");
        if (!f.exists) { f.create(); }
        return f;
    }
    function readSettings() {
        var o = {}, s = readText(new File(dataFolder().fullName + "/settings.ini")), lines = s.split(/\r\n|\r|\n/), i;
        for (i = 0; i < lines.length; i += 1) {
            var at = lines[i].indexOf("=");
            if (at > 0) { try { o[lines[i].substring(0, at)] = decodeURIComponent(lines[i].substring(at + 1)); } catch (e) { } }
        }
        return o;
    }
    function writeSettings(o) {
        var out = [], k;
        for (k in o) { if (o.hasOwnProperty(k) && o[k] !== "" && o[k] !== null) { out.push(k + "=" + encodeURIComponent(o[k])); } }
        writeText(new File(dataFolder().fullName + "/settings.ini"), out.join("\n"));
    }
    function defaultLib() { return new Folder(Folder.myDocuments.fullName + "/Akira FX/Assets Library"); }
    function libFolder() {
        var s = readSettings();
        return (s.libPath && s.libPath.length) ? new Folder(s.libPath) : defaultLib();
    }
    function libIsCustom() { var s = readSettings(); return !!(s.libPath && s.libPath.length); }
    function ffxFolder() {
        var s = readSettings();
        return (s.ffxPath && s.ffxPath.length) ? new Folder(s.ffxPath) : new Folder(libFolder().fullName + "/" + FFX_DIR);
    }
    function resolveLib(arg) { return (arg && String(arg).length) ? new Folder(String(arg)) : libFolder(); }
    function pickFolderArg(arg, prompt) {
        var f = (arg && String(arg).length && String(arg) !== "undefined") ? new Folder(String(arg)) : Folder.selectDialog(prompt);
        return (f && f.exists) ? f : null;
    }

    // ---------- library scanning ----------
    function entryMeta(entryFolder) {
        var meta = { name: decodeURI(entryFolder.name), created: 0 }, s = readText(new File(entryFolder.fullName + "/meta.txt")), lines = s.split(/\r\n|\r|\n/), i;
        for (i = 0; i < lines.length; i += 1) {
            var at = lines[i].indexOf("=");
            if (at < 1) { continue; }
            var k = lines[i].substring(0, at), v = lines[i].substring(at + 1);
            if (k === "name") { try { meta.name = decodeURIComponent(v); } catch (e) { meta.name = v; } }
            else if (k === "created") { meta.created = parseFloat(v) || 0; }
        }
        return meta;
    }
    function writeMeta(entryFolder, name, created) {
        writeText(new File(entryFolder.fullName + "/meta.txt"), "name=" + encodeURIComponent(name) + "\ncreated=" + created);
    }
    function listCategoryFolders(lib) {
        var out = [], items = lib.getFiles(isFolder), i;
        for (i = 0; i < items.length; i += 1) {
            var n = decodeURI(items[i].name);
            if (n.charAt(0) === "." || n === FFX_DIR) { continue; }
            out.push(items[i]);
        }
        return out;
    }
    function scanFfx(root, rel, files, folders) {
        var items = root.getFiles(), i;
        for (i = 0; i < items.length; i += 1) {
            var it = items[i], nm = decodeURI(it.name);
            if (it instanceof Folder) {
                if (nm.charAt(0) === ".") { continue; }
                var r = rel ? rel + "/" + nm : nm;
                folders.push(r);
                scanFfx(it, r, files, folders);
            } else if (/\.ffx$/i.test(nm)) {
                var base = nm.replace(/\.ffx$/i, "");
                files.push('{"name":' + jsonStr(base) + ',"path":' + jsonStr(rel ? rel + "/" + base : base) + ',"folder":' + jsonStr(rel) + "}");
            }
        }
    }
    F.scanPostComps = function () {
        var lib = libFolder();
        if (!lib.exists) {
            if (libIsCustom()) { return '{"path":' + jsonStr(plain(lib)) + ',"pathMissing":true}'; }
            lib.create();
        }
        var cats = listCategoryFolders(lib), catNames = [], comps = [], i, j;
        for (i = 0; i < cats.length; i += 1) {
            var cname = decodeURI(cats[i].name);
            catNames.push(jsonStr(cname));
            var entries = cats[i].getFiles(isFolder);
            for (j = 0; j < entries.length; j += 1) {
                var aep = new File(entries[j].fullName + "/comp.aep");
                if (!aep.exists) { continue; }
                var meta = entryMeta(entries[j]), png = new File(entries[j].fullName + "/comp.png"), gif = new File(entries[j].fullName + "/preview.gif");
                comps.push({ created: meta.created, json: '{"name":' + jsonStr(meta.name) + ',"uniqueId":' + jsonStr(decodeURI(entries[j].name)) + ',"category":' + jsonStr(cname) +
                    ',"aepPath":' + jsonStr(plain(aep)) + ',"thumbPath":' + jsonStr(png.exists ? plain(png) : "") + ',"gifPath":' + jsonStr(gif.exists ? plain(gif) : "") + "}" });
            }
        }
        comps.sort(function (a, b) { return b.created - a.created; });
        var cj = [];
        for (i = 0; i < comps.length; i += 1) { cj.push(comps[i].json); }
        var ffx = ffxFolder(), ffxFiles = [], ffxFolders = [];
        if (ffx.exists) { scanFfx(ffx, "", ffxFiles, ffxFolders); }
        var fj = [];
        for (i = 0; i < ffxFolders.length; i += 1) { fj.push(jsonStr(ffxFolders[i])); }
        return '{"path":' + jsonStr(plain(lib)) + ',"pathMissing":false,"categories":[' + catNames.join(",") + '],"comps":[' + cj.join(",") +
            '],"ffxPath":' + jsonStr(plain(ffx)) + ',"ffx":[' + ffxFiles.join(",") + '],"ffxFolders":[' + fj.join(",") + "]}";
    };

    // ---------- library folder + category management ----------
    F.pickSaveCompLibFolder = function (arg) {
        var f = pickFolderArg(arg, "Choose the Comp Saver library folder");
        if (!f) { return "null"; }
        var s = readSettings(); s.libPath = plain(f); writeSettings(s);
        return plain(f);
    };
    F.resetSaveCompLibFolder = function () {
        var s = readSettings(); delete s.libPath; writeSettings(s);
        return plain(defaultLib());
    };
    F.pickAssetFolder = function (arg) {
        var f = pickFolderArg(arg, "Choose the FFX presets folder");
        if (!f) { return "CANCELLED"; }
        var s = readSettings(); s.ffxPath = plain(f); writeSettings(s);
        return plain(f);
    };
    F.resetAssetFolder = function () {
        var s = readSettings(); delete s.ffxPath; writeSettings(s);
        return "OK";
    };
    F.createSaveCompCategory = function (lib, name) {
        var g = H.locked(); if (g) { return g; }
        var n = safeName(name);
        if (!n) { return "Error: Enter a category name."; }
        var f = new Folder(resolveLib(lib).fullName + "/" + n);
        if (f.exists) { return "Error: That category already exists."; }
        return f.create() ? "Success" : "Error: Could not create the category folder.";
    };
    F.deleteSaveCompCategory = function (lib, cat) {
        var g = H.locked(); if (g) { return g; }
        var n = safeName(cat);
        if (!n || n === FFX_DIR) { return "Error: Invalid category."; }
        var f = new Folder(resolveLib(lib).fullName + "/" + n);
        if (!f.exists) { return "Error: Category not found."; }
        rmrf(f);
        return "Success";
    };
    function entryFolder(lib, cat, id) { return new Folder(resolveLib(lib).fullName + "/" + safeName(cat) + "/" + safeName(id)); }
    F.deleteSaveCompEntry = function (lib, cat, id) {
        var g = H.locked(); if (g) { return g; }
        var f = entryFolder(lib, cat, id);
        if (!f.exists) { return "Error: Saved comp not found."; }
        rmrf(f);
        return "Success";
    };
    F.moveSaveCompAsset = function (lib, id, sourceCat, targetCat) {
        var g = H.locked(); if (g) { return g; }
        var src = entryFolder(lib, sourceCat, id);
        if (!src.exists) { return "Error: Saved comp not found."; }
        var targetCatFolder = new Folder(resolveLib(lib).fullName + "/" + safeName(targetCat));
        if (!targetCatFolder.exists) { targetCatFolder.create(); }
        var dst = new Folder(targetCatFolder.fullName + "/" + safeName(id));
        if (dst.exists) { return "Error: That category already has this comp."; }
        moveDir(src, dst);
        return "Success";
    };
    F.renameSaveCompAsset = function (lib, id, cat, newName) {
        var g = H.locked(); if (g) { return g; }
        var f = entryFolder(lib, cat, id);
        if (!f.exists) { return "Error: Saved comp not found."; }
        var n = String(newName).replace(/^\s+|\s+$/g, "");
        if (!n) { return "Error: Enter a name."; }
        writeMeta(f, n, entryMeta(f).created);
        return "Success";
    };
    F.deletePostComp = function (name) {   // legacy: delete by display name
        var g = H.locked(); if (g) { return g; }
        var lib = libFolder(), cats = listCategoryFolders(lib), i, j, hit = 0;
        for (i = 0; i < cats.length; i += 1) {
            var entries = cats[i].getFiles(isFolder);
            for (j = 0; j < entries.length; j += 1) { if (entryMeta(entries[j]).name === String(name)) { rmrf(entries[j]); hit += 1; } }
        }
        return hit ? "SUCCESS" : "ERR:Saved comp not found.";
    };

    // ---------- saving a comp ----------
    function pad4(n) { var s = String(n); while (s.length < 4) { s = "0" + s; } return s; }
    function saveStills(comp, folder, withFrames) {
        if (typeof comp.saveFrameToPng !== "function") { return; }
        try { comp.saveFrameToPng(comp.time, new File(folder.fullName + "/comp.png")); } catch (e) { }
        if (!withFrames) { return; }
        var pf = new Folder(folder.fullName + "/preview"); pf.create();
        var t0 = comp.workAreaStart, dur = Math.min(comp.workAreaDuration, 2.5), n = Math.max(2, Math.floor(dur * 15)), i;
        for (i = 0; i < n; i += 1) {
            try { comp.saveFrameToPng(Math.min(t0 + i / 15, comp.duration - comp.frameDuration), new File(pf.fullName + "/frame_" + pad4(i + 1) + ".png")); } catch (e2) { }
        }
    }
    F.savePostComp = function (lib, cat, saveGif) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "Error: Open the composition you want to save."; }
        if (!app.project.file) { return "Error: Save your project first (File > Save), then save the comp to the library."; }
        var catName = safeName(cat || "My Comps") || "My Comps";
        var root = resolveLib(lib);
        var catFolder = new Folder(root.fullName + "/" + catName);
        if (!catFolder.exists && !catFolder.create()) { return "Error: Could not create the category folder."; }
        var created = new Date().getTime(), id = String(created) + "_" + Math.floor(Math.random() * 1000);
        var entry = new Folder(catFolder.fullName + "/" + id);
        if (!entry.create()) { return "Error: Could not create the library entry."; }
        var withGif = (saveGif === true || String(saveGif) === "true"), name = comp.name, orig = app.project.file, reopened = false;
        try {
            saveStills(comp, entry, withGif);
            app.project.save();                               // protect the user's project before it is reduced
            app.project.reduceProject([comp]);                // keep only this comp and what it needs...
            app.project.save(new File(entry.fullName + "/comp.aep"));   // ...and store that as the library copy
            app.open(orig);                                   // go back to the real project
            reopened = true;
            writeMeta(entry, name, created);
        } catch (e) {
            if (!reopened) { try { app.open(orig); } catch (e2) { } }
            rmrf(entry);
            return "Error: " + e.toString();
        }
        return '{"status":"success","message":' + jsonStr('Saved "' + name + '" to ' + catName) + ',"compFolder":' + jsonStr(plain(entry)) + "}";
    };

    // ---------- importing saved comps ----------
    function findCompIn(folderItem, wanted) {
        var i, found = null;
        for (i = 1; i <= folderItem.numItems; i += 1) {
            var it = folderItem.item(i);
            if (it instanceof CompItem && (it.name === wanted || !found)) { found = it; if (it.name === wanted) { break; } }
            if (it instanceof FolderItem) { var sub = findCompIn(it, wanted); if (sub && (!found || sub.name === wanted)) { found = sub; } }
        }
        return found;
    }
    function importOne(aepPath) {
        var f = new File(String(aepPath));
        if (!f.exists) { return null; }
        var io = new ImportOptions(f);
        io.importAs = ImportAsType.PROJECT;
        var item = app.project.importFile(io), wanted = entryMeta(f.parent).name;
        var comp = (item instanceof FolderItem) ? findCompIn(item, wanted) : null;
        return { item: item, comp: comp };
    }
    F.importPostComp = function (aepPath) {
        var g = H.locked(); if (g) { return g; }
        app.beginUndoGroup("Import Saved Comp");
        try {
            var r = importOne(aepPath);
            if (!r) { app.endUndoGroup(); return "Error: The saved comp file was not found."; }
            if (r.comp) { r.comp.openInViewer(); }
        } catch (e) { app.endUndoGroup(); return "Error: " + e.toString(); }
        app.endUndoGroup();
        return "Success";
    };
    F.importMultiplePostComps = function (jsonArray) {
        var g = H.locked(); if (g) { return g; }
        var paths = [], rx = /"((?:[^"\\]|\\.)*)"/g, m;
        while ((m = rx.exec(String(jsonArray))) !== null) { paths.push(m[1].replace(/\\(["\\\/])/g, "$1")); }
        if (!paths.length) { return "Error: Nothing selected."; }
        var ok = 0, i;
        app.beginUndoGroup("Import Saved Comps");
        try { for (i = 0; i < paths.length; i += 1) { if (importOne(paths[i])) { ok += 1; } } }
        catch (e) { app.endUndoGroup(); return "Error: " + e.toString(); }
        app.endUndoGroup();
        return "Imported " + ok + " comp" + (ok === 1 ? "" : "s") + ".";
    };

    // ---------- FFX presets ----------
    function relFfx(p) {     // "folder/name" or "folder/name.ffx" -> File under the presets folder (or an absolute path)
        var s = String(p).replace(/\\/g, "/");
        if (!/\.ffx$/i.test(s)) { s += ".ffx"; }
        return /^([A-Za-z]:\/|\/)/.test(s) ? new File(s) : new File(ffxFolder().fullName + "/" + s);
    }
    F.saveFFX = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var s = String(arg), bar = s.lastIndexOf("|");
        if (bar < 0) { return "ERR:Bad arguments."; }
        var src = new File(s.substring(0, bar)), target = s.substring(bar + 1).replace(/\\/g, "/");
        if (!src.exists) { return "ERR:Preset file not found."; }
        var slash = target.lastIndexOf("/"), sub = slash >= 0 ? target.substring(0, slash) : "", nm = slash >= 0 ? target.substring(slash + 1) : target;
        if (!/\.ffx$/i.test(nm)) { nm += ".ffx"; }
        var dir = sub ? new Folder(ffxFolder().fullName + "/" + sub) : ffxFolder();
        if (!dir.exists) { dir.create(); }
        var dest = uniqueFile(dir, safeName(nm));
        return src.copy(dest.fullName) ? "SUCCESS" : "ERR:Could not copy the preset.";
    };
    F.deleteFFX = function (p) {
        var g = H.locked(); if (g) { return g; }
        var f = relFfx(p);
        if (!f.exists) { return "ERR:Preset not found."; }
        var thumb = new File(f.fullName.replace(/\.ffx$/i, ".png")); if (thumb.exists) { try { thumb.remove(); } catch (e) { } }
        return f.remove() ? "SUCCESS" : "ERR:Could not delete the preset.";
    };
    F.createFFXFolder = function (p) {
        var g = H.locked(); if (g) { return g; }
        var rel = String(p).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!rel) { return "ERR:Enter a folder name."; }
        var f = new Folder(ffxFolder().fullName + "/" + rel);
        return (f.exists || f.create()) ? "SUCCESS" : "ERR:Could not create the folder.";
    };
    F.deleteFFXFolder = function (p) {
        var g = H.locked(); if (g) { return g; }
        var rel = String(p).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!rel) { return "ERR:Invalid folder."; }
        var f = new Folder(ffxFolder().fullName + "/" + rel);
        if (!f.exists) { return "ERR:Folder not found."; }
        rmrf(f);
        return "SUCCESS";
    };
    // "relative/path/name|targetFolder" (target "" = the presets root)
    F.moveFFX = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var s = String(arg), bar = s.lastIndexOf("|");
        if (bar < 0) { return "ERR:Bad arguments."; }
        var src = relFfx(s.substring(0, bar)), target = s.substring(bar + 1).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!src.exists) { return "ERR:Preset not found."; }
        var dir = target ? new Folder(ffxFolder().fullName + "/" + target) : ffxFolder();
        if (!dir.exists) { dir.create(); }
        var dest = uniqueFile(dir, decodeURI(src.name));
        if (dest.fullName === src.fullName) { return "SUCCESS"; }
        if (!src.copy(dest.fullName)) { return "ERR:Could not move the preset."; }
        src.remove();
        return "SUCCESS";
    };
    // save the selected properties (or layer) as an animation preset; needs an After Effects version that can do this from a script
    F.savePresetFromSelection = function (name, folder) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR: Open a composition first."; }
        var n = safeName(name);
        if (!n) { return "ERR: Enter a preset name."; }
        var dir = (folder && String(folder).length) ? new Folder(ffxFolder().fullName + "/" + String(folder).replace(/\\/g, "/")) : ffxFolder();
        if (!dir.exists) { dir.create(); }
        var dest = uniqueFile(dir, n + ".ffx"), targets = [], i;
        var props = comp.selectedProperties;
        for (i = 0; i < props.length; i += 1) { if (typeof props[i].saveAnimationPreset === "function") { targets.push(props[i]); } }
        if (!targets.length) { var ls = H.selectedLayers(comp); for (i = 0; i < ls.length; i += 1) { if (typeof ls[i].saveAnimationPreset === "function") { targets.push(ls[i]); } } }
        if (!targets.length) { return "ERR: This version of After Effects cannot save presets from a script. Use Animation > Save Animation Preset."; }
        try { targets[0].saveAnimationPreset(dest); } catch (e) { return "ERR: " + e.toString(); }
        return dest.exists ? "SUCCESS" : "ERR: The preset was not written.";
    };
    F.flexSendCompToPremiere = function () { return "ERR:Sending to Premiere is not available in this version."; };
})();
