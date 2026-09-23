export class VizGenerator {
    generateGauge(metricName) {
        return {
            type: "circular-hud-dial",
            metric: metricName,
            refreshRateHz: 60
        };
    }
}
// ============================================================================== 
// EVOLUTION_MUTATION_HOOK: Activated by PrimordiaOS Swarm Orchestrator 
// Enables bounded, anti-collapse parameter self-rewriting under Sovereign Tier 0 oversight. 
// ============================================================================== 
export const evolutionMutationHook = {
    active: true,
    adaptiveRate: 0.05,
    entropyDamping: 0.98,
    mutate(paramKey, currentValue, delta) {
        const sovereignCap = 1.0;
        const next = Math.max(0.01, Math.min(sovereignCap, currentValue + delta * this.adaptiveRate));
        return Number(next.toFixed(4));
    }
};
