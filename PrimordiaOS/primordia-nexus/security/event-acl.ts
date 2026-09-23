// security/event-acl.ts
// PrimordiaOS Event ACL System — full implementation
// Controls which identities can emit or subscribe to specific event topics

import { Identity } from "./auth";
import { permissions } from "./permissions";

export interface EventACLRule {
    topic: string;
    allowRoles: string[];
    denyRoles?: string[];
}

export class EventACL {
    private rules: EventACLRule[];

    constructor() {
        this.rules = [];
    }

    addRule(rule: EventACLRule) {
        this.rules.push(rule);
    }

    canEmit(identity: Identity, topic: string): boolean {
        const rule = this.rules.find(r => r.topic === topic);
        if (!rule) return true;

        if (rule.denyRoles && identity.roles.some(r => rule.denyRoles!.includes(r))) {
            return false;
        }

        if (identity.roles.some(r => rule.allowRoles.includes(r))) {
            return true;
        }

        return false;
    }

    canSubscribe(identity: Identity, topic: string): boolean {
        return this.canEmit(identity, topic);
    }
}

export const eventACL = new EventACL();

// Default ACL rules
eventACL.addRule({
    topic: "pipeline.antigravity.output",
    allowRoles: ["system", "pipeline"],
    denyRoles: ["external"]
});

eventACL.addRule({
    topic: "vision.snapshot.created",
    allowRoles: ["system", "agent"],
    denyRoles: ["external"]
});
