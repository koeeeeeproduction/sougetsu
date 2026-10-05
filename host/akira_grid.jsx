// Sougetsu Akira FX - Akira Grid (own design, replaces the native grid plug-in the panel used to need).
//   $._akira.akiraGrid("cols|rows|width|height|border|opacity|marker") -> "OK:layerName" / "ERR:msg"
// Builds a framing-guide shape layer: column/row lines run out to the frame edges, a plus marker on every
// corner point. Everything is driven by expressions on the layer's own Effect Controls (Columns, Rows, Width,
// Height, Border, Marker Size, Opacity, Color, Track Layer), so it stays editable after it is applied.
// ES3 only (code inside expression strings may use modern JS).
if (typeof $._akira === "undefined") { $._akira = {}; }

(function () {
    var F = $._akira, H = F._h;
    if (!H) { return; }
    var NAME = "Akira Grid";

    function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
    function fx(L, type, name, v) { var e = L.property("ADBE Effect Parade").addProperty(type); e.name = name; if (v !== undefined) { e.property(1).setValue(v); } return e; }
    var BW = "var b=effect(\"Border\")(1);b<=0?Math.max(2,Math.round(thisComp.width/640)):b";
    var COLS = "Math.max(1,Math.round(effect(\"Columns\")(1)))", ROWS = "Math.max(1,Math.round(effect(\"Rows\")(1)))";

    function line(ct, name, pathExpr) {
        var p = ct.addProperty("ADBE Vector Shape - Group");
        p.name = name;
        p.property("ADBE Vector Shape").expression = pathExpr;
        return p;
    }
    function stroke(ct, widthExpr) {
        var s = ct.addProperty("ADBE Vector Graphic - Stroke");
        s.property("ADBE Vector Stroke Color").expression = "effect(\"Color\")(1)";
        s.property("ADBE Vector Stroke Width").expression = widthExpr;
        try { s.property("ADBE Vector Stroke Line Cap").setValue(1); } catch (e) { }
        return s;
    }
    function repeater(ct, copiesExpr, posExpr) {
        var r = ct.addProperty("ADBE Vector Filter - Repeater"), t = r.property("ADBE Vector Repeater Transform");
        r.property("ADBE Vector Repeater Copies").expression = copiesExpr;
        r.property("ADBE Vector Repeater Offset").setValue(0);
        t.property("ADBE Vector Repeater Position").expression = posExpr;
        try { t.property("ADBE Vector Repeater Anchor").setValue([0, 0]); } catch (e) { }
        return r;
    }
    function group(root, name, posExpr) {
        var g = root.addProperty("ADBE Vector Group");
        g.name = name;
        g.property("ADBE Vector Transform Group").property("ADBE Vector Position").expression = posExpr;
        return g.property("ADBE Vectors Group");
    }

    F.akiraGrid = function (cfg) {
        var g = H.locked(); if (g) { return g; }
        var comp = H.activeComp();
        if (!comp) { return "ERR:Open a composition first."; }
        var p = String(cfg || "").split("|"), sel = comp.selectedLayers, target = (sel && sel.length === 1) ? sel[0] : null;
        var c = { cols: Math.max(1, Math.round(num(p[0], 1))), rows: Math.max(1, Math.round(num(p[1], 1))), w: Math.max(1, num(p[2], 250)), h: Math.max(1, num(p[3], 250)),
            border: Math.max(0, num(p[4], 3)), opacity: Math.max(0, Math.min(100, num(p[5], 100))), marker: Math.max(0, num(p[6], 22)) };
        app.beginUndoGroup(NAME);
        try {
            var L = comp.layers.addShape(), root = L.property("ADBE Root Vectors Group"), tr = L.property("ADBE Transform Group"), ct;
            L.name = NAME; L.label = 2;
            fx(L, "ADBE Slider Control", "Columns", c.cols);
            fx(L, "ADBE Slider Control", "Rows", c.rows);
            fx(L, "ADBE Slider Control", "Width", c.w);
            fx(L, "ADBE Slider Control", "Height", c.h);
            fx(L, "ADBE Slider Control", "Border", c.border);
            fx(L, "ADBE Slider Control", "Marker Size", c.marker);
            fx(L, "ADBE Slider Control", "Opacity", c.opacity);
            fx(L, "ADBE Color Control", "Color", [1, 1, 1, 1]);
            var tl = fx(L, "ADBE Layer Control", "Track Layer");

            // vertical lines, one per column edge, full frame height
            ct = group(root, "Columns", "[-" + COLS + "*effect(\"Width\")(1)/2,0]");
            line(ct, "Line", "var k=thisComp.height*4;createPath([[0,-k],[0,k]],[],[],false)");
            stroke(ct, BW);
            repeater(ct, COLS + "+1", "[effect(\"Width\")(1),0]");
            // horizontal lines, one per row edge, full frame width
            ct = group(root, "Rows", "[0,-" + ROWS + "*effect(\"Height\")(1)/2]");
            line(ct, "Line", "var k=thisComp.width*4;createPath([[-k,0],[k,0]],[],[],false)");
            stroke(ct, BW);
            repeater(ct, ROWS + "+1", "[0,effect(\"Height\")(1)]");
            // plus markers on every corner point
            ct = group(root, "Corner Points", "[-" + COLS + "*effect(\"Width\")(1)/2,-" + ROWS + "*effect(\"Height\")(1)/2]");
            line(ct, "H", "var m=effect(\"Marker Size\")(1)/2;createPath([[-m,0],[m,0]],[],[],false)");
            line(ct, "V", "var m=effect(\"Marker Size\")(1)/2;createPath([[0,-m],[0,m]],[],[],false)");
            stroke(ct, "(" + BW + ")*2");
            repeater(ct, COLS + "+1", "[effect(\"Width\")(1),0]");
            repeater(ct, ROWS + "+1", "[0,effect(\"Height\")(1)]");
            // hide markers when Marker Size is 0
            root.property(3).property("ADBE Vector Transform Group").property("ADBE Vector Group Opacity").expression = "effect(\"Marker Size\")(1)>0?100:0";

            tr.property("ADBE Anchor Point").setValue([0, 0]);
            tr.property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);
            tr.property("ADBE Position").expression =
                "var t=null;try{t=effect(\"Track Layer\")(1);}catch(e){}\n" +
                "if(t&&t.index!=index){var r=t.sourceRectAtTime(time,false);t.toComp([r.left+r.width/2,r.top+r.height/2]);}else value;";
            tr.property("ADBE Opacity").expression = "Math.max(0,Math.min(100,effect(\"Opacity\")(1)))";
            if (target) {
                try { tl.property(1).setValue(target.index); } catch (e1) { }
                try { L.moveBefore(target); } catch (e2) { }
            }
            try { var i; for (i = 1; i <= comp.numLayers; i += 1) { comp.layer(i).selected = false; } L.selected = true; } catch (e3) { }
            app.endUndoGroup();
            return "OK:" + L.name;
        } catch (err) {
            app.endUndoGroup();
            return "ERR:" + (err && err.message ? err.message : err);
        }
    };
})();
