import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";
import { CloudflareGatewayAdapter } from "../../../PrimordiaOS/realms/cloud/cloudflare-gateway.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 4: Mobile Telemetry Ingestion & Cloudflare Edge Fallback");

suite.test("APP04: Ingest Termux mobile edge telemetry and route through Cloudflare AI Gateway with fallback resilience", async () => {
  // 1. Ingest telemetry from Android node
  const mobileTelemetry = {
    vessel: TermuxVessel.id,
    os: TermuxVessel.os,
    battery: 76,
    signalDbm: -68,
    timestamp: Date.now()
  };

  let captured = null;
  const listener = (data) => {
    captured = data;
  };
  eventBus.on("MOBILE_TELEMETRY_INGESTED", listener);

  eventBus.emit("MOBILE_TELEMETRY_INGESTED", mobileTelemetry);
  assert.ok(captured);
  assert.equal(captured.vessel, "vessel-termux-android");

  // 2. Dispatch through Cloudflare Gateway
  const gateway = new CloudflareGatewayAdapter();
  await gateway.init();

  const inference = await gateway.dispatchInference(
    `Synthesize telemetry report for mobile vessel ${TermuxVessel.id} (Battery: ${mobileTelemetry.battery}%)`
  );

  assert.equal(inference.success, true);
  assert.isString(inference.output);
  assert.includes(inference.output, "vessel-termux-android");

  eventBus.removeListener("MOBILE_TELEMETRY_INGESTED", listener);
});
