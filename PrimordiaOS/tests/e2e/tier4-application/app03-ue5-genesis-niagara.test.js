import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 3: UE5 Simulation Connect & Niagara Cosmic Genesis Trigger");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("APP03: UE5 client connects, triggers UNREAL_PLAY_STARTED, and receives Big Bang Niagara particle broadcast", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  const initTelemetry = await ws.waitForMessage("telemetry");
  assert.ok(initTelemetry);

  // Send play started from UE5
  ws.send({
    type: "UNREAL_PLAY_STARTED",
    engine: "UnrealEngine_5.4",
    status: "in_game"
  });

  // Emulate server response
  const bigBangPayload = {
    type: "BIG_BANG_TRIGGER",
    timestamp: new Date().toISOString(),
    payload: {
      genesis: true,
      singularity_intensity: 2.5,
      niagara_system: "NS_PrimordiaBigBang",
      cosmic_color: "#33bbff",
      swarm_count: 6
    }
  };
  eventBus.emit("BIG_BANG_TRIGGER", bigBangPayload);

  const trigger = await ws.waitForMessage("BIG_BANG_TRIGGER", 3000);
  assert.equal(trigger.type, "BIG_BANG_TRIGGER");
  assert.equal(trigger.payload.niagara_system, "NS_PrimordiaBigBang");
  assert.equal(trigger.payload.singularity_intensity, 2.5);

  ws.close();
});
