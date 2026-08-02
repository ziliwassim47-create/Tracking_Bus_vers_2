@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Lancement de Tracking Bus sur http://localhost:9000
echo.
start "" http://localhost:9000
node server.js
if errorlevel 1 (
  echo.
  echo Node.js est introuvable. Tentative avec Python...
  start "" http://localhost:9000
  py -m http.server 9000 --directory www
)
pause
