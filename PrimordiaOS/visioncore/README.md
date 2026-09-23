# PrimordiaOS VisionCore Subsystem

> **Director-Grade Creative Intelligence Layer for PrimordiaOS**  
> Sovereign Cognitive Substrate • Technophysical & Cinematic Synthesis • Anti-Collapse Friction

---

## 1. Overview & Architecture

VisionCore serves as the central creative director and visual intelligence layer within **PrimordiaOS**. Operating at sovereign cognitive altitude, it interprets high-level plain English directives, applies rigorous cinematic and technophysical styles (such as *Imperial Gold* and *Cyberpunk Emerald*), coordinates generative ideation, executes multi-step render sequences with real-time execution traces, and maintains versioned idempotent memory across cycles.

### Agent Swarm Specialization Matrix

| # | Agent Role | Component File | Core Responsibilities |
|---|---|---|---|
| 1 | **Folder Architect** | `visioncore/` | Directory structure, dependency graph, ESM module alignment |
| 2 | **VisionCore Architect** | `src/core/VisionCoreEngine.ts` | Top-level director intelligence, `VISIONCORE_OUTPUT` formatting |
| 3 | **Creative Orchestrator** | `src/core/CreativeOrchestrator.ts` | Dynamic task routing across Generator, RenderLoop, CoreForge, etc. |
| 4 | **Generator Specialist** | `src/modules/Generator.ts` | Cinematic idea generation, scriptwriting, 3D scenes, style extraction |
| 5 | **RenderLoop Specialist** | `src/modules/RenderLoop.ts` | Multi-step render pipelines, frame metrics, execution telemetry |
| 6 | **CoreForge Memory Specialist** | `src/modules/CoreForge.ts` | Versioned, idempotent creative memory, SHA-256 deduplication |
| 7 | **Pulse Engine Specialist** | `src/modules/PulseEngine.ts` | Cadence analysis, tension diagnostics, cultural virality forecasting |
| 8 | **Innovation Generator** | `src/modules/InnovationGenerator.ts` | Genetic crossover evolution, style mutation, timeline branching |
| 9 | **Style Memory Engine** | `src/core/StyleMemoryEngine.ts` | Technophysical aesthetics, DaVinci 3D LUTs, tone consistency |
| 10 | **Safety & Logging Specialist** | `src/safety/`, `src/logging/` | Anti-collapse guardrails, structured JSON logging, error quarantine |
| 11 | **Deployment Specialist** | `Dockerfile`, `cloudbuild.yaml` | Production multi-stage containerization & Google Cloud Run CI/CD |
| 12 | **QA Validator** | `tests/`, `tsconfig.json` | Type-safety, clean compilation, ESM resolution, and health probes |

---

## 2. Directory Structure

```text
visioncore/
├── package.json                   # ESM configuration, Node 20+, scripts
├── tsconfig.json                  # TypeScript compiler settings (NodeNext)
├── Dockerfile                     # Multi-stage production container for Cloud Run
├── cloudbuild.yaml                # Google Cloud Build CI/CD manifest
├── README.md                      # Complete system documentation
└── src/
    ├── index.ts                   # Primary entrypoint & Cloud Run HTTP server
    ├── core/
    │   ├── VisionCoreEngine.ts    # Central Director-Grade Intelligence Engine
    │   ├── CreativeOrchestrator.ts# Task dispatcher & module routing graph
    │   └── StyleMemoryEngine.ts   # Cinematic LUTs, optics, and tone consistency
    ├── modules/
    │   ├── Generator.ts           # Idea, script, scene, and style synthesis
    │   ├── RenderLoop.ts          # 5-step render pipeline & execution traces
    │   ├── CoreForge.ts           # Versioned, idempotent creative memory
    │   ├── PulseEngine.ts         # Diagnostics, tension curves, and forecasting
    │   └── InnovationGenerator.ts # Mutation, recombination, and timeline branching
    ├── safety/
    │   └── VisionCoreSafetyGuards.ts # Anti-collapse boundary validation & quarantine
    └── logging/
        └── VisionCoreLogger.ts    # JSON structured logging and quarantine ledger
```

---

## 3. Structured JSON Output Schema

Every directive processed through `VisionCoreEngine.processDirective()` yields structured JSON adhering strictly to the required `VISIONCORE_OUTPUT` contract:

