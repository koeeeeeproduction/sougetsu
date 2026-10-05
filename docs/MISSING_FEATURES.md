# Host functions status (clean-room core)

The panel calls After Effects two ways: `$._akira.*` / `run('name')`, and **global functions** called directly. Both are counted.

- **`$._akira` functions:** 219 written, 0 missing.
- **Global functions:** 26 written, 0 missing.

> "Written" means it passes my mock tests. Only functions you have tried in real After Effects count as verified.

## Written (global)
applyExpressionToTargets, applyStagger, bulkApplyExpression, bulkApplyExpressionAllComps, bulkExpressionAction, akiraProjectAnalyze, akiraProjectBoardLayout, akiraProjectBoardRestore, akiraProjectOrganize, akira_getSubtitles, akira_replaceWordInComp, akira_transformSubtitlesInComp, akira_updateSubtitle, freezeExpressionAtTime, getAllLayersFromAllComps, getLayersByType, getReferenceWorkspaceContext_AkiraGUI, getSelectedLayerText, jumpReferenceWorkspace_AkiraGUI, pasteImage_AkiraGUI, removeTextPanelExpressions, scanAllExpressions, setSelectedLayersBlendMode, smartApplyExpression, toggleAllExpressions, updateExpression

## Written ($._akira)
addCamera, addTextLayer, alignLayers, anchorBL, anchorBM, anchorBR, anchorML, anchorMM, anchorMR, anchorTL, anchorTM, anchorTR, applyBounce, applyColor, applyColorToSelection, applyDeepGlowRig, applyEffectToSelection, applyEffectsToSelectedTextLayer, applyElastic, applyExpression, applyFFX, applyFill, applyFlowEase, applyGlowingTrailText, applyTransformState, bakeExpressionsSmart, bakeSelectedExpressions, browseForMedia, centerLayer, createAdj, createCustomTextLayer, createFFXFolder, createGlowingRedText, createNumberCounter, createSaveCompCategory, createSolid, cropCompToContent, curve20Apply, deleteAllFX, deleteFFX, deleteFFXFolder, deleteFX, deletePostComp, deleteSaveCompCategory, deleteSaveCompEntry, deleteSelectedExpressions, duplicateKeyframes, easyEaseSelectedKeyframes, endUndoGroup, finalizeScrub, fitLayer, akiraSendCompToPremiere, fxLock, getCounterDetails, getProjectPath, getSelectedLayerPath, getSystemFonts, highlightFXLayers, importFileJSX, importImageToAe, importMultiplePostComps, importPostComp, importReference, importSRT, initSecurity, jumpToNextKeyframe, jumpToPrevKeyframe, loadCore, lockLicenseJSX, moveFFX, moveSaveCompAsset, navigateToLayer, offsetLayers, openProjectFolder, organizeProject, pickAssetFolder, pickSaveCompLibFolder, precompSeparately, purge, readLicenseKeyJSX, rectDetectState, rectModifySide, renameSaveCompAsset, renameSelectedLayers, replaceSelectedLayerSource, repositionKeyframes, resetAssetFolder, resetSaveCompLibFolder, resetTransform, resolvePath, revealInProject, reverseKeyframes, saveFFX, savePostComp, savePresetFromSelection, saveProject, scanPostComps, scanTimelineFX, scrubTransform, setCompSettings, setLayerLabelColorFromHex, setNativeTransform, setTime, shapeOperation, smartNull, splitLayers, splitMasksToLayers, splitShapeGroupsToLayers, splitText, staggerSelectedLayers, startUndoGroup, toggleAllFX, toggleFX, toggleKeyframe, toggleShapeAttr, trimPackAddLine, trimPackAddTrim, trimPackConvertToSelectiveLine, trimPackReversePathDirection, trueDup, unPrecomp, unlockLicenseJSX,
applyCaptionPresetStyle, applyColorMatchParameters, applyGenericTextKeyframes, checkAutoRelinkMatches, commitAutoRelink, countOfflineMedia, createCaptionPresetLayer, debugLayerData, getActiveFourColorGradient, getLayerData, getProjectSaveInfo, getSelectedLayerAcInfo, getSelectedLayersForColorMatch, getNullLayers, httpPostCurl, importWordCaptions, runDiagnostic, scanCompStructure, scanInstalledPlugins, splitTextSeparate,
frHost_ffCollect, frHost_ffGoto, frHost_ffInstall, frHost_ffInstallLocal, frHost_ffPickFolder, frHost_ffRebind, frHost_ffWhere, frHost_loadFonts, frHost_replace, frHost_replaceMulti, frHost_report, frHost_saveReport, frHost_scan, frHost_usable, getFontReplSettings, saveFontReplSettings,
addBeatMarkers, applyProximity, buildUITemplate, buildUITemplateStudio, createProximityNull, detectSelectedKeyframeBezier, getTemplateStudioContext, resetProximityExpressions, updateBounceControlRealTime, updateKeyframeValue,
applySystemLabelsToSelected, createExtrusion, deleteAllLayerEffects, deleteLayerEffect, akiraTypeAlign, akiraTypeCenter, akiraTypeReAlignVersion, akiraTypeResetAnchor, akiraTypeSelection, getSelectedLayerEffects, run, saasVersion, toggleLayerEffectActive, trimToBelowLayer,
akiraMapEngineVersion, akiraMap_activeRig, akiraMap_bakeRig, akiraMap_createFromFile, akiraMap_createTrackerFromFile, akiraMap_listRigs, akiraMap_replaceViewFromFile, akiraMap_selectRig, akiraMap_syncRigToView, akiraMap_traceOutlineFromFile,
addOrbEffector, addShapeLayer, applyGlassMorph, applyGlassMorphShape, applyShapePreset, applyShatterEffect, buildCarousel3D, convertSelectedShapesToLiquidGlass, createCarousel, createCustomShapes, createOrbCloner, createPrimitive, fxLightSweepLock, getCarouselDetails, getExtraShapeData, laPathDelete, laPathGetSelectedState, laPathSet, laPathStart, pastePathToCarouselControl, removeGlassMorph, removeMorph, shapeMorpher, syncCarousel, trackLiquidGlassToShape, updateCarouselControlRealTime

