#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ModuleRoot = "C:\Users\Shane\PrimordiaOS\PrimordialOS",
    [switch]$NoReload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Paths
$MODULE_FILE   = "PrimordialOS.psm1"
$MANIFEST_FILE = "PrimordialOS.psd1"

$MODULE_PATH   = "$ModuleRoot\$MODULE_FILE"
$MANIFEST_PATH = "$ModuleRoot\$MANIFEST_FILE"

# Ensure module directory exists
if (-not (Test-Path $ModuleRoot)) {
    New-Item -ItemType Directory -Path $ModuleRoot -Force | Out-Null
}

Write-Host "Compiling PrimordialOS Module..." -ForegroundColor Cyan

# Copy to user modules
$paths = @(
    "C:\Users\Shane\OneDrive\Documents\WindowsPowerShell\Modules\PrimordialOS",
    "C:\Users\Shane\Documents\WindowsPowerShell\Modules\PrimordialOS"
)
foreach ($p in $paths) {
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    Copy-Item "$ModuleRoot\*" -Destination $p -Force
}

if (-not $NoReload) {
    Remove-Module PrimordialOS -ErrorAction SilentlyContinue
    Import-Module $MANIFEST_PATH -Force -Global
    Write-Host "PrimordiaOS module compiled & reloaded." -ForegroundColor Green
}
