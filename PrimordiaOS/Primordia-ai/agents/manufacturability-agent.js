export function manufacturabilityAgent(metrics, cadParams, timestamp) {
    const overhangs = metrics.overhangCount ?? 0;
    const maxAllowed = cadParams.maxOverhangs ?? 2;
    const needsFix = overhangs > maxAllowed;
    return {
        agentName: "ManufacturabilityAgent",
        timestamp,
        confidence: needsFix ? 0.8 : 0.3,
        targetParam: "draftAngle",
        targetRegion: "overhangRegions",
        delta: needsFix ? +2 : 0,
        type: needsFix ? "increase" : "reshape",
        justification: needsFix
            ? `Too many overhangs (${overhangs}) — increase draft angle`
            : "Manufacturability OK",
        metricsUsed: ["overhangCount"],
        localScore: needsFix ? 0.75 : 0.2,
        globalImpactEstimate: needsFix ? 0.6 : 0.3
    };
}
