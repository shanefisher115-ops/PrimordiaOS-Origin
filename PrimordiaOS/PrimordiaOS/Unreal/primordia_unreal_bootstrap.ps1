# ==========================================
# PRIMORDIAUNREAL – AUTOMATION LAUNCHER
# ==========================================

Write-Host "PrimordiaUnreal Automation Starting..." -ForegroundColor Cyan

$root = "PrimordiaOS"
$unrealDir = Join-Path $root "Unreal"
$registryPath = Join-Path $root "Core\Registry\primordia_registry.json"
$codexPath = Join-Path $root "Core\Codex\master_codex.md"

# Ensure base dirs
mkdir -Force $unrealDir | Out-Null

# Load registry + codex
$registry = Get-Content $registryPath | ConvertFrom-Json
$codex = Get-Content $codexPath -Raw

Write-Host "PrimordiaOS Registry and Codex loaded." -ForegroundColor Green

# Define Python automation script path
$pythonScript = Join-Path $unrealDir "primordia_unreal_automation.py"

if (-Not (Test-Path $pythonScript)) {
    Write-Host "Python automation script not found at $pythonScript" -ForegroundColor Red
    Write-Host "Create primordia_unreal_automation.py in PrimordiaOS\Unreal first." -ForegroundColor Yellow
    exit 1
}

# Call Python automation
Write-Host "Invoking Unreal automation via Python..." -ForegroundColor Cyan
python $pythonScript $root

Write-Host "PrimordiaUnreal Automation Complete." -ForegroundColor Cyan
