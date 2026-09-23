// omniscience/introspectionEngine.ts

import { MemoryGraph } from "./memoryGraph";
import { ReasoningLoopStats } from "./reasoningLoop";
import { PolicyUsageStats } from "./policyEngine";
import { Insight } from "./types";

export interface IntrospectionReport {
  timestamp: number;
  reasoningLoopsDetected: boolean;
  stalePoliciesDetected: boolean;
  overfittingPatternsDetected: boolean;
  runawayCorrelationsDetected: boolean;
  realmImbalanceDetected: boolean;
  summaryInsights: Insight[];
}

export interface IntrospectionEngineConfig {
  reasoningLoopThreshold: number;
  stalePolicyAgeMs: number;
  overfittingInsightRepetitionThreshold: number;
  correlationStrengthCap: number;
  realmImbalanceRatioThreshold: number;
}

export class IntrospectionEngine {
  private memoryGraph: MemoryGraph;
  private config: IntrospectionEngineConfig;

  constructor(memoryGraph: MemoryGraph, config: IntrospectionEngineConfig) {
    this.memoryGraph = memoryGraph;
    this.config = config;
  }

  runIntrospection(
    reasoningStats: ReasoningLoopStats,
    policyStats: PolicyUsageStats
  ): IntrospectionReport {
    const timestamp = Date.now();

    const reasoningLoopsDetected =
      reasoningStats.averageLoopDepth >= this.config.reasoningLoopThreshold;

    const stalePoliciesDetected = policyStats.policies.some((p) => {
      return timestamp - p.lastUsedAt >= this.config.stalePolicyAgeMs;
    });

    const overfittingPatternsDetected =
      reasoningStats.repeatedInsightCount >=
      this.config.overfittingInsightRepetitionThreshold;

    const runawayCorrelationsDetected = this.detectRunawayCorrelations();

    const realmImbalanceDetected = this.detectRealmImbalance();

    const summaryInsights: Insight[] = this.buildSummaryInsights({
      reasoningLoopsDetected,
      stalePoliciesDetected,
      overfittingPatternsDetected,
      runawayCorrelationsDetected,
      realmImbalanceDetected,
    });

    return {
      timestamp,
      reasoningLoopsDetected,
      stalePoliciesDetected,
      overfittingPatternsDetected,
      runawayCorrelationsDetected,
      realmImbalanceDetected,
      summaryInsights,
    };
  }

  private detectRunawayCorrelations(): boolean {
    const correlations = this.memoryGraph.getCorrelations();
    return correlations.some(
      (c) => c.strength > this.config.correlationStrengthCap
    );
  }

  private detectRealmImbalance(): boolean {
    const realmStats = this.memoryGraph.getRealmStats();
    if (realmStats.length === 0) return false;

    const max = Math.max(...realmStats.map((r) => r.activityScore));
    const min = Math.min(...realmStats.map((r) => r.activityScore));
    if (min === 0) return max > 0;

    const ratio = max / min;
    return ratio >= this.config.realmImbalanceRatioThreshold;
  }

  private buildSummaryInsights(flags: {
    reasoningLoopsDetected: boolean;
    stalePoliciesDetected: boolean;
    overfittingPatternsDetected: boolean;
    runawayCorrelationsDetected: boolean;
    realmImbalanceDetected: boolean;
  }): Insight[] {
    const insights: Insight[] = [];

    if (flags.reasoningLoopsDetected) {
      insights.push({
        id: `introspection-reasoning-loop-${Date.now()}`,
        type: "system",
        severity: "warning",
        message: "Reasoning loops detected above configured threshold.",
        tags: ["introspection", "reasoning", "loop"],
      });
    }

    if (flags.stalePoliciesDetected) {
      insights.push({
        id: `introspection-stale-policies-${Date.now()}`,
        type: "system",
        severity: "info",
        message: "Stale policies detected; consider meta-policy review.",
        tags: ["introspection", "policy", "stale"],
      });
    }

    if (flags.overfittingPatternsDetected) {
      insights.push({
        id: `introspection-overfitting-${Date.now()}`,
        type: "system",
        severity: "warning",
        message:
          "Overfitting patterns detected in insights; diversity of signals may be needed.",
        tags: ["introspection", "overfitting", "insights"],
      });
    }

    if (flags.runawayCorrelationsDetected) {
      insights.push({
        id: `introspection-runaway-correlations-${Date.now()}`,
        type: "system",
        severity: "critical",
        message:
          "Runaway correlations detected; correlation engine may be over-weighting certain signals.",
        tags: ["introspection", "correlation", "runaway"],
      });
    }

    if (flags.realmImbalanceDetected) {
      insights.push({
        id: `introspection-realm-imbalance-${Date.now()}`,
        type: "system",
        severity: "warning",
        message:
          "Realm imbalance detected; some realms are dominating activity and influence.",
        tags: ["introspection", "realm", "imbalance"],
      });
    }

    return insights;
  }
}
