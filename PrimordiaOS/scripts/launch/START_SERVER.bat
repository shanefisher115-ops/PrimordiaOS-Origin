@echo off
title PrimordiaOS Masterplane - Unreal Engine 5.8
echo ========================================================
echo   PRIMORDIAOS // UNREAL ENGINE 5.8 MASTERPLANE SERVER
echo ========================================================
echo Starting server on http://localhost:3000 ...
echo Web Cockpit: http://localhost:3000/arcade
echo WebSocket:   ws://localhost:3000/ws
echo.
node server/sync.js
pause
