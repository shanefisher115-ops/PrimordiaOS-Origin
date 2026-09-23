Get-Job | ForEach-Object {
    Write-Host "Found Job: $($_.Id) - $($_.Name) - $($_.State)"
    Stop-Job $_ -ErrorAction SilentlyContinue
    Remove-Job $_ -Force -ErrorAction SilentlyContinue
}

# Also inspect all processes holding handles or running powershell/pwsh
$procs = Get-Process powershell, pwsh -ErrorAction SilentlyContinue
foreach ($p in $procs) {
    if ($p.Id -ne $PID -and $p.Id -ne 21304) {
        Write-Host "PowerShell process PID: $($p.Id)"
    }
}
