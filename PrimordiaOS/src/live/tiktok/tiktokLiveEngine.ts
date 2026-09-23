import { Logger } from '../../core/logger';
import { TikTokChatHandler } from './tiktokChatHandler';

export const TikTokLiveEngine = {
  start() {
    Logger.info('TikTokLiveEngine started (stub)');
  },

  async simulateChat(msg: string) {
    await TikTokChatHandler.handle({ text: msg, at: new Date().toISOString() });
  }
};
