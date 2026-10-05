




(function() {
    'use strict';

    var State = PreviewEngine.State;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    
    

    F['scale pulse'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 2;
            var amp = p.amp || 10;
            if (amp > 1) amp = amp / 100;

            var elapsed = (time - State.startTime) / 1000;
            var raw = Math.sin(elapsed * freq * M.PI2);
            var sharp = Math.pow(Math.abs(raw), 0.3) * (raw < 0 ? -1 : 1);

            State.text.scale = 1 + sharp * amp;
        }
    };

    
    
    

    F['heartbeat'] = {
        category: 'transform',
        run: function(time, p) {
            var bpm = p.bpm || 72;
            var amp = p.amp || 15;
            if (amp > 1) amp = amp / 100;

            var elapsed = (time - State.startTime) / 1000;
            var t = elapsed * bpm / 60;

            
            var beat1 = Math.pow(Math.max(0, Math.sin(t * Math.PI)), 12);
            var beat2 = Math.pow(Math.max(0, Math.sin((t + 0.3) * Math.PI)), 12) * 0.6;
            var beat = Math.max(beat1, beat2);

            State.text.scale = 1 + beat * amp;
        }
    };

    
    
    

    F['pop in'] = {
        category: 'transform',
        run: function(time, p) {
            var dur = p.dur || p.duration || 0.3;
            var overshoot = p.overshoot || 1.1;

            var elapsed = (time - State.startTime) / 1000;
            var cycleDuration = dur + 0.2 + 1.5; 
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < dur) {
                
                var t = cycleTime / dur;
                var eased = t * t * (3 - 2 * t);
                State.text.scale = eased * overshoot;
                State.text.opacity = eased;
            } else if (cycleTime < dur + 0.2) {
                
                var t = (cycleTime - dur) / 0.2;
                var eased = t * t * (3 - 2 * t);
                State.text.scale = overshoot + (1 - overshoot) * eased;
            } else {
                
                State.text.scale = 1;
            }
        }
    };

    

    
    
    

    F['jelly'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 5;
            var ampX = p.ampX || p.amp || 5;
            var ampY = p.ampY || p.amp || 7;

            if (ampX > 1) ampX = ampX / 100;
            if (ampY > 1) ampY = ampY / 100;

            var elapsed = (time - State.startTime) / 1000;
            var osc = Math.sin(elapsed * freq * M.PI2);

            
            State.text.scaleX = 1 + osc * ampX;
            State.text.scaleY = 1 - osc * ampY;
        }
    };

    
    
    

    F['uniform scale wiggle'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 3;
            var amp = p.amp || 15;
            if (amp > 1) amp = amp / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;

            var smooth = (1 - Math.cos(frac * Math.PI)) / 2;
            var s1 = M.segRange(-1, 1, seg, 0);
            var s2 = M.segRange(-1, 1, seg + 1, 0);
            var wiggle = s1 + (s2 - s1) * smooth;

            State.text.scale = 1 + wiggle * amp;
        }
    };

    
    
    

    F['spin'] = {
        category: 'transform',
        run: function(time, p) {
            var speed = p.speed || p.freq || 90;

            var elapsed = (time - State.startTime) / 1000;

            State.text.rotation = (elapsed * speed) % 360;
        }
    };

    
    
    

    F['wobble'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 4;
            var amp = p.amp || 15;

            var elapsed = (time - State.startTime) / 1000;

            
            var interval = 1 / freq;
            var seg = Math.floor(elapsed / interval);
            var frac = (elapsed % interval) / interval;
            var smooth = frac * frac * (3 - 2 * frac);

            var r1 = M.segRange(-1, 1, seg + 800, 0);
            var r2 = M.segRange(-1, 1, seg + 801, 0);

            State.text.rotation = (r1 + (r2 - r1) * smooth) * amp;
        }
    };

    
    
    

    F['pendulum rotation'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 30;

            var elapsed = (time - State.startTime) / 1000;

            State.text.rotation = Math.sin(elapsed * freq * M.PI2) * amp;
        }
    };

    
    
    

    F['swing'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 0.5;
            var amp = p.amp || 20;

            var elapsed = (time - State.startTime) / 1000;
            var t = elapsed * freq * M.PI2;

            var tgt = M.getTargets(p);

            if (tgt && tgt.rot) {
                State.text.rotation = Math.sin(t) * amp;
            }
            if (!tgt || tgt.pos) {
                State.text.x = Math.sin(t) * amp * 2 * CS;
                State.text.y = (-Math.abs(Math.cos(t)) * amp + amp) * CS;
            }
        }
    };

    
    
    

    F['look at'] = {
        category: 'transform',
        run: function(time, p) {
            var speed = p.speed || p.freq || 1;
            var range = p.range || 30;
            var rnd = p.random || 0;

            var elapsed = (time - State.startTime) / 1000;
            var t = elapsed * speed;

            
            var targetX = Math.cos(t * M.PI2) * 80;
            var targetY = Math.sin(t * M.PI2 * 2) * 40;
            var smoothAngle = Math.atan2(targetY, targetX) * 180 / Math.PI * (range / 90);

            
            var blend = rnd / 100;
            var rndAngle = 0;
            if (blend > 0) {
                rndAngle = (Math.sin(t * 7.13) * 0.5 + Math.sin(t * 3.77) * 0.3 + Math.sin(t * 11.9) * 0.2) * range;
            }

            State.text.rotation = smoothAngle * (1 - blend) + rndAngle * blend;
        }
    };

    
    
    

    F['throw'] = {
        category: 'transform',
        run: function(time, p) {
            var velocityX = p.velocityX != null ? p.velocityX : 100;
            var velocityY = p.velocityY != null ? p.velocityY : -50;

            var elapsed = (time - State.startTime) / 1000;

            
            
            var speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            var moveDur = speed > 10 ? 600 / speed : 8;
            if (moveDur < 3) moveDur = 3;
            if (moveDur > 8) moveDur = 8;
            var fadeDur = 0.5;
            var cycleDuration = moveDur + fadeDur + 0.3;
            var cycleTime = elapsed % cycleDuration;

            
            State.text.x = velocityX * cycleTime * CS;
            State.text.y = velocityY * cycleTime * CS;

            
            if (cycleTime > moveDur) {
                State.text.opacity = 1 - (cycleTime - moveDur) / fadeDur;
            }
            if (cycleTime < 0.3) {
                State.text.opacity = cycleTime / 0.3;
            }
        }
    };

    
    
    

    F['orbit'] = {
        category: 'transform',
        run: function(time, p) {
            var radius = p.radius || 200;
            var speed = p.speed || p.freq || 1;

            var elapsed = (time - State.startTime) / 1000;
            var angle = elapsed * speed * M.PI2;

            
            var r = radius * 0.35;
            State.text.x = Math.cos(angle) * r;
            State.text.y = Math.sin(angle) * r;
        }
    };

    
    
    

    F['follow with delay'] = {
        category: 'transform',
        run: function(time, p) {
            var delay = p.delay || 0.3;

            var elapsed = (time - State.startTime) / 1000;
            var delayedElapsed = elapsed - delay;

            var tgt = M.getTargets(p);

            
            var leaderX = Math.sin(elapsed * 0.3 * M.PI2) * 45;
            var leaderY = Math.cos(elapsed * 0.2 * M.PI2) * 25;
            var followerX = Math.sin(delayedElapsed * 0.3 * M.PI2) * 45;
            var followerY = Math.cos(delayedElapsed * 0.2 * M.PI2) * 25;

            if (!tgt || tgt.pos) {
                State.text.x = followerX;
                State.text.y = followerY;
            }
            if (tgt && tgt.rot) {
                var leaderRot = Math.sin(elapsed * 0.6 * M.PI2) * 25;
                var followerRot = Math.sin(delayedElapsed * 0.6 * M.PI2) * 25;
                State.text.rotation = followerRot;
            }
            if (tgt && tgt.scale) {
                var followerScale = 1 + Math.sin(delayedElapsed * 0.4 * M.PI2) * 0.15;
                State.text.scale = followerScale;
            }
            if (tgt && tgt.opacity) {
                var followerOp = 0.5 + Math.sin(delayedElapsed * 0.5 * M.PI2) * 0.5;
                State.text.opacity = followerOp;
            }

            
            State.text._markers = [
                { x: leaderX, y: leaderY, label: 'Leader' }
            ];
        }
    };

    
    
    

    F['elastic follow'] = {
        category: 'transform',
        run: function(time, p) {
            var friction = p.friction || 3;

            var elapsed = (time - State.startTime) / 1000;

            
            
            var targetX = 120;
            var targetY = -70;

            
            var glideDur = 2;
            var holdDur = 1.5;
            var cycleDuration = glideDur + holdDur;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < glideDur) {
                var f = 1 - Math.exp(-friction * cycleTime);
                State.text.x = targetX * f;
                State.text.y = targetY * f;
            } else {
                State.text.x = targetX;
                State.text.y = targetY;
            }

            
            State.text._markers = [
                { x: targetX, y: targetY, label: 'Target' }
            ];
        }
    };

    
    
    

    F['stagger by index'] = {
        category: 'transform',
        run: function(time, p) {
            var delayPerLayer = p.delayPerLayer || p.delay || 0.1;
            var elapsed = (time - State.startTime) / 1000;

            
            var gap = delayPerLayer * 4;
            var maxDelay = gap * 3;
            var moveDur = 1.8;
            var holdDur = 1.5;
            var cycleDur = moveDur + maxDelay + holdDur;
            var cycleTime = elapsed % cycleDur;

            
            function ease(t) { return t * t * (3 - 2 * t); }

            
            var endX = 85;
            var endY = -60;

            
            var mProg = Math.min(cycleTime / moveDur, 1);
            var masterX = ease(mProg) * endX;
            var masterY = ease(mProg) * endY;

            
            function followerPos(delay) {
                var fTime = Math.max(0, cycleTime - delay);
                var fProg = Math.min(fTime / moveDur, 1);
                var e = ease(fProg);
                return { x: e * endX, y: e * endY };
            }

            
            var f1 = followerPos(gap);
            var f2 = followerPos(gap * 2);
            var f3 = followerPos(gap * 3);

            
            State.text.x = f1.x;
            State.text.y = f1.y;

            
            State.text._ghostTexts = [
                { x: f2.x, y: f2.y, opacity: 0.45 },
                { x: f3.x, y: f3.y, opacity: 0.25 }
            ];

            
            State.text._markers = [
                { x: masterX, y: masterY, label: 'Master' }
            ];
        }
    };

    
    
    

    F['shake position'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 20;
            var amp = p.amp || 15;
            var decay = p.decay || 3;

            var elapsed = (time - State.startTime) / 1000;
            
            var activeDur = Math.min(4.6 / decay, 5);
            var cycleDuration = activeDur + 1;
            var cycleTime = elapsed % cycleDuration;

            var tgt = M.getTargets(p);

            if (cycleTime < activeDur) {
                var envelope = Math.exp(-decay * cycleTime);
                var segment = Math.floor(cycleTime * freq);

                if (!tgt || tgt.pos) {
                    var rx = M.segRange(-1, 1, segment + 100, 0);
                    var ry = M.segRange(-1, 1, segment + 200, 0);
                    State.text.x = rx * amp * envelope * CS;
                    State.text.y = ry * amp * envelope * CS;
                }
                if (tgt && tgt.rot) {
                    var rr = M.segRange(-1, 1, segment + 300, 0);
                    State.text.rotation = rr * amp * 0.33 * envelope;
                }
            }
            
        }
    };

    
    
    

    F['figure 8 path'] = {
        category: 'transform',
        run: function(time, p) {
            var radius = p.radius || 150;
            var speed = p.speed || p.freq || 0.5;

            var elapsed = (time - State.startTime) / 1000;
            var t = elapsed * speed * M.PI2;

            
            State.text.x = Math.sin(t) * radius * 0.35;
            State.text.y = Math.sin(t * 2) * radius * 0.175;
        }
    };

    
    
    

    F['drift position'] = {
        category: 'transform',
        run: function(time, p) {
            var speedX = p.speedX != null ? p.speedX : 10;
            var speedY = p.speedY != null ? p.speedY : -5;
            var wave = p.wave || 15;

            var elapsed = (time - State.startTime) / 1000;

            
            var cycleDuration = 4;
            var t = elapsed % cycleDuration;

            State.text.x = (speedX * t + Math.sin(t * 2) * wave) * CS;
            State.text.y = (speedY * t + Math.cos(t * 3) * wave * 0.67) * CS;
        }
    };

    
    
    

    F['chain follow'] = {
        category: 'transform',
        run: function(time, p) {
            var delay = p.delay || 0.1;
            var elapsed = (time - State.startTime) / 1000;

            
            var cycleDur = 16;
            var prog = (elapsed / cycleDur) % 1;

            
            function pathAt(s) {
                var a = s * M.PI2;
                return {
                    x: -Math.cos(a) * 90,
                    y: Math.sin(a * 2) * 25
                };
            }

            
            var leader = pathAt(prog);
            State.text.x = leader.x;
            State.text.y = leader.y;

            
            var ghosts = [];
            var gap = delay * 0.5;
            for (var i = 1; i <= 4; i++) {
                var fProg = ((prog - gap * i) % 1 + 1) % 1;
                var fp = pathAt(fProg);
                ghosts.push({ x: fp.x, y: fp.y, opacity: 0.55 - i * 0.1 });
            }
            State.text._ghostTexts = ghosts;

            
            var pathMarkers = [];
            for (var j = 0; j <= 20; j++) {
                var pp = pathAt(j / 20);
                pathMarkers.push({ x: pp.x, y: pp.y });
            }
            State.text._pathDots = pathMarkers;
        }
    };

    
    
    

    F['mirror movement'] = {
        category: 'transform',
        run: function(time, p) {
            var distance = p.distance || 100;
            var speed = p.speed || p.freq || 1;
            var elapsed = (time - State.startTime) / 1000;

            
            var separateDur = 2 / speed;
            var holdDur = 1.5;
            var restDur = 0.5;
            var cycleDur = separateDur + holdDur + restDur;
            var t = elapsed % cycleDur;

            var prog;
            if (t < separateDur) {
                
                var raw = t / separateDur;
                prog = raw * raw * (3 - 2 * raw);
            } else if (t < separateDur + holdDur) {
                
                prog = 1;
            } else {
                
                prog = 0;
            }

            var moveX = prog * distance * 0.6;

            
            State.text.x = -moveX;
            State.text.y = 0;

            
            State.text._ghostTexts = [
                { x: moveX, y: 0, opacity: 0.45 }
            ];

            
            var maxDist = distance * 0.6;
            var pathDots = [];
            for (var i = 0; i <= 10; i++) {
                var px = (i / 10) * maxDist;
                pathDots.push({ x: px, y: 0 });
                pathDots.push({ x: -px, y: 0 });
            }
            State.text._pathDots = pathDots;
        }
    };

    
    
    

    F['orbit chain'] = {
        category: 'transform',
        run: function(time, p) {
            var radius = p.radius || 100;
            var speed = p.speed || p.freq || 1;

            var elapsed = (time - State.startTime) / 1000;
            var r = radius * 0.15;
            var phaseGap = Math.PI / 4; 

            
            var angle1 = elapsed * speed * 0.5 * M.PI2;
            State.text.x = Math.cos(angle1) * r;
            State.text.y = Math.sin(angle1) * r;
            State.text.rotation = Math.sin(angle1) * 15;

            
            var angle2 = angle1 + phaseGap;
            var angle3 = angle1 + phaseGap * 2;
            State.text._ghostTexts = [
                { x: Math.cos(angle2) * r, y: Math.sin(angle2) * r, rotation: Math.sin(angle2) * 15, opacity: 0.5 },
                { x: Math.cos(angle3) * r, y: Math.sin(angle3) * r, rotation: Math.sin(angle3) * 15, opacity: 0.3 }
            ];

            
            var pathDots = [];
            for (var i = 0; i <= 20; i++) {
                var a = (i / 20) * Math.PI * 2;
                pathDots.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
            }
            State.text._pathDots = pathDots;
        }
    };

    
    
    

    F['elastic connect'] = {
        category: 'transform',
        run: function(time, p) {
            var elasticity = p.elasticity || 0.5;
            var elapsed = (time - State.startTime) / 1000;

            
            var freq = 0.15;
            var r = 75;
            var leaderX = Math.sin(elapsed * freq * M.PI2) * r;
            var leaderY = Math.cos(elapsed * freq * M.PI2) * r;

            
            var lag = 0.5 * (1 - elasticity);
            var laggedX = Math.sin((elapsed - lag) * freq * M.PI2) * r;
            var laggedY = Math.cos((elapsed - lag) * freq * M.PI2) * r;

            
            State.text.x = laggedX;
            State.text.y = laggedY;

            
            State.text._ghostTexts = [
                { x: leaderX, y: leaderY, opacity: 0.4 }
            ];

            
            var pathDots = [];
            for (var i = 0; i <= 20; i++) {
                var a = (i / 20) * Math.PI * 2;
                pathDots.push({ x: Math.sin(a) * r, y: Math.cos(a) * r });
            }
            State.text._pathDots = pathDots;
        }
    };

    
    
    

    F['distance fade'] = {
        category: 'transform',
        run: function(time, p) {
            var speed = p.speed || p.freq || 1.5;
            var minOp = (p.minOpacity || 0) / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var fade = (Math.cos(elapsed * speed * M.PI2) + 1) / 2;
            State.text.opacity = minOp + fade * (1 - minOp);
        }
    };

})();
