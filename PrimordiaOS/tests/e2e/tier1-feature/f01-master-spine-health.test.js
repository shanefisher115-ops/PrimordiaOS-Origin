import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { get, post, httpRequest } from "../harness/http-helper.js";
import { defaultTestEnv, spine, stateBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 1: Master Spine REST Endpoints (/health, /api/status, /api/realms)");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: GET /health returns HTTP 200 with status: healthy, spine_booted, and timestamp
suite.test("F01-01: GET /health returns HTTP 200 with healthy status schema", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/health"));
  assert.equal(res.status, 200, "Expected HTTP 200 status");
  assert.isObject(res.json, "Expected JSON object body");
  assert.equal(res.json.status, "healthy", "Expected status to be 'healthy'");
  assert.isNumber(res.json.timestamp, "Expected numeric timestamp");
  assert.isBoolean(res.json.spine_booted, "Expected spine_booted boolean flag");
  assert.equal(res.json.spine_booted, true, "Expected spine_booted to be true");
});

// Test 2: GET /api/health alias matches /health schema
suite.test("F01-02: GET /api/health returns identical status schema", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/health"));
  assert.equal(res.status, 200, "Expected HTTP 200 status");
  assert.equal(res.json.status, "healthy", "Expected status to be 'healthy'");
  assert.greaterThan(res.json.timestamp, 0, "Expected positive timestamp");
});

// Test 3: GET /api/status returns spine status with uptime and pulse count
suite.test("F01-03: GET /api/status returns spine runtime metrics and active realms", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/status"));
  assert.equal(res.status, 200, "Expected HTTP 200 status");
  assert.isObject(res.json, "Expected status JSON object");
  assert.equal(res.json.status, "running", "Expected spine status to be 'running'");
  assert.isNumber(res.json.uptime_seconds, "Expected uptime_seconds numeric metric");
  assert.isNumber(res.json.pulse_count, "Expected pulse_count numeric metric");
  assert.isObject(res.json.registered_realms, "Expected registered_realms object map");
});

// Test 4: GET /api/realms returns the 5 continuous realms snapshot
suite.test("F01-04: GET /api/realms returns 5 continuous realm definitions and states", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/realms"));
  assert.equal(res.status, 200, "Expected HTTP 200 status");
  assert.isObject(res.json, "Expected realms state object");

  const realmKeys = Object.keys(res.json);
  assert.greaterThanOrEqual(realmKeys.length, 5, "Expected at least 5 continuous realms registered");
  assert.ok(res.json.local_realm, "Expected local_realm in realms snapshot");
  assert.ok(res.json.cloud_realm, "Expected cloud_realm in realms snapshot");
  assert.ok(res.json.simulation_realm, "Expected simulation_realm in realms snapshot");
  assert.ok(res.json.economic_realm, "Expected economic_realm in realms snapshot");
  assert.ok(res.json.identity_realm, "Expected identity_realm in realms snapshot");
});

// Test 5: CORS Headers are present on all REST requests
suite.test("F01-05: OPTIONS /health and GET requests include CORS headers for HUD integration", async () => {
  const optRes = await httpRequest(defaultTestEnv.getRestUrl("/health"), { method: "OPTIONS" });
  assert.equal(optRes.status, 204, "Expected HTTP 204 for OPTIONS preflight");
  assert.equal(optRes.headers["access-control-allow-origin"], "*", "Expected Access-Control-Allow-Origin: *");

  const getRes = await get(defaultTestEnv.getRestUrl("/health"));
  assert.equal(getRes.headers["access-control-allow-origin"], "*", "Expected Access-Control-Allow-Origin: * on GET");
});
