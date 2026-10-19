Write-Host "[Geometry] Running..."

# Builds the part named in cad-input-part.txt with the Primordia-cad kernel (node gothic.mjs) and writes
# what the mesh really is to cad-geometry.txt. The input is one line, as for gothic.mjs:
#   spire --height 40 --sides 8
# Lines starting with # are comments. The mesh is kept as cad-part.glb (Y up, metres).
# Needs Node >= 22.18 and `npm install` once in Primordia-cad.

$inputFile = Join-Path $PSScriptRoot "cad-input-part.txt"
$outputFile = Join-Path $PSScriptRoot "cad-geometry.txt"
$meshFile = Join-Path $PSScriptRoot "cad-part.glb"
$gothic = Join-Path $PSScriptRoot "..\Primordia-cad\gothic.mjs"
$inv = [System.Globalization.CultureInfo]::InvariantCulture

if (-not (Test-Path $inputFile)) {
    Write-Host "[Geometry] No part file found."
    exit 0
}

$spec = Get-Content $inputFile | ForEach-Object { $_.Trim([char]0xFEFF).Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") } | Select-Object -First 1
if (-not $spec) {
    Write-Host "[Geometry] $inputFile names no part (expected e.g. 'spire --height 40')."
    exit 1
}

# The swarm runs this every few seconds: rebuild only when the part changed.
if ((Test-Path $meshFile) -and (Test-Path $outputFile) -and
    (Get-Item $meshFile).LastWriteTime -ge (Get-Item $inputFile).LastWriteTime -and
    (Get-Content $outputFile -TotalCount 1) -eq "Part: $spec") {
    Write-Host "[Geometry] Geometry up to date."
    exit 0
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[Geometry] Node.js not found; install Node 22.18 or newer."
    exit 1
}

$tokens = @($spec -split "\s+" | Where-Object { $_ })
$kind = $tokens[0]
$params = @($tokens | Select-Object -Skip 1)
$log = @(& node $gothic $kind @params --out $meshFile 2>&1 | ForEach-Object { "$_" })
$exitCode = $LASTEXITCODE
if ($exitCode -eq 1 -or -not (Test-Path $meshFile)) {
    $log | ForEach-Object { Write-Host "[Geometry] $_" }
    Write-Host "[Geometry] Kernel failed for '$spec'."
    exit 1
}

# The .glb's JSON chunk holds the counts, bounds and resolved parameters.
$bytes = [System.IO.File]::ReadAllBytes($meshFile)
$jsonLength = [System.BitConverter]::ToUInt32($bytes, 12)
$gltf = [System.Text.Encoding]::UTF8.GetString($bytes, 20, $jsonLength) | ConvertFrom-Json
$node = $gltf.nodes[0]
$position = $gltf.accessors[$gltf.meshes[0].primitives[0].attributes.POSITION]
$triangles = 0
$materials = @()
foreach ($primitive in $gltf.meshes[0].primitives) {
    $triangles += $gltf.accessors[$primitive.indices].count / 3
    $materials += $gltf.materials[$primitive.material].name
}

# Files are Y up; PrimordiaOS works Z up: kernel (x, y, z) = file (x, -z, y).
$min = @($position.min[0], (0 - $position.max[2]), $position.min[1])
$max = @($position.max[0], (0 - $position.min[2]), $position.max[1])
function Format-Metres($values) { ($values | ForEach-Object { ([double]$_).ToString("0.###", $inv) }) -join ", " }
$size = (0..2 | ForEach-Object { ($max[$_] - $min[$_]).ToString("0.###", $inv) }) -join " x "

$summary = $log | Where-Object { $_ -match " tris, " } | Select-Object -First 1
$closed = if ($summary -match ", closed,") { "true" } else { "false" }
$genus = if ($summary -match "genus (-?\d+)") { $Matches[1] } else { "unknown" }
$resolved = ($node.extras.params.PSObject.Properties | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ", "

$lines = @(
    "Part: $spec",
    "Generator: $($node.extras.generator) ($($node.name))",
    "Params: $resolved",
    "Mesh: cad-part.glb",
    "Triangles: $triangles",
    "Vertices: $($position.count)",
    "Closed: $closed",
    "Genus: $genus",
    "Materials: $($materials -join ', ')",
    "BoundsMin: $(Format-Metres $min)",
    "BoundsMax: $(Format-Metres $max)",
    "Size: $size m"
)
$lines += $log | Where-Object { $_ -match "^\s*warning: " } | ForEach-Object { "Warning: $($_.Trim().Substring(9))" }
$lines += "Timestamp: $(Get-Date)"
Set-Content $outputFile $lines -Encoding UTF8

Write-Host "[Geometry] Geometry extracted: $($node.extras.generator), $triangles triangles, $size m."
if ($exitCode -ne 0) { Write-Host "[Geometry] Warning: the kernel reports the mesh is not closed." }
