Write-Host "Starting PrimordiaOS in AUTONOMY MODE (TSX)..."

if (-Not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm is not installed."
    exit 1
}

if (-Not (Test-Path package.json)) {
    npm init -y | Out-Null
}

npm install tsx typescript --save-dev

npx tsx src/autonomy-mode.ts
