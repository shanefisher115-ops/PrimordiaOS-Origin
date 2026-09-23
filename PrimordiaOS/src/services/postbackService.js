import { EventBus } from '../core/eventBus';
import { Logger } from '../core/logger';
export class PostbackService {
    async handleHitPathPostback(payload) {
        Logger.info('Received postback', payload);
        const event = {
            eventId: payload.transaction_id || `tx_${Date.now()}`,
            eventType: 'AFFILIATE_CONVERSION',
            source: 'hitpath',
            data: payload,
            timestamp: new Date().toISOString(),
        };
        await EventBus.publish(event);
    }
}
export const postbackService = new PostbackService();
