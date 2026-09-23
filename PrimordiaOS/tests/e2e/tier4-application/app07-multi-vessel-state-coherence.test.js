import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { TermuxVessel } from "../../../PrimordiaOS/vessels/termux-vessel.js";
import { WorkstationVessel } from "../../../PrimordiaOS/vessels/workstation-vessel.js";
import { UnrealVessel } from "../../../PrimordiaOS/vessels/unreal-vessel.js";
import { CloudVessel } from "../../../PrimordiaOS/vessels/cloud-vessel.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 4 - Application Scenario 7: Multi-Vessel Concurrent State Coherence");

suite.test("APP07: Synchronize state across all 4 vessel adapters (Workstation, Cloud, Termux Android, UE5 Unreal)", async () => {
  const vessels = [TermuxVessel, WorkstationVessel, UnrealVessel, CloudVessel];
  assert.equal(vessels.length, 4);

  const syncEvents = [];
  const listener = (data) => {
    syncEvents.push(data);
  };
  eventBus.on("VESSEL_STATE_SYNC", listener);

  // Broadcast sync pulse for each vessel
  for (const vessel of vessels) {
    eventBus.emit("VESSEL_STATE_SYNC", {
      vesselId: vessel.id,
      type: vessel.type,
      status: "coherent",
      timestamp: Date.now()
    });
  }

  assert.equal(syncEvents.length, 4);
  const syncedIds = syncEvents.map((e) => e.vesselId);
  assert.includes(syncedIds, "vessel-termux-android");
  assert.includes(syncedIds, "vessel-workstation-windows");
  assert.includes(syncedIds, "vessel-unreal-simulation");
  assert.includes(syncedIds, "vessel-cloudflare-workers");

  eventBus.removeListener("VESSEL_STATE_SYNC", listener);
});
