// Sougetsu Akira FX - "SaaS Effects" engine (clean-room, own designs). Contract read from client/js_flex/flex_saasfx.js:
//   $._flex.saasVersion (number, panel requires >= 9)
//   $._flexSaaS.<fn>("key=value;key=value") -> "SUCCESS:msg" / "ERR:msg"   (depthPrepare -> "OK:frame\tdepthOut\tready")
//   fn: stagger, depthPrepare, depthReveal, cursor, hover, textAnim, codeGlyphs, promptBar, halftoneWave, carousel,
//       attach, background, wipe.   Option keys/values are the panel's (see each function).
// Live-tweakable values sit on a named control null per effect, as the panel's hints describe.
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }
    F.saasVersion = 9;
    var S = $._flexSaaS = {};

    // ---------- helpers ----------
    function parse(s) {
        var o = {}, p = String(s || "").split(";"), i;
        for (i = 0; i < p.length; i += 1) { var k = p[i].indexOf("="); if (k > 0) { o[p[i].substring(0, k)] = p[i].substring(k + 1); } }
        return o;
    }
    function dec(v) { try { return decodeURIComponent(String(v || "")); } catch (e) { return String(v || ""); } }
    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function bool(v) { return String(v) === "true" || String(v) === "1"; }
    function esc(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n"); }
    function hex(h, d) { var v = String(h || "").replace("#", ""), n = parseInt(v, 16); if (isNaN(n) || v.length !== 6) { return d || [0, 1, 0.33]; } return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
    var PAL = {
        aurora: ["#0b1d3a", "#1fd1a5", "#6a5cff", "#0f2f4f"], violet: ["#1a0b2e", "#7b2cbf", "#c77dff", "#3c096c"],
        sunset: ["#2b0f3a", "#ff6b6b", "#ffb347", "#6a2c70"], ocean: ["#03122b", "#0077b6", "#48cae4", "#023e8a"],
        forest: ["#0b1f14", "#2d6a4f", "#95d5b2", "#1b4332"], mono: ["#0a0a0a", "#3a3a3a", "#9a9a9a", "#1c1c1c"],
        neon: ["#0a0014", "#ff00c8", "#00f0ff", "#3a00ff"], mint: ["#04140f", "#00ff9c", "#b9ffe4", "#0b3d2c"],
        paper: ["#f4f1ea", "#1c1c1c", "#6b6b6b", "#d9d4c7"], night: ["#05070d", "#8ab4ff", "#e6edff", "#1b2340"]
    };
    function palette(name, accent) { var p = PAL[name]; if (!p) { var a = accent || "#00ff55"; p = ["#050505", a, "#ffffff", "#111111"]; } return [hex(p[0]), hex(p[1]), hex(p[2]), hex(p[3])]; }
    function fx(L) { return L.property("ADBE Effect Parade"); }
    function ctl(L, mn, name, v) { var e = fx(L).addProperty(mn); e.name = name; if (v !== undefined) { e.property(1).setValue(v); } return e; }
    function control(comp, name) {
        var i; for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === name) { return comp.layer(i); } }
        var N = comp.layers.addNull(); N.name = name; N.label = 2; N.enabled = false; N.guideLayer = true;
        return N;
    }
    function setCtl(C, mn, name, v) { var p = fx(C).property(name); if (!p) { p = ctl(C, mn, name); } p.property(1).setValue(v); }
    function ease(p, k1, k2) { var k; for (k = k1; k <= k2; k += 1) { try { var dims = p.value instanceof Array && p.propertyValueType !== PropertyValueType.TwoD_SPATIAL && p.propertyValueType !== PropertyValueType.ThreeD_SPATIAL ? p.value.length : 1, a = [], d; for (d = 0; d < dims; d += 1) { a.push(new KeyframeEase(0, 70)); } p.setTemporalEaseAtKey(k, a, a); } catch (e) { } } }
    function key2(p, t0, v0, t1, v1) { p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1); ease(p, p.nearestKeyIndex(t0), p.nearestKeyIndex(t1)); }
    function center(L, t) { var r = H.sourceRect(L, t) || { left: 0, top: 0, width: 0, height: 0 }, o = H.offsetFromAnchor(L, [r.left + r.width / 2, r.top + r.height / 2], t), p = H.getPos(L, t); return [p[0] + o[0], p[1] + o[1]]; }
    function visual(comp) { var s = H.selectedLayers(comp), o = [], i; for (i = 0; i < s.length; i += 1) { if (!H.isCamOrLight(s[i])) { o.push(s[i]); } } return o; }
    function animated(p) { try { return p.numKeys > 0 || p.expressionEnabled; } catch (e) { return false; } }
    function run(title, args, fn) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var o = parse(args), r;
        app.beginUndoGroup(title);
        try { r = fn(comp, o); } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return r;
    }
    function textLayer(comp, txt, size, color, just) {
        var T = comp.layers.addText(txt), td = T.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value;
        d.fontSize = size; d.fillColor = color || [1, 1, 1]; d.applyFill = true; d.applyStroke = false;
        d.justification = just || ParagraphJustification.CENTER_JUSTIFY; td.setValue(d);
        return T;
    }
    function solid(comp, c, name, w, h) { return comp.layers.addSolid(c, name, w || comp.width, h || comp.height, comp.pixelAspect, comp.duration); }

    // ---------- UI Stagger: order top|left|stack|random, style rise|pop|bounce|scale|blur|fade ----------
    S.stagger = function (args) {
        return run("Akira UI Stagger", args, function (comp, o) {
            var L = visual(comp), t0 = comp.time, i;
            if (!L.length) { return "ERR:Select the layers to reveal."; }
            var order = o.order || "top";
            if (order === "top") { L.sort(function (a, b) { return center(a, t0)[1] - center(b, t0)[1]; }); }
            else if (order === "left") { L.sort(function (a, b) { return center(a, t0)[0] - center(b, t0)[0]; }); }
            else if (order === "random") { var seed = 11; L.sort(function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; }); }
            else { L.sort(function (a, b) { return a.index - b.index; }); }
            var style = o.style || "rise", delay = num(o.delay, 0.08), dur = Math.max(0.05, num(o.duration, 0.6)), rise = num(o.rise, 40), live = bool(o.controller);
            var C = null;
            if (live) { C = control(comp, "Akira UI Stagger"); setCtl(C, "ADBE Slider Control", "Delay", delay); setCtl(C, "ADBE Slider Control", "Duration", dur); }
            var done = 0;
            for (i = 0; i < L.length; i += 1) {
                var Lr = L[i], tr = Lr.transform, st = t0 + i * delay;
                var k = live ? "const C=thisComp.layer(\"Akira UI Stagger\"),t0=" + t0 + "+" + i + "*C.effect(\"Delay\")(1),u=C.effect(\"Duration\")(1);\nconst k=ease(time,t0,t0+u,0,1);\n" : null;
                var touched = false;
                if (!animated(tr.opacity) && style !== "pop" && style !== "bounce") {
                    if (live) { tr.opacity.expression = k + "value*k"; } else { key2(tr.opacity, st, 0, st + dur, tr.opacity.value); }
                    touched = true;
                }
                if ((style === "rise" || style === "bounce") && !animated(tr.position) && !tr.position.dimensionsSeparated) {
                    var p = tr.position.value, from = p.slice(0); from[1] += rise;
                    if (live) { tr.position.expression = k + (style === "bounce" ? "const b=k<1?Math.sin(k*Math.PI*1.5)*" + (rise * 0.25) + ":0;" : "const b=0;") + "value+[0,(1-k)*" + rise + "-b" + (p.length > 2 ? ",0" : "") + "]"; }
                    else { key2(tr.position, st, from, st + dur, p); if (style === "bounce") { tr.position.setValueAtTime(st + dur * 0.7, [p[0], p[1] - rise * 0.25].concat(p.length > 2 ? [p[2]] : [])); } }
                    touched = true;
                }
                if ((style === "pop" || style === "scale") && !animated(tr.scale)) {
                    var s = tr.scale.value, s0 = style === "pop" ? 0 : 80, z = [];
                    var j; for (j = 0; j < s.length; j += 1) { z.push(s[j] * s0 / 100); }
                    if (live) { tr.scale.expression = k + (style === "pop" ? "const m=k<0.7?linear(k,0,0.7,0,1.1):linear(k,0.7,1,1.1,1);" : "const m=linear(k,0,1,0.8,1);") + "value*m"; }
                    else { key2(tr.scale, st, z, st + dur, s); if (style === "pop") { var over = []; for (j = 0; j < s.length; j += 1) { over.push(s[j] * 1.1); } tr.scale.setValueAtTime(st + dur * 0.7, over); } }
                    touched = true;
                }
                if (style === "blur") {
                    var bl = fx(Lr).addProperty("ADBE Gaussian Blur 2").property(1);
                    if (live) { bl.expression = k + "(1-k)*30"; } else { key2(bl, st, 30, st + dur, 0); }
                    touched = true;
                }
                if (touched) { done += 1; }
            }
            return done ? "SUCCESS:Staggered " + done + " layer" + (done === 1 ? "" : "s") + "." : "ERR:Those layers already animate these properties.";
        });
    };

    // ---------- Depth Reveal ----------
    S.depthPrepare = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp(); if (!comp) { return "ERR:Open a composition first."; }
        var stamp = new Date().getTime(), dir = Folder.temp.fullName;
        var frame = dir + "/akira_depth_" + stamp + ".png", out = dir + "/akira_depth_" + stamp + "_map.png";
        try { comp.saveFrameToPng(comp.time, new File(frame)); } catch (e) { return "ERR:Could not render the frame: " + e.toString(); }
        return "OK:" + frame + "\t" + out + "\t0";
    };
    // source ai (map=file from the depth scan) | gradient; look gradient|fog|blur; io out (depth->photo) | in; palette; style sweep|focus;
    // farFirst; soft; direction bottom|top|left|right|center; duration; blur; push; zoom; slide; parX; parY; sway
    S.depthReveal = function (args) {
        return run("Akira Depth Reveal", args, function (comp, o) {
            var sel = visual(comp), T = sel.length ? sel[0] : null, t0 = comp.time, dur = Math.max(0.1, num(o.duration, 1.5)), i;
            if (!T) { return "ERR:Select the photo or video layer to reveal."; }
            var depth;
            if (o.map && new File(o.map).exists) {
                depth = comp.layers.add(app.project.importFile(new ImportOptions(new File(o.map))));
                depth.name = "Depth Map"; var sw = comp.width / depth.source.width * 100, sh = comp.height / depth.source.height * 100; depth.transform.scale.setValue([sw, sh]);
                depth.transform.position.setValue([comp.width / 2, comp.height / 2]);
            } else {
                depth = solid(comp, [0, 0, 0], "Depth Map");
                var ramp = fx(depth).addProperty("ADBE Ramp"), d = o.direction || "bottom", W = comp.width, Hh = comp.height;
                var a = d === "top" ? [[W / 2, 0], [W / 2, Hh]] : d === "left" ? [[0, Hh / 2], [W, Hh / 2]] : d === "right" ? [[W, Hh / 2], [0, Hh / 2]] : [[W / 2, Hh], [W / 2, 0]];
                ramp.property(1).setValue(a[0]); ramp.property(3).setValue(a[1]);
                if (d === "center") { ramp.property(1).setValue([W / 2, Hh / 2]); ramp.property(3).setValue([W, Hh]); ramp.property(5).setValue(2); }
                ramp.property(2).setValue([1, 1, 1]); ramp.property(4).setValue([0, 0, 0]);
            }
            depth.enabled = false; depth.comment = "AKIRA_DEPTH_MAP"; depth.moveBefore(T);
            var look = o.look || "gradient", over;
            if (look === "blur") {
                over = solid(comp, [1, 1, 1], "Depth Reveal · Blur"); over.adjustmentLayer = true;
                fx(over).addProperty("ADBE Gaussian Blur 2").property(1).setValue(Math.max(20, num(o.blur, 0) || 60));
            } else if (look === "fog") {
                over = solid(comp, [1, 1, 1], "Depth Reveal · Fog");
            } else {
                over = solid(comp, [0, 0, 0], "Depth Reveal · Gradient");
                var p = palette(o.palette || "sunset", o.accent), g4 = fx(over).addProperty("ADBE 4ColorGradient");
                try { g4.property(2).setValue(p[1]); g4.property(4).setValue(p[2]); g4.property(6).setValue(p[3]); g4.property(8).setValue(p[0]); } catch (eG) { }
            }
            over.moveBefore(T);
            var gw = fx(over).addProperty("ADBE Gradient Wipe");
            gw.property(3).setValue(depth.index); // Gradient Layer
            gw.property(2).setValue(Math.max(0, Math.min(100, num(o.soft, 25)))); // Transition Softness
            gw.property(5).setValue(bool(o.farFirst) ? 1 : 0); // Invert Gradient
            var tc = gw.property(1), out = (o.io || "out") === "out";
            key2(tc, t0, out ? 0 : 100, t0 + dur, out ? 100 : 0);
            if (num(o.push, 0) || num(o.zoom, 0)) {
                var sc = T.transform.scale, sv = sc.value, z = 1 + (num(o.push, 0) + num(o.zoom, 0)) / 100, big = [];
                for (i = 0; i < sv.length; i += 1) { big.push(sv[i] * z); }
                if (!animated(sc)) { key2(sc, t0, sv, t0 + dur + 1, big); }
            }
            if (num(o.slide, 0) && !animated(T.transform.position) && !T.transform.position.dimensionsSeparated) {
                var pv = T.transform.position.value, to = pv.slice(0); to[0] += num(o.slide, 0);
                key2(T.transform.position, t0, pv, t0 + dur + 1, to);
            }
            if (num(o.parX, 0) || num(o.parY, 0) || num(o.sway, 0)) {
                var dm = fx(T).addProperty("ADBE Displacement Map");
                dm.property(1).setValue(depth.index);
                dm.property(3).expression = "linear(time," + t0 + "," + (t0 + dur + 1) + ",0," + num(o.parX, 0) + ")+Math.sin(time*2)*" + num(o.sway, 0);
                dm.property(5).expression = "linear(time," + t0 + "," + (t0 + dur + 1) + ",0," + num(o.parY, 0) + ")";
            }
            return "SUCCESS:Depth reveal built" + (o.map ? " from the AI depth map." : " from a gradient.");
        });
    };

    // ---------- 3D Cursor ----------
    function cursorPath(style, s) {
        if (style === "dot") { return null; }
        if (style === "hand") { return [[0, 0], [0, 22 * s], [5 * s, 17 * s], [9 * s, 26 * s], [13 * s, 24 * s], [9 * s, 15 * s], [16 * s, 15 * s]]; }
        return [[0, 0], [0, 24 * s], [6 * s, 18 * s], [10 * s, 27 * s], [14 * s, 25 * s], [10 * s, 16 * s], [18 * s, 16 * s]];
    }
    S.cursor = function (args) {
        return run("Akira 3D Cursor", args, function (comp, o) {
            var tg = visual(comp), t0 = comp.time, i;
            if (!tg.length) { return "ERR:Select the layers the cursor should click."; }
            if (o.order === "bottom") { tg.sort(function (a, b) { return b.index - a.index; }); }
            else if (o.order === "position") { tg.sort(function (a, b) { return center(a, t0)[1] - center(b, t0)[1]; }); }
            else { tg.sort(function (a, b) { return a.index - b.index; }); }
            var travel = Math.max(0.1, num(o.travel, 0.7)), hold = Math.max(0.05, num(o.hold, 0.5)), sz = num(o.size, 100) * comp.width / 1920 / 100 * 1.6;
            var C = control(comp, "Akira Cursor Control");
            setCtl(C, "ADBE Slider Control", "Size", num(o.size, 100)); setCtl(C, "ADBE Slider Control", "Click Depth", num(o.click, 16));
            setCtl(C, "ADBE Checkbox Control", "Tilt", bool(o.tilt) ? 1 : 0); setCtl(C, "ADBE Checkbox Control", "Ripple", bool(o.ripple) ? 1 : 0);
            setCtl(C, "ADBE Color Control", "Fill", hex(o.fill, [1, 1, 1])); setCtl(C, "ADBE Color Control", "Stroke", hex(o.stroke, [0.07, 0.07, 0.07]));
            var K = comp.layers.addShape(); K.name = "Akira Cursor";
            var grp = K.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group"), pts = cursorPath(o.style, sz);
            if (pts) { var shp = new Shape(), z = [], q; for (q = 0; q < pts.length; q += 1) { z.push([0, 0]); } shp.vertices = pts; shp.inTangents = z; shp.outTangents = z; shp.closed = true; grp.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(shp); }
            else { grp.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([28 * sz, 28 * sz]); }
            var fl = grp.addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").expression = "thisComp.layer(\"Akira Cursor Control\").effect(\"Fill\")(1)";
            var st = grp.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").expression = "thisComp.layer(\"Akira Cursor Control\").effect(\"Stroke\")(1)";
            st.property("ADBE Vector Stroke Width").setValue(2);
            K.transform.anchorPoint.setValue([0, 0]);
            K.transform.scale.expression = "const C=thisComp.layer(\"Akira Cursor Control\");const s=C.effect(\"Size\")(1)/100;value*s";
            if (bool(o.shadow)) { var ds = fx(K).addProperty("ADBE Drop Shadow"); try { ds.property(2).setValue(45); ds.property(5).setValue(12); } catch (eD) { } }
            var pos = K.transform.position, sc = K.transform.scale, rot = K.transform.rotation, t = t0, start = [comp.width * 0.85, comp.height * 0.9];
            pos.setValueAtTime(t, start);
            var clicks = [];
            for (i = 0; i < tg.length; i += 1) {
                t += travel; pos.setValueAtTime(t, center(tg[i], t)); clicks.push(t); t += hold; pos.setValueAtTime(t, center(tg[i], t));
            }
            ease(pos, 1, pos.numKeys);
            if (bool(o.tilt)) { rot.expression = "const v=velocity;clamp(v[0]/80,-12,12)"; }
            if (bool(o.press)) {
                sc.expression = "const C=thisComp.layer(\"Akira Cursor Control\");const s=C.effect(\"Size\")(1)/100, d=C.effect(\"Click Depth\")(1)/100;\n" +
                    "const T=[" + clicks.join(",") + "];let m=1;for(const c of T){const k=time-c;if(k>=0&&k<0.25)m=1-d*Math.sin(k/0.25*Math.PI);}\nvalue*s*m";
            }
            if (bool(o.ripple)) {
                for (i = 0; i < clicks.length; i += 1) {
                    var R = comp.layers.addShape(); R.name = "Cursor Ripple " + (i + 1); R.moveAfter(K);
                    var rg = R.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
                    var el = rg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size");
                    var rs = rg.addProperty("ADBE Vector Graphic - Stroke"); rs.property("ADBE Vector Stroke Color").setValue([1, 1, 1]); rs.property("ADBE Vector Stroke Width").setValue(3);
                    R.transform.position.setValue(center(tg[i], clicks[i]));
                    key2(el, clicks[i], [0, 0], clicks[i] + 0.5, [90 * sz, 90 * sz]);
                    key2(R.transform.opacity, clicks[i], 100, clicks[i] + 0.5, 0);
                    R.inPoint = clicks[i]; R.outPoint = clicks[i] + 0.55;
                }
            }
            return "SUCCESS:Cursor clicks " + tg.length + " layer" + (tg.length === 1 ? "" : "s") + ".";
        });
    };

    // ---------- Proximity Hover ----------
    S.hover = function (args) {
        return run("Akira Proximity Hover", args, function (comp, o) {
            var L = visual(comp), i;
            if (!L.length) { return "ERR:Select the buttons or cards."; }
            var pointer = null;
            for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === "Akira Cursor") { pointer = comp.layer(i); } }
            if (!pointer) { pointer = comp.layers.addNull(); pointer.name = "Hover Pointer"; pointer.transform.position.setValue([comp.width / 2, comp.height / 2]); }
            var C = control(comp, "Akira Hover Control");
            setCtl(C, "ADBE Slider Control", "Radius", num(o.radius, 260)); setCtl(C, "ADBE Slider Control", "Lift", num(o.lift, 14));
            setCtl(C, "ADBE Slider Control", "Grow", num(o.grow, 6));
            setCtl(C, "ADBE Layer Control", "Pointer", pointer.index);
            var W = "const C=thisComp.layer(\"Akira Hover Control\");let P;try{P=C.effect(\"Pointer\")(1);}catch(e){P=null;}\n" +
                "const pp=P?P.toComp(P.anchorPoint):[0,0];const d=length(pp,toComp(anchorPoint));const w=P?ease(d,0,Math.max(1,C.effect(\"Radius\")(1)),1,0):0;\n";
            for (i = 0; i < L.length; i += 1) {
                var tr = L[i].transform;
                if (!tr.position.dimensionsSeparated) { tr.position.expression = W + "value-[0,w*C.effect(\"Lift\")(1)" + (L[i].threeDLayer ? ",0" : "") + "]"; }
                tr.scale.expression = W + "value.map((v,i)=>i<2?v*(1+w*C.effect(\"Grow\")(1)/100):v)";
                if (bool(o.shadow)) {
                    var ds = fx(L[i]).addProperty("ADBE Drop Shadow"); ds.name = "Hover Shadow";
                    try { ds.property(2).expression = W + "40+w*50"; ds.property(4).expression = W + "4+w*C.effect(\"Lift\")(1)"; ds.property(5).expression = W + "10+w*30"; } catch (eS) { }
                }
            }
            return "SUCCESS:" + L.length + " layer" + (L.length === 1 ? "" : "s") + " now react to " + pointer.name + ".";
        });
    };

    // ---------- Text Animations: letters|words|color|scramble|typing|colortype ----------
    function animator(T, name) {
        var a = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator"); a.name = name;
        var sel = a.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        return { props: a.property("ADBE Text Animator Properties"), sel: sel };
    }
    function basedOn(sel, v) { try { sel.property("ADBE Text Range Advanced").property("ADBE Text Range Type2").setValue(v); } catch (e) { } }
    S.textAnim = function (args) {
        return run("Akira Text Animation", args, function (comp, o) {
            var sel = H.selectedLayers(comp), T = [], i, mode = o.mode || "letters", t0 = comp.time, dur = Math.max(0.1, num(o.duration, 0.8));
            for (i = 0; i < sel.length; i += 1) { if (sel[i] instanceof TextLayer) { T.push(sel[i]); } }
            if (!T.length) { return "ERR:Select one or more text layers."; }
            var cps = Math.max(1, num(o.cps, 14)), color = hex(o.color, [0, 1, 0.33]), caret = bool(o.caret);
            for (i = 0; i < T.length; i += 1) {
                var L = T[i], a;
                if (mode === "letters" || mode === "words") {
                    a = animator(L, "Akira " + mode);
                    a.props.addProperty("ADBE Text Opacity").setValue(0);
                    a.props.addProperty("ADBE Text Position 3D").setValue([0, num(o.rise, 40), 0]);
                    if (mode === "words") { basedOn(a.sel, 3); }
                    key2(a.sel.property("ADBE Text Percent Start"), t0, 0, t0 + dur, 100);
                } else if (mode === "color") {
                    a = animator(L, "Akira colour sweep");
                    a.props.addProperty("ADBE Text Fill Color").setValue(color);
                    key2(a.sel.property("ADBE Text Percent End"), t0, 0, t0 + dur, 100);
                } else if (mode === "scramble") {
                    a = animator(L, "Akira scramble");
                    a.props.addProperty("ADBE Text Character Offset").setValue(20);
                    try { a.sel.property("ADBE Text Range Advanced").property("ADBE Text Randomize Order").setValue(1); } catch (eR) { }
                    key2(a.sel.property("ADBE Text Percent Start"), t0, 0, t0 + dur, 100);
                } else if (mode === "typing" || mode === "colortype") {
                    L.property("ADBE Text Properties").property("ADBE Text Document").expression =
                        "// akira-typing\nconst s=String(value.text!==undefined?value.text:value);const n=clamp(Math.floor((time-" + t0 + ")*" + cps + "),0,s.length);\n" +
                        "const c=" + (caret ? "(n<s.length||Math.floor(time*2)%2===0)?\"|\":\"\"" : "\"\"") + ";\ns.substr(0,n)+c";
                    if (mode === "colortype") {
                        a = animator(L, "Akira colour typing");
                        a.props.addProperty("ADBE Text Fill Color").setValue(color);
                        a.sel.property("ADBE Text Percent Start").expression = "clamp(Math.floor((time-" + t0 + ")*" + cps + ")/Math.max(1,String(text.sourceText).length)*100,0,100)";
                    }
                } else { return "ERR:Unknown text mode: " + mode; }
            }
            return "SUCCESS:" + mode + " animation on " + T.length + " text layer" + (T.length === 1 ? "" : "s") + ".";
        });
    };

    // ---------- Code Glyphs template ----------
    S.codeGlyphs = function (args) {
        return run("Akira Code Glyphs", args, function (comp, o) {
            var dur = Math.max(1, num(o.duration, 8)), W = comp.width, Hh = comp.height, p = palette(o.palette || "mint", dec(o.accent)), i;
            var cg = app.project.items.addComp("Akira Code Glyphs", W, Hh, comp.pixelAspect, dur, comp.frameRate);
            var fs = Math.round(Hh * 0.06);
            if (o.bg === undefined || bool(o.bg)) { solid(cg, p[0], "Background"); }
            var head = textLayer(cg, dec(o.text) || "Akira Ecosystem", fs, p[2]); head.name = "Headline Text";
            head.property("ADBE Text Properties").property("ADBE Text Document").expression =
                "// akira-glyphs: \"|\" starts the next phrase, words build up one by one\nconst ph=String(value.text!==undefined?value.text:value).split(\"|\"),seg=" + dur + "/Math.max(1,ph.length);\n" +
                "const k=Math.min(ph.length-1,Math.floor(time/seg)),w=ph[k].trim().split(/\\s+/),n=Math.min(w.length,1+Math.floor((time-k*seg)/(seg*0.6/w.length)));\n\"< \"+w.slice(0,n).join(\" \")+\" >\"";
            head.transform.position.setValue([W / 2, Hh / 2]);
            var gl = textLayer(cg, dec(o.glyphs) || "/ < > * - |", Math.round(fs * 0.6), p[1]); gl.name = "Glyph Set"; gl.enabled = false;
            var count = Math.max(1, Math.min(120, Math.round(num(o.count, 28)))), rate = Math.max(0.5, num(o.rate, 6)), dens = num(o.density, 55);
            for (i = 0; i < count; i += 1) {
                var g = textLayer(cg, "/", Math.round(fs * (0.4 + (i % 5) * 0.12)), p[1]); g.name = "Glyph " + (i + 1);
                g.property("ADBE Text Properties").property("ADBE Text Document").expression =
                    "const set=String(thisComp.layer(\"Glyph Set\").text.sourceText).split(/\\s+/).filter(s=>s);seedRandom(" + i + "+Math.floor(time*" + rate + "),true);set.length?set[Math.floor(random(set.length))]:\"/\"";
                g.transform.position.expression = "seedRandom(" + (i * 7 + 3) + ",true);[random(thisComp.width),random(thisComp.height)]";
                g.transform.opacity.expression = "seedRandom(" + i + "+Math.floor(time*" + rate + "),true);random(100)<" + dens + "?random(30,90):0";
            }
            if (bool(o.codeOn) && dec(o.code)) {
                var code = textLayer(cg, dec(o.code), Math.round(fs * 0.35), p[1], ParagraphJustification.LEFT_JUSTIFY); code.name = "Code Lines";
                code.transform.position.setValue([W * 0.06, Hh * 0.12]); code.transform.opacity.setValue(45);
                code.property("ADBE Text Properties").property("ADBE Text Document").expression = "const s=String(value.text!==undefined?value.text:value);s.substr(0,clamp(Math.floor(time*40),0,s.length))";
            }
            head.moveToBeginning();
            var L = comp.layers.add(cg); L.startTime = comp.time;
            return "SUCCESS:Code Glyphs template added at the playhead (edit it inside \"Akira Code Glyphs\").";
        });
    };

    // ---------- AI Prompt Bar template ----------
    S.promptBar = function (args) {
        return run("Akira Prompt Bar", args, function (comp, o) {
            var W = comp.width, Hh = comp.height, acc = hex(dec(o.accent), [0, 1, 0.33]), cps = Math.max(1, num(o.cps, 16));
            var txt = dec(o.text) || "create a landing page for my business", hint = dec(o.placeholder) || "Ask anything...";
            var dur = Math.max(4, 1 + txt.length / cps + 2), pc = app.project.items.addComp("Akira Prompt Bar", W, Hh, comp.pixelAspect, dur, comp.frameRate);
            var bw = Math.round(W * 0.62), bh = Math.round(Hh * 0.11), cx = W / 2, cy = Hh / 2, fs = Math.round(bh * 0.32);
            var C = pc.layers.addNull(); C.name = "Prompt Control"; C.enabled = false;
            ctl(C, "ADBE Slider Control", "Characters per second", cps); ctl(C, "ADBE Color Control", "Accent", acc);
            var bar = pc.layers.addShape(); bar.name = "Prompt Pill";
            var g = bar.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            var rc = g.addProperty("ADBE Vector Shape - Rect"); rc.property("ADBE Vector Rect Size").setValue([bw, bh]); rc.property("ADBE Vector Rect Roundness").setValue(bh / 2);
            var f = g.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue([1, 1, 1]); f.property("ADBE Vector Fill Opacity").setValue(10);
            var st = g.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").expression = "thisComp.layer(\"Prompt Control\").effect(\"Accent\")(1)"; st.property("ADBE Vector Stroke Width").setValue(2);
            bar.transform.position.setValue([cx, cy]);
            key2(bar.transform.scale, 0, [60, 60], 0.45, [100, 100]); key2(bar.transform.opacity, 0, 0, 0.3, 100);
            var hintL = textLayer(pc, hint, fs, [1, 1, 1], ParagraphJustification.LEFT_JUSTIFY); hintL.name = "Placeholder";
            hintL.transform.position.setValue([cx - bw / 2 + bh * 0.5, cy + fs * 0.35]); hintL.transform.opacity.setValue(40);
            key2(hintL.transform.opacity, 0.6, 40, 0.9, 0);
            var typed = textLayer(pc, txt, fs, [1, 1, 1], ParagraphJustification.LEFT_JUSTIFY); typed.name = "Prompt Text";
            typed.transform.position.setValue([cx - bw / 2 + bh * 0.5, cy + fs * 0.35]);
            typed.property("ADBE Text Properties").property("ADBE Text Document").expression =
                "const s=String(value.text!==undefined?value.text:value),c=thisComp.layer(\"Prompt Control\").effect(\"Characters per second\")(1),n=clamp(Math.floor((time-0.9)*c),0,s.length);\ns.substr(0,n)+((n<s.length||Math.floor(time*2)%2===0)?\"|\":\"\")";
            var typeEnd = 0.9 + txt.length / cps, i;
            for (i = 0; i < 4; i += 1) {
                var m = pc.layers.addShape(); m.name = "Mic Bar " + (i + 1);
                var mg = m.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
                var mr = mg.addProperty("ADBE Vector Shape - Rect"); mr.property("ADBE Vector Rect Size").setValue([bh * 0.06, bh * 0.4]); mr.property("ADBE Vector Rect Roundness").setValue(bh);
                mg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").expression = "thisComp.layer(\"Prompt Control\").effect(\"Accent\")(1)";
                m.transform.position.setValue([cx + bw / 2 - bh * 1.9 + i * bh * 0.13, cy]);
                m.transform.scale.expression = "const on=time>0.9&&time<" + typeEnd + ";[100,on?30+Math.abs(Math.sin(time*9+" + i + "))*90:30]";
            }
            var send = pc.layers.addShape(); send.name = "Send Button";
            var sg = send.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
            sg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([bh * 0.7, bh * 0.7]);
            sg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").expression = "thisComp.layer(\"Prompt Control\").effect(\"Accent\")(1)";
            send.transform.position.setValue([cx + bw / 2 - bh * 0.6, cy]);
            send.transform.scale.setValueAtTime(typeEnd + 0.2, [100, 100]); send.transform.scale.setValueAtTime(typeEnd + 0.32, [82, 82]); send.transform.scale.setValueAtTime(typeEnd + 0.5, [100, 100]);
            ease(send.transform.scale, 1, 3);
            var L = comp.layers.add(pc); L.startTime = comp.time;
            return "SUCCESS:Prompt bar added at the playhead (edit it inside \"Akira Prompt Bar\").";
        });
    };

    // ---------- Halftone Wave ----------
    S.halftoneWave = function (args) {
        return run("Akira Halftone Wave", args, function (comp, o) {
            var sel = visual(comp), src = sel.length ? sel[0] : null, t0 = comp.time, sc = comp.height / 1080, i;
            var c = src ? center(src, t0) : [comp.width / 2, comp.height / 2], col = hex(o.color, [0, 1, 0.33]);
            var waves = Math.max(1, Math.min(3, Math.round(num(o.waves, 1)))), dur = Math.max(0.2, num(o.duration, 1)), gap = num(o.interval, 0.35);
            var ringW = num(o.ring, 150) * sc, soft = num(o.softness, 50), reach = Math.sqrt(comp.width * comp.width + comp.height * comp.height);
            var ring = comp.layers.addShape(); ring.name = "Halftone Wave Ring";
            for (i = 0; i < waves; i += 1) {
                var g = ring.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name = "Wave " + (i + 1);
                var cg = g.property("ADBE Vectors Group"), el = cg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size");
                var st = cg.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]); st.property("ADBE Vector Stroke Width").setValue(ringW);
                var a = t0 + i * gap; key2(el, a, [0, 0], a + dur, [reach * 2, reach * 2]);
                key2(st.property("ADBE Vector Stroke Opacity"), a + dur * 0.6, 100, a + dur, 0);
            }
            ring.transform.position.setValue(c);
            if (soft > 0) { fx(ring).addProperty("ADBE Gaussian Blur 2").property(1).setValue(soft * sc); }
            var dots = solid(comp, col, "Halftone Wave Dots");
            var ba = fx(dots).addProperty("CC Ball Action");
            try { ba.property("Grid Spacing").setValue(Math.max(2, Math.round(num(o.spacing, 22) * sc))); ba.property("Ball Size").setValue(num(o.dot, 45)); } catch (eB) { }
            if (num(o.distortion, 0)) { var td = fx(dots).addProperty("ADBE Turbulent Displace"); td.property(2).setValue(num(o.distortion, 60) * 0.3); }
            if (bool(o.glow)) { fx(dots).addProperty("ADBE Glo2"); }
            ring.moveBefore(dots);
            if (typeof dots.setTrackMatte === "function") { dots.setTrackMatte(ring, TrackMatteType.LUMA); ring.enabled = false; }
            else { dots.trackMatteType = TrackMatteType.LUMA; }
            if (src && (o.clip || "inside") === "inside") {
                var sm = fx(dots).addProperty("ADBE Set Matte3"); sm.property(1).setValue(src.index);
            } else if (src) { dots.moveAfter(src); ring.moveBefore(dots); }
            dots.inPoint = t0; dots.outPoint = t0 + (waves - 1) * gap + dur + comp.frameDuration;
            ring.inPoint = dots.inPoint; ring.outPoint = dots.outPoint;
            return "SUCCESS:Halftone wave from " + (src ? src.name : "the comp centre") + ".";
        });
    };

    // ---------- UI Carousel (cards slide through, focus card full size) ----------
    S.carousel = function (args) {
        return run("Akira UI Carousel", args, function (comp, o) {
            var L = visual(comp), t0 = comp.time, i;
            if (L.length < 2) { return "ERR:Select two or more cards (left to right is the order)."; }
            L.sort(function (a, b) { return center(a, t0)[0] - center(b, t0)[0]; });
            var C = control(comp, "Akira Carousel Control");
            C.enabled = true; C.guideLayer = false; C.transform.position.setValue([comp.width / 2, comp.height / 2]);
            setCtl(C, "ADBE Slider Control", "Hold", num(o.hold, 1)); setCtl(C, "ADBE Slider Control", "Move", num(o.move, 0.6));
            setCtl(C, "ADBE Slider Control", "Gap", num(o.gap, 40)); setCtl(C, "ADBE Slider Control", "Focus Scale", num(o.focus, 100));
            setCtl(C, "ADBE Slider Control", "Side Scale", num(o.side, 82)); setCtl(C, "ADBE Slider Control", "Side Opacity", num(o.sideOpacity, 45));
            setCtl(C, "ADBE Checkbox Control", "Loop", bool(o.loop === undefined ? true : o.loop) ? 1 : 0);
            var w = 0; for (i = 0; i < L.length; i += 1) { var r = H.sourceRect(L[i], t0); if (r) { w = Math.max(w, r.width * L[i].transform.scale.value[0] / 100); } }
            var pre = "const C=thisComp.layer(\"Akira Carousel Control\"),g=k=>C.effect(k)(1);\nconst N=" + L.length + ",I=__I__,cyc=Math.max(0.01,g(\"Hold\")+g(\"Move\"));\n" +
                "const t=Math.max(0,time-" + t0 + "),b=Math.floor(t/cyc),f=ease(t-b*cyc,g(\"Hold\"),cyc,0,1);let s=b+f;\n" +
                "let d=I-s;if(g(\"Loop\")>0){d=((d%N)+N)%N;if(d>N/2)d-=N;}else{s=Math.min(s,N-1);d=I-s;}\n";
            for (i = 0; i < L.length; i += 1) {
                var tr = L[i].transform, p = pre.replace("__I__", String(i));
                if (!tr.position.dimensionsSeparated) { tr.position.expression = p + "const c=C.toComp(C.anchorPoint);[c[0]+d*(" + w + "+g(\"Gap\")),c[1]" + (L[i].threeDLayer ? ",value[2]" : "") + "]"; }
                tr.scale.expression = p + "const m=linear(Math.abs(d),0,1,g(\"Focus Scale\"),g(\"Side Scale\"))/100;value*m";
                tr.opacity.expression = p + "linear(Math.abs(d),0,1,100,g(\"Side Opacity\"))";
            }
            return "SUCCESS:Carousel of " + L.length + " cards - move it with \"Akira Carousel Control\".";
        });
    };

    // ---------- Attach Layer (follow without parenting) ----------
    S.attach = function (args) {
        return run("Akira Attach Layer", args, function (comp, o) {
            var sel = H.selectedLayers(comp), t0 = comp.time, i;
            if (sel.length < 2) { return "ERR:Select the layer to follow first, then the layers that stick to it."; }
            var lead = sel[0], n = '"' + esc(lead.name) + '"';
            for (i = 1; i < sel.length; i += 1) {
                var tr = sel[i].transform;
                if (!tr.position.dimensionsSeparated) { tr.position.expression = "// akira-attach\nconst L=thisComp.layer(" + n + ");value+L.toComp(L.anchorPoint)-L.toComp(L.anchorPoint," + t0 + ")"; }
                if (bool(o.rotation)) { tr.rotation.expression = "// akira-attach\nconst L=thisComp.layer(" + n + ");value+L.transform.rotation-L.transform.rotation.valueAtTime(" + t0 + ")"; }
                if (bool(o.scale)) { tr.scale.expression = "// akira-attach\nconst L=thisComp.layer(" + n + "),a=L.transform.scale,b=a.valueAtTime(" + t0 + ");value.map((v,i)=>i<2&&b[i]?v*a[i]/b[i]:v)"; }
            }
            return "SUCCESS:" + (sel.length - 1) + " layer" + (sel.length === 2 ? "" : "s") + " attached to " + lead.name + ".";
        });
    };

    // ---------- Background (four-colour drift | horizon | stars) ----------
    S.background = function (args) {
        return run("Akira Background", args, function (comp, o) {
            var p = palette(o.palette || "aurora", o.accent), sp = num(o.speed, 0.6), am = num(o.amount, 180), style = o.style || "drift";
            var B = solid(comp, p[0], "Akira Background"), W = comp.width, Hh = comp.height;
            var g4 = fx(B).addProperty("ADBE 4ColorGradient"), pts = [[W * 0.2, Hh * 0.2], [W * 0.8, Hh * 0.2], [W * 0.2, Hh * 0.8], [W * 0.8, Hh * 0.8]], i;
            ctl(B, "ADBE Slider Control", "Speed", sp); ctl(B, "ADBE Slider Control", "Amount", am);
            for (i = 0; i < 4; i += 1) {
                try {
                    g4.property(i * 2 + 1).setValue(pts[i]); g4.property(i * 2 + 2).setValue(p[i]);
                    if (style !== "horizon") { g4.property(i * 2 + 1).expression = "const s=effect(\"Speed\")(1),a=effect(\"Amount\")(1);value+[Math.sin(time*s+" + i * 1.7 + ")*a,Math.cos(time*s*0.8+" + i * 2.3 + ")*a]"; }
                } catch (eP) { }
            }
            if (style === "horizon") { try { g4.property(1).setValue([W / 2, -Hh * 0.2]); g4.property(3).setValue([W / 2, -Hh * 0.2]); g4.property(5).setValue([W * 0.1, Hh * 1.1]); g4.property(7).setValue([W * 0.9, Hh * 1.1]); } catch (eH) { } fx(B).addProperty("ADBE Glo2"); }
            if (style === "stars") { try { var sb = fx(B).addProperty("CC Star Burst"); sb.property("Speed").setValue(sp * 0.3); } catch (eS) { } }
            if (bool(o.grain)) { var nz = fx(B).addProperty("ADBE Noise"); nz.property(1).setValue(4); }
            var sel = visual(comp);
            if (bool(o.clip) && sel.length) { var sm = fx(B).addProperty("ADBE Set Matte3"); sm.property(1).setValue(sel[0].index); B.moveAfter(sel[0]); }
            else { B.moveToEnd(); }
            return "SUCCESS:Background added (" + style + ", " + (o.palette || "aurora") + ").";
        });
    };

    // ---------- Gradient Wipe (feathered directional reveal) ----------
    S.wipe = function (args) {
        return run("Akira Gradient Wipe", args, function (comp, o) {
            var L = visual(comp), t0 = comp.time, i;
            if (!L.length) { return "ERR:Select the layers to wipe on."; }
            var ang = { left: 90, right: 270, top: 180, bottom: 0 }[o.direction || "left"];
            if (ang === undefined) { ang = 90; }
            var dur = Math.max(0.05, num(o.duration, 0.8)), delay = num(o.delay, 0.1), fe = num(o.feather, 160);
            for (i = 0; i < L.length; i += 1) {
                var w = fx(L[i]).addProperty("ADBE Linear Wipe");
                w.property(2).setValue(ang); w.property(3).setValue(fe);
                key2(w.property(1), t0 + i * delay, 100, t0 + i * delay + dur, 0);
            }
            return "SUCCESS:Wipe on " + L.length + " layer" + (L.length === 1 ? "" : "s") + ".";
        });
    };
})();
