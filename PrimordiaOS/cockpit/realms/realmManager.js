export class RealmManager {
    realms = new Map();
    activeRealm = "origin-realm";
    constructor() {
        this.realms.set("origin-realm", {
            id: "origin-realm",
            name: "Primordia Origin Matrix",
            sovereigntyFactor: 1.0
        });
    }
    initializeActiveRealm() {
        console.log("[RealmManager] Active realm configured: " + this.activeRealm);
    }
    getActiveRealm() {
        return this.realms.get(this.activeRealm);
    }
}
