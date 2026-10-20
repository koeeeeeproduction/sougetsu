#!/usr/bin/env bash
# Build the installable Sowveil extension: dist/com.sowveil (folder) + dist/Sowveil_<version>.zxp (signed).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist/com.sowveil
VER=$(sed -n 's/.*ExtensionBundleVersion="\([^"]*\)".*/\1/p' sowveil/CSXS/manifest.xml | head -1)
rm -rf "$OUT" dist/Sowveil_*.zxp
mkdir -p "$OUT"
cp -R sowveil/CSXS sowveil/css sowveil/js sowveil/host sowveil/py sowveil/assets sowveil/index.html "$OUT"/
cat > "$OUT/.debug" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<ExtensionList>
  <Extension Id="com.sowveil.panel"><HostList><Host Name="AEFT" Port="8090"/></HostList></Extension>
</ExtensionList>
XML
find "$OUT" \( -name '.DS_Store' -o -name 'Thumbs.db' \) -delete
ZXP_SIGN_ID=sowveil ZXP_SIGN_ORG=Sowveil ZXP_SIGN_CN=Sowveil python3 tools/make_zxp.py "$OUT" "dist/Sowveil_$VER.zxp"
echo "Built $OUT and dist/Sowveil_$VER.zxp"
