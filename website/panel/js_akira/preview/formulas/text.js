





(function () {
    'use strict';

    var State = PreviewEngine.State;
    var Config = PreviewEngine.Config;
    var Easing = PreviewEngine.Easing;
    var Utils = PreviewEngine.Utils;
    var M = PreviewEngine.FormulaMath;
    var F = PreviewEngine.Formulas;
    var CS = M.CS;

    
    function formatNumber(num, decimals) {
        var numVal = decimals > 0 ? num.toFixed(decimals) : Math.floor(num).toString();
        var parts = numVal.split('.');
        var intPart = parts[0];
        var formatted = '';
        for (var i = intPart.length - 1, c = 0; i >= 0; i--, c++) {
            if (c > 0 && c % 3 === 0) formatted = ',' + formatted;
            formatted = intPart[i] + formatted;
        }
        if (parts[1]) formatted += '.' + parts[1];
        return formatted;
    }

    
    

    F['typewriter'] = {
        category: 'text',
        run: function (time, p) {
            var charsPerSec = p.charsPerSec || p.speed || 10;
            var text = Config.USER_TEXT || Config.TEXT;

            var duration = text.length / charsPerSec + 1.5;
            var elapsed = ((time - State.startTime) / 1000) % duration;

            var count = Math.min(Math.floor(elapsed * charsPerSec), text.length);
            State.text.customText = text.substring(0, count);
        }
    };

    
    

    F['number counter'] = {
        category: 'text',
        run: function (time, p) {
            var startVal = p.startVal || 0;
            var endVal = p.endVal || 1000;
            var duration = p.duration || p.dur || 3;

            var cycleDuration = duration + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;
            
            var t = Math.min(elapsed / duration, 1);
            var currentVal = Math.floor(startVal + (endVal - startVal) * t);

            State.text.counterValue = Math.floor(currentVal).toString();
            State.text.isCounter = true;
        }
    };

    
    

    F['percentage counter'] = {
        category: 'text',
        run: function (time, p) {
            var endVal = p.endVal || 100;
            var duration = p.duration || p.dur || 2;

            var cycleDuration = duration + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;
            
            var t = Math.min(elapsed / duration, 1);

            State.text.percentageValue = Math.floor(endVal * t);
            State.text.isPercentage = true;
        }
    };

    
    

    F['countdown timer'] = {
        category: 'text',
        run: function (time, p) {
            var startVal = p.startVal || p.totalSec || 60;

            var elapsed = (time - State.startTime) / 1000;
            var remaining = Math.max(0, startVal - elapsed);

            if (elapsed > startVal + 1.5) {
                State.startTime = time;
            }

            
            var min = Math.floor(remaining / 60);
            var sec = Math.floor(remaining % 60);
            State.text.countdownValue = (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec;
            State.text.isCountdown = true;
        }
    };

    
    

    F['time display'] = {
        category: 'text',
        run: function (time, p) {
            var speed = p.speed || p.freq || 1;
            var elapsed = (time - State.startTime) / 1000 * speed;
            var fps = 30;

            var totalFrames = Math.floor(elapsed * fps);
            var ff = totalFrames % fps;
            var totalSec = Math.floor(totalFrames / fps);
            var ss = totalSec % 60;
            var mm = Math.floor(totalSec / 60) % 60;
            var hh = Math.floor(totalSec / 3600);

            var tc = (hh < 10 ? '0' : '') + hh + ':' +
                (mm < 10 ? '0' : '') + mm + ':' +
                (ss < 10 ? '0' : '') + ss + ':' +
                (ff < 10 ? '0' : '') + ff;

            State.text.customText = tc;
        }
    };

    
    

    F['random reveal'] = {
        category: 'text',
        run: function (time, p) {
            var revealSpeed = p.revealSpeed || p.duration || 0.3;
            var charDelay = p.charDelay || 0.05;
            var text = Config.USER_TEXT || Config.TEXT;
            var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';

            var elapsed = (time - State.startTime) / 1000;
            var totalDuration = text.length * charDelay + revealSpeed + 1.5;
            elapsed = elapsed % totalDuration;

            
            
            
            
            var result = '';
            for (var i = 0; i < text.length; i++) {
                var charStart = i * charDelay;
                if (elapsed > charStart + revealSpeed) {
                    result += text[i];
                } else if (elapsed > charStart) {
                    var seed = i + Math.floor(elapsed * 30) + State.randomSeed;
                    result += chars[Math.floor(Utils.seededRandom(seed) * chars.length)];
                } else {
                    result += ' ';
                }
            }

            State.text.customText = result;
        }
    };

    
    

    F['typewriter + cursor'] = {
        category: 'text',
        run: function (time, p) {
            var charsPerSec = p.charsPerSec || p.speed || 10;
            var text = Config.USER_TEXT || Config.TEXT;

            var duration = text.length / charsPerSec + 2;
            var elapsed = ((time - State.startTime) / 1000) % duration;

            var visibleCount = Math.min(Math.floor(elapsed * charsPerSec), text.length);
            var shown = text.substring(0, visibleCount);

            
            var cursorVisible = Math.sin(elapsed * (p.blinkSpeed || 4) * Math.PI) > 0;
            State.text.customText = shown + (cursorVisible ? '|' : ' ');
        }
    };

    
    

    F['word by word'] = {
        category: 'text',
        run: function (time, p) {
            var wordsPerSec = p.wordsPerSec || p.charsPerSec || p.speed || 2;
            var words = (Config.USER_TEXT || Config.TEXT).split(/\s+/);
            if (words.length < 2) words = ['SOUGETSU', 'AKIRA', 'TEXT', 'PREVIEW'];

            var typingDur = words.length / wordsPerSec;
            var pause = Math.max(0.8, typingDur * 0.5);
            var duration = typingDur + pause;
            var elapsed = ((time - State.startTime) / 1000) % duration;

            var visibleCount = Math.min(Math.floor(elapsed * wordsPerSec), words.length);

            State.text.customText = words.slice(0, visibleCount).join(' ') || ' ';
        }
    };

    
    

    F['text cycle'] = {
        category: 'text',
        run: function (time, p) {
            var duration = p.duration || 1;
            var raw = Config.USER_TEXT || Config.TEXT;
            
            var words = raw.split(',');
            if (words.length < 2) words = raw.split(/\s+/);
            for (var w = 0; w < words.length; w++) words[w] = words[w].replace(/^\s+|\s+$/g, '');
            if (words.length < 2) words = ['SOUGETSU', 'AKIRA', 'PREVIEW', 'DEMO'];

            var elapsed = (time - State.startTime) / 1000;
            var idx = Math.floor(elapsed / duration) % words.length;

            State.text.customText = words[idx];
        }
    };

    
    

    F['currency counter'] = {
        category: 'text',
        run: function (time, p) {
            var endVal = p.endVal || 10000;
            var duration = p.duration || p.dur || 2;

            var pf = p.prefix || 1;
            var symbol = pf == 1 ? '$' : (pf == 2 ? '€' : '£');

            var cycleDuration = duration + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;
            
            var t = Math.min(elapsed / duration, 1);
            var currentVal = Math.floor(endVal * t);
            
            if (currentVal > endVal) currentVal = endVal;

            State.text.counterValue = formatNumber(currentVal, 0);
            State.text.counterSymbol = symbol;
            State.text.isCounter = true;
        }
    };

    
    

    F['bounce counter'] = {
        category: 'text',
        run: function (time, p) {
            var endVal = p.endVal || 100;
            var dur = p.duration || p.dur || 2;

            var cycleDuration = dur + 2;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;

            var val;
            if (elapsed < dur) {
                val = endVal * elapsed / dur;
            } else {
                var bounceT = elapsed - dur;
                var bounce = Math.cos(3 * bounceT * M.PI2) * endVal * 0.2 / Math.exp(5 * bounceT);
                val = endVal + bounce;
            }

            State.text.counterValue = Math.floor(Math.max(0, val)).toString();
            State.text.isCounter = true;
        }
    };

    
    

    F['date display'] = {
        category: 'text',
        run: function (time, p) {
            var format = p.format || 1;
            var d = new Date();
            if (p.year && p.year > 0) d.setFullYear(p.year);
            if (p.month && p.month > 0) d.setMonth(p.month - 1);
            if (p.day && p.day > 0) d.setDate(p.day);

            if (format == 2) {
                
                var dd = d.getDate();
                var mm = d.getMonth() + 1;
                State.text.customText = (dd < 10 ? '0' : '') + dd + '/' + (mm < 10 ? '0' : '') + mm + '/' + d.getFullYear();
            } else {
                
                var months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
                State.text.customText = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
            }
        }
    };

    
    

    F['stopwatch'] = {
        category: 'text',
        run: function (time, p) {
            var stopAt = p.stopAt || 10;
            var dur = p.dur || p.duration || 3;

            var totalElapsed = (time - State.startTime) / 1000;
            
            var cycleDuration = dur + 2;
            var elapsed = totalElapsed % cycleDuration;

            var progress = Math.min(elapsed / dur, 1);
            
            var eased = 1 - Math.pow(1 - progress, 3);
            var displayTime = stopAt * eased;

            var min = Math.floor(displayTime / 60);
            var sec = Math.floor(displayTime % 60);
            var ms = Math.floor((displayTime % 1) * 100);

            State.text.customText = (min < 10 ? '0' : '') + min + ':' +
                (sec < 10 ? '0' : '') + sec + '.' +
                (ms < 10 ? '0' : '') + ms;
        }
    };

    
    

    F['blinking text'] = {
        category: 'text',
        run: function (time, p) {
            var speed = p.speed || p.freq || 4;
            var elapsed = (time - State.startTime) / 1000;

            State.text.opacity = Math.sin(elapsed * speed * Math.PI) > 0 ? 1 : 0;
        }
    };

    
    

    F['digital noise'] = {
        category: 'text',
        run: function (time, p) {
            
            var rawInt = p.intensity || p.amp || 2;
            var intensity = rawInt * 0.1;
            var speed = p.speed || p.freq || 10;
            var text = Config.USER_TEXT || Config.TEXT;
            var glitchChars = '@#$%&*!?<>|/\\';

            var elapsed = (time - State.startTime) / 1000;
            var segment = Math.floor(elapsed * speed);

            var result = '';
            for (var i = 0; i < text.length; i++) {
                var rand = Utils.seededRandom(segment * 100 + i + State.randomSeed);
                if (rand < intensity) {
                    var charIdx = Math.floor(Utils.seededRandom(segment * 100 + i + 50 + State.randomSeed) * glitchChars.length);
                    result += glitchChars[charIdx];
                } else {
                    result += text[i];
                }
            }

            State.text.customText = result;
            State.text.x = Utils.randomRange(-2, 2, segment + State.randomSeed) * intensity * 5 * CS;
        }
    };

    
    

    F['ellipsis loader'] = {
        category: 'text',
        run: function (time, p) {
            var speed = p.speed || p.freq || 2;
            var elapsed = (time - State.startTime) / 1000;
            var dots = Math.floor(elapsed * speed) % 4;

            var dotStr = '';
            for (var i = 0; i < dots; i++) dotStr += '.';

            State.text.customText = (Config.USER_TEXT || Config.TEXT) + dotStr;
        }
    };

    
    

    F['decimal counter'] = {
        category: 'text',
        run: function (time, p) {
            var endVal = p.endVal || 100;
            var duration = p.duration || p.dur || 2;
            var decimals = p.decimals || 2;

            var cycleDuration = duration + 1;
            var elapsed = ((time - State.startTime) / 1000) % cycleDuration;
            
            var t = Math.min(elapsed / duration, 1);
            var currentVal = endVal * t;

            State.text.counterValue = currentVal.toFixed(decimals);
            State.text.isCounter = true;
        }
    };

    
    

    F['simple countdown'] = {
        category: 'text',
        run: function (time, p) {
            var startVal = p.startVal || p.totalSec || 10;

            var elapsed = (time - State.startTime) / 1000;
            var remaining = Math.max(0, startVal - elapsed);

            if (elapsed > startVal + 1.5) {
                State.startTime = time;
            }

            State.text.countdownValue = Math.ceil(remaining);
            State.text.isCountdown = true;
        }
    };

    
    

    F['slot machine'] = {
        category: 'text',
        run: function (time, p) {
            var charDelay = p.charDelay || 0.1;
            var spinDur = p.spinDur || 0.6;
            var text = Config.USER_TEXT || Config.TEXT;
            var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

            var elapsed = (time - State.startTime) / 1000;
            var totalDuration = text.length * charDelay + spinDur + 1.5;
            elapsed = elapsed % totalDuration;

            var result = '';
            for (var i = 0; i < text.length; i++) {
                
                if (text[i] === ' ') { result += ' '; continue; }

                var charStart = i * charDelay;
                var charElapsed = elapsed - charStart;

                if (charElapsed >= spinDur) {
                    
                    result += text[i];
                } else if (charElapsed > 0) {
                    
                    var spinSpeed = 15 * (1 - charElapsed / spinDur);
                    var seed = i + Math.floor(elapsed * Math.max(spinSpeed, 2)) + State.randomSeed;
                    result += chars[Math.floor(Utils.seededRandom(seed) * chars.length)];
                } else {
                    
                    result += ' ';
                }
            }

            State.text.customText = result;
        }
    };

    
    

    F['decode'] = {
        category: 'text',
        run: function (time, p) {
            var charDelay = p.charDelay || 0.04;
            var decodeDur = p.decodeDur || 0.3;
            var text = Config.USER_TEXT || Config.TEXT;
            var chars = '-=+*#@!?:;'; 

            var elapsed = (time - State.startTime) / 1000;
            var startDelay = 0.3; 
            var totalDuration = startDelay + text.length * charDelay + decodeDur + 1;
            elapsed = elapsed % totalDuration;

            var result = '';
            for (var i = 0; i < text.length; i++) {
                var charStart = startDelay + charDelay * i;
                var charEnd = charStart + decodeDur;

                if (text[i] === ' ') {
                    result += ' ';
                } else if (elapsed >= charEnd) {
                    result += text[i];
                } else if (elapsed >= charStart) {
                    var seed = i + Math.floor(elapsed * 25) + State.randomSeed;
                    result += chars[Math.floor(Utils.seededRandom(seed) * chars.length)];
                } else {
                    result += chars[i % chars.length]; 
                }
            }

            State.text.scrambledText = result;
            State.text.isScramble = true;
        }
    };

})();
