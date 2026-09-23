# primordiaos-obsidian-scaffold.ps1
# Run from your PrimordiaOS root:
#   C:\Users\shane\primordiaos\

$root = "C:\Users\shane\primordiaos"
$obsidian = Join-Path $root "obsidian"
$vault    = Join-Path $obsidian "primordiaos"

if (!(Test-Path $obsidian)) {
    Write-Host "ERROR: Obsidian folder not found at $obsidian"
    exit
}

New-Item -ItemType Directory -Path $vault -Force | Out-Null

# Helper: create folder
function Make-Folder($path) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
}

# Helper: create empty file
function Make-File($path) {
    if (!(Test-Path $path)) {
        New-Item -ItemType File -Path $path -Force | Out-Null
    }
}

Write-Host "Scaffolding PrimordiaOS Obsidian structure at $vault..."

# --- Core cosmic folders ---
$folders = @(
    "00_Triad",
    "01_Omniscience",
    "02_Primordia",
    "03_Origin",
    "10_Realms",
    "11_Constitution",
    "12_Harmonics",
    "13_Pipelines",
    "14_Glyphs",
    "15_VisionCore",
    "16_UnrealBridge",
    "17_MoneyPlugHub",
    "18_AgentHost",
    "19_Cockpit",
    "90_Projects",
    "91_Prompts",
    "99_Notes"
)

foreach ($f in $folders) {
    Make-Folder (Join-Path $vault $f)
}

# --- 00_Triad ---
$triad = Join-Path $vault "00_Triad"
Make-File (Join-Path $triad "triad-core.md")
Make-Folder (Join-Path $triad "triad-harmonics")
Make-Folder (Join-Path $triad "triad-resonance")
Make-Folder (Join-Path $triad "triad-glyphs")
Make-Folder (Join-Path $triad "triad-constitution")

# --- 01_Omniscience ---
$omni = Join-Path $vault "01_Omniscience"
Make-File (Join-Path $omni "constitution.md")
Make-File (Join-Path $omni "interpretation-rules.md")
Make-File (Join-Path $omni "governance-map.md")
Make-File (Join-Path $omni "drift-analysis.md")
Make-Folder (Join-Path $omni "realm-governance")

# --- 02_Primordia ---
$prim = Join-Path $vault "02_Primordia"
Make-File (Join-Path $prim "flow-laws.md")
Make-File (Join-Path $prim "emergence-patterns.md")
Make-File (Join-Path $prim "harmonic-streams.md")
Make-File (Join-Path $prim "triad-flow-sync.md")

# --- 03_Origin ---
$origin = Join-Path $vault "03_Origin"
Make-File (Join-Path $origin "proto-realms.md")
Make-File (Join-Path $origin "genesis-laws.md")
Make-File (Join-Path $origin "initial-conditions.md")
Make-File (Join-Path $origin "origin-harmonics.md")

# --- 10_Realms ---
$realmsRoot = Join-Path $vault "10_Realms"
$realms = @(
    "kernel",
    "message-bus",
    "simulation",
    "moneyplughub",
    "plugin-os",
    "cockpit",
    "agent-host"
)

foreach ($r in $realms) {
    $rp = Join-Path $realmsRoot $r
    Make-Folder $rp
    Make-File (Join-Path $rp "$r.md")
    Make-Folder (Join-Path $rp "harmonics")
    Make-Folder (Join-Path $rp "glyphs")
    Make-Folder (Join-Path $rp "interfaces")
    Make-File (Join-Path $rp "constitution-overlay.md")
    Make-File (Join-Path $rp "resonance-map.md")
}

# --- 11_Constitution ---
$const = Join-Path $vault "11_Constitution"
Make-File (Join-Path $const "primordiaos-constitution.md")
Make-Folder (Join-Path $const "realm-charters")
Make-File (Join-Path $const "triad-charter.md")
Make-File (Join-Path $const "harmonic-law.md")

# --- 12_Harmonics ---
$harm = Join-Path $vault "12_Harmonics"
Make-Folder (Join-Path $harm "constitutional")
Make-Folder (Join-Path $harm "flow")
Make-Folder (Join-Path $harm "genesis")
Make-File (Join-Path $harm "triad-harmonics.md")
Make-File (Join-Path $harm "realm-harmonics-map.md")

# --- 13_Pipelines ---
$pipes = Join-Path $vault "13_Pipelines"
Make-Folder (Join-Path $pipes "antigravity")
Make-Folder (Join-Path $pipes "visioncore-link")
Make-Folder (Join-Path $pipes "realm-pipelines")
Make-File (Join-Path $pipes "triad-convergence-pipeline.md")

# --- 14_Glyphs ---
$glyphs = Join-Path $vault "14_Glyphs"
Make-Folder (Join-Path $glyphs "triad-glyphs")
Make-Folder (Join-Path $glyphs "realm-glyphs")
Make-Folder (Join-Path $glyphs "harmonic-glyphs")
Make-Folder (Join-Path $glyphs "pipeline-glyphs")
Make-File (Join-Path $glyphs "glyph-atlas.md")

# --- 15_VisionCore ---
$vc = Join-Path $vault "15_VisionCore"
Make-File (Join-Path $vc "semantic-map.md")
Make-Folder (Join-Path $vc "realm-index")
Make-Folder (Join-Path $vc "harmonic-index")
Make-Folder (Join-Path $vc "glyph-index")

# --- 16_UnrealBridge ---
$ub = Join-Path $vault "16_UnrealBridge"
Make-File (Join-Path $ub "simulation-metadata.md")
Make-Folder (Join-Path $ub "realm-simulation-hooks")
Make-File (Join-Path $ub "triad-simulation-sync.md")

# --- 17_MoneyPlugHub ---
$mph = Join-Path $vault "17_MoneyPlugHub"
Make-File (Join-Path $mph "ledger.md")
Make-File (Join-Path $mph "autonomous-loop-manager.md")
Make-Folder (Join-Path $mph "project-flows")
Make-File (Join-Path $mph "realm-economic-links.md")

# --- 18_AgentHost ---
$ah = Join-Path $vault "18_AgentHost"
Make-File (Join-Path $ah "behavior-laws.md")
Make-File (Join-Path $ah "agent-harmonics.md")
Make-Folder (Join-Path $ah "realm-agent-overlays")

# --- 19_Cockpit ---
$cp = Join-Path $vault "19_Cockpit"
Make-File (Join-Path $cp "cockpit-layout.md")
Make-File (Join-Path $cp "triad-overlay.md")
Make-Folder (Join-Path $cp "realm-overlay")
Make-File (Join-Path $cp "harmonic-visualization.md")

# --- 90_Projects ---
Make-Folder (Join-Path $vault "90_Projects")

# --- 91_Prompts ---
$prompts = Join-Path $vault "91_Prompts"
Make-File (Join-Path $prompts "prompt-library.md")

# --- 99_Notes ---
Make-Folder (Join-Path $vault "99_Notes")

Write-Host "PrimordiaOS Obsidian cosmic scaffold complete."
Write-Host "Open this vault in Obsidian:"
Write-Host "  $vault"
