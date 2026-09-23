# ================================================================
#   PrimordiaOS Big Bang Launcher
#   Realm / Universe Bootstrap: Core, Unreal, Antigravity, DaVinci
# ================================================================

Write-Host "=== PRIMORDIA BIG BANG ==="
Write-Host "Initializing multi-realm universe..."

# -----------------------------
# Paths
# -----------------------------
$root = "C:\Users\Shane\Documents\dev\PrimordiaOS"

$coreKernel      = Join-Path $root "PrimordiaKernel"
$frontend        = Join-Path $root "frontend"
$backend         = Join-Path $root "server.ts"
$unrealProject   = Join-Path $root "PrimordiaUnreal.uproject"
$unrealEditor    = "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
$pixelStreamer   = Join-Path $root "PixelStreamServer\start_pixelstream.ps1"
$antigravityIde  = Join-Path $root "AntigravityIDE"
$daVinciRealm    = Join-Path $root "Primordia-ai"

# -----------------------------
# Helper: Start a process safely
# -----------------------------
function Start-Realm {
    param(
        [string]$Name,
        [string]$Command,
        [string]$Args = ""
    )

    Write-Host "[REALM] Starting $Name ..."
    try {
        if ($Args -ne "") {
            Start-Process $Command -ArgumentList $Args | Out-Null
        } else {
            Start-Process $Command | Out-Null
        }
        Write-Host "[OK] $Name realm online."
    } catch {
        Write-Host "[ERROR] Failed to start $Name realm: $($_.Exception.Message)"
    }
}

# -----------------------------
# 1. Core PrimordiaOS Kernel
# -----------------------------
if (Test-Path $coreKernel) {
    Write-Host "[INIT] Primordia Kernel realm..."
    Start-Realm -Name "PrimordiaKernel" -Command "powershell" -Args "-ExecutionPolicy Bypass -Command `\"cd `"$coreKernel`"; npm run kernel`""
} else {
    Write-Host "[WARN] PrimordiaKernel realm missing."
}

# -----------------------------
# 2. Backend Reality Engine (MoneyPlugHub + Supabase + SQLite)
# -----------------------------
if (Test-Path $backend) {
    Write-Host "[INIT] Backend Reality Engine (MoneyPlugHub)..."
    Start-Realm -Name "BackendRealityEngine" -Command "powershell" -Args "-ExecutionPolicy Bypass -Command `\"cd `"$root`"; npm run server`""
} else {
    Write-Host "[WARN] Backend server.ts not found."
}

# -----------------------------
# 3. Frontend HUD / Reality Console
# -----------------------------
if (Test-Path $frontend) {
    Write-Host "[INIT] Frontend HUD (Reality Engine UI)..."
    Start-Realm -Name "FrontendHUD" -Command "powershell" -Args "-ExecutionPolicy Bypass -Command `\"cd `"$frontend`"; npm run dev`""
} else {
    Write-Host "[WARN] Frontend directory not found."
}

# -----------------------------
# 4. Unreal Engine Realm (Simulation Universe)
# -----------------------------
if (!(Test-Path $unrealEditor)) {
    Write-Host "[ERROR] UnrealEditor.exe not found at $unrealEditor"
} elseif (!(Test-Path $unrealProject)) {
    Write-Host "[ERROR] PrimordiaUnreal.uproject not found at $unrealProject"
} else {
    Write-Host "[INIT] Unreal Simulation Realm..."
    Start-Realm -Name "UnrealRealm" -Command $unrealEditor -Args "`"$unrealProject`""
}

# Pixel Streaming
if (Test-Path $pixelStreamer) {
    Write-Host "[INIT] Unreal Pixel Streaming..."
    Start-Realm -Name "PixelStreamRealm" -Command "powershell" -Args "-ExecutionPolicy Bypass -File `"$pixelStreamer`""
} else {
    Write-Host "[WARN] PixelStreamServer script not found."
}

# -----------------------------
# 5. Antigravity IDE Orbit (Optional)
# -----------------------------
if (Test-Path $antigravityIde) {
    Write-Host "[INIT] Antigravity IDE orbit realm..."
    # If you have a specific EXE, wire it here; placeholder:
    Start-Realm -Name "AntigravityIDE" -Command "powershell" -Args "-ExecutionPolicy Bypass -Command `\"cd `"$antigravityIde`"; npm run ide`""
} else {
    Write-Host "[WARN] AntigravityIDE realm directory not found."
}

# -----------------------------
# 6. DaVinci / AI Creation Realm
# -----------------------------
if (Test-Path $daVinciRealm) {
    Write-Host "[INIT] DaVinci AI Creation Realm..."
    Start-Realm -Name "DaVinciRealm" -Command "powershell" -Args "-ExecutionPolicy Bypass -Command `\"cd `"$daVinciRealm`"; npm run ai`""
} else {
    Write-Host "[WARN] Primordia-ai realm not found."
}

# -----------------------------
# Final Status
# -----------------------------
Write-Host ""
Write-Host "=== BIG BANG COMPLETE ==="
Write-Host "PrimordiaOS universe bootstrapped:"
Write-Host " - Kernel realm"
Write-Host " - Backend reality engine"
Write-Host " - Frontend HUD"
Write-Host " - Unreal simulation realm"
Write-Host " - Pixel streaming (if available)"
Write-Host " - Antigravity orbit (if present)"
Write-Host " - DaVinci AI creation realm (if present)"
Write-Host ""
Write-Host "You can now open the Reality Engine UI at:"
Write-Host "  http://localhost:5173/?tab=reality-engine"
