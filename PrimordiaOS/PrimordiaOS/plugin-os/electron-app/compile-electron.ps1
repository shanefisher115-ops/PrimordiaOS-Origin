# Move into the electron-app directory
Set-Location "C:\Users\Shane\PrimordiaOS\plugin-os\electron-app"

# Ensure TypeScript is installed locally
npm install typescript --save-dev

# Create tsconfig.json if missing
if (!(Test-Path "tsconfig.json")) {
@"
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false
  },
  "include": ["main.ts", "preload.ts"]
}
"@ | Out-File -Encoding utf8 "tsconfig.json"
}

# Run the TypeScript compiler
npx tsc

# Update package.json to point Electron at the compiled JS
$pkg = Get-Content "package.json" | ConvertFrom-Json
$pkg.main = "dist/main.js"
$pkg | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "package.json"

Write-Host "Electron TypeScript compiled successfully."
Write-Host "Run: npm start"
