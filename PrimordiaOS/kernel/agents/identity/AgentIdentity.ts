// ======================================================
// PRIMORDIAOS — AGENT IDENTITY
// ======================================================
// Responsibilities:
// - Unique agent identity
// - Metadata
// - Realm affiliation
// - Sovereignty level
// ======================================================

export interface AgentIdentityData {
    id: string;
    sovereignty: string;
    createdAt: number;
    metadata?: Record<string, any>;
}

export class AgentIdentity {
    id: string;
    sovereignty: string;
    createdAt: number;
    metadata: Record<string, any>;

    constructor(id: string, sovereignty: string = "low", metadata: Record<string, any> = {}) {
        this.id = id;
        this.sovereignty = sovereignty;
        this.createdAt = Date.now();
        this.metadata = metadata;
    }

    updateMetadata(key: string, value: any) {
        this.metadata[key] = value;
    }

    serialize(): AgentIdentityData {
        return {
            id: this.id,
            sovereignty: this.sovereignty,
            createdAt: this.createdAt,
            metadata: this.metadata
        };
    }
}
