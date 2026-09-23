# Stop any existing Watchdog or Antigravity instances
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | ForEach-Object {
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue
    if ($cim.CommandLine -like "*Watchdog-Supervisor.ps1*" -or $cim.CommandLine -like "*MoneyPlugHub-Antigravity.ps1*") {
        Write-Host "Stopping PID $($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1
Write-Host "All legacy instances stopped."
