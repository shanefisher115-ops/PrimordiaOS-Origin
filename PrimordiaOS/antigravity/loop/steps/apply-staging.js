import { applyDiff } from "../../../moneyplughub/diff-engine/apply-diff.js";

export async function applyStaging(diffFile) {
  console.log("?? Step 3: Applying migration to Staging...");
  return applyDiff(diffFile, "staging");
}
