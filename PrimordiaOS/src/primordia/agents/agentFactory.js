import { AgentCore } from './agentCore';
import { Logger } from '../../core/logger';
export const AgentFactory = {
    create(id, name, realm, fn) {
        const agent = { id, name, realm, run: fn };
        AgentCore.register(agent);
        Logger.info('AgentFactory created agent', { id, realm });
        return agent;
    }
};
