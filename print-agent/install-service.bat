@echo off
REM ── Install the print agent as a Windows service using NSSM ───────
REM This makes it start automatically on boot BEFORE anyone logs in,
REM and restart itself if it ever crashes. Fully unattended.
REM
REM 1) Download NSSM from https://nssm.cc/download and put nssm.exe on PATH
REM    (or in this folder), then run this file as Administrator.
REM 2) To remove later:  nssm remove RestaurantPrintAgent confirm

setlocal
cd /d "%~dp0"

where nssm >nul 2>nul
if errorlevel 1 (
  if not exist "nssm.exe" (
    echo nssm.exe not found. Download it from https://nssm.cc/download
    echo and place nssm.exe in this folder, then run this again as Administrator.
    pause
    exit /b 1
  )
  set "NSSM=%~dp0nssm.exe"
) else (
  set "NSSM=nssm"
)

for /f "delims=" %%i in ('where node') do set "NODE=%%i"
if "%NODE%"=="" (
  echo Node.js not found on PATH. Install it from https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" call npm install

echo Installing service RestaurantPrintAgent...
%NSSM% install RestaurantPrintAgent "%NODE%" "%~dp0index.mjs"
%NSSM% set RestaurantPrintAgent AppDirectory "%~dp0"
%NSSM% set RestaurantPrintAgent Start SERVICE_AUTO_START
%NSSM% set RestaurantPrintAgent AppStdout "%~dp0agent.log"
%NSSM% set RestaurantPrintAgent AppStderr "%~dp0agent.log"
%NSSM% set RestaurantPrintAgent AppRotateFiles 1
%NSSM% start RestaurantPrintAgent

echo.
echo Done. The agent now runs on every boot. Logs: %~dp0agent.log
pause
