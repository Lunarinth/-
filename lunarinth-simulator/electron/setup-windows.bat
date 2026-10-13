@echo off
rem LUCENT NOCTURNE - Windows setup: downloads the Electron runtime once and installs the game
setlocal
set VER=44.7.0
set HERE=%~dp0
set OUT=%HERE%LucentNocturne
if exist "%OUT%\LucentNocturne.exe" goto run
echo Downloading Electron %VER% runtime (about 150MB, first run only)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol='Tls12';" ^
  "Invoke-WebRequest -Uri 'https://github.com/electron/electron/releases/download/v%VER%/electron-v%VER%-win32-x64.zip' -OutFile '%HERE%electron.zip';" ^
  "Expand-Archive -Force '%HERE%electron.zip' '%OUT%';" ^
  "Remove-Item '%HERE%electron.zip';" ^
  "Rename-Item '%OUT%\electron.exe' 'LucentNocturne.exe';" ^
  "Remove-Item -ErrorAction SilentlyContinue '%OUT%\resources\default_app.asar';" ^
  "Copy-Item -Recurse -Force '%HERE%app' '%OUT%\resources\app'"
if errorlevel 1 ( echo Setup failed. Check your internet connection. & pause & exit /b 1 )
:run
start "" "%OUT%\LucentNocturne.exe"
