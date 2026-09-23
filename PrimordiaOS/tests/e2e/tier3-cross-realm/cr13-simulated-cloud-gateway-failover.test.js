import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { CloudflareGatewayAdapter } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 13: Cloudflare Gateway Multi-Tier Fallback Resilience");

suite.test("CR13: Inference gracefully fails over to edge worker / local fallback when primary endpoint is unreachable", async () => {
  const unreachableAdapter = new CloudflareGatewayAdapter({
    gatewayUrl: "https://invalid.unreachable.domain.ai/v1"
  });

  const res = await unreachableAdapter.dispatchInference("Fallback resiliency check prompt", "@cf/meta/llama-3-8b-instruct");
  assert.equal(res.success, true);
  assert.ok(res.output);
  assert.includes(res.output, "Fallback resiliency check prompt");
});
