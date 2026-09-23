# Comprehensive Technical Survey: Autonomous Syndicates, Osmium Ledger, Cockpit HUD & Sovereignty Enforcement

**Explorer ID**: teamwork_preview_explorer_survey_3  
**Date**: 2026-09-02  
**Target Codebase**: PrimordiaOS / MoneyPlugHub  
**Sovereignty Governance Tier**: Tier 0 Shane (Human Sovereign) / Tier 2 AntigravGuardian  

---

## Executive Summary

This survey provides a comprehensive investigation of the **Autonomous Syndicates**, **Osmium SHA-256 Hash-Chain Ledger**, **Metadata Registries**, **Cockpit HUD Real-Time Telemetry**, and **AntigravGuardian / ANTIGRAV() Sovereignty Enforcement** subsystems across PrimordiaOS.

While core conceptual architectures, schemas, route definitions, and UI interfaces exist on disk, critical integration seams are either unlinked, simulated with static mocks, or missing key cryptographic/idempotency guarantees. This report catalogues exact file paths, current implementation states, critical gaps, broken linkages, and dependency chains to enable unified implementation and hardening.

---

## 1. MoneyPlugHub Autonomous Loop Pipeline

### 1.1 The 12-Second Autonomous Pulse Cycle
The intended 12-second pulse cycle follows a strict 7-stage pipeline:
`schema inspection -> diff generation -> Osmium ledger commit -> commentary trigger -> voice synthesis -> HUD sync -> syndicate yield routing`.

#### Current Implementation (`server.js` & `PrimordiaOS/antigravity/loop/steps/`)
- **Master Loop Runner**: `server.js` (lines 19-39, 66-71)
  - Listens on `http://localhost:3000`.
  - Executes `runLoopCycle()` immediately on boot, then via `setInterval(runLoopCycle, 12000)` every 12 seconds.
  - Broadcasts completion over Server-Sent Events (`/api/stream`).
- **Step 1 — Schema Inspection**: `PrimordiaOS/antigravity/loop/steps/1-inspect-schema.js`
  - *Current State*: Returns a hardcoded static object `{ status: "clean", tablesCount: 9, rlsEnforced: true }`.
  - *Gap*: Does not inspect active SQLite/Supabase PostgreSQL schema tables or check live database DDL drift.
- **Step 2 — Diff Generation**: `PrimordiaOS/antigravity/loop/steps/2-generate-diff.js`
  - *Current State*: Returns a hardcoded dummy migration string (`CREATE INDEX IF NOT EXISTS idx_transactions_created_at...`) and its SHA-256 hash.
  - *Gap*: Does not invoke the deterministic diff engine (`npx supabase db diff` or SQLite schema comparison).
- **Step 3 — Cryptographic Ledger Commit**: `PrimordiaOS/antigravity/loop/steps/3-write-ledger.js`
  - *Current State*: Appends an entry to `primordiaos/moneyplughub/ledger/schema-history.json` with timestamp, `diff_hash`, and environment flags.
  - *Gap*: Does not chain to previous block hash, calculate state root, or sign the block.
- **Step 4 — Commentary Trigger**: `PrimordiaOS/antigravity/loop/steps/4-trigger-commentary.js`
  - *Current State*: Calls `PrimordiaOS/agents/commentary/generateCommentary.js`, which returns static four-council strings (Auditor, Classifier, Predictor, Advisor).
- **Step 5 — Voice Synthesis**: `PrimordiaOS/antigravity/loop/steps/5-synthesize-voice.js`
  - *Current State*: Calls `PrimordiaOS/voice/narrator/index.js`, which logs commentary lines to `console.log`.
  - *Gap*: Does not invoke Web Audio TTS, ElevenLabs, or local acoustic TTS bridge.
- **Step 6 — HUD Sync**: `PrimordiaOS/antigravity/loop/steps/6-sync-hud.js`
  - *Current State*: Logs spatial update message to console. SSE broadcast in `server.js` emits `{ type: "CYCLE_COMPLETED", timestamp, ledgerEntry, commentary, pulse: "diff" }`.
- **Step 7 — Syndicate Yield Routing**:
  - *Current State*: **Completely absent from `server.js` and `PrimordiaOS/antigravity/loop/steps/`**.

