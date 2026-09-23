<#
.SYNOPSIS
    PrimordiaOS Autonomous 24/7 Swarm Saturation Daemon (Jules Ultra Edition)
.DESCRIPTION
    Continuously monitors Google Jules cloud capacity and feeds new engineering
    tasks from fleet-queue.json (or the AutoHunter engine) to keep all 60 Jules
    concurrent slots saturated 24/7.
#>

param(
    [int]$MaxConcurrent = 60,
    [int]$PollIntervalSeconds = 45,
    [int]$DailyCap = 300,
    [string]$QueueFile = (Join-Path $PSScriptRoot 'fleet-queue.json'),
    [string]$LogFile = (Join-Path $PSScriptRoot 'jules-daemon.log'),
    [switch]$DisableAutoHunter
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$Host.UI.RawUI.WindowTitle = "PrimordiaOS 24/7 Jules Saturation Daemon"

function Write-DaemonLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$timestamp] [$Level] $Message"
    try {
        Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {}
}

function Show-DaemonBanner {
    Clear-Host
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "       PRIMORDIAOS 24/7 AUTONOMOUS JULES ULTRA SATURATION DAEMON       " -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor Cyan
    Write-Host "  Max Concurrent Slots : $MaxConcurrent cloud VMs" -ForegroundColor White
    Write-Host "  Daily Rolling Cap    : $DailyCap tasks / 24h" -ForegroundColor White
    Write-Host "  Poll Interval        : Every ${PollIntervalSeconds}s" -ForegroundColor White
    Write-Host "  Queue File           : $QueueFile" -ForegroundColor Gray
    Write-Host "  Daemon Log           : $LogFile" -ForegroundColor Gray
    Write-Host "------------------------------------------------------------------------" -ForegroundColor DarkCyan
    Write-Host "  Running continuous background swarm management. Press Ctrl+C to stop." -ForegroundColor DarkGray
    Write-Host "========================================================================`n" -ForegroundColor Cyan
}

if (-not (Test-Path $QueueFile)) {
    @() | ConvertTo-Json | Set-Content $QueueFile
}

$dailyDispatchedCount = 0
$lastDay = (Get-Date).Day

$AutoHunterTemplates = @(
    @{
        Repo   = "shanefisher115-ops/Primordial-Origin"
        Prefix = "Write complete unit tests with Vitest for"
    },
    @{
        Repo   = "shanefisher115-ops/moneyplughub"
        Prefix = "Harden TypeScript types and eliminate 'any' types in"
    },
    @{
        Repo   = "shanefisher115-ops/frontend"
        Prefix = "Add accessibility labels, ARIA tags, and keyboard shortcuts to"
    },
    @{
        Repo   = "shanefisher115-ops/primordialorigin-api"
        Prefix = "Add input validation schemas and error boundaries for"
    }
)

function Get-ActiveJulesSessionsCount {
    try {
        $output = & jules remote list --session 2>&1 | Out-String
        if (-not $output) { return 0 }
        
        $lines = $output -split "`n"
        $activeLines = $lines | Where-Object { 
            $_ -match "Running" -or 
            $_ -match "In Progress" -or 
            $_ -match "Planning" -or
            $_ -match "Awaiting User Feed" -or 
            $_ -match "Queued"
        }
        return ($activeLines | Measure-Object).Count
    } catch {
        Write-DaemonLog "Error checking remote sessions: $_" "WARN"
        return 0
    }
}

function Generate-AutoHunterTask {
    $template = $AutoHunterTemplates | Get-Random
    $timestamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
    return [PSCustomObject]@{
        id           = (Get-Random -Minimum 10000 -Maximum 99999)
        cluster      = "AutoHunter"
        repo         = $template.Repo
        task         = "Autonomous Optimization Cycle ($timestamp)"
        prompt       = "$($template.Prefix) this repository, ensuring 100% build pass and clean tests."
        status       = "pending"
        sessionId    = ""
        sessionUrl   = ""
        dispatchedAt = ""
    }
}

Show-DaemonBanner
Write-DaemonLog "Daemon initialized with MaxConcurrent=$MaxConcurrent, DailyCap=$DailyCap"

