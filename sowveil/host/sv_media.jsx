// Sowveil - media import for the Downloader: imports a file into a "Sowveil Downloads" bin and can
// drop it into the active comp at the playhead.
(function () {
    var SV = $._sv, U = SV._u;
    function bin(name) {
        var i, it;
        for (i = 1; i <= app.project.numItems; i += 1) { it = app.project.item(i); if (it instanceof FolderItem && it.name === name && it.parentFolder === app.project.rootFolder) { return it; } }
        return app.project.items.addFolder(name);
    }
    SV.importMedia = function (a) {
        var f = new File(U.str(a.path, ""));
        if (!f.exists) { return U.fail("Downloaded file not found: " + U.str(a.path, "")); }
        return U.run("Sowveil Import", function () {
            var io = new ImportOptions(f), item;
            try { if (io.canImportAs(ImportAsType.FOOTAGE)) { io.importAs = ImportAsType.FOOTAGE; } } catch (e) { }
            item = app.project.importFile(io);
            item.parentFolder = bin("Sowveil Downloads");
            var msg = "Imported " + item.name + ".";
            if (U.bool(a.addToComp, false)) {
                var c = U.comp();
                if (c) {
                    var L = c.layers.add(item); L.startTime = c.time;
                    try { if (item.width && c.width) { var s = Math.min(c.width / item.width, c.height / item.height) * 100; if (U.bool(a.fit, true)) { L.transform.scale.setValue([s, s]); } } } catch (e2) { }
                    msg = "Added " + item.name + " to " + c.name + ".";
                }
            }
            return U.ok({ message: msg });
        });
    };
    SV.revealFile = function (a) { var f = new File(U.str(a.path, "")); if (f.exists) { f.parent.execute(); return U.ok(); } return U.fail("File not found."); };
})();
