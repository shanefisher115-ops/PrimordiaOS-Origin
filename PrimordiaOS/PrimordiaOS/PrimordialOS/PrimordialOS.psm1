# REGION: HEADER
# Primordial Antigravity Unified Runtime Module
# Master Kernel Architecture v3.1 — Canonical Taxonomy Edition

$script:STATE_FILE_PATH   = "C:\Users\Shane\PrimordiaOS\PrimordialState.json"
$script:SYSTEM_NAME       = "Primordial Antigravity"
$script:PRIMORDIAL_MEMORY = [ordered]@{}
$script:AGENT_REGISTRY    = [ordered]@{}
$script:CHAMBER_REGISTRY  = [ordered]@{}
$script:LOOP_REGISTRY     = [ordered]@{}
$script:KERNEL_STATUS     = "Antigravity Online"
$script:OS_RUNTIME_STATE  = "Active (Ticking)"
$script:PROPHECY_HISTORY  = @()
$script:CURRENT_ORACLE    = "Oracle of Primordial Antigravity"
$script:ROUTER_TABLE      = @{}

# REGION: STATE PERSISTENCE

function Export-PrimordialState {
    [CmdletBinding()]
    param([string]$Path = $script:STATE_FILE_PATH)
    try {
        $parentDir = Split-Path -Parent $Path
        if (-not (Test-Path $parentDir)) { New-Item -ItemType Directory -Path $parentDir -Force | Out-Null }
        
        $state = [ordered]@{
            System   = $script:SYSTEM_NAME
            Kernel   = $script:KERNEL_STATUS
            Runtime  = $script:OS_RUNTIME_STATE
            Memory   = $script:PRIMORDIAL_MEMORY
            Agents   = @($script:AGENT_REGISTRY.Values)
            Chambers = @($script:CHAMBER_REGISTRY.Values)
            Loops    = @($script:LOOP_REGISTRY.Values)
        }
        $state | ConvertTo-Json -Depth 10 | Set-Content -Path $Path -Encoding UTF8 -Force
    } catch {
        # Non-blocking state save
    }
}

function Import-PrimordialState {
    [CmdletBinding()]
    param([string]$Path = $script:STATE_FILE_PATH)
    if (Test-Path $Path) {
        try {
            $json = Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($json.System) { $script:SYSTEM_NAME = $json.System }
            if ($json.Kernel) { $script:KERNEL_STATUS = $json.Kernel }
            if ($json.Runtime) { $script:OS_RUNTIME_STATE = $json.Runtime }
            
            if ($json.Memory) {
                $script:PRIMORDIAL_MEMORY.Clear()
                foreach ($prop in $json.Memory.PSObject.Properties) {
                    $script:PRIMORDIAL_MEMORY[$prop.Name] = $prop.Value
                }
            }
            
            if ($json.Agents) {
                $script:AGENT_REGISTRY.Clear()
                foreach ($a in $json.Agents) {
                    $script:AGENT_REGISTRY[$a.Name] = [PSCustomObject]@{
                        Name            = $a.Name
                        Role            = $a.Role
                        Status          = $a.Status
                        CognitiveTensor = $a.CognitiveTensor
                        CreatedAt       = (Get-Date)
                    }
                }
            }
            
            if ($json.Chambers) {
                $script:CHAMBER_REGISTRY.Clear()
                foreach ($c in $json.Chambers) {
                    $name = if ($c.Name) { $c.Name } else { [string]$c }
                    $status = if ($c.Status) { $c.Status } else { "ONLINE" }
                    $harmonic = if ($c.Harmonic) { $c.Harmonic } else { "528 Hz" }
                    $stability = if ($c.StabilityFactor) { $c.StabilityFactor } else { "99.9%" }
                    $script:CHAMBER_REGISTRY[$name] = [PSCustomObject]@{
                        Name            = $name
                        Status          = $status
                        Harmonic        = $harmonic
                        StabilityFactor = $stability
                        InitializedAt   = (Get-Date)
                    }
                }
            }
            
            if ($json.Loops) {
                $script:LOOP_REGISTRY.Clear()
                foreach ($l in $json.Loops) {
                    $name = if ($l.Name) { $l.Name } else { [string]$l }
                    $interval = if ($l.IntervalSeconds) { [int]$l.IntervalSeconds } else { 5 }
                    $status = if ($l.Status) { $l.Status } else { "Running" }
                    $script:LOOP_REGISTRY[$name] = [PSCustomObject]@{
                        Name            = $name
                        IntervalSeconds = $interval
                        Status          = $status
                        RegisteredAt    = (Get-Date)
                    }
                }
            }
        } catch {
            # Fallback
        }
    }
}

