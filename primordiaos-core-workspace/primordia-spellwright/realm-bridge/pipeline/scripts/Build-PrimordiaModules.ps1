<#
.SYNOPSIS
  Builds the PrimordiaCognition modules.

.DESCRIPTION
  -Mode Project  builds the project's editor target, which compiles every enabled plugin, the
                 PrimordiaCognition modules included. The editor must be closed for this project
                 (its DLLs are locked); use Live Coding from inside the editor instead.
  -Mode Plugin   compiles the plugin on its own (RunUAT BuildPlugin) into -PackageDir. This works
                 while the editor is open and proves the code builds for editor and game targets.

  The last line printed is "PRIMORDIA_RESULT {json}" for the Autobuilder server.

.EXAMPLE
  pwsh -File Build-PrimordiaModules.ps1 -Mode Plugin
#>
[CmdletBinding()]
param(
    [ValidateSet('Project', 'Plugin')] [string] $Mode = 'Project',
    [string] $EngineRoot = 'C:\Program Files\Epic Games\UE_5.4',
    [string] $ProjectPath = 'C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject',
    [string] $PluginPath = (Join-Path $PSScriptRoot '..\..\unreal\PrimordiaCognition\PrimordiaCognition.uplugin'),
    [string] $Target = '',
    [ValidateSet('Debug', 'DebugGame', 'Development', 'Shipping', 'Test')] [string] $Configuration = 'Development',
    [string] $Platform = 'Win64',
    # Short on purpose: MSVC fails on paths longer than 260 characters.
    [string] $PackageDir = (Join-Path ([IO.Path]::GetTempPath()) 'PrimordiaPluginBuild'),
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
$started = Get-Date

function Write-Result([bool] $Ok, [string] $Summary, [hashtable] $Extra = @{}) {
    $result = @{ ok = $Ok; mode = $Mode.ToLower(); summary = $Summary; seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1) } + $Extra
    Write-Output ("PRIMORDIA_RESULT " + ($result | ConvertTo-Json -Compress -Depth 5))
}

function Invoke-Logged([string] $Exe, [string[]] $Arguments) {
    # Tool output goes straight to the host so the function's only output is the exit code.
    Write-Host "> $Exe $($Arguments -join ' ')"
    & $Exe @Arguments 2>&1 | ForEach-Object { Write-Host "$_" }
    return $LASTEXITCODE
}

function New-PluginHost([string] $PluginFile, [string] $Root) {
    # A small host project of our own rather than RunUAT BuildPlugin: BuildPlugin's generated host
    # enables every default engine plugin, and one broken engine plugin (VisualStudioTools on
    # some installs) fails the whole build. Here it is disabled.
    $pluginFile = (Resolve-Path $PluginFile).Path
    $pluginDir = Split-Path $pluginFile
    $pluginName = [IO.Path]::GetFileNameWithoutExtension($pluginFile)
    $hostDir = Join-Path $Root 'Host'
    New-Item -ItemType Directory -Force (Join-Path $hostDir 'Source\PrimordiaHost') | Out-Null

    $descriptor = [ordered]@{
        FileVersion = 3; EngineAssociation = ''; Category = ''; Description = 'Build host for the PrimordiaOS plugin'
        Modules = @(@{ Name = 'PrimordiaHost'; Type = 'Runtime'; LoadingPhase = 'Default' })
        Plugins = @(@{ Name = $pluginName; Enabled = $true }, @{ Name = 'VisualStudioTools'; Enabled = $false })
    }
    ($descriptor | ConvertTo-Json -Depth 5) | Set-Content -Encoding utf8 (Join-Path $hostDir 'PrimordiaHost.uproject')
    foreach ($kind in @(@('PrimordiaHost', 'Game'), @('PrimordiaHostEditor', 'Editor'))) {
        @"
using UnrealBuildTool;
public class $($kind[0])Target : TargetRules
{
	public $($kind[0])Target(TargetInfo Target) : base(Target)
	{
		Type = TargetType.$($kind[1]);
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("PrimordiaHost");
	}
}
"@ | Set-Content -Encoding utf8 (Join-Path $hostDir "Source\$($kind[0]).Target.cs")
    }
    @'
using UnrealBuildTool;
public class PrimordiaHost : ModuleRules
{
	public PrimordiaHost(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine" });
	}
}
'@ | Set-Content -Encoding utf8 (Join-Path $hostDir 'Source\PrimordiaHost\PrimordiaHost.Build.cs')
    '#include "Modules/ModuleManager.h"' + "`nIMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, PrimordiaHost, `"PrimordiaHost`");`n" |
        Set-Content -Encoding utf8 (Join-Path $hostDir 'Source\PrimordiaHost\PrimordiaHost.cpp')

    robocopy $pluginDir (Join-Path $hostDir "Plugins\$pluginName") /MIR /XD Binaries Intermediate /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "could not copy the plugin into $hostDir" }

    return $hostDir
}

