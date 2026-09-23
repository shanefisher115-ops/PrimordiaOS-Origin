Write-Host "=== PrimordiaOS Monorepo Initialization (PowerShell) ==="

# Root-level directories
New-Item -ItemType Directory -Force -Path "kernel/src"
New-Item -ItemType Directory -Force -Path "kernel/workers"
New-Item -ItemType Directory -Force -Path "kernel/modules"
New-Item -ItemType Directory -Force -Path "kernel/config"
New-Item -ItemType Directory -Force -Path "kernel/tests"

New-Item -ItemType Directory -Force -Path "autonomy/modes"
New-Item -ItemType Directory -Force -Path "autonomy/escalations"
New-Item -ItemType Directory -Force -Path "autonomy/deescalations"
New-Item -ItemType Directory -Force -Path "autonomy/signatures"
New-Item -ItemType Directory -Force -Path "autonomy/state"

New-Item -ItemType Directory -Force -Path "constitution/keys"
New-Item -ItemType Directory -Force -Path "constitution/seals"
New-Item -ItemType Directory -Force -Path "constitution/watchers"
New-Item -ItemType Directory -Force -Path "constitution/violations"
New-Item -ItemType Directory -Force -Path "constitution/logs"

New-Item -ItemType Directory -Force -Path "court/cases"
New-Item -ItemType Directory -Force -Path "court/verdicts"
New-Item -ItemType Directory -Force -Path "court/hearings"
New-Item -ItemType Directory -Force -Path "court/enforcement"
New-Item -ItemType Directory -Force -Path "court/logs"

New-Item -ItemType Directory -Force -Path "guardian/quarantine"
New-Item -ItemType Directory -Force -Path "guardian/overrides"
New-Item -ItemType Directory -Force -Path "guardian/safemode"
New-Item -ItemType Directory -Force -Path "guardian/logs"

New-Item -ItemType Directory -Force -Path "council/watchers"
New-Item -ItemType Directory -Force -Path "council/anomalies"
New-Item -ItemType Directory -Force -Path "council/drift"
New-Item -ItemType Directory -Force -Path "council/consensus"
New-Item -ItemType Directory -Force -Path "council/logs"

# Message Bus
New-Item -ItemType Directory -Force -Path "message-bus/event-types"
New-Item -ItemType Directory -Force -Path "message-bus/adapters"

# Cockpit UI
New-Item -ItemType Directory -Force -Path "cockpit-ui/src/panels"
New-Item -ItemType Directory -Force -Path "cockpit-ui/src/hooks"
New-Item -ItemType Directory -Force -Path "cockpit-ui/src/components"
New-Item -ItemType Directory -Force -Path "cockpit-ui/src/styles"
New-Item -ItemType Directory -Force -Path "cockpit-ui/public"

# PluginOS
New-Item -ItemType Directory -Force -Path "plugin-os/electron-app"
New-Item -ItemType Directory -Force -Path "plugin-os/plugins"
New-Item -ItemType Directory -Force -Path "plugin-os/bridge"

# Simulation Realm
New-Item -ItemType Directory -Force -Path "simulation"
New-Item -ItemType File -Force -Path "simulation/simulation-engine.cjs"
New-Item -ItemType File -Force -Path "simulation/simulation-policy.json"
New-Item -ItemType File -Force -Path "simulation/simulation-monitor.cjs"
New-Item -ItemType File -Force -Path "simulation/simulation-anomaly.cjs"
New-Item -ItemType File -Force -Path "simulation/simulation-drift.cjs"
New-Item -ItemType File -Force -Path "simulation/simulation-adapters.cjs"
New-Item -ItemType File -Force -Path "simulation/simulation-log.cjs"
New-Item -ItemType File -Force -Path "simulation/README.md"

# MoneyPlugHub
New-Item -ItemType Directory -Force -Path "moneyplughub"
New-Item -ItemType File -Force -Path "moneyplughub/mph-engine.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/mph-policy.json"
New-Item -ItemType File -Force -Path "moneyplughub/mph-monitor.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/mph-anomaly.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/mph-drift.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/mph-adapters.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/mph-log.cjs"
New-Item -ItemType File -Force -Path "moneyplughub/README.md"

# Mobile Realm
New-Item -ItemType Directory -Force -Path "mobile/telemetry"
New-Item -ItemType Directory -Force -Path "mobile/drift"
New-Item -ItemType Directory -Force -Path "mobile/safemode"
New-Item -ItemType Directory -Force -Path "mobile/sync"

# Visual Realm
New-Item -ItemType Directory -Force -Path "visual-realm/shaders"
New-Item -ItemType Directory -Force -Path "visual-realm/themes"
New-Item -ItemType Directory -Force -Path "visual-realm/palettes"
New-Item -ItemType Directory -Force -Path "visual-realm/effects"

# Tools
New-Item -ItemType Directory -Force -Path "tools"
New-Item -ItemType File -Force -Path "tools/diagnose-workers.ps1"
New-Item -ItemType File -Force -Path "tools/repair-workers.ps1"
New-Item -ItemType File -Force -Path "tools/drift-scan.cjs"
New-Item -ItemType File -Force -Path "tools/safe-mode-trigger.cjs"

# Pipelines
New-Item -ItemType Directory -Force -Path "pipelines/cloudflare"
New-Item -ItemType Directory -Force -Path "pipelines/docker"
New-Item -ItemType Directory -Force -Path "pipelines/github"
New-Item -ItemType Directory -Force -Path "pipelines/render"

# Docs
New-Item -ItemType Directory -Force -Path "docs/whitepaper"
New-Item -ItemType Directory -Force -Path "docs/diagrams"
New-Item -ItemType Directory -Force -Path "docs/specs"

# Obsidian Vault
New-Item -ItemType Directory -Force -Path "vault/00 - Constitution"
New-Item -ItemType Directory -Force -Path "vault/01 - Court"
New-Item -ItemType Directory -Force -Path "vault/02 - Guardian"
New-Item -ItemType Directory -Force -Path "vault/03 - Council"
New-Item -ItemType Directory -Force -Path "vault/04 - System"
New-Item -ItemType Directory -Force -Path "vault/05 - Simulation"

# Workspace + README
New-Item -ItemType File -Force -Path "pnpm-workspace.yaml"
New-Item -ItemType File -Force -Path "README.md"

Write-Host "=== PrimordiaOS Monorepo Structure Created Successfully ==="
