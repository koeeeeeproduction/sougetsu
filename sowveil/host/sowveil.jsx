// Sowveil - host loader. Loads each engine part from this folder.
(function () {
    var here = File($.fileName).parent, parts = ["sv_core.jsx", "sv_text.jsx", "sv_backgrounds.jsx", "sv_carousel.jsx", "sv_media.jsx", "sv_library.jsx"], i;
    for (i = 0; i < parts.length; i += 1) {
        var f = new File(here.fullName + "/" + parts[i]);
        if (f.exists) { try { $.evalFile(f); } catch (e) { $.writeln("Sowveil: " + parts[i] + " failed: " + e.toString()); } }
    }
})();
