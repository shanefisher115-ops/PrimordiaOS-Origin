import { AgentProposal } from "../schemas/agent-proposal";

export function topologyAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    const deformation = metrics.maxDeformation ?? 0;
    const threshold = cadParams.deformationLimit ?? 5;

    const needsTopology = deformation > threshold;

    return {
        agentName: "TopologyAgent",
        timestamp,
        confidence: needsTopology ? 0.9 : 0.3,

        targetParam: "topologyMode",
        targetRegion: metrics.deformationRegion ?? "global",

        delta: 1,
        type: needsTopology ? "reshape" : "increase",

        justification: needsTopology
            ? "High deformation detected — topology optimization recommended"
            : "Topology acceptable",

        metricsUsed: ["maxDeformation"],

        localScore: needsTopology ? 0.85 : 0.25,
        globalImpactEstimate: needsTopology ? 0.7 : 0.3
    };
}
