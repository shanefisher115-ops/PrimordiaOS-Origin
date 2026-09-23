Write-Host "=== PrimordiaOS Master Reset Script ===" -ForegroundColor Cyan

# 1. Paths
$root = "C:\Users\Shane\documents\dev\primordiaos"

# 2. Delete duplicate bootstrap.ts files
$bootstrapFiles = Get-ChildItem -Path $root -Recurse -Filter "bootstrap.ts"

foreach ($file in $bootstrapFiles) {
    if ($file.FullName -ne "$root\src\core\bootstrap.ts") {
        Write-Host "Deleting ghost bootstrap: $($file.FullName)" -ForegroundColor Yellow
        Remove-Item $file.FullName -Force
    } else {
        Write-Host "Preserving core bootstrap: $($file.FullName)" -ForegroundColor Green
    }
}

# 3. Ensure env.ts exists
$envPath = "$root\src\config\env.ts"
if (!(Test-Path $envPath)) {
    Write-Host "Creating env.ts..." -ForegroundColor Yellow
@"
export default {
  mode: "development",
  port: 3000,
  debug: true
};
"@ | Out-File $envPath -Encoding utf8
} else {
    Write-Host "env.ts already exists." -ForegroundColor Green
}

# 4. Ensure tsconfig.json includes src/**/*.ts
$tsconfigPath = "$root\tsconfig.json"
$tsconfig = Get-Content $tsconfigPath -Raw

if ($tsconfig -notmatch '"src/\*\*/\*\.ts"') {
    Write-Host "Fixing tsconfig.json include..." -ForegroundColor Yellow
    $fixedTsconfig = $tsconfig -replace '"include": 

\[.*?\]

', '"include": ["src/**/*.ts"]'
    $fixedTsconfig | Out-File $tsconfigPath -Encoding utf8
} else {
    Write-Host "tsconfig.json include already correct." -ForegroundColor Green
}

# 5. Clean dist
$distPath = "$root\dist"
if (Test-Path $distPath) {
    Write-Host "Cleaning dist/..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $distPath
}

# 6. Rebuild
Write-Host "Running TypeScript build..." -ForegroundColor Cyan
tsc

# 7. Boot PrimordiaOS
Write-Host "Booting PrimordiaOS..." -ForegroundColor Cyan
npm start
