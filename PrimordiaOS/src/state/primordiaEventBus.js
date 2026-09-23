// Primordia Event Bus
// Unified signal routing for autonomy loop, realms, and triggers.
export class PrimordiaEventBus {
    handlers = [];
    register(handler) {
        this.handlers.push(handler);
    }
    async emit(type, source, payload) {
        const event = { type, source, payload, timestamp: new Date() };
        for (const handler of this.handlers) {
            await handler(event);
        }
    }
}
