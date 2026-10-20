/* Sowveil - core: AE bridge, storage, toast, icons, small DOM helpers. */
(function () {
    'use strict';
    var SV = window.SV = window.SV || {};
    SV.VERSION = '1.0.0';

    // ---------- environment ----------
    var cs = null;
    try { if (window.__adobe_cep__) { cs = new CSInterface(); } } catch (e) { cs = null; }
    SV.cs = cs;
    SV.isCEP = function () { return !!cs; };
    SV.node = function (name) { try { return (window.cep_node && window.cep_node.require ? window.cep_node.require : require)(name); } catch (e) { return null; } };

    // ---------- host calls ----------
    // Every host function takes ONE argument (a JSON object literal) and returns a JSON string
    // {"ok":true,...} or {"ok":false,"error":"..."}. Returns a Promise of the parsed object.
    SV.call = function (fn, args, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            if (!cs) { resolve({ ok: false, error: 'Open Sowveil inside After Effects.', dev: true }); return; }
            var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve({ ok: false, error: 'After Effects did not answer.' }); } }, opts.timeout || 60000);
            var script = '$._sv && $._sv.' + fn + ' ? $._sv.' + fn + '(' + JSON.stringify(args === undefined ? {} : args) + ') : \'{"ok":false,"error":"Sowveil host not loaded"}\'';
            cs.evalScript(script, function (res) {
                if (done) { return; }
                done = true; clearTimeout(timer);
                var out;
                try { out = JSON.parse(res); } catch (e) { out = { ok: false, error: (res && res !== 'EvalScript error.') ? String(res) : 'Script error in After Effects.' }; }
                resolve(out);
            });
        });
    };

    // ---------- storage ----------
    SV.get = function (k, d) { try { var v = localStorage.getItem('sowveil:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
    SV.set = function (k, v) { try { localStorage.setItem('sowveil:' + k, JSON.stringify(v)); } catch (e) { } };

    // ---------- events ----------
    var subs = {};
    SV.on = function (ev, fn) { (subs[ev] = subs[ev] || []).push(fn); return function () { subs[ev] = (subs[ev] || []).filter(function (f) { return f !== fn; }); }; };
    SV.emit = function (ev, data) { (subs[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); };

    // ---------- toast ----------
    var tt = 0;
    SV.toast = function (msg, kind) {
        var el = document.getElementById('toast'); if (!el) { return; }
        el.textContent = msg; el.className = 'toast on' + (kind === 'error' ? ' err' : '');
        clearTimeout(tt); tt = setTimeout(function () { el.className = 'toast' + (kind === 'error' ? ' err' : ''); }, kind === 'error' ? 4200 : 2400);
    };
    SV.result = function (r, okMsg) {
        if (r && r.ok) { SV.toast(r.message || okMsg || 'Done.'); SV.emit('applied'); }
        else { SV.toast((r && r.error) || 'Something went wrong.', 'error'); }
        return r;
    };

    // ---------- DOM ----------
    SV.h = function (tag, attrs, kids) {
        var el = document.createElement(tag), k;
        if (attrs) {
            for (k in attrs) {
                if (!attrs.hasOwnProperty(k) || attrs[k] === undefined || attrs[k] === null || attrs[k] === false) { continue; }
                if (k === 'class') { el.className = attrs[k]; }
                else if (k === 'html') { el.innerHTML = attrs[k]; }
                else if (k === 'text') { el.textContent = attrs[k]; }
                else if (k === 'style' && typeof attrs[k] === 'object') { Object.assign(el.style, attrs[k]); }
                else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') { el.addEventListener(k.substring(2), attrs[k]); }
                else { el.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }
            }
        }
        (kids || []).forEach(function (c) { if (c === null || c === undefined || c === false) { return; } el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return el;
    };
    SV.esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    SV.fileUrl = function (p) {
        if (!p) { return ''; }
        var parts = String(p).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
        return 'file:///' + parts.replace(/^\/+/, '');
    };
    SV.hexToRgb = function (hex) {
        var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
        return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
    };

    // ---------- icons (inline SVG, stroke = currentColor) ----------
    var P = {
        mark: '<path d="M12 2.5c3.6 3 5.5 6.2 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3.3 1.9-6.5 5.5-9.5z"/><path d="M12 8.5c1.6 1.4 2.4 2.8 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.4.8-2.8 2.4-4.2z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        text: '<path d="M4 6V4h16v2M9 20h6M12 4v16"/>',
        bg: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15l5-5 4 4 3-3 6 6"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
        carousel: '<ellipse cx="12" cy="12" rx="9" ry="4"/><rect x="9.5" y="7" width="5" height="7" rx="1"/>',
        library: '<path d="M4 4h6v16H4zM12 4h3v16h-3zM17.5 4.5l3 .8-3.6 14.7-3-.8z"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
        back: '<path d="M15 5l-7 7 7 7"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        plus: '<path d="M12 5v14M5 12h14"/>'
    };
    SV.icon = function (name, cls) {
        return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || '') + '</svg>';
    };
})();
