#!/usr/bin/env bash
# Windows용 실행 파일(zip) 만들기: Electron 배포판을 내려받아 게임을 resources/app 에 넣는다.
#   사용법: bash electron/build-win.sh   →  dist/LucentNocturne-win32-x64.zip
set -euo pipefail
VER="${ELECTRON_VERSION:-44.7.0}"
HERE="$(cd "$(dirname "$0")" && pwd)"; GAME="$(cd "$HERE/.." && pwd)"
OUT="$GAME/dist"; NAME="LucentNocturne-win32-x64"; CACHE="$OUT/.cache"
mkdir -p "$CACHE"; rm -rf "$OUT/$NAME"
ZIP="$CACHE/electron-v$VER-win32-x64.zip"
[ -f "$ZIP" ] || curl -fL --retry 4 -o "$ZIP" "https://github.com/electron/electron/releases/download/v$VER/electron-v$VER-win32-x64.zip"
mkdir -p "$OUT/$NAME" && (cd "$OUT/$NAME" && unzip -q "$ZIP")
mv "$OUT/$NAME/electron.exe" "$OUT/$NAME/LucentNocturne.exe"
rm -f "$OUT/$NAME/resources/default_app.asar"
APP="$OUT/$NAME/resources/app"; mkdir -p "$APP/game"
cp "$HERE/main.js" "$HERE/package.json" "$APP/"
cp -r "$GAME/index.html" "$GAME/css" "$GAME/js" "$GAME/vendor" "$GAME/assets" "$APP/game/"
cat > "$OUT/$NAME/README.txt" <<'TXT'
LUCENT NOCTURNE — 루센트 야상곡
LucentNocturne.exe 를 실행하세요. (F11 전체 화면)
조작: 방향키 이동 · Z 샷 · X 성광 · C 액티브 스킬 · Shift 저속 · Esc 일시정지
TXT
(cd "$OUT" && rm -f "$NAME.zip" && zip -qr -9 "$NAME.zip" "$NAME")
ls -la "$OUT/$NAME.zip"
