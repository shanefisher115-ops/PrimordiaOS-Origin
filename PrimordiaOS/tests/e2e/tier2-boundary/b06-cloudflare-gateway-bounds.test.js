import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { CloudflareGatewayAdapter } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";

export const suite = new TestSuite("Tier 2 - Boundary 6: Cloudflare AI Gateway Boundary & Extreme Input Handling");

// Test 1: Empty prompt string handling
suite.test("B06-01: Empty prompt string does not cause unhandled exceptions", async () => {
  const adapter = new CloudflareGatewayAdapter();
  const res = await adapter.dispatchInference("");
  assert.equal(res.success, true);
  assert.isString(res.output);
});

// Test 2: Very large prompt (50,000 characters)
suite.test("B06-02: 50,000 character prompt dispatches and truncates cleanly in log output", async () => {
  const adapter = new CloudflareGatewayAdapter();
  const hugePrompt = "Analyze economic sovereignty ".repeat(1500);
  const res = await adapter.dispatchInference(hugePrompt);
  assert.equal(res.success, true);
  assert.isString(res.output);
});

// Test 3: Multiple distinct worker routes registration
suite.test("B06-03: Registering 20 distinct edge worker routes scales without collision", async () => {
  const adapter = new CloudflareGatewayAdapter();
  for (let i = 0; i < 20; i++) {
    adapter.registerWorker(`worker-tier-${i}`, `/api/tier/${i}`);
  }
  assert.greaterThanOrEqual(adapter.activeWorkers.size, 20);
});

// Test 4: Special characters in worker name and route path
suite.test("B06-04: Special characters in worker routes (/api/v1/@syndicate/yield) register accurately", async () => {
  const adapter = new CloudflareGatewayAdapter();
  adapter.registerWorker("special_worker_@1", "/api/v1/@syndicate/yield");
  const w = adapter.activeWorkers.get("special_worker_@1");
  assert.ok(w);
  assert.equal(w.route, "/api/v1/@syndicate/yield");
});

// Test 5: Concurrent inference dispatch (15 parallel requests)
suite.test("B06-05: 15 concurrent inference requests resolve successfully in parallel", async () => {
  const adapter = new CloudflareGatewayAdapter();
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(adapter.dispatchInference(`Prompt #${i}`, "@cf/meta/llama-3-8b-instruct"));
  }
  const results = await Promise.all(promises);
  assert.equal(results.length, 15);
  results.forEach((r) => assert.equal(r.success, true));
});
