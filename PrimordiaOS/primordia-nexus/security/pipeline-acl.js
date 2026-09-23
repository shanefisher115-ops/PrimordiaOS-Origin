// security/pipeline-acl.ts
// PrimordiaOS Pipeline Access Control — full implementation
// Controls which identities can run specific pipelines
export class PipelineACL {
    rules;
    constructor() {
        this.rules = [];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    canRun(identity, pipelineId) {
        const rule = this.rules.find(r => r.pipelineId === pipelineId);
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
export const pipelineACL = new PipelineACL();
// Default ACL rules
pipelineACL.addRule({
    pipelineId: "pipeline.antigravity",
    allowRoles: ["system", "pipeline"],
    denyRoles: ["external"]
});
