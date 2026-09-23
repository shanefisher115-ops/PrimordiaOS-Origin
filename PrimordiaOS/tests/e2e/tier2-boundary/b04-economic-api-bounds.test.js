import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugHubLoop } from "../../../PrimordiaOS/realms/economy/moneyplughub-loop.js";

export const suite = new TestSuite("Tier 2 - Boundary 4: Economic Realm API Boundary & Concurrency Resilience");

// Test 1: High frequency cycle execution (20 concurrent calls)
suite.test("B04-01: 20 rapid concurrent cycle calls complete without state collision or corruption", async () => {
  const promises = [];
  for (let i = 0; i < 20; i++) {
    promises.push(moneyPlugHubLoop.executeCycleStep());
  }

  const results = await Promise.all(promises);
  assert.equal(results.length, 20);

  const hashes = new Set(results.map((r) => r.diff_hash));
  assert.equal(hashes.size, 20, "All 20 concurrent steps should generate unique diff hashes");
});

// Test 2: Custom port assignment boundary
suite.test("B04-02: Instantiating MoneyPlugHubLoopAdapter with non-standard port assigns accurately", async () => {
  const { MoneyPlugHubLoopAdapter } = await import("../../../PrimordiaOS/realms/economy/moneyplughub-loop.js");
  const custom = new MoneyPlugHubLoopAdapter(3999);
  assert.equal(custom.port, 3999);
  assert.equal(custom.realmId, "economic_realm");
});

// Test 3: Active loops array boundary inspection
suite.test("B04-03: Active loops collection contains valid non-empty string loop identifiers", async () => {
  assert.greaterThan(moneyPlugHubLoop.activeLoops.length, 0);
  for (const loopName of moneyPlugHubLoop.activeLoops) {
    assert.isString(loopName);
    assert.greaterThan(loopName.length, 0);
  }
});

// Test 4: lastDiff property immutability between runs
suite.test("B04-04: lastDiff holds reference to the most recent step result", async () => {
  const step = await moneyPlugHubLoop.executeCycleStep();
  assert.equal(moneyPlugHubLoop.lastDiff.diff_hash, step.diff_hash);
  assert.equal(moneyPlugHubLoop.lastDiff.timestamp, step.timestamp);
});

// Test 5: Re-initialization idempotency
suite.test("B04-05: Re-calling init() multiple times behaves idempotently without side-effects", async () => {
  await moneyPlugHubLoop.init();
  await moneyPlugHubLoop.init();
  assert.equal(moneyPlugHubLoop.port, 3001);
});
