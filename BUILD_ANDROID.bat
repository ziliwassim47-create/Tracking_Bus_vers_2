@echo off
chcp 65001 >nul
cd /d "%~dp0"
cordova build android
pause
