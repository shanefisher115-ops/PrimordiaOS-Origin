$ErrorActionPreference = "Stop"

Write-Host "Initializing Performance Counters..."
$cpuCounter = New-Object System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total")
$null = $cpuCounter.NextValue()

$procCategory = New-Object System.Diagnostics.PerformanceCounterCategory("Processor")
$instances = $procCategory.GetInstanceNames() | Where-Object { $_ -ne "_Total" }
$coreCounters = @()
foreach ($inst in $instances) {
    $c = New-Object System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", $inst)
    $null = $c.NextValue()
    $coreCounters += $c
}

Start-Sleep -Milliseconds 500

$totalCpu = $cpuCounter.NextValue()
$coreLoads = @()
foreach ($c in $coreCounters) {
    $val = $c.NextValue()
    $coreLoads += [math]::Round($val / 100.0, 4)
}

$avgCpuLoad = if ($coreLoads.Count -gt 0) { ($coreLoads | Measure-Object -Average).Average } else { $totalCpu / 100.0 }
Write-Host "Cores found: $($coreCounters.Count)"
Write-Host "Avg Core Load: $avgCpuLoad"
Write-Host "Core Loads: $($coreLoads -join ', ')"

# Test Memory Status
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
public class MEMORYSTATUSEX {
    public uint dwLength;
    public uint dwMemoryLoad;
    public ulong ullTotalPhys;
    public ulong ullAvailPhys;
    public ulong ullTotalPageFile;
    public ulong ullAvailPageFile;
    public ulong ullTotalVirtual;
    public ulong ullAvailVirtual;
    public ulong ullAvailExtendedVirtual;

    public MEMORYSTATUSEX() {
        this.dwLength = (uint)Marshal.SizeOf(typeof(MEMORYSTATUSEX));
    }
}

public class Win32Mem {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool GlobalMemoryStatusEx([In, Out] MEMORYSTATUSEX lpBuffer);
}
"@

$mem = New-Object MEMORYSTATUSEX
[Win32Mem]::GlobalMemoryStatusEx($mem) | Out-Null
$totalPhysMB = [math]::Round($mem.ullTotalPhys / 1MB, 2)
$availPhysMB = [math]::Round($mem.ullAvailPhys / 1MB, 2)
$usedPhysMB = $totalPhysMB - $availPhysMB
$memUsedRatio = [math]::Round($usedPhysMB / $totalPhysMB, 4)

Write-Host "Total RAM: $totalPhysMB MB"
Write-Host "Free RAM: $availPhysMB MB"
Write-Host "Used RAM Ratio: $memUsedRatio"
