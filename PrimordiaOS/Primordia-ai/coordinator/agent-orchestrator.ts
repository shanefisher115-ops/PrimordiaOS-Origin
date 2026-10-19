import type { AgentProposal } from "../schemas/agent-proposal.ts";

// Import your agents here
// (You will create these files next)
import { stressAgent } from "../agents/stress-agent.ts";
import { weightAgent } from "../agents/weight-agent.ts";
import { materialAgent } from "../agents/material-agent.ts";
import { topologyAgent } from "../agents/topology-agent.ts";
import { manufacturabilityAgent } from "../agents/manufacturability-agent.ts";

export async function runAgents(metrics: any, cadParams: any) {
    const timestamp = Date.now();

    // Collect proposals from all agents
    const proposals: AgentProposal[] = [
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
function computeGlobalScore(p: AgentProposal): number {
    const w_confidence = 0.4;
    const w_local = 0.4;
    const w_globalImpact = 0.2;

    const globalImpact = p.globalImpactEstimate ?? 0.5;

    return (
        p.confidence * w_confidence +
        p.localScore * w_local +
        globalImpact * w_globalImpact
    );
}
