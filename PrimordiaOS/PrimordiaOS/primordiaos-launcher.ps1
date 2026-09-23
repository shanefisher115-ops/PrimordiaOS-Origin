# ==========================================
#   PRIMORDIAOS MASTER LAUNCHER (FULL FILE)
# ==========================================

Write-Host "`n=== PrimordiaOS Boot Sequence Initiated ===" -ForegroundColor Cyan

# Root directory for all PrimordiaOS modules
$root = "C:\Users\Shane\PrimordiaOS"

# Define services and their ports
$services = @(
    @{ name="PLUGIN-OS";         path="$root\plugin-os";         cmd="node index.js";     port=3001 },
    @{ name="SIMULATION-BRIDGE"; path="$root\simulation-bridge"; cmd="npm start";         port=4000 },
    @{ name="COCKPIT";           path="$root\cockpit";           cmd="npm run dev";       port=3000 }
)

# Function: Check if a port is already in use
function Test-Port {
    param([int]$port)
    try {
        $tcp = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
        return $tcp -ne $null
    } catch {
        return $false
    }
}

# Function: Launch a service in a new PowerShell window
function Launch-Service {
    param($svc)

    Write-Host "`n[$($svc.name)] Checking port $($svc.port)..." -ForegroundColor Yellow

    if (Test-Port $svc.port) {
        Write-Host "Port $($svc.port) is already in use. Skipping launch." -ForegroundColor Red
        return
    }

    Write-Host "Launching $($svc.name)..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "cd $($svc.path); $($svc.cmd)"
}

# Launch all defined services
foreach ($svc in $services) {
    Launch-Service $svc
}

# Wait for cockpit to boot
Start-Sleep -Seconds 5

# Open cockpit UI automatically
Write-Host "`nOpening Cockpit UI..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "`n=== PrimordiaOS Boot Complete ===" -ForegroundColor Cyan