## Still missing ($._akira), by area

**None.** Every function in this catalog now has a clean-room implementation across 13 host files. See "Not yet verified" below — written and passing mock tests is not the same as confirmed working in real After Effects.

## Rebuilt clean-room from the panel's own contracts this round
- **Flow curve engine** (Flow / Graph editor): curve20Apply (bezier ease, custom points, elastic/bounce/wave expressions, stepped bake) + curve20Read.
- **Project Organizer**: akiraProjectAnalyze, akiraProjectOrganize (sorts into Comps/Precomps/Footage/Images/Audio/Solids/Missing/Unused), akiraProjectBoardLayout + akiraProjectBoardRestore.
- **Shape tools (Trim Pack + Rectangle editor)**: trimPackAddLine, trimPackAddTrim, trimPackConvertToSelectiveLine, trimPackReversePathDirection, rectDetectState, rectModifySide.
- **Shapes dispatcher**: shapeOperation (createStar, createPolygon|sides, addTrim, addRepeater, addZigZag, addTwist, addRoundCorners, mergePaths, addGradFill, addGradStroke, reversePath, flipH, flipV, blendMode) rebuilt clean from SOUGETSU.js behavioural spec; defaults match (star 5pts/0.4/0.18 gold, polygon 6 sides blue, repeater 3, zigzag 10/5, twist 60, round 20).