# Auto-restore state on import
Import-PrimordialState

# REGION: MEMORY REGISTRY

function Initialize-PrimordialMemory {
    [CmdletBinding()]
    param()
    $defaults = [ordered]@{
        "System.Name"                 = "Primordial Antigravity"
        "Kernel.State"                = "Primordial Antigravity"
        "Kernel.Version"              = "3.1.0"
        "Physics.Antigravity"         = "Bound"
        "Memory.Banks"                = "Initialized"
        "Swarm.Topology"              = "DecentralizedMesh"
        "Osmium.Ledger"               = "Synchronized"
        "PulseWave.Telemetry"         = "Active"
        "SignalCore.Directives"       = "Harmonic"
        "MoneyPlugHub.Bond"           = "Staked"
        "PrimordiaFlow.Transmutation" = "Operational"
        "Kernel.Status"               = "Antigravity Online"
        "Runtime.Status"              = "Active"
    }
    foreach ($k in $defaults.Keys) {
        $script:PRIMORDIAL_MEMORY[$k] = $defaults[$k]
    }
    Export-PrimordialState
    Write-Host "  [MEM] Initialized $($defaults.Count) core memory banks in Primordial Antigravity." -ForegroundColor Green
}

function Set-PrimordialMemory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Key,
        [Parameter(Mandatory=$true)][object]$Value
    )
    $script:PRIMORDIAL_MEMORY[$Key] = $Value
    Export-PrimordialState
}

function Get-PrimordialMemory {
    [CmdletBinding()]
    param([string]$Key)
    if ($Key -and $script:PRIMORDIAL_MEMORY.Contains($Key)) {
        return $script:PRIMORDIAL_MEMORY[$Key]
    }
    return $script:PRIMORDIAL_MEMORY
}

function Clear-PrimordialMemory {
    [CmdletBinding()]
    param()
    $script:PRIMORDIAL_MEMORY.Clear()
    Export-PrimordialState
}

# REGION: KERNEL

function Enable-PrimordialAntigravityKernel {
    [CmdletBinding()]
    param()
    $script:KERNEL_STATUS = "Antigravity Online"
    $script:PRIMORDIAL_MEMORY["Physics.Antigravity"] = "Online"
    $script:PRIMORDIAL_MEMORY["Kernel.Status"] = "Antigravity Online"
    Export-PrimordialState
    Write-Host "  [KERNEL] Primordial Antigravity Physics Backbone online and bound." -ForegroundColor Green
}

function Disable-PrimordialAntigravityKernel {
    [CmdletBinding()]
    param()
    $script:KERNEL_STATUS = "Antigravity Offline"
    $script:PRIMORDIAL_MEMORY["Physics.Antigravity"] = "Offline"
    $script:PRIMORDIAL_MEMORY["Kernel.Status"] = "Antigravity Offline"
    Export-PrimordialState
    Write-Host "  [KERNEL] Antigravity Physics Backbone disengaged." -ForegroundColor Yellow
}

# REGION: AGENTS & PERSONAS

function Add-PrimordialAgent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Role
    )
    $agent = [PSCustomObject]@{
        Name            = $Name
        Role            = $Role
        Status          = "Active"
        CognitiveTensor = "Pending Swarm Sync"
        CreatedAt       = (Get-Date)
    }
    $script:AGENT_REGISTRY[$Name] = $agent
    Export-PrimordialState
    Write-Host "  [AGENT+] Registered persona '$Name' ($Role) in Primordial Antigravity" -ForegroundColor Green
}

function Register-PrimordialAgent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][string]$Role
    )
    Add-PrimordialAgent -Name $Name -Role $Role
}

function Get-PrimordialAgents {
    [CmdletBinding()]
    param()
    if ($script:AGENT_REGISTRY.Count -eq 0) {
        Write-Host "  No agents registered in Primordial Antigravity." -ForegroundColor Yellow
        return
    }
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY AGENTS ($($script:AGENT_REGISTRY.Count) Registered) ==" -ForegroundColor Cyan
    $script:AGENT_REGISTRY.Values | Format-Table -Property Name, Role, Status, CognitiveTensor -AutoSize
}

