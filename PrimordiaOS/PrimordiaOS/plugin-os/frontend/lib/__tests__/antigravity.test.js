"use strict";
// ============================================================
//   ANTIGRAVITY — Test Suite
// ============================================================
//
//   Tests the full Antigravity visual cognition pipeline:
//     rendering · multimodal engines · PURL routing
//     spatial memory · scene generation · error handling
//     performance stability
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const purlRuntime_1 = require("../purlRuntime");
const antigravityBridge_1 = require("../antigravityBridge");
const spatialMemoryEngine_1 = require("../spatialMemoryEngine");
const multimodalEngines_1 = require("../engines/multimodalEngines");
const swarmLogger_1 = __importDefault(require("../swarmLogger"));
// ─── Setup ──────────────────────────────────────────────────
(0, vitest_1.beforeEach)(() => {
    swarmLogger_1.default.clearEvents();
    (0, spatialMemoryEngine_1.clearSpatialMemory)();
    // Ensure PURL is running and Antigravity is bound
    (0, purlRuntime_1.startPURL)();
    if (!(0, antigravityBridge_1.isAntigravityBound)()) {
        (0, antigravityBridge_1.bindAntigravityToPURL)();
    }
});
// ─── Phase 1: Rendering Pipeline ────────────────────────────
(0, vitest_1.describe)("Rendering Pipeline", () => {
    (0, vitest_1.it)("simulation.render returns valid render payload", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("simulation.render");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("antigravityEngine");
        (0, vitest_1.expect)(result.payload).toHaveProperty("frameId");
        (0, vitest_1.expect)(result.payload).toHaveProperty("renderId");
        (0, vitest_1.expect)(result.payload).toHaveProperty("renderTimeMs");
        (0, vitest_1.expect)(result.payload).toHaveProperty("resolution");
    });
    (0, vitest_1.it)("render IDs are unique across calls", async () => {
        const r1 = await (0, purlRuntime_1.executePURLCommand)("simulation.render");
        const r2 = await (0, purlRuntime_1.executePURLCommand)("simulation.render");
        (0, vitest_1.expect)(r1.payload.renderId).not.toBe(r2.payload.renderId);
        (0, vitest_1.expect)(r1.payload.frameId).not.toBe(r2.payload.frameId);
    });
    (0, vitest_1.it)("render metadata contains all required fields", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("simulation.render");
        const p = result.payload;
        (0, vitest_1.expect)(p).toHaveProperty("action", "render");
        (0, vitest_1.expect)(p).toHaveProperty("resolution");
        (0, vitest_1.expect)(p).toHaveProperty("agentCount");
        (0, vitest_1.expect)(p).toHaveProperty("tick");
        (0, vitest_1.expect)(typeof p.renderTimeMs).toBe("number");
    });
});
// ─── Phase 2: Multimodal Engine Calls ───────────────────────
(0, vitest_1.describe)("Multimodal Engine Calls", () => {
    (0, vitest_1.it)("each multimodal stub returns correct type", async () => {
        const flow = await (0, multimodalEngines_1.invokeFlow)("test");
        (0, vitest_1.expect)(flow.type).toBe("image");
        (0, vitest_1.expect)(flow.engine).toBe("Flow");
        const vids = await (0, multimodalEngines_1.invokeVids)("test");
        (0, vitest_1.expect)(vids.type).toBe("video");
        (0, vitest_1.expect)(vids.engine).toBe("Vids");
        const genie = await (0, multimodalEngines_1.invokeGenie3)();
        (0, vitest_1.expect)(genie.type).toBe("worldModel");
        (0, vitest_1.expect)(genie.engine).toBe("Genie3");
        const vision = await (0, multimodalEngines_1.invokeCloudVision)();
        (0, vitest_1.expect)(vision.type).toBe("analysis");
        (0, vitest_1.expect)(vision.engine).toBe("CloudVision");
        const overmind = await (0, multimodalEngines_1.invokeOvermindViz)();
        (0, vitest_1.expect)(overmind.type).toBe("agentMap");
        (0, vitest_1.expect)(overmind.engine).toBe("OvermindViz");
    });
    (0, vitest_1.it)("multimodal latency is within expected bounds", async () => {
        const result = await (0, multimodalEngines_1.invokeFlow)("test");
        (0, vitest_1.expect)(result.latencyMs).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.latencyMs).toBeLessThan(500);
        (0, vitest_1.expect)(result.generatedAt).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("getMultimodalEngineNames returns all 5 engines", () => {
        const names = (0, multimodalEngines_1.getMultimodalEngineNames)();
        (0, vitest_1.expect)(names).toContain("Flow");
        (0, vitest_1.expect)(names).toContain("Vids");
        (0, vitest_1.expect)(names).toContain("Genie3");
        (0, vitest_1.expect)(names).toContain("CloudVision");
        (0, vitest_1.expect)(names).toContain("OvermindViz");
        (0, vitest_1.expect)(names.length).toBe(5);
    });
});
// ─── Phase 3: PURL → Antigravity Routing ────────────────────
(0, vitest_1.describe)("PURL → Antigravity Routing", () => {
    (0, vitest_1.it)("all 5 Antigravity intents route to antigravityEngine", async () => {
        for (const intent of antigravityBridge_1.ANTIGRAVITY_INTENTS) {
            const result = await (0, purlRuntime_1.executePURLCommand)(intent);
            (0, vitest_1.expect)(result.engineRoute).toBe("antigravityEngine");
            (0, vitest_1.expect)(result.status).toBe("OK");
        }
    });
    (0, vitest_1.it)("bind/unbind toggle works correctly", () => {
        (0, vitest_1.expect)((0, antigravityBridge_1.isAntigravityBound)()).toBe(true);
        (0, antigravityBridge_1.unbindAntigravityFromPURL)();
        (0, vitest_1.expect)((0, antigravityBridge_1.isAntigravityBound)()).toBe(false);
        // Rebind for other tests
        (0, antigravityBridge_1.bindAntigravityToPURL)();
        (0, vitest_1.expect)((0, antigravityBridge_1.isAntigravityBound)()).toBe(true);
    });
    (0, vitest_1.it)("unknown intents still return ERROR after Antigravity bind", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("unknown.bogus");
        (0, vitest_1.expect)(result.status).toBe("ERROR");
        (0, vitest_1.expect)(result.engineRoute).toBeNull();
    });
    (0, vitest_1.it)("engine count is 6 after Antigravity bind", () => {
        (0, vitest_1.expect)((0, purlRuntime_1.getEngineCount)()).toBe(6);
    });
});
// ─── Phase 4: Spatial Memory Updates ────────────────────────
(0, vitest_1.describe)("Spatial Memory Updates", () => {
    (0, vitest_1.it)("agent positions store and retrieve correctly", () => {
        (0, spatialMemoryEngine_1.updateAgentPosition)("agent-test-1", { x: 50, y: 75, z: 10, velocity: 3, state: "active" });
        (0, spatialMemoryEngine_1.updateAgentPosition)("agent-test-2", { x: 20, y: 30, z: 5, velocity: 1, state: "idle" });
        const agents = (0, spatialMemoryEngine_1.getAgentPositions)();
        (0, vitest_1.expect)(agents.length).toBe(2);
        (0, vitest_1.expect)((0, spatialMemoryEngine_1.getAgentCount)()).toBe(2);
        const a1 = agents.find((a) => a.id === "agent-test-1");
        (0, vitest_1.expect)(a1).toBeDefined();
        (0, vitest_1.expect)(a1.x).toBe(50);
        (0, vitest_1.expect)(a1.state).toBe("active");
    });
    (0, vitest_1.it)("world vectors update and compute magnitude", () => {
        const vec = (0, spatialMemoryEngine_1.setWorldVector)("energy", [3, 4]);
        (0, vitest_1.expect)(vec.magnitude).toBe(5); // 3-4-5 triangle
        (0, vitest_1.expect)(vec.key).toBe("energy");
        const retrieved = (0, spatialMemoryEngine_1.getWorldVector)("energy");
        (0, vitest_1.expect)(retrieved).not.toBeNull();
        (0, vitest_1.expect)(retrieved.dimensions).toEqual([3, 4]);
        const state = (0, spatialMemoryEngine_1.getWorldState)();
        (0, vitest_1.expect)(state).toHaveProperty("energy");
    });
    (0, vitest_1.it)("frame ring buffer enforces max limit", () => {
        // Push 510 frames — buffer should cap at 500
        for (let i = 0; i < 510; i++) {
            (0, spatialMemoryEngine_1.pushFrame)({ tick: i });
        }
        (0, vitest_1.expect)((0, spatialMemoryEngine_1.getFrameCount)()).toBeLessThanOrEqual(500);
        (0, vitest_1.expect)((0, spatialMemoryEngine_1.getFrameCount)()).toBeGreaterThan(0);
    });
});
// ─── Phase 5: Scene Generation ──────────────────────────────
(0, vitest_1.describe)("Scene Generation", () => {
    (0, vitest_1.it)("scene history appends correctly", () => {
        (0, spatialMemoryEngine_1.addScene)("Flow", { prompt: "test" });
        (0, spatialMemoryEngine_1.addScene)("Vids", { prompt: "test2" });
        const history = (0, spatialMemoryEngine_1.getSceneHistory)();
        (0, vitest_1.expect)(history.length).toBe(2);
        (0, vitest_1.expect)(history[0].sourceEngine).toBe("Flow");
        (0, vitest_1.expect)(history[1].sourceEngine).toBe("Vids");
    });
    (0, vitest_1.it)("generated scenes contain required metadata", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("scene.generate", {
            prompt: "cosmic test",
            engine: "Flow",
        });
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.payload).toHaveProperty("sceneId");
        (0, vitest_1.expect)(result.payload).toHaveProperty("sourceEngine", "Flow");
        (0, vitest_1.expect)(result.payload).toHaveProperty("multimodalType", "image");
        (0, vitest_1.expect)(result.payload).toHaveProperty("multimodalLatencyMs");
        (0, vitest_1.expect)(result.payload).toHaveProperty("sceneCount");
    });
});
// ─── Phase 6: Error Handling ────────────────────────────────
(0, vitest_1.describe)("Error Handling", () => {
    (0, vitest_1.it)("scene.generate with unknown engine returns ERROR", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("scene.generate", {
            engine: "NonExistentEngine",
        });
        (0, vitest_1.expect)(result.status).toBe("ERROR");
        (0, vitest_1.expect)(result.payload).toHaveProperty("availableEngines");
    });
    (0, vitest_1.it)("missing required fields don't crash the engine", async () => {
        // All intents should handle empty payload gracefully
        const intents = [
            "simulation.render",
            "world.project",
            "agent.visualize",
            "memory.spatial.map",
            "scene.generate",
        ];
        for (const intent of intents) {
            const result = await (0, purlRuntime_1.executePURLCommand)(intent);
            (0, vitest_1.expect)(["OK", "ERROR"]).toContain(result.status);
            (0, vitest_1.expect)(result.engineRoute).toBe("antigravityEngine");
        }
    });
});
// ─── Phase 7: Performance Stability ─────────────────────────
(0, vitest_1.describe)("Performance Stability", () => {
    (0, vitest_1.it)("100 rapid commands complete without state corruption", async () => {
        const promises = [];
        // Mix different Antigravity intents
        for (let i = 0; i < 100; i++) {
            const intent = antigravityBridge_1.ANTIGRAVITY_INTENTS[i % antigravityBridge_1.ANTIGRAVITY_INTENTS.length];
            promises.push((0, purlRuntime_1.executePURLCommand)(intent));
        }
        const results = await Promise.all(promises);
        // All should complete without throwing
        (0, vitest_1.expect)(results.length).toBe(100);
        // All should have valid status
        for (const result of results) {
            (0, vitest_1.expect)(["OK", "ERROR"]).toContain(result.status);
            (0, vitest_1.expect)(result.engineRoute).toBe("antigravityEngine");
            (0, vitest_1.expect)(result.traceId).toBeTruthy();
        }
        // Spatial memory should be consistent (no NaN, no undefined)
        const agents = (0, spatialMemoryEngine_1.getAgentPositions)();
        for (const agent of agents) {
            (0, vitest_1.expect)(Number.isFinite(agent.x)).toBe(true);
            (0, vitest_1.expect)(Number.isFinite(agent.y)).toBe(true);
        }
    });
});
