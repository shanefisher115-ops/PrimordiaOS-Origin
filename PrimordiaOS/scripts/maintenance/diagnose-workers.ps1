# ============================================================
# PrimordiaOS Worker Diagnostic Scanner
# Scans all Workers and prints a full health report
# ============================================================

Write-Host "Running PrimordiaOS Worker Diagnostics..."
Write-Host ""

$workersRoot = "cloudflare/workers"

$workers = @(
    "gateway",
    "auth",
    "automation",
    "webhooks",
    "bridge",
    "logs"
)

function Test-WorkerFile {
    param (
        [string]$filePath
    )

    $content = Get-Content $filePath -Raw

    $result = [ordered]@{
        "File Exists" = $true
        "Exports DO" = $content.Contains("export class PrimordiaSessionManager")
        "Has WebSocket Handler" = $content.Contains("handleWebSocket")
        "Has /ws Route" = $content.Contains("path === \"/ws\"")
        "Has Router" = $content.Contains("async fetch")
        "Has JSON Helper" = $content.Contains("function json")
        "Has Session Routes" = $content.Contains("session/create")
        "Has IPC Routes" = $content.Contains("ipc/kernel")
        "Has Logging Routes" = $content.Contains("logs/write")
    }

    return $result
}

foreach ($w in $workers) {
    $path = "$workersRoot/$w"
    $file = "$path/index.ts"

    Write-Host "------------------------------------------------------------"
    Write-Host "Worker: $w"
    Write-Host "Path: $file"

    if (!(Test-Path $path)) {
        Write-Host "Status: MISSING WORKER FOLDER"
        continue
    }

    if (!(Test-Path $file)) {
        Write-Host "Status: MISSING index.ts"
        continue
    }

    $diagnostics = Test-WorkerFile -filePath $file

    foreach ($key in $diagnostics.Keys) {
        $value = $diagnostics[$key]
        $status = if ($value) { "OK" } else { "MISSING" }
        Write-Host "$key : $status"
    }

    Write-Host ""
}

Write-Host "------------------------------------------------------------"
Write-Host "Diagnostics Complete."
Write-Host "Review missing items above to determine which Workers need repair."
