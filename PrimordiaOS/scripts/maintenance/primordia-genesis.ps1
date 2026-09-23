$root      = "C:\Users\Shane\Documents\dev\PrimordiaOS"
$kernel    = "$root\kernel"
$modules   = "$root\modules"
$workers   = "$root\workers"
$electron  = "$root\electron"
$frontend  = "$root\frontend"
$logs      = "$root\logs"

$dirs = @($root,$kernel,$modules,$workers,$electron,$frontend,$logs)
foreach ($d in $dirs) { if (!(Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }

# root package.json
@'
{
  "name": "primordia-root",
  "version": "1.0.0",
  "scripts": {
    "start": "node kernel/index.js"
  }
}
'@ | Out-File "$root\package.json" -Encoding utf8

# kernel
@'
console.log("PrimordiaOS Kernel Online");
'@ | Out-File "$kernel\index.js" -Encoding utf8

@'
{
  "name": "primordia-kernel",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "build": "echo Kernel build complete",
    "start": "node index.js"
  }
}
'@ | Out-File "$kernel\package.json" -Encoding utf8

# modules
@'
{
  "name": "primordia-modules",
  "version": "1.0.0",
  "scripts": {
    "build": "echo Modules built"
  }
}
'@ | Out-File "$modules\package.json" -Encoding utf8

# workers (Cloudflare)
@'
name = "primordia-worker"
main = "index.js"
compatibility_date = "2024-01-01"
'@ | Out-File "$workers\wrangler.toml" -Encoding utf8

@'
export default {
  async fetch(request) {
    return new Response("PrimordiaOS Worker Online");
  }
};
'@ | Out-File "$workers\index.js" -Encoding utf8

# electron
@'
{
  "name": "primordia-electron",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  }
}
'@ | Out-File "$electron\package.json" -Encoding utf8

@'
const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({ width: 1200, height: 800 });
  win.loadURL("https://primordialorigin.com");
}

app.whenReady().then(createWindow);
'@ | Out-File "$electron\main.js" -Encoding utf8

Write-Host "✅ PrimordiaOS Genesis scaffolding complete."
