import { ClaimingStore } from "./claiming.store";
import config from "./claiming.config.json";

export function atomicClaim(taskId: string, agentId: string) {
  const task = ClaimingStore.tasks[taskId];
  if (!task) return false;

  // If already claimed, reject
  if (task.claimedBy) {
    emitClaimEvent({
      type: "TASK_ALREADY_CLAIMED",
      taskId,
      agentId,
      timestamp: Date.now()
    });
    return false;
  }

  // Atomic compare-and-swap
  task.claimedBy = agentId;
  task.claimedAt = Date.now();

  emitClaimEvent({
    type: "TASK_CLAIMED",
    taskId,
    agentId,
    timestamp: Date.now()
  });

  return true;
}

function emitClaimEvent(event: any) {
  globalThis.PRIMORDIA_CLAIM_BUS.push(event);
}
