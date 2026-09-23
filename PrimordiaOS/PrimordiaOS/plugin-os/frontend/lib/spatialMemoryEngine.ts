// ============================================================
//   SPATIAL MEMORY ENGINE — Antigravity Data Store
// ============================================================
//
//   In-memory spatial data store for the Antigravity renderer.
//   Stores agent positions, world-state vectors, simulation
//   frames, scene history, and temporal snapshots.
//
//   This is the foundation of synthetic worlds, agent swarms,
//   temporal reasoning, and simulation playback.
//

// ─── Types ──────────────────────────────────────────────────

export interface AgentPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  velocity: number;
  state: "active" | "idle" | "spawning" | "terminated";
  lastUpdated: number;
}

export interface WorldVector {
  key: string;
  dimensions: number[];
  magnitude: number;
  timestamp: number;
}

export interface SimulationFrame {
  frameId: string;
  tick: number;
  agentCount: number;
  agents: AgentPosition[];
  worldState: Record<string, WorldVector>;
  timestamp: number;
}

export interface GeneratedScene {
  sceneId: string;
  sourceEngine: string;
  resolution: { width: number; height: number };
  layers: number;
  metadata: Record<string, unknown>;
  generatedAt: number;
}

export interface TemporalSnapshot {
  snapshotId: string;
  agents: AgentPosition[];
  worldState: Record<string, WorldVector>;
  frameCount: number;
  capturedAt: number;
}

// ─── Constants ──────────────────────────────────────────────

const MAX_FRAMES = 500;
const MAX_SCENES = 200;
const MAX_SNAPSHOTS = 100;

// ─── State ──────────────────────────────────────────────────

let agentPositions: Map<string, AgentPosition> = new Map();
let worldVectors: Map<string, WorldVector> = new Map();
let frames: SimulationFrame[] = [];
let scenes: GeneratedScene[] = [];
let snapshots: TemporalSnapshot[] = [];

let frameCounter = 0;
let sceneCounter = 0;
let snapshotCounter = 0;

// ─── Agent Positions ────────────────────────────────────────

export function updateAgentPosition(
  id: string,
  pos: Partial<Omit<AgentPosition, "id" | "lastUpdated">>
): AgentPosition {
  const existing = agentPositions.get(id);

  const updated: AgentPosition = {
    id,
    x: pos.x ?? existing?.x ?? 0,
    y: pos.y ?? existing?.y ?? 0,
    z: pos.z ?? existing?.z ?? 0,
    velocity: pos.velocity ?? existing?.velocity ?? 0,
    state: pos.state ?? existing?.state ?? "idle",
    lastUpdated: Date.now(),
  };

  agentPositions.set(id, updated);
  return updated;
}

export function removeAgent(id: string): boolean {
  return agentPositions.delete(id);
}

export function getAgentPositions(): AgentPosition[] {
  return Array.from(agentPositions.values());
}

export function getAgentCount(): number {
  return agentPositions.size;
}

// ─── World-State Vectors ────────────────────────────────────

export function setWorldVector(key: string, dimensions: number[]): WorldVector {
  const magnitude = Math.sqrt(dimensions.reduce((sum, d) => sum + d * d, 0));

  const vec: WorldVector = {
    key,
    dimensions,
    magnitude,
    timestamp: Date.now(),
  };

  worldVectors.set(key, vec);
  return vec;
}

export function getWorldVector(key: string): WorldVector | null {
  return worldVectors.get(key) ?? null;
}

export function getWorldState(): Record<string, WorldVector> {
  const state: Record<string, WorldVector> = {};
  Array.from(worldVectors.entries()).forEach(([k, v]) => {
    state[k] = v;
  });
  return state;
}

// ─── Simulation Frames ──────────────────────────────────────

export function pushFrame(overrides?: Partial<SimulationFrame>): SimulationFrame {
  frameCounter++;

  const frame: SimulationFrame = {
    frameId: `frame-${frameCounter}`,
    tick: overrides?.tick ?? frameCounter,
    agentCount: overrides?.agentCount ?? agentPositions.size,
    agents: overrides?.agents ?? getAgentPositions(),
    worldState: overrides?.worldState ?? getWorldState(),
    timestamp: Date.now(),
  };

  frames.push(frame);

  // Enforce ring buffer limit
  if (frames.length > MAX_FRAMES) {
    frames = frames.slice(frames.length - MAX_FRAMES);
  }

  return frame;
}

export function getFrames(start?: number, end?: number): SimulationFrame[] {
  if (start !== undefined && end !== undefined) {
    return frames.slice(start, end);
  }
  return [...frames];
}

export function getFrameCount(): number {
  return frames.length;
}

export function getLatestFrame(): SimulationFrame | null {
  return frames.length > 0 ? frames[frames.length - 1] : null;
}

// ─── Scene History ──────────────────────────────────────────

export function addScene(
  sourceEngine: string,
  metadata: Record<string, unknown> = {}
): GeneratedScene {
  sceneCounter++;

  const scene: GeneratedScene = {
    sceneId: `scene-${sceneCounter}`,
    sourceEngine,
    resolution: { width: 1920, height: 1080 },
    layers: Math.floor(Math.random() * 5) + 1,
    metadata,
    generatedAt: Date.now(),
  };

  scenes.push(scene);

  if (scenes.length > MAX_SCENES) {
    scenes = scenes.slice(scenes.length - MAX_SCENES);
  }

  return scene;
}

export function getSceneHistory(): GeneratedScene[] {
  return [...scenes];
}

export function getSceneCount(): number {
  return scenes.length;
}

// ─── Temporal Snapshots ─────────────────────────────────────

export function captureSnapshot(): TemporalSnapshot {
  snapshotCounter++;

  const snapshot: TemporalSnapshot = {
    snapshotId: `snap-${snapshotCounter}`,
    agents: getAgentPositions(),
    worldState: getWorldState(),
    frameCount: frames.length,
    capturedAt: Date.now(),
  };

  snapshots.push(snapshot);

  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots = snapshots.slice(snapshots.length - MAX_SNAPSHOTS);
  }

  return snapshot;
}

export function getSnapshot(index: number): TemporalSnapshot | null {
  return snapshots[index] ?? null;
}

export function getSnapshotCount(): number {
  return snapshots.length;
}

export function getSnapshots(): TemporalSnapshot[] {
  return [...snapshots];
}

// ─── Clear All ──────────────────────────────────────────────

export function clearSpatialMemory(): void {
  agentPositions = new Map();
  worldVectors = new Map();
  frames = [];
  scenes = [];
  snapshots = [];
  frameCounter = 0;
  sceneCounter = 0;
  snapshotCounter = 0;
}
