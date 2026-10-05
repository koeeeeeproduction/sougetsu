/* Sougetsu Akira FX - Personality core (separate module; everything is optional and lives in its own settings).
 *  Pet       a small companion in the panel corner: sleeps when you're idle, wakes up, works while AE is busy,
 *            celebrates finished renders, flinches at errors, nags (gently) after long sessions.
 *  Intro     0.5-1.5 s "SOUGETSU / INITIALIZING... / Let's create." when the panel opens.
 *  Events    short random messages, rate set by the Frequency slider, muted by Do Not Disturb.
 *  XP        +10 effect/preset applied, +25 composition finished (added to the Render Queue), +50 render completed.
 *            Levels unlock cosmetics only: pets, intro styles, sound packs, event packs, badges.
 *  Missions  three daily missions, same for the whole day.
 *  Sounds    synthesised with WebAudio (no files), on/off + volume.
 * How it knows what you do: it watches the panel's own calls into After Effects (successful applies, errors) and polls
 * the project every 15 s (render-queue items, finished renders, activity). A poll that AE doesn't answer for a while
 * means AE is busy (usually rendering). Progress is stored per machine in localStorage. */
(function () {
    'use strict';
    var KEY = 'akira_persona_v1', VER = 1;

    // ---------- catalogue ----------
    var PETS = [
        { id: 'ninja', name: 'Shadow Ninja', lvl: 1, body: '#1b1b24', acc: '#e3242b', eye: '#ffffff' },
        { id: 'fox', name: 'Spirit Fox', lvl: 3, body: '#ff8a3d', acc: '#fff3e6', eye: '#2a1200' },
        { id: 'slime', name: 'Pixel Slime', lvl: 5, body: '#38d18a', acc: '#a8ffd6', eye: '#06261a' },
        { id: 'owl', name: 'Mecha Owl', lvl: 8, body: '#7d8aa3', acc: '#ffd23f', eye: '#0f1a2e' },
        { id: 'dragon', name: 'Dragon Pup', lvl: 12, body: '#8a5cff', acc: '#ffcf4a', eye: '#14062e' },
        { id: 'cat', name: 'Void Cat', lvl: 16, body: '#0d0d12', acc: '#7fd4ff', eye: '#7fd4ff' }
    ];
    var INTROS = [{ id: 'classic', name: 'Classic', lvl: 1 }, { id: 'glitch', name: 'Glitch', lvl: 6 }, { id: 'ink', name: 'Ink Brush', lvl: 10 }];
    var SOUNDPACKS = [{ id: 'soft', name: 'Soft', lvl: 1 }, { id: 'arcade', name: 'Arcade', lvl: 4 }, { id: 'zen', name: 'Zen Bells', lvl: 9 }];
    var EVENTPACKS = [{ id: 'core', name: 'Core', lvl: 1 }, { id: 'hype', name: 'Hype', lvl: 7 }, { id: 'zen', name: 'Calm', lvl: 11 }];
    var BADGES = [
        { id: 'first_fx', name: 'First Strike', desc: 'Apply your first effect', icon: '⚡' },
        { id: 'fx100', name: 'Centurion', desc: 'Apply 100 effects', icon: '💯' },
        { id: 'first_render', name: 'Shipped', desc: 'Finish your first render', icon: '🎬' },
        { id: 'streak7', name: 'Locked In', desc: '7-day streak', icon: '🔥' },
        { id: 'owl', name: 'Night Owl', desc: 'Work after midnight', icon: '🦉' },
        { id: 'lvl10', name: 'Double Digits', desc: 'Reach level 10', icon: '🏅' },
        { id: 'missions10', name: 'Mission Runner', desc: 'Complete 10 daily missions', icon: '🎯' }
    ];
    var EVENTS = {
        core: ["You're locked in today.", 'Go get some food.', 'Hydrate. Your keyframes will wait.', 'That timeline is looking clean.',
            'Save your project. Just in case.', 'Stretch your wrists for 10 seconds.', 'Ease curves are a love language.', 'Remember to blink.',
            '{fx} effects applied today. Not bad.', "You've been here {mins} minutes. Respect.", 'Pre-compose responsibly.'],
        hype: ['Power level rising.', 'Main character energy detected.', 'This edit is going to hit.', 'Final form unlocked… almost.', 'Combo x{fx}!'],
        zen: ['Breathe in. Render out.', 'One keyframe at a time.', 'Slow is smooth, smooth is fast.', 'Let the comp settle.']
    };
    var MISSIONS = [
        { id: 'apply3', text: 'Apply 3 presets', goal: 3, stat: 'fx' },
        { id: 'apply10', text: 'Apply 10 effects', goal: 10, stat: 'fx' },
        { id: 'finish1', text: 'Finish 1 composition', goal: 1, stat: 'comps' },
        { id: 'render1', text: 'Complete a render', goal: 1, stat: 'renders' },
        { id: 'new1', text: 'Try something new', goal: 1, stat: 'newTools' },
        { id: 'focus30', text: 'Work for 30 minutes', goal: 30, stat: 'mins' }
    ];

    // ---------- state ----------
    function today() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
    var DEF = {
        v: VER, xp: 0, total: { fx: 0, renders: 0, comps: 0, missions: 0 }, tools: {}, badges: {}, streak: { last: '', n: 0 },
        day: { d: '', fx: 0, renders: 0, comps: 0, newTools: 0, mins: 0, undo: 0, done: {} },
        set: { pet: true, events: true, xp: true, missions: true, sounds: true, intro: true, petId: 'ninja', freq: 2, volume: 60,
            dndRender: true, dndPresent: false, dndNight: true, intro_style: 'classic', soundpack: 'soft', eventpack: 'core', petPos: null }
    };
    function merge(a, b) { var k; for (k in b) { if (b.hasOwnProperty(k)) { if (a[k] === undefined) { a[k] = JSON.parse(JSON.stringify(b[k])); } else if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') { merge(a[k], b[k]); } } } return a; }
    var S;
    try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
    S = merge(S || {}, DEF);
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
    function rollDay() {
        var t = today();
        if (S.day.d === t) { return; }
        var y = new Date(); y.setDate(y.getDate() - 1);
        var yd = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
        S.streak.n = (S.streak.last === yd) ? S.streak.n + 1 : (S.streak.last === t ? S.streak.n : 1);
        S.streak.last = t;
        S.day = { d: t, fx: 0, renders: 0, comps: 0, newTools: 0, mins: 0, undo: 0, done: {} };
        if (S.streak.n >= 7) { badge('streak7'); }
        save();
    }

    // ---------- levels ----------
    function need(l) { return Math.round(100 * Math.pow(l, 1.35)); }        // xp from level l to l+1
    function levelOf(xp) { var l = 1; while (xp >= need(l)) { xp -= need(l); l++; } return { lvl: l, into: xp, next: need(l) }; }
    function unlocked(item) { return levelOf(S.xp).lvl >= item.lvl; }

    // ---------- sound (WebAudio) ----------
    var AC = null;
    function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
    var PACK = { soft: { wave: 'sine', base: 523 }, arcade: { wave: 'square', base: 440 }, zen: { wave: 'triangle', base: 392 } };
    function tone(seq) {
        if (!S.set.sounds || dnd()) { return; }
        var a = ac(); if (!a) { return; }
        try { if (a.state === 'suspended') { a.resume(); } } catch (e) { }
        var p = PACK[S.set.soundpack] || PACK.soft, vol = Math.max(0, Math.min(1, S.set.volume / 100)) * (p.wave === 'square' ? 0.06 : 0.16), t0 = a.currentTime + 0.01;
        seq.forEach(function (n) {
            var o = a.createOscillator(), g = a.createGain(), f = p.base * Math.pow(2, n[0] / 12);
            o.type = p.wave; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + n[1]); g.gain.linearRampToValueAtTime(vol, t0 + n[1] + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]); o.connect(g); g.connect(a.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.05);
        });
    }
    var SFX = {
        level: function () { tone([[0, 0, 0.18], [4, 0.09, 0.18], [7, 0.18, 0.18], [12, 0.27, 0.45]]); },
        mission: function () { tone([[7, 0, 0.14], [12, 0.12, 0.35]]); },
        pet: function () { tone([[12, 0, 0.08], [16, 0.06, 0.1]]); },
        event: function () { tone([[9, 0, 0.12]]); },
        render: function () { tone([[0, 0, 0.16], [7, 0.12, 0.16], [12, 0.24, 0.16], [16, 0.36, 0.5]]); },
        error: function () { tone([[-5, 0, 0.12], [-8, 0.1, 0.2]]); }
    };

    // ---------- do not disturb ----------
    var busy = false, presenting = false;
    function dnd() {
        var h = new Date().getHours();
        if (S.set.dndNight && (h >= 23 || h < 6)) { return true; }
        if (S.set.dndRender && busy) { return true; }
        if (S.set.dndPresent && (presenting || document.fullscreenElement)) { return true; }
        return false;
    }

    // ---------- styles ----------
    var css = document.createElement('style');
    css.id = 'akira-persona-css';
    css.textContent = [
        '#ap-root{position:fixed;right:10px;bottom:8px;z-index:9500;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none;font-family:Inter,-apple-system,"Segoe UI",Arial,sans-serif}',
        '#ap-root *{box-sizing:border-box}',
        '#ap-pet{width:54px;height:54px;pointer-events:auto;cursor:pointer;position:relative;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}',
        '#ap-pet svg{width:100%;height:100%;overflow:visible}',
        '#ap-chip{pointer-events:auto;cursor:pointer;height:22px;padding:0 9px;border-radius:11px;border:1px solid var(--primary,#00ff55);background:rgba(0,0,0,.75);color:var(--primary,#00ff55);font-size:10px;font-weight:800;letter-spacing:.5px;display:flex;align-items:center;gap:6px}',
        '#ap-chip i{display:block;width:34px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden}#ap-chip i b{display:block;height:100%;background:var(--primary,#00ff55)}',
        '#ap-bubble{pointer-events:auto;max-width:210px;padding:7px 10px;border-radius:10px 10px 2px 10px;background:rgba(10,10,14,.95);border:1px solid rgba(255,255,255,.12);color:#eee;font-size:11px;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.5);opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}',
        '#ap-bubble.on{opacity:1;transform:none}',
        '.ap-body{transform-origin:50% 90%}',
        '.st-idle .ap-body{animation:apBreath 3s ease-in-out infinite}.st-sleep .ap-body{animation:apBreath 5s ease-in-out infinite}',
        '.st-work .ap-body{animation:apBob .45s ease-in-out infinite}.st-celebrate .ap-body{animation:apJump .5s ease-out 3}',
        '.st-worried .ap-body{animation:apShake .12s linear 5}.st-wake .ap-body{animation:apStretch .9s ease-out 1}',
        '.ap-closed,.ap-z,.ap-spark,.ap-bang,.ap-sweat{display:none}.st-sleep .ap-open{display:none}.st-sleep .ap-closed,.st-sleep .ap-z{display:block}',
        '.st-celebrate .ap-spark,.st-worried .ap-bang,.st-work .ap-sweat{display:block}.st-idle .ap-open{animation:apBlink 4s infinite}',
        '.ap-z{animation:apZ 2.4s ease-in-out infinite}.ap-spark{animation:apSpark .6s ease-out infinite}',
        '@keyframes apBreath{50%{transform:scale(1.04,.97)}}@keyframes apBob{50%{transform:translateY(-3px)}}@keyframes apJump{40%{transform:translateY(-14px) scale(.95,1.08)}80%{transform:translateY(0) scale(1.08,.92)}}',
        '@keyframes apShake{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}@keyframes apStretch{40%{transform:scale(.92,1.12)}}@keyframes apBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
        '@keyframes apZ{0%{opacity:0;transform:translate(0,0)}40%{opacity:1}100%{opacity:0;transform:translate(8px,-14px)}}@keyframes apSpark{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(1.4)}}',
        '.ap-open{transform-origin:50% 50%;transform-box:fill-box}',
        // intro
        '#ap-intro{position:fixed;inset:0;z-index:2147483000;background:#050507;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#fff;transition:opacity .25s;cursor:pointer}',
        '#ap-intro h1{margin:0;font-size:26px;letter-spacing:10px;font-weight:900;padding-left:10px}',
        '#ap-intro .l{font:700 10px Menlo,monospace;letter-spacing:3px;color:var(--primary,#00ff55)}#ap-intro .bar{width:150px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden}',
        '#ap-intro .bar b{display:block;height:100%;width:0;background:var(--primary,#00ff55);transition:width .9s cubic-bezier(.3,.7,.2,1)}#ap-intro .go{font-size:13px;font-weight:700;opacity:0;transition:opacity .25s}',
        '#ap-intro.glitch h1{animation:apGlitch .18s steps(2) 5;text-shadow:2px 0 #ff2fa8,-2px 0 #2ff0ff}@keyframes apGlitch{50%{transform:translate(2px,-1px) skewX(8deg)}}',
        '#ap-intro.ink h1{font-family:Georgia,serif;letter-spacing:6px;animation:apInk 1s ease-out}@keyframes apInk{0%{filter:blur(8px);opacity:0}}',
        '#ap-intro .pet{width:60px;height:60px}',
        // hub + settings
        '#ap-hub{position:fixed;inset:0;z-index:2147482000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;padding:10px}',
        '#ap-hub .card{width:100%;max-width:380px;max-height:92vh;overflow:auto;background:#0b0b0f;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;color:#ddd;font-size:11px;box-shadow:0 20px 50px rgba(0,0,0,.6)}',
        '#ap-hub h3{margin:12px 0 6px;font-size:10px;letter-spacing:1.5px;color:#888;font-weight:800}#ap-hub h3:first-child{margin-top:0}',
        '#ap-hub .lv{display:flex;align-items:baseline;justify-content:space-between;font-weight:900;font-size:16px;color:#fff}#ap-hub .lv small{font-size:10px;color:#888;font-weight:700}',
        '#ap-hub .xpbar{height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;margin:6px 0 2px}#ap-hub .xpbar b{display:block;height:100%;background:linear-gradient(90deg,var(--primary,#00ff55),#fff)}',
        '#ap-hub .m{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid rgba(255,255,255,.07);border-radius:8px;margin-bottom:5px}',
        '#ap-hub .m .ck{width:14px;height:14px;border-radius:4px;border:1.5px solid #555;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:10px}',
        '#ap-hub .m.done{border-color:var(--primary,#00ff55)}#ap-hub .m.done .ck{background:var(--primary,#00ff55);border-color:var(--primary,#00ff55);color:#000}',
        '#ap-hub .m .p{margin-left:auto;color:#888;font-weight:700}',
        '#ap-hub .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}',
        '#ap-hub .it{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 4px;text-align:center;font-size:9px;cursor:pointer;color:#ccc;background:none}',
        '#ap-hub .it.sel{border-color:var(--primary,#00ff55);color:#fff}#ap-hub .it.lock{opacity:.35;cursor:default}#ap-hub .it svg{width:34px;height:34px;display:block;margin:0 auto 2px}',
        '#ap-hub .row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '#ap-hub .row input[type=range]{width:130px;accent-color:var(--primary,#00ff55)}#ap-hub input[type=checkbox]{accent-color:var(--primary,#00ff55);width:14px;height:14px}',
        '#ap-hub select{background:#15151b;color:#eee;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 6px;font-size:11px}',
        '#ap-hub .tabs{display:flex;gap:4px;margin-bottom:10px}#ap-hub .tabs button{flex:1;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:none;color:#aaa;font-weight:800;font-size:10px;letter-spacing:.5px;cursor:pointer}',
        '#ap-hub .tabs button.on{border-color:var(--primary,#00ff55);color:var(--primary,#00ff55)}#ap-hub .close{float:right;background:none;border:0;color:#888;font-size:16px;cursor:pointer;margin:-4px -2px 0 0}',
        '#ap-toast{position:fixed;left:50%;top:14px;transform:translate(-50%,-20px);opacity:0;z-index:2147482500;background:#0b0b0f;border:1px solid var(--primary,#00ff55);color:#fff;border-radius:10px;padding:8px 14px;font:800 12px Inter,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.6);transition:all .25s;text-align:center;pointer-events:none}',
        '#ap-toast.on{opacity:1;transform:translate(-50%,0)}#ap-toast small{display:block;font-weight:600;color:#aaa;font-size:10px;margin-top:2px}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(css);

    // ---------- pet art (SVG, 64x64) ----------
    function petSVG(p) {
        var b = p.body, a = p.acc, e = p.eye, ears = '', extra = '';
        if (p.id === 'ninja') { extra = '<rect x="14" y="22" width="36" height="7" rx="3" fill="' + a + '"/><path d="M50 25 l9 -4 l-3 6 l5 3 l-10 0z" fill="' + a + '"/>'; }
        if (p.id === 'fox') { ears = '<path d="M17 24 L21 8 L30 20Z M47 24 L43 8 L34 20Z" fill="' + b + '"/><path d="M20 21 L22 12 L27 19Z M44 21 L42 12 L37 19Z" fill="' + a + '"/>'; extra = '<ellipse cx="32" cy="46" rx="11" ry="7" fill="' + a + '"/>'; }
        if (p.id === 'slime') { return svgWrap('<path class="ap-body" d="M10 52 C10 30 20 18 32 18 C44 18 54 30 54 52 Z" fill="' + b + '"/><rect x="18" y="24" width="6" height="6" fill="' + a + '" opacity=".7"/>' + eyes(e, 38) + fx(a)); }
        if (p.id === 'owl') { ears = '<path d="M16 22 L18 10 L26 18Z M48 22 L46 10 L38 18Z" fill="' + b + '"/>'; extra = '<circle cx="24" cy="34" r="8" fill="none" stroke="' + a + '" stroke-width="2.5"/><circle cx="40" cy="34" r="8" fill="none" stroke="' + a + '" stroke-width="2.5"/><path d="M30 40 L34 40 L32 44Z" fill="' + a + '"/>'; }
        if (p.id === 'dragon') { ears = '<path d="M20 20 L16 6 L27 16Z M44 20 L48 6 L37 16Z" fill="' + a + '"/>'; extra = '<path d="M52 44 q10 -2 8 -12 q-2 6 -8 6z" fill="' + b + '"/><ellipse cx="32" cy="47" rx="9" ry="6" fill="' + a + '" opacity=".8"/>'; }
        if (p.id === 'cat') { ears = '<path d="M16 24 L18 9 L28 19Z M48 24 L46 9 L36 19Z" fill="' + b + '"/>'; extra = '<path d="M50 50 q12 -4 8 -18" stroke="' + b + '" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="32" cy="44" r="2" fill="' + a + '"/>'; }
        return svgWrap('<g class="ap-body">' + ears + '<ellipse cx="32" cy="38" rx="21" ry="18" fill="' + b + '"/>' + extra + eyes(e, 34) + '</g>' + fx(a));
    }
    function eyes(c, y) {
        return '<g class="ap-open"><ellipse cx="25" cy="' + y + '" rx="3" ry="4" fill="' + c + '"/><ellipse cx="39" cy="' + y + '" rx="3" ry="4" fill="' + c + '"/></g>' +
            '<g class="ap-closed" stroke="' + c + '" stroke-width="2" stroke-linecap="round"><path d="M22 ' + y + ' q3 2 6 0"/><path d="M36 ' + y + ' q3 2 6 0"/></g>';
    }
    function fx(a) {
        return '<text class="ap-z" x="48" y="14" font-size="11" font-weight="900" fill="#cfe3ff">z</text>' +
            '<g class="ap-spark" fill="' + a + '"><circle cx="8" cy="14" r="2.5"/><circle cx="56" cy="10" r="2"/><circle cx="58" cy="30" r="1.8"/><circle cx="6" cy="34" r="1.6"/></g>' +
            '<text class="ap-bang" x="50" y="16" font-size="16" font-weight="900" fill="#ff4d4d">!</text>' +
            '<path class="ap-sweat" d="M50 18 q3 5 0 7 q-3 -2 0 -7z" fill="#7fd4ff"/>';
    }
    function svgWrap(inner) { return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>'; }
    function pet() { var id = S.set.petId, i; for (i = 0; i < PETS.length; i++) { if (PETS[i].id === id && unlocked(PETS[i])) { return PETS[i]; } } return PETS[0]; }

    // ---------- DOM ----------
    var root, petEl, bubble, chip, state = 'idle', stateTimer = 0, bubbleTimer = 0;
    function mount() {
        if (root) { return; }
        root = document.createElement('div'); root.id = 'ap-root';
        bubble = document.createElement('div'); bubble.id = 'ap-bubble';
        petEl = document.createElement('div'); petEl.id = 'ap-pet'; petEl.title = 'Your Sougetsu companion. Click for level, missions and settings.';
        chip = document.createElement('div'); chip.id = 'ap-chip'; chip.title = 'Sougetsu level & missions';
        root.appendChild(bubble); root.appendChild(petEl); root.appendChild(chip);
        document.body.appendChild(root);
        petEl.addEventListener('click', function () { poke(); openHub('me'); });
        chip.addEventListener('click', function () { openHub('me'); });
        render();
    }
    function render() {
        if (!root) { return; }
        petEl.style.display = S.set.pet ? '' : 'none';
        petEl.innerHTML = petSVG(pet());
        petEl.className = 'st-' + state;
        var L = levelOf(S.xp);
        chip.style.display = (S.set.xp || S.set.missions || !S.set.pet) ? '' : 'none';
        chip.innerHTML = (S.set.xp ? 'LV ' + (L.lvl < 10 ? '0' : '') + L.lvl + '<i><b style="width:' + Math.round(L.into / L.next * 100) + '%"></b></i>' : '✦ SOUGETSU') +
            (S.set.missions ? ' ' + missionsDone() + '/3' : '');
    }
    function setState(s, ms) {
        if (state === s && !ms) { return; }
        state = s; if (petEl) { petEl.className = 'st-' + s; }
        clearTimeout(stateTimer);
        if (ms) { stateTimer = setTimeout(function () { setState(baseState()); }, ms); }
    }
    function baseState() { return sleepy() ? 'sleep' : (busy ? 'work' : 'idle'); }
    function say(text, ms, sfx) {
        if (!root || !S.set.pet) { return; }
        bubble.textContent = text; bubble.classList.add('on');
        clearTimeout(bubbleTimer); bubbleTimer = setTimeout(function () { bubble.classList.remove('on'); }, ms || 3800);
        if (sfx) { SFX[sfx](); }
    }
    var toastEl, toastT = 0;
    function toast(title, sub, sfx) {
        if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'ap-toast'; document.body.appendChild(toastEl); }
        toastEl.innerHTML = title + (sub ? '<small>' + sub + '</small>' : '');
        toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
        if (sfx) { SFX[sfx](); }
    }

    // ---------- XP / badges / missions ----------
    function badge(id) { if (S.badges[id]) { return; } S.badges[id] = Date.now(); save(); var b = BADGES.filter(function (x) { return x.id === id; })[0]; if (b) { toast(b.icon + ' Badge unlocked: ' + b.name, b.desc, 'mission'); } }
    function addXP(n, why) {
        if (!S.set.xp) { return; }
        var before = levelOf(S.xp).lvl; S.xp += n; var after = levelOf(S.xp).lvl; save();
        if (after > before) {
            var un = [].concat(PETS, INTROS, SOUNDPACKS, EVENTPACKS).filter(function (x) { return x.lvl === after; }).map(function (x) { return x.name; });
            toast('LEVEL ' + (after < 10 ? '0' : '') + after + ' ⬆', un.length ? 'Unlocked: ' + un.join(', ') : '+' + n + ' XP · ' + why, 'level');
            setState('celebrate', 1600);
            if (after >= 10) { badge('lvl10'); }
        }
        render();
    }
    function todaysMissions() {
        var seed = 0, d = S.day.d || today(), i, out = [], pool = MISSIONS.slice();
        for (i = 0; i < d.length; i++) { seed = (seed * 31 + d.charCodeAt(i)) >>> 0; }
        // always include "Apply 3 presets", "Finish 1 composition", "Try something new" style variety: one from each group
        var groups = [['apply3', 'apply10'], ['finish1', 'render1'], ['new1', 'focus30']];
        groups.forEach(function (g, k) { var id = g[(seed >> k) & 1]; out.push(pool.filter(function (m) { return m.id === id; })[0]); });
        return out;
    }
    function missionsDone() { return todaysMissions().filter(function (m) { return S.day.done[m.id]; }).length; }
    function checkMissions() {
        if (!S.set.missions) { return; }
        todaysMissions().forEach(function (m) {
            if (!S.day.done[m.id] && (S.day[m.stat] || 0) >= m.goal) {
                S.day.done[m.id] = true; S.total.missions++; save();
                toast('MISSION COMPLETE 🔥', m.text + ' · Nice work.', 'mission');
                addXP(30, 'mission'); setState('celebrate', 1500);
                if (S.total.missions >= 10) { badge('missions10'); }
            }
        });
        render();
    }

    // ---------- activity sources ----------
    var lastActive = Date.now(), sessionStart = Date.now(), lastFxXP = 0;
    function activity() { var was = sleepy(); lastActive = Date.now(); if (was && S.set.pet) { setState('wake', 900); say(pick(['Oh! You\'re back.', 'I was not sleeping. I was buffering.', '*yawns* Let\'s go.']), 2500, 'pet'); } }
    function sleepy() { return Date.now() - lastActive > 10 * 60 * 1000; }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    ['mousedown', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, activity, true); });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { rollDay(); S.day.undo++; save(); } }, true);

    var GETTER = /^(get|list|check|count|is|has|scan|read|load|debug|find|probe|query|run_diag|runDiagnostic|reloadKeybinds|http)/i;
    function onHostReply(cmd, res) {
        var m = /\$\._akira\.([A-Za-z0-9_]+)|\b([A-Za-z0-9_]+_AkiraGUI)\s*\(|\$\._akira[A-Za-z0-9]+\.([A-Za-z0-9_]+)\(/.exec(cmd);
        if (!m) { return; }
        var fn = m[1] || m[2] || m[3] || '';
        if (!fn || GETTER.test(fn) || fn === 'run') { var rm = /\$\._akira\.run\(\s*["']([A-Za-z0-9_]+)/.exec(cmd); if (rm) { fn = rm[1]; } else { return; } }
        if (GETTER.test(fn)) { return; }
        var r = String(res == null ? '' : res);
        if (/^(ERR|ERROR)[:_]/.test(r)) { if (S.set.pet && !dnd()) { setState('worried', 900); if (Math.random() < 0.5) { say(pick(['Oof. After Effects said no.', 'That one bounced. Check the selection?', 'Error spotted. We go again.']), 3000, 'error'); } } return; }
        if (!/^(SUCCESS|OK|ONE:|SAVED|DONE)/.test(r)) { return; }
        activity(); rollDay();
        if (!S.tools[fn]) { S.tools[fn] = 1; S.day.newTools++; } else { S.tools[fn]++; }
        var now = Date.now();
        if (now - lastFxXP > 2500) {                    // live sliders re-apply constantly; count real applies only
            lastFxXP = now; S.day.fx++; S.total.fx++;
            if (S.total.fx === 1) { badge('first_fx'); } if (S.total.fx === 100) { badge('fx100'); }
            addXP(10, 'effect applied'); if (S.set.pet && Math.random() < 0.25 && !dnd()) { setState('celebrate', 900); SFX.pet(); }
        }
        save(); checkMissions();
    }
    function hook() {
        var P = window.CSInterface && window.CSInterface.prototype;
        if (!P || !P.evalScript || P.evalScript.__akiraPersona) { return; }
        var orig = P.evalScript;
        P.evalScript = function (script, cb) {
            var s = String(script || '');
            return orig.call(this, script, function (res) { try { onHostReply(s, res); } catch (e) { } if (typeof cb === 'function') { cb(res); } });
        };
        P.evalScript.__akiraPersona = true;
    }

    // project poll: render queue + activity + busy detection
    var POLL = '(function(){try{var p=app.project,rq=p.renderQueue,d=0,i,c=p.activeItem;for(i=1;i<=rq.numItems;i++){if(rq.item(i).status==RQItemStatus.DONE){d++;}}' +
        'var ct=(c&&c instanceof CompItem)?c.name+"@"+Math.round(c.time*100)+"#"+c.numLayers+"/"+c.selectedLayers.length:"";var dt="";try{dt=p.dirty?"1":"0";}catch(e1){}' +
        'return ["P",p.numItems,rq.numItems,d,dt,ct,(rq.rendering?1:0)].join("|");}catch(e){return "ERR";}})()';
    var lastPoll = null, pollSent = 0, pollPending = false;
    function poll() {
        var cs; try { cs = new window.CSInterface(); } catch (e) { return; }
        if (pollPending) { if (Date.now() - pollSent > 8000 && !busy) { busy = true; setState('work'); } return; }
        pollPending = true; pollSent = Date.now();
        window.__adobe_cep__ && window.__adobe_cep__.evalScript ? window.__adobe_cep__.evalScript(POLL, got) : cs.evalScript(POLL, got);
        function got(r) {
            pollPending = false;
            var wasBusy = busy; busy = false;
            r = String(r || ''); if (r.indexOf('P|') !== 0) { if (wasBusy) { setState(baseState()); } return; }
            var f = r.split('|'), cur = { items: +f[1], rq: +f[2], done: +f[3], sig: f[1] + f[4] + f[5], rendering: f[6] === '1' };
            if (cur.rendering) { busy = true; setState('work'); }
            if (lastPoll) {
                if (cur.sig !== lastPoll.sig) { activity(); }
                if (cur.rq > lastPoll.rq) { rollDay(); S.day.comps += cur.rq - lastPoll.rq; S.total.comps += cur.rq - lastPoll.rq; addXP(25 * (cur.rq - lastPoll.rq), 'composition finished'); say('Comp queued. Looking sharp.', 2500, 'pet'); checkMissions(); }
                if (cur.done > lastPoll.done) {
                    rollDay(); var n = cur.done - lastPoll.done; S.day.renders += n; S.total.renders += n; badge('first_render');
                    addXP(50 * n, 'render completed'); setState('celebrate', 2400);
                    if (!dnd()) { toast('RENDER COMPLETE 🎬', '+' + (50 * n) + ' XP', 'render'); }
                    checkMissions();
                }
            }
            if (wasBusy && !cur.rendering) { setState(baseState()); }
            lastPoll = cur; save();
        }
    }

    // ---------- random events + timers ----------
    var nextEvent = 0;
    function scheduleEvent() { var base = [0, 45, 25, 14, 8][Math.max(1, Math.min(4, S.set.freq))]; nextEvent = Date.now() + base * 60 * 1000 * (0.6 + Math.random() * 0.8); }
    function tick() {
        rollDay();
        var mins = Math.floor((Date.now() - sessionStart) / 60000);
        if (!sleepy() && document.hasFocus && !document.hidden) { S.day.mins = Math.max(S.day.mins, S.day.minsBase + mins || mins); }
        var h = new Date().getHours(); if (h >= 0 && h < 4 && !sleepy()) { badge('owl'); }
        if (state !== 'sleep' && sleepy() && !busy) { setState('sleep'); }
        if (S.set.events && Date.now() > nextEvent && !dnd() && !sleepy()) {
            scheduleEvent();
            var packs = ['core']; if (unlocked(EVENTPACKS[1]) && S.set.eventpack !== 'core') { packs.push(S.set.eventpack); }
            var pool = []; packs.forEach(function (k) { pool = pool.concat(EVENTS[k] || []); });
            if (S.day.undo >= 20) { pool.push("You've pressed Ctrl+Z " + S.day.undo + ' times today. Bold.'); }
            if (mins >= 120) { pool.push("Two hours in. Stand up, I'll guard the timeline."); }
            say(pick(pool).replace('{fx}', S.day.fx).replace('{mins}', mins), 4200, 'event');
        }
        if (mins > 0 && mins % 90 === 0 && !dnd() && S.set.pet) { say('Long session. Water, stretch, eyes off the screen for a bit.', 5000, 'event'); setState('worried', 900); }
        save(); checkMissions(); render();
    }

    // ---------- intro ----------
    function intro() {
        if (!S.set.intro) { return; }
        var st = S.set.intro_style; if (!INTROS.filter(function (x) { return x.id === st && unlocked(x); }).length) { st = 'classic'; }
        var el = document.createElement('div'); el.id = 'ap-intro'; el.className = st;
        el.innerHTML = '<h1>SOUGETSU</h1><div class="l">INITIALIZING...</div><div class="bar"><b></b></div>' + (S.set.pet ? '<div class="pet st-celebrate">' + petSVG(pet()) + '</div>' : '') + '<div class="go">Let\'s create.</div>';
        document.body.appendChild(el);
        var done = false; function end() { if (done) { return; } done = true; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 260); }
        el.addEventListener('click', end);
        requestAnimationFrame(function () { el.querySelector('.bar b').style.width = '100%'; });
        setTimeout(function () { el.querySelector('.go').style.opacity = '1'; el.querySelector('.l').textContent = 'READY'; }, 800);
        setTimeout(end, 1300);
    }

    // ---------- hub: level, missions, unlocks, settings ----------
    function openHub(tab) {
        var old = document.getElementById('ap-hub'); if (old) { old.remove(); }
        var hub = document.createElement('div'); hub.id = 'ap-hub';
        hub.innerHTML = '<div class="card"><button class="close" title="Close">✕</button><div class="tabs"><button data-t="me">LEVEL</button><button data-t="missions">MISSIONS</button><button data-t="unlocks">UNLOCKS</button><button data-t="settings">SETTINGS</button></div><div class="body"></div></div>';
        document.body.appendChild(hub);
        hub.addEventListener('click', function (e) { if (e.target === hub || e.target.classList.contains('close')) { hub.remove(); } });
        hub.querySelectorAll('.tabs button').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-t')); }); });
        function show(t) {
            hub.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
            var body = hub.querySelector('.body'), L = levelOf(S.xp), h = '';
            if (t === 'me') {
                h = '<div class="lv">LEVEL ' + (L.lvl < 10 ? '0' : '') + L.lvl + ' <small>' + L.into + ' / ' + L.next + ' XP</small></div><div class="xpbar"><b style="width:' + Math.round(L.into / L.next * 100) + '%"></b></div>' +
                    '<div style="color:#888">+10 XP effect applied · +25 composition finished · +50 render completed · +30 mission</div>' +
                    '<h3>TODAY</h3><div class="grid">' + stat('Effects', S.day.fx) + stat('Comps', S.day.comps) + stat('Renders', S.day.renders) + stat('Streak', S.streak.n + 'd') + '</div>' +
                    '<h3>ALL TIME</h3><div class="grid">' + stat('Effects', S.total.fx) + stat('Comps', S.total.comps) + stat('Renders', S.total.renders) + stat('Missions', S.total.missions) + '</div>' +
                    '<h3>BADGES</h3><div class="grid">' + BADGES.map(function (b) { return '<div class="it' + (S.badges[b.id] ? ' sel' : ' lock') + '" title="' + b.desc + '"><div style="font-size:18px">' + b.icon + '</div>' + b.name + '</div>'; }).join('') + '</div>';
                if (!S.set.xp) { h = '<div style="color:#888">The XP system is off. Turn it on in Settings.</div>'; }
            } else if (t === 'missions') {
                h = '<h3>DAILY MISSIONS</h3>' + (S.set.missions ? todaysMissions().map(function (m) {
                    var v = Math.min(m.goal, S.day[m.stat] || 0), d = !!S.day.done[m.id];
                    return '<div class="m' + (d ? ' done' : '') + '"><span class="ck">' + (d ? '✓' : '') + '</span>' + m.text + '<span class="p">' + (d ? 'DONE' : v + '/' + m.goal) + '</span></div>';
                }).join('') + (missionsDone() === 3 ? '<div style="text-align:center;font-weight:900;color:#fff;margin-top:8px">MISSION COMPLETE 🔥 Nice work.</div>' : '<div style="color:#888;margin-top:6px">New missions every day. Each one is +30 XP.</div>') : '<div style="color:#888">Daily missions are off. Turn them on in Settings.</div>');
            } else if (t === 'unlocks') {
                h = '<h3>PETS</h3><div class="grid">' + PETS.map(function (p) { return '<button class="it' + (unlocked(p) ? '' : ' lock') + (pet().id === p.id ? ' sel' : '') + '" data-pet="' + p.id + '">' + petSVG(p) + p.name + (unlocked(p) ? '' : '<br>LV ' + p.lvl) + '</button>'; }).join('') + '</div>' +
                    group('INTRO STYLE', INTROS, 'intro_style') + group('SOUND PACK', SOUNDPACKS, 'soundpack') + group('EVENT PACK', EVENTPACKS, 'eventpack') +
                    '<div style="color:#888;margin-top:8px">Unlocks are cosmetic only. Every tool is available at every level.</div>';
            } else {
                h = '<h3>PERSONALITY</h3>' + tog('pet', 'Pet') + tog('events', 'Random Events') + tog('xp', 'XP System') + tog('missions', 'Daily Missions') + tog('sounds', 'Sounds') + tog('intro', 'Opening Animation') +
                    '<div class="row"><span>Pet</span><select data-sel="petId">' + PETS.filter(unlocked).map(function (p) { return '<option value="' + p.id + '"' + (pet().id === p.id ? ' selected' : '') + '>' + p.name + '</option>'; }).join('') + '</select></div>' +
                    '<div class="row"><span>Frequency</span><span style="display:flex;align-items:center;gap:6px;color:#888">Rare<input type="range" min="1" max="4" step="1" data-num="freq" value="' + S.set.freq + '">Frequent</span></div>' +
                    '<div class="row"><span>🔊 Volume</span><input type="range" min="0" max="100" step="5" data-num="volume" value="' + S.set.volume + '"></div>' +
                    '<h3>LAYOUT</h3><div class="row"><span>Vertical panel layout (tabs on the left)</span><input type="checkbox" data-layout ' + (window.AkiraLayout && window.AkiraLayout.get() === 'vertical' ? 'checked' : '') + '></div>' +
                    '<h3>DO NOT DISTURB</h3>' + tog('dndRender', 'During rendering') + tog('dndPresent', 'During presentations (full screen or toggled below)') + tog('dndNight', 'After 23:00') +
                    '<div class="row"><span>I\'m presenting right now</span><input type="checkbox" data-present ' + (presenting ? 'checked' : '') + '></div>' +
                    '<div class="row"><span>Test sound</span><button class="it" data-test style="width:auto;padding:4px 10px">▶ Play</button></div>' +
                    '<div class="row" style="border:0"><span>Reset progress</span><button class="it" data-reset style="width:auto;padding:4px 10px;color:#ff6b6b">Reset</button></div>';
            }
            body.innerHTML = h;
            body.querySelectorAll('[data-pet]').forEach(function (b) { b.addEventListener('click', function () { var p = PETS.filter(function (x) { return x.id === b.getAttribute('data-pet'); })[0]; if (unlocked(p)) { S.set.petId = p.id; save(); render(); show(t); SFX.pet(); } }); });
            body.querySelectorAll('[data-opt]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-key'), it = { intro_style: INTROS, soundpack: SOUNDPACKS, eventpack: EVENTPACKS }[k].filter(function (x) { return x.id === b.getAttribute('data-opt'); })[0]; if (unlocked(it)) { S.set[k] = it.id; save(); show(t); if (k === 'soundpack') { SFX.level(); } } }); });
            body.querySelectorAll('[data-tog]').forEach(function (c) { c.addEventListener('change', function () { S.set[c.getAttribute('data-tog')] = c.checked; save(); render(); }); });
            body.querySelectorAll('[data-sel]').forEach(function (c) { c.addEventListener('change', function () { S.set[c.getAttribute('data-sel')] = c.value; save(); render(); }); });
            body.querySelectorAll('[data-num]').forEach(function (c) { c.addEventListener('change', function () { S.set[c.getAttribute('data-num')] = +c.value; save(); if (c.getAttribute('data-num') === 'freq') { scheduleEvent(); } else { SFX.pet(); } }); });
            var ly = body.querySelector('[data-layout]'); if (ly) { ly.addEventListener('change', function () { if (window.AkiraLayout) { window.AkiraLayout.set(ly.checked ? 'vertical' : 'horizontal'); } }); }
            var pr = body.querySelector('[data-present]'); if (pr) { pr.addEventListener('change', function () { presenting = pr.checked; }); }
            var ts = body.querySelector('[data-test]'); if (ts) { ts.addEventListener('click', function () { var was = S.set.sounds; S.set.sounds = true; var n = S.set.dndNight; S.set.dndNight = false; SFX.level(); S.set.sounds = was; S.set.dndNight = n; }); }
            var rs = body.querySelector('[data-reset]'); if (rs) { rs.addEventListener('click', function () { if (window.confirm('Reset level, XP, badges and missions? Settings are kept.')) { var keep = S.set; S = merge({ set: keep }, DEF); save(); render(); show('me'); } }); }
        }
        function stat(n, v) { return '<div class="it" style="cursor:default"><div style="font-size:15px;font-weight:900;color:#fff">' + v + '</div>' + n + '</div>'; }
        function tog(k, label) { return '<div class="row"><span>' + label + '</span><input type="checkbox" data-tog="' + k + '" ' + (S.set[k] ? 'checked' : '') + '></div>'; }
        function group(title, list, key) { return '<h3>' + title + '</h3><div class="grid">' + list.map(function (x) { return '<button class="it' + (unlocked(x) ? '' : ' lock') + (S.set[key] === x.id ? ' sel' : '') + '" data-opt="' + x.id + '" data-key="' + key + '">' + x.name + (unlocked(x) ? '' : '<br>LV ' + x.lvl) + '</button>'; }).join('') + '</div>'; }
        show(tab || 'me');
    }
    function poke() { if (!S.set.pet) { return; } setState('celebrate', 700); SFX.pet(); }

    // ---------- boot ----------
    function boot() {
        rollDay(); S.day.minsBase = S.day.mins || 0; hook(); mount(); scheduleEvent();
        intro();
        setTimeout(function () { setState('wake', 900); if (!dnd()) { say(pick(['Ready when you are.', "After Effects is open. Let's cook.", 'Back at it. Locked in?']), 3000); } }, S.set.intro ? 1500 : 300);
        setTimeout(poll, 4000); setInterval(poll, 15000); setInterval(tick, 60000);
    }
    window.AkiraPersonality = { open: openHub, xp: addXP, say: say, state: function () { return JSON.parse(JSON.stringify(S)); }, _reply: onHostReply };
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { setTimeout(boot, 0); }
})();
