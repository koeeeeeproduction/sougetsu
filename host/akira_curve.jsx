// Sougetsu Akira FX - Flow curve engine (clean-room). Batch I.
// Applies an easing curve to the selected keyframes of the selected properties.
// Contract (read from the panel): $._akira.curve20Apply("model|graphMode|invert|params|pts"), $._akira.curve20Read("1").
//   model     : bezier | custom | elastic | bounce | wave | steps
//   graphMode : ease (two bezier handles) | expr (procedural) | bake (stepped) | "custom" model carries its own point list
//   invert    : 0 | 1  (mirror the curve)
//   params    : comma list, meaning depends on the model
//   pts       : for custom, "x,y,cx1,cy1,cx2,cy2;..." normalised points (x,y in 0..1)
// Reply: "SUCCESS:<msg>" / "ERR:<msg>" for apply; "OK|x,y,cx1,cy1,cx2,cy2;..." for read.
// ES3 only.
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }

    function num(s, d) { var v = parseFloat(s); return isNaN(v) ? d : v; }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    // selected 1-D / multi-D properties that have at least 2 keyframes
    function targetProps(comp) {
        var sp = comp.selectedProperties, out = [], i;
        for (i = 0; i < sp.length; i += 1) {
            var p = sp[i];
            if (p.propertyType === PropertyType.PROPERTY && p.numKeys >= 2 && p.canVaryOverTime) { out.push(p); }
        }
        return out;
    }
    function selectedKeyIndices(p) {
        var out = [], i;
        for (i = 1; i <= p.numKeys; i += 1) { if (p.keySelected(i)) { out.push(i); } }
        if (out.length < 2) { out = []; for (i = 1; i <= p.numKeys; i += 1) { out.push(i); } }  // none selected -> all keys
        return out;
    }

    // ---------- cubic-bezier easing y(x), x,y in 0..1, control points (p1x,p1y),(p2x,p2y) ----------
    function bezYForX(p1x, p1y, p2x, p2y, x) {
        if (x <= 0) { return 0; } if (x >= 1) { return 1; }
        var t = x, i, cx, dx;
        for (i = 0; i < 24; i += 1) {                         // Newton solve for t where X(t)=x
            cx = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
            dx = 3 * (1 - t) * (1 - t) * (p1x) + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
            if (Math.abs(cx - x) < 1e-6) { break; }
            if (dx < 1e-6 && dx > -1e-6) { break; }
            t = clamp(t - (cx - x) / dx, 0, 1);
        }
        return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
    }
    // piecewise curve through custom points, each with its own out/in handles (all normalised 0..1)
    function customYForX(pts, x) {
        var i, a, b;
        if (x <= pts[0].x) { return pts[0].y; }
        if (x >= pts[pts.length - 1].x) { return pts[pts.length - 1].y; }
        for (i = 0; i < pts.length - 1; i += 1) {
            a = pts[i]; b = pts[i + 1];
            if (x >= a.x && x <= b.x) {
                var span = b.x - a.x; if (span < 1e-9) { return b.y; }
                var lx = clamp((x - a.x) / span, 0, 1);
                // handles are given in normalised curve space; convert to a 0..1 ease within this segment
                var p1x = (a.cx2 - a.x) / span, p1y = (a.cy2 - a.y) / (b.y - a.y || 1);
                var p2x = (b.cx1 - a.x) / span, p2y = (b.cy1 - a.y) / (b.y - a.y || 1);
                var e = bezYForX(clamp(p1x, 0, 1), p1y, clamp(p2x, 0, 1), p2y, lx);
                return a.y + (b.y - a.y) * e;
            }
        }
        return pts[pts.length - 1].y;
    }

    // ---------- expressions for the procedural models (applied, not baked) ----------
    function overshootExpr(kind, p) {
        var head = "n=0; if(numKeys>0){n=nearestKey(time).index; if(key(n).time>time)n--;}\n";
        if (kind === "elastic") {
            return head + "if(n==0||n>=numKeys){value}else{\n" +
                "k1=key(n);k2=key(n+1);var amp=" + p[0] + ",freq=" + p[1] + ",dec=" + p[2] + ";\n" +
                "d=k2.time-k1.time; t=(time-k1.time)/(d==0?1:d);\n" +
                "e=1-amp*Math.pow(2,-dec*t)*Math.cos(freq*t*2*Math.PI);\nk1.value+(k2.value-k1.value)*e}";
        }
        if (kind === "bounce") {
            return head + "if(n==0||n>=numKeys){value}else{\n" +
                "k1=key(n);k2=key(n+1);var nb=Math.max(1," + p[0] + "),st=" + p[1] + ";\n" +
                "d=k2.time-k1.time; t=(time-k1.time)/(d==0?1:d);\n" +
                "a=1;s=0;e=0;found=false;\nfor(i=0;i<nb;i++){seg=a;if(t<=s+seg){tl=(t-s)/(seg==0?1:seg);e=1-Math.pow(1-tl,2)*Math.abs(Math.sin(tl*Math.PI));found=true;break;}s+=seg;a*=(1/st);}\n" +
                "if(!found)e=1;\nk1.value+(k2.value-k1.value)*e}";
        }
        // wave
        return head + "if(n==0||n>=numKeys){value}else{\n" +
            "k1=key(n);k2=key(n+1);var freq=" + p[0] + ",dec=" + p[1] + ",sh=" + p[2] + ";\n" +
            "d=k2.time-k1.time; t=(time-k1.time)/(d==0?1:d);\n" +
            "env=Math.pow(2,-dec*t); w=Math.sin(freq*t*2*Math.PI); if(sh>0)w=Math.sign(w)*Math.pow(Math.abs(w),1/(1+sh));\n" +
            "e=t+ (1-t)*env*w;\nk1.value+(k2.value-k1.value)*e}";
    }

    function sampleExpr(invert) {
        return function (yfn) { return function (x) { var y = yfn(x); return invert ? 1 - y : y; }; };
    }

    // bake: set a keyframe on every frame across the selected range following the ease y(x)
    function bakeRange(p, idxs, yfn, startEase, time) {
        var comp = H.activeComp(), i0 = idxs[0], i1 = idxs[idxs.length - 1];
        var t0 = p.keyTime(i0), t1 = p.keyTime(i1), v0 = p.keyValue(i0), v1 = p.keyValue(i1);
        var fd = comp.frameDuration, t, frames = [];
        for (t = t0; t <= t1 + fd / 2; t += fd) { frames.push(Math.min(t, t1)); }
        // remove the in-between selected keys, keep the two ends
        var i;
        for (i = idxs.length - 2; i >= 1; i -= 1) { p.removeKey(idxs[i]); }
        for (i = 0; i < frames.length; i += 1) {
            var x = (t1 - t0) > 1e-9 ? (frames[i] - t0) / (t1 - t0) : 0, e = yfn(x);
            var val;
            if (v0 instanceof Array) { val = []; var k; for (k = 0; k < v0.length; k += 1) { val.push(v0[k] + (v1[k] - v0[k]) * e); } }
            else { val = v0 + (v1 - v0) * e; }
            p.setValueAtTime(frames[i], val);
        }
        return frames.length;
    }

    // apply two-sided temporal ease so the keyframes carry the handles (ease / custom end handles)
    function applyBezierEase(p, idxs, p1x, p1y, p2x, p2y, invert) {
        var i;
        if (invert) { var a = p1x, b = p1y; p1x = 1 - p2x; p1y = 1 - p2y; p2x = 1 - a; p2y = 1 - b; }
        for (i = 0; i < idxs.length - 1; i += 1) {
            var ia = idxs[i], ib = idxs[i + 1];
            try {
                p.setInterpolationTypeAtKey(ia, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                p.setInterpolationTypeAtKey(ib, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
                var outEase = [new KeyframeEase(0, clamp(p1x * 100, 0.1, 100))];
                var inEase = [new KeyframeEase(0, clamp((1 - p2x) * 100, 0.1, 100))];
                var dims = valueDims(p, ia);
                p.setTemporalEaseAtKey(ia, rep(outEase, dims), rep(zeroEase(), dims));
                p.setTemporalEaseAtKey(ib, rep(zeroEase(), dims), rep(inEase, dims));
            } catch (e) { }
        }
    }
    function zeroEase() { return [new KeyframeEase(0, 0.1)]; }
    function valueDims(p, k) { var v = p.keyValue(k); return (v instanceof Array) ? v.length : 1; }
    function rep(easeArr, dims) { var out = [], i; for (i = 0; i < dims; i += 1) { out.push(easeArr[0]); } return out; }

    // ---------- curve20Apply ----------
    F.curve20Apply = function (arg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var parts = String(arg).split("|");
        var model = parts[0], graphMode = parts[1], invert = parts[2] === "1";
        var params = (parts[3] || "").split(","), ptsRaw = parts[4] || "";
        var props = targetProps(comp);
        if (!props.length) { return "ERR:Select a property with at least two keyframes."; }

        var yfn = null, expr = null, bake = false, bezier = null;
        if (model === "custom") {
            var chunks = ptsRaw.split(";"), pts = [], i;
            for (i = 0; i < chunks.length; i += 1) {
                var v = chunks[i].split(",");
                if (v.length >= 6) { pts.push({ x: num(v[0], 0), y: num(v[1], 0), cx1: num(v[2], 0), cy1: num(v[3], 0), cx2: num(v[4], 0), cy2: num(v[5], 0) }); }
            }
            if (pts.length < 2) { return "ERR:The custom curve needs at least two points."; }
            yfn = (function (pp, inv) { return function (x) { var y = customYForX(pp, x); return inv ? 1 - y : y; }; })(pts, invert);
            bake = true;
        } else if (graphMode === "ease") {
            bezier = [num(params[0], 0.33), num(params[1], 0), num(params[2], 0.67), num(params[3], 1)];
            yfn = (function (b, inv) { return function (x) { var y = bezYForX(b[0], b[1], b[2], b[3], x); return inv ? 1 - y : y; }; })(bezier, invert);
        } else if (graphMode === "expr") {
            expr = overshootExpr(model, params);
        } else {   // steps / bake with N,pos
            var count = Math.max(1, Math.round(num(params[0], 4))), pos = Math.round(num(params[1], 0));
            yfn = (function (n, posCode, inv) {
                return function (x) {
                    var step; if (posCode === 1) { step = Math.ceil(x * n) / n; } else if (posCode === 2) { step = Math.round(x * n) / n; } else { step = Math.floor(x * n) / n; }
                    step = clamp(step, 0, 1); return inv ? 1 - step : step;
                };
            })(count, pos, invert);
            bake = true;
        }

        app.beginUndoGroup("Apply Curve");
        var touched = 0, i, j;
        try {
            for (i = 0; i < props.length; i += 1) {
                var p = props[i], idxs = selectedKeyIndices(p);
                if (idxs.length < 2) { continue; }
                if (expr) {
                    if (p.canSetExpression) { p.expression = expr; touched += 1; }
                } else if (graphMode === "ease" && !bake) {
                    applyBezierEase(p, idxs, bezier[0], bezier[1], bezier[2], bezier[3], invert);
                    touched += 1;
                } else if (yfn) {
                    bakeRange(p, idxs, yfn, null, comp.time); touched += 1;
                }
            }
        } catch (e) { app.endUndoGroup(); return "ERR:" + e.toString(); }
        app.endUndoGroup();
        return touched ? "SUCCESS:Curve applied to " + touched + " propert" + (touched === 1 ? "y" : "ies") + "." : "ERR:Nothing to apply the curve to.";
    };

    // ---------- curve20Read: read the first selected 1-D property's selected keys as a normalised curve ----------
    F.curve20Read = function () {
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var props = targetProps(comp), i;
        var p = null;
        for (i = 0; i < props.length; i += 1) { if (!(props[i].value instanceof Array)) { p = props[i]; break; } }
        if (!p) { p = props[0]; }
        if (!p) { return "ERR:Select a property with keyframes."; }
        var idxs = selectedKeyIndices(p);
        if (idxs.length < 2) { return "ERR:Select at least two keyframes."; }
        var t0 = p.keyTime(idxs[0]), t1 = p.keyTime(idxs[idxs.length - 1]);
        var vraw0 = p.keyValue(idxs[0]), vraw1 = p.keyValue(idxs[idxs.length - 1]);
        var v0 = (vraw0 instanceof Array) ? vraw0[0] : vraw0, v1 = (vraw1 instanceof Array) ? vraw1[0] : vraw1;
        var dt = (t1 - t0) || 1, dv = (v1 - v0) || 1, out = [], k;
        for (k = 0; k < idxs.length; k += 1) {
            var vt = p.keyTime(idxs[k]), vraw = p.keyValue(idxs[k]);
            var vv = (vraw instanceof Array) ? vraw[0] : vraw;
            var x = (vt - t0) / dt, y = (vv - v0) / dv;
            // estimate normalised handles from the temporal ease influence, if present
            var cx1 = x - 0.1, cy1 = y, cx2 = x + 0.1, cy2 = y;
            try {
                var inf = p.keyInTemporalEase(idxs[k]); if (inf && inf.length) { cx1 = x - (inf[0].influence / 100) * 0.33; }
                var outf = p.keyOutTemporalEase(idxs[k]); if (outf && outf.length) { cx2 = x + (outf[0].influence / 100) * 0.33; }
            } catch (e) { }
            out.push([x, y, cx1, cy1, cx2, cy2].join(","));
        }
        return "OK|" + out.join(";");
    };
})();
