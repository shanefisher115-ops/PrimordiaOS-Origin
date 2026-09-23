# SigilForgeThreeCanvas Subsystem

> **PrimordiaOS Sovereign Procedural Graphics, Shader Synthesis, and Vector Sigil Forge**

`SigilForgeThreeCanvas` is a high-performance procedural graphics subsystem built with **TypeScript**, **Three.js**, and **embedded GLSL shaders**. It powers the real-time procedural sigil generation, audio-reactive holography, cosmic rolls, and vector/raster export pipelines for PrimordiaOS.

---

## 🏛️ Architecture Overview

The subsystem is decoupled into coordinated layers:

```
sigilforge-threecanvas/
├── package.json               # Node 20+, Three.js, Express, TypeScript dependencies
├── tsconfig.json              # Strict ES2022 / NodeNext TypeScript configuration
├── Dockerfile                 # Multi-stage production container for Cloud Run
├── cloudbuild.yaml            # Google Cloud Build deployment manifest
├── README.md                  # System handbook and API documentation
└── src/
    ├── index.ts               # Root export (exports SigilForgeThreeCanvasEngine)
    ├── server.ts              # Cloud Run HTTP preview and API daemon
    ├── core/
    │   ├── SigilForgeThreeCanvasEngine.ts   # Top-level coordinator & render loop
    │   ├── CanvasBoot.ts                    # DOM mounting & WebGL capability verification
    │   └── CanvasShutdown.ts                # Leak-free disposal of WebGL & Web Audio resources
    ├── three/
    │   ├── ThreeSceneBuilder.ts             # Cosmic background, particles, foil & specular layers
    │   ├── ThreeRenderer.ts                 # WebGLRenderer with tone mapping & DPR clamping
    │   └── ThreeCamera.ts                   # PerspectiveCamera with parallax tilt mechanics
    ├── shaders/
    │   ├── FoilShader.ts                    # Holographic thin-film iridescence & shockwave ripple
    │   ├── SpecularShader.ts                # Specular sheen & chromatic dispersion
    │   ├── ParticleShader.ts                # 3D vortex point sprites with audio turbulence
    │   └── CosmicFieldShader.ts             # Procedural fractal nebula & stellar twinkle
    ├── audio/
    │   └── AudioReactiveEngine.ts           # Web Audio API (FFT bass/mid/treble + polyrhythm fallback)
    ├── items/
    │   ├── ItemMetadata.ts                  # Category, rarity, and transform data models
    │   └── SigilItemRegistry.ts             # 54 procedural items with valid SVG path geometries
    ├── composition/
    │   ├── SigilCompositionEngine.ts        # Layer stack, SVG path rasterization & dynamic textures
    │   ├── HueWheel.ts                      # Harmonious color palettes (triadic, complementary, etc.)
    │   └── OrbitalVelocity.ts               # Multi-ring counter-rotational orbital mechanics
    ├── cosmicroll/
    │   └── CosmicRollEngine.ts              # Rarity-weighted procedural roll generator & soundscape
    ├── export/
    │   └── SigilExportEngine.ts             # Lossless SVG generation, PNG capture, & disk writes
    ├── interaction/
    │   └── CanvasInteractionLayer.ts        # Mouse parallax, inertia spring physics, & shockwaves
    ├── safety/
    │   └── SigilForgeSafetyLayer.ts         # Context loss quarantine & GPU resource tracking
    └── logging/
        └── SigilForgeLogger.ts              # Sovereign structured JSON logger with telemetry
```

---

## 🚀 Quickstart

### 1. Installation

```bash
cd sigilforge-threecanvas
npm install
```

### 2. Type Checking & Build

```bash
# Verify TypeScript strict typing
npm run typecheck

# Build compiled JavaScript to dist/
npm run build
```

### 3. Local Development Server

```bash
npm start
```
Open [http://localhost:8080](http://localhost:8080) to access the interactive web cockpit.

---

## 🎨 Interactive Client Usage

```typescript
import { SigilForgeThreeCanvasEngine } from 'sigilforge-threecanvas';

// 1. Instantiate engine
const engine = new SigilForgeThreeCanvasEngine({
  enableParallax: true,
});

// 2. Initialize with target container element
await engine.init('#canvas-container');

// 3. Start render loop
engine.start();

// 4. Trigger procedural Cosmic Roll
const roll = engine.triggerCosmicRoll();
console.log('Rolled seed:', roll.seed, 'Tier:', roll.highestRarity);

// 5. Connect microphone for live audio reactivity
await engine.enableMicrophone();

// 6. Export lossless vector SVG or raster PNG
const svgCode = engine.exportSvg();
const pngDataUrl = engine.exportPng();
```

---

## 🌌 Customization Item Registry

The registry contains **54 pre-configured items** with complete SVG geometric vectors across 9 sovereign categories:

| Category | Item Count | Example Items |
|---|---|---|
| **Crowns** | 6 | Apex Sovereign Diadem, Radiant Solar Crest, Obsidian Thorn Crown |
| **Bezels** | 6 | Chronos Gear Bezel, Ouroboros Infinity Ring, Octagonal Sanctum Frame |
| **Cosmic Fields** | 6 | Singularity Vortex Grid, Sacred Flower of Life, Metatronic Resonator |
| **Phoenix Wings** | 6 | Solar Ascension Wings, Cosmic Feather Pinions, Archangel Seraph |
| **Matrix Hexes** | 6 | Quantum Hexagonal Lattice, Cyber Honeycomb Core, Runic Hexagram |
| **Bifrost Spectrums** | 6 | Prismatic Bifrost Arc, Chromatic Helix Ribbon, Polar Dispersion Ray |
| **Dragon Horns** | 6 | Primordial Drake Spirals, Abyssal Wyrm Crescents, Chimera Antlers |
| **Merkaba Stars** | 6 | Sovereign Merkaba Lightbody, Octagram Compass, Golden Pentagram |
| **Ascendant Halos** | 6 | Empyrean Radiant Nimbus, Seraphim Crown of Light, Quantum Eclipse |

---

## ⚙️ Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Port for the HTTP preview and Cloud Run health daemon |
| `SIGILFORGE_ASSET_PATH` | `./assets` | Path to store local procedural asset geometries |
| `SIGILFORGE_EXPORT_PATH` | `./exports` | Target directory for server-side raster and vector exports |
| `NODE_ENV` | `production` | Runtime mode (`development` or `production`) |

---

## 🐳 Docker & Cloud Run Deployment

### Local Docker Build & Run

```bash
docker build -t sigilforge-threecanvas:latest .
docker run -p 8080:8080 -e PORT=8080 sigilforge-threecanvas:latest
```

### Google Cloud Build & Cloud Run

Deploy directly using Google Cloud SDK:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

Or deploy prebuilt container:

```bash
gcloud run deploy sigilforge-threecanvas \
  --image gcr.io/$PROJECT_ID/sigilforge-threecanvas:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars SIGILFORGE_ASSET_PATH=/app/assets,SIGILFORGE_EXPORT_PATH=/app/exports
```
