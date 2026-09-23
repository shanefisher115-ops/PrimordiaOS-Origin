import { EventBus, PrimordiaEvent } from '../core/eventBus';
import { Logger } from '../core/logger';

export interface PostbackPayload {
  transaction_id?: string;
  offer_id?: string;
  affiliate_id?: string;
  sub_id_1?: string;
  sub_id_2?: string;
  payout?: string;
  currency?: string;
  status?: string;
}

export class PostbackService {
  async handleHitPathPostback(payload: PostbackPayload): Promise<void> {
    Logger.info('Received postback', payload);

    const event: PrimordiaEvent<PostbackPayload> = {
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
