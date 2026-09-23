import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { get, httpRequest } from "../harness/http-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 2 - Boundary 12: Cockpit HUD HTTP Resilience & Static Assets Boundary");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: Rapid concurrent page requests (10 GET requests)
suite.test("B12-01: 10 concurrent requests to /dashboard serve without socket exhaustion or timeout", async () => {
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(get(defaultTestEnv.getRestUrl("/dashboard")));
  }
  const responses = await Promise.all(promises);
  assert.equal(responses.length, 10);
  responses.forEach((res) => {
    assert.equal(res.status, 200);
    assert.includes(res.body, "PRIMORDIA");
  });
});

// Test 2: Custom headers handling (Accept-Language, User-Agent, X-Custom)
suite.test("B12-02: Non-standard browser headers and mobile user-agents serve dashboard normally", async () => {
  const customHeaders = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14; Termux) Mobile Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Primordial-Realm": "vessel-termux-android"
  };

  const res = await get(defaultTestEnv.getRestUrl("/dashboard"), { headers: customHeaders });
  assert.equal(res.status, 200);
  assert.includes(res.headers["content-type"], "text/html");
});

// Test 3: HEAD request on dashboard
suite.test("B12-03: HEAD request to / returns headers without crashing the server", async () => {
  const res = await httpRequest(defaultTestEnv.getRestUrl("/"), { method: "HEAD" });
  assert.ok(res.status === 200 || res.status === 404);
});

// Test 4: Path normalization with multiple slashes
suite.test("B12-04: Path with redundant slashes (///) resolves cleanly or returns 404", async () => {
  const res = await get(defaultTestEnv.getRestUrl("///"));
  assert.ok(res.status === 200 || res.status === 404);
});

// Test 5: UTF-8 encoding in HTML body
suite.test("B12-05: Dashboard Content-Type header specifies UTF-8 charset", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/dashboard"));
  assert.includes(res.headers["content-type"].toLowerCase(), "utf-8");
});
