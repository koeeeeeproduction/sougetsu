

















function w2aTrim(s) {
    return String(s == null ? '' : s).replace(/^\s+/, '').replace(/\s+$/, '');
}

function w2aClamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return n < lo ? lo : (n > hi ? hi : n);
}



function w2aNum(n, fallback) {
    n = Number(n);
    return isFinite(n) ? n : (fallback || 0);
}

function w2aColor(hex, fallback) {
    var s = String(hex == null ? '' : hex);
    if (s.charAt(0) === '#') s = s.substring(1);
    if (s.length === 3) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    if (s.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(s)) return fallback || [0, 0, 0];
    return [
        parseInt(s.substring(0, 2), 16) / 255,
        parseInt(s.substring(2, 4), 16) / 255,
        parseInt(s.substring(4, 6), 16) / 255
    ];
}

function w2aSafeName(s, max) {
    s = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ');
    s = w2aTrim(s);
    if (!s) s = 'Layer';
    max = max || 60;
    return s.length > max ? s.substring(0, max - 1) + '...' : s;
}



var W2A_FONT_CACHE = {};
var W2A_FONT_MISSING = {};









var W2A_GENERIC = {
    'sans-serif': ['Helvetica Neue', 'Helvetica', 'Arial', 'Segoe UI', 'Roboto'],
    'system-ui': ['SF Pro Text', 'Helvetica Neue', 'Segoe UI', 'Helvetica', 'Arial'],
    'ui-sans-serif': ['Helvetica Neue', 'Helvetica', 'Arial'],
    '-apple-system': ['SF Pro Text', 'Helvetica Neue', 'Helvetica'],
    'blinkmacsystemfont': ['SF Pro Text', 'Helvetica Neue', 'Helvetica'],
    'serif': ['Times New Roman', 'Georgia', 'Times'],
    'ui-serif': ['Times New Roman', 'Georgia'],
    'monospace': ['Menlo', 'Courier New', 'Consolas', 'Monaco'],
    'ui-monospace': ['Menlo', 'Courier New', 'Consolas'],
    'cursive': ['Apple Chancery', 'Comic Sans MS'],
    'fantasy': ['Papyrus', 'Impact']
};

function w2aFamilyCandidates(family) {
    var generic = W2A_GENERIC[String(family).toLowerCase()];
    if (!generic) return [family];
    var out = [];
    for (var i = 0; i < generic.length; i++) out[out.length] = generic[i];
    return out;
}

function w2aResolveFont(family, style, weight, italic, override) {
    var key = family + '|' + weight + '|' + (italic ? 'i' : 'n');
    if (override) return override;
    if (W2A_FONT_CACHE[key] !== undefined) return W2A_FONT_CACHE[key];

    
    var cands = w2aFamilyCandidates(family);
    if (cands.length > 1 || cands[0] !== family) {
        for (var c = 0; c < cands.length; c++) {
            var hit = w2aExactFont(cands[c], style, weight, italic);
            if (hit) { W2A_FONT_CACHE[key] = hit; return hit; }
        }
        
        family = cands[0];
    }

    var found = w2aExactFont(family, style, weight, italic);
    if (found) { W2A_FONT_CACHE[key] = found; return found; }

    
    var compact = String(family).replace(/\s+/g, '');
    var guess = weight >= 600 ? compact + '-Bold' : compact + '-Regular';
    if (italic) guess = weight >= 600 ? compact + '-BoldItalic' : compact + '-Italic';
    W2A_FONT_MISSING[family + ' ' + style] = true;
    W2A_FONT_CACHE[key] = guess;
    return guess;
}



function w2aExactFont(family, style, weight, italic) {
    var found = '';

    
    try {
        if (app.fonts && app.fonts.getFontsByFamilyNameAndStyleName) {
            var list = app.fonts.getFontsByFamilyNameAndStyleName(family, style);
            if (list && list.length) found = list[0].postScriptName;
        }
    } catch (e) { }

    
    if (!found) {
        try {
            if (app.fonts && app.fonts.allFonts) {
                var all = app.fonts.allFonts;
                var famLower = String(family).toLowerCase();
                var best = null, bestScore = -1;
                for (var i = 0; i < all.length; i++) {
                    var f = all[i];
                    var fam = String(f.familyName || '').toLowerCase();
                    if (fam !== famLower) continue;
                    var st = String(f.styleName || '').toLowerCase();
                    var score = 0;
                    if (st === String(style).toLowerCase()) score = 100;
                    else {
                        if (weight >= 600 && /bold|black|heavy|semibold/.test(st)) score += 40;
                        if (weight <= 300 && /light|thin/.test(st)) score += 40;
                        if (weight > 300 && weight < 600 && /regular|book|medium|normal/.test(st)) score += 40;
                        if (italic && /italic|oblique/.test(st)) score += 25;
                        if (!italic && !/italic|oblique/.test(st)) score += 15;
                    }
                    if (score > bestScore) { bestScore = score; best = f; }
                }
                if (best) found = best.postScriptName;
            }
        } catch (e2) { }
    }

    return found;
}





