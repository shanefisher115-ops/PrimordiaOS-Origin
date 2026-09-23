// realms/realm-bridge.ts
// PrimordiaOS Realm Bridge — full implementation
// Enables cross-realm messaging and state transfer

import { realmRegistry } from "./realm-registry";

export class RealmBridge {
    send(fromRealmId: string, toRealmId: string, topic: string, payload: any) {
        const target = realmRegistry.get(toRealmId);
        if (!target) {
            console.warn(`[RealmBridge] Target realm ${toRealmId} not found`);
            return;
        }

        target.emit(topic, {
            from: fromRealmId,
            payload,
            ts: Date.now()
        });
    }

    broadcast(fromRealmId: string, topic: string, payload: any) {
        for (const realm of realmRegistry.list()) {
            realm.emit(topic, {
                from: fromRealmId,
                payload,
                ts: Date.now()
            });
        }
    }
}

export const realmBridge = new RealmBridge();
