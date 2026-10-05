




(function() {
    'use strict';

    PreviewEngine.Utils = {

        
        
        
        

        seededRandom: function(seed) {
            
            
            seed = Math.floor(seed);
            seed = ((seed + 0x6D2B79F5) | 0);
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },

        randomRange: function(min, max, seed) {
            return min + this.seededRandom(seed) * (max - min);
        },

        
        
        

        roundRect: function(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
        },

        
        
        

        formatTime: function(seconds) {
            var min = Math.floor(seconds / 60);
            var sec = Math.floor(seconds % 60);
            return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
        },

        formatNumber: function(num, decimals) {
            if (decimals > 0) {
                return num.toFixed(decimals);
            }
            return Math.floor(num).toLocaleString();
        },

        
        
        

        clamp: function(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        lerp: function(start, end, t) {
            return start + (end - start) * t;
        },

        smoothstep: function(t) {
            return t * t * (3 - 2 * t);
        },

        
        
        

        
        posterizeTime: function(elapsed, fps) {
            if (!fps || fps <= 0) return elapsed;
            return Math.floor(elapsed * fps) / fps;
        },

        
        
        sharpLerp: function(a, b, t) {
            
            var edge = 0.08;
            var sharp;
            if (t < edge) {
                sharp = (t / edge) * edge; 
            } else if (t > 1 - edge) {
                sharp = 1 - ((1 - t) / edge) * edge; 
            } else {
                sharp = t; 
            }
            return a + (b - a) * sharp;
        }
    };

})();
