import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { CloudflareGatewayAdapter } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 6: Cloudflare AI Gateway & Edge Fallback Resilience");

// Test 1: Cloudflare Gateway Adapter initialization and worker registration
suite.test("F06-01: CloudflareGatewayAdapter initializes workers and emits CLOUD_REALM_READY", async () => {
  const adapter = new CloudflareGatewayAdapter();
  let readyEvent = null;
  const listener = (data) => {
    readyEvent = data;
  };
  eventBus.on("CLOUD_REALM_READY", listener);

  await adapter.init();

  assert.ok(readyEvent, "Expected CLOUD_REALM_READY event");
  assert.includes(readyEvent.gateway_url, "gateway.ai.cloudflare.com");
  assert.isArray(readyEvent.workers);
  assert.includes(readyEvent.workers, "auth-worker");
  assert.includes(readyEvent.workers, "automation-worker");
  assert.includes(readyEvent.workers, "gateway-worker");

  eventBus.removeListener("CLOUD_REALM_READY", listener);
});

// Test 2: Worker registry state validation
suite.test("F06-02: Registering custom edge worker routes preserves healthy status and routes", async () => {
  const adapter = new CloudflareGatewayAdapter();
  adapter.registerWorker("custom-syndicate-worker", "/api/syndicates/edge");

  assert.ok(adapter.activeWorkers.has("custom-syndicate-worker"));
  const worker = adapter.activeWorkers.get("custom-syndicate-worker");
  assert.equal(worker.route, "/api/syndicates/edge");
  assert.equal(worker.status, "healthy");
  assert.isNumber(worker.registered_at);
});

// Test 3: AI Gateway inference dispatch
suite.test("F06-03: dispatchInference returns model inference response", async () => {
  const adapter = new CloudflareGatewayAdapter();
  const prompt = "Synthesize economic commentary for syndicate yield cycle.";
  const result = await adapter.dispatchInference(prompt, "@cf/meta/llama-3-8b-instruct");

  assert.isObject(result);
  assert.equal(result.success, true);
  assert.equal(result.model, "@cf/meta/llama-3-8b-instruct");
  assert.isString(result.output);
  assert.includes(result.output, "Inferred response");
});

// Test 4: Custom gateway and edge URL overrides
suite.test("F06-04: Adapter respects custom gatewayUrl and edgeUrl configuration", async () => {
  const customAdapter = new CloudflareGatewayAdapter({
    gatewayUrl: "https://custom.gateway.internal/v1",
    edgeUrl: "https://edge.moneyplughub.com"
  });

  assert.equal(customAdapter.gatewayUrl, "https://custom.gateway.internal/v1");
  assert.equal(customAdapter.edgeUrl, "https://edge.moneyplughub.com");
});

// Test 5: Fallback resilience handling when upstream model name is unrecognized
suite.test("F06-05: Fallback inference safely defaults and preserves output structure", async () => {
  const adapter = new CloudflareGatewayAdapter();
  const result = await adapter.dispatchInference("Test fallback resilience", "@cf/custom/fallback-model");

  assert.equal(result.success, true);
  assert.equal(result.model, "@cf/custom/fallback-model");
  assert.isString(result.output);
});
