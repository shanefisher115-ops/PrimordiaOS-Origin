import config from "./governance.config.json";

const costStore: Record<string, number> = {};

export function addCost(agentId: string, amountUSD: number) {
  costStore[agentId] = (costStore[agentId] || 0) + amountUSD;

  if (costStore[agentId] > config.maxCostPerAgentUSD) {
    emitGovernance({
      type: "COST_LIMIT_EXCEEDED",
      agentId,
      cost: costStore[agentId],
      timestamp: Date.now()
    });
  }
}

export function getCost(agentId: string) {
  return costStore[agentId] || 0;
}

function emitGovernance(event: any) {
  globalThis.PRIMORDIA_GOVERNANCE_BUS.push(event);
}
