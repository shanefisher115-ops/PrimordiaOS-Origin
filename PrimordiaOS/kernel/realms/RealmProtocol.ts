// ======================================================
// PRIMORDIAOS — REALM PROTOCOL
// ======================================================
// Responsibilities:
// - Cross-realm messaging
// - Realm permissions
// - Serialization + boundary enforcement
// ======================================================

export interface RealmMessage {
    fromRealm: string;
    toRealm: string;
    payload: any;
    timestamp: number;
}

export class RealmProtocol {
    private permissions: Map<string, string[]> = new Map();

    constructor() {
        // Default realm communication permissions
        this.permissions.set("sovereign-realm", ["academic-realm", "corporate-realm"]);
        this.permissions.set("academic-realm", ["sovereign-realm"]);
        this.permissions.set("corporate-realm", ["sovereign-realm"]);
        this.permissions.set("open-realm", []);
    }

    // ------------------------------------------------------
    // CHECK PERMISSION
    // ------------------------------------------------------
    canSend(from: string, to: string): boolean {
        const allowed = this.permissions.get(from);
        return allowed ? allowed.includes(to) : false;
    }

    // ------------------------------------------------------
    // SEND MESSAGE
    // ------------------------------------------------------
    send(from: string, to: string, payload: any): RealmMessage {
        if (!this.canSend(from, to)) {
            throw new Error(`Realm '${from}' cannot send messages to '${to}'`);
        }

        return {
            fromRealm: from,
            toRealm: to,
            payload,
            timestamp: Date.now()
        };
    }

    // ------------------------------------------------------
    // SET PERMISSIONS
    // ------------------------------------------------------
    setPermissions(realm: string, allowedRealms: string[]) {
        this.permissions.set(realm, allowedRealms);
    }
}
