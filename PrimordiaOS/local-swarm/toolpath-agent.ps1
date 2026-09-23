Write-Host "[Toolpath] Running..."

$input = "cad-geometry.txt"
$output = "cad-toolpath.txt"

if (Test-Path $input) {
    $geom = Get-Content $input

    $toolpath = "Roughing: 6`nFinishing: 4`nTimestamp: $(Get-Date)"
    Set-Content $output $toolpath -Encoding UTF8

    Write-Host "[Toolpath] Toolpath generated."
} else {
    Write-Host "[Toolpath] No geometry file found."
}
