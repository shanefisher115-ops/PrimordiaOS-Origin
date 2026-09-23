import { TestSuite } from "../harness/runner-core.js";
import { assert } from "../harness/assert.js";
import { moneyPlugHubLoop } from "../../../PrimordiaOS/realms/economy/moneyplughub-loop.js";

export const suite = new TestSuite("Tier 3 - Cross-Realm 8: Economic Realm Loop to Syndicate Revenue Updates");

suite.test("CR08: MoneyPlugHub autonomous cycle step generates diff and updates active syndicate metrics", async () => {
  const step = await moneyPlugHubLoop.executeCycleStep();

  assert.equal(step.status, "success");
  assert.isString(step.diff_hash);

  // Validate state in adapter
  assert.equal(moneyPlugHubLoop.lastDiff.diff_hash, step.diff_hash);
  assert.includes(step.commentary, "Autonomous value stream pulse synchronized across syndicates.");
});
