// realms/registerAllRealms.ts

import { creatorRealm } from "./creator/creatorRealmAdapter";
import { monetizationRealm } from "./monetization/monetizationRealmAdapter";
import { simulationRealm } from "./simulation/simulationRealmAdapter";
import { workflowRealm } from "./workflow/workflowRealmAdapter";
import { autonomyRealm } from "./autonomy/autonomyRealmAdapter";

import { realmRegistry } from "../state/realmRegistry";

export interface RealmAdapters {
  creator: typeof creatorRealm;
  monetization: typeof monetizationRealm;
  simulation: typeof simulationRealm;
  workflow: typeof workflowRealm;
  autonomy: typeof autonomyRealm;
}

export function registerAllRealms(): RealmAdapters {
  console.log("PrimordiaOS: Registering realms...");

  // Ensure realm IDs exist in registry
  realmRegistry.registerRealm("creator");
  realmRegistry.registerRealm("monetization");
  realmRegistry.registerRealm("simulation");
  realmRegistry.registerRealm("workflow");
  realmRegistry.registerRealm("autonomy");

  console.log("✓ Realms registered in RealmRegistry");

  // Return adapters so PrimordiaOS can use them
  const adapters: RealmAdapters = {
    creator: creatorRealm,
    monetization: monetizationRealm,
    simulation: simulationRealm,
    workflow: workflowRealm,
    autonomy: autonomyRealm,
  };

  console.log("✓ Realm adapters loaded");
  console.log("-----------------------------------------------");

  return adapters;
}
