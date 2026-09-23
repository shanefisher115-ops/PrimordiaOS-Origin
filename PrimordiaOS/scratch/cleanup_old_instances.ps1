$allPowershell = Get-CimInstance Win32_Process | Where-Object { $_.Name -like "*powershell*" -and $_.ProcessId -ne $PID }
Write-Host "Found $($allPowershell.Count) PowerShell processes."

foreach ($proc in $allPowershell) {
    Write-Host "PID: $($proc.ProcessId), Cmd: $($proc.CommandLine)"
    # If it's running the old node or duplicate supervisor/antigravity
    if ($proc.CommandLine -like "*MoneyPlugHub-Antigravity.ps1*" -or $proc.CommandLine -like "*Watchdog-Supervisor.ps1*") {
        # Check start time or PID
        Write-Host "Target process PID: $($proc.ProcessId)"
    }
}
