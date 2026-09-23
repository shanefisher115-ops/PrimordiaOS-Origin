import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 4: Termux Mobile Vessel Telemetry to Master Spine SSE");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("CR04: Termux mobile telemetry packet propagates from vessel to EventBus to active SSE browser stream", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const mobileTelemetry = {
    type: "MOBILE_VESSEL_UPDATE",
    vessel: TermuxVessel.id,
    os: TermuxVessel.os,
    battery: 94,
    thermal: "optimal",
    timestamp: Date.now()
  };

  eventBus.emit("MOBILE_VESSEL_UPDATE", mobileTelemetry);

  const received = await sse.waitForEventType("MOBILE_VESSEL_UPDATE", 3000);
  assert.equal(received.vessel, "vessel-termux-android");
  assert.equal(received.battery, 94);
  assert.equal(received.thermal, "optimal");

  sse.close();
});
