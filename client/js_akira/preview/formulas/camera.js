




(function() {
    'use strict';

    var State = PreviewEngine.State;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    
    

    F['handheld realistic'] = {
        category: 'camera',
        run: function(time, p) {
            var intensity = p.intensity || p.amp || 15;
            var speed = p.speed || p.freq || 1.5;

            var elapsed = (time - State.startTime) / 1000;

            
            var freq1 = speed * 3;
            var interval1 = 1 / freq1;
            var seg1 = Math.floor(elapsed / interval1);
            var frac1 = (elapsed % interval1) / interval1;
            var smooth1 = (1 - Math.cos(frac1 * Math.PI)) / 2;
            var px1 = Utils.randomRange(-1, 1, seg1 + State.randomSeed + 10);
            var px2 = Utils.randomRange(-1, 1, seg1 + 1 + State.randomSeed + 10);
            var py1 = Utils.randomRange(-1, 1, seg1 + State.randomSeed + 510);
            var py2 = Utils.randomRange(-1, 1, seg1 + 1 + State.randomSeed + 510);
            var x = (px1 + (px2 - px1) * smooth1) * intensity * 0.7;
            var y = (py1 + (py2 - py1) * smooth1) * intensity * 0.5;

            
            var freq2 = speed * 5;
            var interval2 = 1 / freq2;
            var seg2 = Math.floor(elapsed / interval2);
            var frac2 = (elapsed % interval2) / interval2;
            var smooth2 = (1 - Math.cos(frac2 * Math.PI)) / 2;
            var jx1 = Utils.randomRange(-1, 1, seg2 + State.randomSeed + 20);
            var jx2 = Utils.randomRange(-1, 1, seg2 + 1 + State.randomSeed + 20);
            var jy1 = Utils.randomRange(-1, 1, seg2 + State.randomSeed + 520);
            var jy2 = Utils.randomRange(-1, 1, seg2 + 1 + State.randomSeed + 520);
            x += (jx1 + (jx2 - jx1) * smooth2) * intensity * 0.3;
            y += (jy1 + (jy2 - jy1) * smooth2) * intensity * 0.2;

            State.text.x = x * CS;
            State.text.y = y * CS;

            
            var rr1 = Utils.randomRange(-1, 1, seg1 + State.randomSeed + 1010);
            var rr2 = Utils.randomRange(-1, 1, seg1 + 1 + State.randomSeed + 1010);
            State.text.rotation = (rr1 + (rr2 - rr1) * smooth1) * intensity * 0.5;
        }
    };

    
    
    

    F['dolly zoom'] = {
        category: 'camera',
        run: function(time, p) {
            var duration = p.duration || 2;
            var intensity = p.intensity || p.amp || 50;

            var elapsed = (time - State.startTime) / 1000;

            var cycleDuration = duration + 1;
            var cycleTime = elapsed % cycleDuration;
            var t = Math.min(cycleTime / duration, 1);

            
            var wave = Math.sin(t * Math.PI);

            
            State.text.scale = 1 + wave * intensity * 0.01;

            
            State.text.y = -wave * intensity * 0.3 * CS;
        }
    };

    
    
    

    F['camera drift'] = {
        category: 'camera',
        run: function(time, p) {
            var speed = p.speed || p.freq || 0.3;
            var amount = p.amount || p.amp || 20;

            var elapsed = (time - State.startTime) / 1000;

            var x = Math.sin(elapsed * speed) * amount;
            var y = Math.cos(elapsed * speed * 0.7) * amount * 0.6;

            State.text.x = x * CS;
            State.text.y = y * CS;

            
            State.text.scale = 1 + Math.sin(elapsed * speed * 0.5) * amount * 0.003;
        }
    };

    
    
    

    F['breathing'] = {
        category: 'transform',
        run: function(time, p) {
            var freq = p.freq || 0.4;
            var amp = p.amp || 0.08;
            if (amp > 1) amp = amp / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var breath = Math.sin(elapsed * freq * M.PI2);

            
            State.text.scale = 1 + breath * amp * 0.5;

            
            State.text.y = breath * amp * 100 * CS;
        }
    };

    
    
    

    F['impact shake'] = {
        category: 'camera',
        run: function(time, p) {
            var freq = p.freq || 25;
            var amp = p.amp || 40;
            var decay = p.decay || 5;

            var elapsed = (time - State.startTime) / 1000;
            var delay = 0.2;
            var shakeDur = 2;
            var cycleDuration = delay + shakeDur;
            var cycleTime = elapsed % cycleDuration;

            if (cycleTime < delay) return; 
            var shakeTime = cycleTime - delay;
            var envelope = Math.exp(-decay * shakeTime);
            var segment = Math.floor(shakeTime * freq);
            var rx = M.segRange(-1, 1, segment + 100, 0);
            var ry = M.segRange(-1, 1, segment + 200, 0);

            State.text.x = rx * amp * envelope * CS;
            State.text.y = ry * amp * 0.6 * envelope * CS;
            State.text.rotation = M.segRange(-1, 1, segment + 300, 0) * amp * envelope;
        }
    };

    
    
    

    F['zoom pulse'] = {
        category: 'camera',
        run: function(time, p) {
            var freq = p.freq || 1;
            var amp = p.amp || 8;
            if (amp > 1) amp = amp / 100;

            var elapsed = (time - State.startTime) / 1000;

            
            var pulse = Math.sin(elapsed * freq * M.PI2);

            State.text.scale = 1 + pulse * amp;
        }
    };

    
    
    

    F['rack focus'] = {
        category: 'camera',
        run: function(time, p) {
            var st = p.startTime || 1;
            var dur = p.duration || 0.5;
            var holdDur = 1.0;
            var dd = 0.5;
            var fe = st + dur;
            var ds = fe + holdDur;
            var cycle = ds + dd;
            var elapsed = ((time - State.startTime) / 1000) % cycle;

            
            var b;
            if (elapsed < st) {
                b = 0;
            } else if (elapsed < fe) {
                var f = (elapsed - st) / dur;
                b = f * f * (3 - 2 * f);
            } else if (elapsed < ds) {
                b = 1;
            } else {
                var f = (elapsed - ds) / dd;
                b = 1 - f * f * (3 - 2 * f);
            }

            State.text.scale = 1.03 - b * 0.03;
            State.text.opacity = 0.6 + b * 0.4;

            var jf = 1 - b;
            if (jf > 0.01) {
                var seg = Math.floor(elapsed * 8);
                State.text.x = M.segRange(-2, 2, seg + 100, 0) * jf * CS;
                State.text.y = M.segRange(-2, 2, seg + 200, 0) * jf * CS;
            }
        }
    };

})();
