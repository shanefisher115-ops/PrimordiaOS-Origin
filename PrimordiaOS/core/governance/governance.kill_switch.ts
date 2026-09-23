import config from "./governance.config.json";

export function killAgent(agentId: string, reason: string) {
  if (!config.enableKillSwitch) return;

  emitGovernance({
    type: "KILL_SWITCH_TRIGGERED",
    agentId,
    reason,
    timestamp: Date.now()
  });

  globalThis.PRIMORDIA_AGENT_MANAGER.stop(agentId);
}

function emitGovernance(event: any) {
  globalThis.PRIMORDIA_GOVERNANCE_BUS.push(event);
}
