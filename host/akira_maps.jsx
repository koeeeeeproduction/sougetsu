// Sougetsu Akira FX - Map rigs: 4-corner screen-replace / tracking rig (clean-room, own design). Batch N.
// A rig = 4 null layers (tl/tr/bl/br) + a content layer whose Corner Pin effect is expression-linked to them.
// Layers are tagged in .comment as "akira-map-rig:<id>:<role>".
// Contract (path args may be encodeURIComponent'd; empty path = file dialog):
//   flexMapEngineVersion() -> "1.0.0"
//   flexMap_createFromFile(path) -> "OK:"+rigId / "ERR:"
//   flexMap_traceOutlineFromFile(arg) -> "OK:"+rigId / "ERR:"   arg: JSON {points:[[x,y],...], closed?, rigId?} or a path to such a .json file
//   flexMap_createTrackerFromFile(path, rigId?) -> "OK:"+frameCount / "ERR:"
//        file JSON: {"fps":30,"frames":[{"t":0,"tl":[x,y],"tr":[x,y],"bl":[x,y],"br":[x,y]}, ...]}  (t in seconds; or "f" = frame)
//   flexMap_listRigs() -> JSON [{id,content,layers}]
//   flexMap_activeRig() -> JSON {found,id}
//   flexMap_selectRig(id) -> "SUCCESS" / "ERR:"
//   flexMap_syncRigToView(id?) -> "SUCCESS" / "ERR:"
//   flexMap_bakeRig(id?) -> "OK:"+frames / "ERR:"
//   flexMap_replaceViewFromFile(path, id?) -> "SUCCESS" / "ERR:"
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    var MARK = "akira-map-rig:", ROLES = ["tl", "tr", "bl", "br"];
    var CP = { tl: "ADBE Corner Pin-0001", tr: "ADBE Corner Pin-0002", bl: "ADBE Corner Pin-0003", br: "ADBE Corner Pin-0004" };

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function blank(a) { return a === undefined || a === null || String(a) === "" || String(a) === "undefined"; }
    function pickFile(arg, prompt) {
        var f = blank(arg) ? File.openDialog(prompt) : new File(decodeArg(arg));
        return (f && f.exists) ? f : null;
    }
    function readText(f) { f.encoding = "UTF-8"; if (!f.open("r")) { return null; } var s = f.read(); f.close(); return s; }
    function pointField(s, key) {
        var m = new RegExp('"' + key + '"\\s*:\\s*\\[\\s*(-?[0-9.eE+-]+)\\s*,\\s*(-?[0-9.eE+-]+)').exec(s);
        return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
    }
    function numField(s, key, def) { var m = new RegExp('"' + key + '"\\s*:\\s*(-?[0-9.eE+-]+)').exec(s); return m ? parseFloat(m[1]) : def; }
    function strField(s, key, def) { var m = new RegExp('"' + key + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(s); return m ? m[1] : def; }
    function splitObjects(s, from) {
        var out = [], d = 0, st = -1, i;
        for (i = from || 0; i < s.length; i += 1) {
            var c = s.charAt(i);
            if (c === "{") { if (d === 0) { st = i; } d += 1; }
            else if (c === "}") { d -= 1; if (d === 0 && st >= 0) { out.push(s.substring(st, i + 1)); st = -1; } }
        }
        return out;
    }
    function pointsArray(s) {
        var k = s.indexOf('"points"'); if (k < 0) { return []; }
        var st = s.indexOf("[", k), d = 0, i, en = -1, pts = [], m;
        for (i = st; i < s.length && st >= 0; i += 1) { var c = s.charAt(i); if (c === "[") { d += 1; } else if (c === "]") { d -= 1; if (d === 0) { en = i; break; } } }
        if (en < 0) { return pts; }
        var re = /\[\s*(-?[0-9.eE+-]+)\s*,\s*(-?[0-9.eE+-]+)\s*\]/g, inner = s.substring(st, en + 1);
        while ((m = re.exec(inner)) !== null) { pts.push([parseFloat(m[1]), parseFloat(m[2])]); }
        return pts;
    }

    // ---------- rig lookup ----------
    function tagOf(L) { var m = /^akira-map-rig:([^:]+):([a-z]+)/.exec(String(L.comment || "")); return m ? { id: m[1], role: m[2] } : null; }
    function rigLayers(comp, id) {
        var r = { id: id, count: 0 }, i;
        for (i = 1; i <= comp.numLayers; i += 1) { var t = tagOf(comp.layer(i)); if (t && t.id === id) { r[t.role] = comp.layer(i); r.count += 1; } }
        return r.count ? r : null;
    }
    function rigIds(comp) {
        var ids = [], seen = {}, i;
        for (i = 1; i <= comp.numLayers; i += 1) { var t = tagOf(comp.layer(i)); if (t && !seen[t.id]) { seen[t.id] = true; ids.push(t.id); } }
        return ids;
    }
    function resolveRig(comp, id) {
        if (!blank(id)) { return rigLayers(comp, String(id)); }
        var sel = H.selectedLayers(comp), i;
        for (i = 0; i < sel.length; i += 1) { var t = tagOf(sel[i]); if (t) { return rigLayers(comp, t.id); } }
        if (F._mapActive) { var r = rigLayers(comp, F._mapActive); if (r) { return r; } }
        var ids = rigIds(comp);
        return ids.length ? rigLayers(comp, ids[ids.length - 1]) : null;
    }
    function newId() { return "map" + Math.floor(new Date().getTime() % 1000000); }
    function cornerExpr(nullName) { return 'var L = thisComp.layer(' + jsonStr(nullName) + ');\nfromComp(L.toComp(L.anchorPoint));'; }

    function addNulls(comp, id, corners) {
        var r = { id: id }, i;
        for (i = 0; i < 4; i += 1) {
            var n = comp.layers.addNull(), role = ROLES[i];
            n.name = "Map " + id + " " + role.toUpperCase();
            n.comment = MARK + id + ":" + role;
            n.transform.position.setValue(corners[i]);
            r[role] = n;
        }
        return r;
    }
    function linkCornerPin(rig) {
        var L = rig.content, fx = L.property("ADBE Effect Parade"), cp = null, i;
        for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).matchName === "ADBE Corner Pin") { cp = fx.property(i); break; } }
        if (!cp) { cp = fx.addProperty("ADBE Corner Pin"); }
        for (i = 0; i < 4; i += 1) { var role = ROLES[i]; if (rig[role]) { cp.property(CP[role]).expression = cornerExpr(rig[role].name); } }
        return cp;
    }
    function layerCorners(comp, L) {
        var w = L.source ? L.source.width : comp.width, h = L.source ? L.source.height : comp.height;
        var p = L.transform.position.value, a = L.transform.anchorPoint.value, s = L.transform.scale.value;
        var x0 = p[0] - a[0] * s[0] / 100, y0 = p[1] - a[1] * s[1] / 100, x1 = x0 + w * s[0] / 100, y1 = y0 + h * s[1] / 100;
        return [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    }

    F.flexMapEngineVersion = function () { return "1.0.0"; };

    F.flexMap_createFromFile = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var f = pickFile(path, "Choose the image or video to map"); if (!f) { return "ERR:No file chosen."; }
        var id = newId();
        app.beginUndoGroup("Create Map Rig");
        try {
            var item = app.project.importFile(new ImportOptions(f));
            var L = comp.layers.add(item);
            L.name = "Map " + id + " View";
            L.comment = MARK + id + ":content";
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
            var rig = addNulls(comp, id, layerCorners(comp, L));
            rig.content = L;
            L.moveAfter(rig.br);
            linkCornerPin(rig);
            F._mapActive = id;
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + id;
    };

    F.flexMap_traceOutlineFromFile = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg);
        if (s.indexOf('"points"') < 0) { var f = pickFile(arg, "Choose a traced-outline JSON file"); if (!f) { return "ERR:No outline data."; } s = readText(f) || ""; }
        var pts = pointsArray(s); if (pts.length < 3) { return "ERR:Outline needs at least 3 points."; }
        var id = strField(s, "rigId", "") || F._mapActive || newId(), closed = !/"closed"\s*:\s*false/.test(s);
        app.beginUndoGroup("Trace Map Outline");
        try {
            var L = comp.layers.addShape(), i, it = [], ot = [];
            L.name = "Map " + id + " Outline";
            L.comment = MARK + id + ":outline";
            var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
            grp.name = "Outline";
            var c = grp.property("ADBE Vectors Group"), pg = c.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
            for (i = 0; i < pts.length; i += 1) { it.push([0, 0]); ot.push([0, 0]); }
            sh.vertices = pts; sh.inTangents = it; sh.outTangents = ot; sh.closed = closed;
            pg.property("ADBE Vector Shape").setValue(sh);
            var st = c.addProperty("ADBE Vector Graphic - Stroke");
            try { st.property("ADBE Vector Stroke Color").setValue([0, 1, 0.6, 1]); st.property("ADBE Vector Stroke Width").setValue(3); } catch (e1) { }
            L.transform.anchorPoint.setValue([0, 0]);
            L.transform.position.setValue([0, 0]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + id;
    };

    F.flexMap_createTrackerFromFile = function (path, rigId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var f = pickFile(path, "Choose a corner-track JSON file"); if (!f) { return "ERR:No file chosen."; }
        var s = readText(f); if (!s) { return "ERR:Could not read file."; }
        var fps = numField(s, "fps", comp.frameRate), fi = s.indexOf('"frames"');
        if (fi < 0) { return "ERR:Track file has no \"frames\" list."; }
        var chunks = splitObjects(s, fi), times = [], vals = { tl: [], tr: [], bl: [], br: [] }, i, k;
        for (i = 0; i < chunks.length; i += 1) {
            var c = chunks[i], t = numField(c, "t", NaN), ok = true, row = {};
            if (isNaN(t)) { var fr = numField(c, "f", NaN); if (isNaN(fr)) { continue; } t = fr / fps; }
            for (k = 0; k < 4; k += 1) { row[ROLES[k]] = pointField(c, ROLES[k]); if (!row[ROLES[k]]) { ok = false; } }
            if (!ok) { continue; }
            times.push(t);
            for (k = 0; k < 4; k += 1) { vals[ROLES[k]].push(row[ROLES[k]]); }
        }
        if (!times.length) { return "ERR:No valid frames in track file."; }
        app.beginUndoGroup("Import Corner Track");
        try {
            var rig = resolveRig(comp, rigId);
            if (!rig || !rig.tl) {
                var id = rig ? rig.id : newId(), made = addNulls(comp, id, [vals.tl[0], vals.tr[0], vals.bl[0], vals.br[0]]);
                if (rig && rig.content) { made.content = rig.content; linkCornerPin(made); }
                rig = made; F._mapActive = id;
            }
            for (k = 0; k < 4; k += 1) {
                var pos = rig[ROLES[k]].transform.position;
                while (pos.numKeys > 0) { pos.removeKey(pos.numKeys); }
                pos.setValuesAtTimes(times, vals[ROLES[k]]);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + times.length;
    };

    F.flexMap_listRigs = function () {
        var comp = H.activeComp(); if (!comp) { return "[]"; }
        var ids = rigIds(comp), out = [], i;
        for (i = 0; i < ids.length; i += 1) {
            var r = rigLayers(comp, ids[i]);
            out.push('{"id":' + jsonStr(ids[i]) + ',"content":' + (r.content ? jsonStr(r.content.name) : "null") + ',"layers":' + r.count + '}');
        }
        return "[" + out.join(",") + "]";
    };

    F.flexMap_activeRig = function () {
        var comp = H.activeComp(); if (!comp) { return '{"found":false}'; }
        var r = resolveRig(comp, "");
        return r ? '{"found":true,"id":' + jsonStr(r.id) + '}' : '{"found":false}';
    };

    F.flexMap_selectRig = function (id) {
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var r = rigLayers(comp, String(id)), i; if (!r) { return "ERR:Rig not found."; }
        for (i = 1; i <= comp.numLayers; i += 1) { var t = tagOf(comp.layer(i)); comp.layer(i).selected = !!(t && t.id === r.id); }
        F._mapActive = r.id;
        return "SUCCESS";
    };

    F.flexMap_syncRigToView = function (id) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var r = resolveRig(comp, id); if (!r) { return "ERR:No map rig found."; }
        if (!r.content) { return "ERR:Rig has no view layer."; }
        app.beginUndoGroup("Sync Map Rig");
        try {
            var k;
            for (k = 0; k < 4; k += 1) { if (!r[ROLES[k]]) { break; } }
            if (k < 4) {
                var cs = layerCorners(comp, r.content), made = addNulls(comp, r.id, cs), j;
                for (j = 0; j < 4; j += 1) { if (r[ROLES[j]]) { made[ROLES[j]].remove(); made[ROLES[j]] = r[ROLES[j]]; } }
                made.content = r.content; r = made;
            }
            linkCornerPin(r);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.flexMap_bakeRig = function (id) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var r = resolveRig(comp, id); if (!r || !r.content) { return "ERR:No map rig found."; }
        var fx = r.content.property("ADBE Effect Parade"), cp = null, i, k;
        for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).matchName === "ADBE Corner Pin") { cp = fx.property(i); break; } }
        if (!cp) { return "ERR:Rig view has no Corner Pin."; }
        var fd = comp.frameDuration, t0 = comp.workAreaStart, t1 = t0 + comp.workAreaDuration, times = [], t;
        for (t = t0; t < t1 - fd / 2; t += fd) { times.push(t); }
        if (!times.length) { return "ERR:Work area is empty."; }
        app.beginUndoGroup("Bake Map Rig");
        try {
            for (k = 0; k < 4; k += 1) {
                var p = cp.property(CP[ROLES[k]]), vals = [];
                for (i = 0; i < times.length; i += 1) { vals.push(p.valueAtTime(times[i], false)); }
                p.expression = "";
                while (p.numKeys > 0) { p.removeKey(p.numKeys); }
                p.setValuesAtTimes(times, vals);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + times.length;
    };

    F.flexMap_replaceViewFromFile = function (path, id) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var r = resolveRig(comp, id); if (!r || !r.content) { return "ERR:No map rig found."; }
        var f = pickFile(path, "Choose the replacement image or video"); if (!f) { return "ERR:No file chosen."; }
        app.beginUndoGroup("Replace Map View");
        try { r.content.replaceSource(app.project.importFile(new ImportOptions(f)), false); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
})();
