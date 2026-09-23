import { eventBus } from "../core/eventBus.js";
export class NodeEvents {
    broadcastNodeHeartbeat(nodeId) {
        eventBus.emit("node:heartbeat", { nodeId, timestamp: Date.now() });
    }
}