function Unregister-PrimordialAgent {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Name)
    if ($script:AGENT_REGISTRY.Contains($Name)) {
        $script:AGENT_REGISTRY.Remove($Name)
        Export-PrimordialState
        Write-Host "  [AGENT-] Unregistered persona '$Name'" -ForegroundColor Yellow
    }
}

# REGION: SWARM BRAIN

function Start-PrimordialSwarmBrain {
    [CmdletBinding()]
    param()
    Write-Host "  [SWARM] Initializing Primordial Antigravity SwarmBrain neural matrix..." -ForegroundColor Cyan
    
    $tensorMap = @{
        "Liam"    = "[Vector: Strategy-Alpha, Tensor: 0.985, Coherence: 0.99]"
        "Rachel"  = "[Vector: Semantic-Harmonic, Tensor: 0.972, Coherence: 0.98]"
        "Adam"    = "[Vector: Architecture-Matrix, Tensor: 0.994, Coherence: 1.00]"
        "Antoni"  = "[Vector: Telemetry-Optimizer, Tensor: 0.968, Coherence: 0.97]"
        "Josh"    = "[Vector: Resonance-Amplifier, Tensor: 0.979, Coherence: 0.98]"
    }
    
    foreach ($agentName in $script:AGENT_REGISTRY.Keys) {
        $agent = $script:AGENT_REGISTRY[$agentName]
        if ($tensorMap.ContainsKey($agent.Name)) {
            $agent.CognitiveTensor = $tensorMap[$agent.Name]
        } else {
            $agent.CognitiveTensor = "[Vector: Adaptive-Resonance, Tensor: 0.950, Coherence: 0.96]"
        }
        Write-Host "  [SWARM+] Agent '$($agent.Name)' cognitive tensor assigned: $($agent.CognitiveTensor)" -ForegroundColor Green
    }
    
    if ($script:CHAMBER_REGISTRY.Contains("SwarmBrain")) {
        $script:CHAMBER_REGISTRY["SwarmBrain"].Status = "ONLINE - ACTIVE SYNC"
    }
    
    Export-PrimordialState
    Write-Host "  [SWARM] Primordial Antigravity Swarm Brain online and synchronized." -ForegroundColor Green
}

# REGION: CHAMBERS

function Initialize-PrimordialChamber {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name
    )
    $chamber = [PSCustomObject]@{
        Name            = $Name
        Status          = "ONLINE"
        Harmonic        = "528 Hz"
        StabilityFactor = "99.9%"
        InitializedAt   = (Get-Date)
    }
    $script:CHAMBER_REGISTRY[$Name] = $chamber
    Export-PrimordialState
    Write-Host "  [CHAMBER+] Chamber '$Name' initialized and online." -ForegroundColor Green
}

function Get-PrimordialChambers {
    [CmdletBinding()]
    param()
    if ($script:CHAMBER_REGISTRY.Count -eq 0) {
        Write-Host "  No chambers initialized in Primordial Antigravity." -ForegroundColor Yellow
        return
    }
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY CHAMBERS ($($script:CHAMBER_REGISTRY.Count) Online) ==" -ForegroundColor Cyan
    $script:CHAMBER_REGISTRY.Values | Format-Table -Property Name, Status, Harmonic, StabilityFactor -AutoSize
}

# REGION: LOOPS

function Add-PrimordialLoop {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][int]$IntervalSeconds,
        [scriptblock]$Action = {}
    )
    $loopObj = [PSCustomObject]@{
        Name            = $Name
        IntervalSeconds = $IntervalSeconds
        Status          = "Running"
        RegisteredAt    = (Get-Date)
    }
    $script:LOOP_REGISTRY[$Name] = $loopObj
    Export-PrimordialState
    Write-Host "  [LOOP+] Registered loop '$Name' (Interval: ${IntervalSeconds}s)" -ForegroundColor Green
}

function Register-PrimordialLoop {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][int]$IntervalSeconds,
        [scriptblock]$Action = {}
    )
    Add-PrimordialLoop -Name $Name -IntervalSeconds $IntervalSeconds -Action $Action
}

