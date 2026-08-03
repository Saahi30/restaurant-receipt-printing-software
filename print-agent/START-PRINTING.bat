@echo off
title Restaurant Print Agent
REM ================================================================
REM  DOUBLE-CLICK THIS FILE to start printing.
REM  It prints a "TEST OK" receipt first, then prints every bill
REM  sent from the phones automatically. Leave this window open.
REM  (First run only: it installs what it needs and asks for settings.)
REM ================================================================
cd /d "%~dp0"

REM --- Make sure Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Please install it from https://nodejs.org
  echo Then double-click this file again.
  echo.
  pause
  exit /b 1
)

REM --- First-run: install dependencies ---
if not exist "node_modules" (
  echo Setting up for the first time, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo Setup failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

REM --- First-run: create the settings file ---
if not exist ".env" (
  echo No settings file found. Creating one from the template...
  copy ".env.example" ".env" >nul
  echo Please check the settings (printer name / app URL), then save and close Notepad.
  notepad ".env"
)

echo.
echo ================================================================
echo  Print agent starting. A TEST OK receipt will print now.
echo  Keep this window open while the restaurant is running.
echo  (Close this window or press Ctrl+C to stop printing.)
echo ================================================================
echo.

:loop
node index.mjs
echo.
echo Agent stopped (code %errorlevel%). Restarting in 5 seconds...
echo Press Ctrl+C now to stop for good.
timeout /t 5 /nobreak >nul
goto loop
