# ============================================================
# PRIMORDIAOS MASS-FILE TAGGER & LINKER
# Scans vault, adds missing tags, headers, and related sections
# Vault Path: C:\Users\Shane\PrimordiaOS\Obsidian
# ============================================================

$vault = "C:\Users\Shane\PrimordiaOS\Obsidian"

# Map folders → tags
$tagMap = @{
    "00 - Inbox"            = "inbox"
    "01 - Core"             = "core"
    "02 - Engines"          = "engine"
    "03 - Realms"           = "realm"
    "04 - Workflows"        = "workflow"
    "05 - Command Language" = "command"
    "06 - Cosmology"        = "cosmology"
    "08 - System Map"       = "system"
    "09 - Dev Notes"        = "dev"
}

# Auto-link rules per subsystem
$linkMap = @{
    "core"      = @("EventBus","CloudSync","Monitoring","Security","TemporalEngine")
    "engine"    = @("ActionEngine","WorkflowRunner","WorkflowCompiler","IntentParser","EnglishInterpreter")
    "realm"     = @("RealmCore","TemporalRealm","CloudRealm","SimulationRealm","swarm")
    "workflow"  = @("open-chrome","record-screen","generate-cinematic","multi-step-workflows")
    "command"   = @("verbs","targets","modifiers","synonyms","metaphors","command-grammar")
    "cosmology" = @("Triad","Constellation","Glyphs","Origin")
    "system"    = @("SystemMap")
    "dev"       = @("todo","bugs","ideas")
    "inbox"     = @("raw-ideas","fragments","unorganized")
}

# ============================================================
# Helper: Ensure YAML header exists
# ============================================================

function Ensure-YAML($filePath, $tag) {
    $content = Get-Content $filePath -Raw

    if ($content -notmatch "^---") {
        $yaml = @"
---
tags: [$tag]
---
"@
        Set-Content -Path $filePath -Value ($yaml + "`n" + $content)
    }
}

# ============================================================
# Helper: Ensure Related section exists
# ============================================================

function Ensure-Related($filePath, $tag) {
    $content = Get-Content $filePath -Raw
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($filePath)

    $links = $linkMap[$tag] | ForEach-Object { "- [[${_}|$($_ -replace '-', ' ' -replace '_', ' ' )]]" }
    $relatedBlock = "`n## Related`n" + ($links -join "`n")

    if ($content -notmatch "## Related") {
        Add-Content -Path $filePath -Value $relatedBlock
    }
}

# ============================================================
# MAIN LOOP — Process all notes
# ============================================================

Get-ChildItem -Path $vault -Recurse -Filter *.md | ForEach-Object {
    $file = $_.FullName
    $folder = Split-Path $file -Parent
    $folderName = Split-Path $folder -Leaf

    if ($tagMap.ContainsKey($folderName)) {
        $tag = $tagMap[$folderName]

        Write-Host "Processing: $file (tag: $tag)"

        Ensure-YAML $file $tag
        Ensure-Related $file $tag
    }
}

Write-Host "Mass tagging + linking complete."
