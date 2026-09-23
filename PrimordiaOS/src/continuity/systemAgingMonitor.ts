// continuity/systemAgingMonitor.ts

import { AgingInsight } from "./types";

export interface SystemAgingMonitorConfig {
  maxAllowedDrift: number;
  maxAllowedStalenessMs: number;
  healthDecayRate: number;
}

export interface AgingSnapshot {
  timestamp: number;
  driftScore: number;
  stalenessScore: number;
  globalHealthScore: number;
}

export class SystemAgingMonitor {
  private config: SystemAgingMonitorConfig;
  private lastSnapshot: AgingSnapshot | null = null;

  constructor(config: SystemAgingMonitorConfig) {
    this.config = config;
  }

  computeSnapshot(
    driftScore: number,
    stalenessScore: number,
    globalHealthScore: number
  ): AgingSnapshot {
    const snapshot: AgingSnapshot = {
      timestamp: Date.now(),
      driftScore,
      stalenessScore,
      globalHealthScore,
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  analyze(snapshot: AgingSnapshot): AgingInsight[] {
    const insights: AgingInsight[] = [];

    if (snapshot.driftScore > this.config.maxAllowedDrift) {
      insights.push({
        id: `aging-drift-${snapshot.timestamp}`,
        type: "drift",
        severity: "warning",
        message: "System drift exceeds safe threshold.",
        timestamp: snapshot.timestamp,
      });
    }

    if (snapshot.stalenessScore > this.config.maxAllowedStalenessMs) {
      insights.push({
        id: `aging-staleness-${snapshot.timestamp}`,
        type: "staleness",
        severity: "critical",
        message: "System staleness detected; memory refresh required.",
        timestamp: snapshot.timestamp,
      });
    }

    const decayedHealth =
      snapshot.globalHealthScore * (1 - this.config.healthDecayRate);

    if (decayedHealth < snapshot.globalHealthScore * 0.9) {
      insights.push({
        id: `aging-health-decay-${snapshot.timestamp}`,
        type: "health-decay",
        severity: "info",
        message: "Global health score shows signs of decay.",
        timestamp: snapshot.timestamp,
      });
    }

    return insights;
  }
}
