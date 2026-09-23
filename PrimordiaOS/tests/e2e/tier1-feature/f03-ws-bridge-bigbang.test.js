import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 3: Simulation Realm Port 17800 WebSocket Bridge");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: WebSocket connection handshake and initial telemetry packet
suite.test("F03-01: WS Bridge accepts connection and transmits initial telemetry handshake", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  assert.equal(ws.connected, true, "WebSocket should be connected");

  const initialMsg = await ws.waitForMessage("telemetry", 3000);
  assert.isObject(initialMsg, "Expected telemetry object");
  assert.equal(initialMsg.type, "telemetry");
  assert.equal(initialMsg.data.status, "connected");
  assert.isNumber(initialMsg.data.timestamp);
  ws.close();
});

// Test 2: Inbound UNREAL message forwards to Master Spine EventBus
suite.test("F03-02: Inbound UNREAL client message emits UNREAL_MESSAGE_RECEIVED on EventBus", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  let busEventReceived = null;
  const listener = (data) => {
    busEventReceived = data;
  };
  eventBus.on("UNREAL_MESSAGE_RECEIVED", listener);

  const testPayload = {
    type: "UNREAL_HEARTBEAT",
    fps: 120,
    camera_pos: { x: 0, y: 150, z: 200 }
  };
  ws.send(testPayload);

  // Wait for EventBus propagation
  for (let i = 0; i < 20; i++) {
    if (busEventReceived) break;
    await new Promise((r) => setTimeout(r, 50));
  }

  assert.ok(busEventReceived, "EventBus should receive UNREAL_MESSAGE_RECEIVED event");
  assert.equal(busEventReceived.type, "UNREAL_HEARTBEAT");
  assert.equal(busEventReceived.fps, 120);

  eventBus.removeListener("UNREAL_MESSAGE_RECEIVED", listener);
  ws.close();
});

// Test 3: BIG_BANG_TRIGGER broadcast to connected Unreal / HUD clients
suite.test("F03-03: BIG_BANG_TRIGGER event broadcasts to connected simulation clients", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

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

  const received = await ws.waitForMessage("BIG_BANG_TRIGGER", 3000);
  assert.equal(received.type, "BIG_BANG_TRIGGER");
  assert.equal(received.payload.genesis, true);
  assert.equal(received.payload.singularity_intensity, 2.5);
  assert.equal(received.payload.niagara_system, "NS_PrimordiaBigBang");
  assert.equal(received.payload.swarm_count, 6);

  ws.close();
});

// Test 4: SIMULATION_TICK continuous broadcasting
suite.test("F03-04: SIMULATION_TICK updates broadcast simulation metrics to clients", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  const tickData = {
    type: "SIMULATION_TICK",
    timestamp: new Date().toISOString(),
    data: {
      activeEntities: 142,
      particleDensity: 0.94,
      frameTimeMs: 8.3
    }
  };

  eventBus.emit("SIMULATION_TICK", tickData);

  const received = await ws.waitForMessage("SIMULATION_TICK", 3000);
  assert.equal(received.type, "SIMULATION_TICK");
  assert.equal(received.data.activeEntities, 142);
  assert.equal(received.data.particleDensity, 0.94);

  ws.close();
});

// Test 5: Multiple concurrent WebSocket clients all receive simultaneous triggers
suite.test("F03-05: Multi-client WS broadcast delivers triggers to all connected nodes", async () => {
  const ws1 = new WsTestClient(defaultTestEnv.getWsUrl());
  const ws2 = new WsTestClient(defaultTestEnv.getWsUrl());

  await Promise.all([ws1.connect(), ws2.connect()]);
  await Promise.all([ws1.waitForMessage("telemetry"), ws2.waitForMessage("telemetry")]);

  const testTrigger = {
    type: "BIG_BANG_TRIGGER",
    payload: { genesis: true, swarm_count: 12 }
  };

  eventBus.emit("BIG_BANG_TRIGGER", testTrigger);

  const [msg1, msg2] = await Promise.all([
    ws1.waitForMessage("BIG_BANG_TRIGGER", 3000),
    ws2.waitForMessage("BIG_BANG_TRIGGER", 3000)
  ]);

  assert.equal(msg1.payload.swarm_count, 12);
  assert.equal(msg2.payload.swarm_count, 12);

  ws1.close();
  ws2.close();
});
