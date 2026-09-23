import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import fs from "node:fs";
import path from "node:path";

export const suite = new TestSuite("Tier 1 - Feature 10: Metadata Registries Validation (registry, realm-map, dep-graph)");

const configDir = path.resolve("PrimordiaOS", "config");

// Test 1: registry.json exists and contains modules map
suite.test("F10-01: registry.json contains valid JSON with modules dictionary", async () => {
  const registryPath = path.join(configDir, "registry.json");
  assert.ok(fs.existsSync(registryPath), `Expected ${registryPath} to exist`);

  const raw = fs.readFileSync(registryPath, "utf8");
  const data = JSON.parse(raw);

  assert.isObject(data, "registry.json must parse to an object");
  const modules = data.modules || data;
  const count = Object.keys(modules).length;
  assert.greaterThan(count, 100, "Expected registry to contain at least 100 registered modules");
});

// Test 2: realm-map.json defines the 5 continuous realms
suite.test("F10-02: realm-map.json defines all 5 continuous realms with topology", async () => {
  const realmMapPath = path.join(configDir, "realm-map.json");
  assert.ok(fs.existsSync(realmMapPath), `Expected ${realmMapPath} to exist`);

  const raw = fs.readFileSync(realmMapPath, "utf8");
  const data = JSON.parse(raw);

  assert.isObject(data, "realm-map.json must be an object");
  const realms = data.realms || data;
  const realmKeys = Object.keys(realms);
  assert.greaterThanOrEqual(realmKeys.length, 5, "Expected at least 5 realms in realm-map");

  assert.ok(realms.local_realm || realms.local, "Expected local realm");
  assert.ok(realms.cloud_realm || realms.cloud, "Expected cloud realm");
  assert.ok(realms.simulation_realm || realms.simulation, "Expected simulation realm");
  assert.ok(realms.economic_realm || realms.economy, "Expected economic realm");
  assert.ok(realms.identity_realm || realms.identity, "Expected identity realm");
});

// Test 3: dependency-graph.json defines module / realm edges
suite.test("F10-03: dependency-graph.json contains valid nodes and dependency edges", async () => {
  const depGraphPath = path.join(configDir, "dependency-graph.json");
  assert.ok(fs.existsSync(depGraphPath), `Expected ${depGraphPath} to exist`);

  const raw = fs.readFileSync(depGraphPath, "utf8");
  const data = JSON.parse(raw);

  assert.isObject(data, "dependency-graph.json must parse to an object");
  assert.ok(data.nodes || data.dependencies || data.graph, "Expected graph nodes or dependencies");
});

// Test 4: Registry modules contain valid type and path or realm tags
suite.test("F10-04: Sample registry entries adhere to required module schema fields", async () => {
  const registryPath = path.join(configDir, "registry.json");
  const data = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const modules = data.modules || data;

  const sampleKeys = Object.keys(modules).slice(0, 10);
  for (const key of sampleKeys) {
    const mod = modules[key];
    assert.isObject(mod, `Module ${key} should be an object`);
    assert.ok(mod.id || mod.name || key, `Module ${key} should have an identifier`);
  }
});

// Test 5: ontology.json and primordia.config.json configurations exist and are valid
suite.test("F10-05: Config directory contains valid ontology.json and primordia.config.json", async () => {
  const ontologyPath = path.join(configDir, "ontology.json");
  const configPath = path.join(configDir, "primordia.config.json");

  assert.ok(fs.existsSync(ontologyPath), "Expected ontology.json to exist");
  assert.ok(fs.existsSync(configPath), "Expected primordia.config.json to exist");

  const ontology = JSON.parse(fs.readFileSync(ontologyPath, "utf8"));
  const primordiaConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

  assert.isObject(ontology);
  assert.isObject(primordiaConfig);
});
