# =====================================================================
# PrimordiaOS Unified Launcher (Unreal Hot-Reload Edition)
# Intent → Holodeck Prompt → Scene → RealmForge → Unreal Hot-Reload
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

# Intent → Holodeck paths
$RealmIntentDir     = "$PrimordiaRoot\RealmForge\Intents"
$HolodeckInbox      = "$HolodeckRoot\Inbox"

# Holodeck → RealmForge paths
$HolodeckOutput     = "$HolodeckRoot\Output"
$RealmForgeInbox    = "$PrimordiaRoot\RealmForge\Inbox"

# Unreal hot-reload trigger file
$UnrealHotReloadFlag = "$ProjectRoot\Content\PrimordiaOS_HotReload.flag"

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

function Translate-RealmIntentToHolodeckPrompt {
    Write-Host "Monitoring RealmIntent directory for new intents..."

    if (!(Test-Path $RealmIntentDir)) {
        New-Item -ItemType Directory -Path $RealmIntentDir | Out-Null
    }

    if (!(Test-Path $HolodeckInbox)) {
        New-Item -ItemType Directory -Path $HolodeckInbox | Out-Null
    }

    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = $RealmIntentDir
    $watcher.Filter = "*.intent"
    $watcher.EnableRaisingEvents = $true

    Register-ObjectEvent $watcher Created -Action {
        $intentFile = $Event.SourceEventArgs.FullPath
        $intentName = Split-Path $intentFile -Leaf

        Write-Host "RealmIntent detected: $intentName"

        $intentText = Get-Content $intentFile -Raw

        # Build Holodeck prompt JSON
        $prompt = @{
            scene_description = $intentText
            style             = "default"
            constraints       = "auto"
            edit_instructions = ""
        } | ConvertTo-Json -Depth 5

        $promptPath = "$HolodeckInbox\$intentName.json"
        $prompt | Out-File -FilePath $promptPath -Encoding UTF8

        Write-Host "Translated intent → Holodeck prompt: $promptPath"
    }
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

        # Trigger Unreal hot-reload
        Write-Host "Triggering Unreal hot-reload..."
        Set-Content -Path $UnrealHotReloadFlag -Value "reload"
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
Write-Host " PrimordiaOS Unified Launcher (Unreal Hot-Reload)"
Write-Host "===================================================="

Start-PrimordiaOS
Start-Holodeck

Translate-RealmIntentToHolodeckPrompt
Bind-HolodeckToRealmForge

Start-Spine
Start-RealmContainers

Start-UnrealEditor
Start-UnrealServer

Write-Host "===================================================="
Write-Host " All systems launched. Unreal hot-reload active."
Write-Host "===================================================="
