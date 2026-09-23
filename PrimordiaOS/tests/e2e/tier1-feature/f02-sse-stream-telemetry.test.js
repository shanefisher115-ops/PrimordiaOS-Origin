import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 2: Port 3000 /api/stream Live SSE Telemetry");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: SSE Handshake and initial CONNECTED frame
suite.test("F02-01: SSE Handshake establishes 200 text/event-stream and emits CONNECTED", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  const conn = await sse.connect();
  assert.equal(conn.statusCode, 200, "Expected HTTP 200");
  assert.includes(conn.headers["content-type"], "text/event-stream", "Expected text/event-stream content type");

  const events = await sse.waitForEvents(1, 4000);
  assert.greaterThanOrEqual(events.length, 1, "Expected at least 1 event");
  assert.equal(events[0].type, "CONNECTED", "First event should be CONNECTED");
  assert.isNumber(events[0].timestamp, "Expected numeric timestamp");
  sse.close();
});

// Test 2: SSE Stream receives forwarded CYCLE_COMPLETED events
suite.test("F02-02: SSE Client receives CYCLE_COMPLETED telemetry from EventBus", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const testCycleData = {
    type: "CYCLE_COMPLETED",
    cycleId: "test_cycle_101",
    timestamp: Date.now(),
    ledgerEntry: { index: 42, hash: "abc123hash" },
    commentary: "Autonomous pulse successfully executed."
  };

  eventBus.emit("CYCLE_COMPLETED", testCycleData);

  const event = await sse.waitForEventType("CYCLE_COMPLETED", 3000);
  assert.ok(event, "Should receive CYCLE_COMPLETED event");
  assert.equal(event.cycleId, "test_cycle_101");
  assert.equal(event.ledgerEntry.index, 42);
  sse.close();
});

// Test 3: Multiple concurrent SSE clients all receive broadcast telemetry
suite.test("F02-03: Multi-client SSE broadcast delivers events to all active connections", async () => {
  const clientA = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  const clientB = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));

  await Promise.all([clientA.connect(), clientB.connect()]);
  await Promise.all([clientA.waitForEvents(1), clientB.waitForEvents(1)]);

  const broadcastPayload = {
    type: "TELEMETRY_UPDATE",
    metrics: { cpu: 12, memoryMb: 140, activeRealms: 5 },
    timestamp: Date.now()
  };

  eventBus.emit("TELEMETRY_UPDATE", broadcastPayload);

  const [evtA, evtB] = await Promise.all([
    clientA.waitForEventType("TELEMETRY_UPDATE", 3000),
    clientB.waitForEventType("TELEMETRY_UPDATE", 3000)
  ]);

  assert.equal(evtA.metrics.activeRealms, 5);
  assert.equal(evtB.metrics.activeRealms, 5);

  clientA.close();
  clientB.close();
});

// Test 4: SSE Stream handles UNREAL_EVENT notifications
suite.test("F02-04: SSE Stream streams UNREAL_EVENT triggers to HUD listeners", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const unrealEvent = {
    type: "UNREAL_EVENT",
    action: "NIAGARA_BURST",
    emitter: "NS_CosmicGenesis",
    intensity: 3.0
  };

  eventBus.emit("UNREAL_EVENT", unrealEvent);

  const received = await sse.waitForEventType("UNREAL_EVENT", 3000);
  assert.equal(received.action, "NIAGARA_BURST");
  assert.equal(received.intensity, 3.0);
  sse.close();
});

// Test 5: Client disconnect terminates gracefully without server errors
suite.test("F02-05: Client disconnect frees listener resources without throwing exceptions", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  assert.ok(sse.connected, "SSE client should be connected");
  sse.close();
  assert.equal(sse.connected, false, "SSE client should be closed");

  // Post another event to verify server handles deleted client gracefully
  eventBus.emit("HEARTBEAT_TEST", { test: true });
});
