import type { AgentProposal } from "../schemas/agent-proposal.ts";
import { designLimits } from "../schemas/design-limits.ts";
import { describeFix, designOf, findFix } from "./levers.ts";

export function stressAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const stress = metrics.maxStress ?? 0; // MPa
    const limit = designLimits(cadParams, metrics).stressLimit;
    const region = metrics.highStressRegion ?? "global";

    const over = stress - limit;
    const fix = over > 0 ? findFix("stress", cadParams, region, over / limit) : null;

    return {
        agentName: "StressAgent",
        timestamp,
        confidence: fix ? 0.95 : 0.3,

        targetParam: fix?.param ?? "",
        targetRegion: region,

        delta: fix?.delta ?? 0,
        type: fix?.type ?? "increase",

        justification: over <= 0
            ? `Stress ${stress.toFixed(2)} MPa within the ${limit} MPa limit`
            : `Stress ${stress.toFixed(2)} MPa exceeds the ${limit} MPa limit by ${over.toFixed(2)} MPa in the ${region} band` +
              (fix ? `: ${describeFix(fix)}` : `, and no ${designOf(cadParams).kind} parameter is left to lower it`),

        metricsUsed: ["maxStress", "highStressRegion"],

        localScore: fix ? 0.9 : 0.2,
        globalImpactEstimate: fix ? 0.7 : 0.3
    };
}
