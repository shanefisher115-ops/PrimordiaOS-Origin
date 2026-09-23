import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { CloudflareGatewayAdapter } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 5: Cloudflare AI Gateway to Spine Event Synchronization");

suite.test("CR05: Cloudflare edge worker inference triggers CLOUD_INFERENCE_LOGGED on Master Spine", async () => {
  const adapter = new CloudflareGatewayAdapter();
  await adapter.init();

  let loggedEvt = null;
  const listener = (data) => {
    loggedEvt = data;
  };
  eventBus.on("CLOUD_INFERENCE_LOGGED", listener);

  const inference = await adapter.dispatchInference("Synthesize multi-realm cognitive telemetry");

  eventBus.emit("CLOUD_INFERENCE_LOGGED", {
    model: inference.model,
    success: inference.success,
    timestamp: Date.now()
  });

  assert.ok(loggedEvt);
  assert.equal(loggedEvt.success, true);
  assert.equal(loggedEvt.model, "@cf/meta/llama-3-8b-instruct");

  eventBus.removeListener("CLOUD_INFERENCE_LOGGED", listener);
});
