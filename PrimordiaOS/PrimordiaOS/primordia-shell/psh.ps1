# Load kernel + modules
. "$PSScriptRoot\..\primordia-kernel\kernel.ps1"
. "$PSScriptRoot\..\primordia-kernel\core.ps1"

# MAIN PSH LOOP
while ($true) {
    $input = Read-Host "PSH>"
    $result = & "$PSScriptRoot\psh_router.ps1" $input
    if ($result) { Write-Output $result }
}
