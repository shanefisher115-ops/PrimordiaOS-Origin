import { Logger } from '../../core/logger';
import { AgentEvents } from '../../primordia/agents/agentEvents';
export const LiveInjectionReactor = {
    async react(event) {
        if (event.type !== 'live_ingest')
            return;
        Logger.info('LiveInjectionReactor reacting to ingestion', event.payload);
        await AgentEvents.emit('live_ingest', event.payload);
    }
};
