@echo off
setlocal

@echo off
title Playwright Background Server
node src\tools\playwright\playwrightServer.js
pause

endlocal