/* Sougetsu Akira FX - website preview layer. Injected as the FIRST script of website/panel/index.html only.
 * The real panel talks to After Effects through window.__adobe_cep__. In a plain browser that object does not exist, so
 * this provides a stand-in: the panel boots normally (main.js still detects "no host" and runs its browser-preview
 * fallbacks), tool clicks get a friendly mock reply plus a small "runs inside After Effects" toast, and nothing tries to
 * talk to a real After Effects. ?tour=1 cycles the tabs automatically (used in the hero, where the panel is not clickable). */
(function () {
    'use strict';
    var Q = new URLSearchParams(location.search), TOUR = Q.has('tour');
    window.AKIRA_WEB_PREVIEW = true;

    // ---- preview defaults: no intro, classic Shadow Ninja companion, quiet ----
    try {
        var P = JSON.parse(localStorage.getItem('akira_persona_v1') || 'null') || {};
        P.set = P.set || {};
        P.set.intro = false; P.set.px = ''; P.set.petId = 'ninja'; P.set.events = false; P.set.sounds = false;
        localStorage.setItem('akira_persona_v1', JSON.stringify(P));
        localStorage.setItem('akira_timer_dock_open', '0');
    } catch (e) { }

    // ---- look: AE paints the panel background; the license gate and launch announcements are not part of the demo ----
    var css = document.createElement('style');
    css.textContent = 'html,body{background:#232323!important}#license-overlay,.flx-lic-wrap,#akira-announcement-modal,#creator-message-modal{display:none!important}' +
        '#akwp-toast{position:fixed;left:50%;bottom:54px;transform:translate(-50%,10px);opacity:0;z-index:2147483600;max-width:calc(100% - 24px);padding:9px 14px;border-radius:10px;background:rgba(10,10,12,.96);border:1px solid var(--primary,#00ff55);color:#eee;font:600 11.5px/1.35 Inter,-apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.6);transition:opacity .2s,transform .2s;pointer-events:none;text-align:center}' +
        '#akwp-toast.on{opacity:1;transform:translate(-50%,0)}#akwp-toast b{color:var(--primary,#00ff55)}' +
        (TOUR ? '*{cursor:default!important}#ap-root,#akwp-toast{display:none!important}' : '');
    (document.head || document.documentElement).appendChild(css);

    // ---- mock replies ----
    var GETTER = /^(get|list|scan|count|check|is|has|read|load|probe|query|debug|find|http|run_?diag|reloadKeybinds)/i;
    function human(fn) {
        return String(fn).replace(/_AkiraGUI$/, '').replace(/^(apply|create|add|run|do|make)(?=[A-Z])/, '$1 ').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/^./, function (c) { return c.toUpperCase(); }).trim();
    }
    var tt = 0;
    function toast(fn) {
        if (TOUR || !document.body) { return; }
        var el = document.getElementById('akwp-toast');
        if (!el) { el = document.createElement('div'); el.id = 'akwp-toast'; document.body.appendChild(el); }
        el.innerHTML = '<b>' + human(fn) + '</b> runs inside After Effects. This is a preview.';
        el.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 2400);
    }
    var HELPER = /^(resolve|ensure|init|sync|refresh|save|set|update|watch|ping|prepare|register|cache|store|log|reload|load)/i, lastMock = 0, lastUser = 0;
    ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { lastUser = Date.now(); }, true); });
    function mock(script) {
        var s = String(script || '').replace(/^\s+/, ''), m = /^\$\._akira\.run\(\s*["']([A-Za-z0-9_]+)/.exec(s) || /^\$\._akira[A-Za-z0-9]*\.([A-Za-z0-9_]+)\s*\(/.exec(s) || /^([A-Za-z0-9]+_AkiraGUI)\s*\(/.exec(s);
        if (!m) { return ''; }                      // engine probes, typeof checks, try{} wrappers, app.* polls: "not available"
        var fn = m[1];
        if (GETTER.test(fn) || HELPER.test(fn)) { return ''; }
        lastMock = Date.now();
        if (Date.now() - lastUser < 1500) { toast(fn); }   // background polls stay silent
        return 'SUCCESS';
    }
    // the panel's own status pop-ups would only echo the mock reply ("SUCCESS", "did not complete") - keep our toast instead
    window.addEventListener('load', function () {
        var orig = window.showStatus;
        if (typeof orig !== 'function') { return; }
        window.showStatus = function (msg, kind) { if (Date.now() - lastMock < 2000) { return; } return orig.apply(this, arguments); };
    });

    // ---- stand-in for the CEP bridge ----
    var base = location.href.split('?')[0].replace(/\/[^\/]*$/, '');
    window.__adobe_cep__ = {
        getHostEnvironment: function () { return JSON.stringify({ appName: 'AEFT', appVersion: '24.0.0', appLocale: 'en_US', appUILocale: 'en_US', appId: 'AEFT', isAppOnline: true }); },
        evalScript: function (script, cb) { var r = mock(script); if (typeof cb === 'function') { setTimeout(function () { cb(r); }, 40); } },
        getSystemPath: function () { return base; },
        addEventListener: function () { }, removeEventListener: function () { }, dispatchEvent: function () { },
        requestOpenExtension: function () { }, getExtensions: function () { return '[]'; }, getNetworkPreferences: function () { return '{}'; },
        initResourceBundle: function () { return '{}'; }, dumpInstallationInfo: function () { return ''; },
        getCurrentApiVersion: function () { return '{"major":11,"minor":0,"micro":0}'; }, invokeSync: function () { return ''; }, invokeAsync: function () { },
        getCurrentImsUserId: function () { return ''; }, closeExtension: function () { }, registerKeyEventsInterest: function () { },
        setWindowTitle: function () { }, getWindowTitle: function () { return 'Sougetsu Akira FX'; }, getScaleFactor: function () { return window.devicePixelRatio || 1; },
        getMonitorScaleFactor: function () { return window.devicePixelRatio || 1; }, setPanelFlyoutMenu: function () { }, setContextMenu: function () { },
        setContextMenuByJSON: function () { }, updateContextMenuItem: function () { }, updatePanelMenuItem: function () { }, getHostCapabilities: function () { return '{}'; },
        getOSInformation: function () { return navigator.platform || 'Web'; }, openURLInDefaultBrowser: function (u) { window.open(u, '_blank', 'noopener'); },
        resizeContent: function () { }, showAppDialog: function () { }
    };
    window.cep = window.cep || {
        fs: { readFile: function () { return { err: 1 }; }, writeFile: function () { return { err: 1 }; }, stat: function () { return { err: 1 }; }, readdir: function () { return { err: 1, data: [] }; }, makedir: function () { return { err: 1 }; }, showOpenDialog: function () { return { err: 1, data: [] }; }, showOpenDialogEx: function () { return { err: 1, data: [] }; }, showSaveDialogEx: function () { return { err: 1 }; } },
        util: { openURLInDefaultBrowser: function (u) { window.open(u, '_blank', 'noopener'); } },
        process: { createProcess: function () { return { err: 1 }; } }
    };

    // ---- the update / announcement checks point at the vendor's placeholder repo: skip them on the website ----
    var F = window.fetch;
    if (F) {
        window.fetch = function (u) {
            var url = typeof u === 'string' ? u : (u && u.url) || '';
            if (/YOUR-GITHUB-USER|raw\.githubusercontent\.com\/[^/]+\/sougetsu-akira-fx/.test(url)) { return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })); }
            return F.apply(this, arguments);
        };
    }

    // ---- hero tour: cycle through the main tabs ----
    if (TOUR) {
        var tabs = ['tools', 'fxpresets', 'shapes', 'text', 'colors', 'flow', 'sounds'], i = 0;
        window.addEventListener('load', function () {
            setInterval(function () { i = (i + 1) % tabs.length; try { if (typeof window.switchTab === 'function') { window.switchTab(tabs[i]); } } catch (e) { } }, 3200);
        });
    }
})();
