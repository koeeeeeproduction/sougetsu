/* Sougetsu Akira FX - Focus Timer with original mascots.
 * Self-contained: a pure Core (testable, injectable clock/storage) + a small DOM layer that adds a floating button and a card.
 * All characters and lines are original to this product. */
(function (root) {
    'use strict';

    // ------------------------------------------------------------------ content
    var MASCOTS = {
        bolt:  { name: 'Bolt',         tag: 'Grumpy robot cat',      color: '#ffb020' },
        mochi: { name: 'Mochi',        tag: 'Sleepy dumpling ghost', color: '#ff9ec4' },
        kei:   { name: 'Kei',          tag: 'Living keyframe',       color: '#ffd23f' },
        null_: { name: 'Captain Null', tag: 'Hero of the timeline',  color: '#4dd2ff' }
    };
    var ORDER = ['bolt', 'mochi', 'kei', 'null_'];

    var LINES = {
        bolt: {
            start: ["Timer started. I'll pretend I'm not impressed.", "Focus mode on. Hairball protocol suspended.", "Go. I'll watch the clock and judge silently.", "Booting productivity.exe. Purring optional."],
            resume: ["Back already? The clock hasn't even cooled down.", "Resuming. I knew you'd come back."],
            pause: ["Paused. Stretch. Drink water. Not the keyboard.", "Break time? Fine. I'll nap on the render queue."],
            reset: ["Reset? Bold. Let's go again.", "Fresh start. The clock forgives; I do not forget.", "Rewinding. Even Ctrl+Z gets tired of you.", "Timer reset. Plot twist: you're still capable."],
            halfway: ["Halfway. Don't look at your phone. I'm watching.", "50% done. That's not nothing. That's literally half."],
            complete: ["Done! Treat yourself. I accept tuna as payment.", "Session complete. Beep boop, you did the thing.", "Time! Save your project. Then save your eyes."],
            breakDone: ["Break over. Back to work, human.", "Recharged? Good. The timeline misses you."],
            idle: ["Did you save? Asking for a friend. The friend is me.", "Fun fact: crashes love unsaved projects.", "Hydrate. Robots can't, so you do it for both of us.", "Your timeline won't animate itself. Sadly."]
        },
        mochi: {
            start: ["Okay... gentle focus time. I'll float quietly nearby.", "Start slow, finish soft. Let's begin~", "Focus mode. I'll hold the cozy for you."],
            resume: ["Welcome back. No rush.", "Resuming. Deep breath in... go."],
            pause: ["Paused. A tiny rest is still progress.", "Shh... resting for a moment."],
            reset: ["Reset! New session, new chance. I believe in you.", "Starting over is just a soft restart.", "Clean slate. Like fresh whipped cream."],
            halfway: ["Halfway there. You're doing lovely.", "Half done! I'm so proud I could melt."],
            complete: ["Yay... session done. Go stretch your arms.", "You did it! Snack time? I vote yes."],
            breakDone: ["Break's over... one more gentle round?", "Rested? Great. Let's float back in."],
            idle: ["Your shoulders are tense. Drop them. There.", "Remember to blink. Eyes need hugs too.", "Zzz... oh! I was just resting my eyes."]
        },
        kei: {
            start: ["Keyframe set! Time starts... now.", "Ease in. Focus. Ease out. Repeat.", "Playhead is moving. So are we!"],
            resume: ["Back on the timeline!", "Resuming playback at full speed."],
            pause: ["Hold keyframe! Pausing the motion.", "Paused. I'm in a linear mood: calm and straight."],
            reset: ["Reset! Back to frame zero, with style.", "New keyframe, new timing. Ease in, ease out!", "Reset? That's just a loop with confidence."],
            halfway: ["Midpoint keyframe reached. Smooth curve!", "50%! Right in the sweet spot of the curve."],
            complete: ["Final keyframe! Export that focus.", "Session rendered. Zero dropped frames!"],
            breakDone: ["Break's over. Playhead, go go go!", "Break ended. Time to animate!"],
            idle: ["Pro tip: easy ease makes everything feel expensive.", "Tidy layers today, calm brain tomorrow.", "Name your layers! Future you says thanks.", "Fewer keyframes, better motion. Trust me, I'm one."]
        },
        null_: {
            start: ["Mission begins! Null and void? Never.", "Suit up. This session belongs to us.", "The timeline needs a hero. That's you."],
            resume: ["The hero returns!", "Back in action. Cape ready."],
            pause: ["Tactical pause. Even heroes refuel.", "Pausing the mission. Stretch, hero."],
            reset: ["Reset! Every hero gets a second take.", "Plot twist: round two is better.", "Mission restart. Same cape, bigger energy."],
            halfway: ["Halfway through the mission! Hold the line.", "Half done. Deadlines tremble."],
            complete: ["Victory! The timeline is safe.", "Mission accomplished. Cape wave authorized."],
            breakDone: ["Break over. Heroes assemble... just you.", "Recharged. To the timeline!"],
            idle: ["A hero always saves the project first.", "A parent layer never abandons its children.", "Null reporting for duty. Parent your layers, citizens."]
        }
    };

    var MODES = { focus: { label: 'Focus', minutes: 25 }, short: { label: 'Short break', minutes: 5 }, long: { label: 'Long break', minutes: 15 } };

    // ------------------------------------------------------------------ core
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function formatTime(ms) {
        var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60);
        return pad2(m) + ':' + pad2(s % 60);
    }
    function dayKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

    function Core(opts) {
        opts = opts || {};
        this.now = opts.now || function () { return new Date().getTime(); };
        this.rng = opts.rng || Math.random;
        this.store = opts.store || { get: function () { return null; }, set: function () { } };
        this.handlers = {};
        this.lastLine = {};
        this.mascot = this.store.get('akira_timer_mascot');
        if (!MASCOTS[this.mascot]) { this.mascot = 'bolt'; }
        this.mode = 'focus';
        this.durationMs = MODES.focus.minutes * 60000;
        this.remainingMs = this.durationMs;
        this.running = false;
        this.endAt = null;
        this.halfSaid = false;
        this.cycle = 0;                       // focus sessions finished in the current set of four
        this.stats = this._loadStats();
        this._restore();
    }
    Core.prototype.on = function (name, fn) { (this.handlers[name] = this.handlers[name] || []).push(fn); };
    Core.prototype._emit = function (name, data) {
        var h = this.handlers[name] || [], i;
        for (i = 0; i < h.length; i += 1) { try { h[i](data); } catch (e) { } }
    };
    Core.prototype.pickLine = function (event) {
        var pool = (LINES[this.mascot] && LINES[this.mascot][event]) || [];
        if (!pool.length) { return ''; }
        var key = this.mascot + ':' + event, idx = Math.floor(this.rng() * pool.length);
        if (pool.length > 1 && idx === this.lastLine[key]) { idx = (idx + 1) % pool.length; }   // never the same line twice in a row
        this.lastLine[key] = idx;
        return pool[idx];
    };
    Core.prototype.say = function (event) { var line = this.pickLine(event); this._emit('say', { event: event, line: line }); return line; };
    Core.prototype.setMascot = function (id) {
        if (!MASCOTS[id]) { return; }
        this.mascot = id; this.store.set('akira_timer_mascot', id);
        this._emit('mascot', id); this.say('idle');
    };
    Core.prototype._loadStats = function () {
        try { var s = JSON.parse(this.store.get('akira_timer_stats') || '{}'); return (s && typeof s === 'object') ? s : {}; } catch (e) { return {}; }
    };
    Core.prototype.today = function () {
        var k = dayKey(new Date(this.now())), s = this.stats[k];
        return s ? { sessions: s.sessions, focusMs: s.focusMs } : { sessions: 0, focusMs: 0 };
    };
    Core.prototype.totalFocusMs = function () {
        var k, t = 0; for (k in this.stats) { if (this.stats.hasOwnProperty(k)) { t += this.stats[k].focusMs; } } return t;
    };
    Core.prototype._addSession = function (ms) {
        var k = dayKey(new Date(this.now()));
        if (!this.stats[k]) { this.stats[k] = { sessions: 0, focusMs: 0 }; }
        this.stats[k].sessions += 1; this.stats[k].focusMs += ms;
        this.store.set('akira_timer_stats', JSON.stringify(this.stats));
    };
    Core.prototype._save = function () {
        this.store.set('akira_timer_state', JSON.stringify({ mode: this.mode, durationMs: this.durationMs, remainingMs: this.remainingMs, running: this.running, endAt: this.endAt, cycle: this.cycle }));
    };
    Core.prototype._restore = function () {
        var s; try { s = JSON.parse(this.store.get('akira_timer_state') || 'null'); } catch (e) { s = null; }
        if (!s || !MODES[s.mode] || !(s.durationMs > 0)) { return; }
        this.mode = s.mode; this.durationMs = s.durationMs; this.cycle = s.cycle || 0;
        this.remainingMs = Math.min(Math.max(0, s.remainingMs), this.durationMs);
        if (s.running && s.endAt) {
            if (s.endAt > this.now()) { this.running = true; this.endAt = s.endAt; this.remainingMs = s.endAt - this.now(); }
            else { this.remainingMs = 0; this._finish(true); }    // it ran out while the panel was closed
        }
    };
    Core.prototype.start = function () {
        if (this.running) { return; }
        if (this.remainingMs <= 0) { this.remainingMs = this.durationMs; }
        var resumed = this.remainingMs < this.durationMs;
        this.running = true; this.endAt = this.now() + this.remainingMs;
        this._save(); this._emit('change');
        this.say(resumed ? 'resume' : 'start');
    };
    Core.prototype.pause = function () {
        if (!this.running) { return; }
        this.remainingMs = Math.max(0, this.endAt - this.now());
        this.running = false; this.endAt = null;
        this._save(); this._emit('change'); this.say('pause');
    };
    Core.prototype.reset = function () {
        this.running = false; this.endAt = null; this.remainingMs = this.durationMs; this.halfSaid = false;
        this._save(); this._emit('change'); this.say('reset');
    };
    Core.prototype.setMode = function (mode, minutes) {
        if (!MODES[mode]) { return; }
        var m = minutes > 0 ? minutes : MODES[mode].minutes;
        this.mode = mode; this.durationMs = Math.round(m * 60000); this.remainingMs = this.durationMs;
        this.running = false; this.endAt = null; this.halfSaid = false;
        this._save(); this._emit('change');
    };
    Core.prototype.setCustomMinutes = function (minutes) {
        var m = parseFloat(minutes);
        if (isNaN(m) || m <= 0 || m > 600) { return false; }
        this.setMode(this.mode, m); return true;
    };
    Core.prototype._finish = function (silent) {
        var wasFocus = this.mode === 'focus';
        this.running = false; this.endAt = null; this.remainingMs = 0; this.halfSaid = false;
        var next;
        if (wasFocus) {
            this._addSession(this.durationMs); this.cycle += 1;
            next = (this.cycle % 4 === 0) ? 'long' : 'short';
        } else { next = 'focus'; }
        this._save();
        if (!silent) { this._emit('complete', { mode: this.mode, next: next }); this.say(wasFocus ? 'complete' : 'breakDone'); }
        this._emit('change');
        return next;
    };
    // call often; returns true when the timer finished on this tick
    Core.prototype.tick = function () {
        if (!this.running) { return false; }
        this.remainingMs = Math.max(0, this.endAt - this.now());
        if (!this.halfSaid && this.mode === 'focus' && this.remainingMs <= this.durationMs / 2) { this.halfSaid = true; this.say('halfway'); }
        if (this.remainingMs <= 0) { this._finish(false); return true; }
        return false;
    };
    Core.prototype.nextMode = function () {
        if (this.mode !== 'focus') { return 'focus'; }
        return (this.cycle % 4 === 3) ? 'long' : 'short';
    };

    // ------------------------------------------------------------------ mascots (SVG, 64x64)
    function eyes(mood, y, a, b) {
        var c = '#1b1b22', s = 'stroke="' + c + '" stroke-width="2.2" stroke-linecap="round" fill="none"';
        if (mood === 'sleepy') { return '<path d="M' + (a - 4) + ' ' + y + ' q4 3 8 0" ' + s + '/><path d="M' + (b - 4) + ' ' + y + ' q4 3 8 0" ' + s + '/>'; }
        if (mood === 'happy' || mood === 'cheer') { return '<path d="M' + (a - 4) + ' ' + (y + 2) + ' q4 -5 8 0" ' + s + '/><path d="M' + (b - 4) + ' ' + (y + 2) + ' q4 -5 8 0" ' + s + '/>'; }
        if (mood === 'grumpy') { return '<circle cx="' + a + '" cy="' + y + '" r="2.6" fill="' + c + '"/><circle cx="' + b + '" cy="' + y + '" r="2.6" fill="' + c + '"/><path d="M' + (a - 5) + ' ' + (y - 6) + ' l8 3" ' + s + '/><path d="M' + (b + 5) + ' ' + (y - 6) + ' l-8 3" ' + s + '/>'; }
        return '<circle cx="' + a + '" cy="' + y + '" r="2.6" fill="' + c + '"/><circle cx="' + b + '" cy="' + y + '" r="2.6" fill="' + c + '"/>';
    }
    function mouth(mood, cx, y) {
        var s = 'stroke="#1b1b22" stroke-width="2.2" stroke-linecap="round" fill="none"';
        if (mood === 'happy' || mood === 'idle') { return '<path d="M' + (cx - 5) + ' ' + y + ' q5 5 10 0" ' + s + '/>'; }
        if (mood === 'cheer') { return '<path d="M' + (cx - 6) + ' ' + y + ' q6 9 12 0 z" fill="#1b1b22"/>'; }
        if (mood === 'sleepy') { return '<ellipse cx="' + cx + '" cy="' + (y + 1) + '" rx="2" ry="2.4" fill="#1b1b22"/>'; }
        return '<path d="M' + (cx - 4) + ' ' + (y + 2) + ' h8" ' + s + '/>';
    }
    var DRAW = {
        bolt: function (m, col) {
            return '<path d="M14 26 L18 8 L30 20 Z M50 26 L46 8 L34 20 Z" fill="' + col + '"/><rect x="10" y="18" width="44" height="34" rx="12" fill="#cfd5e3"/>' +
                '<rect x="15" y="26" width="34" height="14" rx="7" fill="#1f2433"/><g transform="translate(0,2)">' + eyes(m === 'idle' ? 'idle' : m, 33, 25, 39).replace(/#1b1b22/g, col) + '</g>' +
                mouth(m, 32, 46) + '<path d="M32 18 v-9" stroke="' + col + '" stroke-width="2.4"/><circle cx="32" cy="8" r="3" fill="' + col + '"/>';
        },
        mochi: function (m, col) {
            return '<path d="M12 52 Q10 14 32 12 Q54 14 52 52 q-5 -5 -10 0 q-5 -5 -10 0 q-5 -5 -10 0 q-5 -5 -10 0 Z" fill="#fff"/>' +
                '<circle cx="21" cy="38" r="4" fill="' + col + '" opacity=".55"/><circle cx="43" cy="38" r="4" fill="' + col + '" opacity=".55"/>' +
                eyes(m, 31, 24, 40) + mouth(m, 32, 40) + (m === 'sleepy' ? '<text x="46" y="16" font-size="10" fill="' + col + '" font-weight="700">z</text><text x="52" y="9" font-size="7" fill="' + col + '" font-weight="700">z</text>' : '');
        },
        kei: function (m, col) {
            return '<path d="M32 4 L58 32 L32 60 L6 32 Z" fill="' + col + '" stroke="#fff3b0" stroke-width="2"/><path d="M32 12 L50 32 L32 52 L14 32 Z" fill="#fff" opacity=".18"/>' +
                eyes(m, 30, 25, 39) + mouth(m, 32, 40);
        },
        null_: function (m, col) {
            return '<path d="M8 22 L20 30 L12 44 Z M56 22 L44 30 L52 44 Z" fill="#ff5c7a"/><circle cx="32" cy="32" r="20" fill="#1f2a3f" stroke="' + col + '" stroke-width="3"/>' +
                '<path d="M32 6 v10 M32 48 v10 M6 32 h10 M48 32 h10" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>' +
                '<rect x="16" y="25" width="32" height="10" rx="5" fill="' + col + '"/>' + eyes(m === 'idle' ? 'idle' : m, 30, 25, 39) + mouth(m, 32, 44);
        }
    };
    function mascotSvg(id, mood, size) {
        var fn = DRAW[id] || DRAW.bolt, col = (MASCOTS[id] || MASCOTS.bolt).color;
        return '<svg viewBox="0 0 64 64" width="' + (size || 56) + '" height="' + (size || 56) + '" xmlns="http://www.w3.org/2000/svg">' + fn(mood || 'idle', col) + '</svg>';
    }
    var MOOD_FOR_EVENT = { start: 'cheer', resume: 'happy', pause: 'sleepy', reset: 'grumpy', halfway: 'happy', complete: 'cheer', breakDone: 'happy', idle: 'idle' };

    // ------------------------------------------------------------------ DOM layer
    function mountUi(core, doc) {
        doc = doc || root.document;
        if (!doc || doc.getElementById('akira-timer-root')) { return null; }
        var css = doc.createElement('style');
        css.textContent = [
            '#akira-timer-root{position:fixed;left:8px;bottom:34px;z-index:100000;font-family:inherit;}',
            '#akira-timer-fab{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px 0 6px;border-radius:15px;cursor:pointer;border:1px solid var(--primary,#00ff55);background:rgba(0,0,0,.82);color:var(--primary,#00ff55);font-size:11px;font-weight:700;box-shadow:0 2px 10px rgba(0,0,0,.5);user-select:none;}',
            '#akira-timer-fab svg{display:block;}',
            '#akira-timer-card{display:none;position:absolute;left:0;bottom:36px;width:min(300px,calc(100vw - 16px));box-sizing:border-box;padding:12px;border-radius:14px;background:var(--panel-bg,#000);border:1px solid var(--primary,#00ff55);color:var(--text-primary,#eee);box-shadow:0 8px 30px rgba(0,0,0,.65);}',
            '#akira-timer-root.open #akira-timer-card{display:block;}',
            '.akt-top{display:flex;gap:10px;align-items:center;margin-bottom:10px;}',
            '.akt-avatar{flex:0 0 56px;cursor:pointer;}',
            '.akt-bubble{flex:1;min-height:46px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.07);font-size:11px;line-height:1.35;position:relative;}',
            '.akt-bubble:before{content:"";position:absolute;left:-6px;top:16px;border:6px solid transparent;border-right-color:rgba(255,255,255,.07);border-left:0;}',
            '.akt-name{font-size:9px;opacity:.65;margin-top:2px;}',
            '.akt-ring{position:relative;width:132px;height:132px;margin:2px auto 8px;}',
            '.akt-ring svg{transform:rotate(-90deg);}',
            '.akt-time{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;}',
            '.akt-time small{font-size:9px;font-weight:600;opacity:.65;letter-spacing:.8px;text-transform:uppercase;}',
            '.akt-row{display:flex;gap:6px;justify-content:center;margin:6px 0;flex-wrap:wrap;}',
            '.akt-btn{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font-size:10px;font-weight:700;cursor:pointer;}',
            '.akt-btn.on,.akt-btn.primary{background:var(--primary,#00ff55);color:var(--accent-text-color,#000);border-color:var(--primary,#00ff55);}',
            '.akt-custom{width:46px;padding:4px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:inherit;font-size:10px;text-align:center;}',
            '.akt-foot{display:flex;justify-content:space-between;align-items:center;font-size:9.5px;opacity:.8;margin-top:6px;}',
            '.akt-picks{display:flex;gap:4px;justify-content:center;margin-top:8px;}',
            '.akt-pick{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(255,255,255,.04);}',
            '.akt-pick.sel{border-color:var(--primary,#00ff55);background:rgba(255,255,255,.1);}',
            '.akt-x{position:absolute;right:8px;top:6px;cursor:pointer;opacity:.6;font-size:13px;}'
        ].join('\n');
        doc.head.appendChild(css);

        var rootEl = doc.createElement('div'); rootEl.id = 'akira-timer-root';
        var fab = doc.createElement('div'); fab.id = 'akira-timer-fab'; fab.title = 'Focus timer';
        var card = doc.createElement('div'); card.id = 'akira-timer-card';
        card.innerHTML =
            '<span class="akt-x" data-a="close">\u00d7</span>' +
            '<div class="akt-top"><div class="akt-avatar" data-a="talk" title="Click to chat"></div><div><div class="akt-bubble"></div><div class="akt-name"></div></div></div>' +
            '<div class="akt-ring"><svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r="58" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>' +
            '<circle class="akt-arc" cx="66" cy="66" r="58" fill="none" stroke="var(--primary,#00ff55)" stroke-width="8" stroke-linecap="round" stroke-dasharray="364.4" stroke-dashoffset="0"/></svg>' +
            '<div class="akt-time"><span class="akt-clock">25:00</span><small class="akt-mode">Focus</small></div></div>' +
            '<div class="akt-row" data-r="modes"></div>' +
            '<div class="akt-row"><button class="akt-btn primary" data-a="toggle">Start</button><button class="akt-btn" data-a="reset">Reset</button><input class="akt-custom" type="number" min="1" max="600" step="1" value="25" title="Custom minutes"><button class="akt-btn" data-a="custom">Set</button></div>' +
            '<div class="akt-foot"><span class="akt-today"></span><label style="cursor:pointer"><input type="checkbox" data-a="mute"> mute</label></div>' +
            '<div class="akt-picks"></div>';
        rootEl.appendChild(card); rootEl.appendChild(fab); doc.body.appendChild(rootEl);

        function q(sel) { return card.querySelector(sel); }
        var arc = q('.akt-arc'), clock = q('.akt-clock'), modeLbl = q('.akt-mode'), toggle = q('[data-a="toggle"]'), avatar = q('.akt-avatar'), bubble = q('.akt-bubble'),
            nameEl = q('.akt-name'), today = q('.akt-today'), modesRow = q('[data-r="modes"]'), picks = q('.akt-picks'), custom = q('.akt-custom'), mute = q('[data-a="mute"]');
        var mood = 'idle', moodTimer = null, CIRC = 364.4;
        mute.checked = core.store.get('akira_timer_mute') === '1';

        function setMood(m, hold) {
            mood = m; avatar.innerHTML = mascotSvg(core.mascot, mood, 56);
            if (moodTimer) { root.clearTimeout(moodTimer); }
            if (hold !== false) { moodTimer = root.setTimeout(function () { mood = core.running ? 'idle' : 'sleepy'; avatar.innerHTML = mascotSvg(core.mascot, mood, 56); }, 4000); }
        }
        function renderPicks() {
            picks.innerHTML = '';
            ORDER.forEach(function (id) {
                var d = doc.createElement('div'); d.className = 'akt-pick' + (id === core.mascot ? ' sel' : ''); d.title = MASCOTS[id].name + ' - ' + MASCOTS[id].tag;
                d.innerHTML = mascotSvg(id, 'idle', 24); d.onclick = function () { core.setMascot(id); }; picks.appendChild(d);
            });
        }
        function renderModes() {
            modesRow.innerHTML = '';
            ['focus', 'short', 'long'].forEach(function (m) {
                var b = doc.createElement('button'); b.className = 'akt-btn' + (core.mode === m ? ' on' : ''); b.textContent = MODES[m].label;
                b.onclick = function () { core.setMode(m); custom.value = Math.round(core.durationMs / 60000); }; modesRow.appendChild(b);
            });
        }
        function render() {
            var frac = core.durationMs > 0 ? core.remainingMs / core.durationMs : 0;
            arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - frac)));
            clock.textContent = formatTime(core.remainingMs); modeLbl.textContent = MODES[core.mode].label;
            toggle.textContent = core.running ? 'Pause' : (core.remainingMs < core.durationMs && core.remainingMs > 0 ? 'Resume' : 'Start');
            var t = core.today(); today.textContent = t.sessions + ' session' + (t.sessions === 1 ? '' : 's') + ' \u00b7 ' + Math.round(t.focusMs / 60000) + ' min today';
            fab.innerHTML = mascotSvg(core.mascot, core.running ? 'happy' : 'idle', 22) + '<span>' + (core.running ? formatTime(core.remainingMs) : 'Timer') + '</span>';
            nameEl.textContent = MASCOTS[core.mascot].name + ' \u00b7 ' + MASCOTS[core.mascot].tag;
            renderModes();
        }
        function beep() {
            if (mute.checked) { return; }
            try {
                var AC = root.AudioContext || root.webkitAudioContext; if (!AC) { return; }
                var ac = new AC(), t0 = ac.currentTime;
                [880, 660, 990].forEach(function (f, i) {
                    var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = 'sine';
                    g.gain.setValueAtTime(0.0001, t0 + i * 0.22); g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.22 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.22 + 0.2);
                    o.connect(g); g.connect(ac.destination); o.start(t0 + i * 0.22); o.stop(t0 + i * 0.22 + 0.22);
                });
            } catch (e) { }
        }
        core.on('say', function (d) { bubble.textContent = d.line; setMood(MOOD_FOR_EVENT[d.event] || 'idle'); });
        core.on('change', render);
        core.on('mascot', function () { renderPicks(); render(); setMood('happy'); });
        core.on('complete', function (d) {
            beep(); rootEl.classList.add('open');
            try { if (typeof root.showStatus === 'function') { root.showStatus(MODES[d.mode].label + ' finished', 'success'); } } catch (e) { }
            // queue the next phase, ready to go (does not start by itself)
            root.setTimeout(function () { core.setMode(d.next); custom.value = Math.round(core.durationMs / 60000); }, 600);
        });
        card.addEventListener('click', function (e) {
            var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
            if (e.target && e.target.parentNode && !a) { var p = e.target.closest ? e.target.closest('[data-a]') : null; a = p ? p.getAttribute('data-a') : null; }
            if (a === 'close') { rootEl.classList.remove('open'); }
            else if (a === 'toggle') { core.running ? core.pause() : core.start(); }
            else if (a === 'reset') { core.reset(); }
            else if (a === 'talk') { core.say('idle'); }
            else if (a === 'custom') { if (!core.setCustomMinutes(custom.value)) { bubble.textContent = 'Pick a number of minutes between 1 and 600.'; } }
        });
        mute.addEventListener('change', function () { core.store.set('akira_timer_mute', mute.checked ? '1' : '0'); });
        fab.addEventListener('click', function () { rootEl.classList.toggle('open'); if (rootEl.classList.contains('open')) { render(); } });

        renderPicks(); custom.value = Math.round(core.durationMs / 60000); setMood(core.running ? 'idle' : 'sleepy', false); render();
        bubble.textContent = core.running ? core.pickLine('resume') : "Hi! I'm " + MASCOTS[core.mascot].name + ". Press start when you're ready.";
        root.setInterval(function () { core.tick(); if (core.running) { render(); } }, 250);
        // occasional encouragement while a focus session runs (about every 6 minutes)
        root.setInterval(function () { if (core.running && core.mode === 'focus') { core.say('idle'); } }, 360000);
        return { root: rootEl, card: card, fab: fab, render: render };
    }

    function init() {
        var store = {
            get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
            set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { } }
        };
        var core = new Core({ store: store });
        root.AkiraTimer = { core: core, ui: mountUi(core) };
    }

    var api = { Core: Core, MASCOTS: MASCOTS, ORDER: ORDER, LINES: LINES, MODES: MODES, formatTime: formatTime, mascotSvg: mascotSvg, mountUi: mountUi, dayKey: dayKey };
    root.AkiraTimerLib = api;
    if (typeof module !== 'undefined' && module.exports) { try { module.exports = api; } catch (e) { } }
    if (root.document) {
        if (root.document.readyState === 'loading') { root.document.addEventListener('DOMContentLoaded', init); } else { init(); }
    }
})(typeof window !== 'undefined' ? window : this);
