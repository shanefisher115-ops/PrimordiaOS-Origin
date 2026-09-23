$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "=== PrimordiaOS Boot Sequence ==="

& "$root\PrimordiaOS-EngineConstructor.ps1"
& "$root\primordiaos-init.ps1"
& "$root\primordiaos-dev.ps1"
& "$root\primordiaos-obsidian-scaffold.ps1"

Write-Host "=== PrimordiaOS ignition complete ==="
