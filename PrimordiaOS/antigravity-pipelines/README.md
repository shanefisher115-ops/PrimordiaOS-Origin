# PrimordiaOS Antigravity Pipeline Engine

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org)
[![Cloud Run](https://img.shields.io/badge/Deploy-Google%20Cloud%20Run-4285F4.svg)](https://cloud.google.com/run)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)](LICENSE)

The **Antigravity Pipeline Engine** is a high-performance, autonomous multi-agent DAG orchestration and execution engine designed for the PrimordiaOS sovereign architecture. It executes complex multi-agent workflows across distributed AI swarms, manages topological wavefront parallelization, enforces anti-collapse safety policies, provides versioned idempotent memory, and bridges events between Google AI Gateway, Vertex AI / Gemini, and the PrimordiaOS Masterplane Kernel.

---

## Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │  AntigravityPipelineEngine      │
                      │  (Master Controller & Lifecycle)│
                      └────────────────┬────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│ PipelineRegistry  │        │PipelineOrchestrator│       │PipelineMemoryEngine│
│ (6 Core Pipelines)│        │(DAG Wavefront Tiers)│      │(Versioned/Idempot)│
└────────┬──────────┘        └─────────┬─────────┘        └───────────────────┘
         │                             │
         │                             ▼
         │                   ┌───────────────────┐
         │                   │PipelineSafetyLayer│
         │                   │(Runaway/Quarantine│
         │                   └─────────┬─────────┘
         │                             │
         └─────────────────────────────┼─────────────────────────────┐
                                       ▼                             ▼
                             ┌───────────────────┐        ┌───────────────────┐
                             │ MultiAgentRouter  │        │  PipelineLogger   │
                             │(Normalized Dispatch│       │ (Structured JSON) │
                             └─────────┬─────────┘        └───────────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
  ┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
  │AntigravityAdapter │      │ VertexAIAdapter   │      │  KernelAdapter    │
  │ (Google AI Gateway│      │ (Gemini 1.5 Pro)  │      │(PrimordiaOS Kernel│
  └───────────────────┘      └───────────────────┘      └───────────────────┘
```

---

## Coordinated Swarm Roles

| Specialist Role | Component | Responsibility |
|---|---|---|
| **1. Folder Architect** | Directory Structure | Standardized ESM directory hierarchy, build configurations |
| **2. Pipeline Engine Architect** | `core/AntigravityPipelineEngine` | Central lifecycle state machine, boot & shutdown sequences |
| **3. Pipeline Registry Specialist** | `registry/PipelineRegistry` | Pre-registers and indexes the 6 core PrimordiaOS pipelines |
| **4. Pipeline Orchestrator Specialist** | `orchestrator/PipelineOrchestrator` | Parallel wavefront DAG executor & dependency manager |
| **5. Multi-Agent Router Specialist** | `router/MultiAgentRouter` | Normalized task routing across Antigravity, Vertex AI, and Kernel |
| **6. Execution Graph Specialist** | `graph/ExecutionGraphEngine` | DFS cycle detection, deadlock analysis, topological sorting |
| **7. Pipeline Memory Specialist** | `memory/PipelineMemoryEngine` | SHA-256 state hashing, idempotency caching, versioned snapshots |
| **8. Safety Specialist** | `safety/PipelineSafetyLayer` | Runaway hop limits, recursion barriers, node quarantine isolation |
| **9. Logging Specialist** | `logging/PipelineLogger` | High-throughput structured JSON logging with correlation IDs |
| **10. Antigravity Adapter Specialist** | `adapters/AntigravityAdapter` | Google AI Gateway connector with sovereign fallback loops |
| **11. Vertex AI Adapter Specialist** | `adapters/VertexAIAdapter` | Direct Gemini 1.5 Pro inference with structured content mapping |
| **12. Kernel Adapter Specialist** | `adapters/KernelAdapter` | PrimordiaOS Masterplane WebSocket/REST bidirectional bridge |
| **13. Deployment Specialist** | `Dockerfile` / `cloudbuild.yaml` | Multi-stage Node 20 containerization and Cloud Run automation |
| **14. QA Validator** | Test Suite & Type Checker | TypeScript strict verification, import resolution, and build audit |

---

## Core Pre-Registered Pipelines

The engine comes pre-configured with the six foundational pipelines:

1. **`pipeline-visioncore` (VisionCore)**:
   - Real-time frame decomposition, spatial OCR extraction via Gemini, and semantic entity grounding in the PrimordiaOS substrate.
2. **`pipeline-sovereign-cockpit` (Sovereign Cockpit)**:
   - Cockpit telemetry ingestion, user intent arbitration, ANTIGRAV() sovereignty score auditing (threshold >= 70), and HUD broadcast.
3. **`pipeline-moneyplughub` (MoneyPlugHub)**:
   - E-commerce revenue polling, temporal loop validation, deal intelligence generation via Gemini, and idempotent SQLite affiliate ledger commits.
4. **`pipeline-primordiaos-kernel` (PrimordiaOS Kernel)**:
   - System heartbeat probing, daemon and background worker auditing, and Masterplane WorldState snapshot commits.
5. **`pipeline-unreal-bridge` (Unreal Bridge)**:
   - WebSocket stream verification, Niagara particle shader synthesis (Imperial Gold / Cyberpunk Emerald), and Actor telemetry emission.
6. **`pipeline-spatial-memory` (Spatial Memory Engine)**:
   - Vector distance queries (cosine/Euclidean), episodic context synthesis, and Codex graph node inscription.

---

## Environment Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Cloud Run / HTTP listener port |
| `NODE_ENV` | `production` | Runtime mode (`development`, `production`, `test`) |
| `ANTIGRAVITY_GATEWAY_URL` | `http://localhost:5055/api/gateway` | Endpoint for Google AI Gateway Swarm |
| `VERTEX_AI_URL` | `https://generativelanguage.googleapis.com/v1beta` | Google Cloud Vertex AI / Gemini API endpoint |
| `PRIMORDIAOS_KERNEL_URL` | `http://localhost:3000` | PrimordiaOS Masterplane Kernel HTTP/WS bridge |
| `LOG_LEVEL` | `INFO` | Minimum log level (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) |
| `MAX_CONCURRENT_NODES` | `8` | Maximum parallel node executions per wavefront level |
| `DEFAULT_NODE_TIMEOUT_MS` | `30000` | Node execution timeout in milliseconds |
| `MAX_EXECUTION_HOPS` | `100` | Runaway safety hop ceiling before quarantine |

---

## HTTP REST API

When executed directly (`node dist/index.js`), the engine boots an HTTP server:

- `GET /health` or `GET /status`: Health check for Cloud Run probes.
- `GET /pipelines`: List all registered pipelines.
- `GET /pipelines/:id`: Retrieve pipeline definition.
- `POST /pipelines/:id/run`: Trigger execution with JSON payload:
  ```json
  {
    "initialInput": { "key": "value" },
    "idempotencyKey": "req-9872134",
    "traceId": "trace-client-123"
  }
  ```
- `GET /runs`: List recent pipeline execution results.
- `GET /runs/:runId`: Retrieve execution traces and outputs for a specific run.
- `GET /memory/snapshot`: Export full versioned memory snapshot.
- `GET /safety/quarantined`: List currently quarantined nodes or pipelines.
- `GET /logs?limit=100`: Stream recent structured JSON log events.

---

## Local Development & Compilation

### 1. Install Dependencies
```bash
cd antigravity-pipelines
npm install
```

### 2. Build TypeScript
```bash
npm run build
```

### 3. Start Local Microservice
```bash
npm start
```

---

## Docker Containerization

Build and run locally using the multi-stage Dockerfile:

```bash
docker build -t antigravity-pipelines .
docker run -p 8080:8080 \
  -e ANTIGRAVITY_GATEWAY_URL=http://localhost:5055/api/gateway \
  -e VERTEX_AI_URL=https://generativelanguage.googleapis.com/v1beta \
  -e PRIMORDIAOS_KERNEL_URL=http://localhost:3000 \
  antigravity-pipelines
```

---

## Cloud Run Deployment

Deploy directly using Google Cloud Build:

```bash
gcloud builds submit --config cloudbuild.yaml
```

Or deploy manually via Google Cloud SDK:

```bash
gcloud run deploy antigravity-pipelines \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production,ANTIGRAVITY_GATEWAY_URL=http://localhost:5055/api/gateway,VERTEX_AI_URL=https://generativelanguage.googleapis.com/v1beta,PRIMORDIAOS_KERNEL_URL=http://localhost:3000
```
