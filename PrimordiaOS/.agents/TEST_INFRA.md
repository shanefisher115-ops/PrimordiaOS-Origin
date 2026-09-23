# E2E Test Infra: PrimordiaOS Multi-Realm Cognition Organism

## Test Philosophy
- Opaque-box, requirement-driven testing directly derived from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- No reliance on internal mock shortcuts or dummy responses.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Scenarios.

## Feature Inventory & Test Matrix
| # | Feature | Requirement Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Realm) | Tier 4 (Real-World) |
|---|---------|-------------------|:----------------:|:-----------------:|:--------------------:|:-------------------:|
| 1 | Port 3000 /health & /api/status | R1, AC | 5 | 5 | ✓ | ✓ |
| 2 | Port 3000 /api/stream Live SSE Telemetry | R1, AC | 5 | 5 | ✓ | ✓ |
| 3 | Port 17800 WS Bridge BIG_BANG & SIMULATION_TICK | R1, AC | 5 | 5 | ✓ | ✓ |
| 4 | Port 3001 Economic Realm API Sync | R1, AC | 5 | 5 | ✓ | ✓ |
| 5 | Termux Mobile Node CLI & Telemetry Ingestion | R2, AC | 5 | 5 | ✓ | ✓ |
| 6 | Cloudflare AI Gateway Fallback Resilience | R2, AC | 5 | 5 | ✓ | ✓ |
| 7 | UE5 Bidirectional RPC Trigger Coherence | R2, AC | 5 | 5 | ✓ | ✓ |
| 8 | 12s Autonomous Pulse Loop & Idempotency Mutex | R3, AC | 5 | 5 | ✓ | ✓ |
| 9 | Osmium SHA-256 Hash-Chain Immutability & verifyChain | R1, R3, AC | 5 | 5 | ✓ | ✓ |
| 10 | Metadata Registries (registry, realm-map, dep-graph) | R1, AC | 5 | 5 | ✓ | ✓ |
| 11 | Syndicate Yield Routing & XP Multipliers | R3, AC | 5 | 5 | ✓ | ✓ |
| 12 | Cockpit HUD 5-Realm Dashboard Live Rendering | R1, AC | 5 | 5 | ✓ | ✓ |
| 13 | ANTIGRAV() Sovereignty Audits (Scores >= 70) | R4, AC | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner**: Node.js test runner script `tests/run-e2e-tests.mjs` or `tests/e2e/runner.js`.
- **Invocation**: `node tests/run-e2e-tests.mjs`
- **Pass/Fail Semantics**: Process exit code 0 on all tests passing, non-zero on any failure with explicit failure assertion reports.
- **Directory Layout**:
  - `tests/e2e/tier1-feature/`
  - `tests/e2e/tier2-boundary/`
  - `tests/e2e/tier3-cross-realm/`
  - `tests/e2e/tier4-application/`
  - `tests/e2e/harness/`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Cold-Boot Genesis & 5-Realm Live Telemetry Stream | F1, F2, F3, F4, F10, F12 | High |
| 2 | Autonomous Syndicate Yield Cycle with Osmium SHA-256 Commit | F8, F9, F10, F11, F12 | High |
| 3 | UE5 Simulation Connect & Niagara Cosmic Genesis Trigger | F2, F3, F7, F12 | High |
| 4 | Mobile Node Ingestion + Cloudflare Edge Fallback Resilience | F5, F6, F1, F13 | High |
| 5 | Sovereign ANTIGRAV() Governance Audit on Full System Assets | F12, F13, F8, F9 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >= 65 tests (5 per feature across 13 features).
- **Tier 2 (Boundary & Corner Cases)**: >= 65 tests (5 per feature across 13 features).
- **Tier 3 (Cross-Feature Combinations)**: >= 15 tests (major cross-realm pairs).
- **Tier 4 (Real-World Scenarios)**: >= 7 full integration workload tests.
- **Total Minimum Test Count**: >= 152 rigorous test cases.
