# PrimordiaOS v2 - Master Loader

$Global:PrimordiaRoot = "C:\Users\Shane\Documents\Dev\PrimordiaOS"
$Global:PrimordiaStateFile = Join-Path $Global:PrimordiaRoot "primordia-state.json"
$Global:PrimordiaLogFile   = Join-Path $Global:PrimordiaRoot "primordia-log.txt"

. "$Global:PrimordiaRoot\core\state.ps1"
. "$Global:PrimordiaRoot\core\logging.ps1"
. "$Global:PrimordiaRoot\core\router.ps1"
. "$Global:PrimordiaRoot\core\entrypoint.ps1"

Import-Module "$Global:PrimordiaRoot\modules\content.psm1"     -Force
Import-Module "$Global:PrimordiaRoot\modules\autoposter.psm1"  -Force
Import-Module "$Global:PrimordiaRoot\modules\loop.psm1"        -Force
Import-Module "$Global:PrimordiaRoot\modules\diagnostics.psm1" -Force

Write-Host "PrimordiaOS v2 loaded from $Global:PrimordiaRoot" -ForegroundColor Cyan
