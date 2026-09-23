import { Logger } from '../core/logger';
const registry = {};
export const AgentRegistry = {
    register(agentId, name) {
        registry[agentId] = { name, active: true };
        Logger.info('Agent registered', { agentId, name });
    },
    deactivate(agentId) {
        if (registry[agentId]) {
            registry[agentId].active = false;
            Logger.info('Agent deactivated', { agentId });
        }
    },
    list() {
        return registry;
    },
};
