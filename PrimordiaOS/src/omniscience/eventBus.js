// omniscience/eventBus.ts
export class EventBus {
    handlers = [];
    register(handler) {
        this.handlers.push(handler);
    }
    async emit(event) {
        // fan-out to all handlers, non-blocking per handler
        await Promise.all(this.handlers.map(async (handler) => {
            try {
                await handler(event);
            }
            catch (err) {
                // TODO: route this to failure logging once changeApplier exists
                console.error("[Omniscience EventBus] handler error", err);
            }
        }));
    }
}
export const omniscienceEventBus = new EventBus();
