@echo off
REM ── Browser Print Station launcher (kiosk) ───────────────────────
REM Opens the laptop print station full-screen in Chrome/Edge and keeps
REM Windows awake. Put a shortcut to this in shell:startup to auto-run on boot.
REM
REM EDIT the STATION_URL below to your deployed app's laptop page.

set "STATION_URL=https://mahankalfoodpark.vercel.app/"

REM Keep the machine awake while it acts as the print station.
powercfg /change standby-timeout-ac 0 >nul 2>nul
powercfg /change monitor-timeout-ac 0 >nul 2>nul
powercfg /change disk-timeout-ac 0 >nul 2>nul
powercfg /change hibernate-timeout-ac 0 >nul 2>nul

set "PROFILE=%LOCALAPPDATA%\PrintStationChrome"

REM Find Chrome, fall back to Edge.
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if "%BROWSER%"=="" if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if "%BROWSER%"=="" (
  echo Chrome or Edge not found. Install Chrome from https://google.com/chrome
  pause
  exit /b 1
)

echo Launching print station: %STATION_URL%
"%BROWSER%" --kiosk --app="%STATION_URL%" --user-data-dir="%PROFILE%" --disable-features=Translate --no-first-run --disable-session-crashed-bubble --disable-background-timer-throttling --overscroll-history-navigation=0
