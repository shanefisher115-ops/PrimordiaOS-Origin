# PrimordiaOS - Antigravity Director PowerShell Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🌌 Starting Primordia Sovereign Director (Google Antigravity REPL)..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
& ".\.venv\Scripts\python.exe" "primordia_antigravity_director.py" --loop
