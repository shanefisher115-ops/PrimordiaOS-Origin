import { generateSchema } from "./steps/generate-schema.js";
import { generateDiff } from "./steps/generate-diff.js";
import { applyStaging } from "./steps/apply-staging.js";
import { waitForApproval } from "./steps/wait-for-approval.js";
import { promoteProduction } from "./steps/promote-production.js";
import { updateLedger } from "./steps/update-ledger.js";
import { narrate } from "../../voice/narrator/index.js";

export async function runAntigravityLoop() {
  console.log("\n?? ANTIGRAVITY AUTONOMOUS LOOP: INITIATING SEQUENCE\n");
  narrate({ pulse: "start" });

  try {
    const schemaFile = await generateSchema();
    const diffFile = await generateDiff(schemaFile);
    
    if (!diffFile) {
      narrate({ pulse: "insync" });
      console.log("? Antigravity Loop: System state in sync.\n");
      return;
    }

    narrate({ pulse: "diff" });
    await applyStaging(diffFile);
    narrate({ pulse: "staging" });

    const isApproved = await waitForApproval(diffFile);
    if (isApproved) {
      await promoteProduction(diffFile);
      await updateLedger(diffFile);
      narrate({ pulse: "production" });
      console.log("\n? ANTIGRAVITY LOOP: Deployment cycle concluded.\n");
    }
  } catch (error) {
    console.error("? ANTIGRAVITY LOOP ERROR:", error.message);
  }
}

if (process.argv[1] && process.argv[1].endsWith("run-loop.js")) {
  runAntigravityLoop();
}

