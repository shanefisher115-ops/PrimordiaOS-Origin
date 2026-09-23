Get-CimInstance Win32_Process | ForEach-Object {
    if ($_.CommandLine -and ($_.CommandLine -match "MoneyPlugHub" -or $_.CommandLine -match "8495" -or $_.CommandLine -match "antigravity")) {
        Write-Host "PID: $($_.ProcessId) | Name: $($_.Name) | Cmd: $($_.CommandLine)"
    }
}
