// core/dataSources.ts

import {
  CurrentStateSnapshot,
  RealmSignal,
  TemporalEvent,
  MemoryNode,
} from "./types";

import { memoryGraph } from "../state/memoryGraphInstance";
import { policyEngine } from "../state/policyEngineInstance";
import { reasoningLoop } from "../state/reasoningLoopInstance";
import { realmRegistry } from "../state/realmRegistry";
import { signalBus } from "../state/signalBus";
import { temporalEventStore } from "../state/temporalEventStore";
import { healthMonitor } from "../state/healthMonitor";

// ---------------------------------------------------------
// getState()
// ---------------------------------------------------------

export async function getState(): Promise<CurrentStateSnapshot> {
  const timestamp = Date.now();

  const globalHealthScore = healthMonitor.computeGlobalHealth();
  const driftScore = healthMonitor.computeDrift();
  const stalenessScore = healthMonitor.computeStaleness();

  const reasoningStats = reasoningLoop.getStats();
  const policyStats = policyEngine.getUsageStats();
  const policies = policyEngine.getPolicies();
  const policyEffectiveness = policyEngine.getEffectivenessStats();

  const realmActivity = realmRegistry.getRealmActivityMap();

  return {
    timestamp,
    globalHealthScore,
    driftScore,
    stalenessScore,
    reasoningStats,
    policyStats,
    policies,
    policyEffectiveness,
    realmActivity,
  };
}

// ---------------------------------------------------------
// getRealmSignals()
// ---------------------------------------------------------

export async function getRealmSignals(): Promise<RealmSignal[]> {
  const signals = signalBus.getRecentSignals(100); // last 100 signals
  return signals.map((s) => ({
    id: s.id,
    realm: s.realm,
    strength: s.strength,
    payload: s.payload,
    timestamp: s.timestamp,
  }));
}

// ---------------------------------------------------------
// getTemporalEvents()
// ---------------------------------------------------------

export async function getTemporalEvents(): Promise<TemporalEvent[]> {
  const events = temporalEventStore.getEventsWithin(1000 * 60 * 60); // last hour
  return events.map((e) => ({
    id: e.id,
    value: e.value,
    timestamp: e.timestamp,
  }));
}

// ---------------------------------------------------------
// getMemoryNodes()
// ---------------------------------------------------------

export async function getMemoryNodes(): Promise<MemoryNode[]> {
  const nodes = memoryGraph.getAllNodes();
  return nodes.map((n) => ({
    id: n.id,
    importance: n.importance,
    payload: n.payload,
    timestamp: n.timestamp,
  }));
}
