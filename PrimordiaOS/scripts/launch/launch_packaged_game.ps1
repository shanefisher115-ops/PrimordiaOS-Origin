# PrimordiaOS Packaged Game Executable Launcher with Pixel Streaming
param (
    [string]$PixelStreamingURL = "ws://127.0.0.1:8888",
    [switch]$RenderOffScreen = $true
)

$BuildPath = "C:\Users\Shane\Documents\dev\PrimordiaOS\dist\PrimordiaUnreal_Build\Windows\PrimordiaUnreal.exe"
if (-not (Test-Path $BuildPath)) {
    # Fallback to direct directory search under dist\PrimordiaUnreal_Build
    $ExeCandidates = Get-ChildItem -Path "C:\Users\Shane\Documents\dev\PrimordiaOS\dist\PrimordiaUnreal_Build" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue
    if ($ExeCandidates) {
        $BuildPath = $ExeCandidates[0].FullName
    }
}

if (-not (Test-Path $BuildPath)) {
    Write-Host "Executable not found at dist\PrimordiaUnreal_Build." -ForegroundColor Red
    Write-Host "Please package your Unreal Engine project via Platforms -> Windows -> Package Project first." -ForegroundColor Yellow
    exit 1
}

$Arguments = "-PixelStreamingURL=$PixelStreamingURL -Log"
if ($RenderOffScreen) {
    $Arguments += " -RenderOffScreen"
}

Write-Host "Launching PrimordiaUnreal with Pixel Streaming parameters:" -ForegroundColor Cyan
Write-Host "  Path: $BuildPath" -ForegroundColor Gray
Write-Host "  Args: $Arguments" -ForegroundColor Gray

Start-Process -FilePath $BuildPath -ArgumentList $Arguments
