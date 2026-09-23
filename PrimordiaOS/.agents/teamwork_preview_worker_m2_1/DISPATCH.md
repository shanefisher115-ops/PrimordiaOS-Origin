## 2026-09-02T05:53:12Z
You are the Implementation Worker for Milestone 2: Substrate Hardening & Cross-Realm Vessel Integration.
Working directory: c:\Users\Shane\Documents\dev\PrimordiaOS\.agents\teamwork_preview_worker_m2_1
Original request path: c:\Users\Shane\Documents\dev\PrimordiaOS\.agents\ORIGINAL_REQUEST.md
Project specification: c:\Users\Shane\Documents\dev\PrimordiaOS\.agents\PROJECT.md
Survey findings: c:\Users\Shane\Documents\dev\PrimordiaOS\.agents\teamwork_preview_explorer_survey_2\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your mission:
Implement and verify Milestone 2 (Substrate Hardening & Cross-Realm Vessel Integration):
1. **Termux Mobile Node Remote CLI & Telemetry Sync**:
   - Update `PrimordiaOS/vessels/termux-vessel.js` and `PrimordiaOS/realms/local/runtime.js` to support mobile node vessel telemetry ingestion and remote CLI execution.
   - Add `POST /api/telemetry/mobile` in `PrimordiaOS/interfaces/rest-server.js` to ingest mobile node sensor telemetry (battery, accelerometer, network, GPS, CPU).
   - Add `POST /api/cli/execute` in `PrimordiaOS/interfaces/rest-server.js` to execute remote sovereign CLI commands and return structured output.
   - Redirect `PrimordiaOS/mobile-node/index.js` heartbeat to Port 3000 Master Spine (`http://localhost:3000/api/telemetry/mobile`).
2. **Cloudflare AI Gateway Edge Routing & Fallback Resilience**:
   - Upgrade `PrimordiaOS/realms/cloud/cloudflare-gateway.js` with multi-tier fallback resilience:
     - Tier 1: Cloudflare AI Gateway HTTP endpoint (`https://gateway.ai.cloudflare.com/...`)
     - Tier 2: Direct Workers AI fallback
     - Tier 3: Local / Sovereign Mock fallback with exponential backoff and circuit breaker state (`closed`, `open`, `half-open`).
   - Update `.cloudflared/config.yml` ingress rules to properly forward traffic to Master Spine port 3000 and WS port 17800.
3. **Unreal Engine 5 Bidirectional RPC Trigger Coherence**:
   - Update `PrimordiaOS/pipelines/unreal-pipeline.js` to listen for `UNREAL_MESSAGE_RECEIVED` / `UNREAL_PLAY_STARTED` and automatically trigger `BIG_BANG_TRIGGER` with Niagara parameters.
   - Normalize telemetry metric schema (`data.metrics`) between `niagara-stream.js`, `websocket-server.js`, and `UPrimordiaBridgeSubsystem`.
4. **Verification**:
   - Author a verification script `tests/m2-verification.js` testing mobile telemetry ingestion, remote CLI execution, Cloudflare fallback resilience, and UE5 RPC triggers.
   - Run tests, verify 100% pass, and document results in your handoff report.

File ownership: `PrimordiaOS/vessels/termux-vessel.js`, `PrimordiaOS/mobile-node/index.js`, `PrimordiaOS/realms/cloud/cloudflare-gateway.js`, `.cloudflared/config.yml`, `PrimordiaOS/pipelines/unreal-pipeline.js`, `PrimordiaOS/realms/local/runtime.js`, `tests/m2-verification.js`. (Note: Also check `PrimordiaOS/interfaces/rest-server.js`, `PrimordiaOS/pipelines/niagara-stream.js`, etc. as required for the endpoints / schema).
