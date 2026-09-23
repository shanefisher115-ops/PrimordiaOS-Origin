Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace Primordia.Telemetry {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct MemoryStatusEx {
        public uint dwLength;
        public uint dwMemoryLoad;
        public ulong ullTotalPhys;
        public ulong ullAvailPhys;
        public ulong ullTotalPageFile;
        public ulong ullAvailPageFile;
        public ulong ullTotalVirtual;
        public ulong ullAvailVirtual;
        public ulong ullAvailExtendedVirtual;
    }

    public static class MemoryNative {
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern bool GlobalMemoryStatusEx(ref MemoryStatusEx lpBuffer);

        public static double GetTotalPhysicalMB() {
            MemoryStatusEx stat = new MemoryStatusEx();
            stat.dwLength = (uint)Marshal.SizeOf(typeof(MemoryStatusEx));
            if (GlobalMemoryStatusEx(ref stat)) {
                return (double)stat.ullTotalPhys / 1048576.0;
            }
            return 16384.0;
        }

        public static double GetFreePhysicalMB() {
            MemoryStatusEx stat = new MemoryStatusEx();
            stat.dwLength = (uint)Marshal.SizeOf(typeof(MemoryStatusEx));
            if (GlobalMemoryStatusEx(ref stat)) {
                return (double)stat.ullAvailPhys / 1048576.0;
            }
            return 8192.0;
        }
    }
}
"@ -ErrorAction SilentlyContinue

function Sample-HardwareMetrics {
    param(
        [System.Diagnostics.PerformanceCounter]$TotalCpuCounter,
        [System.Collections.Generic.List[System.Diagnostics.PerformanceCounter]]$CoreCounters,
        [System.Collections.Generic.List[double]]$CpuHistory
    )

    $coreLoads = @()
    if ($CoreCounters.Count -gt 0) {
        foreach ($c in $CoreCounters) {
            try {
                $raw = $c.NextValue()
                $coreLoads += [math]::Max(0.0, [math]::Min(1.0, [double]$raw / 100.0))
            } catch {}
        }
    }

    $avgCpu = 0.0
    if ($coreLoads.Count -gt 0) {
        $avgCpu = ($coreLoads | Measure-Object -Average).Average
    } elseif ($TotalCpuCounter) {
        $avgCpu = [math]::Max(0.0, [math]::Min(1.0, [double]$TotalCpuCounter.NextValue() / 100.0))
    }

    $CpuHistory.Add($avgCpu)
    if ($CpuHistory.Count -gt 10) { $CpuHistory.RemoveAt(0) }

    $mean = ($CpuHistory | Measure-Object -Average).Average
    $sumSq = 0.0
    foreach ($val in $CpuHistory) {
        $d = $val - $mean
        $sumSq += ($d * $d)
    }
    $variance = if ($CpuHistory.Count -gt 1) { $sumSq / ($CpuHistory.Count - 1) } else { 0.0 }
    $delta = if ($CpuHistory.Count -gt 1) { [math]::Abs($avgCpu - $CpuHistory[$CpuHistory.Count - 2]) } else { 0.0 }

    $totalPhysMB = [Primordia.Telemetry.MemoryNative]::GetTotalPhysicalMB()
    $availPhysMB = [Primordia.Telemetry.MemoryNative]::GetFreePhysicalMB()
    $usedPhysMB = [math]::Max(0.0, $totalPhysMB - $availPhysMB)
    $memUsedRatio = if ($totalPhysMB -gt 0) { $usedPhysMB / $totalPhysMB } else { 0.5 }

    return @{
        AvgCpuLoad     = $avgCpu
        CoreLoads      = $coreLoads
        CpuVariance    = $variance
        ShortTermDelta = $delta
        TotalPhysMB    = $totalPhysMB
        FreePhysMB     = $availPhysMB
        MemUsedRatio   = $memUsedRatio
    }
}

$totalCounter = [System.Diagnostics.PerformanceCounter]::new("Processor", "% Processor Time", "_Total")
$null = $totalCounter.NextValue()
$history = [System.Collections.Generic.List[double]]::new()
$coreList = [System.Collections.Generic.List[System.Diagnostics.PerformanceCounter]]::new()

Start-Sleep -Milliseconds 500
$sample = Sample-HardwareMetrics -TotalCpuCounter $totalCounter -CoreCounters $coreList -CpuHistory $history
Write-Host "Sample result: $($sample | ConvertTo-Json)"
