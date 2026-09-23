# PrimordiaOS Workflow Binding
# File: C:\Users\Shane\PrimordiaOS\PrimordiaWorkflows.ps1

param(
    [string]$PrimordiaRoot = "C:\Users\Shane\PrimordiaOS"
)

$workflowDir = Join-Path $PrimordiaRoot ".primordia"

function Register-PrimordiaWorkflow {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path $Path)) {
        Write-Warning "Workflow file not found: $Path"
        return
    }

    if (-not $Global:PrimordiaWorkflows) {
        $Global:PrimordiaWorkflows = @{}
    }

    $name = Split-Path $Path -Leaf
    $Global:PrimordiaWorkflows[$name] = $Path
    Write-Host "Registered workflow: $name"
}

function Invoke-PrimordiaWorkflow {
    param(
        [Parameter(Mandatory)]
        [string]$Name
    )

    if (-not $Global:PrimordiaWorkflows.ContainsKey($Name)) {
        Write-Warning "Workflow not registered: $Name"
        return
    }

    $path = $Global:PrimordiaWorkflows[$Name]
    Write-Host "Invoking workflow: $Name ($path)"

    switch ($Name) {
        "workflow-antigravity.yml" {
            diag
            Test-AntigravityKernel
        }
        "workflow-chambers.yml" {
            chambers
            Test-ChamberHarmonics
        }
        "workflow-swarm.yml" {
            Boot-SwarmBrain
            Test-SwarmCoherence
        }
        "workflow-runtime.yml" {
            hud
            diag
        }
        "workflow-prophecy.yml" {
            prophecy "Automated prophecy cycle triggered."
        }
        default {
            Write-Warning "No binding logic defined for workflow: $Name"
        }
    }
}

# Register all workflows
Register-PrimordiaWorkflow -Path (Join-Path $workflowDir "workflow-antigravity.yml")
Register-PrimordiaWorkflow -Path (Join-Path $workflowDir "workflow-chambers.yml")
Register-PrimordiaWorkflow -Path (Join-Path $workflowDir "workflow-swarm.yml")
Register-PrimordiaWorkflow -Path (Join-Path $workflowDir "workflow-runtime.yml")
Register-PrimordiaWorkflow -Path (Join-Path $workflowDir "workflow-prophecy.yml")

# Add automation loop to PrimordiaOS (run this once in your kernel init)
Add-PrimordialLoop -Name "WorkflowMonitor" -IntervalSeconds 300

function Invoke-WorkflowMonitor {
    Write-Host "== PrimordiaOS Workflow Monitor =="
    foreach ($wf in $Global:PrimordiaWorkflows.Keys) {
        Invoke-PrimordiaWorkflow -Name $wf
    }
}
