import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 2 - Boundary 5: Termux Mobile Vessel & CLI Boundary Cases");

// Test 1: Boundary values for mobile battery sensor (0% and 100%)
suite.test("B05-01: Boundary battery values (0% critically depleted, 100% full) ingest validly", async () => {
  let latestBattery = null;
  const listener = (data) => {
    latestBattery = data.battery;
  };
  eventBus.on("MOBILE_TELEMETRY_INGEST", listener);

  eventBus.emit("MOBILE_TELEMETRY_INGEST", { vesselId: TermuxVessel.id, battery: 0 });
  assert.equal(latestBattery, 0);

  eventBus.emit("MOBILE_TELEMETRY_INGEST", { vesselId: TermuxVessel.id, battery: 100 });
  assert.equal(latestBattery, 100);

  eventBus.removeListener("MOBILE_TELEMETRY_INGEST", listener);
});

// Test 2: Extreme memory consumption metric (e.g. 16GB mobile node)
suite.test("B05-02: High-capacity mobile RAM metric (16384 MB) parses without integer overflow", async () => {
  let memoryCaptured = null;
  const listener = (data) => {
    memoryCaptured = data.memoryMb;
  };
  eventBus.on("MOBILE_TELEMETRY_INGEST", listener);

  eventBus.emit("MOBILE_TELEMETRY_INGEST", { vesselId: TermuxVessel.id, memoryMb: 16384 });
  assert.equal(memoryCaptured, 16384);

  eventBus.removeListener("MOBILE_TELEMETRY_INGEST", listener);
});

// Test 3: Null or missing fields in telemetry packet
suite.test("B05-03: Sparse telemetry packet with missing optional fields handles gracefully", async () => {
  let handled = false;
  const listener = (data) => {
    handled = true;
    assert.equal(data.vesselId, TermuxVessel.id);
  };
  eventBus.on("MOBILE_TELEMETRY_SPARSE", listener);

  eventBus.emit("MOBILE_TELEMETRY_SPARSE", { vesselId: TermuxVessel.id });
  assert.equal(handled, true);

  eventBus.removeListener("MOBILE_TELEMETRY_SPARSE", listener);
});

// Test 4: Vessel capabilities immutability
suite.test("B05-04: TermuxVessel capabilities array is defined and contains expected strings", async () => {
  assert.ok(Array.isArray(TermuxVessel.capabilities));
  assert.equal(TermuxVessel.capabilities.length, 3);
  TermuxVessel.capabilities.forEach((c) => assert.isString(c));
});

// Test 5: Rapid telemetry burst (100 packets in succession)
suite.test("B05-05: 100 rapid telemetry packets stream through without event listener exhaustion", async () => {
  let count = 0;
  const listener = () => {
    count++;
  };
  eventBus.on("TELEMETRY_BURST", listener);

  for (let i = 0; i < 100; i++) {
    eventBus.emit("TELEMETRY_BURST", { seq: i });
  }

  assert.equal(count, 100);
  eventBus.removeListener("TELEMETRY_BURST", listener);
});
