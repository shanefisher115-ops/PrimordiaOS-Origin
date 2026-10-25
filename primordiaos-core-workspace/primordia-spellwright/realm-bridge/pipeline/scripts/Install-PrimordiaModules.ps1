<#
.SYNOPSIS
  Copies the PrimordiaCognition plugin source into an Unreal project and enables it.

.DESCRIPTION
  Mirrors the plugin (Source, Resources, descriptor) into <Project>/Plugins/PrimordiaCognition.
  Binaries and Intermediate in the project copy are left alone, so a built plugin stays built
  until the next compile. Adds the plugin to the .uproject's "Plugins" list if it is missing.

  The last line printed is "PRIMORDIA_RESULT {json}".
#>
[CmdletBinding()]
param(
    [string] $Source = (Join-Path $PSScriptRoot '..\..\unreal\PrimordiaCognition'),
    [string] $ProjectPath = 'C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject',
    [string] $PluginName = 'PrimordiaCognition'
)

$ErrorActionPreference = 'Stop'
$started = Get-Date

function Write-Result([bool] $Ok, [string] $Summary, [hashtable] $Extra = @{}) {
    $result = @{ ok = $Ok; mode = 'deploy'; summary = $Summary; seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1) } + $Extra
    Write-Output ("PRIMORDIA_RESULT " + ($result | ConvertTo-Json -Compress -Depth 5))
}

try {
    $src = (Resolve-Path $Source).Path
    if (-not (Test-Path (Join-Path $src "$PluginName.uplugin"))) { throw "$src has no $PluginName.uplugin" }
    $project = (Resolve-Path $ProjectPath).Path
    $dest = Join-Path (Split-Path $project) "Plugins\$PluginName"

    # /MIR keeps the copy exact; /XD also protects the destination's build output from the purge.
    Write-Output "> robocopy $src $dest /MIR /XD Binaries Intermediate"
    robocopy $src $dest /MIR /XD Binaries Intermediate /NP /NJH /NDL /R:2 /W:1 | ForEach-Object { if ("$_".Trim()) { Write-Output "$_" } }
    $rc = $LASTEXITCODE
    if ($rc -ge 8) { throw "robocopy failed with exit code $rc" }
    $changed = $rc -band 3   # 1 = files copied, 2 = extra files removed

    $raw = Get-Content -Raw -Path $project
    $descriptor = $raw | ConvertFrom-Json
    $enabledNow = $false
    if (-not $descriptor.PSObject.Properties['Plugins']) {
        $descriptor | Add-Member -NotePropertyName Plugins -NotePropertyValue @()
    }
    $entry = @($descriptor.Plugins) | Where-Object { $_.Name -eq $PluginName } | Select-Object -First 1
    if (-not $entry) {
        $descriptor.Plugins = @($descriptor.Plugins) + [pscustomobject]@{ Name = $PluginName; Enabled = $true }
        $enabledNow = $true
    } elseif (-not $entry.Enabled) {
        $entry.Enabled = $true
        $enabledNow = $true
    }
    if ($enabledNow) {
        Copy-Item $project "$project.bak" -Force
        ($descriptor | ConvertTo-Json -Depth 20) | Set-Content -Path $project -Encoding utf8
        Write-Output "enabled $PluginName in $project (backup: $project.bak)"
    }

    $summary = if ($changed) { "installed into $dest" } else { "already up to date at $dest" }
    if ($enabledNow) { $summary += "; plugin enabled in the .uproject" }
    Write-Result $true $summary @{ destination = $dest; filesChanged = [bool]$changed; enabled = $enabledNow }
    exit 0
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    Write-Result $false $_.Exception.Message
    exit 1
}
