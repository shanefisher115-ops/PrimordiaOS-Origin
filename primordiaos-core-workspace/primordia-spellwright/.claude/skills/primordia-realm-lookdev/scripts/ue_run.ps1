<#
Rebuilds a realm scene headlessly (optional) and renders one screenshot through a camera.

  pwsh ue_run.ps1 -BuildScript <repo>\Scripts\build_cathedral_scene.py -Map /PrimordiaOSRealmBridge/Maps/NeoGothicCathedral -Out C:\...\shot.png
  pwsh ue_run.ps1 -Map /PrimordiaOSRealmBridge/Maps/NeoGothicCathedral -Out C:\...\shot.png     # render only

The build script is copied into the project's plugin copy first (the project's plugin is not linked to the repo).
The render launches the full editor (commandlets can't render) with the realm bridge's auto-connect off, so a
Play session can't stream a live realm over the shot. Tell Shane before running: an Unreal window opens and closes.
#>
param(
    [string]$BuildScript,
    [Parameter(Mandatory)] [string]$Map,
    [Parameter(Mandatory)] [string]$Out,
    [string]$Camera = "HeroCamera",
    [int]$ShotDelay = 75,
    [int]$TimeoutSec = 540,
    [string]$Engine = "C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64",
    [string]$Project = "C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject",
    [string]$PluginScripts = "C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\Plugins\PrimordiaOSRealmBridge\Scripts"
)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path (Split-Path -Parent $Project) "Saved\Logs"

if ($BuildScript) {
    Copy-Item $BuildScript $PluginScripts -Force
    $script = Join-Path $PluginScripts (Split-Path -Leaf $BuildScript)
    Write-Host "build: $script"
    & "$Engine\UnrealEditor-Cmd.exe" $Project -run=pythonscript -script="$script" -unattended -nop4 -nosplash *> $null
    $problems = Select-String -Path "$logDir\PrimordiaRealms.log" -Pattern "LogPython: Error|Traceback" | Select-Object -First 15
    if ($problems) { $problems | ForEach-Object { $_.Line }; throw "build script raised; see $logDir\PrimordiaRealms.log" }
    Write-Host "build: ok"
}

Remove-Item $Out -ErrorAction SilentlyContinue
$env:PRIM_MAP = $Map; $env:PRIM_CAMERA = $Camera; $env:PRIM_OUT = $Out; $env:PRIM_SHOT_DELAY = "$ShotDelay"
$render = Join-Path $here "render_shot.py"
$p = Start-Process "$Engine\UnrealEditor.exe" -PassThru -ArgumentList "`"$Project`"", "-ExecCmds=`"py $render`"",
    "-ini:Game:[/Script/PrimordiaOSRealmBridge.PrimordiaBridgeSettings]:bAutoConnect=False",
    "-unattended", "-nosplash", "-nop4", "-log=RealmLookdevRender.log"
$deadline = (Get-Date).AddSeconds($TimeoutSec)
while (-not (Test-Path $Out) -and (Get-Date) -lt $deadline -and -not $p.HasExited) { Start-Sleep 5 }
Start-Sleep 8  # let the PNG finish writing
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
Select-String -Path "$logDir\RealmLookdevRender.log" -Pattern "RenderShot|LogPython: Error" | ForEach-Object { $_.Line }
if (-not (Test-Path $Out)) { throw "no screenshot after ${TimeoutSec}s; see $logDir\RealmLookdevRender.log" }
Get-Item $Out | Select-Object FullName, Length
