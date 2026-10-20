// Sowveil - 3D Carousel engine. Selected layers become cards on a ring driven by one controller null:
// Radius, Rotation, Spin (deg/sec), Rise (spiral), Back Opacity and Face Camera are live controls.
// Cards are parented to the null, so tilting / moving / scaling the null moves the whole carousel.
(function () {
    var SV = $._sv, U = SV._u;

    function exprAngle(n, i) {
        return "var c = thisLayer.parent, n = " + n + ", i = " + i + ";\n" +
            "var a = degreesToRadians(c.effect(\"Rotation\")(1) + c.effect(\"Spin\")(1) * time + i * 360 / n);\n";
    }
    function posExpr(n, i, axis) {
        var body = axis === "x"
            ? "c.transform.anchorPoint + [(i - (n - 1) / 2) * c.effect(\"Rise\")(1), -Math.sin(a) * c.effect(\"Radius\")(1), -Math.cos(a) * c.effect(\"Radius\")(1)]"
            : "c.transform.anchorPoint + [Math.sin(a) * c.effect(\"Radius\")(1), (i - (n - 1) / 2) * c.effect(\"Rise\")(1), -Math.cos(a) * c.effect(\"Radius\")(1)]";
        return U.MARK + "\n" + exprAngle(n, i) + body;
    }
    function orientExpr() {
        return U.MARK + "\nvar c = thisLayer.parent;\n" +
            "c.effect(\"Face Camera\")(1) == 1 ? value : lookAt(transform.position, c.transform.anchorPoint)";
    }
    function opacityExpr(n, i) {
        return U.MARK + "\n" + exprAngle(n, i) + "value * linear(Math.cos(a), -1, 1, c.effect(\"Back Opacity\")(1), 100) / 100";
    }

    SV.carousel = function (a) {
        var c = U.comp(); if (!c) { return U.fail("Open a composition first."); }
        var ls = U.selected(c), cards = [], i;
        for (i = 0; i < ls.length; i += 1) { if (ls[i] instanceof AVLayer || ls[i] instanceof ShapeLayer || ls[i] instanceof TextLayer) { cards.push(ls[i]); } }
        if (!cards.length) { return U.fail("Select the layers that should become carousel cards."); }
        var copies = Math.max(2, Math.round(U.num(a.copies, 8))), axis = U.str(a.axis, "y");
        return U.run("Sowveil 3D Carousel", function () {
            if (cards.length === 1) {            // one layer selected: duplicate it into a full ring
                var src = cards[0];
                for (i = 1; i < copies; i += 1) { var d = src.duplicate(); d.name = src.name + " " + (i + 1); cards.push(d); }
            }
            cards.sort(function (p, q) { return p.index - q.index; });
            var n = cards.length, k = c.height / 1080, maxW = 0;
            for (i = 0; i < n; i += 1) {
                try { var r = cards[i].sourceRectAtTime(c.time, false); maxW = Math.max(maxW, r.width * cards[i].transform.scale.value[0] / 100); } catch (e) { }
            }
            var radius = U.num(a.radius, 0) > 0 ? U.num(a.radius, 0) * k : Math.max(200 * k, (maxW || 400 * k) * n / (2 * Math.PI) * 1.25);

            var ctrl = c.layers.addNull(); ctrl.name = U.uniqueName(c, "Sowveil Carousel"); U.tag(ctrl);
            ctrl.threeDLayer = true;
            ctrl.transform.position.setValue([c.width / 2, c.height / 2, 0]);
            U.control(ctrl, "ADBE Slider Control", "Radius", Math.round(radius));
            U.control(ctrl, "ADBE Angle Control", "Rotation", 0);
            U.control(ctrl, "ADBE Slider Control", "Spin", U.num(a.spin, 20));
            U.control(ctrl, "ADBE Slider Control", "Rise", U.num(a.rise, 0) * k);
            U.control(ctrl, "ADBE Slider Control", "Back Opacity", U.num(a.backOpacity, 35));
            U.control(ctrl, "ADBE Checkbox Control", "Face Camera", U.bool(a.faceCamera, false) ? 1 : 0);

            for (i = 0; i < n; i += 1) {
                var L = cards[i];
                L.threeDLayer = true;
                L.parent = ctrl;
                L.transform.position.expression = posExpr(n, i, axis);
                L.transform.orientation.expression = orientExpr();
                L.transform.opacity.expression = opacityExpr(n, i);
            }
            ctrl.moveBefore(cards[0]);
            // tilt after parenting so the cards do not get counter-rotated
            ctrl.transform.xRotation.setValue(U.num(a.tilt, 12));

            if (U.bool(a.camera, true)) {
                var hasCam = false;
                for (i = 1; i <= c.numLayers; i += 1) { if (c.layer(i) instanceof CameraLayer) { hasCam = true; break; } }
                if (!hasCam) { var cam = c.layers.addCamera(U.uniqueName(c, "Sowveil Camera"), [c.width / 2, c.height / 2]); U.tag(cam); }
            }
            var all = c.selectedLayers; for (i = 0; i < all.length; i += 1) { all[i].selected = false; }
            ctrl.selected = true;
            return U.ok({ message: "Carousel built with " + n + " cards - drive it from \"" + ctrl.name + "\"." });
        });
    };
})();
