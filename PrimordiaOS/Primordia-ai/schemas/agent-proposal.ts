export interface AgentProposal {
    agentName: string;              // "StressAgent", "WeightAgent", etc.
    timestamp: number;              // Date.now()

    confidence: number;             // 0.0 - 1.0 (how sure the agent is)

    targetParam: string;            // e.g. "wallThickness", "ribCount"
    targetRegion?: string;          // optional: "supportArm", "basePlate"

    delta: number;                  // numeric change (positive or negative)
    type: "increase" | "decrease" | "replace" | "reshape";

    justification: string;          // short explanation
    metricsUsed: string[];          // ["stressMap", "deformation"]

    localScore: number;             // agent-specific score
    globalImpactEstimate?: number;  // optional: predicted global benefit
}
