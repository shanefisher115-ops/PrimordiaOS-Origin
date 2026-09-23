"use strict";
// ============================================================
//   ANTIGRAVITY ENGINE — Visual Cognition Engine
// ============================================================
//
//   The rendering engine for PrimordiaOS visual cognition.
//
//   Handles intents:
//     simulation.render     → render simulation state visually
//     world.project         → project world-model to viewport
//     agent.visualize       → map agents to spatial grid
//     memory.spatial.map    → retrieve spatial memory for rendering
//     scene.generate        → generate synthetic scenes
//
//   Integrates with:
//     SpatialMemoryEngine   → agent/world/frame data
//     MultimodalEngines     → Flow, Vids, Genie3, CloudVision, OvermindViz
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRenderCount = getRenderCount;
exports.execute = execute;
const spatialMemoryEngine_1 = require("../spatialMemoryEngine");
const multimodalEngines_1 = require("./multimodalEngines");
const ENGINE_NAME = "antigravityEngine";
// ─── Render Counter ─────────────────────────────────────────
let renderCounter = 0;
function getRenderCount() {
    return renderCounter;
}
// ─── Execute ────────────────────────────────────────────────
async function execute(intent, payload) {
    switch (intent) {
        case "simulation.render":
            return handleSimulationRender(payload);
        case "world.project":
            return handleWorldProject(payload);
        case "agent.visualize":
            return handleAgentVisualize(payload);
        case "memory.spatial.map":
            return handleSpatialMap(payload);
        case "scene.generate":
            return handleSceneGenerate(payload);
        default:
            return {
                engine: ENGINE_NAME,
                status: "ERROR",
                data: { message: `Unsupported intent: ${intent}` },
            };
    }
}
// ─── Intent Handlers ────────────────────────────────────────
async function handleSimulationRender(payload) {
    renderCounter++;
    const renderStart = performance.now();
    // Capture a frame snapshot
    const frame = (0, spatialMemoryEngine_1.pushFrame)();
    // Optionally invoke a multimodal engine for visualization
    let multimodalOutput = null;
    const engine = payload.multimodalEngine;
    if (engine === "OvermindViz") {
        const agentIds = (0, spatialMemoryEngine_1.getAgentPositions)().map((a) => a.id);
        multimodalOutput = await (0, multimodalEngines_1.invokeOvermindViz)(agentIds);
    }
    const renderTimeMs = Math.round(performance.now() - renderStart);
    return {
        engine: ENGINE_NAME,
        status: "OK",
        data: {
            action: "render",
            frameId: frame.frameId,
            renderId: `render-${renderCounter}`,
            renderTimeMs,
            resolution: { width: 1920, height: 1080 },
            agentCount: frame.agentCount,
            tick: frame.tick,
            multimodalEngine: multimodalOutput?.engine ?? null,
            multimodalLatencyMs: multimodalOutput?.latencyMs ?? null,
        },
    };
}
async function handleWorldProject(payload) {
    renderCounter++;
    const renderStart = performance.now();
    // Invoke Genie 3 for world-model projection
    const worldState = (0, spatialMemoryEngine_1.getWorldState)();
    const genie3Result = await (0, multimodalEngines_1.invokeGenie3)(worldState, {
        steps: payload.steps ?? 10,
    });
    // Update world vectors from projection
    const stateVector = genie3Result.payload.stateVector;
    if (stateVector) {
        (0, spatialMemoryEngine_1.setWorldVector)("projection", stateVector);
    }
    const renderTimeMs = Math.round(performance.now() - renderStart);
    return {
        engine: ENGINE_NAME,
        status: "OK",
        data: {
            action: "project",
            renderId: `render-${renderCounter}`,
            renderTimeMs,
            projectionEngine: "Genie3",
            projectionLatencyMs: genie3Result.latencyMs,
            stateVector: genie3Result.payload.stateVector,
            projectedFrames: genie3Result.payload.projectedFrames,
            convergence: genie3Result.payload.convergence,
            worldDimensions: Object.keys(worldState).length,
        },
    };
}
async function handleAgentVisualize(payload) {
    renderCounter++;
    const renderStart = performance.now();
    // Seed some agents if none exist (for demo purposes)
    if ((0, spatialMemoryEngine_1.getAgentCount)() === 0) {
        const count = payload.count ?? 12;
        for (let i = 0; i < count; i++) {
            (0, spatialMemoryEngine_1.updateAgentPosition)(`agent-${i}`, {
                x: Math.random() * 100,
                y: Math.random() * 100,
                z: Math.random() * 50,
                velocity: Math.random() * 5,
                state: ["active", "idle", "spawning"][Math.floor(Math.random() * 3)],
            });
        }
    }
    // Invoke OvermindViz for connection topology
    const agents = (0, spatialMemoryEngine_1.getAgentPositions)();
    const vizResult = await (0, multimodalEngines_1.invokeOvermindViz)(agents.map((a) => a.id));
    const renderTimeMs = Math.round(performance.now() - renderStart);
    return {
        engine: ENGINE_NAME,
        status: "OK",
        data: {
            action: "visualize",
            renderId: `render-${renderCounter}`,
            renderTimeMs,
            agentCount: agents.length,
            agents: agents.map((a) => ({ id: a.id, x: a.x, y: a.y, state: a.state })),
            connections: vizResult.payload.connections,
            clusterCount: vizResult.payload.clusterCount,
            vizLatencyMs: vizResult.latencyMs,
        },
    };
}
async function handleSpatialMap(payload) {
    const agents = (0, spatialMemoryEngine_1.getAgentPositions)();
    const worldState = (0, spatialMemoryEngine_1.getWorldState)();
    const latestFrame = (0, spatialMemoryEngine_1.getLatestFrame)();
    // Optionally invoke CloudVision for spatial analysis
    let analysisResult = null;
    if (payload.analyze) {
        analysisResult = await (0, multimodalEngines_1.invokeCloudVision)("spatial-map", {
            agentCount: agents.length,
        });
    }
    return {
        engine: ENGINE_NAME,
        status: "OK",
        data: {
            action: "spatialMap",
            agentCount: agents.length,
            agents,
            worldVectorCount: Object.keys(worldState).length,
            worldState,
            frameCount: (0, spatialMemoryEngine_1.getFrameCount)(),
            latestFrameId: latestFrame?.frameId ?? null,
            analysis: analysisResult?.payload ?? null,
        },
    };
}
async function handleSceneGenerate(payload) {
    renderCounter++;
    const renderStart = performance.now();
    const prompt = payload.prompt ?? "synthetic scene";
    const engineName = payload.engine ?? "Flow";
    // Route to the appropriate multimodal engine
    let multimodalResult;
    switch (engineName) {
        case "Flow":
            multimodalResult = await (0, multimodalEngines_1.invokeFlow)(prompt, payload);
            break;
        case "Vids":
            multimodalResult = await (0, multimodalEngines_1.invokeVids)(prompt, payload);
            break;
        case "Genie3":
            multimodalResult = await (0, multimodalEngines_1.invokeGenie3)((0, spatialMemoryEngine_1.getWorldState)(), payload);
            break;
        case "CloudVision":
            multimodalResult = await (0, multimodalEngines_1.invokeCloudVision)("scene", payload);
            break;
        case "OvermindViz":
            multimodalResult = await (0, multimodalEngines_1.invokeOvermindViz)([], payload);
            break;
        default:
            return {
                engine: ENGINE_NAME,
                status: "ERROR",
                data: {
                    message: `Unknown multimodal engine: ${engineName}`,
                    availableEngines: ["Flow", "Vids", "Genie3", "CloudVision", "OvermindViz"],
                },
            };
    }
    // Record in scene history
    const scene = (0, spatialMemoryEngine_1.addScene)(engineName, {
        prompt,
        multimodalType: multimodalResult.type,
        ...multimodalResult.payload,
    });
    // Capture temporal snapshot after scene generation
    (0, spatialMemoryEngine_1.captureSnapshot)();
    const renderTimeMs = Math.round(performance.now() - renderStart);
    return {
        engine: ENGINE_NAME,
        status: "OK",
        data: {
            action: "sceneGenerate",
            renderId: `render-${renderCounter}`,
            renderTimeMs,
            sceneId: scene.sceneId,
            sourceEngine: engineName,
            multimodalType: multimodalResult.type,
            multimodalLatencyMs: multimodalResult.latencyMs,
            sceneCount: (0, spatialMemoryEngine_1.getSceneHistory)().length,
            payload: multimodalResult.payload,
        },
    };
}
