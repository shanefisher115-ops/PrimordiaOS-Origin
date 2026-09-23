// ============================================================
//   PURL RUNTIME — Test Suite
// ============================================================
//
//   Tests the full PURL pipeline:
//     routing · execution · safety · PVE · telemetry · state
//

import { describe, it, expect, beforeEach } from "vitest";
import {
  startPURL,
  stopPURL,
  executePURLCommand,
  generateTraceId,
  getRuntimeState,
  routeToEngine,
  getAvailableIntents,
  getEngineCount,
} from "../purlRuntime";
import { validateCommand, SAFE_MODE_BLOCKED, PVE_PROTECTED_ENTITIES } from "../purlSafety";
import swarmLogger from "../swarmLogger";

// ─── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  swarmLogger.clearEvents();
});

// ─── Phase 1: PURL Core ─────────────────────────────────────

describe("PURL Core", () => {
  it("startPURL sets loopActive = true", () => {
    startPURL();
    const state = getRuntimeState();
    expect(state.loopActive).toBe(true);
  });

  it("generateTraceId returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateTraceId()));
    expect(ids.size).toBe(50);
  });

  it("generateTraceId starts with 'purl-'", () => {
    const id = generateTraceId();
    expect(id.startsWith("purl-")).toBe(true);
  });
});

// ─── Phase 2: Engine Routing ────────────────────────────────

describe("Engine Routing", () => {
  it("routes 'simulation.run' to swarmCoreEngine", async () => {
    const result = await executePURLCommand("simulation.run");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("swarmCoreEngine");
  });

  it("routes 'agent.spawn' to replicatorEngine", async () => {
    const result = await executePURLCommand("agent.spawn");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("replicatorEngine");
  });

  it("routes 'world.update' to temporalEngine", async () => {
    const result = await executePURLCommand("world.update");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("temporalEngine");
  });

  it("routes 'agent.modify' to selfModEngine", async () => {
    const result = await executePURLCommand("agent.modify");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("selfModEngine");
  });

  it("routes 'cloud.exec' to cloudNodeEngine", async () => {
    const result = await executePURLCommand("cloud.exec");
    expect(result.status).toBe("OK");
    expect(result.engineRoute).toBe("cloudNodeEngine");
  });

  it("returns ERROR for unknown intent", async () => {
    const result = await executePURLCommand("unknown.bogus");
    expect(result.status).toBe("ERROR");
    expect(result.engineRoute).toBeNull();
    expect(result.payload).toHaveProperty("availableIntents");
  });

  it("getAvailableIntents returns all registered intents", () => {
    const intents = getAvailableIntents();
    expect(intents).toContain("simulation.run");
    expect(intents).toContain("agent.spawn");
    expect(intents).toContain("world.update");
    expect(intents).toContain("cloud.exec");
    expect(intents.length).toBeGreaterThanOrEqual(9);
  });

  it("getEngineCount returns 6", () => {
    expect(getEngineCount()).toBe(6);
  });
});

// ─── Phase 3: Runtime Safety ────────────────────────────────

describe("Safe Mode", () => {
  it("blocks 'system.destroy'", async () => {
    const result = await executePURLCommand("system.destroy");
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain("SAFE_MODE");
  });

  it("blocks 'kernel.override'", async () => {
    const result = await executePURLCommand("kernel.override");
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("SAFE_MODE"))).toBe(true);
  });

  it("blocks all SAFE_MODE_BLOCKED intents", () => {
    for (const blocked of SAFE_MODE_BLOCKED) {
      const validation = validateCommand(blocked, {});
      expect(validation.allowed).toBe(false);
    }
  });
});

describe("PVE Kernel Protection", () => {
  it("rejects payload targeting 'kernel' entity", async () => {
    const result = await executePURLCommand("agent.modify", { target: "kernel" });
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
  });

  it("rejects payload targeting 'root' entity", async () => {
    const result = await executePURLCommand("agent.modify", { target: "root" });
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
  });

  it("rejects payload targeting 'worldstate' entity", async () => {
    const result = await executePURLCommand("agent.modify", { target: "worldstate" });
    expect(result.status).toBe("BLOCKED");
    expect(result.violations.some((v) => v.includes("PVE_PROTECTION"))).toBe(true);
  });

  it("allows payload targeting non-protected entity", () => {
    const validation = validateCommand("agent.modify", { target: "agent-123" });
    expect(validation.allowed).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });
});

// ─── Phase 4: Telemetry & State ─────────────────────────────

describe("Telemetry & State Tracking", () => {
  it("executionTimeMs is tracked and > 0", async () => {
    const result = await executePURLCommand("simulation.run");
    expect(result.executionTimeMs).toBeGreaterThan(0);
  });

  it("runtime state tracks last command and output", async () => {
    await executePURLCommand("simulation.run", { steps: 5 });
    const state = getRuntimeState();
    expect(state.lastCommand).toBe("simulation.run");
    expect(state.lastOutput).not.toBeNull();
    expect(state.lastEngineRoute).toBe("swarmCoreEngine");
    expect(state.lastTraceId).toBeTruthy();
    expect(state.lastLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("swarm logger receives dispatch after execution", async () => {
    swarmLogger.clearEvents();
    await executePURLCommand("agent.spawn", { template: "test" });
    const events = swarmLogger.getEvents({ source: "PURL" });
    // At least 1 event (the command execution, plus possibly boot event)
    expect(events.length).toBeGreaterThanOrEqual(1);
    const lastEvent = events[events.length - 1];
    expect(lastEvent.intent).toBe("agent.spawn");
    expect(lastEvent.engineRoute).toBe("replicatorEngine");
  });

  it("swarm logger subscribe receives real-time events", async () => {
    const received: unknown[] = [];
    const unsub = swarmLogger.subscribe((ev) => received.push(ev));

    await executePURLCommand("world.query");

    unsub();

    expect(received.length).toBeGreaterThanOrEqual(1);
  });

  it("commandCount increments on each execution", async () => {
    const before = getRuntimeState().commandCount;
    await executePURLCommand("simulation.step");
    const after = getRuntimeState().commandCount;
    expect(after).toBe(before + 1);
  });
});

// ─── Phase 5: Result Formatting ─────────────────────────────

describe("Result Formatting", () => {
  it("result contains all required fields", async () => {
    const result = await executePURLCommand("simulation.run");
    expect(result).toHaveProperty("traceId");
    expect(result).toHaveProperty("intent");
    expect(result).toHaveProperty("engineRoute");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("executionTimeMs");
    expect(result).toHaveProperty("payload");
    expect(result).toHaveProperty("violations");
    expect(result).toHaveProperty("timestamp");
  });

  it("traceId is unique across multiple executions", async () => {
    const r1 = await executePURLCommand("simulation.run");
    const r2 = await executePURLCommand("agent.spawn");
    const r3 = await executePURLCommand("world.query");
    expect(new Set([r1.traceId, r2.traceId, r3.traceId]).size).toBe(3);
  });
});
