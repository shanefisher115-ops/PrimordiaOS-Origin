try {
    Stop-Process -Id 1580 -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped PID 1580"
} catch {
    Write-Host "Could not stop PID 1580"
}
