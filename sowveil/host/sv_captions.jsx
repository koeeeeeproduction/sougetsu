// Sowveil - Captions builder. One tidy "Sowveil Captions" text layer: Source Text holds each caption,
// a word highlight animator follows the speech, an optional pop/fade in, and an optional box layer
// that sizes itself to the text. Word timings come from the panel (Whisper transcription).
(function () {
    var SV = $._sv, U = SV._u;

    function q(s) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }
    function arr(list) { return "[" + list.join(",") + "]"; }
    function r3(n) { return String(Math.round(n * 1000) / 1000); }

    // what the panel needs to transcribe the selected layer
    SV.mediaInfo = function () {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var ls = U.selected(c), i;
        for (i = 0; i < ls.length; i += 1) {
            var L = ls[i];
            try {
                if (L.source && L.source.file && L.source.file.exists) {
                    return U.ok({ path: U.plain(L.source.file), name: L.name, startTime: L.startTime, inPoint: L.inPoint, outPoint: L.outPoint, stretch: L.stretch });
                }
            } catch (e) { }
        }
        return U.fail("Select a video or audio layer (footage with a file).");
    };
    SV.pickFile = function (a) {
        var f = File.openDialog(U.str(a && a.prompt, "Choose a file"));
        return f ? U.ok({ path: U.plain(f), name: f.name }) : U.fail("cancelled");
    };

    // a.blocks = [{ text, start, end, words: [start, start, ...] }]  (seconds, media time)
    SV.buildCaptions = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var blocks = a.blocks || [], st = a.style || {};
        if (!blocks.length) { return U.fail("Nothing to build - transcribe first."); }
        var off = U.num(a.offset, 0), k = c.height / 1080, i, j;
        return U.run("Sowveil Captions", function () {
            var name = U.uniqueName(c, "Sowveil Captions");
            var T = c.layers.addText(" "); T.name = name; U.tag(T);
            var sp = T.property("ADBE Text Properties").property("ADBE Text Document"), d = sp.value;
            try { d.font = U.str(st.font, "Arial-BoldMT"); } catch (eF) { }
            d.fontSize = Math.round(U.num(st.size, 64) * k);
            d.fillColor = U.hex(st.color, [1, 1, 1]); d.applyFill = true;
            if (U.bool(st.stroke, false)) { d.applyStroke = true; d.strokeColor = U.hex(st.strokeColor, [0, 0, 0]); d.strokeWidth = Math.max(1, U.num(st.strokeWidth, 6) * k); d.strokeOverFill = false; } else { d.applyStroke = false; }
            d.justification = ParagraphJustification.CENTER_JUSTIFY;
            if (U.bool(st.caps, false)) { try { d.allCaps = true; } catch (eC) { } }
            d.text = " "; sp.setValue(d);
            // Source Text keys: caption at its start, blank in gaps
            var starts = [], wordArr = [];
            for (i = 0; i < blocks.length; i += 1) {
                var b = blocks[i], s0 = off + U.num(b.start, 0), e0 = off + U.num(b.end, s0 + 1);
                var td = sp.value; td.text = U.str(b.text, " "); sp.setValueAtTime(s0, td);
                var next = (i + 1 < blocks.length) ? off + U.num(blocks[i + 1].start, e0) : null;
                if (next === null || next - e0 > c.frameDuration * 2) { var bl = sp.value; bl.text = " "; sp.setValueAtTime(e0, bl); }
                starts.push(r3(s0));
                var ws = []; for (j = 0; j < (b.words || []).length; j += 1) { ws.push(r3(off + U.num(b.words[j], s0))); }
                wordArr.push(arr(ws.length ? ws : [r3(s0)]));
            }
            T.inPoint = off + U.num(blocks[0].start, 0);
            T.outPoint = off + U.num(blocks[blocks.length - 1].end, T.inPoint + 1) + c.frameDuration;
            T.transform.position.setValue([c.width / 2, c.height * U.num(st.y, 82) / 100]);
            var S = "var S = " + arr(starts) + ";\nvar k = -1; for (var i = 0; i < S.length; i++) { if (time >= S[i]) { k = i; } else { break; } }\n";

            // active-word highlight (Expression Selector, based on words)
            if (U.bool(st.highlight, true)) {
                var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
                an.name = U.TAG + " · Highlight";
                an.property("ADBE Text Animator Properties").addProperty("ADBE Text Fill Color").setValue(U.hex(st.highlightColor, [1, 0.85, 0.1]));
                if (U.num(st.highlightScale, 0)) { var hs = 100 + U.num(st.highlightScale, 0); an.property("ADBE Text Animator Properties").addProperty("ADBE Text Scale 3D").setValue([hs, hs, 100]); }
                var sels = an.property("ADBE Text Selectors");
                for (j = sels.numProperties; j >= 1; j -= 1) { try { sels.property(j).remove(); } catch (eR) { } }
                var ex = sels.addProperty("ADBE Text Expressible Selector");
                try { ex.property("ADBE Text Range Type2").setValue(3); } catch (eB) { }
                ex.property("ADBE Text Expressible Amount").expression = U.MARK + "\n" + S +
                    "var W = " + arr(wordArr) + ", r = 0;\nif (k >= 0) { var w = W[k], n = -1; for (var j = 0; j < w.length; j++) { if (time >= w[j]) { n = j; } } r = (textIndex - 1 == n) ? 100 : 0; }\nr;";
            }
            // entrance per caption
            var anim = U.str(st.anim, "pop");
            if (anim === "pop") {
                T.transform.scale.expression = U.MARK + "\n" + S + "var t = k >= 0 ? time - S[k] : 1;\nvar s = t < 0.16 ? ease(t, 0, 0.16, 82, 106) : ease(t, 0.16, 0.3, 106, 100);\n[s, s]";
            } else if (anim === "fade") {
                T.transform.opacity.expression = U.MARK + "\n" + S + "var t = k >= 0 ? time - S[k] : 1;\nease(t, 0, 0.15, 0, value)";
            } else if (anim === "rise") {
                T.transform.position.expression = U.MARK + "\n" + S + "var t = k >= 0 ? time - S[k] : 1;\nvalue + [0, ease(t, 0, 0.22, " + r3(24 * k) + ", 0)]";
                T.transform.opacity.expression = U.MARK + "\n" + S + "var t = k >= 0 ? time - S[k] : 1;\nease(t, 0, 0.15, 0, value)";
            }
            // auto-sized box behind the text
            if (U.bool(st.box, false)) {
                var B = c.layers.addShape(); B.name = U.uniqueName(c, name + " Box"); U.tag(B);
                var g = B.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
                var rect = g.addProperty("ADBE Vector Shape - Rect");
                var px = r3(U.num(st.padX, 28) * k), py = r3(U.num(st.padY, 14) * k), ref = 'thisComp.layer("' + q(name) + '")';
                rect.property("ADBE Vector Rect Size").expression = U.MARK + "\nvar r = " + ref + ".sourceRectAtTime(time, false), s = " + ref + ".transform.scale / 100;\n[r.width * s[0] + 2 * " + px + ", r.height * s[1] + 2 * " + py + "]";
                rect.property("ADBE Vector Rect Roundness").setValue(U.num(st.radius, 14) * k);
                var fl = g.addProperty("ADBE Vector Graphic - Fill"); fl.property("ADBE Vector Fill Color").setValue(U.hex(st.boxColor, [0, 0, 0]));
                B.transform.position.expression = U.MARK + "\nvar L = " + ref + ", r = L.sourceRectAtTime(time, false);\nL.toComp([r.left + r.width / 2, r.top + r.height / 2])";
                B.transform.opacity.expression = U.MARK + "\nvar L = " + ref + ";\nString(L.text.sourceText).replace(/\\s/g, '').length ? " + r3(U.num(st.boxOpacity, 75)) + " * L.transform.opacity / 100 : 0";
                B.inPoint = T.inPoint; B.outPoint = T.outPoint;
                B.moveAfter(T);
            }
            var all = c.selectedLayers; for (i = 0; i < all.length; i += 1) { all[i].selected = false; }
            T.selected = true;
            return U.ok({ message: blocks.length + " captions built on \"" + name + "\"." });
        });
    };
})();
