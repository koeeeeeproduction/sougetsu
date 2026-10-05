













(function () {
    'use strict';

    var Config = PreviewEngine.Config;
    var State = PreviewEngine.State;
    var Utils = PreviewEngine.Utils;

    
    var _taFont = '';
    var _taFontSize = 0;
    function getTAFont() {
        if (_taFontSize !== Config.TEXT_SIZE) {
            _taFontSize = Config.TEXT_SIZE;
            _taFont = 'bold ' + Config.TEXT_SIZE + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        }
        return _taFont;
    }
    var PI2 = Math.PI * 2;
    var CS = 0.3; 

    
    
    

    
    
    function decayBounce(t, freq, decay) {
        return Math.cos(freq * t * PI2) / Math.exp(decay * t);
    }

    
    function easeIn(t, dur) {
        if (t <= 0) return 0;
        if (t >= dur) return 1;
        var p = t / dur;
        return p * p * (3 - 2 * p);
    }

    
    
    

    var CharState = {
        active: false,
        chars: [],
        charWidths: [],
        charPositions: [],
        totalWidth: 0,
        charCount: 0,
        animName: '',
        animParams: {},
        animatorProps: [],   
        basedOn: 1,          
        unitIndices: [],     
        unitCount: 1,        

        reset: function () {
            this.chars = [];
            this.charWidths = [];
            this.charPositions = [];
            this.totalWidth = 0;
            this.charCount = 0;
            this.unitIndices = [];
            this.unitCount = 1;
        }
    };

    
    
    

    function measureChars(ctx, text) {
        ctx.font = getTAFont();
        CharState.charWidths = [];
        CharState.charPositions = [];
        var x = 0;
        for (var i = 0; i < text.length; i++) {
            var w = ctx.measureText(text[i]).width;
            CharState.charWidths.push(w);
            CharState.charPositions.push(x + w / 2);
            x += w;
        }
        CharState.totalWidth = x;
        CharState.charCount = text.length;

        
        CharState.unitIndices = [];
        var basedOn = CharState.basedOn;
        if (basedOn === 3) {
            
            var wordIdx = 0;
            for (var i = 0; i < text.length; i++) {
                if (i > 0 && text[i - 1] === ' ') wordIdx++;
                CharState.unitIndices.push(wordIdx);
            }
            CharState.unitCount = wordIdx + 1;
        } else if (basedOn === 4) {
            
            for (var i = 0; i < text.length; i++) {
                CharState.unitIndices.push(0);
            }
            CharState.unitCount = 1;
        } else {
            
            for (var i = 0; i < text.length; i++) {
                CharState.unitIndices.push(i);
            }
            CharState.unitCount = text.length;
        }
    }

    
    
    
    
    
    
    
    
    
    
    
    

    function amountToVisual(amount, charIndex) {
        
        var absAmt = Math.abs(amount);
        


        var exitMode = !!CharState.exitMode;
        if (!exitMode && absAmt < 0.5) {
            return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blur: 0 };
        }

        var animProps = CharState.animatorProps;
        var params = CharState.animParams;
        var n = CharState.charCount;
        var pct = amount / 100;
        


        if (exitMode) pct = 1 - pct;

        var result = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blur: 0 };

        if (!animProps || animProps.length === 0) return result;

        for (var i = 0; i < animProps.length; i++) {
            var prop = animProps[i];

            switch (prop.type) {

                case 'position':
                    var px = prop.value[0];
                    var py = prop.value[1];
                    
                    if (prop.param && params[prop.param] !== undefined) {
                        var pv = params[prop.param] * (prop.paramSign || 1);
                        if (prop.axis === 'x') px = pv;
                        else if (prop.axis === 'y') py = pv;
                        else { px = pv; py = pv; }
                    }
                    result.x += px * pct * CS;
                    result.y += py * pct * CS;
                    break;

                case 'rotation':
                    var rotVal = prop.value;
                    if (prop.param && params[prop.param] !== undefined) {
                        rotVal = params[prop.param];
                    }
                    result.rotation += rotVal * pct;
                    break;

                case 'scale':
                    var sv = Array.isArray(prop.value) ? prop.value[0] : prop.value;
                    if (prop.param && params[prop.param] !== undefined) {
                        sv = params[prop.param];
                    }
                    
                    var scaleRatio = (100 + sv * pct) / 100;
                    if (scaleRatio < 0.01) scaleRatio = 0.01;
                    result.scale *= scaleRatio;
                    break;

                case 'opacity':
                    var opVal = (typeof prop.value === 'number') ? prop.value : 0;
                    
                    
                    var opActual = (100 + (opVal - 100) * pct) / 100;
                    if (opActual < 0) opActual = 0;
                    if (opActual > 1) opActual = 1;
                    result.opacity *= opActual;
                    break;

                case 'tracking':
                    var trackVal = (typeof prop.value === 'number') ? prop.value : 0;
                    if (prop.param && params[prop.param] !== undefined) {
                        trackVal = params[prop.param];
                    }
                    
                    var center = (n - 1) / 2;
                    var dist = charIndex - center;
                    result.x += trackVal * pct * dist * CS * 0.8;
                    break;

                




                case 'blur':
                    var bv = Array.isArray(prop.value)
                        ? Math.max(prop.value[0], prop.value[1] || 0)
                        : prop.value;
                    if (prop.param && params[prop.param] !== undefined) bv = params[prop.param];
                    result.blur += (typeof bv === 'number' ? bv : 0) * pct * CS;
                    break;

                case 'skew':
                    var skewVal = (typeof prop.value === 'number') ? prop.value : 0;
                    if (prop.param && params[prop.param] !== undefined) {
                        skewVal = params[prop.param];
                    }
                    
                    result.rotation += skewVal * pct * 0.4;
                    result.x += skewVal * pct * CS * 0.3;
                    break;
            }
        }

        
        if (!exitMode && absAmt < 1.5) {
            var blend = (absAmt - 0.5) / 1;
            result.x *= blend;
            result.y *= blend;
            result.rotation *= blend;
            result.scale = 1 + (result.scale - 1) * blend;
            result.opacity = 1 + (result.opacity - 1) * blend;
            result.blur *= blend;
        }

        return result;
    }

    
    
    
    
    
    
    
    
    
    
    

    
    
    
    
    function bounceAmount(t, i, n, p) {
        if (t <= 0) return 100;
        var decay = p.decay || 6;
        var envelope = 100 / Math.exp(decay * t);
        if (envelope < 0.1) return 0;
        var raw = decayBounce(t, p.freq || 2, decay) * 100;
        
        if (envelope < 2) {
            raw *= envelope / 2;
        }
        return raw;
    }

    






    function easeAmount(t, i, n, p) {
        if (t <= 0) return 100;
        var dur = p.duration || p._easeDur || 0.55;
        var x = t / dur;
        if (x >= 1) return 0;
        
        var eased = 1 - Math.pow(1 - x, 3);
        return (1 - eased) * 100;
    }

    var charAnims = {

        
        
        
        'bounce vertical': bounceAmount,
        'bounce horizontal': bounceAmount,
        'bounce rotation': bounceAmount,
        'bounce scale': bounceAmount,
        'bounce tracking': bounceAmount,
        'bounce skew': bounceAmount,
        'bounce diagonal': bounceAmount,
        'bounce spin': bounceAmount,
        'bounce full': bounceAmount,
        'bounce reverse': bounceAmount,  
        'bounce random': bounceAmount,  
        'bounce center out': bounceAmount,  

        
        
        'elastic': bounceAmount,

        
        
        'overshoot': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = 0.3;
            var ovr = (p.overshoot || 20) / 100;
            if (t < dur) {
                
                var prog = t / dur;
                return 100 * (1 - (1 + ovr) * prog);
            }
            
            var st = t - dur;
            var envOvr = 100 * ovr / Math.exp(8 * st);
            if (envOvr < 0.1) return 0;
            var rawOvr = -envOvr * Math.cos(3 * st * PI2);
            if (envOvr < 2) rawOvr *= envOvr / 2;
            return rawOvr;
        },



        
        
        
        'wave characters': function (t, i, n, p) {
            var h = p.waveHeight || 40;
            var speed = p.waveSpeed || p.freq || 2;
            var charDelay = p.delay || 0.1;
            var offset = i * charDelay;
            return Math.sin((t - offset) * speed * PI2) * h;
        },

        
        
        'spiral reveal': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.6;
            if (t >= dur) return 0;
            var prog = t / dur;
            var eased = prog * prog * (3 - 2 * prog);
            return (1 - eased) * 100;
        },

        
        
        'gravity drop': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.4;
            if (t < dur) {
                var prog = t / dur;
                return (1 - prog * prog) * 100;
            }
            
            var st = t - dur;
            var envG = 15 / Math.exp(8 * st);
            if (envG < 0.1) return 0;
            var rawG = envG * Math.cos(4 * st * PI2);
            if (envG < 2) rawG *= envG / 2;
            return rawG;
        },

        
        
        'magnetic attract': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.5;
            if (t >= dur) return 0;
            var prog = t / dur;
            var eased = 1 - Math.pow(1 - prog, 3);
            return (1 - eased) * 100;
        },

        
        
        'elastic stretch': bounceAmount,



        
        
        'swing in': function (t, i, n, p) {
            if (t <= 0) return 100;
            var decayVal = p.decay || 5;
            var envS = 100 / Math.exp(decayVal * t);
            if (envS < 0.1) return 0;
            var rawS = decayBounce(t, 1.5, decayVal) * 100;
            if (envS < 2) rawS *= envS / 2;
            return rawS;
        },

        
        
        'roll in': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.5;
            if (t >= dur) return 0;
            var prog = t / dur;
            var curve = 1 - Math.pow(1 - prog, 3);
            return (1 - curve) * 100;
        },

        
        'apple style text': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.5;
            if (t >= dur) return 0;
            var prog = t / dur;
            var eased = 1 - Math.pow(1 - prog, 3);
            return (1 - eased) * 100;
        },

        
        'word by word scale': bounceAmount,

        
        'flicker reveal': function (t, i, n, p) {
            if (t <= 0) return 100;
            var dur = p.duration || 0.6;
            if (t >= dur) return 0;
            
            var seed = Math.sin(i * 12.9898 + Math.floor(t * 15) * 78.233) * 43758.5453;
            var randomVal = (seed - Math.floor(seed)) * 100;
            return randomVal;
        },

        
        'slide & elastic': function (t, i, n, p) {
            if (t <= 0) return 100;
            var decay = p.decay || 5;
            var freq = p.freq || 2.5;
            var env = Math.exp(-decay * t);
            if (env < 0.001) return 0;
            return 100 * env * Math.cos(t * freq * PI2);
        },

        
        'bouncy drop': function (t, i, n, p) {
            if (t <= 0) return 100;
            var d = p.gravity || 6.0;
            var env = Math.exp(-d * t);
            if (env < 0.001) return 0;
            return 100 * Math.abs(Math.cos(t * 3 * Math.PI)) * env;
        }
    };

    
    
    
    

    function getCharDelay(i, n, name, baseDelay, params) {
        if (name === 'bounce reverse') {
            
            return (n - 1 - i) * baseDelay;
        }
        if (name === 'bounce center out') {
            
            var center = (n - 1) / 2;
            return Math.abs(i - center) * baseDelay;
        }
        if (name === 'bounce random') {
            
            var maxD = (params && params.maxDelay) ? params.maxDelay : (baseDelay * n);
            return Utils.seededRandom(i * 137 + State.randomSeed) * maxD;
        }
        if (name === 'wave characters') {
            
            return 0;
        }
        
        return i * baseDelay;
    }

    
    
    

    function animateChars(time) {
        var name = CharState.animName;
        var animFn = charAnims[name];
        if (!animFn) {
            

            animFn = CharState.animParams && CharState.animParams._ease
                ? easeAmount : bounceAmount;
        }

        var elapsed = (time - State.startTime) / 1000;
        var params = CharState.animParams;
        var baseDelay = params.delay || params._charDelay || 0.04;
        var n = CharState.unitCount; 

        
        var isContinuous = (name === 'wave characters');

        
        var maxStagger = 0;
        for (var k = 0; k < n; k++) {
            var d = getCharDelay(k, n, name, baseDelay, params);
            if (d > maxStagger) maxStagger = d;
        }
        var animDur = 2.0;
        var holdDur = 1.2;
        var totalCycle = maxStagger + animDur + holdDur;

        var cycleElapsed = isContinuous ? elapsed : (elapsed % totalCycle);

        while (CharState.chars.length < CharState.charCount) {
            CharState.chars.push({ x: 0, y: 0, scale: 1, rotation: 0, opacity: 0 });
        }

        
        var unitAmounts = [];
        for (var u = 0; u < n; u++) {
            var unitDelay = getCharDelay(u, n, name, baseDelay, params);
            var unitT = isContinuous ? elapsed : (cycleElapsed - unitDelay);
            var amount = animFn(unitT, u, n, params);
            if (isNaN(amount)) amount = 0;
            unitAmounts.push(amount);
        }

        for (var i = 0; i < CharState.charCount; i++) {
            var unitIdx = (CharState.unitIndices[i] !== undefined) ? CharState.unitIndices[i] : i;
            var amt = unitAmounts[unitIdx] !== undefined ? unitAmounts[unitIdx] : 0;
            CharState.chars[i] = amountToVisual(amt, unitIdx);
        }
    }

    
    
    

    function renderChars() {
        var ctx = State.ctx;
        var displayText = Config.USER_TEXT || Config.TEXT;
        var centerX = Config.WIDTH / 2;
        var centerY = Config.HEIGHT * 0.42;

        
        if (CharState.charCount !== displayText.length || CharState.charCount === 0) {
            measureChars(ctx, displayText);
        }

        var halfWidth = CharState.totalWidth / 2;

        ctx.font = getTAFont();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        var charBaselineOffset = Config.TEXT_SIZE * 0.35;

        for (var i = 0; i < displayText.length; i++) {
            var ch = CharState.chars[i];
            if (!ch || ch.opacity <= 0.01) continue;

            var charX = CharState.charPositions[i] - halfWidth;

            ctx.save();
            
            var tx = centerX + charX + ch.x;
            var ty = centerY + ch.y + charBaselineOffset;
            ctx.translate(tx, ty);
            ctx.rotate(ch.rotation * Math.PI / 180);
            ctx.scale(ch.scale, ch.scale);
            
            var finalAlpha = ch.opacity > 0.97 ? 1 : Math.max(0, ch.opacity);
            ctx.globalAlpha = finalAlpha;
            

            if (ch.blur > 0.15) ctx.filter = 'blur(' + ch.blur.toFixed(2) + 'px)';

            
            ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
            ctx.shadowBlur = 4 * finalAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(displayText[i], 0, 0);
            ctx.shadowBlur = 0;
            if (ch.blur > 0.15) ctx.filter = 'none';

            ctx.restore();
        }
    }

    
    
    

    PreviewEngine.TextAnimator = {

        start: function (formulaType, params) {
            CharState.active = true;
            CharState.animName = (params._taName || '').toLowerCase();
            CharState.animParams = params || {};
            CharState.animatorProps = params._animatorProps || [];
            CharState.exitMode = !!params._exit;
            CharState.basedOn = params._basedOn || 1;
            CharState.reset();

            
            if (State.ctx) {
                var text = Config.USER_TEXT || Config.TEXT;
                measureChars(State.ctx, text);
                
                for (var i = 0; i < CharState.charCount; i++) {
                    CharState.chars.push(amountToVisual(100, i));
                }
            }
        },

        stop: function () {
            CharState.active = false;
            CharState.reset();
        },

        isActive: function () {
            return CharState.active;
        },

        animate: function (time) {
            if (!CharState.active) return;
            animateChars(time);
        },

        render: function () {
            if (!CharState.active) return;
            renderChars();
        },

        updateParams: function (params) {
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    CharState.animParams[key] = params[key];
                }
            }
            
            if (params._taName) {
                CharState.animName = params._taName.toLowerCase();
            }
            
            if (params._animatorProps) {
                CharState.animatorProps = params._animatorProps;
                if (params._exit !== undefined) CharState.exitMode = !!params._exit;
            }
        },

        
        setBasedOn: function (basedOn) {
            CharState.basedOn = basedOn || 1;
            if (State.ctx && (Config.USER_TEXT || Config.TEXT)) {
                measureChars(State.ctx, Config.USER_TEXT || Config.TEXT);
            }
        },

        
        getAnimNames: function () {
            var names = [];
            for (var key in charAnims) {
                if (charAnims.hasOwnProperty(key)) names.push(key);
            }
            return names;
        }
    };

})();
