// agents/mobile-node-agent.ts
// PrimordiaOS Mobile Node Agent — full implementation

import { Agent } from "./agent-registry";
import { EventEnvelope, eventBus } from "../shared/event-bus";

export class MobileNodeAgent implements Agent {
    id = "agent.mobile-node";
    name = "MobileNodeAgent";

    async start() {
        console.log("[MobileNodeAgent] Started.");
    }

    async stop() {
        console.log("[MobileNodeAgent] Stopped.");
    }

    async handle(event: EventEnvelope) {
        if (event.topic === "mobile.sync") {
            await this.syncMobileNode(event.payload);
        }
    }

    async syncMobileNode(payload: any) {
        console.log("[MobileNodeAgent] Syncing mobile node:", payload);

        eventBus.emit("mobile.synced", {
            ts: Date.now(),
            node: payload.node
        }, this.id);
    }
}

export const mobileNodeAgent = new MobileNodeAgent();
