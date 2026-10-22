import { runAgents } from "../../Primordia-ai/coordinator/agent-orchestrator.ts";

export async function evaluateDesignCycle(simMetrics: any, cadParams: any) {
    // 1. Run all agents through the orchestrator
    const proposal = await runAgents(simMetrics, cadParams);

    // 2. Log the winning proposal (PrimordiaOS lineage)
    console.log("[PrimordiaOS AI] Winning proposal:", proposal);

    // 3. Return the mutation so primordia-core can send it to primordia-cad
    return {
        mutation: {
            param: proposal.targetParam,
            region: proposal.targetRegion,
            delta: proposal.delta,
            type: proposal.type
        },
        justification: proposal.justification,
        agent: proposal.agentName,
        confidence: proposal.confidence
    };
}
