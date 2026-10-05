




(function() {
    'use strict';

    var Config = PreviewEngine.Config;
    var State = PreviewEngine.State;
    var Utils = PreviewEngine.Utils;

    PreviewEngine.Render = {

        
        _bgCache: null,
        _bgCacheWidth: 0,
        _bgCacheHeight: 0,

        
        _textGradientCache: null,
        _textGradientSize: 0,

        _updateBgCache: function() {
            var w = Config.WIDTH;
            var h = Config.HEIGHT;
            if (this._bgCache && this._bgCacheWidth === w && this._bgCacheHeight === h) {
                return;
            }
            if (!this._bgCache) {
                this._bgCache = document.createElement('canvas');
            }
            this._bgCache.width = w;
            this._bgCache.height = h;
            this._bgCacheWidth = w;
            this._bgCacheHeight = h;
            var ctx = this._bgCache.getContext('2d');
            var centerX = w / 2;
            var centerY = h / 2;

            var bgGradient = ctx.createRadialGradient(centerX, centerY * 0.8, 0, centerX, centerY, w * 0.8);
            bgGradient.addColorStop(0, '#14141f');
            bgGradient.addColorStop(0.5, '#0f0f18');
            bgGradient.addColorStop(1, '#09090f');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, w, h);

            var tealGlow = ctx.createRadialGradient(centerX, centerY * 0.8, 0, centerX, centerY * 0.8, w * 0.55);
            tealGlow.addColorStop(0, ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.045)');
            tealGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = tealGlow;
            ctx.fillRect(0, 0, w, h);

            var purpleGlow = ctx.createRadialGradient(w * 0.78, h * 0.72, 0, w * 0.78, h * 0.72, w * 0.45);
            purpleGlow.addColorStop(0, 'rgba(139, 127, 219, 0.025)');
            purpleGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = purpleGlow;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.06)';
            for (var x = 20; x < w; x += 30) {
                for (var y = 20; y < h; y += 30) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            
            var vignetteGradient = ctx.createRadialGradient(centerX, centerY, h * 0.3, centerX, centerY, w * 0.7);
            vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
            vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.4)');
            ctx.fillStyle = vignetteGradient;
            ctx.fillRect(0, 0, w, h);

            var lineGradient = ctx.createLinearGradient(0, 0, w, 0);
            lineGradient.addColorStop(0, ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0)');
            lineGradient.addColorStop(0.5, ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.2)');
            lineGradient.addColorStop(1, ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0)');
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 1);
            ctx.lineTo(w, 1);
            ctx.stroke();
        },

        _getTextGradient: function(ctx) {
            if (this._textGradientCache && this._textGradientSize === Config.TEXT_SIZE) {
                return this._textGradientCache;
            }
            var g = ctx.createLinearGradient(0, -Config.TEXT_SIZE/2, 0, Config.TEXT_SIZE/2);
            g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            g.addColorStop(0.5, 'rgba(220, 220, 230, 0.8)');
            g.addColorStop(1, 'rgba(180, 180, 200, 0.7)');
            this._textGradientCache = g;
            this._textGradientSize = Config.TEXT_SIZE;
            return g;
        },

        
        
        
        

        drawBackground: function() {
            var ctx = State.ctx;

            
            this._updateBgCache();
            ctx.drawImage(this._bgCache, 0, 0);

            var time = performance.now() / 1000;
            ctx.fillStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.12)';
            for (var i = 0; i < 8; i++) {
                var px = (Math.sin(time * 0.3 + i * 0.7) * 0.5 + 0.5) * Config.WIDTH;
                var py = (Math.cos(time * 0.2 + i * 0.9) * 0.5 + 0.5) * Config.HEIGHT;
                ctx.beginPath();
                ctx.arc(px, py, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        },

        
        
        
        

        drawText: function() {
            var ctx = State.ctx;
            var text = State.text;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;

            ctx.save();

            
            ctx.translate(centerX + text.x, centerY + text.y);
            ctx.rotate(text.rotation * Math.PI / 180);
            ctx.scale(text.scale * text.scaleX, text.scale * text.scaleY);
            ctx.globalAlpha = text.opacity;

            
            ctx.font = 'bold ' + Config.TEXT_SIZE + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            
            var displayText = Config.USER_TEXT || Config.TEXT;

            if (typeof text.customRender === 'function') {
                text.customRender(ctx, displayText, 0, 0);
                ctx.restore();
                return;
            }

            
            if (text.isCounter && text.counterValue !== undefined) {
                var numStr = typeof text.counterValue === 'string'
                    ? text.counterValue
                    : Number(text.counterValue).toLocaleString();
                displayText = (text.counterSymbol || '') + numStr;
            }
            
            else if (text.isPercentage && text.percentageValue !== undefined) {
                displayText = text.percentageValue + '%';
            }
            
            else if (text.isCountdown && text.countdownValue !== undefined) {
                var val = text.countdownValue;
                if (val >= 60) {
                    displayText = Utils.formatTime(val);
                } else {
                    displayText = val.toString();
                }
            }
            
            else if (text.isTime && text.timeValue !== undefined) {
                displayText = text.timeValue;
            }
            
            else if (text.visibleChars >= 0 && text.visibleChars < displayText.length) {
                displayText = displayText.substring(0, text.visibleChars);
                if (Math.floor((performance.now() / 500)) % 2 === 0) {
                    displayText += '|';
                }
            }
            
            else if (text.isScramble && text.scrambledText !== undefined) {
                displayText = text.scrambledText;
            }
            
            else if (text.customText !== null) {
                displayText = text.customText;
            }

            var gi = text.glowIntensity;

            if (text.customStyle === 'glowing_red_text') {
                
                
                ctx.shadowColor = 'rgba(255, 0, 0, 0.95)';
                ctx.shadowBlur = 24 * gi;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#ff0000';
                ctx.fillText(displayText, 0, 0);

                
                ctx.shadowBlur = 0;
                var textWidth = ctx.measureText(displayText).width || 200;

                
                var rightX = textWidth * 0.28;
                var gradRight = ctx.createLinearGradient(rightX - 35, -15, rightX + 35, 15);
                gradRight.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradRight.addColorStop(0.5, 'rgba(255, 255, 255, 0.65)'); 
                gradRight.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradRight;
                ctx.fillText(displayText, 0, 0);

                
                var leftX = -textWidth * 0.25;
                var gradLeft = ctx.createLinearGradient(leftX - 30, -15, leftX + 30, 15);
                gradLeft.addColorStop(0, 'rgba(255, 255, 255, 0)');
                gradLeft.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)'); 
                gradLeft.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = gradLeft;
                ctx.fillText(displayText, 0, 0);
            } else if (text.rgbSplit > 0) {
                
                var offset = text.rgbSplit;
                ctx.shadowBlur = 0;

                ctx.globalCompositeOperation = 'lighter';
                
                ctx.fillStyle = 'rgba(255, 30, 30, 0.7)';
                ctx.fillText(displayText, -offset, 0);
                
                ctx.fillStyle = 'rgba(30, 255, 30, 0.7)';
                ctx.fillText(displayText, offset * 0.5, -offset * 0.5);
                
                ctx.fillStyle = 'rgba(30, 80, 255, 0.8)';
                ctx.fillText(displayText, offset * 0.3, offset * 0.5);
                ctx.globalCompositeOperation = 'source-over';

                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(displayText, 0, 0);
            } else if (text.hue >= 0) {
                
                var h = Math.floor(text.hue);
                var sat = text.saturation >= 0 ? Math.floor(text.saturation) : 85;

                
                ctx.shadowColor = 'hsla(' + h + ', ' + sat + '%, 60%, 0.6)';
                ctx.shadowBlur = 12 * gi;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                
                ctx.fillStyle = 'hsl(' + h + ', ' + sat + '%, 70%)';
                ctx.fillText(displayText, 0, 0);

                
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'hsla(' + h + ', ' + Math.floor(sat * 0.7) + '%, 85%, 0.4)';
                ctx.fillText(displayText, 0, 0);
            } else {
                

                
                ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowBlur = 5 * gi;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(displayText, 0, 0);

                
                ctx.shadowBlur = 0;
                ctx.fillStyle = this._getTextGradient(ctx);
                ctx.fillText(displayText, 0, 0);
            }

            ctx.restore();
        },

        
        
        
        

        drawShape: function() {
            var ctx = State.ctx;
            var text = State.text;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;

            ctx.save();

            ctx.translate(centerX + text.x, centerY + text.y);
            ctx.rotate(text.rotation * Math.PI / 180);
            ctx.scale(text.scale * text.scaleX, text.scale * text.scaleY);
            ctx.globalAlpha = text.opacity;

            var s = Config.SHAPE_SIZE;
            var gi = text.glowIntensity;

            
            var fillColor, glowColor;
            if (text.hue >= 0) {
                var h = Math.floor(text.hue);
                var sat = text.saturation >= 0 ? Math.floor(text.saturation) : 85;
                fillColor = 'hsl(' + h + ', ' + sat + '%, 70%)';
                glowColor = 'hsla(' + h + ', ' + sat + '%, 60%, 0.6)';
            } else {
                fillColor = '#ffffff';
                glowColor = 'rgba(255, 255, 255, 0.5)';
            }

            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 8 * gi;
            ctx.fillStyle = fillColor;

            if (text.rgbSplit > 0) {
                
                var offset = text.rgbSplit;
                ctx.shadowBlur = 0;
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 30, 30, 0.7)';
                this._drawShapePath(ctx, -offset, 0, s);
                ctx.fillStyle = 'rgba(30, 255, 30, 0.7)';
                this._drawShapePath(ctx, offset * 0.5, -offset * 0.5, s);
                ctx.fillStyle = 'rgba(30, 80, 255, 0.8)';
                this._drawShapePath(ctx, offset * 0.3, offset * 0.5, s);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this._drawShapePath(ctx, 0, 0, s);
            } else {
                this._drawShapePath(ctx, 0, 0, s);
                
                ctx.shadowBlur = 0;
                ctx.fillStyle = text.hue >= 0
                    ? 'hsla(' + Math.floor(text.hue) + ', 50%, 85%, 0.25)'
                    : 'rgba(255, 255, 255, 0.15)';
                this._drawShapePath(ctx, 0, 0, s);
            }

            ctx.restore();
        },

        _drawShapePath: function(ctx, ox, oy, s) {
            var type = Config.SHAPE_TYPE;
            if (type === 'circle') {
                ctx.beginPath();
                ctx.arc(ox, oy, s, 0, Math.PI * 2);
                ctx.fill();
            } else if (type === 'square') {
                ctx.fillRect(ox - s, oy - s, s * 2, s * 2);
            } else if (type === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(ox, oy - s);
                ctx.lineTo(ox + s, oy + s);
                ctx.lineTo(ox - s, oy + s);
                ctx.closePath();
                ctx.fill();
            }
        },

        
        
        
        

        drawGhostTexts: function() {
            var ghosts = State.text._ghostTexts;
            if (!ghosts) return;

            var ctx = State.ctx;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;

            for (var i = 0; i < ghosts.length; i++) {
                var g = ghosts[i];
                ctx.save();
                ctx.translate(centerX + g.x, centerY + g.y);
                if (g.rotation) ctx.rotate(g.rotation * Math.PI / 180);
                if (g.scale) ctx.scale(g.scale, g.scale);
                ctx.globalAlpha = g.opacity || 0.4;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                ctx.shadowBlur = 3;
                ctx.fillStyle = '#ffffff';

                if (Config.SHAPE_MODE) {
                    this._drawShapePath(ctx, 0, 0, Config.SHAPE_SIZE);
                } else {
                    var displayText = Config.USER_TEXT || Config.TEXT;
                    ctx.font = 'bold ' + Config.TEXT_SIZE + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(displayText, 0, 0);
                }

                ctx.restore();
            }

            State.text._ghostTexts = null;
        },

        
        
        
        

        drawPathDots: function() {
            var dots = State.text._pathDots;
            if (!dots) return;

            var ctx = State.ctx;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;
            var color = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.25)';

            ctx.save();

            
            ctx.beginPath();
            ctx.strokeStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.12)';
            ctx.lineWidth = 1;
            for (var i = 0; i < dots.length; i++) {
                var d = dots[i];
                if (i === 0) ctx.moveTo(centerX + d.x, centerY + d.y);
                else ctx.lineTo(centerX + d.x, centerY + d.y);
            }
            ctx.closePath();
            ctx.stroke();

            
            ctx.fillStyle = color;
            for (var j = 0; j < dots.length; j++) {
                var pt = dots[j];
                ctx.beginPath();
                ctx.arc(centerX + pt.x, centerY + pt.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            State.text._pathDots = null;
        },

        
        
        
        

        drawMarker: function() {
            var markers = State.text._markers;
            if (!markers) return;

            var ctx = State.ctx;
            var centerX = State.canvas.width / 2;
            var centerY = State.canvas.height * 0.42;

            ctx.save();

            for (var i = 0; i < markers.length; i++) {
                var m = markers[i];
                var mx = centerX + m.x;
                var my = centerY + m.y;
                var color = 'rgba(0, 212, 255, 0.6)';

                
                var size = 6;
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;

                
                ctx.beginPath();
                ctx.rect(mx - size, my - size, size * 2, size * 2);
                ctx.stroke();

                
                ctx.beginPath();
                ctx.moveTo(mx - size - 4, my);
                ctx.lineTo(mx + size + 4, my);
                ctx.moveTo(mx, my - size - 4);
                ctx.lineTo(mx, my + size + 4);
                ctx.stroke();

                
                ctx.font = '10px monospace';
                ctx.fillStyle = 'rgba(0, 212, 255, 0.85)';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(m.label || 'Null', mx + size + 8, my - size);
            }

            ctx.restore();

            
            State.text._markers = null;
        },


        
        
        
        

        drawInitial: function() {
            var ctx = State.ctx;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;

            this.drawBackground();

            if (Config.SHAPE_MODE) {
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
                ctx.shadowBlur = 5;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this._drawShapePath(ctx, 0, 0, Config.SHAPE_SIZE);
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                this._drawShapePath(ctx, 0, 0, Config.SHAPE_SIZE);
                ctx.restore();
            } else {
                
                ctx.font = 'bold ' + Config.TEXT_SIZE + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                var initialText = Config.USER_TEXT || Config.TEXT;

                ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
                ctx.shadowBlur = 5;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillText(initialText, centerX, centerY);

                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.fillText(initialText, centerX, centerY);
            }

            
            ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.35)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click Preview to start', centerX, centerY + 40);
        },

        
        
        
        

        drawTrail: function() {
            if (!State.trailEnabled || State._trailCount < 2) return;

            var ctx = State.ctx;
            var centerX = Config.WIDTH / 2;
            var centerY = Config.HEIGHT * 0.42;
            var buf = State.trail;
            var max = State.TRAIL_LENGTH;
            var count = State._trailCount;
            var head = State._trailHead;

            ctx.beginPath();
            ctx.strokeStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '0.15)';
            ctx.lineWidth = 1.5;
            for (var i = 0; i < count; i++) {
                var idx = (head - count + i + max) % max;
                var pt = buf[idx];
                if (i === 0) {
                    ctx.moveTo(centerX + pt.x, centerY + pt.y);
                } else {
                    ctx.lineTo(centerX + pt.x, centerY + pt.y);
                }
            }
            ctx.stroke();

            for (var j = 0; j < count; j++) {
                var idx2 = (head - count + j + max) % max;
                var point = buf[idx2];
                var t = (j + 1) / count;
                ctx.fillStyle = ('rgba(' + (window.FLEX_THEME_RGB || '0, 255, 85') + ', ') + '' + (t * 0.5) + ')';
                ctx.beginPath();
                ctx.arc(centerX + point.x, centerY + point.y, 2 + t * 3, 0, Math.PI * 2);
                ctx.fill();
            }
        },

        updateTrail: function() {
            if (!State.trailEnabled) return;

            var max = State.TRAIL_LENGTH;
            State.trail[State._trailHead] = { x: State.text.x, y: State.text.y };
            State._trailHead = (State._trailHead + 1) % max;
            if (State._trailCount < max) State._trailCount++;
        },

        
        
        
        

        render: function() {
            this.drawBackground();
            this.drawPathDots();
            this.updateTrail();
            this.drawTrail();
            this.drawGhostTexts();
            if (Config.SHAPE_MODE) {
                this.drawShape();
            } else {
                this.drawText();
            }
            this.drawMarker();

            
            if (PreviewEngine.EasingGraph && State.currentType) {
                PreviewEngine.EasingGraph.draw(State.ctx, State.currentType);
            }
        },

        
        
        
        

        renderTextAnimator: function() {
            this.drawBackground();

            
            if (PreviewEngine.TextAnimator) {
                PreviewEngine.TextAnimator.render();
            }
        }
    };

})();
