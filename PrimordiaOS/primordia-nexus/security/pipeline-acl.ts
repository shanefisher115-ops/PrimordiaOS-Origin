// security/pipeline-acl.ts
// PrimordiaOS Pipeline Access Control — full implementation
// Controls which identities can run specific pipelines

import { Identity } from "./auth";
import { permissions } from "./permissions";

export interface PipelineACLRule {
    pipelineId: string;
    allowRoles: string[];
    denyRoles?: string[];
}

export class PipelineACL {
    private rules: PipelineACLRule[];

    constructor() {
        this.rules = [];
    }

    addRule(rule: PipelineACLRule) {
        this.rules.push(rule);
    }

    canRun(identity: Identity, pipelineId: string): boolean {
        const rule = this.rules.find(r => r.pipelineId === pipelineId);
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

export const pipelineACL = new PipelineACL();

// Default ACL rules
pipelineACL.addRule({
    pipelineId: "pipeline.antigravity",
    allowRoles: ["system", "pipeline"],
    denyRoles: ["external"]
});
