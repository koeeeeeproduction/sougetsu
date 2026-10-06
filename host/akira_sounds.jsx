// Sougetsu Akira FX - Sound Lab host side (own design).
//   $._akira.importSound(enc(path), "comp"|"project") -> "SUCCESS:msg" / "ERR:msg"
// Imports the file once into a "Sougetsu Sounds" project folder (re-uses it on later clicks) and, with "comp", adds it to the
// active composition at the playhead.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }
    var FOLDER = "Sougetsu Sounds";
    function dec(s) { try { return decodeURIComponent(String(s || "")); } catch (e) { return String(s || ""); } }
    function folder() {
        var items = app.project.items, i;
        for (i = 1; i <= items.length; i += 1) { if (items[i] instanceof FolderItem && items[i].name === FOLDER) { return items[i]; } }
        return items.addFolder(FOLDER);
    }
    function existing(f) {
        var items = app.project.items, i, want = String(f.fsName || f.fullName);
        for (i = 1; i <= items.length; i += 1) {
            var it = items[i];
            try { if (it instanceof FootageItem && it.file && String(it.file.fsName || it.file.fullName) === want) { return it; } } catch (e) { }
        }
        return null;
    }
    F.importSound = function (encPath, mode) {
        var g = H.locked(); if (g) { return g; }
        if (!app.project) { return "ERR:Open a project first."; }
        var f = new File(dec(encPath));
        if (!f.exists) { return "ERR:Sound file not found: " + dec(encPath); }
        var comp = H.activeComp(), toComp = String(mode || "comp") !== "project";
        if (toComp && !comp) { toComp = false; }
        app.beginUndoGroup("Add Sound");
        try {
            var item = existing(f);
            if (!item) { item = app.project.importFile(new ImportOptions(f)); try { item.parentFolder = folder(); } catch (e0) { } }
            if (!toComp) { app.endUndoGroup(); return "SUCCESS:" + item.name + " added to the project."; }
            var L = comp.layers.add(item);
            L.startTime = comp.time;
            try { L.label = 11; } catch (e1) { }
            app.endUndoGroup();
            return "SUCCESS:" + item.name + " added at " + comp.time.toFixed(2) + "s.";
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
    };
})();