function flexWeb2AE_checkFonts(specJson) {
    try {
        var spec = eval('(' + specJson + ')');
        W2A_FONT_CACHE = {};
        W2A_FONT_MISSING = {};
        var out = [];
        for (var i = 0; i < spec.length; i++) {
            var s = spec[i];
            var before = 0, k;
            for (k in W2A_FONT_MISSING) { if (W2A_FONT_MISSING.hasOwnProperty(k)) before++; }
            var ps = w2aResolveFont(s.family, s.style, s.weight, s.italic, '');
            var after = 0;
            for (k in W2A_FONT_MISSING) { if (W2A_FONT_MISSING.hasOwnProperty(k)) after++; }
            out[out.length] = s.family + '\t' + s.style + '\t' + ps + '\t' + (after > before ? '0' : '1');
        }
        W2A_FONT_CACHE = {};
        W2A_FONT_MISSING = {};
        return 'OK|' + out.join('\n');
    } catch (e) {
        return 'ERR|' + e.toString();
    }
}


function flexWeb2AE_fontList() {
    try {
        var seen = {}, out = [];
        if (app.fonts && app.fonts.allFonts) {
            var all = app.fonts.allFonts;
            for (var i = 0; i < all.length; i++) {
                var fam = String(all[i].familyName || '');
                if (!fam || seen[fam]) continue;
                seen[fam] = 1;
                out[out.length] = fam + '\t' + all[i].postScriptName;
            }
        }
        out.sort();
        return 'OK|' + out.join('\n');
    } catch (e) {
        return 'ERR|' + e.toString();
    }
}





function w2aAlive(lyr) {
    if (!lyr) return false;
    try {
        return lyr.index > 0;
    } catch (e) {
        return false;
    }
}



var W2A_K = 0.5522847498307936;   




function w2aRoundRectShape(w, h, r) {
    var tl = w2aClamp(r && r[0], 0, 1e6), tr = w2aClamp(r && r[1], 0, 1e6);
    var br = w2aClamp(r && r[2], 0, 1e6), bl = w2aClamp(r && r[3], 0, 1e6);
    var hw = w / 2, hh = h / 2;

    var lim = Math.min(hw, hh);
    if (tl > lim) tl = lim; if (tr > lim) tr = lim;
    if (br > lim) br = lim; if (bl > lim) bl = lim;

    var v = [], i = [], o = [];

    function add(px, py, inT, outT) {
        v[v.length] = [px, py];
        i[i.length] = inT || [0, 0];
        o[o.length] = outT || [0, 0];
    }

    
    if (tl > 0) add(-hw + tl, -hh, [-tl * W2A_K, 0], [0, 0]);
    else add(-hw, -hh, [0, 0], [0, 0]);

    if (tr > 0) {
        add(hw - tr, -hh, [0, 0], [tr * W2A_K, 0]);
        add(hw, -hh + tr, [0, -tr * W2A_K], [0, 0]);
    } else add(hw, -hh, [0, 0], [0, 0]);

    if (br > 0) {
        add(hw, hh - br, [0, 0], [0, br * W2A_K]);
        add(hw - br, hh, [br * W2A_K, 0], [0, 0]);
    } else add(hw, hh, [0, 0], [0, 0]);

    if (bl > 0) {
        add(-hw + bl, hh, [0, 0], [-bl * W2A_K, 0]);
        add(-hw, hh - bl, [0, bl * W2A_K], [0, 0]);
    } else add(-hw, hh, [0, 0], [0, 0]);

    if (tl > 0) add(-hw, -hh + tl, [0, 0], [0, -tl * W2A_K]);

    var sh = new Shape();
    sh.vertices = v;
    sh.inTangents = i;
    sh.outTangents = o;
    sh.closed = true;
    return sh;
}



