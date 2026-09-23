import { AgentProposal } from "../schemas/agent-proposal";

export function stressAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const stress = metrics.maxStress ?? 0;
    const limit = cadParams.stressLimit ?? 100;

    const over = stress - limit;
    const needsFix = over > 0;

    return {
        agentName: "StressAgent",
        timestamp,
        confidence: needsFix ? 0.95 : 0.3,

        targetParam: "wallThickness",
        targetRegion: metrics.highStressRegion ?? "global",

        delta: needsFix ? +0.5 : 0,
        type: needsFix ? "increase" : "reshape",

        justification: needsFix
            ? `Stress exceeds limit by ${over.toFixed(2)} units`
            : "Stress within safe range",

        metricsUsed: ["maxStress", "stressMap"],

        localScore: needsFix ? 0.9 : 0.2,
        globalImpactEstimate: needsFix ? 0.7 : 0.3
    };
}
