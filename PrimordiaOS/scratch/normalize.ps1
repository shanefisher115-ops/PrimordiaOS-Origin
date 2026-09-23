$files = Get-ChildItem -Path "C:\Users\Shane\core", "C:\Users\Shane\commands", "C:\Users\Shane\PrimordialOS.psm1" -Filter *.ps* -Recurse
foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    # Check for UTF-8 BOM
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    # Clean leading characters
    $content = $content.TrimStart([char]0xFEFF, [char]65279, '?', ' ')
    
    # Save using UTF8 with BOM
    $utf8WithBom = New-Object System.Text.UTF8Encoding($true)
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8WithBom)
    Write-Host "Normalized: $($file.Name)"
}
Write-Host "All scripts normalized successfully."
