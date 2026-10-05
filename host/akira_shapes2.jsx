// Sougetsu Akira FX - shape primitives, "La Path" freehand path tool, shape presets, shape inspector (clean-room). Batch O1.
// Contract (read from the panel):
//   addShapeLayer(name?) -> "SUCCESS" / "ERR:"
//   createPrimitive(encodeURIComponent(JSON {type,w,h,sides?,color?})) -> "SUCCESS" / "ERR:"
//     type: "rect" | "ellipse" | "triangle" | "line"
//   createCustomShapes(encodeURIComponent(JSON [{points:[[x,y],...],closed,fill,stroke}])) -> "OK:"+count
//   laPathStart() -> "OK:"+pathId  (creates/targets a shape layer, begins an empty path)
//   laPathSet(encodeURIComponent(JSON {pathId,points:[[x,y],...],closed})) -> "OK" / "ERR:"  (no undo group - called while drawing)
//   laPathGetSelectedState() -> JSON {found,pathId,points,closed}
//   laPathDelete(pathId) -> "SUCCESS" / "ERR:"
//   applyShapePreset(encodeURIComponent(JSON {preset,w,h})) -> "SUCCESS" / "ERR:"
//     preset: "badge" | "pill" | "ribbon" | "blob"
//   getExtraShapeData() -> JSON {found,vertexCount,fill,stroke,bounds,rigTags:[...]}
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
    function num(n) { return isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0"; }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function strField(s, name, def) { var m = new RegExp('"' + name + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(s); return m ? m[1].replace(/\\"/g, '"') : def; }
    function numField(s, name, def) { var m = new RegExp('"' + name + '"\\s*:\\s*(-?[0-9.]+)').exec(s); return m ? parseFloat(m[1]) : def; }

    function selShapes(comp) { var sel = H.selectedLayers(comp), out = [], i; for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof ShapeLayer) { out.push(sel[i]); } } return out; }
    function rootOf(L) { return L.property("ADBE Root Vectors Group"); }
    function addGroup(root, name) { var g = root.addProperty("ADBE Vector Group"); g.name = name; return g.property("ADBE Vectors Group"); }
    function addFill(contents, color) { var f = contents.addProperty("ADBE Vector Graphic - Fill"); try { f.property("ADBE Vector Fill Color").setValue(color); } catch (e) { } return f; }
    function addStroke(contents, color, width) {
        var s = contents.addProperty("ADBE Vector Graphic - Stroke");
        try { s.property("ADBE Vector Stroke Color").setValue(color); } catch (e) { }
        try { s.property("ADBE Vector Stroke Width").setValue(width); } catch (e2) { }
        return s;
    }
    function makePathGroup(contents, verts, closed, inT, outT) {
        var pg = contents.addProperty("ADBE Vector Shape - Group"), sh = new Shape();
        sh.vertices = verts;
        var i, it = inT || [], ot = outT || [];
        if (!inT) { for (i = 0; i < verts.length; i += 1) { it.push([0, 0]); } }
        if (!outT) { for (i = 0; i < verts.length; i += 1) { ot.push([0, 0]); } }
        sh.inTangents = it; sh.outTangents = ot; sh.closed = !!closed;
        pg.property("ADBE Vector Shape").setValue(sh);
        return pg;
    }
    // Finds "key":[...] and extracts the points inside using real bracket-depth counting rather than a
    // regex nested-bracket trick (which over-consumes across sibling arrays/objects - caught in testing).
    function parsePointsArray(s, key) {
        var pts = [];
        var keyIdx = s.indexOf('"' + key + '"');
        if (keyIdx < 0) { return pts; }
        var start = s.indexOf("[", keyIdx);
        if (start < 0) { return pts; }
        var depth = 0, i, end = -1;
        for (i = start; i < s.length; i += 1) {
            var ch = s.charAt(i);
            if (ch === "[") { depth += 1; } else if (ch === "]") { depth -= 1; if (depth === 0) { end = i; break; } }
        }
        if (end < 0) { return pts; }
        var inner = s.substring(start, end + 1), re = /\[\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*\]/g, m;
        while ((m = re.exec(inner)) !== null) { pts.push([parseFloat(m[1]), parseFloat(m[2])]); }
        return pts;
    }
    // Splits a top-level JSON array of flat objects ([{...},{...}]) into individual "{...}" chunks by
    // brace-depth counting. Safe here because this schema has no string fields that could contain braces.
    function splitObjectChunks(s) {
        var chunks = [], depth = 0, start = -1, i;
        for (i = 0; i < s.length; i += 1) {
            var ch = s.charAt(i);
            if (ch === "{") { if (depth === 0) { start = i; } depth += 1; }
            else if (ch === "}") { depth -= 1; if (depth === 0 && start >= 0) { chunks.push(s.substring(start, i + 1)); start = -1; } }
        }
        return chunks;
    }

    // ================= basic creation =================
    F.addShapeLayer = function (name) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        app.beginUndoGroup("Add Shape Layer");
        try {
            var L = comp.layers.addShape();
            if (name && String(name).length && String(name) !== "undefined") { L.name = String(name); }
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.createPrimitive = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), type = strField(s, "type", "rect");
        var w = numField(s, "w", 200), h = numField(s, "h", 200);
        var cm = /"color"\s*:\s*\[([^\]]*)\]/.exec(s), color = [0.3, 0.6, 1, 1];
        if (cm) { var parts = cm[1].split(","); color = [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]), parts[3] !== undefined ? parseFloat(parts[3]) : 1]; }
        app.beginUndoGroup("Create Primitive");
        try {
            var L = comp.layers.addShape(); L.name = type.charAt(0).toUpperCase() + type.substring(1);
            var contents = rootOf(L), grp = addGroup(contents, type);
            if (type === "ellipse") {
                var eg = grp.addProperty("ADBE Vector Shape - Ellipse");
                eg.property("ADBE Vector Ellipse Size").setValue([w, h]);
            } else if (type === "triangle") {
                makePathGroup(grp, [[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], true);
            } else if (type === "line") {
                makePathGroup(grp, [[-w / 2, 0], [w / 2, 0]], false);
                addStroke(grp, color, 6);
                L.transform.position.setValue([comp.width / 2, comp.height / 2]);
                app.endUndoGroup();
                return "SUCCESS";
            } else {
                var rg = grp.addProperty("ADBE Vector Shape - Rect");
                rg.property("ADBE Vector Rect Size").setValue([w, h]);
            }
            addFill(grp, color);
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.createCustomShapes = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg);
        var chunks = splitObjectChunks(s), count = 0, ci;
        app.beginUndoGroup("Create Custom Shapes");
        try {
            for (ci = 0; ci < chunks.length; ci += 1) {
                var chunk = chunks[ci], pts = parsePointsArray(chunk, "points");
                if (pts.length < 2) { continue; }
                var closedM = /"closed"\s*:\s*true/.test(chunk);
                var fm = /"fill"\s*:\s*\[([^\]]*)\]/.exec(chunk), fill = fm ? fm[1].split(",") : null;
                var smStroke = /"stroke"\s*:\s*\[([^\]]*)\]/.exec(chunk), stroke = smStroke ? smStroke[1].split(",") : null;
                var L = comp.layers.addShape(); L.name = "Custom Shape " + (count + 1);
                var grp = addGroup(rootOf(L), "Shape");
                makePathGroup(grp, pts, closedM);
                if (fill) { addFill(grp, [parseFloat(fill[0]), parseFloat(fill[1]), parseFloat(fill[2]), fill[3] !== undefined ? parseFloat(fill[3]) : 1]); }
                if (stroke) { addStroke(grp, [parseFloat(stroke[0]), parseFloat(stroke[1]), parseFloat(stroke[2]), stroke[3] !== undefined ? parseFloat(stroke[3]) : 1], 4); }
                if (!fill && !stroke) { addFill(grp, [0.3, 0.6, 1, 1]); }
                L.transform.position.setValue([comp.width / 2, comp.height / 2]);
                count += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return count ? ("OK:" + count) : "ERR:No valid shape definitions supplied.";
    };

    // ================= La Path: freehand path drawing session =================
    // The panel draws on its own canvas/overlay and streams points here; laPathSet is called repeatedly
    // while the user drags, so it stays undo-group-free (same pattern as scrubTransform).
    var LA_MARK = "akira-lapath:";
    function findLaLayer(comp, pathId) {
        var i; for (i = 1; i <= comp.numLayers; i += 1) { if (String(comp.layer(i).comment || "") === LA_MARK + pathId) { return comp.layer(i); } }
        return null;
    }
    F.laPathStart = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var pathId = "la" + Math.floor(new Date().getTime() % 1000000);
        app.beginUndoGroup("Start Path");
        try {
            var L = comp.layers.addShape(); L.name = "La Path";
            L.comment = LA_MARK + pathId;
            var grp = addGroup(rootOf(L), "Path");
            makePathGroup(grp, [], false);
            addStroke(grp, [1, 1, 1, 1], 4);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + pathId;
    };
    F.laPathSet = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), pathId = strField(s, "pathId", "");
        var L = findLaLayer(comp, pathId);
        if (!L) { return "ERR:No active path session with that id."; }
        var pts = parsePointsArray(s, "points");
        if (pts.length < 2) { return "ERR:Need at least 2 points."; }
        var closed = /"closed"\s*:\s*true/.test(s);
        try {
            var grp = rootOf(L).property(1).property("ADBE Vectors Group");
            var pg = grp.property(1); // the single shape path group created in laPathStart
            var sh = new Shape(), it = [], ot = [], i;
            for (i = 0; i < pts.length; i += 1) { it.push([0, 0]); ot.push([0, 0]); }
            sh.vertices = pts; sh.inTangents = it; sh.outTangents = ot; sh.closed = closed;
            pg.property("ADBE Vector Shape").setValue(sh);
        } catch (e) { return "ERR:" + e.toString(); }
        return "OK";
    };
    F.laPathGetSelectedState = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"found":false}'; }
        var layers = selShapes(comp), i;
        for (i = 0; i < layers.length; i += 1) {
            var c = String(layers[i].comment || "");
            if (c.indexOf(LA_MARK) !== 0) { continue; }
            var pathId = c.substring(LA_MARK.length);
            try {
                var grp = rootOf(layers[i]).property(1).property("ADBE Vectors Group");
                var sh = grp.property(1).property("ADBE Vector Shape").value;
                var pts = [], p;
                for (p = 0; p < sh.vertices.length; p += 1) { pts.push("[" + num(sh.vertices[p][0]) + "," + num(sh.vertices[p][1]) + "]"); }
                return '{"found":true,"pathId":' + jsonStr(pathId) + ',"points":[' + pts.join(",") + '],"closed":' + (sh.closed ? "true" : "false") + '}';
            } catch (e) { return '{"found":false}'; }
        }
        return '{"found":false}';
    };
    F.laPathDelete = function (pathId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var L = findLaLayer(comp, String(pathId));
        if (!L) { return "ERR:No path with that id."; }
        app.beginUndoGroup("Delete Path");
        try { L.remove(); } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= shape presets =================
    function roundedRectVerts(w, h, r) {
        // 8-point rounded rect approximation using bezier tangents would be nicer, but a plain polygon
        // keeps this dependency-free; corner points are inset so it still reads as "rounded enough" at small r.
        var hw = w / 2, hh = h / 2;
        return [[-hw + r, -hh], [hw - r, -hh], [hw, -hh + r], [hw, hh - r], [hw - r, hh], [-hw + r, hh], [-hw, hh - r], [-hw, -hh + r]];
    }
    function blobVerts(w, h, seed) {
        var pts = [], n = 10, i, rnd = seed;
        function rand() { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; }
        for (i = 0; i < n; i += 1) {
            var a = (i / n) * Math.PI * 2, rx = (w / 2) * (0.8 + 0.2 * rand()), ry = (h / 2) * (0.8 + 0.2 * rand());
            pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
        }
        return pts;
    }
    F.applyShapePreset = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), preset = strField(s, "preset", "badge");
        var w = numField(s, "w", 300), h = numField(s, "h", 160);
        app.beginUndoGroup("Apply Shape Preset: " + preset);
        try {
            var L = comp.layers.addShape(); L.name = preset.charAt(0).toUpperCase() + preset.substring(1);
            var grp = addGroup(rootOf(L), preset);
            if (preset === "pill") {
                var eg = grp.addProperty("ADBE Vector Shape - Rect");
                eg.property("ADBE Vector Rect Size").setValue([w, h]);
                eg.property("ADBE Vector Rect Roundness").setValue(h / 2);
            } else if (preset === "ribbon") {
                var rb = h * 0.25;
                makePathGroup(grp, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [w / 2 - rb, h / 2 - rb], [w / 2 - rb * 2, h / 2], [-w / 2, h / 2]], true);
            } else if (preset === "blob") {
                makePathGroup(grp, blobVerts(w, h, 42), true);
            } else { // badge: rounded-ish rect via polygon corners
                makePathGroup(grp, roundedRectVerts(w, h, Math.min(w, h) * 0.18), true);
            }
            addFill(grp, [0.3, 0.6, 1, 1]);
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= shape inspector =================
    F.getExtraShapeData = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"found":false}'; }
        var layers = selShapes(comp);
        if (!layers.length) { return '{"found":false}'; }
        var L = layers[0], r = H.sourceRect(L, comp.time) || { left: 0, top: 0, width: 0, height: 0 };
        var vcount = 0, fill = null, stroke = null;
        try {
            var grp = rootOf(L).property(1).property("ADBE Vectors Group"), i;
            for (i = 1; i <= grp.numProperties; i += 1) {
                var p = grp.property(i);
                if (p.matchName === "ADBE Vector Shape - Group") { try { vcount = p.property("ADBE Vector Shape").value.vertices.length; } catch (e0) { } }
                if (p.matchName === "ADBE Vector Graphic - Fill" && !fill) { try { fill = p.property("ADBE Vector Fill Color").value; } catch (e1) { } }
                if (p.matchName === "ADBE Vector Graphic - Stroke" && !stroke) { try { stroke = p.property("ADBE Vector Stroke Color").value; } catch (e2) { } }
            }
        } catch (e3) { }
        var tags = [], c = String(L.comment || "");
        if (c.length) { tags.push(jsonStr(c)); }
        return '{"found":true,"vertexCount":' + vcount +
            ',"fill":' + (fill ? ("[" + num(fill[0]) + "," + num(fill[1]) + "," + num(fill[2]) + "]") : "null") +
            ',"stroke":' + (stroke ? ("[" + num(stroke[0]) + "," + num(stroke[1]) + "," + num(stroke[2]) + "]") : "null") +
            ',"bounds":{"left":' + num(r.left) + ',"top":' + num(r.top) + ',"width":' + num(r.width) + ',"height":' + num(r.height) + '}' +
            ',"rigTags":[' + tags.join(",") + ']}';
    };
})();
