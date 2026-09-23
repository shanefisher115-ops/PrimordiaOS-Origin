import fs from "fs";
import path from "path";
import { osmiumLedger } from "../../../realms/identity/osmium-ledger.js";

export async function step3_writeLedger(diffResult) {
  console.log("📘 [Step 3/7] Committing cryptographic ledger entry to Osmium...");
  
  // 1. Commit directly to Osmium Ledger
  const ledgerBlock = osmiumLedger.appendBlock("MONEYPLUG_PULSE_COMMITTED", diffResult);

  // 2. Persist local schema history for legacy tooling if directory exists
  try {
    const ledgerPath = path.resolve("primordiaos/moneyplughub/ledger/schema-history.json");
    const ledgerDir = path.dirname(ledgerPath);
    if (fs.existsSync(ledgerDir)) {
      let history = [];
      if (fs.existsSync(ledgerPath)) {
        try {
          history = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));
        } catch {
          history = [];
        }
      }
      history.push({
        version: new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14) + "_auto_index",
        timestamp: new Date().toISOString(),
        blockIndex: ledgerBlock.index,
        blockHash: ledgerBlock.hash,
        diff_hash: diffResult?.diffHash || diffResult?.hash,
        applied_by: "AntigravityAutonomousDaemon"
      });
      fs.writeFileSync(ledgerPath, JSON.stringify(history, null, 2));
    }
  } catch (err) {
    // Non-fatal logging
  }

  return ledgerBlock;
}