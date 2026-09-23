import { Agent } from "./agent-types";

export interface AgentRegistry {
  agents: Agent[];
  register(agent: Agent): void;
  findForTask(taskName: string): Agent | undefined;
}

export const createAgentRegistry = (): AgentRegistry => ({
  agents: [],
  register(agent: Agent) {
    this.agents.push(agent);
  },
  findForTask(taskName: string) {
    return this.agents.find(agent =>
      agent.capabilities.some(cap => cap.supportedTaskNames.includes(taskName)),
    );
  },
});
