import type { AgentProposal } from "../schemas/agent-proposal.ts";
import { designLimits } from "../schemas/design-limits.ts";
import { describeFix, designOf, findFix } from "./levers.ts";

export function topologyAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const deformation = metrics.maxDeformation ?? 0; // mm
    const threshold = designLimits(cadParams, metrics).deformationLimit;
    const region = metrics.deformationRegion ?? "global";

    const over = deformation - threshold;
    const fix = over > 0 ? findFix("deformation", cadParams, region, over / threshold) : null;

    return {
        agentName: "TopologyAgent",
        timestamp,
        confidence: fix ? 0.9 : 0.3,

        targetParam: fix?.param ?? "",
        targetRegion: region,

        delta: fix?.delta ?? 0,
        type: fix?.type ?? "increase",

        justification: over <= 0
            ? `Top moves ${deformation.toFixed(2)} mm, within the ${threshold} mm limit`
            : `Top moves ${deformation.toFixed(2)} mm, over the ${threshold} mm limit, mostly from the ${region} band` +
              (fix ? `: ${describeFix(fix)}` : `, and no ${designOf(cadParams).kind} parameter is left to stiffen it`),

        metricsUsed: ["maxDeformation", "deformationRegion"],

        localScore: fix ? 0.85 : 0.25,
        globalImpactEstimate: fix ? 0.7 : 0.3
    };
}
