/* Sowveil - boot. */
(function () {
    'use strict';
    function start() { window.SV.boot(); }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start); } else { start(); }
})();