#### Alternate & Duplicate Implementations
1. `MoneyPlugHub/antigravity/loop/run-loop.js`:
   - Imports from `./steps/generate-schema.js`, `./steps/generate-diff.js`, etc.
   - `MoneyPlugHub/antigravity/loop/steps/generate-diff.js` is **0 bytes empty**.
   - `MoneyPlugHub/antigravity/loop/steps/generate-schema.js` references `primordiaos/moneyplughub/schema/moneyplughub_production.sql`.
2. `MoneyPlugHub/primordia-autonomous.ps1`:
   - PowerShell automation daemon containing syntax errors (lines 230-256 have unmatched scriptblocks and duplicate while-loops).

### 1.2 Syndicate Yield Routing Engine
- **Implementation File**: `MoneyPlugHub/src/backend/routes/syndicates.ts` (659 lines).
- **Database Model**: SQLite tables `syndicates` and `syndicate_members` (defined in `initSyndicatesSchema()`).
- **Seeded Syndicates**:
  1. `[VORTEX] Cyber Syndicate` (`VRTX`): 142,500 weekly score, $4.85M net worth.
  2. `[APEX] Sovereign Capital Guild` (`APEX`): 118,200 weekly score, $6.20M net worth.
  3. `[PULSE] TikTok Viral Growth Army` (`PLSE`): 95,400 weekly score, $2.90M net worth.
  4. `[QUANT] Matrix Alchemists` (`QNTM`): 88,900 weekly score, $3.75M net worth.
- **Buff & War Mechanics**:
  - Communal Guild Power: +15% XP & commission velocity multiplier (`1.15x`).
  - Active season: `Season 4: Cyber Dawn Guild Wars`.
- **Missing Integration Seam**:
  - The syndicate scoring and yield distribution engine runs only on HTTP requests to `http://localhost:3001/api/syndicates`.
  - It is **not triggered** during the 12s autonomous loop on port 3000 to credit XP/yield per pulse cycle.

### 1.3 Strict Idempotency Guarantees
- **Current Vulnerability**:
  - `setInterval(runLoopCycle, 12000)` does not check if the previous cycle is still executing (no cycle lock/mutex).
  - Version keys are time-formatted strings (`YYYYMMDDHHmmss_auto_index`) instead of deterministic state-derived hashes.
  - No deduplication nonce or idempotency journal is verified before applying schema migrations or writing ledger blocks.
- **Required Hardening**:
  1. Execution Mutex: `if (isCycleRunning) return;`
  2. Deterministic State Hash: `hash(previousStateHash + currentDiff + cycleIndex)`.
  3. Idempotent Step Execution: Each step records its state in a persistent journal before proceeding.

---

## 2. Osmium SHA-256 Hash-Chain Ledger & State Integrity

### 2.1 File Map & Current Capabilities
| File Path | Description | Current Status | Cryptographic Integrity |
|---|---|---|---|
| `PrimordiaOS/osmium/index.js` | Express service on port 3500 | In-memory event array `ledger = []` with `/record`, `/ledger`, `/summary` | ❌ No hash chaining (uses `Math.random().toString(36)`) |
| `PrimordiaOS/osmium/ledger.js` | Channel ledger file writer | Appends JSON to `osmium/data/${channel}.ledger` | ❌ Unchained JSON lines |
| `MoneyPlugHub/ledger/write-ledger-entry.js` | Schema history ledger | Appends entry to `schema-history.json` with SHA-256 of `diffFile` | ⚠️ Single diff SHA-256, no block chaining |
| `PrimordiaOS/antigravity/loop/steps/3-write-ledger.js` | Loop step 3 commit | Appends entry to `schema-history.json` with `diff_hash` | ⚠️ Single diff SHA-256, no block chaining |

### 2.2 Hash-Chain Ledger Architectural Blueprint
To satisfy Requirement R1 / Acceptance Criteria, Osmium must implement a true tamper-evident hash-chain:

```
[Genesis Block #0] ───► [Block #1] ───► [Block #2] ───► ... ───► [Block #N]
  - index: 0              - index: 1              - index: 2
  - prev_hash: "0"*64     - prev_hash: Block0.hash- prev_hash: Block1.hash
  - timestamp             - timestamp             - timestamp
  - diff_hash             - diff_hash             - diff_hash
  - state_root            - state_root            - state_root
  - sovereign_sig         - sovereign_sig         - sovereign_sig
  - hash: SHA256(...)     - hash: SHA256(...)     - hash: SHA256(...)
```

