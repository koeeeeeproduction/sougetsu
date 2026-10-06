/* Sougetsu Akira FX - docks the focus timer inside the Core Toolkit tab (no floating button).
 * The timer card from akira_timer.js is moved into a collapsible "FOCUS TIMER" section under the tool buttons;
 * the header shows the running time while it is collapsed. */
(function () {
    'use strict';
    var css = document.createElement('style');
    css.textContent = [
        '#akira-timer-fab{display:none !important}',
        '#akira-timer-root{position:static !important;display:none !important}',
        '#akt-dock{flex-shrink:0;margin:10px 0 4px;border:1px solid var(--glass-border,rgba(255,255,255,.08));border-radius:10px;background:rgba(255,255,255,.02);overflow:hidden}',
        '#akt-dock-head{display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;cursor:pointer;font-size:10px;font-weight:800;letter-spacing:1px;color:#bbb;user-select:none}',
        '#akt-dock-head .t{margin-left:auto;color:var(--primary,#00ff55);font-variant-numeric:tabular-nums;letter-spacing:0}',
        '#akt-dock-head .c{transition:transform .15s;opacity:.6}#akt-dock.open #akt-dock-head .c{transform:rotate(90deg)}',
        '#akt-dock #akira-timer-card{display:none !important;position:static !important;width:auto !important;border:0 !important;border-top:1px solid var(--glass-border,rgba(255,255,255,.08)) !important;border-radius:0 !important;box-shadow:none !important;background:transparent !important}',
        '#akt-dock.open #akira-timer-card{display:block !important}',
        '#akt-dock .akt-x{display:none}'
    ].join('\n');
    document.head.appendChild(css);
    var tries = 0;
    function dock() {
        var T = window.AkiraTimer, ui = T && T.ui, view = document.getElementById('view-tools');
        if (!ui || !view) { if (++tries < 60) { setTimeout(dock, 250); } return; }
        if (document.getElementById('akt-dock')) { return; }
        var box = document.createElement('div'); box.id = 'akt-dock';
        box.innerHTML = '<div id="akt-dock-head"><span class="c">▸</span>FOCUS TIMER<span class="t"></span></div>';
        var row = document.getElementById('layout-tool-row');
        if (row && row.parentNode === view) { view.insertBefore(box, row.nextSibling); } else { view.insertBefore(box, view.firstChild); }
        box.appendChild(ui.card);
        try { if (localStorage.getItem('akira_timer_dock_open') === '1') { box.classList.add('open'); } } catch (e) { }
        var head = document.getElementById('akt-dock-head'), t = head.querySelector('.t');
        head.addEventListener('click', function () { var o = box.classList.toggle('open'); try { localStorage.setItem('akira_timer_dock_open', o ? '1' : '0'); } catch (e) { } if (o) { ui.render(); } });
        function upd() { var c = T.core; t.textContent = c.running ? window.AkiraTimerLib.formatTime(c.remainingMs) + ' · ' + window.AkiraTimerLib.MODES[c.mode].label : ''; }
        T.core.on('change', upd); T.core.on('complete', function () { box.classList.add('open'); });
        setInterval(upd, 1000); upd();
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', dock); } else { dock(); }
})();
