// primordia/safety-layer.ts

export class SafetyLayer {
  constructor(os) {
    this.os = os
  }

  evaluate(signal) {
    // Basic structural validation
    if (!signal || !signal.realm || !signal.agent) {
      return { allowed: false, reason: "Invalid signal structure" }
    }

    // Realm-level constraints
    const forbiddenRealms = ["orbital"] // orbital only allowed through specific agents
    if (forbiddenRealms.includes(signal.realm)) {
      return { allowed: false, reason: "Direct orbital access forbidden" }
    }

    // Agent-level constraints
    const forbiddenAgents = ["orbitalSim", "orbitalRender", "orbitalMMD"]
    if (forbiddenAgents.includes(signal.agent)) {
      return { allowed: false, reason: "Direct orbital agent invocation forbidden" }
    }

    // Payload constraints
    if (signal.payload && signal.payload.auto && signal.payload.tick) {
      // Autonomy loop signals are allowed but monitored
      return { allowed: true, reason: "Autonomy loop signal" }
    }

    // Monetization constraints
    if (signal.realm === "monetization" && signal.agent === "amo") {
      if (!signal.payload || !signal.payload.artifact) {
        return { allowed: false, reason: "AMO requires artifact" }
      }
    }

    // Manufacturing constraints
    if (signal.realm === "manufacturing" && signal.agent === "weldSim") {
      if (signal.payload.heat > 5000) {
        return { allowed: false, reason: "Heat exceeds safe simulation threshold" }
      }
    }

    // Education / PHOM constraints
    if (signal.realm === "education" && signal.agent === "phomBuilder") {
      if (!signal.payload.concept) {
        return { allowed: false, reason: "PHOM capsule requires concept" }
      }
    }

    // If nothing triggered, allow
    return { allowed: true, reason: "Signal allowed" }
  }
}
