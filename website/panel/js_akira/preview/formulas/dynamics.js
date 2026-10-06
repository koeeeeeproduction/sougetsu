




(function() {
    'use strict';

    var State = PreviewEngine.State;
    var Easing = PreviewEngine.Easing;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    
    

    F['wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 5;
            var amp = p.amp || 20;

            var elapsed = (time - State.startTime) / 1000;

            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            
            var smooth = (1 - Math.cos(frac * Math.PI)) / 2;

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed);
            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed);

            var wx = (x1 + (x2 - x1) * smooth) * amp;
            var wy = (y1 + (y2 - y1) * smooth) * amp;

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = wx * CS;
                State.text.y = wy * CS;
            }
            if (!t || t.rot) {
                var rr1 = Utils.randomRange(-1, 1, seg + 1000 + State.randomSeed);
                var rr2 = Utils.randomRange(-1, 1, seg + 1001 + State.randomSeed);
                State.text.rotation = (rr1 + (rr2 - rr1) * smooth) * amp;
            }
            if (t && t.scale) {
                var sx1 = Utils.randomRange(-1, 1, seg + 2000 + State.randomSeed);
                var sx2 = Utils.randomRange(-1, 1, seg + 2001 + State.randomSeed);
                var sy1 = Utils.randomRange(-1, 1, seg + 2500 + State.randomSeed);
                var sy2 = Utils.randomRange(-1, 1, seg + 2501 + State.randomSeed);
                State.text.scaleX = 1 + (sx1 + (sx2 - sx1) * smooth) * amp * 0.005;
                State.text.scaleY = 1 + (sy1 + (sy2 - sy1) * smooth) * amp * 0.005;
            }
            if (t && t.opacity) {
                var o1 = Utils.randomRange(0.5, 1, seg + 3000 + State.randomSeed);
                var o2 = Utils.randomRange(0.5, 1, seg + 3001 + State.randomSeed);
                State.text.opacity = o1 + (o2 - o1) * smooth;
            }
        }
    };

    
    
    

    F['smooth wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 25;
            var octaves = p.octaves || 4;
            var ampMult = 0.3; 

            var elapsed = (time - State.startTime) / 1000;

            
            var wx = 0, wy = 0, wr = 0, wsx = 0, wsy = 0;
            var curFreq = freq;
            var curAmp = amp;
            for (var o = 0; o < octaves; o++) {
                var interval = 1 / curFreq;
                var seg = Math.floor(elapsed / interval);
                var frac = (elapsed % interval) / interval;
                var smooth = frac * frac * (3 - 2 * frac);
                var seedOff = o * 7000 + 50;

                var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + seedOff);
                var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + seedOff);
                var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + seedOff);
                var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + seedOff);

                wx += (x1 + (x2 - x1) * smooth) * curAmp;
                wy += (y1 + (y2 - y1) * smooth) * curAmp;

                var r1 = Utils.randomRange(-1, 1, seg + 1000 + State.randomSeed + seedOff);
                var r2 = Utils.randomRange(-1, 1, seg + 1001 + State.randomSeed + seedOff);
                wr += (r1 + (r2 - r1) * smooth) * curAmp;

                var sx1 = Utils.randomRange(-1, 1, seg + 2000 + State.randomSeed + seedOff);
                var sx2 = Utils.randomRange(-1, 1, seg + 2001 + State.randomSeed + seedOff);
                var sy1 = Utils.randomRange(-1, 1, seg + 2500 + State.randomSeed + seedOff);
                var sy2 = Utils.randomRange(-1, 1, seg + 2501 + State.randomSeed + seedOff);
                wsx += (sx1 + (sx2 - sx1) * smooth) * curAmp;
                wsy += (sy1 + (sy2 - sy1) * smooth) * curAmp;

                curFreq *= 2;
                curAmp *= ampMult;
            }

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = wx * CS;
                State.text.y = wy * CS;
            }
            if (!t || t.rot) {
                State.text.rotation = wr;
            }
            if (t && t.scale) {
                State.text.scaleX = 1 + wsx * 0.004;
                State.text.scaleY = 1 + wsy * 0.004;
            }
        }
    };

    
    
    

    F['decay wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 8;
            var startAmp = p.startAmp || p.amp || 80;
            var decay = p.decay || 3;
            var fps = p.fps || 12;

            var elapsed = (time - State.startTime) / 1000;
            var delay = 0.2;
            var shakeDur = 2.5;
            var holdDur = 3;
            var cycleDuration = delay + shakeDur + holdDur;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < delay) return; 
            if (cycleTime > delay + shakeDur) return; 

            
            var posterized = Math.floor(cycleTime * fps) / fps;

            var shakeTime = posterized - delay;
            if (shakeTime < 0) return;
            var currentAmp = startAmp * Math.exp(-decay * shakeTime);

            var interval = 1 / freq;
            var seg = Math.floor(posterized / interval);
            var frac = (posterized % interval) / interval;

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + 100);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + 100);
            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + 100);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + 100);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = (x1 + (x2 - x1) * frac) * currentAmp * CS;
                State.text.y = (y1 + (y2 - y1) * frac) * currentAmp * CS;
            }
            if (!t || t.rot) {
                var rr1 = Utils.randomRange(-1, 1, seg + 1000 + State.randomSeed);
                var rr2 = Utils.randomRange(-1, 1, seg + 1001 + State.randomSeed);
                State.text.rotation = (rr1 + (rr2 - rr1) * frac) * currentAmp;
            }
            if (t && t.scale) {
                var sx1 = Utils.randomRange(-1, 1, seg + 2000 + State.randomSeed);
                var sx2 = Utils.randomRange(-1, 1, seg + 2001 + State.randomSeed);
                var sy1 = Utils.randomRange(-1, 1, seg + 2500 + State.randomSeed);
                var sy2 = Utils.randomRange(-1, 1, seg + 2501 + State.randomSeed);
                State.text.scaleX = 1 + (sx1 + (sx2 - sx1) * frac) * currentAmp * 0.008;
                State.text.scaleY = 1 + (sy1 + (sy2 - sy1) * frac) * currentAmp * 0.008;
            }
        }
    };

    
    
    

    F['x-axis wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 5;
            var amp = p.amp || 15;

            var elapsed = (time - State.startTime) / 1000;

            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            var smooth = (1 - Math.cos(frac * Math.PI)) / 2;

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + 150);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + 150);

            State.text.x = (x1 + (x2 - x1) * smooth) * amp * CS;
        }
    };

    
    
    

    F['y-axis wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 5;
            var amp = p.amp || 15;

            var elapsed = (time - State.startTime) / 1000;

            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            var smooth = (1 - Math.cos(frac * Math.PI)) / 2;

            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + 200);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + 200);

            State.text.y = (y1 + (y2 - y1) * smooth) * amp * CS;
        }
    };

    
    
    

    F['loopable wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 2;
            var amp = p.amp || 25;
            var loopDur = p.loopDur || 5;

            var elapsed = (time - State.startTime) / 1000;
            var pi2 = Math.PI * 2;
            var phase = (elapsed % loopDur) / loopDur * pi2 * freq;

            
            var nx = Math.sin(phase + 1.2) * 0.5
                   + Math.sin(phase * 2 + 0.7) * 0.3
                   + Math.sin(phase * 3 + 2.4) * 0.2;
            var ny = Math.sin(phase + 3.8) * 0.5
                   + Math.sin(phase * 2 + 1.5) * 0.3
                   + Math.sin(phase * 4 + 0.3) * 0.2;

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = nx * amp * CS;
                State.text.y = ny * amp * CS;
            }
            if (t && t.rot) {
                State.text.rotation = nx * amp;
            }
            if (t && t.scale) {
                State.text.scaleX = 1 + nx * amp * 0.003;
                State.text.scaleY = 1 + ny * amp * 0.003;
            }
        }
    };

    
    
    

    F['snapping wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 3;
            var gridSize = p.gridSize || p.snap || 50;

            var elapsed = (time - State.startTime) / 1000;
            var amp = gridSize * 2;

            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            var smooth = (1 - Math.cos(frac * Math.PI)) / 2;

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + 350);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + 350);
            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + 350);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + 350);

            var wx = (x1 + (x2 - x1) * smooth) * amp;
            var wy = (y1 + (y2 - y1) * smooth) * amp;

            
            wx = Math.round(wx / gridSize) * gridSize;
            wy = Math.round(wy / gridSize) * gridSize;

            State.text.x = wx * CS;
            State.text.y = wy * CS;
        }
    };

    
    
    

    F['separate xy wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freqX = p.freqX || p.freq || 3;
            var ampX = p.ampX || p.amp || 30;
            var freqY = p.freqY || p.freq || 5;
            var ampY = p.ampY || p.amp || 10;

            var elapsed = (time - State.startTime) / 1000;

            
            var intervalX = 1 / freqX;
            var segX = Math.floor(elapsed / intervalX);
            var fracX = (elapsed % intervalX) / intervalX;
            var smoothX = (1 - Math.cos(fracX * Math.PI)) / 2;
            var x1 = Utils.randomRange(-1, 1, segX + State.randomSeed + 400);
            var x2 = Utils.randomRange(-1, 1, segX + 1 + State.randomSeed + 400);
            var wx = (x1 + (x2 - x1) * smoothX) * ampX;

            
            var intervalY = 1 / freqY;
            var segY = Math.floor(elapsed / intervalY);
            var fracY = (elapsed % intervalY) / intervalY;
            var smoothY = (1 - Math.cos(fracY * Math.PI)) / 2;
            var y1 = Utils.randomRange(-1, 1, segY + State.randomSeed + 900);
            var y2 = Utils.randomRange(-1, 1, segY + 1 + State.randomSeed + 900);
            var wy = (y1 + (y2 - y1) * smoothY) * ampY;

            State.text.x = wx * CS;
            State.text.y = wy * CS;
        }
    };

    
    
    

    F['jumpy wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var fps = p.fps || 8;
            var freq = p.freq || 5;
            var amp = p.amp || 30;

            var elapsed = (time - State.startTime) / 1000;

            
            var posterized = Math.floor(elapsed * fps) / fps;

            var interval = 1 / freq;
            var seg = Math.floor(posterized / interval);
            var frac = (posterized % interval) / interval;

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + 450);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + 450);
            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + 450);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + 450);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = (x1 + (x2 - x1) * frac) * amp * CS;
                State.text.y = (y1 + (y2 - y1) * frac) * amp * CS;
            }
            if (t && t.rot) {
                var r1 = Utils.randomRange(-1, 1, seg + 1000 + State.randomSeed);
                var r2 = Utils.randomRange(-1, 1, seg + 1001 + State.randomSeed);
                State.text.rotation = (r1 + (r2 - r1) * frac) * amp;
            }
            if (t && t.scale) {
                var sx1 = Utils.randomRange(-1, 1, seg + 2000 + State.randomSeed);
                var sx2 = Utils.randomRange(-1, 1, seg + 2001 + State.randomSeed);
                var sy1 = Utils.randomRange(-1, 1, seg + 2500 + State.randomSeed);
                var sy2 = Utils.randomRange(-1, 1, seg + 2501 + State.randomSeed);
                State.text.scaleX = 1 + (sx1 + (sx2 - sx1) * frac) * amp * 0.005;
                State.text.scaleY = 1 + (sy1 + (sy2 - sy1) * frac) * amp * 0.005;
            }
        }
    };

    
    
    

    F['noise wiggle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 50;

            var elapsed = (time - State.startTime) / 1000;

            
            
            var t = elapsed * freq;
            var nx = (Math.sin(t * 1.7) * 0.5 + Math.sin(t * 3.3 + 0.5) * 0.3 + Math.sin(t * 5.1 + 1.2) * 0.2) * 0.5;
            var ny = (Math.sin(t * 2.1 + 100) * 0.5 + Math.sin(t * 4.1 + 100.5) * 0.3 + Math.sin(t * 6.3 + 101.2) * 0.2) * 0.5;

            State.text.x = nx * amp * CS;
            State.text.y = ny * amp * CS;
        }
    };

    
    
    

    F['shake'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 20;
            var amp = p.amp || 15;
            var decay = p.decay || 3;

            var elapsed = (time - State.startTime) / 1000;
            var delay = 0.2;
            var shakeDur = 2;
            var holdDur = 3;
            var cycleDuration = delay + shakeDur + holdDur;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < delay) return; 
            if (cycleTime > delay + shakeDur) return; 
            var shakeTime = cycleTime - delay;
            var envelope = Math.exp(-decay * shakeTime);
            var segment = Math.floor(shakeTime * freq);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = M.segRange(-1, 1, segment + 100, 0) * amp * envelope * CS;
                State.text.y = M.segRange(-1, 1, segment + 200, 0) * amp * 0.7 * envelope * CS;
            }
            if (!t || t.rot) {
                State.text.rotation = M.segRange(-1, 1, segment + 300, 0) * amp * envelope;
            }
            if (t && t.scale) {
                State.text.scaleX = 1 + M.segRange(-1, 1, segment + 400, 0) * amp * 0.008 * envelope;
                State.text.scaleY = 1 + M.segRange(-1, 1, segment + 450, 0) * amp * 0.008 * envelope;
            }
            if (t && t.opacity) {
                State.text.opacity = 0.7 + M.segRange(0, 0.3, segment + 500, 0) * envelope;
            }
        }
    };

    
    
    

    F['jitter'] = {
        category: 'dynamics',
        run: function(time, p) {
            var amp = p.amp || 2;
            var fps = p.fps || 15;
            var freq = 30;

            var elapsed = (time - State.startTime) / 1000;
            
            var posterized = Math.floor(elapsed * fps) / fps;
            var segment = Math.floor(posterized * freq);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = M.segRange(-amp, amp, segment, 0) * CS;
                State.text.y = M.segRange(-amp, amp, segment + 500, 0) * CS;
            }
            if (t && t.rot) {
                State.text.rotation = M.segRange(-amp, amp, segment + 1000, 0);
            }
            if (t && t.scale) {
                State.text.scaleX = 1 + M.segRange(-1, 1, segment + 2000, 0) * amp * 0.01;
                State.text.scaleY = 1 + M.segRange(-1, 1, segment + 2500, 0) * amp * 0.01;
            }
        }
    };

    
    
    

    F['drift'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 0.3;
            var amp = p.amp || 20;

            var elapsed = (time - State.startTime) / 1000;

            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            var smooth = frac * frac * (3 - 2 * frac);

            var x1 = Utils.randomRange(-1, 1, seg + State.randomSeed + 600);
            var y1 = Utils.randomRange(-1, 1, seg + 500 + State.randomSeed + 600);
            var x2 = Utils.randomRange(-1, 1, seg + 1 + State.randomSeed + 600);
            var y2 = Utils.randomRange(-1, 1, seg + 501 + State.randomSeed + 600);

            var t = M.getTargets(p);

            if (!t || t.pos) {
                State.text.x = (x1 + (x2 - x1) * smooth) * amp * CS;
                State.text.y = (y1 + (y2 - y1) * smooth) * amp * CS;
            }
            if (!t || t.rot) {
                var r1 = Utils.randomRange(-1, 1, seg + 1000 + State.randomSeed + 600);
                var r2 = Utils.randomRange(-1, 1, seg + 1001 + State.randomSeed + 600);
                State.text.rotation = (r1 + (r2 - r1) * smooth) * amp;
            }
        }
    };

    
    
    

    F['random jump'] = {
        category: 'dynamics',
        run: function(time, p) {
            var holdTime = p.holdTime || 0.5;
            var rangeX = p.rangeX || 100;
            var rangeY = p.rangeY || 100;

            var elapsed = (time - State.startTime) / 1000;
            var seed = Math.floor(elapsed / holdTime);

            State.text.x = M.segRange(-rangeX, rangeX, seed, 0) * CS;
            State.text.y = M.segRange(-rangeY, rangeY, seed + 500, 0) * CS;
        }
    };

    
    
    

    F['auto bounce'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 3;
            var amp = p.amp || 50;
            var decay = p.decay || 5;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 3;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < 2) {
                var bounce = Math.abs(Math.sin(cycleTime * freq * Math.PI)) * amp;
                var envelope = Math.exp(-decay * cycleTime);
                State.text.y = -bounce * envelope * CS;
            }
        }
    };

    
    
    

    F['elastic pop'] = {
        category: 'dynamics',
        run: function(time, p) {
            var overshoot = p.overshoot || 1.2;
            var freq = p.freq || 4;
            var decay = p.decay || 5;

            if (overshoot > 2) overshoot = overshoot / 100;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 2.5;
            var cycleTime = elapsed % cycleDuration;

            var dur = 0.3;
            if (cycleTime < dur) {
                
                var t = cycleTime / dur;
                var eased = t * t * (3 - 2 * t);
                State.text.scale = eased * overshoot;
                State.text.opacity = eased;
            } else if (cycleTime < 1.5) {
                
                var st = cycleTime - dur;
                var diff = overshoot - 1;
                var settle = diff * Math.cos(st * freq * M.PI2) * Math.exp(-decay * st);
                State.text.scale = 1 + settle;
            } else {
                State.text.scale = 1;
            }
        }
    };

    
    
    

    F['springy'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 5;
            var amp = p.amp || 30;
            var decay = p.decay || 4;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 3;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < 2) {
                var spring = Math.sin(cycleTime * freq * M.PI2) * amp * Math.exp(-decay * cycleTime);
                State.text.rotation = spring;
            }
        }
    };

    
    
    

    F['rubber'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 5;
            var ampX = p.ampX || p.amp || 15;
            var ampY = p.ampY || p.amp || 20;
            var decay = p.decay || 4;

            if (ampX > 1) ampX = ampX / 100;
            if (ampY > 1) ampY = ampY / 100;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 2.5;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < 1.5) {
                var envelope = Math.exp(-decay * cycleTime);
                var osc = Math.sin(cycleTime * freq * M.PI2);

                State.text.scaleX = 1 + osc * ampX * envelope;
                State.text.scaleY = 1 - osc * ampY * envelope;
            }
        }
    };

    
    
    

    F['squash & stretch'] = {
        category: 'dynamics',
        run: function(time, p) {
            var freq = p.freq || 3;
            var amp = p.amp || 20;
            var decay = p.decay || 3;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 2;
            var holdDuration = 1;
            var totalCycle = cycleDuration + holdDuration;
            var cycleTime = elapsed % totalCycle;

            if (cycleTime < cycleDuration) {
                
                var squash = Math.sin(cycleTime * freq * Math.PI) * amp * Math.exp(-decay * cycleTime);
                
                State.text.scaleX = 1 + squash / 100;
                State.text.scaleY = 1 - squash * 0.8 / 100;
            }
        }
    };

    
    
    

    F['anticipation'] = {
        category: 'dynamics',
        run: function(time, p) {
            var pullback = Math.abs(p.pullback || 20);
            var dur = p.dur || p.duration || 0.3;
            var release = 0.15;

            var cycleDuration = dur + release + 1.5;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var t = M.getTargets(p);
            var val = 0;

            if (elapsed < dur) {
                var progress = elapsed / dur;
                val = progress * progress * (-pullback);
            } else if (elapsed < dur + release) {
                var rp = (elapsed - dur) / release;
                val = -pullback * (1 - rp * rp);
            }

            if (!t || t.rot) {
                State.text.rotation = val;
            }
            if (t && t.pos) {
                State.text.x = val * CS;
            }
            if (t && t.scale) {
                State.text.scale = 1 + val * 0.008;
            }
        }
    };

    
    
    

    F['overshoot'] = {
        category: 'dynamics',
        run: function(time, p) {
            var amp = p.overshoot || p.amp || 15;
            var freq = p.freq || 4;
            var decay = p.decay || 6;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = 2;
            var holdDuration = 1;
            var totalCycle = cycleDuration + holdDuration;
            var cycleTime = elapsed % totalCycle;

            var t = M.getTargets(p);

            if (cycleTime < cycleDuration) {
                
                var settle = amp * Math.sin(cycleTime * freq * M.PI2) * Math.exp(-decay * cycleTime);

                if (!t || t.rot) {
                    State.text.rotation = settle;
                }
                if (t && t.pos) {
                    State.text.y = -settle * CS;
                }
                if (t && t.scale) {
                    State.text.scale = 1 + settle * 0.01;
                }
                if (t && t.opacity) {
                    var raw = Math.cos(cycleTime * freq * M.PI2) * Math.exp(-decay * cycleTime);
                    State.text.opacity = M.clamp(0.6 * Math.max(raw, 0), 0, 1);
                }
            }
        }
    };

    
    
    

    F['friction slide'] = {
        category: 'dynamics',
        run: function(time, p) {
            var v0 = p.initialVelocity || p.velocity || 500;
            var friction = p.friction || 3;

            var slideDur = 1.5;
            var holdDur = 1;
            var returnDur = 1.5;
            var restDur = 1;
            var cycleDuration = slideDur + holdDur + returnDur + restDur;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var maxDist = v0 * (1 - Math.exp(-friction * slideDur)) / friction;

            if (elapsed < slideDur) {
                var dist = v0 * (1 - Math.exp(-friction * elapsed)) / friction;
                State.text.x = dist * CS;
            } else if (elapsed < slideDur + holdDur) {
                State.text.x = maxDist * CS;
            } else if (elapsed < slideDur + holdDur + returnDur) {
                var returnT = (elapsed - slideDur - holdDur) / returnDur;
                State.text.x = maxDist * (1 - returnT * returnT) * CS;
            }
            
        }
    };

    
    
    

    F['air drag'] = {
        category: 'dynamics',
        run: function(time, p) {
            var velocity = p.velocity || 400;
            var drag = p.drag || p.friction || 2;

            
            var activeDur = Math.min(6 / drag, 5);
            var restDur = 1;
            var cycleDuration = activeDur + restDur;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < activeDur) {
                var dist = velocity * elapsed * Math.exp(-drag * elapsed);
                State.text.x = dist * CS;
            }
            
        }
    };

    
    
    

    F['wind sway'] = {
        category: 'dynamics',
        run: function(time, p) {
            var intensity = p.intensity || p.amp || 15;
            var speed = p.speed || p.freq || 1;

            var elapsed = (time - State.startTime) / 1000;

            var wind = Math.sin(elapsed * speed * 2.1) * intensity * 0.5 +
                       Math.sin(elapsed * speed * 3.7) * intensity * 0.3 +
                       Math.sin(elapsed * speed * 1.3) * intensity * 0.2;

            var t = M.getTargets(p);

            if (!t || t.rot) {
                State.text.rotation = wind;
            }
            if (!t || t.pos) {
                State.text.x = wind * CS;
                State.text.y = Math.sin(elapsed * speed * 0.7) * intensity * 0.15 * CS;
            }
        }
    };

    
    
    

    F['rope physics'] = {
        category: 'dynamics',
        run: function(time, p) {
            var delay = p.delay || 0.1;
            var damping = p.damping || 0.8;

            var elapsed = (time - State.startTime) / 1000;

            
            var swingDur = 6;
            var holdDur = 1;
            var cycleDuration = swingDur + holdDur;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime >= swingDur) return; 

            var t = cycleTime;
            var omega = 3 / delay;
            var env = Math.exp(-(1 - damping) * 4 * t);

            
            var fadeout = 1;
            if (t > swingDur - 1.5) {
                var ft = (t - (swingDur - 1.5)) / 1.5;
                fadeout = 1 - ft * ft;
            }

            var swing = Math.sin(omega * t) * env * fadeout;

            
            State.text.x = swing * 80 * CS;
            State.text.y = (1 - Math.cos(omega * t * 0.5)) * env * fadeout * 20 * CS;

            
            State.text.rotation = swing * 25;
        }
    };

    
    
    

    F['magnet pull'] = {
        category: 'dynamics',
        run: function(time, p) {
            var amp = p.amplitude || p.amp || 150;
            var strength = p.strength || 0.05;

            

            var k = strength * 50;
            var animDur = 4.6 / k;
            if (animDur < 1.5) animDur = 1.5;
            if (animDur > 12) animDur = 12;
            var holdDur = 1.0;
            var cycleDuration = animDur + holdDur;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < animDur) {
                var decay = Math.exp(-k * elapsed);
                var angle = elapsed * 1.5;

                State.text.x = amp * decay * Math.cos(angle) * CS;
                State.text.y = amp * 0.4 * decay * Math.sin(angle) * CS;
            }
            
        }
    };

    
    
    

    F['collision edge'] = {
        category: 'dynamics',
        run: function(time, p) {
            var velocity = p.velocity || 200;
            var bounciness = p.bounciness || p.bounce || 0.8;

            

            var n = Math.log(0.01) / Math.log(bounciness);
            var bounceDur = n;
            if (bounceDur < 3) bounceDur = 3;
            if (bounceDur > 15) bounceDur = 15;
            var holdDur = 1.5;
            var cycleDuration = bounceDur + holdDur;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < bounceDur) {
                var leg = Math.floor(elapsed);
                var frac = elapsed - leg;
                var energy = Math.pow(bounciness, leg);
                var x;
                if (leg % 2 === 0) { x = frac * velocity; }
                else { x = (1 - frac) * velocity; }
                x = x * energy;
                State.text.x = x * CS;
            }
            
        }
    };

    
    
    

    F['mass spring'] = {
        category: 'dynamics',
        run: function(time, p) {
            var stiffness = p.stiffness || 4;
            var mass = p.mass || 1;
            var damping = p.damping || 0.2;

            
            var animDur = 4.6 / damping;
            if (animDur < 2) animDur = 2;
            if (animDur > 15) animDur = 15;
            var holdDur = 1.5;
            var cycleDuration = animDur + holdDur;

            var elapsed = (time - State.startTime) / 1000;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < animDur) {
                var omega = Math.sqrt(stiffness / mass);
                var springAmp = 50 * Math.exp(-damping * cycleTime) * Math.cos(omega * cycleTime);

                var t = M.getTargets(p);
                if (!t || t.pos) {
                    State.text.y = springAmp * CS;
                }
                if (!t || t.scale) {
                    State.text.scale = 1 + springAmp * 0.003;
                }
            }
        }
    };

    
    
    

    F['arrive + settle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var arriveTime = p.arriveTime || 0.8;
            var settleAmp = p.settleAmp || 15;
            var decay = p.decay || 6;

            var cycleDuration = arriveTime + 2;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var t = M.getTargets(p);

            if (elapsed < arriveTime) {
                var progress = elapsed / arriveTime;
                var eased = progress * progress * (3 - 2 * progress);

                if (!t || t.pos) {
                    State.text.x = -200 * (1 - eased) * CS;
                }
                if (!t || t.scale) {
                    State.text.scale = 1 - 0.2 * (1 - eased);
                }
            } else {
                var settleElapsed = elapsed - arriveTime;
                var settle = Math.sin(settleElapsed * 12) * settleAmp * Math.exp(-decay * settleElapsed);

                if (!t || t.pos) {
                    State.text.x = settle * CS;
                }
                if (!t || t.scale) {
                    State.text.scale = 1 + settle * 0.003;
                }
            }
        }
    };

    
    
    

    F['anticipation pop'] = {
        category: 'dynamics',
        run: function(time, p) {
            var anticipation = p.anticipation || p.duration || 0.2;
            var popAmount = p.popAmount || p.pullback || p.amp || 20;
            var snapEnd = anticipation + 0.1;

            var cycleDuration = snapEnd + 2;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var t = M.getTargets(p);
            var v;

            if (elapsed < anticipation) {
                
                var progress = elapsed / anticipation;
                var eased = progress * progress * (3 - 2 * progress);
                v = -popAmount * 0.4 * eased;
            } else if (elapsed < snapEnd) {
                
                var snapT = (elapsed - anticipation) / 0.1;
                var snapEased = snapT * snapT * (3 - 2 * snapT);
                v = -popAmount * 0.4 + (popAmount * 0.4 + popAmount) * snapEased;
            } else {
                
                var st = elapsed - snapEnd;
                v = popAmount * Math.exp(-8 * st);
            }

            if (!t || t.pos) { State.text.x = v * CS; }
            if (!t || t.scale) { State.text.scale = 1 + v * 0.01; }
        }
    };

    
    
    

    F['throw + catch'] = {
        category: 'dynamics',
        run: function(time, p) {
            var throwSpeed = p.throwSpeed || p.velocity || 400;
            var catchTime = p.catchTime || 1;

            var holdEnd = catchTime + 0.3;
            var returnEnd = catchTime * 2 + 0.3;
            var cycleDuration = returnEnd + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < catchTime) {
                
                var progress = elapsed / catchTime;
                var eased = 1 - Math.pow(1 - progress, 3);
                State.text.x = eased * throwSpeed * CS;
            } else if (elapsed < holdEnd) {
                
                State.text.x = throwSpeed * CS;
            } else if (elapsed < returnEnd) {
                
                var rT = (elapsed - holdEnd) / catchTime;
                State.text.x = throwSpeed * (1 - rT * rT * rT) * CS;
            }
        }
    };

    
    
    

    F['drift + snap'] = {
        category: 'dynamics',
        run: function(time, p) {
            var driftTime = p.driftTime || p.duration || 2;
            var driftAmount = p.driftAmount || p.amp || 50;

            var cycleDuration = driftTime + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < driftTime) {
                var drift = Math.sin(elapsed * 2) * driftAmount * (1 - elapsed / driftTime);
                State.text.x = drift * CS;
                State.text.y = drift * 0.5 * CS;
            }
        }
    };

    
    
    

    F['float + land'] = {
        category: 'dynamics',
        run: function(time, p) {
            var floatTime = p.floatTime || 2;
            var floatHeight = p.floatHeight || 150;

            var cycleDuration = floatTime + 1.5;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            if (elapsed < floatTime) {
                var progress = elapsed / floatTime;
                var eased = progress * progress;
                var sway = Math.sin(elapsed * 3) * 20;
                var fade = 1 - progress * progress * progress;

                State.text.x = sway * fade * CS;
                
                State.text.y = -floatHeight * (1 - eased) * CS * 0.4;
                State.text.rotation = sway * fade * 0.3;
            }
        }
    };

    
    
    

    F['whip + settle'] = {
        category: 'dynamics',
        run: function(time, p) {
            var whipSpeed = p.whipSpeed || p.duration || 0.2;
            var settleFreq = p.settleFreq || p.freq || 6;

            var cycleDuration = whipSpeed + 2;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var t = M.getTargets(p);

            if (elapsed < whipSpeed) {
                var progress = elapsed / whipSpeed;
                var eased = progress * progress * (3 - 2 * progress);

                if (!t || t.rot) {
                    State.text.rotation = -90 * (1 - eased);
                }
                if (t && t.pos) {
                    State.text.x = -200 * (1 - eased) * CS;
                }
            } else {
                var st = elapsed - whipSpeed;
                var settle = 15 * Math.sin(st * settleFreq * M.PI2) * Math.exp(-5 * st);

                if (!t || t.rot) {
                    State.text.rotation = settle;
                }
                if (t && t.pos) {
                    State.text.x = settle * CS;
                }
            }
        }
    };

    
    
    
    

    F['inertia'] = {
        category: 'dynamics',
        run: function(time, p) {
            var decay = p.decay || 5;
            var amp = p.amp || 150;
            var holdFrames = p.hold || 15;

            var elapsed = (time - State.startTime) / 1000;

            
            var slideDur = 1.0;
            var holdDur = holdFrames / 25; 
            var cycleDur = slideDur + holdDur;
            var cycleTime = elapsed % cycleDur;

            var maxM = amp * (1 - Math.exp(-decay * slideDur)) / decay;
            var m = (cycleTime < slideDur)
                ? amp * (1 - Math.exp(-decay * cycleTime)) / decay
                : maxM;

            var t2 = M.getTargets(p);

            if (!t2 || t2.pos) {
                State.text.x = m * CS;
            }
            if (t2 && t2.rot) {
                State.text.rotation = m * 0.3;
            }
            if (t2 && t2.scale) {
                State.text.scale = 1 + m * 0.001;
            }
        }
    };

})();
