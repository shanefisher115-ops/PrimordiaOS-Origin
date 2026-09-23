# ==============================================================================
# PRIMORDIAOS — LAUNCH UNREAL ENGINE 5.8 PROJECT
# ==============================================================================

$uprojectPath = "C:\Users\Shane\Documents\dev\PrimordiaOS\PrimordiaUnreal.uproject"
$editorPath   = "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "★ LAUNCHING PRIMORDIAOS IN UNREAL ENGINE 5.8...                 ★" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

if (Test-Path $editorPath) {
    Start-Process -FilePath $editorPath -ArgumentList "`"$uprojectPath`""
    Write-Host "✓ Unreal Engine 5.8 Editor is opening..." -ForegroundColor Green
} elseif (Test-Path $uprojectPath) {
    Start-Process $uprojectPath
    Write-Host "✓ Launching via Windows file association..." -ForegroundColor Green
} else {
    Write-Host "❌ Could not locate PrimordiaUnreal.uproject at $uprojectPath" -ForegroundColor Red
}
