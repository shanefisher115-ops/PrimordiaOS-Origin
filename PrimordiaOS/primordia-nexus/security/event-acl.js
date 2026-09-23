// security/event-acl.ts
// PrimordiaOS Event ACL System — full implementation
// Controls which identities can emit or subscribe to specific event topics
export class EventACL {
    rules;
    constructor() {
        this.rules = [];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    canEmit(identity, topic) {
        const rule = this.rules.find(r => r.topic === topic);
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
    canSubscribe(identity, topic) {
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
