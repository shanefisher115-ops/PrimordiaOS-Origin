# PrimordiaOS Kernel Subsystem

The **PrimordiaOS Sovereign Kernel** is the Masterplane runtime orchestrating inter-realm communications, distributed state synchronization, prioritized background task scheduling, rate-limited and quarantine-protected event bus routing, and autonomous vitality pulses.

---

## Architecture Overview

```
                          ┌─────────────────────────────┐
                          │   Sovereign Cockpit / CLI   │
                          └──────────────┬──────────────┘
                                         │ Command Interface / HTTP
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRIMORDIA KERNEL MASTERPLANE                          │
│                                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────────────────────┐  │
│  │    KernelBoot Engine    │   │           KernelShutdown Engine         │  │
│  └────────────┬────────────┘   └────────────────────▲────────────────────┘  │
│               ▼                                     │                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         PrimordiaKernelEngine                         │  │
│  │    - Lifecycle States: OFFLINE -> BOOTING -> INITIALIZED -> RUNNING   │  │
│  │    - Cloud Run HTTP Endpoint (port 8080 default: /healthz, /livez)    │  │
│  └───────┬─────────┬──────────┬──────────┬───────────┬───────────┬───────┘  │
│          │         │          │          │           │           │          │
│          ▼         ▼          ▼          ▼           ▼           ▼          │
│     ┌─────────┐ ┌────────┐ ┌──────┐ ┌──────────┐ ┌────────┐ ┌─────────┐     │
│     │ Realm   │ │ Event  │ │ IPC  │ │ Task     │ │ Memory │ │ Safety  │     │
│     │Registry │ │  Bus   │ │Router│ │Scheduler │ │ Engine │ │  Layer  │     │
│     └────┬────┘ └────────┘ └──────┘ └──────────┘ └────────┘ └─────────┘     │
│          │                                                                  │
│          ▼                                                                  │
│     ┌──────────────────────────────────────────────────────────────┐        │
│     │ Registered Sovereign Realms:                                 │        │
│     │   1. Sovereign Cockpit                                       │        │
│     │   2. MoneyPlugHub                                            │        │
│     │   3. VisionCore                                              │        │
│     │   4. Unreal Bridge                                           │        │
│     │   5. Spatial Memory Engine                                   │        │
│     └──────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  ┌────────────────────────┐                   ┌──────────────────────────┐  │
│  │    KernelHeartbeat     │════ Pulse ═══════▶│       KernelLogger       │  │
│  │ (STABLE / FLUX / CHG)  │                   │  (JSON structured logs)  │  │
│  └────────────────────────┘                   └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
primordia-kernel/
├── src/
│   ├── core/
│   │   ├── PrimordiaKernelEngine.ts    # Main orchestrator & HTTP server
│   │   ├── KernelBoot.ts               # Phase-by-phase boot sequence
│   │   ├── KernelShutdown.ts           # Graceful drain and halt logic
│   │   └── KernelHeartbeat.ts          # Vitality pulse and telemetry
│   ├── registry/
│   │   └── RealmRegistry.ts            # Realm registration and route lookup
│   ├── eventbus/
│   │   └── EventBus.ts                 # Wildcard pub/sub & quarantine queue
│   ├── ipc/
│   │   └── IPCRouter.ts                # RPC invocations & streaming IPC
│   ├── scheduler/
│   │   └── KernelTaskScheduler.ts      # Prioritized & recurring task scheduler
│   ├── memory/
│   │   └── KernelMemoryEngine.ts       # Versioned idempotent state & persistence
│   ├── safety/
│   │   └── KernelSafetyLayer.ts        # Threat guard, rate limits & key audit
│   ├── logging/
│   │   └── KernelLogger.ts             # JSON logging with subsystem tagging
│   ├── commands/
│   │   └── KernelCommandInterface.ts   # Cockpit/CLI command dispatch
│   └── index.ts                        # Unified export entrypoint
├── package.json                        # Node 20+, ESM, TypeScript
├── tsconfig.json                       # NodeNext module resolution, strict
├── Dockerfile                          # Multi-stage Cloud Run container
├── cloudbuild.yaml                     # Automated CI/CD pipeline
└── README.md                           # Documentation and runbooks
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port for Cloud Run liveness/readiness probes | `8080` |
| `PRIMORDIAOS_KEY` | Cryptographic HMAC or Sovereign license token (`PRIM-TIER-ENTROPY-SIG`) | `COMMUNITY_DEV` fallback |
| `REALM_REGISTRY_PATH` | Path to custom realm manifest JSON file | `./primordia_realms.json` |
| `KERNEL_CONFIG_PATH` | Path to persistent versioned memory state JSON snapshot | `./.primordia-kernel-state.json` |
| `LOG_LEVEL` | Minimum log output verbosity (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) | `INFO` |

---

## Core Sovereign Realms

Upon boot, the `RealmRegistry` mounts five core realms:
1. **Sovereign Cockpit (`sovereign-cockpit`)**: Primary human-sovereign control surface, command telemetry HUD, and neural theater.
2. **MoneyPlugHub (`moneyplughub`)**: Autonomous commerce, marketing loops, idempotent content publishing, and affiliate flows.
3. **VisionCore (`vision-core`)**: Multimodal visual analysis, spatial OCR, raymarched shaders, and scene understanding.
4. **Unreal Bridge (`unreal-bridge`)**: High-throughput WebSocket telemetry stream to Unreal Engine 5.4 Niagara emitters and procedural actors.
5. **Spatial Memory Engine (`spatial-memory-engine`)**: High-dimensional associative memory, vector graph topologies, and persistent codex lattice.

---

## Local Development & Testing

### Prerequisites
- Node.js 20.0.0+
- npm 9+

### Installation & Build
```bash
cd primordia-kernel

