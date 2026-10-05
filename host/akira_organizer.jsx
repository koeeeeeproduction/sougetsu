// Sougetsu Akira FX - Project Organizer (clean-room). Batch I2.
// Contract (read from the panel): akiraProjectAnalyze(), akiraProjectOrganize(enc), akiraProjectBoardLayout(enc), akiraProjectBoardRestore().
// Reply: "OK:" + encodeURIComponent(JSON) on success, "ERR:msg" on failure.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var G = $.global, F = $._akira, H = F._h;
    if (!H) { return; }
    G.akiraProjectOrganizerVersion = "akira-1.0";   // the panel checks this to know the engine is loaded

    // ---------- tiny JSON + URI ----------
    function J(v) {
        var t = typeof v, i, out, k;
        if (v === null || v === undefined) { return "null"; }
        if (t === "number") { return isFinite(v) ? String(v) : "0"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
        if (v instanceof Array) { out = []; for (i = 0; i < v.length; i += 1) { out.push(J(v[i])); } return "[" + out.join(",") + "]"; }
        out = []; for (k in v) { if (v.hasOwnProperty(k)) { out.push(J(k) + ":" + J(v[k])); } } return "{" + out.join(",") + "}";
    }
    function enc(s) { return encodeURIComponent(String(s)); }
    function ok(obj) { return "OK:" + enc(J(obj)); }
    function fail(msg) { return "ERR:" + String(msg); }
    function parseOpts(arg) {
        var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); }
        var o = {};
        o.moveUnused = /"moveUnused"\s*:\s*true/.test(s);
        o.labels = /"labels"\s*:\s*true/.test(s);
        var mc = /"columns"\s*:\s*"?(\d+)"?/.exec(s); o.columns = mc ? parseInt(mc[1], 10) : 0;
        var mg = /"gutter"\s*:\s*"?(\d+)"?/.exec(s); o.gutter = mg ? parseInt(mg[1], 10) : 60;
        return o;
    }

    // ---------- classify project items ----------
    function usedComps() {    // comps referenced by another comp, and the "main" comps (not used anywhere)
        var proj = app.project, used = {}, i, j;
        for (i = 1; i <= proj.numItems; i += 1) {
            var it = proj.item(i);
            if (!(it instanceof CompItem)) { continue; }
            for (j = 1; j <= it.numLayers; j += 1) { var s = it.layer(j).source; if (s) { used[s.id] = true; } }
        }
        return used;
    }
    function footageUsed(item) { try { return item.usedIn && item.usedIn.length > 0; } catch (e) { return true; } }
    function kindOf(it) {
        if (it instanceof FolderItem) { return "folder"; }
        if (it instanceof CompItem) { return "comp"; }
        var ms = null; try { ms = it.mainSource; } catch (e) { }
        if (ms instanceof SolidSource) { return "solid"; }
        var missing = false; try { missing = it.footageMissing; } catch (e2) { }
        if (missing) { return "missing"; }
        if (it.hasVideo && !it.hasAudio) {
            var nm = String(it.name).toLowerCase();
            if (/\.(png|jpg|jpeg|gif|tif|tiff|tga|bmp|exr|psd|ai|webp|svg)$/.test(nm) || (it.mainSource && it.mainSource.isStill)) { return "image"; }
            return "video";
        }
        if (it.hasAudio && !it.hasVideo) { return "audio"; }
        if (it.hasVideo && it.hasAudio) { return "video"; }
        var jn = String(it.name).toLowerCase();
        if (/\.(json|csv|mgjson|txt)$/.test(jn)) { return "data"; }
        return "other";
    }
    function analyze() {
        var proj = app.project, c = { total: 0, mainComps: 0, precomps: 0, folders: 0, video: 0, images: 0, audio: 0, solids: 0, missing: 0, unused: 0, data: 0, other: 0 };
        if (!proj) { return c; }
        var used = usedComps(), i;
        for (i = 1; i <= proj.numItems; i += 1) {
            var it = proj.item(i); c.total += 1;
            var k = kindOf(it);
            if (k === "folder") { c.folders += 1; continue; }
            if (k === "comp") { if (used[it.id]) { c.precomps += 1; } else { c.mainComps += 1; } continue; }
            if (k === "solid") { c.solids += 1; }
            else if (k === "image") { c.images += 1; }
            else if (k === "video") { c.video += 1; }
            else if (k === "audio") { c.audio += 1; }
            else if (k === "missing") { c.missing += 1; }
            else if (k === "data") { c.data += 1; }
            else { c.other += 1; }
            if (!footageUsed(it)) { c.unused += 1; }
        }
        return c;
    }
    G.akiraProjectAnalyze = function () {
        if (!app.project) { return fail("No project is open."); }
        try { return ok(analyze()); } catch (e) { return fail(e.toString()); }
    };

    // ---------- organize into folders ----------
    function folder(name, cache) {
        if (cache[name]) { return cache[name]; }
        var proj = app.project, i;
        for (i = 1; i <= proj.numItems; i += 1) {
            if (proj.item(i) instanceof FolderItem && proj.item(i).name === name && proj.item(i).parentFolder === proj.rootFolder) { cache[name] = proj.item(i); return cache[name]; }
        }
        cache[name] = proj.items.addFolder(name); return cache[name];
    }
    var BUCKET = { video: "Footage", image: "Images", audio: "Audio", solid: "Solids", missing: "Missing", data: "Data", other: "Misc" };
    G.akiraProjectOrganize = function (arg) {
        var g = F.isLocked ? fail("Extension is locked.") : null; if (g) { return g; }
        if (!app.project) { return fail("No project is open."); }
        var opt = parseOpts(arg), proj = app.project, used = usedComps(), cache = {}, moved = 0, i;
        app.beginUndoGroup("Organize Project");
        try {
            var items = [];
            for (i = 1; i <= proj.numItems; i += 1) { items.push(proj.item(i)); }     // snapshot (we add folders as we go)
            for (i = 0; i < items.length; i += 1) {
                var it = items[i];
                if (it instanceof FolderItem) { continue; }
                var k = kindOf(it), target = null;
                if (k === "comp") { target = folder(used[it.id] ? "Precomps" : "Comps", cache); }
                else if (k === "missing") { target = folder("Missing", cache); }
                else if (!footageUsed(it) && opt.moveUnused) { target = folder("Unused", cache); }
                else { target = folder(BUCKET[k] || "Misc", cache); }
                if (target && it.parentFolder !== target) { it.parentFolder = target; moved += 1; }
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ moved: moved, analysis: analyze() });
    };

    // ---------- board layout: arrange the selected comp's pre-comp layers on a grid, remembering their original positions ----------
    function encodePos(p) { return "AKIRA_BOARD|" + Math.round(p[0] * 100) / 100 + "|" + Math.round(p[1] * 100) / 100 + (p.length > 2 ? "|" + Math.round(p[2] * 100) / 100 : ""); }
    G.akiraProjectBoardLayout = function (arg) {
        var g = F.isLocked ? fail("Extension is locked.") : null; if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("Open the composition you want to arrange."); }
        var opt = parseOpts(arg), time = comp.time, layers = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).source instanceof CompItem) { layers.push(comp.layer(i)); } }
        if (!layers.length) { return fail("This composition has no pre-comp layers to arrange."); }
        var cols = opt.columns > 0 ? opt.columns : Math.ceil(Math.sqrt(layers.length));
        var gutter = opt.gutter > 0 ? opt.gutter : 60, arranged = 0;
        app.beginUndoGroup("Layout Board");
        try {
            var cellW = 0, cellH = 0, k;
            for (k = 0; k < layers.length; k += 1) { var r = H.sourceRect(layers[k], time); if (r) { if (r.width > cellW) { cellW = r.width; } if (r.height > cellH) { cellH = r.height; } } }
            if (cellW === 0) { cellW = 200; } if (cellH === 0) { cellH = 120; }
            var totalW = cols * cellW + (cols - 1) * gutter, x0 = comp.width / 2 - totalW / 2 + cellW / 2;
            var rows = Math.ceil(layers.length / cols), totalH = rows * cellH + (rows - 1) * gutter, y0 = comp.height / 2 - totalH / 2 + cellH / 2;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], col = i % cols, row = Math.floor(i / cols);
                if (String(L.comment).indexOf("AKIRA_BOARD|") !== 0) { L.comment = encodePos(H.getPos(L, time)); }   // remember original once
                var cx = x0 + col * (cellW + gutter), cy = y0 + row * (cellH + gutter);
                var cur = H.getPos(L, time), np = [cx, cy]; if (cur.length > 2) { np.push(cur[2]); }
                H.setPos(L, np, time);
                if (opt.labels) { L.label = (i % 16) + 1; }
                arranged += 1;
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ arranged: arranged });
    };
    G.akiraProjectBoardRestore = function () {
        var g = F.isLocked ? fail("Extension is locked.") : null; if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return fail("Open the composition to restore."); }
        var time = comp.time, restored = 0, i;
        app.beginUndoGroup("Restore Board");
        try {
            for (i = 1; i <= comp.numLayers; i += 1) {
                var L = comp.layer(i), c = String(L.comment);
                if (c.indexOf("AKIRA_BOARD|") !== 0) { continue; }
                var p = c.split("|"), pos = [parseFloat(p[1]), parseFloat(p[2])];
                if (p.length > 3) { pos.push(parseFloat(p[3])); }
                var cur = H.getPos(L, time); if (cur.length > 2 && pos.length < 3) { pos.push(cur[2]); }
                H.setPos(L, pos, time);
                L.comment = "";
                restored += 1;
            }
        } catch (e) { app.endUndoGroup(); return fail(e.toString()); }
        app.endUndoGroup();
        return ok({ restored: restored });
    };

    // The panel (js_akira/akira_project_tools.js) calls these as $._akira.* and checks $._akira.akiraProjectOrganizerVersion.
    F.akiraProjectOrganizerVersion = G.akiraProjectOrganizerVersion;
    F.akiraProjectAnalyze = G.akiraProjectAnalyze; F.akiraProjectOrganize = G.akiraProjectOrganize;
    F.akiraProjectBoardLayout = G.akiraProjectBoardLayout; F.akiraProjectBoardRestore = G.akiraProjectBoardRestore;
})();
