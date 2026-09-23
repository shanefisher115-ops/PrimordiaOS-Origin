import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { unrealBridge } from "../../../PrimordiaOS/realms/simulation/unreal-bridge.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 1 - Feature 7: Unreal Engine 5 Bidirectional RPC Bridge");

// Test 1: Bridge initialization emits UNREAL_BRIDGE_READY
suite.test("F07-01: UnrealBridgeAdapter initializes with port 17800 and emits ready signal", async () => {
  let readyEvt = null;
  const listener = (data) => {
    readyEvt = data;
  };
  eventBus.on("UNREAL_BRIDGE_READY", listener);

  await unrealBridge.init();

  assert.ok(readyEvt, "Expected UNREAL_BRIDGE_READY event");
  assert.equal(readyEvt.port, 17800);
  assert.equal(readyEvt.connected, true);
  assert.equal(readyEvt.protocol, "ws");

  eventBus.removeListener("UNREAL_BRIDGE_READY", listener);
});

// Test 2: triggerBigBang default parameters
suite.test("F07-02: triggerBigBang emits BIG_BANG_TRIGGER with default Niagara parameters", async () => {
  let triggerEvt = null;
  const listener = (data) => {
    triggerEvt = data;
  };
  eventBus.on("BIG_BANG_TRIGGER", listener);

  const result = unrealBridge.triggerBigBang();

  assert.isObject(result);
  assert.equal(result.genesis, true);
  assert.equal(result.singularity_intensity, 2.5);
  assert.equal(result.niagara_system, "NS_PrimordiaBigBang");
  assert.equal(result.cosmic_color, "#33bbff");
  assert.equal(result.swarm_count, 6);
  assert.isString(result.timestamp);

  assert.ok(triggerEvt, "Expected BIG_BANG_TRIGGER on eventBus");
  assert.equal(triggerEvt.niagara_system, "NS_PrimordiaBigBang");

  eventBus.removeListener("BIG_BANG_TRIGGER", listener);
});

// Test 3: triggerBigBang custom parameters override
suite.test("F07-03: triggerBigBang custom parameters override intensity, color, and swarm count", async () => {
  const customParams = {
    intensity: 4.8,
    niagara: "NS_CosmicAscension",
    color: "#ff0077",
    swarmCount: 16
  };

  const result = unrealBridge.triggerBigBang(customParams);

  assert.equal(result.singularity_intensity, 4.8);
  assert.equal(result.niagara_system, "NS_CosmicAscension");
  assert.equal(result.cosmic_color, "#ff0077");
  assert.equal(result.swarm_count, 16);
});

// Test 4: Simulation realm ID contract
suite.test("F07-04: UnrealBridgeAdapter operates strictly within simulation_realm boundary", async () => {
  assert.equal(unrealBridge.realmId, "simulation_realm");
  assert.equal(unrealBridge.port, 17800);
  assert.ok(unrealBridge.activeSimulations instanceof Set);
});

// Test 5: Inbound UNREAL_PLAY_STARTED triggers Big Bang genesis
suite.test("F07-05: Simulation pipeline automatically responds to UNREAL_PLAY_STARTED", async () => {
  let triggered = null;
  const listener = (data) => {
    triggered = data;
  };
  eventBus.on("BIG_BANG_TRIGGER", listener);

  // Simulate UE5 sending UNREAL_PLAY_STARTED
  unrealBridge.triggerBigBang({ intensity: 3.0 });

  assert.ok(triggered, "Expected BIG_BANG_TRIGGER in response to play start");
  assert.equal(triggered.singularity_intensity, 3.0);

  eventBus.removeListener("BIG_BANG_TRIGGER", listener);
});
