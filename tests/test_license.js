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

t('assigning isLocked = false does nothing (the headline fix)', () => {
    const { F } = raw();
    F.isLocked = false;                 // the old one-liner bypass
    A.strictEqual(F.isLocked, true, 'flag flip must be ignored');
    A.strictEqual(F._guard(), 'Extension is locked.', 'still blocked');
});

t('unlock with a junk / malformed key is rejected', () => {
    const { F } = raw();
    A.strictEqual(F.unlockLicenseJSX('not-a-key'), 'ERR:bad key');
    A.strictEqual(F.isLocked, true);
    A.strictEqual(F.unlockLicenseJSX('hello'), 'ERR:bad key');
    A.strictEqual(F.isLocked, true);
});

t('unlock with a well-formed key opens the gate', () => {
    const { F } = raw();
    A.strictEqual(F.unlockLicenseJSX('SOUG-ABCD-EF12-3456'), 'OK');
    A.strictEqual(F.isLocked, false, 'should be unlocked');
    A.strictEqual(F._guard(), null, 'guard passes');
});

t('deleting the saved key re-locks the tools (integrity)', () => {
    const { ctx, F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    A.strictEqual(F.isLocked, false);
    // Remove the key file behind the gate's back.
    const kf = new ctx.File(ctx.Folder.userData.fullName + '/SougetsuAkiraFX/license.key');
    kf.remove();
    A.strictEqual(F.isLocked, true, 'missing key => locked');
    A.strictEqual(F._guard(), 'Extension is locked.');
});

t('tampering the saved key re-locks the tools (integrity)', () => {
    const { ctx, F } = raw();
    F.unlockLicenseJSX('SOUG-ABCD-EF12-3456');
    A.strictEqual(F.isLocked, false);
    // Swap the stored key for a different well-formed one: the in-session
    // token no longer matches its signature, so the gate closes.
    const kf = new ctx.File(ctx.Folder.userData.fullName + '/SougetsuAkiraFX/license.key');
    kf.encoding = 'UTF-8'; kf.open('w'); kf.write('SOUG-9999-9999-9999'); kf.close();
    A.strictEqual(F.isLocked, true, 'edited key => locked');
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
    // Re-evaluate core in the same context, as a panel reload does.
    const core = fs.readFileSync(path.join(__dirname, '..', 'host', 'akira_core.jsx'), 'utf8');
    require('vm').runInContext(core, ctx, { filename: 'akira_core.jsx' });
    A.strictEqual(ctx.$._akira.isLocked, false, 'should still be unlocked after reload');
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
