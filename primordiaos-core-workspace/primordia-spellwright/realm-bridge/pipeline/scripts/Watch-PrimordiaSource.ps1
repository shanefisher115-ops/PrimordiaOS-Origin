<#
.SYNOPSIS
  Watches the plugin source and redeploys + rebuilds on every change.

.DESCRIPTION
  Changes to .h/.cpp/.cs/.json/.spell/.uplugin files under the plugin are collected for
  -DebounceSeconds, then the Autobuilder server (port 7790) is asked to deploy and build.
  With -Direct the scripts run in this console instead of through the server.

  Ctrl+C stops watching.
#>
[CmdletBinding()]
param(
    [string] $Source = (Join-Path $PSScriptRoot '..\..\unreal\PrimordiaCognition'),
    [string] $ProjectPath = 'C:\Users\Shane\Documents\Unreal Projects\PrimordiaRealms\PrimordiaRealms.uproject',
    [string] $AutobuilderUrl = 'http://127.0.0.1:7790',
    [string] $ApiKey = $env:AUTOBUILDER_KEY,
    [ValidateSet('Project', 'Plugin')] [string] $Mode = 'Plugin',
    [double] $DebounceSeconds = 2,
    [switch] $Direct
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $Source).Path
$extensions = @('.h', '.cpp', '.cs', '.json', '.spell', '.uplugin', '.ini')

$watcher = New-Object IO.FileSystemWatcher $root
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]'FileName, LastWrite, DirectoryName'
$sourceId = 'PrimordiaSourceChanged'
foreach ($evt in 'Changed', 'Created', 'Deleted', 'Renamed') {
    Register-ObjectEvent -InputObject $watcher -EventName $evt -SourceIdentifier "$sourceId.$evt" | Out-Null
}
$watcher.EnableRaisingEvents = $true

function Invoke-Autobuilder([string] $Path, [hashtable] $Body) {
    $headers = @{}
    if ($ApiKey) { $headers['X-Autobuilder-Key'] = $ApiKey }
    $json = $Body | ConvertTo-Json -Compress
    return Invoke-RestMethod -Method Post -Uri "$AutobuilderUrl$Path" -Body $json -ContentType 'application/json' -Headers $headers -TimeoutSec 10
}

function Start-Rebuild([string[]] $Files) {
    $reason = "source changed: " + (($Files | Select-Object -First 5 | ForEach-Object { [IO.Path]::GetFileName($_) }) -join ', ')
    if ($Files.Count -gt 5) { $reason += " and $($Files.Count - 5) more" }
    Write-Host "[$(Get-Date -Format HH:mm:ss)] $reason"
    if ($Direct) {
        $shell = (Get-Process -Id $PID).Path
        & $shell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'Update-PrimordiaProject.ps1') -Source $root -ProjectPath $ProjectPath -Mode $Mode
        return
    }
    try {
        $deploy = Invoke-Autobuilder '/deploy' @{ reason = $reason; project = $ProjectPath; source = 'watch' }
        $build = Invoke-Autobuilder '/build' @{ reason = $reason; project = $ProjectPath; mode = $Mode.ToLower(); source = 'watch' }
        Write-Host "  deploy $($deploy.build.id), build $($build.build.id) queued"
    } catch {
        Write-Warning "Autobuilder at $AutobuilderUrl did not accept the request: $($_.Exception.Message)"
    }
}

Write-Host "Watching $root (Ctrl+C to stop); mode $Mode, $(if ($Direct) { 'direct' } else { "via $AutobuilderUrl" })"
$pending = @{}
$lastChange = $null
try {
    while ($true) {
        $e = Wait-Event -Timeout 1
        while ($e) {
            if ($e.SourceIdentifier -like "$sourceId.*") {
                $path = $e.SourceEventArgs.FullPath
                $inBuildOutput = $path -match '\\(Binaries|Intermediate)\\'
                if (-not $inBuildOutput -and $extensions -contains [IO.Path]::GetExtension($path).ToLower()) {
                    $pending[$path] = $true
                    $lastChange = Get-Date
                }
            }
            Remove-Event -EventIdentifier $e.EventIdentifier
            $e = Get-Event | Select-Object -First 1
        }
        if ($pending.Count -gt 0 -and ((Get-Date) - $lastChange).TotalSeconds -ge $DebounceSeconds) {
            $files = @($pending.Keys)
            $pending.Clear()
            Start-Rebuild $files
        }
    }
}
finally {
    $watcher.EnableRaisingEvents = $false
    Get-EventSubscriber | Where-Object { $_.SourceIdentifier -like "$sourceId.*" } | Unregister-Event
    $watcher.Dispose()
}
