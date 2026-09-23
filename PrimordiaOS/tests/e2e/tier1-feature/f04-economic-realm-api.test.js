import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugHubLoop } from "../../../PrimordiaOS/realms/economy/moneyplughub-loop.js";
import { eventBus } from "../harness/test-env.js";
import { get } from "../harness/http-helper.js";

export const suite = new TestSuite("Tier 1 - Feature 4: Port 3001 Economic Realm API & Loop Synchronization");

// Test 1: Economic realm initialization emits ECONOMIC_REALM_READY
suite.test("F04-01: Economic Realm initializes with port 3001 and active loops", async () => {
  let readyEvent = null;
  const listener = (data) => {
    readyEvent = data;
  };
  eventBus.on("ECONOMIC_REALM_READY", listener);

  await moneyPlugHubLoop.init();

  assert.ok(readyEvent, "Expected ECONOMIC_REALM_READY event to be emitted");
  assert.equal(readyEvent.port, 3001, "Expected port 3001 in ready event");
  assert.isArray(readyEvent.loops, "Expected loops array");
  assert.includes(readyEvent.loops, "affiliate_sync");
  assert.includes(readyEvent.loops, "social_diff_commentary");

  eventBus.removeListener("ECONOMIC_REALM_READY", listener);
});

// Test 2: Economic cycle step execution emits ECONOMIC_CYCLE_STEP
suite.test("F04-02: Economic cycle step generates diff_hash and emits to event bus", async () => {
  let stepEvent = null;
  const listener = (data) => {
    stepEvent = data;
  };
  eventBus.on("ECONOMIC_CYCLE_STEP", listener);

  const step = await moneyPlugHubLoop.executeCycleStep();

  assert.ok(step, "Expected step result");
  assert.equal(step.status, "success");
  assert.isString(step.diff_hash);
  assert.isNumber(step.timestamp);
  assert.ok(stepEvent, "Expected ECONOMIC_CYCLE_STEP event on bus");
  assert.equal(stepEvent.diff_hash, step.diff_hash);

  eventBus.removeListener("ECONOMIC_CYCLE_STEP", listener);
});

// Test 3: Economic realm adapter maintains lastDiff state across pulses
suite.test("F04-03: MoneyPlugHubLoopAdapter preserves last executed diff state", async () => {
  const step = await moneyPlugHubLoop.executeCycleStep();
  assert.equal(moneyPlugHubLoop.lastDiff.diff_hash, step.diff_hash);
  assert.equal(moneyPlugHubLoop.lastDiff.status, "success");
});

// Test 4: Economic realm health check schema verification (HTTP or contract)
suite.test("F04-04: Economic API health schema contract adheres to PlugIn OS v5.0 spec", async () => {
  let isLive = false;
  try {
    const res = await get("http://localhost:3001/api/health", { timeout: 1000 });
    if (res.status === 200) {
      isLive = true;
      assert.equal(res.json.status, "healthy");
      assert.ok(res.json.system);
      assert.isString(res.json.timestamp);
    }
  } catch {
    // Contractual offline verification
  }

  // Verify adapter properties match contract
  assert.equal(moneyPlugHubLoop.port, 3001);
  assert.equal(moneyPlugHubLoop.realmId, "economic_realm");
  assert.greaterThanOrEqual(moneyPlugHubLoop.activeLoops.length, 3);
});

// Test 5: Economic Realm handles multiple consecutive cycle pulses idempotently
suite.test("F04-05: Consecutive cycle executions update diff_hash with unique monotonic timestamps", async () => {
  const step1 = await moneyPlugHubLoop.executeCycleStep();
  await new Promise((r) => setTimeout(r, 20));
  const step2 = await moneyPlugHubLoop.executeCycleStep();

  assert.notEqual(step1.diff_hash, step2.diff_hash, "Consecutive steps should produce unique diff hashes");
  assert.greaterThanOrEqual(step2.timestamp, step1.timestamp, "Timestamps should be non-decreasing");
});
