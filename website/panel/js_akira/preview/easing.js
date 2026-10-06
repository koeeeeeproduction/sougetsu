




(function() {
    'use strict';

    PreviewEngine.Easing = {

        
        
        

        linear: function(t) {
            return t;
        },

        
        
        

        inSine: function(t) {
            return 1 - Math.cos(t * Math.PI / 2);
        },

        outSine: function(t) {
            return Math.sin(t * Math.PI / 2);
        },

        inOutSine: function(t) {
            return -(Math.cos(Math.PI * t) - 1) / 2;
        },

        
        
        

        inQuad: function(t) {
            return t * t;
        },

        outQuad: function(t) {
            return 1 - (1 - t) * (1 - t);
        },

        inOutQuad: function(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        },

        
        
        

        inCubic: function(t) {
            return t * t * t;
        },

        outCubic: function(t) {
            return 1 - Math.pow(1 - t, 3);
        },

        inOutCubic: function(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        },

        
        
        

        inExpo: function(t) {
            return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
        },

        outExpo: function(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        },

        
        
        

        outCirc: function(t) {
            return Math.sqrt(1 - Math.pow(t - 1, 2));
        },

        
        
        

        inBack: function(t) {
            var c1 = 1.70158;
            var c3 = c1 + 1;
            return c3 * t * t * t - c1 * t * t;
        },

        outBack: function(t) {
            var c1 = 1.70158;
            var c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },

        
        
        

        outElastic: function(t) {
            var c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 :
                Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },

        inElastic: function(t) {
            var c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 :
                -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        },

        
        
        

        outBounce: function(t) {
            var n1 = 7.5625;
            var d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        },

        inBounce: function(t) {
            return 1 - PreviewEngine.Easing.outBounce(1 - t);
        },

        
        
        

        spring: function(t, frequency, damping) {
            frequency = frequency || 4;
            damping = damping || 0.5;
            return 1 - Math.exp(-damping * t * 10) * Math.cos(frequency * t * Math.PI * 2);
        }
    };

})();
