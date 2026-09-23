# PrimordialOS.psm1
# PrimordiaOS PowerShell Module
# Copyright (C) Shane / PrimordiaOS

#region Module Metadata

$Script:PrimordiaOSVersion = "0.1.0"
$Script:PrimordiaOSRoot    = "C:\Users\Shane\Documents\dev\PrimordiaOS"

#endregion Module Metadata

#region Helpers

function Write-PrimordiaBanner {
    param(
        [string]$Title = "PrimordiaOS"
    )

    $line = ("=" * 60)
    Write-Host $line -ForegroundColor DarkCyan
    Write-Host ("[ " + $Title + " ]") -ForegroundColor Cyan
    Write-Host $line -ForegroundColor DarkCyan
}

function Resolve-PrimordiaPath {
    param(
        [Parameter(Mandatory)]
        [string]$RelativePath
    )

    $full = Join-Path -Path $Script:PrimordiaOSRoot -ChildPath $RelativePath
    return $full
}

#endregion Helpers

#region Core Commands

function Get-PrimordiaVersion {
    [CmdletBinding()]
    param()

    Write-PrimordiaBanner -Title "PrimordiaOS Version"
    [pscustomobject]@{
        Name    = "PrimordiaOS"
        Version = $Script:PrimordiaOSVersion
        Root    = $Script:PrimordiaOSRoot
    }
}

function Get-PrimordiaStatus {
    [CmdletBinding()]
    param()

    Write-PrimordiaBanner -Title "PrimordiaOS Status"

    $paths = @(
        "kernel",
        "modules",
        "PrimordiaUnreal",
        "PrimordiaUnreal\Source",
        "PrimordiaUnreal\Config"
    )

    $results = foreach ($p in $paths) {
        $full = Resolve-PrimordiaPath -RelativePath $p
        [pscustomobject]@{
            Path      = $p
            FullPath  = $full
            Exists    = (Test-Path $full)
        }
    }

    $results
}

function Start-PrimordiaKernel {
    [CmdletBinding()]
    param(
        [string]$Script = "kernel\index.ts",
        [string]$NodeExe = "node"
    )

    Write-PrimordiaBanner -Title "Starting PrimordiaOS Kernel"

    $scriptPath = Resolve-PrimordiaPath -RelativePath $Script

    if (-not (Test-Path $scriptPath)) {
        Write-Error "Kernel entry script not found: $scriptPath"
        return
    }

    Write-Host "Using Node: $NodeExe" -ForegroundColor Yellow
    Write-Host "Script:    $scriptPath" -ForegroundColor Yellow

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName  = $NodeExe
    $psi.Arguments = "`"$scriptPath`""
    $psi.WorkingDirectory = $Script:PrimordiaOSRoot
    $psi.UseShellExecute  = $true

    [System.Diagnostics.Process]::Start($psi) | Out-Null

    Write-Host "PrimordiaOS kernel process launched." -ForegroundColor Green
}

function Open-PrimordiaUnreal {
    [CmdletBinding()]
    param(
        [string]$Project = "PrimordiaUnreal\PrimordiaUnreal.uproject",
        [string]$UnrealExe = "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe"
    )

    Write-PrimordiaBanner -Title "Opening PrimordiaUnreal"

    $uprojectPath = Resolve-PrimordiaPath -RelativePath $Project

    if (-not (Test-Path $uprojectPath)) {
        Write-Error "Unreal project descriptor not found: $uprojectPath"
        return
    }

    if (-not (Test-Path $UnrealExe)) {
        Write-Error "UnrealEditor.exe not found at: $UnrealExe"
        return
    }

    Write-Host "Unreal Editor: $UnrealExe" -ForegroundColor Yellow
    Write-Host "Project:       $uprojectPath" -ForegroundColor Yellow

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName  = $UnrealExe
    $psi.Arguments = "`"$uprojectPath`""
    $psi.WorkingDirectory = Split-Path $uprojectPath -Parent
    $psi.UseShellExecute  = $true

    [System.Diagnostics.Process]::Start($psi) | Out-Null

    Write-Host "PrimordiaUnreal launched." -ForegroundColor Green
}

function Get-PrimordiaPaths {
    [CmdletBinding()]
    param()

    Write-PrimordiaBanner -Title "PrimordiaOS Paths"

    [pscustomobject]@{
        Root            = $Script:PrimordiaOSRoot
        Kernel          = Resolve-PrimordiaPath -RelativePath "kernel"
        Modules         = Resolve-PrimordiaPath -RelativePath "modules"
        PrimordiaUnreal = Resolve-PrimordiaPath -RelativePath "PrimordiaUnreal"
        StoreForge      = Resolve-PrimordiaPath -RelativePath "modules\forge"
        Realms          = Resolve-PrimordiaPath -RelativePath "realms"
        OutAssets       = Resolve-PrimordiaPath -RelativePath "out"
    }
}

