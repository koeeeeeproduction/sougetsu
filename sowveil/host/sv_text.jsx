// Sowveil - Text Animation engine.
// A preset = a Text Animator holding the "hidden" look (opacity 0, offset, blur...) plus a Range
// Selector whose Offset sweeps across the text, so letters/words/lines reveal one after another.
// Pop / Drop / Rise also get a second "overshoot" animator with a Triangle selector riding the sweep.
(function () {
    var SV = $._sv, U = SV._u;
    var BASED = { chars: 1, charsNoSpace: 2, words: 3, lines: 4 };
    var SHAPE = { square: 1, rampUp: 2, rampDown: 3, triangle: 4 };

    function animator(L, name) {
        var an = L.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        an.name = U.TAG + " · " + name;
        return an;
    }
    function prop(an, matchName, value) {
        var p = an.property("ADBE Text Animator Properties").addProperty(matchName);
        if (value !== undefined) { p.setValue(value); }
        return p;
    }
    function selector(an, o) {
        var sels = an.property("ADBE Text Selectors"), sel = sels.numProperties ? sels.property(1) : sels.addProperty("ADBE Text Selector");
        var adv = sel.property("ADBE Text Range Advanced");
        try { adv.property("ADBE Text Range Units").setValue(1); } catch (e1) { }
        try { adv.property("ADBE Text Range Type2").setValue(o.based); } catch (e2) { }
        try { adv.property("ADBE Text Range Shape").setValue(o.shape); } catch (e3) { }
        try { adv.property("ADBE Text Levels Max Ease").setValue(o.easeHigh); } catch (e4) { }
        try { adv.property("ADBE Text Levels Min Ease").setValue(o.easeLow); } catch (e5) { }
        try { if (o.random) { adv.property("ADBE Text Randomize Order").setValue(1); } } catch (e6) { }
        return sel;
    }
    // hidden at t0 -> fully shown at t1
    function sweep(sel, o, t0, t1, influence) {
        var w = Math.max(1, Math.min(100, o.width)), off = sel.property("ADBE Text Percent Offset");
        sel.property("ADBE Text Percent Start").setValue(0);
        sel.property("ADBE Text Percent End").setValue(w);
        if (o.reverse) { U.key2(off, t0, 100, t1, -w, influence); } else { U.key2(off, t0, -w, t1, 100, influence); }
    }
    function blur(an, v) { prop(an, "ADBE Text Blur", [v, v]); }
    function pos(an, x, y) { prop(an, "ADBE Text Position 3D", [x, y, 0]); }
    function scale(an, s) { prop(an, "ADBE Text Scale 3D", [s, s, 100]); }
    function fade(an) { prop(an, "ADBE Text Opacity", 0); }

    // hidden state per preset. a = panel values, k = comp scale (1 at 1080p)
    var LOOK = {
        "fade-up": function (an, a, k) { fade(an); pos(an, 0, U.num(a.distance, 40) * k); },
        "hero-reveal": function (an, a, k) { fade(an); scale(an, U.num(a.scaleFrom, 60)); blur(an, U.num(a.blur, 14) * k); },
        "slide": function (an, a, k) {
            fade(an);
            var d = U.num(a.distance, 80) * k, dir = U.str(a.direction, "left");
            if (dir === "left") { pos(an, -d, 0); } else if (dir === "right") { pos(an, d, 0); } else if (dir === "up") { pos(an, 0, d); } else { pos(an, 0, -d); }
        },
        "blur-in": function (an, a, k) { fade(an); blur(an, U.num(a.blur, 20) * k); },
        "letter-rise": function (an, a, k) { fade(an); pos(an, 0, U.num(a.distance, 50) * k); scale(an, U.num(a.scaleFrom, 70)); blur(an, U.num(a.blur, 8) * k); },
        "word-stagger": function (an, a, k) { fade(an); pos(an, 0, U.num(a.distance, 30) * k); blur(an, U.num(a.blur, 10) * k); },
        "pop": function (an) { fade(an); scale(an, 0); },
        "drop-in": function (an, a, k) { fade(an); pos(an, 0, -U.num(a.distance, 90) * k); },
        "spin-in": function (an, a, k) { fade(an); prop(an, "ADBE Text Rotation", U.num(a.angle, 90)); pos(an, 0, U.num(a.distance, 20) * k); },
        "skew-in": function (an, a, k) { fade(an); prop(an, "ADBE Text Skew", U.num(a.skew, 35)); pos(an, U.num(a.distance, 60) * k, 0); },
        "tracking-in": function (an, a, k) { fade(an); prop(an, "ADBE Text Tracking Amount", U.num(a.tracking, 400)); },
        "typewriter": function (an) { fade(an); },
        "scramble": function (an, a) { prop(an, "ADBE Text Character Offset", Math.round(U.num(a.chaos, 12))); fade(an); },
        "color-sweep": function (an, a) { prop(an, "ADBE Text Fill Color", U.hex(a.color, [0.43, 0.36, 1])); }
    };
    var OVERSHOOT = { "pop": "scale", "drop-in": "lift", "letter-rise": "lift" };

    SV.textAnimate = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var id = U.str(a.preset, "fade-up"), look = LOOK[id], ls = U.selected(c), targets = [], i;
        if (!look) { return U.fail("Unknown text preset."); }
        for (i = 0; i < ls.length; i += 1) { if (ls[i] instanceof TextLayer) { targets.push(ls[i]); } }
        if (!targets.length) { return U.fail("Select one or more text layers."); }
        var dur = Math.max(c.frameDuration, U.num(a.duration, 1)), influence = U.num(a.ease, 75), k = c.height / 1080;
        var order = U.str(a.order, "forward"), label = U.str(a.label, id);
        var o = {
            based: BASED[U.str(a.basedOn, "chars")] || 1, width: U.num(a.stagger, 40), reverse: order === "backward", random: order === "random",
            shape: order === "backward" ? SHAPE.rampDown : SHAPE.rampUp, easeHigh: U.num(a.smooth, 50), easeLow: U.num(a.smooth, 50)
        };
        if (id === "typewriter") { o.width = 1; o.easeHigh = 0; o.easeLow = 0; influence = 0.1; }
        if (id === "hero-reveal" && U.str(a.basedOn, "") === "") { o.based = BASED.words; }
        if (id === "tracking-in") { o.based = BASED.lines; o.width = 100; }
        return U.run("Sowveil Text · " + label, function () {
            for (i = 0; i < targets.length; i += 1) {
                var L = targets[i], t0 = U.str(a.start, "playhead") === "layer" ? L.inPoint : c.time, t1 = t0 + dur;
                var an = animator(L, label);
                look(an, a, k);
                sweep(selector(an, o), o, t0, t1, influence);
                if (OVERSHOOT.hasOwnProperty(id) && U.bool(a.overshoot, true)) {
                    var amt = U.num(a.overshootAmt, 20), b = animator(L, label + " overshoot");
                    if (OVERSHOOT[id] === "scale") { scale(b, 100 + amt); } else { pos(b, 0, -amt * k); }
                    var o2 = { based: o.based, width: Math.max(o.width, 20), reverse: o.reverse, random: o.random, shape: SHAPE.triangle, easeHigh: 0, easeLow: 0 };
                    sweep(selector(b, o2), o2, t0, t1, influence);
                }
            }
            return U.ok({ message: label + " applied to " + targets.length + " text layer" + (targets.length === 1 ? "" : "s") + "." });
        });
    };

    SV.addText = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        return U.run("Sowveil Text Layer", function () {
            var T = c.layers.addText(U.str(a.text, "Sowveil")), td = T.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value;
            d.fontSize = Math.round(110 * c.height / 1080); d.fillColor = [1, 1, 1]; d.applyFill = true; d.applyStroke = false;
            d.justification = ParagraphJustification.CENTER_JUSTIFY; td.setValue(d);
            T.transform.position.setValue([c.width / 2, c.height / 2 + d.fontSize * 0.35]);
            var all = c.selectedLayers, i; for (i = 0; i < all.length; i += 1) { all[i].selected = false; }
            T.selected = true;
            return U.ok({ message: "Text layer added - now apply an animation." });
        });
    };
})();
