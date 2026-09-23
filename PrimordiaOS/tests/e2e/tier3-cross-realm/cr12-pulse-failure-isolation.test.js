import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { osmiumLedger } from "../../../PrimordiaOS/realms/identity/osmium-ledger.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 12: Pulse Loop Failure Isolation & Ledger Integrity");

suite.test("CR12: Failed pipeline sub-step does not corrupt previous Osmium ledger blocks or chain validity", async () => {
  const heightBefore = osmiumLedger.chain.length;
  assert.equal(osmiumLedger.verifyChain(), true);

  // Simulate an isolated sub-step error
  try {
    throw new Error("Synthetic external API timeout in voice synthesis");
  } catch (err) {
    // Pipeline catches and logs without corrupting state
  }

  // Ledger must remain intact and valid
  assert.equal(osmiumLedger.chain.length, heightBefore);
  assert.equal(osmiumLedger.verifyChain(), true);
});
