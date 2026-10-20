// Sowveil - shared host helpers, selection info and the one-click Remove.
// ExtendScript is ES3: no let/const, arrow functions, JSON, Array.indexOf/forEach/map, String.trim.
// Public functions take one object argument and return a JSON string {"ok":true,...} / {"ok":false,"error":"..."}.
// Sowveil tags what it creates so Remove can find it: text animators and effects named "Sowveil · ...",
// layers whose comment contains "sowveil", and expressions containing "// sowveil".
if (typeof $._sv === "undefined") { $._sv = {}; }

(function () {
    var SV = $._sv, U = SV._u = {};
    U.TAG = "Sowveil";
    U.MARK = "// sowveil";

    U.J = function J(v) {
        var t = typeof v, i, out, k;
        if (v === null || v === undefined) { return "null"; }
        if (t === "number") { return isFinite(v) ? String(v) : "null"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"'; }
        if (v instanceof Array) { out = []; for (i = 0; i < v.length; i += 1) { out.push(J(v[i])); } return "[" + out.join(",") + "]"; }
        out = [];
        for (k in v) { if (v.hasOwnProperty(k)) { out.push(J(String(k)) + ":" + J(v[k])); } }
        return "{" + out.join(",") + "}";
    };
    U.ok = function (extra) { var o = { ok: true }, k; if (extra) { for (k in extra) { if (extra.hasOwnProperty(k)) { o[k] = extra[k]; } } } return U.J(o); };
    U.fail = function (msg) { return U.J({ ok: false, error: String(msg) }); };
    U.num = function (v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; };
    U.str = function (v, d) { return (v === undefined || v === null) ? d : String(v); };
    U.bool = function (v, d) { if (v === undefined || v === null) { return d; } return v === true || v === "true" || v === 1; };
    U.hex = function (c, d) {
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(U.str(c, ""));
        return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : (d || [1, 1, 1]);
    };
    U.comp = function () { var c = app.project.activeItem; return (c && c instanceof CompItem) ? c : null; };
    U.selected = function (comp) { var s = comp.selectedLayers, out = [], i; for (i = 0; i < s.length; i += 1) { out.push(s[i]); } return out; };
    U.plain = function (f) { return f.fsName.replace(/\\/g, "/"); };
    U.safeName = function (s) { return String(s).replace(/[\\\/:*?"<>|]/g, "_").replace(/^\s+|\s+$/g, "").replace(/^\.+/, ""); };
    U.readText = function (f) { f.encoding = "UTF-8"; if (!f.exists || !f.open("r")) { return ""; } var s = f.read(); f.close(); return s; };
    U.writeText = function (f, s) { f.encoding = "UTF-8"; if (f.open("w")) { f.write(s); f.close(); return true; } return false; };
    U.rmrf = function rmrf(folder) {
        var items = folder.getFiles(), i;
        for (i = 0; i < items.length; i += 1) { if (items[i] instanceof Folder) { rmrf(items[i]); } else { try { items[i].remove(); } catch (e) { } } }
        try { folder.remove(); } catch (e2) { }
    };
    U.dataFolder = function () { var f = new Folder(Folder.userData.fullName + "/Sowveil"); if (!f.exists) { f.create(); } return f; };
    U.walk = function walk(group, fn) {
        var i, p;
        for (i = 1; i <= group.numProperties; i += 1) { p = group.property(i); if (p.propertyType === PropertyType.PROPERTY) { fn(p); } else { walk(p, fn); } }
    };
    U.ease = function (prop, keyIdx, influence) {
        try {
            var dims = 1, v = prop.keyValue(keyIdx), e, arr = [], i;
            if (v instanceof Array) { dims = v.length; }
            if (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) { dims = 1; }
            e = new KeyframeEase(0, Math.max(0.1, Math.min(100, influence)));
            for (i = 0; i < dims; i += 1) { arr.push(e); }
            prop.setTemporalEaseAtKey(keyIdx, arr, arr);
        } catch (err) { }
    };
    U.key2 = function (prop, t0, v0, t1, v1, influence) {
        prop.setValueAtTime(t0, v0); prop.setValueAtTime(t1, v1);
        if (influence !== undefined) { U.ease(prop, prop.nearestKeyIndex(t0), influence); U.ease(prop, prop.nearestKeyIndex(t1), influence); }
    };
    U.uniqueName = function (comp, base) {
        var name = base, n = 2, i, taken;
        while (true) {
            taken = false;
            for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === name) { taken = true; break; } }
            if (!taken) { return name; }
            name = base + " " + n; n += 1;
        }
    };
    U.tag = function (L) { try { L.comment = (L.comment ? L.comment + " " : "") + "sowveil"; } catch (e) { } };
    U.isTagged = function (L) { try { return /(^|\s)sowveil(\s|$)/.test(L.comment); } catch (e) { return false; } };
    U.fx = function (L) { return L.property("ADBE Effect Parade"); };
    U.control = function (L, matchName, name, value) {
        var e = U.fx(L).addProperty(matchName); e.name = name;
        if (value !== undefined) { e.property(1).setValue(value); }
        return e;
    };
    U.run = function (title, fn) {
        app.beginUndoGroup(title);
        var r;
        try { r = fn(); } catch (e) { app.endUndoGroup(); return U.fail(e.toString()); }
        app.endUndoGroup();
        return r;
    };

    // ---------- selection info for the status bar ----------
    function hasSowveil(L) {
        if (U.isTagged(L)) { return true; }
        var found = false, i;
        try {
            var an = L.property("ADBE Text Properties").property("ADBE Text Animators");
            for (i = 1; i <= an.numProperties; i += 1) { if (an.property(i).name.indexOf(U.TAG) === 0) { return true; } }
        } catch (e) { }
        try { var fx = U.fx(L); for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).name.indexOf(U.TAG) === 0) { return true; } } } catch (e2) { }
        try { U.walk(L, function (p) { if (!found && p.canSetExpression && p.expression && p.expression.indexOf(U.MARK) !== -1) { found = true; } }); } catch (e3) { }
        return found;
    }
    SV.selInfo = function () {
        var c = U.comp();
        if (!c) { return U.ok({ comp: false, layers: 0, props: 0, keys: 0, hasSv: false }); }
        var ls = c.selectedLayers, ps = c.selectedProperties, keys = 0, props = 0, i, has = false;
        for (i = 0; i < ps.length; i += 1) {
            if (ps[i].propertyType === PropertyType.PROPERTY) { props += 1; try { keys += ps[i].selectedKeys.length; } catch (e) { } }
        }
        for (i = 0; i < ls.length && i < 12; i += 1) { if (hasSowveil(ls[i])) { has = true; break; } }
        return U.ok({ comp: true, compName: c.name, layers: ls.length, props: props, keys: keys, hasSv: has });
    };

    // ---------- one-click Remove: strips everything Sowveil added to the selected layers ----------
    function clearExpr(L) {
        var n = 0;
        U.walk(L, function (p) { try { if (p.canSetExpression && p.expression && p.expression.indexOf(U.MARK) !== -1) { p.expression = ""; n += 1; } } catch (e) { } });
        return n;
    }
    SV.removeSowveil = function () {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var ls = U.selected(c); if (!ls.length) { return U.fail("Select the layer(s) to clean."); }
        var st = { animators: 0, effects: 0, expressions: 0, layers: 0 };
        return U.run("Remove Sowveil", function () {
            var rigs = [], i, j, L;
            for (i = 0; i < ls.length; i += 1) {
                L = ls[i];
                if (U.isTagged(L) && !(L instanceof TextLayer)) { rigs.push(L); continue; }
                try {
                    var an = L.property("ADBE Text Properties").property("ADBE Text Animators");
                    for (j = an.numProperties; j >= 1; j -= 1) { if (an.property(j).name.indexOf(U.TAG) === 0) { an.property(j).remove(); st.animators += 1; } }
                } catch (e) { }
                try { var fx = U.fx(L); for (j = fx.numProperties; j >= 1; j -= 1) { if (fx.property(j).name.indexOf(U.TAG) === 0) { fx.property(j).remove(); st.effects += 1; } } } catch (e2) { }
                st.expressions += clearExpr(L);
                try { if (L.parent && U.isTagged(L.parent)) { L.parent = null; } } catch (e3) { }
                try { L.comment = String(L.comment).replace(/\s*\bsowveil\b/g, ""); } catch (e4) { }
            }
            // controllers / backgrounds Sowveil created: release their children, then delete them
            for (i = 0; i < rigs.length; i += 1) {
                for (j = 1; j <= c.numLayers; j += 1) {
                    try { if (c.layer(j).parent === rigs[i]) { st.expressions += clearExpr(c.layer(j)); c.layer(j).parent = null; } } catch (e5) { }
                }
                rigs[i].remove(); st.layers += 1;
            }
            return U.ok({ message: "Sowveil removed.", stats: st });
        });
    };

    // ---------- small utilities the panel needs ----------
    SV.ping = function () { return U.ok({ version: app.version }); };
    SV.pickFolder = function (a) {
        var f = Folder.selectDialog(U.str(a && a.prompt, "Choose a folder"));
        return f ? U.ok({ path: U.plain(f) }) : U.fail("cancelled");
    };
})();
