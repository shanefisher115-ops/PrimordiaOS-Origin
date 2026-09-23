import { Logger } from '../../core/logger';
import { swarmScheduler } from './swarmScheduler';
import { PrimordiaEvent } from '../../core/eventBus';

export class SwarmController {
  async handleEvent(event: PrimordiaEvent) {
    Logger.info('SwarmController received event', event);

    switch (event.eventType) {
      case 'AFFILIATE_CONVERSION':
        await swarmScheduler.schedule('conversion-react', event);
        break;

      case 'OFFER_SYNC':
        await swarmScheduler.schedule('offer-analysis', event);
        break;

      case 'SWARM_TASK':
        await swarmScheduler.schedule('swarm-task', event);
        break;

      default:
        Logger.debug('SwarmController ignoring event type', { type: event.eventType });
    }
  }
}

export const swarmController = new SwarmController();
