import { eventBus } from "../core/eventBus.js";

export class NodeEvents {
  broadcastNodeHeartbeat(nodeId: string): void {
    eventBus.emit("node:heartbeat", { nodeId, timestamp: Date.now() });
  }
}