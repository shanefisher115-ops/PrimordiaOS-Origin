# ==============================================================================
# PRIMORDIAOS - OPEN COCKPIT HUD & DASHBOARD IN BROWSER
# ==============================================================================

$dashboardPath = "C:\Users\Shane\Documents\dev\PrimordiaOS\primordiaos\interfaces\dashboard.html"
$url = "http://localhost:3000"

# Check if port 3000 is listening
$serverRunning = $false
try {
    $res = Invoke-WebRequest -Uri "$url/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
    if ($res.StatusCode -eq 200) {
        $serverRunning = $true
    }
} catch {
    $serverRunning = $false
}

if ($serverRunning) {
    Write-Host "Opening Live PrimordiaOS Cockpit HUD at $url..." -ForegroundColor Cyan
    Start-Process $url
} else {
    Write-Host "Opening PrimordiaOS Cockpit HUD directly from disk..." -ForegroundColor Cyan
    Start-Process $dashboardPath
}