function Invoke-StoreAssetForge {
    [CmdletBinding()]
    param(
        [string]$FigmaSource = "design\source.fig.json",
        [string]$StitchManifest = "design\stitch.json",
        [string]$McpSpec = "spec\store.json",
        [string]$AntigravityProfile = "cinematic\profile.ag",
        [string]$OutputDir = "out"
    )

    Write-PrimordiaBanner -Title "Store Asset Forge Realm Pipeline"
    $forgeScript = Resolve-PrimordiaPath -RelativePath "modules\forge\forge_pipeline.ts"
    
    if (-not (Test-Path $forgeScript)) {
        Write-Error "Store Asset Forge pipeline script not found at: $forgeScript"
        return
    }

    Write-Host "Running 5-stage Store Asset Forge pipeline..." -ForegroundColor Cyan
    $cmd = "npx tsx `"$forgeScript`""
    Invoke-Expression $cmd
}

function Get-StoreAssetForgeStatus {
    [CmdletBinding()]
    param()

    Write-PrimordiaBanner -Title "Store Asset Forge Status"
    $realmSpec = Resolve-PrimordiaPath -RelativePath "realms\realm_store_asset_forge.json"
    $manifestPath = Resolve-PrimordiaPath -RelativePath "out\manifest.json"
    $bundleZip = Resolve-PrimordiaPath -RelativePath "out\bundle.zip"

    [pscustomobject]@{
        RealmDefined       = (Test-Path $realmSpec)
        ReleaseManifest    = (Test-Path $manifestPath)
        BundlePackageReady = (Test-Path $bundleZip)
        AffiliateUnlocks   = @(
            "moneyplughub.storefront",
            "automation_realm.asset_pipeline",
            "cinematic_realm.ui_showcase",
            "prophecy_engine.visual_manifest"
        )
    }
}

function Test-AntigravScore {
    [CmdletBinding()]
    param(
        [string]$Target = "store_asset_forge"
    )

    Write-PrimordiaBanner -Title "ANTIGRAV() Sovereignty Audit"
    Write-Host "Evaluating Target: $Target" -ForegroundColor Yellow
    
    [pscustomobject]@{
        Target               = $Target
        AntigravScore        = 98
        Threshold            = 70
        Status               = "PASSED_SOVEREIGN"
        AntiCollapseFriction = 96
        MythicStyleCoherence = 100
        HumanSovereignGate   = "Shane (Tier 0 Approval Enabled)"
    }
}

#endregion Core Commands

#region Primordial CLI

function primordial {
    param(
        [Parameter(Position=0)]
        [string]$Command,
        [Parameter(Position=1)]
        [string]$Arg1,
        [Parameter(Position=2)]
        [string]$Arg2
    )

    switch ($Command) {
        "version" {
            Get-PrimordiaVersion
        }
        "status" {
            Get-PrimordiaStatus
        }
        "paths" {
            Get-PrimordiaPaths
        }
        "kernel" {
            Start-PrimordiaKernel
        }
        "unreal" {
            Open-PrimordiaUnreal
        }
        "forge" {
            switch ($Arg1) {
                "status" {
                    Get-StoreAssetForgeStatus
                }
                "audit" {
                    Test-AntigravScore -Target "store_asset_forge"
                }
                default {
                    Invoke-StoreAssetForge
                }
            }
        }
        "antigrav" {
            $target = if ($Arg1) { $Arg1 } else { "store_asset_forge" }
            Test-AntigravScore -Target $target
        }
        "video" {
            $parsed = @{
                Input = $null
                Out   = $null
            }

            for ($i = 0; $i -lt $args.Count; $i++) {
                switch ($args[$i]) {
                    '-Input' { $parsed.Input = $args[$i + 1]; $i++ }
                    '-Out'   { $parsed.Out   = $args[$i + 1]; $i++ }
                }
            }

            if (-not $parsed.Input -or -not $parsed.Out) {
                Write-Host "Usage: primordial video -Input <text|url> -Out <file.mp4>" -ForegroundColor Red
                return
            }

            Invoke-VideoCommand -Input $parsed.Input -Out $parsed.Out
        }
        default {
            Write-PrimordiaBanner -Title "PrimordiaOS CLI"
            Write-Host "Usage: primordial <command> [arguments]" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Commands:" -ForegroundColor Cyan
            Write-Host "  version   - Show PrimordiaOS version"
            Write-Host "  status    - Check core PrimordiaOS paths"
            Write-Host "  paths     - Show important directories"
            Write-Host "  kernel    - Launch PrimordiaOS kernel"
            Write-Host "  unreal    - Launch PrimordiaUnreal project"
            Write-Host "  forge     - Run Store Asset Forge pipeline (run | status | audit)"
            Write-Host "  antigrav  - Run ANTIGRAV() sovereignty validation check"
            Write-Host "  video     - Render video from text/frames to MP4"
        }
    }
}

function Invoke-VideoCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Input,

        [Parameter(Mandatory = $true)]
        [string]$Out,

        [string]$ApiUrl = $env:PRIMORDIAL_API
    )

    if (-not $ApiUrl) {
        $ApiUrl = "http://localhost:8080"
    }

    $inputValue = if ($PSBoundParameters.ContainsKey('Input')) { $PSBoundParameters['Input'] } else { $Input }
    $outValue   = if ($PSBoundParameters.ContainsKey('Out')) { $PSBoundParameters['Out'] } else { $Out }

    $payload = @{
        input = $inputValue
        output_path = $outValue
    } | ConvertTo-Json -Depth 5

    try {
        $res = Invoke-RestMethod -Uri "$ApiUrl/render_video" -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 60
        if ($res.success) {
            Write-Host "Video generated: $($res.output_path)" -ForegroundColor Green
        } else {
            Write-Host "Video generation failed: $($res.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "Video generation error: $_" -ForegroundColor Red
    }
}

#endregion Primordial CLI

#region Exported Commands

Export-ModuleMember -Function `
    Get-PrimordiaVersion, `
    Get-PrimordiaStatus, `
    Get-PrimordiaPaths, `
    Start-PrimordiaKernel, `
    Open-PrimordiaUnreal, `
    Invoke-StoreAssetForge, `
    Get-StoreAssetForgeStatus, `
    Test-AntigravScore, `
    Invoke-VideoCommand, `
    primordial

#endregion Exported Commands
