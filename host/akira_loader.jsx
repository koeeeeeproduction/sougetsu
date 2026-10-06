// Sougetsu Akira FX - host loader.
// CEP may start this file without telling it where it lives ($.fileName empty), so we try, in order:
//   1) its own location, 2) the extension path the panel already passed in, 3) the usual install folders.
// The panel also loads this file itself with the real path (see index.html), so a silent miss here is safe.
(function () {
    function ok(folder) {
        try { return folder && folder.exists && new File(folder.fullName + "/akira_core.jsx").exists; } catch (e) { return false; }
    }
    var here = null;
    try {
        if ((typeof $.fileName === "string") && ($.fileName.length > 0)) {
            var self = new File($.fileName);
            if (self.exists && ok(self.parent)) { here = self.parent; }
        }
    } catch (e1) { }

    if (!here && typeof $._akira_extension_path === "string" && $._akira_extension_path.length) {
        var viaPanel = new Folder($._akira_extension_path + "/host");
        if (ok(viaPanel)) { here = viaPanel; }
    }

    if (!here) {
        var id = "com.sougetsu.akirafx";
        var roots = [];
        try { roots.push(Folder.userData.fullName + "/Adobe/CEP/extensions/" + id + "/host"); } catch (e2) { }
        try { roots.push(Folder.appData.fullName + "/Adobe/CEP/extensions/" + id + "/host"); } catch (e3) { }
        roots.push("C:/Program Files (x86)/Common Files/Adobe/CEP/extensions/" + id + "/host");
        roots.push("C:/Program Files/Common Files/Adobe/CEP/extensions/" + id + "/host");
        roots.push("/Library/Application Support/Adobe/CEP/extensions/" + id + "/host");
        try { roots.push(Folder.userData.fullName + "/../Library/Application Support/Adobe/CEP/extensions/" + id + "/host"); } catch (e4) { }
        for (var i = 0; i < roots.length; i += 1) {
            var cand = new Folder(roots[i]);
            if (ok(cand)) { here = cand; break; }
        }
    }

    if (!here) { return; } // not found: stay quiet; the panel will load us with an explicit path

    if (typeof $._akira === "undefined") { $._akira = {}; }
    try { $._akira_extension_path = here.parent.fullName; } catch (e5) { }

    function load(name, required) {
        var f = new File(here.fullName + "/" + name);
        if (!f.exists) { if (required) { alert("Akira FX: missing " + name); } return false; }
        try { $.evalFile(f); return true; }
        catch (err) { alert("Akira FX: error loading " + name + ": " + err.toString()); return false; }
    }
    var wasLocked = (typeof $._akira.isLocked === "boolean") ? $._akira.isLocked : true;
    load("akira_core.jsx", true);
    $._akira.isLocked = wasLocked; // keep the license state across a reload
    load("akira_tools.jsx", false);
    load("akira_json.jsx", false);
    load("akira_tools2.jsx", false);
    load("akira_color.jsx", false);
    load("akira_text.jsx", false);
    load("akira_library.jsx", false);
    load("akira_layers.jsx", false);
    load("akira_expressions.jsx", false);
    load("akira_subtitles.jsx", false);
    load("akira_reference.jsx", false);
    load("akira_general.jsx", false);
    load("akira_curve.jsx", false);
    load("akira_organizer.jsx", false);
    load("akira_shapes.jsx", false);
    load("akira_shapes2.jsx", false);
    load("akira_rigs.jsx", false);
    load("akira_grid.jsx", false);
    load("akira_colormatch.jsx", false);
    load("akira_captions.jsx", false);
    load("akira_fonts.jsx", false);
    load("akira_counters.jsx", false);
    load("akira_projectscan.jsx", false);
    load("akira_other.jsx", false);
    load("akira_maps.jsx", false);
    load("akira_shakes.jsx", false);
    load("akira_highlighter.jsx", false);
    load("akira_showcase.jsx", false);
    load("akira_saas.jsx", false);
    load("akira_templates2.jsx", false);
    load("akira_sounds.jsx", false);
    $._akira.isLocked = wasLocked;
    load("paste_feature.jsx", false);
})();