- **Block Structure**:
  ```typescript
  interface OsmiumBlock {
    index: number;
    timestamp: string;
    previous_hash: string;
    diff_hash: string;
    merkle_root: string;
    realm_states: Record<string, string>;
    sovereign_signature: string; // Tier 0 / Tier 1 key signature
    hash: string;
  }
  ```
- **Verification Routine (`verifyChain()`)**:
  - Validates `block[0].previous_hash === "0000000000000000000000000000000000000000000000000000000000000000"`.
  - For each `i > 0`, checks `block[i].previous_hash === block[i-1].hash`.
  - Re-computes `SHA256(index + timestamp + previous_hash + diff_hash + merkle_root)` and matches `block[i].hash`.

---

## 3. Metadata Registries

### 3.1 Registry Catalogue
1. **`PrimordiaOS/config/registry.json`** (83,807 lines, 2.33 MB):
   - Catalogs 7,504 modules.
   - Assigns each module to a realm (`local_realm`, `cloud_realm`, `simulation_realm`, `economic_realm`, `identity_realm`), a sovereignty tier (`sovereignty_tier`: 0 to 4), and a functional category (`kernel_core`, `agent_domain`, `pipeline_monetization`, `agent_guardian`).
2. **`PrimordiaOS/config/realm-map.json`** (136 lines):
   - Defines the Master Spine configuration:
     - Kernel Port: `3000`
     - Event Bus Port: `17800`
     - API Engine Port: `3001`
     - Heartbeat Interval: `12000 ms`
   - Defines the 5 Continuous Realms, their endpoints, and component files.
   - Defines interconnections and event protocols:
     - `local_realm <-> simulation_realm`: WebSocket port 17800 (`BIG_BANG_TRIGGER`, `UNREAL_PLAY_STARTED`).
     - `local_realm <-> economic_realm`: SSE / HTTP port 3000/3001 (`CYCLE_COMPLETED`, `PULSE_DIFF`).
     - `economic_realm <-> cloud_realm`: HTTPS Cloudflare Tunnel (`https://moneyplughub.com`).
     - `economic_realm <-> identity_realm`: Hash Chain ledger commit.
     - `simulation_realm <-> identity_realm`: Telemetry hash signature.
3. **`PrimordiaOS/config/dependency-graph.json`** (27,885 lines, 962 KB):
   - Contains complete adjacency lists and dependency DAG nodes.

### 3.2 Current Gap & Broken Linkages
- The registry files are currently static JSON documents in `PrimordiaOS/config/`.
- Neither `server.js` (port 3000) nor `MoneyPlugHub` API (port 3001) loads or serves them via API routes (`/api/registry`, `/api/realms`, `/api/dependency-graph`).
- Validation tools to verify that all files referenced in `registry.json` exist on disk are not currently automated.

---

## 4. Cockpit HUD Real-Time 5-Realm Status Sync

### 4.1 Interface Implementations
| File | Role | Protocol | Features |
|---|---|---|---|
| `PrimordiaOS/interfaces/dashboard.html` | Master Cockpit HUD (5 Realms) | SSE (`/api/stream`) | 5-realm status cards, live event terminal, ANTIGRAV() gauge (score 95), "Trigger Big Bang" & "Force Autonomous Pulse" action buttons |
| `dashboard.html` (root) | Simulation Command Center | WebSocket (`ws://localhost:17800`) | Unreal 5.8 Niagara action buttons, Agent Energy (0.88), Automation XP, Evolution Depth |
| `preview.html` (root) | MoneyPlugHub Wealth Matrix | Supabase / Client JS | Living wealth vault ($94,200), Rakuten affiliate links, streak counters, setup wizard |

### 4.2 Critical Port 3000 & Cockpit HUD Disconnects
1. **Root Route Serving Conflict**:
   - `server.js` line 56 serves `preview.html` on `http://localhost:3000/`.
   - The Cockpit HUD `PrimordiaOS/interfaces/dashboard.html` is **not served** on `http://localhost:3000/` or `/dashboard`.
