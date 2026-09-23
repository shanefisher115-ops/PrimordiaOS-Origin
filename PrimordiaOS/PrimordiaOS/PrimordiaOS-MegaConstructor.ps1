# ============================================================
# PRIMORDIAOS MEGA CONSTRUCTOR
# Builds vault, modules, tags, links, workflows in one pass
# ============================================================

$root      = "C:\Users\Shane\PrimordiaOS"
$vault     = "$root\Obsidian"
$wfFolder  = "$vault\04 - Workflows"

# ------------------------------------------------------------
# 0. Ensure base directories exist
# ------------------------------------------------------------

$dirs = @(
    $root,
    $vault,
    "$vault\00 - Inbox",
    "$vault\01 - Core",
    "$vault\02 - Engines",
    "$vault\03 - Realms",
    "$vault\04 - Workflows",
    "$vault\05 - Command Language",
    "$vault\06 - Cosmology",
    "$vault\08 - System Map",
    "$vault\09 - Dev Notes"
)

foreach ($d in $dirs) {
    if (!(Test-Path $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
        Write-Host "Created directory: $d"
    }
}

# ------------------------------------------------------------
# 1. Core module files
# ------------------------------------------------------------

$coreFiles = @(
    "CloudSync.md",
    "EventBus.md",
    "Monitoring.md",
    "Security.md",
    "TemporalEngine.md"
)

foreach ($f in $coreFiles) {
    $path = "$vault\01 - Core\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [core]
---
# $(($f -replace '.md',''))

## Description
Core subsystem module.

## Related
- [[SystemMap|System Map]]
"@
        Write-Host "Created core module: $path"
    }
}

# ------------------------------------------------------------
# 2. Engine module files
# ------------------------------------------------------------

$engineFiles = @(
    "ActionEngine.md",
    "EnglishInterpreter.md",
    "IntentParser.md",
    "WorkflowCompiler.md",
    "WorkflowRunner.md"
)

foreach ($f in $engineFiles) {
    $path = "$vault\02 - Engines\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [engine]
---
# $(($f -replace '.md',''))

## Description
Engine subsystem module.

## Related
- [[SystemMap|System Map]]
- [[RealmCore|Realm Core]]
"@
        Write-Host "Created engine module: $path"
    }
}

# ------------------------------------------------------------
# 3. Realm module files
# ------------------------------------------------------------

$realmFiles = @(
    "RealmCore.md",
    "TemporalRealm.md",
    "CloudRealm.md",
    "SimulationRealm.md",
    "swarm.md"
)

foreach ($f in $realmFiles) {
    $path = "$vault\03 - Realms\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [realm]
---
# $(($f -replace '.md',''))

## Description
Realm subsystem module.

## Related
- [[SystemMap|System Map]]
- [[WorkflowRunner|Workflow Runner]]
"@
        Write-Host "Created realm module: $path"
    }
}

# ------------------------------------------------------------
# 4. Command Language files
# ------------------------------------------------------------

$cmdFiles = @(
    "verbs.md",
    "targets.md",
    "modifiers.md",
    "synonyms.md",
    "metaphors.md",
    "command-grammar.md"
)

foreach ($f in $cmdFiles) {
    $path = "$vault\05 - Command Language\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [command]
---
# $(($f -replace '.md',''))

## Description
Command language component.

## Related
- [[IntentParser|Intent Parser]]
- [[EnglishInterpreter|English Interpreter]]
"@
        Write-Host "Created command language file: $path"
    }
}

# ------------------------------------------------------------
# 5. Cosmology files
# ------------------------------------------------------------

$cosmoFiles = @(
    "Triad.md",
    "Constellation.md",
    "Glyphs.md",
    "Origin.md"
)

foreach ($f in $cosmoFiles) {
    $path = "$vault\06 - Cosmology\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [cosmology]
---
# $(($f -replace '.md',''))

## Description
Cosmology component.

## Related
- [[SystemMap|System Map]]
"@
        Write-Host "Created cosmology file: $path"
    }
}

# ------------------------------------------------------------
# 6. System Map file
# ------------------------------------------------------------

