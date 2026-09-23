// realms/realm-registry.ts
// PrimordiaOS Realm Registry — full implementation
// Manages creation, lookup, and lifecycle of realms
import { Realm } from "./realm";
export class RealmRegistry {
    realms;
    constructor() {
        this.realms = new Map();
    }
    create(config) {
        if (this.realms.has(config.id)) {
            throw new Error(`Realm ${config.id} already exists`);
        }
        const realm = new Realm(config);
        this.realms.set(config.id, realm);
        return realm;
    }
    get(id) {
        return this.realms.get(id) || null;
    }
    list() {
        return Array.from(this.realms.values());
    }
}
export const realmRegistry = new RealmRegistry();
