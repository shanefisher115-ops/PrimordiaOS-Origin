# PrimordiaOS BOOTREALM Master Script (TypeScript scaffold)
# Run in elevated PowerShell (Run as Administrator)

$ErrorActionPreference = "Stop"

$bootDir    = "C:\Boot"
$vhdPath    = "${bootDir}\primordia.vhd"
$vhdSizeGB  = 4
$efiSizeMB  = 100
$efiLetter  = "S"
$osLetter   = "P"
$entryName  = "Primordia BOOTREALM"
$srcRoot    = "C:\Users\Shane\documents\dev\primordiaos\primordia"

if (!(Test-Path $bootDir)) {
    New-Item -ItemType Directory -Path $bootDir | Out-Null
}

if (Test-Path $vhdPath) {
    diskpart /s ([string]::Join("`r`n", @(
        "select vdisk file=""$vhdPath""",
        "detach vdisk",
        "delete vdisk override"
    )))
    Remove-Item -Force $vhdPath
}

Write-Host "Creating VHD at $vhdPath..." -ForegroundColor Cyan

$dpCreate = @"
create vdisk file="$vhdPath" maximum=$($vhdSizeGB*1024) type=fixed
select vdisk file="$vhdPath"
attach vdisk
convert gpt
create partition efi size=$efiSizeMB
format quick fs=fat32 label="PRIMORDIA_EFI"
assign letter=$efiLetter
create partition primary
format quick fs=ntfs label="PRIMORDIA_OS"
assign letter=$osLetter
"@

$scriptFile = "$env:TEMP\primordia_diskpart.txt"
$dpCreate | Set-Content -Path $scriptFile -Encoding ASCII
diskpart /s "$scriptFile"
Remove-Item $scriptFile -Force

Write-Host "VHD initialized. EFI=${efiLetter}: OS=${osLetter}:" -ForegroundColor Green

Write-Host "Creating PrimordiaOS layout on ${osLetter}:..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "${osLetter}:\primordia" -Force | Out-Null
New-Item -ItemType Directory -Path "${osLetter}:\primordia\realms" -Force | Out-Null
New-Item -ItemType Directory -Path "${osLetter}:\primordia\drivers" -Force | Out-Null

Write-Host "Copying TypeScript PrimordiaOS tree into VHD..." -ForegroundColor Cyan
robocopy $srcRoot "${osLetter}:\primordia\src" /MIR /XF bootrealm.ps1

"// TS runtime goes here" | Set-Content "${osLetter}:\primordia\README.txt"

Write-Host "Creating EFI stub layout on ${efiLetter}:..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "${efiLetter}:\EFI\BOOT" -Force | Out-Null
New-Item -ItemType Directory -Path "${efiLetter}:\EFI\PRIMORDIA" -Force | Out-Null

"// TODO: real BOOTX64.EFI" | Set-Content "${efiLetter}:\EFI\BOOT\BOOTX64.EFI"
"// TODO: real LOADER.EFI"  | Set-Content "${efiLetter}:\EFI\PRIMORDIA\LOADER.EFI"

Write-Host "Creating BCDEdit entry..." -ForegroundColor Cyan
$bcdCopy = bcdedit /copy {current} /d "$entryName"
$guid = ($bcdCopy | Select-String -Pattern '{.*}' | ForEach-Object { $_.Matches[0].Value })

$bdir  = (Get-Item $vhdPath).Directory.Name
$bname = (Get-Item $vhdPath).Name

bcdedit /set $guid device vhd=[$bdir]:\$bname
bcdedit /set $guid osdevice vhd=[$bdir]:\$bname
bcdedit /set $guid detecthal on
bcdedit /set $guid hypervisorlaunchtype off
bcdedit /set $guid nointegritychecks on
bcdedit /set $guid bootmenupolicy legacy

Write-Host "Boot entry created: $guid" -ForegroundColor Green
Write-Host "PrimordiaOS BOOTREALM scaffold ready." -ForegroundColor Green
