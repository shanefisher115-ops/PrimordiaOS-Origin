$legacyPids = @(10868, 16768, 14960, 3340)
foreach ($pidToKill in $legacyPids) {
    try {
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped legacy PID $pidToKill"
    } catch {}
}
