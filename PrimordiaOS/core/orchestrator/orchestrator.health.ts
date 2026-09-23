import config from "./orchestrator.config.json";
import { OrchestratorState } from "./orchestrator.state";

export function monitorHealth() {
  setInterval(() => {
    const now = Date.now();

    for (const agentId in OrchestratorState.agents) {
      const agent = OrchestratorState.agents[agentId];

      if (now - agent.lastHeartbeat > config.agentHealthIntervalMs) {
        agent.status = "dead";

        globalThis.PRIMORDIA_FAULT_BUS.push({
          type: "AGENT_DEAD",
          agentId,
          realm: agent.realm,
          timestamp: now
        });
      }
    }
  }, config.agentHealthIntervalMs);
}
