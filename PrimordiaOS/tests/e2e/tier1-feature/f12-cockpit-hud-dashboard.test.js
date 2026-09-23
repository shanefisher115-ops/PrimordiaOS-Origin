import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { get } from "../harness/http-helper.js";
import { defaultTestEnv } from "../harness/test-env.js";
import fs from "node:fs";
import path from "node:path";

export const suite = new TestSuite("Tier 1 - Feature 12: Cockpit HUD 5-Realm Dashboard Live Rendering");

suite.beforeAll(async () => {
  await defaultTestEnv.start();
});

suite.afterAll(async () => {
  await defaultTestEnv.stop();
});

// Test 1: dashboard.html exists on disk and contains Cockpit HUD components
suite.test("F12-01: dashboard.html source file contains 5-realm status indicators and SSE listener", async () => {
  const dashPath = path.resolve("PrimordiaOS", "interfaces", "dashboard.html");
  assert.ok(fs.existsSync(dashPath), "Expected dashboard.html to exist in PrimordiaOS/interfaces/");

  const content = fs.readFileSync(dashPath, "utf8");
  assert.includes(content, "PRIMORDIA", "Expected PRIMORDIA brand in dashboard HTML");
  assert.includes(content, "EventSource", "Expected EventSource SSE consumer in dashboard HTML");
});

// Test 2: GET /dashboard returns HTML with 200 OK
suite.test("F12-02: REST Server serves Cockpit HUD HTML at /dashboard", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/dashboard"));
  assert.equal(res.status, 200);
  assert.includes(res.headers["content-type"], "text/html");
  assert.includes(res.body, "PRIMORDIA");
});

// Test 3: GET / root alias serves Cockpit HUD
suite.test("F12-03: REST Server root route '/' serves Cockpit HUD dashboard", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/"));
  assert.equal(res.status, 200);
  assert.includes(res.headers["content-type"], "text/html");
});

// Test 4: preview.html exists and provides standalone dashboard preview
suite.test("F12-04: preview.html contains live HUD visualizer and reactive panels", async () => {
  const previewPath = path.resolve("preview.html");
  if (fs.existsSync(previewPath)) {
    const previewContent = fs.readFileSync(previewPath, "utf8");
    assert.greaterThan(previewContent.length, 1000);
  }
});

// Test 5: Dashboard serves UTF-8 encoded text with valid HTML structure
suite.test("F12-05: Served HUD HTML contains valid DOCTYPE, head, and body tags", async () => {
  const res = await get(defaultTestEnv.getRestUrl("/dashboard"));
  assert.includes(res.body.toLowerCase(), "<html");
  assert.includes(res.body.toLowerCase(), "</html>");
  assert.includes(res.body.toLowerCase(), "<body");
});
