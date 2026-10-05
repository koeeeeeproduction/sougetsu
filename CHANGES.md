# Sougetsu Akira FX - work-in-progress changes (from the original Flex package)

Status: UNSIGNED. Not yet run in After Effects.
Stage 0 build (sougetsu_akirafx_stage0.zip) has NO CaptureFlex compiled files: host is a clean-room loader + core.

## Done
1. License layer (client/index.html): CaptureFlex verify/deactivate/kick replaced with Dodo Payments
   activate / validate / deactivate. Test/live switch: `SOUG_MODE` (currently "test"; MUST be "live" for release).
   - test: https://test.dodopayments.com , product pdt_0NowLhe2xb6nOnDS8aXpo
   - live: https://live.dodopayments.com , product pdt_0NowJEjPaMC6jAfdP2dI3
   - Rejects keys from any other product; stores instance id per mode; no OS username in machine id.
   - "Kick other device" replaced by a "deactivate the other computer" message.
2. Vendor network removed/placeholdered:
   - Update/changelog/creator-message feeds -> https://raw.githubusercontent.com/YOUR-GITHUB-USER/sougetsu-akira-fx/...
   - Site/support links -> https://your-domain.example ; Discord -> https://discord.gg/YOUR-INVITE
   - Vendor AI cloud (/v1/flex-ai/*, credits, learning-records, top-up link) DISABLED: JS flexAiRequest returns a local 404;
     Python autocaptions raises CloudError(404) so local Whisper is used. Cloud translation is therefore unavailable.
3. Rebrand (visible text, identifiers untouched): Flex GUI Pro -> Sougetsu Akira FX, Captureflex -> Sougetsu, Flex AI -> Akira AI,
   bundle id com.flexguipro.ext -> com.sougetsu.akirafx (+ .eject1-5), 133 translation files kept aligned (verified).
4. Removed stale META-INF/signatures.xml (invalid after edits).

## NOT done / open
- Host layer: initSecurity integrity check + unlock/lock/readLicenseKey live in compiled host code. Panel will likely show the
  INTEGRITY CHECK screen until that is resolved with vendor-provided source or a clean-room rewrite.
- Placeholders to fill: GitHub user/repo, domain, support email, Discord invite.
- Third-party/vendor items to clear before selling: "Flex Liquid Glass"/"Flex Glass" plugins (separate vendor products), fonts
  (Tactic Sans etc.), 37 map JSONs, bundled libraries, remaining feature names containing "Flex".
- Packaging: needs a signed ZXP (self-signed cert OK) or PlayerDebugMode for testing.

## Stage 0 (clean-room host) - added
- host/akira_loader.jsx and host/akira_core.jsx written from scratch (no decompiling, no vendor compiled code).
- Implemented: initSecurity (returns OK), unlockLicenseJSX / lockLicenseJSX / readLicenseKeyJSX (key stored in
  userData/SougetsuAkiraFX/license.key), isLocked flag, resolvePath, _guard() helper. paste_feature.jsx kept (plain source).
- Removed from the package: flexcore.jsxbin, pleasdonttouch.jsxbin, secure_core.bin. Manifest + 18 panel references repointed to akira_loader.jsx.
- Tested with a mock ExtendScript environment (17/17 pass). NOT tested in After Effects.
- The other ~140 $._flex.* host functions are NOT implemented yet: calls fail as "EvalScript error", which the panel already handles in ~23 places.
- Vendor stated (email) the core is protected and its internals will not be shared; the core was deliberately not decompiled.

## Fix after first AE test (key rejected)
- ROOT CAUSE: the license card in main.js (`cleanKey`) uppercased every key; Dodo keys are lowercase and case-sensitive -> "Key not recognised".
  Fixed: cleanKey keeps case; Dodo layer lowercases UUID-style keys; key box no longer displays uppercase.
- License card branding fixed (heading, lead text, "Unlock Akira FX", status messages). Page title fixed ("FlexGui Pro" variant was missed).
- Known: many other "Flex ..." feature names remain in the UI (separate cleanup pass).

## Fix: startup popup "Akira FX: could not locate the host folder"
- CEP runs the manifest ScriptPath without a usable $.fileName, so the loader could not find itself (and the host core likely never loaded at startup;
  the panel still unlocked because its unlock step ignores the host reply).
- akira_loader.jsx now tries: own path -> path passed by the panel -> standard CEP install folders; it stays silent if none is found.
- index.html `ensureAkiraHost()` loads the loader with the panel's real extension path at startup.
- Verify the host is alive: after entering a key, %APPDATA%\SougetsuAkiraFX\license.key should exist (written by akira_core.jsx).

## Batch A tools (host/akira_tools.jsx) - first real feature code
- Written: loadCore, start/endUndoGroup, anchor grid (9), centerLayer, fitLayer (fit/fill), createSolid, smartNull, applyExpression,
  getProjectPath, openProjectFolder, saveProject (manual + autosave copies, keeps newest N), revealInProject, navigateToLayer.
- Mock tests: 22/22 pass (anchor moves keep every content point visually fixed under scale+rotation). NOT tested in After Effects.
- Discovery: many tools are invoked as run('name') -> $._flex.name(arg). Real total = 226 host functions (28 written, 198 missing).
- Confirmed: the panel previously worked only because the ORIGINAL Flex GUI Pro host was installed; without it, unwritten tools fail.
- Autosave folder renamed FlexProjects -> AkiraProjects (231 label replacements incl. translations).

## Batch B tools (host/akira_tools2.jsx) - alignment, keyframes
- Written: alignLayers (global alignLayers_FlexGUI; comp + selection modes, handles scale/rotation), offsetLayers (frame stagger; pyramid or random),
  resetTransform, setTime, easyEaseSelectedKeyframes (ease/easeIn/easeOut), applyFlowEase (cubic-bezier between selected keys, 1-D/2-D/spatial),
  applyBounce, applyElastic (expressions), reverseKeyframes, duplicateKeyframes (loop expression or copy), repositionKeyframes.
- Mock tests 34/34 (+22 batch A, 17 gate, 7 loader). NOT tested in After Effects.
- Totals: 226 needed, 38 written, 188 missing.

## Batch C1/C2: color, effects, text (host/akira_color.jsx, host/akira_text.jsx)
- Color/FX: applyColor (solid on solid/text/shape/footage, gradient via Gradient Ramp, fourcolor via 4-Color Gradient), applyColorToSelection, applyFill,
  applyEffectToSelection (by name), applyFFX, FX tab (scanTimelineFX, toggleFX, toggleAllFX, deleteFX, deleteAllFX, highlightFXLayers),
  setLayerLabelColorFromHex (approximate label palette), fxLock (gradient lock expressions).
- Text: addTextLayer, createCustomTextLayer, importSRT, splitText (chars/words/lines, point text), createNumberCounter (basic/ig/yt, update existing),
  getCounterDetails, toggleKeyframe/jumpToNext/PrevKeyframe (named control), createGlowingRedText, applyEffectsToSelectedTextLayer.
- Mock tests: 57/57 (+22 +34 +17 +7). NOT tested in After Effects.
- Not yet: Comp Saver, project/main layer functions, caption presets, word captions, color match.

## Batch D: Comp Saver, main layer tools, project helpers (host/akira_library.jsx, host/akira_layers.jsx)
- Comp Saver: scanPostComps, savePostComp (reduced project copy + thumbnail + preview frames for the panel's GIF builder), importPostComp(+Multiple),
  rename/move/delete entries, categories, library/preset folder pickers + reset, FFX presets (save/delete/move/folders), savePresetFromSelection (when AE supports it).
- Default library folder is Documents/Akira FX/Assets Library (panel default changed to match). Settings: userData/SougetsuAkiraFX/settings.ini.
- Main: addCamera, createAdj, precompSeparately, renameSelectedLayers, staggerSelectedLayers, splitLayers/Masks/ShapeGroups, delete/bake expressions (+smart bake),
  importReference/importFileJSX/importImageToAe/browseForMedia/getSelectedLayerPath, replaceSelectedLayerSource, purge, setCompSettings, cropCompToContent,
  transform sliders (scrub/finalize/applyTransformState), getSystemFonts, organizeProject.
- Panel fix: the "duration N" command never reached the host (run() drops the 3rd argument); it now sends "|N".
- isOptimised / followSystemLabels / *Version are panel-set flags, no longer counted as missing functions.
- Mock tests: 76/76 (+57 +34 +22 +17 +7). NOT tested in After Effects.

## Product pass: themes, AI tab, labels, shared folders, focus timer
- Themes: the 6 character themes (Kurama x2, Baryon, Omnitrix, Miku, Spider-Man) replaced by 14 ORIGINAL themes (Crimson Shadow, Solar Flare, Blaze Orange,
  Neon Grid, Pixel Wave, Dark Ledger, Striker Gold, Sky Stripe, Sakura, Deep Ocean, Matcha, Midnight Violet, Cyberpunk, Graphite); all pass a 4.5:1 text contrast check.
  The Spider-Man special theme is disabled (web decoration + badge hidden). Seasonal themes (Christmas, Friendship, Halloween) kept.
- AI Assistant tab removed (button, tab-manager entry, command). The AI easing generator inside Flow stays.
- Remaining product-name text fixed ("Flex couldn't..." -> "Akira FX couldn't...", settings/about labels, Delete Akira); translations kept aligned (1452/1623 verbatim matches, same as before).
- Shared names renamed so the panel no longer shares disk locations with the original: .flexgui->.akirafx, .flex_gui_bin->.akira_bin, .flex-ai->.akira-ai,
  Flex Downloads->Akira Downloads, Flex Pasted->Akira Pasted, Documents/Flex->Documents/Akira FX, theme event renamed. Premiere (ULTIMATE) stat card hidden.
- New: Focus Timer (js_flex/akira_timer.js) with 4 original mascots (Bolt, Mochi, Kei, Captain Null), 81 original lines, focus/short/long modes, custom minutes,
  session stats, sound toggle, resumes after the panel is closed. Tests: 33 core + 24 UI.
- New: build_release.py + RELEASE_GUIDE.md (live switch, placeholder filling, refuses to build with placeholders, ZXPSignCmd commands).

## Text animations + expression tools + subtitles (host/akira_expressions.jsx, host/akira_subtitles.jsx)
- ROOT CAUSE of "text animations don't work": the 26 cards call the global applyExpressionToTargets(code,"animator",name,{props,basedOn}); it lived in the
  compiled core. About 25 more global functions were never counted (my survey only looked for $._flex/run/_FlexGUI names).
- Written: applyExpressionToTargets, smartApplyExpression, applyExpressionToAll, bulkApplyExpression(+AllComps), getLayersByType, getAllLayersFromAllComps,
  scanAllExpressions, bulkExpressionAction, toggleAllExpressions, updateExpression, jumpToExpression, freezeExpressionAtTime, removeTextPanelExpressions,
  getSelectedLayerText, setSelectedLayersBlendMode, applyStagger, $._flex.applyDeepGlowRig, $._flex.applyGlowingTrailText,
  flex_getSubtitles/updateSubtitle/replaceWordInComp/transformSubtitlesInComp, pasteImage_FlexGUI (+ base64 decoder bug fixed by tests).
- Tests: 49 (expressions/text; includes the 52 real calls captured from the panel's 28 text cards) + 29 (subtitles). The real panel boots cleanly in a simulated browser.
- Panel fixes: LOCAL_CHANGELOG was never defined (pre-existing); 209 "Flex ..." names written into customer projects renamed to "Akira ..." (uniform rule, translations kept aligned).
- Still missing: 3D Camera rig (39 global functions), reference workspace (2), 114 $._flex functions, 8 features whose scripts lived only in the compiled core.

## General tab tools + reference workspace + cleanup (host/akira_general.jsx, host/akira_reference.jsx)
- Written: setNativeTransform (stroke width/cap/join/color, fill color incl. text, trim start/end/offset, taper, dash/gap/offset, shape size/roundness, plus pos/anchor/scale/rotation/opacity),
  toggleShapeAttr (fill/stroke), trueDup (unlinked pre-comp duplicate, nested comps copied once), unPrecomp (extract layers keeping position/timing/parenting).
- Reference workspace host functions (Editors tab) written. camera3d.js removed (never loaded, obfuscated, not from this product).
- Not used: the decompiled core (FOR_SOUGETSU_clean.js) - no verifiable written grant; all code remains clean-room.
- Tests: 38 (general) + 8 (reference) + all earlier suites. NOT tested in After Effects.

## Flow curve engine + Project Organizer + Shape tools (host/akira_curve.jsx, akira_organizer.jsx, akira_shapes.jsx)
- Flow (Graph editor): curve20Apply (bezier ease / custom points / elastic / bounce / wave / stepped bake) + curve20Read, built from the panel's "model|graphMode|invert|params|pts" contract.
- Project Organizer: flexProjectAnalyze/Organize/BoardLayout/BoardRestore, replying "OK:"+encodeURIComponent(JSON) as the panel expects; sorts the project into type/usage folders; board layout remembers originals in the layer comment and restores them.
- Shape tools: trimPackAddLine (hr/vt), trimPackAddTrim (staggered trim animation), trimPackConvertToSelectiveLine, trimPackReversePathDirection, rectDetectState, rectModifySide.
- All rebuilt clean-room from the panel's contracts; the uploaded decompiled host files were NOT used. Tests: 31 new + all earlier suites.

## Shape primitives + operations (host/akira_shapes.jsx: shapeOperation)
- shapeOperation dispatcher rebuilt clean from the SOUGETSU.js behavioural spec: createStar (5 pts, outer 0.4/inner 0.18 of min dim, gold fill, white 3px stroke),
  createPolygon|sides (star-type 1, default 6, blue fill), addTrim, addRepeater|copies (3), addZigZag|size (10, detail 5), addTwist|angle (60),
  addRoundCorners|radius (20), mergePaths, addGradFill, addGradStroke, reversePath, flipH, flipV, blendMode|name (17 modes).
- Written from behaviour only; the decompiled host files were not used in the build. Tests: 21.
