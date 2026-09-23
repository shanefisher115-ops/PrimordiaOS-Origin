import { Logger } from '../../core/logger';
import { AgentEvents } from '../../primordia/agents/agentEvents';
export const TikTokReactor = {
    async react(event) {
        if (event.type !== 'tiktok_chat')
            return;
        Logger.info('TikTokReactor reacting to chat', event.payload);
        await AgentEvents.emit('tiktok_chat', event.payload);
    }
};
