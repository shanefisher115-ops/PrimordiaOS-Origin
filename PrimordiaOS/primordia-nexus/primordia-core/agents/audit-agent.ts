// agents/audit-agent.ts
// PrimordiaOS Audit Agent — full implementation

import { Agent } from "./agent-registry";
import { EventEnvelope, eventBus } from "../shared/event-bus";

export class AuditAgent implements Agent {
    id = "agent.audit";
    name = "AuditAgent";

    private ledger: EventEnvelope[] = [];

    async start() {
        console.log("[AuditAgent] Started.");
    }

    async stop() {
        console.log("[AuditAgent] Stopped.");
    }

    async handle(event: EventEnvelope) {
        this.ledger.push(event);

        if (event.topic === "task.completed") {
            console.log("[AuditAgent] Task completion recorded:", event.payload);
        }
    }

    getLedger() {
        return this.ledger;
    }
}

export const auditAgent = new AuditAgent();
