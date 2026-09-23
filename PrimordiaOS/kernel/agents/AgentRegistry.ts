// ======================================================
// PRIMORDIAOS — AGENT REGISTRY
// ======================================================
// Responsibilities:
// - Store all agents
// - Lookup by ID
// - Sovereignty + identity integration
// ======================================================

import { AgentIdentity } from "./identity/AgentIdentity";

export class AgentRegistry {
    private agents: Map<string, AgentIdentity> = new Map();

    register(agent: AgentIdentity) {
        this.agents.set(agent.id, agent);
    }

    get(id: string): AgentIdentity | null {
        return this.agents.get(id) || null;
    }

    list(): AgentIdentity[] {
        return Array.from(this.agents.values());
    }

    remove(id: string) {
        this.agents.delete(id);
    }
}
