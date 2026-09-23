// ======================================================
// PRIMORDIAOS — AGENT CAPABILITIES
// ======================================================
// Responsibilities:
// - Capability definition
// - Capability validation
// - Capability assignment
// ======================================================

export class AgentCapabilities {
    private capabilities: Map<string, string[]> = new Map();

    constructor() {}

    setCapabilities(agentId: string, caps: string[]) {
        this.capabilities.set(agentId, caps);
    }

    getCapabilities(agentId: string): string[] {
        return this.capabilities.get(agentId) || [];
    }

    hasCapability(agentId: string, capability: string): boolean {
        const caps = this.getCapabilities(agentId);
        return caps.includes(capability);
    }
}
