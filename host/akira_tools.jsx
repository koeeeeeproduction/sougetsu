// Sougetsu Akira FX - tools, batch A (clean-room). Everyday layout, layer and project tools.
// Conventions used by the panel: return "SUCCESS" / "OK" on success, "ERR:message" for a user-facing error.
// ExtendScript is ES3: no let/const, no arrow functions, no JSON, no Array.indexOf/forEach.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira;

    // ---------- shared helpers ----------
    function locked() { return F.isLocked ? "ERR:Extension is locked. Enter your license key." : null; }
    function activeComp() {
        var c = app.project ? app.project.activeItem : null;
        return (c && (c instanceof CompItem)) ? c : null;
    }
    function selectedLayers(comp) {
        var out = [], i, s = comp.selectedLayers;
        for (i = 0; i < s.length; i += 1) { out.push(s[i]); }
        return out;
    }
    function rotate(v, deg) {
        var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
        return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
    }
    function setProp(prop, value, time) {
        if (prop.numKeys > 0) { prop.setValueAtTime(time, value); } else { prop.setValue(value); }
    }
    function sourceRect(layer, time) {
        try { return layer.sourceRectAtTime(time, false); } catch (e) { return null; }
    }
    function isCamOrLight(layer) { return (layer instanceof CameraLayer) || (layer instanceof LightLayer); }
    function getPos(layer, time) {
        var t = layer.transform, p;
        if (t.position.dimensionsSeparated) {
            p = [t.xPosition.valueAtTime(time, false), t.yPosition.valueAtTime(time, false)];
            if (layer.threeDLayer) { p.push(t.zPosition.valueAtTime(time, false)); }
            return p;
        }
        return t.position.valueAtTime(time, false);
    }
    function setPos(layer, p, time) {
        var t = layer.transform;
        if (t.position.dimensionsSeparated) {
            setProp(t.xPosition, p[0], time);
            setProp(t.yPosition, p[1], time);
            if (layer.threeDLayer && p.length > 2) { setProp(t.zPosition, p[2], time); }
        } else {
            setProp(t.position, p, time);
        }
    }
    function rotationOf(layer, time) {
        var t = layer.transform;
        try { return layer.threeDLayer ? t.zRotation.valueAtTime(time, false) : t.rotation.valueAtTime(time, false); }
        catch (e) { return 0; }
    }
    // Offset (in the layer's parent space) of a layer-space point relative to the anchor point.
    function offsetFromAnchor(layer, point, time) {
        var t = layer.transform;
        var a = t.anchorPoint.valueAtTime(time, false);
        var s = t.scale.valueAtTime(time, false);
        var d = [(point[0] - a[0]) * s[0] / 100, (point[1] - a[1]) * s[1] / 100];
        return rotate(d, rotationOf(layer, time));
    }

    F._h = { locked: locked, activeComp: activeComp, selectedLayers: selectedLayers, rotate: rotate, setProp: setProp, sourceRect: sourceRect,
             isCamOrLight: isCamOrLight, getPos: getPos, setPos: setPos, offsetFromAnchor: offsetFromAnchor, rotationOf: rotationOf };

    // ---------- startup + undo ----------
    F.loadCore = function (extPath) {
        try { if (typeof extPath === "string" && extPath.length) { $._akira_extension_path = extPath; } } catch (e) { }
        return "OK";
    };
    F.startUndoGroup = function (name) {
        try { app.beginUndoGroup(String(name || "Akira FX")); } catch (e) { }
        return "SUCCESS";
    };
    F.endUndoGroup = function () {
        try { app.endUndoGroup(); } catch (e) { }
        return "SUCCESS";
    };

    // ---------- anchor point grid ----------
    // h, v in {0, 0.5, 1}: left/center/right and top/middle/bottom of the layer's content.
    function moveAnchor(h, v, undoName) {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var time = comp.time, done = 0, i;
        app.beginUndoGroup(undoName);
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (isCamOrLight(L)) { continue; }
                var r = sourceRect(L, time);
                if (!r) { continue; }
                var t = L.transform;
                var oldA = t.anchorPoint.valueAtTime(time, false);
                var target = [r.left + r.width * h, r.top + r.height * v];
                var worldShift = offsetFromAnchor(L, target, time); // how far the visual point is from the old anchor
                var pos = getPos(L, time);
                var newPos = [pos[0] + worldShift[0], pos[1] + worldShift[1]];
                if (pos.length > 2) { newPos.push(pos[2]); }
                var newA = [target[0], target[1]];
                if (oldA.length > 2) { newA.push(oldA[2]); }
                setProp(t.anchorPoint, newA, time);
                setPos(L, newPos, time);
                done += 1;
            }
        } catch (e) {
            app.endUndoGroup();
            return "ERR:" + e.toString();
        }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:No selected layer supports anchor changes.";
    }
    F.anchorTL = function () { return moveAnchor(0, 0, "Anchor Top Left"); };
    F.anchorTM = function () { return moveAnchor(0.5, 0, "Anchor Top Center"); };
    F.anchorTR = function () { return moveAnchor(1, 0, "Anchor Top Right"); };
    F.anchorML = function () { return moveAnchor(0, 0.5, "Anchor Middle Left"); };
    F.anchorMM = function () { return moveAnchor(0.5, 0.5, "Anchor Center"); };
    F.anchorMR = function () { return moveAnchor(1, 0.5, "Anchor Middle Right"); };
    F.anchorBL = function () { return moveAnchor(0, 1, "Anchor Bottom Left"); };
    F.anchorBM = function () { return moveAnchor(0.5, 1, "Anchor Bottom Center"); };
    F.anchorBR = function () { return moveAnchor(1, 1, "Anchor Bottom Right"); };

    // ---------- center / fit in comp ----------
    function centerOne(comp, L, time) {
        var r = sourceRect(L, time);
        if (!r) { return false; }
        var c = [r.left + r.width / 2, r.top + r.height / 2];
        var off = offsetFromAnchor(L, c, time);
        var pos = getPos(L, time);
        var np = [comp.width / 2 - off[0], comp.height / 2 - off[1]];
        if (pos.length > 2) { np.push(pos[2]); }
        setPos(L, np, time);
        return true;
    }
    F.centerLayer = function () {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var done = 0, skipped = 0, i;
        app.beginUndoGroup("Center In Comp");
        try {
            for (i = 0; i < layers.length; i += 1) {
                if (isCamOrLight(layers[i])) { continue; }
                if (layers[i].parent) { skipped += 1; continue; } // parented: comp space differs from parent space
                if (centerOne(comp, layers[i], comp.time)) { done += 1; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        if (done) { return "SUCCESS"; }
        return skipped ? "ERR:Parented layers are not centered. Unparent them first." : "ERR:No selected layer can be centered.";
    };
    // mode: "fit" (whole layer visible) or "fill" (cover the comp)
    F.fitLayer = function (mode) {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var fill = (String(mode) === "fill"), done = 0, skipped = 0, i;
        app.beginUndoGroup(fill ? "Fill Comp" : "Fit To Comp");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (isCamOrLight(L)) { continue; }
                if (L.parent) { skipped += 1; continue; }
                var r = sourceRect(L, comp.time);
                if (!r || r.width <= 0 || r.height <= 0) { continue; }
                var kx = comp.width / r.width, ky = comp.height / r.height;
                var k = (fill ? Math.max(kx, ky) : Math.min(kx, ky)) * 100;
                var sc = L.transform.scale, cur = sc.valueAtTime(comp.time, false);
                var ns = [k, k]; if (cur.length > 2) { ns.push(k); }
                setProp(sc, ns, comp.time);
                centerOne(comp, L, comp.time);
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        if (done) { return "SUCCESS"; }
        return skipped ? "ERR:Parented layers are not resized. Unparent them first." : "ERR:No selected layer can be fitted.";
    };

    // ---------- new layers ----------
    function parseColor(s) {
        s = String(s || "").replace(/^\s+|\s+$/g, "").replace(/^#/, "");
        if (/^[0-9a-fA-F]{3}$/.test(s)) { s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2); }
        if (!/^[0-9a-fA-F]{6}$/.test(s)) { return [1, 1, 1]; }
        return [parseInt(s.substr(0, 2), 16) / 255, parseInt(s.substr(2, 2), 16) / 255, parseInt(s.substr(4, 2), 16) / 255];
    }
    F.createSolid = function (color) {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Create Solid");
        try {
            var layer = comp.layers.addSolid(parseColor(color), "Solid", comp.width, comp.height, comp.pixelAspect, comp.duration);
            layer.moveToBeginning();
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    // plain === "true": just add a null. Otherwise: add a null at the middle of the selection and parent the selection to it.
    F.smartNull = function (plain) {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = selectedLayers(comp), i;
        app.beginUndoGroup("Create Null");
        try {
            var nul = comp.layers.addNull(comp.duration);
            nul.name = "Null";
            nul.moveToBeginning();
            if (String(plain) !== "true" && sel.length) {
                var sx = 0, sy = 0, n = 0, time = comp.time;
                for (i = 0; i < sel.length; i += 1) {
                    if (sel[i].parent || isCamOrLight(sel[i])) { continue; }
                    var r = sourceRect(sel[i], time);
                    if (!r) { continue; }
                    var off = offsetFromAnchor(sel[i], [r.left + r.width / 2, r.top + r.height / 2], time);
                    var p = getPos(sel[i], time);
                    sx += p[0] + off[0]; sy += p[1] + off[1]; n += 1;
                }
                if (n) {
                    nul.transform.position.setValue([sx / n, sy / n]);
                    for (i = 0; i < sel.length; i += 1) {
                        if (sel[i] === nul || isCamOrLight(sel[i])) { continue; }
                        if (typeof sel[i].setParentWithJump === "function") { sel[i].setParentWithJump(nul); }
                        else { sel[i].parent = nul; }
                    }
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- expressions ----------
    F.applyExpression = function (code) {
        var g = locked(); if (g) { return g; }
        var comp = activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var props = comp.selectedProperties, i, count = 0;
        app.beginUndoGroup("Apply Expression");
        try {
            for (i = 0; i < props.length; i += 1) {
                var p = props[i];
                if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression) {
                    p.expression = String(code);
                    count += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return count ? "SUCCESS" : ""; // empty -> the panel shows "select a property first"
    };

    // ---------- project helpers ----------
    function two(n) { return (n < 10 ? "0" : "") + n; }
    function stamp() {
        var d = new Date();
        return d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) + "_" + two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
    }
    function saveRoot(locType, customPath) {
        var base;
        if (locType === "custom" && customPath) { base = new Folder(customPath); }
        else if (locType === "desktop") { base = new Folder(Folder.desktop.fullName + "/AkiraProjects"); }
        else {
            if (!app.project || !app.project.file) { return null; }
            base = new Folder(app.project.file.parent.fullName + "/AkiraProjects");
        }
        return base;
    }
    F.getProjectPath = function () {
        try {
            if (app.project && app.project.file) { return app.project.file.parent.fsName; }
        } catch (e) { }
        return "ERR:Save your project first.";
    };
    F.openProjectFolder = function (locType, customPath) {
        var g = locked(); if (g) { return g; }
        try {
            var f = saveRoot(String(locType || "project"), customPath ? String(customPath) : "");
            if (!f) { return "ERR:Save your project first."; }
            if (!f.exists) { f.create(); }
            return f.execute() ? "OK" : "ERR:Could not open the folder.";
        } catch (e) { return "ERR:" + e.toString(); }
    };
    // Manual call (no arguments): plain save. Autosave: save, then keep a timestamped copy in the backup folder.
    F.saveProject = function (isAuto, maxVersions, locType, customPath) {
        var g = locked(); if (g) { return g; }
        try {
            if (!app.project) { return "ERR:No project is open."; }
            if (!app.project.file) {
                try { app.project.save(); } catch (e1) { }   // unsaved project: After Effects asks where to save
                return "PROMPTED";
            }
            app.project.save();
            var auto = (isAuto === true || String(isAuto) === "true");
            if (!auto) { return "SAVED"; }
            var root = saveRoot(String(locType || "project"), customPath ? String(customPath) : "");
            if (!root) { return "SAVED"; }
            if (!root.exists) { root.create(); }
            var src = app.project.file;
            var baseName = decodeURI(src.name).replace(/\.aepx?$/i, "");
            var copy = new File(root.fullName + "/" + baseName + "_" + stamp() + ".aep");
            src.copy(copy);
            // keep only the newest N copies of this project
            var keep = parseInt(maxVersions, 10); if (isNaN(keep) || keep < 1) { keep = 5; }
            var files = root.getFiles(baseName + "_*.aep"), list = [], i, j;
            for (i = 0; i < files.length; i += 1) { if (files[i] instanceof File) { list.push(files[i]); } }
            for (i = 0; i < list.length - 1; i += 1) {          // newest first
                for (j = i + 1; j < list.length; j += 1) {
                    if (list[j].modified > list[i].modified) { var tmp = list[i]; list[i] = list[j]; list[j] = tmp; }
                }
            }
            for (i = keep; i < list.length; i += 1) { try { list[i].remove(); } catch (e2) { } }
            return "SAVED";
        } catch (e) { return "ERR:" + e.toString(); }
    };

    // ---------- comp navigation ----------
    function parseRef(s) {
        var parts = String(s).split("|");
        return { compId: parseInt(parts[0], 10), index: parseInt(parts[1], 10) };
    }
    F.revealInProject = function (ref) {
        var g = locked(); if (g) { return g; }
        try {
            var r = parseRef(ref), comp = app.project.itemByID(r.compId);
            if (!comp || !(comp instanceof CompItem)) { return "ERR:Composition not found."; }
            if (r.index < 1 || r.index > comp.numLayers) { return "ERR:Layer not found."; }
            var src = comp.layer(r.index).source;
            if (!src) { return "ERR:This layer has no source in the Project panel."; }
            var cur = app.project.selection, i;
            for (i = 0; i < cur.length; i += 1) { cur[i].selected = false; }
            src.selected = true;
            return "OK";
        } catch (e) { return "ERR:" + e.toString(); }
    };
    F.navigateToLayer = function (ref) {
        var g = locked(); if (g) { return g; }
        try {
            var r = parseRef(ref), comp = app.project.itemByID(r.compId);
            if (!comp || !(comp instanceof CompItem)) { return "ERR:Composition not found."; }
            if (r.index < 1 || r.index > comp.numLayers) { return "ERR_OUTSIDE_RANGE"; }
            comp.openInViewer();
            var sel = comp.selectedLayers, i;
            for (i = 0; i < sel.length; i += 1) { sel[i].selected = false; }
            var L = comp.layer(r.index);
            L.selected = true;
            if (comp.time < L.inPoint || comp.time > L.outPoint) { comp.time = L.inPoint; }
            return "SUCCESS";
        } catch (e) { return "ERR:" + e.toString(); }
    };
})();
