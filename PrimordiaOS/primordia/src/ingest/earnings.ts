// Real Earnings Ingestion Layer — PrimordiaOS
// Pulls real earnings from external sources (APIs, CSVs, manual input)
// and normalizes them into a unified EarningsSnapshot for the organism.

import { emitSignal } from "../core/signals";

export interface RawEarningsSource {
  id: string;              // e.g. "rakuten", "swagbucks"
  label: string;           // human-readable name
  amount: number;          // earnings in dollars (or normalized units)
  currency?: string;       // optional, default "USD"
  timestamp: number;       // when this earning was recorded
}

export interface EarningsSnapshot {
  total: number;
  avgPerSource: number;
  sources: RawEarningsSource[];
  timestamp: number;
}

export const earningsState = {
  lastSnapshot: null as EarningsSnapshot | null
};

// This is where you plug in *real* data.
// For now, it's a placeholder that you replace with:
// - API calls
// - CSV ingestion
// - manual input
async function fetchRealEarnings(): Promise<RawEarningsSource[]> {
  // TODO: Replace this with real integrations.
  // Example shape:
  // return [
  //   { id: "rakuten", label: "Rakuten", amount: 12.34, currency: "USD", timestamp: Date.now() },
  //   { id: "swagbucks", label: "Swagbucks", amount: 5.67, currency: "USD", timestamp: Date.now() },
  // ];
  return [];
}

function buildSnapshot(sources: RawEarningsSource[]): EarningsSnapshot {
  const timestamp = Date.now();
  const total = sources.reduce((sum, s) => sum + s.amount, 0);
  const avgPerSource = sources.length > 0 ? total / sources.length : 0;

  const snapshot: EarningsSnapshot = {
    total,
    avgPerSource,
    sources,
    timestamp
  };

  earningsState.lastSnapshot = snapshot;

  emitSignal("earnings.snapshot", snapshot);

  return snapshot;
}

export async function processRealEarningsIngestion() {
  const sources = await fetchRealEarnings();

  const snapshot = buildSnapshot(sources);

  emitSignal("earnings.update", {
    total: snapshot.total,
    avgPerSource: snapshot.avgPerSource,
    sourceCount: snapshot.sources.length,
    timestamp: snapshot.timestamp
  });

  return snapshot;
}
