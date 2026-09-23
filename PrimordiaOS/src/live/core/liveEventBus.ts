import { Logger } from '../../core/logger';

type LiveEvent = { type: string; payload: any };

const listeners: Array<(event: LiveEvent) => Promise<void>> = [];

export const LiveEventBus = {
  subscribe(fn: (event: LiveEvent) => Promise<void>) {
    listeners.push(fn);
    Logger.info('LiveEventBus subscribed listener');
  },

  async emit(type: string, payload: any) {
    const event = { type, payload };
    Logger.info('LiveEventBus emit', event);

    for (const fn of listeners) {
      await fn(event);
    }
  }
};
