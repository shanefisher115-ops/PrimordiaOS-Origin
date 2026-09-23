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
    }
}

#endregion Core Commands

#region Primordial CLI

function primordial {
    [CmdletBinding()]
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
        default {
            Write-PrimordiaBanner -Title "PrimordiaOS CLI"
            Write-Host "Usage: primordial <command>" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Commands:" -ForegroundColor Cyan
            Write-Host "  version   - Show PrimordiaOS version"
            Write-Host "  status    - Check core PrimordiaOS paths"
            Write-Host "  paths     - Show important directories"
            Write-Host "  kernel    - Launch PrimordiaOS kernel"
            Write-Host "  unreal    - Launch PrimordiaUnreal project"
        }
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
    primordial

#endregion Exported Commands
