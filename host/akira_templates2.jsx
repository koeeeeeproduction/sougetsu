// Sougetsu Akira FX - Templates 2.0 builder (own design). Contract read from client/js_akira/akira_templates2.js:
//   $._akiraT2.kernelVersion >= 1
//   $._akiraT2.build("id", enc(JSON data)) -> "SUCCESS:msg" / "ERR:msg"
// data.__ops is the template's finished frame recorded by client/js_akira/akira_t2_record.js (comp pixels):
//   rect/ellipse -> native shapes, path -> bezier shapes, text -> editable text layers.
// Every op carries its entrance group (g = order, pv = pivot); a "Template Controls" null drives the entrance
// with the same maths as the panel preview, so motion settings stay editable in AE.
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }
    var CTRL = "Template Controls";
    var STYLES = { none: 0, pop: 1, scale: 2, slideUp: 3, slideDown: 4, slideLeft: 5, slideRight: 6, fade: 7 };
    var FONTS = {
        sans: { regular: ["Inter-Regular", "ArialMT"], medium: ["Inter-Medium", "Arial-BoldMT"], semibold: ["Inter-SemiBold", "Arial-BoldMT"], bold: ["Inter-Bold", "Arial-BoldMT"] },
        serif: { regular: ["Georgia", "TimesNewRomanPSMT"], bold: ["Georgia-Bold", "TimesNewRomanPS-BoldMT"] },
        mono: { regular: ["Menlo-Regular", "CourierNewPSMT"], bold: ["Menlo-Bold", "CourierNewPS-BoldMT"] }
    };

    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function col(c) { return (c && c.length >= 3) ? [num(c[0], 1), num(c[1], 1), num(c[2], 1), 1] : [1, 1, 1, 1]; }
    function clamp100(v) { return Math.max(0, Math.min(100, v)); }

    function fontExists(ps) {
        try { if (app.fonts && app.fonts.getFontsByPostScriptName) { return app.fonts.getFontsByPostScriptName(ps).length > 0; } } catch (e) { }
        return null; // unknown (older AE)
    }
    function pickFont(role, weight) {
        var fam = FONTS[role] || FONTS.sans, list = fam[weight] || fam[(weight === "medium" || weight === "semibold") ? "bold" : "regular"] || fam.regular, i;
        for (i = 0; i < list.length; i += 1) { if (fontExists(list[i]) !== false) { return list[i]; } }
        return list[list.length - 1];
    }

    // ---------- entrance expressions (same maths as AkiraT2Preview.enter) ----------
    function pre(order) {
        return "var c=thisComp.layer(\"" + CTRL + "\"),o=" + order + ";\n" +
            "var st=Math.round(c.effect(\"Style\")(1)),on=c.effect(\"Animate\")(1)>0;\n" +
            "var p=on?Math.max(0,Math.min(1,(time-inPoint-(c.effect(\"Start\")(1)+o*c.effect(\"Stagger\")(1)))/Math.max(0.05,c.effect(\"Duration\")(1)))):1;\n" +
            "var os=Math.max(0,c.effect(\"Overshoot\")(1))/100*1.70158*10/8;\n" +
            "var e=p>=1?1:1+(os+1)*Math.pow(p-1,3)+os*Math.pow(p-1,2),ef=1-Math.pow(1-p,3),d=c.effect(\"Distance\")(1);\n";
    }
    function exprScale(order) { return pre(order) + "var s=1;if(st==1)s=Math.max(0,e);if(st==2)s=0.6+0.4*ef;mul(value,s);"; }
    function exprPos(order) {
        return pre(order) + "var dx=0,dy=0;if(st==3)dy=d*(1-ef);if(st==4)dy=-d*(1-ef);if(st==5)dx=d*(1-ef);if(st==6)dx=-d*(1-ef);add(value,[dx,dy]);";
    }
    function exprOpacity(order) { return pre(order) + "var a=Math.min(1,p*(st==0?1000:1.6));if(st==1&&e<=0)a=0;value*a;"; }

    function animate(L, order, pivot, localPivot) {
        var tr = L.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue(localPivot);
        tr.property("ADBE Position").setValue(pivot);
        if (order < 0) { return; }
        tr.property("ADBE Scale").expression = exprScale(order);
        tr.property("ADBE Position").expression = exprPos(order);
        tr.property("ADBE Opacity").expression = exprOpacity(order);
    }

    // ---------- shape ops ----------
    function addPaint(contents, op) {
        if (op.f) {
            var fl = contents.addProperty("ADBE Vector Graphic - Fill");
            fl.property("ADBE Vector Fill Color").setValue(col(op.f));
            fl.property("ADBE Vector Fill Opacity").setValue(clamp100(num(op.fa, 1) * 100));
            if (op.eo) { try { fl.property("ADBE Vector Fill Rule").setValue(2); } catch (e) { } }
        }
        if (op.s) {
            var sk = contents.addProperty("ADBE Vector Graphic - Stroke");
            sk.property("ADBE Vector Stroke Color").setValue(col(op.s));
            sk.property("ADBE Vector Stroke Width").setValue(Math.max(0.1, num(op.sw, 2)));
            sk.property("ADBE Vector Stroke Opacity").setValue(clamp100(num(op.sa, 1) * 100));
            try { sk.property("ADBE Vector Stroke Line Cap").setValue(2); sk.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e2) { }
        }
    }
    function addShapeOp(root, op, idx) {
        var grp = root.addProperty("ADBE Vector Group"), ct = grp.property("ADBE Vectors Group"), gt = grp.property("ADBE Vector Transform Group"), i;
        grp.name = (op.t === "path" ? "Path " : (op.t === "rect" ? "Box " : "Ellipse ")) + idx;
        if (op.t === "rect" || op.t === "ellipse") {
            var sh = ct.addProperty(op.t === "rect" ? "ADBE Vector Shape - Rect" : "ADBE Vector Shape - Ellipse");
            sh.property(op.t === "rect" ? "ADBE Vector Rect Size" : "ADBE Vector Ellipse Size").setValue([Math.max(0.1, num(op.w, 1)), Math.max(0.1, num(op.h, 1))]);
            if (op.t === "rect" && op.r) { sh.property("ADBE Vector Rect Roundness").setValue(num(op.r, 0)); }
            gt.property("ADBE Vector Position").setValue([num(op.x, 0), num(op.y, 0)]);
            if (op.rot) { gt.property("ADBE Vector Rotation").setValue(num(op.rot, 0)); }
        } else {
            for (i = 0; i < op.subs.length; i += 1) {
                var sb = op.subs[i], pp = ct.addProperty("ADBE Vector Shape - Group"), s = new Shape();
                s.vertices = sb.v; s.inTangents = sb.i; s.outTangents = sb.o; s.closed = !!sb.c || !!op.f;
                pp.property("ADBE Vector Shape").setValue(s);
            }
        }
        addPaint(ct, op);
        if (num(op.a, 1) < 1) { gt.property("ADBE Vector Group Opacity").setValue(clamp100(num(op.a, 1) * 100)); }
    }
    function addShadow(L, sh) {
        try {
            var fx = L.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow"), x = num(sh.x, 0), y = num(sh.y, 0);
            fx.property("ADBE Drop Shadow-0001").setValue(col(sh.c));
            fx.property("ADBE Drop Shadow-0002").setValue(Math.max(0, Math.min(255, num(sh.a, 0.5) * 255)));
            fx.property("ADBE Drop Shadow-0003").setValue((x || y) ? Math.atan2(x, -y) * 180 / Math.PI : 180);
            fx.property("ADBE Drop Shadow-0004").setValue(Math.sqrt(x * x + y * y));
            fx.property("ADBE Drop Shadow-0005").setValue(Math.max(0, num(sh.blur, 0)));
        } catch (e) { }
    }
    function shKey(op) { return op.sh ? [op.sh.c, op.sh.a, op.sh.blur, op.sh.x, op.sh.y].toString() : ""; }

    function buildShapeLayer(comp, run, name, W, Hh) {
        var L = comp.layers.addShape(), root = L.property("ADBE Root Vectors Group"), i, op0 = run[0];
        L.name = name;
        // later ops draw on top: in AE the first group in Contents is the front one
        for (i = run.length - 1; i >= 0; i -= 1) { addShapeOp(root, run[i], i + 1); }
        var pv = (op0.g >= 0 && op0.pv) ? op0.pv : [W / 2, Hh / 2];
        animate(L, op0.g, pv, pv);
        if (op0.sh) { addShadow(L, op0.sh); }
        return L;
    }
    function buildTextLayer(comp, op, idx) {
        var lines = op.lines || [""], L = comp.layers.addText(lines.join("\r")), src = L.property("ADBE Text Properties").property("ADBE Text Document"), td = src.value;
        L.name = String(lines[0] || ("Text " + idx)).substring(0, 40) || ("Text " + idx);
        td.resetCharStyle && td.resetCharStyle();
        td.fontSize = Math.max(1, num(op.size, 24));
        td.applyFill = true; td.fillColor = [num(op.c[0], 1), num(op.c[1], 1), num(op.c[2], 1)];
        td.applyStroke = false;
        try { td.font = pickFont(op.role === "mono" || op.role === "serif" ? op.role : "sans", String(op.w || "regular")); } catch (e) { }
        td.justification = op.align === "center" ? ParagraphJustification.CENTER_JUSTIFY : (op.align === "right" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY);
        try { td.tracking = 0; } catch (e1) { }
        if (lines.length > 1) { try { td.autoLeading = false; td.leading = Math.max(1, num(op.lead, td.fontSize * 1.2)); } catch (e2) { } }
        src.setValue(td);
        var x = num(op.x, 0), y = num(op.y, 0), rot = num(op.rot, 0), pv = (op.g >= 0 && op.pv) ? op.pv : [x, y];
        // anchor in layer space = inverse-rotated offset from the text origin to the pivot
        var dx = pv[0] - x, dy = pv[1] - y, rr = -rot * Math.PI / 180, ax = dx * Math.cos(rr) - dy * Math.sin(rr), ay = dx * Math.sin(rr) + dy * Math.cos(rr);
        if (rot) { L.property("ADBE Transform Group").property("ADBE Rotate Z").setValue(rot); }
        animate(L, op.g, pv, [ax, ay]);
        if (num(op.a, 1) < 1) { L.property("ADBE Transform Group").property("ADBE Opacity").setValue(clamp100(num(op.a, 1) * 100)); }
        if (op.sh) { addShadow(L, op.sh); }
        return L;
    }

    function addControls(comp, m) {
        var L = comp.layers.addNull(), fx = L.property("ADBE Effect Parade");
        L.name = CTRL; L.enabled = false; L.label = 9;
        function sl(name, v) { var e = fx.addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); }
        var cb = fx.addProperty("ADBE Checkbox Control"); cb.name = "Animate"; cb.property(1).setValue(m.enabled === false ? 0 : 1);
        sl("Style", STYLES.hasOwnProperty(m.style) ? STYLES[m.style] : 7);
        sl("Start", num(m.start, 0.2)); sl("Stagger", num(m.stagger, 0.12)); sl("Duration", Math.max(0.05, num(m.duration, 0.5)));
        sl("Overshoot", Math.max(0, num(m.overshoot, 8))); sl("Distance", num(m.distance, 40));
        L.comment = "Style: 0 none, 1 pop, 2 scale, 3 slide up, 4 slide down, 5 slide left, 6 slide right, 7 fade";
        return L;
    }

    function build(id, enc) {
        var g = H.locked(); if (g) { return g; }
        var data;
        try { data = H.parseJSON(decodeURIComponent(String(enc || ""))); } catch (e) { return "ERR:Could not read the template data."; }
        if (!data || !data.__ops || !data.__ops.length) { return "ERR:Nothing to build. Update Sougetsu Akira FX and try again."; }
        if (!app.project) { return "ERR:Open a project first."; }
        var ops = data.__ops, size = data.__size || [1080, 1080], W = Math.max(16, Math.round(num(size[0], 1080))), Hh = Math.max(16, Math.round(num(size[1], 1080)));
        var title = String(data.__title || id || "Template"), host = H.activeComp(), fps = host ? host.frameRate : 30;
        var dur = Math.max(3, Math.min(600, num(data.__dur, 5)));
        app.beginUndoGroup("Akira Template: " + title);
        try {
            var comp = app.project.items.addComp(title, W, Hh, 1, dur, fps), i = 0, n = 0, motion = data.motion || {};
            comp.comment = "AKIRA_T2|" + id;
            while (i < ops.length) {
                var op = ops[i];
                if (op.t === "text") { buildTextLayer(comp, op, ++n); i += 1; continue; }
                var run = [op], k = shKey(op);
                while (i + run.length < ops.length) {
                    var nx = ops[i + run.length];
                    if (nx.t === "text" || nx.g !== op.g || shKey(nx) !== k) { break; }
                    if (op.g >= 0 && nx.pv && op.pv && (nx.pv[0] !== op.pv[0] || nx.pv[1] !== op.pv[1])) { break; }
                    run.push(nx);
                }
                buildShapeLayer(comp, run, op.g < 0 ? "Background " + (++n) : "Element " + (++n), W, Hh);
                i += run.length;
            }
            addControls(comp, motion);
            if (host && host !== comp) {
                var lay = host.layers.add(comp);
                lay.startTime = host.time;
                var s = Math.min(100, Math.min(host.width / W, host.height / Hh) * 100);
                if (s < 100) { lay.property("ADBE Transform Group").property("ADBE Scale").setValue([s, s]); }
            } else {
                comp.openInViewer();
            }
            app.endUndoGroup();
            return "SUCCESS:" + title + " built" + (host ? " in " + host.name : "") + ".";
        } catch (err) {
            app.endUndoGroup();
            return "ERR:" + title + " failed: " + (err && err.message ? err.message : err);
        }
    }

    $._akiraT2 = { kernelVersion: 1, version: "1.0.0", build: build };
})();
