# VisionCore × Vertex AI Hybrid Subsystem

[![PrimordiaOS Substrate](https://img.shields.io/badge/PrimordiaOS-Subsystem-gold)](https://github.com/moneyplughub2/PrimordiaOS-Origin)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org)
[![Google Cloud Run](https://img.shields.io/badge/Cloud%20Run-Ready-4285F4)](https://cloud.google.com/run)

The **Vertex AI × VisionCore Hybrid** subsystem fuses PrimordiaOS's director-grade cinematic intelligence with Google Vertex AI's Gemini multimodal reasoning, text generation, image rendering guidance, temporal video choreography, and vector embeddings.

---

## 🏛 Architecture & Swarm Specializations

```
                     ┌───────────────────────────────────────────────┐
                     │         VisionCoreVertexHybridEngine          │
                     │          (Lifecycle & State Manager)          │
                     └───────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
          ┌─────────────────────────┐                 ┌─────────────────────────┐
          │    VisionCoreEngine     │                 │   CreativeOrchestrator  │
          │ (Directorial Synthesis) │                 │   (Master Dispatcher)   │
          └────────────┬────────────┘                 └────────────┬────────────┘
                       │                                           │
                       ▼                                           ▼
          ┌─────────────────────────┐        ┌────────────────────────────────────────┐
          │    VISIONCORE_OUTPUT    │        │ Modules Swarm:                         │
          │  - Interpretation       │        │  • Generator (Ideation & Scripts)      │
          │  - Creative Direction   │        │  • RenderLoop (Forensic Renders)       │
          │  - Module Routing       │◄───────┤  • CoreForge (Idempotent Memory)       │
          │  - Next Actions         │        │  • PulseEngine (Diagnostics & Entropy) │
          └─────────────────────────┘        │  • InnovationGenerator (Mutations)     │
                                             └────────────────────┬───────────────────┘
                                                                  │
                                                                  ▼
                                             ┌────────────────────────────────────────┐
                                             │         VertexAIPipelineRouter         │
                                             │     (Multi-Task Normalizer/Router)     │
                                             └────────────────────┬───────────────────┘
                                                                  │
                                                                  ▼
                                             ┌────────────────────────────────────────┐
                                             │            VertexAIAdapter             │
                                             │  (Gemini REST, Retries, Quarantine)    │
                                             └────────────────────────────────────────┘
```

### 14 Agent Roles

1. **Folder Architect**: Directory taxonomy and module separation.
2. **Hybrid Engine Architect** (`VisionCoreVertexHybridEngine.ts`): System lifecycle, boot sequences, health telemetry, and shutdown.
3. **VisionCore Architect** (`VisionCoreEngine.ts`): Produces structured `VISIONCORE_OUTPUT` (Interpretation, Creative Direction, Module Routing, Next Actions).
4. **Creative Orchestrator Specialist** (`CreativeOrchestrator.ts`): Multi-agent pipeline dispatch across all submodules.
5. **Vertex AI Pipeline Router Specialist** (`VertexAIPipelineRouter.ts`): Normalizes payloads across text, image, video, embeddings, and multimodal reasoning.
6. **Gemini Adapter Specialist** (`VertexAIAdapter.ts`): Resilient HTTP client with exponential backoff and offline heuristic fail-safe.
7. **Generator Specialist** (`Generator.ts`): Screenplay generation, shot list generation, and style extraction.
8. **RenderLoop Specialist** (`RenderLoop.ts`): Step-by-step multimodal execution with forensic timing traces.
9. **CoreForge Memory Specialist** (`CoreForge.ts`): Idempotent, SHA-256 versioned store for fingerprints, narrative arcs, and emotional tones.
10. **Pulse Engine Specialist** (`PulseEngine.ts`): Entropy scoring, cognitive friction indexing, and semantic trend forecasting.
11. **Innovation Generator Specialist** (`InnovationGenerator.ts`): Style recombination, parameter mutation, and divergent creative expansion.
12. **Safety & Logging Specialist** (`HybridSafetyLayer.ts`, `HybridLogger.ts`): Anti-collapse friction scoring, brand guardrails, and error quarantine.
13. **Deployment Specialist** (`Dockerfile`, `cloudbuild.yaml`): Cloud Run containerization and Cloud Build deployment pipelines.
14. **QA Validator**: TypeScript compilation checks, import validation, and automated test runners.

---

## ⚙️ Environment Configuration

Set the following environment variables in your environment or Cloud Run service configuration:

| Variable | Description | Default |
|---|---|---|
| `VERTEX_AI_PROJECT_ID` | Google Cloud Project ID | `""` |
| `VERTEX_AI_LOCATION` | Vertex AI Regional endpoint | `"us-central1"` |
| `VERTEX_AI_MODEL` | Gemini model name | `"gemini-1.5-pro"` |
| `VERTEX_AI_API_KEY` | Optional Gemini Developer / Express API Key | `""` |
| `PORT` | HTTP daemon listening port | `8080` |
| `AUTO_START_SERVER` | Start HTTP server on startup (`true`/`false`) | `true` (in Docker) |

> **Note**: If `VERTEX_AI_PROJECT_ID` or `VERTEX_AI_API_KEY` are not configured, the adapter automatically runs in **Deterministic Heuristic Director Mode**, ensuring local development, unit tests, and offline execution succeed without errors.

---

## 🚀 Quick Start

### 1. Installation & Build

```bash
cd visioncore-vertex-hybrid
npm install
npm run build
```

### 2. Programmatic Usage in TypeScript

```typescript
import { VisionCoreVertexHybridEngine } from '@primordiaos/visioncore-vertex-hybrid';

async function run() {
  const engine = new VisionCoreVertexHybridEngine();
  await engine.boot();

  const result = await engine.execute({
    directive: 'Brutalist monolith emerging from atmospheric mist at golden hour',
    generateScript: true,
    generateSceneVisuals: true,
    runPulseDiagnostics: true
  });

  console.log('--- VisionCore Output ---');
  console.log(JSON.stringify(result.visionCoreOutput, null, 2));

  console.log('--- Generated Scene ---');
  console.log(result.scene?.title);
  console.log(result.scene?.visualPromptForGemini);

  console.log('--- Creative Diagnostics ---');
  console.log(`Friction Index: ${result.diagnostics?.cognitiveFrictionIndex}`);
  console.log(`Entropy Score: ${result.diagnostics?.entropyScore}`);

  await engine.shutdown();
}

run();
```

### 3. Running as a Cloud Run Daemon Locally

```bash
npm start
```

Endpoints:
- `GET /healthz` - Health check & live telemetry
- `GET /api/telemetry` - System state, memory records, and uptime
- `GET /api/quarantine` - List quarantined execution errors
- `POST /api/execute` - Submit `{ "directive": "..." }` for immediate pipeline processing

---

## 🐳 Docker & Cloud Run Deployment

### Build & Run Container Locally

```bash
docker build -t visioncore-vertex-hybrid .
docker run -p 8080:8080 -e VERTEX_AI_API_KEY="your-key" visioncore-vertex-hybrid
```

### Deploy to Google Cloud Run via Cloud Build

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Or deploy directly with `gcloud run`:

```bash
gcloud run deploy visioncore-vertex-hybrid \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars VERTEX_AI_PROJECT_ID=your-project-id,VERTEX_AI_LOCATION=us-central1,VERTEX_AI_MODEL=gemini-1.5-pro
```

---

## 🛡 Anti-Collapse Sovereignty Guarantees

Every execution cycle enforces:
1. **Cognitive Altitude $\ge 70$**: Prompt and outputs are scored against lexical richness and directorial depth.
2. **Anti-Collapse Friction $\ge 0.65$**: Rejects generic corporate tropes and low-effort summaries.
3. **Idempotent CoreForge Memory**: Prevents duplicate state mutations with SHA-256 fingerprinting.
4. **Error Quarantine**: Failed external network requests are isolated into a quarantined ledger rather than crashing the substrate.
