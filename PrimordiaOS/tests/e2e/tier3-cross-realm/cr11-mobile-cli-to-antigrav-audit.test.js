import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 11: Termux Remote CLI Audit via AntigravGuardian");

suite.test("CR11: Remote CLI invocation from Termux mobile vessel executes ANTIGRAV() audit and enforces >= 70 score", async () => {
  const remoteInvocation = {
    vessel: TermuxVessel.id,
    command: "antigrav",
    diff: {
      target: "vessels/termux-vessel.js",
      change: "Enable low-power background telemetry daemon"
    }
  };

  const report = antigravGuardian.audit(remoteInvocation);

  assert.equal(report.agent, "AntigravGuardian");
  assert.equal(report.passed, true);
  assert.greaterThanOrEqual(report.score, 70);
  assert.isString(report.feedback);
});
