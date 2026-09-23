$allProcs = Get-CimInstance Win32_Process
foreach ($p in $allProcs) {
    if ($p.CommandLine -like "*MoneyPlugHub*" -or $p.CommandLine -like "*antigravity*" -or $p.CommandLine -like "*HeartbeatIntervalSec*") {
        Write-Host "PID: $($p.ProcessId) | ParentPID: $($p.ParentProcessId) | Name: $($p.Name) | CommandLine: $($p.CommandLine)"
    }
}