$systemMapPath = "$vault\08 - System Map\SystemMap.md"
if (!(Test-Path $systemMapPath)) {
    Set-Content -Path $systemMapPath -Value @"
---
tags: [system]
---
# System Map

## Subsystems
- [[CloudSync|Cloud Sync]]
- [[EventBus|Event Bus]]
- [[Monitoring|Monitoring]]
- [[Security|Security]]
- [[TemporalEngine|Temporal Engine]]
- [[ActionEngine|Action Engine]]
- [[WorkflowRunner|Workflow Runner]]
- [[WorkflowCompiler|Workflow Compiler]]
- [[IntentParser|Intent Parser]]
- [[EnglishInterpreter|English Interpreter]]
- [[RealmCore|Realm Core]]
- [[TemporalRealm|Temporal Realm]]
- [[CloudRealm|Cloud Realm]]
- [[SimulationRealm|Simulation Realm]]
- [[swarm|Swarm]]
- [[Triad|Triad]]
- [[Constellation|Constellation]]
- [[Glyphs|Glyphs]]
- [[Origin|Origin]]
"@
    Write-Host "Created System Map."
}

# ------------------------------------------------------------
# 7. Dev Notes files
# ------------------------------------------------------------

$devFiles = @("todo.md","bugs.md","ideas.md")
foreach ($f in $devFiles) {
    $path = "$vault\09 - Dev Notes\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [dev]
---
# $(($f -replace '.md',''))

## Notes
Development notes for PrimordiaOS.
"@
        Write-Host "Created dev note: $path"
    }
}

# ------------------------------------------------------------
# 8. Inbox files
# ------------------------------------------------------------

$inboxFiles = @("raw-ideas.md","fragments.md","unorganized.md")
foreach ($f in $inboxFiles) {
    $path = "$vault\00 - Inbox\$f"
    if (!(Test-Path $path)) {
        Set-Content -Path $path -Value @"
---
tags: [inbox]
---
# $(($f -replace '.md',''))

## Notes
Raw cognition and unstructured material.
"@
        Write-Host "Created inbox file: $path"
    }
}

# ------------------------------------------------------------
# 9. Mass tagging + linking (inline version)
# ------------------------------------------------------------

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

function Ensure-YAML {
    param($filePath, $tag)
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

function Ensure-Related {
    param($filePath, $tag)
    $content = Get-Content $filePath -Raw
    if ($linkMap.ContainsKey($tag)) {
        $links = $linkMap[$tag] | ForEach-Object { "- [[${_}|$($_ -replace '-', ' ' -replace '_', ' ' )]]" }
        $relatedBlock = "`n## Related`n" + ($links -join "`n")
        if ($content -notmatch "## Related") {
            Add-Content -Path $filePath -Value $relatedBlock
        }
    }
}

Get-ChildItem -Path $vault -Recurse -Filter *.md | ForEach-Object {
    $file = $_.FullName
    $folder = Split-Path $file -Parent
    $folderName = Split-Path $folder -Leaf

    if ($tagMap.ContainsKey($folderName)) {
        $tag = $tagMap[$folderName]
        Write-Host "Tagging + linking: $file (tag: $tag)"
        Ensure-YAML $file $tag
        Ensure-Related $file $tag
    }
}

Write-Host "Mass tagging + linking complete."

# ------------------------------------------------------------
# 10. Workflow template generator (inline)
# ------------------------------------------------------------

function New-WorkflowTemplate {
    param($name)

@"
---
tags: [workflow]
---
# Workflow: $name

## Description
High-level description of what this workflow accomplishes.

## Inputs
- None yet

## Outputs
- None yet

## Steps
1. Step 1
2. Step 2
3. Step 3

## Failure Modes
- Condition A → fallback
- Condition B → retry
- Condition C → abort

## Connected Modules
- [[ActionEngine|Action Engine]]
- [[WorkflowRunner|Workflow Runner]]
- [[IntentParser|Intent Parser]]

## Related
- [[SystemMap|System Map]]
- [[RealmCore|Realm Core]]
- [[EventBus|EventBus]]
"@
}

$desiredWorkflows = @(
    "open-chrome",
    "record-screen",
    "generate-cinematic",
    "multi-step-workflows",
    "launch-unreal",
    "sync-cloud",
    "start-simulation",
    "compile-assets",
    "render-sequence",
    "deploy-build"
)

foreach ($wf in $desiredWorkflows) {
    $filePath = "$wfFolder\$wf.md"
    if (!(Test-Path $filePath)) {
        Write-Host "Creating workflow: $wf"
        $template = New-WorkflowTemplate $wf
        Set-Content -Path $filePath -Value $template -Force
    }
    else {
        Write-Host "Workflow exists: $wf"
    }
}

Write-Host "PrimordiaOS Mega Constructor complete."
