// continuity/realmLifecycleManager.ts

import { RealmLifecycleEvent, RealmStatus, RealmId } from "./types";

export interface RealmLifecycleConfig {
  inactivityThresholdMs: number;
  maxRealmAgeMs: number;
  autoRetireInactiveRealms: boolean;
}

export class RealmLifecycleManager {
  private config: RealmLifecycleConfig;
  private realmStatus: Map<RealmId, RealmStatus> = new Map();

  constructor(config: RealmLifecycleConfig) {
    this.config = config;
  }

  updateRealmActivity(realm: RealmId): void {
    const now = Date.now();
    const status = this.realmStatus.get(realm) || {
      realm,
      createdAt: now,
      lastActiveAt: now,
      retired: false,
    };

    status.lastActiveAt = now;
    this.realmStatus.set(realm, status);
  }

  evaluate(): RealmLifecycleEvent[] {
    const events: RealmLifecycleEvent[] = [];
    const now = Date.now();

    for (const [realm, status] of this.realmStatus.entries()) {
      if (status.retired) continue;

      const inactiveDuration = now - status.lastActiveAt;
      const age = now - status.createdAt;

      if (
        inactiveDuration >= this.config.inactivityThresholdMs &&
        this.config.autoRetireInactiveRealms
      ) {
        status.retired = true;
        events.push({
          id: `realm-retire-${realm}-${now}`,
          realm,
          type: "retired",
          message: `Realm ${realm} retired due to inactivity.`,
          timestamp: now,
        });
      }

      if (age >= this.config.maxRealmAgeMs) {
        status.retired = true;
        events.push({
          id: `realm-age-retire-${realm}-${now}`,
          realm,
          type: "retired",
          message: `Realm ${realm} retired due to age.`,
          timestamp: now,
        });
      }
    }

    return events;
  }

  getRealmStatus(realm: RealmId): RealmStatus | undefined {
    return this.realmStatus.get(realm);
  }
}
