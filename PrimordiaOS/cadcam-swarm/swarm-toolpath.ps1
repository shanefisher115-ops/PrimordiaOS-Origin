while ($true) {
    powershell -ExecutionPolicy Bypass -File .\toolpath-agent.ps1
    Start-Sleep -Seconds 2
}
