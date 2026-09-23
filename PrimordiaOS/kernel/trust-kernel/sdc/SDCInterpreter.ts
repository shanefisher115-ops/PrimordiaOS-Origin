// ======================================================
// PRIMORDIAOS — SOVEREIGN DATA CONTRACT INTERPRETER
// ======================================================
// Responsibilities:
// - Interpret sovereignty rules
// - Enforce safety constraints
// - Validate risk thresholds
// - Integrate with Safety Governor + Trust Kernel
// ======================================================

export interface SDC {
    name: string;
    maxRisk: number;
    requiresVerification: boolean;
    requiresConsensus: boolean;
    requiresReplay: boolean;
}

export class SDCInterpreter {
    private contracts: Map<string, SDC> = new Map();

    constructor() {
        // Default contracts
        this.contracts.set("low", {
            name: "low",
            maxRisk: 5,
            requiresVerification: false,
            requiresConsensus: false,
            requiresReplay: false
        });

        this.contracts.set("medium", {
            name: "medium",
            maxRisk: 3,
            requiresVerification: true,
            requiresConsensus: false,
            requiresReplay: true
        });

        this.contracts.set("high", {
            name: "high",
            maxRisk: 1,
            requiresVerification: true,
            requiresConsensus: true,
            requiresReplay: true
        });

        this.contracts.set("sovereign", {
            name: "sovereign",
            maxRisk: 0,
            requiresVerification: true,
            requiresConsensus: true,
            requiresReplay: true
        });
    }

    // ------------------------------------------------------
    // GET CONTRACT
    // ------------------------------------------------------
    getContract(level: string): SDC {
        return this.contracts.get(level) || this.contracts.get("low")!;
    }

    // ------------------------------------------------------
    // VALIDATE TASK AGAINST CONTRACT
    // ------------------------------------------------------
    validate(task: any): { allowed: boolean; reason?: string } {
        const contract = this.getContract(task.sovereignty);

        if (task.risk < contract.maxRisk) {
            return {
                allowed: false,
                reason: `Risk ${task.risk} exceeds allowed threshold for ${task.sovereignty}`
            };
        }

        if (contract.requiresVerification && !task.verificationReady) {
            return {
                allowed: false,
                reason: `Verification required for sovereignty level ${task.sovereignty}`
            };
        }

        if (contract.requiresConsensus && !task.consensusReady) {
            return {
                allowed: false,
                reason: `Consensus required for sovereignty level ${task.sovereignty}`
            };
        }

        if (contract.requiresReplay && !task.replaySeed) {
            return {
                allowed: false,
                reason: `Replay seed required for sovereignty level ${task.sovereignty}`
            };
        }

        return { allowed: true };
    }
}
