/* Sougetsu Akira FX - animated anime-inspired themes.
 * Adds themes to AkiraThemes (colours + panel skin come from the theme engine) and runs one lightweight canvas
 * animation per theme behind the panel, plus a short signature burst over it when the theme is applied.
 * All art is drawn procedurally and original: moods inspired by each series, no characters or logos.
 * Pauses when the panel is hidden or blurred, when Theme FX is off, and honours reduced motion. ~30 fps cap. */
(function () {
    'use strict';
    if (!window.AkiraThemes) { return; }
    var THEMES = window.AkiraThemes.list();

    function vars(bg, accent, a1, a2) {
        return { '--bg-deep': bg, '--panel-bg': '#000000', '--glass-border': rgba(accent, 0.18), '--akira-ember': accent, '--akira-aura-1': a1 || rgba(accent, 0.12), '--akira-aura-2': a2 || rgba(accent, 0.06) };
    }
    function rgb(h) { var n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + a + ')'; }
    function T(label, accent, ink, ember, hot, bg, anime, extra) {
        var t = { label: label, accent: accent, ink: ink, ember: ember, hot: hot, vars: vars(bg, accent), fx: { aura: true }, anime: anime, burst: false, trail: false };
        if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) { t[k] = extra[k]; } } }
        return t;
    }

    // ---------- the themes (names are original; inspiration in comments) ----------
    var ADD = {
        frostmage:   T('Frost Mage', '#9fd8ff', '#06121c', '#d9c27a', '#ffffff', '#070d14', 'frost'),
        mirrorlord:  T('Mirror Lord', '#b58cff', '#12061f', '#6a3fd1', '#f1e8ff', '#0b0614', 'mirror'),
        voxel:       T('Voxel World', '#5fbf3a', '#0b1a05', '#8b5a2b', '#d6f5a8', '#0d1208', 'voxel'),
        champion7:   T('Champion 7', '#e8c15a', '#1a1200', '#d4202c', '#fff6d6', '#120a04', 'champion'),
        cursed:      T('Cursed Domain', '#8a5cff', '#0c0618', '#2e7bff', '#d9ccff', '#07040e', 'cursed'),
        crimsoncloud:T('Crimson Cloud', '#e3242b', '#1a0204', '#7a0a10', '#ffd0d0', '#0a0405', 'cloud', { cursor: 'tomoe' }),
        grandline:   T('Pirate Seas', '#f2b84b', '#140c00', '#1f78c8', '#fff1c9', '#05101c', 'sea'),
        soulreaper:  T('Spirit Blade', '#ff2d3d', '#140204', '#ffffff', '#ffd6d9', '#050505', 'reaper'),
        breath:      T('Breath Waves', '#3fa7ff', '#030b18', '#e2363e', '#cfe9ff', '#050a16', 'breath'),
        scout:       T('Wall Scout', '#9aa86a', '#10120a', '#7a5a36', '#e9e3c8', '#0d0f08', 'scout'),
        monarch:     T('Shadow Monarch', '#7f6bff', '#07061a', '#2fa8ff', '#dcd7ff', '#04030c', 'monarch'),
        shinigami:   T('Shinigami Note', '#d11f2a', '#0e0e0e', '#e8e2d0', '#ffffff', '#060606', 'note'),
        chainsaw:    T('Chainsaw Riot', '#ff7a1a', '#1a0800', '#d41f1f', '#ffd2a8', '#0a0503', 'saw'),
        neonrunner:  T('Neon Runner', '#f7ee2f', '#121000', '#ff2fa8', '#fffbd0', '#07040c', 'neon', { cursor: 'cross' }),
        northern:    T('Northern Saga', '#9bb8c9', '#0a1014', '#b08a4a', '#e8f1f6', '#080b0e', 'north'),
        gothic:      T('Gothic Crimson', '#b3001b', '#120005', '#5c0010', '#ffc2cc', '#060003', 'gothic'),
        kingscommand:T("King's Command", '#c99a2e', '#100a00', '#7b3cc9', '#ffecbf', '#08050f', 'geass'),
        aurahunter:  T('Aura Hunter', '#33d17a', '#03140a', '#2f8cff', '#d2ffe6', '#04100b', 'aura'),
        menacing:    T('Menacing Pose', '#ff3fd2', '#14001a', '#ffd400', '#ffffff', '#0a0412', 'jojo')
    };
    for (var id in ADD) { if (ADD.hasOwnProperty(id)) { THEMES[id] = ADD[id]; } }

    // ---------- canvas plumbing ----------
    var frames = 0, bg = null, bgx = null, fg = null, fgx = null, raf = 0, last = 0, W = 0, H = 0, DPR = 1, scene = null, burst = null, curKind = '';
    function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
    function fxOff() { return document.body.classList.contains('akira-fx-off'); }
    function canvas(id, z, extra) {
        var c = document.getElementById(id);
        if (!c) { c = document.createElement('canvas'); c.id = id; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + z + ';' + (extra || ''); document.body.appendChild(c); }
        return c;
    }
    function size() {
        DPR = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
        [bg, fg].forEach(function (c) { if (c) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); } });
        if (bgx) { bgx.setTransform(DPR, 0, 0, DPR, 0, 0); } if (fgx) { fgx.setTransform(DPR, 0, 0, DPR, 0, 0); }
        if (scene && scene.resize) { scene.resize(); }
    }
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function pool(n, make) { var a = []; for (var i = 0; i < n; i++) { a.push(make(i, true)); } return a; }

    // ---------- shared painters ----------
    function glow(x, cx, cy, r, col, a) { r = Math.max(0.5, r); var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
    function star(x, cx, cy, r, col, a) { x.save(); x.globalAlpha = a; x.fillStyle = col; x.beginPath(); for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * 0.28 : r, an = i * Math.PI / 4; x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.fill(); x.restore(); }
    function circleSigil(x, cx, cy, r, col, a, rot, spokes) {
        x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = 1.2;
        x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, r * 0.78, 0, Math.PI * 2); x.stroke();
        x.beginPath(); for (var i = 0; i <= spokes; i++) { var an = i * Math.PI * 2 / spokes * 2; x.lineTo(Math.cos(an) * r * 0.78, Math.sin(an) * r * 0.78); } x.stroke();
        for (i = 0; i < spokes * 2; i++) { var b = i * Math.PI / spokes; x.fillStyle = col; x.fillRect(Math.cos(b) * r * 0.89 - 1, Math.sin(b) * r * 0.89 - 1, 2, 2); }
        x.restore();
    }
    function cloud(x, cx, cy, s, fill, edge) {
        x.save(); x.translate(cx, cy); x.scale(s, s); x.beginPath();
        x.moveTo(-30, 8); x.bezierCurveTo(-42, 8, -42, -10, -28, -9); x.bezierCurveTo(-26, -24, -6, -26, -2, -14);
        x.bezierCurveTo(4, -28, 30, -24, 28, -8); x.bezierCurveTo(42, -8, 42, 8, 30, 8); x.closePath();
        x.fillStyle = fill; x.fill(); x.lineWidth = 2.4 / s; x.strokeStyle = edge; x.stroke(); x.restore();
    }
    var RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

    // ---------- scenes: init(x) -> state, draw(x, t, dt) ----------
    var SCENES = {
        frost: function () {
            var flakes = pool(38, function () { return { x: rnd(0, W), y: rnd(-H, H), r: rnd(1, 2.6), v: rnd(8, 22), s: rnd(0, 6), blue: Math.random() < 0.25 }; });
            return { draw: function (x, t, dt) {
                circleSigil(x, W - 60, H - 70, 90, '#9fd8ff', 0.16, t * 0.08, 6); circleSigil(x, W - 60, H - 70, 52, '#d9c27a', 0.18, -t * 0.12, 5);
                flakes.forEach(function (f) { f.y += f.v * dt; f.x += Math.sin(t + f.s) * 6 * dt; if (f.y > H + 5) { f.y = -5; f.x = rnd(0, W); }
                    if (f.blue) { flower(x, f.x, f.y, f.r * 2.2, t + f.s); } else { x.fillStyle = 'rgba(235,245,255,0.65)'; x.beginPath(); x.arc(f.x, f.y, f.r, 0, 7); x.fill(); } });
            } };
            function flower(x, cx, cy, r, a) { x.save(); x.translate(cx, cy); x.rotate(a * 0.3); x.fillStyle = 'rgba(120,180,255,0.75)'; for (var i = 0; i < 5; i++) { x.rotate(Math.PI * 2 / 5); x.beginPath(); x.ellipse(0, r * 0.6, r * 0.35, r * 0.6, 0, 0, 7); x.fill(); } x.fillStyle = '#fff6c0'; x.beginPath(); x.arc(0, 0, r * 0.25, 0, 7); x.fill(); x.restore(); }
        },
        mirror: function () {
            var shards = pool(16, function () { return { x: rnd(0, W), y: rnd(-H, H), s: rnd(6, 16), r: rnd(0, 6), vr: rnd(-1, 1), v: rnd(10, 30), p: [[rnd(-1, 0), -1], [1, rnd(-0.5, 0.5)], [rnd(-0.6, 0.6), 1]] }; });
            return { draw: function (x, t, dt) {
                glow(x, W * 0.5, H * 0.3, Math.max(W, H) * 0.5, '#b58cff', 0.08 + Math.sin(t * 0.7) * 0.03);
                shards.forEach(function (s) { s.y += s.v * dt; s.r += s.vr * dt; if (s.y > H + 20) { s.y = -20; s.x = rnd(0, W); }
                    x.save(); x.translate(s.x, s.y); x.rotate(s.r); x.beginPath(); s.p.forEach(function (q) { x.lineTo(q[0] * s.s, q[1] * s.s); }); x.closePath();
                    var sh = 0.25 + 0.25 * Math.sin(t * 2 + s.x); x.fillStyle = 'rgba(225,210,255,' + (0.08 + sh * 0.2) + ')'; x.fill(); x.strokeStyle = 'rgba(240,230,255,' + (0.3 + sh) + ')'; x.lineWidth = 0.8; x.stroke(); x.restore(); });
            } };
        },
        voxel: function () {
            var cols = ['#5fbf3a', '#8b5a2b', '#7d7d7d', '#3b8fd6', '#e0c65a'], blocks = pool(18, function () { return { x: Math.floor(rnd(0, W / 12)) * 12, y: rnd(-H, H), v: rnd(15, 35), c: pick(cols), s: pick([8, 12]) }; });
            return { draw: function (x, t, dt) {
                for (var gx = 0; gx < W; gx += 12) { x.fillStyle = (gx / 12) % 3 ? '#4fa52f' : '#5fbf3a'; x.fillRect(gx, H - 14, 12, 6); x.fillStyle = (gx / 12) % 2 ? '#6b4423' : '#7a4f2a'; x.fillRect(gx, H - 8, 12, 8); }
                blocks.forEach(function (b) { b.y += b.v * dt; if (b.y > H - 14 - b.s) { b.y = -20; b.x = Math.floor(rnd(0, W / 12)) * 12; b.c = pick(cols); }
                    var yy = Math.round(b.y / 2) * 2; x.globalAlpha = 0.5; x.fillStyle = b.c; x.fillRect(b.x, yy, b.s, b.s); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(b.x, yy + b.s - 3, b.s, 3); x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(b.x, yy, b.s, 2); x.globalAlpha = 1; });
            } };
        },
        champion: function () {
            var conf = pool(40, function () { return { x: rnd(0, W), y: rnd(-H, H), v: rnd(20, 50), r: rnd(0, 6), vr: rnd(-4, 4), c: pick(['#e8c15a', '#ffffff', '#d4202c', '#f5d98a']) }; });
            return { draw: function (x, t, dt) {
                var sx = W * (0.5 + 0.45 * Math.sin(t * 0.4)); x.save(); x.globalAlpha = 0.07; x.fillStyle = '#fff6d6'; x.beginPath(); x.moveTo(sx - 20, 0); x.lineTo(sx + 20, 0); x.lineTo(sx + 160, H); x.lineTo(sx - 160, H); x.fill(); x.restore();
                x.save(); x.globalAlpha = 0.06; x.font = '900 ' + Math.min(W, H) * 0.7 + 'px Inter, Arial'; x.fillStyle = '#e8c15a'; x.textAlign = 'center'; x.fillText('7', W * 0.5, H * 0.72); x.restore();
                conf.forEach(function (c) { c.y += c.v * dt; c.r += c.vr * dt; if (c.y > H + 10) { c.y = -10; c.x = rnd(0, W); } x.save(); x.translate(c.x, c.y); x.rotate(c.r); x.globalAlpha = 0.55; x.fillStyle = c.c; x.fillRect(-3, -1.5, 6, 3); x.restore(); });
            } };
        },
        cursed: function () {
            var wisps = pool(26, function () { return { x: rnd(0, W), y: rnd(0, H), v: rnd(15, 40), r: rnd(6, 16), l: rnd(0, 1) }; }), stars = pool(50, function () { return [rnd(0, W), rnd(0, H), rnd(0.3, 1)]; }), eye = 0;
            return { draw: function (x, t, dt) {
                stars.forEach(function (s) { x.fillStyle = 'rgba(200,190,255,' + (0.15 + 0.2 * Math.sin(t * 2 + s[0]) * s[2]) + ')'; x.fillRect(s[0], s[1], 1.2, 1.2); });
                wisps.forEach(function (w) { w.y -= w.v * dt; w.l -= dt * 0.35; if (w.l <= 0 || w.y < -20) { w.x = rnd(0, W); w.y = H + rnd(0, 40); w.l = 1; }
                    glow(x, w.x + Math.sin(t * 2 + w.r) * 6, w.y, w.r * 2, Math.random() < 0.5 ? '#8a5cff' : '#2e7bff', 0.25 * w.l); });
                eye += dt; var e = (eye % 9); if (e < 1.6) { var a = Math.sin(e / 1.6 * Math.PI); glow(x, W * 0.42, H * 0.18, 18, '#7fd4ff', 0.6 * a); glow(x, W * 0.58, H * 0.18, 18, '#7fd4ff', 0.6 * a); x.fillStyle = 'rgba(220,245,255,' + a + ')'; x.beginPath(); x.arc(W * 0.42, H * 0.18, 2.5, 0, 7); x.arc(W * 0.58, H * 0.18, 2.5, 0, 7); x.fill(); }
            } };
        },
        cloud: function () {
            var cl = pool(6, function () { return { x: rnd(-80, W), y: rnd(20, H - 40), s: rnd(0.6, 1.3), v: rnd(6, 14) }; }), leaves = pool(14, function () { return { x: rnd(0, W), y: rnd(-H, H), v: rnd(18, 34), r: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                cl.forEach(function (c) { c.x += c.v * dt; if (c.x > W + 60) { c.x = -60; c.y = rnd(20, H - 40); } x.globalAlpha = 0.22; cloud(x, c.x, c.y, c.s, '#c8102e', '#ffffff'); x.globalAlpha = 1; });
                leaves.forEach(function (l) { l.y += l.v * dt; l.x += Math.sin(t + l.r) * 10 * dt; l.r += dt; if (l.y > H + 10) { l.y = -10; l.x = rnd(0, W); } x.save(); x.translate(l.x, l.y); x.rotate(l.r); x.fillStyle = 'rgba(60,140,60,0.5)'; x.beginPath(); x.ellipse(0, 0, 5, 2.2, 0, 0, 7); x.fill(); x.restore(); });
            } };
        },
        sea: function () {
            var coins = pool(10, function () { return { x: rnd(0, W), y: rnd(0, H * 0.7), p: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                compass(x, 70, 90, 54, t);
                for (var k = 0; k < 3; k++) { x.beginPath(); x.moveTo(0, H); for (var px = 0; px <= W; px += 8) { x.lineTo(px, H - 26 - k * 10 + Math.sin(px * 0.03 + t * (1.2 + k * 0.3) + k) * 5); } x.lineTo(W, H); x.closePath(); x.fillStyle = ['rgba(20,90,170,0.25)', 'rgba(30,120,200,0.22)', 'rgba(60,160,230,0.18)'][k]; x.fill(); }
                coins.forEach(function (c) { var a = 0.5 + 0.5 * Math.sin(t * 2 + c.p); star(x, c.x, c.y, 3 + a * 3, '#f2b84b', 0.25 + a * 0.4); });
            } };
            function compass(x, cx, cy, r, t) { x.save(); x.translate(cx, cy); x.rotate(Math.sin(t * 0.5) * 0.15); x.globalAlpha = 0.2; x.strokeStyle = '#f2b84b'; x.lineWidth = 1; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); for (var i = 0; i < 4; i++) { x.rotate(Math.PI / 2); x.beginPath(); x.moveTo(0, -r); x.lineTo(6, 0); x.lineTo(-6, 0); x.closePath(); x.fillStyle = i % 2 ? '#fff1c9' : '#f2b84b'; x.fill(); } x.restore(); }
        },
        reaper: function () {
            var rib = pool(10, function () { return { x: rnd(0, W), y: rnd(-H, H), v: rnd(20, 45), w: rnd(0, 6) }; }), slash = { t: 3 };
            return { draw: function (x, t, dt) {
                rib.forEach(function (r) { r.y += r.v * dt; if (r.y > H + 40) { r.y = -40; r.x = rnd(0, W); } x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 1.4; x.beginPath(); for (var k = 0; k < 6; k++) { x.lineTo(r.x + Math.sin(t * 3 + r.w + k * 0.6) * 6, r.y - k * 7); } x.stroke(); });
                slash.t += dt; if (slash.t > 4) { slash.t = 0; slash.y = rnd(H * 0.2, H * 0.8); }
                if (slash.t < 0.35) { var p = slash.t / 0.35; x.save(); x.globalAlpha = 1 - p; x.strokeStyle = '#ff2d3d'; x.lineWidth = 3; x.beginPath(); x.moveTo(-20, slash.y + 40); x.lineTo(W * p * 1.4, slash.y - 40 * p); x.stroke(); x.restore(); }
            } };
        },
        breath: function () {
            var pet = pool(12, function () { return { x: rnd(0, W), y: rnd(-H, H), v: rnd(15, 30), r: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                x.save(); x.globalAlpha = 0.07; x.strokeStyle = '#3fa7ff'; x.lineWidth = 1;   // seigaiha wave pattern along the bottom
                for (var row = 0; row < 3; row++) { for (var cx = (row % 2) * 14; cx < W + 28; cx += 28) { for (var rr = 14; rr > 2; rr -= 4) { x.beginPath(); x.arc(cx, H - row * 8, rr, Math.PI, 0); x.stroke(); } } }
                x.restore();
                for (var k = 0; k < 2; k++) { x.beginPath(); for (var px = 0; px <= W; px += 6) { var yy = H * (0.35 + k * 0.25) + Math.sin(px * 0.018 + t * 1.6 + k * 2) * 22 * Math.sin(t * 0.5 + k); px === 0 ? x.moveTo(px, yy) : x.lineTo(px, yy); } x.strokeStyle = k ? 'rgba(226,54,62,0.22)' : 'rgba(63,167,255,0.25)'; x.lineWidth = 2.5; x.stroke(); }
                pet.forEach(function (p) { p.y += p.v * dt; p.r += dt; if (p.y > H) { p.y = -10; p.x = rnd(0, W); } x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = 'rgba(255,120,90,0.45)'; x.beginPath(); x.moveTo(0, -4); x.quadraticCurveTo(4, 0, 0, 5); x.quadraticCurveTo(-4, 0, 0, -4); x.fill(); x.restore(); });
            } };
        },
        scout: function () {
            var flares = [], birds = pool(5, function () { return { x: rnd(-W, 0), y: rnd(20, H * 0.4), v: rnd(30, 50), p: rnd(0, 6) }; }), next = 1;
            return { draw: function (x, t, dt) {
                x.save(); x.globalAlpha = 0.06; x.strokeStyle = '#e9e3c8'; for (var gx = 0; gx < W; gx += 32) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); } for (var gy = 0; gy < H; gy += 32) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
                x.globalAlpha = 0.08; for (var c = 1; c < 5; c++) { x.beginPath(); x.ellipse(W * 0.7, H * 0.6, c * 40, c * 26, 0.4, 0, 7); x.stroke(); } x.restore();
                next -= dt; if (next <= 0) { next = rnd(2.5, 5); flares.push({ x: rnd(W * 0.1, W * 0.9), y: H, v: rnd(80, 120), c: pick(['#9aa86a', '#e04a3a', '#e9e3c8']), trail: [] }); }
                flares = flares.filter(function (f) { f.y -= f.v * dt; f.v *= 0.995; f.trail.push([f.x + Math.sin(f.y * 0.05) * 3, f.y]); if (f.trail.length > 40) { f.trail.shift(); }
                    f.trail.forEach(function (p, i) { x.fillStyle = 'rgba(200,200,190,' + (i / 40 * 0.15) + ')'; x.beginPath(); x.arc(p[0], p[1], 3 + (40 - i) * 0.25, 0, 7); x.fill(); });
                    glow(x, f.x, f.y, 10, f.c, 0.8); return f.y > H * 0.15; });
                birds.forEach(function (b) { b.x += b.v * dt; if (b.x > W + 20) { b.x = -20; b.y = rnd(20, H * 0.4); } var w = Math.sin(t * 8 + b.p) * 4; x.strokeStyle = 'rgba(233,227,200,0.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(b.x - 6, b.y + w); x.lineTo(b.x, b.y); x.lineTo(b.x + 6, b.y + w); x.stroke(); });
            } };
        },
        monarch: function () {
            var sh = pool(45, function () { return { x: rnd(0, W), y: rnd(0, H), v: rnd(10, 30), s: rnd(1, 3), l: rnd(0, 1) }; });
            return { draw: function (x, t, dt) {
                glow(x, W * 0.5, H, W * 0.8, '#7f6bff', 0.12);
                sh.forEach(function (p) { p.y -= p.v * dt; p.l -= dt * 0.25; if (p.l <= 0) { p.x = rnd(0, W); p.y = H + 5; p.l = 1; } x.fillStyle = 'rgba(' + (Math.random() < 0.3 ? '47,168,255' : '127,107,255') + ',' + (0.6 * p.l) + ')'; x.fillRect(p.x, p.y, p.s, p.s * 2.2); });
                x.save(); x.globalAlpha = 0.18 + 0.06 * Math.sin(t * 2); x.strokeStyle = '#2fa8ff'; x.lineWidth = 1; x.strokeRect(10.5, 10.5, W - 21, H - 21); x.restore();
            } };
        },
        note: function () {
            var apples = pool(3, function () { return { x: rnd(20, W - 20), y: rnd(-H, 0), v: rnd(20, 30), r: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                x.save(); x.globalAlpha = 0.07; x.strokeStyle = '#e8e2d0'; for (var y = 40; y < H; y += 22) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); } x.strokeStyle = '#d11f2a'; x.beginPath(); x.moveTo(36, 0); x.lineTo(36, H); x.stroke(); x.restore();
                apples.forEach(function (a) { a.y += a.v * dt; a.r += dt * 0.8; if (a.y > H + 20) { a.y = -20; a.x = rnd(20, W - 20); } x.save(); x.translate(a.x, a.y); x.rotate(Math.sin(a.r) * 0.4); x.globalAlpha = 0.55; x.fillStyle = '#c4161f'; x.beginPath(); x.arc(-3, 0, 6, 0, 7); x.arc(3, 0, 6, 0, 7); x.fill(); x.fillStyle = '#3b2a1a'; x.fillRect(-0.8, -9, 1.6, 4); x.fillStyle = '#2f6b2f'; x.beginPath(); x.ellipse(3, -8, 3, 1.5, -0.5, 0, 7); x.fill(); x.restore(); });
            } };
        },
        saw: function () {
            var drops = pool(16, function () { return { x: rnd(0, W), y: rnd(0, H), r: rnd(1, 3.5), a: rnd(0.1, 0.4) }; });
            return { draw: function (x, t, dt) {
                var off = (t * 120) % 14; x.fillStyle = 'rgba(255,122,26,0.5)';
                for (var px = -14 + off; px < W + 14; px += 14) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px + 7, 9); x.lineTo(px + 14, 0); x.fill(); x.beginPath(); x.moveTo(W - px, H); x.lineTo(W - px - 7, H - 9); x.lineTo(W - px - 14, H); x.fill(); }
                drops.forEach(function (d) { x.fillStyle = 'rgba(212,31,31,' + d.a + ')'; x.beginPath(); x.arc(d.x, d.y, d.r, 0, 7); x.fill(); });
                if (Math.random() < dt * 0.5) { var d = pick(drops); d.x = rnd(0, W); d.y = rnd(0, H); }
            } };
        },
        neon: function () {
            var glitch = 0;
            return { draw: function (x, t, dt) {
                x.fillStyle = 'rgba(255,255,255,0.025)'; for (var y = (t * 30) % 3; y < H; y += 3) { x.fillRect(0, y, W, 1); }
                x.strokeStyle = 'rgba(247,238,47,0.5)'; x.lineWidth = 1.5; [[8, 8, 1, 1], [W - 8, 8, -1, 1], [8, H - 8, 1, -1], [W - 8, H - 8, -1, -1]].forEach(function (c) { x.beginPath(); x.moveTo(c[0], c[1] + c[3] * 18); x.lineTo(c[0], c[1]); x.lineTo(c[0] + c[2] * 18, c[1]); x.stroke(); });
                x.font = '700 9px Menlo, monospace'; x.fillStyle = 'rgba(255,47,168,0.55)'; x.fillText('SYS ' + (Math.floor(t * 10) % 1000) + ' // LINK OK', 14, H - 14);
                glitch -= dt; if (glitch <= 0) { glitch = rnd(1.5, 4); } if (glitch < 0.18) { for (var k = 0; k < 4; k++) { var gy = rnd(0, H); x.fillStyle = pick(['rgba(255,47,168,0.18)', 'rgba(47,240,255,0.18)', 'rgba(247,238,47,0.15)']); x.fillRect(rnd(-20, 20), gy, W, rnd(2, 10)); } }
            } };
        },
        north: function () {
            var rs = pool(10, function () { return { x: rnd(0, W), y: rnd(0, H), c: RUNES.charAt(Math.floor(rnd(0, RUNES.length))), p: rnd(0, 6) }; }), snow = pool(30, function () { return { x: rnd(0, W), y: rnd(0, H), v: rnd(10, 25) }; });
            return { draw: function (x, t, dt) {
                x.font = '16px serif'; x.textAlign = 'center';
                rs.forEach(function (r) { var a = 0.08 + 0.18 * (0.5 + 0.5 * Math.sin(t + r.p)); x.fillStyle = 'rgba(155,184,201,' + a + ')'; x.fillText(r.c, r.x, r.y + Math.sin(t * 0.5 + r.p) * 4); });
                snow.forEach(function (s) { s.y += s.v * dt; s.x += Math.sin(t + s.v) * 4 * dt; if (s.y > H) { s.y = -4; s.x = rnd(0, W); } x.fillStyle = 'rgba(232,241,246,0.5)'; x.fillRect(s.x, s.y, 1.5, 1.5); });
                var sx = ((t * 12) % (W + 120)) - 60, sy = H - 22 + Math.sin(t * 1.2) * 2; x.save(); x.globalAlpha = 0.35; x.fillStyle = '#b08a4a'; x.beginPath(); x.moveTo(sx - 26, sy); x.quadraticCurveTo(sx, sy + 10, sx + 26, sy); x.lineTo(sx + 30, sy - 6); x.lineTo(sx + 20, sy - 2); x.lineTo(sx - 20, sy - 2); x.lineTo(sx - 30, sy - 6); x.fill(); x.fillRect(sx - 1, sy - 26, 2, 24); x.fillStyle = '#e8f1f6'; x.fillRect(sx - 12, sy - 24, 24, 15); x.restore();
                x.strokeStyle = 'rgba(155,184,201,0.2)'; x.beginPath(); for (var px = 0; px <= W; px += 8) { x.lineTo(px, H - 12 + Math.sin(px * 0.05 + t) * 2); } x.stroke();
            } };
        },
        gothic: function () {
            var drips = pool(9, function () { return { x: rnd(0, W), l: rnd(0, 40), v: rnd(4, 12), m: rnd(30, 90) }; }), bats = pool(4, function () { return { x: rnd(0, W), y: rnd(20, H * 0.5), v: rnd(30, 60), p: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                glow(x, W * 0.82, H * 0.14, 40, '#b3001b', 0.35); x.fillStyle = 'rgba(179,0,27,0.35)'; x.beginPath(); x.arc(W * 0.82, H * 0.14, 16, 0, 7); x.fill();
                drips.forEach(function (d) { d.l += d.v * dt; if (d.l > d.m) { d.l = 0; d.x = rnd(0, W); } x.fillStyle = 'rgba(140,0,20,0.55)'; x.fillRect(d.x - 1.5, 0, 3, d.l); x.beginPath(); x.arc(d.x, d.l, 3, 0, 7); x.fill(); });
                bats.forEach(function (b) { b.x -= b.v * dt; if (b.x < -20) { b.x = W + 20; b.y = rnd(20, H * 0.5); } var f = Math.sin(t * 12 + b.p) * 5; x.fillStyle = 'rgba(150,0,30,0.7)'; x.beginPath(); x.moveTo(b.x, b.y); x.quadraticCurveTo(b.x - 6, b.y - 4 - f, b.x - 12, b.y + f * 0.4); x.quadraticCurveTo(b.x - 6, b.y + 2, b.x, b.y + 3); x.quadraticCurveTo(b.x + 6, b.y + 2, b.x + 12, b.y + f * 0.4); x.quadraticCurveTo(b.x + 6, b.y - 4 - f, b.x, b.y); x.fill(); });
            } };
        },
        geass: function () {
            var sparks = pool(24, function () { return { x: rnd(0, W), y: rnd(0, H), v: rnd(8, 20), p: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                x.save(); x.globalAlpha = 0.05; for (var cy = 0; cy < H; cy += 24) { for (var cx = 0; cx < W; cx += 24) { if (((cx + cy) / 24) % 2) { x.fillStyle = '#c99a2e'; x.fillRect(cx, cy, 24, 24); } } } x.restore();
                var pulse = 0.5 + 0.5 * Math.sin(t * 1.3); sigil(x, W * 0.5, H * 0.45, 46 + pulse * 6, 0.1 + pulse * 0.12, t * 0.3);
                sparks.forEach(function (s) { s.y -= s.v * dt; if (s.y < -5) { s.y = H + 5; s.x = rnd(0, W); } x.fillStyle = 'rgba(201,154,46,' + (0.3 + 0.3 * Math.sin(t * 3 + s.p)) + ')'; x.fillRect(s.x, s.y, 1.6, 1.6); });
            } };
        },
        aura: function () {
            var leaves = pool(10, function () { return { x: rnd(0, W), y: rnd(-H, H), v: rnd(15, 28), r: rnd(0, 6) }; });
            return { draw: function (x, t, dt) {
                for (var i = 0; i < 18; i++) { var e = i / 18, side = i % 4, wob = Math.sin(t * 2.4 + i) * 10, px = side === 0 ? e * W : side === 1 ? W : side === 2 ? (1 - e) * W : 0, py = side === 0 ? 0 : side === 1 ? e * H : side === 2 ? H : (1 - e) * H; glow(x, px, py + wob, 40 + wob, i % 2 ? '#33d17a' : '#2f8cff', 0.12); }
                x.save(); x.translate(W - 50, 60); x.rotate(t * 0.15); x.globalAlpha = 0.2; x.strokeStyle = '#33d17a'; x.beginPath(); for (var k = 0; k <= 6; k++) { var an = k * Math.PI / 3; x.lineTo(Math.cos(an) * 30, Math.sin(an) * 30); } x.stroke(); x.beginPath(); for (k = 0; k < 6; k++) { an = k * Math.PI / 3; x.moveTo(0, 0); x.lineTo(Math.cos(an) * 30, Math.sin(an) * 30); } x.stroke(); x.restore();
                leaves.forEach(function (l) { l.y += l.v * dt; l.r += dt * 2; if (l.y > H) { l.y = -8; l.x = rnd(0, W); } x.save(); x.translate(l.x, l.y); x.rotate(l.r); x.fillStyle = 'rgba(51,209,122,0.45)'; x.beginPath(); x.ellipse(0, 0, 4, 1.8, 0, 0, 7); x.fill(); x.restore(); });
            } };
        },
        jojo: function () {
            var gos = pool(7, function () { return { x: rnd(0, W), y: rnd(0, H), s: rnd(14, 30), p: rnd(0, 6), r: rnd(-0.3, 0.3) }; });
            return { draw: function (x, t, dt) {
                var hue = (t * 40) % 360; x.save(); x.globalAlpha = 0.08; for (var b = 0; b < 5; b++) { x.fillStyle = 'hsl(' + ((hue + b * 60) % 360) + ',100%,55%)'; x.beginPath(); x.moveTo(0, H * b / 5); x.lineTo(W, H * b / 5 - 40); x.lineTo(W, H * (b + 1) / 5 - 40); x.lineTo(0, H * (b + 1) / 5); x.fill(); } x.restore();
                x.font = '900 20px "Hiragino Sans", "Yu Gothic", sans-serif'; x.textAlign = 'center';
                gos.forEach(function (g) { var a = 0.25 + 0.25 * Math.sin(t * 2 + g.p); x.save(); x.translate(g.x + Math.sin(t * 6 + g.p) * 1.5, g.y); x.rotate(g.r); x.font = '900 ' + g.s + 'px "Hiragino Sans","Yu Gothic",sans-serif'; x.fillStyle = 'rgba(160,60,255,' + a + ')'; x.strokeStyle = 'rgba(0,0,0,' + a + ')'; x.lineWidth = 2; x.strokeText('ゴ', 0, 0); x.fillText('ゴ', 0, 0); x.restore(); });
            } };
        }
    };
    function sigil(x, cx, cy, r, a, rot) { x.save(); x.translate(cx, cy); x.globalAlpha = a; x.strokeStyle = '#e0303c'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.rotate(rot); for (var i = 0; i < 3; i++) { x.rotate(Math.PI * 2 / 3); x.beginPath(); x.moveTo(0, -r * 0.2); x.quadraticCurveTo(r * 0.5, -r * 0.4, r * 0.75, -r * 0.05); x.quadraticCurveTo(r * 0.4, -r * 0.15, 0, -r * 0.2); x.fillStyle = '#e0303c'; x.fill(); } x.restore(); }

    // ---------- signature bursts over the panel (1.4 s) ----------
    var BURSTS = {
        frost: function (x, p) { circleSigil(x, W / 2, H / 2, 40 + p * 140, '#9fd8ff', 1 - p, p * 2, 6); },
        mirror: function (x, p) { x.strokeStyle = 'rgba(240,230,255,' + (1 - p) + ')'; x.lineWidth = 1.5; for (var i = 0; i < 12; i++) { var an = i * 0.52 + 0.2; x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.cos(an) * p * W, H / 2 + Math.sin(an) * p * W * 0.8); x.stroke(); } },
        voxel: function (x, p) { for (var i = 0; i < 30; i++) { var an = i * 0.7, d = p * 160; x.fillStyle = 'rgba(' + (i % 2 ? '95,191,58' : '139,90,43') + ',' + (1 - p) + ')'; x.fillRect(W / 2 + Math.cos(an) * d, H / 2 + Math.sin(an) * d + p * p * 120, 8, 8); } },
        champion: function (x, p) { label(x, '7', 120 + p * 40, '#e8c15a', 1 - p); },
        cursed: function (x, p) { var r = p * Math.max(W, H); x.fillStyle = 'rgba(5,0,15,' + (0.85 * (1 - p)) + ')'; x.beginPath(); x.arc(W / 2, H / 2, r, 0, 7); x.fill(); x.strokeStyle = 'rgba(138,92,255,' + (1 - p) + ')'; x.lineWidth = 3; x.stroke(); label(x, 'DOMAIN EXPANSION', 18, '#d9ccff', Math.sin(p * Math.PI)); },
        cloud: function (x, p) { sigil(x, W / 2, H / 2, 60, 1 - p, p * 10); },
        sea: function (x, p) { label(x, 'WANTED', 34, '#f2b84b', Math.sin(p * Math.PI)); label(x, '\n\n฿ 3,000,000,000', 14, '#fff1c9', Math.sin(p * Math.PI)); },
        reaper: function (x, p) { x.fillStyle = 'rgba(0,0,0,' + 0.7 * Math.sin(p * Math.PI) + ')'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,45,61,' + (1 - p) + ')'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, H * 0.75); x.lineTo(W * Math.min(1, p * 2), H * 0.75 - W * Math.min(1, p * 2) * 0.6); x.stroke(); label(x, 'RELEASE', 26, '#ffffff', Math.sin(p * Math.PI)); },
        breath: function (x, p) { x.strokeStyle = 'rgba(63,167,255,' + (1 - p) + ')'; x.lineWidth = 6; x.beginPath(); for (var px = 0; px <= W * Math.min(1, p * 1.6); px += 6) { x.lineTo(px, H / 2 + Math.sin(px * 0.03) * 30); } x.stroke(); },
        scout: function (x, p) { glow(x, W / 2, H * (1 - p), 30, '#e04a3a', 1 - p); },
        monarch: function (x, p) { var a = Math.sin(p * Math.PI); x.fillStyle = 'rgba(8,20,45,' + 0.85 * a + ')'; x.strokeStyle = 'rgba(47,168,255,' + a + ')'; x.lineWidth = 1.5; var w = 210, h = 64; x.fillRect(W / 2 - w / 2, H / 2 - h / 2, w, h); x.strokeRect(W / 2 - w / 2, H / 2 - h / 2, w, h); label(x, 'LEVEL UP!', 22, '#dcecff', a); },
        note: function (x, p) { x.strokeStyle = 'rgba(209,31,42,' + (1 - p * 0.5) + ')'; x.lineWidth = 2; x.beginPath(); for (var px = 0; px <= W * 0.7 * Math.min(1, p * 1.5); px += 4) { x.lineTo(W * 0.15 + px, H / 2 + Math.sin(px * 0.3) * 3 + Math.sin(px * 0.07) * 6); } x.stroke(); },
        saw: function (x, p) { var s = (1 - p) * 8; document.body.style.transform = p < 1 ? 'translate(' + rnd(-s, s) + 'px,' + rnd(-s, s) + 'px)' : ''; x.fillStyle = 'rgba(255,122,26,' + 0.25 * (1 - p) + ')'; x.fillRect(0, 0, W, H); },
        neon: function (x, p) { for (var k = 0; k < 8; k++) { x.fillStyle = pick(['rgba(255,47,168,0.4)', 'rgba(47,240,255,0.4)', 'rgba(247,238,47,0.35)']); x.fillRect(rnd(-30, 30), rnd(0, H), W, rnd(3, 18) * (1 - p)); } },
        north: function (x, p) { x.font = '22px serif'; x.textAlign = 'center'; for (var i = 0; i < 12; i++) { var an = i * Math.PI / 6 + p; x.fillStyle = 'rgba(155,184,201,' + (1 - p) + ')'; x.fillText(RUNES.charAt(i), W / 2 + Math.cos(an) * 70, H / 2 + Math.sin(an) * 70); } },
        gothic: function (x, p) { glow(x, W / 2, H / 2, p * W, '#b3001b', 0.5 * (1 - p)); },
        geass: function (x, p) { sigil(x, W / 2, H / 2, 30 + p * 80, 1 - p, p * 3); },
        aura: function (x, p) { glow(x, W / 2, H / 2, 40 + p * W * 0.6, '#33d17a', 0.5 * (1 - p)); },
        jojo: function (x, p) { var a = Math.sin(p * Math.PI); x.fillStyle = 'rgba(255,63,210,' + 0.18 * a + ')'; x.fillRect(0, 0, W, H); label(x, 'ゴゴゴゴ', 40, '#a03cff', a); }
    };
    function label(x, s, size, col, a) { x.save(); x.globalAlpha = Math.max(0, a); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 ' + size + 'px Inter, "Hiragino Sans", Arial, sans-serif'; x.fillStyle = col; x.shadowColor = 'rgba(0,0,0,0.6)'; x.shadowBlur = 12; var ls = String(s).split('\n'); ls.forEach(function (l, i) { x.fillText(l, W / 2, H / 2 + (i - (ls.length - 1) / 2) * size * 1.1); }); x.restore(); }

    // ---------- loop ----------
    function paused() { return document.hidden || fxOff() || document.documentElement.classList.contains('akira-away'); }
    function loop(now) {
        raf = 0;
        if (!scene && !burst) { return; }
        var dt = Math.min(0.1, (now - (last || now)) / 1000);
        if (dt < 1 / 32 && last) { raf = requestAnimationFrame(loop); return; }   // ~30 fps
        last = now; var t = now / 1000;
        if (scene && bgx) { frames++; bgx.clearRect(0, 0, W, H); if (!paused()) { scene.draw(bgx, t, dt); } }
        if (burst && fgx) {
            fgx.clearRect(0, 0, W, H);
            var p = Math.max(0, (now - burst.t0) / 1400);
            if (p >= 1) { burst = null; document.body.style.transform = ''; fg.style.display = 'none'; } else { BURSTS[burst.kind](fgx, p); }
        }
        if (scene && paused() && !burst) { setTimeout(function () { if (!raf) { raf = requestAnimationFrame(loop); } }, 400); return; }
        raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function stop() {
        scene = null; curKind = '';
        if (bg) { bg.parentNode && bg.parentNode.removeChild(bg); bg = bgx = null; }
        setCursor('');
    }

    // ---------- cursors ----------
    var CURSORS = {
        tomoe: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'><circle cx='11' cy='11' r='10' fill='%23c8102e' stroke='black' stroke-width='1.2'/><circle cx='11' cy='11' r='5.5' fill='none' stroke='black' stroke-width='0.8'/><circle cx='11' cy='11' r='2.2' fill='black'/><g fill='black'><circle cx='11' cy='5.5' r='1.6'/><circle cx='15.8' cy='13.8' r='1.6'/><circle cx='6.2' cy='13.8' r='1.6'/></g></svg>\") 11 11, auto",
        cross: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><g stroke='%23f7ee2f' stroke-width='1.5'><path d='M11 1v7M11 14v7M1 11h7M14 11h7'/></g><rect x='9.5' y='9.5' width='3' height='3' fill='%23ff2fa8'/></svg>\") 11 11, crosshair"
    };
    function setCursor(kind) {
        var s = document.getElementById('akira-anime-cursor');
        if (!kind) { if (s) { s.parentNode.removeChild(s); } return; }
        if (!s) { s = document.createElement('style'); s.id = 'akira-anime-cursor'; document.head.appendChild(s); }
        s.textContent = 'html, body, body * { cursor: ' + CURSORS[kind] + ' !important; } input, textarea, [contenteditable] { cursor: text !important; }';
    }

    function sync(withBurst) {
        var id = document.documentElement.getAttribute('data-akira-theme') || 'none', t = THEMES[id];
        if (!t || !t.anime) { stop(); return; }
        setCursor(t.cursor || '');
        if (reduced()) { stop(); setCursor(t.cursor || ''); return; }
        if (curKind !== t.anime || !bg) {
            bg = canvas('akira-anime-fx', 9000, 'mix-blend-mode:screen;opacity:0.9;'); /* above the cards; dark pixels vanish in screen blend */ bgx = bg.getContext('2d'); size();
            curKind = t.anime; scene = SCENES[t.anime]();
            if (withBurst && !fxOff()) {
                fg = canvas('akira-anime-burst', 99990); fgx = fg.getContext('2d'); fg.style.display = 'block'; size();
                burst = { kind: t.anime, t0: performance.now() };
            }
        }
        start();
    }

    window.addEventListener('resize', function () { if (bg || fg) { size(); } });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && scene) { start(); } });
    window.addEventListener('focus', function () { if (scene) { start(); } });
    var booted = false;
    try {
        new MutationObserver(function () { sync(booted); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-akira-theme'] });
        new MutationObserver(function () { if (fxOff()) { if (bg) { bg.style.display = 'none'; } } else if (bg) { bg.style.display = 'block'; start(); } }).observe(document.body || document.documentElement, { attributes: true, attributeFilter: ['class'] });
    } catch (e) { }
    function boot() { sync(false); booted = true; }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 50); }); } else { setTimeout(boot, 50); }

    window.AkiraAnimeThemes = { state: function () { return { frames: frames, scene: !!scene, raf: raf, kind: curKind, burst: !!burst, W: W, H: H, paused: paused() }; }, ids: Object.keys(ADD), burst: function () { var id = document.documentElement.getAttribute('data-akira-theme'); if (THEMES[id] && THEMES[id].anime) { curKind = ''; sync(true); } } };
})();
