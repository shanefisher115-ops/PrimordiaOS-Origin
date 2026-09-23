# ============================================
# PRIMORDIAOS MASTER TERMINAL BOOTSTRAP
# Cosmic Kernel Environment Stabilizer
# ============================================

Write-Host "PRIMORDIAOS TERMINAL BOOTSTRAP INITIALIZING..."

# --------------------------------------------
# 1. NODE VERSION STABILIZATION
# --------------------------------------------
Write-Host "Ensuring Node version compatibility (Electron requires Node 22.x)..."

# Install NVM if missing
if (!(Get-Command nvm -ErrorAction SilentlyContinue)) {
    Write-Host "Installing NVM for Windows..."
    winget install CoreyButler.NVMforWindows --silent
}

# Switch to Node 22.x (Electron-compatible)
Write-Host "Switching Node version to 22.2.0..."
nvm install 22.2.0
nvm use 22.2.0

# --------------------------------------------
# 2. PATH REPAIR (npm global bin)
# --------------------------------------------
Write-Host "Repairing PATH for npm global binaries..."

$npmPath = "$env:USERPROFILE\AppData\Roaming\npm"
if (-Not ($env:Path -like "*$npmPath*")) {
    Write-Host "Adding npm global path to environment..."
    setx PATH "$env:PATH;$npmPath"
}

# --------------------------------------------
# 3. ELECTRON CLEAN INSTALL
# --------------------------------------------
Write-Host "Purging corrupted Electron install..."
Remove-Item -Recurse -Force node_modules\electron -ErrorAction SilentlyContinue

Write-Host "Cleaning npm cache..."
npm cache clean --force

Write-Host "Installing Electron fresh..."
npm install electron --save-dev

# --------------------------------------------
# 4. PACKAGE.JSON VALIDATION
# --------------------------------------------
Write-Host "Validating package.json structure..."

$pkg = Get-Content package.json -Raw

if ($pkg -notmatch '"type": "module"') {
    Write-Host "Injecting ES module flag..."
    $fixed = $pkg -replace '"version": "4.0.0",', '"version": "4.0.0", "type": "module",'
    Set-Content package.json $fixed
}

# --------------------------------------------
# 5. PRIMORDIAOS KERNEL STARTUP
# --------------------------------------------
Write-Host "Launching PrimordiaOS Electron Kernel..."
npm run electron

Write-Host "==========================================="
Write-Host "PRIMORDIAOS BOOTSTRAP COMPLETE"
Write-Host "==========================================="
