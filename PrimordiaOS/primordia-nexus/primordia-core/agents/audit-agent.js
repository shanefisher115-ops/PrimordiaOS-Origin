// agents/audit-agent.ts
// PrimordiaOS Audit Agent — full implementation
export class AuditAgent {
    id = "agent.audit";
    name = "AuditAgent";
    ledger = [];
    async start() {
        console.log("[AuditAgent] Started.");
    }
    async stop() {
        console.log("[AuditAgent] Stopped.");
    }
    async handle(event) {
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
