import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 10: Simultaneous SSE & WebSocket Coordinated Broadcast");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("CR10: Single EventBus trigger broadcasts simultaneously across both REST SSE stream and Simulation WS bridge", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());

  await Promise.all([sse.connect(), ws.connect()]);
  await Promise.all([sse.waitForEvents(1), ws.waitForMessage("telemetry")]);

  const coordinatedPayload = {
    type: "BIG_BANG_TRIGGER",
    payload: {
      genesis: true,
      singularity_intensity: 3.5,
      niagara_system: "NS_PrimordiaBigBang",
      cosmic_color: "#7700ff",
      swarm_count: 8
    }
  };

  eventBus.emit("BIG_BANG_TRIGGER", coordinatedPayload);

  const [sseMsg, wsMsg] = await Promise.all([
    sse.waitForEventType("BIG_BANG_TRIGGER", 3000),
    ws.waitForMessage("BIG_BANG_TRIGGER", 3000)
  ]);

  assert.equal(sseMsg.payload.singularity_intensity, 3.5);
  assert.equal(wsMsg.payload.singularity_intensity, 3.5);
  assert.equal(sseMsg.payload.cosmic_color, "#7700ff");
  assert.equal(wsMsg.payload.cosmic_color, "#7700ff");

  sse.close();
  ws.close();
});
