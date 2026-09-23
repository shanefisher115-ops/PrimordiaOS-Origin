// ============================================================
//   ANTIGRAVITY — Test Suite
// ============================================================
//
//   Tests the full Antigravity visual cognition pipeline:
//     rendering · multimodal engines · PURL routing
//     spatial memory · scene generation · error handling
//     performance stability
//

import { describe, it, expect, beforeEach } from "vitest";
import {
  executePURLCommand,
  startPURL,
  getAvailableIntents,
  getEngineCount,
} from "../purlRuntime";
import {
  bindAntigravityToPURL,
  unbindAntigravityFromPURL,
  isAntigravityBound,
  ANTIGRAVITY_INTENTS,
} from "../antigravityBridge";
import {
  updateAgentPosition,
  getAgentPositions,
  getAgentCount,
  setWorldVector,
  getWorldState,
  getWorldVector,
  pushFrame,
  getFrames,
  getFrameCount,
  addScene,
  getSceneHistory,
  getSceneCount,
  captureSnapshot,
  getSnapshot,
  getSnapshotCount,
  clearSpatialMemory,
} from "../spatialMemoryEngine";
import {
  invokeFlow,
  invokeVids,
  invokeGenie3,
  invokeCloudVision,
  invokeOvermindViz,
  getMultimodalEngineNames,
} from "../engines/multimodalEngines";
import swarmLogger from "../swarmLogger";

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  swarmLogger.clearEvents();
  clearSpatialMemory();

  // Ensure PURL is running and Antigravity is bound
  startPURL();
  if (!isAntigravityBound()) {
    bindAntigravityToPURL();
  }
});

// ─── Phase 1: Rendering Pipeline ────────────────────────────

describe("Rendering Pipeline", () => {
  it("simulation.render returns valid render payload", async () => {
    const result = await executePURLCommand("simulation.render");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("antigravityEngine");
    expect(result.payload).toHaveProperty("frameId");
    expect(result.payload).toHaveProperty("renderId");
    expect(result.payload).toHaveProperty("renderTimeMs");
    expect(result.payload).toHaveProperty("resolution");
  });

  it("render IDs are unique across calls", async () => {
    const r1 = await executePURLCommand("simulation.render");
    const r2 = await executePURLCommand("simulation.render");
    expect(r1.payload.renderId).not.toBe(r2.payload.renderId);
    expect(r1.payload.frameId).not.toBe(r2.payload.frameId);
  });

  it("render metadata contains all required fields", async () => {
    const result = await executePURLCommand("simulation.render");
    const p = result.payload;
    expect(p).toHaveProperty("action", "render");
    expect(p).toHaveProperty("resolution");
    expect(p).toHaveProperty("agentCount");
    expect(p).toHaveProperty("tick");
    expect(typeof p.renderTimeMs).toBe("number");
  });
});

// ─── Phase 2: Multimodal Engine Calls ───────────────────────

describe("Multimodal Engine Calls", () => {
  it("each multimodal stub returns correct type", async () => {
    const flow = await invokeFlow("test");
    expect(flow.type).toBe("image");
    expect(flow.engine).toBe("Flow");

    const vids = await invokeVids("test");
    expect(vids.type).toBe("video");
    expect(vids.engine).toBe("Vids");

    const genie = await invokeGenie3();
    expect(genie.type).toBe("worldModel");
    expect(genie.engine).toBe("Genie3");

    const vision = await invokeCloudVision();
    expect(vision.type).toBe("analysis");
    expect(vision.engine).toBe("CloudVision");

    const overmind = await invokeOvermindViz();
    expect(overmind.type).toBe("agentMap");
    expect(overmind.engine).toBe("OvermindViz");
  });

  it("multimodal latency is within expected bounds", async () => {
    const result = await invokeFlow("test");
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.latencyMs).toBeLessThan(500);
    expect(result.generatedAt).toBeGreaterThan(0);
  });

  it("getMultimodalEngineNames returns all 5 engines", () => {
    const names = getMultimodalEngineNames();
    expect(names).toContain("Flow");
    expect(names).toContain("Vids");
    expect(names).toContain("Genie3");
    expect(names).toContain("CloudVision");
    expect(names).toContain("OvermindViz");
    expect(names.length).toBe(5);
  });
});

// ─── Phase 3: PURL → Antigravity Routing ────────────────────

