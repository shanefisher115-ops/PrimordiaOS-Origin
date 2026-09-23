// Realm Governance Engine (RGE)
// Enforces policies and safety constraints across realms.

export interface RealmPolicy {
  realm: string;
  allowedActions: string[];
  blockedActions: string[];
}

export class RealmGovernanceEngine {
  private policies: Map<string, RealmPolicy> = new Map();

  setPolicy(policy: RealmPolicy) {
    this.policies.set(policy.realm, policy);
  }

  isActionAllowed(realm: string, action: string): boolean {
    const policy = this.policies.get(realm);
    if (!policy) return true;
    if (policy.blockedActions.includes(action)) return false;
    if (policy.allowedActions.length === 0) return true;
    return policy.allowedActions.includes(action);
  }
}
