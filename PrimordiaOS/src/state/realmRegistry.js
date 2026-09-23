// state/realmRegistry.ts
class RealmRegistry {
    realms = new Map();
    registerRealm(id) {
        if (!this.realms.has(id)) {
            this.realms.set(id, {
                id,
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
                activityScore: 0,
            });
        }
    }
    markActive(id) {
        const realm = this.realms.get(id);
        if (!realm)
            return;
        realm.lastActiveAt = Date.now();
        realm.activityScore += 1;
    }
    getRealmActivityMap() {
        const map = {};
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
