# ============================================================
#  PRIMORDIAOS // ANTIGRAVITY BOOTSTRAP (WINDOWS RITUAL MODE)
#  Location: C:\Users\Shane\Documents\dev\PrimordiaOS\antigravity.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Write-GlyphBanner {
$banner = @"
╔══════════════════════════════════════════════════════╗
║   ✦ PRIMORDIAOS // ANTIGRAVITY CORE BOOT SEQUENCE ✦   ║
╚══════════════════════════════════════════════════════╝

         /\
        /  \        ASCII // UNICODE HYBRID SIGIL
   /\  /    \  /\  
  /  \/      \/  \
 /                \
╱╲  𐌈  𐌅  𐌂  𐌉  𐌄  𐌋  𐌑  ╱╲
 ╲╱                ╲╱
  \  /\      /\   /
   \/  \    /  \/
        \  /
         \/

✦ REALITY THREADS: ONLINE
✦ PULSE ENGINE: WARMING
✦ REALM BINDING: INITIALIZING
✦ UNREAL BRIDGE: LISTENING
✦ CINEMA SUITE: PRIMING
✦ MONEYPLUGHUB: SYNCING
"@
Write-Host $banner -ForegroundColor Cyan
}

function Play-SovereignTone {
    Write-Host "[PrimordiaOS] Solfeggio 432Hz tone: INITIATED" -ForegroundColor DarkCyan
}

function Speak-AwakeningLine {
    $awakeningLine = "PrimordiaOS: Antigravity spine ignited. Reality threads online. Architect, your multiverse is ready."
    Write-Host "[SOVEREIGN VOICE] $awakeningLine" -ForegroundColor Magenta
}

# ============================================================
#  ABSOLUTE PATHS — YOUR MACHINE
# ============================================================

$root = "C:\Users\Shane\Documents\dev\PrimordiaOS"

$coreRuntime          = "$root\core\primordia-runtime.mjs"
$daemonOrchestrator   = "$root\core\daemon-orchestrator.mjs"
$moneyPlugHub         = "$root\apps\moneyplughub\server.mjs"
$cinemaSuite          = "$root\apps\cinema\server.mjs"
$unrealBridge         = "$root\services\unreal-bridge.mjs"

# ============================================================
#  BOOT SEQUENCE
# ============================================================

Write-GlyphBanner
Play-SovereignTone
Speak-AwakeningLine

Write-Host "[PrimordiaOS] Starting core runtime..." -ForegroundColor Green
node $coreRuntime

Write-Host "[PrimordiaOS] Spinning up daemon orchestrator..." -ForegroundColor Green
node $daemonOrchestrator

Write-Host "[PrimordiaOS] Initializing MoneyPlugHub..." -ForegroundColor Yellow
node $moneyPlugHub

Write-Host "[PrimordiaOS] Initializing VisionCore Cinema Suite..." -ForegroundColor Yellow
node $cinemaSuite

Write-Host "[PrimordiaOS] Binding Unreal Bridge..." -ForegroundColor Yellow
node $unrealBridge

Write-Host "[PrimordiaOS] Antigravity bootstrap complete. Reality threads are live." -ForegroundColor Cyan
