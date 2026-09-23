// ======================================================
// PRIMORDIAOS — CONFIGURATION
// ======================================================
// Defines:
// - Realms to load
// - Agents to initialize
// - Sovereignty defaults
// ======================================================

export interface PrimordiaConfig {
    realms: {
        name: string;
        description: string;
        executor: any;
    }[];

    agents: {
        id: string;
        sovereignty: string;
        capabilities: string[];
    }[];
}
