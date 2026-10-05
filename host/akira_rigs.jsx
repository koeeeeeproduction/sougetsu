// Sougetsu Akira FX - shape rigs (clean-room, own design). Contracts read from client/index.html,
// js_flex/carousel_3d.js and js_flex/flex_saasfx.js:
//   createCarousel("format|faceCam|livePath|guideCircle|radius")     -> "SUCCESS" / "ERR:"
//        format auto|2d|3d|3d-sphere|2d-path|3d-path; livePath = a layer name or "none"
//   getCarouselDetails()  -> JSON {format,influence,radius,arc,startAngle,tiltX,tiltY,spacing,offset,rotation,orient,
//                                  reverseOrder,rSeed,faceCamera,guideCircle,livePath,rOffset,rRot,rOffsetX..Z,rRotX..Z} / "none"
//   updateCarouselControlRealTime(effectName, value) -> "OK" / "ERR:"   (no undo group: called while scrubbing)
//   syncCarousel() / pastePathToCarouselControl()   -> "SUCCESS" / "ERR:"
//   createOrbCloner("format|faceCam|livePath|guide|orbitRadius|count|effRadius|posY|scale|rotation|opacity") -> "SUCCESS" / "ERR:"
//   addOrbEffector("radius|posY|scale|rotation|opacity") -> "SUCCESS" / "ERR:"
//   buildCarousel3D(JSON payload from carousel_3d.js)   -> "OK:summary" / "ERR:"
//   applyGlassMorph() / applyGlassMorphShape() / removeGlassMorph() -> "SUCCESS" / "ERR:"
//   convertSelectedShapesToLiquidGlass("true"|"false") / trackLiquidGlassToShape("true"|"false") -> "SUCCESS:msg" / "ERR:"
//        (these drive the separate third-party Liquid Glass effect plugin; ERR "...not installed" when it is absent)
//   fxLightSweepLock(lockState) -> "LOCKED" / "UNLOCKED" / ""      applyShatterEffect() -> "SUCCESS" / "ERR:"
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }
    var NO_COMP = "ERR:Open a composition first.";

    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
    function bool(v) { return v === true || String(v) === "true" || String(v) === "1"; }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function fxGroup(L) { return L.property("ADBE Effect Parade"); }
    function addSlider(L, name, v) { var e = fxGroup(L).addProperty("ADBE Slider Control"); e.name = name; e.property(1).setValue(v); return e; }
    function addCheck(L, name, v) { var e = fxGroup(L).addProperty("ADBE Checkbox Control"); e.name = name; e.property(1).setValue(v ? 1 : 0); return e; }
    function fxVal(L, name) { try { return fxGroup(L).property(name).property(1).value; } catch (e) { return null; } }
    function hasCamera(comp) { var i; for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i) instanceof CameraLayer) { return true; } } return false; }
    function ensureCamera(comp, name) {
        if (hasCamera(comp)) { return null; }
        var cam = comp.layers.addCamera(name || "Camera", [comp.width / 2, comp.height / 2]);
        return cam;
    }
    function layerByName(comp, name) { var i; for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === name) { return comp.layer(i); } } return null; }
    function uniqueName(comp, base) { if (!layerByName(comp, base)) { return base; } var k = 2; while (layerByName(comp, base + " " + k)) { k += 1; } return base + " " + k; }
    function hexRgb(h) {
        var v = String(h || "").replace("#", ""), n = parseInt(v, 16);
        if (isNaN(n) || v.length !== 6) { return [0.3, 0.5, 0.9]; }
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }

    // ================= Carousel (2D / 3D / sphere / path) =================
    var CTRL = "Carousel Control", GUIDE = "Carousel Guide", PATHL = "Carousel Guide Path";
    var C_TAG = "AKIRA_CAROUSEL|", MARK = "// akira-carousel";
    var CAR_FX = [["Influence", 100], ["Radius", 600], ["Arc", 360], ["Start Angle", 0], ["Tilt X", 0], ["Tilt Y", 0],
        ["Spacing", 100], ["Offset", 0], ["Rotation", 0], ["Random Seed", 1], ["Random Offset", 0], ["Random Offset X", 0],
        ["Random Offset Y", 0], ["Random Offset Z", 0], ["Random Rotation", 0], ["Random Rotation X", 0], ["Random Rotation Y", 0], ["Random Rotation Z", 0]];

    function ctrlMeta(L) {
        var p = String(L.comment || "").split("|");
        return { format: p[1] || "2d", faceCamera: p[2] === "1", guideCircle: p[3] === "1", livePath: p[4] || "none", orb: p[5] === "1" };
    }
    function setMeta(L, m) { L.comment = C_TAG + [m.format, m.faceCamera ? "1" : "0", m.guideCircle ? "1" : "0", m.livePath || "none", m.orb ? "1" : "0"].join("|"); }
    function isCtrl(L) { return String(L.comment || "").indexOf(C_TAG) === 0; }
    function findCtrl(comp) {
        var sel = H.selectedLayers(comp), i;
        for (i = 0; i < sel.length; i += 1) { if (isCtrl(sel[i])) { return sel[i]; } }
        for (i = 0; i < sel.length; i += 1) {
            var ex = ""; try { ex = String(sel[i].transform.position.expression); } catch (e) { }
            var m = /thisComp\.layer\("((?:\\.|[^"\\])*)"\)/.exec(ex);
            if (ex.indexOf(MARK) !== -1 && m) { var c = layerByName(comp, m[1].replace(/\\"/g, '"')); if (c) { return c; } }
        }
        for (i = 1; i <= comp.numLayers; i += 1) { if (isCtrl(comp.layer(i))) { return comp.layer(i); } }
        return null;
    }
    function carouselItems(comp, ctrl) {
        var out = [], i, needle = 'thisComp.layer("' + esc(ctrl.name) + '")';
        for (i = 1; i <= comp.numLayers; i += 1) {
            var L = comp.layer(i), ex = "";
            try { ex = String(L.transform.position.expression); } catch (e) { continue; }
            if (ex.indexOf(MARK) !== -1 && ex.indexOf(needle) !== -1) { out.push(L); }
        }
        return out;
    }
    // Shared expression preamble: slot angle (degrees) and the slot target point in comp space.
    function preamble(ctrlName, meta, idx, n) {
        var is3d = meta.format.indexOf("3d") === 0, isPath = meta.format.indexOf("path") !== -1;
        var pathSrc = meta.livePath && meta.livePath !== "none" ? meta.livePath : PATHL;
        return MARK + "\nconst C=thisComp.layer(\"" + esc(ctrlName) + "\");\nconst g=n=>{try{return C.effect(n)(1);}catch(e){return 0;}};\n" +
            "const N=" + n + ", I=" + idx + ";\nconst k=g(\"Reverse Order\")>0?N-1-I:I;\n" +
            "const R=g(\"Radius\"), arc=g(\"Arc\"), sp=g(\"Spacing\")/100, inf=g(\"Influence\")/100;\n" +
            "const full=Math.abs(arc)>=359.9, step=N>1?(full?arc/N:arc/(N-1)):0;\n" +
            "const deg=g(\"Start Angle\")-90+(full?0:-arc/2)+k*step*sp+g(\"Offset\")+g(\"Rotation\");\n" +
            "seedRandom(g(\"Random Seed\")*1000+I,true);\n" +
            "const ro=random(-1,1)*g(\"Random Offset\"), rx=random(-1,1)*g(\"Random Offset X\"), ry=random(-1,1)*g(\"Random Offset Y\"), rz=random(-1,1)*g(\"Random Offset Z\");\n" +
            "const rr=random(-1,1)*g(\"Random Rotation\"), rrx=random(-1,1)*g(\"Random Rotation X\"), rry=random(-1,1)*g(\"Random Rotation Y\"), rrz=random(-1,1)*g(\"Random Rotation Z\");\n" +
            "const a=degreesToRadians(deg), cp=C.toComp(C.anchorPoint);\n" +
            "function tilt(p){const tx=degreesToRadians(g(\"Tilt X\")), ty=degreesToRadians(g(\"Tilt Y\"));\n" +
            "  let y=p[1]*Math.cos(tx)-p[2]*Math.sin(tx), z=p[1]*Math.sin(tx)+p[2]*Math.cos(tx), x=p[0];\n" +
            "  const x2=x*Math.cos(ty)+z*Math.sin(ty), z2=-x*Math.sin(ty)+z*Math.cos(ty); return [x2,y,z2];}\n" +
            "let T;\n" +
            (isPath ?
                "try{const P=thisComp.layer(\"" + esc(pathSrc) + "\");let pp;try{pp=P.mask(1).maskPath;}catch(e1){pp=P.content(1).content(1).path;}\n" +
                "  let f=((k*sp/Math.max(1,full?N:N-1))+(g(\"Offset\")+g(\"Rotation\"))/360)%1; if(f<0)f+=1;\n" +
                "  const q=P.toComp(pp.pointOnPath(f)); T=[q[0]+rx+ro,q[1]+ry]" + (is3d ? ".concat([rz])" : "") + ";}catch(e){T=cp;}\n"
                : (meta.format === "3d-sphere" ?
                    "const phi=Math.acos(1-2*(k+0.5)/Math.max(1,N)), th=Math.PI*(1+Math.sqrt(5))*(k+0.5)+degreesToRadians(g(\"Rotation\")+g(\"Offset\"));\n" +
                    "const q=tilt([Math.cos(th)*Math.sin(phi)*(R+ro),Math.cos(phi)*(R+ro),Math.sin(th)*Math.sin(phi)*(R+ro)]);\n" +
                    "T=[cp[0]+q[0]+rx,cp[1]+q[1]+ry,(cp.length>2?cp[2]:0)+q[2]+rz];\n"
                    : (is3d ?
                        "const q=tilt([Math.cos(a)*(R+ro),0,Math.sin(a)*(R+ro)]);\nT=[cp[0]+q[0]+rx,cp[1]+q[1]+ry,(cp.length>2?cp[2]:0)+q[2]+rz];\n"
                        : "T=[cp[0]+Math.cos(a)*(R+ro)+rx,cp[1]+Math.sin(a)*(R+ro)+ry];\n")));
    }
    function orbTerm(kind) {
        // Sum of every "Orb Effector*" layer's influence on this clone (linear falloff inside its Radius).
        return "let W=0, S=0, RO=0, O=0;\nfor(let j=1;j<=thisComp.numLayers;j++){const E=thisComp.layer(j);if(E.name.indexOf(\"Orb Effector\")!==0)continue;\n" +
            "  const d=length(E.toComp(E.anchorPoint),toComp(anchorPoint)), r=Math.max(1,E.effect(\"Radius\")(1)), w=ease(d,0,r,1,0);\n" +
            "  S+=E.effect(\"Scale\")(1)*w; RO+=E.effect(\"Rotation\")(1)*w; O+=E.effect(\"Opacity\")(1)*w;}\n" +
            (kind === "scale" ? "value.map((v,i)=>i<2?v+S:v)" : kind === "opacity" ? "clamp(value+O,0,100)" : "");
    }
    function applyItem(L, ctrl, meta, idx, n) {
        var pre = preamble(ctrl.name, meta, idx, n), is3d = meta.format.indexOf("3d") === 0;
        if (is3d && !L.threeDLayer) { L.threeDLayer = true; }
        if (!is3d && L.threeDLayer && meta.format !== "auto") { L.threeDLayer = false; }
        L.transform.position.expression = pre + (is3d ? "value.length>2?add(value,mul(sub(T,value),inf)):T" : "add(value,mul(sub(T.slice(0,2),value.slice(0,2)),inf)).concat(value.length>2?[value[2]]:[])");
        var orient = "(g(\"Orient to Center\")>0?" + (is3d ? "-(deg+90)" : "deg+90") + ":0)";
        if (is3d) {
            L.transform.yRotation.expression = pre + "value+(" + orient + "+rry)*inf";
            L.transform.xRotation.expression = pre + "value+rrx*inf";
            L.transform.zRotation.expression = pre + (meta.orb ? orbTerm("") + "value+(rrz+RO)*inf" : "value+rrz*inf");
            if (meta.faceCamera) { try { L.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST; } catch (e0) { } }
        } else {
            L.transform.rotation.expression = pre + (meta.orb ? orbTerm("") + "value+(" + orient + "+rr+RO)*inf" : "value+(" + orient + "+rr)*inf");
        }
        if (meta.orb) {
            L.transform.scale.expression = MARK + "\n" + orbTerm("scale");
            L.transform.opacity.expression = MARK + "\n" + orbTerm("opacity");
        }
    }
    function makeGuide(comp, ctrl) {
        var G = comp.layers.addShape(); G.name = uniqueName(comp, GUIDE);
        var c = G.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var el = c.addProperty("ADBE Vector Shape - Ellipse");
        el.property("ADBE Vector Ellipse Size").expression = "const r=thisComp.layer(\"" + esc(ctrl.name) + "\").effect(\"Radius\")(1)*2;[r,r]";
        var st = c.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]); st.property("ADBE Vector Stroke Width").setValue(2);
        try { var d = st.property("ADBE Vector Stroke Dashes"); d.addProperty("ADBE Vector Stroke Dash 1"); d.property(1).setValue(12); } catch (e) { }
        G.transform.position.expression = "const C=thisComp.layer(\"" + esc(ctrl.name) + "\");C.toComp(C.anchorPoint)";
        G.transform.opacity.setValue(40);
        G.guideLayer = true;
        return G;
    }
    function resolveFormat(comp, fmt, layers) {
        if (fmt !== "auto") { return fmt; }
        var i; if (hasCamera(comp)) { return "3d"; }
        for (i = 0; i < layers.length; i += 1) { if (layers[i].threeDLayer) { return "3d"; } }
        return "2d";
    }
    function buildCarousel(comp, items, meta, radius) {
        var ctrl = comp.layers.addNull(), i;
        ctrl.name = uniqueName(comp, CTRL);
        ctrl.transform.anchorPoint.setValue([50, 50]);
        ctrl.transform.position.setValue([comp.width / 2, comp.height / 2]);
        if (meta.format.indexOf("3d") === 0) { ctrl.threeDLayer = true; }
        for (i = 0; i < CAR_FX.length; i += 1) { addSlider(ctrl, CAR_FX[i][0], CAR_FX[i][0] === "Radius" ? radius : CAR_FX[i][1]); }
        addCheck(ctrl, "Orient to Center", false); addCheck(ctrl, "Reverse Order", false);
        setMeta(ctrl, meta);
        for (i = 0; i < items.length; i += 1) { applyItem(items[i], ctrl, meta, i, items.length); }
        if (meta.guideCircle && meta.format.indexOf("path") === -1) { makeGuide(comp, ctrl).moveAfter(ctrl); }
        if (meta.faceCamera && meta.format.indexOf("3d") === 0) { ensureCamera(comp, "Carousel Camera"); }
        return ctrl;
    }
    function carouselTargets(comp) {
        var sel = H.selectedLayers(comp), out = [], i;
        for (i = 0; i < sel.length; i += 1) {
            var L = sel[i];
            if (isCtrl(L) || H.isCamOrLight(L) || L.name.indexOf(GUIDE) === 0 || L.name.indexOf("Orb Effector") === 0) { continue; }
            out.push(L);
        }
        return out;
    }

    F.createCarousel = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p = String(arg || "").split("|"), items = carouselTargets(comp);
        if (items.length < 2) { return "ERR:Select at least two layers for the carousel."; }
        var meta = { format: resolveFormat(comp, p[0] || "auto", items), faceCamera: bool(p[1]), livePath: p[2] || "none", guideCircle: bool(p[3]), orb: false };
        if (meta.format.indexOf("path") !== -1 && meta.livePath === "none") { meta.livePath = "none"; }
        app.beginUndoGroup("Create Carousel");
        try { buildCarousel(comp, items, meta, num(p[4], 600)); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.getCarouselDetails = function () {
        var comp = H.activeComp(); if (!comp) { return "none"; }
        var c = findCtrl(comp); if (!c) { return "none"; }
        var m = ctrlMeta(c);
        return H.toJSON({
            format: m.format, influence: fxVal(c, "Influence"), radius: fxVal(c, "Radius"), arc: fxVal(c, "Arc"),
            startAngle: fxVal(c, "Start Angle"), tiltX: fxVal(c, "Tilt X"), tiltY: fxVal(c, "Tilt Y"), spacing: fxVal(c, "Spacing"),
            offset: fxVal(c, "Offset"), rotation: fxVal(c, "Rotation"), orient: fxVal(c, "Orient to Center"),
            reverseOrder: fxVal(c, "Reverse Order"), rSeed: fxVal(c, "Random Seed"), faceCamera: m.faceCamera,
            guideCircle: m.guideCircle, livePath: m.livePath === "none" ? "" : m.livePath,
            rOffset: fxVal(c, "Random Offset"), rRot: fxVal(c, "Random Rotation"),
            rOffsetX: fxVal(c, "Random Offset X"), rOffsetY: fxVal(c, "Random Offset Y"), rOffsetZ: fxVal(c, "Random Offset Z"),
            rRotX: fxVal(c, "Random Rotation X"), rRotY: fxVal(c, "Random Rotation Y"), rRotZ: fxVal(c, "Random Rotation Z")
        });
    };

    F.updateCarouselControlRealTime = function (effectName, value) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var c = findCtrl(comp); if (!c) { return "ERR:No Carousel Control in this comp."; }
        try { fxGroup(c).property(String(effectName)).property(1).setValue(num(value, 0)); }
        catch (e) { return "ERR:" + e.toString(); }
        return "OK";
    };

    function rebuildItems(comp, c, extra) {
        var items = carouselItems(comp, c), i, j, meta = ctrlMeta(c);
        for (i = 0; i < extra.length; i += 1) {
            var dup = false; for (j = 0; j < items.length; j += 1) { if (items[j] === extra[i]) { dup = true; } }
            if (!dup) { items.push(extra[i]); }
        }
        items.sort(function (a, b) { return a.index - b.index; });
        for (i = 0; i < items.length; i += 1) { applyItem(items[i], c, meta, i, items.length); }
        return items.length;
    }
    F.syncCarousel = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var c = findCtrl(comp); if (!c) { return "ERR:No Carousel Control in this comp."; }
        app.beginUndoGroup("Sync Carousel");
        try { rebuildItems(comp, c, carouselTargets(comp)); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    F.pastePathToCarouselControl = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var c = findCtrl(comp); if (!c) { return "ERR:Create a carousel first."; }
        var sel = carouselTargets(comp), src = null, shape = null, i;
        for (i = 0; i < sel.length && !shape; i += 1) {
            try { var mp = sel[i].property("ADBE Mask Parade"); if (mp && mp.numProperties) { shape = mp.property(1).property("ADBE Mask Shape").value; src = sel[i]; } } catch (e0) { }
            if (!shape && sel[i] instanceof ShapeLayer) {
                var paths = []; (function walk(gp) { var k; for (k = 1; k <= gp.numProperties; k += 1) { var p = gp.property(k); if (p.matchName === "ADBE Vector Shape") { paths.push(p); } else if (p.propertyType !== PropertyType.PROPERTY) { walk(p); } } })(sel[i].property("ADBE Root Vectors Group"));
                if (paths.length) { shape = paths[0].value; src = sel[i]; }
            }
        }
        if (!shape) { return "ERR:Select a layer with a mask or shape path (plus the carousel)."; }
        app.beginUndoGroup("Paste Path to Carousel");
        try {
            var old = layerByName(comp, PATHL); if (old) { old.remove(); }
            var P = comp.layers.addShape(); P.name = PATHL;
            var cg = P.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            cg.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(shape);
            var st = cg.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Width").setValue(2);
            var t = comp.time, tr = src.transform;
            P.transform.anchorPoint.setValue(tr.anchorPoint.valueAtTime(t, false).slice(0, 2));
            P.transform.position.setValue(H.getPos(src, t).slice(0, 2));
            P.transform.scale.setValue(tr.scale.valueAtTime(t, false).slice(0, 2));
            P.transform.rotation.setValue(H.rotationOf(src, t));
            P.guideLayer = true; P.transform.opacity.setValue(40);
            var m = ctrlMeta(c);
            m.format = m.format.indexOf("3d") === 0 ? "3d-path" : "2d-path"; m.livePath = PATHL; setMeta(c, m);
            rebuildItems(comp, c, []);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Orb cloner / effector =================
    function addEffector(comp, radius, posY, scale, rot, opacity) {
        var E = comp.layers.addNull(); E.name = uniqueName(comp, "Orb Effector");
        E.transform.anchorPoint.setValue([50, 50]);
        E.transform.position.setValue([comp.width / 2, comp.height / 2 + posY]);
        addSlider(E, "Radius", radius); addSlider(E, "Scale", scale); addSlider(E, "Rotation", rot); addSlider(E, "Opacity", opacity);
        E.label = 11;
        var R = comp.layers.addShape(); R.name = "Carousel Guide · " + E.name;
        var c = R.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        c.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").expression = "const r=thisComp.layer(\"" + esc(E.name) + "\").effect(\"Radius\")(1)*2;[r,r]";
        var st = c.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue([1, 0.6, 0.2]); st.property("ADBE Vector Stroke Width").setValue(2);
        R.transform.position.expression = "const E=thisComp.layer(\"" + esc(E.name) + "\");E.toComp(E.anchorPoint)";
        R.guideLayer = true; R.transform.opacity.setValue(50);
        R.moveAfter(E);
        return E;
    }
    F.createOrbCloner = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p = String(arg || "").split("|"), count = Math.max(2, Math.min(150, Math.round(num(p[5], 12))));
        var srcs = carouselTargets(comp);
        app.beginUndoGroup("Create Orb Cloner");
        try {
            var src = srcs.length ? srcs[0] : null, items = [], i;
            if (!src) {
                src = comp.layers.addShape(); src.name = "Orb";
                var sc = src.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
                var sz = Math.round(Math.min(comp.width, comp.height) * 0.06);
                sc.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([sz, sz]);
                sc.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0.3, 0.75, 1]);
            }
            src.name = src.name.indexOf("Orb Clone") === 0 ? src.name : "Orb Clone 1";
            items.push(src);
            for (i = 2; i <= count; i += 1) { var d = src.duplicate(); d.name = "Orb Clone " + i; items.push(d); }
            var meta = { format: resolveFormat(comp, p[0] || "2d", items), faceCamera: bool(p[1]), livePath: p[2] || "none", guideCircle: bool(p[3]), orb: true };
            var ctrl = buildCarousel(comp, items, meta, num(p[4], 600));
            addEffector(comp, num(p[6], 450), num(p[7], -160), num(p[8], 35), num(p[9], 30), num(p[10], -100)).moveBefore(ctrl);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.addOrbEffector = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p = String(arg || "").split("|"), c = findCtrl(comp);
        if (!c || !ctrlMeta(c).orb) { return "ERR:Build the Orb Cloner rig first."; }
        app.beginUndoGroup("Add Orb Effector");
        try { addEffector(comp, num(p[0], 450), num(p[1], -160), num(p[2], 35), num(p[3], 30), num(p[4], -100)); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= 3D Carousel builder (carousel_3d.js) =================
    function cardAngle(p, i, n) {
        var span = p.arc, step = (n > 1) ? (span >= 359.9 ? span / n : span / (n - 1)) : 0;
        return (span >= 359.9 ? -90 : -90 - span / 2) + i * step;
    }
    function cardPos(p, i, n) {
        var r = p.radius;
        if (p.axis === "fib") {
            var phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, n)), th = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
            return [Math.cos(th) * Math.sin(phi) * r, Math.cos(phi) * r, Math.sin(th) * Math.sin(phi) * r];
        }
        var a = cardAngle(p, i, n) * Math.PI / 180, rise = (p.rise || 0) * (i - (n - 1) / 2);
        if (p.axis === "x") { return [0, Math.cos(a) * r, Math.sin(a) * r]; }
        return [Math.cos(a) * r, rise, Math.sin(a) * r];
    }
    F.buildCarousel3D = function (json) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var p; try { p = H.parseJSON(json); } catch (e0) { return "ERR:Could not read the carousel settings."; }
        var n = Math.max(2, Math.round(num(p.count, 8))), W = comp.width, Hh = comp.height, i;
        var cardW = num(p.cardW, W * 0.22), cardH = cardW * 1.3, dur = Math.max(0.5, num(p.duration, 8));
        var sources = [];
        var li = p.layers || [];
        for (i = 0; i < li.length; i += 1) { try { var Lx = comp.layer(li[i]); if (Lx) { sources.push(Lx); } } catch (eL) { } }
        app.beginUndoGroup("Build 3D Carousel");
        try {
            var media = p.media || [];
            for (i = 0; i < media.length; i += 1) {
                var f = new File(media[i].path);
                if (f.exists) { sources.push(comp.layers.add(app.project.importFile(new ImportOptions(f)))); }
            }
            var ctrl = comp.layers.addNull(); ctrl.name = uniqueName(comp, "AkiraCarousel Control"); ctrl.threeDLayer = true;
            ctrl.transform.anchorPoint.setValue([0, 0, 0]); ctrl.transform.position.setValue([W / 2, Hh / 2, 0]);
            ctrl.transform.xRotation.setValue(num(p.tiltX, 0)); ctrl.transform.yRotation.setValue(num(p.tiltY, 0)); ctrl.transform.zRotation.setValue(num(p.roll, 0));
            var spin = comp.layers.addNull(); spin.name = uniqueName(comp, "AkiraCarousel Spin"); spin.threeDLayer = true;
            spin.transform.anchorPoint.setValue([0, 0, 0]); spin.parent = ctrl; spin.transform.position.setValue([0, 0, 0]);
            var sw = p.swatches || [], cards = [];
            for (i = 0; i < n; i += 1) {
                var L;
                if (i < sources.length) { L = sources[i]; }
                else {
                    L = comp.layers.addSolid(hexRgb(sw.length ? sw[i % sw.length] : "4a6cf7"), "AkiraCarousel Card " + (i + 1), Math.round(cardW), Math.round(cardH), 1);
                }
                L.threeDLayer = true;
                var sw0 = 0; try { sw0 = L.source ? L.source.width : L.width; } catch (eW) { sw0 = 0; }
                if (sw0 > 0) { var s = cardW / sw0 * 100; L.transform.scale.setValue([s, s, s]); }
                L.parent = spin;
                L.transform.position.setValue(cardPos(p, i, n));
                if (p.facing === "billboard") { L.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST; }
                else if (p.facing === "tangent") {
                    var ang = cardAngle(p, i, n);
                    if (p.axis === "x") { L.transform.xRotation.setValue(ang + 90); } else { L.transform.yRotation.setValue(-(ang + 90)); }
                }
                cards.push(L);
            }
            // camera from the panel's preview rig
            var cam = comp.layers.addCamera("AkiraCarousel Camera", [W / 2, Hh / 2]), cr = p.camera || {};
            var cpos = cr.pos || [0, -300, -2300], poi = cr.poi || [0, 0, 0];
            cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(num(cr.zoom, W * 50 / 36));
            cam.transform.position.setValue([W / 2 + cpos[0], Hh / 2 + cpos[1], cpos[2]]);
            cam.transform.pointOfInterest.setValue([W / 2 + poi[0], Hh / 2 + poi[1], poi[2]]);
            if (p.depthBlur) {
                try {
                    var co = cam.property("ADBE Camera Options Group");
                    co.property("ADBE Camera Depth of Field").setValue(1);
                    co.property("ADBE Camera Focus Distance").setValue(Math.sqrt(cpos[0] * cpos[0] + cpos[1] * cpos[1] + cpos[2] * cpos[2]));
                    co.property("ADBE Camera Aperture").setValue(60);
                } catch (eD) { }
            }
            // spin
            var turns = p.loop ? Math.max(1, Math.round(num(p.turns, 1))) : num(p.turns, 1), dir = num(p.direction, 1) < 0 ? -1 : 1;
            var total = 360 * turns * dir, rotP = p.axis === "x" ? spin.transform.xRotation : spin.transform.yRotation, sign = p.axis === "x" ? 1 : -1;
            var t0 = comp.time;
            if (p.stepped) {
                var period = dur / n, k;
                for (k = 0; k < n; k += 1) {
                    rotP.setValueAtTime(t0 + k * period + period * 0.55, sign * total / n * k);
                    rotP.setValueAtTime(t0 + k * period + period * 0.95, sign * total / n * (k + 1));
                }
            } else {
                rotP.setValueAtTime(t0, 0); rotP.setValueAtTime(t0 + dur, sign * total);
                rotP.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR); rotP.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR);
            }
            if (p.loop) { rotP.expression = "loopOut(\"offset\")"; }
            if (p.introOutro && p.style && p.style !== "none") {
                var lead = Math.min(0.9, dur * 0.18);
                for (i = 0; i < cards.length; i += 1) {
                    var stag = (i / n) * Math.min(0.5, dur * 0.08), a0 = t0 + stag, a1 = t0 + stag + lead, b1 = t0 + dur - lead, b0 = t0 + dur;
                    if (p.style === "scale") {
                        var sp = cards[i].transform.scale, v = sp.value;
                        sp.setValueAtTime(a0, [v[0] * 0.2, v[1] * 0.2, v[2] * 0.2]); sp.setValueAtTime(a1, v); sp.setValueAtTime(b1, v); sp.setValueAtTime(b0, [v[0] * 0.2, v[1] * 0.2, v[2] * 0.2]);
                    } else {
                        var op = cards[i].transform.opacity;
                        op.setValueAtTime(a0, 0); op.setValueAtTime(a1, 100); op.setValueAtTime(b1, 100); op.setValueAtTime(b0, 0);
                        if (p.style === "blur") {
                            var bl = fxGroup(cards[i]).addProperty("ADBE Gaussian Blur 2").property(1);
                            bl.setValueAtTime(a0, 30); bl.setValueAtTime(a1, 0); bl.setValueAtTime(b1, 0); bl.setValueAtTime(b0, 30);
                        }
                    }
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + n + " cards · " + (p.name || "3D Carousel");
    };

    // ================= Glass Morph (frosted panel: matte + blurred adjustment layer) =================
    var GL_TAG = "AKIRA_GLASS|";
    function roundedRect(c, w, h, r) {
        var rc = c.addProperty("ADBE Vector Shape - Rect");
        rc.property("ADBE Vector Rect Size").setValue([w, h]); rc.property("ADBE Vector Rect Roundness").setValue(r);
    }
    function matteUnder(comp, matte, adj) {
        // AE 2023+: any layer can be the matte; older AE: the matte must sit right above and gets hidden automatically.
        if (typeof adj.setTrackMatte === "function") { adj.setTrackMatte(matte, TrackMatteType.ALPHA); matte.enabled = false; }
        else { matte.moveBefore(adj); adj.trackMatteType = TrackMatteType.ALPHA; }
    }
    function glassBlur(comp, id, name) {
        var A = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect);
        A.adjustmentLayer = true; A.comment = GL_TAG + id + "|blur";
        var b = fxGroup(A).addProperty("ADBE Gaussian Blur 2");
        b.property(1).setValue(40); try { b.property(3).setValue(true); } catch (e) { }
        try { var bc = fxGroup(A).addProperty("ADBE Brightness & Contrast 2"); bc.property(1).setValue(12); } catch (e2) { }
        return A;
    }
    F.applyGlassMorph = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        app.beginUndoGroup("Glass Morph");
        try {
            var id = "g" + new Date().getTime() % 1000000, w = Math.round(comp.width * 0.6), h = Math.round(comp.height * 0.35), r = Math.round(Math.min(w, h) * 0.12);
            var P = comp.layers.addShape(); P.name = uniqueName(comp, "Glass Panel"); P.comment = GL_TAG + id + "|panel";
            var c = P.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            roundedRect(c, w, h, r);
            var fl = c.addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue([1, 1, 1]); fl.property("ADBE Vector Fill Opacity").setValue(12);
            var st = c.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]);
            st.property("ADBE Vector Stroke Width").setValue(2); st.property("ADBE Vector Stroke Opacity").setValue(35);
            P.transform.position.setValue([comp.width / 2, comp.height / 2]);
            try { var ds = fxGroup(P).addProperty("ADBE Drop Shadow"); ds.property("ADBE Drop Shadow-0002").setValue(25); ds.property("ADBE Drop Shadow-0005").setValue(40); } catch (eS) { }
            var M = P.duplicate(); M.name = P.name + " Matte"; M.comment = GL_TAG + id + "|matte";
            try { fxGroup(M).property(1).remove(); } catch (eM) { }
            M.transform.position.expression = "thisComp.layer(\"" + esc(P.name) + "\").transform.position";
            M.transform.scale.expression = "thisComp.layer(\"" + esc(P.name) + "\").transform.scale";
            M.transform.rotation.expression = "thisComp.layer(\"" + esc(P.name) + "\").transform.rotation";
            var A = glassBlur(comp, id, P.name + " Blur");
            A.moveAfter(P); M.moveBefore(A);
            matteUnder(comp, M, A);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.applyGlassMorphShape = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), i, done = 0;
        if (!sel.length) { return "ERR:Select the layers to turn into glass."; }
        app.beginUndoGroup("Glass Morph (selected)");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var S = sel[i]; if (H.isCamOrLight(S) || S.adjustmentLayer) { continue; }
                var id = "g" + (new Date().getTime() % 1000000) + "_" + i;
                if (String(S.comment || "").indexOf(GL_TAG) !== 0) { S.comment = GL_TAG + id + "|panel"; } else { id = String(S.comment).split("|")[1]; }
                var M = S.duplicate(); M.name = S.name + " Glass Matte"; M.comment = GL_TAG + id + "|matte";
                var A = glassBlur(comp, id, S.name + " Glass Blur");
                A.moveAfter(S); M.moveBefore(A);
                matteUnder(comp, M, A);
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Select the layers to turn into glass.";
    };
    F.removeGlassMorph = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), ids = {}, any = false, i, removed = 0;
        for (i = 0; i < sel.length; i += 1) { var c = String(sel[i].comment || ""); if (c.indexOf(GL_TAG) === 0) { ids[c.split("|")[1]] = true; any = true; } }
        app.beginUndoGroup("Remove Glass Morph");
        try {
            for (i = comp.numLayers; i >= 1; i -= 1) {
                var L = comp.layer(i), parts = String(L.comment || "").split("|");
                if (parts[0] + "|" !== GL_TAG || (any && !ids[parts[1]])) { continue; }
                if (parts[2] === "panel" && L.name.indexOf("Glass Panel") !== 0) { L.comment = ""; continue; } // user's own layer: keep it
                L.remove(); removed += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return removed ? "SUCCESS" : "ERR:No Glass Morph found in this comp.";
    };

    // ================= Liquid Glass (separate effect plugin) =================
    var LG_MISSING = "ERR:The Liquid Glass effect is a separate plugin and is not installed.";
    function liquidGlassMatch() {
        var i, list = app.effects || [];
        for (i = 0; i < list.length; i += 1) { if (/liquid\s*glass/i.test(String(list[i].displayName))) { return list[i].matchName; } }
        return null;
    }
    function layerParam(fx) {
        var i; for (i = 1; i <= fx.numProperties; i += 1) { try { if (fx.property(i).propertyValueType === PropertyValueType.LAYER_INDEX) { return fx.property(i); } } catch (e) { } }
        return null;
    }
    function glassFx(L, mn) { var fx = fxGroup(L), i; for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).matchName === mn) { return fx.property(i); } } return null; }
    F.convertSelectedShapesToLiquidGlass = function (hideSource) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var mn = liquidGlassMatch(); if (!mn) { return LG_MISSING; }
        var sel = H.selectedLayers(comp), i, done = 0;
        app.beginUndoGroup("Convert to Liquid Glass");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var S = sel[i]; if (!(S instanceof ShapeLayer)) { continue; }
                var A = comp.layers.addSolid([1, 1, 1], "Liquid Glass · " + S.name, comp.width, comp.height, comp.pixelAspect);
                A.adjustmentLayer = true; A.moveBefore(S);
                var lp = layerParam(fxGroup(A).addProperty(mn)); if (lp) { lp.setValue(S.index); }
                if (bool(hideSource)) { S.enabled = false; }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS:Converted " + done + " shape layer" + (done === 1 ? "" : "s") + " to Liquid Glass." : "ERR:Select one or more shape layers.";
    };
    F.trackLiquidGlassToShape = function (hideSource) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var mn = liquidGlassMatch(); if (!mn) { return LG_MISSING; }
        var sel = H.selectedLayers(comp), src = null, glass = [], i;
        for (i = 0; i < sel.length; i += 1) { if (glassFx(sel[i], mn)) { glass.push(sel[i]); } else if (!src) { src = sel[i]; } }
        if (!src || !glass.length) { return "ERR:Select one source shape plus one or more Liquid Glass layers."; }
        app.beginUndoGroup("Track Liquid Glass");
        try {
            for (i = 0; i < glass.length; i += 1) { var lp = layerParam(glassFx(glass[i], mn)); if (lp) { lp.setValue(src.index); } }
            if (bool(hideSource)) { src.enabled = false; }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS:Tracked " + glass.length + " glass layer" + (glass.length === 1 ? "" : "s") + " to " + src.name + ".";
    };

    // ================= CC Light Sweep lock / Shatter =================
    var LS_MARK = "// akira-lightsweep-lock";
    F.fxLightSweepLock = function (lockState) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return ""; }
        var sel = H.selectedLayers(comp), i, j, touched = 0, locking = null;
        if (lockState === true || lockState === false) { locking = lockState; }
        app.beginUndoGroup("Light Sweep Lock");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var fx = fxGroup(sel[i]);
                for (j = 1; j <= fx.numProperties; j += 1) {
                    if (fx.property(j).matchName !== "CC Light Sweep") { continue; }
                    var c = fx.property(j).property(1);
                    if (locking === null) { locking = String(c.expression).indexOf(LS_MARK) === -1; }
                    c.expression = locking ? LS_MARK + "\nconst r=thisLayer.sourceRectAtTime(time,false);[r.left+r.width/2,r.top+r.height/2]" : "";
                    touched += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        if (!touched) { return ""; }
        return locking ? "LOCKED" : "UNLOCKED";
    };

    F.applyShatterEffect = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return NO_COMP; }
        var sel = H.selectedLayers(comp), i, t = comp.time;
        if (!sel.length) { return "ERR:Select a layer to shatter."; }
        app.beginUndoGroup("Shatter");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var L = sel[i]; if (H.isCamOrLight(L)) { continue; }
                var sh = fxGroup(L).addProperty("ADBE Shatter");
                try { sh.property(1).setValue(1); } catch (e1) { } // View: Rendered
                // Pieces only break inside Force 1's radius, so holding the radius at 0 until the playhead
                // keeps the layer intact before it and shatters it from the playhead on.
                try {
                    var f1 = sh.property("Force 1"), rad = f1.property("Radius"), r = H.sourceRect(L, t);
                    if (r) { f1.property("Position").setValue([r.left + r.width / 2, r.top + r.height / 2]); }
                    rad.setValueAtTime(Math.max(0, t - comp.frameDuration), 0); rad.setValueAtTime(t, 0.45);
                    rad.setInterpolationTypeAtKey(1, KeyframeInterpolationType.HOLD);
                    f1.property("Strength").setValue(4);
                } catch (e2) { }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
})();
