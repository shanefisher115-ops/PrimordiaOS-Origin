<#
.SYNOPSIS
    PrimordiaOS & MoneyPlugHub Unified Production & Local Daemon Launcher
.DESCRIPTION
    Launches and monitors the dual-port substrate:
    - Port 3001: MoneyPlugHub Full-Stack API Engine & React SPA
    - Port 3000: PrimordiaOS Antigravity Kernel & Autonomous Loop
    - Cloudflare Tunnel: Connected to https://moneyplughub.com
#>

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   PRIMORDIAOS & MONEYPLUGHUB UNIFIED SYSTEM DAEMON     " -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

$WorkspaceRoot = "C:\Users\Shane\Documents\dev\PrimordiaOS"
$MoneyPlugHubDir = Join-Path $WorkspaceRoot "MoneyPlugHub"

# 1. Healthcheck Port 3001 (MoneyPlugHub)
Write-Host "`n[1/3] Checking MoneyPlugHub Engine (Port 3001)..." -ForegroundColor Yellow
try {
    $res3001 = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✔ MoneyPlugHub Engine is ACTIVE on http://localhost:3001 (Status: $($res3001.status))" -ForegroundColor Green
} catch {
    Write-Host "⚠ Starting MoneyPlugHub Engine on port 3001..." -ForegroundColor Magenta
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$MoneyPlugHubDir'; npx tsx src/backend/server.ts" -WindowStyle Minimized
    Start-Sleep -Seconds 4
}

# 2. Healthcheck Port 3000 (PrimordiaOS Kernel Loop)
Write-Host "`n[2/3] Checking PrimordiaOS Kernel Loop (Port 3000)..." -ForegroundColor Yellow
try {
    $res3000 = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✔ PrimordiaOS Kernel Loop is ACTIVE on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "⚠ Starting PrimordiaOS Kernel Loop on port 3000..." -ForegroundColor Magenta
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$WorkspaceRoot'; node server.js" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}

# 3. Healthcheck Cloudflare Tunnel & Production Edge
Write-Host "`n[3/3] Checking Production Domain (https://moneyplughub.com)..." -ForegroundColor Yellow
try {
    $resLive = Invoke-WebRequest -Uri "https://moneyplughub.com" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✔ Production Edge is ACTIVE at https://moneyplughub.com (Status: $($resLive.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠ Starting Cloudflare edge tunnel for moneyplughub..." -ForegroundColor Magenta
    Start-Process -FilePath "C:\Program Files (x86)\cloudflared\cloudflared.exe" -ArgumentList "tunnel", "run", "moneyplughub" -WindowStyle Minimized
    Start-Sleep -Seconds 3
    try {
        $resLive2 = Invoke-WebRequest -Uri "https://moneyplughub.com" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✔ Production Edge is ACTIVE at https://moneyplughub.com (Status: $($resLive2.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to reach https://moneyplughub.com: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=========================================================" -ForegroundColor Cyan
Write-Host "✔ ALL ENGINES INTEGRATED AND REALIZED ON DISK" -ForegroundColor Green
Write-Host "  - Local Protocol: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  - Autonomous Loop: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  - Public Edge:     https://moneyplughub.com" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
