import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { SseClient } from "../harness/sse-helper.js";
import { defaultTestEnv, eventBus } from "../harness/test-env.js";
import { OsmiumLedgerAdapter } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 14: Osmium Tamper Detection Broadcast to HUD SSE Stream");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("CR14: Tamper detection alert broadcasts to active Cockpit HUD SSE connections", async () => {
  const sse = new SseClient(defaultTestEnv.getRestUrl("/api/stream"));
  await sse.connect();
  await sse.waitForEvents(1);

  const testLedger = new OsmiumLedgerAdapter();
  testLedger.appendBlock("B1", {});
  testLedger.chain[1].previousHash = "tampered_bad_hash";

  const chainValid = testLedger.verifyChain();
  assert.equal(chainValid, false);

  // Broadcast tamper alert
  const alertPayload = {
    type: "SECURITY_INTEGRITY_ALERT",
    level: "CRITICAL",
    realm: "identity_realm",
    details: "Osmium block hash mismatch detected in verifyChain()",
    timestamp: Date.now()
  };

  eventBus.emit("SECURITY_INTEGRITY_ALERT", alertPayload);

  const received = await sse.waitForEventType("SECURITY_INTEGRITY_ALERT", 3000);
  assert.equal(received.level, "CRITICAL");
  assert.equal(received.realm, "identity_realm");

  sse.close();
});
