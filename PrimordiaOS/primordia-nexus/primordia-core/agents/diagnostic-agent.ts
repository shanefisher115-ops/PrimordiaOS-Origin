// agents/diagnostic-agent.ts
// PrimordiaOS Diagnostic Agent — full implementation

import { Agent } from "./agent-registry";
import { EventEnvelope, eventBus } from "../shared/event-bus";

export class DiagnosticAgent implements Agent {
    id = "agent.diagnostic";
    name = "DiagnosticAgent";

    async start() {
        console.log("[DiagnosticAgent] Started.");
    }

    async stop() {
        console.log("[DiagnosticAgent] Stopped.");
    }

    async handle(event: EventEnvelope) {
        console.log(`[DiagnosticAgent] Event received: ${event.topic}`, event.payload);
    }

    log(message: string, data: any = {}) {
        eventBus.emit("diagnostic.log", { message, data }, this.id);
    }

    heartbeat() {
        eventBus.emit("diagnostic.heartbeat", { ts: Date.now() }, this.id);
    }
}

export const diagnosticAgent = new DiagnosticAgent();
