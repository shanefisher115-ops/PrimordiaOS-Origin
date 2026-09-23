import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { AntigravGuardian } from "../../../PrimordiaOS/agents/antigrav-guardian.js";

export const suite = new TestSuite("Tier 2 - Boundary 13: ANTIGRAV() Sovereignty Threshold & Veto Boundary");

// Test 1: Audit returns score above threshold
suite.test("B13-01: Audit returns valid pass report when score meets threshold", async () => {
  const guardian = new AntigravGuardian();
  const report = guardian.audit({ type: "boundary_test" });
  assert.greaterThanOrEqual(report.score, guardian.threshold);
  assert.equal(report.passed, true);
  assert.includes(report.feedback, "passes ANTIGRAV()");
});

// Test 2: Custom threshold boundary test
suite.test("B13-02: Custom guardian instance with high threshold (99) correctly identifies failure / veto", async () => {
  const guardian = new AntigravGuardian();
  guardian.threshold = 100; // Impossibly high threshold
  const report = guardian.audit({});

  if (report.score < 100) {
    assert.equal(report.passed, false);
    assert.includes(report.feedback, "VETO");
  }
});

// Test 3: Audit handles null and undefined artifact inputs
suite.test("B13-03: audit(null) and audit(undefined) evaluate safely without throwing TypeError", async () => {
  const guardian = new AntigravGuardian();
  const reportNull = guardian.audit(null);
  assert.isObject(reportNull);
  assert.isNumber(reportNull.score);

  const reportUndef = guardian.audit(undefined);
  assert.isObject(reportUndef);
  assert.isNumber(reportUndef.score);
});

// Test 4: Component score ranges (uniqueness, sovereignty, friction between 80 and 100)
suite.test("B13-04: Sub-metrics (uniqueness, sovereignty, friction) remain within valid 80-100 range", async () => {
  const guardian = new AntigravGuardian();
  for (let i = 0; i < 20; i++) {
    const report = guardian.audit({});
    assert.greaterThanOrEqual(report.uniqueness, 80);
    assert.lessThanOrEqual(report.uniqueness, 100);

    assert.greaterThanOrEqual(report.sovereignty, 80);
    assert.lessThanOrEqual(report.sovereignty, 100);

    assert.greaterThanOrEqual(report.friction, 80);
    assert.lessThanOrEqual(report.friction, 100);
  }
});

// Test 5: 50 consecutive audits all maintain score >= 70
suite.test("B13-05: 50 consecutive audits continuously satisfy sovereignty score >= 70 requirement", async () => {
  const guardian = new AntigravGuardian();
  for (let i = 0; i < 50; i++) {
    const report = guardian.audit({ run: i });
    assert.greaterThanOrEqual(report.score, 70, `Run ${i} score should be >= 70`);
    assert.equal(report.passed, true);
  }
});
