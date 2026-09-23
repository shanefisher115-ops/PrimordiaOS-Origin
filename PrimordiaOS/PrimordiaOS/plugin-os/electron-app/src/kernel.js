// ======================================================
// PRIMORDIAL ORIGIN REALM KERNEL
// Mode engine · Task scheduler · Adaptive controller
// ======================================================

const kernel = {
  // Current operating mode of PrimordialOS
  mode: "idle",

  // Internal state
  state: {
    lastStability: 100,
    lastEnergyDraw: 0,
    hoverLocked: false,
    tick: 0
  },

  // =========================
  // MODE MANAGEMENT
  // =========================
  setMode(newMode) {
    const allowed = [
      "idle",
      "antigravity",
      "stabilize",
      "diagnostic",
      "overwatch"
    ];

    if (!allowed.includes(newMode)) {
      console.warn(`[KERNEL] Invalid mode requested: ${newMode}`);
      return;
    }

    console.log(`[KERNEL] Mode change: ${kernel.mode} → ${newMode}`);
    kernel.mode = newMode;
  },

  // =========================
  // TASK SCHEDULER
  // =========================
  nextTask(tick) {
    kernel.state.tick = tick;

    switch (kernel.mode) {
      case "idle":
        return {
          agent: "telemetry",
          payload: { tick, intent: "idle-scan" }
        };

      case "antigravity":
        return {
          agent: "antigravity",
          payload: {
            tick,
            intent: "maintain-hover",
            hoverLocked: kernel.state.hoverLocked
          }
        };

      case "stabilize":
        return {
          agent: "antigravity",
          payload: {
            tick,
            intent: "stability-recovery",
            targetStability: 80
          }
        };

      case "diagnostic":
        return {
          agent: "diagnostic",
          payload: { tick, intent: "full-scan" }
        };

      case "overwatch":
        return {
          agent: "overwatch",
          payload: { tick, intent: "realm-monitor" }
        };

      default:
        return {
          agent: "telemetry",
          payload: { tick, intent: "fallback" }
        };
    }
  },

  // =========================
  // ADAPTIVE MODE LOGIC
  // =========================
  adaptModeFromTelemetry(telemetry) {
    const stability = Number(telemetry.stability ?? 100);
    const energy = Number(telemetry.energyDraw ?? 0);
    const hover = !!telemetry.autoHover;

    kernel.state.lastStability = stability;
    kernel.state.lastEnergyDraw = energy;
    kernel.state.hoverLocked = hover;

    // Hard safety: if stability collapses, force stabilize
    if (stability < 25 && kernel.mode !== "stabilize") {
      console.log("[KERNEL] Critical instability detected → STABILIZE");
      kernel.mode = "stabilize";
      return;
    }

    // If we’re stable and hover is on, prefer antigravity mode
    if (stability > 70 && hover && kernel.mode !== "antigravity") {
      console.log("[KERNEL] Stable hover detected → ANTIGRAVITY");
      kernel.mode = "antigravity";
      return;
    }

    // If energy draw is high but stability is okay, go diagnostic
    if (energy > 80 && stability > 50 && kernel.mode !== "diagnostic") {
      console.log("[KERNEL] High energy draw → DIAGNOSTIC");
      kernel.mode = "diagnostic";
      return;
    }

    // If everything is calm, drop to overwatch
    if (stability > 85 && energy < 30 && kernel.mode !== "overwatch") {
      console.log("[KERNEL] Realm calm → OVERWATCH");
      kernel.mode = "overwatch";
      return;
    }
  }
};

module.exports = kernel;
