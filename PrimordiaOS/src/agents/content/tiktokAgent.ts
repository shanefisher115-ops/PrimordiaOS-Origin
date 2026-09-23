import { Logger } from '../../core/logger';
import { creatorOsBridge } from '../../integrations/creatorOsBridge';

export class TikTokAgent {
  async publish(content: string) {
    Logger.info('TikTokAgent publishing', { content });
    return await creatorOsBridge.publishContent('tiktok', content);
  }
}

export const tiktokAgent = new TikTokAgent();
