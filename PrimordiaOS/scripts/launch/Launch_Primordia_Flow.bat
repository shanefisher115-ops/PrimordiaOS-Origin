@echo off
title Launching Primordia Flow Dedicated Desktop App...
cd /d "C:\Users\Shane\Documents\dev\PrimordiaOS\primordia-flow"
echo ===================================================
echo   PRIMORDIA FLOW — SOVEREIGN DESKTOP COCKPIT
echo   Dedicated PHOM Engine (Port 3006 / Port 5174)
echo ===================================================
echo Launching from: %CD%
echo.
call npm run dev
pause
