param(
  [string] = "dev"
)

Write-Host "PrimordiaOS Bootstrap starting in mode: "

if (-Not (Test-Path package.json)) {
  Write-Host "Initializing npm..."
  npm init -y | Out-Null
}

Write-Host "Installing dependencies..."
npm install typescript ts-node @types/node --save-dev

Write-Host "Writing tsconfig.json..."
@'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "strict": true,
    "baseUrl": "./src",
    "outDir": "./dist"
  },
  "include": ["src"]
}
'@ | Out-File tsconfig.json -Encoding utf8

Write-Host "Starting PrimordiaOS kernel..."
npx ts-node src/index.ts
