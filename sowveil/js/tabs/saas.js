/* Sowveil - SaaS Effects: Gradient Wipe (depth map + Colorama, from the Gradient Wipe preset, with your own palette),
   Depth Reveal, Halftone Wave, Match Cut Zoom, UI Morph, Mockup Transition, 3D Glass Shape, Glass Refraction Scene.
   Every effect has a live canvas preview that follows its settings; host side is host/sv_saas.jsx. */
(function () {
    'use strict';
    var SV = window.SV, h = SV.h;
    var N = function (id, label, min, max, def, unit, step, when) { return { id: id, label: label, type: 'number', min: min, max: max, def: def, unit: unit, step: step || 1, when: when }; };
    var C = function (id, label, def) { return { id: id, label: label, type: 'color', def: def }; };
    var T = function (id, label, def) { return { id: id, label: label, type: 'toggle', def: def }; };
    var SEG = function (id, label, def, options, when) { return { id: id, label: label, type: 'seg', def: def, options: options, when: when }; };
    var SELECT = function (id, label, def, options, when) { return { id: id, label: label, type: 'select', def: def, options: options, when: when }; };

    function c255(hx) { return SV.hexToRgb(hx).map(function (x) { return Math.round(x * 255); }); }
    var PALETTES = {
        blush: ['#ffb5b5', '#ff8fab', '#ff8fab', '#e1fcff', '#ffb3c6', '#ffe5ec'],
        aurora: ['#0b1d3a', '#1fd1a5', '#6a5cff', '#c3f7ff', '#1fd1a5', '#0f2f4f'],
        sunset: ['#2b0f3a', '#ff6b6b', '#ffb347', '#fff1c1', '#ff6b6b', '#6a2c70'],
        ocean: ['#03122b', '#0077b6', '#48cae4', '#e0fbff', '#48cae4', '#023e8a'],
        neon: ['#0a0014', '#ff00c8', '#00f0ff', '#ffffff', '#3a00ff', '#ff00c8'],
        mono: ['#0a0a0a', '#3a3a3a', '#9a9a9a', '#ffffff', '#9a9a9a', '#1c1c1c']
    };
    var DEPTH = [
        SEG('depth', 'Depth map', 'auto', [['auto', 'Auto'], ['file', 'Image file'], ['ramp', 'Direction']]),
        { id: 'depthFile', label: 'Depth map image', type: 'file', def: '', when: function (v) { return v.depth === 'file'; } },
        SELECT('rampDir', 'Direction', 'bottom', [['bottom', 'Bottom → top'], ['top', 'Top → bottom'], ['left', 'Left → right'], ['right', 'Right → left'], ['center', 'From centre']], function (v) { return v.depth === 'ramp'; }),
        N('depthBlur', 'Auto depth softness', 0, 200, 40, '', 1, function (v) { return v.depth === 'auto'; }),
        T('depthInvert', 'Invert auto depth', false)
    ];
    var FX = [
        {
            id: 'gradientWipe', label: 'Gradient Wipe', subtitle: 'Depth-map colour sweep (Colorama + Gradient Wipe)',
            hint: 'Select the clip you are cutting to. Sowveil freezes its first frame before it starts, builds the depth map, then sweeps the Colorama palette through the depth and wipes into the clip. For the best result use a real depth map image from any AI depth tool.',
            params: [
                SEG('dir', 'Transition', 'in', [['in', 'Into the clip'], ['out', 'Out of the clip']]),
                N('duration', 'Duration', 0.2, 4, 1, 's', 0.05),
                SELECT('palette', 'Palette preset', 'blush', [['blush', 'Blush (preset)'], ['aurora', 'Aurora'], ['sunset', 'Sunset'], ['ocean', 'Ocean'], ['neon', 'Neon'], ['mono', 'Mono'], ['custom', 'Custom']]),
                C('c1', 'Colour 1', '#ffb5b5'), C('c2', 'Colour 2', '#ff8fab'), C('c3', 'Colour 3', '#ff8fab'), C('c4', 'Colour 4', '#e1fcff'), C('c5', 'Colour 5', '#ffb3c6'), C('c6', 'Colour 6', '#ffe5ec'),
                N('cycles', 'Colour cycles', 0, 6, 2, '', 0.25),
                N('softness', 'Transition softness', 0, 100, 50, '%'),
                T('invert', 'Far parts first', false),
                N('influence', 'Speed curve', 10, 100, 75, '%'),
                T('makeRoom', 'Make room before the clip', true)
            ].concat(DEPTH)
        },
        {
            id: 'depthReveal', label: 'Depth Reveal', subtitle: 'Clip appears through colour, blur or fog by depth',
            hint: 'Select the photo or video layer and put the playhead where the reveal starts. Nearest parts appear first (turn on Far parts first to flip it).',
            params: [
                SEG('look', 'Cover', 'gradient', [['gradient', 'Gradient'], ['blur', 'Blur'], ['fog', 'Fog'], ['solid', 'Solid']]),
                C('c1', 'Colour 1', '#2b0f3a'), C('c2', 'Colour 2', '#ff6b6b'), C('c3', 'Colour 3', '#ffb347'), C('c4', 'Colour 4', '#6a2c70'),
                N('blur', 'Blur amount', 0, 300, 80, '', 1, function (v) { return v.look === 'blur'; }),
                N('duration', 'Duration', 0.2, 5, 1.5, 's', 0.05),
                N('softness', 'Edge softness', 0, 100, 30, '%'),
                T('farFirst', 'Far parts first', false),
                N('push', 'Push in', 0, 40, 8, '%'),
                N('parX', 'Parallax X', -100, 100, 0, 'px'), N('parY', 'Parallax Y', -100, 100, 0, 'px'),
                N('influence', 'Speed curve', 10, 100, 70, '%')
            ].concat(DEPTH)
        },
        {
            id: 'halftoneWave', label: 'Halftone Wave', subtitle: 'Dot shockwave travelling out from a layer',
            hint: 'Select the layer the wave comes out of (a button, logo or card), or nothing for the comp centre. The wave starts at the playhead.',
            params: [
                C('color', 'Dot colour', '#8b7dff'),
                SEG('mode', 'Placement', 'behind', [['behind', 'Behind layer'], ['inside', 'Inside layer'], ['full', 'Whole frame']]),
                N('waves', 'Waves', 1, 4, 1), N('duration', 'Wave duration', 0.2, 4, 1.2, 's', 0.05), N('interval', 'Gap between waves', 0.05, 2, 0.35, 's', 0.05),
                N('ring', 'Ring width', 20, 600, 160, 'px'), N('softness', 'Ring softness', 0, 200, 50),
                N('spacing', 'Dot spacing', 6, 80, 22, 'px'), N('dot', 'Dot size', 5, 100, 45, '%'),
                T('glow', 'Glow', true)
            ]
        },
        {
            id: 'matchCut', label: 'Match Cut Zoom', subtitle: 'Fixed object pushes in through the cut',
            hint: 'Put the playhead on the cut and select the object(s) that stay fixed. They are parented to a null that zooms with its fastest speed exactly on the cut.',
            params: [N('zoom', 'Zoom', 70, 160, 115, '%'), N('before', 'Frames before cut', 1, 30, 6), N('after', 'Frames after cut', 1, 30, 6), N('influence', 'Speed curve', 10, 100, 85, '%')]
        },
        {
            id: 'uiMorph', label: 'UI Morph', subtitle: 'Shape A stretches into shape B at the cut',
            hint: 'Select the outgoing shape layer and the incoming one (cut where B starts). A\'s rectangle stretches 10–20% into the cut and B settles from the same squash, both fastest on the cut.',
            params: [N('grow', 'Stretch', 2, 40, 15, '%'), SEG('axis', 'Axis', 'auto', [['auto', 'Auto'], ['x', 'Width'], ['y', 'Height'], ['both', 'Both']]),
                N('before', 'Frames before cut', 2, 30, 6), N('after', 'Frames after cut', 2, 30, 8), N('influence', 'Speed curve', 10, 100, 85, '%')]
        },
        {
            id: 'mockup', label: 'Mockup Transition', subtitle: 'Motion continues inside a device',
            hint: 'Select the UI layers and put the playhead where the device should appear. They are precomposed into the device screen, which fills the frame at the cut and then pulls back.',
            params: [SEG('device', 'Device', 'phone', [['phone', 'Phone'], ['laptop', 'Laptop'], ['browser', 'Browser']]), C('frameColor', 'Frame colour', '#16161a'),
                N('duration', 'Pull back', 0.2, 3, 0.8, 's', 0.05), N('scale', 'Final size', 20, 100, 55, '%'), T('shadow', 'Shadow', true), N('influence', 'Speed curve', 10, 100, 80, '%')]
        },
        {
            id: 'glassShape', label: '3D Glass Shape', subtitle: 'Extruded glossy shape, Advanced 3D, light sweeps',
            hint: 'Adds a precomp with an extruded shape (Advanced 3D renderer), environment light, glow, tint, matte choker and two light sweeps. Everything stays editable inside.',
            params: [SEG('shape', 'Shape', 'ring', [['ring', 'Ring'], ['circle', 'Circle'], ['square', 'Square'], ['pill', 'Pill'], ['star', 'Star']]),
                C('colorA', 'Colour A', '#bfdcff'), C('colorB', 'Colour B', '#8b5cff'), N('size', 'Size', 100, 1000, 520, 'px'), N('depth', 'Extrusion', 0, 400, 120),
                N('bevel', 'Bevel', 0, 60, 18), N('tilt', 'Tilt', -60, 60, 20, '°'), N('spin', 'Spin', -180, 180, 35, '°/s'), C('tint', 'Tint', '#dbe6ff'),
                T('glow', 'Glow', true), T('sweep', 'Light sweeps', true)]
        },
        {
            id: 'glassScene', label: 'Glass Refraction Scene', subtitle: 'RGB-split glass shape refracting text behind it',
            hint: 'Builds a new 1080p 60 fps comp: rotating 3D shape, red/green/blue split with displacement, colour overlay, noise, CC Glass refraction of the text behind it, gradient background and grid.',
            params: [SEG('shape', 'Shape', 'ring', [['ring', 'Ring'], ['circle', 'Circle'], ['square', 'Square'], ['pill', 'Pill'], ['star', 'Star']]),
                { id: 'text', label: 'Text behind', type: 'text', def: 'Sowveil' }, C('colorA', 'Glass colour', '#ffc8dc'), C('colorB', 'Shape shade', '#8b5cff'),
                C('bgTop', 'Background top', '#0d1438'), C('bgBottom', 'Background bottom', '#dfe5ff'), T('grid', 'Grid', true),
                N('aberration', 'RGB split', 0, 60, 12), N('refraction', 'Refraction', 0, 100, 20), N('spin', 'Spin', -180, 180, 35, '°/s'), N('depth', 'Extrusion', 0, 400, 120)]
        }
    ];

    // ---------- Colorama palette: patch the Output Cycle inside the preset (it cannot be set from a script) ----------
    function presetPath() { return SV.extDir() + '/presets/gradient_wipe.ffx'; }
    SV.patchColorama = function (buf, colors) {
        var at = buf.indexOf('aRbs'), p = at < 0 ? -1 : buf.indexOf('aRbp', at);
        if (p < 0) { return null; }
        var out = Buffer.from(buf), base = p + 8, n = 6, i;
        for (i = 0; i < n; i++) {
            var c = c255(colors[i % colors.length] || '#ffffff'), pos = Math.floor(i / n * 65536) >>> 0, o = base + i * 8;
            out.writeUInt32BE(pos, o); out[o + 4] = 255; out[o + 5] = c[0]; out[o + 6] = c[1]; out[o + 7] = c[2];
        }
        return out;
    };
    function paletteFfx(colors) {
        var fs = SV.node('fs'), os = SV.node('os'), path = SV.node('path');
        if (!fs || !os) { return ''; }
        try {
            var src = fs.readFileSync(presetPath()), out = SV.patchColorama(src, colors);
            if (!out) { return presetPath(); }
            var f = path.join(os.tmpdir(), 'sowveil_gw_' + colors.join('').replace(/#/g, '') + '.ffx');
            fs.writeFileSync(f, out);
            return f.replace(/\\/g, '/');
        } catch (e) { console.error(e); return ''; }
    }
    function colorsOf(v, n) { var a = [], i; for (i = 1; i <= n; i++) { a.push(v['c' + i]); } return a; }

    function payload(item, v) {
        var o = {}, k;
        for (k in v) { if (v.hasOwnProperty(k)) { o[k] = v[k]; } }
        if (item.id === 'gradientWipe') { o.ffx = paletteFfx(colorsOf(v, 6)); }
        if (item.id === 'depthReveal') { o.colors = colorsOf(v, 4); }
        return o;
    }

    // ---------- live previews ----------
    function rgb(hex) { var c = c255(hex || '#ffffff'); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }
    function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
    function ease(p) { p = Math.max(0, Math.min(1, p)); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function scene(g, W, H) {    // stand-in "clip": sky, hills, a lit subject
        var sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8ec5ff'); sky.addColorStop(1, '#e8f3ff'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = '#5b8def'; g.beginPath(); g.moveTo(0, H * 0.72); g.quadraticCurveTo(W * 0.3, H * 0.52, W * 0.6, H * 0.7); g.quadraticCurveTo(W * 0.85, H * 0.82, W, H * 0.66); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        g.fillStyle = '#2f5fd0'; g.beginPath(); g.moveTo(0, H * 0.86); g.quadraticCurveTo(W * 0.5, H * 0.7, W, H * 0.9); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(W * 0.72, H * 0.25, H * 0.08, 0, 7); g.fill();
    }
    function depthAt(x, y, W, H, mode, dir) {   // 0 near .. 1 far, cheap stand-in for a depth map
        if (mode === 'ramp') { return dir === 'top' ? y / H : dir === 'left' ? x / W : dir === 'right' ? 1 - x / W : dir === 'center' ? Math.min(1, Math.hypot(x - W / 2, y - H / 2) / (W / 2)) : 1 - y / H; }
        var hill = y > H * 0.62 ? 1 - (y - H * 0.62) / (H * 0.38) : 1;
        return Math.max(0, Math.min(1, 0.15 + hill * 0.85 - (y > H * 0.86 ? 0.2 : 0)));
    }
    var PREVIEW = {
        gradientWipe: function (g, W, H, t, v) {
            var dur = Math.max(0.2, v.duration), cyc = (t % (dur + 1.2)) / dur, p = ease(Math.min(1, cyc)), cols = colorsOf(v, 6).map(c255);
            scene(g, W, H);
            if (cyc >= 1) { g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 12px system-ui'; g.fillText('▶ clip', 10, H - 10); return; }
            var img = g.getImageData(0, 0, W, H), d = img.data, soft = Math.max(0.02, v.softness / 100 * 0.5), x, y;
            for (y = 0; y < H; y += 2) {
                for (x = 0; x < W; x += 2) {
                    var dep = depthAt(x, y, W, H, v.depth, v.rampDir); if (v.invert) { dep = 1 - dep; }
                    var a = Math.max(0, Math.min(1, (dep - p * (1 + soft) + soft) / soft));
                    if (a <= 0) { continue; }
                    var ph = (dep + p * v.cycles) % 1, ci = ph * 6, c0 = cols[Math.floor(ci) % 6], c1 = cols[(Math.floor(ci) + 1) % 6], f = ci - Math.floor(ci);
                    var r = c0[0] + (c1[0] - c0[0]) * f, gg = c0[1] + (c1[1] - c0[1]) * f, b = c0[2] + (c1[2] - c0[2]) * f, k, q;
                    for (k = 0; k < 2; k++) { for (q = 0; q < 2; q++) { var i = ((y + k) * W + x + q) * 4; d[i] += (r - d[i]) * a; d[i + 1] += (gg - d[i + 1]) * a; d[i + 2] += (b - d[i + 2]) * a; } }
                }
            }
            g.putImageData(img, 0, 0);
        },
        depthReveal: function (g, W, H, t, v) {
            var dur = Math.max(0.2, v.duration), cyc = (t % (dur + 1.2)) / dur, p = ease(Math.min(1, cyc));
            scene(g, W, H);
            var s = 1 + (v.push / 100) * (1 - p); if (s !== 1) { g.drawImage(g.canvas, -(W * s - W) / 2, -(H * s - H) / 2, W * s, H * s); }
            var img = g.getImageData(0, 0, W, H), d = img.data, soft = Math.max(0.02, v.softness / 100 * 0.5), cols = colorsOf(v, 4).map(c255), x, y;
            for (y = 0; y < H; y += 2) {
                for (x = 0; x < W; x += 2) {
                    var dep = depthAt(x, y, W, H, v.depth, v.rampDir); if (!v.farFirst) { dep = 1 - dep; }
                    var a = Math.max(0, Math.min(1, (dep - p * (1 + soft) + soft) / soft)); if (a <= 0) { continue; }
                    var c;
                    if (v.look === 'gradient') { var u = x / W, w2 = y / H; c = [0, 1, 2].map(function (k) { return cols[0][k] * (1 - u) * (1 - w2) + cols[1][k] * u * (1 - w2) + cols[2][k] * u * w2 + cols[3][k] * (1 - u) * w2; }); }
                    else if (v.look === 'blur') { c = null; } else { c = cols[0]; }
                    for (var k = 0; k < 2; k++) {
                        for (var q = 0; q < 2; q++) {
                            var i = ((y + k) * W + x + q) * 4;
                            if (c) { d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a; }
                            else { var m = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] += (m - d[i]) * a * 0.6; d[i + 1] += (m - d[i + 1]) * a * 0.6; d[i + 2] += (m + 30 - d[i + 2]) * a * 0.6; }
                        }
                    }
                }
            }
            g.putImageData(img, 0, 0);
            if (v.look === 'blur' && p < 1) { g.filter = 'blur(' + (6 * (1 - p)) + 'px)'; g.globalAlpha = 1 - p; g.drawImage(g.canvas, 0, 0); g.filter = 'none'; g.globalAlpha = 1; }
        },
        halftoneWave: function (g, W, H, t, v) {
            g.fillStyle = '#0b0b10'; g.fillRect(0, 0, W, H);
            var cx = W / 2, cy = H / 2, total = (v.waves - 1) * v.interval + v.duration, tt = t % (total + 0.8), sp = Math.max(4, v.spacing * 0.35), reach = Math.hypot(W, H) / 2 * 1.1;
            var col = c255(v.color), x, y, i;
            for (y = sp / 2; y < H; y += sp) {
                for (x = sp / 2; x < W; x += sp) {
                    var dist = Math.hypot(x - cx, y - cy), lum = 0;
                    for (i = 0; i < v.waves; i++) {
                        var a = (tt - i * v.interval) / v.duration; if (a < 0 || a > 1) { continue; }
                        var rad = (1 - Math.pow(1 - a, 2)) * reach, band = Math.max(8, v.ring * 0.18), fade = a > 0.55 ? 1 - (a - 0.55) / 0.45 : 1;
                        lum = Math.max(lum, Math.max(0, 1 - Math.abs(dist - rad) / (band + v.softness * 0.12)) * fade);
                    }
                    if (lum <= 0.02) { continue; }
                    var r = sp / 2 * (v.dot / 100) * 1.4 * Math.sqrt(lum);
                    g.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + Math.min(1, lum * 1.2) + ')';
                    if (v.glow) { g.shadowColor = rgb(v.color); g.shadowBlur = 6; }
                    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
                }
            }
            g.shadowBlur = 0;
            if (v.mode !== 'full') { g.fillStyle = '#fff'; rr(g, cx - 34, cy - 13, 68, 26, 13); g.fill(); g.fillStyle = '#111'; g.font = '600 11px system-ui'; g.textAlign = 'center'; g.fillText('Get started', cx, cy + 4); g.textAlign = 'left'; }
        },
        matchCut: function (g, W, H, t, v) {
            var cyc = t % 2.4, cut = 1.2, fd = 1 / 30, a = cut - v.before * fd, b = cut + v.after * fd, p = ease((cyc - a) / (b - a)), z = 1 + (v.zoom / 100 - 1) * p;
            var bgs = [['#ff9a8b', '#ff6a88'], ['#7f7fd5', '#91eae4']], k = cyc < cut ? 0 : 1, bg = g.createLinearGradient(0, 0, W, H);
            bg.addColorStop(0, bgs[k][0]); bg.addColorStop(1, bgs[k][1]); g.fillStyle = bg; g.fillRect(0, 0, W, H);
            g.fillStyle = 'rgba(255,255,255,.25)'; for (var i = 0; i < 6; i++) { rr(g, (k ? 20 : W - 90) + (i % 2) * 40, 20 + i * 26, 50, 14, 7); g.fill(); }
            g.save(); g.translate(W / 2, H / 2); g.scale(z, z);
            g.fillStyle = '#fff'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 18; rr(g, -50, -50, 100, 100, 24); g.fill(); g.shadowBlur = 0;
            g.fillStyle = k ? '#7f7fd5' : '#ff6a88'; g.beginPath(); g.arc(0, 0, 18, 0, 7); g.fill(); g.restore();
            g.fillStyle = 'rgba(0,0,0,.45)'; g.font = '600 10px system-ui'; g.fillText('zoom ' + Math.round(z * 100) + '%', 8, H - 8);
        },
        uiMorph: function (g, W, H, t, v) {
            g.fillStyle = '#101018'; g.fillRect(0, 0, W, H);
            var cyc = t % 2.2, cut = 1.0, fd = 1 / 30, gr = v.grow / 100, ax = v.axis === 'auto' ? 'y' : v.axis, w, hh;
            var fx = ax === 'x' || ax === 'both' ? 1 : 0, fy = ax === 'y' || ax === 'both' ? 1 : 0;
            if (cyc < cut) {
                var p = Math.pow(Math.max(0, Math.min(1, (cyc - (cut - v.before * fd)) / (v.before * fd))), 2);
                w = 150 * (1 + gr * p * fx); hh = 60 * (1 + gr * p * fy); g.fillStyle = '#8b7dff';
            } else {
                var q = 1 - Math.pow(1 - Math.max(0, Math.min(1, (cyc - cut) / (v.after * fd))), 2);
                w = 120 / (1 + gr * fx * (1 - q)); hh = 120 / (1 + gr * fy * (1 - q)); g.fillStyle = '#ff7ab6';
            }
            rr(g, W / 2 - w / 2, H / 2 - hh / 2, w, hh, 18); g.fill();
            g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 11px system-ui'; g.textAlign = 'center'; g.fillText(cyc < cut ? 'A' : 'B', W / 2, H / 2 + 4); g.textAlign = 'left';
        },
        mockup: function (g, W, H, t, v) {
            // device sizes in comp pixels (1920x1080), same as the AE rig
            var D = { phone: [860, 1760, 790, 1690, 96], laptop: [1840, 1180, 1720, 1075, 14], browser: [1800, 1110, 1800, 1040, 4] }[v.device], k = W / 1920;
            var cyc = t % 2.6, p = ease((cyc - 0.6) / Math.max(0.1, v.duration)), full = Math.max(1920 / D[2], 1080 / D[3]), s = (full + (v.scale / 100 - full) * p) * k;
            g.fillStyle = '#e9ecf5'; g.fillRect(0, 0, W, H);
            g.save(); g.translate(W / 2, H / 2); g.scale(s, s);
            var bw = D[0], bh = D[1], sw = D[2], sh = D[3], dims = [0, 0, 0, 0, D[4]];
            if (v.shadow) { g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30 * s; }
            g.fillStyle = v.frameColor; rr(g, -bw / 2, -bh / 2, bw, bh, dims[4] * 1.25); g.fill(); g.shadowBlur = 0;
            g.save(); rr(g, -sw / 2, -sh / 2, sw, sh, dims[4]); g.clip();
            var bg = g.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2); bg.addColorStop(0, '#6d5cff'); bg.addColorStop(1, '#00c2ff'); g.fillStyle = bg; g.fillRect(-sw / 2, -sh / 2, sw, sh);
            for (var i = 0; i < 8; i++) { var y = -sh / 2 + ((i * 260 + t * 400) % (sh + 260)) - 130; g.fillStyle = 'rgba(255,255,255,.85)'; rr(g, -sw / 2 + 60, y, sw - 120, 170, 40); g.fill(); }
            g.restore(); g.restore();
        },
        glassShape: function (g, W, H, t, v) { glass(g, W, H, t, v, false); },
        glassScene: function (g, W, H, t, v) { glass(g, W, H, t, v, true); }
    };
    function glass(g, W, H, t, v, sceneMode) {
        if (sceneMode) {
            var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, v.bgTop); bg.addColorStop(1, v.bgBottom); g.fillStyle = bg; g.fillRect(0, 0, W, H);
            if (v.grid) { g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; for (var gx = 0; gx < W; gx += 24) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, H); g.stroke(); } for (var gy = 0; gy < H; gy += 24) { g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke(); } }
            g.fillStyle = '#fff'; g.font = '800 38px system-ui'; g.textAlign = 'center'; g.fillText(v.text || 'Sowveil', W / 2, H / 2 + 26); g.textAlign = 'left';
        } else { g.fillStyle = '#0c0c12'; g.fillRect(0, 0, W, H); }
        var ang = t * v.spin * Math.PI / 180, sx = Math.max(0.08, Math.abs(Math.cos(ang))), R = Math.min(W, H) * 0.32 * (v.size ? v.size / 520 : 1);
        function shapePath() {
            g.beginPath();
            if (v.shape === 'square' || v.shape === 'pill') { var w = v.shape === 'pill' ? R * 1.6 : R * 1.25, hh = v.shape === 'pill' ? R * 0.7 : R * 1.25; rr(g, -w / 2, -hh / 2, w, hh, v.shape === 'pill' ? hh / 2 : R * 0.28); }
            else if (v.shape === 'star') { for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? R * 0.45 : R; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
            else { g.arc(0, 0, R, 0, 7); if (v.shape === 'ring') { g.moveTo(R * 0.52, 0); g.arc(0, 0, R * 0.52, 0, 7, true); } }
        }
        var layers = sceneMode && v.aberration ? [['rgba(255,60,60,.55)', -v.aberration * 0.12], ['rgba(60,255,120,.55)', 0], ['rgba(70,120,255,.55)', v.aberration * 0.12]] : [[null, 0]];
        layers.forEach(function (L) {
            g.save(); g.translate(W / 2 + L[1], H / 2); g.rotate(-0.15); g.scale(sx, 1);
            for (var d = (v.depth || 0) / 30; d > 0; d -= 1) { g.save(); g.translate(d * 0.8 * (Math.sin(ang) > 0 ? 1 : -1), d * 0.4); shapePath(); g.fillStyle = 'rgba(40,30,90,.25)'; g.fill('evenodd'); g.restore(); }
            shapePath();
            if (L[0]) { g.globalCompositeOperation = 'screen'; g.fillStyle = L[0]; }
            else { var gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, v.colorA); gr.addColorStop(1, v.colorB); g.fillStyle = gr; }
            g.fill('evenodd'); g.globalCompositeOperation = 'source-over';
            if (v.sweep !== false) { var sw = ((t * 0.5) % 1.4 - 0.2) * 2 * R - R; var lg = g.createLinearGradient(sw - 30, -R, sw + 30, R); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.55)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); shapePath(); g.fillStyle = lg; g.fill('evenodd'); }
            g.restore();
        });
        if (v.glow !== false) { g.save(); g.globalCompositeOperation = 'lighter'; g.filter = 'blur(14px)'; g.globalAlpha = 0.35; g.drawImage(g.canvas, 0, 0); g.restore(); }
    }

    function filePicker(p, val, onChange) {
        var name = h('span', { class: 'hint', text: val ? String(val).split(/[\\/]/).pop() : 'No file chosen' });
        var b = h('button', { class: 'btn ghost small', text: 'Choose…', onclick: function () {
            SV.call('pickFile', { prompt: 'Choose a depth map image (white = near)' }).then(function (r) { if (r.ok) { onChange(r.path); name.textContent = r.name; } });
        } });
        return h('div', { class: 'row' }, [h('label', { text: p.label }), h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [name, b])]);
    }

    SV.registerTab({
        id: 'saas', label: 'SaaS Effects', icon: 'motion',
        items: function () { return FX; },
        inspector: function (el, item, v) {
            var cv = h('canvas', { class: 'sx-cv' }), stage = h('div', { class: 'preview sx-stage' }, [cv]), raf = 0, t0 = performance.now();
            el.appendChild(h('div', { class: 'section ex-head' }, [h('div', { class: 'ex-title', text: item.label }), h('div', { class: 'ex-desc', text: item.subtitle })]));
            el.appendChild(SV.ui.section('Live preview', [stage]));
            function frame(now) {
                var W = stage.clientWidth || 300, H = stage.clientHeight || 170, g = cv.getContext('2d');
                if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
                try { PREVIEW[item.id](g, W, H, (now - t0) / 1000, v); } catch (e) { console.error(e); }
                raf = requestAnimationFrame(frame);
            }
            raf = requestAnimationFrame(frame);
            var off = SV.on('inspector:leave', function () { cancelAnimationFrame(raf); off(); });
            // file params are drawn by this tab; the rest by the shared parameter UI
            var normal = { params: item.params.filter(function (p) { return p.type !== 'file'; }), id: item.id };
            var files = item.params.filter(function (p) { return p.type === 'file' && (!p.when || p.when(v)); });
            el.appendChild(SV.ui.params('saas', normal, v, function (id, val) {
                if (id === 'palette' && PALETTES[val]) { PALETTES[val].forEach(function (c, i) { v['c' + (i + 1)] = c; SV.saveVal('saas', item.id, 'c' + (i + 1), c); }); SV.refresh(); return; }
                if (/^c[1-6]$/.test(id) && v.palette !== 'custom') { v.palette = 'custom'; SV.saveVal('saas', item.id, 'palette', 'custom'); }
                if (normal.params.some(function (p) { return p.when; })) { SV.refresh(); }
            }));
            files.forEach(function (p) { el.appendChild(SV.ui.section('', [filePicker(p, v[p.id], function (val) { v[p.id] = val; SV.saveVal('saas', item.id, p.id, val); })])); });
            el.appendChild(SV.ui.section('', [
                SV.ui.action('Apply', function () { return SV.call(item.id === 'matchCut' ? 'matchCutZoom' : item.id, payload(item, v)).then(function (r) { SV.result(r); }); }),
                h('div', { class: 'hint', text: item.hint })
            ]));
        }
    });
})();
