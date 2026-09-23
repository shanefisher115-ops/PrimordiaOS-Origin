import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 6: UE5 WebSocket Message to Cockpit HUD SSE Stream");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("CR06: Inbound UE5 WebSocket message relays through Master Spine and renders on SSE HUD stream", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());

  await Promise.all([sse.connect(), ws.connect()]);
  await Promise.all([sse.waitForEvents(1), ws.waitForMessage("telemetry")]);

  // Send message from UE5 client
  ws.send({
    type: "UNREAL_CINEMATIC_COMPLETE",
    sequence: "Genesis_Cinematic_01",
    status: "playback_finished"
  });

  // EventBus catches UNREAL_MESSAGE_RECEIVED and forwards to SSE
  const sseEvt = await sse.waitForEventType("UNREAL_MESSAGE_RECEIVED", 3000);
  assert.equal(sseEvt.data.type, "UNREAL_CINEMATIC_COMPLETE");
  assert.equal(sseEvt.data.sequence, "Genesis_Cinematic_01");

  sse.close();
  ws.close();
});
