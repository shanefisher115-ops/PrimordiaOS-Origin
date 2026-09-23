// horizon/scenarioSynthesizer.ts

import { ProjectedState, Scenario } from "./types";

export interface ScenarioSynthesizerConfig {
  maxScenarios: number;
  divergenceThreshold: number;
}

export class ScenarioSynthesizer {
  private config: ScenarioSynthesizerConfig;

  constructor(config: ScenarioSynthesizerConfig) {
    this.config = config;
  }

  synthesize(projectedStates: ProjectedState[]): Scenario[] {
    const scenarios: Scenario[] = [];

    const sorted = [...projectedStates].sort(
      (a, b) =>
        a.projectedGlobalHealthScore - b.projectedGlobalHealthScore
    );

    if (sorted.length === 0) return scenarios;

    const worst = sorted[0];
    const best = sorted[sorted.length - 1];

    scenarios.push(this.buildScenario("worst-case", worst));
    scenarios.push(this.buildScenario("best-case", best));

    const midIndex = Math.floor(sorted.length / 2);
    const mid = sorted[midIndex];
    scenarios.push(this.buildScenario("baseline", mid));

    return scenarios.slice(0, this.config.maxScenarios);
  }

  private buildScenario(
    type: "worst-case" | "best-case" | "baseline",
    state: ProjectedState
  ): Scenario {
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
