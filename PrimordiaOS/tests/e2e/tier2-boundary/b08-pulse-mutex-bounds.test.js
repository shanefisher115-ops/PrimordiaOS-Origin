import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugPipeline } from "../../../PrimordiaOS/pipelines/moneyplug-pipeline.js";

export const suite = new TestSuite("Tier 2 - Boundary 8: 12-Second Autonomous Pulse Concurrency & Mutex Resilience");

// Test 1: Rapid sequential trigger bursts
suite.test("B08-01: 10 rapid sequential pulse calls complete with incrementing cycle numbers", async () => {
  const initial = moneyPlugPipeline.cycleCount;
  for (let i = 0; i < 10; i++) {
    const res = await moneyPlugPipeline.runAutonomousCycle();
    assert.equal(res.cycle, initial + i + 1);
  }
});

// Test 2: Concurrent pulse calls
suite.test("B08-02: 5 parallel runAutonomousCycle calls complete and record individual ledger blocks", async () => {
  const initial = moneyPlugPipeline.cycleCount;
  const promises = [
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle(),
    moneyPlugPipeline.runAutonomousCycle()
  ];

  const results = await Promise.all(promises);
  assert.equal(results.length, 5);
  assert.equal(moneyPlugPipeline.cycleCount, initial + 5);

  const blockIndexes = results.map((r) => r.ledgerBlock.index);
  const uniqueIndexes = new Set(blockIndexes);
  assert.equal(uniqueIndexes.size, 5, "Every concurrent cycle must produce a unique ledger block");
});

// Test 3: Mutations array schema inspection
suite.test("B08-03: Cycle diff payload mutations array contains required liquidity and yield metrics", async () => {
  const res = await moneyPlugPipeline.runAutonomousCycle();
  assert.isArray(res.diff.mutations);
  assert.greaterThanOrEqual(res.diff.mutations.length, 2);

  const fields = res.diff.mutations.map((m) => m.field);
  assert.includes(fields, "syndicate_liquidity");
  assert.includes(fields, "affiliate_yield");
});

// Test 4: Diff hash format verification
suite.test("B08-04: Generated diff hash starts with 'diff_' prefix and alphanumeric string", async () => {
  const res = await moneyPlugPipeline.runAutonomousCycle();
  assert.matches(res.diff.hash, /^diff_[a-z0-9]+$/);
});

// Test 5: Pipeline name and running status integrity
suite.test("B08-05: Pipeline metadata identifies canonical MoneyPlugHub Autonomous Monetization title", async () => {
  assert.equal(moneyPlugPipeline.name, "MoneyPlugHub Autonomous Monetization Pipeline");
  assert.isBoolean(moneyPlugPipeline.running);
});
