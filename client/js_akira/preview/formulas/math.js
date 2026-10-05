




(function() {
    'use strict';

    PreviewEngine.FormulaMath = {

        
        CS: 0.3,

        PI2: Math.PI * 2,

        
        
        decayBounce: function(t, freq, decay) {
            return Math.cos(freq * t * this.PI2) / Math.exp(decay * t);
        },

        
        easeIn: function(t, dur) {
            if (t <= 0) return 0;
            if (t >= dur) return 1;
            var p = t / dur;
            return p * p * (3 - 2 * p);
        },

        
        lerp: function(a, b, t) {
            return a + (b - a) * t;
        },

        
        clamp: function(val, min, max) {
            return Math.min(Math.max(val, min), max);
        },

        
        getTargets: function(p) {
            if (!p._targets) return null;
            if (p._targets.length === 0) return { pos: false, rot: false, scale: false, opacity: false };
            return {
                pos: p._targets.indexOf('position') !== -1,
                rot: p._targets.indexOf('rotation') !== -1,
                scale: p._targets.indexOf('scale') !== -1,
                opacity: p._targets.indexOf('opacity') !== -1
            };
        },

        
        segRandom: function(segment, seed) {
            return PreviewEngine.Utils.seededRandom(segment + (seed || PreviewEngine.State.randomSeed));
        },

        
        segRange: function(min, max, segment, seed) {
            return PreviewEngine.Utils.randomRange(min, max, segment + (seed || PreviewEngine.State.randomSeed));
        }
    };

})();
