# Kill any stuck Node processes
Write-Host "Killing stuck Node processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Set project root
$root = "C:\Users\Shane\primordia-nexus"

# Ensure server.js exists
$serverFile = "$root\server.js"

if (!(Test-Path $serverFile)) {
    Write-Host "Creating server.js..."
@"
const express = require("express");
const app = express();
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "primordiaos/boot/primordial-antigravity-engine.html"));
});

app.use("/primordiaos", express.static(path.join(__dirname, "primordiaos")));

const PORT = 3000;

app.listen(PORT, () => {
  console.log("PrimordiaOS Boot Server running on http://localhost:" + PORT);
});
"@ | Out-File $serverFile -Encoding utf8
}

# Install express if missing
Write-Host "Checking express..."
if (!(Test-Path "$root\node_modules\express")) {
    Write-Host "Installing express..."
    npm install express --prefix $root
}

# Start server
Write-Host "Starting PrimordiaOS Boot Server..."
Start-Process powershell -ArgumentList "node $serverFile"

# Open browser automatically
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
