// services/nexus-dashboard.ts
// PrimordiaOS Nexus Dashboard Stream — full implementation
// Provides a live event feed for the Nexus UI
import { eventBus } from "../primordia-core/shared/event-bus";
import { websocketBridge } from "./websocket-bridge";
export class NexusDashboard {
    start() {
        console.log("[NexusDashboard] Starting…");
        // Forward key events to dashboard channel
        eventBus.subscribe("vision.snapshot.created", (event) => {
            this.broadcast("visionSnapshot", event.payload);
        });
        eventBus.subscribe("pipeline.completed", (event) => {
            this.broadcast("pipelineCompleted", event.payload);
        });
        eventBus.subscribe("simulation.synced", (event) => {
            this.broadcast("simulationSynced", event.payload);
        });
        console.log("[NexusDashboard] Dashboard event stream active.");
    }
    broadcast(type, payload) {
        const message = JSON.stringify({
            type,
            payload,
            ts: Date.now()
        });
        if (!websocketBridge["wss"])
            return;
        websocketBridge["wss"].clients.forEach((client) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
}
export const nexusDashboard = new NexusDashboard();
