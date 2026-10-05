// Sougetsu Akira FX - shared JSON helpers for ExtendScript (ES3 has no JSON object). Loaded right after akira_tools.jsx.
//   H.parseJSON(text) -> value (throws Error on malformed input; never evals the text)
//   H.toJSON(value)   -> string
//   H.readJSONFile(path) -> value or null
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var H = $._akira._h;
    if (!H) { return; }

    function parseJSON(src) {
        var s = String(src), i = 0, n = s.length;
        function fail(msg) { throw new Error("Bad JSON (" + msg + ") at " + i); }
        function ws() { while (i < n) { var c = s.charCodeAt(i); if (c === 32 || c === 10 || c === 13 || c === 9) { i += 1; } else { break; } } }
        function str() {
            var out = [], start;
            i += 1; start = i;
            while (i < n) {
                var c = s.charAt(i);
                if (c === '"') { out.push(s.substring(start, i)); i += 1; return out.join(""); }
                if (c === "\\") {
                    out.push(s.substring(start, i));
                    var e = s.charAt(i + 1);
                    if (e === "u") { out.push(String.fromCharCode(parseInt(s.substr(i + 2, 4), 16))); i += 6; }
                    else { out.push(e === "n" ? "\n" : e === "r" ? "\r" : e === "t" ? "\t" : e === "b" ? "\b" : e === "f" ? "\f" : e); i += 2; }
                    start = i;
                } else { i += 1; }
            }
            fail("unterminated string");
        }
        function num() {
            var start = i;
            while (i < n && "+-0123456789.eE".indexOf(s.charAt(i)) !== -1) { i += 1; }
            var v = parseFloat(s.substring(start, i));
            if (isNaN(v)) { fail("number"); }
            return v;
        }
        function val() {
            ws();
            var c = s.charAt(i);
            if (c === "{") {
                var o = {}; i += 1; ws();
                if (s.charAt(i) === "}") { i += 1; return o; }
                while (true) {
                    ws(); if (s.charAt(i) !== '"') { fail("key"); }
                    var k = str(); ws();
                    if (s.charAt(i) !== ":") { fail(":"); } i += 1;
                    o[k] = val(); ws();
                    if (s.charAt(i) === ",") { i += 1; continue; }
                    if (s.charAt(i) === "}") { i += 1; return o; }
                    fail("object");
                }
            }
            if (c === "[") {
                var a = []; i += 1; ws();
                if (s.charAt(i) === "]") { i += 1; return a; }
                while (true) {
                    a.push(val()); ws();
                    if (s.charAt(i) === ",") { i += 1; continue; }
                    if (s.charAt(i) === "]") { i += 1; return a; }
                    fail("array");
                }
            }
            if (c === '"') { return str(); }
            if (s.substr(i, 4) === "true") { i += 4; return true; }
            if (s.substr(i, 5) === "false") { i += 5; return false; }
            if (s.substr(i, 4) === "null") { i += 4; return null; }
            return num();
        }
        var v = val(); ws();
        if (i < n) { fail("trailing data"); }
        return v;
    }

    function toJSON(v) {
        var t = typeof v, i, out, k;
        if (v === null || v === undefined) { return "null"; }
        if (t === "number") { return isFinite(v) ? String(v) : "0"; }
        if (t === "boolean") { return v ? "true" : "false"; }
        if (t === "string") { return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"'; }
        if (v instanceof Array) { out = []; for (i = 0; i < v.length; i += 1) { out.push(toJSON(v[i])); } return "[" + out.join(",") + "]"; }
        out = []; for (k in v) { if (v.hasOwnProperty(k)) { out.push(toJSON(k) + ":" + toJSON(v[k])); } } return "{" + out.join(",") + "}";
    }

    function readJSONFile(path) {
        var f = new File(String(path));
        if (!f.exists) { return null; }
        f.encoding = "UTF-8";
        if (!f.open("r")) { return null; }
        var txt = f.read(); f.close();
        return parseJSON(txt);
    }

    H.parseJSON = parseJSON;
    H.toJSON = toJSON;
    H.readJSONFile = readJSONFile;
})();
