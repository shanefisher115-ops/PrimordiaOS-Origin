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
"@

$total = [Primordia.Telemetry.MemoryNative]::GetTotalPhysicalMB()
$free = [Primordia.Telemetry.MemoryNative]::GetFreePhysicalMB()
Write-Host "Total RAM MB: $total"
Write-Host "Free RAM MB: $free"
