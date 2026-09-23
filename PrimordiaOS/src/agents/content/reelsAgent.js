import { Logger } from '../../core/logger';
import { creatorOsBridge } from '../../integrations/creatorOsBridge';
export class ReelsAgent {
    async publish(content) {
        Logger.info('ReelsAgent publishing', { content });
        return await creatorOsBridge.publishContent('reels', content);
    }
}
export const reelsAgent = new ReelsAgent();
