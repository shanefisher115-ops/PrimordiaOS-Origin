// monitoring/agent-load.ts
// PrimordiaOS Agent Load Monitor — full implementation
// Tracks how many events each agent processes

import { eventBus, EventEnvelope } from "../primordia-core/shared/event-bus";
import { metrics } from "./metrics";

export class AgentLoadMonitor {
    private counts: Map<string, number>;

    constructor() {
        this.counts = new Map();
    }

    start() {
        eventBus.subscribe("*", (event: EventEnvelope) => {
            const source = event.source || "unknown";
            const current = this.counts.get(source) || 0;
            this.counts.set(source, current + 1);

            metrics.increment(`agent.events.${source}`);
        });

        console.log("[AgentLoadMonitor] Monitoring agent load.");
    }

    getLoad() {
        return Array.from(this.counts.entries()).map(([agent, count]) => ({
            agent,
            count
        }));
    }
}

export const agentLoadMonitor = new AgentLoadMonitor();
