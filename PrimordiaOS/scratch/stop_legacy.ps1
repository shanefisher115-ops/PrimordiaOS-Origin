$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -like "*powershell*" -and $_.ProcessId -ne $PID }
foreach ($p in $procs) {
    # Check if this process or its children is the old node
    try {
        $pObj = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
        if ($pObj -and ($p.ProcessId -eq 7484 -or $p.ProcessId -eq 4260)) {
            Write-Host "Stopping legacy node PID $($p.ProcessId)"
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}
