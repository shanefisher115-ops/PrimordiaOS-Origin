export interface RollbackState {
  agentId: string;
  snapshots: any[];
}

const rollbackStore: Record<string, RollbackState> = {};

export function saveSnapshot(agentId: string, state: any) {
  if (!rollbackStore[agentId]) {
    rollbackStore[agentId] = { agentId, snapshots: [] };
  }

  rollbackStore[agentId].snapshots.push(state);

  if (rollbackStore[agentId].snapshots.length > 5) {
    rollbackStore[agentId].snapshots.shift();
  }
}

export function rollback(agentId: string) {
  const entry = rollbackStore[agentId];
  if (!entry || entry.snapshots.length === 0) return null;

  const restored = entry.snapshots.pop();

  globalThis.PRIMORDIA_FAULT_BUS.push({
    type: "ROLLBACK",
    agentId,
    depth: entry.snapshots.length,
    timestamp: Date.now()
  });

  return restored;
}
