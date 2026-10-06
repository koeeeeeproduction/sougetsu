/* Sougetsu Akira FX - pixel companions.
 * Hand-placed 24x32 pixel sprites in one shared chibi style (same head template, 1px dark outline, 2-3 tone shading,
 * no anti-aliasing), colours sampled from the reference art. Idle animation is built from the sprite itself:
 *   breathe  upper body rises 1px and settles (12-frame loop, ~1.5 s)
 *   sway     hair/cloth tips drift 1px
 *   blink    occasional, 2 frames
 *   gesture  occasional character beat (staff glint, hat tug, finger raise, kunai glint, yawn, thumb to lip)
 * Rendered nearest-neighbour onto a canvas at integer scale. API: AkiraPixel.mount(el, opts) / frame(id, f, o). */
(function (root) {
    'use strict';
    var OUT = '#17121c';

    var C = {
        frieren: {
            name: 'Frieren', waist: 20, eyes: [11, 12],
            pal: { O: OUT, H: '#f4f1f4', h: '#cbc4d2', L: '#ffffff', S: '#fbe6d9', s: '#ebc4b2', E: '#3f9a6c', W: '#ffffff', M: '#c98476',
                C: '#f7f4ee', c: '#d6cdc0', G: '#c9a24a', g: '#9c7a30', K: '#2b2a33', k: '#46444f', B: '#8a5a3a', b: '#5f3d2a', R: '#d63a3a', T: '#8c2f2a' },
            rows: [
                '........................',
                '.........OOOOOO.........',
                '.......OOHHHHHHOO.......',
                '...OO.OHHHLLHHHHHO.OO...',
                '..OHHOHHHHHHHHHHHHOHHO..',
                '..OHhOHHHHHHHHHHHHOhHO..',
                '..OHhOHhHHHHHHHHhHOhHO..',
                '..OhHOhHHhHHHHhHHhOHhO..',
                'OOOhHOhSShSSSShSShOHhOOO',
                'OSSSSOSSSSSSSSSSSSOSSSSO',
                '.OOSSOSOOSSSSSSOOSOSSOO.',
                '..OOHOSEWSSSSSSEWSOHOO..',
                '..OhHOSEESSSSSSEESOHhO..',
                '..OHhOsSSSSSMSSSSsOhHO..',
                '..OhHOOsSSSSSSSSsOOHhO..',
                '..OHhO.OOsSSSSsOO.OhHO..',
                '..OhHOOCCCCKKCCCCOOHhO..',
                '..OHOCCCCCKkkKCCCCCOHO..',
                '..OHOCCCCCKKKKCCCCCOHO..',
                '..OhOGGGGGGGGGGGGGGOhO..',
                '..OOSOCCCKKKKKKCCCOSOO..',
                '...OSOCCCCCCCCCCCCOSO...',
                '....OOCCCCCCCCCCCCOO....',
                '.....OCCCCCCCCCCCCO.....',
                '.....OCCCCCCCCCCCCO.....',
                '.....OGGGGGGGGGGGGO.....',
                '......OKKKKOOKKKKO......',
                '......OkKKKOOKKKkO......',
                '......OBBBBOOBBBBO......',
                '......OBbBBOOBBbBO......',
                '.....OBBBBBOOBBBBBO.....',
                '.....OOOOOOOOOOOOOO.....'
            ],
            staff: true,
            sway: [{ r: [15, 25], c: [2, 5] }, { r: [15, 25], c: [18, 22] }]
        },
        gojo: {
            name: 'Gojo', waist: 22, eyes: null,
            pal: { O: OUT, H: '#f3f1f6', h: '#c4bed0', L: '#ffffff', K: '#0f0d14', k: '#2a2633', S: '#f6e1d3', s: '#e0bda9', M: '#b7786a',
                U: '#1d1a26', u: '#2c2738', P: '#6d48b4', N: '#0b0a0f' },
            rows: [
                '........................',
                '.......O...OO...O.......',
                '......OHO.OHHO.OHO......',
                '.....OHHHOHLHHOHHHO.....',
                '....OHHLHHHHHHHHHLHHO...',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHhHHHHHHHHHHHHHHhHO..',
                '..OhHHhHHhHHHHhHHhHHhO..',
                '..OHKKKKKKKKKKKKKKKKHO..',
                '..OhKKkKKKKKKKKKKkKKhO..',
                '..OhKKKKKKKKKKKKKKKKhO..',
                '...OSSSSSSSSSSSSSSSSO...',
                '...OSSSSSSSSSSSSSSSSO...',
                '....OsSSSSSMMSSSSSsO....',
                '.....OOsSSSSSSSSsOO.....',
                '.......OOUUUUUUOO.......',
                '......OUUUUUUUUUUO......',
                '.....OUUUUuUUuUUUUO.....',
                '....OUUPUUUUUUUUPUUO....',
                '....OUUPUUuUUuUUPUUO....',
                '....OUUUUUUUUUUUUUUO....',
                '....OuUUUUUUUUUUUUuO....',
                '....OUUUUUUUUUUUUUUO....',
                '.....OUUUUUUUUUUUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OUUPUUOOUUPUUO.....',
                '.....OUUUUUOOUUUUUO.....',
                '.....OuUUUUOOUUUUuO.....',
                '.....ONNNNNOONNNNNO.....',
                '....ONNNNNNOONNNNNNO....',
                '....OOOOOOOOOOOOOOOO....'
            ],
            sway: [{ r: [1, 4], c: [5, 19] }]
        },
        luffy: {
            name: 'Luffy', waist: 21, eyes: [10, 11],
            pal: { O: OUT, Y: '#dcbb7c', y: '#b48f58', R: '#c0343f', r: '#8e2430', H: '#1b1a20', S: '#f0c5a4', s: '#d39b78', W: '#ffffff', E: '#1b1a20',
                M: '#7a2a2a', X: '#d98e86', A: '#e8c53a', a: '#c39b1f', J: '#536aab', j: '#3f5190', Q: '#ecebe6', Z: '#8a6a4a' },
            rows: [
                '........................',
                '........OOOOOOOO........',
                '.......OYYYYYYYYO.......',
                '......OYYyYYYYyYYO......',
                '......ORRRRRRRRRRO......',
                '..OOOOOYYYYYYYYYYOOOOO..',
                '.OYYYYYYYYYYYYYYYYYYYYO.',
                '..OOOOHHHHHHHHHHHHOOOO..',
                '....OHHHSHHHHHHSHHHO....',
                '....OHSSSSSSSSSSSSHO....',
                '....OSOOSSSSSSSSOOSO....',
                '....OSWESSSSSSSSWESO....',
                '....OSSSSSSSSSSXSSSO....',
                '....OsSSMMMMMMMMSSsO....',
                '.....OsSSMMMMMMSSsO.....',
                '......OOsSSSSSSsOO......',
                '.....ORRRSSSSSSRRRO.....',
                '....ORRRRSXSSXSRRRRO....',
                '...ORRRRRSSXXSSRRRRRO...',
                '...ORRORRSXSSXSRRORRO...',
                '...OSSORRSSSSSSRROSSO...',
                '...OSSOAAAAAAAAAAOSSO...',
                '....OOOAAAAAAAAaAOO.....',
                '......OJJJJJJJJaAO......',
                '......OJJJJJJJJaaO......',
                '......OJJJJOOJJJaO......',
                '......OJjJJOOJJjJO......',
                '......OQQQQOOQQQQO......',
                '.......OSSOOOOSSO.......',
                '.......OSSO..OSSO.......',
                '......OZZZO..OZZZO......',
                '......OOOOO..OOOOO......'
            ],
            sway: [{ r: [21, 26], c: [15, 18] }]
        },
        itachi: {
            name: 'Itachi', waist: 21, eyes: [11, 12],
            pal: { O: OUT, H: '#1d1f29', h: '#2e3548', L: '#4a557a', P: '#c9cad2', p: '#8f909e', Z: '#5a5b68', B: '#2c4a8a', S: '#f1ded6', s: '#d0bab2', E: '#1a1a1e', W: '#ffffff',
                M: '#b88a80', U: '#414a6b', u: '#2e3548', D: '#e7e7e1', d: '#b7aca8', K: '#5c5a5a', k: '#9a98a0', N: '#262a3a' },
            rows: [
                '........................',
                '.........OOOOOO.........',
                '.......OOHHHHHHOO.......',
                '......OHHHHLLHHHHO......',
                '.....OHHHHHHHHHHHHO.....',
                '....OHHHHHHHHHHHHHHO....',
                '....OBBPPPPPPPPPPBBO....',
                '...OOBPPPPPZZPPPPPBOO...',
                '...OHHPpPPPPPPPPpPHHO...',
                '...OHHhHHHHHHHHHHhHHO...',
                '...OHhSHhSSSSSShHSHhO...',
                '...OHhSOOSSSSSSOOShHO...',
                '...OHhSWESSSSSSWEShHO...',
                '...OHhSSSSSSSSSSSShHO...',
                '...OHhOsSSSSMSSSsOhHO...',
                '....OHHOOsSSSSsOOHHO....',
                '.....OOOUUUUUUUUOOO.....',
                '....OUUUUUUUUUUUUUUO....',
                '...OUUUUUUuUUuUUUUUUO...',
                '...ODDOUUUUUUUUUUODDO...',
                '...ODdOUUUUUUUUUUOdDO...',
                '...ODDOUUUUUUUUUUODDO...',
                '...OSSONNNNNNNNNNOSSO...',
                '..OkKOONNNNNNNNNNOOSSO..',
                '..OKO..ONNNNNNNNO..OO...',
                '..OO...ONNNOONNNO.......',
                '.......ONNNOONNNO.......',
                '.......ODDDOODDDO.......',
                '.......OdDDOODDdO.......',
                '.......OSSSOOSSSO.......',
                '......ONNNNOONNNNO......',
                '......OOOOOOOOOOOO......'
            ],
            sway: [{ r: [8, 15], c: [3, 5] }, { r: [8, 15], c: [18, 20] }]
        },
        nagi: {
            name: 'Nagi', waist: 21, eyes: [11, 12],
            pal: { O: OUT, H: '#ebe8f0', h: '#bdb7c9', L: '#ffffff', S: '#f6e2d6', s: '#dfbdaa', E: '#8c919e', W: '#ffffff', M: '#b07a70',
                U: '#16171e', u: '#262834', A: '#2f7ae0', a: '#6fb0ff', Q: '#f2f2f2', q: '#c8c8d0', N: '#1d4fa8' },
            rows: [
                '........................',
                '........O.OOOO.O........',
                '.......OHOHHHHOHO.......',
                '.....OOHHHHLHHHHHOO.....',
                '....OHHHHHHHHHHHHHHO....',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHHHhHHHHHHHHHHhHHHO..',
                '..OHhHHhHHHhHHHhHHhHO...',
                '...OHhSHhSSHSSShSShHO...',
                '...OHhSSSSSSSSSSSSShO...',
                '...OhSSSSSSSSSSSSSSHO...',
                '....OSOOOSSSSSSOOOSO....',
                '....OSsEWSSSSSSsEWSO....',
                '....OsSSSSSSSSSSSSsO....',
                '.....OsSSSSMMSSSSsO.....',
                '......OOsSSSSSSsOO......',
                '.......OOUUAAUUOO.......',
                '.....OOUUUUAAUUUUOO.....',
                '....OUUUUUUAAUUUUUUO....',
                '....OUAUUUUAAUUUUAUO....',
                '....OUAUUUUAAUUUUAUO....',
                '....OSOUUUUAAUUUUOSO....',
                '....OSOUUUUUUUUUUOSO....',
                '.....OOUUUUUUUUUUOO.....',
                '......OUUUUOOUUUUO......',
                '......OUUAUOOUAUUO......',
                '......OSSSSOOSSSSO......',
                '......OQQQQOOQQQQO......',
                '......OQqQQOOQQqQO......',
                '......OQQQQOOQQQQO......',
                '.....OANNNNOONNNNAO.....',
                '.....OOOOOOOOOOOOOO.....'
            ],
            sway: [{ r: [1, 4], c: [6, 18] }]
        },
        l: {
            name: 'L', waist: 18, eyes: [10, 11],
            pal: { O: OUT, H: '#121216', h: '#26262e', L: '#3c3c48', S: '#f4e8e2', s: '#dccbc4', V: '#b8a6b6', E: '#0e0e12', W: '#ffffff', M: '#a8858a',
                T: '#f2f2f4', t: '#c9c9d4', J: '#4a69a6', j: '#36508a' },
            rows: [
                '........................',
                '......O.O.OOOO.O.O......',
                '.....OHOHOHHHHOHOHO.....',
                '....OHHHHHHHLHHHHHHO....',
                '...OHHHHHHHHHHHHHHHHO...',
                '..OHHHHHHHHHHHHHHHHHHO..',
                '..OHhHHHhHHHHHhHHHhHHO..',
                '.OHHhHShHhSSShHShHhHHHO.',
                '.OHhHSSSSSSSSSSSSSShHO..',
                '..OHhSOOOSSSSSSOOOShHO..',
                '..OhSSOWEOSSSSOWEOSShO..',
                '..OHSSOEEOSSSSOEEOSSHO..',
                '...OSSVVVSSSSSSVVVSSO...',
                '...OsSSSSSSSSSSSSSSsO...',
                '....OsSSSSSMMSSSSSsO....',
                '.....OOsSSSSSSSSsOO.....',
                '......OOTTTTTTTTOO......',
                '....OOTTTTTTTTTTTTOO....',
                '...OTTTTTTTTTTTTTTTTO...',
                '..OTTTTOOOOTTOOOOTTTTO..',
                '..OTTTOSSSSOOSSSSOTTTO..',
                '..OTTOSSsSSOOSSsSSOTTO..',
                '..OTTOJJJJJOOJJJJJOTTO..',
                '..OTTOJJjJJOOJJjJJOTTO..',
                '..OTTOJJJJJOOJJJJJOTTO..',
                '..OtTOJJJJJOOJJJJJOTtO..',
                '...OOOJJJJJOOJJJJJOOO...',
                '....OJJJJJjOOjJJJJJO....',
                '...OJJJJJJJOOJJJJJJJO...',
                '...OSSSSSSOOOOSSSSSSO...',
                '...OSsSsSSO..OSSsSsSO...',
                '...OOOOOOOO..OOOOOOOO...'
            ],
            sway: [{ r: [1, 3], c: [5, 19] }]
        }
    };
    var IDS = ['itachi', 'frieren', 'luffy', 'gojo', 'nagi', 'l'];

    // per-character idle personality: breathing curve (px, 12 frames), drift (px), gesture
    var BREATH = {
        calm: [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0],
        lively: [0, 0, -1, -1, -1, 0, 0, 0, -1, -1, -1, 0],
        lazy: [0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 0, 0]
    };
    var STYLE = {
        itachi: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0], fps: 7 },
        frieren: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 1, 1, 1, 0, 0, 0, -1, -1, 0], fps: 7 },
        luffy: { breath: 'lively', drift: [0, 0, 1, 1, 1, 0, 0, 0, -1, -1, -1, 0], sway: [0, 1, 1, 0, 0, -1, -1, 0, 1, 1, 0, 0], fps: 9 },
        gojo: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0], fps: 8 },
        nagi: { breath: 'lazy', drift: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sway: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0], fps: 6 },
        l: { breath: 'calm', drift: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], sway: [0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0], fps: 8 }
    };

    function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function grid(id) { return C[id].rows.map(function (r) { return r.split(''); }); }
    function shiftRows(g, from, to, dy) {           // move rows [from,to) by dy (-1 = up); the vacated row repeats its neighbour
        if (!dy) { return; }
        var copy = g.map(function (r) { return r.slice(); }), y;
        for (y = from; y < to; y++) { var src = y - dy; if (src >= from && src < to) { g[y] = copy[src].slice(); } else { g[y] = copy[Math.min(to - 1, Math.max(from, y))].slice(); } }
    }
    function shiftRegion(g, r0, r1, c0, c1, dx) {   // drift a silhouette tip sideways by dx
        if (!dx) { return; }
        var y, x;
        for (y = r0; y < r1 && y < g.length; y++) {
            var row = g[y], seg = row.slice(c0, c1 + 1), out = seg.map(function () { return '.'; });
            for (x = 0; x < seg.length; x++) { var nx = x + dx; if (nx >= 0 && nx < seg.length && seg[x] !== '.') { out[nx] = seg[x]; } }
            for (x = 0; x < seg.length; x++) { if (out[x] === '.' && seg[x] !== '.' && (x === 0 || x === seg.length - 1)) { out[x] = seg[x]; } }
            for (x = 0; x < seg.length; x++) { row[c0 + x] = out[x]; }
        }
    }
    function put(g, x, y, ch) { if (g[y] && x >= 0 && x < g[y].length) { g[y][x] = ch; } }

    // character beats, p = 0..1 through the gesture
    var GESTURE = {
        frieren: function (g, p) { var on = p > 0.2 && p < 0.8; if (on) { put(g, 1, 9, 'L'); put(g, 0, 8, p < 0.5 ? 'L' : 'O'); } },
        gojo: function (g, p) {
            if (p < 0.15 || p > 0.85) { return; }
            // raises his left hand: two fingers up beside the face
            put(g, 20, 12, 'O'); put(g, 21, 12, 'O'); put(g, 20, 13, 'S'); put(g, 21, 13, 'S'); put(g, 22, 13, 'O');
            put(g, 19, 14, 'O'); put(g, 20, 14, 'S'); put(g, 21, 14, 'S'); put(g, 22, 14, 'O'); put(g, 19, 15, 'O'); put(g, 20, 15, 'U'); put(g, 21, 15, 'O');
            put(g, 20, 11, 'S'); put(g, 21, 11, 'S'); put(g, 20, 10, 'O'); put(g, 21, 10, 'O');
        },
        luffy: function (g, p) { if (p > 0.2 && p < 0.8) { var r = g[4].slice(); shiftRegion(g, 1, 7, 0, 23, 1); g[4] = g[4]; } },
        itachi: function (g, p) { if (p > 0.3 && p < 0.7) { put(g, 2, 23, 'W'); put(g, 3, 22, p < 0.5 ? 'W' : 'k'); } },
        nagi: function (g, p) { if (p > 0.15 && p < 0.85) { put(g, 11, 14, 'O'); put(g, 12, 14, 'O'); put(g, 11, 13, 'M'); put(g, 12, 13, 'M'); put(g, 7, 12, 'O'); put(g, 8, 12, 'O'); put(g, 16, 12, 'O'); put(g, 17, 12, 'O'); } },
        l: function (g, p) {
            if (p < 0.15 || p > 0.85) { return; }
            // thumb to lip
            put(g, 13, 13, 'O'); put(g, 13, 14, 'S'); put(g, 14, 14, 'O'); put(g, 12, 15, 'O'); put(g, 13, 15, 'S'); put(g, 14, 15, 'S'); put(g, 15, 15, 'O');
            put(g, 13, 16, 'S'); put(g, 14, 16, 'S'); put(g, 13, 17, 'T'); put(g, 14, 17, 'T');
        }
    };

    function frame(id, f, o) {
        o = o || {};
        var c = C[id], st = STYLE[id], g = grid(id), i = ((f % 12) + 12) % 12, y, x;
        // blink: the iris row(s) close to a lash line
        if (o.blink && c.eyes) {
            for (y = c.eyes[0]; y <= c.eyes[1]; y++) { for (x = 0; x < 24; x++) { if (g[y][x] === 'E' || g[y][x] === 'W') { g[y][x] = (y === c.eyes[1] ? 'O' : 's'); } } }
            for (x = 0; x < 24; x++) { if (g[c.eyes[0] - 1][x] === 'O' && (g[c.eyes[0]][x] === 's' || g[c.eyes[0]][x] === 'O')) { g[c.eyes[0] - 1][x] = c.pal.s ? 's' : 'S'; } }
        }
        if (o.gesture !== undefined && GESTURE[id]) { GESTURE[id](g, o.gesture); }
        (c.sway || []).forEach(function (s) { shiftRegion(g, s.r[0], s.r[1], s.c[0], s.c[1], st.sway[i]); });
        shiftRows(g, 0, c.waist, BREATH[st.breath][i]);
        if (c.staff) { staff(g, BREATH[st.breath][i]); }
        var dx = st.drift[i], out = [];
        for (y = 0; y < 32; y++) {
            var row = [];
            for (x = 0; x < 24; x++) { var ch = g[y][x - dx] || '.'; row.push(ch === '.' ? null : hex(c.pal[ch] || OUT)); }
            out.push(row);
        }
        return out;
    }
    // Frieren's staff, held at her side (drawn after breathing so the hand and staff move together)
    function staff(g, dy) {
        var top = 3 + dy, y;
        for (y = top + 3; y < 31; y++) { if (g[y][22] === '.') { put(g, 22, y, 'T'); } if (g[y][23] === '.') { put(g, 23, y, 'O'); } if (g[y][21] === '.') { put(g, 21, y, 'O'); } }
        put(g, 21, top - 1, 'O'); put(g, 22, top - 1, 'G'); put(g, 23, top - 1, 'O');
        put(g, 21, top, 'G'); put(g, 22, top, 'R'); put(g, 23, top, 'G');
        put(g, 21, top + 1, 'O'); put(g, 22, top + 1, 'G'); put(g, 23, top + 1, 'O');
        put(g, 22, top + 2, 'G');
        put(g, 22, 31, 'G');
    }

    // ---------- canvas widget ----------
    function mount(el, opts) {
        opts = opts || {};
        var cv = document.createElement('canvas'), x = cv.getContext('2d'), id = opts.id || 'itachi', size = opts.size || 64, speed = opts.speed || 1, anim = opts.animate !== false;
        cv.width = 24; cv.height = 32; cv.className = 'akpx';
        cv.style.cssText = 'image-rendering:pixelated;image-rendering:crisp-edges;display:block;';
        el.appendChild(cv);
        var img = x.createImageData(24, 32), f = 0, t0 = 0, nextBlink = 0, blinkUntil = 0, gStart = -1, nextGesture = 0, raf = 0, last = 0, dead = false;
        function layout() { var s = Math.max(1, Math.floor(size / 32)) || 1; cv.style.width = (24 * size / 32) + 'px'; cv.style.height = size + 'px'; }
        function draw(fr) {
            var d = img.data, yy, xx, k = 0;
            for (yy = 0; yy < 32; yy++) { for (xx = 0; xx < 24; xx++, k += 4) { var c = fr[yy][xx]; if (c) { d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; } else { d[k + 3] = 0; } } }
            x.putImageData(img, 0, 0);
        }
        function sched(now) { nextBlink = now + 2500 + Math.random() * 3500; }
        function tick(now) {
            raf = 0; if (dead) { return; }
            var st = STYLE[id], step = 1000 / (st.fps * speed);
            if (!t0) { t0 = now; sched(now); nextGesture = now + 6000 + Math.random() * 8000; }
            if (now - last >= step) {
                last = now; f = (f + 1) % 12;
                var o = {};
                if (now > nextBlink) { blinkUntil = now + 160; sched(now); }
                if (now < blinkUntil) { o.blink = 1; }
                if (opts.random !== false && gStart < 0 && now > nextGesture) { gStart = now; }
                if (gStart >= 0) { var p = (now - gStart) / 1600; if (p >= 1) { gStart = -1; nextGesture = now + 8000 + Math.random() * 12000; } else { o.gesture = p; } }
                draw(frame(id, f, o));
            }
            if (anim && !document.hidden) { raf = requestAnimationFrame(tick); } else { setTimeout(function () { if (!raf && !dead) { raf = requestAnimationFrame(tick); } }, 500); }
        }
        layout(); draw(frame(id, 0, {}));
        raf = requestAnimationFrame(tick);
        return {
            canvas: cv,
            set: function (o) { if (o.id && C[o.id]) { id = o.id; } if (o.size) { size = o.size; layout(); } if (o.speed) { speed = o.speed; } if (o.animate !== undefined) { anim = o.animate; } if (o.random !== undefined) { opts.random = o.random; } draw(frame(id, f, {})); if (anim && !raf) { raf = requestAnimationFrame(tick); } },
            poke: function () { gStart = performance.now(); },
            destroy: function () { dead = true; if (raf) { cancelAnimationFrame(raf); } if (cv.parentNode) { cv.parentNode.removeChild(cv); } }
        };
    }

    root.AkiraPixel = { ids: IDS, chars: C, frame: frame, mount: mount, name: function (id) { return C[id] ? C[id].name : id; } };
})(window);
