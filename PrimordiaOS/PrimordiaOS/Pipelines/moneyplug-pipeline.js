import { eventBus } from "../kernel/event-bus.js";
import { osmiumLedger } from "../realms/identity/osmium-ledger.js";
import { step1_inspectSchema } from "../antigravity/loop/steps/1-inspect-schema.js";
import { step2_generateDiff } from "../antigravity/loop/steps/2-generate-diff.js";
import { step3_writeLedger } from "../antigravity/loop/steps/3-write-ledger.js";
import { step4_triggerCommentary } from "../antigravity/loop/steps/4-trigger-commentary.js";
import { step5_synthesizeVoice } from "../antigravity/loop/steps/5-synthesize-voice.js";
import { step6_syncHUD } from "../antigravity/loop/steps/6-sync-hud.js";
import { step7_routeSyndicateYield } from "../antigravity/loop/steps/7-route-syndicate-yield.js";

/**
 * MoneyPlugHub Autonomous Monetization Pipeline:
 * Coordinates the full 7-step 12s autonomous monetization cycle with strict idempotency mutex:
 * 1. Schema Inspection
 * 2. Diff Generation
 * 3. Osmium Ledger Commit
 * 4. Commentary Trigger
 * 5. Voice Synthesis
 * 6. HUD Sync
 * 7. Syndicate Yield Routing
 */
export class MoneyPlugHubPipeline {
  constructor() {
    this.name = "MoneyPlugHub Autonomous Monetization Pipeline";
    this.running = false;
    this.isCycleRunning = false;
    this.cycleCount = 0;
    this._mutexQueue = Promise.resolve();
  }

  async start() {
    this.running = true;
    console.log(`[Pipeline] ${this.name} started.`);

    eventBus.on("HEARTBEAT_PULSE", async (evt) => {
      await this.runAutonomousCycle();
    });
  }

  /**
   * Runs the complete 7-step autonomous cycle through the serialized mutex queue.
   */
  async runAutonomousCycle() {
    return new Promise((resolve, reject) => {
      this._mutexQueue = this._mutexQueue.then(async () => {
        this.isCycleRunning = true;
        try {
          const result = await this._executeCycle();
          resolve(result);
        } catch (err) {
          console.error("Autonomous cycle execution error:", err);
          reject(err);
        } finally {
          this.isCycleRunning = false;
        }
      });
    });
  }

  async _executeCycle() {
    this.cycleCount++;
    const now = Date.now();

    // Step 1: Inspect Schema
    const schemaInspection = await step1_inspectSchema();

    // Step 2: Generate Diff
    const diff = await step2_generateDiff(this.cycleCount);

    // Step 3: Write to Osmium Immutable Ledger
    const ledgerBlock = await step3_writeLedger(diff);

    // Step 4: Trigger Narrative Commentary
    const commentaryResult = await step4_triggerCommentary(diff, ledgerBlock, this.cycleCount);
    const commentary = commentaryResult.commentaryText;

    // Step 5: Synthesize Voice Payload
    const voicePayload = await step5_synthesizeVoice(commentaryResult);

    // Step 6: Sync HUD Broadcast
    const hudPayload = await step6_syncHUD(ledgerBlock, commentary);

    // Step 7: Route Syndicate Yield (+15% Guild XP Multiplier)
    const yieldPayload = await step7_routeSyndicateYield({
      cycle: this.cycleCount,
      cycleId: `cycle_${this.cycleCount}`,
      ledgerBlock,
      timestamp: now
    });

    // 8. Emit Unified Cycle Completed Event
    const payload = {
      type: "CYCLE_COMPLETED",
      cycle: this.cycleCount,
      timestamp: now,
      diff,
      ledgerBlock,
      commentary,
      pulse: "diff",
      schemaInspection,
      voicePayload,
      hudPayload,
      yieldPayload
    };

    eventBus.emitRealmEvent("MONEYPLUG_CYCLE_COMPLETED", payload, "economic_realm");
    eventBus.emitRealmEvent("CYCLE_COMPLETED", payload, "economic_realm");
    eventBus.emit("CYCLE_COMPLETED", payload);
    eventBus.emit("MONEYPLUG_CYCLE_COMPLETED", payload);

    return payload;
  }
}

export const moneyPlugPipeline = new MoneyPlugHubPipeline();
export const isCycleRunning = () => moneyPlugPipeline.isCycleRunning;

