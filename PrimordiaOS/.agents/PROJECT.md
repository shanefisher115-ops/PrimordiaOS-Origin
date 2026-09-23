# Project: PrimordiaOS Multi-Realm Cognition Organism

## Architecture
PrimordiaOS is a sovereign, anti-collapse, multi-realm operating system orchestrating 5 continuous realms:
1. **Local Realm**: Master Spine Node.js kernel on port 3000 (`server.js` / `PrimordiaOS/interfaces/rest-server.js`) serving REST endpoints (`/health`, `/api/status`, `/api/realms`, `/api/trigger-bigbang`, `/api/trigger-pulse`, `/api/antigrav/audit`), live SSE telemetry stream (`/api/stream`), and hosting the Cockpit HUD (`dashboard.html`).
2. **Simulation Realm**: WebSocket bridge on port 17800 (`primordia_event_server.mjs` / `PrimordiaOS/simulation/websocket-server.js`) providing bidirectional RPC triggers (`UNREAL_PLAY_STARTED`, `BIG_BANG_TRIGGER`, `SIMULATION_TICK`, Niagara particle emitter streaming).
3. **Economic Realm**: MoneyPlugHub API on port 3001 (`MoneyPlugHub/src/backend/server.ts`) with SQLite WAL database, syndicate yield routing (`/api/syndicates`), and autonomous monetization.
4. **Cloud Realm**: Cloudflare AI Gateway with multi-tier fallback resilience (`CloudflareGatewayAdapter` -> Workers AI -> local mock fallback) and Cloudflare Tunnel routing.
5. **Identity Realm**: Cryptographic Osmium ledger (`PrimordiaOS/realms/identity/osmium-ledger.js`) implementing SHA-256 hash-chained block immutability, sovereign signatures, and `verifyChain()`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Master Spine Kernel & REST/SSE Endpoints | Port 3000 `/health`, `/api/status`, `/api/stream` (SSE), `/api/realms`, `/api/trigger-*` serving `dashboard.html` | M1 | Survey 1, 3 |
| 2 | Simulation Realm Port 17800 WebSocket Bridge | Port 17800 WebSocket server handling `BIG_BANG_TRIGGER`, `SIMULATION_TICK`, and Niagara particle triggers | M1 | Survey 1, 2 |
| 3 | Economic Realm Port 3001 API Synchronization | Port 3001 MoneyPlugHub server health, sync, and controllers | M1 | Survey 1 |
| 4 | Termux Mobile Vessel Adapter & Remote CLI | `POST /api/telemetry/mobile` ingestion, `POST /api/cli/execute` remote CLI execution, and mobile heartbeat redirection to Port 3000 | M2 | Survey 2 |
| 5 | Cloudflare AI Gateway & Edge Fallback Resilience | Multi-tier AI Gateway routing (AI Gateway -> Workers AI -> local mock fallback with circuit breaker) and tunnel config update | M2 | Survey 2 |
| 6 | Unreal Engine 5 Bidirectional RPC Bridge | Handling `UNREAL_MESSAGE_RECEIVED` (auto-trigger `BIG_BANG_TRIGGER` upon `UNREAL_PLAY_STARTED`), normalized Niagara metric schema | M2 | Survey 2 |
| 7 | 12-Second Autonomous Pulse Loop & Idempotency Guard | Complete 7-step autonomous cycle with mutex lock preventing concurrent pulse collisions | M3 | Survey 1, 3 |
| 8 | Osmium Cryptographic SHA-256 Hash-Chain Ledger | Block hash-chaining (`previousHash` -> `hash`), state hashing, `verifyChain()`, and persistent storage | M3 | Survey 1, 3 |
| 9 | Metadata Registries Validation & Serving | Runtime verification and API serving of `registry.json` (7,504 modules), `realm-map.json`, `dependency-graph.json` | M3 | Survey 3 |
| 10 | Syndicate Yield Routing Integration | Step 7 autonomous yield distribution across seeded syndicates (VRTX, APEX, PLSE, QNTM) with +15% XP multiplier | M3 | Survey 3 |
| 11 | Cockpit HUD Real-Time Multi-Realm Dashboard | Real-time 5-realm status cards, event stream, and live ANTIGRAV() gauge rendering without dropouts | M4 | Survey 3 |
| 12 | AntigravGuardian / ANTIGRAV() Sovereignty CLI & Auditing | Executable `antigrav-check.js` test runner enforcing anti-collapse constraints and score >= 70 threshold | M4 | Survey 3 |
| 13 | 100% E2E Multi-Realm Test Suite Pass & Adversarial Hardening | Comprehensive 5-Tier test verification and adversarial chaos testing | M5 (Final) | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven test harness, test runner, and test cases (Tiers 1-4) -> publishes `TEST_READY.md` | none | DONE |
| M1 | Multi-Realm Kernel & Network Port Boot | Boot Master Spine on Port 3000, WS Bridge on Port 17800, Economic API on Port 3001 | none | DONE |
| M2 | Substrate Hardening & Cross-Realm Vessel Integration | Termux remote CLI/telemetry, Cloudflare fallback resilience, UE5 RPC auto-trigger | M1 | DONE |
| M3 | Autonomous Syndicates, Osmium Ledger & Monetization Loop | 12s 7-step pulse cycle, mutex guard, Osmium SHA-256 hash chains, syndicate yield | M1 | DONE |
| M4 | Cockpit HUD Real-Time Sync & Antigravity Sovereignty | Live 5-realm HUD updates, ANTIGRAV() sovereignty CLI runner and >= 70 score audits | M1, M2, M3 | DONE |
| M5 | Final Milestone: 100% E2E Pass & Adversarial Hardening | Pass 100% E2E tests (Tiers 1-4) + Tier 5 adversarial coverage hardening | E2E, M1-M4 | DONE |

