# ============================================
# PRIMORDIAOS MODULE STRUCTURE FIXER
# Moves misplaced files into correct hierarchy
# ============================================

Write-Host "=== PRIMORDIAOS MODULE STRUCTURE FIXER INITIALIZING ==="

# Root paths
$root = Get-Location
$source = Join-Path $root "JavaScript"
$target = Join-Path $root "modules"

# Ensure target directories exist
$dirs = @(
    "unreal",
    "live",
    "platform",
    "automation"
)

foreach ($d in $dirs) {
    $path = Join-Path $target $d
    if (-not (Test-Path $path)) {
        Write-Host "Creating directory: $path"
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

# Move files to their correct destinations
Write-Host "Moving module files..."

$moveMap = @{
    "bootstrap"            = "unreal"
    "tiktok-live-engine"   = "live"
    "unified-platform"     = "platform"
    "social-graph"         = "platform"
    "content-graph"        = "platform"
    "scheduler"            = "automation"
}

foreach ($file in Get-ChildItem $source -File) {
    $name = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($moveMap.ContainsKey($name)) {
        $destDir = Join-Path $target $moveMap[$name]
        $destPath = Join-Path $destDir $file.Name
        Write-Host "→ Moving $($file.Name) to $destDir"
        Move-Item -Force $file.FullName $destPath
    }
}

Write-Host "=== MODULE STRUCTURE FIX COMPLETE ==="
Write-Host "All files moved to their correct locations."
