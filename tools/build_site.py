#!/usr/bin/env python3
"""Builds website/index.html from the original one-page design (docs/website_original_v5.html):
rebrand (Sougetsu Akira FX), SEO/OG tags for sougetsustore.com, Dodo checkout wiring, the interactive panel preview
section and the Download & Install section. Re-run after editing the fragments below.
usage: python3 tools/build_site.py"""
import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'docs', 'website_original_v5.html')
OUT = os.path.join(ROOT, 'website', 'index.html')
SITE = 'https://sougetsustore.com/'
s = open(SRC, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n < 1:
        raise SystemExit('not found: ' + old[:80])
    s = s.replace(old, new) if count == 0 else s.replace(old, new, count)

# ---------------------------------------------------------------- head: title, SEO, social cards, favicon
rep('<title>Sougetsu Core</title>', '''<title>Sougetsu Akira FX · After Effects extension · Sougetsu</title>
<meta name="description" content="Sougetsu Akira FX is an After Effects extension that runs the repetitive steps for you, so you only touch what needs your eye. $89, free updates for life.">
<link rel="canonical" href="''' + SITE + '''">
<meta name="theme-color" content="#050505">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Sougetsu">
<meta property="og:title" content="Sougetsu Akira FX · Motion work, minus the busywork">
<meta property="og:description" content="An After Effects extension that runs the repetitive steps for you. $89 · free updates for life.">
<meta property="og:url" content="''' + SITE + '''">
<meta property="og:image" content="''' + SITE + '''og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Sougetsu Akira FX · Motion work, minus the busywork">
<meta name="twitter:description" content="An After Effects extension that runs the repetitive steps for you. $89 · free updates for life.">
<meta name="twitter:image" content="''' + SITE + '''og-image.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Sougetsu Akira FX","brand":{"@type":"Brand","name":"Sougetsu"},"description":"After Effects extension for motion designers.","url":"''' + SITE + '''","image":"''' + SITE + '''og-image.png","offers":{"@type":"Offer","price":"89","priceCurrency":"USD","availability":"https://schema.org/InStock","url":"''' + SITE + '''#pricing"}}</script>''')

# ---------------------------------------------------------------- rebrand (copy otherwise unchanged)
rep('<p class="lead">Sougetsu Core runs the repetitive steps', '<p class="lead">Sougetsu Akira FX runs the repetitive steps')
rep('<a class="btn" href="#pricing">Get Core · $89</a><a class="btn g" href="#how">See how it works</a>',
    '<a class="btn buy" href="DODO_CHECKOUT_URL">Get Sougetsu Akira FX · $89</a><a class="btn g" href="#preview">Try the panel</a>')
rep('Ask the client if it is fine. Core takes the busywork', 'Ask the client if it is fine. Sougetsu Akira FX takes the busywork')
rep('<p>Core posts the finished cut', '<p>Akira FX posts the finished cut')
rep('<div class="mg"><b>Core</b>', '<div class="mg"><b>Akira FX</b>', 0)
rep('<h2>A week with Core, <em>at a glance.</em></h2>', '<h2>A week with Akira FX, <em>at a glance.</em></h2>')
rep('<p>No. Every future update is free once you own Core.</p>', '<p>No. Every future update is free once you own Sougetsu Akira FX.</p>')
rep('<a class="btn rv" href="#pricing">Get Core · $89</a>', '<a class="btn rv buy" href="DODO_CHECKOUT_URL">Get Sougetsu Akira FX · $89</a>')
rep("t.textContent='Sougetsu Core · '+$('#sn').textContent+' added to cart'", "t.textContent='Sougetsu Akira FX · '+$('#sn').textContent")

# reviews: generic + clearly marked placeholders (no invented people)
rep('<p>Core completely changed my workflow. The presets alone are worth it.</p><small>Alex M., motion designer</small>',
    '<p>Sougetsu Akira FX completely changed my workflow. The presets alone are worth it.</p><small>Motion designer · placeholder review</small>')
rep('<small>Jordan K., YouTuber</small>', '<small>YouTuber · placeholder review</small>')
rep('<small>Sam R., agency owner</small>', '<small>Agency owner · placeholder review</small>')

# nav: preview + install links, cart -> buy
rep('<a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>', '<a href="#preview">Preview</a><a href="#pricing">Pricing</a><a href="#install">Install</a><a href="#faq">FAQ</a></div>')
rep('<button class="cart" aria-label="Cart">Cart<b id="cnt">0</b></button>', '<a class="cart buy" href="DODO_CHECKOUT_URL" aria-label="Buy Sougetsu Akira FX">Buy<b id="cnt">$89</b></a>')

# pricing: checkout button + delivery note
rep('<button class="btn" id="add">Add to cart</button></div>',
    '<a class="btn buy" id="add" href="DODO_CHECKOUT_URL">Get Sougetsu Akira FX · $89</a><p class="dl-note">Download link + license key sent to your email right after checkout. Secure payment by Dodo Payments.</p></div>')

# FAQ
rep('<details><summary>How do I get it?</summary><p>You get a download link right after checkout, with install steps included.</p></details>',
    '<details><summary>How do I get it?</summary><p>Download link + license key sent to your email right after checkout. Install steps are <a href="#install" class="ul">below</a> and in the email.</p></details>\n'
    ' <details><summary>How do I install it?</summary><p>Install the .zxp with the free aescripts ZXP Installer, restart After Effects, open Window &gt; Extensions &gt; Sougetsu Akira FX and paste your license key. <a href="#install" class="ul">Full steps</a>.</p></details>\n'
    ' <details><summary>I lost my license key or download link.</summary><p>Search your inbox for the Dodo Payments receipt from your purchase, it has both. Still stuck? Email <a class="ul" href="mailto:support@sougetsustore.com">support@sougetsustore.com</a>.</p></details>')

# footer
rep('<footer><span>© 2026 Sougetsu</span><span>Instant digital download</span></footer>',
    '<footer><span>© 2026 Sougetsu · <a href="' + SITE + '">sougetsustore.com</a></span><span><a href="#install">Install guide</a> · <a href="mailto:support@sougetsustore.com">support@sougetsustore.com</a> · Instant digital download</span></footer>')

# ---------------------------------------------------------------- new CSS
CSS = r'''
/* ---------- added: buy links, notes ---------- */
.cart{display:inline-flex;align-items:center;gap:8px}
.dl-note{margin-top:14px;font-size:13px;color:var(--mu);max-width:340px}
a.ul{color:var(--ac2);text-decoration:underline;text-underline-offset:3px}
footer a:hover{color:var(--tx)}
/* ---------- interactive panel preview ---------- */
#preview .pv{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:56px;align-items:start}
.pv-copy .sec-p{max-width:420px}
.pv-label{display:inline-flex;align-items:center;gap:8px;margin-top:22px;font-size:12.5px;color:var(--ac2);padding:8px 14px;border-radius:100px;border:1px dashed rgba(190,235,120,.4);background:rgba(163,230,53,.05)}
.pv-tips{margin-top:26px;display:grid;gap:10px;color:var(--mu);font-size:14px;list-style:none}
.pv-tips li{display:flex;gap:10px;align-items:baseline}.pv-tips li b{color:var(--tx);font-weight:500;min-width:110px}
.pnl{--pa:var(--ac);display:grid;grid-template-columns:52px minmax(0,1fr);gap:10px;padding:12px;border-radius:18px;background:#1d1d1d;border:1px solid rgba(255,255,255,.08);box-shadow:0 50px 120px -40px rgba(163,230,53,.25),0 30px 60px -30px #000;font-family:Geist,Inter,system-ui,sans-serif;user-select:none;-webkit-user-select:none}
.pnl-top{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:2px 4px 4px}
.pnl-pill{display:inline-flex;align-items:center;gap:7px;height:24px;padding:0 11px;border-radius:12px;background:#131313;font:700 9.5px Geist,sans-serif;letter-spacing:.8px;color:#aaa}
.pnl-pill i{width:6px;height:6px;border-radius:50%;background:var(--pa);box-shadow:0 0 8px var(--pa)}
.pnl-pill.r{border:1px solid var(--pa);color:var(--pa);box-shadow:0 0 12px rgba(163,230,53,.25)}
.pnl-rail{display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:12px;border:1px solid rgba(255,255,255,.06);background:#202020;align-self:start}
.pnl-rail button{width:38px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#8a8a8a;transition:background .15s,color .15s}
.pnl-rail button:hover{color:#ddd;background:rgba(255,255,255,.05)}.pnl-rail button.on{color:var(--pa);background:rgba(163,230,53,.12)}
.pnl-rail svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pnl-main{display:flex;flex-direction:column;gap:10px;min-width:0}
.pnl-tabname{font:700 10px Geist,sans-serif;letter-spacing:1.4px;color:#777;padding:2px 2px 0}
.comp{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#0d0d0d;border:1px solid rgba(255,255,255,.07)}
.comp::before{content:"";position:absolute;inset:0;background-image:linear-gradient(45deg,#141414 25%,transparent 25%,transparent 75%,#141414 75%),linear-gradient(45deg,#141414 25%,transparent 25%,transparent 75%,#141414 75%);background-size:20px 20px;background-position:0 0,10px 10px;opacity:.6}
.comp-hd{position:absolute;left:10px;top:8px;font:600 9px ui-monospace,Menlo,monospace;color:#666;letter-spacing:.5px;z-index:3}
.comp-hd b{color:var(--pa);font-weight:600}
.comp-tag{position:absolute;right:10px;top:8px;font:600 9px ui-monospace,Menlo,monospace;color:#888;z-index:3;transition:color .2s}
.comp-tag.after{color:var(--pa)}
.comp-guides{position:absolute;inset:0;pointer-events:none;z-index:1}
.comp-guides i{position:absolute;background:rgba(163,230,53,.18)}.comp-guides .gx{left:50%;top:0;bottom:0;width:1px}.comp-guides .gy{top:50%;left:0;right:0;height:1px}
.lyr{position:absolute;z-index:2;left:22%;top:30%;width:15%;aspect-ratio:1;border-radius:14%;background:linear-gradient(140deg,var(--ac2),var(--ac));box-shadow:0 0 0 1px rgba(255,255,255,.15) inset,0 10px 30px -10px rgba(163,230,53,.6);transition:none}
.lyr.sel{outline:1.5px solid #4ea8ff;outline-offset:3px}
.lyr.b{left:66%;top:52%;width:12%;border-radius:50%;background:linear-gradient(140deg,#7cc8ff,#3b82f6);box-shadow:0 10px 30px -10px rgba(59,130,246,.7)}
.lyr.t{width:auto;aspect-ratio:auto;left:50%;top:50%;transform:translate(-50%,-50%);background:none;box-shadow:none;border-radius:0;font:600 clamp(18px,3.2vw,34px)/1 Geist,sans-serif;letter-spacing:-.04em;color:#fff;white-space:nowrap}
.lyr.t span{display:inline-block}
.grid-ov{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0}
.grid-ov.on{opacity:1}
.grid-ov svg{width:100%;height:100%}
.shk{animation:shk .55s linear 2}
@keyframes shk{0%,100%{transform:translate(0,0)}10%{transform:translate(-6px,3px) rotate(-.6deg)}20%{transform:translate(5px,-4px)}30%{transform:translate(-4px,-2px) rotate(.5deg)}40%{transform:translate(6px,4px)}50%{transform:translate(-3px,5px)}60%{transform:translate(4px,-3px) rotate(-.4deg)}70%{transform:translate(-5px,2px)}80%{transform:translate(3px,3px)}90%{transform:translate(-2px,-2px)}}
.tl{position:relative;height:30px;border-radius:9px;background:#151515;border:1px solid rgba(255,255,255,.06);overflow:hidden}
.tl .tr{position:absolute;left:10px;right:10px;top:9px;height:12px;border-radius:4px;background:rgba(163,230,53,.12)}
.tl .kf{position:absolute;top:11px;width:8px;height:8px;background:var(--pa);transform:rotate(45deg);opacity:0;transition:opacity .25s}
.tl .kf.on{opacity:1}
.tl .ph{position:absolute;top:2px;bottom:2px;width:2px;left:10px;background:#4ea8ff;border-radius:2px}
.tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.tool{position:relative;height:40px;border-radius:9px;background:#2a2a2a;border:1px solid rgba(255,255,255,.07);color:#d6d6d6;font:700 10.5px Geist,sans-serif;letter-spacing:.9px;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:7px;transition:border-color .15s,background .15s,color .15s,transform .1s}
.tool:hover{border-color:rgba(163,230,53,.55);color:#fff;background:#2f2f2f}
.tool:active{transform:scale(.97)}
.tool.on{border-color:var(--pa);color:var(--pa);background:rgba(163,230,53,.08)}
.tool.wide{grid-column:1/-1}
.tool small{font-weight:600;letter-spacing:.3px;color:#777;text-transform:none}
.anc{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px;border-radius:10px;background:#202020;border:1px solid rgba(255,255,255,.06);width:108px;flex:0 0 auto}
.anc button{height:26px;border-radius:6px;background:#2a2a2a;color:#888;font-size:10px;transition:background .15s,color .15s}
.anc button:hover{background:#333;color:var(--pa)}
.row2{display:flex;gap:8px;align-items:stretch}.row2 .tools{flex:1}
.pnl-status{display:flex;align-items:center;gap:8px;min-height:30px;padding:0 10px;border-radius:9px;background:#151515;font-size:11.5px;color:#9a9a9a}
.pnl-status i{width:7px;height:7px;border-radius:50%;background:#555;flex:0 0 auto}
.pnl-status.ok i{background:var(--pa);box-shadow:0 0 8px var(--pa)}.pnl-status.ok{color:#ddd}
.snd{display:grid;gap:5px}
.snd-row{display:flex;align-items:center;gap:8px;height:34px;padding:0 6px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid transparent;font-size:12px;color:#ddd;text-align:left}
.snd-row:hover{border-color:rgba(255,255,255,.12)}.snd-row.on{border-color:var(--pa)}
.snd-row .pl{width:24px;height:24px;border-radius:7px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:9px}
.snd-row.on .pl{background:var(--pa);color:#0a1400}
.snd-row small{margin-left:auto;color:#777;font-size:10px}
.snd-search{height:32px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 10px;color:#777;font-size:12px;gap:8px}
.wave{position:absolute;left:8%;right:8%;top:50%;height:46%;transform:translateY(-50%);display:flex;align-items:center;gap:2%;z-index:2;opacity:0;transition:opacity .2s}
.wave.on{opacity:1}.wave i{flex:1;background:var(--pa);border-radius:2px;height:6%;transition:height .08s}
@media(max-width:900px){#preview .pv{grid-template-columns:1fr;gap:36px}.pnl{grid-template-columns:44px minmax(0,1fr);padding:10px}.pnl-rail button{width:32px;height:32px}.anc{width:92px}}
@media(max-width:420px){.tools{grid-template-columns:1fr 1fr}.tool{font-size:9.5px;letter-spacing:.4px}.row2{flex-direction:column}.anc{width:auto}}
/* ---------- download & install ---------- */
.ins{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.ins-c{position:relative;border:1px solid var(--ln);border-radius:18px;padding:26px 22px;background:linear-gradient(160deg,rgba(24,32,12,.45),rgba(8,10,6,.85))}
.ins-c small{font-family:ui-monospace,Menlo,monospace;color:var(--ac);font-size:12px;letter-spacing:.06em}
.ins-c h3{font-weight:500;font-size:19px;letter-spacing:-.02em;margin:10px 0 8px}
.ins-c p{color:var(--mu);font-size:14.5px}
.ins-c code,.ins-more code{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:var(--ac2);background:rgba(163,230,53,.07);padding:2px 6px;border-radius:5px}
.ins-more{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ins-more details{border:1px solid var(--ln);border-radius:14px;padding:16px 20px}
.ins-more summary{font-size:15px}
.ins-more p,.ins-more li{color:var(--mu);font-size:14px;margin-top:10px}
.ins-more ol{padding-left:18px}
@media(max-width:900px){.ins{grid-template-columns:1fr 1fr}.ins-more{grid-template-columns:1fr}}
@media(max-width:560px){.ins{grid-template-columns:1fr}}
'''
rep('</style>', CSS + '</style>')

# ---------------------------------------------------------------- new sections
PREVIEW = r'''
<section class="s" id="preview"><div class="wrap pv">
 <div class="pv-copy rv"><span class="pill"><i></i>try it here</span><h2>Click around <em>the panel.</em></h2>
  <p class="sec-p">This is a mockup of the Sougetsu Akira FX panel. Pick a tab, press a tool and watch what it does to the demo layers in the comp.</p>
  <span class="pv-label">● Interactive preview · the real panel runs inside After Effects.</span>
  <ul class="pv-tips"><li><b>Anchor grid</b>Snap the selected layer to a corner, edge or center.</li><li><b>Bounce / Elastic</b>Natural overshoot on the selected layer.</li><li><b>Layer Morph</b>One layer flies, scales and turns into another.</li><li><b>Sound Lab</b>Search, preview and drop UI sounds on the playhead.</li></ul>
 </div>
 <div class="rv"><div class="pnl" id="pnl" aria-label="Interactive preview of the Sougetsu Akira FX panel">
  <div class="pnl-top"><span class="pnl-pill"><i></i>AUTOSAVE: 1:55</span><span class="pnl-pill r">RAM ▭</span><span class="pnl-pill">PREVIEW</span></div>
  <div class="pnl-rail" role="tablist">
   <button class="on" data-tab="core" title="Core Toolkit" aria-label="Core Toolkit"><svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/><path d="M4 12h5M13 12h7"/></svg></button>
   <button data-tab="fx" title="Effects Lab" aria-label="Effects Lab"><svg viewBox="0 0 24 24"><path d="M5 19L15 9"/><path d="M14 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M8 3l.6 1.4L10 5l-1.4.6L8 7l-.6-1.4L6 5l1.4-.6z"/></svg></button>
   <button data-tab="shape" title="Shape Forge" aria-label="Shape Forge"><svg viewBox="0 0 24 24"><rect x="3.5" y="10" width="9" height="9" rx="1.5"/><circle cx="15.5" cy="8.5" r="5"/></svg></button>
   <button data-tab="type" title="Type Studio" aria-label="Type Studio"><svg viewBox="0 0 24 24"><path d="M5 19L10.5 5h1L17 19"/><path d="M7.4 13.5h7.2"/><path d="M19 9v10"/></svg></button>
   <button data-tab="sound" title="Sound Lab" aria-label="Sound Lab"><svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/></svg></button>
  </div>
  <div class="pnl-main">
   <div class="pnl-tabname" id="pnlName">CORE TOOLKIT</div>
   <div class="comp" id="comp"><span class="comp-hd">Comp 1 · <b id="compSel">Shape Layer 1</b></span><span class="comp-tag" id="compTag">BEFORE</span>
    <div class="comp-guides"><i class="gx"></i><i class="gy"></i></div>
    <div class="lyr sel" id="lyA"></div><div class="lyr b" id="lyB"></div><div class="lyr t" id="lyT" hidden></div>
    <div class="grid-ov" id="gridOv"><svg viewBox="0 0 160 90" preserveAspectRatio="none"><g stroke="rgba(163,230,53,.75)" stroke-width=".4" fill="none"><path d="M53.3 0V90M106.7 0V90M0 30H160M0 60H160"/><path d="M50 30h6.6M53.3 26.7v6.6M103.3 30h6.6M106.7 26.7v6.6M50 60h6.6M53.3 56.7v6.6M103.3 60h6.6M106.7 56.7v6.6" stroke-width="1"/></g></svg></div>
    <div class="wave" id="wave"></div>
   </div>
   <div class="tl" aria-hidden="true"><div class="tr"></div><i class="kf" style="left:12%"></i><i class="kf" style="left:46%"></i><i class="kf" style="left:80%"></i><div class="ph" id="ph"></div></div>
   <div id="toolArea"></div>
   <div class="pnl-status" id="pnlStatus"><i></i><span>Pick a tool. Nothing here touches a real project.</span></div>
  </div>
 </div></div>
</div></section>
'''
INSTALL = r'''
<section class="s" id="install"><div class="wrap">
 <div class="hd rv"><span class="pill"><i></i>download &amp; install</span><h2 style="margin-top:22px">Up and running <em>in two minutes.</em></h2><p class="sec-p">Everything arrives by email right after checkout: your download link and your license key.</p></div>
 <div class="ins rv">
  <div class="ins-c"><small>01</small><h3>Check your email</h3><p>Right after checkout you get the download link for <code>SougetsuAkiraFX.zxp</code> and your license key.</p></div>
  <div class="ins-c"><small>02</small><h3>Install the .zxp</h3><p>Close After Effects. Open the free <a class="ul" href="https://aescripts.com/learn/zxp-installer/" target="_blank" rel="noopener">aescripts ZXP Installer</a> (or ZXPInstaller) and drag the .zxp onto it.</p></div>
  <div class="ins-c"><small>03</small><h3>Open the panel</h3><p>Start After Effects and go to <code>Window &gt; Extensions &gt; Sougetsu Akira FX</code>. On AE 2024+ it is under <code>Extensions (Legacy)</code>.</p></div>
  <div class="ins-c"><small>04</small><h3>Unlock it</h3><p>Paste the license key from your purchase email into the panel and press <code>Unlock</code>. Done.</p></div>
 </div>
 <div class="ins-more rv">
  <details><summary>The panel doesn't show up</summary><ol><li>Restart After Effects after installing.</li><li>Check <code>Window &gt; Extensions (Legacy)</code> on AE 2024 and newer.</li><li>Make sure you use After Effects 2022 or newer.</li><li>Reinstall the .zxp with the ZXP Installer, then restart AE again.</li></ol></details>
  <details><summary>Install without a ZXP installer (Windows)</summary><p>Run Command Prompt as administrator and use Adobe's own installer:</p><p><code>"C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "%USERPROFILE%\Downloads\SougetsuAkiraFX.zxp"</code></p></details>
  <details><summary>Scripts can't write files</summary><p>In After Effects open <code>Edit &gt; Preferences &gt; Scripting &amp; Expressions</code> (macOS: <code>After Effects &gt; Settings</code>) and turn on <code>Allow Scripts to Write Files and Access Network</code>.</p></details>
  <details><summary>Need help?</summary><p>Email <a class="ul" href="mailto:support@sougetsustore.com">support@sougetsustore.com</a> with your order email and a screenshot. Your license works on your own machines, and every update is free.</p></details>
 </div>
</div></section>
'''
rep('<section class="s gl" id="glue">', PREVIEW + '<section class="s gl" id="glue">')
rep('<section class="s" id="reviews">', INSTALL + '\n<section class="s" id="reviews">')

# ---------------------------------------------------------------- JS: checkout wiring + panel demo
JS_CHECKOUT = r'''
/* ---------- checkout (Dodo Payments) ----------
   Paste your Dodo payment link below (Dodo dashboard > Products > your product > Share / Payment link), e.g.
   https://checkout.dodopayments.com/buy/pdt_XXXX   (live)   or   https://test.checkout.dodopayments.com/buy/pdt_XXXX   (test)
   Every element with class "buy" uses it; the seat slider is passed as ?quantity=N. */
const DODO_CHECKOUT_URL='DODO_CHECKOUT_URL';
function checkoutUrl(q){if(DODO_CHECKOUT_URL==='DODO_CHECKOUT_URL')return'#pricing';const u=new URL(DODO_CHECKOUT_URL);if(q>1)u.searchParams.set('quantity',q);u.searchParams.set('redirect_url',location.origin+location.pathname+'#install');return u.toString()}
function wireBuy(){const q=+($('#rg')||{}).value||1;$$('a.buy').forEach(a=>{a.href=checkoutUrl(a.id==='add'?q:1)})}
wireBuy();
$$('a.buy').forEach(a=>a.addEventListener('click',e=>{if(DODO_CHECKOUT_URL==='DODO_CHECKOUT_URL'){e.preventDefault();const t=document.createElement('div');t.className='toast';t.textContent='Checkout is not connected yet. Paste the Dodo payment link into DODO_CHECKOUT_URL.';document.body.appendChild(t);setTimeout(()=>t.remove(),3200)}}));
'''
rep('''/* ---------- cart ---------- */
let n=0;const cnt=$('#cnt');
$('#add').addEventListener('click',e=>{n++;cnt.textContent=n;cnt.classList.add('pop');setTimeout(()=>cnt.classList.remove('pop'),250);
 const b=e.currentTarget,old=b.textContent;b.textContent='Added';setTimeout(()=>b.textContent=old,1200);
 const t=document.createElement('div');t.className='toast';t.textContent='Sougetsu Akira FX · '+$('#sn').textContent;document.body.appendChild(t);setTimeout(()=>t.remove(),3000)});''', JS_CHECKOUT)
rep("rg.addEventListener('input',price);price();", "rg.addEventListener('input',()=>{price();wireBuy()});price();")
# the seat-total text also goes on the checkout button
rep("$('#sn').textContent=n+(n>1?' seats':' seat');", "$('#sn').textContent=n+(n>1?' seats':' seat');const ab=$('#add');if(ab)ab.textContent='Get Sougetsu Akira FX · $'+tot;")

JS_DEMO = open(os.path.join(ROOT, 'tools', 'site', 'panel-demo.js'), encoding='utf-8').read()
rep('})();\n</script>', JS_DEMO + '\n})();\n</script>')
# the custom cursor/hover ring should also react to the demo buttons
rep("e.target.closest('a,button,summary,input,.pm')", "e.target.closest('a,button,summary,input,.pm,.tool')")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(s)
left = [m.group(0) for m in re.finditer(r'.{0,30}\bCore\b(?! Toolkit).{0,30}', s)]
print('wrote', OUT, len(s), 'bytes; leftover "Core":', left)
