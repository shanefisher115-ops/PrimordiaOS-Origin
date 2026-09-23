<#
.SYNOPSIS
    PrimordiaOS Niagara & Unreal Bridge Pulse Test Script
.DESCRIPTION
    Emits a test particle pulse telemetry signal to the Primordia masterplane server.
.EXAMPLE
    .\test-pulse.ps1
    .\test-pulse.ps1 -Type "niagara_pulse" -Color "#FF0055"
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$Type = "niagara_pulse",

    [Parameter(Mandatory = $false)]
    [double]$X = 0.0,

    [Parameter(Mandatory = $false)]
    [double]$Y = 0.0,

    [Parameter(Mandatory = $false)]
    [double]$Z = 100.0,

    [Parameter(Mandatory = $false)]
    [string]$Color = "#00FFCC",

    [Parameter(Mandatory = $false)]
    [int]$Port = 3000
)

$payload = @{
    type      = $Type
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    data      = @{
        x        = $X
        y        = $Y
        z        = $Z
        color    = $Color
        velocity = @{ x = 0; y = 0; z = 50 }
    }
} | ConvertTo-Json -Depth 5

Write-Host "`n=== 🌌 PrimordiaOS Telemetry Pulse Dispatcher ===" -ForegroundColor Cyan
Write-Host "Target:  http://localhost:$Port/api/unreal/signal" -ForegroundColor Yellow
Write-Host "Payload: Type=$Type, Coord=($X, $Y, $Z), Color=$Color" -ForegroundColor DarkGray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/unreal/signal" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 3
    Write-Host "✅ Pulse signal successfully delivered to masterplane!" -ForegroundColor Green
    $response | Format-List
} catch {
    Write-Warning "Masterplane server on port $Port is offline or did not respond: $($_.Exception.Message)"
    Write-Host "Payload ready for dispatch when masterplane boots:" -ForegroundColor DarkGray
    Write-Host $payload -ForegroundColor DarkCyan
}
