// horizon/scenarioSynthesizer.ts
export class ScenarioSynthesizer {
    config;
    constructor(config) {
        this.config = config;
    }
    synthesize(projectedStates) {
        const scenarios = [];
        const sorted = [...projectedStates].sort((a, b) => a.projectedGlobalHealthScore - b.projectedGlobalHealthScore);
        if (sorted.length === 0)
            return scenarios;
        const worst = sorted[0];
        const best = sorted[sorted.length - 1];
        scenarios.push(this.buildScenario("worst-case", worst));
        scenarios.push(this.buildScenario("best-case", best));
        const midIndex = Math.floor(sorted.length / 2);
        const mid = sorted[midIndex];
        scenarios.push(this.buildScenario("baseline", mid));
        return scenarios.slice(0, this.config.maxScenarios);
    }
    buildScenario(type, state) {
        return {
            id: `scenario-${type}-${state.id}`,
            type,
            projectedStateId: state.id,
            projectedGlobalHealthScore: state.projectedGlobalHealthScore,
            message: `Synthesized ${type} scenario based on projected state ${state.id}.`,
            timestamp: Date.now(),
        };
    }
}
