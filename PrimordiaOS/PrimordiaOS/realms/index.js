import { LocalRealm } from "./local/index.js";
import { CloudRealm } from "./cloud/index.js";
import { SimulationRealm } from "./simulation/index.js";
import { EconomicRealm } from "./economy/index.js";
import { IdentityRealm } from "./identity/index.js";

export const Realms = {
  local: LocalRealm,
  cloud: CloudRealm,
  simulation: SimulationRealm,
  economy: EconomicRealm,
  identity: IdentityRealm
};

export async function initializeAllRealms() {
  console.log("[Realms Aggregator] Initializing all 5 continuous realms...");
  await LocalRealm.init();
  await CloudRealm.init();
  await SimulationRealm.init();
  await EconomicRealm.init();
  await IdentityRealm.init();
  return Realms;
}

export {
  LocalRealm,
  CloudRealm,
  SimulationRealm,
  EconomicRealm,
  IdentityRealm
};

export default Realms;
