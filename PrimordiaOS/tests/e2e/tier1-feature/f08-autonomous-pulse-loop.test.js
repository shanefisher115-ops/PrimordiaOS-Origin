import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugPipeline } from "../../../PrimordiaOS/pipelines/moneyplug-pipeline.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 8: 12-Second Autonomous Pulse Loop & Idempotency");

// Test 1: runAutonomousCycle executes full cycle and returns payload
suite.test("F08-01: runAutonomousCycle completes cycle and returns structured payload", async () => {
  const result = await moneyPlugPipeline.runAutonomousCycle();

  assert.isObject(result);
  assert.equal(result.type, "CYCLE_COMPLETED");
  assert.isNumber(result.cycle);
  assert.greaterThan(result.cycle, 0);
  assert.isNumber(result.timestamp);
  assert.isObject(result.diff);
  assert.isObject(result.ledgerBlock);
  assert.isString(result.commentary);
  assert.equal(result.pulse, "diff");
});

// Test 2: Autonomous cycle commits block to Osmium ledger with hash
suite.test("F08-02: Autonomous cycle seals block in Osmium Ledger with valid SHA-256 hash", async () => {
  const result = await moneyPlugPipeline.runAutonomousCycle();
  const block = result.ledgerBlock;

  assert.isObject(block);
  assert.isNumber(block.index);
  assert.equal(block.event, "MONEYPLUG_PULSE_COMMITTED");
  assert.isString(block.previousHash);
  assert.isString(block.hash);
  assert.equal(block.hash.length, 64, "SHA-256 hash must be 64 hex chars");
});

// Test 3: Emits CYCLE_COMPLETED and MONEYPLUG_CYCLE_COMPLETED to EventBus
suite.test("F08-03: Cycle completion broadcasts events on Master Spine EventBus", async () => {
  let cycleEvent = null;
  const listener = (data) => {
    cycleEvent = data;
  };
  eventBus.on("CYCLE_COMPLETED", listener);

  const result = await moneyPlugPipeline.runAutonomousCycle();

  assert.ok(cycleEvent, "Expected CYCLE_COMPLETED on event bus");
  assert.equal(cycleEvent.cycle, result.cycle);
  assert.equal(cycleEvent.ledgerBlock.hash, result.ledgerBlock.hash);

  eventBus.removeListener("CYCLE_COMPLETED", listener);
});

// Test 4: Monotonic cycle counter incrementation
suite.test("F08-04: Monotonic cycle counter increments sequentially without skipping", async () => {
  const countBefore = moneyPlugPipeline.cycleCount;
  const res1 = await moneyPlugPipeline.runAutonomousCycle();
  const res2 = await moneyPlugPipeline.runAutonomousCycle();

  assert.equal(res1.cycle, countBefore + 1);
  assert.equal(res2.cycle, countBefore + 2);
  assert.equal(moneyPlugPipeline.cycleCount, countBefore + 2);
});

// Test 5: Commentary generation includes cycle number and sealed block index
suite.test("F08-05: Commentary text reflects exact cycle ID and ledger block index", async () => {
  const res = await moneyPlugPipeline.runAutonomousCycle();
  assert.includes(res.commentary, `Cycle #${res.cycle}:`);
  assert.includes(res.commentary, `Block #${res.ledgerBlock.index} sealed.`);
});
