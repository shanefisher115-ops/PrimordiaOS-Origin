// PrimordiaOS Realm Routing Engine

import { emitSignal } from "../core/signals";
import { getRealmRoutes } from "./realms";
import { processVisionRealm } from "./vision";
import { processMemoryRealm } from "./memory";
import { processComputeRealm } from "./compute";
import { processSignalRealm } from "./signal";
import { processRealmFusion } from "./fusion";

export async function routeToRealms(revenue: number, depth: number) {
  const routes = getRealmRoutes(revenue);

  for (const r of routes) {
    emitSignal(`realm.${r.realm}`, {
      revenue,
      depth,
      weight: r.weight
    });

    if (r.realm === "vision") processVisionRealm(r.weight, revenue, depth);
    if (r.realm === "memory") processMemoryRealm(r.weight, revenue, depth);
    if (r.realm === "compute") processComputeRealm(r.weight, revenue, depth);
    if (r.realm === "signal") processSignalRealm(r.weight, revenue, depth);
  }

  // After all realms update, run fusion
  processRealmFusion(revenue, depth);

  return routes;
}
