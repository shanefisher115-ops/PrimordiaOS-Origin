// ======================================================
// PRIMORDIAOS — AGENT LIFECYCLE
// ======================================================
// Responsibilities:
// - Agent creation
// - Activation
// - Task submission
// - Evolution integration
// - Retirement
// ======================================================

import { Agent } from "./Agent";

export class AgentLifecycle {
    private agents: Map<string, Agent> = new Map();

    constructor() {}

    // ------------------------------------------------------
    // CREATE AGENT
    // ------------------------------------------------------
    createAgent(id: string, sovereignty: string = "low", capabilities: string[] = []) {
        const agent = new Agent(id, sovereignty, capabilities);
        this.agents.set(id, agent);
        return agent;
    }

    // ------------------------------------------------------
    // GET AGENT
    // ------------------------------------------------------
    getAgent(id: string): Agent | null {
        return this.agents.get(id) || null;
    }

    // ------------------------------------------------------
    // SUBMIT TASK
    // ------------------------------------------------------
    submitTask(agentId: string, realm: string, payload: any, risk: number = 1) {
        const agent = this.getAgent(agentId);
        if (!agent) throw new Error(`Agent '${agentId}' not found`);

        return agent.createTask(realm, payload, risk);
    }

    // ------------------------------------------------------
    // RETIRE AGENT
    // ------------------------------------------------------
    retireAgent(id: string) {
        this.agents.delete(id);
    }

    // ------------------------------------------------------
    // LIST AGENTS
    // ------------------------------------------------------
    listAgents(): Agent[] {
        return Array.from(this.agents.values());
    }
}
