import { EventBus, PrimordiaEvent } from '../core/eventBus';
import { Logger } from '../core/logger';

export const EventDispatch = {
  async dispatch(event: PrimordiaEvent) {
    Logger.info('Dispatching event', { eventId: event.eventId, type: event.eventType });
    await EventBus.publish(event);
  },

  async broadcast(events: PrimordiaEvent[]) {
    for (const event of events) {
      await this.dispatch(event);
    }
  },
};