describe("PURL → Antigravity Routing", () => {
  it("all 5 Antigravity intents route to antigravityEngine", async () => {
    for (const intent of ANTIGRAVITY_INTENTS) {
      const result = await executePURLCommand(intent);
      expect(result.engineRoute).toBe("antigravityEngine");
      expect(result.status).toBe("OK");
    }
  });

  it("bind/unbind toggle works correctly", () => {
    expect(isAntigravityBound()).toBe(true);

    unbindAntigravityFromPURL();
    expect(isAntigravityBound()).toBe(false);

    // Rebind for other tests
    bindAntigravityToPURL();
    expect(isAntigravityBound()).toBe(true);
  });

  it("unknown intents still return ERROR after Antigravity bind", async () => {
    const result = await executePURLCommand("unknown.bogus");
    expect(result.status).toBe("ERROR");
    expect(result.engineRoute).toBeNull();
  });

  it("engine count is 6 after Antigravity bind", () => {
    expect(getEngineCount()).toBe(6);
  });
});

// ─── Phase 4: Spatial Memory Updates ────────────────────────

describe("Spatial Memory Updates", () => {
  it("agent positions store and retrieve correctly", () => {
    updateAgentPosition("agent-test-1", { x: 50, y: 75, z: 10, velocity: 3, state: "active" });
    updateAgentPosition("agent-test-2", { x: 20, y: 30, z: 5, velocity: 1, state: "idle" });

    const agents = getAgentPositions();
    expect(agents.length).toBe(2);
    expect(getAgentCount()).toBe(2);

    const a1 = agents.find((a) => a.id === "agent-test-1");
    expect(a1).toBeDefined();
    expect(a1!.x).toBe(50);
    expect(a1!.state).toBe("active");
  });

  it("world vectors update and compute magnitude", () => {
    const vec = setWorldVector("energy", [3, 4]);
    expect(vec.magnitude).toBe(5); // 3-4-5 triangle
    expect(vec.key).toBe("energy");

    const retrieved = getWorldVector("energy");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.dimensions).toEqual([3, 4]);

    const state = getWorldState();
    expect(state).toHaveProperty("energy");
  });

  it("frame ring buffer enforces max limit", () => {
    // Push 510 frames — buffer should cap at 500
    for (let i = 0; i < 510; i++) {
      pushFrame({ tick: i });
    }
    expect(getFrameCount()).toBeLessThanOrEqual(500);
    expect(getFrameCount()).toBeGreaterThan(0);
  });
});

// ─── Phase 5: Scene Generation ──────────────────────────────

describe("Scene Generation", () => {
  it("scene history appends correctly", () => {
    addScene("Flow", { prompt: "test" });
    addScene("Vids", { prompt: "test2" });

    const history = getSceneHistory();
    expect(history.length).toBe(2);
    expect(history[0].sourceEngine).toBe("Flow");
    expect(history[1].sourceEngine).toBe("Vids");
  });

  it("generated scenes contain required metadata", async () => {
    const result = await executePURLCommand("scene.generate", {
      prompt: "cosmic test",
      engine: "Flow",
    });

    expect(result.status).toBe("OK");
    expect(result.payload).toHaveProperty("sceneId");
    expect(result.payload).toHaveProperty("sourceEngine", "Flow");
    expect(result.payload).toHaveProperty("multimodalType", "image");
    expect(result.payload).toHaveProperty("multimodalLatencyMs");
    expect(result.payload).toHaveProperty("sceneCount");
  });
});

// ─── Phase 6: Error Handling ────────────────────────────────

describe("Error Handling", () => {
  it("scene.generate with unknown engine returns ERROR", async () => {
    const result = await executePURLCommand("scene.generate", {
      engine: "NonExistentEngine",
    });
    expect(result.status).toBe("ERROR");
    expect(result.payload).toHaveProperty("availableEngines");
  });

  it("missing required fields don't crash the engine", async () => {
    // All intents should handle empty payload gracefully
    const intents = [
      "simulation.render",
      "world.project",
      "agent.visualize",
      "memory.spatial.map",
      "scene.generate",
    ];

    for (const intent of intents) {
      const result = await executePURLCommand(intent);
      expect(["OK", "ERROR"]).toContain(result.status);
      expect(result.engineRoute).toBe("antigravityEngine");
    }
  });
});

// ─── Phase 7: Performance Stability ─────────────────────────

describe("Performance Stability", () => {
  it("100 rapid commands complete without state corruption", async () => {
    const promises = [];

    // Mix different Antigravity intents
    for (let i = 0; i < 100; i++) {
      const intent = ANTIGRAVITY_INTENTS[i % ANTIGRAVITY_INTENTS.length];
      promises.push(executePURLCommand(intent));
    }

    const results = await Promise.all(promises);

    // All should complete without throwing
    expect(results.length).toBe(100);

    // All should have valid status
    for (const result of results) {
      expect(["OK", "ERROR"]).toContain(result.status);
      expect(result.engineRoute).toBe("antigravityEngine");
      expect(result.traceId).toBeTruthy();
    }

    // Spatial memory should be consistent (no NaN, no undefined)
    const agents = getAgentPositions();
    for (const agent of agents) {
      expect(Number.isFinite(agent.x)).toBe(true);
      expect(Number.isFinite(agent.y)).toBe(true);
    }
  });
});
