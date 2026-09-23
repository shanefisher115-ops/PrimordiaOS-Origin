import { Logger } from '../../core/logger';
const listeners = [];
export const LiveEventBus = {
    subscribe(fn) {
        listeners.push(fn);
        Logger.info('LiveEventBus subscribed listener');
    },
    async emit(type, payload) {
        const event = { type, payload };
        Logger.info('LiveEventBus emit', event);
        for (const fn of listeners) {
            await fn(event);
        }
    }
};
