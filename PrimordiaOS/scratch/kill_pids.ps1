$pidsToKill = @(4260, 6104, 7484, 8220, 14960, 15440, 16768, 18532, 19028, 19056)
foreach ($p in $pidsToKill) {
    try {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        Write-Host "Killed $p"
    } catch {}
}
