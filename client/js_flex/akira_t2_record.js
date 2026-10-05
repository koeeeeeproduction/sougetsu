/* Sougetsu Akira FX - Templates 2.0 recorder.
 * Every template draws its preview through spec.preview(ctx, data, t, h) using the FlexT2Preview helper.
 * Before a build we run that preview once more on a recording context at the finished frame and capture what it
 * draws, in comp pixels:
 *   rect / ellipse  -> native AE rectangle / ellipse (size, roundness, rotation)
 *   text            -> editable AE text layer (lines, size, weight, colour, alignment)
 *   icons & paths   -> bezier shapes
 * plus the entrance group (h.enter order + pivot) of everything, so the host can animate it like the preview.
 * The ops travel with the build payload as data.__ops; host/akira_templates2.jsx turns them into layers. */
(function (root) {
    'use strict';

    // ---------- 2D affine matrix [a, b, c, d, e, f] (canvas convention) ----------
    function mul(m, n) {
        return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
            m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    }
    function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
    function vec(m, x, y) { return [m[0] * x + m[2] * y, m[1] * x + m[3] * y]; }
    function scaleOf(m) { return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
    function rotOf(m) { return Math.atan2(m[1], m[0]) * 180 / Math.PI; }
    function r2(v) { return Math.round(v * 100) / 100; }

    // ---------- colours ----------
    function parseColor(c) {
        if (c && typeof c === 'object' && c.__stops) {
            var st = c.__stops; if (!st.length) { return null; }
            var col = parseColor(st[0][1]);
            if (col) { col.grad = { type: c.__type, p: c.__pts, stops: st.map(function (s) { var p = parseColor(s[1]) || { rgb: [0, 0, 0], a: 1 }; return [s[0], p.rgb, p.a]; }) }; }
            return col;
        }
        var s = String(c || '').trim(), m;
        if (!s || s === 'transparent' || s === 'none') { return null; }
        if (s.charAt(0) === '#') {
            var h = s.substring(1);
            if (h.length === 3 || h.length === 4) { h = h.split('').map(function (x) { return x + x; }).join(''); }
            var n = parseInt(h.substring(0, 6), 16), a = h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
            return { rgb: [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255], a: a };
        }
        if ((m = /^rgba?\(([^)]+)\)/i.exec(s))) {
            var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
            return { rgb: [p[0] / 255, p[1] / 255, p[2] / 255], a: p.length > 3 ? p[3] : 1 };
        }
        if (s === 'white') { return { rgb: [1, 1, 1], a: 1 }; }
        if (s === 'black') { return { rgb: [0, 0, 0], a: 1 }; }
        return { rgb: [1, 1, 1], a: 1 };
    }

    function Recorder(W, H) {
        var self = this, ops = [], state, stack = [], path = [], sub = null;
        state = { m: [1, 0, 0, 1, W / 2, H / 2], alpha: 1, fill: '#000', stroke: '#000', lw: 1, font: '10px sans-serif', shadow: null, shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', sx: 0, sy: 0 };
        var group = null, measure = null;
        try { measure = document.createElement('canvas').getContext('2d'); } catch (e) { measure = null; }
        this.ops = ops;
        this.W = W; this.H = H;
        this.setGroup = function (g) { var prev = group; group = g; return prev; };
        this.groupOf = function () { return group; };
        this.state = function () { return state; };
        function push(op) {
            op.g = group ? group.order : -1;
            if (group) { op.pv = group.pivot; }
            if (state.shadowBlur > 0 || state.sx || state.sy) {
                var sc = parseColor(state.shadowColor);
                if (sc && sc.a > 0) { op.sh = { c: sc.rgb, a: sc.a, blur: r2(state.shadowBlur * scaleOf(state.m)), x: r2(state.sx), y: r2(state.sy) }; }
            }
            ops.push(op);
        }
        this.push = push;
        var ctx = {
            canvas: { width: W, height: H },
            save: function () { stack.push(JSON.parse(JSON.stringify(state, function (k, v) { return (v && v.__stops) ? undefined : v; }))); stack[stack.length - 1].fill = state.fill; stack[stack.length - 1].stroke = state.stroke; },
            restore: function () { if (stack.length) { state = stack.pop(); } },
            translate: function (x, y) { state.m = mul(state.m, [1, 0, 0, 1, x, y]); },
            scale: function (x, y) { state.m = mul(state.m, [x, 0, 0, y === undefined ? x : y, 0, 0]); },
            rotate: function (a) { var c = Math.cos(a), s = Math.sin(a); state.m = mul(state.m, [c, s, -s, c, 0, 0]); },
            transform: function (a, b, c, d, e, f) { state.m = mul(state.m, [a, b, c, d, e, f]); },
            setTransform: function (a, b, c, d, e, f) { state.m = (typeof a === 'object') ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]; },
            resetTransform: function () { state.m = [1, 0, 0, 1, 0, 0]; },
            getTransform: function () { var m = state.m; return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; },
            beginPath: function () { path = []; sub = null; },
            moveTo: function (x, y) { sub = { v: [apply(state.m, x, y)], i: [[0, 0]], o: [[0, 0]], closed: false }; path.push(sub); },
            lineTo: function (x, y) { if (!sub) { ctx.moveTo(x, y); return; } sub.v.push(apply(state.m, x, y)); sub.i.push([0, 0]); sub.o.push([0, 0]); },
            bezierCurveTo: function (x1, y1, x2, y2, x, y) {
                if (!sub) { ctx.moveTo(x1, y1); }
                var p0 = sub.v[sub.v.length - 1], c1 = apply(state.m, x1, y1), c2 = apply(state.m, x2, y2), p = apply(state.m, x, y);
                sub.o[sub.o.length - 1] = [c1[0] - p0[0], c1[1] - p0[1]];
                sub.v.push(p); sub.i.push([c2[0] - p[0], c2[1] - p[1]]); sub.o.push([0, 0]);
            },
            quadraticCurveTo: function (qx, qy, x, y) {
                var inv = sub ? sub.v[sub.v.length - 1] : apply(state.m, qx, qy);
                // convert via current (already transformed) point: work in local space using inverse-free trick
                var p0l = self._local(inv), c1x = p0l[0] + 2 / 3 * (qx - p0l[0]), c1y = p0l[1] + 2 / 3 * (qy - p0l[1]);
                ctx.bezierCurveTo(c1x, c1y, x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), x, y);
            },
            arc: function (x, y, r, a0, a1, ccw) { arcPts(x, y, r, r, 0, a0, a1, ccw); },
            ellipse: function (x, y, rx, ry, rot, a0, a1, ccw) { arcPts(x, y, rx, ry, rot, a0, a1, ccw); },
            arcTo: function (x1, y1, x2, y2, r) {
                if (!sub) { ctx.moveTo(x1, y1); return; }
                var p0 = self._local(sub.v[sub.v.length - 1]);
                var d1 = [p0[0] - x1, p0[1] - y1], d2 = [x2 - x1, y2 - y1], l1 = Math.hypot(d1[0], d1[1]), l2 = Math.hypot(d2[0], d2[1]);
                if (!r || l1 === 0 || l2 === 0) { ctx.lineTo(x1, y1); return; }
                var u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2], cos = u1[0] * u2[0] + u1[1] * u2[1], ang = Math.acos(Math.max(-1, Math.min(1, cos)));
                if (ang < 1e-6 || Math.abs(ang - Math.PI) < 1e-6) { ctx.lineTo(x1, y1); return; }
                var tl = r / Math.tan(ang / 2), t1 = [x1 + u1[0] * tl, y1 + u1[1] * tl], t2 = [x1 + u2[0] * tl, y1 + u2[1] * tl];
                ctx.lineTo(t1[0], t1[1]);
                var k = 4 / 3 * Math.tan((Math.PI - ang) / 4) * r;
                ctx.bezierCurveTo(t1[0] - u1[0] * k, t1[1] - u1[1] * k, t2[0] - u2[0] * k, t2[1] - u2[1] * k, t2[0], t2[1]);
            },
            rect: function (x, y, w, h) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); },
            roundRect: function (x, y, w, h, r) { r = Math.min(+(r && r.length ? r[0] : r) || 0, w / 2, h / 2); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
            closePath: function () { if (sub) { sub.closed = true; } },
            fill: function (rule) { emitPath(true, false, rule); },
            stroke: function () { emitPath(false, true); },
            clip: function () { }, fillRect: function (x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); },
            strokeRect: function (x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); ctx.stroke(); },
            clearRect: function () { }, drawImage: function () { }, setLineDash: function () { }, getLineDash: function () { return []; },
            fillText: function (s, x, y) { var p = apply(state.m, x, y), sz = parseFloat((/(\d+(?:\.\d+)?)px/.exec(state.font) || [0, 10])[1]) * scaleOf(state.m); var c = parseColor(state.fill); if (c) { push({ t: 'text', lines: [String(s)], x: r2(p[0]), y: r2(p[1]), size: r2(sz), w: 400, c: c.rgb, a: c.a * state.alpha, align: 'left', lead: sz * 1.2, rot: r2(rotOf(state.m)) }); } },
            strokeText: function () { },
            measureText: function (s) { if (measure) { measure.font = state.font; return measure.measureText(s); } var px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(state.font) || [0, 10])[1]); return { width: String(s).length * px * 0.55 }; },
            createLinearGradient: function (x0, y0, x1, y1) { var g = { __stops: [], __type: 'linear', __pts: [apply(state.m, x0, y0), apply(state.m, x1, y1)] }; g.addColorStop = function (o, c) { g.__stops.push([o, c]); }; return g; },
            createRadialGradient: function (x0, y0, r0, x1, y1, r1) { var g = { __stops: [], __type: 'radial', __pts: [apply(state.m, x1, y1), apply(state.m, x1 + r1, y1)] }; g.addColorStop = function (o, c) { g.__stops.push([o, c]); }; return g; },
            createPattern: function () { return null; }, getImageData: function () { return { data: [] }; }, putImageData: function () { }
        };
        ['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'globalAlpha', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'].forEach(function (k) {
            var map = { fillStyle: 'fill', strokeStyle: 'stroke', lineWidth: 'lw', font: 'font', globalAlpha: 'alpha', shadowBlur: 'shadowBlur', shadowColor: 'shadowColor', shadowOffsetX: 'sx', shadowOffsetY: 'sy' }[k];
            Object.defineProperty(ctx, k, { get: function () { return state[map]; }, set: function (v) { state[map] = v; }, enumerable: true });
        });
        ['lineCap', 'lineJoin', 'textAlign', 'textBaseline', 'globalCompositeOperation', 'imageSmoothingEnabled', 'miterLimit', 'lineDashOffset', 'filter', 'direction'].forEach(function (k) { ctx[k] = ''; });
        this.ctx = ctx;
        // local coords of a transformed point (inverse of the current matrix)
        this._local = function (p) {
            var m = state.m, det = m[0] * m[3] - m[1] * m[2] || 1, x = p[0] - m[4], y = p[1] - m[5];
            return [(m[3] * x - m[2] * y) / det, (-m[1] * x + m[0] * y) / det];
        };
        function arcPts(cx, cy, rx, ry, rot, a0, a1, ccw) {
            var sweep = a1 - a0;
            if (!ccw && sweep < 0) { sweep += Math.PI * 2 * Math.ceil(-sweep / (Math.PI * 2)); }
            if (ccw && sweep > 0) { sweep -= Math.PI * 2 * Math.ceil(sweep / (Math.PI * 2)); }
            if (Math.abs(sweep) > Math.PI * 2) { sweep = sweep > 0 ? Math.PI * 2 : -Math.PI * 2; }
            var n = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2))), step = sweep / n, k = 4 / 3 * Math.tan(step / 4), cr = Math.cos(rot), sr = Math.sin(rot);
            function pt(a) { var x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * cr - y * sr, cy + x * sr + y * cr]; }
            function d(a) { var x = -Math.sin(a) * rx, y = Math.cos(a) * ry; return [x * cr - y * sr, x * sr + y * cr]; }
            var p0 = pt(a0);
            if (sub) { ctx.lineTo(p0[0], p0[1]); } else { ctx.moveTo(p0[0], p0[1]); }
            for (var i = 0; i < n; i++) {
                var s = a0 + i * step, e = s + step, ps = pt(s), pe = pt(e), ds = d(s), de = d(e);
                ctx.bezierCurveTo(ps[0] + ds[0] * k, ps[1] + ds[1] * k, pe[0] - de[0] * k, pe[1] - de[1] * k, pe[0], pe[1]);
            }
        }
        function emitPath(doFill, doStroke, rule) {
            var subs = path.filter(function (s) { return s.v.length > 1; }).map(function (s) {
                return { v: s.v.map(function (p) { return [r2(p[0]), r2(p[1])]; }), i: s.i.map(function (p) { return [r2(p[0]), r2(p[1])]; }), o: s.o.map(function (p) { return [r2(p[0]), r2(p[1])]; }), c: s.closed };
            });
            if (!subs.length) { return; }
            var op = { t: 'path', subs: subs };
            if (doFill) { var f = parseColor(state.fill); if (!f || f.a * state.alpha <= 0) { return; } op.f = f.rgb; op.fa = f.a; if (f.grad) { op.fg = f.grad; } if (rule === 'evenodd') { op.eo = 1; } }
            if (doStroke) { var s = parseColor(state.stroke); if (!s || s.a * state.alpha <= 0) { return; } op.s = s.rgb; op.sa = s.a; op.sw = r2(state.lw * scaleOf(state.m)); }
            op.a = r2(state.alpha);
            push(op);
        }
    }

    // Wrap the preview helper so rect/ellipse/text become native ops and enter() tags groups.
    function wrapHelper(h, rec) {
        var ctx = rec.ctx, origText = h.text, origRect = h.rect, origBox = h.box, origEllipse = h.ellipse;
        function nativeShape(kind, cx, cy, w, hh, r, o) {
            var st = rec.state(), m = st.m, c = apply(m, cx, cy), sc = scaleOf(m), op = { t: kind, x: r2(c[0]), y: r2(c[1]), w: r2(w * sc), h: r2(hh * sc), r: r2((r || 0) * sc), rot: r2(rotOf(m)), a: r2(st.alpha) };
            if (o.fill) { var f = parseColor(o.fill); if (f) { op.f = f.rgb; op.fa = f.a * (o.opacity !== undefined ? o.opacity / 100 : 1); if (f.grad) { op.fg = f.grad; } } }
            if (o.stroke) { var s = parseColor(o.stroke); if (s) { op.s = s.rgb; op.sa = s.a; op.sw = r2((o.strokeW || 2) * sc); } }
            if (op.f || op.s) { rec.push(op); }
        }
        h.rect = function (o) { nativeShape('rect', o.x || 0, o.y || 0, o.w, o.h, o.r, o); };
        h.box = function (l, tp, r, b, o) { nativeShape('rect', (l + r) / 2, (tp + b) / 2, r - l, b - tp, o.r, o); };
        h.ellipse = function (o) { nativeShape('ellipse', o.x || 0, o.y || 0, o.w, o.h || o.w, 0, o); };
        h.text = function (s, o) {
            o = o || {};
            var box = origText(s, Object.assign({}, o, { draw: false }));
            if (o.draw === false) { return box; }
            var col = parseColor(o.color || '#ffffff'), st = rec.state(), m = st.m, sc = scaleOf(m);
            if (!col || !box.lines.length) { return box; }
            var align = o.align === 'center' ? 'center' : (o.align === 'right' ? 'right' : 'left');
            var ax = align === 'left' ? box.l : (align === 'right' ? box.r : (box.l + box.r) / 2), base = box.t + box.size * 0.78, p = apply(m, ax, base);
            var lead = (box.lines.length > 1) ? (box.b - box.t - box.size * 1.02) / (box.lines.length - 1) : box.size * 1.2;
            rec.push({ t: 'text', lines: box.lines, x: r2(p[0]), y: r2(p[1]), size: r2(box.size * sc), w: o.weight || 'regular', role: o.role || '', c: col.rgb, a: r2(col.a * st.alpha), align: align, lead: r2(lead * sc), rot: r2(rotOf(m)) });
            return box;
        };
        h.enter = function (order, px, py, fn, anim) {
            if (anim === false) { fn(); return; }
            var pv = apply(rec.state().m, px || 0, py || 0), prev = rec.setGroup({ order: +order || 0, pivot: [r2(pv[0]), r2(pv[1])] });
            try { fn(); } finally { rec.setGroup(prev); }
        };
        h.clip = function () { };
        return h;
    }

    root.AkiraT2Record = function (spec, data) {
        var W = spec.size[0], H = spec.size[1], rec = new Recorder(W, H);
        var h = wrapHelper(root.FlexT2Preview(rec.ctx, data, spec, 9999), rec);
        rec.ctx.save();
        spec.preview(rec.ctx, data, 9999, h);
        rec.ctx.restore();
        return rec.ops;
    };
})(window);
