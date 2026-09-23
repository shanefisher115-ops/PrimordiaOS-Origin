# ================================================================
#   PrimordiaOS Unreal Engine Launcher (Production Build)
#   Clean ASCII-only rebuild, safe for PowerShell parsing
# ================================================================

Write-Host "=== PrimordiaOS Unreal Engine Launcher ==="
Write-Host "Validating environment..."

# ------------------------------------------------
# Paths
# ------------------------------------------------
$uproject = "C:\Users\Shane\Documents\dev\PrimordiaOS\PrimordiaUnreal.uproject"
$unrealEditor = "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
$pixelStreamer = "C:\Users\Shane\Documents\dev\PrimordiaOS\PixelStreamServer\start_pixelstream.ps1"
$backendServer = "C:\Users\Shane\Documents\dev\PrimordiaOS\server.ts"
$unrealBridge = "C:\Users\Shane\Documents\dev\PrimordiaOS\unrealBridge.ts"

# ------------------------------------------------
# Validate Unreal Engine
# ------------------------------------------------
if (!(Test-Path $unrealEditor)) {
    Write-Host "[ERROR] UnrealEditor.exe not found."
    Write-Host "Expected at: $unrealEditor"
    exit 1
}

# ------------------------------------------------
# Validate Unreal Project
# ------------------------------------------------
if (!(Test-Path $uproject)) {
    Write-Host "[ERROR] PrimordiaUnreal.uproject not found."
    Write-Host "Expected at: $uproject"
    exit 1
}

Write-Host "[OK] Unreal Engine detected."
Write-Host "[OK] PrimordiaUnreal project detected."

# ------------------------------------------------
# Launch Unreal Engine Editor
# ------------------------------------------------
Write-Host "Launching Unreal Engine Editor..."
Start-Process $unrealEditor -ArgumentList "`"$uproject`""

# ------------------------------------------------
# Launch Pixel Streaming (optional)
# ------------------------------------------------
if (Test-Path $pixelStreamer) {
    Write-Host "Starting Pixel Streaming server..."
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$pixelStreamer`""
} else {
    Write-Host "[WARN] Pixel Streaming server not found. Skipping."
}

# ------------------------------------------------
# Launch Backend API Server
# ------------------------------------------------
if (Test-Path $backendServer) {
    Write-Host "Starting PrimordiaOS backend server..."
    Start-Process "powershell" -ArgumentList "npm run server"
} else {
    Write-Host "[WARN] Backend server file not found. Skipping."
}

# ------------------------------------------------
# Launch Unreal WebSocket Bridge
# ------------------------------------------------
if (Test-Path $unrealBridge) {
    Write-Host "Starting Unreal WebSocket bridge..."
    Start-Process "powershell" -ArgumentList "npm run unreal-bridge"
} else {
    Write-Host "[WARN] Unreal bridge file not found. Skipping."
}

# ------------------------------------------------
# Final Output
# ------------------------------------------------
Write-Host "PrimordiaOS Unreal Engine pipeline is starting."
Write-Host "Unreal Editor should open shortly."
Write-Host "Pixel Streaming, backend server, and bridge processes are launching."
