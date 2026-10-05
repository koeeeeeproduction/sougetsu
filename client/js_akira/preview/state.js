




(function() {
    'use strict';

    PreviewEngine.State = {
        
        canvas: null,
        ctx: null,

        
        animationId: null,
        isRunning: false,
        startTime: 0,
        lastFrameTime: 0,

        
        currentType: null,
        currentParams: {},

        
        randomSeed: 0,

        
        _frameRendered: false,

        
        text: {
            x: 0,
            y: 0,
            scale: 1,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            skewX: 0,
            letterSpacing: 0,
            visibleChars: -1,

            
            rgbSplit: 0,
            hue: -1,
            saturation: -1,
            glowIntensity: 1,

            
            isCounter: false,
            counterValue: null,
            counterSymbol: '',

            
            isPercentage: false,
            percentageValue: null,

            
            isCountdown: false,
            countdownValue: null,

            
            isTime: false,
            timeValue: null,

            
            scramble: false,

            
            isScramble: false,
            scrambledText: null,

            
            customText: null,
            customStyle: null,

            
            customRender: null
        },

        
        resetText: function() {
            this.text.x = 0;
            this.text.y = 0;
            this.text.scale = 1;
            this.text.scaleX = 1;
            this.text.scaleY = 1;
            this.text.rotation = 0;
            this.text.opacity = 1;
            this.text.skewX = 0;
            this.text.letterSpacing = 0;
            this.text.visibleChars = -1;
            this.text.rgbSplit = 0;
            this.text.hue = -1;
            this.text.saturation = -1;
            this.text.glowIntensity = 1;
            this.text.isCounter = false;
            this.text.counterValue = null;
            this.text.counterSymbol = '';
            this.text.isPercentage = false;
            this.text.percentageValue = null;
            this.text.isCountdown = false;
            this.text.countdownValue = null;
            this.text.isTime = false;
            this.text.timeValue = null;
            this.text.scramble = false;
            this.text.isScramble = false;
            this.text.scrambledText = null;
            this.text.customText = null;
            this.text.customStyle = null;
            this.text.customRender = null;
        },

        
        trail: new Array(35),
        trailEnabled: false,
        TRAIL_LENGTH: 35,
        _trailHead: 0,
        _trailCount: 0,

        
        reset: function() {
            this.animationId = null;
            this.isRunning = false;
            this.startTime = 0;
            this.lastFrameTime = 0;
            this.currentType = null;
            this.currentParams = {};
            this.randomSeed = Math.random() * 10000;
            this.resetText();
        }
    };

})();
