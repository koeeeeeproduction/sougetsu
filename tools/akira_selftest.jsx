// Sougetsu Akira FX - self-test for real After Effects (Windows/Mac).
// Run: After Effects > File > Scripts > Run Script File... > pick this file.
// It opens a NEW empty project (you'll be asked to save your current one first), builds scratch comps, calls every host
// function the panel uses with the panel's own argument formats, checks each reply, then evaluates every expression the
// tools created and reports expression errors. Report: Desktop\AkiraFX_selftest_report.txt (send that file back).
// ES3 only.
(function () {
    var REPORT = [], PASS = 0, FAIL = 0, SKIP = 0, T0 = new Date().getTime();
    function log(s) { REPORT.push(s); }
    function rec(status, name, detail) {
        if (status === "PASS") { PASS += 1; } else if (status === "SKIP") { SKIP += 1; } else { FAIL += 1; }
        log(status + "  " + name + (detail ? "  ->  " + String(detail).replace(/[\r\n]+/g, " ").substring(0, 400) : ""));
    }

    // ---------- 1. find + load the extension ----------
    var ext = null, cands = [], i;
    try { cands.push(Folder.userData.fullName + "/Adobe/CEP/extensions/com.sougetsu.akirafx"); } catch (e0) { }
    cands.push("C:/Program Files (x86)/Common Files/Adobe/CEP/extensions/com.sougetsu.akirafx");
    cands.push("C:/Program Files/Common Files/Adobe/CEP/extensions/com.sougetsu.akirafx");
    try { cands.push(Folder("~/Library/Application Support/Adobe/CEP/extensions/com.sougetsu.akirafx").fullName); } catch (e1) { }
    for (i = 0; i < cands.length; i += 1) { if (new File(cands[i] + "/host/akira_loader.jsx").exists) { ext = cands[i]; break; } }
    if (!ext) {
        var pick = Folder.selectDialog("Akira FX self-test: select the com.sougetsu.akirafx folder");
        if (pick && new File(pick.fullName + "/host/akira_loader.jsx").exists) { ext = pick.fullName; }
    }
    if (!ext) { alert("Akira FX self-test: could not find the extension folder (host/akira_loader.jsx)."); return; }
    if (app.project && app.project.numItems > 0 && !confirm("The self-test opens a NEW empty project.\nSave your current project first if needed.\n\nContinue?")) { return; }
    app.newProject();

    log("Sougetsu Akira FX self-test");
    log("After Effects " + app.version + " (build " + app.buildName + ")   OS: " + $.os + "   ExtendScript " + $.version);
    log("Extension: " + ext);
    log("Date: " + new Date().toString());
    log("");
    try { app.beginSuppressDialogs(); } catch (eS) { }
    try { $.evalFile(new File(ext + "/host/akira_loader.jsx")); } catch (eL) { rec("FAIL", "load akira_loader.jsx", eL.toString() + " line " + eL.line); }
    if (typeof $._flex === "undefined" || !$._flex._h) { rec("FAIL", "host engine loaded", "$._flex._h missing - stopping"); return finish(); }
    var F = $._flex, H = F._h, G = $.global, wasLocked = F.isLocked;
    F.isLocked = false; // test only; restored at the end
    var nF = 0, k; for (k in F) { if (F.hasOwnProperty(k) && typeof F[k] === "function") { nF += 1; } }
    log("$._flex functions loaded: " + nF + "   saasVersion=" + F.saasVersion + " highlighterVersion=" + F.highlighterVersion + " flexMapEngineVersion=" + F.flexMapEngineVersion);
    log("");

    // ---------- helpers ----------
    var comps = [];
    function newComp(name) {
        var c = app.project.items.addComp("ST " + name, 1920, 1080, 1, 10, 25);
        comps.push(c); c.openInViewer(); c.time = 1;
        return c;
    }
    function deselect(c) { var j; for (j = 1; j <= c.numLayers; j += 1) { c.layer(j).selected = false; } }
    function sel(c, layers) { deselect(c); var j; for (j = 0; j < layers.length; j += 1) { layers[j].selected = true; } }
    function rect(c, name, pos, size) {
        var L = c.layers.addShape(); L.name = name;
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        g.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue(size || [300, 200]);
        g.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0.2, 0.5, 1]);
        g.addProperty("ADBE Vector Graphic - Stroke");
        L.transform.position.setValue(pos || [960, 540]);
        return L;
    }
    function pathLayer(c, name, verts) {
        var L = c.layers.addShape(); L.name = name;
        var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
        var sh = new Shape(), z = [], j; for (j = 0; j < verts.length; j += 1) { z.push([0, 0]); }
        sh.vertices = verts; sh.inTangents = z; sh.outTangents = z; sh.closed = true;
        g.addProperty("ADBE Vector Shape - Group").property("ADBE Vector Shape").setValue(sh);
        g.addProperty("ADBE Vector Graphic - Fill");
        L.transform.position.setValue([960, 540]);
        return L;
    }
    function text(c, s, pos) { var L = c.layers.addText(s); L.transform.position.setValue(pos || [960, 540]); return L; }
    function bad(r) { return r === undefined || r === null || r === "undefined" || r === "false" || /^(ERR|ERROR)/.test(String(r)); }
    // t(name, fn, check): fn returns the host reply; check(reply) may return an error string.
    function t(name, fn, check) {
        var r;
        try { r = fn(); } catch (e) { rec("FAIL", name, "exception: " + e.toString() + " (line " + e.line + ")"); return null; }
        if (bad(r)) { rec("FAIL", name, r); return r; }
        if (check) { var msg; try { msg = check(r); } catch (e2) { msg = "check threw: " + e2.toString(); } if (msg) { rec("FAIL", name, msg + "  | reply: " + r); return r; } }
        rec("PASS", name, String(r).substring(0, 120));
        return r;
    }
    function skipIf(name, cond, why, fn, check) { if (cond) { rec("SKIP", name, why); return null; } return t(name, fn, check); }
    function writeFile(path, s) { var f = new File(path); f.encoding = "UTF-8"; f.open("w"); f.write(s); f.close(); return f.fsName; }
    function waitFile(path, ms) { var e = 0; while (e < ms) { var f = new File(path); if (f.exists && f.length > 0) { $.sleep(300); return true; } $.sleep(200); e += 200; } return new File(path).exists; }
    function renderPng(c, name) {
        var p = Folder.temp.fullName + "/akira_st_" + name + "_" + new Date().getTime() + ".png";
        try { c.saveFrameToPng(0, new File(p)); } catch (e) { return null; }
        return waitFile(p, 15000) ? p : null;
    }
    function J(v) { return H.toJSON(v); }
    function section(s) { log(""); log("== " + s); }

    // a real PNG for footage-based tests (maps basemap, depth map, showcase cards)
    var imgComp = app.project.items.addComp("ST image source", 1280, 720, 1, 2, 25);
    var bgs = imgComp.layers.addSolid([0.2, 0.4, 0.7], "bg", 1280, 720, 1);
    try { var rmp = bgs.property("ADBE Effect Parade").addProperty("ADBE Ramp"); rmp.property(2).setValue([1, 0.6, 0.2]); } catch (eR) { }
    var PNG = renderPng(imgComp, "img");
    log("Test PNG: " + (PNG || "could not render - footage tests will be skipped"));

    // ---------- 2. Other ----------
    section("Other");
    var c = newComp("other"), A = rect(c, "A"), B = rect(c, "B", [500, 300]); B.inPoint = 2; B.outPoint = 6;
    sel(c, [A]);
    A.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    t("getSelectedLayerEffects", function () { return F.getSelectedLayerEffects(); }, function (r) { return r.charAt(0) === "[" ? "" : "not a JSON array"; });
    t("toggleLayerEffectActive(1)", function () { return F.toggleLayerEffectActive(1); }, function (r) { return /Enabled|Disabled/.test(r) ? "" : "unexpected"; });
    t("deleteLayerEffect(1)", function () { return F.deleteLayerEffect(1); });
    A.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    t("deleteAllLayerEffects", function () { return F.deleteAllLayerEffects(); });
    t("applySystemLabelsToSelected", function () { return F.applySystemLabelsToSelected(); });
    sel(c, [A]); A.moveBefore(B);
    t("trimToBelowLayer", function () { return F.trimToBelowLayer(); }, function () { return Math.abs(A.inPoint - 2) < 0.01 ? "" : "inPoint not trimmed"; });
    t("createExtrusion('20')", function () { return F.createExtrusion("20"); });
    var T1 = text(c, "Hello Akira"); sel(c, [T1]);
    t("flexTypeSelection", function () { return F.flexTypeSelection(); });
    t("flexTypeAlign(center,visual)", function () { return F.flexTypeAlign("center", "visual"); });
    t("flexTypeCenter(both)", function () { return F.flexTypeCenter("both"); });
    t("flexTypeResetAnchor", function () { return F.flexTypeResetAnchor(); });
    t("run('addShapeLayer')", function () { return F.run("addShapeLayer"); });
    t("flexProjectAnalyze", function () { return F.flexProjectAnalyze(); });

    // ---------- 3. Shapes ----------
    section("Shapes");
    c = newComp("shapes");
    t("addShapeLayer", function () { return F.addShapeLayer(); });
    var prims = ["circle", "rect", "cross", "line"];
    for (i = 0; i < prims.length; i += 1) { (function (p) { t("createPrimitive(" + p + ")", function () { return F.createPrimitive(p); }); })(prims[i]); }
    var S1 = rect(c, "Preset target");
    var presets = ["dashes", "waveWarp", "roughenEdges", "trimStart", "trimEnd", "exclusion"];
    for (i = 0; i < presets.length; i += 1) { (function (p) { sel(c, [S1]); t("applyShapePreset(" + p + ")", function () { return F.applyShapePreset(p); }); })(presets[i]); }
    sel(c, [S1]);
    t("getExtraShapeData", function () { return F.getExtraShapeData(); }, function (r) { return r.charAt(0) === "{" ? "" : "no taper data"; });
    t("createCustomShapes", function () { return F.createCustomShapes(encodeURIComponent(J({ type: "star", count: 6, sizeX: 80, sizeY: 80, round: 10, fill: "ff0055", stroke: "", strokeWidth: 0, layout: "radial" }))); });
    var P1 = pathLayer(c, "La Path target", [[-200, -100], [200, -100], [200, 100], [-200, 100]]); sel(c, [P1]);
    t("laPathGetSelectedState (before)", function () { return F.laPathGetSelectedState(); }, function (r) { return r === "noControllers" ? "" : "expected noControllers"; });
    t("laPathStart", function () { return F.laPathStart(); });
    sel(c, [P1]);
    t("laPathSet", function () { return F.laPathSet("40|1|1|false"); });
    t("laPathGetSelectedState (after)", function () { return F.laPathGetSelectedState(); }, function (r) { return r.indexOf("hasControllers") === 0 ? "" : "controllers not detected"; });
    t("laPathDelete", function () { return F.laPathDelete(); });
    var M1 = pathLayer(c, "Morph A", [[-100, -100], [100, -100], [100, 100], [-100, 100]]), M2 = pathLayer(c, "Morph B", [[0, -150], [150, 0], [0, 150], [-150, 0]]);
    sel(c, [M1, M2]);
    t("shapeMorpher", function () { return F.shapeMorpher(1, "easy-ease", true, false, false, J({ bounceAmp: 0.1, bounceFreq: 2, bounceDecay: 5, customEaseIn: 50, customEaseOut: 50, useTrails: true, trailCount: 2, trailDelay: 0.04, useSlicer: false, stripeCount: 5, stripeOffset: 150, pathCurve: 0 })); });
    sel(c, [String(M1.comment).indexOf("AKIRA_MORPH|") === 0 ? M1 : M2]); // the top layer of the pair is the morph source
    t("removeMorph", function () { return F.removeMorph(); });

    // ---------- 4. Rigs ----------
    section("Rigs (carousel, orb, glass, effects)");
    c = newComp("carousel");
    var cards = [rect(c, "Card 1", [600, 540], [200, 260]), rect(c, "Card 2", [960, 540], [200, 260]), rect(c, "Card 3", [1320, 540], [200, 260])];
    sel(c, cards);
    t("createCarousel(2d)", function () { return F.createCarousel("2d|false|none|true|500"); });
    t("getCarouselDetails", function () { return F.getCarouselDetails(); }, function (r) { return r.charAt(0) === "{" ? "" : "no details"; });
    t("updateCarouselControlRealTime(Radius)", function () { return F.updateCarouselControlRealTime("Radius", 650); });
    var c4 = rect(c, "Card 4", [960, 900], [200, 260]); sel(c, [c4]);
    t("syncCarousel", function () { return F.syncCarousel(); });
    var pp = pathLayer(c, "Carousel path src", [[-600, 0], [0, -300], [600, 0], [0, 300]]); sel(c, [pp]);
    t("pastePathToCarouselControl", function () { return F.pastePathToCarouselControl(); });
    c = newComp("carousel3d");
    cards = [rect(c, "3D 1"), rect(c, "3D 2"), rect(c, "3D 3")]; sel(c, cards);
    t("createCarousel(3d-sphere)", function () { return F.createCarousel("3d-sphere|true|none|false|500"); });
    c = newComp("orb");
    sel(c, [rect(c, "Orb src", [960, 540], [80, 80])]);
    t("createOrbCloner", function () { return F.createOrbCloner("2d|false|none|false|500|8|450|-160|35|30|-100"); });
    t("addOrbEffector", function () { return F.addOrbEffector("300|0|20|10|-50"); });
    c = newComp("carousel builder");
    var l1 = rect(c, "B1"), l2 = rect(c, "B2");
    t("buildCarousel3D", function () {
        return F.buildCarousel3D(J({ preset: "cylindrical_ring", name: "Cylindrical Ring", axis: "y", facing: "tangent", count: 8, radius: 700, arc: 360, tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.24, cardW: 460,
            source: "timeline", media: [], layers: [l1.index, l2.index], duration: 8, turns: 1, direction: 1, loop: true, stepped: false, depthBlur: true, introOutro: true, style: "fade",
            camera: { zoom: 2666, pos: [0, -600, -2200], poi: [0, 0, 0] }, swatches: ["ff0055", "22aaff", "ffcc00"] }));
    });
    c = newComp("glass");
    t("applyGlassMorph", function () { return F.applyGlassMorph(); });
    var gS = rect(c, "Glass card"); sel(c, [gS]);
    t("applyGlassMorphShape", function () { return F.applyGlassMorphShape(); });
    deselect(c);
    t("removeGlassMorph", function () { return F.removeGlassMorph(); });
    var lgInstalled = false; for (i = 0; i < app.effects.length; i += 1) { if (/liquid\s*glass/i.test(app.effects[i].displayName)) { lgInstalled = true; } }
    sel(c, [gS]);
    skipIf("convertSelectedShapesToLiquidGlass", !lgInstalled, "Liquid Glass plug-in not installed", function () { return F.convertSelectedShapesToLiquidGlass("false"); });
    c = newComp("fx");
    var fxL = text(c, "Light Sweep"); fxL.property("ADBE Effect Parade").addProperty("CC Light Sweep"); sel(c, [fxL]);
    t("fxLightSweepLock(true)", function () { return F.fxLightSweepLock(true); }, function (r) { return r === "LOCKED" ? "" : "expected LOCKED"; });
    t("fxLightSweepLock(false)", function () { return F.fxLightSweepLock(false); }, function (r) { return r === "UNLOCKED" ? "" : "expected UNLOCKED"; });
    sel(c, [rect(c, "Shatter me")]);
    t("applyShatterEffect", function () { return F.applyShatterEffect(); });

    // ---------- 5. Shakes ----------
    section("Shakes");
    var SH = ["BasicShake_001_JF", "QuickShake_001_JF", "WaveV1_Shake_001_JF", "WaveV2_Shake_001_JF", "BounceInShake_001_JF", "BounceOutShake_001_JF", "SqueezeV1Shake_001_JF",
        "SqueezeV2Shake_001_JF", "WarpShake_001_JF", "LensShake_001_JF", "InvertShake_001_JF", "InvertPixleShake_001_JF", "DarkFlickerShake_001_JF", "WhiteFlickerShake_001_JF", "AddCustomShake_JF"];
    c = newComp("shakes");
    var shTarget = rect(c, "Shake target");
    for (i = 0; i < SH.length; i += 1) {
        (function (n) {
            sel(c, [shTarget]);
            t(n, function () { return typeof G[n] === "function" ? G[n](1, 100, 100, 1, 5, 100, 1, 1, 1) : "ERROR:function missing"; }, function (r) { return r === "true" ? "" : "expected true"; });
        })(SH[i]);
    }

    // ---------- 6. Highlighter ----------
    section("Highlighter");
    c = newComp("highlighter");
    var hT = text(c, "Highlight me"); sel(c, [hT]);
    var HL = $._flexHL;
    var hr = t("$._flexHL.create", function () { return HL.create("style=box;colorMode=both;fill=#00ff55;stroke=#00b23c;dot=#00ff55;strokeW=2;round=5;padX=10;padY=6;multiply=false;cursor=true;dir=smart;perLayer=false"); });
    var hid = hr ? String(hr).split(":")[2] : "";
    t("$._flexHL.list", function () { return HL.list(); }, function (r) { return r.indexOf(hid) > 0 ? "" : "created rig not listed"; });
    t("$._flexHL.apply", function () { return HL.apply("id=" + hid + ";fill=#ff0055;stroke=#ffffff;dot=#ffffff;strokeW=3;round=10;padX=20;padY=8;multiply=true"); });
    t("$._flexHL.animate", function () { return HL.animate("id=" + hid + ";dur=0.6;from=3"); });
    t("$._flexHL.toEGP", function () { return HL.toEGP("id=" + hid); });
    t("$._flexHL.remove", function () { return HL.remove("id=" + hid); });

    // ---------- 7. Motion Showcase ----------
    section("Motion Showcase");
    c = newComp("showcase");
    var scA = c.layers.add(imgComp), scB = c.layers.add(imgComp), scT = text(c, "Card text"); sel(c, [scA, scB, scT]);
    var selRes = t("getMotionShowcaseSelection_FlexGUI", function () { return G.getMotionShowcaseSelection_FlexGUI(encodeURIComponent("")); });
    var idxs = []; if (selRes && !bad(selRes)) { var rows = String(selRes).split("\n"); for (i = 0; i < rows.length; i += 1) { idxs.push(rows[i].split("|")[0]); } }
    var cfg = ["orbit", "16:9", 10, 58, 70, 10, 55, 4, 36, "#080808", "1", "1", idxs.join(",")].join("|");
    t("buildMotionShowcase_FlexGUI", function () { return G.buildMotionShowcase_FlexGUI(encodeURIComponent(cfg)); });
    t("updateMotionShowcase_FlexGUI", function () { return G.updateMotionShowcase_FlexGUI(encodeURIComponent(cfg.replace("|58|", "|70|"))); });
    t("queueMotionShowcase_FlexGUI", function () { return G.queueMotionShowcase_FlexGUI(encodeURIComponent("")); });
    try { while (app.project.renderQueue.numItems) { app.project.renderQueue.item(1).remove(); } } catch (eRQ) { }

    // ---------- 8. SaaS Effects ----------
    section("SaaS Effects");
    var X = $._flexSaaS;
    function pair(cc) { var a = rect(cc, "UI A", [500, 400], [260, 120]), b = rect(cc, "UI B", [1300, 700], [260, 120]); sel(cc, [a, b]); return [a, b]; }
    c = newComp("saas stagger"); pair(c);
    t("stagger (live controller)", function () { return X.stagger("order=top;style=rise;delay=0.08;duration=0.6;rise=40;controller=true"); });
    c = newComp("saas stagger keys"); pair(c);
    t("stagger (keys, pop)", function () { return X.stagger("order=left;style=pop;delay=0.08;duration=0.6;rise=40;controller=false"); });
    c = newComp("saas cursor"); pair(c);
    t("cursor", function () { return X.cursor("style=arrow;order=stack;travel=0.7;hold=0.5;click=16;size=100;tilt=true;ripple=true;shadow=true;press=true;fill=#ffffff;stroke=#111111"); });
    c = newComp("saas hover"); pair(c);
    t("hover", function () { return X.hover("radius=260;lift=14;grow=6;shadow=true"); });
    var modes = ["letters", "words", "color", "scramble", "typing", "colortype"];
    for (i = 0; i < modes.length; i += 1) {
        (function (m) { c = newComp("saas text " + m); sel(c, [text(c, "Ship faster with Akira")]); t("textAnim(" + m + ")", function () { return X.textAnim("mode=" + m + ";duration=0.8;rise=40;color=#00ff55;cps=14;caret=true"); }); })(modes[i]);
    }
    c = newComp("saas glyphs");
    t("codeGlyphs", function () { return X.codeGlyphs("text=" + encodeURIComponent("Akira Ecosystem | will replace everyone") + ";glyphs=" + encodeURIComponent("/ / < > * - |") + ";code=" + encodeURIComponent("const app = express();\nawait db.connect();") + ";palette=mint;accent=" + encodeURIComponent("#00ff55") + ";count=20;density=55;rate=6;duration=8;codeOn=true;bg=true"); });
    c = newComp("saas prompt");
    t("promptBar", function () { return X.promptBar("text=" + encodeURIComponent("create a landing page") + ";placeholder=" + encodeURIComponent("Ask anything...") + ";cps=16;accent=" + encodeURIComponent("#00ff55")); });
    c = newComp("saas halftone"); sel(c, [rect(c, "Logo")]);
    t("halftoneWave", function () { return X.halftoneWave("color=#00ff55;waves=2;duration=1;interval=0.35;ring=150;softness=50;spacing=22;dot=45;distortion=60;glow=true;clip=inside"); });
    c = newComp("saas carousel"); pair(c);
    t("carousel", function () { return X.carousel("hold=1;move=0.6;gap=40;focus=100;side=82;sideOpacity=45;loop=true"); });
    c = newComp("saas attach"); pair(c);
    t("attach", function () { return X.attach("rotation=true;scale=true"); });
    c = newComp("saas background");
    t("background", function () { return X.background("palette=aurora;speed=0.6;amount=180;grain=true;accent=#00ff55;clip=false;style=drift"); });
    c = newComp("saas wipe"); pair(c);
    t("wipe", function () { return X.wipe("direction=left;duration=0.8;feather=160;delay=0.1"); });
    c = newComp("saas depth"); var photo = c.layers.add(imgComp); sel(c, [photo]);
    var dp = t("depthPrepare", function () { return X.depthPrepare(""); }, function (r) { return r.indexOf("OK:") === 0 ? "" : "expected OK:"; });
    var depthMap = null; if (dp && !bad(dp)) { var dpp = String(dp).substring(3).split("\t"); if (waitFile(dpp[0], 15000)) { depthMap = dpp[0]; } }
    sel(c, [photo]);
    t("depthReveal (gradient)", function () { return X.depthReveal("source=gradient;look=gradient;io=out;palette=sunset;accent=#00ff55;style=sweep;farFirst=false;soft=25;direction=bottom;duration=1.5;blur=0;push=5;zoom=0;slide=0;parX=10;parY=5;sway=0"); });
    sel(c, [photo]);
    skipIf("depthReveal (AI map file)", !depthMap, "depthPrepare frame was not rendered", function () { return X.depthReveal("source=ai;look=fog;io=in;palette=neon;accent=#00ff55;style=sweep;farFirst=true;soft=25;direction=bottom;duration=1.5;blur=0;push=0;zoom=0;slide=0;parX=0;parY=0;sway=0;map=" + depthMap); });

    // ---------- 9. Maps ----------
    section("Map Rigs");
    c = newComp("maps");
    var tmp = Folder.temp.fullName, frame = { minX: 0.48, maxX: 0.56, minY: 0.30, maxY: 0.345 };
    var rigRes = t("flexMap_createFromFile", function () {
        return F.flexMap_createFromFile(writeFile(tmp + "/akira_st_map.json", J({ version: 19, level: "VIEW", locationName: "Self-test", aspect: 1.7778, fill: [0.1, 0.12, 0.15], stroke: [1, 1, 1], strokeWidth: 2,
            baseFrameMerc: frame, basemapPath: PNG || "", labels: [{ name: "Test City", x: 0.5, y: 0.5, rank: 1 }],
            features: [{ name: "Country Borders", paths: [[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]], stroke: [1, 1, 1], strokeWidth: 2, isClosed: true }], paths: [] })));
    }, function (r) { return /^OK:\d+:RIG:/.test(r) ? "" : "bad reply format"; });
    var rIdx = rigRes ? String(rigRes).split(":")[1] : "0", rId = rigRes ? String(rigRes).split(":")[3] : "";
    t("flexMap_listRigs", function () { return F.flexMap_listRigs(); }, function (r) { return r.indexOf(rId) > 0 ? "" : "rig not listed"; });
    t("flexMap_selectRig", function () { return F.flexMap_selectRig(rIdx, rId); }, function (r) { return r.indexOf("OK:") === 0 ? "" : "expected OK:index"; });
    t("flexMap_activeRig", function () { return F.flexMap_activeRig(); }, function (r) { return r.indexOf("{") === 0 ? "" : "no active rig"; });
    t("flexMap_syncRigToView", function () { return F.flexMap_syncRigToView(rIdx, 48.5, 2.3, 6, 0, rId); });
    t("flexMap_replaceViewFromFile", function () { return F.flexMap_replaceViewFromFile(writeFile(tmp + "/akira_st_view.json", J({ version: 19, layerIndex: Number(rIdx), rigId: rId, baseFrameMerc: frame, basemapPath: PNG || "", removeBasemap: !PNG, fill: [0.1, 0.1, 0.1], labels: [], features: [] }))); });
    t("flexMap_traceOutlineFromFile", function () { return F.flexMap_traceOutlineFromFile(writeFile(tmp + "/akira_st_outline.json", J({ version: 20, name: "Test Region", paths: [[[0.2, 0.2], [0.5, 0.1], [0.8, 0.4], [0.4, 0.8]]], geo: [], isClosed: true, layerIndex: Number(rIdx), rigId: rId, autoRig: true, replaceExisting: true, baseFrameMerc: frame, fill: [1, 0, 0], stroke: [1, 1, 1], strokeWidth: 3 }))); }, function (r) { return r.indexOf("SUCCESS:") === 0 ? "" : "expected SUCCESS:"; });
    t("flexMap_createTrackerFromFile", function () { return F.flexMap_createTrackerFromFile(writeFile(tmp + "/akira_st_tracker.json", J({ version: 20, layerIndex: Number(rIdx), rigId: rId, autoRig: true, name: "Pin", displayName: "Pin", lat: 48.85, lon: 2.35, x: 0.5, y: 0.5, baseFrameMerc: frame, vectorPaths: [], stroke: [1, 1, 1], strokeWidth: 2 }))); });
    var listNow = F.flexMap_listRigs(), m = /"index":(\d+)/.exec(listNow);
    t("flexMap_bakeRig", function () { return F.flexMap_bakeRig(m ? m[1] : rIdx, rId); });

    // ---------- 10. expression errors across everything built ----------
    section("Expression check (every expression the tools created, evaluated at t=1s)");
    var exprErr = 0, exprCount = 0;
    function scan(comp, grp, path) {
        var j;
        for (j = 1; j <= grp.numProperties; j += 1) {
            var p = grp.property(j);
            if (p.propertyType === PropertyType.PROPERTY) {
                if (p.canSetExpression && p.expression !== "" && p.expressionEnabled) {
                    exprCount += 1;
                    try { p.valueAtTime(1, false); } catch (eV) { }
                    if (p.expressionError && p.expressionError !== "") { exprErr += 1; rec("FAIL", "expression " + comp.name + " > " + path + " > " + p.name, p.expressionError); }
                }
            } else { scan(comp, p, path + " > " + p.name); }
        }
    }
    var allComps = []; for (i = 1; i <= app.project.numItems; i += 1) { if (app.project.item(i) instanceof CompItem) { allComps.push(app.project.item(i)); } }
    for (i = 0; i < allComps.length; i += 1) {
        var cc = allComps[i], j2;
        for (j2 = 1; j2 <= cc.numLayers; j2 += 1) { try { scan(cc, cc.layer(j2), cc.layer(j2).name); } catch (eX) { } }
    }
    log("Expressions evaluated: " + exprCount + ", with errors: " + exprErr);
    if (exprCount && !exprErr) { rec("PASS", "all expressions evaluate without errors", exprCount + " expressions"); }

    F.isLocked = wasLocked;
    finish();

    function finish() {
        try { app.endSuppressDialogs(false); } catch (eE) { }
        var head = ["RESULT: " + PASS + " passed, " + FAIL + " failed, " + SKIP + " skipped  (" + Math.round((new Date().getTime() - T0) / 1000) + " s)", ""];
        var out = head.concat(REPORT).join("\r\n");
        var f = new File(Folder.desktop.fullName + "/AkiraFX_selftest_report.txt");
        f.encoding = "UTF-8"; f.open("w"); f.write(out); f.close();
        alert("Akira FX self-test finished\n\n" + PASS + " passed, " + FAIL + " failed, " + SKIP + " skipped\n\nReport saved to:\n" + f.fsName + "\n\nSend that file back. The test project is still open so you can look at it (don't save it over your work).");
    }
})();
