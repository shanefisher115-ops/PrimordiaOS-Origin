// state/realmRegistry.ts

import { RealmId } from "../omniscience/types";

interface RealmInfo {
  id: RealmId;
  createdAt: number;
  lastActiveAt: number;
  activityScore: number;
}

class RealmRegistry {
  private realms: Map<RealmId, RealmInfo> = new Map();

  registerRealm(id: RealmId) {
    if (!this.realms.has(id)) {
      this.realms.set(id, {
        id,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        activityScore: 0,
      });
    }
  }

  markActive(id: RealmId) {
    const realm = this.realms.get(id);
    if (!realm) return;
    realm.lastActiveAt = Date.now();
    realm.activityScore += 1;
  }

  getRealmActivityMap(): Record<RealmId, number> {
    const map: Record<RealmId, number> = {} as any;
    for (const [id, info] of this.realms.entries()) {
      map[id] = info.activityScore;
    }
    return map;
  }
}

export const realmRegistry = new RealmRegistry();

// Preload known realms
realmRegistry.registerRealm("creator");
realmRegistry.registerRealm("monetization");
realmRegistry.registerRealm("simulation");
realmRegistry.registerRealm("workflow");
realmRegistry.registerRealm("autonomy");
realmRegistry.registerRealm("system");
