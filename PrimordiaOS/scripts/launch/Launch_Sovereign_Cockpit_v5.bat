@echo off
title Sovereign Cockpit v5 (Node-Only Architecture)
echo Starting Sovereign Cockpit v5 on port 5055...
start "" http://localhost:5055
node "%~dp0cockpit\server.js"
pause
