// security/agent-acl.ts
// PrimordiaOS Agent Access Control — full implementation
// Controls which identities can send events to specific agents
export class AgentACL {
    rules;
    constructor() {
        this.rules = [];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    canSend(identity, agentId) {
        const rule = this.rules.find(r => r.agentId === agentId);
        if (!rule)
            return true;
        if (rule.denyRoles && identity.roles.some(r => rule.denyRoles.includes(r))) {
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
