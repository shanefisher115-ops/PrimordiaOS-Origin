$procs = Get-Process
foreach ($p in $procs) {
    try {
        $pname = $p.ProcessName
        if ($pname -match "powershell|pwsh|cmd|node|python") {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)" -ErrorAction SilentlyContinue).CommandLine
            if ($p.Id -ne $PID -and $p.Id -ne 6044 -and $p.Id -ne 1508 -and $p.Id -ne 7824 -and $p.Id -ne 1580 -and $p.Id -ne 21304) {
                if ($cmd -match "Antigravity|MoneyPlug|Heartbeat" -or ($pname -eq "powershell" -and -not $cmd)) {
                    Write-Host "Killing background process PID $($p.Id) ($pname): $cmd"
                    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}
