@echo off
setlocal

echo 🚀 Käynnistetään ZAP daemon tässä ikkunassa...
set ZAP_JAVA_OPTIONS=-Xmx6G -Xms1G

cd /d "C:\Program Files\ZAP\Zed Attack Proxy"

:: Käynnistetään suoraan ilman "start"-komentoa (ei avaa uutta ikkunaa)
call Zap.bat -daemon -port 8080 -config api.disablekey=true

endlocal