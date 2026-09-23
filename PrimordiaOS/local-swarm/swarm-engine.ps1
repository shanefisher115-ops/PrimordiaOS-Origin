Write-Host "Starting LOCAL PrimordiaOS swarm..."
Write-Host "Press CTRL+C to stop."

while ($true) {
    Write-Host "[SWARM] Running local CAD/CAM cycle..."

    # Run your local agent
    node .\local-agent.js

    Start-Sleep -Seconds 2
}
