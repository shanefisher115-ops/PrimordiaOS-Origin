import { atomicClaim } from "./claiming.atomic";
import config from "./claiming.config.json";

export async function claimTask(taskId: string, agentId: string) {
  for (let attempt = 1; attempt <= config.maxClaimAttempts; attempt++) {
    const success = atomicClaim(taskId, agentId);

    if (success) return true;

    emitClaimEvent({
      type: "TASK_CLAIM_FAILED",
      taskId,
      agentId,
      attempt,
      timestamp: Date.now()
    });

    await delay(config.claimRetryDelayMs);
  }

  return false;
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function emitClaimEvent(event: any) {
  globalThis.PRIMORDIA_CLAIM_BUS.push(event);
}
