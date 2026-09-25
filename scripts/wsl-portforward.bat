@echo off
REM Reenvio del puerto 3000 de WSL2 hacia la LAN (WSL2 NAT -> Windows host -> red local).
REM Ejecutar como administrador (PowerShell o cmd) cada vez que se reinicie WSL o el PC.

setlocal

set PORT=3000
set RULE=FutbolStats-3000

for /f %%i in ('wsl hostname -I') do set WSL_IP=%%i
if "%WSL_IP%"=="" (
    echo ERROR: no se pudo obtener la IP de WSL. Corra "wsl --shutdown" y vuelva a abrir WSL.
    exit /b 1
)

echo Reenviando 0.0.0.0:%PORT% ^<-^> %WSL_IP%:%PORT%

netsh interface portproxy delete v4tov4 listenport=%PORT% listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=%PORT% listenaddress=0.0.0.0 connectport=%PORT% connectaddress=%WSL_IP%

netsh advfirewall firewall show rule name=%RULE% >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name=%RULE% dir=in action=allow protocol=TCP localport=%PORT%
)

netsh interface portproxy show v4tov4
echo Listo. Desde otro dispositivo de la LAN abrir: http://IP-de-Windows:%PORT%
endlocal