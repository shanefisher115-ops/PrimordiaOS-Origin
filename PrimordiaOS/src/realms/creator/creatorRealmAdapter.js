// realms/creator/creatorRealmAdapter.ts
import { signalBus } from "../../state/signalBus";
import { realmRegistry } from "../../state/realmRegistry";
import { memoryGraph } from "../../state/memoryGraphInstance";
export class CreatorRealmAdapter {
    emitContentEvent(type, payload) {
        const timestamp = Date.now();
        // Register activity
        realmRegistry.markActive("creator");
        // Emit signal
        signalBus.emit({
            id: `creator-${type}-${timestamp}`,
            realm: "creator",
            strength: 0.7,
            payload,
            timestamp,
        });
        // Store memory
        memoryGraph.upsertNode({
            id: `creator-mem-${timestamp}`,
            kind: "CreatorEvent",
            label: type,
            importance: 0.5,
            payload,
            timestamp,
        });
    }
}
export const creatorRealm = new CreatorRealmAdapter();