## Interface Contracts
### Master Spine (Port 3000) ↔ Clients & HUD
- `GET /health` -> `{ status: "healthy", timestamp: number, spine_booted: boolean }`
- `GET /api/status` -> `{ status: string, realms: object, uptime: number, pulse_count: number }`
- `GET /api/stream` -> Server-Sent Events (SSE) stream (`message`, `heartbeat`, `CYCLE_COMPLETED`, `UNREAL_EVENT`, `TELEMETRY_UPDATE`)
- `GET /api/realms` -> 5 continuous realm definitions and status
- `POST /api/trigger-bigbang` -> Triggers Big Bang genesis simulation
- `POST /api/trigger-pulse` -> Manually triggers 12s autonomous pulse cycle
- `POST /api/telemetry/mobile` -> Receives Termux mobile node sensor telemetry
- `POST /api/cli/execute` -> Executes remote sovereign CLI command and returns result

### Master Spine ↔ Simulation WebSocket Bridge (Port 17800)
- Inbound: `{ type: "UNREAL_PLAY_STARTED", engine: string, status: string }` -> Emits `BIG_BANG_TRIGGER`
- Outbound: `{ type: "BIG_BANG_TRIGGER", timestamp: string, payload: { genesis: true, singularity_intensity: 2.5, niagara_system: string, cosmic_color: string, swarm_count: number } }`
- Outbound: `{ type: "SIMULATION_TICK", timestamp: string, data: { metrics: object } }`

### Autonomous Loop ↔ Osmium Ledger & Syndicates
- Step 3: `osmiumLedger.appendBlock({ type: "SCHEMA_DIFF", diff: object, author: "SovereignLoop" })` -> `{ blockNumber: number, previousHash: string, hash: string, timestamp: number }`
- Step 7: `routeSyndicateYield({ cycleId: string, timestamp: number, yieldScore: number })` -> `{ success: true, syndicates: ["VRTX", "APEX", "PLSE", "QNTM"], xpBonusMultiplier: 1.15 }`

## Code Layout
- `server.js` — Master Spine root entrypoint multiplexing HTTP 3000, WS 17800, and 12s autonomous loop
- `PrimordiaOS/kernel/bootstrap.js` — Master Spine unified kernel bootstrap
- `PrimordiaOS/interfaces/rest-server.js` — REST and SSE server implementation
- `PrimordiaOS/interfaces/dashboard.html` — Cockpit HUD user interface
- `PrimordiaOS/interfaces/cli.js` — Sovereign CLI tool
- `PrimordiaOS/simulation/websocket-server.js` — Port 17800 WebSocket server
- `primordia_event_server.mjs` — Standalone event bridge
- `PrimordiaOS/realms/identity/osmium-ledger.js` — Cryptographic SHA-256 Osmium ledger
- `PrimordiaOS/antigravity/loop/steps/` — Steps 1 through 7 for 12s autonomous cycle
- `PrimordiaOS/vessels/termux-vessel.js` — Termux mobile node vessel adapter
- `PrimordiaOS/realms/cloud/cloudflare-gateway.js` — Cloudflare AI Gateway adapter with fallback resilience
- `MoneyPlugHub/src/backend/server.ts` — Economic Realm API server (Port 3001)
- `tests/` — Opaque-box E2E test suite and test runner
- `.agents/` — Coordination and orchestration metadata
