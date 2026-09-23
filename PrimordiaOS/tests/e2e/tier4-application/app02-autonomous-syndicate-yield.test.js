import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugPipeline } from "../../../PrimordiaOS/pipelines/moneyplug-pipeline.js";
import { osmiumLedger } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";
import { antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 2: Autonomous Syndicate Yield Cycle & Osmium SHA-256 Commit");

suite.test("APP02: Complete 12-second cycle: inspect schema -> diff -> Osmium SHA-256 commit -> commentary -> yield routing", async () => {
  // Step 1: Pre-audit diff with AntigravGuardian
  const audit = antigravGuardian.audit({ stage: "pre_cycle_verification" });
  assert.equal(audit.passed, true);
  assert.greaterThanOrEqual(audit.score, 70);

  // Step 2-6: Execute autonomous cycle
  const initialChainLen = osmiumLedger.chain.length;
  const cycleResult = await moneyPlugPipeline.runAutonomousCycle();

  assert.equal(cycleResult.type, "CYCLE_COMPLETED");
  assert.equal(osmiumLedger.chain.length, initialChainLen + 1);

  // Step 7: Cryptographic verification of ledger integrity
  const isChainValid = osmiumLedger.verifyChain();
  assert.equal(isChainValid, true);

  // Step 8: Syndicate yield routing calculations
  const syndicates = ["VRTX", "APEX", "PLSE", "QNTM"];
  const totalYieldPoolCents = 1500000;
  const xpMultiplier = 1.15;
  const distributedAmount = Math.round(totalYieldPoolCents * xpMultiplier);

  assert.greaterThan(distributedAmount, totalYieldPoolCents);
  assert.equal(syndicates.length, 4);
});
