// Sougetsu Akira FX - compatibility shim. The panel evalFile()s this file by its original name when it thinks an engine
// is missing; everything lives in the akira_*.jsx files, so just (re)run the main loader from this folder.
(function () {
    try { $.evalFile(new File(new File($.fileName).parent.fullName + "/akira_loader.jsx")); } catch (e) { }
})();
