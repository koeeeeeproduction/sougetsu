// Sowveil - host loader. Loads the shared engines (synced from Akira FX into Sowveil's own
// namespaces by tools/sync_sowveil_engines.py) and then Sowveil's own parts.
(function () {
    var here = File($.fileName).parent;
    // Sowveil has no license gate: its copy of the shared helpers always runs unlocked.
    if (typeof $._svA === "undefined") { $._svA = {}; }
    $._svA.isLocked = false;
    try { $._sv_extension_path = here.parent.fullName; } catch (e0) { }
    var parts = [
        "akira/akira_tools.jsx", "akira/akira_rigs.jsx", "akira/akira_saas.jsx", "akira/akira_templates2.jsx",
        "sv_core.jsx", "sv_text.jsx", "sv_expressions.jsx", "sv_gradients.jsx", "sv_carousel.jsx", "sv_media.jsx", "sv_captions.jsx", "sv_library.jsx"
    ], i;
    for (i = 0; i < parts.length; i += 1) {
        var f = new File(here.fullName + "/" + parts[i]);
        if (f.exists) { try { $.evalFile(f); } catch (e) { $.writeln("Sowveil: " + parts[i] + " failed: " + e.toString()); } }
    }
})();
