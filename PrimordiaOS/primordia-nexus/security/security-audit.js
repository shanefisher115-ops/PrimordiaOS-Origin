// security/security-audit.ts
// PrimordiaOS Security Audit Log — full implementation
// Records all security decisions, violations, and access attempts
export class SecurityAudit {
    entries;
    constructor() {
        this.entries = [];
    }
    record(actor, action, target, allowed) {
        this.entries.push({
            id: `sec-${Date.now()}`,
            ts: Date.now(),
            actor,
            action,
            target,
            allowed
        });
    }
    getEntries() {
        return this.entries;
    }
}
export const securityAudit = new SecurityAudit();
