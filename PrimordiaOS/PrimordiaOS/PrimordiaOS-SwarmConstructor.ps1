# ============================================================
# PRIMORDIAOS SWARM CONSTRUCTOR
# Builds multi-agent / swarm coordination layer:
# - Swarm realm modules
# - Swarm engine modules
# - Swarm workflows
# - System Map integration
# ============================================================

$root      = "C:\Users\Shane\PrimordiaOS"
$vault     = "$root\Obsidian"
$realmDir  = "$vault\03 - Realms"
$engineDir = "$vault\02 - Engines"
$wfDir     = "$vault\04 - Workflows"
$sysMap    = "$vault\08 - System Map\SystemMap.md"

# ------------------------------------------------------------
# 0. Ensure directories exist
# ------------------------------------------------------------

$dirs = @($realmDir, $engineDir, $wfDir, (Split-Path $sysMap -Parent))
foreach ($d in $dirs) {
    if (!(Test-Path $d)) {
        New-Item -ItemType Directory -Path $d | Out-Null
        Write-Host "Created directory: $d"
    }
}

# ------------------------------------------------------------
# 1. Swarm realm modules
# ------------------------------------------------------------

$swarmRealms = @(
    @{
        Name = "swarm"
        Title = "Swarm Realm"
        Desc = "Primary realm for multi-agent coordination and distributed cognition."
    },
    @{
        Name = "SwarmCore"
        Title = "Swarm Core"
        Desc = "Central coordination hub for swarm nodes and multi-agent workflows."
    },
    @{
        Name = "SwarmNode"
        Title = "Swarm Node"
        Desc = "Represents an individual agent or node participating in the swarm."
    }
)

foreach ($r in $swarmRealms) {
    $path = Join-Path $realmDir ("{0}.md" -f $r.Name)
    if (Test-Path $path) {
        Write-Host "Swarm realm exists: $($r.Name)"
        continue
    }

    $content = @"
---
tags: [realm]
---
# $($r.Title)

## Description
$($r.Desc)

## Responsibilities
- (define responsibilities here)

## Connected Modules
- [[SwarmCoordinator|Swarm Coordinator]]
- [[SystemMap|System Map]]

## Related
- [[RealmCore|Realm Core]]
- [[SimulationRealm|Simulation Realm]]
"@

    Set-Content -Path $path -Value $content -Force
    Write-Host "Created swarm realm: $($r.Name) at $path"
}

# ------------------------------------------------------------
# 2. Swarm engine modules
# ------------------------------------------------------------

$swarmEngines = @(
    @{
        Name = "SwarmCoordinator"
        Desc = "Coordinates multiple agents, routes tasks, and manages distributed workflows."
        Connected = @("SwarmCore","SwarmNode","EventBus","WorkflowRunner")
    },
    @{
        Name = "SwarmRouter"
        Desc = "Routes intents and workflows to appropriate swarm nodes based on capabilities."
        Connected = @("SwarmNode","IntentParser","ReasoningEngine","ContextEngine")
    },
    @{
        Name = "SwarmMonitor"
        Desc = "Monitors swarm health, activity, and performance across nodes."
        Connected = @("Monitoring","SwarmCore","SwarmCoordinator","TemporalEngine")
    }
)

foreach ($e in $swarmEngines) {
    $path = Join-Path $engineDir ("{0}.md" -f $e.Name)
    if (Test-Path $path) {
        Write-Host "Swarm engine exists: $($e.Name)"
        continue
    }

    $connectedLines = $e.Connected | ForEach-Object {
        "- [[{0}|{1}]]" -f $_, ($_ -replace '([A-Z])',' $1').Trim()
    }

    $content = @"
---
tags: [engine]
---
# $($e.Name)

## Description
$($e.Desc)

## Responsibilities
- (define responsibilities here)

## Connected Modules
$($connectedLines -join "`n")

## Related
- [[swarm|Swarm Realm]]
- [[SystemMap|System Map]]
"@

    Set-Content -Path $path -Value $content -Force
    Write-Host "Created swarm engine: $($e.Name) at $path"
}

# ------------------------------------------------------------
# 3. Swarm workflows
# ------------------------------------------------------------

function New-SwarmWorkflowTemplate {
    param($name, $desc)

@"
---
tags: [workflow]
---
# Workflow: $name

## Description
$desc

## Inputs
- (define inputs)

## Outputs
- (define outputs)

## Steps
1. Step 1
2. Step 2
3. Step 3

## Failure Modes
- Condition A → fallback
- Condition B → retry
- Condition C → abort

## Connected Modules
- [[SwarmCoordinator|Swarm Coordinator]]
- [[SwarmRouter|Swarm Router]]
- [[SwarmMonitor|Swarm Monitor]]
- [[ActionEngine|Action Engine]]
- [[WorkflowRunner|Workflow Runner]]

## Related
- [[swarm|Swarm Realm]]
- [[SystemMap|System Map]]
"@
}

$swarmWorkflows = @(
    @{ Name = "dispatch-to-swarm"; Desc = "Dispatch a task or intent to the swarm for distributed handling."; },
    @{ Name = "balance-swarm-load"; Desc = "Balance workload across swarm nodes based on capacity and state."; },
    @{ Name = "monitor-swarm-health"; Desc = "Monitor swarm activity, failures, and performance over time."; },
    @{ Name = "route-intent-to-node"; Desc = "Route a specific intent to the most appropriate swarm node."; }
)

foreach ($wf in $swarmWorkflows) {
    $path = Join-Path $wfDir ("{0}.md" -f $wf.Name)
    if (Test-Path $path) {
        Write-Host "Swarm workflow exists: $($wf.Name)"
        continue
    }

    $content = New-SwarmWorkflowTemplate -name $wf.Name -desc $wf.Desc
    Set-Content -Path $path -Value $content -Force
    Write-Host "Created swarm workflow: $($wf.Name) at $path"
}

# ------------------------------------------------------------
# 4. System Map integration
# ------------------------------------------------------------

if (Test-Path $sysMap) {
    $map = Get-Content $sysMap -Raw

    $linesToAdd = @(
        "- [[swarm|Swarm Realm]]",
        "- [[SwarmCore|Swarm Core]]",
        "- [[SwarmNode|Swarm Node]]",
        "- [[SwarmCoordinator|Swarm Coordinator]]",
        "- [[SwarmRouter|Swarm Router]]",
        "- [[SwarmMonitor|Swarm Monitor]]"
    )

    foreach ($line in $linesToAdd) {
        if ($map -notmatch [regex]::Escape($line)) {
            Write-Host "Adding to System Map: $line"
            $map += "`n$line"
        }
    }

    Set-Content -Path $sysMap -Value $map -Force
    Write-Host "System Map updated with swarm components."
}
else {
    Write-Host "System Map not found at $sysMap. Skipping map update."
}

Write-Host "PrimordiaOS Swarm Constructor complete."
