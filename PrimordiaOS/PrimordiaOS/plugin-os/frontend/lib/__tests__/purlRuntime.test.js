"use strict";
// ============================================================
//   PURL RUNTIME — Test Suite
// ============================================================
//
//   Tests the full PURL pipeline:
//     routing · execution · safety · PVE · telemetry · state
//
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const purlRuntime_1 = require("../purlRuntime");
const purlSafety_1 = require("../purlSafety");
const swarmLogger_1 = __importDefault(require("../swarmLogger"));
// ─── Setup ──────────────────────────────────────────────────
(0, vitest_1.beforeEach)(() => {
    swarmLogger_1.default.clearEvents();
});
// ─── Phase 1: PURL Core ─────────────────────────────────────
(0, vitest_1.describe)("PURL Core", () => {
    (0, vitest_1.it)("startPURL sets loopActive = true", () => {
        (0, purlRuntime_1.startPURL)();
        const state = (0, purlRuntime_1.getRuntimeState)();
        (0, vitest_1.expect)(state.loopActive).toBe(true);
    });
    (0, vitest_1.it)("generateTraceId returns unique IDs", () => {
        const ids = new Set(Array.from({ length: 50 }, () => (0, purlRuntime_1.generateTraceId)()));
        (0, vitest_1.expect)(ids.size).toBe(50);
    });
    (0, vitest_1.it)("generateTraceId starts with 'purl-'", () => {
        const id = (0, purlRuntime_1.generateTraceId)();
        (0, vitest_1.expect)(id.startsWith("purl-")).toBe(true);
    });
});
// ─── Phase 2: Engine Routing ────────────────────────────────
(0, vitest_1.describe)("Engine Routing", () => {
    (0, vitest_1.it)("routes 'simulation.run' to swarmCoreEngine", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("simulation.run");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("swarmCoreEngine");
    });
    (0, vitest_1.it)("routes 'agent.spawn' to replicatorEngine", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("agent.spawn");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("replicatorEngine");
    });
    (0, vitest_1.it)("routes 'world.update' to temporalEngine", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("world.update");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("temporalEngine");
    });
    (0, vitest_1.it)("routes 'agent.modify' to selfModEngine", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("agent.modify");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("selfModEngine");
    });
    (0, vitest_1.it)("routes 'cloud.exec' to cloudNodeEngine", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("cloud.exec");
        (0, vitest_1.expect)(result.status).toBe("OK");
        (0, vitest_1.expect)(result.engineRoute).toBe("cloudNodeEngine");
    });
    (0, vitest_1.it)("returns ERROR for unknown intent", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("unknown.bogus");
        (0, vitest_1.expect)(result.status).toBe("ERROR");
        (0, vitest_1.expect)(result.engineRoute).toBeNull();
        (0, vitest_1.expect)(result.payload).toHaveProperty("availableIntents");
    });
    (0, vitest_1.it)("getAvailableIntents returns all registered intents", () => {
        const intents = (0, purlRuntime_1.getAvailableIntents)();
        (0, vitest_1.expect)(intents).toContain("simulation.run");
        (0, vitest_1.expect)(intents).toContain("agent.spawn");
        (0, vitest_1.expect)(intents).toContain("world.update");
        (0, vitest_1.expect)(intents).toContain("cloud.exec");
        (0, vitest_1.expect)(intents.length).toBeGreaterThanOrEqual(9);
    });
    (0, vitest_1.it)("getEngineCount returns 6", () => {
        (0, vitest_1.expect)((0, purlRuntime_1.getEngineCount)()).toBe(6);
    });
});
// ─── Phase 3: Runtime Safety ────────────────────────────────
(0, vitest_1.describe)("Safe Mode", () => {
    (0, vitest_1.it)("blocks 'system.destroy'", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("system.destroy");
        (0, vitest_1.expect)(result.status).toBe("BLOCKED");
        (0, vitest_1.expect)(result.violations.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.violations[0]).toContain("SAFE_MODE");
    });
    (0, vitest_1.it)("blocks 'kernel.override'", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("kernel.override");
        (0, vitest_1.expect)(result.status).toBe("BLOCKED");
        (0, vitest_1.expect)(result.violations.some((v) => v.includes("SAFE_MODE"))).toBe(true);
    });
    (0, vitest_1.it)("blocks all SAFE_MODE_BLOCKED intents", () => {
        for (const blocked of purlSafety_1.SAFE_MODE_BLOCKED) {
            const validation = (0, purlSafety_1.validateCommand)(blocked, {});
            (0, vitest_1.expect)(validation.allowed).toBe(false);
        }
    });
});
(0, vitest_1.describe)("PVE Kernel Protection", () => {
    (0, vitest_1.it)("rejects payload targeting 'kernel' entity", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("agent.modify", { target: "kernel" });
        (0, vitest_1.expect)(result.status).toBe("BLOCKED");
        (0, vitest_1.expect)(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
    });
    (0, vitest_1.it)("rejects payload targeting 'root' entity", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("agent.modify", { target: "root" });
        (0, vitest_1.expect)(result.status).toBe("BLOCKED");
        (0, vitest_1.expect)(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
    });
    (0, vitest_1.it)("rejects payload targeting 'worldstate' entity", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("agent.modify", { target: "worldstate" });
        (0, vitest_1.expect)(result.status).toBe("BLOCKED");
        (0, vitest_1.expect)(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
    });
    (0, vitest_1.it)("allows payload targeting non-protected entity", () => {
        const validation = (0, purlSafety_1.validateCommand)("agent.modify", { target: "agent-123" });
        (0, vitest_1.expect)(validation.allowed).toBe(true);
        (0, vitest_1.expect)(validation.violations).toHaveLength(0);
    });
});
// ─── Phase 4: Telemetry & State ─────────────────────────────
(0, vitest_1.describe)("Telemetry & State Tracking", () => {
    (0, vitest_1.it)("executionTimeMs is tracked and > 0", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("simulation.run");
        (0, vitest_1.expect)(result.executionTimeMs).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("runtime state tracks last command and output", async () => {
        await (0, purlRuntime_1.executePURLCommand)("simulation.run", { steps: 5 });
        const state = (0, purlRuntime_1.getRuntimeState)();
        (0, vitest_1.expect)(state.lastCommand).toBe("simulation.run");
        (0, vitest_1.expect)(state.lastOutput).not.toBeNull();
        (0, vitest_1.expect)(state.lastEngineRoute).toBe("swarmCoreEngine");
        (0, vitest_1.expect)(state.lastTraceId).toBeTruthy();
        (0, vitest_1.expect)(state.lastLatencyMs).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)("swarm logger receives dispatch after execution", async () => {
        swarmLogger_1.default.clearEvents();
        await (0, purlRuntime_1.executePURLCommand)("agent.spawn", { template: "test" });
        const events = swarmLogger_1.default.getEvents({ source: "PURL" });
        // At least 1 event (the command execution, plus possibly boot event)
        (0, vitest_1.expect)(events.length).toBeGreaterThanOrEqual(1);
        const lastEvent = events[events.length - 1];
        (0, vitest_1.expect)(lastEvent.intent).toBe("agent.spawn");
        (0, vitest_1.expect)(lastEvent.engineRoute).toBe("replicatorEngine");
    });
    (0, vitest_1.it)("swarm logger subscribe receives real-time events", async () => {
        const received = [];
        const unsub = swarmLogger_1.default.subscribe((ev) => received.push(ev));
        await (0, purlRuntime_1.executePURLCommand)("world.query");
        unsub();
        (0, vitest_1.expect)(received.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("commandCount increments on each execution", async () => {
        const before = (0, purlRuntime_1.getRuntimeState)().commandCount;
        await (0, purlRuntime_1.executePURLCommand)("simulation.step");
        const after = (0, purlRuntime_1.getRuntimeState)().commandCount;
        (0, vitest_1.expect)(after).toBe(before + 1);
    });
});
// ─── Phase 5: Result Formatting ─────────────────────────────
(0, vitest_1.describe)("Result Formatting", () => {
    (0, vitest_1.it)("result contains all required fields", async () => {
        const result = await (0, purlRuntime_1.executePURLCommand)("simulation.run");
        (0, vitest_1.expect)(result).toHaveProperty("traceId");
        (0, vitest_1.expect)(result).toHaveProperty("intent");
        (0, vitest_1.expect)(result).toHaveProperty("engineRoute");
        (0, vitest_1.expect)(result).toHaveProperty("status");
        (0, vitest_1.expect)(result).toHaveProperty("executionTimeMs");
        (0, vitest_1.expect)(result).toHaveProperty("payload");
        (0, vitest_1.expect)(result).toHaveProperty("violations");
        (0, vitest_1.expect)(result).toHaveProperty("timestamp");
    });
    (0, vitest_1.it)("traceId is unique across multiple executions", async () => {
        const r1 = await (0, purlRuntime_1.executePURLCommand)("simulation.run");
        const r2 = await (0, purlRuntime_1.executePURLCommand)("agent.spawn");
        const r3 = await (0, purlRuntime_1.executePURLCommand)("world.query");
        (0, vitest_1.expect)(new Set([r1.traceId, r2.traceId, r3.traceId]).size).toBe(3);
    });
});
