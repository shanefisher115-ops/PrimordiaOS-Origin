import { Logger } from '../../core/logger';

export class ContentRouter {
  route(content: string): string {
    Logger.info('ContentRouter routing content', { content });

    if (content.length < 80) return 'shorts';
    if (content.includes('#viral')) return 'tiktok';
    return 'reels';
  }
}

export const contentRouter = new ContentRouter();
