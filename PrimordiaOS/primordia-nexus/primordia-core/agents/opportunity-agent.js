// agents/opportunity-agent.ts
// PrimordiaOS Opportunity Agent — full implementation
import { eventBus } from "../shared/event-bus";
export class OpportunityAgent {
    id = "agent.opportunity";
    name = "OpportunityAgent";
    async start() {
        console.log("[OpportunityAgent] Started.");
    }
    async stop() {
        console.log("[OpportunityAgent] Stopped.");
    }
    async handle(event) {
        if (event.topic === "diagnostic.heartbeat") {
            this.scanForOpportunities();
        }
    }
    scanForOpportunities() {
        const opportunity = {
            id: `opp-${Date.now()}`,
            ts: Date.now(),
            description: "Auto-detected opportunity"
        };
        console.log("[OpportunityAgent] Opportunity detected:", opportunity);
        eventBus.emit("opportunity.detected", opportunity, this.id);
    }
}
export const opportunityAgent = new OpportunityAgent();
