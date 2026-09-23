import { Orchestrator } from "../orchestrator/orchestrator";

export function attachAMOBridge(amo: any) {
  amo.onTaskCreated(task => {
    OrchestratorState.tasks.push(task);
  });

  amo.onAgentRegistered(agent => {
    OrchestratorState.agents[agent.id] = agent;
  });
}