try {
    $buildBat = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
    if (-not (Test-Path $buildBat)) { throw "Unreal Engine not found at $EngineRoot" }

    if ($Mode -eq 'Plugin') {
        # Both the editor and the game target, so editor-only code that leaks into game builds is caught.
        $pluginName = [IO.Path]::GetFileNameWithoutExtension($PluginPath)
        $hostDir = New-PluginHost $PluginPath $PackageDir
        $uproject = Join-Path $hostDir 'PrimordiaHost.uproject'
        $built = @()
        foreach ($target in @('PrimordiaHostEditor', 'PrimordiaHost')) {
            $code = Invoke-Logged $buildBat @($target, $Platform, $Configuration, "-Project=$uproject", '-WaitMutex', '-NoHotReloadFromIDE')
            if ($code -ne 0) { Write-Result $false "plugin failed to build for $target (exit $code)" @{ package = $hostDir; target = $target }; exit 1 }
            $built += $target
        }
        $dlls = @(Get-ChildItem -Path (Join-Path $hostDir "Plugins\$pluginName\Binaries") -Filter '*.dll' -Recurse -ErrorAction SilentlyContinue)
        Write-Result $true "plugin builds for editor and game ($($dlls.Count) editor modules)" @{ package = $hostDir; targets = $built; binaries = $dlls.Count }
        exit 0
    }

    # Project mode
    $project = (Resolve-Path $ProjectPath).Path
    $projectDir = Split-Path $project
    $projectName = [IO.Path]::GetFileNameWithoutExtension($project)

    if (-not $Force) {
        $editors = Get-CimInstance Win32_Process -Filter "Name = 'UnrealEditor.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -and $_.CommandLine -like "*$projectName*" }
        if ($editors) {
            Write-Output "UnrealEditor (pid $($editors[0].ProcessId)) has $projectName open; its modules are locked."
            Write-Result $false "the editor has $projectName open: close it, use Live Coding, or build with -Mode Plugin" @{ editorPid = $editors[0].ProcessId }
            exit 2
        }
    }

    $arguments = @()
    if ($Target) {
        $arguments = @($Target, $Platform, $Configuration, "-Project=$project")
    } else {
        $targetFile = Get-ChildItem -Path (Join-Path $projectDir 'Source') -Filter '*Editor.Target.cs' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($targetFile) {
            $Target = $targetFile.Name -replace '\.Target\.cs$', ''
            $arguments = @($Target, $Platform, $Configuration, "-Project=$project")
        } else {
            # Content-only project with code plugins: build them the way the editor does on startup.
            $Target = 'UnrealEditor'
            $arguments = @("-Project=$project", '-TargetType=Editor', $Platform, $Configuration, '-NoEngineChanges')
        }
    }
    $arguments += @('-WaitMutex', '-NoHotReloadFromIDE')
    $code = Invoke-Logged $buildBat $arguments
    if ($code -ne 0 -and $Target -eq 'UnrealEditor') {
        # Content-only project and UBT refused (a broken engine plugin does this): compile the
        # installed copy of the plugin in a host project and put its binaries into the project.
        $pluginName = [IO.Path]::GetFileNameWithoutExtension($PluginPath)
        $installed = Join-Path $projectDir "Plugins\$pluginName\$pluginName.uplugin"
        if (-not (Test-Path $installed)) { Write-Result $false "build of $Target failed (exit $code) and $pluginName is not installed in the project" @{ target = $Target }; exit 1 }
        Write-Host "UnrealEditor target failed (exit $code); building $pluginName in a host project instead"
        $hostDir = New-PluginHost $installed $PackageDir
        $code = Invoke-Logged $buildBat @('PrimordiaHostEditor', $Platform, $Configuration, "-Project=$(Join-Path $hostDir 'PrimordiaHost.uproject')", '-WaitMutex', '-NoHotReloadFromIDE')
        if ($code -ne 0) { Write-Result $false "$pluginName failed to build (exit $code)" @{ target = 'PrimordiaHostEditor' }; exit 1 }
        $from = Join-Path $hostDir "Plugins\$pluginName\Binaries"
        $to = Join-Path $projectDir "Plugins\$pluginName\Binaries"
        robocopy $from $to /MIR /NFL /NDL /NJH /NJS | Out-Null
        if ($LASTEXITCODE -ge 8) { Write-Result $false "could not copy binaries into $to"; exit 1 }
        $dlls = @(Get-ChildItem $to -Filter '*.dll' -Recurse).Count
        Write-Result $true "$pluginName built in a host project; $dlls modules copied into $to" @{ target = 'PrimordiaHostEditor'; binaries = $dlls }
        exit 0
    }
    if ($code -ne 0) { Write-Result $false "build of $Target failed (exit $code)" @{ target = $Target }; exit 1 }
    Write-Result $true "$Target $Configuration built" @{ target = $Target }
    exit 0
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    Write-Result $false $_.Exception.Message
    exit 1
}
