// ============================================================
//   SWARM CORE ENGINE — Overmind Simulation Engine
// ============================================================
//
//   Handles intents: simulation.run, simulation.step
//   Responsible for swarm simulation execution and stepping.
//

import type { EngineResult } from "./selfModEngine";

const ENGINE_NAME = "swarmCoreEngine";

let simulationTick = 0;

export async function execute(
  intent: string,
  payload: Record<string, unknown>
): Promise<EngineResult> {
  // Simulate processing latency (60–160ms)
  const latency = 60 + Math.random() * 100;
  await new Promise((r) => setTimeout(r, latency));

  if (intent === "simulation.run") {
    const steps = (payload.steps as number) ?? 10;
    simulationTick += steps;

    return {
      engine: ENGINE_NAME,
      status: "OK",
      data: {
        action: "run",
        stepsExecuted: steps,
        currentTick: simulationTick,
        agentCount: Math.floor(Math.random() * 50) + 10,
        anomalies: Math.floor(Math.random() * 3),
        convergenceScore: +(Math.random() * 0.4 + 0.6).toFixed(4),
      },
    };
  }

  if (intent === "simulation.step") {
    simulationTick++;

    return {
      engine: ENGINE_NAME,
      status: "OK",
      data: {
        action: "step",
        tick: simulationTick,
        delta: {
          spawned: Math.floor(Math.random() * 3),
          destroyed: Math.floor(Math.random() * 2),
          mutated: Math.floor(Math.random() * 5),
        },
      },
    };
  }

  return {
    engine: ENGINE_NAME,
    status: "ERROR",
    data: { message: `Unsupported intent: ${intent}` },
  };
}
