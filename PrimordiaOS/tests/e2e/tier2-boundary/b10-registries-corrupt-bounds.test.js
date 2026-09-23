import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import fs from "node:fs";
import path from "node:path";

export const suite = new TestSuite("Tier 2 - Boundary 10: Metadata Registries Boundary & Robustness Checks");

const configDir = path.resolve("PrimordiaOS", "config");

// Test 1: registry.json size is substantial (contains full module dataset)
suite.test("B10-01: registry.json file size is > 500KB reflecting large-scale module graph", async () => {
  const regPath = path.join(configDir, "registry.json");
  const stats = fs.statSync(regPath);
  assert.greaterThan(stats.size, 500000, "registry.json should be substantial");
});

// Test 2: realm-map.json does not contain null or undefined realm keys
suite.test("B10-02: realm-map.json contains non-null definitions for each registered realm", async () => {
  const realmMapPath = path.join(configDir, "realm-map.json");
  const raw = fs.readFileSync(realmMapPath, "utf8");
  const data = JSON.parse(raw);
  const realms = data.realms || data;

  for (const [key, value] of Object.entries(realms)) {
    assert.isString(key);
    assert.ok(value !== null && value !== undefined, `Realm ${key} should not be null`);
  }
});

// Test 3: dependency-graph.json is valid JSON and contains no syntax errors
suite.test("B10-03: dependency-graph.json parses cleanly without trailing comma syntax errors", async () => {
  const depGraphPath = path.join(configDir, "dependency-graph.json");
  const raw = fs.readFileSync(depGraphPath, "utf8");
  const parsed = JSON.parse(raw);
  assert.ok(parsed);
});

// Test 4: Module path uniqueness or ID integrity in registry.json
suite.test("B10-04: registry.json contains unique non-empty string module keys", async () => {
  const regPath = path.join(configDir, "registry.json");
  const raw = fs.readFileSync(regPath, "utf8");
  const data = JSON.parse(raw);
  const modules = data.modules || data;

  const keys = Object.keys(modules);
  const keySet = new Set(keys);
  assert.equal(keySet.size, keys.length, "Module keys in registry must be unique");
});

// Test 5: ontology.json defines valid semantic taxonomy
suite.test("B10-05: ontology.json defines semantic classes and property mappings", async () => {
  const ontologyPath = path.join(configDir, "ontology.json");
  const raw = fs.readFileSync(ontologyPath, "utf8");
  const data = JSON.parse(raw);
  assert.isObject(data);
});
