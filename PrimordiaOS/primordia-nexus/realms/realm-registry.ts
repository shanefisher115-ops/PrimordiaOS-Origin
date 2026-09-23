// realms/realm-registry.ts
// PrimordiaOS Realm Registry — full implementation
// Manages creation, lookup, and lifecycle of realms

import { Realm, RealmConfig } from "./realm";

export class RealmRegistry {
    private realms: Map<string, Realm>;

    constructor() {
        this.realms = new Map();
    }

    create(config: RealmConfig): Realm {
        if (this.realms.has(config.id)) {
            throw new Error(`Realm ${config.id} already exists`);
        }

        const realm = new Realm(config);
        this.realms.set(config.id, realm);
        return realm;
    }

    get(id: string): Realm | null {
        return this.realms.get(id) || null;
    }

    list(): Realm[] {
        return Array.from(this.realms.values());
    }
}

export const realmRegistry = new RealmRegistry();
