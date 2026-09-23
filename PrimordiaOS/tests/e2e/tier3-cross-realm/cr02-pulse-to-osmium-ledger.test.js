import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugPipeline } from "../../../PrimordiaOS/pipelines/moneyplug-pipeline.js";
import { osmiumLedger } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 2: Autonomous Pulse Loop to Osmium Cryptographic Ledger");

suite.test("CR02: Autonomous pulse execution directly appends block to Osmium ledger and passes verifyChain", async () => {
  const initialHeight = osmiumLedger.chain.length;

  const cycleResult = await moneyPlugPipeline.runAutonomousCycle();

  assert.equal(osmiumLedger.chain.length, initialHeight + 1);
  const latestBlock = osmiumLedger.chain[osmiumLedger.chain.length - 1];

  assert.equal(latestBlock.index, initialHeight);
  assert.equal(latestBlock.hash, cycleResult.ledgerBlock.hash);
  assert.equal(latestBlock.event, "MONEYPLUG_PULSE_COMMITTED");

  const valid = osmiumLedger.verifyChain();
  assert.equal(valid, true, "Chain must remain cryptographically unbroken after pulse");
});