function flexWeb2AE_build(jobPath) {
    var opened = false;
    

    var stage = 'start';
    try {
        stage = 'reading the job file';
        var jf = new File(jobPath);
        if (!jf.exists) return 'ERR|job file missing at ' + jobPath;
        jf.encoding = 'UTF-8';
        jf.open('r');
        var raw = jf.read();
        jf.close();
        if (!raw) return 'ERR|the job file was empty';

        stage = 'parsing the job file (' + raw.length + ' chars)';
        var job = eval('(' + raw + ')');
        if (!job || !job.nodes || !job.nodes.length) return 'ERR|the capture had no layers';

        var S = w2aNum(job.scale, 1) || 1;
        var compW = Math.max(4, Math.round(w2aNum(job.width, 1920) * S));
        var compH = Math.max(4, Math.round(w2aNum(job.height, 1080) * S));
        var fps = w2aNum(job.fps, 30) || 30;
        var dur = Math.max(1, w2aNum(job.duration, 10));

        


        if (compW > 30000 || compH > 30000) {
            return 'ERR|the comp would be ' + compW + ' x ' + compH +
                ', over After Effects\' 30000px limit. Lower Size, or capture the viewport instead of the full page.';
        }

        app.beginUndoGroup('Akira Web To AE');
        opened = true;

        var comp = null;
        if (job.useActiveComp) {
            comp = app.project.activeItem;
            if (comp && comp instanceof CompItem) {
                compW = comp.width;
                compH = comp.height;
                S = compW / w2aNum(job.width, 1920);
                stage = 'using the active composition ' + compW + 'x' + compH;
            } else {
                comp = null;
            }
        }

        if (!comp) {
            stage = 'creating the composition ' + compW + 'x' + compH;
            comp = app.project.items.addComp(w2aSafeName(job.name || 'Web To AE', 80), compW, compH, 1, dur, fps);
        }

        if (!comp) { app.endUndoGroup(); return 'ERR|After Effects did not create or locate the composition'; }
        try { comp.openInViewer(); } catch (e) { }

        var built = {};          
        var worldOf = {};        
        var made = 0, skipped = 0, imported = 0, svgShapes = 0, failedSvg = 0;
        var warn = [];

        





        stage = 'building layers';
        var nodes = job.nodes;
        for (var n = 0; n < nodes.length; n++) {
            var nd = nodes[n];
            var lyr = null;
            stage = 'layer ' + (n + 1) + ' of ' + nodes.length + ' (' + nd.kind + ' "' + (nd.name || '') + '")';
            try {
                if (nd.kind === 'text') lyr = w2aBuildText(comp, nd, job, S);
                else if (nd.kind === 'shape') lyr = w2aBuildShape(comp, nd, job, S);
                else if (nd.kind === 'image' || nd.kind === 'svg') {
                    lyr = w2aBuildImage(comp, nd, job, S);
                    if (lyr) {
                        imported++;
                        if (nd.kind === 'svg' && job.svgToShapes) {
                            var conv = w2aVectorToShapes(comp, lyr);
                            if (conv) { lyr = conv; svgShapes++; }
                            


                            else if (!w2aAlive(lyr)) { lyr = null; failedSvg++; }
                        }
                    }
                }
            } catch (e) {
                warn[warn.length] = (nd.name || nd.kind) + ': ' + e.toString();
                lyr = null;
            }

            

            if (!w2aAlive(lyr)) { skipped++; continue; }

            built[nd.id] = lyr;
            made++;
        }

        

        stage = 'background plate';
        if (job.plate) {
            try {
                var bg = comp.layers.addSolid(w2aColor(job.bg, [1, 1, 1]), 'Page Background', compW, compH, 1);
                bg.moveToEnd();
                bg.locked = true;
                bg.label = 12;
            } catch (e) { }
        }

        


        if (job.grouping && job.grouping !== 'none') {
            stage = 'grouping (' + job.grouping + ')';
            w2aApplyGrouping(comp, job, built, worldOf, S);
        }

        if (job.anim && job.anim.on) {
            stage = 'animation';
            w2aAnimate(comp, job, built, nodes, S);
        }

        app.endUndoGroup();
        opened = false;

        var missing = [];
        for (var k in W2A_FONT_MISSING) { if (W2A_FONT_MISSING.hasOwnProperty(k)) missing[missing.length] = k; }

        var msg = 'Built ' + made + ' layers';
        if (skipped) msg += ', skipped ' + skipped;
        if (svgShapes) msg += ', ' + svgShapes + ' SVG to shapes';
        if (failedSvg) msg += ' (' + failedSvg + ' SVG had no outlinable content)';
        if (missing.length) msg += ' | fonts not installed: ' + missing.slice(0, 4).join(', ') +
            (missing.length > 4 ? ' +' + (missing.length - 4) : '');
        return 'OK|' + msg;

    } catch (err) {
        if (opened) { try { app.endUndoGroup(); } catch (e2) { } }
        return 'ERR|' + err.toString() +
            (err.line ? ' [host line ' + err.line + ']' : '') +
            ' -- failed while: ' + stage;
    }
}



