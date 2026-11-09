#!/bin/sh
# Re-sign the newest APK with the template debug key (what both phones have), then install it as an update.
set -e
REPO=/c/Users/mosheg/Documents/ReactNative/sudoku-fight
SCR=/c/Users/mosheg/AppData/Local/Temp/claude/c--Users-mosheg-Documents-ReactNative-sudoku-fight/4440d2fa-e446-41ad-83db-f79035cdf42c/scratchpad
BT="$LOCALAPPDATA/Android/Sdk/build-tools/36.0.0"
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
SRC=$(ls -t "$REPO"/apps/mobile/apk/*.apk | head -1)
OUT="$SCR/sudoku-fight-debugkey.apk"
echo "source: $SRC"
"$BT/apksigner.bat" sign --ks "$REPO/apps/mobile/android/app/debug.keystore" --ks-pass pass:android \
  --ks-key-alias androiddebugkey --key-pass pass:android --out "$OUT" "$SRC"
"$BT/apksigner.bat" verify --print-certs "$OUT" | grep -i "SHA-256"
for s in $(adb devices | awk 'NR>1 && $2=="device"{print $1}'); do
  echo "== $s"; "$ADB" -s $s install -r "$OUT"
  "$ADB" -s $s shell dumpsys package com.mosheg.sudokufight | grep -m1 versionName || true
done
