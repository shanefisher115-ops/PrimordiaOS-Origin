// horizon/evolutionPlanner.ts

import { Scenario, EvolutionPlan } from "./types";
import { ProposedChange } from "../omniscience/changeApplier";

export interface EvolutionPlannerConfig {
  maxChangesPerPlan: number;
  focusOnGlobalHealth: boolean;
}

export class EvolutionPlanner {
  private config: EvolutionPlannerConfig;

  constructor(config: EvolutionPlannerConfig) {
    this.config = config;
  }

  buildPlan(scenarios: Scenario[]): EvolutionPlan | null {
    if (scenarios.length === 0) return null;

    const best = scenarios.find((s) => s.type === "best-case");
    const worst = scenarios.find((s) => s.type === "worst-case");

    if (!best || !worst) return null;

    const changes: ProposedChange[] = [];

    if (this.config.focusOnGlobalHealth) {
      if (worst.projectedGlobalHealthScore < best.projectedGlobalHealthScore) {
        changes.push({
          id: `evolution-increase-autonomy-${Date.now()}`,
          type: "autonomy-adjustment",
          targetRealm: "system",
          timestamp: Date.now(),
          payload: { delta: 0.05 },
        });

        changes.push({
          id: `evolution-optimize-pipelines-${Date.now()}`,
          type: "pipeline-rewrite",
          targetRealm: "workflow",
          timestamp: Date.now(),
          payload: { strategy: "optimize-critical-paths" },
        });
      }
    }

    return {
      id: `evolution-plan-${Date.now()}`,
      scenarioIds: scenarios.map((s) => s.id),
      proposedChanges: changes.slice(0, this.config.maxChangesPerPlan),
      message:
        "Evolution plan generated to move system toward best-case scenario.",
      timestamp: Date.now(),
    };
  }
}
