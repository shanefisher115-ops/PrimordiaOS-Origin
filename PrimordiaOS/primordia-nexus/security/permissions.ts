// security/permissions.ts
// PrimordiaOS Permission System — full implementation
// Role-based access control (RBAC) for events, pipelines, and agents

export interface PermissionRule {
    role: string;
    allow: string[]; // allowed actions
    deny?: string[]; // denied actions
}

export class Permissions {
    private rules: PermissionRule[];

    constructor() {
        this.rules = [];
    }

    addRule(rule: PermissionRule) {
        this.rules.push(rule);
    }

    can(role: string, action: string): boolean {
        const rule = this.rules.find(r => r.role === role);
        if (!rule) return false;

        if (rule.deny && rule.deny.includes(action)) return false;
        if (rule.allow.includes(action)) return true;

        return false;
    }
}

export const permissions = new Permissions();

// Default roles
permissions.addRule({
    role: "system",
    allow: ["*"]
});

permissions.addRule({
    role: "agent",
    allow: ["emit", "read"]
});

permissions.addRule({
    role: "pipeline",
    allow: ["process", "emit"]
});

permissions.addRule({
    role: "external",
    allow: ["emit"],
    deny: ["process"]
});
