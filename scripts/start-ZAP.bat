@echo off
setlocal

echo 🚀 Käynnistetään ZAP daemon...
set ZAP_JAVA_OPTIONS=-Xmx6G -Xms1G

cd /d "C:\Program Files\ZAP\Zed Attack Proxy"
call Zap.bat -daemon -port 8080 -config api.disablekey=true

endlocal