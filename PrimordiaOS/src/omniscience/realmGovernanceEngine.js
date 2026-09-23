// Realm Governance Engine (RGE)
// Enforces policies and safety constraints across realms.
export class RealmGovernanceEngine {
    policies = new Map();
    setPolicy(policy) {
        this.policies.set(policy.realm, policy);
    }
    isActionAllowed(realm, action) {
        const policy = this.policies.get(realm);
        if (!policy)
            return true;
        if (policy.blockedActions.includes(action))
            return false;
        if (policy.allowedActions.length === 0)
            return true;
        return policy.allowedActions.includes(action);
    }
}
