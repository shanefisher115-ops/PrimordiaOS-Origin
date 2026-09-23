// agents/agent-registry.ts
// PrimordiaOS Agent Registry — full implementation
import { eventBus } from "../shared/event-bus";
export class AgentRegistry {
    agents;
    constructor() {
        this.agents = new Map();
    }
    register(agent) {
        if (this.agents.has(agent.id)) {
            throw new Error(`[AgentRegistry] Agent with ID ${agent.id} already registered.`);
        }
        this.agents.set(agent.id, agent);
        eventBus.subscribe(agent.id, async (event) => {
            await agent.handle(event);
        });
    }
    async startAll() {
        for (const agent of this.agents.values()) {
            await agent.start();
        }
    }
    async stopAll() {
        for (const agent of this.agents.values()) {
            await agent.stop();
        }
    }
    getAgent(id) {
        return this.agents.get(id);
    }
}
export const agentRegistry = new AgentRegistry();
