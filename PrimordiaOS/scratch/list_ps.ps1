Get-CimInstance Win32_Process | Where-Object { $_.Name -match "powershell|pwsh" } | Select-Object ProcessId, CreationDate, CommandLine | Format-Table -AutoSize
