export { PrimordiaShell } from "./PrimordiaShell.js";
export { RealmManager } from "./RealmManager.js";
export { GlobalPulse } from "./GlobalPulse.js";
export { GlobalNarrator } from "./GlobalNarrator.js";
export { GlobalTimeline } from "./GlobalTimeline.js";
export { GlobalAgents } from "./GlobalAgents.js";
export { GlobalSimulation } from "./GlobalSimulation.js";
export { PrimordiaBoot } from "./BootSequence.js";

if (typeof window !== "undefined" && !window.PrimordiaOS) {
  window.PrimordiaOS = {
    version: "2026.08.31-Release",
    currentRealm: "schema",
    timeline: [],
    agents: [],
    finance: {},
    schema: {},
    simulation: {}
  };
}