"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAgentPosition = updateAgentPosition;
exports.removeAgent = removeAgent;
exports.getAgentPositions = getAgentPositions;
exports.getAgentCount = getAgentCount;
exports.setWorldVector = setWorldVector;
exports.getWorldVector = getWorldVector;
exports.getWorldState = getWorldState;
exports.pushFrame = pushFrame;
exports.getFrames = getFrames;
exports.getFrameCount = getFrameCount;
exports.getLatestFrame = getLatestFrame;
exports.addScene = addScene;
exports.getSceneHistory = getSceneHistory;
exports.getSceneCount = getSceneCount;
exports.captureSnapshot = captureSnapshot;
exports.getSnapshot = getSnapshot;
exports.getSnapshotCount = getSnapshotCount;
exports.getSnapshots = getSnapshots;
exports.clearSpatialMemory = clearSpatialMemory;
// ─── Constants ──────────────────────────────────────────────
const MAX_FRAMES = 500;
const MAX_SCENES = 200;
const MAX_SNAPSHOTS = 100;
// ─── State ──────────────────────────────────────────────────
let agentPositions = new Map();
let worldVectors = new Map();
let frames = [];
let scenes = [];
let snapshots = [];
let frameCounter = 0;
let sceneCounter = 0;
let snapshotCounter = 0;
// ─── Agent Positions ────────────────────────────────────────
function updateAgentPosition(id, pos) {
    const existing = agentPositions.get(id);
    const updated = {
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
function removeAgent(id) {
    return agentPositions.delete(id);
}
function getAgentPositions() {
    return Array.from(agentPositions.values());
}
function getAgentCount() {
    return agentPositions.size;
}
// ─── World-State Vectors ────────────────────────────────────
function setWorldVector(key, dimensions) {
    const magnitude = Math.sqrt(dimensions.reduce((sum, d) => sum + d * d, 0));
    const vec = {
        key,
        dimensions,
        magnitude,
        timestamp: Date.now(),
    };
    worldVectors.set(key, vec);
    return vec;
}
function getWorldVector(key) {
    return worldVectors.get(key) ?? null;
}
function getWorldState() {
    const state = {};
    Array.from(worldVectors.entries()).forEach(([k, v]) => {
        state[k] = v;
    });
    return state;
}
// ─── Simulation Frames ──────────────────────────────────────
function pushFrame(overrides) {
    frameCounter++;
    const frame = {
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
function getFrames(start, end) {
    if (start !== undefined && end !== undefined) {
        return frames.slice(start, end);
    }
    return [...frames];
}
function getFrameCount() {
    return frames.length;
}
function getLatestFrame() {
    return frames.length > 0 ? frames[frames.length - 1] : null;
}
// ─── Scene History ──────────────────────────────────────────
function addScene(sourceEngine, metadata = {}) {
    sceneCounter++;
    const scene = {
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
function getSceneHistory() {
    return [...scenes];
}
function getSceneCount() {
    return scenes.length;
}
// ─── Temporal Snapshots ─────────────────────────────────────
function captureSnapshot() {
    snapshotCounter++;
    const snapshot = {
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
function getSnapshot(index) {
    return snapshots[index] ?? null;
}
function getSnapshotCount() {
    return snapshots.length;
}
function getSnapshots() {
    return [...snapshots];
}
// ─── Clear All ──────────────────────────────────────────────
function clearSpatialMemory() {
    agentPositions = new Map();
    worldVectors = new Map();
    frames = [];
    scenes = [];
    snapshots = [];
    frameCounter = 0;
    sceneCounter = 0;
    snapshotCounter = 0;
}
