import { Logger } from '../../core/logger';
import { AgentCore } from './agentCore';
export const AgentEvents = {
    async emit(event, payload) {
        Logger.info('AgentEvents emit', { event });
        for (const agent of AgentCore.all()) {
            try {
                await agent.run({ event, payload });
            }
            catch (err) {
                Logger.warn('AgentEvents agent error', { agent: agent.id });
            }
        }
    }
};