## This round (Batch J): Color Match, Captions, Project scans & relink
- **host/akira_colormatch.jsx** — `getSelectedLayersForColorMatch`, `getActiveFourColorGradient`, `applyColorMatchParameters` (applies a client-computed hue/lightness/saturation delta via the built-in Hue/Saturation effect — own design, not vendor behavior).
- **host/akira_captions.jsx** — 5 built-in style presets (clean/bold/boxed/outline/minimal) via `createCaptionPresetLayer` / `applyCaptionPresetStyle`; `getSelectedLayerAcInfo` for the inspector panel; `applyGenericTextKeyframes` (fadeUp/popIn/typewriter/fadeIn); `importWordCaptions` (JSON `[{word,start,end}]` → one text layer with keyed Source Text); `splitTextSeparate` (splits multi-line text into stacked layers, one per line).
- **host/akira_projectscan.jsx** — comp-nesting tree (`scanCompStructure`), null-layer list, offline-media count, a two-step relink flow (`checkAutoRelinkMatches` proposes matches by filename from a folder, `commitAutoRelink` applies a confirmed list — nothing is relinked without the explicit commit call), per-layer debug dumps, project save info, a `system.callSystem("curl ...")` POST helper (ExtendScript has no native HTTP client), a diagnostic-info blob, and an installed-plugins scan (walks the AE Plug-ins folder for `.aex`/`.plugin`/`.bundle` files).
- All verified with `node --check` for syntax only — **not yet run inside After Effects.**

