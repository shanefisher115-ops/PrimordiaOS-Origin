Get-CimInstance Win32_Process | Where-Object { $_.Name -like "*powershell*" -or $_.CommandLine -like "*MoneyPlugHub*" } | Select-Object ProcessId, Name, CommandLine | Format-List
