Write-Host "=== KILLING ALL NODE / TS / NPM PROCESSES ==="
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process Code -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process powershell -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 2

cd "C:\Users\Shane\Documents\dev\PrimordiaOS\antigravity-mcp-bundle"

Write-Host "=== FORCE REMOVING LOCKED SDK FOLDER ==="
$lockedSdk = "node_modules\@modelcontextprotocol\sdk"
if (Test-Path $lockedSdk) {
    attrib -r -s -h $lockedSdk -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force $lockedSdk -ErrorAction SilentlyContinue
}

Write-Host "=== WIPING DIST, NODE_MODULES, LOCKFILE ==="
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

Write-Host "=== CLEAN INSTALL ==="
npm install

Write-Host "=== INSTALLING MCP SDK 0.7.0 ==="
npm install @modelcontextprotocol/sdk@0.7.0

Write-Host "=== INSTALLING NODE TYPES ==="
npm install --save-dev @types/node

Write-Host "=== PATCHING IMPORTS TO REAL PATH ==="
$correctImport = 'from "@modelcontextprotocol/sdk/dist/server/index.js";'

Get-ChildItem -Path "src" -Recurse -Include "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName

    $content = $content -replace 'dist/dist/esm/server/index.js', 'dist/server/index.js'
    $content = $content -replace 'dist/esm/server/index.js', 'dist/server/index.js'
    $content = $content -replace 'from "@modelcontextprotocol/sdk.*";', $correctImport
    $content = $content -replace ': Server', ': any'
    $content = $content -replace ': Tool', ': any'

    Set-Content $_.FullName $content
}

Write-Host "=== PATCH COMPLETE ==="

Write-Host "=== REBUILDING PROJECT ==="
npm run build

Write-Host "=== STARTING MCP BUNDLE ==="
npm start
