# ============================================================
# PRIMORDIAOS ANTIGRAVITY REALM CONSTRUCTOR
# Creates AntigravityRealm module and integrates it into SystemMap.
# ============================================================

$root   = "C:\Users\Shane\PrimordiaOS"
$vault  = "$root\Obsidian"
$realmDir = "$vault\03 - Realms"
$sysMap = "$vault\08 - System Map\SystemMap.md"

if (!(Test-Path $realmDir)) {
    New-Item -ItemType Directory -Path $realmDir | Out-Null
}

$agPath = Join-Path $realmDir "AntigravityRealm.md"

if (!(Test-Path $agPath)) {
    $content = @"
---
tags: [realm, cloud, ai, antiggravity]
---
# Antigravity Realm

## Description
The **Antigravity Realm** is the AI‑native development and execution layer of PrimordiaOS.

It acts as:
- AI Development Realm
- Multimodal Realm
- Swarm Node
- Workflow Surface
- System Generator

## Connected Modules
- [[CloudRealm]]
- [[SwarmCoordinator]]
- [[SwarmRouter]]
- [[SwarmNode]]
- [[ExpansionEngine]]
- [[ReasoningEngine]]
- [[MappingEngine]]

## Related
- [[SystemMap]]
- [[PrimordiaOS-Whitepaper]]
"@

    Set-Content -Path $agPath -Value $content -Force
    Write-Host "Created AntigravityRealm at $agPath"
}
else {
    Write-Host "AntigravityRealm already exists: $agPath"
}

if (Test-Path $sysMap) {
    $map = Get-Content $sysMap -Raw
    $line = "- [[AntigravityRealm|Antigravity Realm]]"
    if ($map -notmatch [regex]::Escape($line)) {
        $map += "`n$line"
        Set-Content -Path $sysMap -Value $map -Force
        Write-Host "SystemMap updated with AntigravityRealm."
    }
    else {
        Write-Host "SystemMap already references AntigravityRealm."
    }
}
else {
    Write-Host "SystemMap not found at $sysMap"
}

Write-Host "PrimordiaOS Antigravity Realm Constructor complete."
