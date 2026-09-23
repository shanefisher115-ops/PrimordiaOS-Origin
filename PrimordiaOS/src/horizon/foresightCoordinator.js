// horizon/foresightCoordinator.ts
export class ForesightCoordinator {
    projectionEngine;
    scenarioSynthesizer;
    evolutionPlanner;
    futureStateGraph;
    constructor(projectionEngine, scenarioSynthesizer, evolutionPlanner, futureStateGraph) {
        this.projectionEngine = projectionEngine;
        this.scenarioSynthesizer = scenarioSynthesizer;
        this.evolutionPlanner = evolutionPlanner;
        this.futureStateGraph = futureStateGraph;
    }
    runForesight(current, temporalInsights) {
        const projectedStates = this.projectionEngine.project(current, temporalInsights);
        for (const state of projectedStates) {
            this.futureStateGraph.addProjectedState(state);
        }
        const scenarios = this.scenarioSynthesizer.synthesize(projectedStates);
        const evolutionPlan = this.evolutionPlanner.buildPlan(scenarios);
        const mostPromising = this.futureStateGraph.findMostPromisingState();
        return {
            timestamp: Date.now(),
            projectedStateCount: projectedStates.length,
            scenarioCount: scenarios.length,
            evolutionPlan,
            mostPromisingStateId: mostPromising?.id ?? null,
            message: "Foresight cycle completed: projections, scenarios, evolution plan, and best future state identified.",
        };
    }
}
