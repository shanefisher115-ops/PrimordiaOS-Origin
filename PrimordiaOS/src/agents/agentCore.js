import { Logger } from '../../core/logger';
const agents = {};
export const AgentCore = {
    register(agent) {
        agents[agent.id] = agent;
        Logger.info('AgentCore registered agent', { id: agent.id, realm: agent.realm });
    },
    get(id) {
        return agents[id];
    },
    all() {
        return Object.values(agents);
    }
};
