import { syncPulseWithUE } from "../simulation/bridge/ue-pulse-sync.js";

export const GlobalPulse = {
  state: { active: true, mode: "normal", bpm: 60 },
  emit(mode = "normal") {
    this.state.mode = mode;
    syncPulseWithUE(mode);
    if (typeof window !== "undefined" && window.PrimordiaOS?.timeline) {
      window.PrimordiaOS.timeline.push({
        type: "pulse",
        timestamp: Date.now(),
        title: `Pulse [${mode.toUpperCase()}]`,
        summary: `Antigravity harmonic pulse synchronized across OS realms.`,
        data: { mode, timestamp: Date.now() },
        icon: "??"
      });
    }
    console.log(`?? [Global Pulse] Broadcasted mode [${mode.toUpperCase()}] to all realms.`);
  }
};
