# =====================================================================
# PrimordiaOS Unified Launcher (RealmForge-Bound Edition)
# Holodeck → RealmForge Scene Binding + Unreal Orchestration
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

# Holodeck → RealmForge binding paths
$HolodeckOutput     = "$HolodeckRoot\Output"
$RealmForgeInbox    = "$PrimordiaRoot\RealmForge\Inbox"

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

function Bind-HolodeckToRealmForge {
    Write-Host "Binding Holodeck output → RealmForge Inbox..."

    if (!(Test-Path $HolodeckOutput)) {
        Write-Host "Holodeck output directory missing."
        return
    }

    if (!(Test-Path $RealmForgeInbox)) {
        New-Item -ItemType Directory -Path $RealmForgeInbox | Out-Null
    }

    Write-Host "Monitoring Holodeck output for new scenes..."

    # FileSystemWatcher for real-time scene binding
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $HolodeckOutput
    $watcher.Filter = "*.scene"
    $watcher.EnableRaisingEvents = $true

    Register-ObjectEvent $watcher Created -Action {
        $file = $Event.SourceEventArgs.FullPath
        $name = Split-Path $file -Leaf

        Write-Host "Scene detected: $name"
        Copy-Item $file "$RealmForgeInbox\$name" -Force
        Write-Host "Scene delivered to RealmForge Inbox."
    }
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

function Start-UnrealEditor {
    Write-Host "Launching Unreal Editor..."
    Start-Process -FilePath $UnrealEditorExe -ArgumentList "$ProjectRoot\PrimordiaUnreal.uproject"
}

function Start-UnrealServer {
    Write-Host "Launching Unreal Server..."
    Start-Process -FilePath $UnrealServerExe -ArgumentList "$ProjectRoot\PrimordiaUnreal.uproject -server -log"
}

# -----------------------------
# LAUNCH SEQUENCE
# -----------------------------

Write-Host "===================================================="
Write-Host " PrimordiaOS Unified Launcher (RealmForge-Bound)"
Write-Host "===================================================="

Start-PrimordiaOS
Start-Holodeck
Bind-HolodeckToRealmForge

Start-Spine
Start-RealmContainers

Start-UnrealEditor
Start-UnrealServer

Write-Host "===================================================="
Write-Host " All systems launched. Holodeck scenes will auto-bind."
Write-Host "===================================================="
