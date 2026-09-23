// AMO — Autonomous Monetization Orchestrator
// Now supports real earnings ingestion + synthetic fallback.
// Adjusts affiliate node weights based on real revenue trends.

import { emitSignal } from "../core/signals";
import { earningsState } from "../ingest/earnings";

export interface AMONodeWeight {
  id: string;
  weight: number;
}

export interface AMOState {
  avgRevenue: number;
  trend: number;
  weights: AMONodeWeight[];
}

export const amoState: AMOState = {
  avgRevenue: 0,
  trend: 0,
  weights: [
    { id: "rakuten", weight: 1.0 },
    { id: "swagbucks", weight: 1.0 },
    { id: "ibotta", weight: 1.0 },
    { id: "acorns", weight: 1.0 },
    { id: "maxbounty", weight: 1.0 },
    { id: "partnerstack", weight: 1.0 }
  ]
};

// ---------------------------------------------------------
// Revenue Blending
// ---------------------------------------------------------

function getEffectiveRevenue(syntheticRevenue: number): number {
  const snapshot = earningsState.lastSnapshot;

  if (!snapshot) {
    return syntheticRevenue; // fallback
  }

  // Blend real + synthetic for stability
  return snapshot.total * 0.7 + syntheticRevenue * 0.3;
}

// ---------------------------------------------------------
// AMO Update Logic
// ---------------------------------------------------------

export function updateAMO(syntheticRevenue: number) {
  const effectiveRevenue = getEffectiveRevenue(syntheticRevenue);

  // Update average revenue (EMA style)
  amoState.avgRevenue = amoState.avgRevenue * 0.8 + effectiveRevenue * 0.2;

  // Trend calculation
  amoState.trend = effectiveRevenue - amoState.avgRevenue;

  // Adjust weights based on trend
  amoState.weights = amoState.weights.map((node) => {
    const delta = amoState.trend * 0.02; // sensitivity
    return {
      id: node.id,
      weight: Math.max(0.1, node.weight + delta)
    };
  });

  emitSignal("amo.update", {
    avgRevenue: amoState.avgRevenue,
    trend: amoState.trend,
    weights: amoState.weights
  });

  return amoState;
}
