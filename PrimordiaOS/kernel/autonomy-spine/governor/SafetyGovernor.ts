// ======================================================
// PRIMORDIAOS — SAFETY GOVERNOR
// ======================================================
// The Safety Governor enforces:
// - Sovereign Data Contracts (SDCs)
// - Realm boundaries and permissions
// - Risk classification and escalation rules
// - Attribution and lineage integrity
// - Verification and consensus requirements
// - Deterministic replay safety
// ======================================================

export interface SafetyResult {
    allowed: boolean;
    reason?: string;
    task?: any;
}

export class SafetyGovernor {
    private sdcRules: Map<string, any> = new Map();
    private realmPermissions: Map<string, string[]> = new Map();
    private riskLevels: Map<string, number> = new Map();

    constructor() {
        // ------------------------------------------------------
        // DEFAULT SDC RULES
        // ------------------------------------------------------
        this.sdcRules.set("default", {
            maxRisk: 3,
            requiresVerification: false,
            requiresConsensus: false,
            requiresReplay: false
        });

        this.sdcRules.set("sovereign", {
            maxRisk: 1,
            requiresVerification: true,
            requiresConsensus: true,
            requiresReplay: true
        });

        // ------------------------------------------------------
        // REALM PERMISSIONS
        // ------------------------------------------------------
        this.realmPermissions.set("academic-realm", ["low", "medium"]);
        this.realmPermissions.set("corporate-realm", ["low", "medium"]);
        this.realmPermissions.set("open-realm", ["low"]);
        this.realmPermissions.set("sovereign-realm", ["low", "medium", "high", "sovereign"]);

        // ------------------------------------------------------
        // RISK LEVELS
        // ------------------------------------------------------
        this.riskLevels.set("low", 5);
        this.riskLevels.set("medium", 3);
        this.riskLevels.set("high", 1);
        this.riskLevels.set("sovereign", 0);
    }

    // ------------------------------------------------------
    // MAIN ENTRYPOINT — VALIDATE TASK
    // ------------------------------------------------------
    validate(task: any): SafetyResult {
        // 1. Validate realm permissions
        const realmAllowed = this.validateRealm(task);
        if (!realmAllowed.allowed) return realmAllowed;

        // 2. Validate sovereignty rules
        const sovereigntyAllowed = this.validateSovereignty(task);
        if (!sovereigntyAllowed.allowed) return sovereigntyAllowed;

        // 3. Validate risk level
        const riskAllowed = this.validateRisk(task);
        if (!riskAllowed.allowed) return riskAllowed;

        // 4. Validate attribution lineage
        const lineageAllowed = this.validateLineage(task);
        if (!lineageAllowed.allowed) return lineageAllowed;

        // 5. Validate verification requirements
        const verificationAllowed = this.validateVerification(task);
        if (!verificationAllowed.allowed) return verificationAllowed;

        // 6. Validate deterministic replay requirements
        const replayAllowed = this.validateReplay(task);
        if (!replayAllowed.allowed) return replayAllowed;

        return { allowed: true, task };
    }

    // ------------------------------------------------------
    // REALM PERMISSION VALIDATION
    // ------------------------------------------------------
    private validateRealm(task: any): SafetyResult {
        const allowedLevels = this.realmPermissions.get(task.realm);
        if (!allowedLevels) {
            return { allowed: false, reason: `Unknown realm: ${task.realm}` };
        }

        if (!allowedLevels.includes(task.sovereignty)) {
            return {
                allowed: false,
                reason: `Realm '${task.realm}' does not allow sovereignty level '${task.sovereignty}'`
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // SOVEREIGNTY RULE VALIDATION
    // ------------------------------------------------------
    private validateSovereignty(task: any): SafetyResult {
        const rules = this.sdcRules.get(task.sovereignty) || this.sdcRules.get("default");

        if (rules.requiresVerification && !task.requiresVerification) {
            return {
                allowed: false,
                reason: `Task requires verification due to sovereignty level '${task.sovereignty}'`
            };
        }

        if (rules.requiresConsensus && !task.requiresConsensus) {
            return {
                allowed: false,
                reason: `Task requires consensus due to sovereignty level '${task.sovereignty}'`
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // RISK LEVEL VALIDATION
    // ------------------------------------------------------
    private validateRisk(task: any): SafetyResult {
        const riskValue = this.riskLevels.get(task.risk || "low");
        const rules = this.sdcRules.get(task.sovereignty) || this.sdcRules.get("default");

        if (riskValue < rules.maxRisk) {
            return {
                allowed: false,
                reason: `Risk level '${task.risk}' exceeds allowed threshold for sovereignty '${task.sovereignty}'`
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // ATTRIBUTION & LINEAGE VALIDATION
    // ------------------------------------------------------
    private validateLineage(task: any): SafetyResult {
        if (!task.lineage || task.lineage.length === 0) {
            return {
                allowed: false,
                reason: "Task missing attribution lineage"
            };
        }

        // Basic lineage integrity check
        if (task.lineage.some((l: any) => !l.source || !l.timestamp)) {
            return {
                allowed: false,
                reason: "Invalid lineage entry detected"
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // VERIFICATION REQUIREMENT VALIDATION
    // ------------------------------------------------------
    private validateVerification(task: any): SafetyResult {
        if (task.requiresVerification && !task.verificationReady) {
            return {
                allowed: false,
                reason: "Task requires verification but verification packet is missing"
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // DETERMINISTIC REPLAY VALIDATION
    // ------------------------------------------------------
    private validateReplay(task: any): SafetyResult {
        if (task.requiresReplay && !task.replaySeed) {
            return {
                allowed: false,
                reason: "Task requires deterministic replay but replay seed is missing"
            };
        }

        return { allowed: true };
    }

    // ------------------------------------------------------
    // REALM TRANSITION VALIDATION
    // ------------------------------------------------------
    validateTransition(agent: any, targetRealm: string): SafetyResult {
        const allowedLevels = this.realmPermissions.get(targetRealm);
        if (!allowedLevels) {
            return { allowed: false, reason: `Unknown target realm: ${targetRealm}` };
        }

        if (!allowedLevels.includes(agent.sovereignty)) {
            return {
                allowed: false,
                reason: `Agent sovereignty '${agent.sovereignty}' not allowed in realm '${targetRealm}'`
            };
        }

        return { allowed: true };
    }
}