function w2aBuildText(comp, nd, job, S) {
    var f = nd.font || {};
    var str = String(nd.text == null ? '' : nd.text);
    if (!w2aTrim(str)) return null;

    



    var wrap = !!job.wrapText && nd.boxw > 0 && nd.lines > 1;

    var lyr;
    if (wrap) {
        lyr = comp.layers.addBoxText([Math.max(8, w2aNum(nd.boxw, 200) * S), Math.max(8, w2aNum(nd.th, 40) * S)]);
    } else {
        lyr = comp.layers.addText(str);
    }

    var prop = lyr.property('Source Text');
    var td = prop.value;
    td.text = str;

    var size = Math.max(0.5, w2aNum(f.size, 16) * S);
    td.fontSize = size;
    td.applyFill = true;
    td.fillColor = w2aColor(f.color, [0, 0, 0]);
    try { td.applyStroke = false; } catch (e) { }

    var ps = w2aResolveFont(f.family || 'Arial', f.style || 'Regular', w2aNum(f.weight, 400), !!f.italic,
        job.fontMap ? job.fontMap[(f.family || '') + '|' + w2aNum(f.weight, 400)] : '');
    try { td.font = ps; } catch (e) { }

    try { td.tracking = w2aNum(f.tracking, 0); } catch (e) { }
    try {
        td.autoLeading = false;
        td.leading = Math.max(0.1, w2aNum(f.lineHeight, f.size * 1.2) * S);
    } catch (e) { }

    try {
        if (f.align === 'center') td.justification = ParagraphJustification.CENTER_JUSTIFY;
        else if (f.align === 'right') td.justification = ParagraphJustification.RIGHT_JUSTIFY;
        else if (f.align === 'justify') td.justification = ParagraphJustification.FULL_JUSTIFY_LASTLINE_LEFT;
        else td.justification = ParagraphJustification.LEFT_JUSTIFY;
    } catch (e) { }

    prop.setValue(td);
    lyr.name = w2aSafeName(nd.name || str);
    lyr.label = 8;

    



    var px, py;
    if (wrap) {
        var r = lyr.sourceRectAtTime(0, false);
        lyr.property('Anchor Point').setValue([r.left + r.width / 2, r.top]);
        px = (w2aNum(nd.tx, 0) + w2aNum(nd.boxw, nd.tw) / 2) * S;
        py = w2aNum(nd.ty, 0) * S;
    } else {
        lyr.property('Anchor Point').setValue([0, 0]);
        px = w2aNum(nd.bx, nd.tx) * S;
        py = w2aNum(nd.by, nd.ty + (f.size || 16) * 0.8) * S;
    }
    lyr.property('Position').setValue([px, py]);

    w2aCommonTransform(lyr, nd, S);
    return lyr;
}



