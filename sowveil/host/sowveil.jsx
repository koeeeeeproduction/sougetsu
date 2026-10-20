// Sowveil - host loader. Loads the shared engines (synced from Akira FX into Sowveil's own
// namespaces by tools/sync_sowveil_engines.py) and then Sowveil's own parts.
// CEP may start this file without telling it where it lives ($.fileName empty), so we look in order:
//   1) its own location, 2) the extension folder the panel passes in ($._sv_root), 3) the usual install folders.
// The panel also loads this file itself with the real path (js/core.js), so a miss here is never fatal.
(function () {
    function ok(folder) { try { return folder && folder.exists && new File(folder.fullName + "/sv_core.jsx").exists; } catch (e) { return false; } }
    var here = null, i;
    try {
        if (typeof $.fileName === "string" && $.fileName.length) { var self = new File($.fileName); if (self.exists && ok(self.parent)) { here = self.parent; } }
    } catch (e1) { }
    if (!here && typeof $._sv_root === "string" && $._sv_root.length) { var vp = new Folder($._sv_root + "/host"); if (ok(vp)) { here = vp; } }
    if (!here) {
        var ids = ["com.sowveil", "com.sowveil.panel", "Sowveil", "sowveil"], roots = [], k;
        for (k = 0; k < ids.length; k += 1) {
            try { roots.push(Folder.userData.fullName + "/Adobe/CEP/extensions/" + ids[k] + "/host"); } catch (e2) { }
            roots.push("C:/Program Files (x86)/Common Files/Adobe/CEP/extensions/" + ids[k] + "/host");
            roots.push("C:/Program Files/Common Files/Adobe/CEP/extensions/" + ids[k] + "/host");
            roots.push("/Library/Application Support/Adobe/CEP/extensions/" + ids[k] + "/host");
            try { roots.push(Folder("~").fullName + "/Library/Application Support/Adobe/CEP/extensions/" + ids[k] + "/host"); } catch (e3) { }
        }
        for (i = 0; i < roots.length; i += 1) { var cand = new Folder(roots[i]); if (ok(cand)) { here = cand; break; } }
    }
    if (!here) { return; }

    // Sowveil has no license gate: its copy of the shared helpers always runs unlocked.
    if (typeof $._svA === "undefined") { $._svA = {}; }
    $._svA.isLocked = false;
    try { $._sv_root = here.parent.fullName; $._sv_extension_path = here.parent.fullName; } catch (e0) { }
    var parts = [
        "akira/akira_tools.jsx", "akira/akira_json.jsx", "akira/akira_rigs.jsx",
        "akira/akira_expressions.jsx", "akira/akira_captions.jsx", "akira/akira_layers.jsx",
        "sv_core.jsx", "sv_expressions.jsx", "sv_saas.jsx", "sv_scene.jsx", "sv_media.jsx", "sv_captions.jsx", "sv_library.jsx"
    ], errs = [];
    for (i = 0; i < parts.length; i += 1) {
        var f = new File(here.fullName + "/" + parts[i]);
        if (!f.exists) { errs.push(parts[i] + ": missing"); continue; }
        try { $.evalFile(f); } catch (e) { errs.push(parts[i] + ": " + e.toString() + (e.line ? " (line " + e.line + ")" : "")); }
    }
    $._sv_loadErrors = errs;
})();
