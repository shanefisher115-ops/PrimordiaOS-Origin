
Write-Host "=== PrimordiaOS Pipeline Migration: Railway ? Render ===" -ForegroundColor Cyan

$serviceName = "primordiaos-service"
$renderYaml  = "render.yaml"
$repoUrl     = "https://github.com/shane/PrimordiaOS.git"
$envFile     = ".env"

if (-Not (Test-Path $envFile)) {
    New-Item $envFile -ItemType File | Out-Null
}

$yaml = @"
services:
  - type: web
    name: $serviceName
    env: docker
    plan: free
    repo: $repoUrl
    dockerfilePath: ./Dockerfile
    envVars:
      - fromFile: $envFile
"@

Set-Content -Path $renderYaml -Value $yaml

docker build -t primordiaos:latest .
render login
render deploy --service $serviceName --yaml $renderYaml

Write-Host "=== Migration Complete ===" -ForegroundColor Cyan