function w2aBuildShape(comp, nd, job, S) {
    var w = w2aNum(nd.w, 0) * S, h = w2aNum(nd.h, 0) * S;
    if (w < 0.5 || h < 0.5) return null;

    var radius = [0, 0, 0, 0];
    if (nd.radius && nd.radius.length === 4) {
        for (var i = 0; i < 4; i++) radius[i] = w2aNum(nd.radius[i], 0) * S;
    }

    




    if (nd.gradient && nd.gradient.stops && nd.gradient.stops.length >= 2 && !job.flatGradients) {
        return w2aBuildGradient(comp, nd, job, S, w, h, radius);
    }

    var lyr = comp.layers.addShape();
    lyr.name = w2aSafeName(nd.name || 'Shape');
    lyr.label = 9;

    var contents = lyr.property('Contents');
    var grp = contents.addProperty('ADBE Vector Group');
    grp.name = 'Rect';
    var gc = grp.property('Contents');

    var pathProp = gc.addProperty('ADBE Vector Shape - Group');
    pathProp.property('Path').setValue(w2aRoundRectShape(w, h, radius));

    if (nd.fill && w2aNum(nd.fillAlpha, 0) > 0) {
        var fill = gc.addProperty('ADBE Vector Graphic - Fill');
        fill.property('Color').setValue(w2aColor(nd.fill, [0, 0, 0]));
        fill.property('Opacity').setValue(w2aClamp(w2aNum(nd.fillAlpha, 1) * 100, 0, 100));
    }

    if (nd.stroke && w2aNum(nd.stroke.width, 0) > 0) {
        var st = gc.addProperty('ADBE Vector Graphic - Stroke');
        st.property('Color').setValue(w2aColor(nd.stroke.color, [0, 0, 0]));
        st.property('Stroke Width').setValue(Math.max(0.1, w2aNum(nd.stroke.width, 1) * S));
        try { st.property('Opacity').setValue(w2aClamp(w2aNum(nd.stroke.alpha, 1) * 100, 0, 100)); } catch (e) { }
        if (!nd.stroke.uniform) {
            

            try { st.property('Opacity').setValue(w2aClamp(w2aNum(nd.stroke.alpha, 1) * 100, 0, 100)); } catch (e) { }
        }
    }

    lyr.property('Anchor Point').setValue([0, 0]);
    lyr.property('Position').setValue([
        (w2aNum(nd.x, 0) + w2aNum(nd.w, 0) / 2) * S,
        (w2aNum(nd.y, 0) + w2aNum(nd.h, 0) / 2) * S
    ]);

    if (nd.shadow) w2aDropShadow(lyr, nd.shadow, S);
    w2aCommonTransform(lyr, nd, S);
    return lyr;
}

function w2aBuildGradient(comp, nd, job, S, w, h, radius) {
    var g = nd.gradient;
    var first = g.stops[0], last = g.stops[g.stops.length - 1];

    var lyr = comp.layers.addSolid(w2aColor(first.c, [0, 0, 0]),
        w2aSafeName(nd.name || 'Gradient'), Math.max(4, Math.round(w)), Math.max(4, Math.round(h)), 1);
    lyr.label = 10;

    
    try {
        var mg = lyr.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        var sh = w2aRoundRectShape(w, h, radius);
        
        for (var i = 0; i < sh.vertices.length; i++) {
            sh.vertices[i] = [sh.vertices[i][0] + w / 2, sh.vertices[i][1] + h / 2];
        }
        mg.property('ADBE Mask Shape').setValue(sh);
    } catch (e) { }

    try {
        var ramp = lyr.property('ADBE Effect Parade').addProperty('ADBE Ramp');
        var isRadial = g.type === 'radial';
        ramp.property('Ramp Shape').setValue(isRadial ? 2 : 1);

        var a = w2aNum(g.angle, 180) * Math.PI / 180;
        
        var dx = Math.sin(a), dy = -Math.cos(a);
        var half = Math.abs(dx) * w / 2 + Math.abs(dy) * h / 2;
        var cxp = w / 2, cyp = h / 2;

        if (isRadial) {
            ramp.property('Start of Ramp').setValue([cxp, cyp]);
            ramp.property('End of Ramp').setValue([cxp + Math.max(w, h) / 2, cyp]);
        } else {
            ramp.property('Start of Ramp').setValue([cxp - dx * half, cyp - dy * half]);
            ramp.property('End of Ramp').setValue([cxp + dx * half, cyp + dy * half]);
        }
        ramp.property('Start Color').setValue(w2aColor(first.c, [0, 0, 0]));
        ramp.property('End Color').setValue(w2aColor(last.c, [1, 1, 1]));
    } catch (e2) { }

    if (g.stops.length > 2) {
        var mids = [];
        for (var s = 1; s < g.stops.length - 1; s++) mids[mids.length] = g.stops[s].c;
        try {
            lyr.comment = 'CSS gradient had ' + g.stops.length + ' stops; middle stops dropped: ' + mids.join(', ');
        } catch (e3) { }
    }

    lyr.property('Anchor Point').setValue([w / 2, h / 2]);
    lyr.property('Position').setValue([
        (w2aNum(nd.x, 0) + w2aNum(nd.w, 0) / 2) * S,
        (w2aNum(nd.y, 0) + w2aNum(nd.h, 0) / 2) * S
    ]);

    if (nd.shadow) w2aDropShadow(lyr, nd.shadow, S);
    w2aCommonTransform(lyr, nd, S);
    return lyr;
}

