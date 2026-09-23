// ============================================================
//  PRIMORDIAOS // REALM ORCHESTRATOR
//  Location: C:/Users/Shane/Documents/dev/PrimordiaOS/core/realm-orchestrator.mjs
//  Mode: Cinematic + Real
// ============================================================

import { globalEventBus } from "./event-bus.mjs";
import { globalState } from "./global-state.mjs";

// ============================================================
//  CINEMATIC BOOT LOGS
// ============================================================

console.log("✦ [RealmOrchestrator] Initializing cross‑realm orchestration...");
console.log("✦ [RealmOrchestrator] Listening for sovereign pulses...");
console.log("✦ [RealmOrchestrator] Awaiting realm registry population...");

// ============================================================
//  INTERNAL: REALM HEALTH CHECK
// ============================================================

function checkRealmHealth(realmId) {
  const realm = globalState.realms[realmId];
  if (!realm) return;

  const healthy =
    realm.status === "online" ||
    realm.status === "ready" ||
    realm.status === "active";

  globalEventBus.emit("primordia", "realm:health", {
    id: realmId,
    healthy,
    ts: Date.now(),
  });

  return healthy;
}

// ============================================================
//  INTERNAL: DISPATCH REALM TASKS
// ============================================================

function dispatchRealmTasks() {
  const realms = Object.values(globalState.realms);

  for (const realm of realms) {
    const healthy = checkRealmHealth(realm.id);

    if (!healthy) {
      console.warn(
        `✦ [RealmOrchestrator] Realm unhealthy → ${realm.name} (${realm.id})`
      );
      continue;
    }

    if (realm.type === "world") {
      globalEventBus.emit("unreal", "world:tick", { realm: realm.id });
    }

    if (realm.type === "cinema") {
      globalEventBus.emit("cinema", "tick", { realm: realm.id });
    }

    if (realm.type === "economy") {
      globalEventBus.emit("money", "tick", { realm: realm.id });
    }

    if (realm.type === "narrative") {
      globalEventBus.emit("cinema", "narrative:tick", { realm: realm.id });
    }
  }
}

// ============================================================
//  INTERNAL: CROSS‑REALM SYNCHRONIZATION
// ============================================================

function synchronizeRealms() {
  const ts = Date.now();

  globalEventBus.emit("primordia", "realms:synchronized", {
    ts,
    realms: Object.keys(globalState.realms),
  });

  console.log("✦ [RealmOrchestrator] Realms synchronized.");
}

// ============================================================
//  EVENT BUS LISTENERS
// ============================================================

globalEventBus.on("primordia", "sovereign:pulse", () => {
  dispatchRealmTasks();
  synchronizeRealms();
});

globalEventBus.on("primordia", "realm:registered", (realm) => {
  console.log(
    `✦ [RealmOrchestrator] Realm registered → ${realm.name} (${realm.id})`
  );
});

globalEventBus.on("primordia", "runtime:ready", () => {
  console.log("✦ [RealmOrchestrator] Runtime ready. Orchestration online.");
});

// ============================================================
//  EXPORTS
// ============================================================

export {
  dispatchRealmTasks,
  synchronizeRealms,
  checkRealmHealth,
};
