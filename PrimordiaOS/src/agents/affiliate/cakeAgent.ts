import { cakeService } from '../../services/cakeService';
import { Logger } from '../../core/logger';
import { EventBus, PrimordiaEvent } from '../../core/eventBus';

export class CakeAgent {
  async syncOffers() {
    try {
      const offers = await cakeService.fetchOffers();

      const event: PrimordiaEvent = {
        eventId: `cake_sync_${Date.now()}`,
        eventType: 'OFFER_SYNC',
        source: 'cake',
        data: offers,
        timestamp: new Date().toISOString(),
      };

      await EventBus.publish(event);
      Logger.info('CAKE offers synced');
    } catch (err) {
      Logger.error('CakeAgent sync error', { error: (err as Error).message });
    }
  }
}

export const cakeAgent = new CakeAgent();
