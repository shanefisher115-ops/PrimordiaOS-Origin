import { Logger } from '../../core/logger';

const memory: Record<string, any[]> = {};

export const AgentMemory = {
  push(agentId: string, entry: any) {
    if (!memory[agentId]) memory[agentId] = [];
    memory[agentId].push({ ...entry, timestamp: new Date().toISOString() });
    Logger.debug('AgentMemory push', { agentId });
  },

  get(agentId: string) {
    return memory[agentId] || [];
  }
};
