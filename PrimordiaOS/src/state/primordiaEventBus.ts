// Primordia Event Bus
// Unified signal routing for autonomy loop, realms, and triggers.

export interface Event {
  type: string;
  source: string;
  payload: unknown;
  timestamp: Date;
}

export type EventHandler = (event: Event) => Promise<void> | void;

export class PrimordiaEventBus {
  private handlers: EventHandler[] = [];

  register(handler: EventHandler) {
    this.handlers.push(handler);
  }

  async emit(type: string, source: string, payload: unknown) {
    const event: Event = { type, source, payload, timestamp: new Date() };
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}
