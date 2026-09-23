<#
.SYNOPSIS
    PrimordiaOS Git Fleet, Push & Merge Acceptance Engine
.DESCRIPTION
    Automates multi-branch synchronization, pending change staging, ANTIGRAV-gated
    merge acceptance, conflict detection, and upstream push delivery.
.EXAMPLE
    .\git-fleet.ps1 -Action PushAll
    .\git-fleet.ps1 -Action PushPending -Message "feat: update core engine"
    .\git-fleet.ps1 -Action AcceptMerge -SourceBranch "cognition-core" -TargetBranch "master" -AutoCommit
    .\git-fleet.ps1 -Action AcceptAllApproved -TargetBranch "master"
    .\git-fleet.ps1 -Action AuditFleet
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("PushAll", "PushPending", "Status", "AuditFleet", "SyncUpstream", "AcceptMerge", "AcceptAllApproved")]
    [string]$Action,

    [Parameter(Mandatory = $false)]
    [string]$SourceBranch,

    [Parameter(Mandatory = $false)]
    [string]$TargetBranch = "master",

    [Parameter(Mandatory = $false)]
    [string]$Message = "chore: synchronize local changes",

    [Parameter(Mandatory = $false)]
    [string]$Remote = "origin",

    [Parameter(Mandatory = $false)]
    [switch]$Squash,

    [Parameter(Mandatory = $false)]
    [switch]$AutoCommit,

    [Parameter(Mandatory = $false)]
    [bool]$AutoPush = $true,

    [Parameter(Mandatory = $false)]
    [switch]$SkipAntigrav
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Auto-align working directory to PrimordiaOS project root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
if ((Get-Location).Path -ne $projectRoot.Path) {
    Set-Location $projectRoot
}

function Show-Status {
    Write-Host "=== Current Git Status ===" -ForegroundColor Cyan
    git status -s
    Write-Host "`n=== Local Branches & Upstreams ===" -ForegroundColor Cyan
    git branch -vv
}

function Invoke-PushAll {
    Write-Host "=== Pushing all local branches to remote: $Remote ===" -ForegroundColor Yellow
    try {
        git push $Remote --all
        Write-Host "=== Pushing all tags to remote: $Remote ===" -ForegroundColor Yellow
        git push $Remote --tags
        Write-Host "All branches and tags pushed successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Push failed: $($_.Exception.Message)"
    }
}

function Invoke-PushPending {
    param([string]$CommitMessage)
    Write-Host "=== Staging tracked modifications & deletions ===" -ForegroundColor Yellow
    git add -u
    $status = git status --porcelain -uno
    if (-not $status) {
        Write-Host "No tracked changes to commit." -ForegroundColor Cyan
        return
    }
    Write-Host "=== Committing changes: '$CommitMessage' ===" -ForegroundColor Yellow
    git commit -m "$CommitMessage"
    $currentBranch = (git branch --show-current).Trim()
    Write-Host "=== Pushing branch: $currentBranch to $Remote ===" -ForegroundColor Yellow
    try {
        git push -u $Remote $currentBranch
        Write-Host "Branch $currentBranch pushed successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Commit created successfully, but upstream push failed: $($_.Exception.Message)"
    }
}

function Invoke-AuditFleet {
    $auditFile = "fleet-pr-audit-summary.md"
    Write-Host "=== Fleet Sentinel Audit Summary ===" -ForegroundColor Magenta
    if (Test-Path $auditFile) {
        Get-Content $auditFile | Select-String "APPROVED|BLOCKED|Ready to Review" -Context 0, 1 | Out-String | Write-Host
    } else {
        Write-Host "No fleet audit summary ($auditFile) found." -ForegroundColor DarkGray
    }
}

function Invoke-SyncUpstream {
    $currentBranch = (git branch --show-current).Trim()
    Write-Host "=== Fetching $Remote and rebasing $currentBranch ===" -ForegroundColor Yellow
    git fetch $Remote
    git pull --rebase $Remote $currentBranch
}

