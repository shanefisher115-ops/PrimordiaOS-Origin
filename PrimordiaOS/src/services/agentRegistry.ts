import { Logger } from '../core/logger';

const registry: Record<string, { name: string; active: boolean }> = {};

export const AgentRegistry = {
  register(agentId: string, name: string) {
    registry[agentId] = { name, active: true };
    Logger.info('Agent registered', { agentId, name });
  },

  deactivate(agentId: string) {
    if (registry[agentId]) {
      registry[agentId].active = false;
      Logger.info('Agent deactivated', { agentId });
    }
  },

  list() {
    return registry;
  },
};
