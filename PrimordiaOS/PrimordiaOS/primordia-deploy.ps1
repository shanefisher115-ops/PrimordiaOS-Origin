Write-Host "?? PrimordiaOS Auto-Detect Deployment Starting..."

$modules = @("cockpit","plugin-os","moneyplughub","simulation-bridge")

foreach ($module in $modules) {
    $path = Join-Path -Path (Get-Location) -ChildPath $module

    if (Test-Path $path) {
        Write-Host "?? Found module: $module at $path"
        Set-Location $path

        Write-Host "?? Generating bypass token without curl..."
        node -e "import('node-fetch').then(async ({default: fetch}) => { const res = await fetch('https://api.vercel.com/v2/deployments/protection/bypass', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.VERCEL_TOKEN } }); const json = await res.json(); console.log('Bypass token:', json.token); });"

        Write-Host "?? Deploying $module..."
        vercel --prod --yes
    }
    else {
        Write-Host "?? Module not found: $module — skipping."
    }
}

Write-Host "?? PrimordiaOS Deployment Complete!"