# Install dev dependencies (TypeScript and types)
npm install

# Compile TypeScript
npm run build

# Launch the sovereign masterplane kernel
npm start
```

### Type Checking
```bash
npm run typecheck
```

---

## HTTP Endpoints (Cloud Run Ready)

- `GET /healthz` or `GET /livez`: Health and readiness probe returning HTTP 200 when kernel is `RUNNING` or `INITIALIZED`.
- `GET /api/status`: Complete kernel vitality metrics, memory version, active tasks, and realm descriptors.
- `GET /api/realms`: List of all registered realms and capabilities.
- `POST /api/command`: Execute commands via JSON payload (`{"command": "kernel:status"}`).
- `GET /`: Landing dashboard with kernel uptime and state badge.

---

## Command Interface Reference

Commands can be invoked via `KernelCommandInterface`, the HTTP `/api/command` endpoint, or programmatically:

| Command | Arguments | Description |
|---|---|---|
| `status` / `kernel:status` | None | Displays live vitality, task queues, and memory version |
| `realm:list` | None | Lists all registered sovereign realms |
| `realm:inspect` | `<realmId>` | Details capabilities, telemetry keys, and actions for a realm |
| `event:emit` | `<topic> [jsonPayload]` | Emits a validated event to the EventBus |
| `task:list` | None | Shows queue depth and execution stats of the task scheduler |
| `memory:get` | `<namespace> <key>` | Reads a versioned state record from the memory engine |
| `memory:set` | `<namespace> <key> <value>` | Idempotently sets a versioned state record |
| `safety:quarantine` | None | Lists quarantined security and payload violations |
| `worldstate:set` | `<STABLE\|FLUX\|CHARGED>` | Modulates the active world state equilibrium |

---

## Docker & Cloud Run Deployment

### Local Docker Build & Run
```bash
docker build -t primordia-kernel:latest .
docker run -p 8080:8080 -e PRIMORDIAOS_KEY=PRIM-SOVEREIGN-LOCAL-DEV primordia-kernel:latest
```

### Google Cloud Build Deployment
```bash
gcloud builds submit --config=cloudbuild.yaml
```
