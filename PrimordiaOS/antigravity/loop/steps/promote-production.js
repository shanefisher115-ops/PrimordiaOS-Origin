import path from "path";
import { applyDiff } from "../../../moneyplughub/diff-engine/apply-diff.js";
import { promoteEntry } from "../../../moneyplughub/ledger/promote-entry.js";

export async function promoteProduction(diffFile) {
  console.log("?? Step 5: Promoting migration to Production...");
  const fileName = path.basename(diffFile);
  const match = fileName.match(/^(\d+)_diff\.sql$/);
  if (!match) {
    throw new Error(`Invalid migration diff filename format: ${fileName}`);
  }
  const version = match[1];
  promoteEntry(version, "production", "Autonomous promotion via Antigravity Loop");
  applyDiff(diffFile, "production");
  return version;
}
