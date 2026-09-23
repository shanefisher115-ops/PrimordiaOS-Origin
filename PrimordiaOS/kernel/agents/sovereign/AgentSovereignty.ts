// ======================================================
// PRIMORDIAOS — AGENT SOVEREIGNTY
// ======================================================
// Responsibilities:
// - Sovereignty level definition
// - Risk thresholds
// - Capability limits
// - Realm permissions
// ======================================================

export interface SovereigntyProfile {
    level: string;
    maxRisk: number;
    allowedRealms: string[];
    requiresVerification: boolean;
    requiresConsensus: boolean;
    requiresReplay: boolean;
}

export class AgentSovereignty {
    private profiles: Map<string, SovereigntyProfile> = new Map();

    constructor() {
        this.profiles.set("low", {
            level: "low",
            maxRisk: 5,
            allowedRealms: ["open-realm"],
            requiresVerification: false,
            requiresConsensus: false,
            requiresReplay: false
        });

        this.profiles.set("medium", {
            level: "medium",
            maxRisk: 3,
            allowedRealms: ["open-realm", "corporate-realm", "academic-realm"],
            requiresVerification: true,
            requiresConsensus: false,
            requiresReplay: true
        });

        this.profiles.set("high", {
            level: "high",
            maxRisk: 1,
            allowedRealms: ["academic-realm", "corporate-realm", "sovereign-realm"],
            requiresVerification: true,
            requiresConsensus: true,
            requiresReplay: true
        });

        this.profiles.set("sovereign", {
            level: "sovereign",
            maxRisk: 0,
            allowedRealms: ["sovereign-realm"],
            requiresVerification: true,
            requiresConsensus: true,
            requiresReplay: true
        });
    }

    getProfile(level: string): SovereigntyProfile {
        return this.profiles.get(level) || this.profiles.get("low")!;
    }
}
