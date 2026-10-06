/* Sougetsu Akira FX - panel orientation switch. The vertical layout itself is pure CSS (css_akira/akira_layout.css) and is
 * the default; choosing "horizontal" in Settings > Layout just adds body.akira-horizontal.
 * Stored per machine in localStorage("akira_panel_orientation") = "vertical" | "horizontal". */
(function () {
    'use strict';
    var KEY = 'akira_panel_orientation';
    function get() { try { return localStorage.getItem(KEY) === 'horizontal' ? 'horizontal' : 'vertical'; } catch (e) { return 'vertical'; } }
    function apply() { if (document.body) { document.body.classList.toggle('akira-horizontal', get() === 'horizontal'); } try { window.dispatchEvent(new Event('resize')); } catch (e) { } }
    function set(mode) { try { localStorage.setItem(KEY, mode === 'horizontal' ? 'horizontal' : 'vertical'); } catch (e) { } apply(); }
    window.AkiraLayout = { get: get, set: set, apply: apply };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', apply); } else { apply(); }
})();
