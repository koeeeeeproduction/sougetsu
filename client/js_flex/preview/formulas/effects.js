




(function() {
    'use strict';

    var State = PreviewEngine.State;
    var Config = PreviewEngine.Config;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    
    

    F['sine wave'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 2;
            var amp = p.amp || 30;

            var elapsed = (time - State.startTime) / 1000;
            var wave = Math.sin(elapsed * freq * M.PI2);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = wave * amp * CS;
            }
            if (t && t.rot) {
                State.text.rotation = wave * amp;
            }
            if (t && t.opacity) {
                var oAmp = amp > 1 ? amp / 100 : amp;
                State.text.opacity = Math.max(0, Math.min(1, 1 + wave * oAmp));
            }
            if (t && t.scale) {
                var sAmp = amp;
                if (sAmp > 1) sAmp = sAmp / 100;
                State.text.scale = 1 + wave * sAmp;
            }
        }
    };

    
    
    

    F['square wave'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 2;
            var amp = p.amp || 30;
            var duty = p.duty || 0.5;

            var elapsed = (time - State.startTime) / 1000;
            var phase = (elapsed * freq) % 1;
            var wave = phase < duty ? 1 : -1;

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = wave * amp * CS;
            }
            if (t && t.rot) {
                State.text.rotation = wave * amp;
            }
            if (t && t.opacity) {
                var oAmp = amp > 1 ? amp / 100 : amp;
                State.text.opacity = Math.max(0, Math.min(1, 1 + wave * oAmp));
            }
            if (t && t.scale) {
                var sAmp = amp;
                if (sAmp > 1) sAmp = sAmp / 100;
                State.text.scale = 1 + wave * sAmp;
            }
        }
    };

    
    
    

    F['float / hover'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 0.5;
            var amp = p.amp || 15;

            var elapsed = (time - State.startTime) / 1000;

            
            var y = Math.sin(elapsed * freq * M.PI2) * amp;

            State.text.y = y * CS;
        }
    };

    
    
    

    F['pendulum'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 30;
            var decay = (p.decay != null) ? p.decay : 0.5;

            var elapsed = (time - State.startTime) / 1000;

            if (decay > 0) {
                
                var animDur = Math.min(8, 4.6 / Math.max(decay, 0.1));
                var holdDur = 1;
                var cycleDuration = animDur + holdDur;
                var cycleTime = elapsed % cycleDuration;

                if (cycleTime < animDur) {
                    var swing = Math.sin(cycleTime * freq * M.PI2);
                    var envelope = Math.exp(-decay * cycleTime);
                    State.text.rotation = amp * swing * envelope;
                }
                
            } else {
                
                State.text.rotation = amp * Math.sin(elapsed * freq * M.PI2);
            }
        }
    };

    
    
    

    F['throb'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 15;

            var elapsed = (time - State.startTime) / 1000;
            var phase = (elapsed * freq) % 1;

            
            var pulse = Math.pow(Math.max(0, 1 - phase * 3), 0.5);

            
            var sAmp = amp;
            if (sAmp > 1) sAmp = sAmp / 100;
            State.text.scale = 1 + pulse * sAmp;

            
            State.text.opacity = 1 - pulse * sAmp * 2;
        }
    };

    
    
    

    F['sine drift'] = {
        category: 'effects',
        run: function(time, p) {
            var speed = p.freq || 0.5;
            var amp = p.amp || 30;

            var elapsed = (time - State.startTime) / 1000;

            
            var x = Math.sin(elapsed * speed * 1.7) * amp * 0.5
                  + Math.sin(elapsed * speed * 3.1) * amp * 0.3
                  + Math.sin(elapsed * speed * 5.3) * amp * 0.2;
            var y = Math.sin(elapsed * speed * 2.3 + 1.5) * amp * 0.5
                  + Math.sin(elapsed * speed * 4.1 + 0.7) * amp * 0.3
                  + Math.sin(elapsed * speed * 6.7 + 2.1) * amp * 0.2;

            State.text.x = x * CS;
            State.text.y = y * CS;
        }
    };

    
    
    

    F['triangle wave'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 50;

            var elapsed = (time - State.startTime) / 1000;

            
            var phase = (elapsed * freq) % 1;
            var triangle = Math.abs(phase * 2 - 1) * 2 - 1; 

            var t = M.getTargets(p);

            if (!t || t.rot) {
                State.text.rotation = triangle * amp;
            }
            if (t && t.pos) {
                State.text.x = triangle * amp * CS;
            }
            if (t && t.scale) {
                var sAmp = amp;
                if (sAmp > 1) sAmp = sAmp / 100;
                State.text.scale = 1 + triangle * sAmp;
            }
        }
    };

    
    
    

    F['sawtooth wave'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var saw = (elapsed * freq) % 1;

            var t = M.getTargets(p);

            if (!t || t.rot) {
                State.text.rotation = saw * amp;
            }
            if (t && t.pos) {
                State.text.x = (saw * 2 - 1) * amp * 0.5 * CS;
            }
            if (t && t.scale) {
                var sAmp = amp;
                if (sAmp > 1) sAmp = sAmp / 100;
                State.text.scale = 1 + saw * sAmp;
            }
        }
    };

    
    
    

    F['fade in'] = {
        category: 'effects',
        run: function(time, p) {
            var duration = p.duration || p.dur || 0.5;
            var elapsed = (time - State.startTime) / 1000;
            var hold = 2;
            var cycle = duration + hold;
            var cycleTime = elapsed % cycle;

            if (cycleTime < duration) {
                var t = cycleTime / duration;
                State.text.opacity = t * t * (3 - 2 * t);
            } else {
                State.text.opacity = 1;
            }
        }
    };



    
    
    

    F['auto fade'] = {
        category: 'effects',
        run: function(time, p) {
            var fi = p.fadeIn || p.duration || p.dur || 0.5;
            var fo = p.fadeOut || p.duration || p.dur || 0.5;
            var hold = 1;
            var total = fi + hold + fo + 0.8;
            var elapsed = ((time - State.startTime) / 1000) % total;

            if (elapsed < fi) {
                var t = elapsed / fi;
                State.text.opacity = t * t * (3 - 2 * t);
            } else if (elapsed < fi + hold) {
                State.text.opacity = 1;
            } else if (elapsed < fi + hold + fo) {
                var t = (elapsed - fi - hold) / fo;
                State.text.opacity = 1 - t * t * (3 - 2 * t);
            } else {
                State.text.opacity = 0;
            }
        }
    };

    
    
    

    F['flicker'] = {
        category: 'effects',
        run: function(time, p) {
            var speed = p.speed || p.freq || 15;
            var minOp = p.minOp || p.minOpacity || 50;
            var maxOp = p.maxOp || p.maxOpacity || 100;

            
            if (minOp > 1) minOp = minOp / 100;
            if (maxOp > 1) maxOp = maxOp / 100;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * speed);

            
            var flicker = M.segRange(minOp, maxOp, segment, 0);

            
            State.text.opacity = flicker;
        }
    };

    
    

    F['flash'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var intensity = p.amp || 100;
            if (intensity > 1) intensity = intensity / 100;

            var elapsed = (time - State.startTime) / 1000;
            var period = 1 / freq;
            var phase = (elapsed % period) / period;

            
            var flash = Math.pow(Math.max(0, 1 - phase * 5), 3);
            var minOp = 1 - intensity;

            State.text.opacity = minOp + flash * intensity;
        }
    };

    
    
    

    F['strobe'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 15;

            var elapsed = (time - State.startTime) / 1000;

            
            var on = Math.floor(elapsed * freq) % 2 === 0;

            State.text.opacity = on ? 1 : 0;
        }
    };

    
    
    

    F['pulse opacity'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || p.speed || 1;
            var minOp = p.minOp || p.minOpacity || 60;
            var maxOp = p.maxOp || p.maxOpacity || 100;

            if (minOp > 1) minOp = minOp / 100;
            if (maxOp > 1) maxOp = maxOp / 100;

            var elapsed = (time - State.startTime) / 1000;
            var pulse = (Math.sin(elapsed * freq * M.PI2) + 1) / 2;

            State.text.opacity = minOp + pulse * (maxOp - minOp);
        }
    };

    
    
    

    F['rainbow cycle'] = {
        category: 'effects',
        run: function(time, p) {
            var speed = p.speed || p.freq || 1;
            var offset = p.offset || 0;

            var elapsed = (time - State.startTime) / 1000;

            
            State.text.hue = (((elapsed * speed + offset) * 360) % 360 + 360) % 360;
        }
    };

    
    
    

    F['color pulse'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 1;
            var hue1 = p.hue1 !== undefined ? p.hue1 : 0;
            var hue2 = p.hue2 !== undefined ? p.hue2 : 0.66;

            var elapsed = (time - State.startTime) / 1000;
            var t = (Math.sin(elapsed * freq * M.PI2) + 1) / 2;

            
            var h = hue1 + (hue2 - hue1) * t;
            State.text.hue = ((h % 1) + 1) % 1 * 360;
        }
    };

    
    
    

    F['random color'] = {
        category: 'effects',
        run: function(time, p) {
            var seed = p.seed || 0;

            
            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * 1.4);
            var h = ((segment * 0.618 + seed * 0.01) % 1);

            State.text.hue = h * 360;
        }
    };

    
    
    

    F['hue shift by index'] = {
        category: 'effects',
        run: function(time, p) {
            var hueStep = p.hueStep || 0.1;
            var baseHue = p.baseHue || 0;

            var elapsed = (time - State.startTime) / 1000;

            
            State.text.hue = ((elapsed * hueStep + baseHue) * 360) % 360;
        }
    };

    
    
    

    F['saturation pulse'] = {
        category: 'effects',
        run: function(time, p) {
            var hue = p.hue !== undefined ? p.hue : 0.6;
            var freq = p.freq || 1;

            var elapsed = (time - State.startTime) / 1000;

            
            var sat = 0.5 + Math.sin(elapsed * freq * M.PI2) * 0.4;

            
            State.text.hue = hue * 360;
            State.text.saturation = sat * 100;
        }
    };

    
    
    

    F['heat shimmer'] = {
        category: 'effects',
        run: function(time, p) {
            var intensity = p.intensity || p.amp || 8;
            var speed = p.speed || p.freq || 2;

            var elapsed = (time - State.startTime) / 1000;

            
            var shimmer = Math.sin(elapsed * speed * 10) * intensity;

            State.text.x = shimmer * CS;
        }
    };

    
    
    

    F['light flicker'] = {
        category: 'effects',
        run: function(time, p) {
            var minOpacity = p.minOpacity || 70;
            var speed = p.speed || p.freq || 10;

            if (minOpacity > 1) minOpacity = minOpacity / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            
            var freq1 = speed * 0.3;
            var interval1 = 1 / freq1;
            var seg1 = Math.floor(elapsed / interval1);
            var frac1 = (elapsed % interval1) / interval1;
            var smooth1 = (1 - Math.cos(frac1 * Math.PI)) / 2;
            var r1a = M.segRange(-1, 1, seg1, 0);
            var r1b = M.segRange(-1, 1, seg1 + 1, 0);
            var base = r1a + (r1b - r1a) * smooth1;

            
            var freq2 = speed * 0.7;
            var interval2 = 1 / freq2;
            var seg2 = Math.floor(elapsed / interval2);
            var frac2 = (elapsed % interval2) / interval2;
            var smooth2 = (1 - Math.cos(frac2 * Math.PI)) / 2;
            var r2a = M.segRange(-1, 1, seg2 + 200, 0);
            var r2b = M.segRange(-1, 1, seg2 + 201, 0);
            var mid = r2a + (r2b - r2a) * smooth2;

            
            var freq3 = speed * 1.5;
            var seg3 = Math.floor(elapsed * freq3);
            var jitter = M.segRange(-1, 1, seg3 + 500, 0);

            
            var flicker = 0.7 + base * 0.2 + mid * 0.15 + jitter * 0.1;

            
            var dipChance = M.segRandom(seg3 * 3.7, 0);
            if (dipChance > 0.9) flicker -= 0.25;

            State.text.opacity = Math.max(minOpacity, Math.min(1, flicker));
        }
    };

    
    
    

    F['depth fade'] = {
        category: 'effects',
        run: function(time, p) {
            var str = p.amp || 50;
            var freq = p.freq || 0.4;

            if (str > 1) str = str / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var d = 0.5; 
            var w = Math.sin(elapsed * freq * M.PI2) * 0.3;
            var v = 1 - d * str + w * str * 0.5;

            if (v < 0.1) v = 0.1;
            if (v > 1) v = 1;

            State.text.opacity = v;
            State.text.scale = v;
        }
    };

    
    
    

    F['electrify'] = {
        category: 'effects',
        run: function(time, p) {
            var intensity = p.amp || 5;
            var rate = p.freq || 30;

            var elapsed = (time - State.startTime) / 1000;
            var seg = Math.floor(elapsed * rate);

            
            var rx = M.segRandom(seg * 1.23, 0) * 2 - 1;
            var ry = M.segRandom(seg * 4.56, 0) * 2 - 1;
            var bx = rx * intensity;
            var by = ry * intensity * 0.5;

            
            var spike = M.segRandom(seg * 7.89, 0);
            if (spike > 0.85) {
                bx *= 3;
                by *= 3;
            }

            State.text.x = bx * CS;
            State.text.y = by * CS;
        }
    };

    
    
    

    F['parallax shift'] = {
        category: 'effects',
        run: function(time, p) {
            var depthMultiplier = p.depthMultiplier || p.depth || 0.5;
            var baseMovement = p.baseMovement || p.amp || 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var parallax = Math.sin(elapsed * 0.5) * baseMovement * depthMultiplier;

            State.text.x = parallax * CS;
        }
    };

    
    F['glowing red text'] = {
        category: 'effects',
        run: function(time, p) {
            var elapsed = (time - State.startTime) / 1000;
            var loopTime = elapsed % 3; 

            State.text.customRender = function(ctx, displayText, x, y) {
                
                var offscreen = State._offscreenCanvas;
                if (!offscreen) {
                    offscreen = document.createElement('canvas');
                    State._offscreenCanvas = offscreen;
                }
                if (offscreen.width !== ctx.canvas.width || offscreen.height !== ctx.canvas.height) {
                    offscreen.width = ctx.canvas.width;
                    offscreen.height = ctx.canvas.height;
                }
                var octx = offscreen.getContext('2d');
                octx.clearRect(0, 0, offscreen.width, offscreen.height);

                
                octx.save();
                if (typeof ctx.getTransform === 'function') {
                    octx.setTransform(ctx.getTransform());
                }
                octx.font = ctx.font;
                octx.textAlign = ctx.textAlign;
                octx.textBaseline = ctx.textBaseline;
                octx.globalAlpha = ctx.globalAlpha;

                
                octx.fillStyle = '#cc0000';
                octx.fillText(displayText, x, y);

                
                octx.globalCompositeOperation = 'source-atop';

                var textWidth = octx.measureText(displayText).width;
                var textHeight = Config.TEXT_SIZE || 45;
                var halfW = textWidth / 2;
                var halfH = textHeight / 2;

                
                var sweepRange = textWidth * 3.6;

                
                var sweep1X = -textWidth * 1.8 + (loopTime / 3) * sweepRange;
                octx.save();
                var grad1 = octx.createLinearGradient(sweep1X - 25, 0, sweep1X + 25, 0);
                grad1.addColorStop(0, 'rgba(255, 255, 255, 0)');
                grad1.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
                grad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
                octx.fillStyle = grad1;
                octx.translate(x, y);
                octx.rotate(-145 * Math.PI / 180);
                
                octx.fillRect(sweep1X - 100, -halfH * 6, 200, textHeight * 12);
                octx.restore();

                
                var sweep2X = textWidth * 1.8 - ((loopTime + 1.5) % 3 / 3) * sweepRange;
                octx.save();
                var grad2 = octx.createLinearGradient(sweep2X - 50, 0, sweep2X + 50, 0);
                grad2.addColorStop(0, 'rgba(255, 255, 255, 0)');
                grad2.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
                grad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
                octx.fillStyle = grad2;
                octx.translate(x, y);
                octx.rotate(-132 * Math.PI / 180);
                
                octx.fillRect(sweep2X - 100, -halfH * 6, 200, textHeight * 12);
                octx.restore();

                
                octx.globalCompositeOperation = 'destination-over';
                octx.save();
                octx.shadowColor = 'rgba(255, 0, 0, 0.9)';
                octx.shadowBlur = 25;
                octx.fillStyle = '#ff0000';
                octx.fillText(displayText, x, y);
                octx.shadowBlur = 10;
                octx.fillText(displayText, x, y);
                octx.restore();

                octx.restore();

                
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.drawImage(offscreen, 0, 0);
                ctx.restore();
            };
        }
    };

    
    function generateShatterFragments(ctx, displayText) {
        var textWidth = ctx.measureText(displayText).width;
        var textHeight = Config.TEXT_SIZE || 45;
        var w = textWidth * 1.2;
        var h = textHeight * 1.5;
        
        var cols = 5;
        var rows = 3;
        var points = [];
        
        for (var r = 0; r <= rows; r++) {
            points[r] = [];
            for (var c = 0; c <= cols; c++) {
                var px = -w/2 + (c / cols) * w;
                var py = -h/2 + (r / rows) * h;
                
                if (r > 0 && r < rows && c > 0 && c < cols) {
                    px += (Math.random() - 0.5) * (w / cols) * 0.7;
                    py += (Math.random() - 0.5) * (h / rows) * 0.7;
                }
                points[r][c] = { x: px, y: py };
            }
        }
        
        var triangles = [];
        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var p0 = points[r][c];
                var p1 = points[r][c+1];
                var p2 = points[r+1][c];
                var p3 = points[r+1][c+1];
                
                triangles.push([p0, p1, p2]);
                triangles.push([p1, p3, p2]);
            }
        }
        
        var fragments = [];
        for (var i = 0; i < triangles.length; i++) {
            var tri = triangles[i];
            var cgX = (tri[0].x + tri[1].x + tri[2].x) / 3;
            var cgY = (tri[0].y + tri[1].y + tri[2].y) / 3;
            
            var forceX = 0;
            var forceY = h * 0.2;
            
            var dx = cgX - forceX;
            var dy = cgY - forceY;
            var dist = Math.sqrt(dx*dx + dy*dy) || 1;
            
            
            var speed = (180 / dist) + Math.random() * 60 + 30;
            var vx = (dx / dist) * speed;
            var vy = (dy / dist) * speed;
            
            var rotSpeed = (Math.random() - 0.5) * 5;
            
            fragments.push({
                vertices: tri,
                cg: { x: cgX, y: cgY },
                vx: vx,
                vy: vy,
                rotSpeed: rotSpeed
            });
        }
        return fragments;
    }

    
    F['shatter effect'] = {
        category: 'effects',
        run: function(time, p) {
            var elapsed = (time - State.startTime) / 1000;
            var loopTime = elapsed % 4.5; 

            State.text.customRender = function(ctx, displayText, x, y) {
                
                if (loopTime < 1.0) {
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(displayText, x, y);
                    ctx.restore();
                    return;
                }

                
                var t = loopTime - 1.0;
                
                if (!State._shatterFragments || State._shatterSeed !== State.randomSeed) {
                    State._shatterFragments = generateShatterFragments(ctx, displayText);
                    State._shatterSeed = State.randomSeed;
                }
                
                var frags = State._shatterFragments;
                
                
                var damping = 3.5;
                var moveFactor = (1 - Math.exp(-damping * t)) / damping;
                
                
                var opacity = 1.0;
                if (t > 2.8) {
                    opacity = Math.max(0, 1 - (t - 2.8) / 0.7);
                }
                
                ctx.save();
                ctx.globalAlpha = opacity;
                
                for (var i = 0; i < frags.length; i++) {
                    var f = frags[i];
                    
                    var tx = f.cg.x + f.vx * moveFactor;
                    var ty = f.cg.y + f.vy * moveFactor;
                    var rot = f.rotSpeed * moveFactor;
                    
                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.rotate(rot);
                    ctx.translate(-f.cg.x, -f.cg.y);
                    
                    ctx.beginPath();
                    ctx.moveTo(f.vertices[0].x, f.vertices[0].y);
                    ctx.lineTo(f.vertices[1].x, f.vertices[1].y);
                    ctx.lineTo(f.vertices[2].x, f.vertices[2].y);
                    ctx.closePath();
                    ctx.clip();
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.fillText(displayText, x, y);
                    
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.strokeText(displayText, x, y);
                    
                    ctx.restore();
                }
                
                ctx.restore();
            };
        }
    };

    
    
    F['glowing red text'] = {
        category: 'effects',
        run: function(time, p) {
            var freq = p.freq || 0.5;
            var amp = p.amp || 12;

            var elapsed = (time - State.startTime) / 1000;
            var y = Math.sin(elapsed * freq * M.PI2) * amp;

            State.text.y = y * CS;
            State.text.customStyle = 'glowing_red_text';
        }
    };

})();