## This round (Batch K): Font Replacement engine (16 functions)
- **host/akira_fonts.jsx** — full `frHost_*` workflow, own settings file (`font_repl.ini`, separate from the asset-library settings so keys can't collide): `frHost_loadFonts`/`frHost_scan` walk every comp's text layers and tally font usage; `frHost_usable`/`frHost_ffWhere` check against `app.fonts.allFonts`; `frHost_ffGoto` selects every layer using a font and jumps to its comp; `frHost_ffPickFolder` wraps `Folder.selectDialog`; `frHost_ffCollect` fuzzy-matches used font names against files in the OS font folders and copies hits to a destination folder; `frHost_ffInstall`/`frHost_ffInstallLocal` copy font files into the user font folder (own design — ExtendScript can't register a font with the OS at runtime, only place the file where the OS will pick it up, typically after a restart); `frHost_ffRebind` stages an old→new mapping without touching text; `frHost_replace`/`frHost_replaceMulti` apply staged or ad-hoc mappings across `"all"` or `"selected"` scope; `frHost_report`/`frHost_saveReport` combine usage + install state + staged rebinds into a JSON/TSV report; `getFontReplSettings`/`saveFontReplSettings` persist folder paths and the rebind table.

## This round (Batch L): Beat markers, Proximity rig, keyframe utilities, Template Studio (10 functions)
- **host/akira_counters.jsx**:
  - `addBeatMarkers` — adds comp markers either from a client-supplied list of beat times, or generated from `{bpm, offset, start, end}`.
  - `createProximityNull` / `applyProximity` / `resetProximityExpressions` — own distance-falloff rig: a "Proximity Null" layer, and an expression on `scale` or `opacity` that reacts to distance from it (radius + falloff, both tunable). `applyProximity` auto-creates the null if missing. Reset finds and clears only expressions carrying this module's own marker comment, so it never touches hand-written expressions.
  - `detectSelectedKeyframeBezier` — lightweight probe (distinct from the existing `curve20Read`) that just reports whether ≥2 selected keyframes exist and what interpolation type they're in, for the UI to decide whether to offer the curve editor — not a full curve read.
  - `updateBounceControlRealTime` — **own design**, not a reskin of the existing hard-coded `applyBounce`. Lazily builds a small effect group ("Bounce Rig" with Amplitude/Frequency/Decay slider controls) on each selected layer the first time it's called, then on every call just updates the three slider values (no undo group — meant to be called continuously while a UI slider is dragged, same pattern as `scrubTransform`/`finalizeScrub`).
  - `updateKeyframeValue` — edits one keyframe's value in place on the active selected property (by index), also undo-group-free for live scrubbing.
  - `getTemplateStudioContext` / `buildUITemplate` / `buildUITemplateStudio` — **own minimal schema**, invented fresh rather than inferred from the vendor's compiled Templates engine (which this file deliberately stays away from — see the "left out on purpose" note below). Tokens are plain `{{name}}`-named layers in the active comp; `buildUITemplate` fills their text; `buildUITemplateStudio` builds a brand-new comp from a small JSON list of `text`/`solid` elements. This covers the *name* of the feature, not necessarily the vendor's actual UI/behavior — flag it for a closer look once you can compare against the real panel.
- All verified with `node --check` for syntax only — **not yet run inside After Effects.**

## This round (Batch M): dispatcher, layer-effects inspector, type align, extrusion, trim, labels (15 functions)
- **host/akira_other.jsx**:
  - `run(name, ...args)` — the dispatcher referenced in this doc's own preamble ("`$._akira.*` / `run('name')`"). Looks up `name` on `$._akira` first, falls back to the global scope, applies any extra arguments, and returns the result (or `"ERR:Unknown function: "+name"`). This is the first time it's been written — until now only the direct `$._akira.*` call path existed.
  - `saasVersion` — returns `"0"`. The vendor's SaaS-tier effects aren't implemented here on purpose (see below); this just lets the panel detect that and hide/disable those controls instead of calling into code that isn't present.
  - `getSelectedLayerEffects` / `deleteLayerEffect` / `deleteAllLayerEffects` / `toggleLayerEffectActive` — a per-layer effects inspector addressed **by index in the Effect Parade**, distinct from the existing FX tab (`deleteFX`/`toggleFX`/etc. in `akira_color.jsx`), which addresses effects **by matchName across the whole comp**. Both call paths are kept since they're different UI widgets.
  - `applySystemLabelsToSelected` — sets AE's native label color (1-16) on selected layers; cycles through all 16 if no specific id is passed.
  - `trimToBelowLayer` — trims each selected layer's in/out points to match the layer directly beneath it in the stack.
  - `createExtrusion` — enables 3D on selected text/shape layers, sets the comp renderer to `"ADBE Advanced 3d"`, and sets extrusion depth via the `ADBE Extrsn Options Grp` / `ADBE Extrsn Depth` matchNames. **Flagged for verification**: Geometry Options matchNames and the exact renderer-ID string are reconstructed from memory of the AE scripting surface, not confirmed against a live install — every property set is individually try/caught so a wrong name degrades to "3D enabled, no visible extrusion" instead of a thrown error, but send back the real behavior/error text the first time you test it.
  - `akiraTypeReAlignVersion`, `akiraTypeSelection`, `akiraTypeResetAnchor`, `akiraTypeAlign`, `akiraTypeCenter` — **own design** for a "smart text anchor" tool: `akiraTypeSelection` stores a 9-position anchor pin (TL/TM/.../BR) in the text layer's `.comment` field; `akiraTypeResetAnchor` recomputes the anchor point against the layer's *current* text bounds (useful after editing the text, since AE doesn't auto-follow anchor to new bounds) while keeping the on-screen position fixed, same math as the existing `anchorTL`/etc. tools; `akiraTypeAlign`/`akiraTypeCenter` are text-only variants of the generic align/center tools. This is inferred from the function names alone — flag for comparison against the real panel once you can test it.
- **Not re-implemented**: `akiraProjectAnalyze`, `akiraProjectBoardLayout`, `akiraProjectBoardRestore`, `akiraProjectOrganize`, `akiraProjectOrganizerVersion` were listed under "Other" in earlier rounds of this doc but are already written (as globals, in `host/akira_organizer.jsx`) — that was a stale duplicate entry in this file, now removed.
- **`isLocked`** was also listed under "Other" but is intentionally **not** given a same-named function: `$._akira.isLocked` is the boolean property the whole engine's gate (`H.locked()`) reads on every call. Overwriting it with a function would make that check always truthy (functions are truthy), permanently locking the panel. If the panel needs a callable status check, that should be a differently-named function (e.g. `getLockState`) rather than shadowing `isLocked` — flag this if the real panel genuinely calls `$._akira.isLocked()` as a function, since it'll need a rename on the panel side, not a host-side fix.
- All verified with `node --check` for syntax only — **not yet run inside After Effects.**

## This round (Batch N): Map rigs — 4-corner tracking / screen-replace system (10 functions)
- **host/akira_maps.jsx** — **flagged as the least-certain group so far.** "Map" is read as a corner-pin tracking/screen-replace rig (4 tracked null layers driving a Corner Pin effect on a swappable content layer), inferred from the surrounding function names ("trace outline", "create tracker from file", "replace view from file", "sync rig to view", "bake rig") rather than from any confirmed spec. Compare against the real panel's Maps tab before relying on this.
  - `akiraMap_createFromFile` imports a file, builds 4 corner nulls + a content layer with a Corner Pin effect expression-linked to them.
  - `akiraMap_traceOutlineFromFile` reads a JSON point list (traced client-side, since ExtendScript can't sample pixels) and builds a shape outline layer from it.
  - `akiraMap_createTrackerFromFile` reads externally-tracked per-frame corner data and keyframes the 4 nulls to match — i.e. importing a track made outside the panel.
  - `akiraMap_listRigs` / `akiraMap_activeRig` / `akiraMap_selectRig` track rigs by a `comment`-field tag (`akira-map-rig:<id>:<role>`), the same tagging pattern used elsewhere in this codebase (proximity rig, type-anchor pin).
  - `akiraMap_syncRigToView` re-links the Corner Pin's 4 points to the rig's nulls (repairable if the expression was broken). `akiraMap_bakeRig` samples the linked corner-pin values across the work area and converts them to literal keyframes, removing the expression. `akiraMap_replaceViewFromFile` swaps the content layer's footage source while keeping the tracking intact.
- All verified with `node --check` for syntax only — **not yet run inside After Effects.**

## This round (Batch O): Shapes & paths — the last 26 functions
Split across two files.
- **host/akira_shapes2.jsx** (9 functions) — primitives (`addShapeLayer`, `createPrimitive`: rect/ellipse/triangle/line, `createCustomShapes`: batch-build arbitrary paths from a point list); a freehand path-drawing session (`laPathStart`/`laPathSet`/`laPathGetSelectedState`/`laPathDelete`, tagged via `.comment` like the other rigs, `laPathSet` undo-group-free for continuous drawing); `applyShapePreset` (badge/pill/ribbon/blob, own small preset library); `getExtraShapeData` (vertex count, fill/stroke, bounds, rig tags — a general shape inspector).
  - **Bug caught and fixed before shipping**: the first draft parsed multi-point/multi-object JSON with a "nested bracket" regex trick (`[^\]]*(?:\][^\]]*)*`) copied from a pattern that happens to work for *one* array per string. Tested in isolation, it over-consumed across sibling arrays/objects (e.g. two `{"points":[...]}` entries collapsed into one match). Replaced with a real bracket-depth-counting parser (`parsePointsArray`/`splitObjectChunks`) and re-verified against a multi-object test case before writing it into the shipped file. Worth knowing about in case similar nested-array parsing gets added in future rounds — the depth-counting approach is the safe default, not ES3-regex bracket tricks.
- **host/akira_rigs.jsx** (17 functions) — **the most speculative file in this project; flag everything here for verification against the real panel.**
  - Glass Morph: `applyGlassMorph`/`applyGlassMorphShape`/`removeGlassMorph`/`convertSelectedShapesToLiquidGlass` — an effect-stack look (Bevel Alpha + Glow + soft Drop Shadow) plus, for existing shapes, a translucency pass on their fill color. Own design.
  - `fxLightSweepLock` — adds CC Light Sweep and locks its center to the layer's bounds, reusing the exact "lock a dynamic property to sourceRectAtTime" pattern from the existing `fxLock` (gradient lock).
  - `applyShatterEffect` — adds AE's native Shatter effect and keyframes its Force 1 strength from 0 to 3 over a given window.
  - `addOrbEffector`/`createOrbCloner` — own design, not based on any known vendor feature: a golden-angle sphere distribution of duplicated layers, and a proximity-style scale effector null.
  - Carousel (`createCarousel`, `buildCarousel3D`, `getCarouselDetails`, `updateCarouselControlRealTime`, `syncCarousel`, `pastePathToCarouselControl`) — a ring/sphere layout of selected layers driven by a "Carousel Control" null with Radius/Rotation slider controls; `buildCarousel3D` adds real 3D positioning plus a camera; `pastePathToCarouselControl` swaps the circular layout for a custom path (stored as a mask on the control null, sampled via `pointOnPath`).
  - `shapeMorpher`/`removeMorph` — morphs between two selected shape layers' paths using AE's own path-keyframe interpolation (works best when both paths have the same vertex count; no vertex-resampling is attempted).
  - `trackLiquidGlassToShape` — position + proportional-scale link from one layer to another's `sourceRectAtTime` bounds, same expression pattern as the caption background box in `akira_captions.jsx`.
- All verified with `node --check` for syntax only — **not yet run inside After Effects.**

## Not yet verified (applies to every function in every batch this round, J through O)
Every function above has passed `node --check` (syntax only) and is logically consistent with the AE scripting API as best recalled, but **none of it has been run inside real After Effects.** Likely failure points to check first, in rough order of risk:
1. Effect property index/matchName guesses (`akira_rigs.jsx` Shatter/Bevel Alpha/Glow/Drop Shadow sub-property indices, `akira_other.jsx` Geometry Options matchNames) — these are the most likely to be slightly wrong for your AE version.
2. The Maps and Shapes-rig files (`akira_maps.jsx`, `akira_rigs.jsx`) are built from function names alone, not a confirmed spec — their actual *behavior*, not just their code, may not match what the real panel's UI expects.
3. Expression-based rigs (proximity, carousel, orb effector, map rig, light sweep lock, type anchor) all depend on `thisComp.layer("exact name")` lookups — renaming a tagged layer breaks its expression silently (AE shows a red expression error on the property, not a thrown host-side error).
4. `app.fonts.allFonts` (used throughout `akira_fonts.jsx`) and `comp.renderer = "ADBE Advanced 3d"` (used in `createExtrusion`) are the two API surfaces least confirmed against a specific AE version.

## Known limits of what is written
- Flow curve: "ease" mode sets temporal eases on the keyframes; custom/steps/elastic/bounce/wave bake frame-by-frame or set an expression. Verify the feel on your curves.
- Organizer groups by media type and usage; it does not dedupe footage or relink.
- Shape tools cover lines, the trim animation, path reverse and the rectangle side editor; primitives, extrusion, star/poly presets and the path controllers are not written.
- Color match applies a flat hue/lightness/saturation shift computed by whatever the panel's client-side sampling sends it; it does not do its own pixel sampling (ExtendScript can't read pixels directly — that has to happen client-side via canvas/thumbnail).
- Caption background boxes use a position/scale expression linked to `sourceRectAtTime`, so resizing/retiming the text layer keeps the box in sync, but the expression is per-box and breaks if the text layer is renamed.
- `scanInstalledPlugins` lists plugin files on disk; it cannot tell you which are actually loaded/licensed in the current AE session (ExtendScript has no API for that).
- `frHost_ffCollect`/`frHost_ffInstall*` work by filename matching and file copying only. There is no ExtendScript API to read a font file's internal postScriptName or to force the OS to register a newly-copied font without a restart (or, on Windows, an `AddFontResource`-style call this environment can't make) — treat these as "stage the files in the right folder," not "guarantee AE can use the font immediately."
- `frHost_ffGoto`/`frHost_replace*` match on the exact `font` string AE stores on the text document (its postScriptName). Two fonts that look identical but report slightly different internal names won't match.

## Still only in the vendor's compiled core (can be rebuilt the same way, one at a time)
motion showcase, SaaS effects, type realign, map rigs, extra UI templates, Liquid Glass / Glass / Shatter / Carousel / Morph shape rigs, and the social-media Templates engine (left out on purpose for trademark reasons).

## Round P (2026-10-05): the 56 rebuilt against the real panel contracts
The earlier drafts of `akira_shapes2.jsx`, `akira_rigs.jsx`, `akira_maps.jsx` and `akira_other.jsx` were written from function
names only. With `client/` now in the repo, every call site and reply handler was read and all four files were rewritten to match:
- **Shapes** (`akira_shapes2.jsx`): `createPrimitive(circle|rect|cross|line)`, `applyShapePreset(dashes|waveWarp|roughenEdges|trimStart|trimEnd|exclusion)`,
  taper read-out for `getExtraShapeData`, La Path = corner-rounding rig (null per vertex + Radius/Left/Right sliders, pipe-string state),
  `shapeMorpher(dur, easing, return, linearPath, pairs, options)` with `ERROR:` replies, console `createCustomShapes`.
- **Rigs** (`akira_rigs.jsx`): carousel with the panel's 20 named controls (format auto/2d/3d/3d-sphere/2d-path/3d-path), orb cloner + effectors,
  `buildCarousel3D` mirroring the builder preview maths, glass morph, Liquid Glass hooks (`SUCCESS:msg`; needs the separate plugin),
  `fxLightSweepLock` -> `LOCKED`/`UNLOCKED`, Shatter from the playhead.
- **Maps** (`akira_maps.jsx`): real geographic map rigs. Precomp + Zoom/Pan/Bearing effects, Web-Mercator frames, basemap/borders/labels,
  fly-through keyframes, outlines/routes/data shapes, trackers for pins/bubbles/spikes, live sync, bake. `akiraMapEngineVersion = 20` (property).
- **Other** (`akira_other.jsx`): effects inspector rows `{fxIndex,fxName,matchName,propName,fxActive}`, follow-system-labels, text re-align
  (`OK:`+enc(JSON) replies), trim-to-below, extrusion, `run` dispatcher. `saasVersion = 0` (property).
- **Fixes in existing files**: `akira_organizer.jsx` now also exposes its functions on `$._akira` (the panel calls `$._akira.akiraProject*` and
  checks `$._akira.akiraProjectOrganizerVersion`; before, Organizer + Text Re-Align could not load). `client/js_akira/commands.js`: the console
  "make N shapes" command now URI-encodes its JSON (the raw JSON broke the `run()` quoting).
- New: `host/akira_json.jsx` (ES3 JSON parser on `H`, no eval), `host/map_rigs.jsx` (shim the Maps panel falls back to), `tools/wraptool.py`,
  `tools/build_cep.sh`, `tests/mock_ae.js` + `tests/test_contracts.js` (23 contract tests, all passing).

## Round Q (2026-10-05): the separately loaded engines
A full scan of every `$._akira.*`, `$._akiraHL.*`, `$._akiraSaaS.*`, `run('…')` and global `*_JF` / `*_AkiraGUI` name the panel evaluates now
resolves (233 `$._akira` names + 22 globals; the only unresolved strings are panel-side flags and Node helpers).
- `host/akira_shakes.jsx`: the 15 preset shakes + `AddCustomShake_JF` (globals, `(atCti, speed%, strength%, colorFx, flashFrames,
  flashStrength, flashColor, flashBlend, flashOn)` -> `"true"`). Each builds a `akira_shake` adjustment layer (Motion Tile + Transform keys
  following the panel's 14-frame envelopes; optics/invert/mosaic/flicker looks; optional flash).
- `host/akira_highlighter.jsx`: `$._akiraHL.list/create/apply/animate/remove/toEGP`, `highlighterVersion = 7`.
- `host/akira_showcase.jsx`: Motion Showcase (orbit / helix / depth) build, live update, render queue, selection; version global `1.0.1`.
- `host/akira_saas.jsx`: all 13 SaaS Effects (stagger, depth prepare/reveal, 3D cursor, proximity hover, text animations, code glyphs,
  prompt bar, halftone wave, UI carousel, attach, background, gradient wipe), `saasVersion = 9`.
- Version flags: `uiTemplateXVersion`, `_akiraReferenceWorkspaceHostVersion`; `reloadKeybinds` no-op.
- Shims named after the vendor host files the panel falls back to (`saas_effects.jsx`, `motion_showcase.jsx`, `project_organizer.jsx`,
  `type_realign.jsx`, `reference_workspace.jsx`, `ui_templates_extra.jsx`, `graph_editor_20.jsx`, `index.jsx`, `map_rigs.jsx`): each re-runs
  `akira_loader.jsx`, so a panel that missed the startup load recovers.
- `tests/test_engines.js` (6 tests) on top of `tests/test_contracts.js` (23).

The "Missing host engine: project_organizer.jsx" error seen in the Sougetsu_AkiraFX_test.zxp build came from that ZXP being packed with
the older host files (old organizer without the `$._akira` aliases, no maps/json, old shapes2/rigs/other). Always build from this repo
(`tools/build_cep.sh`).
