#!/usr/bin/env node

import { spine } from "../kernel/spine.js";
import { antigravGuardian } from "../agents/antigrav-guardian.js";
import { unrealBridge } from "../realms/simulation/unreal-bridge.js";
import { moneyPlugPipeline } from "../pipelines/moneyplug-pipeline.js";

const command = process.argv[2] || "status";

async function main() {
  console.log("=========================================================");
  console.log("             PRIMORDIAOS CANONICAL CLI SPINE             ");
  console.log("=========================================================");

  switch (command) {
    case "status": {
      const status = spine.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "antigrav": {
      console.log("[CLI] Executing ANTIGRAV() audit...");
      const report = antigravGuardian.audit();
      console.log(JSON.stringify(report, null, 2));
      break;
    }
    case "bigbang": {
      console.log("[CLI] Triggering Big Bang of Primordia simulation event...");
      const result = unrealBridge.triggerBigBang();
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "pulse": {
      console.log("[CLI] Forcing Autonomous Monetization Pulse...");
      const result = await moneyPlugPipeline.runAutonomousCycle();
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Available commands: status, antigrav, bigbang, pulse");
  }
}

main().catch(console.error);
