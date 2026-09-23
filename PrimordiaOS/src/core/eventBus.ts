import { Logger } from "./logger";

const handlers: Record<string, Function[]> = {
  AFFILIATE_CONVERSION: [],
  OFFER_SYNC: [],
  YIELD_SYNC: [],
  SWARM_TASK: [],
  SYSTEM_ALERT: [],
  PLAYER_TELEMETRY: [],
  UNREAL_EVENT: []
};

const EventBus = {
  subscribe(eventType: string, handler: Function) {
    if (!handlers[eventType]) {
      handlers[eventType] = [];
    }
    handlers[eventType].push(handler);
    Logger.debug(`Subscribed handler to ${eventType}`);
  },
  async publish(event: any) {
    Logger.info("Event published", event);
    const list = handlers[event.eventType] || [];
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err: any) {
        Logger.error("Event handler error", { event, error: err.message });
      }
    }
  },
  emit(event: any) {
    return this.publish(event);
  }
};

export { EventBus };