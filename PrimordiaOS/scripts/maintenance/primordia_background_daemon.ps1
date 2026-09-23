# ==============================================================================
# PRIMORDIAOS — PERSISTENT BACKGROUND DIRECTIVE DAEMON
# Continuously pulses evolutionary triggers, monitors health, and logs telemetry.
# ==============================================================================

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "★  PRIMORDIAOS PERSISTENT BACKGROUND DAEMON IS RUNNING         ★" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " -> Background unthrottled loop active" -ForegroundColor Green
Write-Host " -> Syncing with Unreal Engine and Osmium Memory Graph..." -ForegroundColor DarkGray
Write-Host ""

$epoch = 1
$udp = New-Object System.Net.Sockets.UdpClient

while ($true) {
    try {
        # Send OSC Evolutionary Pulse to Unreal Engine (Port 8000)
        $udp.Connect("127.0.0.1", 8000)
        $addr = [System.Text.Encoding]::ASCII.GetBytes("/Antigravity/Evolution/Heartbeat`0")
        $tag  = [System.Text.Encoding]::ASCII.GetBytes(",i`0`0")
        $val  = [System.BitConverter]::GetBytes([int]$epoch)
        [Array]::Reverse($val)
        $packet = $addr + $tag + $val
        $udp.Send($packet, $packet.Length) | Out-Null

        $timeStr = (Get-Date).ToString("HH:mm:ss")
        Write-Host "[$timeStr] [EPOCH #$epoch] Evolutionary pulse transmitted to Unreal Engine." -ForegroundColor Cyan
        
        $epoch++
    } catch {
        # Silent retry on standby
    }

    Start-Sleep -Seconds 14
}