```json
{
  "VISIONCORE_OUTPUT": {
    "Interpretation": {
      "rawDirective": "Construct an orbital sovereign foundry overlooking the Primordia computational ocean",
      "thematicAltitude": "Supreme Sovereign / Anti-Collapse Cognitive Plane",
      "aestheticProfile": "Imperial Gold (Technophysical)",
      "intentSummary": "Director-level extraction reveals an architectural mandate for: A high-altitude cinematic journey...",
      "antiCollapseFrictionScore": 88
    },
    "Creative Direction": {
      "premise": "In an epoch of sovereign cognitive substrate...",
      "logline": "A high-altitude cinematic journey through orbital sovereign foundry...",
      "cinematography": {
        "lens": "50mm Anamorphic Cine-Prime (f/1.4)",
        "lightingScheme": "8:1 Key-to-Fill at 3200K",
        "colorGradeLut": "Imperial Gold",
        "contrastCurve": "High-Contrast S-Curve",
        "palette": ["#D4AF37", "#1A1813", "#785918", "#382D16", "#F5E2A8"]
      },
      "soundtrackDirectives": "Low-frequency analog synth drone with acoustic violoncello harmonics",
      "sceneCount": 1,
      "leadSceneSlug": "EXT. MONOLITH FOUNDRY - DUSK"
    },
    "Module Routing": {
      "dispatchedModules": ["Generator", "CoreForge", "PulseEngine", "InnovationGenerator", "RenderLoop"],
      "executionTimeline": [
        { "module": "Generator", "status": "SUCCESS", "durationMs": 4, "summary": "Generated idea, script, and scene" },
        { "module": "CoreForge", "status": "SUCCESS", "durationMs": 2, "summary": "Persisted records (versioned & idempotent)" },
        { "module": "PulseEngine", "status": "SUCCESS", "durationMs": 3, "summary": "Tension curve points: 2, Virality vector: 72" },
        { "module": "InnovationGenerator", "status": "SUCCESS", "durationMs": 2, "summary": "Mutated concept and branched 2 timelines" },
        { "module": "RenderLoop", "status": "SUCCESS", "durationMs": 52, "summary": "Executed 5-stage render loop resulting in ProRes 4444 XQ" }
      ],
      "persistedMemoryIds": ["fp-idea-xxx", "arc-idea-xxx"],
      "renderJobId": "render-xxx"
    },
    "Next Actions": [
      {
        "action": "STREAM_NIAGARA_TELEMETRY",
        "targetModuleOrSystem": "Primordia Unreal Engine 5.4 Bridge",
        "priority": "HIGH",
        "suggestedPayload": { "spawnRate": 15000, "colorHex": "#D4AF37" }
      },
      {
        "action": "QUEUE_MOVIEFORGE_PLAYBACK",
        "targetModuleOrSystem": "MovieForge 4K Neural Theater",
        "priority": "HIGH",
        "suggestedPayload": { "lut": "Imperial Gold" }
      }
    ]
  }
}
```

---

## 4. Local Development & Testing

### Prerequisites
- Node.js 20.0.0+
- npm 10.0.0+

### Build & Run Locally
```bash
cd visioncore

# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run build

# 3. Start the Cloud Run compatible HTTP microservice
npm start
```

The service will bind to port `8080` (or the port specified by `$PORT`).

---

## 5. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service metadata, identity, and version info |
| `GET` | `/health` | Cloud Run health probe & diagnostic metrics |
| `GET` | `/api/visioncore/styles` | Enumerate supported cinematic style fingerprints |
| `GET` | `/api/visioncore/logs` | Query structured JSON execution logs & quarantined errors |
| `POST` | `/api/visioncore/process` | Submit a plain-text directive and receive `VISIONCORE_OUTPUT` |

### Sample Directive Request
```bash
curl -X POST http://localhost:8080/api/visioncore/process \
  -H "Content-Type: application/json" \
  -d '{
    "directive": "Construct a monolithic crystal laboratory reflecting sunset amber light over turbulent seas",
    "options": {
      "targetStyle": "Imperial Gold",
      "enableRender": true,
      "enableForecasting": true
    }
  }'
```

---

## 6. Docker & Google Cloud Run Deployment

### Local Container Build & Run
```bash
# Build production image
docker build -t visioncore:latest .

# Run container locally on port 8080
docker run -p 8080:8080 -e PORT=8080 visioncore:latest

# Verify health endpoint
curl http://localhost:8080/health
```

### Google Cloud Shell / Cloud Run One-Line Deploy
```bash
# Set your Google Cloud Project ID
export PROJECT_ID=$(gcloud config get-value project)
export REGION="us-central1"

# Submit build to Google Cloud Build
gcloud builds submit --config=cloudbuild.yaml .

# Or deploy directly using gcloud run deploy
gcloud run deploy visioncore \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2
```
