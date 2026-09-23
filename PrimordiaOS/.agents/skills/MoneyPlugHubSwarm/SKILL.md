---
name: MoneyPlugHubSwarm
description: Orchestrate, generate, and maintain the MoneyPlugHub autonomous loop subsystem, automation adapters (Make, Notion, Osmium, PrimordiaOS), and Cloud Run deployment swarms.
---

# MoneyPlugHub Swarm

This skill empowers Antigravity agents to orchestrate, execute, validate, and evolve the **MoneyPlugHub** autonomous subsystem for PrimordiaOS.

## Swarm Agent Roles

When operating on the MoneyPlugHub subsystem, agents assume one or more of the following 9 specialized roles:

1. **Folder Architect**: Verifies file structures and dependencies (`moneyplughub/src/engine`, `moneyplughub/src/adapters`, `moneyplughub/traces`).
2. **Engine Architect**: Maintains `MoneyPlugHubEngine`, core execution lifecycles, and batch task orchestrations.
3. **Loop Manager Specialist**: Enforces the strict depth ceiling of 12, SHA-256 idempotency deduplication, retry budgets of 3, promotion rules (`SUCCESS`, `PARTIAL`, `FAILURE`), and quarantine state machines.
4. **Task Interpreter Specialist**: Maintains inbound schema parsers, payload normalization, and priority mapping.
5. **Automation Router Specialist**: Routes tasks cleanly across Make, Notion, Osmium, and PrimordiaOS adapters with circuit breaker protection.
6. **Adapter Specialist**: Manages external API clients, HMAC-SHA256 signatures, and network resilient fallbacks.
7. **Safety & Logging Specialist**: Monitors circuit breaker states, token bucket rate limiters, credential redactors, and structured Cloud Logging JSON.
8. **Deployment Specialist**: Manages multi-stage Dockerfiles, `cloudbuild.yaml` pipelines, and Cloud Run scaling rules.
9. **QA Validator**: Audits imports, verifies TypeScript (`tsc --noEmit`), and executes end-to-end integration tests.

---

## Autonomous Loop Guardrails & Invariants

All agents interacting with the MoneyPlugHub runtime MUST enforce the following structural invariants:

- **Loop Depth Ceiling = 12**: Never permit recursive tasks beyond depth 12. If depth > 12, immediately quarantine the task to `./traces/quarantine/<taskId>.json` and emit `TASK_QUARANTINED`.
- **Retry Budget = 3**: Tasks have at most 3 retries with exponential backoff (`500ms * 2^attempt`) before being quarantined.
- **Idempotency Keys**: Compute SHA-256 state hashes across `(target, action, payload)`. Completed tasks must return cached results without re-execution.
- **Disk Traces**: Every loop execution span must flush a structured JSON trace to `./traces/<traceId>.json`.

---

## Subsystem Commands & CLI Operations

Navigate to `MoneyPlugHub` (or `moneyplughub`):

```bash
# Verify TypeScript compile without emitting
npm run check

# Full compilation to dist/
npm run build

# Run automated engine verification test suite
npm run test:engine

# Start the Cloud Run standalone HTTP microservice
npm run start

# Start in development mode with live watch
npm run dev
```

---

## Cloud Run & GCP Deployment Workflow

To build and deploy the container to Google Cloud Run:

```bash
# Automated Cloud Build deployment with secret bindings
gcloud builds submit --config=cloudbuild.yaml
```

Environment variables expected:
- `NOTION_KEY`: Notion integration secret
- `MAKE_KEY`: Make.com API key
- `PRIMORDIAOS_KEY`: PrimordiaOS sovereign masterplane key
- `OSMIUM_KEY`: Osmium cryptographic ledger HMAC key
