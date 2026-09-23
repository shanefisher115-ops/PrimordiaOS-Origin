// primordia/PAIA.ts

import { ExecutionBus } from "./execution-bus"
import { SafetyLayer } from "./safety-layer"

const safety = new SafetyLayer(null) // OS injected later

export function attachSafety(os) {
  safety.os = os
}

export function processSignal(os, signal) {
  // Safety check
  const check = safety.evaluate(signal)

  if (!check.allowed) {
    return {
      status: "blocked",
      reason: check.reason,
      signal
    }
  }

  // Dispatch through Execution Bus
  return ExecutionBus.dispatch({
    realm: signal.realm,
    agent: signal.agent,
    payload: signal.payload
  })
}
