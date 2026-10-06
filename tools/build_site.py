#!/usr/bin/env python3
"""Builds website/index.html (sougetsustore.com) from the original one-page design (docs/website_original_v5.html).
- product renamed to Sougetsu Akira FX, copy rewritten around features the panel really has
- hero: the REAL panel (website/panel/, built by tools/build_site_panel.py) inside the original 3D glass card, auto-touring
- "Try the panel": the real panel, clickable, in a framed window (lazy-loaded)
- one license: $89, or the launch price while SALE_ENDS is in the future; buy buttons -> Dodo checkout
- Download & Install section, SEO / Open Graph for sougetsustore.com
Settings you may change are in the CONFIG block of the page script (search for "CONFIG").
usage: python3 tools/build_site_panel.py && python3 tools/build_site.py"""
import json
import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'docs', 'website_original_v5.html')
OUT = os.path.join(ROOT, 'website', 'index.html')
SITE = 'https://sougetsustore.com/'
CHECKOUT = 'https://checkout.dodopayments.com/buy/pdt_0NowJEjPaMC6jAfdP2dI3?quantity=1&redirect_url=https://sougetsustore.com'
SALE_ENDS = '2026-10-07T00:00:00Z'   # launch price ends here (UTC). 18 h before this is when you should publish.
s = open(SRC, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    if old not in s:
        raise SystemExit('not found: ' + old[:90])
    s = s.replace(old, new) if count == 0 else s.replace(old, new, count)

def rex(pattern, new):
    global s
    s2, n = re.subn(pattern, lambda m: new, s, count=1, flags=re.S)
    if not n:
        raise SystemExit('pattern not found: ' + pattern[:90])
    s = s2

# ================================================================ head
rep('<title>Sougetsu Core</title>', '''<title>Sougetsu Akira FX · After Effects extension · Sougetsu</title>
<meta name="description" content="Sougetsu Akira FX is an After Effects extension: one panel with layer tools, Layer Morph, 81 editable templates, shakes, captions, a sound library and more. One license, free updates for life.">
<link rel="canonical" href="''' + SITE + '''">
<meta name="theme-color" content="#050505">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" as="image" href="assets/panel-poster.webp">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Sougetsu">
<meta property="og:title" content="Sougetsu Akira FX · Motion work, minus the busywork">
<meta property="og:description" content="One After Effects panel for the repetitive steps. Try it in your browser. Free updates for life.">
<meta property="og:url" content="''' + SITE + '''">
<meta property="og:image" content="''' + SITE + '''og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Sougetsu Akira FX · Motion work, minus the busywork">
<meta name="twitter:description" content="One After Effects panel for the repetitive steps. Try it in your browser.">
<meta name="twitter:image" content="''' + SITE + '''og-image.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Sougetsu Akira FX","brand":{"@type":"Brand","name":"Sougetsu"},"description":"After Effects extension for motion designers.","url":"''' + SITE + '''","image":"''' + SITE + '''og-image.png","offers":{"@type":"Offer","price":"89.00","priceCurrency":"USD","availability":"https://schema.org/InStock","url":"''' + SITE + '''#pricing"}}</script>''')

# ================================================================ nav
rep('<div class="links"><a href="#glue">Flow</a><a href="#how">How it works</a><a href="#week">Dashboard</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>',
    '<div class="links"><a href="#glue">Tools</a><a href="#try">Try the panel</a><a href="#how">How it works</a><a href="#pricing">Pricing</a><a href="#install">Install</a><a href="#faq">FAQ</a></div>')
rep('<button class="cart" aria-label="Cart">Cart<b id="cnt">0</b></button>',
    '<a class="cart buy" href="' + CHECKOUT + '" aria-label="Buy Sougetsu Akira FX">Buy<b class="js-price">$89</b></a>')

# ================================================================ hero
rep('<span class="pill"><i></i>48 presets · new ones every month</span>', '<span class="pill"><i></i>11 tabs · 81 templates · free updates for life</span>')
rep('<p class="lead">Sougetsu Core runs the repetitive steps inside After Effects, so you only touch what needs your eye.</p>',
    '<p class="lead">Sougetsu Akira FX is one panel inside After Effects for the repetitive steps, so you only touch what needs your eye.</p>')
rep('<a class="btn" href="#pricing">Get Core · $89</a><a class="btn g" href="#how">See how it works</a>',
    '<a class="btn buy" href="' + CHECKOUT + '">Get Sougetsu Akira FX · <span class="js-price">$89</span></a><a class="btn g" href="#try">Try the panel</a>')
rep('<p class="note">Instant download · Windows &amp; macOS · After Effects 2022+</p>', '<p class="note">Instant download · Windows &amp; macOS · After Effects 2022+</p>')
# the glass card now holds the real panel (auto tour); the 3D tilt, glare and scan line of the original card stay
rex(r'<div class="tb"><b>Title card.*?<div class="gs"></div></div></div>',
    '<div class="tb"><b>Sougetsu Akira FX</b><span>live panel</span></div>'
    '<div class="hp" id="hp"><iframe id="heroPanel" title="Sougetsu Akira FX panel, touring its tabs" src="panel/index.html?tour=1" loading="eager" tabindex="-1" aria-hidden="true"></iframe></div>'
    '<a class="hp-cta" href="#try">Click to try it ↓</a><div class="gs"></div></div></div>')

# ================================================================ feature strip (was "connects to every Adobe app")
rex(r'<section class="apps">.*?</section>',
    '<section class="apps"><div class="wrap rv"><p>eleven tabs, one panel, docked inside After Effects</p><div class="ar">'
    + ''.join('<div class="ap"><b>%s</b><span>%s</span></div>' % x for x in [
        ('CT', 'core toolkit'), ('FX', 'effects lab'), ('SF', 'shape forge'), ('TS', 'type studio'), ('TL', 'timeline'), ('CL', 'color lab'),
        ('CV', 'comp vault'), ('MC', 'motion curves'), ('EB', 'edit bay'), ('SL', 'sound lab'), ('NB', 'notes board')])
    + '</div></div></section>')

# ================================================================ tools section (was "workflow")
rep('<span class="pill"><i></i>workflow</span><h2>Most of an edit is <em>busywork.</em></h2></div><p>Select this, apply that. Check it went through. Ask the client if it is fine. Core takes the busywork and leaves you the decisions.</p>',
    '<span class="pill"><i></i>tools</span><h2>Most of an edit is <em>busywork.</em></h2></div><p>Select this, apply that, nudge it, do it again. Sougetsu Akira FX turns those steps into one click and leaves you the decisions. Everything it builds stays editable.</p>')
rep('<h3>One panel, every layer</h3><p>Drop in a layer, add a preset, split into variants. A step that fails at 3am is retried four times.</p>',
    '<h3>One click, one undo</h3><p>Auto Bounce, Overshoot, Split Text, Clean Duplicate, Precomp Each, Paste from Clipboard, an anchor grid and Null / Adjustment / Solid in one row. Each tool is a single undo step.</p>')
rep('<div class="gk">run 41982</div>', '<div class="gk">layer morph · 3 layers</div>')
rep('<span>read layers</span>', '<span>read selection</span>')
rep('<span>apply preset</span>', '<span>arc to the target</span>')
rep('<span>branch, 3 variants</span>', '<span>match size &amp; angle</span>')
rep('<span>ask for OK</span>', '<span>hand over to target</span>')
rep('<h3>Renders wait for your OK</h3><p>Core posts the finished cut and you approve or tweak. Nothing leaves the queue without you.</p>',
    '<h3>A companion that keeps score</h3><p>A small pet lives in the panel corner: it naps when you are idle, cheers finished renders and hands out daily missions and XP. Cosmetic only, and every part can be turned off.</p>')
rep('<div class="gk">#renders<span>today</span></div><div class="mg"><b>Core</b><p>Client cut v3 is ready. 3 variants rendered.</p></div><div class="mg"><b>Core</b><p>Needs your OK before it goes out.</p><span class="bt">Approve</span><span class="bt">Tweak</span></div><div class="mg me"><b>You</b><p>Approved. Send it.</p></div>',
    '<div class="gk">#companion<span>today</span></div><div class="mg"><b>Shadow Ninja</b><p>Comp queued. Looking sharp.</p></div><div class="mg"><b>Shadow Ninja</b><p>MISSION COMPLETE 🔥 Apply 3 presets · Nice work.</p><span class="bt">+30 XP</span><span class="bt">LV 04</span></div><div class="mg me"><b>You</b><p>Render done. Next shot.</p></div>')
rep('<h3>The whole queue, at a glance</h3><p>Intro, reel, lower thirds. Every job runs side by side while you grade the next shot.</p>',
    '<h3>81 templates, built as real layers</h3><p>Chat bubbles, UI cards, charts, lower thirds and more. Fill in the fields, preview the motion, and Templates builds an editable comp with its own animation controls.</p>')
rep('<div class="gk">queue 7</div>', '<div class="gk">templates · build</div>')
rep('<span>intro title</span>', '<span>chat bubble</span>')
rep('<span>product reel</span>', '<span>analytics card</span>')
rep('<span>lower thirds</span>', '<span>lower third</span>')

# ================================================================ companion week (was the dashboard)
rep('<h2>A week with Core, <em>at a glance.</em></h2><p class="sec-p">See what the panel did for you while you worked on the shots that matter.</p>',
    '<h2>Your week, <em>kept by your companion.</em></h2><p class="sec-p">The panel counts effects applied, comps finished and renders done, turns them into XP and daily missions, and unlocks pets, intros and sound packs.</p>')
rep('<span class="on">Overview</span><span>Presets</span><span>Renders</span>', '<span class="on">Level</span><span>Missions</span><span>Unlocks</span>')
rep('<small>Hours saved <em>+12%</em></small><strong data-c="14.2" data-d="1">0</strong>', '<small>XP this week <em>LV 04</em></small><strong data-c="1260">0</strong>')
rep('<small>Presets applied <em>+8%</em></small><strong data-c="126">0</strong>', '<small>Effects applied <em>+10 XP each</em></small><strong data-c="74">0</strong>')
rep('<small>Renders sent <em>+21%</em></small><strong data-c="38">0</strong>', '<small>Comps finished <em>+25 XP</em></small><strong data-c="12">0</strong>')
rep('<small>Queue time, min <em>-6%</em></small><strong data-c="3.4" data-d="1">0</strong>', '<small>Renders done <em>+50 XP</em></small><strong data-c="9">0</strong>')
rep('<li><i></i><b>Intro title</b><small>Pop-in applied</small></li><li><i></i><b>Product reel</b><small>Glow added</small></li><li><i></i><b>Lower thirds</b><small>12 presets</small></li><li class="w"><i></i><b>Client cut v3</b><small>In queue</small></li>',
    '<li><i></i><b>Layer Morph</b><small>+10 XP</small></li><li><i></i><b>Mission complete</b><small>Apply 3 presets</small></li><li><i></i><b>Render complete</b><small>+50 XP</small></li><li class="w"><i></i><b>Next unlock</b><small>Spirit Fox · LV 05</small></li>')
rep('<p class="ill rv">Illustrative numbers.</p>', '<p class="ill rv">Example numbers. The companion, XP and missions can each be switched off in settings.</p>')

# ================================================================ how it works
rep('<h3>Choose a preset</h3><p>Preview any of the 48 styles before it touches your comp.</p>', '<h3>Press a tool</h3><p>Or pick one of 81 templates and preview its motion right in the panel before it touches your comp.</p>')
rep('<h3>Dial it in and render</h3><p>Fine-tune with sliders, then send it to the queue.</p>', '<h3>Tweak and render</h3><p>Everything stays editable: sliders live in Effect Controls and one Ctrl+Z takes a step back.</p>')

# ================================================================ pricing: one license, launch price with a real deadline
rex(r'<section class="s" id="pricing">.*?</section>', '''<section class="s" id="pricing"><div class="wrap">
 <div class="hd rv"><h2>One license. <em>Every tool.</em></h2></div>
 <div class="pr rv"><div><div class="big"><span id="tot" class="js-price">$89</span><s id="old" hidden>$89</s></div><p class="pm2" id="per">One-time payment · per user</p>
  <ul class="in2"><li>Every tab and tool in the panel</li><li>Free updates for life</li><li>Download link + license key by email</li></ul>
  <a class="btn buy" id="add" href="''' + CHECKOUT + '''">Get Sougetsu Akira FX · <span class="js-price">$89</span></a>
  <p class="dl-note">Download link + license key are emailed right after checkout. Secure payment by Dodo Payments.</p></div>
  <div class="sale" id="sale" hidden><span class="pill"><i></i>launch price</span><p class="sale-h">$49.99 instead of $89</p><p class="sale-t">ends in</p>
   <div class="cd" id="cd" role="timer" aria-live="off"><div><b id="cdH">00</b><small>hours</small></div><div><b id="cdM">00</b><small>min</small></div><div><b id="cdS">00</b><small>sec</small></div></div>
   <p class="sale-f">After the timer runs out the price goes back to $89.</p></div>
  <div class="sale" id="nosale"><span class="pill"><i></i>what you get</span><p class="sale-h">Sougetsu Akira FX</p><p class="sale-f">Install with a ZXP installer, paste your key, done. Works on After Effects 2022 and newer, Windows and macOS.</p></div></div>
</div></section>''')

# ================================================================ reviews: generic placeholders
rep('<p>Core completely changed my workflow. The presets alone are worth it.</p><small>Alex M., motion designer</small>',
    '<p>Sougetsu Akira FX completely changed my workflow.</p><small>Motion designer · placeholder review</small>')
rep('<small>Jordan K., YouTuber</small>', '<small>YouTuber · placeholder review</small>')
rep('<small>Sam R., agency owner</small>', '<small>Agency owner · placeholder review</small>')

# ================================================================ FAQ
rex(r'<details><summary>Which After Effects versions work\?</summary>.*?</div></div></section>', '''<details><summary>Which After Effects versions work?</summary><p>After Effects 2022 and newer, on Windows and macOS.</p></details>
 <details><summary>How do I get it?</summary><p>Download link + license key are emailed right after checkout. Install steps are <a href="#install" class="ul">below</a>.</p></details>
 <details><summary>How do I install it?</summary><p>Install the .zxp with the free aescripts ZXP Installer (or ZXPInstaller), restart After Effects, open Window &gt; Extensions &gt; Sougetsu Akira FX and paste your license key. <a href="#install" class="ul">Full steps</a>.</p></details>
 <details><summary>Do I pay for updates?</summary><p>No. Every future update is free once you own Sougetsu Akira FX.</p></details>
 <details><summary>Is the panel on this page the real one?</summary><p>Yes, it is the real panel interface running in your browser. The tools themselves need After Effects, so clicking them here only shows a preview message.</p></details>
 <details><summary>I lost my license key or download link.</summary><p>Search your inbox for the Dodo Payments receipt from your purchase, it has both. Still stuck? Email <a class="ul" href="mailto:support@sougetsustore.com">support@sougetsustore.com</a>.</p></details></div></div></section>''')

rep('<a class="btn rv" href="#pricing">Get Core · $89</a>', '<a class="btn rv buy" href="' + CHECKOUT + '">Get Sougetsu Akira FX · <span class="js-price">$89</span></a>')
rep('<footer><span>© 2026 Sougetsu</span><span>Instant digital download</span></footer>',
    '<footer><span>© 2026 Sougetsu · <a href="' + SITE + '">sougetsustore.com</a></span><span><a href="#install">Install guide</a> · <a href="mailto:support@sougetsustore.com">support@sougetsustore.com</a> · Instant digital download</span></footer>')

# ================================================================ new sections: try the panel, install
TRY = r'''
<section class="s" id="try"><div class="wrap tp">
 <div class="tp-copy rv"><span class="pill"><i></i>try it here</span><h2>The real panel, <em>in your browser.</em></h2>
  <p class="sec-p">Click through every tab: the anchor grid, Effects Lab, Shape Forge with Layer Morph and Templates, Type Studio, Color Lab, Motion Curves, Sound Lab and the rest.</p>
  <ul class="tp-list"><li><b>Core Toolkit</b>Anchor grid, Null / Adjustment / Solid, Precomp Each, Overshoot, Auto Bounce, Split Text, Clean Duplicate, Paste from Clipboard, focus timer</li>
   <li><b>Effects Lab</b>Orb Cloner, UI Motion Kit, Silence Cutter, Auto Subtitles, Text Highlighter, Proximity Effector, 3D Depth, Count Up, Frosted Glass, Camera Shake, Map Animator</li>
   <li><b>Shape Forge</b>Shapes, Layer &amp; Path Morph, Morph Studio, Layout Grid, 81 UI Templates</li>
   <li><b>And more</b>Type Studio, Timeline Control, Color Lab, Comp Vault, Motion Curves, Edit Bay, Sound Lab, Notes Board, themes</li></ul>
 </div>
 <div class="tp-win rv"><div class="tp-bar"><i></i><i></i><i></i><span>Sougetsu Akira FX</span></div>
  <div class="tp-frame" id="tryFrame"><img src="assets/panel-poster.webp" alt="Sougetsu Akira FX panel" width="400" height="720"><button class="tp-load" id="tryLoad" type="button">▶ Load the interactive panel</button></div>
  <p class="tp-banner">Interactive preview. The real tools run inside After Effects after you install the extension.</p></div>
</div></section>
'''
INSTALL = r'''
<section class="s" id="install"><div class="wrap">
 <div class="hd rv"><span class="pill"><i></i>download &amp; install</span><h2 style="margin-top:22px">Up and running <em>in two minutes.</em></h2><p class="sec-p">Everything arrives by email right after checkout: your download link and your license key.</p></div>
 <div class="ins rv">
  <div class="ins-c"><small>01</small><h3>Download the .zxp</h3><p>Open the email from your purchase and download <code>SougetsuAkiraFX.zxp</code>. Your license key is in the same email.</p></div>
  <div class="ins-c"><small>02</small><h3>Install it</h3><p>Close After Effects. Open the free <a class="ul" href="https://aescripts.com/learn/zxp-installer/" target="_blank" rel="noopener">aescripts ZXP Installer</a> (or ZXPInstaller) and drag the .zxp onto it.</p></div>
  <div class="ins-c"><small>03</small><h3>Open the panel</h3><p>Start After Effects: <code>Window &gt; Extensions &gt; Sougetsu Akira FX</code>. On AE 2024 and newer it is under <code>Extensions (Legacy)</code>.</p></div>
  <div class="ins-c"><small>04</small><h3>Unlock it</h3><p>Paste the license key from your purchase email into the panel and press <code>Unlock</code>. Done.</p></div>
 </div>
 <div class="ins-more rv">
  <details><summary>The panel doesn't show up</summary><ol><li>Restart After Effects after installing.</li><li>Look under <code>Window &gt; Extensions (Legacy)</code> on AE 2024 and newer.</li><li>Check you are on After Effects 2022 or newer.</li><li>Reinstall the .zxp with the ZXP Installer and restart AE.</li></ol></details>
  <details><summary>Install without a ZXP installer (Windows)</summary><p>Run Command Prompt as administrator:</p><p><code>"C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "%USERPROFILE%\Downloads\SougetsuAkiraFX.zxp"</code></p></details>
  <details><summary>Scripts can't write files</summary><p>In After Effects open <code>Edit &gt; Preferences &gt; Scripting &amp; Expressions</code> (macOS: <code>After Effects &gt; Settings</code>) and turn on <code>Allow Scripts to Write Files and Access Network</code>.</p></details>
  <details><summary>Need help?</summary><p>Email <a class="ul" href="mailto:support@sougetsustore.com">support@sougetsustore.com</a> with your order email and a screenshot.</p></details>
 </div>
</div></section>
'''
rep('<section class="s gl" id="glue">', TRY + '<section class="s gl" id="glue">')
rep('<section class="s" id="reviews">', INSTALL + '\n<section class="s" id="reviews">')

# ================================================================ CSS
CSS = r'''
/* ---------- added for sougetsustore.com ---------- */
.cart{display:inline-flex;align-items:center;gap:8px}
a.ul{color:var(--ac2);text-decoration:underline;text-underline-offset:3px}
footer a:hover{color:var(--tx)}
.dl-note{margin-top:14px;font-size:13px;color:var(--mu);max-width:340px}
/* hero: the real panel inside the glass card */
.glass3d{max-width:430px;margin-left:auto;margin-right:auto}
.hp{position:relative;margin:14px 16px 0;height:var(--hph,560px);border-radius:14px;overflow:hidden;background:#232323 url(assets/panel-poster.webp) top center/100% auto no-repeat;transform:translateZ(14px);box-shadow:0 0 0 1px rgba(255,255,255,.06),0 20px 50px -20px rgba(0,0,0,.8)}
.hp iframe{position:absolute;left:0;top:0;width:400px;height:720px;border:0;transform-origin:0 0;transform:scale(var(--hps,.9));pointer-events:none;background:transparent}
.hp::after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 -60px 50px -40px rgba(5,5,5,.75)}
.hp-cta{position:relative;display:block;text-align:center;padding:12px 0 16px;font-size:12.5px;color:var(--ac2);transform:translateZ(20px)}
.hp-cta:hover{color:#fff}
/* try the panel */
#try .tp{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:64px;align-items:start}
.tp-list{list-style:none;margin-top:28px;display:grid;gap:14px;color:var(--mu);font-size:14px;max-width:520px}
.tp-list b{display:block;color:var(--tx);font-weight:500;font-size:15px;margin-bottom:2px}
.tp-win{width:min(420px,calc(100vw - 48px));border-radius:16px;overflow:hidden;border:1px solid var(--ln);background:#161616;box-shadow:0 50px 140px -40px rgba(163,230,53,.35),0 30px 70px -30px #000}
.tp-bar{display:flex;align-items:center;gap:6px;height:30px;padding:0 12px;background:#101010;border-bottom:1px solid rgba(255,255,255,.06);font-size:11.5px;color:#9a9a9a}
.tp-bar i{width:9px;height:9px;border-radius:50%;background:#2c2c2c}.tp-bar i:first-child{background:#3b3b3b}
.tp-bar span{margin-left:8px;letter-spacing:.02em}
.tp-frame{position:relative;height:720px;background:#232323}
.tp-frame img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.tp-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#232323}
.tp-load{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:46px;padding:0 22px;border-radius:100px;background:var(--ac);color:#0a1400;font-weight:500;box-shadow:0 10px 40px rgba(163,230,53,.4)}
.tp-banner{padding:12px 16px;font-size:12.5px;color:var(--ac2);background:rgba(163,230,53,.06);border-top:1px solid var(--ln)}
@media(max-width:980px){#try .tp{grid-template-columns:1fr;gap:40px}.tp-win{margin:0 auto}}
@media(max-width:480px){.tp-frame{height:640px}}
/* pricing: launch price */
.sale{display:grid;gap:12px;align-content:center}.sale[hidden]{display:none}
.sale-h{font-size:28px;font-weight:500;letter-spacing:-.03em}
.sale-t{color:var(--mu);font-size:13px;margin-top:6px}
.sale-f{color:var(--mu);font-size:14px}
.cd{display:flex;gap:10px}
.cd div{min-width:78px;padding:14px 10px;border-radius:14px;border:1px solid var(--ln);background:rgba(12,16,8,.7);text-align:center}
.cd b{display:block;font-size:34px;font-weight:500;letter-spacing:-.04em;font-variant-numeric:tabular-nums;color:var(--ac2)}
.cd small{color:var(--mu);font-size:11px}
/* download & install */
.ins{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.ins-c{position:relative;border:1px solid var(--ln);border-radius:18px;padding:26px 22px;background:linear-gradient(160deg,rgba(24,32,12,.45),rgba(8,10,6,.85))}
.ins-c small{font-family:ui-monospace,Menlo,monospace;color:var(--ac);font-size:12px;letter-spacing:.06em}
.ins-c h3{font-weight:500;font-size:19px;letter-spacing:-.02em;margin:10px 0 8px}
.ins-c p{color:var(--mu);font-size:14.5px}
.ins-c code,.ins-more code{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:var(--ac2);background:rgba(163,230,53,.07);padding:2px 6px;border-radius:5px;word-break:break-word}
.ins-more{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ins-more details{border:1px solid var(--ln);border-radius:14px;padding:16px 20px}
.ins-more summary{font-size:15px}
.ins-more p,.ins-more li{color:var(--mu);font-size:14px;margin-top:10px}
.ins-more ol{padding-left:18px}
@media(max-width:900px){.ins{grid-template-columns:1fr 1fr}.ins-more{grid-template-columns:1fr}}
@media(max-width:560px){.ins{grid-template-columns:1fr}.cd div{min-width:0;flex:1}}
'''
rep('</style>', CSS + '</style>')

# ================================================================ JS
# the original hero "flow" card is gone: keep the function name, drop its body
rex(r'function runFlow\(\)\{.*?setInterval\(\(\)=>\{i=i>=5\?-1:i\+1;set\(\)\},1300\)\}', 'function runFlow(){}')
JS = r'''
/* ---------- CONFIG ---------- */
const CHECKOUT_URL='__CHECKOUT__';      // Dodo payment link (regular price)
const SALE_CHECKOUT_URL=CHECKOUT_URL;   // Dodo link that charges the launch price ($49.99). Must charge 49.99 while the sale runs!
const SALE_ENDS='__SALE_ENDS__';        // launch price ends at this moment (UTC, ISO 8601). After it: $89 everywhere.
const PRICE='$89',SALE_PRICE='$49.99';
/* ---------- price + checkout ---------- */
function saleLeft(){const t=Date.parse(SALE_ENDS);return isNaN(t)?0:t-Date.now()}
function applyPrice(){const on=saleLeft()>0;
 $$('.js-price').forEach(e=>e.textContent=on?SALE_PRICE:PRICE);$$('a.buy').forEach(a=>a.href=on?SALE_CHECKOUT_URL:CHECKOUT_URL);
 const old=$('#old');if(old){old.hidden=!on;old.textContent=PRICE}
 const sl=$('#sale'),ns=$('#nosale');if(sl){sl.hidden=!on;ns.hidden=on}
 $('#per').textContent=on?'Launch price · one-time payment':'One-time payment · per user'}
function tick(){const ms=saleLeft();if(ms<=0){applyPrice();return}const h=Math.floor(ms/3.6e6),m=Math.floor(ms%3.6e6/6e4),sc=Math.floor(ms%6e4/1e3),p=n=>String(n).padStart(2,'0');
 $('#cdH').textContent=p(h);$('#cdM').textContent=p(m);$('#cdS').textContent=p(sc)}
applyPrice();tick();setInterval(tick,1000);
/* ---------- hero panel: scale the 400px-wide panel to the glass card ---------- */
function fitHero(){const hp=$('#hp');if(!hp)return;const w=hp.clientWidth||360,k=w/400;hp.style.setProperty('--hps',k);hp.style.setProperty('--hph',Math.round(Math.min(720*k,innerHeight*.62))+'px')}
fitHero();addEventListener('resize',fitHero);
/* ---------- try the panel: load on click, or when it scrolls into view on desktop ---------- */
const tf=$('#tryFrame');
function loadTry(){if(!tf||tf.querySelector('iframe'))return;const f=document.createElement('iframe');f.src='panel/index.html';f.title='Sougetsu Akira FX panel, interactive preview';f.setAttribute('allow','autoplay');tf.appendChild(f);const b=$('#tryLoad');if(b)b.remove()}
$('#tryLoad').addEventListener('click',loadTry);
if(innerWidth>=900&&'IntersectionObserver'in window){const o=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){loadTry();o.disconnect()}},{rootMargin:'300px'});o.observe(tf)}
'''.replace('__CHECKOUT__', CHECKOUT).replace('__SALE_ENDS__', SALE_ENDS)
rex(r'/\* ---------- pricing meter ---------- \*/.*?\}\)\;\n\}\)\(\);', JS + '\n})();')
rep("e.target.closest('a,button,summary,input,.pm')", "e.target.closest('a,button,summary,input,.pm,iframe')")


# ---------- EN / RU language switch: tools/site/ru.json is applied to the page's text nodes by tools/site/lang.js ----------
_SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site')
RU = json.load(open(os.path.join(_SITE, 'ru.json'), encoding='utf-8'))
s = s.replace('<div class="nr"><span class="stat">', '<div class="nr"><div class="lang" role="group" aria-label="Language"><button type="button" data-lang="en">EN</button><button type="button" data-lang="ru">RU</button></div><span class="stat">', 1)
s = s.replace('</style>', '#nav a{white-space:nowrap}@media(max-width:1400px){html[lang=ru] .nr .stat{display:none}}.lang{flex:none;display:inline-flex;border:1px solid rgba(255,255,255,.18);border-radius:999px;overflow:hidden;margin-right:10px}.lang button{background:none;border:0;color:#aaa;font:700 11px/1 inherit;padding:6px 9px;min-width:30px;cursor:pointer}.lang button[aria-pressed=true]{background:rgba(255,255,255,.14);color:#fff}</style>', 1)
s = s.replace('</body>', '<script>' + open(os.path.join(_SITE, 'lang.js'), encoding='utf-8').read().replace('__RU__', json.dumps(RU, ensure_ascii=False)) + '</script></body>', 1)
s = s.replace("$('#per').textContent=on?'Launch price · one-time payment':'One-time payment · per user'", "$('#per').textContent=on?'Launch price · one-time payment':'One-time payment · per user';window.__applyLang&&__applyLang()")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(s)
left = [m.group(0) for m in re.finditer(r'.{0,40}\b(Core|Flex|48 presets|Glow Engine|Premiere|Resolve|Frame\.io)\b.{0,30}', s) if 'Core Toolkit' not in m.group(0) and 'core toolkit' not in m.group(0)]
print('wrote', OUT, len(s), 'bytes; leftovers:', left)
