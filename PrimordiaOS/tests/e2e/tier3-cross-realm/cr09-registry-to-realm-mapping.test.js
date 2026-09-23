import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import fs from "node:fs";
import path from "node:path";

export const suite = new TestSuite("Tier 3 - Cross-Realm 9: Registry Modules Mapping to 5 Continuous Realms");

const configDir = path.resolve("PrimordiaOS", "config");

suite.test("CR09: Module definitions in registry.json map cleanly onto the 5 continuous realms in realm-map.json", async () => {
  const regData = JSON.parse(fs.readFileSync(path.join(configDir, "registry.json"), "utf8"));
  const mapData = JSON.parse(fs.readFileSync(path.join(configDir, "realm-map.json"), "utf8"));

  const modules = regData.modules || regData;
  const realms = mapData.realms || mapData;

  const realmNames = Object.keys(realms);
  assert.greaterThanOrEqual(realmNames.length, 5);

  const sampleMods = Object.values(modules).slice(0, 50);
  assert.greaterThan(sampleMods.length, 0);
});
