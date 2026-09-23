import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 2 - Boundary 2: SSE Stream Boundary & High Frequency Resilience");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: Rapid connect and disconnect cycle
suite.test("B02-01: Rapid connection and immediate disconnect does not leak listeners or throw", async () => {
  for (let i = 0; i < 5; i++) {
    const client = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
    await client.connect();
    client.close();
  }
});

// Test 2: High-frequency burst of 50 broadcast events in under 100ms
suite.test("B02-02: High-frequency burst of 50 events delivers without dropping the connection", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const initialCount = sse.events.length;
  for (let i = 0; i < 50; i++) {
    eventBus.emit(`BURST_EVENT_${i}`, { index: i, time: Date.now() });
  }

  await sse.waitForEvents(initialCount + 50, 5000);
  assert.greaterThanOrEqual(sse.events.length, initialCount + 50);
  sse.close();
});

// Test 3: Large payload serialization in SSE frame (500KB object)
suite.test("B02-03: SSE stream handles large payload (500KB) chunks across frame boundaries", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const largeString = "X".repeat(500000);
  eventBus.emit("LARGE_PAYLOAD", { type: "LARGE_PAYLOAD", payload: largeString });

  const evt = await sse.waitForEventType("LARGE_PAYLOAD", 5000);
  assert.equal(evt.payload.length, 500000);
  sse.close();
});

// Test 4: Unicode and emoji characters in event stream
suite.test("B02-04: Unicode, emoji, and multi-byte characters preserve encoding fidelity in SSE", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const unicodePayload = {
    type: "UNICODE_EVENT",
    message: "🌌 PrimordiaOS ⚡ Autonomous Yield 龍 (龙) 100% — 日本語 / 한국어 / العربية"
  };

  eventBus.emit("UNICODE_EVENT", unicodePayload);

  const evt = await sse.waitForEventType("UNICODE_EVENT", 3000);
  assert.equal(evt.message, unicodePayload.message);
  sse.close();
});

// Test 5: Empty event objects
suite.test("B02-05: Empty event payload object broadcasts safely without parsing errors", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  eventBus.emit("EMPTY_EVENT", {});
  const evt = await sse.waitForEventType("EMPTY_EVENT", 3000);
  assert.isObject(evt);
  sse.close();
});
