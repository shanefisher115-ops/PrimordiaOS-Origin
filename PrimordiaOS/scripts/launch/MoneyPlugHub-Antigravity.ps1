[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [int]$HeartbeatIntervalSec = 1,

    [Parameter(Mandatory=$false)]
    [string]$NodeId = "NODE_$(Get-Random -Minimum 1000 -Maximum 9999)",

    [Parameter(Mandatory=$false)]
    [string]$LogFile = ".\antigravity_telemetry.log"
)

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "   MONEYPLUGHUB ANTIGRAVITY ENGINE // QUANTUM CONSOLE MODE     " -ForegroundColor Magenta
Write-Host "   Node ID : $NodeId | Mode: LIVE STREAM & LOG" -ForegroundColor Gray
Write-Host "===============================================================" -ForegroundColor Cyan

while ($true) {
    $mem = Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction SilentlyContinue
    $freeMemMB = if ($mem) { [math]::Round($mem.FreePhysicalMemory / 1024, 2) } else { 0 }
    
    $grav = [math]::Round((Get-Random -Minimum 0.050 -Maximum 0.999), 4)
    $vel = [math]::Round((Get-Random -Minimum 120.0 -Maximum 480.0), 2)
    $entropy = [math]::Round((Get-Random -Minimum 0.0001 -Maximum 0.0099), 5)
    $ts = Get-Date -Format "HH:mm:ss.fff"

    $logEntry = "[$ts] [PULSE] 🌌 G-Field: $grav | Velocity: $vel m/s | Entropy: $entropy | Mem: ${freeMemMB}MB"
    Write-Host $logEntry -ForegroundColor Green
    Add-Content -Path $LogFile -Value $logEntry

    Start-Sleep -Seconds $HeartbeatIntervalSec
}
