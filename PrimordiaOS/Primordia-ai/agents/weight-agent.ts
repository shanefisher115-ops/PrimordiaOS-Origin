import { AgentProposal } from "../schemas/agent-proposal";

export function weightAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const weight = metrics.mass ?? 0;
    const target = cadParams.targetMass ?? weight * 0.9;

    const deltaMass = weight - target;
    const needsReduction = deltaMass > 0;

    return {
        agentName: "WeightAgent",
        timestamp,
        confidence: needsReduction ? 0.85 : 0.25,

        targetParam: "wallThickness",
        targetRegion: "nonCriticalRegions",

        delta: needsReduction ? -0.3 : 0,
        type: needsReduction ? "decrease" : "reshape",

        justification: needsReduction
            ? `Mass exceeds target by ${deltaMass.toFixed(2)} units`
            : "Mass acceptable",

        metricsUsed: ["mass"],

        localScore: needsReduction ? 0.8 : 0.2,
        globalImpactEstimate: needsReduction ? 0.6 : 0.3
    };
}
