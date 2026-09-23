import { FaultEvent } from "./fault.events";
import config from "./fault.config.json";

export async function monitorAgent(agentId: string, realm: string) {
  const heartbeatInterval = config.agentHeartbeatIntervalMs;
  const deathTimeout = config.agentDeathTimeoutMs;

  let lastHeartbeat = Date.now();

  setInterval(() => {
    const now = Date.now();
    if (now - lastHeartbeat > deathTimeout) {
      emitFault({
        type: "AGENT_DEAD",
        agentId,
        realm,
        timestamp: now
      });
    }
  }, heartbeatInterval);

  return {
    heartbeat() {
      lastHeartbeat = Date.now();
    }
  };
}

function emitFault(event: FaultEvent) {
  // global fault bus
  globalThis.PRIMORDIA_FAULT_BUS.push(event);
}
