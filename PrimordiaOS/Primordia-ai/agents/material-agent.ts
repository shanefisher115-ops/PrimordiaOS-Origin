import type { AgentProposal } from "../schemas/agent-proposal.ts";

export function materialAgent(metrics: any, cadParams: any, timestamp: number): AgentProposal {
    // What the part is made of now: the one asked for, else what runSimulation took from the kernel's slots.
    const currentMaterial: string = cadParams.material ?? metrics.material ?? "stone";
    const environment = metrics.environment ?? "normal";

    const betterMaterial =
        environment === "highHeat" ? "titanium" :
            environment === "corrosive" ? "stainlessSteel" :
                currentMaterial;

    const needsChange = betterMaterial.toLowerCase() !== currentMaterial.toLowerCase();

    return {
        agentName: "MaterialAgent",
        timestamp,
        confidence: needsChange ? 0.75 : 0.2,

        targetParam: "material",
        targetRegion: "global",

        // "replace" sets cadParams.material to this name (runSimulation's material table); keeping the
        // current value changes nothing.
        delta: needsChange ? betterMaterial : cadParams.material ?? "",
        type: "replace",

        justification: needsChange
            ? `Environment "${environment}" suggests switching from ${currentMaterial} to ${betterMaterial}`
            : `${currentMaterial} suits a "${environment}" environment`,

        metricsUsed: ["environment", "material"],

        localScore: needsChange ? 0.7 : 0.2,
        globalImpactEstimate: needsChange ? 0.5 : 0.3
    };
}
