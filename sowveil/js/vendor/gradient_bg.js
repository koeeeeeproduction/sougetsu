/* Synced from client/js_akira/akira_gradient_bg.js by tools/sync_sowveil_engines.py */






















(function () {
    'use strict';

    var VERSION = '1.0.0';

    function byId(id) { return document.getElementById(id); }

    function getCS() {
        try {
            if (window.csInterface && window.csInterface.evalScript) return window.csInterface;
            if (window.CSInterface) return new window.CSInterface();
        } catch (e) { }
        return null;
    }

    function toast(msg, type) {
        try { if (typeof window.showStatus === 'function') { window.showStatus(msg, type || 'success'); return; } } catch (e) { }
        try { console.log('[gradient-bg] ' + msg); } catch (e2) { }
    }

    function hostCall(script, cb) {
        var cs = getCS();
        if (!cs) { toast('After Effects link unavailable.', 'error'); return; }
        cs.evalScript(script, function (res) { if (cb) cb(res); });
    }

    





    function livePalettes() {
        var out = [];
        var overrides = {}, customs = [];
        try { overrides = JSON.parse(localStorage.getItem('akira_saas_palette_overrides') || '{}'); } catch (e) { }
        try { customs = JSON.parse(localStorage.getItem('akira_saas_custom_palettes') || '[]'); } catch (e) { }

        function hexes(raw, keyPrefix) {
            var c = [];
            for (var k = 0; k < 4; k++) {
                var v = overrides[keyPrefix + '_' + k] || raw[k] || '000000';
                c.push('#' + String(v).replace('#', ''));
            }
            return c;
        }

        
        for (var i = 0; i < customs.length; i++) {
            out.push({ label: 'CUSTOM ' + (i + 1), colors: hexes(customs[i], 'custom_' + i) });
        }

        var base = [];
        try { base = window.colorPalettes || []; } catch (e) { }
        if (!base.length) {
            base = [
                { label: 'DEEP NAVY', colors: ['#050B14', '#0A192F', '#112240', '#233554'] },
                { label: 'ELECTRIC PURPLE', colors: ['#1E053A', '#3A0CA3', '#4361EE', '#4CC9F0'] },
                { label: 'VIBRANT GREEN', colors: ['#00A344', '#00C652', '#33D675', '#66E598'] },
                { label: 'WARM ORANGE', colors: ['#E63946', '#F07167', '#FFB703', '#FB8500'] }
            ];
        }
        for (var b = 0; b < base.length; b++) {
            var raw = [];
            for (var q = 0; q < base[b].colors.length; q++) {
                raw.push(String(base[b].colors[q]).replace('#', '').toLowerCase());
            }
            out.push({ label: base[b].label || ('PALETTE ' + (b + 1)), colors: hexes(raw, String(b)) });
        }
        return out;
    }

    



    var ORBITS = [
        { cx: 0.22, cy: 0.24, rx: 0.20, ry: 0.14, phase: 0.00, dir: 1 },
        { cx: 0.78, cy: 0.26, rx: 0.17, ry: 0.19, phase: 0.35, dir: -1 },
        { cx: 0.24, cy: 0.76, rx: 0.19, ry: 0.16, phase: 0.62, dir: -1 },
        { cx: 0.76, cy: 0.74, rx: 0.16, ry: 0.20, phase: 0.85, dir: 1 }
    ];

    function orbitAt(i, p) {
        var o = ORBITS[i % ORBITS.length];
        var a = (p * o.dir + o.phase) * Math.PI * 2;
        return [o.cx + Math.cos(a) * o.rx, o.cy + Math.sin(a) * o.ry];
    }

    var STEPS = 8;          

    



    function buildScript(colors, opts) {
        var o = opts || {};
        return '(function(){try{' +
            'var C=' + JSON.stringify(colors) + ';' +
            'var ORB=' + JSON.stringify(ORBITS) + ';' +
            'var STEPS=' + STEPS + ';' +
            'var NEWLAYER=' + (o.newLayer ? 'true' : 'false') + ';' +
            'var BLEND=' + (parseFloat(o.blend) || 120) + ';' +

            'var comp=app.project.activeItem;' +
            'if(!comp||!(comp instanceof CompItem)) return "ERR|Open a composition first.";' +

            'function rgb(h){ h=String(h).replace("#","");' +
            ' return [parseInt(h.substr(0,2),16)/255,parseInt(h.substr(2,2),16)/255,' +
            ' parseInt(h.substr(4,2),16)/255]; }' +

            
            'var sel=comp.selectedLayers;' +
            'var target=null, t0=0, dur=comp.duration;' +
            'if(!NEWLAYER && sel && sel.length===1){' +
            '  target=sel[0]; t0=Math.max(0,target.inPoint);' +
            '  var span=target.outPoint-target.inPoint;' +
            '  if(span>0.01) dur=span;' +
            '}' +

            'app.beginUndoGroup("Sowveil Animated Gradient");' +
            'try{' +
            'if(!target){' +
            '  target=comp.layers.addSolid([0,0,0],"Gradient BG",comp.width,comp.height,comp.pixelAspect,comp.duration);' +
            '  target.moveToEnd();' +          
            '  target.label=8;' +
            '  t0=0; dur=comp.duration;' +
            '}' +

            'var fx=target.property("ADBE Effect Parade");' +
            'if(!fx) { app.endUndoGroup(); return "ERR|That layer cannot take effects."; }' +
            'var g=fx.addProperty("ADBE 4ColorGradient");' +
            'if(!g) { app.endUndoGroup(); return "ERR|4-Color Gradient is unavailable."; }' +

            

            'for(var i=0;i<4;i++){' +
            '  var cp=g.property("Color "+(i+1)) || g.property((i*2)+2);' +
            '  if(cp) cp.setValue(rgb(C[i%C.length]));' +
            '}' +

            'var W=comp.width, H=comp.height;' +
            'for(var i=0;i<4;i++){' +
            '  var pp=g.property("Point "+(i+1)) || g.property((i*2)+1);' +
            '  if(!pp) continue;' +
            '  var o=ORB[i];' +
            
            '  for(var s=0;s<=STEPS;s++){' +
            '    var ph=s/STEPS;' +
            '    var a=(ph*o.dir+o.phase)*Math.PI*2;' +
            '    var x=(o.cx+Math.cos(a)*o.rx)*W;' +
            '    var y=(o.cy+Math.sin(a)*o.ry)*H;' +
            '    pp.setValueAtTime(t0+dur*ph,[x,y]);' +
            '  }' +
            
            '  try{' +
            '    for(var k=1;k<=pp.numKeys;k++){' +
            '      pp.setInterpolationTypeAtKey(k,KeyframeInterpolationType.BEZIER,KeyframeInterpolationType.BEZIER);' +
            '    }' +
            '  }catch(eK){}' +
            '}' +

            'try{ var bl=g.property("Blend")||g.property(9); if(bl) bl.setValue(BLEND); }catch(eB){}' +
            'try{ var jt=g.property("Jitter")||g.property(10); if(jt) jt.setValue(0); }catch(eJ){}' +

            '}catch(inner){ app.endUndoGroup(); return "ERR|"+inner.toString(); }' +
            'app.endUndoGroup();' +
            'return "OK|"+Math.round(dur*100)/100+"|"+target.name;' +
            '}catch(e){return "ERR|"+e.toString();}})()';
    }

    




    var state = { newLayer: false, active: false };

    function injectCSS() {
        if (byId('akira-gradbg-css')) return;
        var st = document.createElement('style');
        st.id = 'akira-gradbg-css';
        st.textContent =
            '#fgb-view{display:none;}' +
            '#view-colors.fgb-anim-on #custom-color-section ~ *{display:none !important;}' +
            '#fgb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));' +
            'gap:7px;margin-bottom:10px;}' +
            '.fgb-card{position:relative;border:1px solid rgba(255,255,255,.08);border-radius:7px;' +
            'overflow:hidden;cursor:pointer;background:#0b0b0b;' +
            'transition:border-color .18s,transform .18s;}' +
            '.fgb-card:hover{border-color:var(--primary);transform:translateY(-1px);}' +
            '.fgb-sw{position:relative;height:46px;overflow:hidden;}' +
            
            '.fgb-blob{position:absolute;width:130%;height:130%;left:-15%;top:-15%;' +
            'border-radius:50%;filter:blur(11px);opacity:.85;' +
            'animation:fgbDrift 9s ease-in-out infinite;}' +
            '@keyframes fgbDrift{' +
            '0%{transform:translate(0,0) scale(1);}' +
            '25%{transform:translate(14%,-10%) scale(1.1);}' +
            '50%{transform:translate(-9%,12%) scale(.95);}' +
            '75%{transform:translate(-13%,-7%) scale(1.06);}' +
            '100%{transform:translate(0,0) scale(1);}}' +
            '.fgb-name{padding:4px 5px;font-size:6.5px;font-weight:850;letter-spacing:.4px;' +
            'color:#8a8a8a;text-transform:uppercase;white-space:nowrap;overflow:hidden;' +
            'text-overflow:ellipsis;}' +
            '.fgb-card:hover .fgb-name{color:var(--primary);}' +
            '#fgb-view .fgb-opts{display:flex;align-items:center;gap:6px;margin-bottom:8px;}' +
            '#fgb-view .fgb-chk{width:13px;height:13px;flex:none;border-radius:3px;cursor:pointer;' +
            'border:1px solid rgba(255,255,255,.22);background:#0d0d0d;display:flex;' +
            'align-items:center;justify-content:center;font-size:9px;color:transparent;}' +
            '#fgb-view .fgb-chk.on{background:var(--primary);border-color:var(--primary);color:#000;}' +
            '#fgb-view .fgb-opts label{font-size:8.5px;color:#999;cursor:pointer;}' +
            '#fgb-hint{font-size:7px;color:#666;margin-bottom:8px;line-height:1.35;}' +
            '@media (prefers-reduced-motion: reduce){.fgb-blob{animation:none;}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function cardHtml(p, idx) {
        var c = p.colors;
        var pos = [['0%', '0%'], ['40%', '-10%'], ['-10%', '40%'], ['35%', '38%']];
        var blobs = '';
        for (var i = 0; i < 4; i++) {
            blobs += '<div class="fgb-blob" style="background:' + c[i % c.length] +
                ';left:' + pos[i][0] + ';top:' + pos[i][1] +
                ';animation-delay:' + (-i * 1.7).toFixed(1) + 's;"></div>';
        }
        return '<div class="fgb-card" data-idx="' + idx + '" title="' + p.label + '">' +
            '<div class="fgb-sw" style="background:' + c[0] + '">' + blobs + '</div>' +
            '<div class="fgb-name">' + p.label + '</div></div>';
    }

    function renderGrid() {
        var grid = byId('fgb-grid');
        if (!grid) return;
        var list = livePalettes();
        var html = '';
        for (var i = 0; i < list.length; i++) html += cardHtml(list[i], i);
        grid.innerHTML = html;
    }

    



    











    function libraryVisible(show) {
        var host = byId('view-colors');
        if (host) host.classList.toggle('fgb-anim-on', !show);
    }

    function setActive(on) {
        state.active = on;
        var view = byId('fgb-view');
        if (view) view.style.display = on ? 'block' : 'none';
        libraryVisible(!on);

        var btn = byId('btn-mode-anim');
        if (btn) {
            btn.style.background = on ? 'var(--primary)' : 'rgba(255,255,255,0.02)';
            btn.style.color = on ? 'var(--accent-text-color, #000)' : '#666';
            btn.style.fontWeight = on ? 'bold' : 'normal';
        }
        if (on) renderGrid();          
    }

    function enterAnimated() {
        
        try {
            if (typeof window.setCustomMode === 'function') window.__fgbSilent = true;
            if (typeof window.setCustomMode === 'function') window.setCustomMode('solid');
        } catch (e) { }
        window.__fgbSilent = false;

        var solid = byId('custom-solid-inputs'), grad = byId('custom-gradient-creator');
        if (solid) solid.style.display = 'none';
        if (grad) grad.style.display = 'none';
        ['btn-mode-solid', 'btn-mode-grad'].forEach(function (id) {
            var b = byId(id);
            if (b) { b.style.background = 'rgba(255,255,255,0.02)'; b.style.color = '#666'; b.style.fontWeight = 'normal'; }
        });
        var ai = byId('ai-magic-section');
        if (ai) ai.style.display = 'none';
        setActive(true);
    }

    function hookModes() {
        if (window.__fgbHooked) return;
        ['setCustomMode', 'toggleAIMode'].forEach(function (fn) {
            var orig = window[fn];
            if (typeof orig !== 'function') return;
            window[fn] = function () {
                var r = orig.apply(this, arguments);
                if (!window.__fgbSilent) setActive(false);
                return r;
            };
        });
        window.__fgbHooked = true;
    }

    function build() {
        if (byId('fgb-view')) return true;
        var section = byId('custom-color-section');
        var gradBtn = byId('btn-mode-grad');
        if (!section || !gradBtn || !gradBtn.parentNode) return false;

        
        var btn = document.createElement('div');
        btn.className = 'a-btn';
        btn.id = 'btn-mode-anim';
        btn.setAttribute('data-tooltip', 'Animated gradient background');
        btn.style.cssText = 'padding:0 6px; aspect-ratio: auto !important;' +
            'background:rgba(255,255,255,0.02); color:#666;';
        btn.textContent = 'ANIM';
        btn.addEventListener('click', enterAnimated);
        gradBtn.parentNode.appendChild(btn);

        var view = document.createElement('div');
        view.id = 'fgb-view';
        view.innerHTML =
            '<div id="fgb-hint">Click a palette to build an animated 4-colour gradient with real ' +
            'keyframes. With one layer selected it goes on that layer and takes its duration; ' +
            'otherwise a full-comp background is created.</div>' +
            '<div class="fgb-opts">' +
            '  <div class="fgb-chk" id="fgb-new">&#10003;</div>' +
            '  <label for="fgb-new">Always make a new background layer</label>' +
            '</div>' +
            '<div id="fgb-grid"></div>';
        section.insertBefore(view, section.firstChild);

        byId('fgb-new').addEventListener('click', function () {
            state.newLayer = !state.newLayer;
            this.classList.toggle('on', state.newLayer);
        });
        byId('fgb-grid').addEventListener('click', function (e) {
            var card = e.target.closest ? e.target.closest('.fgb-card') : null;
            if (!card) return;
            var p = livePalettes()[parseInt(card.getAttribute('data-idx'), 10)];
            if (p) apply(p);
        });

        hookModes();
        renderGrid();
        return true;
    }

    function apply(p) {
        hostCall(buildScript(p.colors, { newLayer: state.newLayer }), function (res) {
            var s = String(res == null ? '' : res);
            if (s.indexOf('ERR|') === 0) { toast(s.slice(4), 'error'); return; }
            if (s.indexOf('OK|') === 0) {
                var bits = s.split('|');
                toast(p.label + ' gradient built over ' + bits[1] + 's on "' + bits[2] + '".', 'success');
                return;
            }
            toast(s || 'Gradient could not be built.', 'error');
        });
    }

    function boot() {
        injectCSS();
        if (build()) return;
        var tries = 0;
        var timer = setInterval(function () {
            if (build() || ++tries > 20) clearInterval(timer);
        }, 400);
    }

    window.SowveilGradientBG = {
        version: VERSION,
        buildScript: buildScript,
        livePalettes: livePalettes,
        orbitAt: orbitAt,
        steps: STEPS,
        orbits: ORBITS
    };

    if (document.readyState === 'complete') setTimeout(boot, 0);
    else window.addEventListener('load', function () { setTimeout(boot, 0); });

})();
