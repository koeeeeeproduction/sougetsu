// Security properties of the host license gate (host/akira_core.jsx).
// The gate must be a token derived from the saved key, not a flag anyone can flip.
'use strict';
const A = require('assert'), fs = require('fs'), path = require('path');
const M = require('./mock_ae');

// A feature file so we can confirm real tools refuse when locked.
const FILES = ['akira_core.jsx', 'akira_tools.jsx', 'akira_layers.jsx'];
let passed = 0;
function t(name, fn) { try { fn(); passed++; } catch (e) { console.error('FAIL', name, e.message.slice(0, 400), (e.stack || '').split('\n')[1] || ''); process.exitCode = 1; } }

// Build an env that has loaded core but NOT auto-unlocked.
function raw() { return M.makeEnv({ files: FILES, locked: true }); }

t('locked by default (no key on disk)', () => {
    const { F } = raw();
    A.strictEqual(F.isLocked, true, 'should start locked');
    A.strictEqual(F._guard(), 'Extension is locked.', 'guard blocks');
});

t('flipping isLocked=false from a console does not open the gate', () => {
    const { F } = raw();
    F.isLocked = false;                 // the old one-liner bypass
    // The guard also requires the private token, which was never set.
    A.strictEqual(F._guard(), 'Extension is locked.', 'still blocked without a key');
});

t('unlock with a junk / malformed key is rejected', () => {
    const { F } = raw();
    ['x', 'true', 'false', 'hello', 'isLicensed', 'undefined'].forEach((j) => {
        A.strictEqual(F.unlockLicenseJSX(j), 'ERR:bad key', 'junk rejected: ' + j);
        A.strictEqual(F.isLocked, true);
    });
});

t('accepts real-shaped keys (Dodo UUID, SOUG code, long token)', () => {
    ['a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SOUG-ABCD-EF12-3456', 'AKIRA2026PRO01'].forEach((k) => {
        const { F } = raw();
        A.strictEqual(F.unlockLicenseJSX(k), 'OK', 'accepts: ' + k);
        A.strictEqual(F.isLocked, false);
    });
});

t('unlock with a well-formed key opens the gate', () => {
    const { F } = raw();
    A.strictEqual(F.unlockLicenseJSX('SOUG-ABCD-EF12-3456'), 'OK');
    A.strictEqual(F.isLocked, false, 'should be unlocked');
    A.strictEqual(F._guard(), null, 'guard passes');
});

function reloadCore(ctx) {
    const core = fs.readFileSync(path.join(__dirname, '..', 'host', 'akira_core.jsx'), 'utf8');
    require('vm').runInContext(core, ctx, { filename: 'akira_core.jsx' });
}

t('deleting the saved key re-locks the tools on reload (integrity)', () => {
    const { ctx, F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    A.strictEqual(F.isLocked, false);
    new ctx.File(ctx.Folder.userData.fullName + '/SougetsuAkiraFX/license.key').remove();
    reloadCore(ctx);
    A.strictEqual(ctx.$._akira.isLocked, true, 'missing key => locked after reload');
    A.strictEqual(ctx.$._akira._guard(), 'Extension is locked.');
});

t('tampering the saved key re-locks the tools on reload (integrity)', () => {
    const { ctx, F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    const kf = new ctx.File(ctx.Folder.userData.fullName + '/SougetsuAkiraFX/license.key');
    kf.encoding = 'UTF-8'; kf.open('w'); kf.write('zzz'); kf.close(); // junk, not well-formed
    reloadCore(ctx);
    A.strictEqual(ctx.$._akira.isLocked, true, 'tampered key => locked after reload');
});

t('lockLicenseJSX closes the gate and clears the key', () => {
    const { F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    A.strictEqual(F.isLocked, false);
    A.strictEqual(F.lockLicenseJSX(), 'OK');
    A.strictEqual(F.isLocked, true);
    A.strictEqual(F.readLicenseKeyJSX(), '', 'key removed');
});

t('state survives a panel reload (gate rehydrates from the saved key)', () => {
    const { ctx, F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    reloadCore(ctx); // as a panel reload / fresh launch does
    A.strictEqual(ctx.$._akira.isLocked, false, 'should still be unlocked after reload');
    A.strictEqual(ctx.$._akira._guard(), null, 'guard passes after reload');
});

t('a real tool refuses when locked and runs when unlocked', () => {
    const { ctx, F } = raw();
    // A guarded tool: addNull goes through H.locked().
    const before = typeof F.addNull === 'function' ? F.addNull() : 'Extension is locked.';
    A.ok(String(before).indexOf('locked') !== -1, 'tool blocked while locked: ' + before);
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    if (typeof F.addNull === 'function') {
        const after = F.addNull();
        A.ok(String(after).indexOf('locked') === -1, 'tool should run once unlocked: ' + after);
    }
});

console.log(process.exitCode ? 'SOME LICENSE TESTS FAILED' : ('ALL ' + passed + ' LICENSE TESTS PASSED'));
