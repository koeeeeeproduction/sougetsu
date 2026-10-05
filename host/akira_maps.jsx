// Sougetsu Akira FX - Map Rigs engine (clean-room, own design). Contracts read from client/js_akira/map_rigs.js:
//   $._akira.akiraMapEngineVersion (number property, panel requires >= 20)
//   akiraMap_createFromFile(path)            -> "OK:<rigLayerIndex>:RIG:<rigId>" / "ERR:"
//   akiraMap_replaceViewFromFile(path)       -> "OK" / "ERR:"        (live re-render of imagery, borders, labels)
//   akiraMap_syncRigToView(index, lat, lon, zoom, bearing, rigId) -> "OK" / "ERR:"
//   akiraMap_listRigs()                      -> JSON [{index,id,name,level,baseFrameMerc:"minX,maxX,minY,maxY"}]
//   akiraMap_selectRig(index, rigId)         -> "OK:<resolvedIndex>" / "ERR:"
//   akiraMap_activeRig()                     -> JSON {name,index,id} / "null"
//   akiraMap_bakeRig(index, rigId)           -> "OK" / "ERR:"
//   akiraMap_traceOutlineFromFile(path)      -> "SUCCESS:<rigIndex>:RIG:<rigName>" or "SUCCESS:0:COMP:<layerName>" / "ERR:"
//   akiraMap_createTrackerFromFile(path)     -> "OK:<trackerLayerIndex>" / "ERR:"
// Payloads are JSON files the panel writes to its cache folder. Geometry arrives normalised (0..1) to a Web-Mercator
// frame {minX,maxX,minY,maxY}; every rig keeps its own base frame (in the rig layer comment) and anything added later
// is re-projected into it, so imagery, outlines and trackers stay aligned when the view is re-synced.
// Rig = precomp layer with effects "Akira Map Zoom" (slider, %), "Akira Map Pan" (point, inner-comp px),
// "Akira Map Bearing" (angle) driving scale / anchor point / rotation by expression.
// Tags used by the panel's own follow-up scripts: AKIRA_MAP_OUTLINE_V1|name, AKIRA_MAP_PLACE_VECTOR_V1|name|.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H || !H.parseJSON) { return; }
    F.akiraMapEngineVersion = 20;

    var RIG = "AKIRA_MAP_RIG_V1|", FX_ZOOM = "Akira Map Zoom", FX_PAN = "Akira Map Pan", FX_BEAR = "Akira Map Bearing";
    var VIEW_TAGS = ["AKIRA_MAP_BASEMAP_V1", "AKIRA_MAP_BG_V1", "AKIRA_MAP_FEATURE_V1", "AKIRA_MAP_LABEL_V1", "AKIRA_MAP_PATHS_V1"];
    var NO_COMP = "ERR:Open a composition first.";

    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function rgb(c, d) { return (c instanceof Array && c.length >= 3) ? [num(c[0], 0), num(c[1], 0), num(c[2], 0)] : d; }
    function readPayload(path) {
        var p;
        try { p = H.readJSONFile(path); } catch (e) { throw new Error("Could not read the map payload: " + e.message); }
        if (!p) { throw new Error("Map payload file not found."); }
        return p;
    }
    function frameOf(o) {
        if (!o) { return null; }
        var f = { minX: num(o.minX, NaN), maxX: num(o.maxX, NaN), minY: num(o.minY, NaN), maxY: num(o.maxY, NaN) };
        if (isNaN(f.minX) || isNaN(f.maxX) || isNaN(f.minY) || isNaN(f.maxY) || f.maxX <= f.minX || f.maxY <= f.minY) { return null; }
        return f;
    }
    function latLonToMerc(lat, lon) {
        var l = Math.max(-85, Math.min(85, num(lat, 0))), r = l * Math.PI / 180;
        return [(num(lon, 0) + 180) / 360, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2];
    }
    // Mercator -> inner-comp pixels for a rig frame; x is wrapped to the copy of the world nearest the frame.
    function mapper(f, W, Hh) {
        var sx = f.maxX - f.minX, sy = f.maxY - f.minY, cx = (f.minX + f.maxX) / 2;
        return function (mx, my) {
            while (mx < cx - 0.5) { mx += 1; }
            while (mx > cx + 0.5) { mx -= 1; }
            return [(mx - f.minX) / sx * W, (my - f.minY) / sy * Hh];
        };
    }
    // Normalised point in payload frame pf -> inner-comp pixels of the rig.
    function fromNorm(pf, toPx) { return function (p) { return toPx(pf.minX + num(p[0], 0) * (pf.maxX - pf.minX), pf.minY + num(p[1], 0) * (pf.maxY - pf.minY)); }; }

    // ---------- rig bookkeeping ----------
    function parseRig(L, index) {
        var c = String(L.comment || "");
        if (c.indexOf(RIG) !== 0) { return null; }
        var p = c.split("|"), fr = String(p[3] || "").split(",");
        var f = frameOf({ minX: fr[0], maxX: fr[1], minY: fr[2], maxY: fr[3] });
        if (!f || !(L.source instanceof CompItem)) { return null; }
        return { layer: L, index: index, id: p[1], level: p[2] || "VIEW", frame: f, name: L.name };
    }
    function writeRigTag(L, id, level, f) { L.comment = RIG + id + "|" + level + "|" + [f.minX, f.maxX, f.minY, f.maxY].join(","); }
    function allRigs(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { var r = parseRig(comp.layer(i), i); if (r) { out.push(r); } }
        return out;
    }
    // id wins (layer indexes shift as layers are added); then a valid index; then the selected rig; then the first one.
    function resolveRig(comp, index, id, auto) {
        var rigs = allRigs(comp), i, n = parseInt(index, 10);
        if (id) { for (i = 0; i < rigs.length; i += 1) { if (rigs[i].id === String(id)) { return rigs[i]; } } }
        if (n > 0) { for (i = 0; i < rigs.length; i += 1) { if (rigs[i].index === n) { return rigs[i]; } } }
        if (auto === false) { return null; }
        for (i = 0; i < rigs.length; i += 1) { if (rigs[i].layer.selected) { return rigs[i]; } }
        return rigs.length ? rigs[0] : null;
    }
    function rigFx(rig, name) { try { return rig.layer.property("ADBE Effect Parade").property(name).property(1); } catch (e) { return null; } }
    function toPxFor(rig) { return mapper(rig.frame, rig.layer.source.width, rig.layer.source.height); }
    function assetFolder() {
        var i, items = app.project.items;
        for (i = 1; i <= items.length; i += 1) { if (items[i] instanceof FolderItem && items[i].name === "Akira Map Assets") { return items[i]; } }
        return items.addFolder("Akira Map Assets");
    }
    function importImage(path) {
        var f = new File(String(path)); if (!f.exists) { return null; }
        var it = app.project.importFile(new ImportOptions(f));
        try { it.parentFolder = assetFolder(); } catch (e) { }
        return it;
    }

    // ---------- inner content builders ----------
    function shapeLayer(mc, name, comment, rings, closed, strokeRgb, strokeW, fillRgb) {
        var L = mc.layers.addShape(), c = L.property("ADBE Root Vectors Group"), i, j;
        L.name = name; L.comment = comment;
        for (i = 0; i < rings.length; i += 1) {
            var pts = rings[i]; if (!pts || pts.length < 2) { continue; }
            var sh = new Shape(), z = [];
            for (j = 0; j < pts.length; j += 1) { z.push([0, 0]); }
            sh.vertices = pts; sh.inTangents = z; sh.outTangents = z; sh.closed = !!closed;
            var pg = c.addProperty("ADBE Vector Shape - Group"); pg.name = "Path " + (i + 1);
            pg.property("ADBE Vector Shape").setValue(sh);
        }
        if (fillRgb) { c.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(fillRgb); }
        var st = c.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue(strokeRgb || [1, 1, 1]);
        st.property("ADBE Vector Stroke Width").setValue(Math.max(0.5, num(strokeW, 2)));
        try { st.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e) { }
        L.transform.anchorPoint.setValue([0, 0]); L.transform.position.setValue([0, 0]);
        return L;
    }
    function ringsFrom(list, conv) {
        var out = [], i, j;
        for (i = 0; i < (list || []).length; i += 1) {
            var r = list[i], pts = [];
            for (j = 0; j < r.length; j += 1) { pts.push(conv(r[j])); }
            if (pts.length >= 2) { out.push(pts); }
        }
        return out;
    }
    function placeImage(mc, item, rect, comment, name) {
        var L = mc.layers.add(item);
        L.name = name; L.comment = comment;
        L.transform.anchorPoint.setValue([0, 0]);
        L.transform.position.setValue([rect[0], rect[1]]);
        L.transform.scale.setValue([rect[2] / item.width * 100, rect[3] / item.height * 100]);
        return L;
    }
    function frameRect(fr, toPx) { var a = toPx(fr.minX, fr.minY), b = toPx(fr.maxX, fr.maxY); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; }
    // Imagery, borders and labels for a view frame `vf`, drawn into inner comp `mc` through `toPx`.
    function buildView(mc, p, vf, toPx) {
        var i, conv = fromNorm(vf, toPx), r = frameRect(vf, toPx), made = [];
        var bg = mc.layers.addSolid(rgb(p.fill, [0.09, 0.14, 0.17]), "Map Background", Math.max(4, Math.round(Math.abs(r[2]))), Math.max(4, Math.round(Math.abs(r[3]))), 1);
        bg.comment = "AKIRA_MAP_BG_V1"; bg.transform.anchorPoint.setValue([0, 0]); bg.transform.position.setValue([r[0], r[1]]);
        made.push(bg);
        var layers = p.basemapLayers || [];
        if (!layers.length && p.basemapPath && !p.removeBasemap) { layers = [{ path: p.basemapPath, frame: vf, label: "Basemap" }]; }
        for (i = 0; i < layers.length; i += 1) {
            var bf = frameOf(layers[i].frame) || vf, it = importImage(layers[i].path);
            if (!it) { continue; }
            var im = placeImage(mc, it, frameRect(bf, toPx), "AKIRA_MAP_BASEMAP_V1|" + (layers[i].label || ""), "Basemap" + (layers[i].label ? " · " + layers[i].label : ""));
            made.push(im);
        }
        var feats = p.features || [];
        for (i = 0; i < feats.length; i += 1) {
            var ft = feats[i], rings = ringsFrom(ft.paths, conv);
            if (rings.length) { made.push(shapeLayer(mc, ft.name || "Borders", "AKIRA_MAP_FEATURE_V1|" + (ft.name || ""), rings, ft.isClosed !== false, rgb(ft.stroke, [1, 1, 1]), ft.strokeWidth, null)); }
        }
        if (p.paths && p.paths.length) {
            var pr = ringsFrom(p.paths, conv);
            if (pr.length) { made.push(shapeLayer(mc, "Map Paths", "AKIRA_MAP_PATHS_V1", pr, true, rgb(p.stroke, [1, 1, 1]), p.strokeWidth, null)); }
        }
        var labels = p.labels || [], fs = Math.max(10, Math.round(mc.width * 0.014));
        for (i = 0; i < labels.length; i += 1) {
            var lb = labels[i], pos = conv([lb.x, lb.y]);
            var tx = mc.layers.addText(String(lb.name || ""));
            tx.name = String(lb.name || "Label"); tx.comment = "AKIRA_MAP_LABEL_V1|" + tx.name;
            try {
                var td = tx.property("ADBE Text Properties").property("ADBE Text Document"), doc = td.value;
                doc.fontSize = num(lb.rank, 2) <= 1 ? Math.round(fs * 1.35) : fs; doc.fillColor = [1, 1, 1];
                doc.applyStroke = true; doc.strokeColor = [0, 0, 0]; doc.strokeWidth = Math.max(1, Math.round(fs / 8));
                doc.justification = ParagraphJustification.CENTER_JUSTIFY; td.setValue(doc);
            } catch (eT) { }
            tx.transform.position.setValue(pos);
            made.push(tx);
        }
        // stacking: background at the bottom, then imagery, borders, labels on top
        for (i = made.length - 1; i >= 0; i -= 1) { made[i].moveToEnd(); } // last moved ends lowest: background
        return made;
    }
    function clearView(mc) {
        var i, j;
        for (i = mc.numLayers; i >= 1; i -= 1) {
            var c = String(mc.layer(i).comment || "");
            for (j = 0; j < VIEW_TAGS.length; j += 1) { if (c.indexOf(VIEW_TAGS[j]) === 0) { mc.layer(i).remove(); break; } }
        }
    }
    function wpView(rig, lat, lon, zoom) {
        var mc = rig.layer.source, toPx = toPxFor(rig), m = latLonToMerc(lat, lon);
        var spanX = 1 / Math.pow(2, Math.max(0, num(zoom, 1)) - 1), rigSpan = rig.frame.maxX - rig.frame.minX;
        var outerW = rig.layer.containingComp.width;
        return { pan: toPx(m[0], m[1]), zoom: outerW / mc.width * (rigSpan / spanX) * 100 };
    }

    // ================= create =================
    F.akiraMap_createFromFile = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p; try { p = readPayload(path); } catch (e0) { return "ERR:" + e0.message; }
        var f = frameOf(p.baseFrameMerc); if (!f) { return "ERR:The map payload has no frame."; }
        var aspect = num(p.aspect, (f.maxX - f.minX) / (f.maxY - f.minY)), W = comp.width, Hh = Math.max(16, Math.min(30000, Math.round(W / Math.max(0.05, aspect))));
        var id = "m" + (new Date().getTime() % 100000000), level = String(p.level || "VIEW"), label = String(p.locationName || p.country || "Map");
        app.beginUndoGroup("Akira Map Rig");
        try {
            var mc = app.project.items.addComp("Akira Map · " + label, W, Hh, comp.pixelAspect, comp.duration, comp.frameRate);
            try { mc.parentFolder = assetFolder(); } catch (eF) { }
            buildView(mc, p, f, mapper(f, W, Hh));
            var L = comp.layers.add(mc); L.name = "Akira Map · " + label;
            writeRigTag(L, id, level, f);
            var fx = L.property("ADBE Effect Parade");
            var z = fx.addProperty("ADBE Slider Control"); z.name = FX_ZOOM; z.property(1).setValue(100);
            var pn = fx.addProperty("ADBE Point Control"); pn.name = FX_PAN; pn.property(1).setValue([W / 2, Hh / 2]);
            var br = fx.addProperty("ADBE Angle Control"); br.name = FX_BEAR; br.property(1).setValue(0);
            L.transform.anchorPoint.expression = "effect(\"" + FX_PAN + "\")(1)";
            L.transform.scale.expression = "const z=effect(\"" + FX_ZOOM + "\")(1);[z,z]";
            L.transform.rotation.expression = "-effect(\"" + FX_BEAR + "\")(1)";
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
            var an = p.animation;
            if (an && an.waypoints && an.waypoints.length) {
                var rig = parseRig(L, L.index), dur = Math.max(0.5, num(an.duration, 6)), t0 = comp.time, i, zp = z.property(1), pp = pn.property(1), bp = br.property(1);
                for (i = 0; i < an.waypoints.length; i += 1) {
                    var wp = an.waypoints[i], t = t0 + num(wp.timeFraction, i / Math.max(1, an.waypoints.length - 1)) * dur, v = wpView(rig, wp.lat, wp.lon, wp.zoom);
                    zp.setValueAtTime(t, v.zoom); pp.setValueAtTime(t, v.pan); bp.setValueAtTime(t, num(wp.bearing, 0));
                }
                if (String(an.easing || "") !== "linear") {
                    var props = [zp, pp, bp], k, q;
                    for (q = 0; q < props.length; q += 1) {
                        for (k = 1; k <= props[q].numKeys; k += 1) {
                            var dims = q === 1 ? 2 : 1, ez = [], d;
                            for (d = 0; d < dims; d += 1) { ez.push(new KeyframeEase(0, 40)); }
                            try { props[q].setTemporalEaseAtKey(k, ez, ez); } catch (eE) { }
                        }
                    }
                }
                if (comp.duration < t0 + dur) { try { comp.duration = t0 + dur; mc.duration = t0 + dur; } catch (eD) { } }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + L.index + ":RIG:" + id;
    };

    // ================= live view refresh / sync =================
    F.akiraMap_replaceViewFromFile = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p; try { p = readPayload(path); } catch (e0) { return "ERR:" + e0.message; }
        var rig = resolveRig(comp, p.layerIndex, p.rigId, true); if (!rig) { return "ERR:No map rig in the active comp."; }
        var vf = frameOf(p.baseFrameMerc) || rig.frame;
        app.beginUndoGroup("Akira Map View");
        try { var mc = rig.layer.source; clearView(mc); buildView(mc, p, vf, toPxFor(rig)); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK";
    };

    F.akiraMap_syncRigToView = function (index, lat, lon, zoom, bearing, rigId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var rig = resolveRig(comp, index, rigId, false); if (!rig) { return "ERR:That map rig is no longer in the active comp."; }
        var zp = rigFx(rig, FX_ZOOM), pp = rigFx(rig, FX_PAN), bp = rigFx(rig, FX_BEAR);
        if (!zp || !pp) { return "ERR:This map rig was baked and can no longer follow the panel."; }
        var v = wpView(rig, lat, lon, zoom), t = comp.time;
        app.beginUndoGroup("Akira Map Sync");
        try { H.setProp(zp, v.zoom, t); H.setProp(pp, v.pan, t); if (bp) { H.setProp(bp, num(bearing, 0), t); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK";
    };

    // ================= list / select / active / bake =================
    F.akiraMap_listRigs = function () {
        var comp = H.activeComp(); if (!comp) { return "[]"; }
        var rigs = allRigs(comp), out = [], i;
        for (i = 0; i < rigs.length; i += 1) {
            if (rigs[i].level === "BAKED") { continue; }
            var f = rigs[i].frame;
            out.push({ index: rigs[i].index, id: rigs[i].id, name: rigs[i].name, level: rigs[i].level, baseFrameMerc: [f.minX, f.maxX, f.minY, f.maxY].join(",") });
        }
        return H.toJSON(out);
    };
    F.akiraMap_selectRig = function (index, rigId) {
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var rig = resolveRig(comp, index, rigId, false), i; if (!rig) { return "ERR:That map rig is no longer in the active comp."; }
        try { for (i = 1; i <= comp.numLayers; i += 1) { comp.layer(i).selected = (i === rig.index); } } catch (e) { }
        return "OK:" + rig.index;
    };
    F.akiraMap_activeRig = function () {
        var comp = H.activeComp(); if (!comp) { return "null"; }
        var rig = resolveRig(comp, 0, "", true);
        return rig ? H.toJSON({ name: rig.name, index: rig.index, id: rig.id }) : "null";
    };
    F.akiraMap_bakeRig = function (index, rigId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var rig = resolveRig(comp, index, rigId, false); if (!rig) { return "ERR:That map rig is no longer in the active comp."; }
        var zp = rigFx(rig, FX_ZOOM), pp = rigFx(rig, FX_PAN), bp = rigFx(rig, FX_BEAR), tr = rig.layer.transform;
        if (!zp || !pp) { return "ERR:This map rig is already baked."; }
        app.beginUndoGroup("Bake Map Rig");
        try {
            var pairs = [[pp, tr.anchorPoint, function (v) { return v; }], [zp, tr.scale, function (v) { return [v, v]; }], [bp, tr.rotation, function (v) { return -v; }]], i, k;
            for (i = 0; i < pairs.length; i += 1) {
                var src = pairs[i][0], dst = pairs[i][1], fn = pairs[i][2];
                if (!src) { continue; }
                dst.expression = "";
                while (dst.numKeys) { dst.removeKey(dst.numKeys); }
                if (src.numKeys) {
                    for (k = 1; k <= src.numKeys; k += 1) {
                        dst.setValueAtTime(src.keyTime(k), fn(src.keyValue(k)));
                        try { if (dst.isInterpolationTypeValid(src.keyOutInterpolationType(k))) { dst.setInterpolationTypeAtKey(k, src.keyInInterpolationType(k), src.keyOutInterpolationType(k)); } } catch (eI) { }
                    }
                } else { dst.setValue(fn(src.value)); }
            }
            var fx = rig.layer.property("ADBE Effect Parade"), names = [FX_ZOOM, FX_PAN, FX_BEAR];
            for (i = 0; i < names.length; i += 1) { try { fx.property(names[i]).remove(); } catch (eR) { } }
            writeRigTag(rig.layer, rig.id, "BAKED", rig.frame);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK";
    };

    // ================= outlines / routes / data shapes =================
    function convForPayload(rig, p, comp) {
        var pf = frameOf(p.baseFrameMerc);
        if (rig) {
            var toPx = toPxFor(rig);
            if (pf) { return { conv: fromNorm(pf, toPx), geo: null }; }
            return { conv: null, geo: function (ll) { var m = latLonToMerc(ll[1], ll[0]); return toPx(m[0], m[1]); } };
        }
        var W = comp.width, Hh = comp.height;
        return { conv: function (q) { return [num(q[0], 0) * W, num(q[1], 0) * Hh]; }, geo: null };
    }
    F.akiraMap_traceOutlineFromFile = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p; try { p = readPayload(path); } catch (e0) { return "ERR:" + e0.message; }
        var name = String(p.name || "Outline"), rig = resolveRig(comp, p.layerIndex, p.rigId, p.autoRig !== false);
        var cv = convForPayload(rig, p, comp), rings = cv.conv ? ringsFrom(p.paths, cv.conv) : ringsFrom(p.geo, cv.geo);
        if (!rings.length && p.geo && p.geo.length && rig) { var toPx = toPxFor(rig); rings = ringsFrom(p.geo, function (ll) { var m = latLonToMerc(ll[1], ll[0]); return toPx(m[0], m[1]); }); }
        if (!rings.length) { return "ERR:Nothing to draw for " + name + "."; }
        var tag = "AKIRA_MAP_OUTLINE_V1|" + name, target = rig ? rig.layer.source : comp, i, L;
        app.beginUndoGroup("Akira Map Outline");
        try {
            if (p.replaceExisting) { for (i = target.numLayers; i >= 1; i -= 1) { if (String(target.layer(i).comment || "") === tag) { target.layer(i).remove(); } } }
            L = shapeLayer(target, name + " Outline", tag, rings, !!p.isClosed, rgb(p.stroke, [1, 1, 1]), p.strokeWidth, p.fill ? rgb(p.fill, null) : null);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return rig ? "SUCCESS:" + rig.index + ":RIG:" + rig.name : "SUCCESS:0:COMP:" + L.name;
    };

    // ================= trackers (pins, bubbles, spikes, places) =================
    F.akiraMap_createTrackerFromFile = function (path) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p; try { p = readPayload(path); } catch (e0) { return "ERR:" + e0.message; }
        var name = String(p.name || "Place"), rig = resolveRig(comp, p.layerIndex, p.rigId, p.autoRig !== false), pt, i;
        if (rig) {
            var toPx = toPxFor(rig), pf = frameOf(p.baseFrameMerc);
            if (isFinite(num(p.lat, NaN)) && isFinite(num(p.lon, NaN))) { var m = latLonToMerc(p.lat, p.lon); pt = toPx(m[0], m[1]); }
            else if (pf) { pt = fromNorm(pf, toPx)([p.x, p.y]); }
            else { pt = [rig.layer.source.width * num(p.x, 0.5), rig.layer.source.height * num(p.y, 0.5)]; }
        } else { pt = [comp.width * num(p.x, 0.5), comp.height * num(p.y, 0.5)]; }
        var T;
        app.beginUndoGroup("Akira Map Tracker");
        try {
            T = comp.layers.addNull(); T.name = "Track · " + name; T.comment = "AKIRA_MAP_TRACKER_V1|" + name;
            T.transform.anchorPoint.setValue([0, 0]);
            if (rig) {
                T.transform.position.expression = "const R=thisComp.layer(\"" + esc(rig.name) + "\");R.toComp([" + Math.round(pt[0] * 1000) / 1000 + "," + Math.round(pt[1] * 1000) / 1000 + "])";
                if (p.vectorPaths && p.vectorPaths.length) {
                    var pf2 = frameOf(p.baseFrameMerc), mc = rig.layer.source;
                    var rings = pf2 ? ringsFrom(p.vectorPaths, fromNorm(pf2, toPxFor(rig))) : [];
                    var tag = "AKIRA_MAP_PLACE_VECTOR_V1|" + name + "|";
                    for (i = mc.numLayers; i >= 1; i -= 1) { if (String(mc.layer(i).comment || "").indexOf(tag) === 0) { mc.layer(i).remove(); } }
                    if (rings.length) { shapeLayer(mc, name + " Boundary", tag + (p.osmId || ""), rings, p.vectorClosed !== false, rgb(p.stroke, [1, 1, 1]), p.strokeWidth, null); }
                }
                T.moveBefore(rig.layer);
            } else { T.transform.position.setValue(pt); }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + T.index;
    };
})();
