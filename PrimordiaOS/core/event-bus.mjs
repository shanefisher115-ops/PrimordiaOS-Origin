// core/event-bus.mjs
// PrimordiaOS Multi-Realm Event Bus (Cinematic + Real)

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(realm, event, handler) {
    const key = `${realm}:${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(handler);
    console.log(
      `[PrimordiaOS::EventBus] Bound handler to ${realm}/${event} ✦`
    );
  }

  emit(realm, event, payload = {}) {
    const key = `${realm}:${event}`;
    const handlers = this.listeners.get(key) || [];
    console.log(
      `✦ [PrimordiaOS::EventBus] Emitting ${realm}/${event} with pulse signature: ${JSON.stringify(
        payload
      )}`
    );
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(
          `[PrimordiaOS::EventBus] Handler error on ${realm}/${event}:`,
          err
        );
      }
    }
  }
}

export const globalEventBus = new EventBus();