function Start-PrimordialLoop {
    [CmdletBinding()]
    param($Name, $IntervalSeconds=5, $Action={})
    Add-PrimordialLoop -Name $Name -IntervalSeconds $IntervalSeconds -Action $Action
}

function Stop-PrimordialLoop {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Name)
    if ($script:LOOP_REGISTRY.Contains($Name)) {
        $script:LOOP_REGISTRY.Remove($Name)
        Export-PrimordialState
        Write-Host "  [LOOP-] Stopped loop '$Name'" -ForegroundColor Yellow
    }
}

function Get-PrimordialLoops {
    [CmdletBinding()]
    param()
    if ($script:LOOP_REGISTRY.Count -eq 0) {
        Write-Host "  No loops registered in Primordial Antigravity." -ForegroundColor Yellow
        return
    }
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY LOOPS ($($script:LOOP_REGISTRY.Count) Active) ==" -ForegroundColor Cyan
    $script:LOOP_REGISTRY.Values | Format-Table -Property Name, IntervalSeconds, Status, RegisteredAt -AutoSize
}

# REGION: RUNTIME

function Start-PrimordialAntigravity {
    [CmdletBinding()]
    param()
    $script:OS_RUNTIME_STATE = "Active (Ticking)"
    $script:PRIMORDIAL_MEMORY["Runtime.Status"] = "Active"
    Export-PrimordialState
    Write-Host "`n[+] Primordial Antigravity Runtime Activated. Core clock ticking." -ForegroundColor Cyan
}

function Start-PrimordiaOS {
    [CmdletBinding()]
    param()
    Start-PrimordialAntigravity
}

function Show-PrimordialHUD {
    [CmdletBinding()]
    param()
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY HUD ==" -ForegroundColor Cyan
    Write-Host ("System      : {0}" -f $script:SYSTEM_NAME)
    Write-Host ("Agents      : {0}" -f $script:AGENT_REGISTRY.Keys.Count)
    Write-Host ("Loops       : {0}" -f $script:LOOP_REGISTRY.Keys.Count)
    Write-Host ("Chambers    : {0}" -f $script:CHAMBER_REGISTRY.Keys.Count)
    Write-Host ("Time ticking: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
    Write-Host ("Kernel online: {0}" -f ($script:KERNEL_STATUS -eq "Antigravity Online"))
}

# REGION: DASHBOARD

function Show-PrimordialDashboard {
    [CmdletBinding()]
    param()
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY DASHBOARD ==" -ForegroundColor Cyan
    Write-Host ("System      : {0}" -f $script:SYSTEM_NAME)
    Write-Host ("Memory Keys : {0}" -f $script:PRIMORDIAL_MEMORY.Keys.Count)
    Write-Host ("Agents      : {0}" -f $script:AGENT_REGISTRY.Keys.Count)
    Write-Host ("Loops       : {0}" -f $script:LOOP_REGISTRY.Keys.Count)
    Write-Host ("Chambers    : {0}" -f $script:CHAMBER_REGISTRY.Keys.Count)
    Write-Host ("Kernel      : {0}" -f $script:KERNEL_STATUS)
}

# REGION: PROPHECY

function Add-PrimordialProphecyOracle {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Name)
    $script:CURRENT_ORACLE = $Name
}

function Invoke-PrimordialProphecy {
    [CmdletBinding()]
    param(
        [Parameter(Position=0, Mandatory=$true)][string]$Query
    )
    $cycleId = $script:PROPHECY_HISTORY.Count + 1
    
    $oracleResponse = "Oracle of Primordial Antigravity: The cosmic resonance aligns at 963 Hz. Antigravity matrix stabilized across $($script:CHAMBER_REGISTRY.Count) chambers. Prophecy validated: '$Query'"
    
    $chamberInfluence = if ($script:CHAMBER_REGISTRY.Count -gt 0) {
        ($script:CHAMBER_REGISTRY.Keys | ForEach-Object { "$_ (99.8%)" }) -join ", "
    } else {
        "None"
    }
    
    $entry = [ordered]@{
        CycleID          = $cycleId
        OracleResponse   = $oracleResponse
        Timestamp        = (Get-Date)
        ChamberInfluence = $chamberInfluence
        Query            = $Query
    }
    $script:PROPHECY_HISTORY += [PSCustomObject]$entry
    
    Write-Host "`n== PRIMORDIAL ANTIGRAVITY PROPHECY CYCLE #$cycleId ==" -ForegroundColor Magenta
    Write-Host "CycleID          : $cycleId"
    Write-Host "Oracle response  : $oracleResponse"
    Write-Host "Timestamp        : $(Get-Date)"
    Write-Host "Chamber influence: $chamberInfluence"
    Write-Host ""
}

