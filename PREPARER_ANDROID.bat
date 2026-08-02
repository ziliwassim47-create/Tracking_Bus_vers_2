@echo off
chcp 65001 >nul
cd /d "%~dp0"
where cordova >nul 2>nul
if errorlevel 1 (
  echo Cordova CLI n'est pas installé globalement.
  echo Installer avec : npm install -g cordova
  pause
  exit /b 1
)
cordova platform add android
cordova prepare android
pause
