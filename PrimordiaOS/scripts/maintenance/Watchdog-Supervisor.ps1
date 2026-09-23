<#
.SYNOPSIS
    MoneyPlugHub Antigravity Persistent Watchdog Daemon
#>

$TargetScript = Join-Path $PWD "MoneyPlugHub-Antigravity.ps1"

Write-Host "==================================================" -ForegroundColor Magenta
Write-Host "   MONEYPLUGHUB PERSISTENT WATCHDOG DAEMON        " -ForegroundColor Cyan
Write-Host "   Target: $TargetScript" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Magenta

if (-not (Test-Path $TargetScript)) {
    Write-Host "[FATAL] Cannot find $TargetScript" -ForegroundColor Red
    exit 1
}

while ($true) {
    Write-Host "[WATCHDOG] Spawning Antigravity Node..." -ForegroundColor Cyan
    
    $process = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$TargetScript`"" `
        -PassThru `
        -NoNewWindow `
        -Wait

    $exitCode = $process.ExitCode
    Write-Host "[WATCHDOG] Node exited (Code: $exitCode). Respawning in 2s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}
