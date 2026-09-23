import { Logger } from '../../core/logger';
import { LiveEventBus } from '../core/liveEventBus';
export const TikTokChatHandler = {
    async handle(message) {
        Logger.info('TikTokChatHandler message', message);
        await LiveEventBus.emit('tiktok_chat', message);
    }
};
