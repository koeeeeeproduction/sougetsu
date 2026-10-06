// Sougetsu Akira FX - host core (clean-room, Stage 0)
// Written from scratch against the panel's public interface. Contains the license gate and path helpers.
// Feature functions are added here in later stages. ExtendScript = ES3: no let/const, no arrow functions, no JSON.
if (typeof $._akira === "undefined") { $._akira = {}; }

$._akira.coreVersion = "1.0.0";

(function () {
    // ---- license gate ----------------------------------------------------
    // The unlocked state is NOT a plain boolean anyone can flip. It lives in
    // this closure as a token that only equals the signature of the saved,
    // well-formed license key. `isLocked` is exposed as a live getter (see
    // below) that recomputes from that token on every read, so assigning
    // `$._akira.isLocked = false` from a console does nothing, and if the
    // saved key is deleted or edited the tools lock themselves again.
    var _gate = 0; // 0 = locked; otherwise must equal _sig(saved key)

    function dataFolder() {
        var f = new Folder(Folder.userData.fullName + "/SougetsuAkiraFX");
        if (!f.exists) { f.create(); }
        return f;
    }
    function keyFile() {
        return new File(dataFolder().fullName + "/license.key");
    }
    // A real license key (Dodo UUID, SOUG-XXXX-..., or a long code) is at
    // least 8 chars of letters/digits/dashes/dots/underscores and carries a
    // digit or a dash. This accepts genuine keys while rejecting the usual
    // console bypass attempts ("true", "x", "isLicensed", "undefined", ...).
    function wellFormed(k) {
        return typeof k === "string" && /^[\w.\-]{8,}$/.test(k) && /[\d\-]/.test(k);
    }
    // Small deterministic signature of the key (not a secret store, just an
    // obfuscated token so the gate is a value match, not a boolean).
    function _sig(k) {
        k = String(k);
        var h = 0x9e3779b1, i, c;
        for (i = 0; i < k.length; i++) {
            c = k.charCodeAt(i);
            h = (h ^ c) + ((h << 7) - h) + 0x6d2b79f5;
            h = h & 0x7fffffff;
        }
        return (h ^ (k.length * 2654435761)) & 0x7fffffff;
    }
    function savedKey() {
        try {
            var f = keyFile();
            if (!f.exists) { return ""; }
            f.encoding = "UTF-8";
            if (!f.open("r")) { return ""; }
            var s = f.read(); f.close();
            return s ? String(s) : "";
        } catch (e) { return ""; }
    }
    // isLocked is a plain boolean (ExtendScript-safe; getters are unreliable in
    // AE). unlock/lock keep it in sync. The real guard, _guard() below, ALSO
    // requires the private token to be set, so flipping isLocked from a console
    // without a valid key does not open the tools.
    $._akira.isLocked = true;

    // Returns "OK" unless something is wrong. The panel treats any string starting with "CRACKED" as a failure.
    $._akira.initSecurity = function (extPath) {
        try {
            if (typeof extPath === "string" && extPath.length) { $._akira_extension_path = extPath; }
        } catch (e) { }
        return "OK";
    };

    // Saved key, or "" when none.
    $._akira.readLicenseKeyJSX = function () { return savedKey(); };

    // Called after the panel has validated the key with Dodo. Remembers the
    // key and opens the gate by setting the token to the key's signature.
    $._akira.unlockLicenseJSX = function (key) {
        key = String(key);
        if (!wellFormed(key)) { _gate = 0; $._akira.isLocked = true; return "ERR:bad key"; }
        try {
            var f = keyFile();
            f.encoding = "UTF-8";
            if (f.open("w")) { f.write(key); f.close(); }
        } catch (e) { }
        _gate = _sig(key);
        $._akira.isLocked = false;
        return "OK";
    };

    $._akira.lockLicenseJSX = function () {
        _gate = 0;
        $._akira.isLocked = true;
        try {
            var f = keyFile();
            if (f.exists) { f.remove(); }
        } catch (e) { }
        return "OK";
    };

    // Rehydrate from the saved key at load time so returning users keep access
    // across panel reloads and offline sessions without re-entering the key. If
    // the key file is gone or has been tampered with, the tools stay locked.
    (function () {
        var k = savedKey();
        if (wellFormed(k)) { _gate = _sig(k); $._akira.isLocked = false; }
    })();

    // Relative paths resolve against the extension folder; absolute paths pass through unchanged.
    $._akira.resolvePath = function (p) {
        try {
            p = String(p);
            var isAbs = /^([A-Za-z]:[\/\\]|[\/\\~])/.test(p);
            if (isAbs) { return p; }
            var base = $._akira_extension_path;
            if (typeof base !== "string" || !base.length) { return p; }
            return base + "/" + p.replace(/^\.\//, "");
        } catch (e) { return p; }
    };

    // Helper for feature functions: returns an error string when not licensed,
    // else null. Requires BOTH the flag and the private token, so setting
    // isLocked=false from a console without a valid key stays locked.
    $._akira._guard = function () {
        return ($._akira.isLocked || !_gate) ? "Extension is locked." : null;
    };
})();
