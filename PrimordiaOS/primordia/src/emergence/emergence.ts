// Emergent Behavior Engine — PrimordiaOS
// Generates autonomous actions based on kernel interrupts + fused realm state.

import { emitSignal } from "../core/signals";
import { kernelState } from "../kernel/kernel";
import { fusionState } from "../realms/fusion";
import { computeState } from "../realms/compute";
import { memoryState } from "../realms/memory";
import { visionState } from "../realms/vision";
import { signalRealmState } from "../realms/signal";

export interface EmergentAction {
  id: string;
  type: string;
  priority: number;
  reason: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export const emergentState = {
  actions: [] as EmergentAction[],
  lastAction: null as EmergentAction | null
};

function generateAction(): EmergentAction | null {
  const interrupts = kernelState.interrupts.slice(0, 3);
  const fusion = fusionState.hybridSignature;
  const pressure = computeState.pressure;
  const resonance = visionState.resonance;
  const trend = memoryState.longTermTrend;
  const charge = signalRealmState.globalCharge;

  const timestamp = Date.now();

  // Determine action type
  let type = "idle";
  let reason = "baseline coherence";

  if (interrupts.length > 0) {
    const top = interrupts[0];
    type = `interrupt:${top.type}`;
    reason = `triggered by interrupt ${top.type}`;
  } else if (fusion === "ascendant") {
    type = "ascendant.behavior";
    reason = "high fusion resonance";
  } else if (pressure > 10) {
    type = "compute.spike";
    reason = "high computational pressure";
  } else if (trend > 5) {
    type = "memory.reinforce";
    reason = "strong long-term trend";
  } else if (charge > 8) {
    type = "signal.surge";
    reason = "high global charge";
  }

  const priority =
    (interrupts[0]?.priority ?? 20) +
    pressure * 0.5 +
    resonance * 0.3 +
    trend * 0.4 +
    charge * 0.2;

  const action: EmergentAction = {
    id: `ea_${timestamp}`,
    type,
    priority,
    reason,
    timestamp,
    payload: {
      fusion,
      pressure,
      resonance,
      trend,
      charge
    }
  };

  return action;
}

export function processEmergentBehavior() {
  const action = generateAction();
  if (!action) return emergentState;

  emergentState.actions.push(action);
  emergentState.lastAction = action;

  emitSignal("emergence.action", action);

  return emergentState;
}
