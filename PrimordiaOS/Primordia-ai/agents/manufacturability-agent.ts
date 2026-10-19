import type { AgentProposal } from "../schemas/agent-proposal.ts";
import { designLimits } from "../schemas/design-limits.ts";
import { describeFix, designOf, findFix } from "./levers.ts";

export function manufacturabilityAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const overhangs = metrics.overhangCount ?? 0;
    const maxAllowed = designLimits(cadParams, metrics).maxOverhangs;

    const over = overhangs - maxAllowed;
    const fix = over > 0 ? findFix("overhangs", cadParams, undefined, maxAllowed > 0 ? over / maxAllowed : 1) : null;

    return {
        agentName: "ManufacturabilityAgent",
        timestamp,
        confidence: fix ? 0.8 : 0.3,

        targetParam: fix?.param ?? "",
        targetRegion: "overhangRegions",

        delta: fix?.delta ?? 0,
        type: fix?.type ?? "decrease",

        justification: !Number.isFinite(maxAllowed)
            ? `${overhangs} overhangs; no maxOverhangs set`
            : over <= 0
                ? `${overhangs} overhangs, within the ${maxAllowed} allowed`
                : `Too many overhangs (${overhangs} patches, ${(metrics.overhangArea ?? 0).toFixed(2)} m^2; ${maxAllowed} allowed)` +
                  (fix ? `: ${describeFix(fix)}` : `, and no ${designOf(cadParams).kind} parameter is left to remove them`),

        metricsUsed: ["overhangCount", "overhangArea"],

        localScore: fix ? 0.75 : 0.2,
        globalImpactEstimate: fix ? 0.6 : 0.3
    };
}
