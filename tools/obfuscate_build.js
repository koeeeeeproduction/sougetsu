#!/usr/bin/env node
/* Obfuscate the panel JavaScript of an assembled CEP build in place.
 *
 * Usage: node tools/obfuscate_build.js <client-dir>
 *
 * This runs on a COPY (the dist/ build), never on the source tree. It replaces
 * the plain base64 wrapping of client/js_akira/*.js (base64 is only encoding,
 * not protection) with real obfuscation, and obfuscates our own plain panel
 * scripts. Vendor libraries, JSON and the host ExtendScript are left untouched:
 *   - CSInterface.js / lib/* are third-party; obfuscating them buys nothing and
 *     risks breaking the CEP bridge.
 *   - host/*.jsx is ES3 (ExtendScript); this obfuscator emits ES5+, so it is
 *     left readable. The host is protected by the license gate, not by hiding.
 *
 * Needs the dev dependency:  npm install javascript-obfuscator
 */
'use strict';
const fs = require('fs');
const path = require('path');

let Obf;
try { Obf = require('javascript-obfuscator'); }
catch (e) {
    console.error('[obfuscate] javascript-obfuscator not installed — run `npm install javascript-obfuscator`. Skipping.');
    process.exit(2);
}

const clientDir = process.argv[2];
if (!clientDir || !fs.existsSync(clientDir)) {
    console.error('[obfuscate] usage: node tools/obfuscate_build.js <client-dir>');
    process.exit(1);
}

// Our panel scripts are injected as separate <script> elements and share
// top-level globals (switchTab, run, AkiraI18n, ...). renameGlobals MUST stay
// false or those cross-script references break.
const OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.6,
    deadCodeInjection: false,
    renameGlobals: false,
    identifierNamesGenerator: 'hexadecimal',
    numbersToExpressions: true,
    simplify: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    splitStrings: true,
    splitStringsChunkLength: 10,
    selfDefending: false,          // selfDefending breaks when wrapped/eval'd by the atob loader
    target: 'browser',
    sourceMap: false
};

// Vendor / non-ours: never obfuscate.
const SKIP = /(^CSInterface\.js$|\.min\.js$)/i;

// The uniform loader wrapper used across js_akira: base64 is just UTF-8 text.
const WRAP_RE = /^\(function\(\)\{var s=document\.createElement\("script"\);s\.text=decodeURIComponent\(escape\(atob\("([A-Za-z0-9+/=]+)"\)\)\);document\.head\.appendChild\(s\);\}\)\(\);?\s*$/;

function obfuscate(code, label) {
    return Obf.obfuscate(code, OPTIONS).getObfuscatedCode();
}

function wrap(code) {
    const b64 = Buffer.from(code, 'utf8').toString('base64');
    return '(function(){var s=document.createElement("script");s.text=decodeURIComponent(escape(atob("'
        + b64 + '")));document.head.appendChild(s);})();';
}

let wrapped = 0, plain = 0, skipped = 0, failed = 0;
const jsDir = path.join(clientDir, 'js_akira');
if (!fs.existsSync(jsDir)) { console.error('[obfuscate] no js_akira in', clientDir); process.exit(1); }

for (const name of fs.readdirSync(jsDir)) {
    if (!name.endsWith('.js')) continue;
    if (SKIP.test(name)) { skipped++; continue; }
    const file = path.join(jsDir, name);
    const src = fs.readFileSync(file, 'utf8');
    try {
        const m = src.trim().match(WRAP_RE);
        if (m) {
            const payload = Buffer.from(m[1], 'base64').toString('utf8');
            fs.writeFileSync(file, wrap(obfuscate(payload, name)));
            wrapped++;
        } else {
            fs.writeFileSync(file, obfuscate(src, name));
            plain++;
        }
    } catch (e) {
        console.error('[obfuscate] FAILED', name, '-', e.message.split('\n')[0]);
        failed++;
    }
}

console.log('[obfuscate] js_akira: ' + wrapped + ' payloads + ' + plain + ' plain obfuscated, '
    + skipped + ' vendor skipped' + (failed ? (', ' + failed + ' FAILED') : ''));
process.exit(failed ? 1 : 0);
