import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { spine } from "../../../PrimordiaOS/kernel/spine.js";
import { Realms } from "../../../PrimordiaOS/realms/index.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 15: Synchronized 5-Realm Handshake & Registration");

suite.test("CR15: Universal bootloader registers and synchronizes all 5 continuous realms simultaneously", async () => {
  assert.ok(Realms.local, "Local Realm definition must exist");
  assert.ok(Realms.cloud, "Cloud Realm definition must exist");
  assert.ok(Realms.simulation, "Simulation Realm definition must exist");
  assert.ok(Realms.economy, "Economic Realm definition must exist");
  assert.ok(Realms.identity, "Identity Realm definition must exist");

  spine.registerRealm("local_realm", Realms.local);
  spine.registerRealm("cloud_realm", Realms.cloud);
  spine.registerRealm("simulation_realm", Realms.simulation);
  spine.registerRealm("economic_realm", Realms.economy);
  spine.registerRealm("identity_realm", Realms.identity);

  const status = spine.getStatus();
  assert.equal(status.status, "running");
  assert.equal(Object.keys(status.registered_realms).length, 5);
});