try {
    while ($true) {
        $currentDay = (Get-Date).Day
        if ($currentDay -ne $lastDay) {
            $dailyDispatchedCount = 0
            $lastDay = $currentDay
            Write-DaemonLog "Daily counter reset to 0."
        }

        # 1. Inspect Capacity
        $activeCount = Get-ActiveJulesSessionsCount
        $openSlots = [Math]::Max(0, ($MaxConcurrent - $activeCount))
        $remainingDaily = [Math]::Max(0, ($DailyCap - $dailyDispatchedCount))
        $slotsToFeed = [Math]::Min($openSlots, $remainingDaily)

        $nowStr = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$nowStr] Active: $activeCount / $MaxConcurrent | Open Slots: $openSlots | Dispatched Today: $dailyDispatchedCount / $DailyCap" -ForegroundColor Gray

        # 2. Feed Slots
        if ($slotsToFeed -gt 0) {
            Write-Host "  >> Capacity available! Preparing to dispatch $slotsToFeed task(s)..." -ForegroundColor Yellow
            
            $queue = @()
            try {
                $rawContent = Get-Content -Path $QueueFile -Raw -ErrorAction SilentlyContinue
                if ($rawContent) { $queue = $rawContent | ConvertFrom-Json }
            } catch {}

            $pendingTasks = @($queue | Where-Object { $_.status -eq 'pending' })

            if ($pendingTasks.Count -lt $slotsToFeed -and (-not $DisableAutoHunter)) {
                $needed = $slotsToFeed - $pendingTasks.Count
                Write-Host "  >> AutoHunter generating $needed autonomous task(s)..." -ForegroundColor Cyan
                for ($i = 0; $i -lt $needed; $i++) {
                    $newTask = Generate-AutoHunterTask
                    $queue += $newTask
                    $pendingTasks += $newTask
                }
            }

            $dispatchedInThisCycle = 0
            foreach ($task in $pendingTasks) {
                if ($dispatchedInThisCycle -ge $slotsToFeed) { break }

                Write-Host "  >> [FEEDING SLOT] ($($task.repo)) -> $($task.task)" -ForegroundColor Green
                Write-DaemonLog "Dispatching task #$($task.id) to $($task.repo): $($task.task)"

                try {
                    $output = & jules new --repo $task.repo $task.prompt 2>&1 | Out-String
                    
                    $sessionId = ""
                    $sessionUrl = ""
                    if ($output -match "ID:\s*([0-9]+)") { $sessionId = $Matches[1] }
                    if ($output -match "URL:\s*(https://[^\s]+)") { $sessionUrl = $Matches[1] }

                    # Safe property assignment for PSCustomObject
                    $task.status = "dispatched"
                    $task | Add-Member -MemberType NoteProperty -Name "sessionId" -Value $sessionId -Force
                    $task | Add-Member -MemberType NoteProperty -Name "sessionUrl" -Value $sessionUrl -Force
                    $task | Add-Member -MemberType NoteProperty -Name "dispatchedAt" -Value ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss")) -Force

                    if ($sessionId) {
                        Write-Host "     SUCCESS: Assigned Session ID: $sessionId" -ForegroundColor DarkGreen
                        Write-DaemonLog "Task #$($task.id) successfully launched with Session ID: $sessionId ($sessionUrl)"
                    } else {
                        Write-Host "     DISPATCHED: Output: $output" -ForegroundColor Yellow
                    }
                    
                    $dailyDispatchedCount++
                    $dispatchedInThisCycle++
                } catch {
                    Write-Host "     Error: $_" -ForegroundColor Red
                    Write-DaemonLog "Failed to dispatch task #$($task.id): $_" "ERROR"
                    $task.status = "failed"
                }

                Start-Sleep -Milliseconds 750
            }

            try {
                $queue | ConvertTo-Json -Depth 5 | Set-Content -Path $QueueFile -Encoding UTF8
            } catch {}
        }

        Start-Sleep -Seconds $PollIntervalSeconds
    }
} finally {
    Write-Host "`nDaemon stopped. Logging shutdown..." -ForegroundColor Yellow
    Write-DaemonLog "Daemon stopped by user."
}
