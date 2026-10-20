// Sowveil - Project Library engine.
// Layout:  <library>/<id>/project.aep   copy of the project
//                         cover.png     still of the active / first comp
//                         comps/<n>.png still of every comp inside
//                         meta.txt      name, created, source, comps (name|thumb|w|h|dur ...)
(function () {
    var SV = $._sv, U = SV._u;

    function libRoot(a) {
        var p = U.str(a && a.lib, "");
        var f = p.length ? new Folder(p) : new Folder(Folder.myDocuments.fullName + "/Sowveil/Project Library");
        if (!f.exists) { f.create(); }
        return f;
    }
    function stillTime(c) { return Math.min(c.workAreaStart + c.workAreaDuration * 0.5, c.duration - c.frameDuration); }
    function still(c, file) {
        if (typeof c.saveFrameToPng !== "function") { return false; }
        try { c.saveFrameToPng(stillTime(c), file); } catch (e) { return false; }
        return file.exists;
    }
    function compsIn(folderItem, out) {
        var i, it;
        for (i = 1; i <= folderItem.numItems; i += 1) {
            it = folderItem.item(i);
            if (it instanceof CompItem) { out.push(it); } else if (it instanceof FolderItem) { compsIn(it, out); }
        }
        return out;
    }
    function allComps() { var out = [], i; for (i = 1; i <= app.project.numItems; i += 1) { if (app.project.item(i) instanceof CompItem) { out.push(app.project.item(i)); } } return out; }
    function newEntry(root) {
        var created = new Date().getTime(), e = new Folder(root.fullName + "/" + created + "_" + Math.floor(Math.random() * 1000));
        e.create(); new Folder(e.fullName + "/comps").create();
        return { folder: e, created: created };
    }
    // stills of each comp + meta.txt; `cover` = preferred comp for the cover image
    function describe(entry, comps, cover, name, source) {
        var lines = [], i, c, png, coverFile = new File(entry.folder.fullName + "/cover.png");
        if (cover) { still(cover, coverFile); }
        for (i = 0; i < comps.length; i += 1) {
            c = comps[i]; png = new File(entry.folder.fullName + "/comps/" + i + ".png");
            var okPng = still(c, png);
            if (!coverFile.exists && okPng) { try { png.copy(coverFile.fullName); } catch (e) { } }
            lines.push([encodeURIComponent(c.name), okPng ? i : -1, c.width, c.height, Math.round(c.duration * 100) / 100].join("|"));
        }
        U.writeText(new File(entry.folder.fullName + "/meta.txt"),
            "name=" + encodeURIComponent(name) + "\ncreated=" + entry.created + "\nsource=" + encodeURIComponent(source || "") + "\ncomps=" + lines.join(";"));
        return comps.length;
    }

    SV.libInfo = function (a) { return U.ok({ path: U.plain(libRoot(a)) }); };

    SV.saveProject = function (a) {
        if (!app.project.file) { return U.fail("Save your project first (File > Save), then add it to the library."); }
        try { app.project.save(); } catch (e) { }
        var root = libRoot(a), entry = newEntry(root), src = app.project.file;
        var name = U.str(a.name, "").length ? U.str(a.name, "") : src.name.replace(/\.aep$/i, "");
        try {
            src.copy(entry.folder.fullName + "/project.aep");
            var n = describe(entry, allComps(), U.comp(), name, U.plain(src));
            return U.ok({ message: "Saved \"" + name + "\" (" + n + " comps)." });
        } catch (err) { U.rmrf(entry.folder); return U.fail(err.toString()); }
    };

    // Add .aep files from disk: copy each in, import it briefly to render comp previews, then remove the import.
    SV.addProjects = function (a) {
        var files = File.openDialog("Choose After Effects projects", IS_MAC() ? function (f) { return f instanceof Folder || /\.aep$/i.test(f.name); } : "After Effects Project:*.aep", true);
        if (!files) { return U.fail("cancelled"); }
        if (!(files instanceof Array)) { files = [files]; }
        var root = libRoot(a), added = 0, i, errors = [];
        for (i = 0; i < files.length; i += 1) {
            var f = files[i], entry = newEntry(root), item = null;
            try {
                f.copy(entry.folder.fullName + "/project.aep");
                app.beginUndoGroup("Sowveil Library Preview");
                var io = new ImportOptions(f); io.importAs = ImportAsType.PROJECT;
                item = app.project.importFile(io);
                var comps = (item instanceof FolderItem) ? compsIn(item, []) : [];
                describe(entry, comps, comps[0], f.name.replace(/\.aep$/i, ""), U.plain(f));
                try { item.remove(); } catch (e1) { }
                app.endUndoGroup();
                added += 1;
            } catch (err) {
                try { if (item) { item.remove(); } } catch (e2) { }
                try { app.endUndoGroup(); } catch (e3) { }
                U.rmrf(entry.folder); errors.push(f.name + ": " + err.toString());
            }
        }
        if (!added) { return U.fail(errors.join("\n") || "Nothing added."); }
        return U.ok({ message: "Added " + added + " project" + (added === 1 ? "" : "s") + " to the library." + (errors.length ? " (" + errors.length + " failed)" : "") });
    };
    function IS_MAC() { return $.os.toLowerCase().indexOf("mac") !== -1; }

    SV.scanProjects = function (a) {
        var root = libRoot(a), entries = root.getFiles(function (f) { return f instanceof Folder; }), out = [], i, j;
        for (i = 0; i < entries.length; i += 1) {
            var aep = new File(entries[i].fullName + "/project.aep");
            if (!aep.exists) { continue; }
            var meta = { name: decodeURI(entries[i].name), created: 0, source: "", comps: "" }, lines = U.readText(new File(entries[i].fullName + "/meta.txt")).split(/\r\n|\r|\n/);
            for (j = 0; j < lines.length; j += 1) {
                var at = lines[j].indexOf("="); if (at < 1) { continue; }
                var k = lines[j].substring(0, at), v = lines[j].substring(at + 1);
                if (k === "created") { meta.created = parseFloat(v) || 0; } else { try { meta[k] = decodeURIComponent(v); } catch (e) { meta[k] = v; } }
            }
            var comps = [], parts = meta.comps.length ? meta.comps.split(";") : [];
            for (j = 0; j < parts.length; j += 1) {
                var p = parts[j].split("|"), cn = p[0]; try { cn = decodeURIComponent(cn); } catch (e2) { }
                var tp = new File(entries[i].fullName + "/comps/" + p[1] + ".png");
                comps.push({ name: cn, thumb: (p[1] !== "-1" && tp.exists) ? U.plain(tp) : "", w: parseFloat(p[2]) || 0, h: parseFloat(p[3]) || 0, dur: parseFloat(p[4]) || 0 });
            }
            var cover = new File(entries[i].fullName + "/cover.png");
            out.push({ id: decodeURI(entries[i].name), name: meta.name, created: meta.created, source: meta.source, aep: U.plain(aep), size: aep.length, cover: cover.exists ? U.plain(cover) : "", comps: comps });
        }
        out.sort(function (x, y) { return y.created - x.created; });
        return U.ok({ path: U.plain(root), projects: out });
    };

    function findComp(folderItem, wanted) {
        var all = compsIn(folderItem, []), i;
        for (i = 0; i < all.length; i += 1) { if (all[i].name === wanted) { return all[i]; } }
        return all.length ? all[0] : null;
    }
    SV.importProject = function (a) {
        var f = new File(U.str(a.aep, "")); if (!f.exists) { return U.fail("Project file not found."); }
        return U.run("Sowveil Import Project", function () {
            var io = new ImportOptions(f); io.importAs = ImportAsType.PROJECT;
            var item = app.project.importFile(io);
            if (a.comp) { var c = findComp(item, U.str(a.comp, "")); if (c) { c.openInViewer(); } return U.ok({ message: "Imported \"" + U.str(a.comp, "") + "\" (with its project folder)." }); }
            return U.ok({ message: "Imported " + U.str(a.name, "project") + "." });
        });
    };
    SV.renameProject = function (a) {
        var e = new Folder(libRoot(a).fullName + "/" + U.safeName(a.id)), mf = new File(e.fullName + "/meta.txt");
        if (!mf.exists) { return U.fail("Project not found."); }
        var s = U.readText(mf).replace(/^name=.*$/m, "name=" + encodeURIComponent(U.str(a.name, "Untitled")));
        U.writeText(mf, s); return U.ok({ message: "Renamed." });
    };
    SV.deleteProject = function (a) {
        var e = new Folder(libRoot(a).fullName + "/" + U.safeName(a.id));
        if (!e.exists) { return U.fail("Project not found."); }
        U.rmrf(e); return U.ok({ message: "Removed from the library." });
    };
    SV.revealLibrary = function (a) { libRoot(a).execute(); return U.ok(); };
})();
