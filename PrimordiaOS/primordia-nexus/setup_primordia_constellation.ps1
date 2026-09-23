<#
===========================================================
 PRIMORDIAOS CONSTELLATION SCAFFOLD (FULL AUTO MODE)
 Creates:
  - All folders
  - All placeholder files
  - Default boilerplate content
  - Cosmic logging
  - Auto path detection
===========================================================
#>

# --- AUTO-DETECT ROOT ---------------------------------------------------------
$Root = Get-Location
Write-Host "`n[PrimordiaOS] Root detected at: $Root" -ForegroundColor Cyan

# --- COSMIC LOGGER ------------------------------------------------------------
function Log($msg, $color="White") {
    $timestamp = (Get-Date).ToString("HH:mm:ss")
    Write-Host "[$timestamp] $msg" -ForegroundColor $color
}

Log "Initializing PrimordiaOS Constellation..." "Magenta"

# --- SAFE MKDIR ---------------------------------------------------------------
function MkDirSafe($path) {
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Log "Created folder: $path" "Green"
    } else {
        Log "Exists: $path" "Yellow"
    }
}

# --- SAFE FILE CREATION -------------------------------------------------------
function MkFileSafe($path, $content="") {
    if (!(Test-Path $path)) {
        New-Item -ItemType File -Path $path -Value $content | Out-Null
        Log "Created file: $path" "Green"
    } else {
        Log "Exists: $path" "Yellow"
    }
}

# ============================================================
# 1. PRIMORDIAOS CORE
# ============================================================

MkDirSafe "$Root/core"
MkDirSafe "$Root/core/bus"
MkDirSafe "$Root/core/state"
MkDirSafe "$Root/core/signals"
MkDirSafe "$Root/core/identity"

MkFileSafe "$Root/core/bus/websocket-hub.ts" "// PrimordiaOS WebSocket Hub"
MkFileSafe "$Root/core/bus/physics-channel.ts" "// Physics channel router"
MkFileSafe "$Root/core/bus/event-router.ts" "// Event router"

# ============================================================
# 2. MODULES
# ============================================================

MkDirSafe "$Root/modules"
MkDirSafe "$Root/modules/physics"
MkDirSafe "$Root/modules/fs"
MkDirSafe "$Root/modules/cognition"
MkDirSafe "$Root/modules/automation"

MkFileSafe "$Root/modules/physics/pipeline-sync.ts" "// Physics pipeline sync"
MkFileSafe "$Root/modules/physics/object-registry.ts" "// Object registry"

MkFileSafe "$Root/modules/fs/integrity-monitor.ts" "// FS integrity monitor"
MkFileSafe "$Root/modules/fs/path-resolver.ts" "// Path resolver"

MkFileSafe "$Root/modules/cognition/notion-sync.ts" "// Notion sync"
MkFileSafe "$Root/modules/cognition/memory-engine.ts" "// Memory engine"
MkFileSafe "$Root/modules/cognition/proof-log.ts" "// Proof log"

MkFileSafe "$Root/modules/automation/zapier-hooks.ts" "// Zapier hooks"
MkFileSafe "$Root/modules/automation/autopost-engine.ts" "// Auto posting engine"
MkFileSafe "$Root/modules/automation/scheduler-tasks.ts" "// Scheduler tasks"

# ============================================================
# 3. SERVICES
# ============================================================

MkDirSafe "$Root/services"
MkDirSafe "$Root/services/http"
MkDirSafe "$Root/services/http/routes"
MkDirSafe "$Root/services/ws"
MkDirSafe "$Root/services/storage"
MkDirSafe "$Root/services/storage/logs"

MkFileSafe "$Root/services/http/api.ts" "// HTTP API"
MkFileSafe "$Root/services/http/routes/physics.ts" "// Physics route"
MkFileSafe "$Root/services/http/routes/unreal.ts" "// Unreal route"
MkFileSafe "$Root/services/http/routes/diagnostics.ts" "// Diagnostics route"

MkFileSafe "$Root/services/ws/ws-server.ts" "// WS server"
MkFileSafe "$Root/services/ws/ws-client.ts" "// WS client"

MkFileSafe "$Root/services/storage/db.ts" "// DB"
MkFileSafe "$Root/services/storage/cache.ts" "// Cache"
MkFileSafe "$Root/services/storage/logs/physics.log"
MkFileSafe "$Root/services/storage/logs/unreal.log"
MkFileSafe "$Root/services/storage/logs/system.log"

# ============================================================
# 4. CLI
# ============================================================

MkDirSafe "$Root/cli"
MkDirSafe "$Root/cli/commands"

