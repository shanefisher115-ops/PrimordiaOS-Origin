import { Logger } from '../../core/logger';

export interface Agent {
  id: string;
  name: string;
  realm: string;
  run: (input: any) => Promise<any>;
}

const agents: Record<string, Agent> = {};

export const AgentCore = {
  register(agent: Agent) {
    agents[agent.id] = agent;
    Logger.info('AgentCore registered agent', { id: agent.id, realm: agent.realm });
  },

  get(id: string) {
    return agents[id];
  },

  all() {
    return Object.values(agents);
  }
};
