/* Synced from client/js_akira/expressions.js by tools/sync_sowveil_engines.py */
window.expressionLibrary = {


    textanimator: [

        {
            name: "Apple Style Text",
            description: "Words slide up individually and fade in",
            targets: ["animator"],
            defaultBasedOn: 3,
            keyframeApply: true,
            params: [
                { name: "delay", label: "Word Delay", min: 0.05, max: 0.5, default: 0.15, step: 0.05 },
                { name: "posX", label: "Position X Offset", min: -200, max: 200, default: 0, step: 10 },
                { name: "posY", label: "Position Y Offset", min: -200, max: 200, default: 80, step: 10 },
                { name: "duration", label: "Duration", min: 0.2, max: 1.5, default: 0.5, step: 0.1 }
            ],
            code: "var delay = 0.15; var dur = 0.5; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = 1 - Math.pow(1 - p, 3); res = (1 - eased) * 100; } else { res = 0; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var dur = " + params.duration + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = 1 - Math.pow(1 - p, 3); res = (1 - eased) * 100; } else { res = 0; } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "posX", value: [0, 0] },
                { type: "position", axis: "y", param: "posY", value: [0, 80] },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Vertical",
            description: "Characters bounce up/down with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var stagger = 0.03; var offset = stagger * textIndex; var elapsed = (time - inPoint) - offset; var res; if (elapsed < 0) { res = 100; } else { var f = 2; var d = 6.0; var envelope = Math.exp(-d * elapsed); var oscillation = Math.cos(elapsed * f * 2 * Math.PI); res = 100 * envelope * oscillation; } res;",
            buildCode: function (params) {
                return "var stagger = " + params.delay + "; var offset = stagger * textIndex; var elapsed = (time - inPoint) - offset; var res; if (elapsed < 0) { res = 100; } else { var f = " + params.freq + "; var d = " + params.decay + "; var envelope = Math.exp(-d * elapsed); var oscillation = Math.cos(elapsed * f * 2 * Math.PI); res = 100 * envelope * oscillation; } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Horizontal",
            description: "Characters bounce left/right with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "posX", label: "Position X", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var gap = 0.03; var wait = gap * textIndex; var t = (time - inPoint) - wait; var res; if (t < 0) { res = 100; } else { var omega = 2 * 2 * Math.PI; var damping = 6.0; res = 100 * Math.cos(omega * t) * Math.exp(-damping * t); } res;",
            buildCode: function (params) {
                return "var gap = " + params.delay + "; var wait = gap * textIndex; var t = (time - inPoint) - wait; var res; if (t < 0) { res = 100; } else { var omega = " + params.freq + " * 2 * Math.PI; var damping = " + params.decay + "; res = 100 * Math.cos(omega * t) * Math.exp(-damping * t); } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "posX", value: [-150, 0] },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Rotation",
            description: "Characters rotate in with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "rotation", label: "Rotation", min: -90, max: 90, default: 70, step: 10 }
            ],
            code: "var step = 0.03; var charDelay = step * textIndex; var phase = (time - inPoint) - charDelay; var res; if (phase < 0) { res = 100; } else { var w = 2; var k = 6.0; var decay = Math.pow(Math.E, -k * phase); var wave = Math.cos(phase * w * 2 * Math.PI); res = wave * decay * 100; } res;",
            buildCode: function (params) {
                return "var step = " + params.delay + "; var charDelay = step * textIndex; var phase = (time - inPoint) - charDelay; var res; if (phase < 0) { res = 100; } else { var w = " + params.freq + "; var k = " + params.decay + "; var decay = Math.pow(Math.E, -k * phase); var wave = Math.cos(phase * w * 2 * Math.PI); res = wave * decay * 100; } res;";
            },
            animatorProps: [
                { type: "rotation", param: "rotation", value: 70 },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Scale",
            description: "Characters scale in with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "scale", label: "Scale", min: -100, max: 100, default: -100, step: 10 }
            ],
            code: "var d = 0.03; var t = (time - inPoint) - d * textIndex; t >= 0 ? Math.cos(2 * t * 2 * Math.PI) / Math.exp(6.0 * t) * 100 : 100",
            buildCode: function (params) {
                return "var d = " + params.delay + "; var t = (time - inPoint) - d * textIndex; t >= 0 ? Math.cos(" + params.freq + " * t * 2 * Math.PI) / Math.exp(" + params.decay + " * t) * 100 : 100";
            },
            animatorProps: [
                { type: "scale", param: "scale", value: [-100, -100] },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Tracking",
            description: "Letter spacing bounces in",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "tracking", label: "Tracking", min: -100, max: 100, default: 50, step: 10 }
            ],
            code: "var interval = 0.03; var onset = interval * textIndex; var age = (time - inPoint) - onset; var res; if (age < 0) { res = 100; } else { var cyclesPerSec = 2; var falloff = 6.0; var angle = cyclesPerSec * age * 2 * Math.PI; res = 100 * Math.cos(angle) * Math.exp(-falloff * age); } res;",
            buildCode: function (params) {
                return "var interval = " + params.delay + "; var onset = interval * textIndex; var age = (time - inPoint) - onset; var res; if (age < 0) { res = 100; } else { var cyclesPerSec = " + params.freq + "; var falloff = " + params.decay + "; var angle = cyclesPerSec * age * 2 * Math.PI; res = 100 * Math.cos(angle) * Math.exp(-falloff * age); } res;";
            },
            animatorProps: [
                { type: "tracking", param: "tracking", value: 50 },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Skew",
            description: "Characters skew in with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "skew", label: "Skew", min: -45, max: 45, default: 30, step: 5 }
            ],
            code: "var spacing = 0.03; var tOffset = spacing * textIndex; var signal = (time - inPoint) - tOffset; var res; if (signal < 0) { res = 100; } else { var hz = 2; var attenuation = 6.0; var result = Math.cos(hz * signal * 2 * Math.PI) * Math.exp(-attenuation * signal); res = result * 100; } res;",
            buildCode: function (params) {
                return "var spacing = " + params.delay + "; var tOffset = spacing * textIndex; var signal = (time - inPoint) - tOffset; var res; if (signal < 0) { res = 100; } else { var hz = " + params.freq + "; var attenuation = " + params.decay + "; var result = Math.cos(hz * signal * 2 * Math.PI) * Math.exp(-attenuation * signal); res = result * 100; } res;";
            },
            animatorProps: [
                { type: "skew", param: "skew", value: 30 },
                { type: "opacity", value: 0 }
            ]
        },

        {
            name: "Bounce Diagonal",
            description: "Characters bounce in diagonally",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "pos", label: "Position", min: -150, max: 150, default: -100, step: 10 }
            ],
            code: "var lag = 0.03; var charOffset = lag * textIndex; var dt = (time - inPoint) - charOffset; var res; if (dt < 0) { res = 100; } else { var rate = 2; var damp = 6.0; var rad = dt * rate * 2 * Math.PI; var amp = 100 * Math.exp(-damp * dt); res = amp * Math.cos(rad); } res;",
            buildCode: function (params) {
                return "var lag = " + params.delay + "; var charOffset = lag * textIndex; var dt = (time - inPoint) - charOffset; var res; if (dt < 0) { res = 100; } else { var rate = " + params.freq + "; var damp = " + params.decay + "; var rad = dt * rate * 2 * Math.PI; var amp = 100 * Math.exp(-damp * dt); res = amp * Math.cos(rad); } res;";
            },
            animatorProps: [
                { type: "position", param: "pos", value: [-100, -100] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bounce Spin",
            description: "Characters drop and rotate in",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 }
            ],
            code: "var springDelay = 0.03; var trigger = springDelay * textIndex; var motion = (time - inPoint) - trigger; var res; if (motion < 0) { res = 100; } else { var tension = 2 * 2 * Math.PI; var friction = 6.0; var displacement = Math.cos(tension * motion) / Math.exp(friction * motion); res = displacement * 100; } res;",
            buildCode: function (params) {
                return "var springDelay = " + params.delay + "; var trigger = springDelay * textIndex; var motion = (time - inPoint) - trigger; var res; if (motion < 0) { res = 100; } else { var tension = " + params.freq + " * 2 * Math.PI; var friction = " + params.decay + "; var displacement = Math.cos(tension * motion) / Math.exp(friction * motion); res = displacement * 100; } res;";
            },
            animatorProps: [
                { type: "position", value: [0, -100] },
                { type: "rotation", value: 45 },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bounce Full",
            description: "Full bounce combo effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 }
            ],
            code: "var cascade = 0.03; var startAt = cascade * textIndex; var progress = (time - inPoint) - startAt; var out = 100; if (progress >= 0) { var f = 2; var k = 6.0; var osc = Math.cos(progress * f * 2 * Math.PI); var fade = Math.exp(-k * progress); out = osc * fade * 100; } out;",
            buildCode: function (params) {
                return "var cascade = " + params.delay + "; var startAt = cascade * textIndex; var progress = (time - inPoint) - startAt; var out = 100; if (progress >= 0) { var f = " + params.freq + "; var k = " + params.decay + "; var osc = Math.cos(progress * f * 2 * Math.PI); var fade = Math.exp(-k * progress); out = osc * fade * 100; } out;";
            },
            animatorProps: [
                { type: "position", value: [0, 80] },
                { type: "rotation", value: 30 },
                { type: "scale", value: [-100, -100] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bounce Reverse",
            description: "Characters bounce from last to first",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var step = 0.03; var reverseIdx = textTotal - 1 - textIndex; var wait = step * reverseIdx; var t = (time - inPoint) - wait; var res; if (t < 0) { res = 100; } else { var envelope = Math.exp(-6.0 * t); res = 100 * Math.cos(t * 2 * 2 * Math.PI) * envelope; } res;",
            buildCode: function (params) {
                return "var step = " + params.delay + "; var reverseIdx = textTotal - 1 - textIndex; var wait = step * reverseIdx; var t = (time - inPoint) - wait; var res; if (t < 0) { res = 100; } else { var envelope = Math.exp(-" + params.decay + " * t); res = 100 * Math.cos(t * " + params.freq + " * 2 * Math.PI) * envelope; } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bounce Random",
            description: "Characters bounce in random order",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "maxDelay", label: "Max Delay", min: 0.1, max: 1, default: 0.5, step: 0.1 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "seedRandom(textIndex, true); var rndDelay = random(0, 0.5); var elapsed = (time - inPoint) - rndDelay; var res; if (elapsed < 0) { res = 100; } else { var w = 2 * 2 * Math.PI; var k = 6.0; res = 100 * Math.cos(w * elapsed) * Math.exp(-k * elapsed); } res;",
            buildCode: function (params) {
                return "seedRandom(textIndex, true); var rndDelay = random(0, " + params.maxDelay + "); var elapsed = (time - inPoint) - rndDelay; var res; if (elapsed < 0) { res = 100; } else { var w = " + params.freq + " * 2 * Math.PI; var k = " + params.decay + "; res = 100 * Math.cos(w * elapsed) * Math.exp(-k * elapsed); } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bounce Center Out",
            description: "Characters bounce from center outward",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var perChar = 0.03; var mid = (textTotal - 1) / 2; var dist = Math.abs(textIndex - mid); var onset = perChar * dist; var t = (time - inPoint) - onset; t < 0 ? 100 : Math.cos(t * 2 * 2 * Math.PI) / Math.exp(6.0 * t) * 100",
            buildCode: function (params) {
                return "var perChar = " + params.delay + "; var mid = (textTotal - 1) / 2; var dist = Math.abs(textIndex - mid); var onset = perChar * dist; var t = (time - inPoint) - onset; t < 0 ? 100 : Math.cos(t * " + params.freq + " * 2 * Math.PI) / Math.exp(" + params.decay + " * t) * 100";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Elastic",
            description: "Extra elastic/rubbery bounce",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "freq", label: "Frequency", min: 3, max: 8, default: 5, step: 0.5 },
                { name: "decay", label: "Decay", min: 2, max: 6, default: 3, step: 0.5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var cascade = 0.03; var charWait = cascade * textIndex; var spring = (time - inPoint) - charWait; var res; if (spring < 0) { res = 100; } else { var resonance = 5 * 2 * Math.PI; var damping = 3.0; var deflection = Math.cos(resonance * spring) * Math.pow(Math.E, -damping * spring); res = deflection * 100; } res;",
            buildCode: function (params) {
                return "var cascade = " + params.delay + "; var charWait = cascade * textIndex; var spring = (time - inPoint) - charWait; var res; if (spring < 0) { res = 100; } else { var resonance = " + params.freq + " * 2 * Math.PI; var damping = " + params.decay + "; var deflection = Math.cos(resonance * spring) * Math.pow(Math.E, -damping * spring); res = deflection * 100; } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Overshoot",
            description: "Simple overshoot without oscillation",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.03, step: 0.01 },
                { name: "overshoot", label: "Overshoot %", min: 10, max: 50, default: 20, step: 5 },
                { name: "posY", label: "Position Y", min: -150, max: 150, default: -150, step: 10 }
            ],
            code: "var delay = 0.03; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var dur = 0.3; var ovr = 0.2; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; res = 100 * (1 - (1 + ovr) * p); } else { var elapsed = t - dur; res = -100 * ovr * Math.cos(3 * elapsed * 2 * Math.PI) / Math.exp(8 * elapsed); } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var dur = 0.3; var ovr = " + (params.overshoot / 100) + "; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; res = 100 * (1 - (1 + ovr) * p); } else { var elapsed = t - dur; res = -100 * ovr * Math.cos(3 * elapsed * 2 * Math.PI) / Math.exp(8 * elapsed); } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },

        
        {
            name: "Wave Characters",
            description: "Characters move in wave pattern",
            targets: ["animator"],
            params: [
                { name: "waveHeight", label: "Wave Height", min: 10, max: 100, default: 40, step: 5 },
                { name: "waveSpeed", label: "Wave Speed", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "delay", label: "Char Delay", min: 0.05, max: 0.3, default: 0.1, step: 0.025 }
            ],
            code: "var delay = 0.1; var h = 40; var s = 2; var offset = textIndex * delay; var wave = Math.sin((time - offset) * s * Math.PI * 2) * h; wave",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var h = " + params.waveHeight + "; var s = " + params.waveSpeed + "; var offset = textIndex * delay; var wave = Math.sin((time - offset) * s * Math.PI * 2) * h; wave";
            },
            animatorProps: [
                { type: "position", value: [0, 100] }
            ]
        },
        
        {
            name: "Spiral Reveal",
            description: "Characters spiral in from outside",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "radius", label: "Radius", min: 50, max: 300, default: 150, step: 25 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.04, step: 0.01 },
                { name: "duration", label: "Duration", min: 0.3, max: 1.5, default: 0.6, step: 0.1 }
            ],
            code: "var delay = 0.04; var dur = 0.6; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = p * p * (3 - 2 * p); res = (1 - eased) * 100; } else { res = 0; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var dur = " + params.duration + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = p * p * (3 - 2 * p); res = (1 - eased) * 100; } else { res = 0; } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "radius", value: [150, -80] },
                { type: "rotation", value: 720 },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Gravity Drop",
            description: "Characters fall with gravity effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "dropHeight", label: "Drop Height", min: 50, max: 300, default: 150, step: 25 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.05, step: 0.01 },
                { name: "duration", label: "Duration", min: 0.2, max: 0.8, default: 0.4, step: 0.05 }
            ],
            code: "var delay = 0.05; var dur = 0.4; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; res = (1 - p * p) * 100; } else { var st = t - dur; res = 15 * Math.cos(4 * st * 2 * Math.PI) / Math.exp(8 * st); } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var dur = " + params.duration + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; res = (1 - p * p) * 100; } else { var st = t - dur; res = 15 * Math.cos(4 * st * 2 * Math.PI) / Math.exp(8 * st); } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "dropHeight", paramSign: -1, value: [0, -150] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Magnetic Attract",
            description: "Characters pulled together magnetically",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "spread", label: "Initial Spread", min: 100, max: 500, default: 250, step: 25 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.03, step: 0.01 },
                { name: "duration", label: "Duration", min: 0.3, max: 1, default: 0.5, step: 0.1 }
            ],
            code: "var delay = 0.03; var dur = 0.5; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = 1 - Math.pow(1 - p, 3); res = (1 - eased) * 100; } else { res = 0; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var dur = " + params.duration + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { var p = t / dur; var eased = 1 - Math.pow(1 - p, 3); res = (1 - eased) * 100; } else { res = 0; } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "spread", value: [250, 0] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Elastic Stretch",
            description: "Characters stretch in with elastic effect",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.04, step: 0.01 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 }
            ],
            code: "var spacing = 0.04; var tOff = spacing * textIndex; var stretch = (time - inPoint) - tOff; var res; if (stretch < 0) { res = 100; } else { var bounce = Math.cos(2 * stretch * 2 * Math.PI); var decay = Math.exp(-6 * stretch); res = bounce * decay * 100; } res;",
            buildCode: function (params) {
                return "var spacing = " + params.delay + "; var tOff = spacing * textIndex; var stretch = (time - inPoint) - tOff; var res; if (stretch < 0) { res = 100; } else { var bounce = Math.cos(" + params.freq + " * stretch * 2 * Math.PI); var decay = Math.exp(-" + params.decay + " * stretch); res = bounce * decay * 100; } res;";
            },
            animatorProps: [
                { type: "scale", value: [-100, -100] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Swing In",
            description: "Characters swing in like pendulum",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "angle", label: "Start Angle", min: 30, max: 120, default: 70, step: 10 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.05, step: 0.01 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 5, step: 0.5 }
            ],
            code: "var lag = 0.05; var pendulumStart = lag * textIndex; var arc = (time - inPoint) - pendulumStart; var res; if (arc < 0) { res = 100; } else { var swingFreq = 3 * Math.PI; var friction = 5; var pendulum = Math.cos(swingFreq * arc) * Math.exp(-friction * arc); res = pendulum * 100; } res;",
            buildCode: function (params) {
                return "var lag = " + params.delay + "; var pendulumStart = lag * textIndex; var arc = (time - inPoint) - pendulumStart; var res; if (arc < 0) { res = 100; } else { var swingFreq = 3 * Math.PI; var friction = " + params.decay + "; var pendulum = Math.cos(swingFreq * arc) * Math.exp(-friction * arc); res = pendulum * 100; } res;";
            },
            animatorProps: [
                { type: "rotation", param: "angle", value: 70 },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Roll In",
            description: "Characters roll in from side",
            targets: ["animator"],
            keyframeApply: true,
            params: [
                { name: "distance", label: "Distance", min: 100, max: 500, default: 300, step: 25 },
                { name: "delay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.04, step: 0.01 },
                { name: "duration", label: "Duration", min: 0.3, max: 1, default: 0.5, step: 0.1 }
            ],
            code: "var spacing = 0.04; var rollDur = 0.5; var charWait = spacing * textIndex; var t = (time - inPoint) - charWait; var res; if (t < 0) { res = 100; } else if (t < rollDur) { var prog = t / rollDur; var curve = 1 - Math.pow(1 - prog, 3); res = (1 - curve) * 100; } else { res = 0; } res;",
            buildCode: function (params) {
                return "var spacing = " + params.delay + "; var rollDur = " + params.duration + "; var charWait = spacing * textIndex; var t = (time - inPoint) - charWait; var res; if (t < 0) { res = 100; } else if (t < rollDur) { var prog = t / rollDur; var curve = 1 - Math.pow(1 - prog, 3); res = (1 - curve) * 100; } else { res = 0; } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "distance", paramSign: -1, value: [-300, 0] },
                { type: "rotation", value: 720 },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Word by Word Scale",
            description: "Words scale up individually with overshoot bounce",
            targets: ["animator"],
            defaultBasedOn: 3,
            params: [
                { name: "delay", label: "Word Delay", min: 0.05, max: 0.5, default: 0.15, step: 0.05 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2.0, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6.0, step: 0.5 }
            ],
            code: "var delay = 0.15; var t = (time - inPoint) - delay * textIndex; t >= 0 ? Math.cos(2 * t * 2 * Math.PI) / Math.exp(6 * t) * 100 : 100",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var t = (time - inPoint) - delay * textIndex; t >= 0 ? Math.cos(" + params.freq + " * t * 2 * Math.PI) / Math.exp(" + params.decay + " * t) * 100 : 100";
            },
            animatorProps: [
                { type: "scale", value: [-100, -100] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Flicker Reveal",
            description: "Characters flicker on randomly",
            targets: ["animator"],
            defaultBasedOn: 1,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.05, step: 0.01 },
                { name: "duration", label: "Flicker Dur", min: 0.2, max: 1.5, default: 0.6, step: 0.1 }
            ],
            code: "var delay = 0.05; var dur = 0.6; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { seedRandom(textIndex + Math.floor(t * 15), true); res = random(0, 100); } else { res = 0; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var dur = " + params.duration + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else if (t < dur) { seedRandom(textIndex + Math.floor(t * 15), true); res = random(0, 100); } else { res = 0; } res;";
            },
            animatorProps: [
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Slide & Elastic",
            description: "Characters slide horizontally and bounce elastically",
            targets: ["animator"],
            keyframeApply: true,
            defaultBasedOn: 1,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.04, step: 0.01 },
                { name: "posX", label: "Slide Distance X", min: -300, max: 300, default: -150, step: 10 },
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2.5, step: 0.5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 5.0, step: 0.5 }
            ],
            code: "var delay = 0.04; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else { var f = 2.5; var d = 5.0; var env = Math.exp(-d * t); var osc = Math.cos(t * f * 2 * Math.PI); res = 100 * env * osc; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else { var f = " + params.freq + "; var d = " + params.decay + "; var env = Math.exp(-d * t); var osc = Math.cos(t * f * 2 * Math.PI); res = 100 * env * osc; } res;";
            },
            animatorProps: [
                { type: "position", axis: "x", param: "posX", value: [-150, 0] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Bouncy Drop",
            description: "Characters drop from above and bounce on baseline",
            targets: ["animator"],
            keyframeApply: true,
            defaultBasedOn: 1,
            params: [
                { name: "delay", label: "Char Delay", min: 0.01, max: 0.1, default: 0.04, step: 0.01 },
                { name: "posY", label: "Drop Height Y", min: -300, max: 300, default: -120, step: 10 },
                { name: "gravity", label: "Bounce Damping", min: 3, max: 10, default: 6.0, step: 0.5 }
            ],
            code: "var delay = 0.04; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else { var d = 6.0; var osc = Math.abs(Math.cos(t * 3 * Math.PI)); var env = Math.exp(-d * t); res = 100 * osc * env; } res;",
            buildCode: function (params) {
                return "var delay = " + params.delay + "; var myDelay = delay * textIndex; var t = (time - inPoint) - myDelay; var res; if (t < 0) { res = 100; } else { var d = " + params.gravity + "; var osc = Math.abs(Math.cos(t * 3 * Math.PI)); var env = Math.exp(-d * t); res = 100 * osc * env; } res;";
            },
            animatorProps: [
                { type: "position", axis: "y", param: "posY", value: [0, -120] },
                { type: "opacity", value: 0 }
            ]
        },
        
        {
            name: "Glowing Trailing Text",
            description: "Glowing trailing text animation with typewriter effect",
            targets: ["animator"],
            customApply: true,
            params: [
                { name: "delay", label: "Trail Delay (sec)", min: 0.05, max: 1.0, default: 0.2, step: 0.05 }
            ],
            code: "// Glowing Trailing Text (Custom Apply)",
            buildCode: function (params) {
                return "// Glowing Trailing Text (Custom Apply)";
            }
        },
        
        {
            name: "Deep Glow 2 Emulator",
            description: "Exponential falloff glow rig replicating Deep Glow 2 settings",
            category: "textanimator",
            targets: ["any"],
            customApply: true,
            params: [
                { name: "threshold", label: "Threshold (%)", min: 0, max: 100, default: 50, step: 1 },
                { name: "radius", label: "Radius (px)", min: 10, max: 1000, default: 200, step: 10 },
                { name: "exposure", label: "Exposure", min: 0.1, max: 5.0, default: 1.0, step: 0.1 },
                { name: "aspectRatio", label: "Aspect Ratio", min: 0.2, max: 5.0, default: 1.0, step: 0.1 },
                { name: "chromaticAberration", label: "Aberration", min: 0, max: 50, default: 0, step: 1 },
                { name: "tintColor", label: "Tint Color", min: 0, max: 1, default: 0.33, step: 0.01, type: "hue" },
                { name: "tintStrength", label: "Tint Strength (%)", min: 0, max: 100, default: 0, step: 5 },
                { name: "unmult", label: "Unmult (0=Off, 1=On)", min: 0, max: 1, default: 1, step: 1, type: "input" }
            ],
            code: "// Deep Glow 2 Emulator (Custom Apply)",
            buildCode: function (params) {
                return "// Deep Glow 2 Emulator (Custom Apply)";
            }
        }
    ],

    
    
    
    text: [
        {
            name: "Typewriter",
            description: "Characters appear one by one",
            targets: ["sourceText"],
            params: [
                { name: "charsPerSec", label: "Chars/sec", min: 5, max: 20, default: 10, step: 1 }
            ],
            code: "var txt = value; var numChars = Math.floor((time - inPoint) * 10); txt.substr(0, numChars)",
            buildCode: function (params) {
                return "var txt = value; var numChars = Math.floor((time - inPoint) * " + params.charsPerSec + "); txt.substr(0, numChars)";
            }
        },
        {
            name: "Number Counter",
            description: "Count from start to end value",
            targets: ["sourceText"],
            params: [
                { name: "startVal", label: "Start", min: 0, max: 1000, default: 0, step: 1 },
                { name: "endVal", label: "End", min: 0, max: 10000, default: 1000, step: 100 },
                { name: "dur", label: "Duration", min: 1, max: 10, default: 3, step: 0.5 }
            ],
            code: "var t = time - inPoint; var val = linear(t, 0, 3, 0, 1000); Math.floor(val).toString()",
            buildCode: function (params) {
                return "var t = time - inPoint; var val = linear(t, 0, " + params.dur + ", " + params.startVal + ", " + params.endVal + "); Math.floor(val).toString()";
            }
        },
        {
            name: "Percentage Counter",
            description: "Count from 0% to 100%",
            targets: ["sourceText"],
            params: [
                { name: "dur", label: "Duration", min: 1, max: 5, default: 2, step: 0.5 }
            ],
            code: "var t = time - inPoint; var val = linear(t, 0, 2, 0, 100); Math.floor(val) + \"%\"",
            buildCode: function (params) {
                return "var t = time - inPoint; var val = linear(t, 0, " + params.dur + ", 0, 100); Math.floor(val) + \"%\"";
            }
        },
        {
            name: "Countdown Timer",
            description: "Countdown in MM:SS format",
            targets: ["sourceText"],
            params: [
                { name: "totalSec", label: "Total Seconds", min: 10, max: 300, default: 60, step: 10 }
            ],
            code: "var elapsed = time - inPoint; var remaining = Math.max(0, 60 - elapsed); var min = Math.floor(remaining / 60); var sec = Math.floor(remaining % 60); (min < 10 ? \"0\" : \"\") + min + \":\" + (sec < 10 ? \"0\" : \"\") + sec",
            buildCode: function (params) {
                return "var elapsed = time - inPoint; var remaining = Math.max(0, " + params.totalSec + " - elapsed); var min = Math.floor(remaining / 60); var sec = Math.floor(remaining % 60); (min < 10 ? \"0\" : \"\") + min + \":\" + (sec < 10 ? \"0\" : \"\") + sec";
            }
        },
        {
            name: "Time Display",
            description: "Show current timecode",
            targets: ["sourceText"],
            params: [
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.5 }
            ],
            code: "var spd = 1; timeToTimecode(time * spd, 1 / thisComp.frameDuration, false)",
            buildCode: function (params) {
                return "var spd = " + params.speed + "; timeToTimecode(time * spd, 1 / thisComp.frameDuration, false)";
            }
        },
        {
            name: "Random Reveal",
            description: "Hacker-style text reveal",
            targets: ["sourceText"],
            params: [
                { name: "revealSpeed", label: "Reveal Speed", min: 0.1, max: 0.5, default: 0.3, step: 0.05 },
                { name: "charDelay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.05, step: 0.01 }
            ],
            code: "var txt = value; var chars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%\"; var revealTime = 0.3; var charDelay = 0.05; var result = \"\"; var t = time - inPoint; for (var i = 0; i < txt.length; i++) { var charStart = i * charDelay; if (t > charStart + revealTime) { result += txt[i]; } else if (t > charStart) { seedRandom(i + Math.floor(t * 30), true); result += chars[Math.floor(random() * chars.length)]; } else { result += \" \"; } } result",
            buildCode: function (params) {
                return "var txt = value; var chars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%\"; var revealTime = " + params.revealSpeed + "; var charDelay = " + params.charDelay + "; var result = \"\"; var t = time - inPoint; for (var i = 0; i < txt.length; i++) { var charStart = i * charDelay; if (t > charStart + revealTime) { result += txt[i]; } else if (t > charStart) { seedRandom(i + Math.floor(t * 30), true); result += chars[Math.floor(random() * chars.length)]; } else { result += \" \"; } } result";
            }
        },
        {
            name: "Typewriter + Cursor",
            description: "Typewriter with blinking cursor",
            targets: ["sourceText"],
            params: [
                { name: "charsPerSec", label: "Chars/sec", min: 5, max: 20, default: 10, step: 1 },
                { name: "blinkSpeed", label: "Blink Speed", min: 2, max: 8, default: 4, step: 1 }
            ],
            code: "var txt = value; var n = Math.floor((time - inPoint) * 10); var cursor = (Math.sin(time * 4 * Math.PI) > 0) ? \"|\" : \" \"; txt.substr(0, n) + cursor",
            buildCode: function (params) {
                return "var txt = value; var n = Math.floor((time - inPoint) * " + params.charsPerSec + "); var cursor = (Math.sin(time * " + params.blinkSpeed + " * Math.PI) > 0) ? \"|\" : \" \"; txt.substr(0, n) + cursor";
            }
        },
        {
            name: "Word by Word",
            description: "Reveal text word by word",
            targets: ["sourceText"],
            params: [
                { name: "wordsPerSec", label: "Words/sec", min: 1, max: 5, default: 2, step: 0.5 }
            ],
            code: "var txt = value; var words = txt.split(\" \"); var n = Math.floor((time - inPoint) * 2); words.slice(0, n).join(\" \")",
            buildCode: function (params) {
                return "var txt = value; var words = txt.split(\" \"); var n = Math.floor((time - inPoint) * " + params.wordsPerSec + "); words.slice(0, n).join(\" \")";
            }
        },
        {
            name: "Text Cycle",
            description: "Cycle through multiple words (use commas: word1,word2,word3)",
            targets: ["sourceText"],
            params: [
                { name: "duration", label: "Duration each", min: 0.5, max: 3, default: 1, step: 0.5 }
            ],
            code: "var txt = '' + value; var words = txt.split(','); if (words.length < 2) words = txt.split(' '); var idx = Math.floor(time / 1) % words.length; var w = words[idx]; w.replace(/^\\s+|\\s+$/g, '')",
            buildCode: function (params) {
                return "var txt = '' + value; var words = txt.split(','); if (words.length < 2) words = txt.split(' '); var idx = Math.floor(time / " + params.duration + ") % words.length; var w = words[idx]; w.replace(/^\\s+|\\s+$/g, '')";
            }
        },
        {
            name: "Currency Counter",
            description: "Count with currency format ($1,234)",
            targets: ["sourceText"],
            params: [
                { name: "endVal", label: "End Value", min: 1000, max: 100000, default: 10000, step: 1000 },
                { name: "dur", label: "Duration", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "prefix", label: "Symbol (1=$,2=€,3=£)", min: 1, max: 3, default: 1, step: 1 }
            ],
            code: "var t = time - inPoint; var val = Math.floor(linear(t, 0, 2, 0, 10000)); var str = val.toString(); var result = \"\"; for(var i = str.length - 1, c = 0; i >= 0; i--, c++) { if(c > 0 && c % 3 == 0) result = \",\" + result; result = str[i] + result; } \"$\" + result",
            buildCode: function (params) {
                var symbol = params.prefix == 1 ? "$" : (params.prefix == 2 ? "€" : "£");
                return "var t = time - inPoint; var val = Math.floor(linear(t, 0, " + params.dur + ", 0, " + params.endVal + ")); var str = val.toString(); var result = \"\"; for(var i = str.length - 1, c = 0; i >= 0; i--, c++) { if(c > 0 && c % 3 == 0) result = \",\" + result; result = str[i] + result; } \"" + symbol + "\" + result";
            }
        },
        {
            name: "Bounce Counter",
            description: "Counter with overshoot bounce",
            targets: ["sourceText"],
            params: [
                { name: "endVal", label: "End Value", min: 10, max: 10000, default: 100, step: 10 },
                { name: "dur", label: "Duration", min: 1, max: 5, default: 2, step: 0.5 }
            ],
            code: "var t = time - inPoint; var dur = 2; var freq = 3; var decay = 5; var target = 100; var val; if(t < dur) { val = target * t / dur; } else { var elapsed = t - dur; var bounce = Math.cos(freq * elapsed * Math.PI * 2) * target * 0.2 / Math.exp(decay * elapsed); val = target + bounce; } Math.floor(Math.max(0, val)).toString()",
            buildCode: function (params) {
                return "var t = time - inPoint; var dur = " + params.dur + "; var freq = 3; var decay = 5; var target = " + params.endVal + "; var val; if(t < dur) { val = target * t / dur; } else { var elapsed = t - dur; var bounce = Math.cos(freq * elapsed * Math.PI * 2) * target * 0.2 / Math.exp(decay * elapsed); val = target + bounce; } Math.floor(Math.max(0, val)).toString()";
            }
        },
        {
            name: "Date Display",
            description: "Show formatted date",
            targets: ["sourceText"],
            params: [
                { name: "format", label: "Format (1=Full,2=Short)", min: 1, max: 2, default: 1, step: 1 },
                { name: "year", label: "Year", min: 2000, max: 2100, default: 2026, step: 1, type: "input" },
                { name: "month", label: "Month", min: 1, max: 12, default: 1, step: 1 },
                { name: "day", label: "Day", min: 1, max: 31, default: 1, step: 1 }
            ],
            code: "var months = [\"January\",\"February\",\"March\",\"April\",\"May\",\"June\",\"July\",\"August\",\"September\",\"October\",\"November\",\"December\"]; months[0] + \" 1, 2026\"",
            buildCode: function (params) {
                var y = params.year || 2026;
                var m = params.month || 1;
                var dy = params.day || 1;
                if (params.format == 1) {
                    return "var months = [\"January\",\"February\",\"March\",\"April\",\"May\",\"June\",\"July\",\"August\",\"September\",\"October\",\"November\",\"December\"]; months[" + (m - 1) + "] + \" \" + " + dy + " + \", \" + " + y;
                } else {
                    return "var day = " + dy + "; var mon = " + m + "; (day < 10 ? \"0\" : \"\") + day + \"/\" + (mon < 10 ? \"0\" : \"\") + mon + \"/\" + " + y;
                }
            }
        },
        {
            name: "Stopwatch",
            description: "Stopwatch with deceleration stop",
            targets: ["sourceText"],
            params: [
                { name: "stopAt", label: "Stop At (sec)", min: 5, max: 120, default: 10, step: 5 },
                { name: "dur", label: "Duration", min: 1, max: 10, default: 3, step: 0.5 }
            ],
            code: "var t = time - inPoint; var stopAt = 10; var dur = 3; var progress = Math.min(t / dur, 1); var eased = 1 - Math.pow(1 - progress, 3); var d = stopAt * eased; var min = Math.floor(d / 60); var sec = Math.floor(d % 60); var ms = Math.floor((d % 1) * 100); (min < 10 ? \"0\" : \"\") + min + \":\" + (sec < 10 ? \"0\" : \"\") + sec + \".\" + (ms < 10 ? \"0\" : \"\") + ms",
            buildCode: function (params) {
                return "var t = time - inPoint; var stopAt = " + params.stopAt + "; var dur = " + params.dur + "; var progress = Math.min(t / dur, 1); var eased = 1 - Math.pow(1 - progress, 3); var d = stopAt * eased; var min = Math.floor(d / 60); var sec = Math.floor(d % 60); var ms = Math.floor((d % 1) * 100); (min < 10 ? \"0\" : \"\") + min + \":\" + (sec < 10 ? \"0\" : \"\") + sec + \".\" + (ms < 10 ? \"0\" : \"\") + ms";
            }
        },
        {
            name: "Blinking Text",
            description: "Text blinks on and off",
            targets: ["sourceText"],
            params: [
                { name: "speed", label: "Blink Speed", min: 1, max: 10, default: 4, step: 1 }
            ],
            code: "Math.sin(time * 4 * Math.PI) > 0 ? value : \"\"",
            buildCode: function (params) {
                return "Math.sin(time * " + params.speed + " * Math.PI) > 0 ? value : \"\"";
            }
        },
        {
            name: "Digital Noise",
            description: "Random digital noise corruption",
            targets: ["sourceText"],
            params: [
                { name: "intensity", label: "Intensity", min: 1, max: 5, default: 2, step: 1 },
                { name: "speed", label: "Speed", min: 5, max: 20, default: 10, step: 1 }
            ],
            code: "var txt = value; var chars = \"@#$%&*!?<>|/\\\\\"; seedRandom(Math.floor(time * 10), true); var result = \"\"; for(var i = 0; i < txt.length; i++) { if(random() < 0.1 * 2) { result += chars[Math.floor(random() * chars.length)]; } else { result += txt[i]; } } result",
            buildCode: function (params) {
                return "var txt = value; var chars = \"@#$%&*!?<>|/\\\\\"; seedRandom(Math.floor(time * " + params.speed + "), true); var result = \"\"; for(var i = 0; i < txt.length; i++) { if(random() < 0.1 * " + params.intensity + ") { result += chars[Math.floor(random() * chars.length)]; } else { result += txt[i]; } } result";
            }
        },
        {
            name: "Ellipsis Loader",
            description: "Animated loading dots (...)",
            targets: ["sourceText"],
            params: [
                { name: "speed", label: "Speed", min: 1, max: 4, default: 2, step: 0.5 }
            ],
            code: "var dots = Math.floor(time * 2) % 4; value + Array(dots + 1).join(\".\")",
            buildCode: function (params) {
                return "var dots = Math.floor(time * " + params.speed + ") % 4; value + Array(dots + 1).join(\".\")";
            }
        },
        {
            name: "Decimal Counter",
            description: "Count with decimal places",
            targets: ["sourceText"],
            params: [
                { name: "endVal", label: "End Value", min: 10, max: 1000, default: 100, step: 10 },
                { name: "decimals", label: "Decimal Places", min: 1, max: 3, default: 2, step: 1 },
                { name: "dur", label: "Duration", min: 1, max: 5, default: 2, step: 0.5 }
            ],
            code: "var t = time - inPoint; var val = linear(t, 0, 2, 0, 100); val.toFixed(2)",
            buildCode: function (params) {
                return "var t = time - inPoint; var val = linear(t, 0, " + params.dur + ", 0, " + params.endVal + "); val.toFixed(" + params.decimals + ")";
            }
        },
        {
            name: "Simple Countdown",
            description: "Simple number countdown (10,9,8...)",
            targets: ["sourceText"],
            params: [
                { name: "startNum", label: "Start Number", min: 3, max: 30, default: 10, step: 1 }
            ],
            code: "var t = time - inPoint; var num = Math.max(0, 10 - Math.floor(t)); num.toString()",
            buildCode: function (params) {
                return "var t = time - inPoint; var num = Math.max(0, " + params.startNum + " - Math.floor(t)); num.toString()";
            }
        },
        {
            name: "Slot Machine",
            description: "Characters spin like a slot reel and lock in place",
            targets: ["sourceText"],
            params: [
                { name: "charDelay", label: "Char Delay", min: 0.03, max: 0.2, default: 0.1, step: 0.01 },
                { name: "spinDur", label: "Spin Duration", min: 0.3, max: 1.5, default: 0.6, step: 0.1 }
            ],
            code: "var src = value; var delay = 0.1; var spinDur = 0.6; var chars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\"; var t = time - inPoint; var result = \"\"; for (var i = 0; i < src.length; i++) { var charStart = delay * i; var charEnd = charStart + spinDur; if (src[i] == \" \") { result += \" \"; } else if (t >= charEnd) { result += src[i]; } else if (t >= charStart) { var progress = (t - charStart) / spinDur; var speed = Math.floor((1 - progress * progress) * 15) + 1; var charIdx = Math.floor(t * speed * 10) % chars.length; result += chars[charIdx]; } else { result += \" \"; } } result",
            buildCode: function (params) {
                return "var src = value; var delay = " + params.charDelay + "; var spinDur = " + params.spinDur + "; var chars = \"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\"; var t = time - inPoint; var result = \"\"; for (var i = 0; i < src.length; i++) { var charStart = delay * i; var charEnd = charStart + spinDur; if (src[i] == \" \") { result += \" \"; } else if (t >= charEnd) { result += src[i]; } else if (t >= charStart) { var progress = (t - charStart) / spinDur; var speed = Math.floor((1 - progress * progress) * 15) + 1; var charIdx = Math.floor(t * speed * 10) % chars.length; result += chars[charIdx]; } else { result += \" \"; } } result";
            }
        },
        {
            name: "Decode",
            description: "Cipher symbols decode into real text",
            targets: ["sourceText"],
            params: [
                { name: "charDelay", label: "Char Delay", min: 0.02, max: 0.1, default: 0.04, step: 0.01 },
                { name: "decodeDur", label: "Decode Duration", min: 0.1, max: 0.8, default: 0.3, step: 0.05 }
            ],
            code: "var src = value; var delay = 0.04; var decodeDur = 0.3; var startDelay = 0.3; var cipherChars = \"-=+*#@!?:;\"; var t = time - inPoint; var result = \"\"; for (var i = 0; i < src.length; i++) { var charStart = startDelay + delay * i; var charEnd = charStart + decodeDur; if (src[i] == \" \") { result += \" \"; } else if (t >= charEnd) { result += src[i]; } else if (t >= charStart) { seedRandom(i + Math.floor(t * 25), true); result += cipherChars[Math.floor(random(0, cipherChars.length))]; } else { result += cipherChars[i % cipherChars.length]; } } result",
            buildCode: function (params) {
                return "var src = value; var delay = " + params.charDelay + "; var decodeDur = " + params.decodeDur + "; var startDelay = 0.3; var cipherChars = \"-=+*#@!?:;\"; var t = time - inPoint; var result = \"\"; for (var i = 0; i < src.length; i++) { var charStart = startDelay + delay * i; var charEnd = charStart + decodeDur; if (src[i] == \" \") { result += \" \"; } else if (t >= charEnd) { result += src[i]; } else if (t >= charStart) { seedRandom(i + Math.floor(t * 25), true); result += cipherChars[Math.floor(random(0, cipherChars.length))]; } else { result += cipherChars[i % cipherChars.length]; } } result";
            }
        },

    ],

    
    
    
    motion: [
        {
            name: "Wiggle",
            description: "Random shaky movement",
            targets: ["position", "rotation", "scale", "opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 20, default: 5, step: 1 },
                { name: "amp", label: "Amplitude", min: 1, max: 200, default: 20, step: 1 }
            ],
            code: "wiggle(5, 20)",
            buildCode: function (params) {
                return "wiggle(" + params.freq + ", " + params.amp + ")";
            }
        },
        {
            name: "Smooth Wiggle",
            description: "Organic, flowing movement - very smooth",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 5, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 25, step: 1 },
                { name: "octaves", label: "Octaves", min: 1, max: 6, default: 4, step: 1 }
            ],
            code: "wiggle(1, 25, 4, 0.3)",
            buildCode: function (params) {
                return "wiggle(" + params.freq + ", " + params.amp + ", " + params.octaves + ", 0.3)";
            }
        },
        {
            name: "Decay Wiggle",
            description: "Stepped wiggle that fades out - choppy intro shake",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 20, default: 8, step: 1 },
                { name: "startAmp", label: "Start Amplitude", min: 1, max: 200, default: 80, step: 1 },
                { name: "decay", label: "Decay Speed", min: 1, max: 10, default: 3, step: 0.5 },
                { name: "fps", label: "Step FPS", min: 6, max: 24, default: 12, step: 2 }
            ],
            code: "posterizeTime(12);\nvar t = time - inPoint;\nvar env = Math.exp(-3 * t);\nwiggle(8, 80 * env)",
            buildCode: function (params) {
                return "posterizeTime(" + params.fps + ");\nvar t = time - inPoint;\nvar env = Math.exp(-" + params.decay + " * t);\nwiggle(" + params.freq + ", " + params.startAmp + " * env)";
            }
        },
        {
            name: "X-Axis Wiggle",
            description: "Horizontal only wiggle - Y stays locked",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 20, default: 5, step: 1 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 15, step: 1 }
            ],
            code: "var w = wiggle(5, 15); [w[0], value[1]]",
            buildCode: function (params) {
                return "var w = wiggle(" + params.freq + ", " + params.amp + "); [w[0], value[1]]";
            }
        },
        {
            name: "Y-Axis Wiggle",
            description: "Vertical only wiggle - X stays locked",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 20, default: 5, step: 1 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 15, step: 1 }
            ],
            code: "var w = wiggle(5, 15); [value[0], w[1]]",
            buildCode: function (params) {
                return "var w = wiggle(" + params.freq + ", " + params.amp + "); [value[0], w[1]]";
            }
        },
        {
            name: "Loopable Wiggle",
            description: "Seamless looping wiggle - great for backgrounds",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 10, default: 2, step: 1 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 25, step: 1 },
                { name: "loopDur", label: "Loop Duration (sec)", min: 1, max: 10, default: 5, step: 1 }
            ],
            code: "var dur = 5; var a = 25; var pi2 = Math.PI * 2; var t = (time % dur) / dur * pi2 * 2; var nx = Math.sin(t + 1.2) * 0.5 + Math.sin(t * 2 + 0.7) * 0.3 + Math.sin(t * 3 + 2.4) * 0.2; var ny = Math.sin(t + 3.8) * 0.5 + Math.sin(t * 2 + 1.5) * 0.3 + Math.sin(t * 4 + 0.3) * 0.2; var prop = thisProperty.name.toLowerCase(); if (prop.indexOf('scale') >= 0) { value + [nx * a, ny * a] } else if (prop.indexOf('rotation') >= 0 || prop.indexOf('opacity') >= 0) { value + nx * a } else { value + [nx * a, ny * a] }",
            buildCode: function (params) {
                return "var dur = " + params.loopDur + "; var a = " + params.amp + "; var pi2 = Math.PI * 2; var t = (time % dur) / dur * pi2 * " + params.freq + "; var nx = Math.sin(t + 1.2) * 0.5 + Math.sin(t * 2 + 0.7) * 0.3 + Math.sin(t * 3 + 2.4) * 0.2; var ny = Math.sin(t + 3.8) * 0.5 + Math.sin(t * 2 + 1.5) * 0.3 + Math.sin(t * 4 + 0.3) * 0.2; var prop = thisProperty.name.toLowerCase(); if (prop.indexOf('scale') >= 0) { value + [nx * a, ny * a] } else if (prop.indexOf('rotation') >= 0 || prop.indexOf('opacity') >= 0) { value + nx * a } else { value + [nx * a, ny * a] }";
            }
        },
        {
            name: "Snapping Wiggle",
            description: "Grid-snapped wiggle - pixel-perfect movement",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 10, default: 3, step: 1 },
                { name: "gridSize", label: "Grid Size", min: 10, max: 100, default: 50, step: 10 }
            ],
            code: "var w = wiggle(3, 100); [Math.round(w[0] / 50) * 50, Math.round(w[1] / 50) * 50]",
            buildCode: function (params) {
                return "var w = wiggle(" + params.freq + ", " + (params.gridSize * 2) + "); [Math.round(w[0] / " + params.gridSize + ") * " + params.gridSize + ", Math.round(w[1] / " + params.gridSize + ") * " + params.gridSize + "]";
            }
        },
        {
            name: "Separate XY Wiggle",
            description: "Different frequency and amplitude for X and Y",
            targets: ["position"],
            params: [
                { name: "freqX", label: "Freq X", min: 1, max: 20, default: 3, step: 1 },
                { name: "ampX", label: "Amp X", min: 1, max: 100, default: 30, step: 1 },
                { name: "freqY", label: "Freq Y", min: 1, max: 20, default: 5, step: 1 },
                { name: "ampY", label: "Amp Y", min: 1, max: 100, default: 10, step: 1 }
            ],
            code: "seedRandom(1, true); var x = wiggle(3, 30)[0]; seedRandom(2, true); var y = wiggle(5, 10)[1]; [x, y]",
            buildCode: function (params) {
                return "seedRandom(1, true); var x = wiggle(" + params.freqX + ", " + params.ampX + ")[0]; seedRandom(2, true); var y = wiggle(" + params.freqY + ", " + params.ampY + ")[1]; [x, y]";
            }
        },
        {
            name: "Jumpy Wiggle",
            description: "Stop-motion style wiggle - posterized frames",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "fps", label: "FPS", min: 1, max: 30, default: 8, step: 1 },
                { name: "freq", label: "Frequency", min: 1, max: 20, default: 5, step: 1 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 30, step: 1 }
            ],
            code: "posterizeTime(8); wiggle(5, 30)",
            buildCode: function (params) {
                return "posterizeTime(" + params.fps + "); wiggle(" + params.freq + ", " + params.amp + ")";
            }
        },
        {
            name: "Noise Wiggle",
            description: "Perlin noise based organic movement",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 5, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 1, max: 100, default: 50, step: 1 }
            ],
            code: "var x = noise(time * 1) * 50; var y = noise(time * 1 + 100) * 50; value + [x, y]",
            buildCode: function (params) {
                return "var x = noise(time * " + params.freq + ") * " + params.amp + "; var y = noise(time * " + params.freq + " + 100) * " + params.amp + "; value + [x, y]";
            }
        },
        {
            name: "Shake",
            description: "Camera shake effect - intense and fast",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "freq", label: "Frequency", min: 10, max: 30, default: 20, step: 1 },
                { name: "amp", label: "Amplitude", min: 5, max: 50, default: 15, step: 1 },
                { name: "decay", label: "Decay", min: 1, max: 10, default: 3, step: 0.5 }
            ],
            code: "var t = time - inPoint;\nvar env = Math.exp(-3 * t);\nwiggle(20, 15 * env)",
            buildCode: function (params) {
                return "var t = time - inPoint;\nvar env = Math.exp(-" + params.decay + " * t);\nwiggle(" + params.freq + ", " + params.amp + " * env)";
            }
        },
        {
            name: "Jitter",
            description: "Choppy micro trembling - posterized jumps",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "amp", label: "Amplitude", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "fps", label: "Step FPS", min: 8, max: 24, default: 15, step: 1 }
            ],
            code: "posterizeTime(15);\nwiggle(30, 2)",
            buildCode: function (params) {
                return "posterizeTime(" + params.fps + ");\nwiggle(30, " + params.amp + ")";
            }
        },
        {
            name: "Drift",
            description: "Slow, gentle floating movement",
            targets: ["position", "rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 0.1, max: 1, default: 0.3, step: 0.1 },
                { name: "amp", label: "Amplitude", min: 5, max: 50, default: 20, step: 1 }
            ],
            code: "wiggle(0.3, 20)",
            buildCode: function (params) {
                return "wiggle(" + params.freq + ", " + params.amp + ")";
            }
        },
        {
            name: "Random Jump",
            description: "Random position jumps at intervals",
            targets: ["position"],
            params: [
                { name: "holdTime", label: "Hold Time (sec)", min: 0.1, max: 2, default: 0.5, step: 0.1 },
                { name: "rangeX", label: "Range X", min: 10, max: 200, default: 100, step: 10 },
                { name: "rangeY", label: "Range Y", min: 10, max: 200, default: 100, step: 10 }
            ],
            code: "var seed = Math.floor(time / 0.5); seedRandom(seed, true); var x = random(-100, 100); var y = random(-100, 100); value + [x, y]",
            buildCode: function (params) {
                return "var seed = Math.floor(time / " + params.holdTime + "); seedRandom(seed, true); var x = random(-" + params.rangeX + ", " + params.rangeX + "); var y = random(-" + params.rangeY + ", " + params.rangeY + "); value + [x, y]";
            }
        },
        {
            name: "Friction Slide",
            description: "Slide with realistic friction deceleration",
            category: "physics",
            targets: ["position"],
            params: [
                { name: "initialVelocity", label: "Initial Velocity", min: 100, max: 1000, default: 500, step: 50 },
                { name: "friction", label: "Friction", min: 1, max: 10, default: 3, step: 0.5 }
            ],
            code: "var v0 = 500;\nvar f = 3;\nvar t = time - inPoint;\nvar slideDur = 1.5;\nvar dist;\nif (t < slideDur) {\n  dist = v0 * (1 - Math.exp(-f * t)) / f;\n} else {\n  var maxDist = v0 * (1 - Math.exp(-f * slideDur)) / f;\n  var rt = Math.min((t - slideDur) / 1.5, 1);\n  dist = maxDist * (1 - rt * rt);\n}\nvalue + [dist, 0]",
            buildCode: function (params) {
                return "var v0 = " + params.initialVelocity + ";\nvar f = " + params.friction + ";\nvar t = time - inPoint;\nvar slideDur = 1.5;\nvar dist;\nif (t < slideDur) {\n  dist = v0 * (1 - Math.exp(-f * t)) / f;\n} else {\n  var maxDist = v0 * (1 - Math.exp(-f * slideDur)) / f;\n  var rt = Math.min((t - slideDur) / 1.5, 1);\n  dist = maxDist * (1 - rt * rt);\n}\nvalue + [dist, 0]";
            }
        },
        {
            name: "Air Drag",
            description: "Movement with air resistance",
            category: "physics",
            targets: ["position"],
            params: [
                { name: "velocity", label: "Velocity", min: 100, max: 800, default: 400, step: 50 },
                { name: "drag", label: "Drag", min: 0.5, max: 5, default: 2, step: 0.25 }
            ],
            code: "var v = 400;\nvar d = 2;\nvar t = time - inPoint;\nvar x = v * t * Math.exp(-d * t);\nvalue + [x, 0]",
            buildCode: function (params) {
                return "var v = " + params.velocity + ";\nvar d = " + params.drag + ";\nvar t = time - inPoint;\nvar x = v * t * Math.exp(-d * t);\nvalue + [x, 0]";
            }
        },
        {
            name: "Wind Sway",
            description: "Organic wind-blown swaying motion",
            category: "physics",
            targets: ["rotation", "position"],
            lockedTargets: true,
            params: [
                { name: "intensity", label: "Intensity", min: 5, max: 40, default: 15, step: 5 },
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.25 }
            ],
            code: "var i = 15;\nvar s = 1;\nvar wind = Math.sin(time * s * 2.1) * i * 0.5 + Math.sin(time * s * 3.7) * i * 0.3 + Math.sin(time * s * 1.3) * i * 0.2;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') !== -1) {\n    value + [wind, Math.sin(time * s * 0.7) * i * 0.15];\n} else {\n    value + wind;\n}",
            buildCode: function (params) {
                return "var i = " + params.intensity + ";\nvar s = " + params.speed + ";\nvar wind = Math.sin(time * s * 2.1) * i * 0.5 + Math.sin(time * s * 3.7) * i * 0.3 + Math.sin(time * s * 1.3) * i * 0.2;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') !== -1) {\n    value + [wind, Math.sin(time * s * 0.7) * i * 0.15];\n} else {\n    value + wind;\n}";
            }
        },
        {
            name: "Handheld Realistic",
            description: "Multi-frequency realistic handheld camera motion. Apply to Camera layer for real camera movement.",
            category: "camera",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "intensity", label: "Intensity", min: 1, max: 50, default: 15, step: 1 },
                { name: "speed", label: "Speed", min: 0.5, max: 5, default: 1.5, step: 0.1 }
            ],
            code: "var s = 1.5;\nvar i = 15;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n    wiggle(s * 3, i * 0.5);\n} else {\n    var a = wiggle(s * 3, i) - value;\n    var b = wiggle(s * 5, i * 0.5) - value;\n    value + [a[0] * 0.7 + b[0] * 0.3, a[1] * 0.5 + b[1] * 0.2];\n}",
            buildCode: function (params) {
                return "var s = " + params.speed + ";\nvar i = " + params.intensity + ";\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n    wiggle(s * 3, i * 0.5);\n} else {\n    var a = wiggle(s * 3, i) - value;\n    var b = wiggle(s * 5, i * 0.5) - value;\n    value + [a[0] * 0.7 + b[0] * 0.3, a[1] * 0.5 + b[1] * 0.2];\n}";
            }
        },
        {
            name: "Camera Drift",
            description: "Slow organic camera drift movement. Apply to Camera layer for real camera movement.",
            category: "camera",
            targets: ["position"],
            params: [
                { name: "speed", label: "Speed", min: 0.1, max: 1, default: 0.3, step: 0.05 },
                { name: "amount", label: "Amount", min: 5, max: 50, default: 20, step: 5 }
            ],
            code: "var s = 0.3;\nvar a = 20;\nvar x = Math.sin(time * s) * a;\nvar y = Math.cos(time * s * 0.7) * a * 0.6;\nvar z = Math.sin(time * s * 0.5) * a * 0.3;\nvalue + [x, y, z]",
            buildCode: function (params) {
                return "var s = " + params.speed + ";\nvar a = " + params.amount + ";\nvar x = Math.sin(time * s) * a;\nvar y = Math.cos(time * s * 0.7) * a * 0.6;\nvar z = Math.sin(time * s * 0.5) * a * 0.3;\nvalue + [x, y, z]";
            }
        },
        {
            name: "Pendulum Rotation",
            description: "Continuous pendulum swing",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 2, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 15, max: 60, default: 30, step: 5 }
            ],
            code: "Math.sin(time * 1 * Math.PI * 2) * 30",
            buildCode: function (params) {
                return "Math.sin(time * " + params.freq + " * Math.PI * 2) * " + params.amp;
            }
        },
        {
            name: "Swing",
            description: "Hanging object swing - position and rotation combined",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "freq", label: "Frequency", min: 0.3, max: 1, default: 0.5, step: 0.1 },
                { name: "amp", label: "Amplitude", min: 10, max: 30, default: 20, step: 5 }
            ],
            code: "var pn = thisProperty.name.toLowerCase();\nvar t = time * 0.5 * Math.PI * 2;\nif (pn == 'rotation' || pn == 'z rotation') {\n  Math.sin(t) * 20;\n} else {\n  value + [Math.sin(t) * 40, -Math.abs(Math.cos(t)) * 20 + 20];\n}",
            buildCode: function (params) {
                return "var pn = thisProperty.name.toLowerCase();\nvar t = time * " + params.freq + " * Math.PI * 2;\nif (pn == 'rotation' || pn == 'z rotation') {\n  Math.sin(t) * " + params.amp + ";\n} else {\n  value + [Math.sin(t) * " + Math.round(params.amp * 2) + ", -Math.abs(Math.cos(t)) * " + params.amp + " + " + params.amp + "];\n}";
            }
        },
        {
            name: "Inertia",
            description: "Momentum-based movement with natural deceleration (looping)",
            targets: ["position", "rotation", "scale"],
            params: [
                { name: "decay", label: "Decay", min: 2, max: 12, default: 5, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 50, max: 400, default: 150, step: 25 },
                { name: "hold", label: "Hold (frames)", min: 5, max: 40, default: 15, step: 5 }
            ],
            code: "var decay = 5;\nvar amp = 150;\nvar slideDur = 1.0;\nvar holdDur = 15 * thisComp.frameDuration;\nvar cycleDur = slideDur + holdDur;\nvar elapsed = (time - inPoint) % cycleDur;\nvar maxM = amp * (1 - Math.exp(-decay * slideDur)) / decay;\nvar m = (elapsed < slideDur) ? amp * (1 - Math.exp(-decay * elapsed)) / decay : maxM;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') >= 0) {\n    value + [m * 0.1, m * 0.1];\n} else if (prop.indexOf('rotation') >= 0) {\n    value + m * 0.3;\n} else {\n    value + [m, 0];\n}",
            buildCode: function (params) {
                return "var decay = " + params.decay + ";\nvar amp = " + params.amp + ";\nvar slideDur = 1.0;\nvar holdDur = " + params.hold + " * thisComp.frameDuration;\nvar cycleDur = slideDur + holdDur;\nvar elapsed = (time - inPoint) % cycleDur;\nvar maxM = amp * (1 - Math.exp(-decay * slideDur)) / decay;\nvar m = (elapsed < slideDur) ? amp * (1 - Math.exp(-decay * elapsed)) / decay : maxM;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') >= 0) {\n    value + [m * 0.1, m * 0.1];\n} else if (prop.indexOf('rotation') >= 0) {\n    value + m * 0.3;\n} else {\n    value + [m, 0];\n}";
            }
        }
    ],

    
    
    
    physics: [
        {
            name: "Auto Bounce",
            description: "Automatic bouncing from layer start",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 2, max: 5, default: 3, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 20, max: 100, default: 50, step: 5 },
                { name: "decay", label: "Decay", min: 2, max: 8, default: 5, step: 0.5 }
            ],
            code: "var elapsed = time - inPoint; var impact = Math.abs(Math.sin(elapsed * 3 * Math.PI)); var damping = Math.exp(-5 * elapsed); var rebound = impact * damping * 50; value + [0, -rebound]",
            buildCode: function (params) {
                return "var elapsed = time - inPoint; var impact = Math.abs(Math.sin(elapsed * " + params.freq + " * Math.PI)); var damping = Math.exp(-" + params.decay + " * elapsed); var rebound = impact * damping * " + params.amp + "; value + [0, -rebound]";
            }
        },
        {
            name: "Elastic Pop",
            description: "Elastic scale pop-in with overshoot (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "overshoot", label: "Overshoot", min: 1.1, max: 1.5, default: 1.2, step: 0.05 },
                { name: "freq", label: "Frequency", min: 3, max: 8, default: 4, step: 1 },
                { name: "decay", label: "Decay", min: 3, max: 8, default: 5, step: 0.5 }
            ],
            code: "var elapsed = time - inPoint; var rampDur = 0.3; var s; if (elapsed < rampDur) { s = linear(elapsed, 0, rampDur, 0, 120); } else { var spring = elapsed - rampDur; var ripple = Math.cos(spring * 8 * Math.PI) * Math.exp(-5 * spring); s = 100 + 20 * ripple; } [s, s]",
            buildCode: function (params) {
                var overshootVal = params.overshoot * 100;
                var diff = overshootVal - 100;
                var omega = params.freq * 2;
                return "var elapsed = time - inPoint; var rampDur = 0.3; var s; if (elapsed < rampDur) { s = linear(elapsed, 0, rampDur, 0, " + overshootVal + "); } else { var spring = elapsed - rampDur; var ripple = Math.cos(spring * " + omega + " * Math.PI) * Math.exp(-" + params.decay + " * spring); s = 100 + " + diff + " * ripple; } [s, s]";
            }
        },
        {
            name: "Springy",
            description: "Spring-like oscillation that settles",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 3, max: 10, default: 5, step: 1 },
                { name: "decay", label: "Decay", min: 2, max: 6, default: 4, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 50, default: 30, step: 5 }
            ],
            code: "var elapsed = time - inPoint; var omega = 10 * Math.PI; var envelope = Math.exp(-4 * elapsed); value + Math.sin(omega * elapsed) * 30 * envelope",
            buildCode: function (params) {
                var omega = params.freq * 2;
                return "var elapsed = time - inPoint; var omega = " + omega + " * Math.PI; var envelope = Math.exp(-" + params.decay + " * elapsed); value + Math.sin(omega * elapsed) * " + params.amp + " * envelope";
            }
        },
        {
            name: "Rubber",
            description: "Jelly-like X/Y independent oscillation (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "freq", label: "Frequency", min: 4, max: 8, default: 5, step: 1 },
                { name: "ampX", label: "Amp X", min: 5, max: 30, default: 15, step: 1 },
                { name: "ampY", label: "Amp Y", min: 5, max: 30, default: 20, step: 1 },
                { name: "decay", label: "Decay", min: 3, max: 6, default: 4, step: 0.5 }
            ],
            code: "var dt = time - inPoint; var w = 10 * Math.PI; var fade = Math.exp(-4 * dt); var osc = Math.sin(w * dt) * fade; var sx = 100 + osc * 15; var sy = 100 - osc * 20; [sx, sy]",
            buildCode: function (params) {
                var w = params.freq * 2;
                return "var dt = time - inPoint; var w = " + w + " * Math.PI; var fade = Math.exp(-" + params.decay + " * dt); var osc = Math.sin(w * dt) * fade; var sx = 100 + osc * " + params.ampX + "; var sy = 100 - osc * " + params.ampY + "; [sx, sy]";
            }
        },
        {
            name: "Squash & Stretch",
            description: "Classic animation principle - volume preserved (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "freq", label: "Frequency", min: 2, max: 5, default: 3, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 30, default: 20, step: 1 },
                { name: "decay", label: "Decay", min: 2, max: 5, default: 3, step: 0.5 }
            ],
            code: "var elapsed = time - inPoint; var deformation = Math.sin(elapsed * 3 * Math.PI) * Math.pow(Math.E, -3 * elapsed) * 20; [100 + deformation, 100 - deformation * 0.8]",
            buildCode: function (params) {
                return "var elapsed = time - inPoint; var deformation = Math.sin(elapsed * " + params.freq + " * Math.PI) * Math.pow(Math.E, -" + params.decay + " * elapsed) * " + params.amp + "; [100 + deformation, 100 - deformation * 0.8]";
            }
        },
        {
            name: "Anticipation",
            description: "Pull back before action - animation principle",
            targets: ["rotation"],
            params: [
                { name: "pullback", label: "Pullback", min: -50, max: -10, default: -20, step: 5 },
                { name: "dur", label: "Duration", min: 0.2, max: 0.5, default: 0.3, step: 0.05 }
            ],
            code: "var dur = 0.3; var pullback = -20; var release = 0.15; var t = time - inPoint; if (t < dur) { ease(t, 0, dur, 0, pullback); } else if (t < dur + release) { ease(t, dur, dur + release, pullback, 0); } else { 0; }",
            buildCode: function (params) {
                return "var dur = " + params.dur + "; var pullback = " + params.pullback + "; var release = 0.15; var t = time - inPoint; if (t < dur) { ease(t, 0, dur, 0, pullback); } else if (t < dur + release) { ease(t, dur, dur + release, pullback, 0); } else { 0; }";
            }
        },
        {
            name: "Overshoot",
            description: "Go past target then settle back",
            targets: ["rotation", "opacity"],
            params: [
                { name: "overshoot", label: "Overshoot %", min: 5, max: 30, default: 15, step: 5 },
                { name: "freq", label: "Frequency", min: 3, max: 6, default: 4, step: 1 },
                { name: "decay", label: "Decay", min: 4, max: 8, default: 6, step: 0.5 }
            ],
            code: "var elapsed = time - inPoint;\nvar peak = 15;\nvar rate = 4;\nvar falloff = 6;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('opacity') >= 0) {\n    60 * Math.max(Math.cos(elapsed * rate * 2 * Math.PI) * Math.exp(-falloff * elapsed), 0);\n} else {\n    peak * Math.sin(elapsed * rate * 2 * Math.PI) * Math.exp(-falloff * elapsed);\n}",
            buildCode: function (params) {
                return "var elapsed = time - inPoint;\nvar peak = " + params.overshoot + ";\nvar rate = " + params.freq + ";\nvar falloff = " + params.decay + ";\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('opacity') >= 0) {\n    60 * Math.max(Math.cos(elapsed * rate * 2 * Math.PI) * Math.exp(-falloff * elapsed), 0);\n} else {\n    peak * Math.sin(elapsed * rate * 2 * Math.PI) * Math.exp(-falloff * elapsed);\n}";
            }
        },
        {
            name: "Rope Physics",
            description: "Pendulum rope swing with decay",
            category: "physics",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "delay", label: "Delay", min: 0.05, max: 0.3, default: 0.1, step: 0.025 },
                { name: "damping", label: "Damping", min: 0.5, max: 0.95, default: 0.8, step: 0.05 }
            ],
            code: "var d = 0.1;\nvar damp = 0.8;\nvar t = time - inPoint;\nvar omega = 3 / d;\nvar env = Math.exp(-(1 - damp) * 4 * t);\nvar swing = Math.sin(omega * t) * env;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('rotation') !== -1) {\n    value + swing * 25;\n} else {\n    value + [swing * 80, (1 - Math.cos(omega * t * 0.5)) * env * 20];\n}",
            buildCode: function (params) {
                return "var d = " + params.delay + ";\nvar damp = " + params.damping + ";\nvar t = time - inPoint;\nvar omega = 3 / d;\nvar env = Math.exp(-(1 - damp) * 4 * t);\nvar swing = Math.sin(omega * t) * env;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('rotation') !== -1) {\n    value + swing * 25;\n} else {\n    value + [swing * 80, (1 - Math.cos(omega * t * 0.5)) * env * 20];\n}";
            }
        },
        {
            name: "Magnet Pull",
            description: "Magnetic attraction with decaying orbit",
            category: "physics",
            targets: ["position"],
            params: [
                { name: "amplitude", label: "Amplitude", min: 50, max: 400, default: 150, step: 25 },
                { name: "strength", label: "Strength", min: 0.01, max: 0.2, default: 0.05, step: 0.01 }
            ],
            code: "var amp = 150;\nvar str = 0.05;\nvar t = time - inPoint;\nvar decay = Math.exp(-str * 50 * t);\nvar angle = t * 1.5;\nvalue + [amp * decay * Math.cos(angle), amp * 0.4 * decay * Math.sin(angle)]",
            buildCode: function (params) {
                return "var amp = " + params.amplitude + ";\nvar str = " + params.strength + ";\nvar t = time - inPoint;\nvar decay = Math.exp(-str * 50 * t);\nvar angle = t * 1.5;\nvalue + [amp * decay * Math.cos(angle), amp * 0.4 * decay * Math.sin(angle)]";
            }
        },
        {
            name: "Collision Edge",
            description: "Bounce off composition edges",
            category: "physics",
            targets: ["position"],
            params: [
                { name: "velocity", label: "Velocity", min: 100, max: 500, default: 200, step: 25 },
                { name: "bounce", label: "Bounce", min: 0.5, max: 0.95, default: 0.8, step: 0.05 }
            ],
            code: "var v = 200;\nvar b = 0.8;\nvar t = time - inPoint;\nvar range = v;\nvar leg = Math.floor(t / (range / v));\nvar frac = (t / (range / v)) - leg;\nvar energy = Math.pow(b, leg);\nvar x;\nif (leg % 2 === 0) { x = frac * range; }\nelse { x = (1 - frac) * range; }\nx = x * energy;\nvalue + [x, 0]",
            buildCode: function (params) {
                return "var v = " + params.velocity + ";\nvar b = " + params.bounce + ";\nvar t = time - inPoint;\nvar range = v;\nvar leg = Math.floor(t / (range / v));\nvar frac = (t / (range / v)) - leg;\nvar energy = Math.pow(b, leg);\nvar x;\nif (leg % 2 === 0) { x = frac * range; }\nelse { x = (1 - frac) * range; }\nx = x * energy;\nvalue + [x, 0]";
            }
        },
        {
            name: "Mass Spring",
            description: "Weighted spring oscillation",
            category: "physics",
            targets: ["position", "scale"],
            lockedTargets: true,
            params: [
                { name: "stiffness", label: "Stiffness", min: 1, max: 10, default: 4, step: 0.5 },
                { name: "mass", label: "Mass", min: 0.5, max: 3, default: 1, step: 0.25 },
                { name: "damping", label: "Damping", min: 0.1, max: 0.5, default: 0.2, step: 0.05 }
            ],
            code: "var k = 4;\nvar m = 1;\nvar c = 0.2;\nvar t = time - inPoint;\nvar omega = Math.sqrt(k / m);\nvar amp = 50 * Math.exp(-c * t) * Math.cos(omega * t);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') !== -1) {\n    value + [amp * 0.3, amp * 0.3];\n} else {\n    value + [0, amp];\n}",
            buildCode: function (params) {
                return "var k = " + params.stiffness + ";\nvar m = " + params.mass + ";\nvar c = " + params.damping + ";\nvar t = time - inPoint;\nvar omega = Math.sqrt(k / m);\nvar amp = 50 * Math.exp(-c * t) * Math.cos(omega * t);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') !== -1) {\n    value + [amp * 0.3, amp * 0.3];\n} else {\n    value + [0, amp];\n}";
            }
        },
        {
            name: "Arrive + Settle",
            description: "Smooth arrival with settling oscillation",
            category: "combos",
            targets: ["position", "scale"],
            lockedTargets: true,
            params: [
                { name: "arriveTime", label: "Arrive Time", min: 0.3, max: 2, default: 0.8, step: 0.1 },
                { name: "settleAmp", label: "Settle Amp", min: 5, max: 30, default: 15, step: 5 },
                { name: "decay", label: "Decay", min: 3, max: 10, default: 6, step: 0.5 }
            ],
            code: "var at = 0.8;\nvar sa = 15;\nvar d = 6;\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') !== -1) {\n    if (t < at) {\n        ease(t, 0, at, value - [20, 20], value);\n    } else {\n        var st = t - at;\n        var settle = Math.sin(st * 12) * sa * 0.3 * Math.exp(-d * st);\n        value + [settle, settle];\n    }\n} else {\n    if (t < at) {\n        ease(t, 0, at, value - [200, 0], value);\n    } else {\n        var st = t - at;\n        var settle = Math.sin(st * 12) * sa * Math.exp(-d * st);\n        value + [settle, 0];\n    }\n}",
            buildCode: function (params) {
                return "var at = " + params.arriveTime + ";\nvar sa = " + params.settleAmp + ";\nvar d = " + params.decay + ";\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('scale') !== -1) {\n    if (t < at) {\n        ease(t, 0, at, value - [20, 20], value);\n    } else {\n        var st = t - at;\n        var settle = Math.sin(st * 12) * sa * 0.3 * Math.exp(-d * st);\n        value + [settle, settle];\n    }\n} else {\n    if (t < at) {\n        ease(t, 0, at, value - [200, 0], value);\n    } else {\n        var st = t - at;\n        var settle = Math.sin(st * 12) * sa * Math.exp(-d * st);\n        value + [settle, 0];\n    }\n}";
            }
        },
        {
            name: "Anticipation Pop",
            description: "Pull back anticipation then pop forward",
            category: "combos",
            targets: ["scale", "position"],
            lockedTargets: true,
            params: [
                { name: "anticipation", label: "Anticipation", min: 0.1, max: 0.4, default: 0.2, step: 0.05 },
                { name: "popAmount", label: "Pop Amount", min: 10, max: 40, default: 20, step: 5 }
            ],
            code: "var ant = 0.2;\nvar pop = 20;\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nvar v;\nif (t < ant) {\n    v = ease(t, 0, ant, 0, -pop * 0.4);\n} else if (t < ant + 0.1) {\n    v = ease(t, ant, ant + 0.1, -pop * 0.4, pop);\n} else {\n    var st = t - ant - 0.1;\n    v = pop * Math.exp(-8 * st);\n}\nif (prop.indexOf('scale') !== -1) {\n    value + [v, v];\n} else {\n    value + [v, 0];\n}",
            buildCode: function (params) {
                return "var ant = " + params.anticipation + ";\nvar pop = " + params.popAmount + ";\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nvar v;\nif (t < ant) {\n    v = ease(t, 0, ant, 0, -pop * 0.4);\n} else if (t < ant + 0.1) {\n    v = ease(t, ant, ant + 0.1, -pop * 0.4, pop);\n} else {\n    var st = t - ant - 0.1;\n    v = pop * Math.exp(-8 * st);\n}\nif (prop.indexOf('scale') !== -1) {\n    value + [v, v];\n} else {\n    value + [v, 0];\n}";
            }
        },
        {
            name: "Throw + Catch",
            description: "Throw motion with catching deceleration",
            category: "combos",
            targets: ["position"],
            params: [
                { name: "throwSpeed", label: "Throw Speed", min: 200, max: 800, default: 400, step: 50 },
                { name: "catchTime", label: "Catch Time", min: 0.5, max: 2, default: 1, step: 0.1 }
            ],
            code: "var ts = 400;\nvar ct = 1;\nvar t = time - inPoint;\nif (t < ct) {\n  var progress = t / ct;\n  var eased = 1 - Math.pow(1 - progress, 3);\n  value + [ts * eased, 0];\n} else if (t < ct + 0.3) {\n  value + [ts, 0];\n} else if (t < ct * 2 + 0.3) {\n  var rT = (t - ct - 0.3) / ct;\n  value + [ts * (1 - rT * rT * rT), 0];\n} else {\n  value;\n}",
            buildCode: function (params) {
                return "var ts = " + params.throwSpeed + ";\nvar ct = " + params.catchTime + ";\nvar t = time - inPoint;\nif (t < ct) {\n  var progress = t / ct;\n  var eased = 1 - Math.pow(1 - progress, 3);\n  value + [ts * eased, 0];\n} else if (t < ct + 0.3) {\n  value + [ts, 0];\n} else if (t < ct * 2 + 0.3) {\n  var rT = (t - ct - 0.3) / ct;\n  value + [ts * (1 - rT * rT * rT), 0];\n} else {\n  value;\n}";
            }
        },
        {
            name: "Drift + Snap",
            description: "Floating drift that snaps to position",
            category: "combos",
            targets: ["position"],
            params: [
                { name: "driftTime", label: "Drift Time", min: 1, max: 4, default: 2, step: 0.25 },
                { name: "driftAmount", label: "Drift Amount", min: 20, max: 100, default: 50, step: 10 }
            ],
            code: "var dt = 2;\nvar da = 50;\nvar t = time - inPoint;\nif (t < dt) {\n  var drift = Math.sin(t * 2) * da * (1 - t / dt);\n  value + [drift, drift * 0.5];\n} else { value; }",
            buildCode: function (params) {
                return "var dt = " + params.driftTime + ";\nvar da = " + params.driftAmount + ";\nvar t = time - inPoint;\nif (t < dt) {\n  var drift = Math.sin(t * 2) * da * (1 - t / dt);\n  value + [drift, drift * 0.5];\n} else { value; }";
            }
        },
        {
            name: "Float + Land",
            description: "Gentle floating descent with soft landing",
            category: "combos",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "floatTime", label: "Float Time", min: 1, max: 4, default: 2, step: 0.25 },
                { name: "floatHeight", label: "Float Height", min: 50, max: 300, default: 150, step: 25 }
            ],
            code: "var ft = 2;\nvar fh = 150;\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (t < ft) {\n  var progress = t / ft;\n  var eased = progress * progress;\n  var sway = Math.sin(t * 3) * 20;\n  var fade = 1 - progress * progress * progress;\n  if (prop.indexOf('rotation') !== -1) {\n    value + sway * fade * 0.3;\n  } else {\n    value + [sway * fade, -fh * (1 - eased)];\n  }\n} else { value; }",
            buildCode: function (params) {
                return "var ft = " + params.floatTime + ";\nvar fh = " + params.floatHeight + ";\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (t < ft) {\n  var progress = t / ft;\n  var eased = progress * progress;\n  var sway = Math.sin(t * 3) * 20;\n  var fade = 1 - progress * progress * progress;\n  if (prop.indexOf('rotation') !== -1) {\n    value + sway * fade * 0.3;\n  } else {\n    value + [sway * fade, -fh * (1 - eased)];\n  }\n} else { value; }";
            }
        },
        {
            name: "Whip + Settle",
            description: "Fast whip motion with settling bounce",
            category: "combos",
            targets: ["rotation", "position"],
            lockedTargets: true,
            params: [
                { name: "whipSpeed", label: "Whip Speed", min: 0.1, max: 0.4, default: 0.2, step: 0.05 },
                { name: "settleFreq", label: "Settle Freq", min: 3, max: 10, default: 6, step: 0.5 }
            ],
            code: "var ws = 0.2;\nvar sf = 6;\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') !== -1) {\n    if (t < ws) {\n        ease(t, 0, ws, value + [-200, 0], value);\n    } else {\n        var st = t - ws;\n        var settle = 15 * Math.sin(st * sf * Math.PI * 2) * Math.exp(-5 * st);\n        value + [settle, 0];\n    }\n} else {\n    if (t < ws) {\n        ease(t, 0, ws, value - 90, value);\n    } else {\n        var st = t - ws;\n        var settle = 15 * Math.sin(st * sf * Math.PI * 2) * Math.exp(-5 * st);\n        value + settle;\n    }\n}",
            buildCode: function (params) {
                return "var ws = " + params.whipSpeed + ";\nvar sf = " + params.settleFreq + ";\nvar t = time - inPoint;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') !== -1) {\n    if (t < ws) {\n        ease(t, 0, ws, value + [-200, 0], value);\n    } else {\n        var st = t - ws;\n        var settle = 15 * Math.sin(st * sf * Math.PI * 2) * Math.exp(-5 * st);\n        value + [settle, 0];\n    }\n} else {\n    if (t < ws) {\n        ease(t, 0, ws, value - 90, value);\n    } else {\n        var st = t - ws;\n        var settle = 15 * Math.sin(st * sf * Math.PI * 2) * Math.exp(-5 * st);\n        value + settle;\n    }\n}";
            }
        },
        {
            name: "Impact Shake",
            description: "Heavy impact shake that settles down. Apply to Camera layer for real camera shake.",
            category: "camera",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "intensity", label: "Intensity", min: 10, max: 100, default: 40, step: 5 },
                { name: "decay", label: "Decay", min: 2, max: 10, default: 5, step: 0.5 }
            ],
            code: "var freq = 25;\nvar amp = 40;\nvar decay = 5;\nvar delay = 0.2;\nvar cycleDur = delay + 2;\nvar t = (time - inPoint) % cycleDur;\nvar prop = thisProperty.name.toLowerCase();\nif (t < delay) {\n    value;\n} else {\n    var st = t - delay;\n    var env = Math.exp(-decay * st);\n    var seg = Math.floor(st * freq);\n    seedRandom(seg, true);\n    if (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n        value + random(-1, 1) * amp * env;\n    } else {\n        value + [random(-1, 1) * amp * env, random(-1, 1) * amp * 0.6 * env];\n    }\n}",
            buildCode: function (params) {
                return "var freq = 25;\nvar amp = " + params.intensity + ";\nvar decay = " + params.decay + ";\nvar delay = 0.2;\nvar cycleDur = delay + 2;\nvar t = (time - inPoint) % cycleDur;\nvar prop = thisProperty.name.toLowerCase();\nif (t < delay) {\n    value;\n} else {\n    var st = t - delay;\n    var env = Math.exp(-decay * st);\n    var seg = Math.floor(st * freq);\n    seedRandom(seg, true);\n    if (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n        value + random(-1, 1) * amp * env;\n    } else {\n        value + [random(-1, 1) * amp * env, random(-1, 1) * amp * 0.6 * env];\n    }\n}";
            }
        },
        {
            name: "Wobble",
            description: "Continuous random wobble - organic rotation",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 2, max: 8, default: 4, step: 1 },
                { name: "amp", label: "Amplitude", min: 5, max: 20, default: 15, step: 1 }
            ],
            code: "wiggle(4, 15) - value",
            buildCode: function (params) {
                return "wiggle(" + params.freq + ", " + params.amp + ") - value";
            }
        },
        {
            name: "Shake Position",
            description: "Position + rotation shake combo with decay",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "freq", label: "Frequency", min: 10, max: 30, default: 20, step: 1 },
                { name: "amp", label: "Amplitude", min: 5, max: 30, default: 15, step: 1 },
                { name: "decay", label: "Decay", min: 1, max: 5, default: 3, step: 0.5 }
            ],
            code: "var pn = thisProperty.name.toLowerCase();\nvar t = time - inPoint;\nvar env = Math.exp(-3 * t);\nif (pn == 'rotation' || pn == 'z rotation') {\n  wiggle(20, 5 * env) - value;\n} else {\n  value + wiggle(20, 15 * env) - value;\n}",
            buildCode: function (params) {
                return "var pn = thisProperty.name.toLowerCase();\nvar t = time - inPoint;\nvar env = Math.exp(-" + params.decay + " * t);\nif (pn == 'rotation' || pn == 'z rotation') {\n  wiggle(" + params.freq + ", " + Math.round(params.amp * 0.33) + " * env) - value;\n} else {\n  value + wiggle(" + params.freq + ", " + params.amp + " * env) - value;\n}";
            }
        }
    ],

    
    
    
    transform: [
        {
            name: "Scale Pulse",
            description: "Sharp rhythmic scale pulse - snappy beat (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 5, max: 20, default: 10, step: 1 }
            ],
            code: "var raw = Math.sin(time * 2 * Math.PI * 2);\nvar sharp = Math.pow(Math.abs(raw), 0.3) * (raw < 0 ? -1 : 1);\nvar s = 100 + sharp * 10;\n[s, s]",
            buildCode: function (params) {
                return "var raw = Math.sin(time * " + params.freq + " * Math.PI * 2);\nvar sharp = Math.pow(Math.abs(raw), 0.3) * (raw < 0 ? -1 : 1);\nvar s = 100 + sharp * " + params.amp + ";\n[s, s]";
            }
        },
        {
            name: "Heartbeat",
            description: "Double-beat heart rhythm (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "bpm", label: "BPM", min: 60, max: 120, default: 72, step: 1 },
                { name: "amp", label: "Amplitude", min: 10, max: 25, default: 15, step: 1 }
            ],
            code: "var t = time * 72 / 60;\nvar b1 = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 12);\nvar b2 = Math.pow(Math.max(0, Math.sin((t + 0.3) * Math.PI)), 12) * 0.6;\nvar beat = Math.max(b1, b2);\nvar s = 100 + beat * 15;\n[s, s]",
            buildCode: function (params) {
                return "var t = time * " + params.bpm + " / 60;\nvar b1 = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 12);\nvar b2 = Math.pow(Math.max(0, Math.sin((t + 0.3) * Math.PI)), 12) * 0.6;\nvar beat = Math.max(b1, b2);\nvar s = 100 + beat * " + params.amp + ";\n[s, s]";
            }
        },
        {
            name: "Pop In",
            description: "Quick pop-in with slight overshoot (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "dur", label: "Duration", min: 0.2, max: 0.5, default: 0.3, step: 0.05 },
                { name: "overshoot", label: "Overshoot", min: 1.05, max: 1.2, default: 1.1, step: 0.05 }
            ],
            code: "var dur = 0.3; var overshoot = 1.1; var settle = 0.2; var t = time - inPoint; var s; if (t < dur) { s = ease(t, 0, dur, 0, 100 * overshoot); } else if (t < dur + settle) { s = ease(t, dur, dur + settle, 100 * overshoot, 100); } else { s = 100; } [s, s]",
            buildCode: function (params) {
                var overshootScale = params.overshoot * 100;
                return "var dur = " + params.dur + "; var overshoot = " + params.overshoot + "; var settle = 0.2; var t = time - inPoint; var s; if (t < dur) { s = ease(t, 0, dur, 0, " + overshootScale + "); } else if (t < dur + settle) { s = ease(t, dur, dur + settle, " + overshootScale + ", 100); } else { s = 100; } [s, s]";
            }
        },
        {
            name: "Jelly",
            description: "Continuous jelly wobble - never stops (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "freq", label: "Frequency", min: 3, max: 8, default: 5, step: 1 },
                { name: "ampX", label: "Amp X", min: 3, max: 10, default: 5, step: 1 },
                { name: "ampY", label: "Amp Y", min: 3, max: 10, default: 7, step: 1 }
            ],
            code: "var t = time - inPoint;\nvar sx = 100 + Math.sin(t * 5 * Math.PI * 2) * 5;\nvar sy = 100 - Math.sin(t * 5 * Math.PI * 2) * 7;\n[sx, sy]",
            buildCode: function (params) {
                return "var t = time - inPoint;\nvar sx = 100 + Math.sin(t * " + params.freq + " * Math.PI * 2) * " + params.ampX + ";\nvar sy = 100 - Math.sin(t * " + params.freq + " * Math.PI * 2) * " + params.ampY + ";\n[sx, sy]";
            }
        },
        {
            name: "Uniform Scale Wiggle",
            description: "Wiggle maintaining proportions (Works at 100% scale)",
            targets: ["scale"],
            params: [
                { name: "freq", label: "Frequency", min: 1, max: 10, default: 3, step: 1 },
                { name: "amp", label: "Amplitude", min: 5, max: 30, default: 15, step: 1 }
            ],
            code: "var s = wiggle(3, 15)[0]; [s, s]",
            buildCode: function (params) {
                return "var s = wiggle(" + params.freq + ", " + params.amp + ")[0]; [s, s]";
            }
        },
        {
            name: "Spin",
            description: "Continuous rotation",
            targets: ["rotation"],
            params: [
                { name: "speed", label: "Degrees/sec", min: 30, max: 360, default: 90, step: 30 }
            ],
            code: "time * 90",
            buildCode: function (params) {
                return "time * " + params.speed;
            }
        },
        {
            name: "Look At",
            description: "Layer rotates smoothly as if tracking a moving target. Adjust speed and range, add randomness for organic feel.",
            targets: ["rotation"],
            params: [
                { name: "speed", label: "Speed", min: 0.1, max: 3, default: 1, step: 0.1 },
                { name: "range", label: "Range", min: 5, max: 90, default: 30, step: 5 },
                { name: "random", label: "Random", min: 0, max: 100, default: 0, step: 5 }
            ],
            code: "var spd = 1;\nvar rng = 30;\nvar rnd = 0;\nvar t = time * spd;\nvar pi2 = Math.PI * 2;\nvar tx = Math.cos(t * pi2) * 80;\nvar ty = Math.sin(t * pi2 * 2) * 40;\nvar smooth = Math.atan2(ty, tx) * (180 / Math.PI) * (rng / 90);\nvar blend = rnd / 100;\nif (blend > 0) {\n    var w = wiggle(spd * 2, rng, 3, 0.5) - value;\n    value + smooth * (1 - blend) + w * blend;\n} else {\n    value + smooth;\n}",
            buildCode: function (params) {
                return "var spd = " + params.speed + ";\nvar rng = " + params.range + ";\nvar rnd = " + params.random + ";\nvar t = time * spd;\nvar pi2 = Math.PI * 2;\nvar tx = Math.cos(t * pi2) * 80;\nvar ty = Math.sin(t * pi2 * 2) * 40;\nvar smooth = Math.atan2(ty, tx) * (180 / Math.PI) * (rng / 90);\nvar blend = rnd / 100;\nif (blend > 0) {\n    var w = wiggle(spd * 2, rng, 3, 0.5) - value;\n    value + smooth * (1 - blend) + w * blend;\n} else {\n    value + smooth;\n}";
            }
        },
        {
            name: "Throw",
            description: "Constant velocity movement",
            targets: ["position"],
            params: [
                { name: "velocityX", label: "Velocity X", min: -500, max: 500, default: 100, step: 50 },
                { name: "velocityY", label: "Velocity Y", min: -500, max: 500, default: -50, step: 50 }
            ],
            code: "value + [100, -50] * (time - inPoint)",
            buildCode: function (params) {
                return "value + [" + params.velocityX + ", " + params.velocityY + "] * (time - inPoint)";
            }
        },
        {
            name: "Orbit",
            description: "Circular orbit around center",
            targets: ["position"],
            params: [
                { name: "radius", label: "Radius", min: 50, max: 300, default: 200, step: 25 },
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.5 }
            ],
            code: "var cx = thisComp.width / 2;\nvar cy = thisComp.height / 2;\nvar angle = time * 1 * Math.PI * 2;\n[cx + Math.cos(angle) * 200, cy + Math.sin(angle) * 200]",
            buildCode: function (params) {
                return "var cx = thisComp.width / 2;\nvar cy = thisComp.height / 2;\nvar angle = time * " + params.speed + " * Math.PI * 2;\n[cx + Math.cos(angle) * " + params.radius + ", cy + Math.sin(angle) * " + params.radius + "]";
            }
        },
        {
            name: "Figure 8 Path",
            description: "Move along a figure-8 (infinity) path",
            targets: ["position"],
            params: [
                { name: "radius", label: "Radius", min: 50, max: 300, default: 150, step: 25 },
                { name: "speed", label: "Speed", min: 0.2, max: 2, default: 0.5, step: 0.1 }
            ],
            code: "var cx = thisComp.width / 2;\nvar cy = thisComp.height / 2;\nvar t = time * 0.5 * Math.PI * 2;\n[cx + Math.sin(t) * 150, cy + Math.sin(t * 2) * 75]",
            buildCode: function (params) {
                return "var cx = thisComp.width / 2;\nvar cy = thisComp.height / 2;\nvar t = time * " + params.speed + " * Math.PI * 2;\n[cx + Math.sin(t) * " + params.radius + ", cy + Math.sin(t * 2) * " + Math.round(params.radius * 0.5) + "]";
            }
        },
        {
            name: "Drift Position",
            description: "Wavy drifting movement - like floating on water",
            targets: ["position"],
            params: [
                { name: "speedX", label: "Speed X", min: -50, max: 50, default: 10, step: 5 },
                { name: "speedY", label: "Speed Y", min: -50, max: 50, default: -5, step: 5 },
                { name: "wave", label: "Wave", min: 5, max: 30, default: 15, step: 5 }
            ],
            code: "var t = time - inPoint;\nvalue + [10 * t + Math.sin(t * 2) * 15, -5 * t + Math.cos(t * 3) * 10]",
            buildCode: function (params) {
                return "var t = time - inPoint;\nvalue + [" + params.speedX + " * t + Math.sin(t * 2) * " + params.wave + ", " + params.speedY + " * t + Math.cos(t * 3) * " + Math.round(params.wave * 0.67) + "]";
            }
        },
        {
            name: "Follow with Delay",
            description: "Copies another layer's animation with a time lag. Create a Null named 'Leader', add keyframes to it — this layer repeats the same motion delayed.",
            category: "linking",
            targets: ["position", "rotation", "scale", "opacity"],
            params: [
                { name: "delay", label: "Delay (sec)", min: 0.1, max: 1, default: 0.3, step: 0.1 }
            ],
            code: "try {\nvar d = 0.3;\nvar ldr = thisComp.layer(\"Leader\");\nvar pn = thisProperty.name;\nif (pn == \"Position\") ldr.transform.position.valueAtTime(time - d);\nelse if (pn == \"Rotation\" || pn == \"Z Rotation\") ldr.transform.rotation.valueAtTime(time - d);\nelse if (pn == \"Scale\") ldr.transform.scale.valueAtTime(time - d);\nelse if (pn == \"Opacity\") ldr.transform.opacity.valueAtTime(time - d);\nelse value;\n} catch(e) { value; }",
            buildCode: function (params) {
                return "try {\nvar d = " + params.delay + ";\nvar ldr = thisComp.layer(\"Leader\");\nvar pn = thisProperty.name;\nif (pn == \"Position\") ldr.transform.position.valueAtTime(time - d);\nelse if (pn == \"Rotation\" || pn == \"Z Rotation\") ldr.transform.rotation.valueAtTime(time - d);\nelse if (pn == \"Scale\") ldr.transform.scale.valueAtTime(time - d);\nelse if (pn == \"Opacity\") ldr.transform.opacity.valueAtTime(time - d);\nelse value;\n} catch(e) { value; }";
            }
        },
        {
            name: "Elastic Follow",
            description: "Layer smoothly glides toward a target with elastic easing. Create a Null named 'Target' and place it — layer slides to that position.",
            category: "linking",
            targets: ["position"],
            params: [
                { name: "friction", label: "Friction", min: 1, max: 5, default: 3, step: 0.5 }
            ],
            code: "try {\nvar tgt = thisComp.layer(\"Target\").transform.position;\nvar t = time - inPoint;\nvar f = 1 - Math.exp(-3 * t);\n[value[0] + (tgt[0] - value[0]) * f, value[1] + (tgt[1] - value[1]) * f];\n} catch(e) { value; }",
            buildCode: function (params) {
                return "try {\nvar tgt = thisComp.layer(\"Target\").transform.position;\nvar t = time - inPoint;\nvar f = 1 - Math.exp(-" + params.friction + " * t);\n[value[0] + (tgt[0] - value[0]) * f, value[1] + (tgt[1] - value[1]) * f];\n} catch(e) { value; }";
            }
        },
        {
            name: "Stagger by Index",
            description: "Wave/cascade effect — layers replay the same motion with increasing delay. Create 'Master' Null with keyframes, apply to multiple layers.",
            category: "linking",
            targets: ["position"],
            params: [
                { name: "delayPerLayer", label: "Delay/Layer", min: 0.05, max: 0.3, default: 0.1, step: 0.05 }
            ],
            code: "try { var master = thisComp.layer(\"Master\"); var delay = (index - master.index) * 0.1; master.transform.position.valueAtTime(time - delay); } catch(e) { value; }",
            buildCode: function (params) {
                return "try { var master = thisComp.layer(\"Master\"); var delay = (index - master.index) * " + params.delayPerLayer + "; master.transform.position.valueAtTime(time - delay); } catch(e) { value; }";
            }
        },
        {
            name: "Chain Follow",
            description: "Snake chain — each layer follows the one above with delay. Keyframe the TOP layer (index 1), duplicate it below, apply to all. Lower layers trail behind automatically.",
            category: "linking",
            targets: ["position"],
            params: [
                { name: "delay", label: "Delay", min: 0.05, max: 0.3, default: 0.1, step: 0.025 }
            ],
            code: "var d = 0.1;\nif (index > 1) {\n  thisComp.layer(index - 1).transform.position.valueAtTime(time - d);\n} else { value; }",
            buildCode: function (params) {
                return "var d = " + params.delay + ";\nif (index > 1) {\n  thisComp.layer(index - 1).transform.position.valueAtTime(time - d);\n} else { value; }";
            }
        },
        {
            name: "Mirror Movement",
            description: "Layer mirrors the one above — source goes right, mirror goes left. Keyframe the TOP layer (index 1), place mirror layer below it. Distance controls mirror multiplier (100 = exact mirror). Speed is preview-only.",
            category: "linking",
            targets: ["position"],
            params: [
                { name: "distance", label: "Distance", min: 50, max: 200, default: 100, step: 10 },
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.25 }
            ],
            code: "var src = thisComp.layer(index - 1);\nvar center = thisComp.width / 2;\nvar d = 1;\nvar srcPos = src.transform.position;\nvar dx = srcPos[0] - center;\n[center - dx * d, srcPos[1]]",
            buildCode: function (params) {
                var dist = Math.round(params.distance) / 100;
                return "var src = thisComp.layer(index - 1);\nvar center = thisComp.width / 2;\nvar d = " + dist + ";\nvar srcPos = src.transform.position;\nvar dx = srcPos[0] - center;\n[center - dx * d, srcPos[1]]";
            }
        },
        {
            name: "Orbit Chain",
            description: "Circular orbit around comp center with rotation. Apply to multiple layers — each gets a different phase offset for chain effect.",
            category: "linking",
            targets: ["position", "rotation"],
            lockedTargets: true,
            params: [
                { name: "radius", label: "Radius", min: 50, max: 300, default: 100, step: 25 },
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.25 }
            ],
            code: "var r = 100;\nvar s = 1;\nvar phase = (index - 1) * Math.PI / 4;\nvar angle = time * s * 0.5 * Math.PI * 2 + phase;\nvar pn = thisProperty.name.toLowerCase();\nif (pn == 'rotation' || pn == 'z rotation') {\n  value + Math.sin(angle) * 15;\n} else {\n  [thisComp.width/2 + Math.cos(angle) * r, thisComp.height/2 + Math.sin(angle) * r];\n}",
            buildCode: function (params) {
                return "var r = " + params.radius + ";\nvar s = " + params.speed + ";\nvar phase = (index - 1) * Math.PI / 4;\nvar angle = time * s * 0.5 * Math.PI * 2 + phase;\nvar pn = thisProperty.name.toLowerCase();\nif (pn == 'rotation' || pn == 'z rotation') {\n  value + Math.sin(angle) * 15;\n} else {\n  [thisComp.width/2 + Math.cos(angle) * r, thisComp.height/2 + Math.sin(angle) * r];\n}";
            }
        },
        {
            name: "Elastic Connect",
            description: "Rubber band between layers — each layer pulls toward the one above. Create 2+ layers, move Layer 1 — others stretch to follow.",
            category: "linking",
            targets: ["position"],
            params: [
                { name: "elasticity", label: "Elasticity", min: 0.1, max: 0.9, default: 0.5, step: 0.1 }
            ],
            code: "var e = 0.5;\nif (index > 1) {\n  var tgt = thisComp.layer(index - 1).transform.position;\n  [value[0] + (tgt[0] - value[0]) * e, value[1] + (tgt[1] - value[1]) * e];\n} else { value; }",
            buildCode: function (params) {
                return "var e = " + params.elasticity + ";\nif (index > 1) {\n  var tgt = thisComp.layer(index - 1).transform.position;\n  [value[0] + (tgt[0] - value[0]) * e, value[1] + (tgt[1] - value[1]) * e];\n} else { value; }";
            }
        },
        {
            name: "Dolly Zoom",
            description: "Vertigo/Hitchcock dolly zoom effect — scale + position creates depth illusion.",
            category: "camera",
            targets: ["position", "scale"],
            lockedTargets: true,
            params: [
                { name: "duration", label: "Duration", min: 1, max: 5, default: 2, step: 0.5 },
                { name: "intensity", label: "Intensity", min: 10, max: 100, default: 50, step: 5 }
            ],
            code: "var dur = 2;\nvar intensity = 50;\nvar cycle = dur + 1;\nvar t = ((time - inPoint) % cycle) / dur;\nt = Math.min(Math.max(t, 0), 1);\nvar wave = Math.sin(t * Math.PI);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + wave * intensity;\n} else if (prop.indexOf('scale') >= 0) {\n    value + [wave * intensity, wave * intensity];\n} else {\n    value + [0, -wave * intensity * 0.3];\n}",
            buildCode: function (params) {
                return "var dur = " + params.duration + ";\nvar intensity = " + params.intensity + ";\nvar cycle = dur + 1;\nvar t = ((time - inPoint) % cycle) / dur;\nt = Math.min(Math.max(t, 0), 1);\nvar wave = Math.sin(t * Math.PI);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + wave * intensity;\n} else if (prop.indexOf('scale') >= 0) {\n    value + [wave * intensity, wave * intensity];\n} else {\n    value + [0, -wave * intensity * 0.3];\n}";
            }
        },
        {
            name: "Breathing",
            description: "Subtle breathing motion like a person holding camera. On Camera layers, controls Zoom. On other layers, controls Scale.",
            category: "camera",
            targets: ["position", "scale"],
            lockedTargets: true,
            params: [
                { name: "rate", label: "Breath Rate", min: 0.2, max: 1, default: 0.4, step: 0.1 },
                { name: "amount", label: "Amount", min: 2, max: 20, default: 8, step: 1 }
            ],
            code: "var rate = 0.4;\nvar amt = 8;\nvar breath = Math.sin(time * rate * Math.PI * 2) * amt;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + breath * 2;\n} else if (prop.indexOf('scale') >= 0) {\n    value + [breath * 0.5, breath * 0.5];\n} else {\n    value + [0, breath];\n}",
            buildCode: function (params) {
                return "var rate = " + params.rate + ";\nvar amt = " + params.amount + ";\nvar breath = Math.sin(time * rate * Math.PI * 2) * amt;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + breath * 2;\n} else if (prop.indexOf('scale') >= 0) {\n    value + [breath * 0.5, breath * 0.5];\n} else {\n    value + [0, breath];\n}";
            }
        },
        {
            name: "Zoom Pulse",
            description: "Rhythmic zoom in/out pulse. On Camera layers, controls Zoom property. On other layers, controls Scale.",
            category: "camera",
            targets: ["scale"],
            lockedTargets: true,
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 4, default: 1, step: 0.25 },
                { name: "amount", label: "Amount", min: 2, max: 20, default: 8, step: 1 }
            ],
            code: "var f = 1;\nvar a = 8;\nvar pulse = Math.sin(time * f * Math.PI * 2) * a;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + pulse * 5;\n} else {\n    value + [pulse, pulse];\n}",
            buildCode: function (params) {
                return "var f = " + params.freq + ";\nvar a = " + params.amount + ";\nvar pulse = Math.sin(time * f * Math.PI * 2) * a;\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('zoom') >= 0) {\n    value + pulse * 5;\n} else {\n    value + [pulse, pulse];\n}";
            }
        }
    ],

    
    
    
    effects: [
        {
            name: "Sine Wave",
            description: "Classic smooth oscillation",
            targets: ["rotation", "opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 5, default: 2, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 100, default: 30, step: 1 }
            ],
            code: "value + Math.sin(time * 2 * Math.PI * 2) * 30",
            buildCode: function (params) {
                return "value + Math.sin(time * " + params.freq + " * Math.PI * 2) * " + params.amp;
            }
        },
        {
            name: "Square Wave",
            description: "Flat-top alternating pulse with adjustable duty cycle",
            targets: ["rotation", "opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 5, default: 2, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 100, default: 30, step: 1 },
                { name: "duty", label: "Duty Cycle", min: 0.1, max: 0.9, default: 0.5, step: 0.1 }
            ],
            code: "var t = time - inPoint;\nvar phase = (t * 2) % 1;\nvalue + (phase < 0.5 ? 1 : -1) * 30",
            buildCode: function (params) {
                return "var t = time - inPoint;\nvar phase = (t * " + params.freq + ") % 1;\nvalue + (phase < " + params.duty + " ? 1 : -1) * " + params.amp;
            }
        },
        {
            name: "Float / Hover",
            description: "Gentle floating up and down",
            targets: ["position"],
            params: [
                { name: "freq", label: "Frequency", min: 0.3, max: 1, default: 0.5, step: 0.1 },
                { name: "amp", label: "Amplitude", min: 5, max: 50, default: 15, step: 1 }
            ],
            code: "var y = Math.sin(time * 0.5 * Math.PI * 2) * 15; value + [0, y]",
            buildCode: function (params) {
                return "var y = Math.sin(time * " + params.freq + " * Math.PI * 2) * " + params.amp + "; value + [0, y]";
            }
        },
        {
            name: "Pendulum",
            description: "Swinging motion with optional decay",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 45, default: 30, step: 1 },
                { name: "decay", label: "Decay", min: 0, max: 3, default: 0.5, step: 0.1 }
            ],
            code: "var arc = time - inPoint;\nvar swing = Math.sin(arc * 2 * Math.PI);\nvar damping = Math.pow(Math.E, -0.5 * arc);\n30 * swing * damping",
            buildCode: function (params) {
                return "var arc = time - inPoint;\nvar swing = Math.sin(arc * " + params.freq + " * 2 * Math.PI);\nvar damping = Math.pow(Math.E, -" + params.decay + " * arc);\n" + params.amp + " * swing * damping";
            }
        },
        {
            name: "Throb",
            description: "Scale pop + opacity dip — power surge / energy pulse",
            targets: ["scale", "opacity"],
            lockedTargets: true,
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "amp", label: "Strength", min: 5, max: 30, default: 15, step: 1 }
            ],
            code: "var f = 1;\nvar a = 15;\nvar t = time - inPoint;\nvar phase = (t * f) % 1;\nvar pulse = Math.pow(Math.max(0, 1 - phase * 3), 0.5);\nvar pn = thisProperty.name.toLowerCase();\nif (pn.indexOf('scale') >= 0) {\n  var s = 100 + pulse * a;\n  [s, s];\n} else if (pn.indexOf('opacity') >= 0) {\n  100 - pulse * a * 2;\n} else {\n  value;\n}",
            buildCode: function (params) {
                return "var f = " + params.freq + ";\nvar a = " + params.amp + ";\nvar t = time - inPoint;\nvar phase = (t * f) % 1;\nvar pulse = Math.pow(Math.max(0, 1 - phase * 3), 0.5);\nvar pn = thisProperty.name.toLowerCase();\nif (pn.indexOf('scale') >= 0) {\n  var s = 100 + pulse * a;\n  [s, s];\n} else if (pn.indexOf('opacity') >= 0) {\n  100 - pulse * a * 2;\n} else {\n  value;\n}";
            }
        },
        {
            name: "Sine Drift",
            description: "Organic 2D wandering via layered sine waves",
            targets: ["position"],
            params: [
                { name: "speed", label: "Speed", min: 0.2, max: 2, default: 0.5, step: 0.1 },
                { name: "amp", label: "Amplitude", min: 10, max: 80, default: 30, step: 5 }
            ],
            code: "var s = 0.5;\nvar a = 30;\nvar t = time - inPoint;\nvar x = Math.sin(t*s*1.7)*a*0.5 + Math.sin(t*s*3.1)*a*0.3 + Math.sin(t*s*5.3)*a*0.2;\nvar y = Math.sin(t*s*2.3+1.5)*a*0.5 + Math.sin(t*s*4.1+0.7)*a*0.3 + Math.sin(t*s*6.7+2.1)*a*0.2;\nvalue + [x, y]",
            buildCode: function (params) {
                return "var s = " + params.speed + ";\nvar a = " + params.amp + ";\nvar t = time - inPoint;\nvar x = Math.sin(t*s*1.7)*a*0.5 + Math.sin(t*s*3.1)*a*0.3 + Math.sin(t*s*5.3)*a*0.2;\nvar y = Math.sin(t*s*2.3+1.5)*a*0.5 + Math.sin(t*s*4.1+0.7)*a*0.3 + Math.sin(t*s*6.7+2.1)*a*0.2;\nvalue + [x, y]";
            }
        },
        {
            name: "Triangle Wave",
            description: "Linear back and forth motion",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 100, default: 50, step: 1 }
            ],
            code: "value + Math.abs((time * 1 % 1) * 2 - 1) * 50 * 2 - 50",
            buildCode: function (params) {
                return "value + Math.abs((time * " + params.freq + " % 1) * 2 - 1) * " + params.amp + " * 2 - " + params.amp;
            }
        },
        {
            name: "Sawtooth Wave",
            description: "Continuous rising then reset",
            targets: ["rotation"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "amp", label: "Amplitude", min: 10, max: 360, default: 100, step: 10 }
            ],
            code: "(time * 1 % 1) * 100",
            buildCode: function (params) {
                return "(time * " + params.freq + " % 1) * " + params.amp;
            }
        },
        {
            name: "Fade In",
            description: "Fade in from layer start",
            targets: ["opacity"],
            params: [
                { name: "dur", label: "Duration (sec)", min: 0.2, max: 2, default: 0.5, step: 0.1 }
            ],
            code: "linear(time, inPoint, inPoint + 0.5, 0, 100)",
            buildCode: function (params) {
                return "linear(time, inPoint, inPoint + " + params.dur + ", 0, 100)";
            }
        },

        {
            name: "Auto Fade",
            description: "Automatic fade in and out",
            targets: ["opacity"],
            params: [
                { name: "dur", label: "Duration (sec)", min: 0.2, max: 2, default: 0.5, step: 0.1 }
            ],
            code: "var fadeIn = linear(time, inPoint, inPoint + 0.5, 0, 100); var fadeOut = linear(time, outPoint - 0.5, outPoint, 100, 0); Math.min(fadeIn, fadeOut)",
            buildCode: function (params) {
                return "var fadeIn = linear(time, inPoint, inPoint + " + params.dur + ", 0, 100); var fadeOut = linear(time, outPoint - " + params.dur + ", outPoint, 100, 0); Math.min(fadeIn, fadeOut)";
            }
        },
        {
            name: "Pulse Opacity",
            description: "Smooth glowing pulse",
            targets: ["opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "minOp", label: "Min Opacity", min: 40, max: 70, default: 60, step: 5 },
                { name: "maxOp", label: "Max Opacity", min: 80, max: 100, default: 100, step: 5 }
            ],
            code: "var mid = (100 + 60) / 2; var amp = (100 - 60) / 2; mid + Math.sin(time * 1 * Math.PI * 2) * amp",
            buildCode: function (params) {
                return "var mid = (" + params.maxOp + " + " + params.minOp + ") / 2; var amp = (" + params.maxOp + " - " + params.minOp + ") / 2; mid + Math.sin(time * " + params.freq + " * Math.PI * 2) * amp";
            }
        },
        {
            name: "Depth Fade",
            description: "Layer depth effect — deeper layers fade + shrink",
            category: "visualfx",
            targets: ["opacity", "scale"],
            lockedTargets: true,
            params: [
                { name: "amp", label: "Strength", min: 20, max: 80, default: 50, step: 5 },
                { name: "freq", label: "Speed", min: 0.2, max: 1, default: 0.4, step: 0.1 }
            ],
            code: "var str = 50;\nvar f = 0.4;\nvar d = (index % 10) / 10;\nvar t = time - inPoint;\nvar w = Math.sin(t * f * Math.PI * 2) * 0.3;\nvar v = 100 - d * str + w * str * 0.5;\nif (v < 10) v = 10;\nif (v > 100) v = 100;\nvar pn = thisProperty.name.toLowerCase();\nvar result = v;\nif (pn.indexOf('scale') >= 0) result = [v, v];\nresult",
            buildCode: function (params) {
                return "var str = " + params.amp + ";\nvar f = " + params.freq + ";\nvar d = (index % 10) / 10;\nvar t = time - inPoint;\nvar w = Math.sin(t * f * Math.PI * 2) * 0.3;\nvar v = 100 - d * str + w * str * 0.5;\nif (v < 10) v = 10;\nif (v > 100) v = 100;\nvar pn = thisProperty.name.toLowerCase();\nvar result = v;\nif (pn.indexOf('scale') >= 0) result = [v, v];\nresult";
            }
        },
        {
            name: "Parallax Shift",
            description: "Parallax movement based on layer depth",
            category: "visualfx",
            targets: ["position"],
            params: [
                { name: "depthMultiplier", label: "Depth Mult", min: 0.1, max: 1, default: 0.5, step: 0.1 },
                { name: "baseMovement", label: "Base Movement", min: 50, max: 300, default: 100, step: 25 }
            ],
            code: "var dm = 0.5;\nvar bm = 100;\nvar depth = index * dm;\nvar parallax = Math.sin(time * 0.5) * bm * depth;\nvalue + [parallax, 0]",
            buildCode: function (params) {
                return "var dm = " + params.depthMultiplier + ";\nvar bm = " + params.baseMovement + ";\nvar depth = index * dm;\nvar parallax = Math.sin(time * 0.5) * bm * depth;\nvalue + [parallax, 0]";
            }
        },
        {
            name: "Rack Focus",
            description: "Simulated focus pull — defocused (scaled up + jitter) then snaps to sharp focus.",
            category: "camera",
            targets: ["position", "scale", "opacity"],
            lockedTargets: true,
            params: [
                { name: "startTime", label: "Start Time", min: 0, max: 5, default: 1, step: 0.5 },
                { name: "duration", label: "Duration", min: 0.3, max: 2, default: 0.5, step: 0.1 }
            ],
            code: "var st = 1;\nvar dur = 0.5;\nvar holdDur = 1.0;\nvar dd = 0.5;\nvar fe = st + dur;\nvar ds = fe + holdDur;\nvar cycle = ds + dd;\nvar t = (time - inPoint) % cycle;\nvar prop = thisProperty.name.toLowerCase();\nvar b;\nif (t < st) {\n    b = 0;\n} else if (t < fe) {\n    var f = (t - st) / dur;\n    b = f * f * (3 - 2 * f);\n} else if (t < ds) {\n    b = 1;\n} else {\n    var f = (t - ds) / dd;\n    b = 1 - f * f * (3 - 2 * f);\n}\nif (prop.indexOf('scale') >= 0) {\n    value + [3 * (1 - b), 3 * (1 - b)];\n} else if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n    60 + b * 40;\n} else {\n    var jf = 1 - b;\n    seedRandom(Math.floor(time * 8), true);\n    value + [random(-2, 2) * jf, random(-2, 2) * jf];\n}",
            buildCode: function (params) {
                return "var st = " + params.startTime + ";\nvar dur = " + params.duration + ";\nvar holdDur = 1.0;\nvar dd = 0.5;\nvar fe = st + dur;\nvar ds = fe + holdDur;\nvar cycle = ds + dd;\nvar t = (time - inPoint) % cycle;\nvar prop = thisProperty.name.toLowerCase();\nvar b;\nif (t < st) {\n    b = 0;\n} else if (t < fe) {\n    var f = (t - st) / dur;\n    b = f * f * (3 - 2 * f);\n} else if (t < ds) {\n    b = 1;\n} else {\n    var f = (t - ds) / dd;\n    b = 1 - f * f * (3 - 2 * f);\n}\nif (prop.indexOf('scale') >= 0) {\n    value + [3 * (1 - b), 3 * (1 - b)];\n} else if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n    60 + b * 40;\n} else {\n    var jf = 1 - b;\n    seedRandom(Math.floor(time * 8), true);\n    value + [random(-2, 2) * jf, random(-2, 2) * jf];\n}";
            }
        },
        {
            name: "Distance Fade",
            description: "Smooth pulse fade — opacity fades out and back in rhythmically. Adjust speed and minimum opacity.",
            targets: ["opacity"],
            params: [
                { name: "speed", label: "Speed", min: 0.5, max: 4, default: 1.5, step: 0.5 },
                { name: "minOpacity", label: "Min Opacity", min: 0, max: 50, default: 0, step: 5 }
            ],
            code: "var s = 1.5;\nvar minOp = 0;\nvar t = time - inPoint;\nvar fade = (Math.cos(t * s * Math.PI * 2) + 1) / 2;\nminOp + fade * (100 - minOp)",
            buildCode: function (params) {
                return "var s = " + params.speed + ";\nvar minOp = " + params.minOpacity + ";\nvar t = time - inPoint;\nvar fade = (Math.cos(t * s * Math.PI * 2) + 1) / 2;\nminOp + fade * (100 - minOp)";
            }
        },
        {
            name: "Rainbow Cycle",
            description: "Cycle through all hues • Auto-adds Fill effect",
            targets: ["color"],
            params: [
                { name: "speed", label: "Speed", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "offset", label: "Hue Offset", min: 0, max: 1, default: 0, step: 0.01, type: "hue" }
            ],
            code: "var h = ((time * 1 + 0) % 1) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]",
            buildCode: function (params) {
                return "var h = ((time * " + params.speed + " + " + params.offset + ") % 1) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]";
            }
        },
        {
            name: "Color Pulse",
            description: "Pulse between two hues • Auto-adds Fill effect",
            targets: ["color"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 2, default: 1, step: 0.5 },
                { name: "hue1", label: "Color 1", min: 0, max: 1, default: 0, step: 0.01, type: "hue" },
                { name: "hue2", label: "Color 2", min: 0, max: 1, default: 0.66, step: 0.01, type: "hue" }
            ],
            code: "var h1 = 0;\nvar h2 = 0.66;\nvar t = (Math.sin(time * 1 * Math.PI * 2) + 1) / 2;\nvar h = (h1 + (h2 - h1) * t) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]",
            buildCode: function (params) {
                return "var h1 = " + params.hue1 + ";\nvar h2 = " + params.hue2 + ";\nvar t = (Math.sin(time * " + params.freq + " * Math.PI * 2) + 1) / 2;\nvar h = (h1 + (h2 - h1) * t) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]";
            }
        },
        {
            name: "Random Color",
            description: "Different random color per layer • Auto-adds Fill effect. Apply to one layer, then duplicate above — each copy gets a unique color.",
            targets: ["color"],
            params: [
                { name: "seed", label: "Seed", min: 0, max: 100, default: 0, step: 1 }
            ],
            code: "seedRandom(index, true);\n[random(), random(), random(), 1]",
            buildCode: function (params) {
                return "seedRandom(index + " + params.seed + ", true);\n[random(), random(), random(), 1]";
            }
        },
        {
            name: "Hue Shift by Index",
            description: "Gradient colors across layers + slow drift • Auto-adds Fill effect",
            targets: ["color"],
            params: [
                { name: "hueStep", label: "Hue Step", min: 0.05, max: 0.2, default: 0.1, step: 0.05 },
                { name: "baseHue", label: "Base Hue", min: 0, max: 1, default: 0, step: 0.01, type: "hue" }
            ],
            code: "var h = ((index * 0.1 + 0 + time * 0.05) % 1) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]",
            buildCode: function (params) {
                return "var h = ((index * " + params.hueStep + " + " + params.baseHue + " + time * 0.05) % 1) * 6;\nvar c = 1;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\n[r, g, b, 1]";
            }
        },
        {
            name: "Saturation Pulse",
            description: "Fixed hue, pulsing saturation • Auto-adds Fill effect",
            targets: ["color"],
            params: [
                { name: "hue", label: "Hue", min: 0, max: 1, default: 0.6, step: 0.01, type: "hue" },
                { name: "freq", label: "Frequency", min: 0.5, max: 2, default: 1, step: 0.5 }
            ],
            code: "var s = 0.5 + Math.sin(time * 1 * Math.PI * 2) * 0.4;\nvar h = 0.6 * 6;\nvar c = s;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\nvar m = 0.5 - c/2;\n[r+m, g+m, b+m, 1]",
            buildCode: function (params) {
                return "var s = 0.5 + Math.sin(time * " + params.freq + " * Math.PI * 2) * 0.4;\nvar h = " + params.hue + " * 6;\nvar c = s;\nvar x = c * (1 - Math.abs(h % 2 - 1));\nvar r = 0; var g = 0; var b = 0;\nif (h < 1) { r=c; g=x; } else if (h < 2) { r=x; g=c; } else if (h < 3) { g=c; b=x; } else if (h < 4) { g=x; b=c; } else if (h < 5) { r=x; b=c; } else { r=c; b=x; }\nvar m = 0.5 - c/2;\n[r+m, g+m, b+m, 1]";
            }
        }
    ],

    
    
    
    glitch: [
        {
            name: "Glitch Position",
            description: "3-tier digital glitch: small vibration, medium jump, or large teleport",
            category: "glitch",
            targets: ["position"],
            params: [
                { name: "intensity", label: "Intensity", min: 10, max: 100, default: 30, step: 5 },
                { name: "frequency", label: "Frequency", min: 2, max: 20, default: 8, step: 1 }
            ],
            code: "var i = 30;\nvar f = 8;\nvar seg = Math.floor(time * f);\nseedRandom(seg, true);\nvar r = random();\nif (r > 0.85) {\n    value + [random(-i * 2, i * 2), random(-i, i)];\n} else if (r > 0.55) {\n    value + [random(-i * 0.3, i * 0.3), random(-i * 0.15, i * 0.15)];\n} else {\n    value;\n}",
            buildCode: function (params) {
                return "var i = " + params.intensity + ";\nvar f = " + params.frequency + ";\nvar seg = Math.floor(time * f);\nseedRandom(seg, true);\nvar r = random();\nif (r > 0.85) {\n    value + [random(-i * 2, i * 2), random(-i, i)];\n} else if (r > 0.55) {\n    value + [random(-i * 0.3, i * 0.3), random(-i * 0.15, i * 0.15)];\n} else {\n    value;\n}";
            }
        },
        {
            name: "RGB Split",
            description: "Chromatic aberration — duplicate text layer 3x, select all 3, apply. Each layer gets R/G/B color + offset. Blend mode auto-set to Add.",
            category: "glitch",
            targets: ["position", "color"],
            lockedTargets: true,
            blendMode: "add",
            params: [
                { name: "amount", label: "Split Amount", min: 2, max: 20, default: 8, step: 1 },
                { name: "flicker", label: "Flicker", min: 1, max: 10, default: 4, step: 1 }
            ],
            code: "var a = 8;\nvar f = 4;\nvar m = thisComp.width / 640;\nvar ch = (index - 1) % 3;\nvar seg = Math.floor(time * f);\nseedRandom(seg, true);\nvar prop = thisProperty.name.toLowerCase();\nvar offset = random(-a, a) * m;\nvar yOff = random(-a * 0.3, a * 0.3) * m;\nif (prop.indexOf('color') >= 0 || prop.indexOf('fill') >= 0) {\n    if (ch == 0) [1, 0.1, 0.1, 1];\n    else if (ch == 1) [0.1, 1, 0.1, 1];\n    else [0.1, 0.1, 1, 1];\n} else {\n    if (ch == 0) value + [-Math.abs(offset), yOff];\n    else if (ch == 1) value;\n    else value + [Math.abs(offset), yOff];\n}",
            buildCode: function (params) {
                return "var a = " + params.amount + ";\nvar f = " + params.flicker + ";\nvar m = thisComp.width / 640;\nvar ch = (index - 1) % 3;\nvar seg = Math.floor(time * f);\nseedRandom(seg, true);\nvar prop = thisProperty.name.toLowerCase();\nvar offset = random(-a, a) * m;\nvar yOff = random(-a * 0.3, a * 0.3) * m;\nif (prop.indexOf('color') >= 0 || prop.indexOf('fill') >= 0) {\n    if (ch == 0) [1, 0.1, 0.1, 1];\n    else if (ch == 1) [0.1, 1, 0.1, 1];\n    else [0.1, 0.1, 1, 1];\n} else {\n    if (ch == 0) value + [-Math.abs(offset), yOff];\n    else if (ch == 1) value;\n    else value + [Math.abs(offset), yOff];\n}";
            }
        },
        {
            name: "Signal Noise",
            description: "Digital interference — high-freq noise on position + opacity dropout with scanline jumps",
            category: "glitch",
            targets: ["position", "opacity"],
            lockedTargets: true,
            params: [
                { name: "noiseAmount", label: "Noise Amount", min: 5, max: 50, default: 20, step: 5 },
                { name: "speed", label: "Speed", min: 5, max: 30, default: 15, step: 1 }
            ],
            code: "var n = 20;\nvar s = 15;\nvar m = thisComp.width / 640;\nvar seg = Math.floor(time * s);\nseedRandom(seg, true);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') >= 0) {\n    var nx = random(-n, n) * m;\n    var ny = random(-n * 0.3, n * 0.3) * m;\n    if (random() > 0.9) ny = random(-n * 2, n * 2) * m;\n    value + [nx, ny];\n} else {\n    var noise = random(100 - n, 100);\n    if (random() > 0.95) noise = random(20, 60);\n    noise;\n}",
            buildCode: function (params) {
                return "var n = " + params.noiseAmount + ";\nvar s = " + params.speed + ";\nvar m = thisComp.width / 640;\nvar seg = Math.floor(time * s);\nseedRandom(seg, true);\nvar prop = thisProperty.name.toLowerCase();\nif (prop.indexOf('position') >= 0) {\n    var nx = random(-n, n) * m;\n    var ny = random(-n * 0.3, n * 0.3) * m;\n    if (random() > 0.9) ny = random(-n * 2, n * 2) * m;\n    value + [nx, ny];\n} else {\n    var noise = random(100 - n, 100);\n    if (random() > 0.95) noise = random(20, 60);\n    noise;\n}";
            }
        },
        {
            name: "Frame Stutter",
            description: "posterizeTime-based frame hold with random position jitter during stutter",
            category: "glitch",
            targets: ["position", "opacity"],
            lockedTargets: true,
            params: [
                { name: "holdFrames", label: "Hold Frames", min: 2, max: 10, default: 4, step: 1 },
                { name: "probability", label: "Probability", min: 0.1, max: 0.5, default: 0.3, step: 0.05 }
            ],
            code: "var hf = 4;\nvar prob = 0.3;\nposterizeTime(24 / hf);\nvar seg = Math.floor(time * 24 / hf);\nseedRandom(seg, true);\nvar r = random();\nvar prop = thisProperty.name.toLowerCase();\nif (r < prob) {\n    if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n        70 + random() * 30;\n    } else {\n        value + [random(-15, 15), random(-8, 8)];\n    }\n} else {\n    value;\n}",
            buildCode: function (params) {
                return "var hf = " + params.holdFrames + ";\nvar prob = " + params.probability + ";\nposterizeTime(24 / hf);\nvar seg = Math.floor(time * 24 / hf);\nseedRandom(seg, true);\nvar r = random();\nvar prop = thisProperty.name.toLowerCase();\nif (r < prob) {\n    if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n        70 + random() * 30;\n    } else {\n        value + [random(-15, 15), random(-8, 8)];\n    }\n} else {\n    value;\n}";
            }
        },
        {
            name: "Distortion Wave",
            description: "Block-quantized wave distortion with random amplitude spikes",
            category: "glitch",
            targets: ["position"],
            params: [
                { name: "waveAmt", label: "Wave Amount", min: 5, max: 40, default: 15, step: 5 },
                { name: "speed", label: "Speed", min: 1, max: 10, default: 3, step: 0.5 }
            ],
            code: "var w = 15;\nvar s = 3;\nvar seg = Math.floor(time * s * 3);\nseedRandom(seg, true);\nvar yPhase = Math.sin(time * 0.7) * 3;\nvar phase = Math.sin(yPhase + time * s);\nvar sign = phase >= 0 ? 1 : -1;\nvar blockPhase = sign * Math.ceil(Math.abs(phase) * 3) / 3;\nvar spike = random() > 0.85 ? random(1.5, 3) : 1;\nvar wave = blockPhase * w * spike;\nvalue + [wave, 0]",
            buildCode: function (params) {
                return "var w = " + params.waveAmt + ";\nvar s = " + params.speed + ";\nvar seg = Math.floor(time * s * 3);\nseedRandom(seg, true);\nvar yPhase = Math.sin(time * 0.7) * 3;\nvar phase = Math.sin(yPhase + time * s);\nvar sign = phase >= 0 ? 1 : -1;\nvar blockPhase = sign * Math.ceil(Math.abs(phase) * 3) / 3;\nvar spike = random() > 0.85 ? random(1.5, 3) : 1;\nvar wave = blockPhase * w * spike;\nvalue + [wave, 0]";
            }
        },
        {
            name: "Data Corrupt",
            description: "Full system corruption — position, scale, rotation and opacity all glitch randomly with blackout chance",
            category: "glitch",
            targets: ["position", "scale", "rotation", "opacity"],
            lockedTargets: true,
            params: [
                { name: "corruptLevel", label: "Corrupt Level", min: 10, max: 80, default: 30, step: 5 },
                { name: "blockSize", label: "Block Size", min: 2, max: 12, default: 6, step: 1 }
            ],
            code: "var c = 30;\nvar b = 6;\nvar seg = Math.floor(time * b);\nseedRandom(seg + index, true);\nvar r = random();\nvar prop = thisProperty.name.toLowerCase();\nif (r > 0.75) {\n    var glitch = random(-c, c);\n    if (prop.indexOf('scale') >= 0) {\n        value + [glitch, -glitch * 0.5];\n    } else if (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n        value + glitch * 0.5;\n    } else if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n        if (r > 0.95) 0;\n        else random(50, 100);\n    } else {\n        value + [glitch, glitch * 0.3];\n    }\n} else {\n    value;\n}",
            buildCode: function (params) {
                return "var c = " + params.corruptLevel + ";\nvar b = " + params.blockSize + ";\nvar seg = Math.floor(time * b);\nseedRandom(seg + index, true);\nvar r = random();\nvar prop = thisProperty.name.toLowerCase();\nif (r > 0.75) {\n    var glitch = random(-c, c);\n    if (prop.indexOf('scale') >= 0) {\n        value + [glitch, -glitch * 0.5];\n    } else if (prop.indexOf('rotation') >= 0 || prop.indexOf('rot') >= 0) {\n        value + glitch * 0.5;\n    } else if (prop.indexOf('opacity') >= 0 || prop.indexOf('opac') >= 0) {\n        if (r > 0.95) 0;\n        else random(50, 100);\n    } else {\n        value + [glitch, glitch * 0.3];\n    }\n} else {\n    value;\n}";
            }
        },
        {
            name: "Electrify",
            description: "Rapid vibration with occasional electric spike bursts",
            category: "visualfx",
            targets: ["position"],
            params: [
                { name: "intensity", label: "Intensity", min: 2, max: 15, default: 5, step: 1 },
                { name: "rate", label: "Rate", min: 15, max: 50, default: 30, step: 1 }
            ],
            code: "var i = 5;\nvar r = 30;\nvar t = time - inPoint;\nvar seg = Math.floor(t * r);\nseedRandom(seg, true);\nvar bx = random(-i, i);\nvar by = random(-i * 0.5, i * 0.5);\nif (random() > 0.85) { bx = bx * 3; by = by * 3; }\nvalue + [bx, by]",
            buildCode: function (params) {
                return "var i = " + params.intensity + ";\nvar r = " + params.rate + ";\nvar t = time - inPoint;\nvar seg = Math.floor(t * r);\nseedRandom(seg, true);\nvar bx = random(-i, i);\nvar by = random(-i * 0.5, i * 0.5);\nif (random() > 0.85) { bx = bx * 3; by = by * 3; }\nvalue + [bx, by]";
            }
        },
        {
            name: "Flicker",
            description: "Flickering light effect - neon/glitch",
            targets: ["opacity"],
            params: [
                { name: "speed", label: "Speed", min: 5, max: 30, default: 15, step: 1 },
                { name: "minOp", label: "Min Opacity", min: 30, max: 70, default: 50, step: 5 },
                { name: "maxOp", label: "Max Opacity", min: 80, max: 100, default: 100, step: 5 }
            ],
            code: "posterizeTime(15); random(50, 100)",
            buildCode: function (params) {
                return "posterizeTime(" + params.speed + "); random(" + params.minOp + ", " + params.maxOp + ")";
            }
        },
        {
            name: "Strobe",
            description: "Fast strobe effect",
            targets: ["opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 5, max: 30, default: 15, step: 1 }
            ],
            code: "(Math.floor(time * 15) % 2 == 0) ? 100 : 0",
            buildCode: function (params) {
                return "(Math.floor(time * " + params.freq + ") % 2 == 0) ? 100 : 0";
            }
        },
        {
            name: "Flash",
            description: "Brief bright spike with exponential decay - camera flash / lightning",
            targets: ["opacity"],
            params: [
                { name: "freq", label: "Frequency", min: 0.5, max: 3, default: 1, step: 0.5 },
                { name: "intensity", label: "Intensity", min: 50, max: 100, default: 100, step: 5 }
            ],
            code: "var t = time - inPoint;\nvar period = 1 / 1;\nvar phase = (t % period) / period;\nvar spike = 1 - phase;\nvar flash = (spike > 0.8) ? Math.pow((spike - 0.8) * 5, 0.5) : 0;\nvar minOp = 100 - 100;\nminOp + flash * 100",
            buildCode: function (params) {
                return "var t = time - inPoint;\nvar period = 1 / " + params.freq + ";\nvar phase = (t % period) / period;\nvar spike = 1 - phase;\nvar flash = (spike > 0.8) ? Math.pow((spike - 0.8) * 5, 0.5) : 0;\nvar minOp = 100 - " + params.intensity + ";\nminOp + flash * " + params.intensity;
            }
        },
        {
            name: "Light Flicker",
            description: "Realistic light source flickering",
            category: "visualfx",
            targets: ["opacity"],
            params: [
                { name: "minOpacity", label: "Min Opacity", min: 50, max: 90, default: 70, step: 5 },
                { name: "speed", label: "Speed", min: 5, max: 20, default: 10, step: 1 }
            ],
            code: "var minO = 70;\nvar s = 10;\nvar flicker = wiggle(s, 15);\nclamp(flicker, minO, 100)",
            buildCode: function (params) {
                return "var minO = " + params.minOpacity + ";\nvar s = " + params.speed + ";\nvar flicker = wiggle(s, 15);\nclamp(flicker, minO, 100)";
            }
        },
        {
            name: "Heat Shimmer",
            description: "Heat wave distortion effect",
            category: "visualfx",
            targets: ["position"],
            params: [
                { name: "intensity", label: "Intensity", min: 2, max: 20, default: 8, step: 1 },
                { name: "speed", label: "Speed", min: 1, max: 5, default: 2, step: 0.5 }
            ],
            code: "var i = 8;\nvar s = 2;\nvar shimmer = Math.sin(value[1] * 0.1 + time * s * 10) * i;\nvalue + [shimmer, 0]",
            buildCode: function (params) {
                return "var i = " + params.intensity + ";\nvar s = " + params.speed + ";\nvar shimmer = Math.sin(value[1] * 0.1 + time * s * 10) * i;\nvalue + [shimmer, 0]";
            }
        }
    ],

};