// agents/agent-registry.ts
// PrimordiaOS Agent Registry — full implementation

import { eventBus, EventEnvelope } from "../shared/event-bus";

export interface Agent {
    id: string;
    name: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    handle(event: EventEnvelope): Promise<void>;
}

export class AgentRegistry {
    private agents: Map<string, Agent>;

    constructor() {
        this.agents = new Map();
    }

    register(agent: Agent) {
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

    getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }
}

export const agentRegistry = new AgentRegistry();
