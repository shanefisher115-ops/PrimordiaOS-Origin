import type { AgentProposal } from "../schemas/agent-proposal.ts";
import { designLimits } from "../schemas/design-limits.ts";
import { describeFix, designOf, findFix } from "./levers.ts";

export function weightAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const weight = metrics.mass ?? 0; // kg
    const target = designLimits(cadParams, metrics).targetMass;

    const deltaMass = weight - target;
    const fix = deltaMass > 0 ? findFix("mass", cadParams, undefined, deltaMass / target) : null;

    return {
        agentName: "WeightAgent",
        timestamp,
        confidence: fix ? 0.85 : 0.25,

        targetParam: fix?.param ?? "",
        targetRegion: "global",

        delta: fix?.delta ?? 0,
        type: fix?.type ?? "decrease",

        justification: !Number.isFinite(target)
            ? `Mass ${weight.toFixed(0)} kg; no targetMass set`
            : deltaMass <= 0
                ? `Mass ${weight.toFixed(0)} kg within the ${target} kg target`
                : `Mass exceeds the ${target} kg target by ${deltaMass.toFixed(0)} kg` +
                  (fix ? `: ${describeFix(fix)}` : `, and no ${designOf(cadParams).kind} parameter is left to lighten it`),

        metricsUsed: ["mass"],

        localScore: fix ? 0.8 : 0.2,
        globalImpactEstimate: fix ? 0.6 : 0.3
    };
}
