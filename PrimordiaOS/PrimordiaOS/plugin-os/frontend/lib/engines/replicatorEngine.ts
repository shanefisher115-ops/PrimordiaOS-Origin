// ============================================================
//   REPLICATOR ENGINE — Overmind Agent Spawning Engine
// ============================================================
//
//   Handles intents: agent.spawn
//   Responsible for creating new agent instances in the swarm.
//

import type { EngineResult } from "./selfModEngine";

const ENGINE_NAME = "replicatorEngine";

let spawnCounter = 0;

export async function execute(
  intent: string,
  payload: Record<string, unknown>
): Promise<EngineResult> {
  // Simulate processing latency (100–200ms)
  const latency = 100 + Math.random() * 100;
  await new Promise((r) => setTimeout(r, latency));

  if (intent === "agent.spawn") {
    spawnCounter++;
    const template = (payload.template as string) ?? "generic";
    const count = (payload.count as number) ?? 1;

    const spawned = Array.from({ length: count }, (_, i) => ({
      agentId: `agent-${template}-${spawnCounter}-${i}`,
      template,
      state: "initializing",
      spawnedAt: Date.now(),
    }));

    return {
      engine: ENGINE_NAME,
      status: "OK",
      data: {
        action: "spawn",
        count,
        agents: spawned,
        totalSpawned: spawnCounter,
      },
    };
  }

  return {
    engine: ENGINE_NAME,
    status: "ERROR",
    data: { message: `Unsupported intent: ${intent}` },
  };
}
