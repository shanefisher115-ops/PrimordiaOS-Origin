# PrimordiaOS Sovereign Cockpit Subsystem

The **Sovereign Cockpit** is the mission control, multi-realm telemetry aggregation substrate, and spatial HUD interface for PrimordiaOS. It bridges low-level system execution, autonomous media/revenue loops, optical perception neural streams, and real-time 3D simulation in Unreal Engine 5.4.

---

## Architectural Topology

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 PRIMORDIAOS COCKPIT                    │
                  │                                                        │
                  │   ┌────────────────────┐      ┌────────────────────┐   │
                  │   │ SovereignCockpit   │◄────►│ CockpitState       │   │
                  │   │ Engine             │      │ Machine            │   │
                  │   └─────────┬──────────┘      └────────────────────┘   │
                  │             │                                          │
                  │   ┌─────────▼──────────┐      ┌────────────────────┐   │
                  │   │ CockpitCommandBus  │◄────►│ CockpitSafety      │   │
                  │   │ (Typed Async Pub)  │      │ Guards & Quarantine│   │
                  │   └─────────┬──────────┘      └────────────────────┘   │
                  │             │                                          │
                  │   ┌─────────▼──────────┐      ┌────────────────────┐   │
                  │   │ TelemetryRouter    │◄────►│ CockpitLogger      │   │
                  │   │ (Multi-Realm Sync) │      │ (JSON Log Streams) │   │
                  │   └─────────┬──────────┘      └────────────────────┘   │
                  └─────────────┼──────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┬──────────────────────┐
         ▼                      ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   CRT Renderer   │   │ HolographicPanel │   │ Unreal Viewport  │   │ VisionCore Engine│
│  Scanlines, P22  │   │ 3D Compositor &  │   │  WebSocket Sync, │   │ Cosmic Particle  │
│  Phosphor Decay, │   │ Spatial Registry │   │ Niagara Pulses & │   │ Field & Audio    │
│  Curvature Math  │   │ Dock Transitions │   │  Actor Transforms│   │ Reactive Overlays│
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
         ▲                      ▲                      ▲                      ▲
         │                      │                      │                      │
┌────────┴─────────┐   ┌────────┴─────────┐   ┌────────┴─────────┐   ┌────────┴─────────┐
│ MoneyPlugHub     │   │ PrimordiaOS      │   │ Unreal Engine    │   │ VisionCore       │
│ Yields & Loops   │   │ Kernel Interface │   │ 5.4 Bridge       │   │ Optical Neural   │
└──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

---

## Subsystems & Agent Roles

| Component | Class / Module | Role Description |
|---|---|---|
| **Core Orchestrator** | `SovereignCockpitEngine` | Manages runtime lifecycle, Express HTTP server, WebSocket broadcasts, subsystem synchronization |
| **State Machine** | `CockpitStateMachine` | FSM governing states: `BOOTING`, `IDLE`, `CHARGED`, `FLUX`, `PANIC`, `SHUTDOWN` |
| **Command Bus** | `CockpitCommandBus` | Asynchronous typed command dispatcher with middleware pipelines and priority queues |
| **CRT Renderer** | `CRTRenderer` & `CRTShaders` | Virtual CRT rasterizer with P22/P43 phosphor decay, scanlines, barrel distortion, and cosmic color LUTs |
| **Holographic Panels**| `HolographicPanelSystem` & `PanelRegistry` | 3D spatial panel compositor, dynamic panel spawning, depth layering, and focus transitions |
| **Telemetry Router** | `TelemetryRouter` & `TelemetryTypes` | High-throughput multi-realm ingest from MoneyPlugHub, Kernel, VisionCore, and Unreal Engine |
| **Unreal Bridge** | `UnrealViewport` | Real-time WebSocket bridge client ingesting Niagara particles, camera vectors, and actor states |
| **VisionCore Engine** | `VisionCoreOverlayEngine` & `CosmicField` | Multi-layer canvas compositor with n-body cosmic starfields and audio-reactive FFT frequency pulses |
| **Kernel Interface** | `KernelInterface` | Masterplane client executing English-to-Disk commands (`psh`) and validating HMAC commercial licenses |
| **Safety & Logging** | `CockpitSafetyGuards` & `CockpitLogger` | Destructive command quarantine, rate limiter, and high-performance JSON structured logger |

---

## System Requirements

- **Node.js**: 20.0.0 or higher
- **TypeScript**: 5.4 or higher
- **Module Format**: ECMAScript Modules (ESM)
- **Container Target**: Google Cloud Run (Linux/amd64 or arm64)

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP & WebSocket listen port for Cloud Run | `8080` (fallback `3000`) |
| `NODE_ENV` | Runtime environment mode | `development` |
| `PRIMORDIAOS_KEY` | HMAC authorization key for PrimordiaOS masterplane | `""` |
| `UNREAL_BRIDGE_URL` | WebSocket endpoint for Unreal Engine 5.4 bridge | `ws://127.0.0.1:3000/ws/unreal` |
| `VISIONCORE_URL` | HTTP/WebSocket endpoint for VisionCore optical engine | `http://127.0.0.1:5055/vision` |
| `MONEYPLUGHUB_URL` | Telemetry endpoint for MoneyPlugHub publishing loops | `http://127.0.0.1:3001/telemetry` |

---

## Local Development & Execution

```bash
# 1. Install dependencies
cd sovereign-cockpit
npm install

# 2. Compile TypeScript
npm run build

# 3. Typecheck verification
npm run typecheck

# 4. Start the sovereign cockpit engine
npm start
```

---

## Docker & Container Execution

```bash
# Build local container image
docker build -t sovereign-cockpit:latest .

# Run container locally matching Cloud Run spec
docker run -p 8080:8080 \
  -e PRIMORDIAOS_KEY="PRIM-SOVEREIGN-DEV" \
  -e UNREAL_BRIDGE_URL="ws://host.docker.internal:3000/ws/unreal" \
  sovereign-cockpit:latest
```

---

## Cloud Run Deployment

Deploy directly using Google Cloud SDK:

```bash
gcloud run deploy sovereign-cockpit \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars NODE_ENV=production,UNREAL_BRIDGE_URL=ws://unreal.internal:3000/ws/unreal \
  --set-secrets PRIMORDIAOS_KEY=PRIMORDIAOS_KEY:latest
```

Or trigger an automated build via Cloud Build:

```bash
gcloud builds submit --config=cloudbuild.yaml
```
