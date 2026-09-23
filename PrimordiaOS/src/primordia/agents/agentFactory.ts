import { AgentCore, Agent } from './agentCore';
import { Logger } from '../../core/logger';

export const AgentFactory = {
  create(id: string, name: string, realm: string, fn: (input: any) => Promise<any>): Agent {
    const agent: Agent = { id, name, realm, run: fn };
    AgentCore.register(agent);
    Logger.info('AgentFactory created agent', { id, realm });
    return agent;
  }
};
