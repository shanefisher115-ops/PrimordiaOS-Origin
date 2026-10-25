<#
.SYNOPSIS
  Install + regenerate project files + build, in one go.

.DESCRIPTION
  1. Install-PrimordiaModules.ps1 copies the plugin into the project and enables it.
  2. If the project has C++ source, its IDE project files are regenerated (new modules appear).
  3. Build-PrimordiaModules.ps1 builds (-Mode Project by default; -Mode Plugin when the editor is open).

  The last line printed is "PRIMORDIA_RESULT {json}".
#>
[CmdletBinding()]
param(
    [string] $EngineRoot = 'C:\Program Files\Epic Games\UE_5.4',
    [string] $ProjectPath = 'C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject',
    [string] $Source = (Join-Path $PSScriptRoot '..\..\unreal\PrimordiaCognition'),
    [ValidateSet('Project', 'Plugin')] [string] $Mode = 'Project',
    [string] $Configuration = 'Development',
    [switch] $SkipBuild
)

$ErrorActionPreference = 'Stop'
$started = Get-Date

function Write-Result([bool] $Ok, [string] $Summary, [hashtable] $Extra = @{}) {
    $result = @{ ok = $Ok; mode = 'update'; summary = $Summary; seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1) } + $Extra
    Write-Output ("PRIMORDIA_RESULT " + ($result | ConvertTo-Json -Compress -Depth 5))
}

function Get-ChildResult([string[]] $Lines) {
    $line = $Lines | Where-Object { $_ -like 'PRIMORDIA_RESULT *' } | Select-Object -Last 1
    if ($line) { return ($line.Substring(17) | ConvertFrom-Json) }
    return $null
}

try {
    $shell = (Get-Process -Id $PID).Path

    Write-Output '== install'
    $install = & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Install-PrimordiaModules.ps1') -Source $Source -ProjectPath $ProjectPath 2>&1 | ForEach-Object { "$_" }
    $install | Where-Object { $_ -notlike 'PRIMORDIA_RESULT *' } | ForEach-Object { Write-Output $_ }
    $installResult = Get-ChildResult $install
    if (-not $installResult -or -not $installResult.ok) { throw "install failed: $($installResult.summary)" }

    $project = (Resolve-Path $ProjectPath).Path
    if (Test-Path (Join-Path (Split-Path $project) 'Source')) {
        Write-Output '== project files'
        $ubt = Join-Path $EngineRoot 'Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe'
        & $ubt -projectfiles "-project=$project" -game -rocket -progress 2>&1 | ForEach-Object { Write-Output "$_" }
        if ($LASTEXITCODE -ne 0) { Write-Output "warning: project file generation exited $LASTEXITCODE" }
    }

    if ($SkipBuild) {
        Write-Result $true "$($installResult.summary); build skipped"
        exit 0
    }

    Write-Output "== build ($Mode)"
    $build = & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Build-PrimordiaModules.ps1') -Mode $Mode -EngineRoot $EngineRoot -ProjectPath $ProjectPath -Configuration $Configuration 2>&1 | ForEach-Object { "$_" }
    $build | Where-Object { $_ -notlike 'PRIMORDIA_RESULT *' } | ForEach-Object { Write-Output $_ }
    $buildResult = Get-ChildResult $build
    if (-not $buildResult -or -not $buildResult.ok) { throw "build failed: $($buildResult.summary)" }

    Write-Result $true "$($installResult.summary); $($buildResult.summary)"
    exit 0
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    Write-Result $false $_.Exception.Message
    exit 1
}
