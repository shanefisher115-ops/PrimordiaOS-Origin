// autonomy/sovereign-scheduler.ts

import { getGlobalState } from "./global-state";
import { evaluateAction, SovereignAction } from "./safety-governor";
import { computeAllocations } from "./resource-allocator";
import { runEvolutionCycle } from "./evolution-engine";

export type SovereignTickResult = {
  timestamp: number;
  allocations: ReturnType<typeof computeAllocations>;
  evolution: ReturnType<typeof runEvolutionCycle>;
};

export function runSovereignTick(): SovereignTickResult {
  const state = getGlobalState();

  const allocations = computeAllocations(state);
  const evolution = runEvolutionCycle();

  const probeAction: SovereignAction = {
    id: `probe-${Date.now()}`,
    realm: "resources",
    type: "probe",
    payload: {},
  };

  const safety = evaluateAction(state, probeAction);

  if (!safety.allowed) {
    console.warn("[SOVEREIGN] safety blocked probe:", safety.reason);
  }

  return {
    timestamp: Date.now(),
    allocations,
    evolution,
  };
}
