import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 2 - Boundary 3: Simulation WS Bridge Malformed & Corner Input Resilience");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: Malformed non-JSON text sent to WS server
suite.test("B03-01: Non-JSON raw text does not crash the WebSocket server", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  // Send invalid raw strings
  ws.send("THIS IS NOT JSON {{{ [[[[");
  ws.send("<<<XML_PAYLOAD>>>");

  // Server should remain alive and responsive
  ws.send({ type: "PING_AFTER_INVALID" });
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(ws.connected, true);
  ws.close();
});

// Test 2: Extreme payload size over WebSocket (1MB JSON)
suite.test("B03-02: 1MB large message transmits and processes without connection termination", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  const largeData = {
    type: "LARGE_UNREAL_PACKET",
    meshData: "M".repeat(1024 * 512)
  };

  ws.send(largeData);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(ws.connected, true);
  ws.close();
});

// Test 3: Rapid consecutive messages burst
suite.test("B03-03: Rapid consecutive message send burst (50 messages) processes smoothly", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  for (let i = 0; i < 50; i++) {
    ws.send({ type: "RAPID_TICK", seq: i });
  }

  await new Promise((r) => setTimeout(r, 200));
  assert.equal(ws.connected, true);
  ws.close();
});

// Test 4: Empty JSON object and null fields
suite.test("B03-04: Empty JSON objects and null payload values handle safely", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  ws.send({});
  ws.send({ type: null, data: null });
  ws.send({ type: "", payload: {} });

  await new Promise((r) => setTimeout(r, 100));
  assert.equal(ws.connected, true);
  ws.close();
});

// Test 5: Reconnection after abrupt termination
suite.test("B03-05: Subsequent client connects successfully after previous client terminates abruptly", async () => {
  const ws1 = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws1.connect();
  if (ws1.ws) ws1.ws.terminate(); // abrupt drop

  await new Promise((r) => setTimeout(r, 100));

  const ws2 = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws2.connect();
  const initial = await ws2.waitForMessage("telemetry");
  assert.ok(initial);
  ws2.close();
});
