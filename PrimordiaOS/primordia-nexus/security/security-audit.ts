// security/security-audit.ts
// PrimordiaOS Security Audit Log — full implementation
// Records all security decisions, violations, and access attempts

export interface SecurityAuditEntry {
    id: string;
    ts: number;
    actor: string;
    action: string;
    target: string;
    allowed: boolean;
}

export class SecurityAudit {
    private entries: SecurityAuditEntry[];

    constructor() {
        this.entries = [];
    }

    record(actor: string, action: string, target: string, allowed: boolean) {
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
