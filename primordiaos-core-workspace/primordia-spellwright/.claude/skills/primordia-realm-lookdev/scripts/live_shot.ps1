<#
Renders the LIVE realm: what PrimordiaOS streams into Unreal, with the PrimordiaGPU layer (MCP crowd,
sigil-field aura) on top. ue_run.ps1 renders static editor scenes with the bridge disconnected; this
does the opposite: it launches the realm like PlayRealm-iGPU.bat (RealmBench, game mode, iGPU settings),
connects to the realm server on -Port, and uses PrimordiaRealmGPU's -PrimordiaShot hook to wait for the
realm, let it settle, write the PNG and quit.

  pwsh live_shot.ps1 -Out C:\...\live.png                       # realm server on 7777
  pwsh live_shot.ps1 -Out C:\...\live.png -Port 7787 -Delay 30  # another server, longer settle
  pwsh live_shot.ps1 -Out C:\...\live.png -Camera HeroCamera    # through a named camera actor

Start the realm server first with the quality pinned, or the GPU tuner may thin the realm while the
iGPU is over budget:  node src/server.js --gpu-quality 1   (in realm-bridge/node-bridge)
Tell Shane before running: a game window opens and closes by itself.
#>
param(
    [Parameter(Mandatory)] [string]$Out,
    [int]$Port = 7777,
    [int]$Delay = 25,
    [string]$Camera = "",
    [string]$Map = "/Game/Primordia/Maps/RealmBench",
    [int]$TimeoutSec = 600,
    [string]$Engine = "C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64",
    [string]$Project = "C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject"
)
$ErrorActionPreference = "Stop"
$log = Join-Path (Split-Path -Parent $Project) "Saved\Logs\RealmLiveShot.log"
Remove-Item $Out -ErrorAction SilentlyContinue
$argv = @("`"$Project`"", $Map, "-game", "-windowed", "-ResX=1280", "-ResY=720",
    "-dpcvars=r.DynamicGlobalIlluminationMethod=0,r.ReflectionMethod=2,r.Shadow.Virtual.Enable=0,r.ScreenPercentage=67,r.AntiAliasingMethod=2,r.TranslucentLightingVolume=0,r.MotionBlurQuality=0,sg.PostProcessQuality=2,sg.ShadowQuality=2,sg.EffectsQuality=2",
    "-ini:Game:[/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]:ServerUrl=ws://127.0.0.1:$Port",
    "-PrimordiaShot=`"$Out`"", "-PrimordiaShotDelay=$Delay", "-PrimordiaShotQuit", "-abslog=`"$log`"")
if ($Camera) { $argv += "-PrimordiaShotCamera=$Camera" }
$p = Start-Process "$Engine\UnrealEditor.exe" -ArgumentList $argv -PassThru
if (-not $p.WaitForExit($TimeoutSec * 1000)) { Stop-Process -Id $p.Id -Force; Write-Host "timed out after ${TimeoutSec}s" }
Select-String -Path $log -Pattern "primordia.Shot|Realm '.*' .* rev|Critical error|Assertion failed" | Select-Object -First 8 | ForEach-Object { $_.Line }
if (-not (Test-Path $Out)) { throw "no screenshot; see $log" }
Get-Item $Out | Select-Object FullName, Length
