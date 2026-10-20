/* Synced from client/js_akira/carousel_3d.js by tools/sync_sowveil_engines.py */

















(function () {
    'use strict';

    

    function el(id) { return document.getElementById(id); }

    function notify(msg, type) {
        try { if (typeof window.showStatus === 'function') { window.showStatus(msg, type || 'success'); return; } } catch (e) { }
        try { console.log('[carousel3d] ' + msg); } catch (e2) { }
    }

    function getCS() {
        try { return window.csInterface || null; } catch (e) { return null; }
    }

    function hostCall(script, cb) {
        var cs = getCS();
        if (!cs || !cs.evalScript) { cb && cb('ERR|no bridge'); return; }
        cs.evalScript(script, function (res) { cb && cb(String(res == null ? '' : res)); });
    }

    var IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'tif', 'tiff', 'bmp', 'webp', 'psd', 'ai', 'exr'];
    var VIDEO_EXT = ['mp4', 'mov', 'avi', 'mxf', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', 'prores'];

    function extOf(p) {
        var m = /\.([a-z0-9]+)\s*$/i.exec(String(p || ''));
        return m ? m[1].toLowerCase() : '';
    }

    function baseName(p) {
        var s = String(p || '').replace(/\\/g, '/');
        return s.substring(s.lastIndexOf('/') + 1);
    }

    function fileUrl(p) {
        var s = String(p || '').replace(/\\/g, '/');
        if (s.charAt(0) !== '/') s = '/' + s;
        return 'file://' + s.split('/').map(encodeURIComponent).join('/');
    }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function escapeHtml(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    






    var SWATCHES = null;

    function hexToRgb(h) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
        if (m) {
            var v = parseInt(m[1], 16);
            return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
        }
        m = /rgba?\(([^)]+)\)/i.exec(String(h));
        if (m) {
            var p = m[1].split(',');
            return [parseFloat(p[0]) || 0, parseFloat(p[1]) || 0, parseFloat(p[2]) || 0];
        }
        return null;
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, sat = 0;
        if (mx !== mn) {
            var d = mx - mn;
            sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
            if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (mx === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h * 360, sat, l];
    }

    function hsl(h, s2, l) {
        h = ((h % 360) + 360) % 360;
        s2 = clamp(s2, 0, 1); l = clamp(l, 0, 1);
        var c = (1 - Math.abs(2 * l - 1)) * s2, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
        var r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        function hx(v) { var t = Math.round((v + m) * 255).toString(16); return t.length < 2 ? '0' + t : t; }
        return '#' + hx(r) + hx(g) + hx(b);
    }

    function buildSwatches() {
        var raw = '';
        try {
            raw = getComputedStyle(document.documentElement).getPropertyValue('--primary');
        } catch (e) { }
        var rgb = hexToRgb(raw) || [0, 255, 85];
        var base = rgbToHsl(rgb[0], rgb[1], rgb[2]);
        var h = base[0], sat = Math.max(0.45, base[1]);
        var out = [];
        
        for (var i = 0; i < 6; i++) {
            var hh = h + (i - 2.5) * 9;
            var bright = 0.60 - i * 0.045;
            out.push([hsl(hh, sat, bright), hsl(hh, sat, bright - 0.11), '#050505']);
            out.push([hsl(hh + 4, sat * 0.55, 0.13 + i * 0.02),
            hsl(hh + 4, sat * 0.55, 0.08 + i * 0.015),
            hsl(hh, sat, 0.62)]);
        }
        return out;
    }

    function swatches() {
        if (!SWATCHES) SWATCHES = buildSwatches();
        return SWATCHES;
    }

    function swatch(i) { var t = swatches(); return t[i % t.length]; }

    

    








    var PRESETS = [
        {
            key: 'horizontal_curve', name: 'Horizontal Curve',
            desc: 'Sweeping arc of cards across the frame',
            axis: 'y', facing: 'tangent', count: 7, radius: 1450, arc: 150,
            tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.22,
            view: { pitch: -8, yaw: 0, dist: 1.0 }
        },
        {
            key: 'cylindrical_ring', name: 'Cylindrical Ring',
            desc: 'Closed cylinder, cards tangent all the way round',
            axis: 'y', facing: 'tangent', count: 10, radius: 700, arc: 360,
            tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.24,
            view: { pitch: -16, yaw: 0, dist: 1.0 }
        },
        {
            key: 'tilted_ring', name: 'Tilted Ring',
            desc: 'Cylinder leaned off-axis for a dynamic orbit',
            axis: 'y', facing: 'tangent', count: 10, radius: 760, arc: 360,
            tiltX: -20, tiltY: 0, roll: 10, rise: 0, cardScale: 0.24,
            view: { pitch: -12, yaw: 0, dist: 1.0 }
        },
        {
            key: 'vertical_stack', name: 'Vertical Stack',
            desc: 'Rolodex — cards roll over a horizontal axis',
            axis: 'x', facing: 'tangent', count: 8, radius: 620, arc: 360,
            tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.26,
            view: { pitch: 0, yaw: -18, dist: 1.0 }
        },
        {
            key: 'floating_perspective', name: 'Floating Perspective',
            desc: 'Angled helix — cards climb as they pass',
            axis: 'y', facing: 'tangent', count: 8, radius: 1050, arc: 200,
            tiltX: -14, tiltY: 0, roll: -8, rise: 95, cardScale: 0.21,
            view: { pitch: -10, yaw: 12, dist: 1.05 }
        },
        {
            key: 'sphere_cloud', name: 'Sphere Cloud',
            desc: 'Cards scattered over a sphere, always facing you',
            axis: 'fib', facing: 'billboard', count: 14, radius: 640, arc: 360,
            tiltX: 0, tiltY: 0, roll: 0, rise: 0, cardScale: 0.17,
            view: { pitch: -6, yaw: 0, dist: 0.95 }
        }
    ];

    

    var state = {
        mounted: false,
        view: 'gallery',        
        preset: null,           
        slots: [],              
        source: 'timeline',     
        duration: 8,
        direction: 1,           
        stepped: false,
        depthBlur: false,
        loop: true,             
        introOutro: false,      
        style: 'fade',          
        turns: 1,

        


        cam: { pitch: -16, yaw: 0, panX: 0, panY: 0, dist: 2300 },
        playing: true,
        spin: 0,
        raf: 0,
        lastT: 0,
        dragging: null,
        comp: { w: 1080, h: 1920, label: '9:16' }
    };

    

    



    function injectCSS() {
        if (el('car3d-style')) return;
        var s = document.createElement('style');
        s.id = 'car3d-style';
        s.textContent = [
            






            



            '#carousel-modal .modal-box { overflow:hidden; }',
            '#car-view-generator { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; }',
            '#car-view-carousel3d { flex:1; min-height:0; display:flex; flex-direction:column; gap:8px; }',

            '#car3d-root { --c3-bounce: cubic-bezier(0.175, 0.885, 0.32, 1.275);',
            '  --c3-fast: 0.2s; --c3-slow: 0.34s;',
            '  flex:1; min-height:0; overflow-y:auto; overflow-x:hidden;',
            '  display:flex; flex-direction:column; gap:9px; font-family:inherit; }',

            '@keyframes c3-pop { from { opacity:0; transform:translateY(7px) scale(.94); }',
            '  to { opacity:1; transform:none; } }',
            '@keyframes c3-slide { from { opacity:0; transform:translateY(10px); }',
            '  to { opacity:1; transform:none; } }',

            
            '.c3-rule { display:flex; align-items:center; gap:7px; margin:2px 0;',
            '  color:#5a5a5a; font-size:7px; font-weight:850; letter-spacing:.8px; text-transform:uppercase; }',
            '.c3-rule::after { content:""; flex:1; height:1px; background:rgba(255,255,255,.06); }',
            '.c3-rule b { color:var(--primary); font-weight:850; }',

            
            '#car3d-gallery { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }',
            '.c3-look { min-width:0; padding:6px; border:1px solid rgba(255,255,255,.08); border-radius:7px;',
            '  background:#101010; cursor:pointer; text-align:left;',
            '  animation:c3-pop var(--c3-slow) var(--c3-bounce) both;',
            '  transition:border-color var(--c3-fast) var(--c3-bounce),',
            '    background var(--c3-fast) var(--c3-bounce),',
            '    transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-look:hover { border-color:var(--primary-dim); transform:translateY(-3px) scale(1.02); }',
            '.c3-look:active { transform:translateY(-1px) scale(.99); }',
            '.c3-look.active { border-color:var(--primary); background:var(--primary-dim);',
            '  box-shadow:0 0 0 1px var(--primary-dim); }',
            
            '.c3-look:nth-child(1) { animation-delay:0s; }',
            '.c3-look:nth-child(2) { animation-delay:.035s; }',
            '.c3-look:nth-child(3) { animation-delay:.07s; }',
            '.c3-look:nth-child(4) { animation-delay:.105s; }',
            '.c3-look:nth-child(5) { animation-delay:.14s; }',
            '.c3-look:nth-child(6) { animation-delay:.175s; }',
            '.c3-look-stage { position:relative; height:62px; margin-bottom:5px; overflow:hidden;',
            '  border:1px solid rgba(255,255,255,.06); border-radius:5px; background:#050505;',
            '  perspective:320px; perspective-origin:50% 50%; }',
            '.c3-look-title { display:block; overflow:hidden; color:#c8c8c8; font-size:7.5px; font-weight:850;',
            '  letter-spacing:.45px; text-transform:uppercase; text-overflow:ellipsis; white-space:nowrap; }',
            '.c3-look.active .c3-look-title { color:var(--primary); }',
            '.c3-look-desc { display:block; margin-top:2px; color:#5f5f5f; font-size:6.5px; line-height:1.25; }',

            
            '#car3d-builder { display:flex; gap:10px; align-items:stretch; }',
            '#car3d-builder.entering .c3-left { animation:c3-slide var(--c3-slow) var(--c3-bounce) both; }',
            '#car3d-builder.entering .c3-right { animation:c3-slide var(--c3-slow) var(--c3-bounce) .05s both; }',
            '.c3-left { flex:1.05; display:flex; flex-direction:column; gap:6px; min-width:0; }',
            '.c3-right { flex:.95; display:flex; flex-direction:column; gap:7px; min-width:0;',
            '  border-left:1px solid rgba(255,255,255,.06); padding-left:10px; }',

            '.c3-crumb { display:flex; align-items:center; justify-content:space-between; gap:6px; }',
            '#car3d-back { color:#6d6d6d; font-size:7px; font-weight:850; letter-spacing:.7px;',
            '  text-transform:uppercase; cursor:pointer; }',
            '#car3d-back:hover { color:var(--primary); }',
            '#car3d-name { color:#c8c8c8; font-size:7.5px; font-weight:900; letter-spacing:.8px;',
            '  text-transform:uppercase; }',

            
            '#car3d-stage { position:relative; flex:1 1 auto; min-height:150px; max-height:min(32vh,300px);',
            '  overflow:hidden; border:1px solid rgba(255,255,255,.06); border-radius:7px;',
            '  background:#000; cursor:grab; }',
            '#car3d-stage.dragging { cursor:grabbing; }',
            
            '#car3d-frame { position:absolute; left:50%; top:50%; overflow:hidden; border-radius:2px;',
            '  outline:1px solid rgba(0,255,85,.22); background:#050505;',
            '  perspective-origin:50% 50%; }',
            '#car3d-frame::after { content:""; position:absolute; inset:0; pointer-events:none;',
            '  background:radial-gradient(ellipse at 50% 42%, rgba(0,255,85,.05), transparent 62%); }',
            '#car3d-scene { position:absolute; left:50%; top:50%; width:0; height:0; transform-style:preserve-3d; }',
            '#car3d-ring { position:absolute; transform-style:preserve-3d; }',
            '.c3-card { position:absolute; transform-style:preserve-3d; border-radius:3px; overflow:hidden;',
            '  box-shadow:0 4px 14px rgba(0,0,0,.55); display:flex; align-items:center;',
            '  justify-content:center; will-change:transform,filter; }',
            '.c3-card img { width:100%; height:100%; object-fit:cover; display:block; }',
            '.c3-card span { font:900 13px/1 inherit; letter-spacing:1px; }',

            
            '.c3-badge { position:absolute; top:6px; left:6px; z-index:3; padding:2px 5px;',
            '  border:1px solid var(--primary-dim); border-radius:4px; background:var(--primary-dim);',
            '  color:var(--primary); font-size:6.5px; font-weight:900; letter-spacing:.7px; }',
            '.c3-eye { position:absolute; top:5px; right:6px; z-index:3; width:20px; height:20px;',
            '  border:1px solid rgba(255,255,255,.08); border-radius:4px; background:#111; color:#7d7d7d;',
            '  display:flex; align-items:center; justify-content:center; cursor:pointer; }',
            '.c3-eye { transition:color var(--c3-fast) var(--c3-bounce),',
            '  border-color var(--c3-fast) var(--c3-bounce), transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-eye:hover { color:var(--primary); border-color:var(--primary-dim); transform:scale(1.12); }',
            '.c3-eye:active { transform:scale(.92); }',
            '.c3-eye svg { width:11px; height:11px; fill:currentColor; }',
            '#car3d-gizmo { position:absolute; top:30px; right:6px; z-index:3; width:46px; height:46px;',
            '  cursor:grab; opacity:.8; }',
            '#car3d-gizmo:hover { opacity:1; }',

            '.c3-pad { position:absolute; left:6px; bottom:6px; z-index:3; display:grid;',
            '  grid-template-columns:repeat(3,17px); grid-template-rows:repeat(3,17px); gap:2px; }',
            '.c3-zoom { position:absolute; right:6px; bottom:6px; z-index:3; display:flex;',
            '  flex-direction:column; gap:2px; }',
            '.c3-nub { width:17px; height:17px; border:1px solid rgba(255,255,255,.08); border-radius:4px;',
            '  background:#111; color:#6d6d6d; font-size:8px; cursor:pointer; user-select:none;',
            '  display:flex; align-items:center; justify-content:center;',
            '  transition:color var(--c3-fast) var(--c3-bounce),',
            '    border-color var(--c3-fast) var(--c3-bounce),',
            '    transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-nub:hover { color:var(--primary); border-color:var(--primary-dim); transform:scale(1.18); }',
            '.c3-nub:active { transform:scale(.9); }',

            
            '#car3d-add { display:flex; align-items:center; justify-content:center; gap:6px; width:100%;',
            '  height:29px; border:1px dashed rgba(255,255,255,.12); border-radius:6px; background:#0d0d0d;',
            '  color:#8a8a8a; font-size:7.5px; font-weight:850; letter-spacing:.5px; text-transform:uppercase;',
            '  cursor:pointer; }',
            '#car3d-add { transition:color var(--c3-fast) var(--c3-bounce),',
            '  border-color var(--c3-fast) var(--c3-bounce), background var(--c3-fast) var(--c3-bounce),',
            '  transform var(--c3-fast) var(--c3-bounce); }',
            '#car3d-add:hover { color:var(--primary); border-color:var(--primary); background:var(--primary-dim);',
            '  transform:translateY(-1px); }',
            '#car3d-add:active { transform:scale(.985); }',
            '#car3d-add svg { width:11px; height:11px; fill:currentColor; }',
            '#car3d-slots { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:4px;',
            '  max-height:126px; overflow-y:auto; }',
            '.c3-slot { position:relative; padding-bottom:100%; height:0; overflow:hidden; border-radius:5px;',
            '  border:1px solid rgba(255,255,255,.065); background:#0d0d0d; cursor:grab;',
            '  animation:c3-pop var(--c3-fast) var(--c3-bounce) both;',
            '  transition:border-color var(--c3-fast) var(--c3-bounce),',
            '    transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-slot:hover { transform:scale(1.04); }',
            '.c3-slot.drag-over { border-color:var(--primary); transform:scale(1.08); }',
            '.c3-slot img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }',
            '.c3-slot b { position:absolute; left:0; right:0; top:50%; margin-top:-5px; text-align:center;',
            '  font-size:7px; font-weight:900; letter-spacing:.6px; color:#050505; }',
            '.c3-slot-empty { border-style:dashed; border-color:rgba(255,255,255,.075); }',
            '.c3-slot-empty b { color:#3d3d3d; }',
            '.c3-x { position:absolute; top:2px; right:2px; z-index:2; width:13px; height:13px;',
            '  border-radius:3px; background:rgba(0,0,0,.72); color:#bbb; font-size:8px; line-height:13px;',
            '  text-align:center; cursor:pointer; opacity:0; transition:opacity .14s ease; }',
            '.c3-slot:hover .c3-x { opacity:1; }',
            '.c3-x:hover { background:rgba(255,70,70,.22); color:#ff5d5d; }',
            '#car3d-slot-note { color:#555; font-size:6.5px; line-height:1.35; }',
            '.c3-altsrc { color:#7d7d7d; font-size:6.5px; font-weight:850; letter-spacing:.5px;',
            '  text-transform:uppercase; cursor:pointer; }',
            '.c3-altsrc:hover { color:var(--primary); }',
            '.c3-altsrc.on { color:var(--primary); }',
            '.c3-mini { height:23px; padding:0 8px; border:1px solid rgba(255,255,255,.08); border-radius:5px;',
            '  background:#101010; color:#777; font-size:6.5px; font-weight:900; letter-spacing:.7px;',
            '  cursor:pointer; display:flex; align-items:center; justify-content:center; }',
            '.c3-mini { transition:color var(--c3-fast) var(--c3-bounce),',
            '  border-color var(--c3-fast) var(--c3-bounce), transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-mini:hover { color:var(--primary); border-color:var(--primary-dim); transform:scale(1.05); }',
            '.c3-mini:active { transform:scale(.94); }',
            
            '.c3-slot-layer { background:#101010; }',
            '.c3-slot-layer b { top:34%; margin-top:0; }',
            '.c3-slot-layer i { position:absolute; left:3px; right:3px; top:56%; font-style:normal;',
            '  font-size:6px; font-weight:750; line-height:1.2; color:#8a8a8a; text-align:center;',
            '  overflow:hidden; display:block; max-height:2.4em; word-break:break-all; }',

            
            '.c3-row { display:grid; grid-template-columns:64px minmax(0,1fr); align-items:center; gap:6px; }',
            '.c3-row > label { overflow:hidden; color:#777; font-size:7px; font-weight:750;',
            '  letter-spacing:.4px; text-transform:uppercase; text-overflow:ellipsis; white-space:nowrap; }',
            '.c3-seg { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:4px; }',
            '.c3-seg > div { height:23px; border:1px solid rgba(255,255,255,.08); border-radius:5px;',
            '  background:#101010; color:#777; font-size:7px; font-weight:800; cursor:pointer;',
            '  display:flex; align-items:center; justify-content:center;',
            '  transition:color var(--c3-fast) var(--c3-bounce),',
            '    background var(--c3-fast) var(--c3-bounce),',
            '    border-color var(--c3-fast) var(--c3-bounce),',
            '    transform var(--c3-fast) var(--c3-bounce); }',
            '.c3-seg > div:active { transform:scale(.94); }',
            '.c3-seg > div.active { transform:scale(1.04); }',
            '.c3-seg > div:hover { color:#aaa; }',
            '.c3-seg > div.active { border-color:var(--primary); background:var(--primary-dim); color:var(--primary); }',
            '.c3-sw { position:relative; width:30px; height:16px; border-radius:8px; flex:none; cursor:pointer;',
            '  border:1px solid rgba(255,255,255,.08); background:#101010;',
            '  transition:background .16s ease, border-color .16s ease; }',
            
            '.c3-sw::after { content:""; position:absolute; top:2px; left:2px; width:10px; height:10px;',
            '  border-radius:50%; background:#5a5a5a;',
            '  transition:transform var(--c3-slow) var(--c3-bounce), background var(--c3-fast) ease; }',
            '.c3-sw.on { border-color:var(--primary); background:var(--primary-dim); }',
            '.c3-sw.on::after { transform:translateX(14px); background:var(--primary); }',
            '.c3-num { width:100%; height:23px; padding:0 4px; box-sizing:border-box; text-align:center;',
            '  border:1px solid rgba(255,255,255,.08); border-radius:5px; background:#101010; color:#bbb;',
            '  font-family:inherit; font-size:7.5px; font-weight:800; }',
            '.c3-num:focus { outline:none; border-color:var(--primary); color:var(--primary); }',
            '.c3-duo { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.1fr); gap:5px; align-items:center; }',
            '.c3-chips { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }',
            '.c3-chip { display:flex; align-items:center; justify-content:space-between; gap:6px;',
            '  padding:5px 7px; border:1px solid rgba(255,255,255,.07); border-radius:5px;',
            '  background:#0d0d0d; cursor:pointer; }',
            '.c3-chip span { color:#777; font-size:7px; font-weight:800; letter-spacing:.4px;',
            '  text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
            '.c3-chip.off { opacity:.42; }',

            
            '#car3d-build { flex:none; height:30px; border:1px solid var(--primary); border-radius:6px;',
            '  background:var(--primary); color:var(--primary-contrast,#050505); font-size:8px;',
            '  font-weight:900; letter-spacing:.8px; text-transform:uppercase; cursor:pointer;',
            '  display:flex; align-items:center; justify-content:center; }',
            '#car3d-build { transition:transform var(--c3-slow) var(--c3-bounce), filter var(--c3-fast) ease; }',
            '#car3d-build:hover { filter:brightness(1.12); transform:scale(1.025); }',
            '#car3d-build:active { transform:scale(.97); }',
            '#car3d-build.busy { background:var(--primary-dim); color:var(--primary); pointer-events:none; }',

            '@media (prefers-reduced-motion: reduce) {',
            '  #car3d-root * { animation:none !important; transition-duration:.01s !important; }',
            '}',

            
            '@media (max-width: 620px) {',
            '  #car3d-gallery { grid-template-columns:repeat(2,minmax(0,1fr)); }',
            '  #car3d-builder { flex-direction:column; }',
            '  .c3-right { border-left:none; padding-left:0;',
            '    border-top:1px solid rgba(255,255,255,.06); padding-top:9px; }',
            '  #car3d-stage { min-height:210px; }',
            '}',
            '@media (max-width: 340px) {',
            '  #car3d-gallery { grid-template-columns:1fr; }',
            '  #car3d-slots { grid-template-columns:repeat(3,minmax(0,1fr)); }',
            '  .c3-row { grid-template-columns:56px minmax(0,1fr); }',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    

    


    function cardAngle(p, i, n, spin) {
        var span = p.arc;
        var step = (n > 1) ? (span >= 359.9 ? span / n : span / (n - 1)) : 0;
        return (p.arc >= 359.9 ? -90 : -90 - span / 2) + i * step + spin;
    }

    function cardPos(p, i, n, spin) {
        var r = p.radius;
        if (p.axis === 'fib') {
            var phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(1, n));
            var th = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + spin * Math.PI / 180;
            return [Math.cos(th) * Math.sin(phi) * r, Math.cos(phi) * r, Math.sin(th) * Math.sin(phi) * r];
        }
        var a = cardAngle(p, i, n, spin) * Math.PI / 180;
        var rise = p.rise * (i - (n - 1) / 2);
        if (p.axis === 'x') return [0, Math.cos(a) * r, Math.sin(a) * r];
        return [Math.cos(a) * r, rise, Math.sin(a) * r];
    }

    

    function cardRot(p, i, n, spin) {
        if (p.facing !== 'tangent') return [0, 0, 0];
        var a = cardAngle(p, i, n, spin);
        if (p.axis === 'x') return [a + 90, 0, 0];
        return [0, -(a + 90), 0];
    }

    

    



    function cardSize(p, compW) {
        var w = compW * p.cardScale;
        return [w, w * 1.3];
    }

    







    function scaleToComp() {
        var p = state.preset;
        if (!p) return;
        if (p.baseRadius == null) p.baseRadius = p.radius;

        var compScale = state.comp.w / 1080;
        if (p.axis === 'fib' || p.facing !== 'tangent') {
            p.radius = p.baseRadius * compScale;
            return;
        }

        var n = slotCount(p);
        var cardW = cardSize(p, state.comp.w)[0];
        var fill = 0.94;                       
        var full = p.arc >= 359.9;
        

        var needed = full ? (n * cardW / fill)
            : ((Math.max(1, n - 1) * cardW / fill) * 360 / p.arc);
        var R = needed / (2 * Math.PI);
        p.radius = Math.max(R, cardW * 0.9);
    }

    function slotCount(p) {
        return Math.max(2, state.slots.length || p.count);
    }

    function cardFace(i) {
        var s = state.slots[i];
        if (s && s.kind === 'image') {
            return '<img src="' + fileUrl(s.path) + '" alt="">';
        }
        return '<span style="color:' + swatch(i)[2] + '">' + pad2(i + 1) + '</span>';
    }

    function cardBg(i) {
        var s = state.slots[i];
        if (s && s.kind === 'image') return 'transparent';
        var c = swatch(i);
        return 'linear-gradient(150deg,' + c[0] + ',' + c[1] + ')';
    }

    function buildCards(ring, p, n, w, h) {
        ring.innerHTML = '';
        for (var i = 0; i < n; i++) {
            var d = document.createElement('div');
            d.className = 'c3-card';
            d.style.width = w + 'px';
            d.style.height = h + 'px';
            d.style.marginLeft = (-w / 2) + 'px';
            d.style.marginTop = (-h / 2) + 'px';
            d.style.background = cardBg(i);
            d.innerHTML = cardFace(i);
            ring.appendChild(d);
        }
    }

    









    function layout(ring, p, n, spin, scale, blur, env) {
        var kids = ring.children;
        var rMul = env ? env.radius : 1;
        for (var i = 0; i < n && i < kids.length; i++) {
            var q = cardPos(p, i, n, spin);
            if (rMul !== 1) { q = [q[0] * rMul, q[1] * rMul, q[2] * rMul]; }
            var r = cardRot(p, i, n, spin);
            var cssZ = -q[2] * scale;
            var t = 'translate3d(' + (q[0] * scale).toFixed(2) + 'px,' +
                (q[1] * scale).toFixed(2) + 'px,' + cssZ.toFixed(2) + 'px)';
            if (p.facing === 'billboard') {
                
                t += ' rotateY(' + (-p.tiltY) + 'deg) rotateX(' + (-p.tiltX) + 'deg)' +
                    ' rotateZ(' + (-p.roll) + 'deg)' +
                    ' rotateY(' + (-state.cam.yaw) + 'deg) rotateX(' + (-state.cam.pitch) + 'deg)';
            } else if (p.facing === 'tangent') {
                t += ' rotateX(' + (-r[0]).toFixed(2) + 'deg) rotateY(' + (-r[1]).toFixed(2) + 'deg)';
            }
            kids[i].style.transform = t;

            var blurPx = 0, alpha = 1;
            if (blur) {
                

                var depth = clamp(0.5 - cssZ / (2 * p.radius * scale), 0, 1);
                blurPx = depth * 3.2;
                alpha = 1 - depth * 0.35;
            }
            if (env) {
                
                var stag = (i / Math.max(1, n)) * Math.min(0.5, env.dur * 0.08);
                var k = clamp((env.t - stag) / Math.max(0.001, env.lead), 0, 1);
                k = Math.min(k, clamp((env.dur - env.t) / Math.max(0.001, env.lead), 0, 1));
                var e = (1 - Math.cos(clamp(k, 0, 1) * Math.PI)) / 2;
                if (env.style === 'fade' || env.style === 'blur') alpha *= e;
                if (env.style === 'blur') blurPx += (1 - e) * 9;
                if (env.style === 'scale') {
                    t += ' scale(' + (0.2 + 0.8 * e).toFixed(3) + ')';
                    kids[i].style.transform = t;
                }
            }
            kids[i].style.filter = blurPx > 0.01 ? 'blur(' + blurPx.toFixed(2) + 'px)' : '';
            kids[i].style.opacity = alpha < 0.999 ? alpha.toFixed(3) : '';
        }
    }

    



    var FOCAL_ZOOM = 50 / 36;

    function compZoom() { return state.comp.w * FOCAL_ZOOM; }

    

    



    var _fbCache = null, _fbRO = null;

    function frameBox(stage) {
        if (_fbCache && _fbCache.w === state.comp.w && _fbCache.h === state.comp.h) {
            return _fbCache.box;
        }
        var pad = 14;
        var aw = Math.max(40, (stage.clientWidth || 320) - pad * 2);
        var ah = Math.max(40, (stage.clientHeight || 280) - pad * 2);
        var ar = state.comp.w / state.comp.h;
        var w = aw, h = aw / ar;
        if (h > ah) { h = ah; w = ah * ar; }
        var box = [w, h];

        if (typeof ResizeObserver !== 'undefined') {
            if (!_fbRO) {
                _fbRO = new ResizeObserver(function () { _fbCache = null; });
                try { _fbRO.observe(stage); } catch (e) { }
            }
            _fbCache = { w: state.comp.w, h: state.comp.h, box: box };
        }
        return box;
    }

    function invalidateFrameBox() { _fbCache = null; }

    function renderPreview() {
        var stage = el('car3d-stage'), frame = el('car3d-frame'),
            scene = el('car3d-scene'), ring = el('car3d-ring');
        if (!stage || !frame || !scene || !ring || !state.preset) return;
        var p = state.preset, n = slotCount(p);

        var fb = frameBox(stage);
        
        var scale = fb[0] / state.comp.w;

        
        var fkey = fb[0].toFixed(1) + 'x' + fb[1].toFixed(1) + '@' + state.cam.dist.toFixed(1);
        if (frame.getAttribute('data-fkey') !== fkey) {
            frame.style.width = fb[0].toFixed(1) + 'px';
            frame.style.height = fb[1].toFixed(1) + 'px';
            frame.style.marginLeft = (-fb[0] / 2).toFixed(1) + 'px';
            frame.style.marginTop = (-fb[1] / 2).toFixed(1) + 'px';
            
            frame.style.perspective = Math.max(1, state.cam.dist * scale).toFixed(1) + 'px';
            frame.setAttribute('data-fkey', fkey);
        }

        var key = p.key + ':' + state.slots.length + ':' + state.comp.w + ':' + fb[0].toFixed(0);
        if (ring.children.length !== n || ring.getAttribute('data-key') !== key) {
            var box = cardSize(p, state.comp.w);
            buildCards(ring, p, n, box[0] * scale, box[1] * scale);
            ring.setAttribute('data-key', key);
        }

        




        var mag = compZoom() / Math.max(1, state.cam.dist);
        scene.style.transform =
            'scale(' + mag.toFixed(4) + ') ' +
            'translate(' + (state.cam.panX * scale).toFixed(2) + 'px,' +
            (state.cam.panY * scale).toFixed(2) + 'px) ' +
            'rotateX(' + state.cam.pitch + 'deg) rotateY(' + state.cam.yaw + 'deg)';
        ring.style.transform =
            'rotateZ(' + p.roll + 'deg) rotateX(' + (-p.tiltX) + 'deg) rotateY(' + (-p.tiltY) + 'deg)';

        layout(ring, p, n, state.spin, scale, state.depthBlur, envelope());
        drawGizmo();
    }

    


    function totalSpin() {
        var turns = state.loop ? Math.max(1, Math.round(state.turns)) : state.turns;
        return 360 * turns * state.direction;
    }

    

    function spinAt(t) {
        var total = totalSpin();
        if (!state.stepped) return (t / state.duration) * total;
        var n = slotCount(state.preset);
        var period = state.duration / n;
        var idx = Math.floor(t / period);
        var f = (t - idx * period) / period;
        var e = f < 0.55 ? 0 : (f > 0.95 ? 1 : (1 - Math.cos(((f - 0.55) / 0.4) * Math.PI)) / 2);
        return (total / n) * (idx + e);
    }

    

    function envelope() {
        if (!state.introOutro || state.loop || state.style === 'none') return null;
        var lead = Math.min(0.9, state.duration * 0.18);
        var t = state._t || 0, d = state.duration;
        var inK = clamp(t / Math.max(0.001, lead), 0, 1);
        var outK = clamp((d - t) / Math.max(0.001, lead), 0, 1);
        var k = Math.min(inK, outK);
        var eased = (1 - Math.cos(k * Math.PI)) / 2;
        return { radius: 0.35 + 0.65 * eased, fade: eased, style: state.style, t: t, lead: lead, dur: d };
    }

    function tick(now) {
        state.raf = 0;
        if (state.view !== 'builder' || !state.preset) return;
        var dt = state.lastT ? Math.min(0.1, (now - state.lastT) / 1000) : 0;
        state.lastT = now;

        if (state.playing) {
            

            state._t = ((state._t || 0) + dt) % state.duration;
            state.spin = spinAt(state._t);
        }
        renderPreview();
        schedule();
    }

    

    function schedule() {
        if (state.raf) return;
        if (document.hidden) {
            state.raf = setTimeout(function () { state.raf = 0; tick(performance.now()); }, 120);
            return;
        }
        state.raf = requestAnimationFrame(tick);
    }

    function stopLoop() {
        if (!state.raf) return;
        try { cancelAnimationFrame(state.raf); } catch (e) { }
        try { clearTimeout(state.raf); } catch (e2) { }
        state.raf = 0;
        state.lastT = 0;
    }

    

    function drawGizmo() {
        var g = el('car3d-gizmo');
        if (!g) return;
        var pitch = state.cam.pitch * Math.PI / 180, yaw = state.cam.yaw * Math.PI / 180;
        
        function proj(v) {
            var x = v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw);
            var z = -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
            var y = v[1] * Math.cos(pitch) - z * Math.sin(pitch);
            return [26 + x * 19, 26 + y * 19];
        }
        

        var ax = [
            { v: [1, 0, 0], c: '#3d6b4e', w: 1 },
            { v: [0, 1, 0], c: 'var(--primary)', w: 1.5 },
            { v: [0, 0, 1], c: '#3d6b4e', w: 1 }
        ];
        var spinAxis = (state.preset && state.preset.axis === 'x') ? 0 : 1;
        var svg = '<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">' +
            '<circle cx="26" cy="26" r="20" fill="rgba(0,0,0,.55)" stroke="rgba(255,255,255,.10)" stroke-width="1"/>' +
            '<ellipse cx="26" cy="26" rx="20" ry="' + Math.max(1.5, Math.abs(20 * Math.sin(pitch))).toFixed(1) +
            '" fill="none" stroke="rgba(0,255,85,.22)" stroke-width="1"/>';
        for (var i = 0; i < ax.length; i++) {
            var hot = (i === spinAxis);
            var col = hot ? 'var(--primary)' : '#3d6b4e';
            var a = proj(ax[i].v), b = proj([-ax[i].v[0], -ax[i].v[1], -ax[i].v[2]]);
            svg += '<line x1="' + b[0].toFixed(1) + '" y1="' + b[1].toFixed(1) + '" x2="' + a[0].toFixed(1) +
                '" y2="' + a[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + (hot ? 1.5 : 1) +
                '" opacity="' + (hot ? '1' : '.75') + '"/>' +
                '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="' + (hot ? 2.6 : 1.9) +
                '" fill="' + col + '"/>';
        }
        g.innerHTML = svg + '</svg>';
    }

    

    function pickMedia() {
        var exts = IMAGE_EXT.concat(VIDEO_EXT);
        try {
            if (window.cep && window.cep.fs && window.cep.fs.showOpenDialogEx) {
                var r = window.cep.fs.showOpenDialogEx(true, false, 'Add images / video', '', exts);
                if (r && r.data && r.data.length) { addPaths(r.data); return; }
                return;
            }
        } catch (e) { }
        var input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.addEventListener('change', function () {
            var out = [];
            for (var i = 0; i < this.files.length; i++) if (this.files[i].path) out.push(this.files[i].path);
            addPaths(out);
        });
        input.click();
    }

    function addPaths(paths) {
        for (var i = 0; i < paths.length; i++) {
            var e = extOf(paths[i]);
            state.slots.push({
                path: String(paths[i]),
                name: baseName(paths[i]),
                kind: VIDEO_EXT.indexOf(e) !== -1 ? 'video' : 'image'
            });
        }
        state.source = 'files';
        reflow();
        syncSourceUI();
        renderSlots();
        renderPreview();
    }

    function renderSlots() {
        var host = el('car3d-slots');
        if (!host) return;
        host.innerHTML = '';
        var n = state.slots.length ? state.slots.length : state.preset.count;

        for (var i = 0; i < n; i++) {
            var s = state.slots[i];
            var d = document.createElement('div');
            d.className = 'c3-slot' + (s ? '' : ' c3-slot-empty');
            d.setAttribute('data-idx', String(i));
            if (s) {
                d.draggable = true;
                d.title = s.name;
            }
            var c = swatch(i);
            if (s && s.kind === 'image') {
                d.style.background = '#111';
                d.innerHTML = '<img src="' + fileUrl(s.path) + '" alt="">';
            } else if (s && s.kind === 'layer') {
                d.className += ' c3-slot-layer';
                d.innerHTML = '<b style="color:var(--primary)">' + pad2(i + 1) + '</b>' +
                    '<i>' + escapeHtml(s.name) + '</i>';
            } else if (s) {
                d.style.background = 'linear-gradient(150deg,' + c[0] + ',' + c[1] + ')';
                d.innerHTML = '<b style="color:' + c[2] + '">' + pad2(i + 1) + '</b>';
            } else {
                d.innerHTML = '<b>' + pad2(i + 1) + '</b>';
            }
            if (s) {
                var x = document.createElement('div');
                x.className = 'c3-x';
                x.textContent = '×';
                x.setAttribute('data-idx', String(i));
                d.appendChild(x);
            }
            host.appendChild(d);
        }
        wireSlotDrag(host);
        var lbl = el('car3d-slot-note');
        if (lbl) {
            if (!state.slots.length) {
                lbl.textContent = state.source === 'timeline'
                    ? 'No usable layers in the comp — numbered placeholders will be built'
                    : 'No files yet — numbered placeholders will be built';
            } else {
                lbl.textContent = state.slots.length +
                    (state.source === 'timeline' ? ' layer' : ' file') +
                    (state.slots.length === 1 ? '' : 's') + ' — drag a tile to reorder the ring';
            }
        }
    }

    function wireSlotDrag(host) {
        var from = -1;
        host.addEventListener('dragstart', function (ev) {
            var t = ev.target.closest ? ev.target.closest('.c3-slot') : null;
            from = t ? parseInt(t.getAttribute('data-idx'), 10) : -1;
        });
        host.addEventListener('dragover', function (ev) {
            ev.preventDefault();
            var t = ev.target.closest ? ev.target.closest('.c3-slot') : null;
            var all = host.querySelectorAll('.c3-slot');
            for (var i = 0; i < all.length; i++) all[i].classList.remove('drag-over');
            if (t) t.classList.add('drag-over');
        });
        host.addEventListener('drop', function (ev) {
            ev.preventDefault();
            var t = ev.target.closest ? ev.target.closest('.c3-slot') : null;
            var to = t ? parseInt(t.getAttribute('data-idx'), 10) : -1;
            if (from >= 0 && to >= 0 && from !== to && from < state.slots.length && to < state.slots.length) {
                var moved = state.slots.splice(from, 1)[0];
                state.slots.splice(to, 0, moved);
                renderSlots();
                el('car3d-ring').setAttribute('data-key', '');
                renderPreview();
            }
            from = -1;
        });
        host.addEventListener('click', function (ev) {
            if (!ev.target.classList.contains('c3-x')) return;
            var i = parseInt(ev.target.getAttribute('data-idx'), 10);
            if (i >= 0 && i < state.slots.length) {
                state.slots.splice(i, 1);
                reflow();
                renderSlots();
                renderPreview();
            }
        });
    }

    

    function iconUpload() {
        return '<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>';
    }

    function iconEye(open) {
        return open
            ? '<svg viewBox="0 0 24 24"><path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M2 4.3L3.3 3 21 20.7 19.7 22l-3.2-3.2A11 11 0 0112 19c-7 0-10-7-10-7a17 17 0 014.5-5.2L2 4.3zM12 7a5 5 0 014.9 6l-6-6c.35-.06.72-.1 1.1-.1z"/></svg>';
    }

    function buildGallery(host) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:7px;';
        wrap.innerHTML = '<div class="c3-rule">Choose a look</div>';
        var grid = document.createElement('div');
        grid.id = 'car3d-gallery';
        wrap.appendChild(grid);

        for (var i = 0; i < PRESETS.length; i++) {
            var p = PRESETS[i];
            var card = document.createElement('div');
            card.className = 'c3-look';
            card.setAttribute('data-key', p.key);
            card.innerHTML =
                '<div class="c3-look-stage"><div class="c3-look-ring"></div></div>' +
                '<div class="c3-look-title">' + p.name + '</div>' +
                '<div class="c3-look-desc">' + p.desc + '</div>';
            (function (preset) {
                card.addEventListener('click', function () { chooseLook(preset); });
            })(p);
            grid.appendChild(card);
            paintThumb(card.querySelector('.c3-look-ring'), p);
        }
        host.appendChild(wrap);
        return wrap;
    }

    

    function paintThumb(ring, p) {
        var n = Math.min(p.count, 9);
        var scale = 40 / p.radius;
        ring.setAttribute('style',
            'position:absolute; left:50%; top:50%; transform-style:preserve-3d;' +
            'transform:rotateX(' + (p.view.pitch - p.tiltX) + 'deg) rotateY(' + (p.view.yaw - p.tiltY) +
            'deg) rotateZ(' + p.roll + 'deg);');
        var box = cardSize(p, 1080);
        var w = Math.max(6, box[0] * scale);
        var h = Math.max(8, box[1] * scale);
        var html = '';
        for (var i = 0; i < n; i++) {
            var q = cardPos(p, i, n, 0), r = cardRot(p, i, n, 0), c = swatch(i);
            var t = 'translate3d(' + (q[0] * scale).toFixed(1) + 'px,' + (q[1] * scale).toFixed(1) +
                'px,' + (-q[2] * scale).toFixed(1) + 'px)';
            if (p.facing === 'tangent') t += ' rotateX(' + (-r[0]).toFixed(1) + 'deg) rotateY(' + (-r[1]).toFixed(1) + 'deg)';
            html += '<div style="position:absolute; width:' + w.toFixed(1) + 'px; height:' + h.toFixed(1) +
                'px; margin-left:' + (-w / 2).toFixed(1) + 'px; margin-top:' + (-h / 2).toFixed(1) +
                'px; border-radius:3px; background:linear-gradient(150deg,' + c[0] + ',' + c[1] +
                '); box-shadow:0 3px 9px rgba(0,0,0,.45); transform:' + t + ';"></div>';
        }
        ring.innerHTML = html;
    }

    function seg(id, options, value, onPick) {
        var d = document.createElement('div');
        d.className = 'c3-seg';
        d.id = id;
        options.forEach(function (o) {
            var b = document.createElement('div');
            b.textContent = o.label;
            b.setAttribute('data-v', String(o.value));
            if (String(o.value) === String(value)) b.className = 'active';
            b.addEventListener('click', function () {
                var kids = d.children;
                for (var i = 0; i < kids.length; i++) kids[i].className = '';
                b.className = 'active';
                onPick(o.value);
            });
            d.appendChild(b);
        });
        return d;
    }

    
    function chip(id, label, on, onFlip) {
        var d = document.createElement('div');
        d.className = 'c3-chip' + (on ? '' : ' off');
        d.setAttribute('data-chip', id);
        var t = document.createElement('span');
        t.textContent = label;
        var sw = document.createElement('div');
        sw.className = 'c3-sw' + (on ? ' on' : '');
        sw.id = id;
        d.appendChild(t);
        d.appendChild(sw);
        d.addEventListener('click', function () {
            var next = !sw.classList.contains('on');
            sw.classList.toggle('on', next);
            d.classList.toggle('off', !next);
            onFlip(next);
        });
        return d;
    }

    function setChip(id, on) {
        var sw = el(id);
        if (!sw) return;
        sw.classList.toggle('on', on);
        var box = sw.parentNode;
        if (box) box.classList.toggle('off', !on);
    }

    function toggle(id, on, onFlip) {
        var d = document.createElement('div');
        d.className = 'c3-sw' + (on ? ' on' : '');
        d.id = id;
        d.addEventListener('click', function () {
            var next = !d.classList.contains('on');
            d.classList.toggle('on', next);
            onFlip(next);
        });
        return d;
    }

    function rule(text) {
        var d = document.createElement('div');
        d.className = 'c3-rule';
        d.textContent = text;
        return d;
    }

    function num(id, value, onSet) {
        var t = document.createElement('input');
        t.type = 'text';
        t.className = 'c3-num';
        t.id = id;
        t.value = String(value);
        t.addEventListener('change', function () {
            this.value = String(onSet(parseFloat(this.value)));
        });
        return t;
    }

    function row(labelText, control) {
        var r = document.createElement('div');
        r.className = 'c3-row';
        var l = document.createElement('label');
        l.textContent = labelText;
        r.appendChild(l);
        r.appendChild(control);
        return r;
    }

    function buildBuilder(host) {
        var wrap = document.createElement('div');
        wrap.id = 'car3d-builder';
        wrap.style.display = 'none';

        
        var left = document.createElement('div');
        left.className = 'c3-left';
        var head = document.createElement('div');
        head.className = 'c3-crumb';
        head.innerHTML = '<div id="car3d-back">‹ All looks</div><div id="car3d-name"></div>';
        left.appendChild(head);

        var stage = document.createElement('div');
        stage.id = 'car3d-stage';
        stage.innerHTML =
            '<div id="car3d-frame"><div id="car3d-scene"><div id="car3d-ring"></div></div></div>' +
            '<div class="c3-badge" id="car3d-aspect">9:16</div>' +
            '<div class="c3-eye" id="car3d-play">' + iconEye(true) + '</div>' +
            '<div id="car3d-gizmo"></div>' +
            '<div class="c3-pad">' +
            '<div></div><div class="c3-nub" data-pan="u">▲</div><div></div>' +
            '<div class="c3-nub" data-pan="l">◀</div><div></div><div class="c3-nub" data-pan="r">▶</div>' +
            '<div></div><div class="c3-nub" data-pan="d">▼</div><div></div>' +
            '</div>' +
            '<div class="c3-zoom">' +
            '<div class="c3-nub" data-zoom="in">+</div>' +
            '<div class="c3-nub" data-zoom="out">−</div>' +
            '<div class="c3-nub" data-zoom="reset">↺</div>' +
            '</div>';
        left.appendChild(stage);
        wrap.appendChild(left);

        
        var right = document.createElement('div');
        right.className = 'c3-right';

        var add = document.createElement('div');
        add.id = 'car3d-add';
        add.innerHTML = iconUpload() + '<span>Add images / video</span>';
        add.addEventListener('click', pickMedia);
        right.appendChild(rule('Media'));
        right.appendChild(add);

        var slots = document.createElement('div');
        slots.id = 'car3d-slots';
        right.appendChild(slots);

        var note = document.createElement('div');
        note.id = 'car3d-slot-note';
        right.appendChild(note);

        var src = document.createElement('div');
        src.className = 'c3-duo';
        src.appendChild(seg('car3d-source', [
            { label: 'Timeline', value: 'timeline' }, { label: 'Files', value: 'files' }
        ], state.source, function (v) {
            state.source = v;
            if (v === 'timeline') adoptLayers(state.detected);
            else {
                state.slots = state.slots.filter(function (x) { return x.kind !== 'layer'; });
                reflow();
            }
            renderSlots();
            renderPreview();
        }));
        var rescan = document.createElement('div');
        rescan.className = 'c3-mini';
        rescan.textContent = 'RESCAN';
        rescan.title = 'Re-read the layers in the active comp';
        rescan.addEventListener('click', function () {
            state.source = 'timeline';
            readComp(true);
        });
        src.appendChild(rescan);
        right.appendChild(row('Source', src));

        right.appendChild(rule('Motion'));

        
        var dur = document.createElement('div');
        dur.className = 'c3-duo';
        dur.appendChild(num('car3d-dur', state.duration, function (v) {
            state.duration = clamp(v || 8, 0.5, 120);
            return state.duration;
        }));
        dur.appendChild(seg('car3d-dir', [{ label: '←', value: -1 }, { label: '→', value: 1 }], state.direction,
            function (v) { state.direction = Number(v); }));
        right.appendChild(row('Seconds', dur));

        right.appendChild(row('Turns', num('car3d-turns', state.turns, function (v) {
            state.turns = clamp(v || 1, 0.1, 20);
            return state.turns;
        })));

        


        var chips = document.createElement('div');
        chips.className = 'c3-chips';
        chips.appendChild(chip('car3d-loop', 'Loop', state.loop, function (v) {
            state.loop = v;
            if (v) {
                
                state.turns = Math.max(1, Math.round(state.turns));
                var tEl = el('car3d-turns');
                if (tEl) tEl.value = String(state.turns);
                state.introOutro = false;
                setChip('car3d-io', false);
            }
            syncLoopUI();
            state._t = 0;
        }));
        chips.appendChild(chip('car3d-step', 'Step', state.stepped, function (v) {
            state.stepped = v; state._t = 0;
        }));
        chips.appendChild(chip('car3d-dof', 'Depth blur', state.depthBlur, function (v) {
            state.depthBlur = v; renderPreview();
        }));
        chips.appendChild(chip('car3d-io', 'In / Out', state.introOutro, function (v) {
            state.introOutro = v;
            if (v && state.loop) {
                
                state.loop = false;
                setChip('car3d-loop', false);
                syncLoopUI();
            }
            state._t = 0;
        }));
        right.appendChild(chips);
        right.appendChild(row('Style', seg('car3d-style', [
            { label: 'Fade', value: 'fade' }, { label: 'Scale', value: 'scale' },
            { label: 'Blur', value: 'blur' }, { label: 'None', value: 'none' }
        ], state.style, function (v) { state.style = v; })));

        var spacer = document.createElement('div');
        spacer.style.flex = '1';
        right.appendChild(spacer);

        wrap.appendChild(right);
        host.appendChild(wrap);

        wireViewport(stage);
        el('car3d-back') && el('car3d-back').addEventListener('click', showGallery);
        return wrap;
    }

    function wireViewport(stage) {
        function onDown(ev) {
            var giz = ev.target.closest && ev.target.closest('#car3d-gizmo');
            if (ev.target.closest && ev.target.closest('.c3-nub, .c3-eye')) return;
            state.dragging = { x: ev.clientX, y: ev.clientY, shift: ev.shiftKey, giz: !!giz };
            stage.classList.add('dragging');
            ev.preventDefault();
        }
        function onMove(ev) {
            if (!state.dragging) return;
            var dx = ev.clientX - state.dragging.x, dy = ev.clientY - state.dragging.y;
            state.dragging.x = ev.clientX;
            state.dragging.y = ev.clientY;
            if (state.dragging.shift) {
                var stg = el('car3d-stage');
                var perPx = state.comp.w / Math.max(1, frameBox(stg)[0]);
                state.cam.panX += dx * perPx;
                state.cam.panY += dy * perPx;
            } else {
                state.cam.yaw = (state.cam.yaw + dx * 0.45) % 360;
                state.cam.pitch = clamp(state.cam.pitch - dy * 0.35, -88, 88);
                state.camTouched = true;
            }
            renderPreview();
        }
        function onUp() {
            state.dragging = null;
            stage.classList.remove('dragging');
        }
        stage.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        stage.addEventListener('wheel', function (ev) {
            state.cam.dist = clamp(state.cam.dist * (ev.deltaY > 0 ? 1.08 : 0.92), 60, 200000);
            state.camTouched = true;
            syncSourceUI();
            renderPreview();
            ev.preventDefault();
        });

        stage.addEventListener('click', function (ev) {
            var nub = ev.target.closest && ev.target.closest('.c3-nub');
            if (nub) {
                var pan = nub.getAttribute('data-pan'), zoom = nub.getAttribute('data-zoom');
                if (pan === 'u') state.cam.panY -= 14;
                else if (pan === 'd') state.cam.panY += 14;
                else if (pan === 'l') state.cam.panX -= 14;
                else if (pan === 'r') state.cam.panX += 14;
                else if (zoom === 'in') state.cam.dist = clamp(state.cam.dist * 0.9, 60, 200000);
                else if (zoom === 'out') state.cam.dist = clamp(state.cam.dist / 0.9, 60, 200000);
                else if (zoom === 'reset') resetView();
                if (zoom !== 'reset') state.camTouched = true;
                syncSourceUI();
                renderPreview();
                return;
            }
            if (ev.target.closest && ev.target.closest('.c3-eye')) {
                state.playing = !state.playing;
                el('car3d-play').innerHTML = iconEye(state.playing);
                if (state.playing) { state.lastT = 0; schedule(); }
            }
        });
    }

    






    function fitDistance(p, n) {
        var R = p.radius;
        var card = cardSize(p, state.comp.w);
        var zoom = compZoom();
        

        var margin = 1.0;

        



        var halfX, halfY;
        if (p.axis === 'x') {
            halfX = card[0] / 2;
            halfY = R + card[1] / 2;
        } else if (p.axis === 'fib') {
            halfX = R + card[0] / 2;
            halfY = R + card[1] / 2;
        } else {
            halfX = R + card[0] / 2;
            halfY = Math.abs(p.rise) * (n - 1) / 2 + card[1] / 2;
        }

        var wantW = halfX * zoom / (margin * state.comp.w / 2);
        var wantH = halfY * zoom / (margin * state.comp.h / 2);

        return R + Math.max(wantW, wantH, 1);
    }

    function resetView() {
        state.camTouched = false;
        var p = state.preset;
        if (!p) { state.cam = { pitch: -16, yaw: 0, panX: 0, panY: 0, dist: 2300 }; return; }
        state.cam = {
            pitch: p.view.pitch, yaw: p.view.yaw, panX: 0, panY: 0,
            dist: fitDistance(p, slotCount(p)) * (p.view.dist || 1)
        };
        syncSourceUI();
    }

    function chooseLook(preset) {
        state.preset = JSON.parse(JSON.stringify(preset));
        state.spin = 0;
        state._t = 0;
        resetView();
        state.detected = state.detected || [];
        var looks = document.querySelectorAll('#car3d-gallery .c3-look');
        for (var i = 0; i < looks.length; i++) {
            looks[i].classList.toggle('active', looks[i].getAttribute('data-key') === preset.key);
        }
        showBuilder();
    }

    
    function replay(node, cls) {
        if (!node) return;
        node.classList.remove(cls);
        void node.offsetWidth;
        node.classList.add(cls);
    }

    function showGallery() {
        state.view = 'gallery';
        stopLoop();
        var g = el('car3d-gallery-wrap');
        g.style.display = 'block';
        el('car3d-builder').style.display = 'none';
        el('car3d-build').style.display = 'none';
        
        var looks = g.querySelectorAll('.c3-look');
        for (var i = 0; i < looks.length; i++) {
            looks[i].style.animation = 'none';
            void looks[i].offsetWidth;
            looks[i].style.animation = '';
        }
    }

    function showBuilder() {
        state.view = 'builder';
        el('car3d-gallery-wrap').style.display = 'none';
        el('car3d-build').style.display = 'flex';
        var b = el('car3d-builder');
        b.style.display = 'flex';
        replay(b, 'entering');
        el('car3d-name').textContent = state.preset.name;
        el('car3d-ring').setAttribute('data-key', '');
        syncLoopUI();
        renderSlots();
        readComp(true);          
        renderPreview();
        state._t = 0;
        state.lastT = 0;
        schedule();
    }

    
    






    var DETECT_SCRIPT = '(function(){try{' +
        'var c=app.project.activeItem;' +
        'if(!c||!(c instanceof CompItem)) return "NONE";' +
        'var out=[];' +
        'for(var i=1;i<=c.numLayers;i++){' +
        '  var l=c.layer(i);' +
        '  try{' +
        '    if(l instanceof CameraLayer || l instanceof LightLayer) continue;' +
        '    if(l.nullLayer) continue;' +
        '    if(l.guideLayer) continue;' +
        '    if(!l.enabled) continue;' +
        '    if(l.hasVideo===false) continue;' +
        '    if(l.name.indexOf("SowveilCarousel")!==-1) continue;' +
        '    if(l.name.indexOf("Carousel Control")!==-1) continue;' +
        '    if(l.name.indexOf("Carousel Guide")===0) continue;' +
        '    if(l.name.indexOf("Orb Effector")===0) continue;' +
        '  }catch(le){ continue; }' +
        '  out.push(i+"\u0001"+l.name+"\u0001"+(l.selected?"1":"0"));' +
        '}' +
        'return c.width+"|"+c.height+"|"+c.duration+"|"+c.frameRate+"|"+out.join("\u0002");' +
        '}catch(e){return "NONE";}})()';

    function readComp(thenAdopt) {
        hostCall(DETECT_SCRIPT, function (res) {
            var found = [];
            if (!res || res === 'NONE') {
                state.comp = { w: 1080, h: 1920, label: '9:16', duration: 0 };
            } else {
                var p = res.split('|');
                var w = parseInt(p[0], 10) || 1080, h = parseInt(p[1], 10) || 1920;
                var g = (function gcd(a, b) { return b ? gcd(b, a % b) : a; })(w, h);
                state.comp = {
                    w: w, h: h, label: (w / g) + ':' + (h / g),
                    duration: parseFloat(p[2]) || 0
                };
                var rows = (p[4] || '').split('\u0002');
                for (var i = 0; i < rows.length; i++) {
                    if (!rows[i]) continue;
                    var f = rows[i].split('\u0001');
                    found.push({
                        kind: 'layer',
                        index: parseInt(f[0], 10),
                        name: f[1] || ('Layer ' + f[0]),
                        selected: f[2] === '1'
                    });
                }
            }
            state.detected = found;
            invalidateFrameBox();
            reflow();

            
            if (thenAdopt && state.source === 'timeline') {
                var picked = found.filter(function (l) { return l.selected; });
                adoptLayers(picked.length >= 2 ? picked : found);
            }

            var b = el('car3d-aspect');
            if (b) b.textContent = state.comp.label;
            syncSourceUI();
            var ring = el('car3d-ring');
            if (ring) ring.setAttribute('data-key', '');
            renderSlots();
            renderPreview();
        });
    }

    function adoptLayers(list) {
        state.slots = list.map(function (l) {
            return { kind: 'layer', index: l.index, name: l.name };
        });
        state.source = 'timeline';
        reflow();
    }

    

    function reflow() {
        scaleToComp();
        if (!state.camTouched) resetView();
        var ring = el('car3d-ring');
        if (ring) ring.setAttribute('data-key', '');
    }

    function syncLoopUI() {
        var io = el('car3d-io');
        if (io && io.parentNode) {
            io.parentNode.title = state.loop
                ? 'Turn Loop off to use an intro and outro' : '';
        }
        var styleRow = el('car3d-style');
        if (styleRow && styleRow.parentNode) {
            styleRow.parentNode.style.opacity = state.loop ? '.4' : '';
        }
    }

    function syncSourceUI() {
        var segEl = el('car3d-source');
        if (segEl) {
            var kids = segEl.children;
            for (var i = 0; i < kids.length; i++) {
                kids[i].classList.toggle('active', kids[i].getAttribute('data-v') === state.source);
            }
        }
        var cam = el('car3d-camnote');
        if (cam) cam.textContent = Math.round(state.cam.dist) + ' px';
    }

    

    






    function cameraRig() {
        var pit = state.cam.pitch * Math.PI / 180, yaw = state.cam.yaw * Math.PI / 180;
        var D = state.cam.dist;
        var cx = -D * Math.cos(pit) * Math.sin(yaw);
        var cy = D * Math.sin(pit);
        var cz = -D * Math.cos(pit) * Math.cos(yaw);   

        
        var right = [Math.cos(yaw), 0, -Math.sin(yaw)];
        var up = [Math.sin(pit) * Math.sin(yaw), Math.cos(pit), Math.sin(pit) * Math.cos(yaw)];
        var ox = -state.cam.panX * right[0] - state.cam.panY * up[0];
        var oy = -state.cam.panX * right[1] - state.cam.panY * up[1];
        var oz = -state.cam.panX * right[2] - state.cam.panY * up[2];

        return {
            zoom: compZoom(),
            pos: [cx + ox, cy + oy, cz + oz],
            poi: [ox, oy, oz]          
        };
    }

    function payload() {
        var p = state.preset, n = slotCount(p);
        return {
            preset: p.key, name: p.name,
            axis: p.axis, facing: p.facing,
            count: n, radius: p.radius, arc: p.arc,
            tiltX: p.tiltX, tiltY: p.tiltY, roll: p.roll, rise: p.rise,
            cardScale: p.cardScale,
            cardW: cardSize(p, state.comp.w)[0],
            source: state.source,
            media: state.slots.filter(function (s) { return s.kind !== 'layer'; })
                .map(function (s) { return { path: s.path, kind: s.kind }; }),
            
            layers: state.slots.filter(function (s) { return s.kind === 'layer'; })
                .map(function (s) { return s.index; }),
            duration: state.duration, turns: state.turns, direction: state.direction,
            loop: state.loop, stepped: state.stepped, depthBlur: state.depthBlur,
            introOutro: state.introOutro && !state.loop, style: state.style,
            camera: cameraRig(),
            swatches: swatches().map(function (c) { return c[0].replace('#', ''); })
        };
    }

    function buildToComp() {
        var btn = el('car3d-build');
        if (btn) { btn.textContent = 'BUILDING…'; btn.style.pointerEvents = 'none'; }

        


        var call = '$._svA.buildCarousel3D(' + JSON.stringify(JSON.stringify(payload())) + ')';
        hostCall(call, function (res) {
            if (btn) { btn.textContent = 'ADD TO COMP'; btn.style.pointerEvents = ''; }
            if (res && res.indexOf('OK:') === 0) {
                notify('3D Carousel built — ' + res.substring(3), 'success');
                try { if (typeof window.closeModal === 'function') window.closeModal('carousel-modal'); } catch (e) { }
                return;
            }
            if (!res || res === 'undefined' || res.indexOf('EvalScript') !== -1 || res.indexOf('is not a function') !== -1) {
                notify('Sowveil host not loaded — restart After Effects.', 'error');
                return;
            }
            notify(String(res).replace(/^ERR:/, ''), 'error');
        });
    }


    

    function mount() {
        var host = el('car-view-carousel3d');
        if (!host || state.mounted) return !!host;
        injectCSS();
        host.innerHTML = '';
        var root = document.createElement('div');
        root.id = 'car3d-root';
        host.appendChild(root);

        var gal = buildGallery(root);
        gal.id = 'car3d-gallery-wrap';
        buildBuilder(root);

        

        var build = document.createElement('div');
        build.id = 'car3d-build';
        build.textContent = 'ADD TO COMP';
        build.style.display = 'none';
        build.addEventListener('click', buildToComp);
        host.appendChild(build);

        state.mounted = true;
        return true;
    }

    window.SowveilCarousel3D = {
        activate: function () {
            if (!mount()) return;
            SWATCHES = null;              
            var ring = el('car3d-ring');
            if (ring) ring.setAttribute('data-key', '');
            if (state.view === 'builder') { readComp(true); state.lastT = 0; schedule(); }
        },
        deactivate: stopLoop,
        _state: state
    };

    



    function watchModal() {
        var modal = el('carousel-modal');
        if (!modal || !window.MutationObserver) return;
        new MutationObserver(function () {
            if (!modal.classList.contains('active')) stopLoop();
            else if (state.view === 'builder') { state.lastT = 0; schedule(); }
        }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchModal);
    else watchModal();
})();
