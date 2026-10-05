




(function() {
    'use strict';

    var State = PreviewEngine.State;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    
    

    F['glitch position'] = {
        category: 'glitch',
        run: function(time, p) {
            var intensity = p.intensity || p.amp || 30;
            var freq = p.freq || 8;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * freq);

            var r = M.segRandom(segment, 0);

            if (r > 0.85) {
                
                State.text.x = M.segRange(-intensity * 2, intensity * 2, segment + 100, 0) * CS;
                State.text.y = M.segRange(-intensity, intensity, segment + 200, 0) * CS;
            } else if (r > 0.55) {
                
                State.text.x = M.segRange(-intensity * 0.3, intensity * 0.3, segment + 100, 0) * CS;
                State.text.y = M.segRange(-intensity * 0.15, intensity * 0.15, segment + 200, 0) * CS;
            }
            
        }
    };

    
    
    

    F['rgb split'] = {
        category: 'glitch',
        run: function(time, p) {
            var amount = p.amount || p.amp || 8;
            var freq = p.freq || 4;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * freq);

            
            var offset = M.segRange(-amount, amount, segment, 0);
            var yOffset = M.segRange(-amount * 0.3, amount * 0.3, segment + 500, 0);

            
            State.text.rgbSplit = Math.abs(offset) + amount * 0.2;

            
            State.text.x = offset * 0.15 * CS;
            State.text.y = yOffset * CS;
        }
    };

    
    
    

    F['signal noise'] = {
        category: 'glitch',
        run: function(time, p) {
            var noiseAmount = p.noiseAmount || p.amp || 20;
            var speed = p.speed || p.freq || 15;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * speed);

            
            var nx = M.segRange(-noiseAmount, noiseAmount, segment, 0);
            var ny = M.segRange(-noiseAmount * 0.3, noiseAmount * 0.3, segment + 500, 0);

            
            if (M.segRandom(segment + 300, 0) > 0.9) {
                ny = M.segRange(-noiseAmount * 2, noiseAmount * 2, segment + 400, 0);
            }

            State.text.x = nx * CS;
            State.text.y = ny * CS;

            
            var opNoise = M.segRange(-noiseAmount * 0.01, 0, segment + 600, 0);
            State.text.opacity = Math.max(0.15, 1 + opNoise);

            
            if (M.segRandom(segment + 700, 0) > 0.95) {
                State.text.opacity = 0.2 + M.segRandom(segment + 800, 0) * 0.4;
            }
        }
    };

    
    
    

    F['frame stutter'] = {
        category: 'glitch',
        run: function(time, p) {
            var stutterRate = p.stutterRate || p.probability || 0.3;
            var holdFrames = p.holdFrames || 4;

            var elapsed = (time - State.startTime) / 1000;

            
            var fps = 24 / holdFrames;
            var quantized = Math.floor(elapsed * fps) / fps;
            var segment = Math.floor(quantized * fps);

            var shouldStutter = M.segRandom(segment, 0) < stutterRate;

            if (shouldStutter) {
                
                State.text.x = M.segRange(-15, 15, segment + 100, 0) * CS;
                State.text.y = M.segRange(-8, 8, segment + 200, 0) * CS;
                
                State.text.opacity = 0.7 + M.segRandom(segment + 300, 0) * 0.3;
            }
            
        }
    };

    
    
    

    F['distortion wave'] = {
        category: 'glitch',
        run: function(time, p) {
            var waveAmt = p.waveAmt || p.amp || 15;
            var speed = p.speed || p.freq || 3;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * speed * 3);

            
            var yPhase = Math.sin(elapsed * 0.7) * 3;
            var phase = Math.sin(yPhase + elapsed * speed);

            
            var sign = phase >= 0 ? 1 : -1;
            var blockPhase = sign * Math.ceil(Math.abs(phase) * 3) / 3;

            
            var spike = 1;
            if (M.segRandom(segment, 0) > 0.85) {
                spike = 1.5 + M.segRandom(segment + 50, 0) * 1.5;
            }

            var wave = blockPhase * waveAmt * spike;
            State.text.x = wave * CS;
        }
    };

    
    
    

    F['data corrupt'] = {
        category: 'glitch',
        run: function(time, p) {
            var corruptLevel = p.corruptLevel || p.amp || 30;
            var blockSize = p.blockSize || p.freq || 6;

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * blockSize);

            var r = M.segRandom(segment, 0);

            if (r > 0.75) {
                
                var glitch = M.segRange(-corruptLevel, corruptLevel, segment + 100, 0);

                
                State.text.x = glitch * CS;
                State.text.y = glitch * 0.3 * CS;

                
                
                var scaleGlitch = glitch * 0.01;
                State.text.scaleX = 1 + scaleGlitch;
                State.text.scaleY = 1 - scaleGlitch * 0.5;

                
                State.text.rotation = glitch * 0.5;

                
                if (r > 0.95) {
                    
                    State.text.opacity = 0;
                } else {
                    State.text.opacity = 0.5 + M.segRandom(segment + 200, 0) * 0.5;
                }
            }
            
        }
    };

})();
