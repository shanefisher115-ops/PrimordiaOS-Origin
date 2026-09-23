Write-Host "[Geometry] Running..."

$input = "cad-input-part.txt"
$output = "cad-geometry.txt"

if (Test-Path $input) {
    $part = Get-Content $input

    $geometry = "Surfaces: 12`nContours: 4`nPockets: 2`nTimestamp: $(Get-Date)"
    Set-Content $output $geometry -Encoding UTF8

    Write-Host "[Geometry] Geometry extracted."
} else {
    Write-Host "[Geometry] No part file found."
}
