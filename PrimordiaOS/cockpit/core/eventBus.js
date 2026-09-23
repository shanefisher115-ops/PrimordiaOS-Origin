export class CockpitEventBus {
    listeners = new Map();
    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(handler);
        return () => this.off(event, handler);
    }
    off(event, handler) {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(handler);
        }
    }
    emit(event, payload) {
        const set = this.listeners.get(event);
        if (set) {
            for (const handler of set) {
                try {
                    handler(payload);
                }
                catch (err) {
                    console.error("[EventBus] Listener error on " + event + ":", err);
                }
            }
        }
    }
}
export const eventBus = new CockpitEventBus();
export default eventBus;
