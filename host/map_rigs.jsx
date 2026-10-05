// Sougetsu Akira FX - the Maps panel (js_flex/map_rigs.js) evalFile()s host/map_rigs.jsx when it can't find the
// map engine; this shim just (re)loads the clean-room engine that the main loader normally loads.
(function () {
    try {
        var here = new File($.fileName).parent;
        if (typeof $._flex === "undefined" || !$._flex._h) { $.evalFile(new File(here.fullName + "/akira_loader.jsx")); }
        else { $.evalFile(new File(here.fullName + "/akira_maps.jsx")); }
    } catch (e) { }
})();
