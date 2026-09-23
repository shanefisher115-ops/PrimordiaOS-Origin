$ci = New-Object Microsoft.VisualBasic.Devices.ComputerInfo
$totalMB = [math]::Round($ci.TotalPhysicalMemory / 1MB, 2)
$freeMB = [math]::Round($ci.AvailablePhysicalMemory / 1MB, 2)
Write-Host "Total RAM: $totalMB MB"
Write-Host "Free RAM: $freeMB MB"
