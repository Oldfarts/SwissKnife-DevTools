@echo off
setlocal

echo 🚀 Avataan Playwright taustapalvelu uuteen ikkunaan...
cd /d "%~dp0"

:: Avaa uuden erillisen cmd-ikkunan, jossa serveri käynnistyy ja ikkuna jää auki (/k)
start cmd.exe /k "node playwrightServer.js"

endlocal