@echo off
REM ── Restaurant Print Agent launcher ──────────────────────────────
REM Double-click this, or point Task Scheduler / the Startup folder at it.
cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo npm install failed. Make sure Node.js is installed: https://nodejs.org
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo No .env found. Copy .env.example to .env and fill it in.
  copy ".env.example" ".env" >nul
  echo Created a starter .env — edit it with your APP_BASE_URL, then re-run.
  notepad ".env"
  pause
  exit /b 1
)

echo Starting print agent... (leave this window open)
:loop
node index.mjs
echo Agent exited (code %errorlevel%). Restarting in 5s... Press Ctrl+C to stop.
timeout /t 5 /nobreak >nul
goto loop
