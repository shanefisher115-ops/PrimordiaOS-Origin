import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";
import { moneyPlugPipeline } from "../../../PrimordiaOS/pipelines/moneyplug-pipeline.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 7: ANTIGRAV() Governance Gate before Autonomous Pulse Execution");

suite.test("CR07: Autonomous pulse requires and validates ANTIGRAV() sovereignty score >= 70 before committing", async () => {
  // 1. Run ANTIGRAV audit on proposed pulse diff
  const auditReport = antigravGuardian.audit({
    realm: "economic_realm",
    pipeline: moneyPlugPipeline.name,
    intended_action: "autonomous_pulse_commit"
  });

  assert.equal(auditReport.passed, true, "Pulse must pass sovereignty gate");
  assert.greaterThanOrEqual(auditReport.score, 70);

  // 2. Execute pulse only after validation
  const cycleResult = await moneyPlugPipeline.runAutonomousCycle();
  assert.equal(cycleResult.type, "CYCLE_COMPLETED");
  assert.ok(cycleResult.ledgerBlock);
});
