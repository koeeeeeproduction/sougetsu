# Akira FX — CEP build base (for the Claude Code session)

This folder is the full clean-room extension base your Code session asked for. Drop its
CONTENTS into the Code session's project folder/branch.

## What's here
- `client/` — the panel UI (index.html, js_flex, css_flex, i18n, etc.)
- `CSXS/manifest.xml` — extension identity (bundle id com.sougetsu.akirafx)
- `host/` — all clean-room host files:
  - base: akira_core, akira_tools (defines the shared helper H), akira_tools2, akira_color,
    akira_text, akira_library, akira_layers, akira_expressions, akira_subtitles,
    akira_reference, akira_general, akira_curve, akira_organizer, akira_shapes, paste_feature
  - added: akira_colormatch, akira_captions, akira_fonts, akira_counters, akira_projectscan, akira_other
- `host/akira_loader.jsx` — already updated to load ALL of the above IN ORDER, plus a line
  for `akira_maps.jsx` (that file is in your Code branch — just drop it into host/).

## What the Code session still needs to do
1. Add `akira_maps.jsx` (and any of akira_shapes2/akira_rigs it made) into `host/` — the
   loader already references akira_maps.jsx.
2. **Line up reply formats:** for every function in the added files, check how the panel calls
   it and what it expects back by reading `client/index.html` (and js_flex/*). The added files
   guessed "SUCCESS"/"ERR:"/"OK:"+json; confirm each against the panel's reply handler.
3. Build the install folder `com.sougetsu.akirafx/` and give the install + debug-mode steps.

## Install (CEP debug, no ZXP/signing)
- Copy the folder to:
  - Windows: `%APPDATA%\Adobe\CEP\extensions\com.sougetsu.akirafx\`
  - Mac: `~/Library/Application Support/Adobe/CEP/extensions/com.sougetsu.akirafx/`
- Enable debug mode (unsigned panels):
  - Windows: registry `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` (and .10, .12) → string
    value `PlayerDebugMode` = `1`
  - Mac: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1` (repeat for .10/.12)
- Restart After Effects → Window → Extensions → Sougetsu Akira FX.

## Notes
- Host files are ES3 ExtendScript. `node --check` will falsely fail on the `.jsx` extension;
  that's not a syntax error. All files parse clean under an ES3/ES5 parser.
- Nothing here has been run in real After Effects. Test by installing and clicking; report the
  exact tab + button + error text for anything that fails.
