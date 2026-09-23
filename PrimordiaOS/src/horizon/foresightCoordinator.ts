// horizon/foresightCoordinator.ts

import { ProjectionEngine } from "./projectionEngine";
import { ScenarioSynthesizer } from "./scenarioSynthesizer";
import { EvolutionPlanner } from "./evolutionPlanner";
import { FutureStateGraph } from "./futureStateGraph";
import {
  CurrentStateSnapshot,
  ForesightSummary,
} from "./types";
import { TemporalInsight } from "../omniscience/types";

export class ForesightCoordinator {
  private projectionEngine: ProjectionEngine;
  private scenarioSynthesizer: ScenarioSynthesizer;
  private evolutionPlanner: EvolutionPlanner;
  private futureStateGraph: FutureStateGraph;

  constructor(
    projectionEngine: ProjectionEngine,
    scenarioSynthesizer: ScenarioSynthesizer,
    evolutionPlanner: EvolutionPlanner,
    futureStateGraph: FutureStateGraph
  ) {
    this.projectionEngine = projectionEngine;
    this.scenarioSynthesizer = scenarioSynthesizer;
    this.evolutionPlanner = evolutionPlanner;
    this.futureStateGraph = futureStateGraph;
  }

  runForesight(
    current: CurrentStateSnapshot,
    temporalInsights: TemporalInsight[]
  ): ForesightSummary {
    const projectedStates = this.projectionEngine.project(
      current,
      temporalInsights
    );

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
      message:
        "Foresight cycle completed: projections, scenarios, evolution plan, and best future state identified.",
    };
  }
}