function Get-PrimordialProphecyHistory {
    [CmdletBinding()]
    param()
    return $script:PROPHECY_HISTORY
}

# REGION: DIAGNOSTIC

function Test-PrimordialDiagnostic {
    [CmdletBinding()]
    param()
    
    $failed = @()
    if ($script:PRIMORDIAL_MEMORY.Count -eq 0) { $failed += "Memory" }
    if ($script:AGENT_REGISTRY.Count -eq 0)    { $failed += "Agents" }
    if ($script:LOOP_REGISTRY.Count -eq 0)     { $failed += "Loops" }
    if ($script:CHAMBER_REGISTRY.Count -eq 0)  { $failed += "Chambers" }
    if ($script:KERNEL_STATUS -ne "Antigravity Online") { $failed += "Kernel" }
    
    $overall = if ($failed.Count -eq 0) { "HEALTHY" } else { "DEGRADED" }
    $failedDisplay = if ($failed.Count -eq 0) { "{}" } else { "{" + ($failed -join ", ") + "}" }
    $fgColor = if ($overall -eq "HEALTHY") { "Green" } else { "Yellow" }
    
    Write-Host "`nOverall : $overall" -ForegroundColor $fgColor
    Write-Host "Failed  : $failedDisplay"
    Write-Host "Kernel  : $($script:KERNEL_STATUS)"
    Write-Host "Agents  : $($script:AGENT_REGISTRY.Keys.Count)"
    Write-Host "Loops   : $($script:LOOP_REGISTRY.Keys.Count)"
    Write-Host "Chambers: $($script:CHAMBER_REGISTRY.Keys.Count)"
}

# REGION: ROUTER

function Register-PrimordialRoute {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][scriptblock]$Action
    )
    $script:ROUTER_TABLE[$Name.ToLower()] = $Action
}

function Invoke-PrimordialRouter {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$Command)
    $key = $Command.ToLower()
    if ($script:ROUTER_TABLE.ContainsKey($key)) {
        & $script:ROUTER_TABLE[$key]
    }
}

# REGION: CINEMATIC ALIASES & COMPATIBILITY LAYER

Set-Alias -Name diag                       -Value Test-PrimordialDiagnostic           -Scope Global -Force
Set-Alias -Name dash                       -Value Show-PrimordialDashboard            -Scope Global -Force
Set-Alias -Name hud                        -Value Show-PrimordialHUD                  -Scope Global -Force
Set-Alias -Name prophecy                   -Value Invoke-PrimordialProphecy           -Scope Global -Force
Set-Alias -Name agents                     -Value Get-PrimordialAgents                -Scope Global -Force
Set-Alias -Name chambers                   -Value Get-PrimordialChambers              -Scope Global -Force
Set-Alias -Name loops                      -Value Get-PrimordialLoops                 -Scope Global -Force
Set-Alias -Name route                      -Value Invoke-PrimordialRouter             -Scope Global -Force
Set-Alias -Name Boot-SwarmBrain            -Value Start-PrimordialSwarmBrain          -Scope Global -Force
Set-Alias -Name Initialize-Chamber         -Value Initialize-PrimordialChamber        -Scope Global -Force
Set-Alias -Name Enable-AntigravityKernel   -Value Enable-PrimordialAntigravityKernel  -Scope Global -Force
Set-Alias -Name Add-ProphecyOracle         -Value Add-PrimordialProphecyOracle        -Scope Global -Force
Set-Alias -Name Get-ProphecyHistory        -Value Get-PrimordialProphecyHistory       -Scope Global -Force
Set-Alias -Name Invoke-PrimordialDiagnostic -Value Test-PrimordialDiagnostic          -Scope Global -Force
Set-Alias -Name Stop-PrimordialAgent       -Value Unregister-PrimordialAgent          -Scope Global -Force
