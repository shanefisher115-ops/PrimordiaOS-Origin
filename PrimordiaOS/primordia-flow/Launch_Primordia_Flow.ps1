# Launch_Primordia_Flow.ps1
Set-Location "C:\Users\Shane\Documents\dev\PrimordiaOS\primordia-flow"
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  PRIMORDIA FLOW - SOVEREIGN DESKTOP COCKPIT" -ForegroundColor Green
Write-Host "  Dedicated PHOM Engine (Port 3006 / Port 5174)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Project directory: $PWD"
Write-Host "Starting dedicated daemon, Vite UI, and Electron shell..." -ForegroundColor Yellow
npm run dev
