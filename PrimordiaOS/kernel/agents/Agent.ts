// ======================================================
// PRIMORDIAOS — BASE AGENT CLASS
// ======================================================
// Responsibilities:
// - Identity
// - Sovereignty level
// - Capabilities
// - Task creation
// ======================================================

export interface AgentTask {
    id: string;
    agent: string;
    realm: string;
    payload: any;
    sovereignty: string;
    risk: number;
    lineage: any[];
    timestamp: number;
}

export class Agent {
    id: string;
    sovereignty: string;
    capabilities: string[];

    constructor(id: string, sovereignty: string = "low", capabilities: string[] = []) {
        this.id = id;
        this.sovereignty = sovereignty;
        this.capabilities = capabilities;
    }

    // ------------------------------------------------------
    // CREATE TASK
    // ------------------------------------------------------
    createTask(realm: string, payload: any, risk: number = 1): AgentTask {
        return {
            id: "task-" + Math.random().toString(36).substring(2, 10),
            agent: this.id,
            realm,
            payload,
            sovereignty: this.sovereignty,
            risk,
            lineage: [{ source: this.id, timestamp: Date.now(), weight: 1 }],
            timestamp: Date.now()
        };
    }
}
