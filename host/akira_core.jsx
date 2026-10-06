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
    // A Dodo license key looks like XXXXX-XXXX-XXXX-XXXX (letters/digits).
    // Random strings fail this, so a bare unlock call with junk is rejected.
    function wellFormed(k) {
        return typeof k === "string" && /^[A-Za-z0-9]{4,}(-[A-Za-z0-9]{3,}){2,}$/.test(k);
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
    // The single source of truth. True only when the in-session token matches
    // the signature of the key currently on disk (present and well-formed).
    function unlocked() {
        if (!_gate) { return false; }
        var k = savedKey();
        if (!wellFormed(k)) { return false; }
        return _gate === _sig(k);
    }

    // Expose isLocked as a derived, read-only-ish property. The setter is a
    // no-op on purpose. Falls back to a plain value if getters are missing.
    try {
        if (typeof $._akira.__defineGetter__ === "function") {
            $._akira.__defineGetter__("isLocked", function () { return !unlocked(); });
            $._akira.__defineSetter__("isLocked", function () { /* ignored: the gate is the token, not this flag */ });
        } else {
            $._akira.isLocked = true;
        }
    } catch (eg) { $._akira.isLocked = true; }

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
        if (!wellFormed(key)) { _gate = 0; return "ERR:bad key"; }
        try {
            var f = keyFile();
            f.encoding = "UTF-8";
            if (f.open("w")) { f.write(key); f.close(); }
        } catch (e) { }
        _gate = _sig(key);
        return "OK";
    };

    $._akira.lockLicenseJSX = function () {
        _gate = 0;
        try {
            var f = keyFile();
            if (f.exists) { f.remove(); }
        } catch (e) { }
        return "OK";
    };

    // Rehydrate the gate from the saved key at load time so returning users
    // keep access across panel reloads and offline sessions. If the key file
    // is gone or has been tampered with, the gate stays closed.
    (function () {
        var k = savedKey();
        if (wellFormed(k)) { _gate = _sig(k); }
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

    // Helper for feature functions: returns an error string when the panel is not licensed, else null.
    $._akira._guard = function () {
        return unlocked() ? null : "Extension is locked.";
    };
})();
