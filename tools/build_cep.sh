#!/usr/bin/env bash
# Assemble the installable CEP folder dist/com.sougetsu.akirafx/ (+ a zip of it) from this repo.
# Debug/unsigned build: install by copying the folder into the CEP extensions directory and enabling PlayerDebugMode.
set -euo pipefail
cd "$(dirname "$0")/.."
ID=com.sougetsu.akirafx
OUT=dist/$ID
rm -rf "$OUT" "dist/$ID.zip"
mkdir -p "$OUT"
cp -R CSXS client host assets "$OUT"/
# Chrome DevTools for the panel at http://localhost:8088 while PlayerDebugMode is on
cat > "$OUT/.debug" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.sougetsu.akirafx"><HostList><Host Name="AEFT" Port="8088"/></HostList></Extension>
</ExtensionList>
XML
find "$OUT" \( -name '.DS_Store' -o -name '*.pyc' -o -name '__pycache__' \) -prune -exec rm -rf {} +
cp tools/package/INSTALL_WINDOWS.bat tools/package/INSTALL_MAC.command tools/package/README.txt tools/akira_selftest.jsx dist/
(cd dist && zip -qr "$ID.zip" "$ID" INSTALL_WINDOWS.bat INSTALL_MAC.command README.txt akira_selftest.jsx)
echo "Built $OUT ($(du -sh "$OUT" | cut -f1)) and dist/$ID.zip"
