import { Logger } from '../../core/logger';
import { creatorOsBridge } from '../../integrations/creatorOsBridge';

export class ShortsAgent {
  async publish(content: string) {
    Logger.info('ShortsAgent publishing', { content });
    return await creatorOsBridge.publishContent('shorts', content);
  }
}

export const shortsAgent = new ShortsAgent();
