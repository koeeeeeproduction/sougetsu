// Sougetsu Akira FX - Beat markers, Proximity rig, keyframe utilities, Template Studio (clean-room). Batch L.
// Contract (read from the panel):
//   addBeatMarkers(encodeURIComponent(JSON)) -> "OK:"+count / "ERR:"
//     JSON either {times:[sec,...]} (client-detected beats) or {bpm,offset,start,end}
//   createProximityNull() -> "SUCCESS" / "ERR:"
//   applyProximity(encodeURIComponent(JSON {property,radius,falloff})) -> "SUCCESS" / "ERR:"
//     property: "scale" | "opacity"
//   resetProximityExpressions() -> "OK:"+count removed
//   detectSelectedKeyframeBezier() -> JSON {valid,count,interpolation,propertyName}
//   updateBounceControlRealTime("amp|freq|decay") -> "OK" / "ERR:"  (no undo group - called while dragging)
//   updateKeyframeValue("keyIndex|value[,value...]") -> "OK" / "ERR:"
//   getTemplateStudioContext() -> JSON {compName,width,height,tokens:[{layerName,kind,current}]}
//   buildUITemplate(encodeURIComponent(JSON {tokens:{name:value,...}})) -> "OK:"+count filled
//   buildUITemplateStudio(encodeURIComponent(JSON spec)) -> "OK:"+compName / "ERR:"
//     spec: {name,width,height,duration,frameRate,bgColor,elements:[
//       {type:"text",text,x,y,size,color} | {type:"solid",x,y,w,h,color,name} ]}
// ES3 only.
if (typeof $._flex === "undefined") { $._flex = {}; }

