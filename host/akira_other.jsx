// Sougetsu Akira FX - dispatcher, version flags, layer-effects inspector, smart type anchor, extrusion,
// trim-to-below, system labels (clean-room). Batch M.
// Contract:
//   run(name, a1, a2, ...) -> whatever $._flex[name] (or global name) returns, or "ERR:Unknown function: name"
//   saasVersion() -> "0"   (SaaS-tier effects not shipped; panel hides them)
//   flexProjectOrganizerVersion() / flexTypeReAlignVersion() -> version string
//   getSelectedLayerEffects() -> JSON {found, layer, effects:[{index,name,matchName,enabled}]}
//   deleteLayerEffect(index) / toggleLayerEffectActive(index) -> "SUCCESS" / "ERR:"  (first selected layer, Effect Parade index)
//   deleteAllLayerEffects() -> "SUCCESS" / "ERR:"  (every selected layer)
//   applySystemLabelsToSelected(labelId?) -> "SUCCESS" / "ERR:"  (1-16; omitted/0 = cycle 1..16)
//   trimToBelowLayer() -> "SUCCESS" / "ERR:"
//   createExtrusion(depth?) -> "SUCCESS" / "ERR:"
//   flexTypeSelection(pos) -> "SUCCESS" / "ERR:"   pos: TL TM TR ML MM MR BL BM BR (pins anchor, stored in comment)
//   flexTypeResetAnchor() -> "SUCCESS" / "ERR:"    (re-applies each text layer's stored pin to its current bounds)
//   flexTypeAlign(pos) -> "SUCCESS" / "ERR:"       (moves text bounds to that comp edge/corner)
//   flexTypeCenter() -> "SUCCESS" / "ERR:"
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function noComp() { return "ERR:Open a composition first."; }
    function noSel() { return "ERR:Select at least one layer."; }

    // ================= dispatcher + version flags =================
    F.run = function (name) {
        var fn = F[name], i, args = [];
        if (typeof fn !== "function") { try { fn = $.global[name]; } catch (e0) { fn = null; } }
        if (typeof fn !== "function" || name === "run") { return "ERR:Unknown function: " + name; }
        for (i = 1; i < arguments.length; i += 1) { args.push(arguments[i]); }
        try { return fn.apply(F, args); } catch (e) { return "ERR:" + e.toString(); }
    };
    F.saasVersion = function () { return "0"; };
    F.flexTypeReAlignVersion = function () { return "1.0.0"; };
    F.flexProjectOrganizerVersion = function () { return "1.0.0"; };
    try { if (typeof $.global.flexProjectOrganizerVersion !== "function") { $.global.flexProjectOrganizerVersion = F.flexProjectOrganizerVersion; } } catch (eg) { }

    // ================= layer-effects inspector (by Effect Parade index) =================
    function parade(L) { try { return L.property("ADBE Effect Parade"); } catch (e) { return null; } }
    function firstSel(comp) { var s = H.selectedLayers(comp); return s.length ? s[0] : null; }

    F.getSelectedLayerEffects = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"found":false}'; }
        var L = firstSel(comp), fx = L ? parade(L) : null;
        if (!fx) { return '{"found":false}'; }
        var out = [], i;
        for (i = 1; i <= fx.numProperties; i += 1) {
            var e = fx.property(i);
            out.push('{"index":' + i + ',"name":' + jsonStr(e.name) + ',"matchName":' + jsonStr(e.matchName) + ',"enabled":' + (e.enabled ? "true" : "false") + '}');
        }
        return '{"found":true,"layer":' + jsonStr(L.name) + ',"effects":[' + out.join(",") + ']}';
    };

    function effectAt(comp, index) {
        var L = firstSel(comp), fx = L ? parade(L) : null, n = parseInt(index, 10);
        if (!fx || isNaN(n) || n < 1 || n > fx.numProperties) { return null; }
        return fx.property(n);
    }
    F.deleteLayerEffect = function (index) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var e = effectAt(comp, index); if (!e) { return "ERR:Effect not found."; }
        app.beginUndoGroup("Delete Effect");
        try { e.remove(); } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.toggleLayerEffectActive = function (index) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var e = effectAt(comp, index); if (!e) { return "ERR:Effect not found."; }
        app.beginUndoGroup("Toggle Effect");
        try { e.enabled = !e.enabled; } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.deleteAllLayerEffects = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var sel = H.selectedLayers(comp), i, j; if (!sel.length) { return noSel(); }
        app.beginUndoGroup("Delete All Effects");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var fx = parade(sel[i]); if (!fx) { continue; }
                for (j = fx.numProperties; j >= 1; j -= 1) { fx.property(j).remove(); }
            }
        } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= labels / trim / extrusion =================
    F.applySystemLabelsToSelected = function (labelId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var sel = H.selectedLayers(comp), i, id = parseInt(labelId, 10); if (!sel.length) { return noSel(); }
        var fixed = !isNaN(id) && id >= 1 && id <= 16;
        app.beginUndoGroup("Apply Labels");
        try { for (i = 0; i < sel.length; i += 1) { sel[i].label = fixed ? id : ((i % 16) + 1); } }
        catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.trimToBelowLayer = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var sel = H.selectedLayers(comp), i, done = 0; if (!sel.length) { return noSel(); }
        app.beginUndoGroup("Trim To Below Layer");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var idx = sel[i].index; if (idx >= comp.numLayers) { continue; }
                var b = comp.layer(idx + 1);
                sel[i].inPoint = b.inPoint; sel[i].outPoint = b.outPoint; done += 1;
            }
        } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:No layer below the selection.";
    };

    F.createExtrusion = function (depth) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var sel = H.selectedLayers(comp), i, d = parseFloat(depth), done = 0; if (!sel.length) { return noSel(); }
        if (isNaN(d)) { d = 50; }
        app.beginUndoGroup("Create Extrusion");
        try {
            try { comp.renderer = "ADBE Advanced 3d"; } catch (er0) { }
            for (i = 0; i < sel.length; i += 1) {
                var L = sel[i];
                if (!(L instanceof TextLayer) && !(L instanceof ShapeLayer)) { continue; }
                L.threeDLayer = true;
                try { L.property("ADBE Extrsn Options Grp").property("ADBE Extrsn Depth").setValue(d); } catch (er1) { }
                done += 1;
            }
        } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Select text or shape layers.";
    };

    // ================= smart type anchor =================
    var PIN_MARK = "akira-typepin:";
    var POS = { TL: [0, 0], TM: [0.5, 0], TR: [1, 0], ML: [0, 0.5], MM: [0.5, 0.5], MR: [1, 0.5], BL: [0, 1], BM: [0.5, 1], BR: [1, 1] };
    function posKey(p) { var k = String(p || "MM").toUpperCase(); return POS[k] ? k : null; }
    function selText(comp) { var s = H.selectedLayers(comp), o = [], i; for (i = 0; i < s.length; i += 1) { if (s[i] instanceof TextLayer) { o.push(s[i]); } } return o; }
    function readPin(L) { var m = /akira-typepin:([A-Z]{2})/.exec(String(L.comment || "")); return (m && POS[m[1]]) ? m[1] : "MM"; }
    function writePin(L, k) {
        var c = String(L.comment || "").replace(/akira-typepin:[A-Z]{2}/, "");
        L.comment = PIN_MARK + k + (c.length ? " " + c.replace(/^\s+/, "") : "");
    }
    // Moves the anchor to the pin on the current text bounds, compensating position so nothing moves on screen.
    function pinAnchor(L, t, k) {
        var r = H.sourceRect(L, t); if (!r) { return; }
        var f = POS[k], ap = L.transform.anchorPoint, ps = L.transform.position, sc = L.transform.scale.value;
        var oa = ap.value, op = ps.value;
        var na = [r.left + f[0] * r.width, r.top + f[1] * r.height];
        var dx = (na[0] - oa[0]) * sc[0] / 100, dy = (na[1] - oa[1]) * sc[1] / 100;
        ap.setValue(oa.length > 2 ? [na[0], na[1], oa[2]] : na);
        ps.setValue(op.length > 2 ? [op[0] + dx, op[1] + dy, op[2]] : [op[0] + dx, op[1] + dy]);
    }
    function compBounds(L, t) {
        var r = H.sourceRect(L, t); if (!r) { return null; }
        var a = L.transform.anchorPoint.value, p = L.transform.position.value, s = L.transform.scale.value;
        var x0 = p[0] + (r.left - a[0]) * s[0] / 100, y0 = p[1] + (r.top - a[1]) * s[1] / 100;
        return { left: x0, top: y0, width: r.width * s[0] / 100, height: r.height * s[1] / 100 };
    }
    function typeBatch(title, fn) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return noComp(); }
        var ls = selText(comp), i; if (!ls.length) { return "ERR:Select at least one text layer."; }
        app.beginUndoGroup(title);
        try { for (i = 0; i < ls.length; i += 1) { fn(ls[i], comp); } }
        catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    }

    F.flexTypeSelection = function (pos) {
        var k = posKey(pos); if (!k) { return "ERR:Unknown anchor position: " + pos; }
        return typeBatch("Type Anchor " + k, function (L, comp) { writePin(L, k); pinAnchor(L, comp.time, k); });
    };
    F.flexTypeResetAnchor = function () {
        return typeBatch("Reset Type Anchor", function (L, comp) { pinAnchor(L, comp.time, readPin(L)); });
    };
    F.flexTypeAlign = function (pos) {
        var k = posKey(pos); if (!k) { return "ERR:Unknown align position: " + pos; }
        var f = POS[k];
        return typeBatch("Type Align " + k, function (L, comp) {
            var b = compBounds(L, comp.time); if (!b) { return; }
            var tx = f[0] * (comp.width - b.width), ty = f[1] * (comp.height - b.height);
            var p = L.transform.position.value, nx = p[0] + tx - b.left, ny = p[1] + ty - b.top;
            L.transform.position.setValue(p.length > 2 ? [nx, ny, p[2]] : [nx, ny]);
        });
    };
    F.flexTypeCenter = function () { return F.flexTypeAlign("MM"); };
})();
