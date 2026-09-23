# ============================================================
# PRIMORDIAOS ENGINE CONSTRUCTOR
# Adds Memory/Context/Reasoning/Mapping/Expansion engines
# and integrates them into the System Map.
# ============================================================

$root  = "C:\Users\Shane\PrimordiaOS"
$vault = "$root\Obsidian"
$engDir = "$vault\02 - Engines"
$sysMapPath = "$vault\08 - System Map\SystemMap.md"

if (!(Test-Path $engDir)) {
    New-Item -ItemType Directory -Path $engDir | Out-Null
    Write-Host "Created Engines directory: $engDir"
}

# ------------------------------------------------------------
# 1. Engine definitions
# ------------------------------------------------------------

$engines = @(
    @{
        Name = "MemoryEngine"
        Tag  = "engine"
        Desc = "Handles semantic recall, association, and cluster strengthening."
        Connected = @("TemporalEngine","RealmCore","MappingEngine","ReasoningEngine")
    },
    @{
        Name = "ContextEngine"
        Tag  = "engine"
        Desc = "Determines active realm and situational context for workflows."
        Connected = @("TemporalRealm","CloudRealm","SimulationRealm","WorkflowRunner")
    },
    @{
        Name = "ReasoningEngine"
        Tag  = "engine"
        Desc = "Inference, chaining, pattern recognition, and semantic routing."
        Connected = @("IntentParser","WorkflowCompiler","MappingEngine","ContextEngine")
    },
    @{
        Name = "MappingEngine"
        Tag  = "engine"
        Desc = "Graph traversal, density analysis, cluster formation, and topology."
        Connected = @("SystemMap","MemoryEngine","ReasoningEngine","ExpansionEngine")
    },
    @{
        Name = "ExpansionEngine"
        Tag  = "engine"
        Desc = "Auto-generation of modules, links, workflows, and semantic evolution."
        Connected = @("MappingEngine","ReasoningEngine","Triad","Constellation","Glyphs","Origin")
    }
)

# ------------------------------------------------------------
# 2. Create engine files
# ------------------------------------------------------------

foreach ($e in $engines) {
    $filePath = Join-Path $engDir ("{0}.md" -f $e.Name)

    if (Test-Path $filePath) {
        Write-Host "Engine exists: $($e.Name)"
        continue
    }

    $connectedLines = $e.Connected | ForEach-Object {
        "- [[{0}|{1}]]" -f $_, ($_ -replace '([A-Z])',' $1').Trim()
    }

    $content = @"
---
tags: [$($e.Tag)]
---
# $($e.Name)

## Description
$($e.Desc)

## Responsibilities
- (define responsibilities in detail here)

## Connected Modules
$($connectedLines -join "`n")

## Related
- [[SystemMap|System Map]]
- [[RealmCore|Realm Core]]
"@

    Set-Content -Path $filePath -Value $content -Force
    Write-Host "Created engine: $($e.Name) at $filePath"
}

# ------------------------------------------------------------
# 3. Ensure System Map includes new engines
# ------------------------------------------------------------

if (Test-Path $sysMapPath) {
    $mapContent = Get-Content $sysMapPath -Raw

    foreach ($e in $engines) {
        $linkLine = "- [[{0}|{1}]]" -f $e.Name, ($e.Name -replace '([A-Z])',' $1').Trim()
        if ($mapContent -notmatch [regex]::Escape($linkLine)) {
            Write-Host "Adding to System Map: $($e.Name)"
            $mapContent += "`n$linkLine"
        }
    }

    Set-Content -Path $sysMapPath -Value $mapContent -Force
    Write-Host "System Map updated with new engines."
}
else {
    Write-Host "System Map not found at $sysMapPath. Skipping map update."
}

Write-Host "PrimordiaOS Engine Constructor complete."
