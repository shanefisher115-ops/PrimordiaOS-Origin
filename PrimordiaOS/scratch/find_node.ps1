$procs = Get-Process
foreach ($p in $procs) {
    try {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)" -ErrorAction SilentlyContinue
        if ($cim -and ($cim.CommandLine -like "*NODE_*" -or $cim.CommandLine -like "*antigravity*" -or $cim.CommandLine -like "*8495*")) {
            Write-Host "Found matching PID: $($p.Id) | $($cim.Name) | $($cim.CommandLine)"
        }
    } catch {}
}
