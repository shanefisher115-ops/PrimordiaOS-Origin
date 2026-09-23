// horizon/projectionEngine.ts

import { CurrentStateSnapshot, ProjectedState } from "./types";
import { TemporalInsight } from "../omniscience/types";

export interface ProjectionEngineConfig {
  maxProjectionHorizonMs: number;
  sensitivity: number;
}

export class ProjectionEngine {
  private config: ProjectionEngineConfig;

  constructor(config: ProjectionEngineConfig) {
    this.config = config;
  }

  project(
    current: CurrentStateSnapshot,
    temporalInsights: TemporalInsight[]
  ): ProjectedState[] {
    const now = Date.now();
    const projections: ProjectedState[] = [];

    for (const insight of temporalInsights) {
      const horizon = this.estimateHorizon(insight);
      const projectedTimestamp = now + horizon;

      const projectedScore =
        current.globalHealthScore *
        this.computeAdjustmentFactor(insight);

      projections.push({
        id: `projection-${insight.id}-${projectedTimestamp}`,
        timestamp: projectedTimestamp,
        projectedGlobalHealthScore: projectedScore,
        sourceInsightId: insight.id,
        message: `Projected global health score adjusted based on temporal insight ${insight.id}.`,
      });
    }

    return projections;
  }

  private estimateHorizon(insight: TemporalInsight): number {
    const base = this.config.maxProjectionHorizonMs / 2;
    if (insight.type === "trend") {
      return base * this.config.sensitivity;
    }
    if (insight.type === "anomaly") {
      return base * 0.5 * this.config.sensitivity;
    }
    return base;
  }

  private computeAdjustmentFactor(insight: TemporalInsight): number {
    if (insight.type === "trend") {
      return insight.direction === "up" ? 1.05 : 0.95;
    }
    if (insight.type === "anomaly") {
      return insight.direction === "up" ? 1.02 : 0.9;
    }
    return 1.0;
  }
}
