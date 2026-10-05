// Sougetsu Akira FX - Motion Showcase engine (clean-room, own design). Contract read from client/js_flex/motion_showcase.js:
//   $.global._flexMotionShowcaseHostVersion = "1.0.1"
//   getMotionShowcaseSelection_FlexGUI(enc(""))  -> "index|encName\n..." (visual layers, max 20) / "ERR:"
//   buildMotionShowcase_FlexGUI(enc(cfg))        -> "SUCCESS:msg" / "ERR:"
//   updateMotionShowcase_FlexGUI(enc(cfg))       -> "SUCCESS:msg" / "ERR:"   (live: only touches controls)
//   queueMotionShowcase_FlexGUI(enc(""))         -> "SUCCESS:msg" / "ERR:"
//   cfg = "template|ratio|duration|radius%|cardScale%|vertical%|perspective%|pulse%|corner px|#bg|motionBlur 1/0|faceCamera 1/0|i,j,k"
//   template orbit (3D ring) | helix (spiral) | depth (camera-space flow). All layouts are expressions on a
//   "Showcase Control" null, so a live update just sets its sliders.
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var G = $.global, F = $._flex, H = F._h;
    if (!H) { return; }
    G._flexMotionShowcaseHostVersion = "1.0.1";
    var TAG = "AKIRA_SHOWCASE|", CTRL = "Showcase Control";
    var SIZES = { "16:9": [1920, 1080], "4:3": [1440, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] };

    function dec(s) { try { return decodeURIComponent(String(s || "")); } catch (e) { return String(s || ""); } }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function hex(h) { var v = String(h || "").replace("#", ""), n = parseInt(v, 16); if (isNaN(n) || v.length !== 6) { return [0.03, 0.03, 0.03]; } return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
    function cfg(s) {
        var p = dec(s).split("|"), idx = [], parts = String(p[12] || "").split(","), i;
        for (i = 0; i < parts.length; i += 1) { var n = parseInt(parts[i], 10); if (!isNaN(n)) { idx.push(n); } }
        return { template: p[0] || "orbit", ratio: p[1] || "1:1", duration: Math.max(1, num(p[2], 15)), radius: num(p[3], 58), cardScale: num(p[4], 70),
            vertical: num(p[5], 10), perspective: num(p[6], 55), pulse: num(p[7], 4), corner: num(p[8], 36), bg: p[9] || "#080808",
            motionBlur: p[10] === "1", faceCamera: p[11] === "1", indices: idx };
    }
    function isVisual(L) { try { return !H.isCamOrLight(L) && !L.nullLayer && !L.adjustmentLayer && L.hasVideo !== false; } catch (e) { return false; } }
    function showcaseComp() {
        var c = H.activeComp(), i, items = app.project.items, last = null;
        if (c && String(c.comment || "").indexOf(TAG) === 0) { return c; }
        for (i = 1; i <= items.length; i += 1) { if (items[i] instanceof CompItem && String(items[i].comment || "").indexOf(TAG) === 0) { last = items[i]; } }
        return last;
    }
    function slider(L, name, v) { var e = L.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); return e; }
    function ctrlOf(sc) { var i; for (i = 1; i <= sc.numLayers; i += 1) { if (sc.layer(i).name === CTRL) { return sc.layer(i); } } return null; }
    function setControls(sc, c) {
        var C = ctrlOf(sc); if (!C) { return false; }
        var fx = C.property("ADBE Effect Parade"), map = [["Radius", c.radius], ["Card Size", c.cardScale], ["Vertical", c.vertical], ["Perspective", c.perspective], ["Pulse", c.pulse], ["Loop", c.duration]], i;
        for (i = 0; i < map.length; i += 1) { fx.property(map[i][0]).property(1).setValue(map[i][1]); }
        fx.property("Face Camera").property(1).setValue(c.faceCamera ? 1 : 0);
        sc.motionBlur = c.motionBlur;
        for (i = 1; i <= sc.numLayers; i += 1) {
            var L = sc.layer(i), cm = String(L.comment || "");
            if (cm.indexOf("AKIRA_SHOWCASE_CARD") === 0) { L.motionBlur = c.motionBlur; }
            if (cm === "AKIRA_SHOWCASE_BG") { try { L.source.mainSource.color = hex(c.bg); } catch (e) { } }
        }
        try { if (sc.duration < c.duration) { sc.duration = c.duration; } } catch (e2) { }
        return true;
    }
    function roundedMask(L, w, h, r) {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        var k = r * 0.5523, sh = new Shape();
        sh.vertices = [[r, 0], [w - r, 0], [w, r], [w, h - r], [w - r, h], [r, h], [0, h - r], [0, r]];
        sh.inTangents = [[-k, 0], [0, 0], [0, -k], [0, 0], [k, 0], [0, 0], [0, k], [0, 0]];
        sh.outTangents = [[0, 0], [k, 0], [0, 0], [0, k], [0, 0], [-k, 0], [0, 0], [0, -k]];
        sh.closed = true;
        L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom").property("ADBE Mask Shape").setValue(sh);
    }
    function cardExpr(template, i, n) {
        return "// akira-showcase\nconst C=thisComp.layer(\"" + CTRL + "\"),g=k=>C.effect(k)(1);\n" +
            "const N=" + n + ",I=" + i + ",W=thisComp.width,H=thisComp.height,loop=Math.max(1,g(\"Loop\"));\n" +
            "const R=g(\"Radius\")/100*Math.min(W,H)*0.6, V=g(\"Vertical\")/100*H, ph=(time%loop)/loop;\n" +
            (template === "helix" ?
                "const a=(I/N+ph)*Math.PI*4, y=((I/N+ph)%1-0.5)*V*2;\n[W/2+Math.sin(a)*R, H/2+y, Math.cos(a)*R]"
                : template === "depth" ?
                    "const f=(I/N+ph)%1, z=linear(f,0,1,R*4,-R*1.2);\n[W/2+Math.sin(I*2.4)*R*0.35, H/2+Math.cos(I*1.7)*V, z]"
                    : "const a=(I/N+ph)*Math.PI*2;\n[W/2+Math.sin(a)*R, H/2+Math.sin(a*2+I)*V*0.5, -Math.cos(a)*R]");
    }
    function scaleExpr(i, base) {
        return "// akira-showcase\nconst C=thisComp.layer(\"" + CTRL + "\"),g=k=>C.effect(k)(1);\n" +
            "const s=" + base + "*g(\"Card Size\")/100*(1+g(\"Pulse\")/100*Math.sin(time*Math.PI*2/Math.max(1,g(\"Loop\"))*2+" + i + "));[s,s,s]";
    }
    function buildInto(sc, c, sources) {
        var W = sc.width, Hh = sc.height, i, cardW = Math.min(W, Hh) * 0.32;
        var bg = sc.layers.addSolid(hex(c.bg), "Showcase Background", W, Hh, 1, c.duration); bg.comment = "AKIRA_SHOWCASE_BG";
        var C = sc.layers.addNull(c.duration); C.name = CTRL;
        slider(C, "Radius", c.radius); slider(C, "Card Size", c.cardScale); slider(C, "Vertical", c.vertical);
        slider(C, "Perspective", c.perspective); slider(C, "Pulse", c.pulse); slider(C, "Loop", c.duration);
        var fc = C.property("ADBE Effect Parade").addProperty("ADBE Checkbox Control"); fc.name = "Face Camera"; fc.property(1).setValue(c.faceCamera ? 1 : 0);
        var cam = sc.layers.addCamera("Showcase Camera", [W / 2, Hh / 2]);
        cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").expression =
            "const p=thisComp.layer(\"" + CTRL + "\").effect(\"Perspective\")(1);thisComp.width*linear(p,10,100,3,0.9)";
        for (i = 0; i < sources.length; i += 1) {
            var it = sources[i], L = sc.layers.add(it, c.duration);
            L.name = "Card " + (i + 1) + " · " + it.name; L.comment = "AKIRA_SHOWCASE_CARD|" + i;
            L.threeDLayer = true; L.motionBlur = c.motionBlur;
            if (c.corner > 0) { roundedMask(L, it.width, it.height, c.corner * it.width / cardW); }
            L.transform.position.expression = cardExpr(c.template, i, sources.length);
            L.transform.scale.expression = scaleExpr(i, cardW / it.width * 100);
            L.transform.yRotation.expression = "// akira-showcase\nthisComp.layer(\"" + CTRL + "\").effect(\"Face Camera\")(1)>0?0:value+(time/Math.max(1,thisComp.layer(\"" + CTRL + "\").effect(\"Loop\")(1)))*360";
            if (c.faceCamera) { try { L.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST; } catch (eO) { } }
        }
        bg.moveToEnd();
        sc.motionBlur = c.motionBlur;
    }

    G.getMotionShowcaseSelection_FlexGUI = function () {
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition and select 2-20 visual layers."; }
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length && out.length < 20; i += 1) { if (isVisual(sel[i])) { out.push(sel[i].index + "|" + encodeURIComponent(sel[i].name)); } }
        return out.length ? out.join("\n") : "ERR:Select visual layers in the active composition.";
    };

    G.buildMotionShowcase_FlexGUI = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open the composition that holds your layers."; }
        var c = cfg(arg), sources = [], i;
        for (i = 0; i < c.indices.length; i += 1) {
            if (c.indices[i] < 1 || c.indices[i] > comp.numLayers) { continue; }
            var L = comp.layer(c.indices[i]);
            if (L.source && (L.source instanceof CompItem || L.source instanceof FootageItem)) { sources.push(L.source); }
            else if (typeof L.copyToComp === "function") { sources.push({ copy: L, name: L.name }); }
        }
        if (sources.length < 2) { return "ERR:Select at least two visual layers for a showcase."; }
        var size = SIZES[c.ratio] || SIZES["1:1"];
        app.beginUndoGroup("Build Motion Showcase");
        try {
            // text/shape layers have no source item: precompose a copy of each so it can be a card
            for (i = 0; i < sources.length; i += 1) {
                if (!sources[i].copy) { continue; }
                var pc = app.project.items.addComp(sources[i].name, comp.width, comp.height, comp.pixelAspect, c.duration, comp.frameRate);
                sources[i].copy.copyToComp(pc);
                sources[i] = pc;
            }
            var sc = app.project.items.addComp("Motion Showcase · " + c.template, size[0], size[1], 1, c.duration, comp.frameRate);
            sc.comment = TAG + c.template;
            buildInto(sc, c, sources);
            try { sc.openInViewer(); } catch (eV) { }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS:Built a " + sources.length + "-card " + c.template + " showcase (" + c.ratio + ", " + c.duration + "s loop).";
    };

    G.updateMotionShowcase_FlexGUI = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var sc = showcaseComp(); if (!sc) { return "ERR:No active Flex showcase."; }
        var c = cfg(arg);
        app.beginUndoGroup("Update Motion Showcase");
        try { if (!setControls(sc, c)) { app.endUndoGroup(); return "ERR:This showcase has no Showcase Control layer."; } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS:Showcase updated.";
    };

    G.queueMotionShowcase_FlexGUI = function () {
        var g = H.locked(); if (g) { return g; }
        var sc = showcaseComp(); if (!sc) { return "ERR:Build a showcase first."; }
        try { app.project.renderQueue.items.add(sc); } catch (e) { return "ERR:" + e.toString(); }
        return "SUCCESS:Added " + sc.name + " to the Render Queue.";
    };
})();
