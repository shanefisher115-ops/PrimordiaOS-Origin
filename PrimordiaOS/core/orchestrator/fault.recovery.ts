import config from "./fault.config.json";
import { FaultEvent } from "./fault.events";

export async function recoverAgent(agentId: string, startFn: () => Promise<void>) {
  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      await startFn();
      return;
    } catch (err) {
      emitFault({
        type: "RETRY",
        agentId,
        attempt,
        timestamp: Date.now()
      });

      await delay(config.retryDelayMs);
    }
  }

  emitFault({
    type: "AGENT_CRASH",
    agentId,
    realm: "unknown",
    timestamp: Date.now()
  });
}

function delay(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

function emitFault(event: FaultEvent) {
  globalThis.PRIMORDIA_FAULT_BUS.push(event);
}
