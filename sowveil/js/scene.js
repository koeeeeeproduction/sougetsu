/* Sowveil - scene renderer for Templates. A template is a "scene": comp settings + layers (rect, ellipse, path,
   text, grad, null) with keyframed tracks and a few behaviours. The same scene JSON drives this canvas preview
   and the After Effects builder (host/sv_scene.jsx), so the live preview is what gets built.
   Keys: [t, value, ease]; ease names the segment that ENDS at that key:
     'linear' | 'hold' | [outInfluence, inInfluence] | one of EASES below (AE: KeyframeEase(0, influence) both sides). */
(function (root) {
    'use strict';
    var EASES = { inOut: [60, 60], soft: [33, 33], out: [8, 88], in: [88, 8], snap: [4, 96], expo: [2, 98] };
    function easeOf(e) { if (e === 'linear' || e === 'hold') { return e; } if (e && e.length === 2) { return e; } return EASES[e] || EASES.inOut; }

    // cubic-bezier(a, 0, 1 - b, 1): what AE draws for speed-0 keys with outgoing influence a% and incoming influence b%
    function bez(a, b, x) {
        var x1 = a / 100, x2 = 1 - b / 100, lo = 0, hi = 1, s = x, i;
        for (i = 0; i < 24; i++) {
            s = (lo + hi) / 2;
            var xs = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
            if (xs < x) { lo = s; } else { hi = s; }
        }
        return 3 * (1 - s) * s * s + s * s * s;
    }
    function lerp(a, b, f) {
        if (typeof a === 'number') { return a + (b - a) * f; }
        if (typeof a === 'string') { return f < 1 ? a : b; }
        var o = [], i; for (i = 0; i < a.length; i++) { o.push(a[i] + (b[i] - a[i]) * f); } return o;
    }
    function hexToArr(c) { if (typeof c !== 'string') { return c; } var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(c); return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1]; }
    function sample(track, t, base) {
        if (!track || !track.length) { return base; }
        if (t <= track[0][0]) { return track[0][1]; }
        var i, last = track[track.length - 1];
        if (t >= last[0]) { return last[1]; }
        for (i = 1; i < track.length; i++) {
            if (t < track[i][0]) {
                var k0 = track[i - 1], k1 = track[i], e = easeOf(k1[2]), f = (t - k0[0]) / Math.max(1e-6, k1[0] - k0[0]);
                if (e === 'hold') { return k0[1]; }
                if (e !== 'linear') { f = bez(e[0], e[1], f); }
                var v0 = k0[1], v1 = k1[1];
                if (typeof v0 === 'string' && v0.charAt(0) === '#') { v0 = hexToArr(v0); v1 = hexToArr(v1); return lerp(v0, v1, f); }
                return lerp(v0, v1, f);
            }
        }
        return last[1];
    }
    function css(c, a) {
        if (c === undefined || c === null) { return 'transparent'; }
        var v = typeof c === 'string' ? hexToArr(c) : c;
        return 'rgba(' + Math.round(v[0] * 255) + ',' + Math.round(v[1] * 255) + ',' + Math.round(v[2] * 255) + ',' + (a === undefined ? 1 : a) + ')';
    }

    // ---------- behaviours (mirrored as expressions in the AE builder) ----------
    function prop(L, name, t) {
        var base = L[name], v = sample(L.anim && L.anim[name], t, base);
        return v;
    }
    function world(L, t, byName) {
        var p = prop(L, 'pos', t) || [0, 0], s = prop(L, 'scale', t), r = prop(L, 'rot', t) || 0, a = L.anchor || [0, 0];
        s = s === undefined ? [100, 100] : (typeof s === 'number' ? [s, s] : s);
        var B = L.behave || {};
        if (B.float) { p = [p[0] + (B.float.x || 0) * Math.sin((t + (B.float.phase || 0)) * (B.float.freq || 0.5) * Math.PI * 2), p[1] + (B.float.amp || 0) * Math.sin((t + (B.float.phase || 0)) * (B.float.freq || 0.5) * Math.PI * 2)]; }
        if (B.spin) { r += t * B.spin; }
        if (B.pulse) { var k = 1 + (B.pulse.amp || 0.05) * Math.sin(t * (B.pulse.freq || 1) * Math.PI * 2); s = [s[0] * k, s[1] * k]; }
        if (B.shake && t >= B.shake.t && t < B.shake.t + B.shake.dur) { var q = 1 - (t - B.shake.t) / B.shake.dur; p = [p[0] + Math.sin(t * 97) * B.shake.amp * q, p[1] + Math.cos(t * 83) * B.shake.amp * q]; }
        var m = { p: p, s: s, r: r, a: a };
        m.parent = L.parent && byName[L.parent] ? world(byName[L.parent], t, byName) : null;
        return m;
    }
    function applyWorld(g, m) {
        if (m.parent) { applyWorld(g, m.parent); }
        g.translate(m.p[0], m.p[1]); g.rotate(m.r * Math.PI / 180); g.scale(m.s[0] / 100, m.s[1] / 100); g.translate(-m.a[0], -m.a[1]);
    }
    function opacityOf(L, t, byName) {
        var o = prop(L, 'opacity', t); o = o === undefined ? 100 : o;
        var B = L.behave || {};
        if (B.blink && t >= (B.blink.from || 0) && (B.blink.to === undefined || t < B.blink.to)) { o *= Math.floor(t / (B.blink.period || 1) * 2) % 2 === 0 ? 1 : 0; }
        return o / 100;
    }
    function textOf(L, t) {
        var B = L.behave || {};
        if (B.type) { var n = Math.max(0, Math.floor((t - B.type.start) * B.type.cps)); return String(B.type.text).substr(0, n); }
        if (B.count) {
            var c = B.count, f = Math.max(0, Math.min(1, (t - c.start) / c.dur)); f = 1 - Math.pow(1 - f, 3);
            var v = c.from + (c.to - c.from) * f, s = v.toFixed(c.dec || 0);
            if (c.sep) { s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
            return (c.prefix || '') + s + (c.suffix || '');
        }
        return String(L.text);
    }

    // ---------- shapes ----------
    function rrPath(g, w, h, r) {
        r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
        var x = -w / 2, y = -h / 2;
        g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
        return 2 * (w + h) - (8 - 2 * Math.PI) * r;
    }
    function elPath(g, w, h) {
        g.beginPath(); g.ellipse(0, 0, Math.max(0, w / 2), Math.max(0, h / 2), 0, -Math.PI / 2, Math.PI * 1.5);
        var a = w / 2, b = h / 2; return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    }
    function pPath(g, pts, closed) {
        var len = 0, i; g.beginPath();
        for (i = 0; i < pts.length; i++) { g[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); if (i) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); } }
        if (closed) { g.closePath(); len += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]); }
        return len;
    }
    function fillStyle(g, f, w, h, alpha) {
        if (f && typeof f === 'object' && f.colors) {
            var ang = (f.angle === undefined ? 90 : f.angle) * Math.PI / 180, dx = Math.cos(ang) * w / 2, dy = Math.sin(ang) * h / 2, gr = g.createLinearGradient(-dx, -dy, dx, dy);
            gr.addColorStop(0, css(f.colors[0], alpha)); gr.addColorStop(1, css(f.colors[1], alpha)); return gr;
        }
        return css(f, alpha);
    }
    function drawLayer(g, L, t, byName) {
        if (L.type === 'null') { return; }
        if (t < (L.inPoint || 0) || (L.outPoint !== undefined && t >= L.outPoint)) { return; }
        var op = opacityOf(L, t, byName); if (op <= 0.001) { return; }
        g.save();
        if (L.clip) { var c = L.clip, cr = sample(c.anim, t, c.rect); g.beginPath(); g.rect(cr[0], cr[1], cr[2], cr[3]); g.clip(); }
        applyWorld(g, world(L, t, byName));
        g.globalAlpha = op;
        var blur = prop(L, 'blur', t);
        var flt = [];
        if (blur) { flt.push('blur(' + blur + 'px)'); }
        if (flt.length) { g.filter = flt.join(' '); }
        if (L.shadow) { g.shadowColor = css(L.shadow.color || '#000000', (L.shadow.opacity === undefined ? 40 : L.shadow.opacity) / 100); g.shadowBlur = L.shadow.blur || 20; g.shadowOffsetY = L.shadow.dist === undefined ? 10 : L.shadow.dist; }
        if (L.glow) { g.shadowColor = css(L.glow.color || L.fill || '#ffffff', 0.9); g.shadowBlur = L.glow.radius || 30; g.shadowOffsetY = 0; }
        if (L.type === 'text') {
            var size = prop(L, 'fontSize', t) || L.fontSize || 60;
            g.font = (L.weight || 700) + ' ' + size + 'px ' + (L.font === 'serif' ? 'Georgia, serif' : L.font === 'mono' ? 'Menlo, Consolas, monospace' : 'Arial, Helvetica, sans-serif');
            g.textAlign = L.align || 'center'; g.textBaseline = 'alphabetic';
            try { g.letterSpacing = ((prop(L, 'tracking', t) || 0) * size / 1000) + 'px'; } catch (e) { }
            g.fillStyle = css(prop(L, 'fill', t) || '#ffffff');
            var lines = textOf(L, t).split('\n'), i;
            for (i = 0; i < lines.length; i++) { g.fillText(lines[i], 0, i * size * 1.2); }
        } else {
            var sz = prop(L, 'size', t) || [100, 100], len;
            if (L.type === 'rect' || L.type === 'grad') { len = rrPath(g, sz[0], sz[1], prop(L, 'radius', t) || 0); }
            else if (L.type === 'ellipse') { len = elPath(g, sz[0], sz[1]); }
            else { len = pPath(g, L.points || [], !!L.closed); }
            var fill = L.type === 'grad' ? L.grad : prop(L, 'fill', t);
            if (fill) { g.fillStyle = fillStyle(g, fill, sz[0], sz[1], (prop(L, 'fillOpacity', t) === undefined ? 100 : prop(L, 'fillOpacity', t)) / 100); g.fill(); }
            if (L.stroke) {
                var te = prop(L, 'trimEnd', t), ts = prop(L, 'trimStart', t) || 0;
                te = te === undefined ? 100 : te;
                if (te - ts <= 0.01) { g.restore(); return; }
                if (ts > 0 || te < 100) { g.setLineDash([len * (te - ts) / 100, len * 2]); g.lineDashOffset = -len * ts / 100; }
                g.shadowColor = 'transparent';
                if (L.glow) { g.shadowColor = css(L.glow.color || L.stroke.color, 0.9); g.shadowBlur = L.glow.radius || 30; }
                g.strokeStyle = css(prop(L, 'strokeColor', t) || L.stroke.color); g.lineWidth = prop(L, 'strokeWidth', t) || L.stroke.width || 4;
                g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
            }
        }
        g.restore();
    }
    function background(g, S, W, H) {
        if (S.bg && typeof S.bg === 'object' && S.bg.colors) {
            var ang = (S.bg.angle === undefined ? 90 : S.bg.angle) * Math.PI / 180, cx = W / 2, cy = H / 2, dx = Math.cos(ang) * W / 2, dy = Math.sin(ang) * H / 2;
            var gr = g.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy); gr.addColorStop(0, css(S.bg.colors[0])); gr.addColorStop(1, css(S.bg.colors[1])); g.fillStyle = gr;
        } else { g.fillStyle = css(S.bg || '#000000'); }
        g.fillRect(0, 0, W, H);
    }
    // draw scene S at time t into a canvas of any size (letterboxed to the comp aspect)
    function render(g, S, t, W, H) {
        var byName = {}, i;
        for (i = 0; i < S.layers.length; i++) { byName[S.layers[i].name] = S.layers[i]; }
        var k = Math.min(W / S.w, H / S.h);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        g.translate((W - S.w * k) / 2, (H - S.h * k) / 2); g.scale(k, k);
        g.beginPath(); g.rect(0, 0, S.w, S.h); g.clip();
        background(g, S, S.w, S.h);
        for (i = 0; i < S.layers.length; i++) { try { drawLayer(g, S.layers[i], t, byName); } catch (e) { } }
        g.restore();
    }
    root.SVScene = { render: render, sample: sample, bez: bez, EASES: EASES, easeOf: easeOf, hexToArr: hexToArr };
})(typeof window !== 'undefined' ? window : globalThis);
