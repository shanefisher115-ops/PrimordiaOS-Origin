export interface AgentProposal {
    agentName: string;              // "StressAgent", "WeightAgent", etc.
    timestamp: number;              // Date.now()

    confidence: number;             // 0.0 - 1.0 (how sure the agent is)

    targetParam: string;            // a Primordia-cad generator parameter, e.g. "baseWidth", "arms", or "material"
    targetRegion?: string;          // optional: runSimulation's height band ("base" ... "top") or "global"

    delta: number | string;         // numeric change (0: no change), or the new value for "replace" (a material name)
    type: "increase" | "decrease" | "replace" | "reshape";

    justification: string;          // short explanation
    metricsUsed: string[];          // ["stressMap", "deformation"]

    localScore: number;             // agent-specific score
    globalImpactEstimate?: number;  // optional: predicted global benefit
}
