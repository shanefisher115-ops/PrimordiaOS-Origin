export function materialAgent(metrics, cadParams, timestamp) {
    const currentMaterial = cadParams.material ?? "aluminum";
    const environment = metrics.environment ?? "normal";
    const betterMaterial = environment === "highHeat" ? "titanium" :
        environment === "corrosive" ? "stainlessSteel" :
            currentMaterial;
    const needsChange = betterMaterial !== currentMaterial;
    return {
        agentName: "MaterialAgent",
        timestamp,
        confidence: needsChange ? 0.75 : 0.2,
        targetParam: "material",
        targetRegion: "global",
        delta: 0,
        type: needsChange ? "replace" : "reshape",
        justification: needsChange
            ? `Environment suggests switching to ${betterMaterial}`
            : "Material appropriate",
        metricsUsed: ["environment"],
        localScore: needsChange ? 0.7 : 0.2,
        globalImpactEstimate: needsChange ? 0.5 : 0.3
    };
}
