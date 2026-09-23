// security/agent-acl.ts
// PrimordiaOS Agent Access Control — full implementation
// Controls which identities can send events to specific agents

import { Identity } from "./auth";

export interface AgentACLRule {
    agentId: string;
    allowRoles: string[];
    denyRoles?: string[];
}

export class AgentACL {
    private rules: AgentACLRule[];

    constructor() {
        this.rules = [];
    }

    addRule(rule: AgentACLRule) {
        this.rules.push(rule);
    }

    canSend(identity: Identity, agentId: string): boolean {
        const rule = this.rules.find(r => r.agentId === agentId);
        if (!rule) return true;

        if (rule.denyRoles && identity.roles.some(r => rule.denyRoles!.includes(r))) {
            return false;
        }

        if (identity.roles.some(r => rule.allowRoles.includes(r))) {
            return true;
        }

        return false;
    }
}

export const agentACL = new AgentACL();

// Default ACL rules
agentACL.addRule({
    agentId: "agent.execution",
    allowRoles: ["system", "agent"],
    denyRoles: ["external"]
});
