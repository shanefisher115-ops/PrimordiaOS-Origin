// Import your agents here
// (You will create these files next)
import { stressAgent } from "../agents/stress-agent";
import { weightAgent } from "../agents/weight-agent";
import { materialAgent } from "../agents/material-agent";
import { topologyAgent } from "../agents/topology-agent";
import { manufacturabilityAgent } from "../agents/manufacturability-agent";
export async function runAgents(metrics, cadParams) {
    const timestamp = Date.now();
    // Collect proposals from all agents
    const proposals = [
        stressAgent(metrics, cadParams, timestamp),
        weightAgent(metrics, cadParams, timestamp),
        materialAgent(metrics, cadParams, timestamp),
        topologyAgent(metrics, cadParams, timestamp),
        manufacturabilityAgent(metrics, cadParams, timestamp)
    ];
    // Score proposals globally
    const scored = proposals.map(p => ({
        ...p,
        globalScore: computeGlobalScore(p)
    }));
    // Pick the best proposal
    const best = scored.sort((a, b) => b.globalScore - a.globalScore)[0];
    return best;
}
// Global scoring logic
function computeGlobalScore(p) {
    const w_confidence = 0.4;
    const w_local = 0.4;
    const w_globalImpact = 0.2;
    const globalImpact = p.globalImpactEstimate ?? 0.5;
    return (p.confidence * w_confidence +
        p.localScore * w_local +
        globalImpact * w_globalImpact);
}
