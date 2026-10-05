#!/bin/bash
# Sougetsu Akira FX - installer for macOS (unsigned / debug CEP build). Double-click it after unzipping.
cd "$(dirname "$0")"
ID=com.sougetsu.akirafx
if [ ! -f "$ID/CSXS/manifest.xml" ]; then echo "The $ID folder must sit next to this file."; read -p "Press Enter"; exit 1; fi
if pgrep -f "After Effects" >/dev/null; then echo "Please quit After Effects first."; read -p "Press Enter"; exit 1; fi
for R in "$HOME/Library/Application Support/Adobe/CEP/extensions" "/Library/Application Support/Adobe/CEP/extensions"; do
  [ -d "$R" ] || continue
  for D in "$R"/*/; do
    if grep -q "$ID" "$D/CSXS/manifest.xml" 2>/dev/null; then echo "removing $D"; rm -rf "$D" 2>/dev/null || sudo rm -rf "$D"; fi
  done
done
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/$ID"
mkdir -p "$(dirname "$DEST")" && cp -R "$ID" "$DEST"
for V in 7 8 9 10 11 12 13; do defaults write com.adobe.CSXS.$V PlayerDebugMode 1; done
killall cfprefsd 2>/dev/null
echo "Installed. Start After Effects > Window > Extensions (Legacy) > Sougetsu Akira FX"
read -p "Press Enter to close"
