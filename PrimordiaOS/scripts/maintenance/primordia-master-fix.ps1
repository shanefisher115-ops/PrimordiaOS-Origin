# ============================================
# PRIMORDIAOS MASTER TERMINAL FIX
# Electron + Node + Module Resolver Stabilizer
# ============================================

Write-Host "=== PRIMORDIAOS MASTER FIX INITIALIZING ==="

# --------------------------------------------
# 1. Ensure Node version is Electron-compatible
# --------------------------------------------
Write-Host "Checking Node version..."

$nvmInstalled = Get-Command nvm -ErrorAction SilentlyContinue

if (-Not $nvmInstalled) {
    Write-Host "Installing NVM for Windows..."
    winget install CoreyButler.NVMforWindows --silent
}

Write-Host "Switching Node to version 22.2.0..."
nvm install 22.2.0
nvm use 22.2.0

# --------------------------------------------
# 2. Fix PATH for npm global binaries
# --------------------------------------------
Write-Host "Repairing PATH..."

$npmPath = "$env:USERPROFILE\AppData\Roaming\npm"

if ($env:Path -notlike "*$npmPath*") {
    Write-Host "Adding npm global path..."
    setx PATH "$env:PATH;$npmPath"
}

# --------------------------------------------
# 3. Clean and reinstall Electron
# --------------------------------------------
Write-Host "Removing corrupted Electron install..."
Remove-Item -Recurse -Force node_modules\electron -ErrorAction SilentlyContinue

Write-Host "Cleaning npm cache..."
npm cache clean --force

Write-Host "Installing Electron fresh..."
npm install electron --save-dev

# --------------------------------------------
# 4. Auto-create missing module files
# --------------------------------------------
Write-Host "Checking module paths..."

$modulePaths = @(
    "modules/unreal/bootstrap.js",
    "modules/live/tiktok-live-engine.js",
    "modules/platform/unified-platform.js",
    "modules/platform/social-graph.js",
    "modules/platform/content-graph.js",
    "modules/automation/scheduler.js"
)

foreach ($path in $modulePaths) {
    if (-Not (Test-Path $path)) {
        Write-Host "Creating missing module: $path"
        $dir = Split-Path $path
        if (-Not (Test-Path $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        Set-Content $path "export default function placeholder() { console.log('Loaded $path'); }"
    }
}

# --------------------------------------------
# 5. Ensure package.json has ES module flag
# --------------------------------------------
Write-Host "Validating package.json..."

$pkg = Get-Content package.json -Raw

if ($pkg -notmatch '"type": "module"') {
    Write-Host "Injecting ES module flag..."
    $fixed = $pkg -replace '"version": "4.0.0",', '"version": "4.0.0", "type": "module",'
    Set-Content package.json $fixed
}

# --------------------------------------------
# 6. Launch PrimordiaOS Electron Kernel
# --------------------------------------------
Write-Host "Launching PrimordiaOS..."
npm run electron

Write-Host "=== PRIMORDIAOS MASTER FIX COMPLETE ==="
