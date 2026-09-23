# ============================================================
# PRIMORDIAOS UNIFIED VAULT PATH PATCH
# Forces all constructors to use the correct vault:
# C:\Users\Shane\PrimordiaOS
# ============================================================

$vault = "C:\Users\Shane\PrimordiaOS"

Write-Host "Setting PrimordiaOS vault path to: $vault"

# Patch all constructor scripts in the PrimordiaOS root
$root = "C:\Users\Shane\PrimordiaOS"
$constructors = Get-ChildItem -Path $root -Filter "*.ps1" -Recurse

foreach ($file in $constructors) {
    $content = Get-Content $file.FullName -Raw

    # Replace any old vault paths
    $content = $content -replace '(\$vault\s*=\s*".*?")', "`$vault = `"$vault`""

    # Replace any hardcoded Obsidian folder paths
    $content = $content -replace 'C:\\Users\\Shane\\PrimordiaOS\\Obsidian', $vault
    $content = $content -replace 'C:\\Users\\Shane\\Obsidian vault', $vault
    $content = $content -replace 'C:\\Users\\Shane\\PrimordiaOS\\obsidian vault', $vault

    Set-Content -Path $file.FullName -Value $content -Force
    Write-Host "Patched: $($file.Name)"
}

Write-Host "Unified Vault Path Patch complete."
Write-Host "All PrimordiaOS scripts now save into: $vault"
