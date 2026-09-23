import { Logger } from './logger';
const handlers = {
    AFFILIATE_CONVERSION: [],
    OFFER_SYNC: [],
    YIELD_SYNC: [],
    SWARM_TASK: [],
    SYSTEM_ALERT: [],
};
export const EventBus = {
    subscribe(eventType, handler) {
        handlers[eventType].push(handler);
        Logger.debug(`Subscribed handler to ${eventType}`);
    },
    async publish(event) {
        Logger.info('Event published', event);
        const list = handlers[event.eventType] || [];
        for (const handler of list) {
            try {
                await handler(event);
            }
            catch (err) {
                Logger.error('Event handler error', { event, error: err.message });
            }
        }
    },
};
