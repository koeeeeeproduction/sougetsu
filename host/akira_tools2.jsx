// Sougetsu Akira FX - tools, batch B (clean-room): alignment, stagger, reset, keyframe easing and keyframe utilities.
// Behaviour here is our own design built from each button's label; it intentionally does not copy any other product.
// ES3 only: no let/const, arrow functions, JSON, Array.indexOf/forEach.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; } // akira_tools.jsx must load first

    // ---------- keyframe helpers ----------
    function layerOf(prop) {
        try { return prop.propertyGroup(prop.propertyDepth); } catch (e) { return null; }
    }
    // properties with selected keyframes: [{prop, keys:[1-based indices ascending]}]
    function selectedKeyProps(comp) {
        var out = [], sp = comp.selectedProperties, i, j;
        for (i = 0; i < sp.length; i += 1) {
            var p = sp[i];
            if (p.propertyType !== PropertyType.PROPERTY || !(p.numKeys > 0)) { continue; }
            var ks = p.selectedKeys;
            if (!ks || !ks.length) { continue; }
            var arr = [];
            for (j = 0; j < ks.length; j += 1) { arr.push(ks[j]); }
            arr.sort(function (a, b) { return a - b; });
            out.push({ prop: p, keys: arr });
        }
        return out;
    }
    function dimsOfEase(prop, k) {
        try { return prop.keyInTemporalEase(k).length; } catch (e) { return 1; }
    }
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function magnitude(v0, v1) {
        if (typeof v0 === "number") { return v1 - v0; }
        var s = 0, i;
        for (i = 0; i < v0.length; i += 1) { s += (v1[i] - v0[i]) * (v1[i] - v0[i]); }
        return Math.sqrt(s);
    }
    function applyExprToSelected(code, undoName) {
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var props = comp.selectedProperties, i, n = 0;
        app.beginUndoGroup(undoName);
        try {
            for (i = 0; i < props.length; i += 1) {
                var p = props[i];
                if (p.propertyType === PropertyType.PROPERTY && p.canSetExpression) { p.expression = code; n += 1; }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return n ? "SUCCESS" : "ERR:Select a property in the timeline first (click its name).";
    }
    // snapshot / restore one keyframe (used by reverse + duplicate)
    function snapKey(prop, k) {
        var s = { time: prop.keyTime(k), value: prop.keyValue(k), inI: prop.keyInInterpolationType(k), outI: prop.keyOutInterpolationType(k), inE: null, outE: null };
        try { s.inE = prop.keyInTemporalEase(k); s.outE = prop.keyOutTemporalEase(k); } catch (e) { }
        return s;
    }
    function putKey(prop, time, snap, swap) {
        prop.setValueAtTime(time, snap.value);
        var idx = prop.nearestKeyIndex(time);
        var inI = swap ? snap.outI : snap.inI, outI = swap ? snap.inI : snap.outI;
        try { prop.setInterpolationTypeAtKey(idx, inI, outI); } catch (e1) { }
        if (snap.inE && snap.outE) {
            try { prop.setTemporalEaseAtKey(idx, swap ? snap.outE : snap.inE, swap ? snap.inE : snap.outE); } catch (e2) { }
        }
        return idx;
    }

    // ---------- alignment (global function, called by the panel as alignLayers_AkiraGUI("left|comp")) ----------
    function worldBounds(L, time) {
        var r = H.sourceRect(L, time);
        if (!r) { return null; }
        var corners = [[r.left, r.top], [r.left + r.width, r.top], [r.left, r.top + r.height], [r.left + r.width, r.top + r.height]];
        var pos = H.getPos(L, time), minX = 1e12, minY = 1e12, maxX = -1e12, maxY = -1e12, i;
        for (i = 0; i < 4; i += 1) {
            var o = H.offsetFromAnchor(L, corners[i], time);
            var x = pos[0] + o[0], y = pos[1] + o[1];
            if (x < minX) { minX = x; } if (x > maxX) { maxX = x; }
            if (y < minY) { minY = y; } if (y > maxY) { maxY = y; }
        }
        return { left: minX, right: maxX, top: minY, bottom: maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    }
    $.global.alignLayers_AkiraGUI = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|"), dir = parts[0], mode = parts[1] || "comp";
        var layers = H.selectedLayers(comp), items = [], i;
        if (!layers.length) { return "ERR:Select at least one unlocked layer."; }
        var time = comp.time;
        for (i = 0; i < layers.length; i += 1) {
            var L = layers[i];
            if (H.isCamOrLight(L) || L.locked || L.parent) { continue; }
            var b = worldBounds(L, time);
            if (b) { items.push({ layer: L, b: b }); }
        }
        if (!items.length) { return "ERR:Select at least one unlocked, unparented layer."; }
        var box;
        if (mode === "selection" && items.length > 1) {
            box = { left: 1e12, right: -1e12, top: 1e12, bottom: -1e12 };
            for (i = 0; i < items.length; i += 1) {
                var q = items[i].b;
                if (q.left < box.left) { box.left = q.left; } if (q.right > box.right) { box.right = q.right; }
                if (q.top < box.top) { box.top = q.top; } if (q.bottom > box.bottom) { box.bottom = q.bottom; }
            }
        } else { box = { left: 0, right: comp.width, top: 0, bottom: comp.height }; }
        box.cx = (box.left + box.right) / 2; box.cy = (box.top + box.bottom) / 2;
        app.beginUndoGroup("Align " + dir);
        try {
            for (i = 0; i < items.length; i += 1) {
                var b2 = items[i].b, dx = 0, dy = 0;
                if (dir === "left") { dx = box.left - b2.left; }
                else if (dir === "center") { dx = box.cx - b2.cx; }
                else if (dir === "right") { dx = box.right - b2.right; }
                else if (dir === "top") { dy = box.top - b2.top; }
                else if (dir === "middle") { dy = box.cy - b2.cy; }
                else if (dir === "bottom") { dy = box.bottom - b2.bottom; }
                else { app.endUndoGroup(); return "ERR:Unknown alignment: " + dir; }
                var pos = H.getPos(items[i].layer, time), np = [pos[0] + dx, pos[1] + dy];
                if (pos.length > 2) { np.push(pos[2]); }
                H.setPos(items[i].layer, np, time);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- stagger start times: "frames|steps" (steps 0 = pyramid, >0 = random multiples up to steps) ----------
    F.offsetLayers = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|"), frames = parseFloat(parts[0]), steps = parseInt(parts[1], 10);
        if (isNaN(frames)) { return "ERR:Enter the number of frames to offset."; }
        if (isNaN(steps) || steps < 0) { steps = 0; }
        var layers = H.selectedLayers(comp), n = layers.length, i;
        if (n < 2) { return "ERR:Select at least two layers."; }
        layers.sort(function (a, b) { return a.index - b.index; });
        app.beginUndoGroup("Offset Layers");
        try {
            for (i = 0; i < n; i += 1) {
                var m = steps === 0 ? Math.min(i, n - 1 - i) : Math.floor(Math.random() * (steps + 1));
                layers[i].startTime = layers[i].startTime + frames * m * comp.frameDuration;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };

    // ---------- reset transform: scale 100, rotation 0, opacity 100, anchor to content center, position to comp center ----------
    F.resetTransform = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp), i, done = 0, time = comp.time;
        if (!layers.length) { return "ERR:Select at least one layer."; }
        app.beginUndoGroup("Reset Transform");
        try {
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], t = L.transform;
                if (H.isCamOrLight(L)) { continue; }
                var sc = t.scale.valueAtTime(time, false), ns = [100, 100]; if (sc.length > 2) { ns.push(100); }
                H.setProp(t.scale, ns, time);
                if (L.threeDLayer) {
                    try { H.setProp(t.zRotation, 0, time); H.setProp(t.xRotation, 0, time); H.setProp(t.yRotation, 0, time); } catch (e1) { }
                } else { H.setProp(t.rotation, 0, time); }
                H.setProp(t.opacity, 100, time);
                var r = H.sourceRect(L, time);
                if (r) {
                    var a = t.anchorPoint.valueAtTime(time, false), na = [r.left + r.width / 2, r.top + r.height / 2];
                    if (a.length > 2) { na.push(a[2]); }
                    H.setProp(t.anchorPoint, na, time);
                    if (!L.parent) {
                        var p = H.getPos(L, time), np = [comp.width / 2, comp.height / 2];
                        if (p.length > 2) { np.push(p[2]); }
                        H.setPos(L, np, time);
                    }
                }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:No selected layer can be reset.";
    };

    // ---------- time ----------
    F.setTime = function (seconds) {
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var t = parseFloat(seconds);
        if (isNaN(t)) { return "ERR:Invalid time."; }
        comp.time = clamp(t, 0, comp.duration);
        return "SUCCESS";
    };

    // ---------- easing ----------
    // mode: "ease" (both sides), "easeIn", "easeOut". Influence 33.33%, speed 0.
    F.easyEaseSelectedKeyframes = function (mode) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = selectedKeyProps(comp), i, j, d, count = 0;
        if (!sel.length) { return "ERR:Select keyframes in the timeline first."; }
        mode = String(mode || "ease");
        app.beginUndoGroup("Easy Ease");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var p = sel[i].prop;
                for (j = 0; j < sel[i].keys.length; j += 1) {
                    var k = sel[i].keys[j], n = dimsOfEase(p, k);
                    var fresh = [];
                    for (d = 0; d < n; d += 1) { fresh.push(new KeyframeEase(0, 33.333)); }
                    var inE = (mode === "ease" || mode === "easeIn") ? fresh : p.keyInTemporalEase(k);
                    var outE = (mode === "ease" || mode === "easeOut") ? fresh : p.keyOutTemporalEase(k);
                    p.setInterpolationTypeAtKey(k,
                        (mode === "ease" || mode === "easeIn") ? KeyframeInterpolationType.BEZIER : p.keyInInterpolationType(k),
                        (mode === "ease" || mode === "easeOut") ? KeyframeInterpolationType.BEZIER : p.keyOutInterpolationType(k));
                    p.setTemporalEaseAtKey(k, inE, outE);
                    count += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return count ? "SUCCESS" : "ERR:Nothing to ease.";
    };
    // arg: "x1,y1,x2,y2[;x1,y1,x2,y2...]|graphType" - a cubic-bezier curve applied between consecutive selected keyframes.
    F.applyFlowEase = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var left = String(arg), bar = left.lastIndexOf("|");
        if (bar >= 0) { left = left.substring(0, bar); }
        var rawSegs = left.split(";"), segs = [], i, j, d;
        for (i = 0; i < rawSegs.length; i += 1) {
            var txt = rawSegs[i].replace(/^[0-9.\-]+:/, ""), nums = txt.split(",");
            if (nums.length < 4) { continue; }
            var c = [parseFloat(nums[0]), parseFloat(nums[1]), parseFloat(nums[2]), parseFloat(nums[3])];
            if (isNaN(c[0]) || isNaN(c[1]) || isNaN(c[2]) || isNaN(c[3])) { continue; }
            c[0] = clamp(c[0], 0.001, 1); c[2] = clamp(c[2], 0, 0.999); // x must stay inside 0..1; y may overshoot
            segs.push(c);
        }
        if (!segs.length) { return "ERR:Invalid curve."; }
        var sel = selectedKeyProps(comp), applied = 0;
        if (!sel.length) { return "ERR:Select at least two keyframes first."; }
        app.beginUndoGroup("Flow Ease");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var p = sel[i].prop, ks = sel[i].keys.slice(0);
                if (ks.length === 1 && ks[0] < p.numKeys) { ks.push(ks[0] + 1); } // one key selected: ease its outgoing segment
                for (j = 0; j + 1 < ks.length; j += 1) {
                    var k0 = ks[j], k1 = ks[j + 1], cv = segs[segs.length > 1 ? Math.min(j, segs.length - 1) : 0];
                    var dt = p.keyTime(k1) - p.keyTime(k0);
                    if (dt <= 0) { continue; }
                    var v0 = p.keyValue(k0), v1 = p.keyValue(k1), n = dimsOfEase(p, k0);
                    var outArr = p.keyOutTemporalEase(k0), inArr = p.keyInTemporalEase(k1);
                    for (d = 0; d < n; d += 1) {
                        var dv = (p.isSpatial || typeof v0 === "number") ? magnitude(v0, v1) : (v1[d] - v0[d]);
                        var avg = dv / dt;
                        outArr[d] = new KeyframeEase((cv[1] / cv[0]) * avg, clamp(cv[0] * 100, 0.1, 100));
                        inArr[d] = new KeyframeEase(((1 - cv[3]) / (1 - cv[2])) * avg, clamp((1 - cv[2]) * 100, 0.1, 100));
                    }
                    p.setInterpolationTypeAtKey(k0, p.keyInInterpolationType(k0), KeyframeInterpolationType.BEZIER);
                    p.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, p.keyOutInterpolationType(k1));
                    p.setTemporalEaseAtKey(k0, p.keyInTemporalEase(k0), outArr);
                    p.setTemporalEaseAtKey(k1, inArr, p.keyOutTemporalEase(k1));
                    applied += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return applied ? "SUCCESS" : "ERR:Select at least two keyframes on the same property.";
    };

    // ---------- expression-based motion ----------
    var BOUNCE = "// Akira FX - inertial bounce (overshoot after each keyframe)\n" +
        "amp = 0.1; freq = 2.0; decay = 2.0;\n" +
        "n = 0;\n" +
        "if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n" +
        "if (n > 0) {\n" +
        "  t = time - key(n).time;\n" +
        "  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n" +
        "  value + v * amp * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n" +
        "} else { value }";
    var ELASTIC = "// Akira FX - elastic settle (damped spring from the incoming velocity)\n" +
        "freq = 3.0; decay = 5.0;\n" +
        "w = freq * 2 * Math.PI;\n" +
        "n = 0;\n" +
        "if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n" +
        "if (n > 0) {\n" +
        "  t = time - key(n).time;\n" +
        "  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n" +
        "  value + v * Math.sin(w * t) / w * Math.exp(-decay * t);\n" +
        "} else { value }";
    F.applyBounce = function () { var g = H.locked(); return g ? g : applyExprToSelected(BOUNCE, "Apply Bounce"); };
    F.applyElastic = function () { var g = H.locked(); return g ? g : applyExprToSelected(ELASTIC, "Apply Elastic"); };

    // ---------- keyframe utilities ----------
    F.reverseKeyframes = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = selectedKeyProps(comp), i, j, done = 0;
        if (!sel.length) { return "ERR:Select keyframes in the timeline first."; }
        app.beginUndoGroup("Reverse Keyframes");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var p = sel[i].prop, ks = sel[i].keys;
                if (ks.length < 2) { continue; }
                var snaps = [];
                for (j = 0; j < ks.length; j += 1) { snaps.push(snapKey(p, ks[j])); }
                var tMin = snaps[0].time, tMax = snaps[snaps.length - 1].time;
                for (j = ks.length - 1; j >= 0; j -= 1) { p.removeKey(ks[j]); }
                for (j = 0; j < snaps.length; j += 1) { putKey(p, tMin + tMax - snaps[j].time, snaps[j], true); }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Select two or more keyframes on one property.";
    };
    // "loop": loop the animation forever with an expression. Anything else: duplicate the selected keyframes right after themselves.
    F.duplicateKeyframes = function (mode) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        if (String(mode) === "loop") { return applyExprToSelected('loopOut("cycle")', "Loop Keyframes"); }
        var sel = selectedKeyProps(comp), i, j, done = 0;
        if (!sel.length) { return "ERR:Select keyframes in the timeline first."; }
        app.beginUndoGroup("Duplicate Keyframes");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var p = sel[i].prop, ks = sel[i].keys, snaps = [];
                for (j = 0; j < ks.length; j += 1) { snaps.push(snapKey(p, ks[j])); }
                var span = snaps[snaps.length - 1].time - snaps[0].time + comp.frameDuration; // one frame gap so copies never land on originals
                if (span <= comp.frameDuration) { span = 1; }
                for (j = 0; j < snaps.length; j += 1) { putKey(p, snaps[j].time + span, snaps[j], false); }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Nothing to duplicate.";
    };
    // Move the selected keyframes so the first one sits at the layer's in point.
    F.repositionKeyframes = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var sel = selectedKeyProps(comp), i, j, done = 0;
        if (!sel.length) { return "ERR:Select keyframes in the timeline first."; }
        app.beginUndoGroup("Reposition Keyframes");
        try {
            for (i = 0; i < sel.length; i += 1) {
                var p = sel[i].prop, ks = sel[i].keys, L = layerOf(p);
                if (!L) { continue; }
                var snaps = [];
                for (j = 0; j < ks.length; j += 1) { snaps.push(snapKey(p, ks[j])); }
                var delta = L.inPoint - snaps[0].time;
                for (j = ks.length - 1; j >= 0; j -= 1) { p.removeKey(ks[j]); }
                for (j = 0; j < snaps.length; j += 1) { putKey(p, snaps[j].time + delta, snaps[j], false); }
                done += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? "SUCCESS" : "ERR:Nothing to move.";
    };
})();
