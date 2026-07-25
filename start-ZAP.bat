@echo off
setlocal

echo 🚀 Käynnistetään ZAP daemon omassa ikkunassaan...
set ZAP_JAVA_OPTIONS=-Xmx6G -Xms1G

cd /d "C:\Program Files\ZAP\Zed Attack Proxy"

:: Avataan TÄYSIN ERILLINEN komentorivi-ikkuna ZAP:lle
start "ZAP Daemon Window" cmd /k "Zap.bat -daemon -port 8080 -config api.disablekey=true"

echo ✅ ZAP-ikkuna avattu taustalle!
endlocal