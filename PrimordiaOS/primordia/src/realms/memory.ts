// MemoryRealm Engine — PrimordiaOS
// Handles long-term reinforcement, temporal evolution, and memory node creation.

import { emitSignal } from "../core/signals";

export interface MemoryNode {
  timestamp: number;
  depth: number;
  revenue: number;
  trend: number;
  reinforcement: number;
}

export interface MemoryState {
  nodes: MemoryNode[];
  longTermTrend: number;
  reinforcementLevel: number;
}

export const memoryState: MemoryState = {
  nodes: [],
  longTermTrend: 0,
  reinforcementLevel: 1
};

export function processMemoryRealm(weight: number, revenue: number, depth: number) {
  const timestamp = Date.now();

  // Compute reinforcement score
  const reinforcement = (revenue * 0.05) + (weight * 0.02);

  // Compute long-term trend
  memoryState.longTermTrend =
    (memoryState.longTermTrend * 0.95) + (revenue * 0.05);

  // Update reinforcement level
  memoryState.reinforcementLevel =
    (memoryState.reinforcementLevel * 0.9) + (reinforcement * 0.1);

  // Create memory node
  const node: MemoryNode = {
    timestamp,
    depth,
    revenue,
    trend: memoryState.longTermTrend,
    reinforcement
  };

  memoryState.nodes.push(node);

  // Limit memory size
  if (memoryState.nodes.length > 5000) {
    memoryState.nodes.shift();
  }

  // Emit MemoryRealm signal
  emitSignal("memory.node", node);

  return memoryState;
}
