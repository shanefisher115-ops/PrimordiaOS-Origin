import { GlobalPulse } from "./GlobalPulse.js";
import { GlobalNarrator } from "./GlobalNarrator.js";
import { GlobalTimeline } from "./GlobalTimeline.js";
import { transitionToRealm } from "../hud/transitions/orchestrator.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function PrimordiaBoot() {
  console.log("🌌 [PrimordiaOS] Commencing 7-Phase Cinematic Boot Sequence...");
  const shell = typeof document !== "undefined" ? document.getElementById("primordia-shell") : null;

  if (typeof window !== "undefined" && !window.PrimordiaOS) {
    window.PrimordiaOS = {
      version: "2026.08.31-Release",
      currentRealm: "schema",
      timeline: [],
      agents: [],
      finance: {},
      schema: {
        ledger: [],
        diffs: "",
        environments: { dev: true, staging: true, production: true },
        commentary: [],
        voiceLines: []
      },
      simulation: {
        status: { connected: false, fps: 60, nodeCount: 4 }
      }
    };
  }

  // Phase 1 — Dark Silence
  if (shell) shell.classList.add("boot-dark");
  GlobalPulse.emit("void");
  GlobalNarrator.speak([
    "PrimordiaOS initializing.",
    "Silence folds inward."
  ]);
  await wait(1200);

  // Phase 2 — Pulse Ignition
  if (shell) {
    shell.classList.remove("boot-dark");
    shell.classList.add("boot-pulse");
  }
  GlobalPulse.emit("ignite");
  GlobalNarrator.speak([
    "Antigravity engine warming.",
    "Pulse cluster awakening."
  ]);
  await wait(1600);

  // Phase 3 — Realm Initialization
  if (typeof window !== "undefined") {
    window.PrimordiaOS.currentRealm = "schema";
  }
  GlobalTimeline.write({
    type: "boot",
    timestamp: Date.now(),
    title: "Realm Initialization",
    summary: "Schema Realm mounted as genesis anchor.",
    icon: "📘"
  });
  await wait(900);

  // Phase 4 — Agent Awakening
  GlobalNarrator.speak([
    "Agents stirring.",
    "Cores aligning.",
    "Memory anchors binding."
  ]);
  GlobalPulse.emit("sync");
  await wait(1400);

  // Phase 5 — Simulation Bridge Handshake
  GlobalNarrator.speak([
    "Simulation Realm contacting Unreal Engine.",
    "Bridge handshake initiated."
  ]);
  if (typeof window !== "undefined" && window.PrimordiaOS?.simulation?.status) {
    window.PrimordiaOS.simulation.status.connected = true;
  }
  GlobalTimeline.write({
    type: "simulation",
    timestamp: Date.now(),
    title: "UE Bridge Connected",
    summary: "Simulation Realm synchronized with Unreal Engine 5.4.",
    icon: "🌠"
  });
  await wait(1200);

  // Phase 6 — Cosmic Veil Lift
  if (shell) {
    shell.classList.remove("boot-pulse");
    shell.classList.add("boot-reveal");
  }
  GlobalNarrator.speak([
    "PrimordiaOS online.",
    "Welcome to the cosmic machine."
  ]);
  await wait(800);

  // Phase 7 — Void Collapse Opening
  transitionToRealm("schema", "void");
  console.log("✨ [PrimordiaOS] Boot Sequence complete. The cosmic machine is fully operational.");
}

export default PrimordiaBoot;