MkFileSafe "$Root/cli/primordia.ts" "// Primordia CLI"
MkFileSafe "$Root/cli/commands/diagnose.ts" "// Diagnose command"
MkFileSafe "$Root/cli/commands/sync.ts" "// Sync command"
MkFileSafe "$Root/cli/commands/rebuild.ts" "// Rebuild command"

# ============================================================
# 5. TESTS
# ============================================================

MkDirSafe "$Root/tests"
MkDirSafe "$Root/tests/fs"
MkDirSafe "$Root/tests/core"
MkDirSafe "$Root/tests/unreal"
MkDirSafe "$Root/tests/physics"

# ============================================================
# 6. PRIMORDIAUNREAL
# ============================================================

MkDirSafe "$Root/PrimordiaUnreal"
MkDirSafe "$Root/PrimordiaUnreal/WebSocket"
MkDirSafe "$Root/PrimordiaUnreal/Blueprints"
MkDirSafe "$Root/PrimordiaUnreal/Niagara"
MkDirSafe "$Root/PrimordiaUnreal/Events"
MkDirSafe "$Root/PrimordiaUnreal/WorldCommands"

MkFileSafe "$Root/PrimordiaUnreal/WebSocket/primordia_event_schema.ts" "// Event schema"
MkFileSafe "$Root/PrimordiaUnreal/WebSocket/websocket_client.ts" "// WS client"
MkFileSafe "$Root/PrimordiaUnreal/WebSocket/websocket_bridge.ts" "// WS bridge"

MkFileSafe "$Root/PrimordiaUnreal/Events/primordia_events.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/Events/agent_state.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/Events/metric_stream.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/Events/pulse_update.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/Events/evolution_patch.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/Events/world_commands.json" "{}"

MkFileSafe "$Root/PrimordiaUnreal/WorldCommands/chamber_init.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/WorldCommands/chamber_glow.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/WorldCommands/chamber_pulse.json" "{}"
MkFileSafe "$Root/PrimordiaUnreal/WorldCommands/chamber_sequence.json" "{}"

# ============================================================
# 7. PRIMORDIAOVERLAY
# ============================================================

MkDirSafe "$Root/PrimordiaOverlay"
MkDirSafe "$Root/PrimordiaOverlay/components"
MkDirSafe "$Root/PrimordiaOverlay/webgpu"
MkDirSafe "$Root/PrimordiaOverlay/webgpu/shaders"
MkDirSafe "$Root/PrimordiaOverlay/webgpu/buffers"
MkDirSafe "$Root/PrimordiaOverlay/hud"

MkFileSafe "$Root/PrimordiaOverlay/components/CosmicRing.tsx" "// Cosmic ring"
MkFileSafe "$Root/PrimordiaOverlay/components/GlyphPanel.tsx" "// Glyph panel"
MkFileSafe "$Root/PrimordiaOverlay/components/MetricRibbonHUD.tsx" "// Ribbon HUD"
MkFileSafe "$Root/PrimordiaOverlay/components/ChamberControls.tsx" "// Chamber controls"

MkFileSafe "$Root/PrimordiaOverlay/webgpu/renderer.ts" "// WebGPU renderer"
MkFileSafe "$Root/PrimordiaOverlay/webgpu/shaders/nebula.wgsl" "// Nebula shader"
MkFileSafe "$Root/PrimordiaOverlay/webgpu/shaders/ribbons.wgsl" "// Ribbon shader"
MkFileSafe "$Root/PrimordiaOverlay/webgpu/shaders/pulse.wgsl" "// Pulse shader"

MkFileSafe "$Root/PrimordiaOverlay/hud/PrimordiaHUD.tsx" "// HUD"
MkFileSafe "$Root/PrimordiaOverlay/hud/BootSequence.tsx" "// Boot sequence"

# ============================================================
# 8. PIXELSTREAMSERVER
# ============================================================

MkDirSafe "$Root/PixelStreamServer"
MkDirSafe "$Root/PixelStreamServer/webclient"

MkFileSafe "$Root/PixelStreamServer/start_server.ps1" "# Pixel Stream Server"
MkFileSafe "$Root/PixelStreamServer/start_server.sh" "#!/bin/bash"
MkFileSafe "$Root/PixelStreamServer/config.json" "{}"

MkFileSafe "$Root/PixelStreamServer/webclient/index.html" "<!-- Pixel Stream Client -->"
MkFileSafe "$Root/PixelStreamServer/webclient/stream.js" "// Stream logic"
MkFileSafe "$Root/PixelStreamServer/webclient/ui.css" "/* UI */"

# ============================================================
# DONE
# ============================================================

Log "PrimordiaOS Constellation Scaffold Complete." "Cyan"
Log "Your cosmic OS is now fully structured." "Magenta"
