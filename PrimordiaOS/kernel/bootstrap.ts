// kernel/bootstrap.ts

import WebSocket from "ws";
import { runSovereignTick } from "../autonomy/sovereign-scheduler";
import { handleUnrealStateUpdate } from "../autonomy/unreal-loop";
import { handleCockpitEvent } from "../autonomy/cockpit-loop";
import { updateGlobalState } from "../autonomy/global-state";

// -------------------------------
// 1. Sovereign Heartbeat
// -------------------------------

const SOVEREIGN_INTERVAL_MS = 1000; // 1-second tick

setInterval(() => {
  const result = runSovereignTick();

  console.log("[SOVEREIGN TICK]", {
    ts: result.timestamp,
    gen: result.evolution.generation,
    allocations: result.allocations.map((a) => ({
      realm: a.realm,
      priority: a.priority,
    })),
  });
}, SOVEREIGN_INTERVAL_MS);

// -------------------------------
// 2. Unreal Telemetry Wiring
// -------------------------------

const unrealSocket = new WebSocket("ws://localhost:8080/unreal");

unrealSocket.on("open", () => {
  console.log("[UNREAL] Connected");
});

unrealSocket.on("message", (msg) => {
  try {
    const telemetry = JSON.parse(msg.toString());
    const state = handleUnrealStateUpdate({
      timestamp: Date.now(),
      snapshot: telemetry,
    });

    console.log("[UNREAL] State updated");
  } catch (err) {
    console.error("[UNREAL] Bad telemetry:", err);
  }
});

// -------------------------------
// 3. Cockpit Event Wiring
// -------------------------------

const cockpitSocket = new WebSocket("ws://localhost:8080/cockpit");

cockpitSocket.on("open", () => {
  console.log("[COCKPIT] Connected");
});

cockpitSocket.on("message", (msg) => {
  try {
    const evt = JSON.parse(msg.toString());
    const state = handleCockpitEvent({
      id: evt.id || `evt-${Date.now()}`,
      type: evt.type,
      payload: evt.payload,
      at: Date.now(),
    });

    console.log("[COCKPIT] Event processed:", evt.type);
  } catch (err) {
    console.error("[COCKPIT] Bad event:", err);
  }
});

// -------------------------------
// 4. Agent Activity Wiring
// -------------------------------

function reportAgentActivity(agentId: string, taskId: string) {
  updateGlobalState({
    agents: {
      active: (updateGlobalState({}).agents.active || 0) + 1,
      lastTask: taskId,
    },
  });

  console.log("[AGENTS] Agent activity:", { agentId, taskId });
}

// Example usage:
// reportAgentActivity("agent-1", "task-42");

// -------------------------------
// 5. Kernel Ready
// -------------------------------

console.log("[KERNEL] PrimordiaOS autonomy spine initialized");
