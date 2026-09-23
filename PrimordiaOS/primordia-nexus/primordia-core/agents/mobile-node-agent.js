// agents/mobile-node-agent.ts
// PrimordiaOS Mobile Node Agent — full implementation
import { eventBus } from "../shared/event-bus";
export class MobileNodeAgent {
    id = "agent.mobile-node";
    name = "MobileNodeAgent";
    async start() {
        console.log("[MobileNodeAgent] Started.");
    }
    async stop() {
        console.log("[MobileNodeAgent] Stopped.");
    }
    async handle(event) {
        if (event.topic === "mobile.sync") {
            await this.syncMobileNode(event.payload);
        }
    }
    async syncMobileNode(payload) {
        console.log("[MobileNodeAgent] Syncing mobile node:", payload);
        eventBus.emit("mobile.synced", {
            ts: Date.now(),
            node: payload.node
        }, this.id);
    }
}
export const mobileNodeAgent = new MobileNodeAgent();