2. **Missing Action Endpoints on Port 3000**:
   - `PrimordiaOS/interfaces/dashboard.html` calls `POST /api/trigger-bigbang` and `POST /api/trigger-pulse`.
   - `server.js` does not handle POST requests or route `/api/trigger-*`, returning 404.
3. **Missing Health & Status Endpoints**:
   - Requirement R1 & Acceptance Criteria require `GET /health` and `GET /api/status` on port 3000 to return HTTP 200 JSON.
   - `server.js` returns 404 for both.
4. **SSE Event Multiplexing**:
   - `server.js` broadcasts `CYCLE_COMPLETED`.
   - It does not proxy or bridge WebSocket events from `ws://localhost:17800` (`BIG_BANG_TRIGGER`, `UNREAL_PLAY_STARTED`, `ACTION_TRIGGERED`) or status from Port 3001, leaving the Simulation and Cloud cards un-synchronized.

---

## 5. AntigravGuardian / `ANTIGRAV()` Sovereignty Test Suite & Scoring

### 5.1 Rules & Anti-Collapse Specifications
- **Governance Hierarchy (`.agents/AGENTS.md`)**:
  - Tier 0: Shane (Human Sovereign) — Absolute authority.
  - Tier 1: Primordial Sovereignty Kernel — Supreme rule engine.
  - Tier 2: Guardian Agents (`AntigravGuardian`, `PolicyGuardian`) — High sovereignty; veto power over Domain/Utility agents; enforces `ANTIGRAV()` threshold >= 70.
  - Tier 3: Domain Agents (`RealmBuilder`, `LexiconScribe`, `LoopEngineer`, `InfraNavigator`).
  - Tier 4: Utility Agents (`TestRunnerAgent`, `DocWeaverAgent`, `UIProbeAgent`).
- **Anti-Collapse Rule Specification (`.agents/antigrav_rules.json`)**:
  - Prohibits: `mock_data_arrays`, `hardcoded_numeric_literals_as_metrics`, `demo_values_in_production`, `simulated_estimates_without_source`.
  - Required real metrics: `rpm`, `epc`, `ctr`, `clicks`, `impressions`, `conversions`, `revenue`.
  - On violation: `FLAG_COMPONENT_NON_COMPLIANT`, `BLOCK_RENDER_OF_FAKE_METRICS`, `LOG_VIOLATION_TO_ANTIGRAV_AUDIT`, `REQUIRE_REFACTOR_BEFORE_DEPLOY`.

### 5.2 Scoring Algorithm Structure (>= 70 Threshold)
An `ANTIGRAV()` audit evaluates candidate code diffs, prompts, and content across three weighted dimensions:
1. **Uniqueness ($W_u = 0.35$)**: Absence of generic template boilerplate, unique algorithmic entropy.
2. **Sovereignty ($W_s = 0.40$)**: Preserving human decision friction, anti-passive collapse, avoidance of autonomous uninspected overrides.
3. **Cognitive Friction ($W_f = 0.25$)**: Intentional resistance requiring conscious human attestation.

$$\text{Score} = (U \times 0.35) + (S \times 0.40) + (F \times 0.25) \times 100$$
- If $\text{Score} \ge 70$: **PASS (Anti-Collapse Verified)**
- If $\text{Score} < 70$: **VETO (Revisions Demanded with Required Actions)**

### 5.3 Missing Executable Test Runner
- **Gap**: There is currently no executable CLI tool or test script (e.g., `primordial antigrav [file]` or `node scripts/antigrav-check.js`) that runs AST/regex audits against diffs and outputs the score breakdown.
- The HUD gauge currently displays a static placeholder score of `95`.

---

## 6. Comprehensive File Inventory & Gap Matrix

