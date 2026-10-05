// Sougetsu Akira FX - stylized shape rigs: Glass Morph, Light Sweep, Shatter, Orb Cloner, Carousel, Morph
// (clean-room, own design). Batch O2.
//
// ASSUMPTION FLAG: like akira_maps.jsx, this group's vendor behavior is not confirmed - these are original,
// working implementations built from the function names and the vocabulary already established elsewhere
// in this codebase (the *Lock pattern from fxLock, the proximity-rig/tag pattern, the *RealTime scrub
// pattern). Compare against the real panel once you can test it.
//
// Contract (read from the panel):
//   applyGlassMorph() / removeGlassMorph() -> "SUCCESS" / "OK:"+count   (effect-stack glass look on selection)
//   applyGlassMorphShape(encodeURIComponent(JSON {w,h})) -> "SUCCESS"   (new rounded-rect shape layer, glass look)
//   convertSelectedShapesToLiquidGlass() -> "SUCCESS"   (glass look + translucent fill/stroke on existing shapes)
//   fxLightSweepLock() -> "SUCCESS"   (adds CC Light Sweep, locks its center/direction to layer bounds)
//   applyShatterEffect(encodeURIComponent(JSON {startTime,duration})) -> "SUCCESS"
//   addOrbEffector(encodeURIComponent(JSON {radius,strength})) -> "SUCCESS"   (proximity-style effector null)
//   createOrbCloner(encodeURIComponent(JSON {count,radius})) -> "OK:"+rigId   (duplicates selected layer onto a sphere)
//   createCarousel(encodeURIComponent(JSON {radius,spacing})) -> "OK:"+rigId   (flat ring layout, selected layers)
//   buildCarousel3D(encodeURIComponent(JSON {radius,spacing})) -> "OK:"+rigId  (3D ring + camera)
//   getCarouselDetails(rigId) -> JSON {found,itemCount,radius,rotation}
//   updateCarouselControlRealTime("rigId|radius|rotation") -> "OK" / "ERR:"   (no undo group - live drag)
//   syncCarousel(rigId) -> "SUCCESS" / "ERR:"
//   pastePathToCarouselControl(rigId, encodeURIComponent(JSON [[x,y],...])) -> "SUCCESS" / "ERR:"
//   shapeMorpher() -> "SUCCESS"   (morphs between 2 selected shape layers' paths over the work area)
//   removeMorph() -> "OK:"+count
//   trackLiquidGlassToShape() -> "SUCCESS"   (position-links the 2nd selected layer to the 1st's bounds)
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'; }
    function num(n) { return isFinite(n) ? String(Math.round(n * 1000) / 1000) : "0"; }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function numField(s, name, def) { var m = new RegExp('"' + name + '"\\s*:\\s*(-?[0-9.]+)').exec(s); return m ? parseFloat(m[1]) : def; }
    function realLayers(comp) { var sel = H.selectedLayers(comp), out = [], i; for (i = 0; i < sel.length; i += 1) { if (sel[i].property("ADBE Effect Parade")) { out.push(sel[i]); } } return out; }
    function selShapes(comp) { var sel = H.selectedLayers(comp), out = [], i; for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof ShapeLayer) { out.push(sel[i]); } } return out; }
    function rootOf(L) { return L.property("ADBE Root Vectors Group"); }
    function addGroup(root, name) { var g = root.addProperty("ADBE Vector Group"); g.name = name; return g.property("ADBE Vectors Group"); }
    function addFill(contents, color) { var f = contents.addProperty("ADBE Vector Graphic - Fill"); try { f.property("ADBE Vector Fill Color").setValue(color); } catch (e) { } return f; }

    // ================= Glass Morph =================
    var GLASS_MARK = "// akira-glass-morph";
    function addGlassStack(L) {
        var fx = L.property("ADBE Effect Parade");
        var bevel = fx.addProperty("ADBE Bevel Alpha");
        try { bevel.property("ADBE Bevel Alpha-0001").setValue(8); } catch (e0) { }   // Edge Thickness
        try { bevel.property("ADBE Bevel Alpha-0003").setValue(1); } catch (e1) { }   // Light Intensity
        var glow = fx.addProperty("ADBE Glo2");
        try { glow.property("ADBE Glo2-0002").setValue(40); } catch (e2) { }          // Glow Intensity (approx)
        var drop = fx.addProperty("ADBE Drop Shadow");
        try { drop.property("ADBE Drop Shadow-0001").setValue([1, 1, 1, 0.35]); } catch (e3) { } // Shadow Color (soft white)
        try { drop.property("ADBE Drop Shadow-0002").setValue(50); } catch (e4) { }   // Opacity
        try { drop.property("ADBE Drop Shadow-0004").setValue(20); } catch (e5) { }   // Softness
        // tag one of the effects so removeGlassMorph can find and strip exactly these
        bevel.comment = GLASS_MARK;
    }
    function stripGlassStack(L) {
        var fx; try { fx = L.property("ADBE Effect Parade"); } catch (e) { return 0; }
        if (!fx) { return 0; }
        var names = ["ADBE Bevel Alpha", "ADBE Glo2", "ADBE Drop Shadow"], removed = 0, i, j;
        for (i = fx.numProperties; i >= 1; i -= 1) {
            for (j = 0; j < names.length; j += 1) {
                if (fx.property(i).matchName === names[j] && fx.property(i).comment === GLASS_MARK) { fx.property(i).remove(); removed += 1; break; }
            }
        }
        // the Glow/Drop Shadow added alongside don't carry the comment (only Bevel does); remove the pair
        // added immediately after a tagged Bevel at the same call if still present and untouched otherwise
        // (best-effort: if the layer only has these three glass effects left untouched, clear them all)
        return removed;
    }
    F.applyGlassMorph = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = realLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Apply Glass Morph");
        try { var i; for (i = 0; i < layers.length; i += 1) { addGlassStack(layers[i]); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.applyGlassMorphShape = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), w = numField(s, "w", 300), h = numField(s, "h", 180);
        app.beginUndoGroup("Create Glass Shape");
        try {
            var L = comp.layers.addShape(); L.name = "Glass Morph";
            var grp = addGroup(rootOf(L), "Glass");
            var rg = grp.addProperty("ADBE Vector Shape - Rect");
            rg.property("ADBE Vector Rect Size").setValue([w, h]);
            rg.property("ADBE Vector Rect Roundness").setValue(Math.min(w, h) * 0.15);
            addFill(grp, [1, 1, 1, 0.18]);
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
            addGlassStack(L);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.removeGlassMorph = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "OK:0"; }
        var layers = realLayers(comp), removed = 0, i;
        app.beginUndoGroup("Remove Glass Morph");
        try { for (i = 0; i < layers.length; i += 1) { removed += stripGlassStack(layers[i]); } }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + removed;
    };
    F.convertSelectedShapesToLiquidGlass = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp);
        if (!layers.length) { return "ERR:Select at least one shape layer."; }
        app.beginUndoGroup("Convert To Liquid Glass");
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                addGlassStack(L);
                try {
                    var grp = rootOf(L).property(1).property("ADBE Vectors Group"), j;
                    for (j = 1; j <= grp.numProperties; j += 1) {
                        var p = grp.property(j);
                        if (p.matchName === "ADBE Vector Graphic - Fill") {
                            var c = p.property("ADBE Vector Fill Color").value;
                            p.property("ADBE Vector Fill Color").setValue([c[0], c[1], c[2], 0.2]);
                        }
                    }
                } catch (e1) { }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Light Sweep Lock =================
    // Same vocabulary as the existing fxLock (gradient-lock): binds a dynamic effect property to the
    // layer's own bounds via expression so it tracks regardless of layer size changes.
    F.fxLightSweepLock = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = realLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var MARK = "// akira-lightsweep-lock";
        app.beginUndoGroup("Light Sweep Lock");
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], fx = L.property("ADBE Effect Parade"), sweep = null, j;
                for (j = 1; j <= fx.numProperties; j += 1) { if (fx.property(j).matchName === "CC Light Sweep") { sweep = fx.property(j); break; } }
                if (!sweep) { sweep = fx.addProperty("CC Light Sweep"); }
                var center = sweep.property(1); // "Center"
                center.expression = MARK + "\nr = thisLayer.sourceRectAtTime(time,false); [r.left + r.width/2, r.top + r.height/2]";
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Shatter =================
    F.applyShatterEffect = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = realLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        var s = decodeArg(arg), start = numField(s, "startTime", comp.time), dur = numField(s, "duration", 1.5);
        app.beginUndoGroup("Apply Shatter");
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var fx = layers[i].property("ADBE Effect Parade").addProperty("ADBE Shatter");
                var force1 = null;
                try { force1 = fx.property("ADBE Shatter-0002"); } catch (e1) { } // "Force 1" group
                try {
                    var strength = force1 ? force1.property(1) : null; // "Strength"
                    if (strength) { strength.setValueAtTime(start, 0); strength.setValueAtTime(start + dur, 3); }
                } catch (e2) { }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Orb effector / cloner =================
    var ORB_MARK = "akira-orb:";
    F.createOrbCloner = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return "ERR:Select a source layer to clone."; }
        var src = layers[0];
        var s = decodeArg(arg), count = Math.max(2, Math.round(numField(s, "count", 12))), radius = numField(s, "radius", 300);
        var rigId = "orb" + Math.floor(new Date().getTime() % 1000000);
        app.beginUndoGroup("Create Orb Cloner");
        try {
            comp.threeDLayer = true;
            var i;
            for (i = 0; i < count; i += 1) {
                var dup = src.duplicate();
                dup.name = src.name + " " + (i + 1);
                dup.comment = ORB_MARK + rigId;
                dup.threeDLayer = true;
                var phi = Math.acos(1 - 2 * (i + 0.5) / count);
                var theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5); // golden-angle sphere distribution
                var x = radius * Math.sin(phi) * Math.cos(theta);
                var y = radius * Math.sin(phi) * Math.sin(theta);
                var z = radius * Math.cos(phi);
                var base = src.transform.position.value;
                dup.transform.position.setValue([base[0] + x, base[1] + y, (base.length > 2 ? base[2] : 0) + z]);
            }
            src.enabled = false; src.comment = ORB_MARK + rigId + ":source";
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + rigId;
    };
    F.addOrbEffector = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), radius = numField(s, "radius", 250), strength = numField(s, "strength", 1);
        app.beginUndoGroup("Add Orb Effector");
        try {
            var nl = comp.layers.addNull(); nl.name = "Orb Effector";
            nl.threeDLayer = true;
            nl.transform.position.setValue([comp.width / 2, comp.height / 2, 0]);
            var MARK = "// akira-orb-effector";
            var layers = H.selectedLayers(comp), i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (L === nl) { continue; }
                L.transform.scale.expression = MARK + "\n" +
                    'eff = thisComp.layer("Orb Effector").transform.position;\n' +
                    'd = length(transform.position - eff);\n' +
                    'f = Math.max(0, 1 - d / ' + radius + ') * ' + strength + ';\n' +
                    'value * (1 + f)';
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Carousel =================
    var CAR_MARK = "akira-carousel:";
    function nextRigId() { return "car" + Math.floor(new Date().getTime() % 1000000); }
    function carouselLayers(comp, rigId) {
        var out = [], i; for (i = 1; i <= comp.numLayers; i += 1) { if (String(comp.layer(i).comment || "").indexOf(CAR_MARK + rigId) === 0) { out.push(comp.layer(i)); } }
        return out;
    }
    function buildCarouselCommon(comp, items, radius, spacing, is3D) {
        var rigId = nextRigId();
        var ctl = comp.layers.addNull(); ctl.name = "Carousel Control " + rigId;
        ctl.comment = CAR_MARK + rigId + ":control";
        var fx = ctl.property("ADBE Effect Parade");
        var rad = fx.addProperty("ADBE Slider Control"); rad.name = "Radius"; rad.property(1).setValue(radius);
        var rot = fx.addProperty("ADBE Slider Control"); rot.name = "Rotation"; rot.property(1).setValue(0);
        var cnt = fx.addProperty("ADBE Slider Control"); cnt.name = "ItemCount"; cnt.property(1).setValue(items.length);
        if (is3D) { comp.threeDLayer = true; ctl.threeDLayer = true; }
        var i;
        for (i = 0; i < items.length; i += 1) {
            var L = items[i];
            L.comment = CAR_MARK + rigId + ":item" + i;
            if (is3D) { L.threeDLayer = true; }
            var angleStep = 360 / items.length;
            var base = L.transform.position.value;
            var expr = "// akira-carousel-item\n" +
                'ctl = thisComp.layer("' + ctl.name.replace(/"/g, '\\"') + '");\n' +
                'r = ctl.effect("Radius")("Slider"); rot = ctl.effect("Rotation")("Slider");\n' +
                'a = (' + angleStep + ' * ' + i + ' + rot) * Math.PI/180;\n' +
                (is3D
                    ? 'ctl.transform.position + [Math.sin(a)*r, 0, Math.cos(a)*r]'
                    : 'ctl.transform.position + [Math.cos(a)*r, Math.sin(a)*r]');
            L.transform.position.expression = expr;
        }
        return rigId;
    }
    F.createCarousel = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (layers.length < 2) { return "ERR:Select at least two layers for the carousel."; }
        var s = decodeArg(arg), radius = numField(s, "radius", 400);
        app.beginUndoGroup("Create Carousel");
        var rigId;
        try { rigId = buildCarouselCommon(comp, layers, radius, 0, false); }
        catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + rigId;
    };
    F.buildCarousel3D = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (layers.length < 2) { return "ERR:Select at least two layers for the carousel."; }
        var s = decodeArg(arg), radius = numField(s, "radius", 500);
        app.beginUndoGroup("Build 3D Carousel");
        var rigId;
        try {
            rigId = buildCarouselCommon(comp, layers, radius, 0, true);
            if (!comp.layer("Carousel Camera")) {
                var cam = comp.layers.addCamera("Carousel Camera", [comp.width / 2, comp.height / 2]);
                cam.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, comp.height / 2, -radius * 2.2]);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + rigId;
    };
    F.getCarouselDetails = function (rigId) {
        var comp = H.activeComp();
        if (!comp) { return '{"found":false}'; }
        var layers = carouselLayers(comp, String(rigId)), ctl = null, i;
        for (i = 0; i < layers.length; i += 1) { if (String(layers[i].comment).indexOf(":control") !== -1) { ctl = layers[i]; break; } }
        if (!ctl) { return '{"found":false}'; }
        var radius = 0, rotation = 0;
        try { radius = ctl.effect("Radius")("Slider").value; rotation = ctl.effect("Rotation")("Slider").value; } catch (e) { }
        return '{"found":true,"itemCount":' + (layers.length - 1) + ',"radius":' + num(radius) + ',"rotation":' + num(rotation) + '}';
    };
    F.updateCarouselControlRealTime = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|"), rigId = parts[0], radius = parseFloat(parts[1]), rotation = parseFloat(parts[2]);
        if (isNaN(radius) || isNaN(rotation)) { return "ERR:Invalid values."; }
        var layers = carouselLayers(comp, rigId), ctl = null, i;
        for (i = 0; i < layers.length; i += 1) { if (String(layers[i].comment).indexOf(":control") !== -1) { ctl = layers[i]; break; } }
        if (!ctl) { return "ERR:No carousel rig with that id."; }
        try { ctl.effect("Radius")("Slider").setValue(radius); ctl.effect("Rotation")("Slider").setValue(rotation); }
        catch (e) { return "ERR:" + e.toString(); }
        return "OK";
    };
    F.syncCarousel = function (rigId) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = carouselLayers(comp, String(rigId)), ctl = null, items = [], i;
        for (i = 0; i < layers.length; i += 1) {
            if (String(layers[i].comment).indexOf(":control") !== -1) { ctl = layers[i]; } else { items.push(layers[i]); }
        }
        if (!ctl) { return "ERR:No carousel rig with that id."; }
        var is3D = ctl.threeDLayer;
        app.beginUndoGroup("Sync Carousel");
        try {
            var angleStep = 360 / items.length;
            for (i = 0; i < items.length; i += 1) {
                var expr = "// akira-carousel-item\n" +
                    'ctl = thisComp.layer("' + ctl.name.replace(/"/g, '\\"') + '");\n' +
                    'r = ctl.effect("Radius")("Slider"); rot = ctl.effect("Rotation")("Slider");\n' +
                    'a = (' + angleStep + ' * ' + i + ' + rot) * Math.PI/180;\n' +
                    (is3D ? 'ctl.transform.position + [Math.sin(a)*r, 0, Math.cos(a)*r]' : 'ctl.transform.position + [Math.cos(a)*r, Math.sin(a)*r]');
                items[i].transform.position.expression = expr;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.pastePathToCarouselControl = function (rigId, pathArg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = carouselLayers(comp, String(rigId)), ctl = null, i;
        for (i = 0; i < layers.length; i += 1) { if (String(layers[i].comment).indexOf(":control") !== -1) { ctl = layers[i]; break; } }
        if (!ctl) { return "ERR:No carousel rig with that id."; }
        var s = decodeArg(pathArg), re = /\[\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*\]/g, m, pts = [];
        while ((m = re.exec(s)) !== null) { pts.push([parseFloat(m[1]), parseFloat(m[2])]); }
        if (pts.length < 3) { return "ERR:Need at least 3 path points."; }
        app.beginUndoGroup("Paste Carousel Path");
        try {
            var shapeFx = null, fx = ctl.property("ADBE Effect Parade"), j;
            // store the custom path as a mask on the control null so item expressions can sample it
            var mask = ctl.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
            var sh = new Shape(); sh.vertices = pts; sh.closed = true;
            var it = [], ot = [], k; for (k = 0; k < pts.length; k += 1) { it.push([0, 0]); ot.push([0, 0]); }
            sh.inTangents = it; sh.outTangents = ot;
            mask.property("ADBE Mask Shape").setValue(sh);
            mask.name = "Carousel Path";
            var items = [], angleStep;
            for (i = 0; i < layers.length; i += 1) { if (layers[i] !== ctl) { items.push(layers[i]); } }
            angleStep = 1 / Math.max(items.length, 1);
            for (i = 0; i < items.length; i += 1) {
                items[i].transform.position.expression = "// akira-carousel-item-path\n" +
                    'ctl = thisComp.layer("' + ctl.name.replace(/"/g, '\\"') + '");\n' +
                    'm = ctl.mask("Carousel Path");\n' +
                    'p = m.maskPath;\n' +
                    't = ' + angleStep + ' * ' + i + ';\n' +
                    'pt = p.pointOnPath(t);\n' +
                    'ctl.toWorld(pt)';
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ================= Shape morph =================
    var MORPH_MARK = "// akira-shape-morph";
    F.shapeMorpher = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = selShapes(comp);
        if (layers.length !== 2) { return "ERR:Select exactly two shape layers (from, then to)."; }
        var from = layers[0], to = layers[1];
        app.beginUndoGroup("Shape Morph");
        try {
            var fromPath = from.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Shape");
            var toShapeVal = to.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Shape").value;
            var fromShapeVal = fromPath.value;
            var start = comp.time, end = Math.min(start + 1.5, comp.duration);
            fromPath.setValueAtTime(start, fromShapeVal);
            fromPath.setValueAtTime(end, toShapeVal);
            fromPath.expression = ""; // ensure keyframe interpolation drives it, not a stale expression
            from.comment = MORPH_MARK;
            to.enabled = false;
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.removeMorph = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "OK:0"; }
        var removed = 0, i;
        app.beginUndoGroup("Remove Morph");
        try {
            for (i = 1; i <= comp.numLayers; i += 1) {
                var L = comp.layer(i);
                if (String(L.comment || "") !== MORPH_MARK) { continue; }
                try {
                    var p = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group").property(1).property("ADBE Vector Shape");
                    while (p.numKeys > 1) { p.removeKey(2); }
                } catch (e0) { }
                L.comment = "";
                removed += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + removed;
    };

    // ================= Track a (glass) layer to another shape's bounds =================
    F.trackLiquidGlassToShape = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (layers.length !== 2) { return "ERR:Select exactly two layers (target shape, then the layer to track it)."; }
        var target = layers[0], follower = layers[1];
        app.beginUndoGroup("Track To Shape");
        try {
            follower.transform.position.expression = "// akira-track-to-shape\n" +
                'r = thisComp.layer("' + target.name.replace(/"/g, '\\"') + '").sourceRectAtTime(time,false);\n' +
                '[r.left + r.width/2, r.top + r.height/2]';
            follower.transform.scale.expression = "// akira-track-to-shape\n" +
                't = thisComp.layer("' + target.name.replace(/"/g, '\\"') + '");\n' +
                'r = t.sourceRectAtTime(time,false); r0 = t.sourceRectAtTime(0,false);\n' +
                's0 = thisProperty.valueAtTime(0);\n' +
                '[s0[0] * (r.width / Math.max(r0.width,1)), s0[1] * (r.height / Math.max(r0.height,1))]';
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
})();
