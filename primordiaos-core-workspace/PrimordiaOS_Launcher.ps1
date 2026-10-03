# =====================================================================
# PrimordiaOS Unified Launcher
# Multi‑Realm Orchestration + Unreal + Holodeck + Spine
# =====================================================================

# -----------------------------
# CONFIGURATION
# -----------------------------
$PrimordiaRoot      = "C:\PrimordiaOS"
$HolodeckRoot       = "C:\PrimordiaOS\Holodeck2"
$UnrealRoot         = "C:\Unreal\UE_5.4"
$ProjectRoot        = "C:\PrimordiaUnreal"
$SpineRoot          = "C:\PrimordiaOS\Spine"
$RealmContainerRoot = "C:\PrimordiaOS\Realms"

# Executables
$PrimordiaExe       = "$PrimordiaRoot\PrimordiaOS.exe"
$HolodeckExe        = "$HolodeckRoot\Holodeck2.exe"
$UnrealEditorExe    = "$UnrealRoot\Engine\Binaries\Win64\UnrealEditor.exe"
$UnrealServerExe    = "$UnrealRoot\Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
$SpineExe           = "$SpineRoot\Spine.exe"

# -----------------------------
# FUNCTIONS
# -----------------------------

function Start-PrimordiaOS {
    Write-Host "Launching PrimordiaOS..."
    Start-Process -FilePath $PrimordiaExe -WorkingDirectory $PrimordiaRoot
}

function Start-Holodeck {
    Write-Host "Starting Holodeck 2.0 worldgen service..."
    Start-Process -FilePath $HolodeckExe -WorkingDirectory $HolodeckRoot
}

function Start-UnrealEditor {
    Write-Host "Launching Unreal Editor..."
    Start-Process -FilePath $UnrealEditorExe -ArgumentList "$ProjectRoot\PrimordiaUnreal.uproject"
}

function Start-UnrealServer {
    Write-Host "Launching Unreal Server..."
    Start-Process -FilePath $UnrealServerExe -ArgumentList "$ProjectRoot\PrimordiaUnreal.uproject -server -log"
}

function Start-Spine {
    Write-Host "Starting Spine subsystem..."
    Start-Process -FilePath $SpineExe -WorkingDirectory $SpineRoot
}

function Start-RealmContainers {
    Write-Host "Starting Realm Containers..."
    Get-ChildItem $RealmContainerRoot -Directory | ForEach-Object {
        $containerPath = $_.FullName
        $containerExe  = "$containerPath\Container.exe"

        if (Test-Path $containerExe) {
            Write-Host "Launching Realm Container: $($_.Name)"
            Start-Process -FilePath $containerExe -WorkingDirectory $containerPath
        }
    }
}

# -----------------------------
# LAUNCH SEQUENCE
# -----------------------------

Write-Host "===================================================="
Write-Host " PrimordiaOS Unified Launcher"
Write-Host "===================================================="

Start-PrimordiaOS
Start-Holodeck

Start-Spine
Start-RealmContainers

Start-UnrealEditor
Start-UnrealServer

Write-Host "===================================================="
Write-Host " All systems launched."
Write-Host "===================================================="