(function () {
    var F = $._flex, H = F._h;
    if (!H) { return; }

    function jsonStr(s) { return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n") + '"'; }
    function decodeArg(arg) { var s; try { s = decodeURIComponent(String(arg)); } catch (e) { s = String(arg); } return s; }
    function numField(s, name, def) { var m = new RegExp('"' + name + '"\\s*:\\s*(-?[0-9.]+)').exec(s); return m ? parseFloat(m[1]) : def; }
    function strField(s, name, def) { var m = new RegExp('"' + name + '"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"').exec(s); return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : def; }

    // ================= Beat markers =================
    F.addBeatMarkers = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg), times = [];
        var timesBlock = /"times"\s*:\s*\[([^\]]*)\]/.exec(s);
        if (timesBlock && timesBlock[1].length) {
            var parts = timesBlock[1].split(","), i;
            for (i = 0; i < parts.length; i += 1) { var v = parseFloat(parts[i]); if (!isNaN(v)) { times.push(v); } }
        } else {
            var bpm = numField(s, "bpm", 120), offset = numField(s, "offset", 0);
            var start = numField(s, "start", 0), end = numField(s, "end", comp.duration);
            if (bpm <= 0) { return "ERR:Invalid BPM."; }
            var step = 60 / bpm, t = start + (offset % step < 0 ? offset % step + step : offset % step);
            while (t <= end && t <= comp.duration) { times.push(t); t += step; }
        }
        if (!times.length) { return "ERR:No beat times supplied."; }
        app.beginUndoGroup("Add Beat Markers");
        var added = 0;
        try {
            var mp = comp.markerProperty, i;
            for (i = 0; i < times.length; i += 1) {
                if (times[i] < 0 || times[i] > comp.duration) { continue; }
                mp.setValueAtTime(times[i], new MarkerValue("beat"));
                added += 1;
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return added ? ("OK:" + added) : "ERR:No markers were in range.";
    };

    // ================= Proximity rig =================
    var PROX_NULL_NAME = "Proximity Null";
    var PROX_MARK = "// akira-proximity";
    function findProxNull(comp) {
        var i; for (i = 1; i <= comp.numLayers; i += 1) { if (comp.layer(i).name === PROX_NULL_NAME) { return comp.layer(i); } } return null;
    }
    F.createProximityNull = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        if (findProxNull(comp)) { return "SUCCESS"; }
        app.beginUndoGroup("Create Proximity Null");
        try {
            var L = comp.layers.addNull();
            L.name = PROX_NULL_NAME;
            L.transform.position.setValue([comp.width / 2, comp.height / 2]);
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    function proxExpr(property, radius, falloff) {
        var base = (property === "opacity") ? "100" : "100";
        return PROX_MARK + "\n" +
            'nullL = thisComp.layer("' + PROX_NULL_NAME + '");\n' +
            'd = length(thisLayer.transform.position.valueAtTime(time) - nullL.transform.position.valueAtTime(time));\n' +
            'radius = ' + radius + '; falloff = ' + falloff + ';\n' +
            'f = (d < radius) ? 1 : Math.max(0, 1 - (d - radius) / Math.max(falloff, 1));\n' +
            (property === "opacity" ? 'value * f' : 'value * (0.5 + 0.5 * f)');
    }
    F.applyProximity = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        if (!findProxNull(comp)) {
            app.beginUndoGroup("Create Proximity Null");
            try { var nl = comp.layers.addNull(); nl.name = PROX_NULL_NAME; nl.transform.position.setValue([comp.width / 2, comp.height / 2]); }
            catch (e0) { app.endUndoGroup(); return "ERR:" + e0.toString(); }
            app.endUndoGroup();
        }
        var s = decodeArg(arg), prop = strField(s, "property", "scale");
        var radius = numField(s, "radius", 200), falloff = numField(s, "falloff", 150);
        app.beginUndoGroup("Apply Proximity");
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i];
                if (L.name === PROX_NULL_NAME) { continue; }
                var p = (prop === "opacity") ? L.transform.opacity : L.transform.scale;
                p.expression = proxExpr(prop, radius, falloff);
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "SUCCESS";
    };
    F.resetProximityExpressions = function () {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "OK:0"; }
        var removed = 0, i;
        app.beginUndoGroup("Reset Proximity");
        try {
            for (i = 1; i <= comp.numLayers; i += 1) {
                var L = comp.layer(i), props = [L.transform.opacity, L.transform.scale], j;
                for (j = 0; j < props.length; j += 1) {
                    try {
                        if (props[j].expressionEnabled && String(props[j].expression).indexOf(PROX_MARK) !== -1) {
                            props[j].expression = ""; removed += 1;
                        }
                    } catch (e1) { }
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + removed;
    };

    // ================= Keyframe bezier detection =================
    function targetProperty(comp) {
        var sp = comp.selectedProperties, i;
        for (i = 0; i < sp.length; i += 1) { if (sp[i].propertyType === PropertyType.PROPERTY && sp[i].numKeys >= 2) { return sp[i]; } }
        return null;
    }
    F.detectSelectedKeyframeBezier = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"valid":false}'; }
        var p = targetProperty(comp);
        if (!p) { return '{"valid":false}'; }
        var idxs = [], i;
        for (i = 1; i <= p.numKeys; i += 1) { if (p.keySelected(i)) { idxs.push(i); } }
        if (idxs.length < 2) { return '{"valid":false}'; }
        var types = {}, anyMixed = false;
        for (i = 0; i < idxs.length; i += 1) {
            var it;
            try { it = p.keyOutInterpolationType(idxs[i]); } catch (e) { it = null; }
            var name = (it === KeyframeInterpolationType.BEZIER) ? "bezier" : (it === KeyframeInterpolationType.HOLD) ? "hold" : "linear";
            types[name] = true;
        }
        var count = 0, interp = "mixed", k;
        for (k in types) { if (types.hasOwnProperty(k)) { count += 1; interp = k; } }
        if (count > 1) { interp = "mixed"; }
        return '{"valid":true,"count":' + idxs.length + ',"interpolation":' + jsonStr(interp) + ',"propertyName":' + jsonStr(p.name) + '}';
    };

    // ================= Bounce rig real-time controls =================
    var BOUNCE_MARK = "// akira-bounce-rig";
    function bounceRigExpr() {
        return BOUNCE_MARK + "\n" +
            'ctl = effect("Bounce Rig");\n' +
            'amp = ctl("Amplitude"); freq = ctl("Frequency"); decay = ctl("Decay");\n' +
            'n = 0;\n' +
            'if (numKeys > 0) { n = nearestKey(time).index; if (key(n).time > time) n--; }\n' +
            'if (n > 0) {\n' +
            '  t = time - key(n).time;\n' +
            '  v = velocityAtTime(key(n).time - thisComp.frameDuration / 10);\n' +
            '  value + v * (amp / 100) * Math.sin(freq * t * 2 * Math.PI) / Math.exp(decay * t);\n' +
            '} else { value }';
    }
    function findEffect(L, name) {
        var fx; try { fx = L.property("ADBE Effect Parade"); } catch (e) { return null; }
        if (!fx) { return null; }
        var i; for (i = 1; i <= fx.numProperties; i += 1) { if (fx.property(i).name === name) { return fx.property(i); } }
        return null;
    }
    function ensureBounceRig(L) {
        var g = findEffect(L, "Bounce Rig");
        if (g) { return g; }
        var fx = L.property("ADBE Effect Parade");
        g = fx.addProperty("ADBE Group");
        g.name = "Bounce Rig";
        var amp = g.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); amp.name = "Amplitude"; amp.property(1).setValue(10);
        var freq = g.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); freq.name = "Frequency"; freq.property(1).setValue(2);
        var decay = g.property("ADBE Effect Parade").addProperty("ADBE Slider Control"); decay.name = "Decay"; decay.property(1).setValue(2);
        return g;
    }
    // updateBounceControlRealTime: called repeatedly while the user drags a slider, no undo group (matches scrubTransform's pattern)
    F.updateBounceControlRealTime = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = String(arg).split("|"), amp = parseFloat(p[0]), freq = parseFloat(p[1]), decay = parseFloat(p[2]);
        if (isNaN(amp) || isNaN(freq) || isNaN(decay)) { return "ERR:Invalid values."; }
        var layers = H.selectedLayers(comp);
        if (!layers.length) { return "ERR:Select at least one layer."; }
        try {
            var i;
            for (i = 0; i < layers.length; i += 1) {
                var L = layers[i], rig = ensureBounceRig(L);
                rig.property("ADBE Effect Parade").property("Amplitude").property(1).setValue(amp);
                rig.property("ADBE Effect Parade").property("Frequency").property(1).setValue(freq);
                rig.property("ADBE Effect Parade").property("Decay").property(1).setValue(decay);
                var prop = L.transform.position;
                if (!(prop.expressionEnabled && String(prop.expression).indexOf(BOUNCE_MARK) !== -1)) {
                    if (prop.numKeys >= 1) { prop.expression = bounceRigExpr(); }
                }
            }
        } catch (e) { return "ERR:" + e.toString(); }
        return "OK";
    };

    // ================= Keyframe value scrub =================
    // updateKeyframeValue: like scrubTransform - edits a specific keyframe's value on the active selected property, no undo group while dragging
    F.updateKeyframeValue = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = targetProperty(comp);
        if (!p) { return "ERR:Select a property with keyframes."; }
        var parts = String(arg).split("|"), idx = parseInt(parts[0], 10);
        if (isNaN(idx) || idx < 1 || idx > p.numKeys) { return "ERR:Invalid keyframe index."; }
        var vals = parts[1] ? parts[1].split(",") : [];
        var i, nums = [];
        for (i = 0; i < vals.length; i += 1) { var v = parseFloat(vals[i]); if (isNaN(v)) { return "ERR:Invalid value."; } nums.push(v); }
        if (!nums.length) { return "ERR:No value supplied."; }
        try {
            var newVal = (nums.length === 1) ? nums[0] : nums;
            var t = p.keyTime(idx);
            p.setValueAtTime(t, newVal);
        } catch (e) { return "ERR:" + e.toString(); }
        return "OK";
    };

    // ================= Template Studio =================
    // A token is any layer whose name is wrapped in {{ }} - the Template Studio lets the user fill those in.
    function tokenLayers(comp) {
        var out = [], i;
        for (i = 1; i <= comp.numLayers; i += 1) {
            var L = comp.layer(i), m = /^\{\{(.+)\}\}$/.exec(L.name);
            if (!m) { continue; }
            var kind = (L instanceof TextLayer) ? "text" : (L instanceof ShapeLayer) ? "shape" : (L.nullLayer) ? "null" : "layer";
            var current = "";
            if (kind === "text") { try { current = L.property("ADBE Text Properties").property("ADBE Text Document").value.text; } catch (e) { } }
            out.push({ layerName: L.name, token: m[1], kind: kind, current: current, index: L.index });
        }
        return out;
    }
    F.getTemplateStudioContext = function () {
        var comp = H.activeComp();
        if (!comp) { return '{"compName":"","width":0,"height":0,"tokens":[]}'; }
        var toks = tokenLayers(comp), out = [], i;
        for (i = 0; i < toks.length; i += 1) {
            var t = toks[i];
            out.push('{"layerName":' + jsonStr(t.layerName) + ',"token":' + jsonStr(t.token) + ',"kind":' + jsonStr(t.kind) +
                ',"current":' + jsonStr(t.current) + ',"index":' + t.index + '}');
        }
        return '{"compName":' + jsonStr(comp.name) + ',"width":' + comp.width + ',"height":' + comp.height + ',"tokens":[' + out.join(",") + ']}';
    };
    // buildUITemplate: fill {{token}} layers in the active comp with supplied values
    F.buildUITemplate = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var s = decodeArg(arg);
        var tokBlock = /"tokens"\s*:\s*\{([^}]*)\}/.exec(s);
        if (!tokBlock) { return "ERR:No tokens supplied."; }
        var re = /"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"/g, m, map = {};
        while ((m = re.exec(tokBlock[1])) !== null) {
            map[m[1].replace(/\\"/g, '"')] = m[2].replace(/\\"/g, '"').replace(/\\n/g, "\n");
        }
        var toks = tokenLayers(comp), done = 0, i;
        app.beginUndoGroup("Build Template");
        try {
            for (i = 0; i < toks.length; i += 1) {
                var t = toks[i];
                if (!map.hasOwnProperty(t.token)) { continue; }
                var L = comp.layer(t.index);
                if (t.kind === "text") {
                    var p = L.property("ADBE Text Properties").property("ADBE Text Document"), td = p.value;
                    td.text = map[t.token]; p.setValue(td); done += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return done ? ("OK:" + done) : "ERR:No matching tokens found in the active comp.";
    };
    // buildUITemplateStudio: build a brand-new comp from a simple JSON layout spec (own minimal schema - text/solid elements only)
    F.buildUITemplateStudio = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var s = decodeArg(arg);
        var name = strField(s, "name", "Template Comp");
        var w = numField(s, "width", 1920), h = numField(s, "height", 1080);
        var dur = numField(s, "duration", 5), fr = numField(s, "frameRate", 30);
        var elBlock = /"elements"\s*:\s*\[([\s\S]*)\]\s*\}?\s*$/.exec(s);
        app.beginUndoGroup("Build Template Studio Comp");
        try {
            var comp = app.project.items.addComp(name, w, h, 1, dur, fr);
            var count = 0;
            if (elBlock) {
                var re = /\{[^{}]*\}/g, m;
                while ((m = re.exec(elBlock[1])) !== null) {
                    var chunk = m[0], type = strField(chunk, "type", "");
                    if (type === "text") {
                        var txt = strField(chunk, "text", "Text"), x = numField(chunk, "x", w / 2), y = numField(chunk, "y", h / 2);
                        var size = numField(chunk, "size", 60);
                        var L = comp.layers.addText(txt);
                        var p = L.property("ADBE Text Properties").property("ADBE Text Document"), td = p.value;
                        td.fontSize = size; p.setValue(td);
                        L.transform.position.setValue([x, y]);
                        count += 1;
                    } else if (type === "solid") {
                        var sx = numField(chunk, "x", w / 2), sy = numField(chunk, "y", h / 2);
                        var sw = numField(chunk, "w", 200), sh = numField(chunk, "h", 200);
                        var solName = strField(chunk, "name", "Solid");
                        var sol = comp.layers.addSolid([1, 1, 1], solName, sw, sh, 1);
                        sol.transform.position.setValue([sx, sy]);
                        count += 1;
                    }
                }
            }
            comp.openInViewer();
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return "OK:" + name + ":" + count;
    };
})();
