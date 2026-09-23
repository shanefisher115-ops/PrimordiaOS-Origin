import { Logger } from '../../core/logger';
import { tiktokAgent } from './tiktokAgent';
import { reelsAgent } from './reelsAgent';
import { shortsAgent } from './shortsAgent';

export class ContentScheduler {
  async schedule(platform: string, content: string, delayMs: number) {
    Logger.info('ContentScheduler scheduling', { platform, delayMs });

    setTimeout(async () => {
      switch (platform) {
        case 'tiktok':
          await tiktokAgent.publish(content);
          break;
        case 'reels':
          await reelsAgent.publish(content);
          break;
        case 'shorts':
          await shortsAgent.publish(content);
          break;
        default:
          Logger.warn('Unknown content platform', { platform });
      }
    }, delayMs);
  }
}

export const contentScheduler = new ContentScheduler();
