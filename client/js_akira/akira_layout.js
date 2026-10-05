/* Sougetsu Akira FX - vertical panel layout (default). The tool tabs become a rail down the left edge and the tools sit
 * beside it, so a tall, narrow AE panel shows more at once. Switch back with Settings > Layout or the companion's
 * Settings tab. Stored per machine in localStorage("akira_layout") = "vertical" | "horizontal". */
(function () {
    'use strict';
    var KEY = 'akira_layout';
    var css = document.createElement('style');
    css.id = 'akira-layout-css';
    css.textContent = [
        'body.akira-vertical{display:grid !important;grid-template-columns:44px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);column-gap:8px;align-content:stretch}',
        'body.akira-vertical>.top-section{grid-column:2;grid-row:1;min-width:0}',
        'body.akira-vertical>.content-area{grid-column:2;grid-row:2;min-width:0;min-height:0}',
        'body.akira-vertical>.tab-bar{grid-column:1;grid-row:1/span 2;align-self:start;display:flex !important;flex-direction:column;gap:4px;width:44px;height:auto !important;padding:4px;margin:0 !important;position:sticky;top:0}',
        'body.akira-vertical>.tab-bar>.tab-item{width:36px !important;height:34px !important;min-width:0;flex:0 0 auto;display:flex;align-items:center;justify-content:center}',
        '@media (max-width:240px){body.akira-vertical{grid-template-columns:36px minmax(0,1fr);column-gap:4px}body.akira-vertical>.tab-bar{width:36px;padding:2px}body.akira-vertical>.tab-bar>.tab-item{width:32px !important}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(css);
    function get() { try { return localStorage.getItem(KEY) || 'vertical'; } catch (e) { return 'vertical'; } }
    function set(mode) {
        try { localStorage.setItem(KEY, mode); } catch (e) { }
        apply();
    }
    function apply() {
        var ok = document.querySelector('body>.tab-bar') && document.querySelector('body>.content-area');
        document.body.classList.toggle('akira-vertical', !!ok && get() === 'vertical');
        try { window.dispatchEvent(new Event('resize')); } catch (e) { }
    }
    window.AkiraLayout = { get: get, set: set, apply: apply };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', apply); } else { apply(); }
})();
