import config from "./governance.config.json";

const requestCounts: Record<string, number> = {};

setInterval(() => {
  for (const agentId in requestCounts) {
    requestCounts[agentId] = 0;
  }
}, 60000);

export function rateLimit(agentId: string) {
  if (!config.enableRateLimit) return true;

  requestCounts[agentId] = (requestCounts[agentId] || 0) + 1;

  if (requestCounts[agentId] > config.maxRequestsPerMinute) {
    emitGovernance({
      type: "RATE_LIMITED",
      agentId,
      count: requestCounts[agentId],
      timestamp: Date.now()
    });
    return false;
  }

  return true;
}

function emitGovernance(event: any) {
  globalThis.PRIMORDIA_GOVERNANCE_BUS.push(event);
}