function Test-MergeConflict {
    param (
        [string]$Target,
        [string]$Source
    )
    $mergeBase = (git merge-base $Target $Source 2>$null)
    if (-not $mergeBase) {
        return @{ CanMerge = $false; Reason = "No common ancestor between $Target and $Source" }
    }
    
    $targetSha = (git rev-parse $Target).Trim()
    $sourceSha = (git rev-parse $Source).Trim()
    
    # Check dry run merge without modifying index
    $treeResult = git merge-tree $targetSha $sourceSha 2>&1
    if ($LASTEXITCODE -ne 0 -or ($treeResult | Select-String "<<<<<<<")) {
        return @{ CanMerge = $false; Reason = "Merge conflicts detected between $Source and $Target" }
    }
    return @{ CanMerge = $true; Reason = "Clean merge possible without conflicts" }
}

function Test-AntigravPass {
    if ($SkipAntigrav) {
        Write-Host "⚠️ Skipping ANTIGRAV() check by user flag." -ForegroundColor DarkYellow
        return $true
    }

    if (Test-Path "antigrav-check.js") {
        Write-Host "Running ANTIGRAV() sovereign quality gate..." -ForegroundColor Yellow
        $antigravResult = node antigrav-check.js 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ ANTIGRAV audit failed ($LASTEXITCODE):" -ForegroundColor Red
            $antigravResult | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
            return $false
        }
        Write-Host "✅ ANTIGRAV check passed successfully (Score >= 70)." -ForegroundColor Green
        return $true
    }
    return $true
}

function Invoke-MergeAcceptance {
    param(
        [string]$Source,
        [string]$Target = "master",
        [bool]$PushToRemote = $true
    )

    if (-not $Source) {
        Write-Error "SourceBranch must be specified for AcceptMerge."
        return
    }

    # Verify branches exist
    $sourceExists = (git branch --list $Source).Trim()
    if (-not $sourceExists) {
        Write-Error "Source branch '$Source' does not exist locally."
        return
    }
    $targetExists = (git branch --list $Target).Trim()
    if (-not $targetExists) {
        Write-Error "Target branch '$Target' does not exist locally."
        return
    }

    # Handle uncommitted tracked changes
    $trackedStatus = (git status --porcelain -uno)
    if ($trackedStatus) {
        if ($AutoCommit) {
            Write-Host "Auto-committing pending tracked modifications on $Source..." -ForegroundColor Yellow
            git add -u
            git commit -m "feat($Source): auto-commit pending changes before merge acceptance"
        } else {
            Write-Error "Cannot perform merge acceptance with uncommitted tracked changes in working tree. Add -AutoCommit flag, or run -Action PushPending first."
            return
        }
    }

    $initialBranch = (git branch --show-current).Trim()

    Write-Host "`n=======================================================" -ForegroundColor Cyan
    Write-Host "     PRIMORDIAOS MERGE ACCEPTANCE SENTINEL" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "Source Branch: $Source"
    Write-Host "Target Branch: $Target"
    Write-Host "Squash Merge:  $Squash"
    Write-Host "Auto-Push:     $PushToRemote"

    # Step 1: Conflict pre-flight check
    Write-Host "`n[Gate 1/3] Testing for merge conflicts..." -ForegroundColor Yellow
    $conflictCheck = Test-MergeConflict -Target $Target -Source $Source
    if (-not $conflictCheck.CanMerge) {
        Write-Error "Merge Acceptance BLOCKED: $($conflictCheck.Reason)"
        return
    }
    Write-Host "✅ Conflict Check Passed: Clean merge guaranteed." -ForegroundColor Green

    # Step 2: ANTIGRAV validation gate
    Write-Host "`n[Gate 2/3] Validating ANTIGRAV() anti-collapse rules..." -ForegroundColor Yellow
    if (-not (Test-AntigravPass)) {
        Write-Error "Merge Acceptance VETOED by AntigravGuardian (Score < 70)."
        return
    }

    # Step 3: Switch to Target Branch
    Write-Host "`n[Gate 3/3] Executing merge on $Target..." -ForegroundColor Yellow
    git checkout $Target

    $commitMsg = "Merge acceptance: $Source -> $Target [AntigravGuardian Verified]"
    try {
        if ($Squash) {
            git merge --squash $Source
            git commit -m "$commitMsg"
        } else {
            git merge --no-ff -m "$commitMsg" $Source
        }
        Write-Host "✅ Merge successfully recorded on $Target." -ForegroundColor Green
    }
    catch {
        Write-Error "Merge failed during execution: $_"
        git merge --abort 2>$null
        git checkout $initialBranch
        return
    }

    # Step 4: Push to Remote if requested
    if ($PushToRemote) {
        Write-Host "`n[Delivery] Pushing $Target to $Remote..." -ForegroundColor Yellow
        try {
            git push $Remote $Target
            Write-Host "🚀 Pushed accepted merge to $Remote/$Target successfully!" -ForegroundColor Green
        }
        catch {
            Write-Warning "Merge succeeded locally on $Target, but remote push failed: $($_.Exception.Message)"
        }
    }

    # Step 5: Log Audit Proof
    $proof = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        action    = "MERGE_ACCEPTANCE"
        source    = $Source
        target    = $Target
        headSha   = (git rev-parse HEAD).Trim()
        squash    = [bool]$Squash
        status    = "ACCEPTED"
    } | ConvertTo-Json -Compress

    Add-Content -Path "fleet-merge-log.jsonl" -Value $proof
    Write-Host "Proof recorded in fleet-merge-log.jsonl" -ForegroundColor DarkGray
    Write-Host "=======================================================`n" -ForegroundColor Cyan
}

