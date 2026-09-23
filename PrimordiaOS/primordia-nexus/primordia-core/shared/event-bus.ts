// shared/event-bus.ts
// PrimordiaOS Event Bus — full implementation

export type EventPayload = Record<string, any>;

export interface EventEnvelope {
    topic: string;
    timestamp: number;
    payload: EventPayload;
    source?: string;
}

type EventHandler = (event: EventEnvelope) => Promise<void> | void;

export class EventBus {
    private handlers: Map<string, Set<EventHandler>>;
    private queue: EventEnvelope[];
    private processing: boolean;

    constructor() {
        this.handlers = new Map();
        this.queue = [];
        this.processing = false;
    }

    subscribe(topic: string, handler: EventHandler) {
        if (!this.handlers.has(topic)) {
            this.handlers.set(topic, new Set());
        }
        this.handlers.get(topic)!.add(handler);
    }

    unsubscribe(topic: string, handler: EventHandler) {
        this.handlers.get(topic)?.delete(handler);
    }

    emit(topic: string, payload: EventPayload = {}, source?: string) {
        const envelope: EventEnvelope = {
            topic,
            payload,
            timestamp: Date.now(),
            source
        };

        this.queue.push(envelope);
        this.processQueue();
    }

    private async processQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const event = this.queue.shift()!;
            const handlers = this.handlers.get(event.topic);

            if (handlers) {
                for (const handler of handlers) {
                    try {
                        await handler(event);
                    } catch (err) {
                        console.error(`[EventBus] Handler error on topic "${event.topic}":`, err);
                    }
                }
            }
        }

        this.processing = false;
    }
}

export const eventBus = new EventBus();
