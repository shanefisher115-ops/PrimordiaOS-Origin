<#
Registers the realm-asset engineer's two Windows scheduled tasks for the current user (no admin rights).

  pwsh unreal/register_tasks.ps1            register or update both tasks, pointing at this checkout
  pwsh unreal/register_tasks.ps1 -WhatIf    show what would be registered
  pwsh unreal/register_tasks.ps1 -Remove    remove both tasks

  "PrimordiaOS RealmAssetEngineer"     at logon: the 24/7 engineer loop + LAN gallery. Hidden (conhost --headless),
                                       below-normal priority, restarted if it dies.
  "PrimordiaOS RealmAssetUnrealBatch"  daily at 02:30, only once the PC has been idle 20 min, never started late
                                       after a missed run (so never at boot while Shane works). batch_import.mjs
                                       checks again itself: Unreal closed, 01:00-06:00, idle, disk space.
Output goes to %LOCALAPPDATA%\PrimordiaOS\realm-asset-engineer\logs\ (engineer.out, unreal-batch.out).
#>
param(
    [switch]$Remove,
    [switch]$WhatIf,
    [string]$Root = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),
    [string]$At = "02:30"
)
$ErrorActionPreference = "Stop"
$engineerName = "PrimordiaOS RealmAssetEngineer"
$batchName = "PrimordiaOS RealmAssetUnrealBatch"

if ($Remove) {
    foreach ($n in $engineerName, $batchName) { Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue }
    "removed $engineerName, $batchName"
    return
}

$node = (Get-Command node -ErrorAction Stop).Source
$conhost = Join-Path $env:SystemRoot "System32\conhost.exe"
$logs = Join-Path $env:LOCALAPPDATA "PrimordiaOS\realm-asset-engineer\logs"
$user = "$env:USERDOMAIN\$env:USERNAME"
foreach ($f in "workshop\main.mjs", "unreal\batch_import.mjs") {
    if (-not (Test-Path (Join-Path $Root $f))) { throw "$f not found under $Root; run this from the checkout that has realm-asset-engineer" }
}

function New-HiddenNodeAction([string]$script, [string]$log) {
    # conhost --headless runs the console app without a window; cmd appends its output to a log file.
    $cmd = "`"$node`" `"$(Join-Path $Root $script)`" >> `"$(Join-Path $logs $log)`" 2>&1"
    New-ScheduledTaskAction -Execute $conhost -Argument "--headless cmd.exe /d /c `"$cmd`"" -WorkingDirectory $Root
}

$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

$engineer = @{
    TaskName    = $engineerName
    Description = "PrimordiaOS realm-asset engineer: generates, judges and catalogues realm assets around the clock (Primordia-cad). Gallery on port 8790."
    Action      = New-HiddenNodeAction "workshop\main.mjs" "engineer.out"
    Trigger     = New-ScheduledTaskTrigger -AtLogOn -User $user
    Settings    = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -Priority 7
    Principal   = $principal
}
$batch = @{
    TaskName    = $batchName
    Description = "PrimordiaOS realm-asset engineer: imports approved pieces into the PrimordiaRealms Unreal project overnight (headless commandlet, no editor window)."
    Action      = New-HiddenNodeAction "unreal\batch_import.mjs" "unreal-batch.out"
    Trigger     = New-ScheduledTaskTrigger -Daily -At $At
    Settings    = New-ScheduledTaskSettingsSet -RunOnlyIfIdle -IdleDuration (New-TimeSpan -Minutes 20) -IdleWaitTimeout (New-TimeSpan -Minutes 90) `
        -DontStopOnIdleEnd -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew -Priority 7
    Principal   = $principal
}

foreach ($t in $engineer, $batch) {
    if ($WhatIf) {
        "{0}`n  run:   {1} {2}`n  in:    {3}`n  when:  {4}" -f $t.TaskName, $t.Action.Execute, $t.Action.Arguments, $t.Action.WorkingDirectory, ($t.Trigger | ForEach-Object { $_.CimClass.CimClassName -replace 'MSFT_Task', '' -replace 'Trigger', '' })
        continue
    }
    New-Item -ItemType Directory -Force $logs | Out-Null
    Register-ScheduledTask @t -Force | Out-Null
    "registered $($t.TaskName)"
}
if (-not $WhatIf) { "code: $Root`nlogs: $logs" }
