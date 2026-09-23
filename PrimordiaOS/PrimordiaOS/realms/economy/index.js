import { moneyPlugHubLoop } from "./moneyplughub-loop.js";
import { affiliateConduit } from "./affiliate-conduit.js";
import { transactionLogic } from "./transaction-logic.js";

export const EconomicRealm = {
  id: "economic_realm",
  name: "MoneyPlugHub Autonomous Monetization Realm",
  loop: moneyPlugHubLoop,
  affiliate: affiliateConduit,
  transaction: transactionLogic,
  async init() {
    await moneyPlugHubLoop.init();
  }
};

export default EconomicRealm;