function w2aDropShadow(lyr, sh, S) {
    try {
        var fx = lyr.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');
        var dx = w2aNum(sh.x, 0) * S, dy = w2aNum(sh.y, 0) * S;
        var dist = Math.sqrt(dx * dx + dy * dy);
        
        var dir = (dist < 0.01) ? 180 : (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
        fx.property('Shadow Color').setValue(w2aColor(sh.color, [0, 0, 0]));
        fx.property('Opacity').setValue(w2aClamp(w2aNum(sh.alpha, 0.3) * 255, 0, 255));
        fx.property('Direction').setValue(dir);
        fx.property('Distance').setValue(dist);
        fx.property('Softness').setValue(Math.max(0, w2aNum(sh.blur, 0) * S));
    } catch (e) { }
}



function w2aBuildImage(comp, nd, job, S) {
    if (!nd.assetFile) return null;
    var f = new File(nd.assetFile);
    if (!f.exists) return null;

    var item = null;
    try {
        item = app.project.importFile(new ImportOptions(f));
    } catch (e) {
        return null;
    }
    if (!item) return null;

    var lyr = comp.layers.add(item);
    lyr.name = w2aSafeName(nd.name || 'Image');
    lyr.label = nd.kind === 'svg' ? 5 : 11;

    var tw = w2aNum(nd.w, 0) * S, th = w2aNum(nd.h, 0) * S;
    var iw = w2aNum(item.width, 0), ih = w2aNum(item.height, 0);

    if (iw > 0 && ih > 0 && tw > 0 && th > 0) {
        var sx = tw / iw * 100, sy = th / ih * 100;
        var fit = String(nd.fit || 'fill');
        if (fit.indexOf('contain') === 0) { var m = Math.min(sx, sy); sx = m; sy = m; }
        else if (fit.indexOf('cover') === 0) { var M = Math.max(sx, sy); sx = M; sy = M; }
        lyr.property('Scale').setValue([sx, sy]);

        
        if (fit.indexOf('cover') === 0 && (iw * sx / 100 > tw + 0.5 || ih * sy / 100 > th + 0.5)) {
            w2aBoxMask(lyr, iw, ih, tw / (sx / 100), th / (sy / 100), nd.radius, S / (sx / 100));
        } else if (nd.radius && (nd.radius[0] || nd.radius[1] || nd.radius[2] || nd.radius[3])) {
            w2aBoxMask(lyr, iw, ih, iw, ih, nd.radius, S / (sx / 100));
        }
    }

    lyr.property('Anchor Point').setValue([iw / 2, ih / 2]);
    lyr.property('Position').setValue([
        (w2aNum(nd.x, 0) + w2aNum(nd.w, 0) / 2) * S,
        (w2aNum(nd.y, 0) + w2aNum(nd.h, 0) / 2) * S
    ]);

    w2aCommonTransform(lyr, nd, S);
    return lyr;
}


function w2aBoxMask(lyr, layerW, layerH, boxW, boxH, radius, radScale) {
    try {
        var r = [0, 0, 0, 0];
        if (radius && radius.length === 4) {
            for (var i = 0; i < 4; i++) r[i] = w2aNum(radius[i], 0) * w2aNum(radScale, 1);
        }
        var sh = w2aRoundRectShape(boxW, boxH, r);
        for (var v = 0; v < sh.vertices.length; v++) {
            sh.vertices[v] = [sh.vertices[v][0] + layerW / 2, sh.vertices[v][1] + layerH / 2];
        }
        var m = lyr.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');
        m.property('ADBE Mask Shape').setValue(sh);
    } catch (e) { }
}




function w2aVectorToShapes(comp, lyr) {
    try {
        


        var srcName = 'svg', tag = '';
        try {
            srcName = lyr.name;
            



            tag = '__flexsrc_' + (new Date().getTime()) + '_' + Math.floor(Math.random() * 99999);
            lyr.name = tag;
        } catch (eN) { return null; }

        


        try {
            var sel = comp.selectedLayers;
            for (var s = 0; s < sel.length; s++) sel[s].selected = false;
        } catch (e0) {
            for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
        }
        lyr.selected = true;
        var id = app.findMenuCommandId('Create Shapes from Vector Layer');
        if (!id) return null;
        var before = comp.numLayers;

        


        var suppressed = false;
        try { app.beginSuppressDialogs(); suppressed = true; } catch (eS) { }
        try {
            app.executeCommand(id);
        } finally {
            if (suppressed) { try { app.endSuppressDialogs(false); } catch (eE) { } }
        }

        if (comp.numLayers <= before) {
            try { if (w2aAlive(lyr)) lyr.name = srcName; } catch (eU) { }
            return null;
        }

        


        var made = null;
        for (var j = 1; j <= comp.numLayers; j++) {
            var cand = comp.layer(j);
            if (!cand.selected) continue;
            if (cand.name === tag) continue;
            made = cand;
            break;
        }
        if (!made) {
            try { if (w2aAlive(lyr)) lyr.name = srcName; } catch (eU2) { }
            return null;
        }

        try { made.name = srcName + ' (vector)'; made.label = 5; } catch (eR) { }

        

        try {
            if (w2aAlive(lyr)) lyr.remove();
        } catch (eD) {
            try { lyr.enabled = false; } catch (eD2) { }
        }
        return made;
    } catch (e) {
        return null;
    }
}



function w2aCommonTransform(lyr, nd, S) {
    try {
        var op = w2aClamp(w2aNum(nd.opacity, 100), 0, 100);
        if (op < 100) lyr.property('Opacity').setValue(op);
    } catch (e) { }

    try {
        if (nd.rotate) lyr.property('Rotation').setValue(w2aNum(nd.rotate, 0));
    } catch (e2) { }

    try {
        var sx = w2aNum(nd.sx, 1), sy = w2aNum(nd.sy, 1);
        if (sx !== 1 || sy !== 1) {
            var cur = lyr.property('Scale').value;
            lyr.property('Scale').setValue([w2aNum(cur[0], 100) * sx, w2aNum(cur[1], 100) * sy]);
        }
    } catch (e3) { }
}



function w2aApplyGrouping(comp, job, built, worldOf, S) {
    var nodes = job.nodes;
    var i, nd, lyr;

    


    for (i = 0; i < nodes.length; i++) {
        nd = nodes[i];
        if (built[nd.id] && !w2aAlive(built[nd.id])) built[nd.id] = null;
    }

    
    for (i = 0; i < nodes.length; i++) {
        nd = nodes[i];
        lyr = built[nd.id];
        if (!w2aAlive(lyr)) continue;
        try { worldOf[nd.id] = lyr.property('Position').value; } catch (e) { worldOf[nd.id] = [0, 0]; }
    }

    if (job.grouping === 'parent') {
        for (i = 0; i < nodes.length; i++) {
            
            try {
                nd = nodes[i];
                lyr = built[nd.id];
                if (!w2aAlive(lyr) || !nd.parent) continue;
                var p = built[nd.parent];
                if (!w2aAlive(p) || p === lyr) continue;

                lyr.parent = p;
                var pw = worldOf[nd.parent] || [0, 0];
                var mw = worldOf[nd.id] || [0, 0];
                

                lyr.property('Position').setValue([
                    w2aNum(mw[0], 0) - w2aNum(pw[0], 0),
                    w2aNum(mw[1], 0) - w2aNum(pw[1], 0)
                ]);
            } catch (e) { }
        }
        return;
    }

    if (job.grouping === 'nulls') {
        var maxDepth = w2aNum(job.groupDepth, 3);
        var counts = {}, k;
        for (i = 0; i < nodes.length; i++) {
            var chain = nodes[i].parent;
            var hops = 0;
            while (chain && hops++ < 40) {
                counts[chain] = (counts[chain] || 0) + 1;
                chain = w2aParentOf(nodes, chain);
            }
        }

        var nullFor = {};
        for (i = 0; i < nodes.length; i++) {
            nd = nodes[i];
            if (!w2aAlive(built[nd.id])) continue;
            if (w2aNum(nd.depth, 0) > maxDepth) continue;
            if ((counts[nd.id] || 0) < 2) continue;

            var nl = comp.layers.addNull(comp.duration);
            nl.name = w2aSafeName('> ' + (nd.name || 'Group'));
            nl.label = 15;
            nl.enabled = false;
            nl.property('Anchor Point').setValue([0, 0]);
            var w = worldOf[nd.id] || [0, 0];
            nl.property('Position').setValue([w2aNum(w[0], 0), w2aNum(w[1], 0)]);
            nullFor[nd.id] = nl;
            worldOf['null_' + nd.id] = [w2aNum(w[0], 0), w2aNum(w[1], 0)];
        }

        for (i = 0; i < nodes.length; i++) {
            try {
                nd = nodes[i];
                lyr = built[nd.id];
                if (!w2aAlive(lyr)) continue;
                var anc = nd.parent, hop = 0, target = null;
                while (anc && hop++ < 40) {
                    if (nullFor[anc]) { target = anc; break; }
                    anc = w2aParentOf(nodes, anc);
                }
                if (!target || !w2aAlive(nullFor[target])) continue;

                lyr.parent = nullFor[target];
                var pw2 = worldOf['null_' + target] || [0, 0];
                var mw2 = worldOf[nd.id] || [0, 0];
                lyr.property('Position').setValue([
                    w2aNum(mw2[0], 0) - w2aNum(pw2[0], 0),
                    w2aNum(mw2[1], 0) - w2aNum(pw2[1], 0)
                ]);
            } catch (e) { }
        }
    }
}

function w2aParentOf(nodes, id) {
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) return nodes[i].parent;
    }
    return 0;
}



