import { Logger } from '../core/logger';

interface AgentRecord {
  name: string;
  active: boolean;
  lastSeen?: string;
}

const registry: Record<string, AgentRecord> = {};

export const AgentRegistry = {
  register(agentId: string, name: string) {
    registry[agentId] = { name, active: true, lastSeen: new Date().toISOString() };
    Logger.info('Agent registered', { agentId, name });
  },

  heartbeat(agentId: string) {
    if (registry[agentId]) {
      registry[agentId].lastSeen = new Date().toISOString();
      Logger.debug('Agent heartbeat', { agentId });
    }
  },

  deactivate(agentId: string) {
    if (registry[agentId]) {
      registry[agentId].active = false;
      Logger.warn('Agent deactivated', { agentId });
    }
  },

  list() {
    return registry;
  },
};
