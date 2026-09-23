type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export class CockpitEventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  emit<T = any>(event: string, payload: T): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        try {
          handler(payload);
        } catch (err) {
          console.error("[EventBus] Listener error on " + event + ":", err);
        }
      }
    }
  }
}

export const eventBus = new CockpitEventBus();
export default eventBus;