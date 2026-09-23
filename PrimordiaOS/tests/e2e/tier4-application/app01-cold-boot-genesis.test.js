import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { defaultTestEnv, spine, eventBus } from "../harness/test-env.js";
import { SseClient } from "../harness/sse-helper.js";
import { get } from "../harness/http-helper.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 1: Full Cold-Boot Genesis & 5-Realm Live Stream");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("APP01: Cold boot Master Spine, establish live SSE telemetry stream, and verify 5-realm live pulse", async () => {
  // 1. Verify health
  const healthRes = await get(defaultTestEnv.getRestUrl("/health"));
  assert.equal(healthRes.status, 200);
  assert.equal(healthRes.json.status, "healthy");
  assert.equal(healthRes.json.spine_booted, true);

  // 2. Verify all 5 realms status
  const realmsRes = await get(defaultTestEnv.getRestUrl("/api/realms"));
  assert.equal(realmsRes.status, 200);
  const realmKeys = Object.keys(realmsRes.json);
  assert.greaterThanOrEqual(realmKeys.length, 5);

  // 3. Connect SSE Client (Cockpit HUD)
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  const initial = await sse.waitForEvents(1);
  assert.equal(initial[0].type, "CONNECTED");

  // 4. Trigger genesis pulse across all realms
  eventBus.emit("GENESIS_BOOT_COMPLETED", {
    type: "GENESIS_BOOT_COMPLETED",
    realms: realmKeys,
    timestamp: Date.now()
  });

  const genesisEvt = await sse.waitForEventType("GENESIS_BOOT_COMPLETED", 3000);
  assert.equal(genesisEvt.realms.length, realmKeys.length);

  sse.close();
});
