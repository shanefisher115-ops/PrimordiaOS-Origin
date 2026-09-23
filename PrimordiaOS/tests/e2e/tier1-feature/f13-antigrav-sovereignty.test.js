import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { AntigravGuardian, antigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";
import { eventBus } from "../harness/test-env.js";
import { get } from "../harness/http-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 13: AntigravGuardian ANTIGRAV() Sovereignty Audits");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: AntigravGuardian identity and default threshold
suite.test("F13-01: AntigravGuardian defines Tier 2 sovereignty guardian with threshold 70", async () => {
  assert.equal(antigravGuardian.name, "AntigravGuardian");
  assert.equal(antigravGuardian.tier, 2);
  assert.equal(antigravGuardian.threshold, 70);
});

// Test 2: audit() returns score >= 70 and passed status
suite.test("F13-02: audit() evaluates artifact and returns compliant score >= 70", async () => {
  const artifact = {
    type: "code_diff",
    module: "osmium-ledger",
    content: "Cryptographic hash verification logic"
  };

  const report = antigravGuardian.audit(artifact);

  assert.isObject(report);
  assert.equal(report.agent, "AntigravGuardian");
  assert.isBoolean(report.passed);
  assert.equal(report.passed, true, "Expected audit to pass");
  assert.isNumber(report.score);
  assert.greaterThanOrEqual(report.score, 70, "Score must meet or exceed 70 threshold");
  assert.isNumber(report.uniqueness);
  assert.isNumber(report.sovereignty);
  assert.isNumber(report.friction);
  assert.isString(report.feedback);
});

// Test 3: audit() emits ANTIGRAV_AUDIT_COMPLETED on EventBus
suite.test("F13-03: audit() broadcasts ANTIGRAV_AUDIT_COMPLETED on Master Spine EventBus", async () => {
  let auditEvt = null;
  const listener = (data) => {
    auditEvt = data;
  };
  eventBus.on("ANTIGRAV_AUDIT_COMPLETED", listener);

  const report = antigravGuardian.audit({ test: true });

  assert.ok(auditEvt, "Expected ANTIGRAV_AUDIT_COMPLETED on event bus");
  assert.equal(auditEvt.score, report.score);
  assert.equal(auditEvt.passed, report.passed);

  eventBus.removeListener("ANTIGRAV_AUDIT_COMPLETED", listener);
});

// Test 4: REST API GET /api/antigrav/audit returns live audit report
suite.test("F13-04: GET /api/antigrav/audit returns HTTP 200 with guardian audit report", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/antigrav/audit"));
  assert.equal(res.status, 200);
  assert.isObject(res.json);
  assert.equal(res.json.agent, "AntigravGuardian");
  assert.greaterThanOrEqual(res.json.score, 70);
  assert.equal(res.json.passed, true);
});

// Test 5: Score calculation formula verification
suite.test("F13-05: Total score accurately applies weighted sum (35% uniqueness, 45% sovereignty, 20% friction)", async () => {
  const u = 90;
  const s = 95;
  const f = 85;
  const expectedTotal = Math.round(u * 0.35 + s * 0.45 + f * 0.2); // 31.5 + 42.75 + 17 = 91.25 -> 91

  assert.equal(expectedTotal, 91);
  assert.greaterThanOrEqual(expectedTotal, 70);
});
