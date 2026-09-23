// continuity/realmLifecycleManager.ts
export class RealmLifecycleManager {
    config;
    realmStatus = new Map();
    constructor(config) {
        this.config = config;
    }
    updateRealmActivity(realm) {
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
    evaluate() {
        const events = [];
        const now = Date.now();
        for (const [realm, status] of this.realmStatus.entries()) {
            if (status.retired)
                continue;
            const inactiveDuration = now - status.lastActiveAt;
            const age = now - status.createdAt;
            if (inactiveDuration >= this.config.inactivityThresholdMs &&
                this.config.autoRetireInactiveRealms) {
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
    getRealmStatus(realm) {
        return this.realmStatus.get(realm);
    }
}
