// ======================================================
// PRIMORDIAOS — REALM REGISTRY
// ======================================================
// Responsibilities:
// - Dynamic realm loading
// - Realm discovery
// - Realm metadata
// ======================================================

export interface RealmDefinition {
    name: string;
    description: string;
    executor: any;
}

export class RealmRegistry {
    private realms: Map<string, RealmDefinition> = new Map();

    constructor() {}

    // ------------------------------------------------------
    // REGISTER REALM
    // ------------------------------------------------------
    register(realm: RealmDefinition) {
        this.realms.set(realm.name, realm);
    }

    // ------------------------------------------------------
    // GET REALM
    // ------------------------------------------------------
    get(name: string): RealmDefinition | null {
        return this.realms.get(name) || null;
    }

    // ------------------------------------------------------
    // LIST ALL REALMS
    // ------------------------------------------------------
    list(): RealmDefinition[] {
        return Array.from(this.realms.values());
    }

    // ------------------------------------------------------
    // REMOVE REALM
    // ------------------------------------------------------
    remove(name: string) {
        this.realms.delete(name);
    }
}
