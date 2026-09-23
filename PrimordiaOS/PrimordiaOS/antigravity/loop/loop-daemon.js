import { step1_inspectSchema } from "./steps/1-inspect-schema.js";
import { step2_generateDiff } from "./steps/2-generate-diff.js";
import { step3_writeLedger } from "./steps/3-write-ledger.js";
import { step4_triggerCommentary } from "./steps/4-trigger-commentary.js";
import { step5_synthesizeVoice } from "./steps/5-synthesize-voice.js";
import { step6_syncHUD } from "./steps/6-sync-hud.js";

const INTERVAL_MS = 15000; // Run every 15 seconds

async function cycle() {
  console.log(`\n⏳ [${new Date().toLocaleTimeString()}] Running Antigravity Autonomous Cycle...`);
  try {
    const inspection = await step1_inspectSchema();
    const diff = await step2_generateDiff();
    const ledgerEntry = await step3_writeLedger(diff);
    const commentary = await step4_triggerCommentary(diff);
    await step5_synthesizeVoice(commentary);
    await step6_syncHUD(ledgerEntry, commentary);
  } catch (err) {
    console.error("❌ Loop error:", err);
  }
}

console.log("🌌 PrimordiaOS Antigravity Loop Daemon started (Interval: 15s). Press Ctrl+C to stop.");
cycle();
setInterval(cycle, INTERVAL_MS);