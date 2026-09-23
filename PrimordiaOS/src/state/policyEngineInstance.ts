// state/policyEngineInstance.ts

import { PolicyEngine } from "../omniscience/policyEngine";

export const policyEngine = new PolicyEngine({
  defaultThreshold: 0.5,
  maxPolicies: 50,
});

// Example baseline policies
policyEngine.registerPolicy({
  id: "baseline-health",
  threshold: 0.5,
  priority: 1,
  description: "Maintain minimum global health score.",
});

policyEngine.registerPolicy({
  id: "realm-balance",
  threshold: 0.3,
  priority: 2,
  description: "Prevent any realm from dominating activity.",
});
