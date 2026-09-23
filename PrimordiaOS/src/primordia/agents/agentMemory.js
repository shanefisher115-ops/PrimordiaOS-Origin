import { Logger } from '../../core/logger';
const memory = {};
export const AgentMemory = {
    push(agentId, entry) {
        if (!memory[agentId])
            memory[agentId] = [];
        memory[agentId].push({ ...entry, timestamp: new Date().toISOString() });
        Logger.debug('AgentMemory push', { agentId });
    },
    get(agentId) {
        return memory[agentId] || [];
    }
};
