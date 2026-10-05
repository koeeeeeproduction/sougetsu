// Sougetsu Akira FX - host core (clean-room, Stage 0)
// Written from scratch against the panel's public interface. Contains the license gate and path helpers.
// Feature functions are added here in later stages. ExtendScript = ES3: no let/const, no arrow functions, no JSON.
if (typeof $._flex === "undefined") { $._flex = {}; }

$._flex.coreVersion = "9.2.2-stage0";
$._flex.isLocked = true; // the panel calls unlockLicenseJSX after Dodo validates the key

(function () {
    function dataFolder() {
        var f = new Folder(Folder.userData.fullName + "/SougetsuAkiraFX");
        if (!f.exists) { f.create(); }
        return f;
    }
    function keyFile() {
        return new File(dataFolder().fullName + "/license.key");
    }

    // Returns "OK" unless something is wrong. The panel treats any string starting with "CRACKED" as a failure.
    $._flex.initSecurity = function (extPath) {
        try {
            if (typeof extPath === "string" && extPath.length) { $._flex_extension_path = extPath; }
        } catch (e) { }
        return "OK";
    };

    // Saved key, or "" when none.
    $._flex.readLicenseKeyJSX = function () {
        try {
            var f = keyFile();
            if (!f.exists) { return ""; }
            f.encoding = "UTF-8";
            if (!f.open("r")) { return ""; }
            var s = f.read();
            f.close();
            return s ? String(s) : "";
        } catch (e) { return ""; }
    };

    // Called after the panel has validated the key with Dodo. Remembers the key and opens the gate.
    $._flex.unlockLicenseJSX = function (key) {
        try {
            var f = keyFile();
            f.encoding = "UTF-8";
            if (f.open("w")) { f.write(String(key)); f.close(); }
        } catch (e) { }
        $._flex.isLocked = false;
        return "OK";
    };

    $._flex.lockLicenseJSX = function () {
        try {
            var f = keyFile();
            if (f.exists) { f.remove(); }
        } catch (e) { }
        $._flex.isLocked = true;
        return "OK";
    };

    // Relative paths resolve against the extension folder; absolute paths pass through unchanged.
    $._flex.resolvePath = function (p) {
        try {
            p = String(p);
            var isAbs = /^([A-Za-z]:[\/\\]|[\/\\~])/.test(p);
            if (isAbs) { return p; }
            var base = $._flex_extension_path;
            if (typeof base !== "string" || !base.length) { return p; }
            return base + "/" + p.replace(/^\.\//, "");
        } catch (e) { return p; }
    };

    // Helper for feature functions: returns an error string when the panel is not licensed, else null.
    $._flex._guard = function () {
        return $._flex.isLocked ? "Extension is locked." : null;
    };
})();
