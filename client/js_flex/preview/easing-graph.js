




(function () {
    'use strict';

    var Config = PreviewEngine.Config;
    var State = PreviewEngine.State;
    var Easing = PreviewEngine.Easing;

    PreviewEngine.EasingGraph = {

        
        WIDTH: 60,
        HEIGHT: 40,
        PADDING: 4,

        
        formulaEasingMap: {
            
            'bounce': 'outBounce',
            'elastic': 'outElastic',
            'spring': 'spring',
            'overshoot': 'outBack',
            'inertia': 'outExpo',
            'throwCatch': 'outCubic',
            'arriveSettle': 'outCubic',
            'floatLand': 'outQuad',
            'anticipation': 'inBack',
            'squashStretch': 'outBounce',
            'whipSettle': 'outElastic',
            'magnetPull': 'outExpo',
            'collisionEdge': 'outBounce',
            
            'pulse': 'inOutSine',
            'pendulum': 'outCubic',
            'stagger': 'outBack',
            'breathe': 'inOutSine',
            
            'fadeIn': 'outCubic',
            'fadeOut': 'inCubic',
            'autoFade': 'inOutQuad',
            'shake': 'outExpo',
            'dollyZoom': 'inOutCubic',
            'rackFocus': 'inOutCubic',
            'depthFade': 'outQuad',
            'distanceFade': 'outQuad',
            
            'reveal': 'outCubic',
            'slideIn': 'outQuad',
            'scramble': 'outQuad',
            'trimReveal': 'outQuad',
            
            'counter': 'outQuad',
            'percentage': 'outQuad',
            'countdown': 'outQuad',
            'bounceCounter': 'outBounce'
        },

        
        draw: function (ctx, formulaName) {
            var easingName = this.formulaEasingMap[formulaName];
            if (!easingName) return;

            var easingFn = Easing[easingName];
            if (!easingFn) return;

            var w = this.WIDTH;
            var h = this.HEIGHT;
            var p = this.PADDING;
            var ox = Config.WIDTH - w - 8;
            var oy = Config.HEIGHT - h - 8;

            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(ox, oy, w, h);

            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(ox, oy, w, h);

            
            ctx.strokeStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ox + p, oy + h - p);
            ctx.lineTo(ox + w - p, oy + h - p);
            ctx.moveTo(ox + p, oy + h - p);
            ctx.lineTo(ox + p, oy + p);
            ctx.stroke();

            
            ctx.strokeStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            var graphW = w - p * 2;
            var graphH = h - p * 2;
            var steps = 50;

            for (var i = 0; i <= steps; i++) {
                var t = i / steps;
                var val;

                if (easingName === 'spring') {
                    var params = State.currentParams;
                    val = easingFn(t, params.stiffness || 4, params.damping || 0.4);
                } else {
                    val = easingFn(t);
                }

                
                var drawY = Math.max(-0.2, Math.min(val, 1.3));

                var px = ox + p + t * graphW;
                var py = oy + h - p - drawY * graphH;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();

            
            var elapsed = (performance.now() - State.startTime) / 1000;
            var cycleDuration = 2;
            var progress = (elapsed % cycleDuration) / cycleDuration;
            if (progress <= 1) {
                var dotVal;
                if (easingName === 'spring') {
                    dotVal = easingFn(progress, State.currentParams.stiffness || 4, State.currentParams.damping || 0.4);
                } else {
                    dotVal = easingFn(progress);
                }
                dotVal = Math.max(-0.2, Math.min(dotVal, 1.3));
                var dotX = ox + p + progress * graphW;
                var dotY = oy + h - p - dotVal * graphH;

                ctx.fillStyle = Config.ACCENT_COLOR;
                ctx.beginPath();
                ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            
            ctx.font = '7.5px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText(easingName, ox + w - 3, oy + 2);
        }
    };

})();
