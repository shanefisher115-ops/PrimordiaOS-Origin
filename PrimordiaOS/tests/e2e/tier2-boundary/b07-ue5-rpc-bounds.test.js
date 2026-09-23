import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { unrealBridge } from "../../../PrimordiaOS/realms/simulation/unreal-bridge.js";

export const suite = new TestSuite("Tier 2 - Boundary 7: Unreal Engine 5 RPC Bridge Boundary Parameters");

// Test 1: Zero intensity trigger
suite.test("B07-01: Zero intensity (0.0) trigger passes and defaults or preserves numeric precision", async () => {
  const result = unrealBridge.triggerBigBang({ intensity: 0.0 });
  assert.isNumber(result.singularity_intensity);
  assert.equal(result.singularity_intensity, 2.5); // Defaults on falsy 0
});

// Test 2: Extreme intensity trigger (100.0)
suite.test("B07-02: Extreme singularity intensity (100.0) sets without clamp failure", async () => {
  const result = unrealBridge.triggerBigBang({ intensity: 100.0 });
  assert.equal(result.singularity_intensity, 100.0);
});

// Test 3: Large swarm count (10,000 particles)
suite.test("B07-03: Massive swarm count parameter (10,000 particles) propagates accurately", async () => {
  const result = unrealBridge.triggerBigBang({ swarmCount: 10000 });
  assert.equal(result.swarm_count, 10000);
});

// Test 4: Custom Niagara particle system asset path
suite.test("B07-04: Complex Niagara asset path string assigns correctly to trigger payload", async () => {
  const path = "/Game/Primordia/VFX/Niagara/NS_UltraSingularity_v2.NS_UltraSingularity_v2";
  const result = unrealBridge.triggerBigBang({ niagara: path });
  assert.equal(result.niagara_system, path);
});

// Test 5: Empty options object triggers standard genesis defaults
suite.test("B07-05: Empty options object triggers standard genesis configuration defaults", async () => {
  const result = unrealBridge.triggerBigBang({});
  assert.equal(result.genesis, true);
  assert.equal(result.singularity_intensity, 2.5);
  assert.equal(result.niagara_system, "NS_PrimordiaBigBang");
  assert.equal(result.cosmic_color, "#33bbff");
  assert.equal(result.swarm_count, 6);
});
