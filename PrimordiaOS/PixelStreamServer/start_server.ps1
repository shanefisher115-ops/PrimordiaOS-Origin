# PrimordiaOS Pixel Streaming Signaling Server Launcher
param (
    [int]$HttpPort = 8888,
    [string]$PublicIp = "127.0.0.1"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " PrimordiaOS Pixel Streaming Signaling Server " -ForegroundColor Cyan
Write-Host " Listening on http://${PublicIp}:${HttpPort}" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

if (-not (Test-Path "node_modules")) {
    Write-Host "[PixelStreamServer] Installing dependencies..." -ForegroundColor Yellow
    npm install --silent
}

$env:PORT = $HttpPort
node server.js
