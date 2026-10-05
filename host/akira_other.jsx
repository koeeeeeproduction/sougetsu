// Sougetsu Akira FX - dispatcher, engine version flags, layer-effects inspector, text re-align,
// extrusion, trim-to-below, follow-system-labels (clean-room). Contracts read from the panel:
//   $._flex.run(name, a, b, c)                    -> result of $._flex[name] (or a global of that name)
//   $._flex.saasVersion        (number property)   -> 0: SaaS Effects engine is not shipped in this build
//   $._flex.flexTypeReAlignVersion (property)      -> checked by js_flex/flex_project_tools.js before calling flexType*
//   getSelectedLayerEffects()   -> JSON [{fxIndex,fxName,matchName,propName,fxActive}] (one row per effect property) / "ERR:"
//   toggleLayerEffectActive(i)  -> "Enabled" / "Disabled" / "ERR:"
//   deleteLayerEffect(i) / deleteAllLayerEffects() -> "SUCCESS" / "ERR:"   (first selected layer)
//   applySystemLabelsToSelected() -> "SUCCESS"  (called silently on every selection change while "follow system labels" is on)
//   trimToBelowLayer() / createExtrusion(depth) -> "SUCCESS" / "ERR:"
//   flexTypeSelection()          -> "OK:"+enc(JSON {textCount, justification, risk})
//   flexTypeAlign(name, mode)    -> "OK:"+enc(JSON {changed, skipped})   name left|center|right, mode visual|anchor
//   flexTypeCenter(axis)         -> "OK:"+enc(JSON {changed, skipped})   axis x|y|both
//   flexTypeResetAnchor()        -> "OK:"+enc(JSON {changed, skipped})
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function J(v) {
        var t = typeof v, i, out, k;
        if (v === null || v === undefined) { return "null"; }
        if (t === "number") { return isFinite(v) ? String(v) : "0"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
        if (v instanceof Array) { out = []; for (i = 0; i < v.length; i += 1) { out.push(J(v[i])); } return "[" + out.join(",") + "]"; }
        out = []; for (k in v) { if (v.hasOwnProperty(k)) { out.push(J(k) + ":" + J(v[k])); } } return "{" + out.join(",") + "}";
    }
    function okJ(v) { return "OK:" + encodeURIComponent(J(v)); }
    var NO_COMP = "ERR:Open a composition first.", NO_SEL = "ERR:Select a layer first.";

    // ================= dispatcher + engine flags =================
    F.run = function (name, a, b, c) {
        var fn = F[name];
        if (typeof fn !== "function") { try { fn = $.global[name]; } catch (e0) { fn = null; } }
        if (typeof fn !== "function" || name === "run") { return "ERR:Unknown function: " + name; }
        try { return fn.call(F, a, b, c); } catch (e) { return "ERR:" + e.toString(); }
    };
    F.saasVersion = 0; // akira_saas.jsx raises this to 9 when it loads
    F.flexTypeReAlignVersion = 1;
    if (typeof F.buildUITemplate === "function") { F.uiTemplateXVersion = 8; }
    // Settings > Keybinds writes a file for the separate FlexSwitcher app, then pings the host; nothing to reload here.
    F.reloadKeybinds = function () { return "OK"; };
    try { if (typeof $.global.getReferenceWorkspaceContext_FlexGUI === "function") { $.global._flexReferenceWorkspaceHostVersion = "2.0.0"; } } catch (eRW) { }

    // ================= layer-effects inspector =================
    function firstSel(comp) { var s = H.selectedLayers(comp); return s.length ? s[0] : null; }
    function parade(L) { try { return L.property("ADBE Effect Parade"); } catch (e) { return null; } }
    function isValueProp(p) {
        try {
            if (p.propertyType !== PropertyType.PROPERTY) { return false; }
            var t = p.propertyValueType;
            return t === PropertyValueType.OneD || t === PropertyValueType.TwoD || t === PropertyValueType.TwoD_SPATIAL ||
                t === PropertyValueType.ThreeD || t === PropertyValueType.ThreeD_SPATIAL || t === PropertyValueType.COLOR;
        } catch (e) { return false; }
    }
    function collectProps(group, out) {
        var i;
        for (i = 1; i <= group.numProperties; i += 1) {
            var p = group.property(i);
            if (p.propertyType === PropertyType.PROPERTY) { if (isValueProp(p)) { out.push(p); } }
            else { collectProps(p, out); }
        }
    }
    F.getSelectedLayerEffects = function () {
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var L = firstSel(comp), fx = L ? parade(L) : null;
        if (!fx) { return NO_SEL; }
        var rows = [], i, j;
        for (i = 1; i <= fx.numProperties; i += 1) {
            var e = fx.property(i), props = [];
            collectProps(e, props);
            if (!props.length) { rows.push({ fxIndex: i, fxName: e.name, matchName: e.matchName, propName: "", fxActive: !!e.enabled }); }
            for (j = 0; j < props.length; j += 1) {
                rows.push({ fxIndex: i, fxName: e.name, matchName: e.matchName, propName: props[j].name, fxActive: !!e.enabled });
            }
        }
        return J(rows);
    };
    function effectAt(comp, index) {
        var L = firstSel(comp), fx = L ? parade(L) : null, n = parseInt(index, 10);
        if (!fx || isNaN(n) || n < 1 || n > fx.numProperties) { return null; }
        return fx.property(n);
    }
    F.toggleLayerEffectActive = function (index) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var e = effectAt(comp, index); if (!e) { return "ERR:Effect not found on the selected layer."; }
        app.beginUndoGroup("Toggle Effect");
        try { e.enabled = !e.enabled; } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return e.enabled ? "Enabled" : "Disabled";
    };
    F.deleteLayerEffect = function (index) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var e = effectAt(comp, index); if (!e) { return "ERR:Effect not found on the selected layer."; }
        app.beginUndoGroup("Delete Effect");
        try { e.remove(); } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.deleteAllLayerEffects = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var L = firstSel(comp), fx = L ? parade(L) : null, j;
        if (!fx) { return NO_SEL; }
        app.beginUndoGroup("Delete All Effects");
        try { for (j = fx.numProperties; j >= 1; j -= 1) { fx.property(j).remove(); } }
        catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= follow system labels =================
    // AE's default label per layer kind (Preferences > Labels defaults): 1 Red, 2 Yellow, 3 Aqua, 4 Pink,
    // 5 Lavender, 6 Peach, 7 Sea Foam, 8 Blue, 10 Purple, 15 Sandstone.
    function systemLabel(L) {
        try {
            if (L instanceof TextLayer) { return 1; }
            if (L instanceof ShapeLayer) { return 8; }
            if (L instanceof CameraLayer) { return 4; }
            if (L instanceof LightLayer) { return 6; }
            if (L.nullLayer) { return 1; }
            if (L.adjustmentLayer) { return 10; }
            var s = L.source;
            if (s instanceof CompItem) { return 15; }
            if (s && s.mainSource instanceof SolidSource) { return 1; }
            if (s && !s.hasVideo && s.hasAudio) { return 7; }
            if (s && s.mainSource && s.mainSource.isStill) { return 5; }
            if (s) { return 3; }
        } catch (e) { }
        return 0;
    }
    F.applySystemLabelsToSelected = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), todo = [], i;
        for (i = 0; i < sel.length; i += 1) { var want = systemLabel(sel[i]); if (want && sel[i].label !== want) { todo.push([sel[i], want]); } }
        if (!todo.length) { return "SUCCESS"; } // nothing to change: no empty undo step on every selection poll
        app.beginUndoGroup("Apply System Labels");
        try { for (i = 0; i < todo.length; i += 1) { todo[i][0].label = todo[i][1]; } }
        catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= trim / extrusion =================
    F.trimToBelowLayer = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), i, done = 0; if (!sel.length) { return NO_SEL; }
        app.beginUndoGroup("Trim To Below Layer");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var idx = sel[i].index; if (idx >= comp.numLayers) { continue; }
                var b = comp.layer(idx + 1);
                sel[i].inPoint = b.inPoint; sel[i].outPoint = b.outPoint; done += 1;
            }
        } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:There is no layer below the selection.";
    };

    F.createExtrusion = function (depth) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), i, d = parseFloat(depth), done = 0; if (!sel.length) { return "ERR:Select text or shape layers."; }
        if (isNaN(d) || d < 0) { d = 20; }
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

    // ================= text re-align =================
    function selText(comp) { var s = H.selectedLayers(comp), o = [], i; for (i = 0; i < s.length; i += 1) { if (s[i] instanceof TextLayer) { o.push(s[i]); } } return o; }
    function animated(L) {
        var t = L.transform;
        try { if (L.threeDLayer) { return true; } } catch (e0) { }
        try { if (t.anchorPoint.numKeys || t.anchorPoint.expressionEnabled) { return true; } } catch (e1) { }
        try {
            if (t.position.dimensionsSeparated) { return !!(t.xPosition.numKeys || t.yPosition.numKeys || t.xPosition.expressionEnabled || t.yPosition.expressionEnabled); }
            return !!(t.position.numKeys || t.position.expressionEnabled);
        } catch (e2) { return true; }
    }
    function docOf(L) { return L.property("ADBE Text Properties").property("ADBE Text Document"); }
    function justName(j) {
        if (j === ParagraphJustification.CENTER_JUSTIFY) { return "center"; }
        if (j === ParagraphJustification.RIGHT_JUSTIFY) { return "right"; }
        if (j === ParagraphJustification.LEFT_JUSTIFY) { return "left"; }
        return "other";
    }
    function justValue(n) {
        if (n === "center") { return ParagraphJustification.CENTER_JUSTIFY; }
        if (n === "right") { return ParagraphJustification.RIGHT_JUSTIFY; }
        return ParagraphJustification.LEFT_JUSTIFY;
    }
    function edgeX(r, j) { return j === "center" ? r.left + r.width / 2 : (j === "right" ? r.left + r.width : r.left); }
    // Moves the anchor to a new layer-space point and shifts position by the matching parent-space offset,
    // so the layer doesn't move on screen (same math as the anchor tools in akira_tools.jsx).
    function moveAnchorKeep(L, na, t) {
        var ap = L.transform.anchorPoint, oa = ap.valueAtTime(t, false);
        var d1 = H.offsetFromAnchor(L, na, t), p = H.getPos(L, t);
        var np = [p[0] + d1[0], p[1] + d1[1]]; if (p.length > 2) { np.push(p[2]); }
        H.setProp(ap, oa.length > 2 ? [na[0], na[1], oa[2]] : [na[0], na[1]], t);
        H.setPos(L, np, t);
    }
    function typeRun(title, fn) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var ls = selText(comp), i, changed = 0, skipped = 0;
        if (!ls.length) { return "ERR:Select at least one text layer."; }
        app.beginUndoGroup(title);
        try {
            for (i = 0; i < ls.length; i += 1) {
                if (animated(ls[i])) { skipped += 1; continue; }
                if (fn(ls[i], comp, comp.time) !== false) { changed += 1; } else { skipped += 1; }
            }
        } catch (er) { app.endUndoGroup(); return "ERR:" + er.toString(); }
        app.endUndoGroup();
        return okJ({ changed: changed, skipped: skipped });
    }

    F.flexTypeSelection = function () {
        var comp = H.activeComp(); if (!comp) { return okJ({ textCount: 0, justification: "", risk: 0 }); }
        var ls = selText(comp), i, just = "", risk = 0;
        for (i = 0; i < ls.length; i += 1) {
            var n = "other"; try { n = justName(docOf(ls[i]).value.justification); } catch (e) { }
            just = (i === 0) ? n : (just === n ? just : "mixed");
            if (animated(ls[i])) { risk += 1; }
        }
        return okJ({ textCount: ls.length, justification: just, risk: risk });
    };

    F.flexTypeAlign = function (name, mode) {
        var target = String(name || "left"), keepAnchorEdge = String(mode) === "anchor";
        if (target !== "left" && target !== "center" && target !== "right") { return "ERR:Unknown alignment: " + target; }
        return typeRun("Text Re-Align", function (L, comp, t) {
            var td = docOf(L), doc = td.value, before = H.sourceRect(L, t);
            if (!before) { return false; }
            var oldJ = justName(doc.justification);
            doc.justification = justValue(target); td.setValue(doc);
            var after = H.sourceRect(L, t); if (!after) { return false; }
            // Text reflowed around its alignment point; shift anchor+position by the reflow so it stays on screen.
            var dx = before.left - after.left, dy = before.top - after.top;
            var a = L.transform.anchorPoint.valueAtTime(t, false);
            H.setProp(L.transform.anchorPoint, a.length > 2 ? [a[0] - dx, a[1] - dy, a[2]] : [a[0] - dx, a[1] - dy], t);
            if (keepAnchorEdge) {
                var cur = L.transform.anchorPoint.valueAtTime(t, false);
                moveAnchorKeep(L, [edgeX(after, target), cur[1]], t);
            }
            return oldJ !== target || keepAnchorEdge;
        });
    };

    F.flexTypeCenter = function (axis) {
        var ax = String(axis || "both"), doX = ax !== "y", doY = ax !== "x";
        return typeRun("Center Text", function (L, comp, t) {
            var r = H.sourceRect(L, t); if (!r) { return false; }
            var c = H.offsetFromAnchor(L, [r.left + r.width / 2, r.top + r.height / 2], t), p = H.getPos(L, t);
            var np = [p[0], p[1]]; if (p.length > 2) { np.push(p[2]); }
            if (doX) { np[0] = comp.width / 2 - c[0]; }
            if (doY) { np[1] = comp.height / 2 - c[1]; }
            H.setPos(L, np, t);
        });
    };

    F.flexTypeResetAnchor = function () {
        return typeRun("Reset Text Anchor", function (L, comp, t) {
            var doc = docOf(L).value, r = H.sourceRect(L, t); if (!r) { return false; }
            var na;
            if (doc.boxText) { na = [edgeX(r, justName(doc.justification)), r.top]; }
            else { na = [0, 0]; } // point text: the alignment point on the first baseline
            moveAnchorKeep(L, na, t);
        });
    };
})();