| Component / Subsystem | Primary File Path | Current Status | Gaps / Missing Items |
|---|---|---|---|
| **Autonomous Loop Master** | `server.js` | Partial (12s interval running) | Missing Mutex/Idempotency lock, missing `/health`, `/api/status`, `/api/trigger-*` endpoints |
| **Loop Step 1 (Inspect)** | `PrimordiaOS/antigravity/loop/steps/1-inspect-schema.js` | Mock | Needs live SQLite/PostgreSQL DDL table scan |
| **Loop Step 2 (Diff)** | `PrimordiaOS/antigravity/loop/steps/2-generate-diff.js` | Mock | Needs deterministic diff generation |
| **Loop Step 3 (Ledger)** | `PrimordiaOS/antigravity/loop/steps/3-write-ledger.js` | Partial | Needs SHA-256 block hash-chaining and signature |
| **Loop Step 4 (Commentary)** | `PrimordiaOS/antigravity/loop/steps/4-trigger-commentary.js` | Mock | Uses static strings; should evaluate actual diff severity |
| **Loop Step 5 (Voice)** | `PrimordiaOS/antigravity/loop/steps/5-synthesize-voice.js` | Mock | Only logs to stdout; needs acoustic audio synthesis |
| **Loop Step 6 (HUD Sync)** | `PrimordiaOS/antigravity/loop/steps/6-sync-hud.js` | Partial | Emits SSE `CYCLE_COMPLETED`, but lacks full 5-realm status payload |
| **Loop Step 7 (Syndicates)** | *Missing in loop* | Missing | Needs step `7-route-syndicate-yield.js` connecting to `MoneyPlugHub/src/backend/routes/syndicates.ts` |
| **Osmium Core Service** | `PrimordiaOS/osmium/index.js` | Mock | In-memory array on port 3500; needs persistent SHA-256 block chain & `verifyChain()` |
| **Cockpit HUD Interface** | `PrimordiaOS/interfaces/dashboard.html` | Complete UI | Needs to be served at `GET /` or `GET /hud` on Port 3000; needs API endpoints |
| **Simulation Event Server** | `primordia_event_server.mjs` | Functional on port 17800 | Needs cross-realm bridge to Master Spine Port 3000 |
| **Unified Daemon Launcher** | `start_moneyplughub_unified.ps1` | Functional | Monitors Port 3001, Port 3000, and Cloudflare Tunnel |
| **Metadata: Module Registry** | `PrimordiaOS/config/registry.json` | Complete (7,504 modules) | Needs automated validator and API endpoint on Port 3000 |
| **Metadata: Realm Map** | `PrimordiaOS/config/realm-map.json` | Complete (5 realms) | Needs live API endpoint on Port 3000 |
| **Metadata: Dependency Graph**| `PrimordiaOS/config/dependency-graph.json` | Complete | Needs live API endpoint on Port 3000 |
| **Antigrav Test Suite** | `.agents/antigrav_rules.json` | Rule definition only | Needs executable test script/checker (`antigrav-check.js`) enforcing >= 70 score |

---

## 7. Recommended Implementation Sequence for Implementer Agents

1. **Step 1: Harden Port 3000 Master Spine (`server.js`)**:
   - Serve `PrimordiaOS/interfaces/dashboard.html` on `GET /` and `GET /hud` (or toggle with `preview.html` on `/preview`).
   - Implement `GET /health` and `GET /api/status` returning HTTP 200 and real-time status of all 5 realms.
   - Implement `POST /api/trigger-bigbang` and `POST /api/trigger-pulse`.
   - Forward Unreal Engine WebSocket (port 17800) events directly into the SSE stream (`/api/stream`).
2. **Step 2: Build Real Osmium SHA-256 Hash-Chain Engine**:
   - Implement `OsmiumLedger` class with `commitBlock()`, `verifyChain()`, `getHistory()`, and file persistence in `PrimordiaOS/osmium/data/chain.json`.
   - Wire `step3_writeLedger.js` to call this cryptographic engine.
3. **Step 3: Connect Syndicate Yield Routing to Autonomous Cycle**:
   - Create `step7_routeSyndicateYield.js` in `PrimordiaOS/antigravity/loop/steps/`.
   - Increment weekly scores and yield pools in `MoneyPlugHub/src/backend/routes/syndicates.ts` on each completed cycle.
4. **Step 4: Implement Idempotency Guard**:
   - Add cycle mutex flag `isCycleRunning` and atomic block commits to prevent concurrent execution or double-commits.
5. **Step 5: Implement `ANTIGRAV()` Checker CLI**:
   - Create `scripts/antigrav-check.js` to compute Uniqueness, Sovereignty, and Friction scores against `.agents/antigrav_rules.json` and block commits scoring < 70.

