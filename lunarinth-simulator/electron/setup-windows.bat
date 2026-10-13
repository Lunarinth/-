@echo off
chcp 65001 >nul
rem LUCENT NOCTURNE - Windows 설치: Electron 런타임을 내려받아 게임과 합친다 (한 번만 실행)
setlocal
set VER=44.7.0
set HERE=%~dp0
set OUT=%HERE%LucentNocturne
if exist "%OUT%\LucentNocturne.exe" goto run
echo Electron %VER% 다운로드 중... (약 150MB)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol='Tls12';" ^
  "Invoke-WebRequest -Uri 'https://github.com/electron/electron/releases/download/v%VER%/electron-v%VER%-win32-x64.zip' -OutFile '%HERE%electron.zip';" ^
  "Expand-Archive -Force '%HERE%electron.zip' '%OUT%';" ^
  "Remove-Item '%HERE%electron.zip';" ^
  "Rename-Item '%OUT%\electron.exe' 'LucentNocturne.exe';" ^
  "Remove-Item -ErrorAction SilentlyContinue '%OUT%\resources\default_app.asar';" ^
  "Copy-Item -Recurse -Force '%HERE%app' '%OUT%\resources\app'"
if errorlevel 1 ( echo 설치 실패. 인터넷 연결을 확인하세요. & pause & exit /b 1 )
:run
start "" "%OUT%\LucentNocturne.exe"
