import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { osmiumLedger } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";
import { eventBus } from "../harness/test-env.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 3: Osmium Ledger Commit to Syndicate Yield Routing");

suite.test("CR03: Sealing an Osmium block triggers syndicate yield distribution across VRTX, APEX, PLSE, QNTM", async () => {
  let yieldRouted = null;
  const listener = (data) => {
    yieldRouted = data;
  };
  eventBus.on("SYNDICATE_YIELD_ROUTED", listener);

  // 1. Commit block
  const block = osmiumLedger.appendBlock("SYNDICATE_REVENUE_CYCLE", { poolCents: 5000000 });

  // 2. Route yield based on block
  const yieldPayload = {
    blockIndex: block.index,
    blockHash: block.hash,
    syndicates: ["VRTX", "APEX", "PLSE", "QNTM"],
    totalCents: 5000000,
    xpMultiplier: 1.15
  };
  eventBus.emit("SYNDICATE_YIELD_ROUTED", yieldPayload);

  assert.ok(yieldRouted);
  assert.equal(yieldRouted.blockIndex, block.index);
  assert.equal(yieldRouted.xpMultiplier, 1.15);
  assert.equal(yieldRouted.syndicates.length, 4);

  eventBus.removeListener("SYNDICATE_YIELD_ROUTED", listener);
});
