// Sougetsu Akira FX - Highlighter engine (clean-room, own design). Contract read from client/index.html (#highlighter-modal):
//   $._flex.highlighterVersion (number, panel requires >= 7)
//   $._flexHL.list()               -> "OK:" + rows "id\tname" joined by "\n" (empty after "OK:" = none) / "ERR:NO_COMP"
//   $._flexHL.create(opts)         -> "OK:<count>:<id>"   opts "style=box|underline|strike;colorMode=both|fill|stroke|none;
//                                     fill=#hex;stroke=#hex;dot=#hex;strokeW;round;padX;padY;multiply;cursor;dir;perLayer"
//   $._flexHL.apply(opts)          -> "OK:1" / "ERR:NO_SUCH_RIG"  (id + live style fields)
//   $._flexHL.animate("id=;dur=;from=0..8") -> "OK:1"    from = 3x3 grid cell the box grows out of (4 = centre)
//   $._flexHL.remove("id=") / $._flexHL.toEGP("id=") -> "OK:<count>"
// A rig is one shape layer behind the selected text layer(s). Its box follows the text bounds by expression, and every
// style value lives on its own effect controls so apply/animate only change controls.
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }
    F.highlighterVersion = 7;
    var HL = $._flexHL = {};
    var TAG = "AKIRA_HL|";

    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
    function parse(s) {
        var out = {}, parts = String(s || "").split(";"), i;
        for (i = 0; i < parts.length; i += 1) { var k = parts[i].indexOf("="); if (k > 0) { out[parts[i].substring(0, k)] = parts[i].substring(k + 1); } }
        return out;
    }
    function hex(h, d) {
        var v = String(h || "").replace("#", ""), n = parseInt(v, 16);
        if (isNaN(n) || v.length !== 6) { return d; }
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function bool(v) { return String(v) === "true" || String(v) === "1"; }
    function rigs(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) { var c = String(comp.layer(i).comment || ""); if (c.indexOf(TAG) === 0) { out.push({ layer: comp.layer(i), id: c.split("|")[1] }); } }
        return out;
    }
    function rigById(comp, id) { var r = rigs(comp), i; for (i = 0; i < r.length; i += 1) { if (r[i].id === String(id)) { return r[i].layer; } } return null; }
    function fx(L, name) { return L.property("ADBE Effect Parade").property(name).property(1); }
    function add(L, mn, name, v) { var e = L.property("ADBE Effect Parade").addProperty(mn); e.name = name; e.property(1).setValue(v); return e; }
    function setStyle(L, o) {
        if (o.fill !== undefined) { fx(L, "Fill Color").setValue(hex(o.fill, [0, 1, 0.33])); }
        if (o.stroke !== undefined) { fx(L, "Stroke Color").setValue(hex(o.stroke, [0, 0.7, 0.24])); }
        if (o.dot !== undefined) { fx(L, "Dot Color").setValue(hex(o.dot, [0, 1, 0.33])); }
        if (o.strokeW !== undefined) { fx(L, "Stroke Width").setValue(num(o.strokeW, 2)); }
        if (o.round !== undefined) { fx(L, "Roundness").setValue(num(o.round, 5)); }
        if (o.padX !== undefined) { fx(L, "Pad X").setValue(num(o.padX, 10)); }
        if (o.padY !== undefined) { fx(L, "Pad Y").setValue(num(o.padY, 6)); }
        if (o.multiply !== undefined) { L.blendingMode = bool(o.multiply) ? BlendingMode.MULTIPLY : BlendingMode.NORMAL; }
    }
    // Box rect in comp space: union of target text bounds + padding, cut to underline/strike band, grown by Reveal from cell From.
    function rectExpr(names, style) {
        return "const N=[" + names.join(",") + "];\nlet l=1e9,t=1e9,r=-1e9,b=-1e9;\n" +
            "for(const n of N){try{const L=thisComp.layer(n),s=L.sourceRectAtTime(time,false);\n" +
            "  for(const q of [[s.left,s.top],[s.left+s.width,s.top+s.height],[s.left,s.top+s.height],[s.left+s.width,s.top]]){const p=L.toComp(q);l=Math.min(l,p[0]);r=Math.max(r,p[0]);t=Math.min(t,p[1]);b=Math.max(b,p[1]);}}catch(e){}}\n" +
            "if(l>r){l=r=t=b=0;}\nconst px=effect(\"Pad X\")(1),py=effect(\"Pad Y\")(1);l-=px;r+=px;t-=py;b+=py;\n" +
            (style === "underline" ? "t=b-Math.max(4,(b-t)*0.18);\n" : style === "strike" ? "{const m=(t+b)/2,h=Math.max(4,(b-t)*0.16);t=m-h/2;b=m+h/2;}\n" : "") +
            "const rv=clamp(effect(\"Reveal\")(1),0,100)/100, f=Math.round(effect(\"From\")(1)), col=f%3, row=Math.floor(f/3);\n" +
            "const gx=(col!==1||f===4)?rv:1, gy=(row!==1||f===4)?rv:1;\n" +
            "const ax=col===0?l:col===2?r:(l+r)/2, ay=row===0?t:row===2?b:(t+b)/2;\n" +
            "const L2=ax+(l-ax)*gx, R2=ax+(r-ax)*gx, T2=ay+(t-ay)*gy, B2=ay+(b-ay)*gy;\n";
    }
    function build(comp, targets, o, id) {
        var names = [], i, top = targets[0];
        for (i = 0; i < targets.length; i += 1) { names.push('"' + esc(targets[i].name) + '"'); if (targets[i].index < top.index) { top = targets[i]; } }
        var style = o.style || "box", mode = o.colorMode || "both";
        var L = comp.layers.addShape(); L.name = "Highlighter · " + targets[0].name + (targets.length > 1 ? " +" + (targets.length - 1) : "");
        L.comment = TAG + id + "|" + style;
        var bottom = targets[0]; for (i = 0; i < targets.length; i += 1) { if (targets[i].index > bottom.index) { bottom = targets[i]; } }
        L.moveAfter(bottom);
        add(L, "ADBE Color Control", "Fill Color", [0, 1, 0.33]); add(L, "ADBE Color Control", "Stroke Color", [0, 0.7, 0.24]);
        add(L, "ADBE Color Control", "Dot Color", [0, 1, 0.33]);
        add(L, "ADBE Slider Control", "Stroke Width", 2); add(L, "ADBE Slider Control", "Roundness", 5);
        add(L, "ADBE Slider Control", "Pad X", 10); add(L, "ADBE Slider Control", "Pad Y", 6);
        add(L, "ADBE Slider Control", "Reveal", 100); add(L, "ADBE Slider Control", "From", 3);
        add(L, "ADBE Checkbox Control", "Fill On", mode === "both" || mode === "fill" ? 1 : 0);
        add(L, "ADBE Checkbox Control", "Stroke On", mode === "both" || mode === "stroke" ? 1 : 0);
        add(L, "ADBE Checkbox Control", "Cursor", o.cursor === undefined || bool(o.cursor) ? 1 : 0);
        setStyle(L, o);
        L.transform.anchorPoint.setValue([0, 0]); L.transform.position.setValue([0, 0]);
        var pre = rectExpr(names, style), root = L.property("ADBE Root Vectors Group");
        var box = root.addProperty("ADBE Vector Group"); box.name = "Box";
        var bc = box.property("ADBE Vectors Group"), rc = bc.addProperty("ADBE Vector Shape - Rect");
        rc.property("ADBE Vector Rect Size").expression = pre + "[Math.max(0,R2-L2),Math.max(0,B2-T2)]";
        rc.property("ADBE Vector Rect Position").expression = pre + "[(L2+R2)/2,(T2+B2)/2]";
        rc.property("ADBE Vector Rect Roundness").expression = "effect(\"Roundness\")(1)";
        var fl = bc.addProperty("ADBE Vector Graphic - Fill");
        fl.property("ADBE Vector Fill Color").expression = "effect(\"Fill Color\")(1)";
        fl.property("ADBE Vector Fill Opacity").expression = "effect(\"Fill On\")(1)>0?100:0";
        var st = bc.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").expression = "effect(\"Stroke Color\")(1)";
        st.property("ADBE Vector Stroke Width").expression = "effect(\"Stroke Width\")(1)";
        st.property("ADBE Vector Stroke Opacity").expression = "effect(\"Stroke On\")(1)>0?100:0";
        var cur = root.addProperty("ADBE Vector Group"); cur.name = "Cursor";
        var cc = cur.property("ADBE Vectors Group"), el = cc.addProperty("ADBE Vector Shape - Ellipse");
        el.property("ADBE Vector Ellipse Size").expression = pre + "const d=Math.max(6,(B2-T2)*0.35);[d,d]";
        el.property("ADBE Vector Ellipse Position").expression = pre + "col===0?[R2,(T2+B2)/2]:col===2?[L2,(T2+B2)/2]:row===0?[(L2+R2)/2,B2]:[(L2+R2)/2,T2]";
        var df = cc.addProperty("ADBE Vector Graphic - Fill");
        df.property("ADBE Vector Fill Color").expression = "effect(\"Dot Color\")(1)";
        cur.property("ADBE Vector Transform Group").property("ADBE Vector Group Opacity").expression =
            "const v=effect(\"Reveal\")(1);(effect(\"Cursor\")(1)>0&&v>0&&v<100)?100:0";
        return L;
    }

    function run(title, fn) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:NO_COMP"; }
        app.beginUndoGroup(title);
        var r;
        try { r = fn(comp); } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return r;
    }

    HL.list = function () {
        var comp = H.activeComp(); if (!comp) { return "ERR:NO_COMP"; }
        var r = rigs(comp), rows = [], i;
        for (i = 0; i < r.length; i += 1) { rows.push(r[i].id + "\t" + r[i].layer.name); }
        return "OK:" + rows.join("\n");
    };
    HL.create = function (args) {
        var o = parse(args);
        return run("Create Highlighter", function (comp) {
            var sel = H.selectedLayers(comp), targets = [], i;
            for (i = 0; i < sel.length; i += 1) { if (String(sel[i].comment || "").indexOf(TAG) !== 0 && !H.isCamOrLight(sel[i])) { targets.push(sel[i]); } }
            if (!targets.length) { return "ERR:Select the text layer(s) to highlight."; }
            var base = "hl" + (new Date().getTime() % 10000000), made = 0, lastId = "";
            if (bool(o.perLayer)) {
                for (i = 0; i < targets.length; i += 1) { lastId = base + "_" + i; build(comp, [targets[i]], o, lastId); made += 1; }
            } else { lastId = base; build(comp, targets, o, lastId); made = 1; }
            return "OK:" + made + ":" + lastId;
        });
    };
    HL.apply = function (args) {
        var o = parse(args);
        return run("Highlighter Style", function (comp) {
            var L = rigById(comp, o.id); if (!L) { return "ERR:NO_SUCH_RIG"; }
            setStyle(L, o);
            return "OK:1";
        });
    };
    HL.animate = function (args) {
        var o = parse(args);
        return run("Animate Highlighter", function (comp) {
            var L = rigById(comp, o.id); if (!L) { return "ERR:NO_SUCH_RIG"; }
            var rv = fx(L, "Reveal"), t = comp.time, d = Math.max(comp.frameDuration, num(o.dur, 0.6)), k;
            fx(L, "From").setValue(Math.max(0, Math.min(8, Math.round(num(o.from, 3)))));
            while (rv.numKeys) { rv.removeKey(rv.numKeys); }
            rv.setValueAtTime(t, 0); rv.setValueAtTime(t + d, 100);
            for (k = 1; k <= 2; k += 1) { try { rv.setTemporalEaseAtKey(k, [new KeyframeEase(0, 75)], [new KeyframeEase(0, 75)]); } catch (e) { } }
            return "OK:1";
        });
    };
    HL.remove = function (args) {
        var o = parse(args);
        return run("Delete Highlighter", function (comp) {
            var L = rigById(comp, o.id); if (!L) { return "ERR:NO_SUCH_RIG"; }
            L.remove();
            return "OK:1";
        });
    };
    HL.toEGP = function (args) {
        var o = parse(args);
        return run("Highlighter to Essential Graphics", function (comp) {
            var L = rigById(comp, o.id); if (!L) { return "ERR:NO_SUCH_RIG"; }
            var fxg = L.property("ADBE Effect Parade"), i, n = 0;
            try { if (!comp.motionGraphicsTemplateName) { comp.motionGraphicsTemplateName = comp.name; } } catch (e0) { }
            for (i = 1; i <= fxg.numProperties; i += 1) {
                try { if (fxg.property(i).property(1).addToMotionGraphicsTemplate(comp)) { n += 1; } } catch (e) { }
            }
            return n ? "OK:" + n : "ERR:This After Effects version can't add these controls to Essential Graphics.";
        });
    };
})();
