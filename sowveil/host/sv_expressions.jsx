// Sowveil - Expressions: apply a generated expression to the selected properties (Auto) or to one
// transform property on every selected layer. The panel sends three variants of the code:
//   scalar (1D: rotation, opacity, sliders), vector (position / points), scale (2D/3D scale).
(function () {
    var SV = $._sv, U = SV._u;
    var TARGET = { position: "ADBE Position", scale: "ADBE Scale", rotation: "ADBE Rotate Z", opacity: "ADBE Opacity" };

    function pick(p, codes) {
        if (p.matchName === "ADBE Scale") { return codes.scale; }
        var v = null; try { v = p.value; } catch (e) { }
        return (v instanceof Array) ? codes.vector : codes.scalar;
    }
    SV.applyExpression = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var codes = a.codes || {}, target = U.str(a.target, "auto"), props = [], i, sp, ls;
        if (target === "auto") {
            sp = c.selectedProperties;
            for (i = 0; i < sp.length; i += 1) { if (sp[i].propertyType === PropertyType.PROPERTY && sp[i].canSetExpression) { props.push(sp[i]); } }
            if (!props.length) { target = U.str(a.fallback, "position"); }
        }
        if (!props.length) {
            ls = U.selected(c);
            if (!ls.length) { return U.fail("Select layers (or properties) first."); }
            for (i = 0; i < ls.length; i += 1) {
                try { var p = ls[i].property("ADBE Transform Group").property(TARGET[target]); if (p && p.canSetExpression) { props.push(p); } } catch (e) { }
            }
        }
        if (!props.length) { return U.fail("Nothing on the selection can take this expression."); }
        return U.run("Sowveil Expression · " + U.str(a.label, ""), function () {
            var n = 0, errs = 0;
            for (i = 0; i < props.length; i += 1) {
                var code = pick(props[i], codes);
                if (!code) { continue; }
                try { props[i].expression = code; n += 1; } catch (e2) { errs += 1; }
            }
            if (!n) { return U.fail("After Effects rejected the expression on every target."); }
            return U.ok({ message: U.str(a.label, "Expression") + " applied to " + n + " propert" + (n === 1 ? "y" : "ies") + (errs ? " (" + errs + " skipped)" : "") + "." });
        });
    };
})();
