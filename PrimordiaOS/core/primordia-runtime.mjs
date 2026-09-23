// core/primordia-runtime.mjs
// PrimordiaOS Core Runtime (Cinematic + Real)

import { globalEventBus } from "./event-bus.mjs";
import { registerDaemon, startAllDaemons } from "./daemon-orchestrator.mjs";

console.log("✦ [PrimordiaOS::Runtime] Antigravity spine igniting...");
console.log("✦ [PrimordiaOS::Runtime] Reality threads coming online...");
console.log("✦ [PrimordiaOS::Runtime] Architect presence: DETECTED");

function registerCoreDaemons() {
  registerDaemon("MoneyPlugHub", async (bus) => {
    bus.emit("money", "init", { realm: "creator-economy" });
  });

  registerDaemon("VisionCoreCinemaSuite", async (bus) => {
    bus.emit("cinema", "init", { realm: "narrative-engine" });
  });

  registerDaemon("UnrealBridge", async (bus) => {
    bus.emit("unreal", "bridge:init", { realm: "world-generator" });
  });
}

async function main() {
  registerCoreDaemons();
  await startAllDaemons();
  globalEventBus.emit("primordia", "runtime:ready", {
    message: "PrimordiaOS: Antigravity spine ignited. Reality threads online. Architect, your multiverse is ready.",
  });
}

main().catch((err) => {
  console.error("✦ [PrimordiaOS::Runtime] Fatal error:", err);
});
