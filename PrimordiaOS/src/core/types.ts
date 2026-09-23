// core/types.ts

import {
  Insight,
  Policy,
  PolicyEffectivenessStats,
  ReasoningLoopStats,
  PolicyUsageStats,
  RealmId,
} from "../omniscience/types";

import {
  ProjectedState,
  Scenario,
  EvolutionPlan,
  ForesightSummary,
} from "../horizon/types";

import {
  AgingInsight,
  ContinuityDirective,
  MemoryNode,
  RealmLifecycleEvent,
} from "../continuity/types";

// ---------------------------------------------------------
// CURRENT STATE SNAPSHOT
// ---------------------------------------------------------

export interface CurrentStateSnapshot {
  timestamp: number;

  // Global system health
  globalHealthScore: number;

  // Drift + staleness (Continuity layer)
  driftScore: number;
  stalenessScore: number;

  // Omniscience stats
  reasoningStats: ReasoningLoopStats;
  policyStats: PolicyUsageStats;

  // Policy engine
  policies: Policy[];
  policyEffectiveness: PolicyEffectivenessStats[];

  // Realm activity
  realmActivity: Record<RealmId, number>;
}

// ---------------------------------------------------------
// REALM SIGNALS (Omniscience → Fusion Engine)
// ---------------------------------------------------------

export interface RealmSignal {
  id: string;
  realm: RealmId;
  strength: number;
  payload: any;
  timestamp: number;
}

// ---------------------------------------------------------
// TEMPORAL EVENTS (Omniscience → Temporal Reasoner)
// ---------------------------------------------------------

export interface TemporalEvent {
  id: string;
  value: number;
  timestamp: number;
}

// ---------------------------------------------------------
// MEMORY NODES (Continuity → Compression)
// ---------------------------------------------------------

export interface MemoryNode {
  id: string;
  importance: number;
  payload: any;
  timestamp: number;
}

// ---------------------------------------------------------
// INTELLIGENCE CYCLE SUMMARY (Unified Output)
// ---------------------------------------------------------

export interface IntelligenceCycleSummary {
  timestamp: number;

  // Omniscience counts
  fusionInsightCount: number;
  temporalInsightCount: number;
  introspectionInsightCount: number;
  metaPolicyProposalCount: number;

  // Horizon summary
  foresightSummary: ForesightSummary;

  // Continuity summary
  continuitySummary: {
    timestamp: number;
    agingInsightCount: number;
    compressedBlockCount: number;
    lifecycleEventCount: number;
    directiveCount: number;
    message: string;
  };

  message: string;
}
