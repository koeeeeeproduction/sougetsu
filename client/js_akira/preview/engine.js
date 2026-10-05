




(function() {
    'use strict';

    var Config = PreviewEngine.Config;
    var State = PreviewEngine.State;
    var Formulas = PreviewEngine.Formulas;
    var Render = PreviewEngine.Render;

    
    
    

    function animate(time) {
        if (!State.isRunning) return;

        
        if (State._frameRendered) {
            State._frameRendered = false;
            State.animationId = requestAnimationFrame(animate);
            return;
        }

        
        var elapsed = time - State.lastFrameTime;
        if (elapsed < 1000 / Config.FPS) {
            State.animationId = requestAnimationFrame(animate);
            return;
        }
        State.lastFrameTime = time;

        
        var adjustedTime = State.startTime + (time - State.startTime) * (Config.SPEED || 1);

        
        if (PreviewEngine.TextAnimator && PreviewEngine.TextAnimator.isActive()) {
            
            State.resetText();
            PreviewEngine.TextAnimator.animate(adjustedTime);
            Render.renderTextAnimator();
        } else {
            
            State.resetText();

            
            if (State.currentType && Formulas[State.currentType]) {
                var formula = Formulas[State.currentType];
                if (typeof formula === 'function') {
                    formula(adjustedTime, State.currentParams);
                } else if (formula.run) {
                    formula.run(adjustedTime, State.currentParams);
                }
            }

            
            Render.render();
        }

        
        State.animationId = requestAnimationFrame(animate);
    }

    
    
    

    function resizeCanvas() {
        if (State.canvas && State.canvas.parentElement) {
            var rect = State.canvas.parentElement.getBoundingClientRect();
            if (rect.width > 0) {
                var isFloating = State.canvas.id === 'livePreviewCanvas' && State.canvas.parentElement.id === 'floating-preview-stage';
                if (isFloating) {
                    
                    
                    Config.WIDTH = 400;
                    Config.HEIGHT = 250;
                } else {
                    Config.WIDTH = Math.round(rect.width);
                    Config.HEIGHT = rect.height > 0 ? Math.round(rect.height) : 300;
                }
                State.canvas.width = Config.WIDTH;
                State.canvas.height = Config.HEIGHT;
                
                if (Render._bgCacheWidth) {
                    Render._bgCacheWidth = 0;
                }
            }
        }
    }

    
    
    

    PreviewEngine.API = {

        


        init: function(canvasElement) {
            State.canvas = canvasElement;
            State.ctx = canvasElement.getContext('2d');

            
            var container = canvasElement.parentElement;
            if (container) {
                var isFloating = canvasElement.id === 'livePreviewCanvas' && container.id === 'floating-preview-stage';
                if (isFloating) {
                    Config.WIDTH = 400;
                    Config.HEIGHT = 250;
                } else {
                    var rect = container.getBoundingClientRect();
                    Config.WIDTH = Math.max(Math.round(rect.width), 300);
                    Config.HEIGHT = rect.height > 0 ? Math.round(rect.height) : 300;
                }
            }

            canvasElement.width = Config.WIDTH;
            canvasElement.height = Config.HEIGHT;

            
            Render.drawInitial();

            return this;
        },

        


        play: function(type, params) {
            State.currentType = type;
            State.currentParams = params || {};

            
            resizeCanvas();

            
            State.resetText();
            State.startTime = performance.now();
            State.randomSeed = Math.random() * 10000;

            
            if (PreviewEngine.TextAnimator) {
                if (params && params._perChar) {
                    PreviewEngine.TextAnimator.start(type, params);
                } else {
                    PreviewEngine.TextAnimator.stop();
                }
            }

            
            if (!State.isRunning) {
                State.isRunning = true;
                State.lastFrameTime = performance.now();
                State.animationId = requestAnimationFrame(animate);
            }

            return this;
        },

        


        update: function(params) {
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    State.currentParams[key] = params[key];
                }
            }
            if (PreviewEngine.TextAnimator && PreviewEngine.TextAnimator.isActive()) {
                PreviewEngine.TextAnimator.updateParams(params);
            }
            return this;
        },

        


        stop: function() {
            State.isRunning = false;
            if (State.animationId) {
                cancelAnimationFrame(State.animationId);
                State.animationId = null;
            }
            return this;
        },

        


        pause: function() {
            State.isRunning = false;
            if (State.animationId) {
                cancelAnimationFrame(State.animationId);
                State.animationId = null;
            }
            return this;
        },

        


        resume: function() {
            if (!State.isRunning && State.currentType) {
                State.isRunning = true;
                State.lastFrameTime = performance.now();
                State.animationId = requestAnimationFrame(animate);
            }
            return this;
        },

        


        getTypes: function() {
            var types = [];
            for (var key in Formulas) {
                if (Formulas.hasOwnProperty(key)) {
                    types.push(key);
                }
            }
            return types;
        },

        


        getFormulaInfo: function(type) {
            var formula = Formulas[type];
            if (!formula) return null;

            return {
                name: formula.name || type,
                category: formula.category || 'unknown',
                params: formula.params || {}
            };
        },

        


        isPlaying: function() {
            return State.isRunning;
        },

        


        setConfig: function(options) {
            for (var key in options) {
                if (Config.hasOwnProperty(key)) {
                    Config[key] = options[key];
                }
            }
            if (State.canvas) {
                State.canvas.width = Config.WIDTH;
                State.canvas.height = Config.HEIGHT;
            }
            return this;
        },

        


        resize: function() {
            resizeCanvas();
            return this;
        }
    };

    
    PreviewEngine.API.Easing = PreviewEngine.Easing;

})();






var LivePreviewEngine = {
    init: function(canvas) { return PreviewEngine.API.init(canvas); },
    play: function(type, params) { return PreviewEngine.API.play(type, params); },
    update: function(params) { return PreviewEngine.API.update(params); },
    stop: function() { return PreviewEngine.API.stop(); },
    pause: function() { return PreviewEngine.API.pause(); },
    resume: function() { return PreviewEngine.API.resume(); },
    getTypes: function() { return PreviewEngine.API.getTypes(); },
    isPlaying: function() { return PreviewEngine.API.isPlaying(); },
    setConfig: function(options) { return PreviewEngine.API.setConfig(options); },
    resize: function() { return PreviewEngine.API.resize(); },
    Easing: PreviewEngine.Easing,
    version: PreviewEngine.version
};


if (typeof window !== 'undefined') {
    window.LivePreviewEngine = LivePreviewEngine;
    window.PreviewEngine = PreviewEngine;
}
