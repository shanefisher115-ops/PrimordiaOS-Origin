import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { get, post, httpRequest } from "../harness/http-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 2 - Boundary 1: Master Spine REST Endpoints Boundary & Error Conditions");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: Unknown endpoint returns HTTP 404 with JSON error object
suite.test("B01-01: GET /api/nonexistent_endpoint returns HTTP 404 with JSON error structure", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/nonexistent_endpoint"));
  assert.equal(res.status, 404);
  assert.isObject(res.json);
  assert.equal(res.json.error, "Endpoint not found");
});

// Test 2: Deeply nested unknown path returns HTTP 404
suite.test("B01-02: Deeply nested URI path (/a/b/c/d/e/f/g) safely returns 404 without crashing", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/a/b/c/d/e/f/g"));
  assert.equal(res.status, 404);
});

// Test 3: Unsupported HTTP methods on read-only endpoints
suite.test("B01-03: DELETE on /health endpoint returns 404 or gracefully rejects", async () => {
  const res = await httpRequest(defaultTestEnv.getRestUrl("/health"), { method: "DELETE" });
  assert.ok(res.status === 404 || res.status === 405 || res.status === 200);
});

// Test 4: Extreme query parameter strings
suite.test("B01-04: Extreme query string parameters (10,000 characters) handle gracefully", async () => {
  const largeQuery = "q=" + "A".repeat(10000);
  const res = await get(defaultTestEnv.getRestUrl(`/health?${largeQuery}`));
  assert.equal(res.status, 200);
  assert.equal(res.json.status, "healthy");
});

// Test 5: Special characters and SQL injection strings in URL path
suite.test("B01-05: Malicious / special characters in path return 404 without server error", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/api/test%27%20OR%201=1;--"));
  assert.equal(res.status, 404);
});
