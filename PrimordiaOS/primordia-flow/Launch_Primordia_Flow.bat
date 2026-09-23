@echo off
title Primordia Flow — Sovereign Desktop Cockpit
cd /d "%~dp0"
echo ===================================================
echo   PRIMORDIA FLOW — SOVEREIGN DESKTOP COCKPIT
echo   Prospect Heat-Orbit Engine [Decoupled and Pure]
echo ===================================================
echo Root Directory: %CD%
echo Starting Daemon (Port 3006), Vite UI (Port 5174), and Electron Shell...
echo.
call npm run dev
pause
