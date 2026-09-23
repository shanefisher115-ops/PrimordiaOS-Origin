// omniscience/metaPolicyEngine.ts

import { Policy, PolicyEffectivenessStats } from "./policyEngine";
import { SafetyConstraints } from "./safetyConstraints";
import { ProposedChange } from "./changeApplier";

export interface MetaPolicyProposal {
  id: string;
  description: string;
  targetPolicyId: string;
  newThreshold?: number;
  newPriority?: number;
  newRealmWeight?: number;
}

export interface MetaPolicyEngineConfig {
  effectivenessThreshold: number;
  maxPolicyAdjustmentsPerDay: number;
}

export class MetaPolicyEngine {
  private config: MetaPolicyEngineConfig;
  private safetyConstraints: SafetyConstraints;
  private proposalsHistory: MetaPolicyProposal[] = [];

  constructor(
    config: MetaPolicyEngineConfig,
    safetyConstraints: SafetyConstraints
  ) {
    this.config = config;
    this.safetyConstraints = safetyConstraints;
  }

  generateProposals(
    policies: Policy[],
    stats: PolicyEffectivenessStats[]
  ): MetaPolicyProposal[] {
    const now = Date.now();
    const proposals: MetaPolicyProposal[] = [];

    const todayStart = now - 86_400_000;
    const recentProposals = this.proposalsHistory.filter(
      (p) => parseInt(p.id.split("-").pop() || "0", 10) >= todayStart
    );
    if (recentProposals.length >= this.config.maxPolicyAdjustmentsPerDay) {
      return [];
    }

    for (const stat of stats) {
      if (stat.effectivenessScore < this.config.effectivenessThreshold) {
        const policy = policies.find((p) => p.id === stat.policyId);
        if (!policy) continue;

        const proposal: MetaPolicyProposal = {
          id: `meta-policy-${policy.id}-${now}`,
          description: `Adjust policy ${policy.id} due to low effectiveness.`,
          targetPolicyId: policy.id,
          newThreshold: policy.threshold * 0.9,
          newPriority: (policy.priority ?? 1) + 1,
        };

        if (this.isProposalSafe(proposal)) {
          proposals.push(proposal);
          this.proposalsHistory.push(proposal);
        }
      }
    }

    return proposals;
  }

  applyProposal(
    proposal: MetaPolicyProposal,
    policies: Policy[]
  ): Policy[] {
    const updated = policies.map((p) => {
      if (p.id !== proposal.targetPolicyId) return p;

      return {
        ...p,
        threshold:
          proposal.newThreshold !== undefined
            ? proposal.newThreshold
            : p.threshold,
        priority:
          proposal.newPriority !== undefined
            ? proposal.newPriority
            : p.priority,
      };
    });

    return updated;
  }

  private isProposalSafe(proposal: MetaPolicyProposal): boolean {
    const simulatedChange: ProposedChange = {
      id: `meta-policy-sim-${proposal.id}`,
      type: "policy-adjustment",
      targetRealm: "system",
      timestamp: Date.now(),
      payload: {
        targetPolicyId: proposal.targetPolicyId,
        newThreshold: proposal.newThreshold,
        newPriority: proposal.newPriority,
      },
    };

    return this.safetyConstraints.validateChange(simulatedChange);
  }
}
