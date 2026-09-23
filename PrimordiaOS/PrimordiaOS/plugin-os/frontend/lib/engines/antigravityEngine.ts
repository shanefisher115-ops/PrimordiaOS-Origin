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

import type { EngineResult } from "./selfModEngine";
import {
  getAgentPositions,
  getAgentCount,
  getWorldState,
  pushFrame,
  getLatestFrame,
  getFrameCount,
  addScene,
  getSceneHistory,
  captureSnapshot,
  updateAgentPosition,
  setWorldVector,
} from "../spatialMemoryEngine";
import {
  invokeFlow,
  invokeVids,
  invokeGenie3,
  invokeCloudVision,
  invokeOvermindViz,
} from "./multimodalEngines";
import type { MultimodalResult } from "./multimodalEngines";

const ENGINE_NAME = "antigravityEngine";

// ─── Render Counter ─────────────────────────────────────────

let renderCounter = 0;

export function getRenderCount(): number {
  return renderCounter;
}

// ─── Execute ────────────────────────────────────────────────

export async function execute(
  intent: string,
  payload: Record<string, unknown>
): Promise<EngineResult> {
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

async function handleSimulationRender(
  payload: Record<string, unknown>
): Promise<EngineResult> {
  renderCounter++;
  const renderStart = performance.now();

  // Capture a frame snapshot
  const frame = pushFrame();

  // Optionally invoke a multimodal engine for visualization
  let multimodalOutput: MultimodalResult | null = null;
  const engine = payload.multimodalEngine as string | undefined;

  if (engine === "OvermindViz") {
    const agentIds = getAgentPositions().map((a) => a.id);
    multimodalOutput = await invokeOvermindViz(agentIds);
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

async function handleWorldProject(
  payload: Record<string, unknown>
): Promise<EngineResult> {
  renderCounter++;
  const renderStart = performance.now();

  // Invoke Genie 3 for world-model projection
  const worldState = getWorldState();
  const genie3Result = await invokeGenie3(worldState as Record<string, unknown>, {
    steps: payload.steps ?? 10,
  });

  // Update world vectors from projection
  const stateVector = genie3Result.payload.stateVector as number[];
  if (stateVector) {
    setWorldVector("projection", stateVector);
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

async function handleAgentVisualize(
  payload: Record<string, unknown>
): Promise<EngineResult> {
  renderCounter++;
  const renderStart = performance.now();

  // Seed some agents if none exist (for demo purposes)
  if (getAgentCount() === 0) {
    const count = (payload.count as number) ?? 12;
    for (let i = 0; i < count; i++) {
      updateAgentPosition(`agent-${i}`, {
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * 50,
        velocity: Math.random() * 5,
        state: (["active", "idle", "spawning"] as const)[Math.floor(Math.random() * 3)],
      });
    }
  }

  // Invoke OvermindViz for connection topology
  const agents = getAgentPositions();
  const vizResult = await invokeOvermindViz(agents.map((a) => a.id));

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

async function handleSpatialMap(
  payload: Record<string, unknown>
): Promise<EngineResult> {
  const agents = getAgentPositions();
  const worldState = getWorldState();
  const latestFrame = getLatestFrame();

  // Optionally invoke CloudVision for spatial analysis
  let analysisResult: MultimodalResult | null = null;
  if (payload.analyze) {
    analysisResult = await invokeCloudVision("spatial-map", {
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
      frameCount: getFrameCount(),
      latestFrameId: latestFrame?.frameId ?? null,
      analysis: analysisResult?.payload ?? null,
    },
  };
}

async function handleSceneGenerate(
  payload: Record<string, unknown>
): Promise<EngineResult> {
  renderCounter++;
  const renderStart = performance.now();

  const prompt = (payload.prompt as string) ?? "synthetic scene";
  const engineName = (payload.engine as string) ?? "Flow";

  // Route to the appropriate multimodal engine
  let multimodalResult: MultimodalResult;

  switch (engineName) {
    case "Flow":
      multimodalResult = await invokeFlow(prompt, payload);
      break;
    case "Vids":
      multimodalResult = await invokeVids(prompt, payload);
      break;
    case "Genie3":
      multimodalResult = await invokeGenie3(getWorldState() as Record<string, unknown>, payload);
      break;
    case "CloudVision":
      multimodalResult = await invokeCloudVision("scene", payload);
      break;
    case "OvermindViz":
      multimodalResult = await invokeOvermindViz([], payload);
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
  const scene = addScene(engineName, {
    prompt,
    multimodalType: multimodalResult.type,
    ...multimodalResult.payload,
  });

  // Capture temporal snapshot after scene generation
  captureSnapshot();

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
      sceneCount: getSceneHistory().length,
      payload: multimodalResult.payload,
    },
  };
}
