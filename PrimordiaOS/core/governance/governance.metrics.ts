const metricsStore: Record<string, Record<string, number>> = {};

export function updateMetric(agentId: string, metric: string, value: number) {
  if (!metricsStore[agentId]) metricsStore[agentId] = {};
  metricsStore[agentId][metric] = value;

  emitGovernance({
    type: "METRIC_UPDATE",
    agentId,
    metric,
    value,
    timestamp: Date.now()
  });
}

export function getMetrics(agentId: string) {
  return metricsStore[agentId] || {};
}

function emitGovernance(event: any) {
  globalThis.PRIMORDIA_GOVERNANCE_BUS.push(event);
}
