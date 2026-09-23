# Antigravity — Visual Cognition Engine

> **PrimordiaOS STEP 4** — The Antigravity realm transforms PrimordiaOS from a cognitive OS into a **visual synthetic cognition OS**.

---

## Architecture

```
Command Console
  → executePURLCommand(intent, payload)
    → purlSafety.validateCommand
    → ENGINE_MAP routes to antigravityEngine
      → SpatialMemoryEngine (data)
      → MultimodalEngines (rendering backends)
    → Antigravity Realm UI (visualization)
    → swarmLogger.dispatch (telemetry → Swarm Monitor)
```

### Data Flow

```
PURL Intent
  ↓
AntigravityBridge (binds intents at boot)
  ↓
AntigravityEngine (processes intent)
  ├── SpatialMemoryEngine (reads/writes agent positions, world vectors, frames)
  ├── MultimodalEngines (invokes Flow / Vids / Genie3 / CloudVision / OvermindViz)
  └── Returns EngineResult → PURL → Console / Monitor
        ↓
AntigravityRealm.tsx (renders to GPU canvas)
```

---

## PURL Intent Reference

### `simulation.render`
Renders the current simulation state to a visual frame.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `multimodalEngine` | `string` | `null` | Optional multimodal engine to invoke (`"OvermindViz"`) |

**Returns:** `{ frameId, renderId, renderTimeMs, resolution, agentCount, tick, multimodalEngine, multimodalLatencyMs }`

---

### `world.project`
Projects the current world-model state into a dimensional viewport using Genie 3.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `steps` | `number` | `10` | Projection steps |

**Returns:** `{ renderId, renderTimeMs, projectionEngine, stateVector, projectedFrames, convergence, worldDimensions }`

---

### `agent.visualize`
Maps agent swarm data onto the spatial grid. Seeds demo agents if none exist.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `count` | `number` | `12` | Number of demo agents to seed (if empty) |

**Returns:** `{ renderId, renderTimeMs, agentCount, agents[], connections[], clusterCount, vizLatencyMs }`

---

### `memory.spatial.map`
Retrieves the full spatial memory state for rendering.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `analyze` | `boolean` | `false` | If true, invokes CloudVision for spatial analysis |

**Returns:** `{ agentCount, agents[], worldVectorCount, worldState, frameCount, latestFrameId, analysis }`

---

### `scene.generate`
Generates a synthetic scene using a multimodal engine.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt` | `string` | `"synthetic scene"` | Generation prompt |
| `engine` | `string` | `"Flow"` | Engine: `Flow`, `Vids`, `Genie3`, `CloudVision`, `OvermindViz` |

**Returns:** `{ renderId, renderTimeMs, sceneId, sourceEngine, multimodalType, multimodalLatencyMs, sceneCount, payload }`

---

## Multimodal Engine Integration

| Engine | Type | Output Description |
|--------|------|--------------------|
| **Flow** | `image` | Synthetic image with dimensions, seed, quality, color profile |
| **Vids** | `video` | Video sequence with duration, FPS, total frames, codec |
| **Genie 3** | `worldModel` | World-model projection with state vector, projected frames, convergence |
| **Cloud Vision** | `analysis` | Scene analysis with labels, confidence scores, dominant colors |
| **Overmind Viz** | `agentMap` | Agent topology with positions, connections, cluster count |

---

## Spatial Memory Data Model

### Agent Position
```typescript
{
  id: string;
  x: number;       // 0–100 normalized
  y: number;       // 0–100 normalized
  z: number;       // depth layer
  velocity: number;
  state: "active" | "idle" | "spawning" | "terminated";
  lastUpdated: number;
}
```

### World Vector
```typescript
{
  key: string;
  dimensions: number[];
  magnitude: number;    // L2 norm
  timestamp: number;
}
```

### Simulation Frame
Ring buffer (max 500). Each frame captures agent positions and world state at a tick.

### Generated Scene
Ordered history (max 200). Records which multimodal engine produced the scene.

### Temporal Snapshot
Point-in-time captures (max 100) for playback scrubbing.

---

## GPU Acceleration Strategy

The Antigravity Realm uses several GPU acceleration techniques:

| Technique | Purpose |
|-----------|---------|
| `transform: translateZ(0)` | Promotes elements to GPU compositor layers |
| `will-change: transform` | Hints browser to pre-allocate GPU resources |
| `backface-visibility: hidden` | Reduces overdraw on 3D-promoted layers |
| `contain: layout style paint` | Limits reflow scope to the realm container |
| `requestAnimationFrame` | Syncs rendering to display refresh rate |
| Canvas 2D rendering | All spatial grid rendering uses hardware-accelerated `<canvas>` |

---

## Diagnostics Reference

The Antigravity Realm exposes these metrics:

| Metric | Source | Description |
|--------|--------|-------------|
| Render FPS | Canvas RAF loop | Frames per second (target: 60) |
| GPU Load | Render time / 16.67ms | Estimated GPU utilization percentage |
| Render Time | `performance.now()` delta | Per-frame render duration in ms |
| Agents | `SpatialMemoryEngine` | Active agent count on spatial grid |
| Frames | `SpatialMemoryEngine` | Total simulation frames captured |
| Scenes | `SpatialMemoryEngine` | Total generated scenes |
| Last Engine | PURL result | Last engine that processed a command |

---

## File Reference

| File | Location | Purpose |
|------|----------|---------|
| `antigravityEngine.ts` | `lib/engines/` | PURL engine (5 intents) |
| `multimodalEngines.ts` | `lib/engines/` | Flow/Vids/Genie3/CloudVision/OvermindViz stubs |
| `spatialMemoryEngine.ts` | `lib/` | Agent/world/frame spatial data store |
| `antigravityBridge.ts` | `lib/` | PURL ↔ Antigravity runtime binding |
| `AntigravityRealm.tsx` | `components/` | Cyberpunk GPU-accelerated UI realm |
| `AntigravityRealm.css` | `components/` | GPU acceleration styles |
| `antigravity.test.ts` | `lib/__tests__/` | 18-test comprehensive suite |

---

## CSS Class Reference

| Class | Purpose |
|-------|---------|
| `.antigravity-realm` | Root container with GPU promotion |
| `.antigravity-canvas` | Canvas element with pixel rendering |
| `.antigravity-scanlines` | Animated scanline overlay |
| `.agent-node` | Agent visualization node base |
| `.agent-node--active` | Ion-glow active agent |
| `.agent-node--idle` | Ember-glow idle agent |
| `.agent-node--spawning` | Plasma-glow spawning agent |
| `.spatial-grid` | CSS grid line overlay |
| `.connection-line` | Animated dashed connection |
| `.projection-bar` | World projection magnitude bar |
| `.multimodal-card` | Scene output card |
| `.playback-timeline` | Snapshot scrubber control |
| `.fps-counter` | Tabular-nums FPS display |
| `.diag-bar` | Diagnostic level bar |