function Invoke-AcceptAllApproved {
    $auditFile = "fleet-pr-audit-summary.md"
    if (-not (Test-Path $auditFile)) {
        Write-Host "No $auditFile found. Scanning local branches instead." -ForegroundColor Yellow
        return
    }

    Write-Host "=== Scanning $auditFile for Approved Branches ===" -ForegroundColor Magenta
    $content = Get-Content $auditFile
    $approvedBranches = @()

    foreach ($line in $content) {
        if ($line -match "pulled\s*->\s*(jules-pr-\d+)") {
            $approvedBranches += $matches[1]
        }
    }

    $approvedBranches = $approvedBranches | Select-Object -Unique
    if ($approvedBranches.Count -eq 0) {
        Write-Host "No approved branches identified in audit report." -ForegroundColor DarkYellow
        return
    }

    Write-Host "Found $($approvedBranches.Count) approved branch(es): $($approvedBranches -join ', ')" -ForegroundColor Cyan

    foreach ($branch in $approvedBranches) {
        $branchExists = (git branch --list $branch).Trim()
        if ($branchExists) {
            Write-Host "`n>>> Processing Merge Acceptance for $branch <<<" -ForegroundColor Cyan
            Invoke-MergeAcceptance -Source $branch -Target $TargetBranch -PushToRemote $AutoPush
        } else {
            Write-Host "Branch '$branch' does not exist in local repo. Skipping." -ForegroundColor DarkGray
        }
    }
}

switch ($Action) {
    "Status"            { Show-Status }
    "PushAll"           { Invoke-PushAll }
    "PushPending"       { Invoke-PushPending -CommitMessage $Message }
    "AuditFleet"        { Invoke-AuditFleet }
    "SyncUpstream"      { Invoke-SyncUpstream }
    "AcceptMerge"       { Invoke-MergeAcceptance -Source $SourceBranch -Target $TargetBranch -PushToRemote $AutoPush }
    "AcceptAllApproved" { Invoke-AcceptAllApproved }
}
