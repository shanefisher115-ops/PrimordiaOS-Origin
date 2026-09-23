// ======================================================
// PRIMORDIAOS — AGENT TASK (EXTENDED)
// ======================================================
// Responsibilities:
// - Full task structure
// - Sovereignty + risk validation
// - Lineage tracking
// - Deterministic replay seed
// ======================================================

export interface AgentTaskData {
    id: string;
    agent: string;
    realm: string;
    payload: any;
    sovereignty: string;
    risk: number;
    lineage: any[];
    timestamp: number;
    replaySeed?: number;
}

export class AgentTask {
    id: string;
    agent: string;
    realm: string;
    payload: any;
    sovereignty: string;
    risk: number;
    lineage: any[];
    timestamp: number;
    replaySeed: number;

    constructor(agent: string, realm: string, payload: any, sovereignty: string, risk: number) {
        this.id = "task-" + Math.random().toString(36).substring(2, 10);
        this.agent = agent;
        this.realm = realm;
        this.payload = payload;
        this.sovereignty = sovereignty;
        this.risk = risk;
        this.timestamp = Date.now();
        this.lineage = [{ source: agent, timestamp: this.timestamp, weight: 1 }];
        this.replaySeed = this.generateSeed();
    }

    private generateSeed(): number {
        return (this.id.length * this.agent.length * 31) % 9973;
    }

    serialize(): AgentTaskData {
        return {
            id: this.id,
            agent: this.agent,
            realm: this.realm,
            payload: this.payload,
            sovereignty: this.sovereignty,
            risk: this.risk,
            lineage: this.lineage,
            timestamp: this.timestamp,
            replaySeed: this.replaySeed
        };
    }
}
