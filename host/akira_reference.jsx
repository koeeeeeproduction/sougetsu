// Sougetsu Akira FX - reference workspace host helpers (clean-room). Batch G.
// The Editors tab links storyboard scenes to compositions and jumps back to them.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var G = $.global, H = $._akira._h;
    if (!H) { return; }
    // The panel compares this with its own version and only tries to load a helper file when it differs.
    G._akiraReferenceWorkspaceHostVersion = "2.0.0";

    function enc(s) { return encodeURIComponent(String(s === undefined || s === null ? "" : s)); }

    // projectPath | projectName | compId | compName | time | hostId   (each text part URL-encoded)
    G.getReferenceWorkspaceContext_AkiraGUI = function () {
        try {
            var proj = app.project, file = proj ? proj.file : null, comp = H.activeComp();
            var path = file ? file.fsName : "", name = file ? decodeURI(file.name) : "";
            return [enc(path), enc(name), enc(comp ? comp.id : ""), enc(comp ? comp.name : ""), comp ? comp.time : 0, "AEFT"].join("|");
        } catch (e) { return "ERR:" + e.toString(); }
    };

    // argument: URL-encoded "compId|timeInSeconds"
    G.jumpReferenceWorkspace_AkiraGUI = function (arg) {
        try {
            var s = decodeURIComponent(String(arg)), parts = s.split("|");
            var id = parseInt(parts[0], 10), t = parseFloat(parts[1]);
            if (isNaN(id)) { return "ERR:This scene is not linked to a composition."; }
            var item = app.project.itemByID(id);
            if (!item || !(item instanceof CompItem)) { return "ERR:That composition no longer exists in this project."; }
            item.openInViewer();
            if (!isNaN(t)) { item.time = Math.max(0, Math.min(t, item.duration)); }
            return "OK";
        } catch (e) { return "ERR:" + e.toString(); }
    };
})();
