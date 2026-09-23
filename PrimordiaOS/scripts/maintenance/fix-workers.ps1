# ============================================
# PrimordiaOS Worker Auto-Fix Script
# Creates + overwrites all Worker files
# Injects Durable Object class into each Worker
# ============================================

Write-Host "Fixing PrimordiaOS Workers..."

# Root workers directory
$workersRoot = "cloudflare/workers"

# List of worker names
$workers = @(
    "gateway",
    "auth",
    "automation",
    "webhooks",
    "bridge",
    "logs"
)

# Worker template (safe ASCII-only here-string)
$workerTemplate = @'
export class PrimordiaSessionManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response('session ok');
  }
}

export default {
  async fetch(request, env, ctx) {
    return new Response('ok');
  }
};
'@

# Create folders + write files
foreach ($w in $workers) {
    $path = "$workersRoot/$w"

    # Create folder if missing
    if (!(Test-Path $path)) {
        Write-Host "Creating folder: $path"
        New-Item -ItemType Directory -Path $path | Out-Null
    }

    # Create or overwrite index.ts
    $file = "$path/index.ts"
    Write-Host "Writing file: $file"
    Set-Content -Path $file -Value $workerTemplate
}

Write-Host "All Workers fixed and ready."
Write-Host "Run: npm run dev:<worker> to test each one."
