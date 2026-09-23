import fs from "fs";
import path from "path";
import { readLedger } from "../../../moneyplughub/ledger/read-ledger.js";

export async function updateLedger(diffFile) {
  console.log("?? Step 6: Finalizing ledger state...");
  const ledgerPath = path.resolve("primordiaos", "moneyplughub", "ledger", "schema-history.json");
  const ledger = readLedger();
  const normalizedPath = diffFile.replace(/\\/g, "/");
  const entry = ledger.find(e => e.diff_file.replace(/\\/g, "/") === normalizedPath);
  if (entry) {
    entry.approved = true;
    entry.environment = "production";
    entry.promoted_at = new Date().toISOString();
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
  }
}