function w2aAnimate(comp, job, built, nodes, S) {
    var a = job.anim;
    var stagger = w2aNum(a.stagger, 0.05);
    var adur = Math.max(0.05, w2aNum(a.duration, 0.8));
    var order = String(a.order || 'topToBottom');

    var list = [];
    for (var i = 0; i < nodes.length; i++) {
        if (built[nodes[i].id]) list[list.length] = nodes[i];
    }

    for (var j = 0; j < list.length; j++) {
        var nd = list[j];
        nd.__k = order === 'topToBottom' ? w2aNum(nd.y, 0)
            : order === 'bottomToTop' ? -w2aNum(nd.y, 0)
                : order === 'leftToRight' ? w2aNum(nd.x, 0)
                    : order === 'random' ? Math.random() * 1e6
                        : w2aNum(nd.order, j);
    }
    list.sort(function (p, q) { return p.__k - q.__k; });

    for (var r = 0; r < list.length; r++) {
        var node = list[r];
        var lyr = built[node.id];
        var t0 = r * stagger, t1 = t0 + adur;
        try { w2aAnimOne(lyr, String(a.preset || 'slideUp'), t0, t1, node, S); } catch (e) { }
    }
}

function w2aAnimOne(lyr, preset, t0, t1, nd, S) {
    var P = lyr.property('Position'), O = lyr.property('Opacity'), Sc = lyr.property('Scale');
    var pos = P.value;
    var px = w2aNum(pos[0], 0), py = w2aNum(pos[1], 0);
    var d = Math.max(w2aNum(nd.h, 0) * S, 40);
    var dw = Math.max(w2aNum(nd.w, 0) * S, 40);

    function ease(p, spatial) {
        try {
            var need = spatial ? 1 : p.value.length || 1;
            var ins = [], outs = [];
            for (var i = 0; i < need; i++) { ins[i] = new KeyframeEase(0, 40); outs[i] = new KeyframeEase(0, 80); }
            p.setTemporalEaseAtKey(1, ins, ins);
            p.setTemporalEaseAtKey(p.numKeys, outs, outs);
        } catch (e) { }
    }

    function fade() {
        O.setValueAtTime(t0, 0);
        O.setValueAtTime(t1, w2aClamp(w2aNum(nd.opacity, 100), 0, 100));
        ease(O, false);
    }

    if (preset === 'slideUp') { P.setValueAtTime(t0, [px, py + d]); P.setValueAtTime(t1, [px, py]); ease(P, true); fade(); }
    else if (preset === 'slideDown') { P.setValueAtTime(t0, [px, py - d]); P.setValueAtTime(t1, [px, py]); ease(P, true); fade(); }
    else if (preset === 'slideLeft') { P.setValueAtTime(t0, [px + dw, py]); P.setValueAtTime(t1, [px, py]); ease(P, true); fade(); }
    else if (preset === 'slideRight') { P.setValueAtTime(t0, [px - dw, py]); P.setValueAtTime(t1, [px, py]); ease(P, true); fade(); }
    else if (preset === 'pop') {
        var sv = Sc.value;
        Sc.setValueAtTime(t0, [0, 0]);
        Sc.setValueAtTime(t1, [w2aNum(sv[0], 100), w2aNum(sv[1], 100)]);
        ease(Sc, false); fade();
    }
    else fade();
}
