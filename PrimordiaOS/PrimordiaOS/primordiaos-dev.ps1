Write-Host "=== PrimordiaOS Dev Environment Boot ==="

# Helper function to start a process in a new window
function Start-Realm {
    param(
        [string]$Name,
        [string]$Command,
        [string]$Path
    )

    Write-Host "Starting $Name..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; $Command"
}

# Kernel (Node.js)
Start-Realm -Name "Kernel" -Command "node src/index.js" -Path ".\kernel"

# Message Bus
Start-Realm -Name "Message Bus" -Command "node index.cjs" -Path ".\message-bus"

# Cockpit UI (Next.js)
Start-Realm -Name "Cockpit UI" -Command "npm run dev" -Path ".\cockpit-ui"

# Plugin OS (Electron)
Start-Realm -Name "Plugin OS" -Command "npm start" -Path ".\plugin-os\electron-app"

# Simulation Realm
Start-Realm -Name "Simulation Realm" -Command "node simulation-engine.cjs" -Path ".\simulation"

# MoneyPlugHub Realm
Start-Realm -Name "MoneyPlugHub Realm" -Command "node mph-engine.cjs" -Path ".\moneyplughub"

Write-Host "=== PrimordiaOS Dev Environment Started ==="
