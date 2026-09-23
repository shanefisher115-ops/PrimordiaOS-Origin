# ================================
#  PRIMORDIAOS CONSTELLATION LAUNCH
#  Canonical Boot Sequence
#  Location: C:\Users\Shane\PrimordiaOS
# ================================

Write-Host ""
Write-Host "🌌  PrimordiaOS Constellation — Boot Sequence Initiated" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host ""

# --- PATHS ------------------------------------------------
$Root        = "C:\Users\Shane\PrimordiaOS"
$Backend     = "$Root\backend"
$Frontend    = "$Root\frontend"
$LogDir      = "$Root\logs"
$BusChannel  = "$Root\telemetry"

# Ensure log directory exists
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# --- KERNEL & BUS -----------------------------------------
Write-Host "🧠  Initializing Kernel & Telemetry Bus..." -ForegroundColor Yellow

# Kernel boot
Start-Process powershell -ArgumentList "cd `"$Backend`"; npm run kernel" `
    -WindowStyle Minimized `
    -RedirectStandardOutput "$LogDir\kernel.log" `
    -RedirectStandardError "$LogDir\kernel-error.log"

# Telemetry bus
Start-Process powershell -ArgumentList "cd `"$Backend`"; npm run bus" `
    -WindowStyle Minimized `
    -RedirectStandardOutput "$LogDir\bus.log" `
    -RedirectStandardError "$LogDir\bus-error.log"

Write-Host "✔ Kernel + Bus online" -ForegroundColor Green
Write-Host ""

# --- BACKEND ----------------------------------------------
Write-Host "⚙️  Starting PrimordiaOS Backend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "cd `"$Backend`"; npm run dev" `
    -WindowStyle Minimized `
    -RedirectStandardOutput "$LogDir\backend.log" `
    -RedirectStandardError "$LogDir\backend-error.log"

Write-Host "✔ Backend online" -ForegroundColor Green
Write-Host ""

# --- FRONTEND ---------------------------------------------
Write-Host "🎨  Launching PrimordiaOS Cockpit UI..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "cd `"$Frontend`"; npm run dev" `
    -WindowStyle Normal `
    -RedirectStandardOutput "$LogDir\frontend.log" `
    -RedirectStandardError "$LogDir\frontend-error.log"

Write-Host "✔ Frontend cockpit online" -ForegroundColor Green
Write-Host ""

# --- CONSTELLATION STATUS ---------------------------------
Write-Host "✨  Constellation Status" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"
Write-Host "Root:        $Root"
Write-Host "Backend:     $Backend"
Write-Host "Frontend:    $Frontend"
Write-Host "Logs:        $LogDir"
Write-Host ""
Write-Host "🚀  PrimordiaOS is now active across the unified constellation."
Write-Host ""
