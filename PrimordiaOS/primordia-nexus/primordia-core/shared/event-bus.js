// shared/event-bus.ts
// PrimordiaOS Event Bus — full implementation
export class EventBus {
    handlers;
    queue;
    processing;
    constructor() {
        this.handlers = new Map();
        this.queue = [];
        this.processing = false;
    }
    subscribe(topic, handler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic).add(handler);
    }
    unsubscribe(topic, handler) {
        this.handlers.get(topic)?.delete(handler);
    }
    emit(topic, payload = {}, source) {
        const envelope = {
            topic,
            payload,
            timestamp: Date.now(),
            source
        };
        this.queue.push(envelope);
        this.processQueue();
    }
    async processQueue() {
        if (this.processing)
            return;
        this.processing = true;
        while (this.queue.length > 0) {
            const event = this.queue.shift();
            const handlers = this.handlers.get(event.topic);
            if (handlers) {
                for (const handler of handlers) {
                    try {
                        await handler(event);
                    }
                    catch (err) {
                        console.error(`[EventBus] Handler error on topic "${event.topic}":`, err);
                    }
                }
            }
        }
        this.processing = false;
    }
}
export const eventBus = new EventBus();
