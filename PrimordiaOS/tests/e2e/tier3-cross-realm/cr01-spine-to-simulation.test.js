import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { post } from "../harness/http-helper.js";
import { WsTestClient } from "../harness/ws-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 1: Master Spine REST Trigger to Simulation WS Bridge");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

suite.test("CR01: POST /api/trigger-bigbang triggers BIG_BANG_TRIGGER broadcast to Port 17800 WS clients", async () => {
  const ws = new WsTestClient(defaultTestEnv.getWsUrl());
  await ws.connect();
  await ws.waitForMessage("telemetry");

  const res = await post(defaultTestEnv.getRestUrl("/api/trigger-bigbang"), {});
  assert.equal(res.status, 200);
  assert.equal(res.json.status, "triggered");

  const wsMsg = await ws.waitForMessage("BIG_BANG_TRIGGER", 3000);
  assert.ok(wsMsg);
  assert.equal(wsMsg.type, "BIG_BANG_TRIGGER");
  assert.equal(wsMsg.payload.genesis, true);
  assert.equal(wsMsg.payload.niagara_system, "NS_PrimordiaBigBang");

  ws.close();
});
